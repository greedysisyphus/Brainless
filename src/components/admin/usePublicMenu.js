import { useEffect, useRef, useState } from 'react'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { db, storage } from '../../utils/firebase'
import { DEFAULT_MENU_LAYOUT, readMenuLayoutFromDoc } from '../../utils/publicMenuDisplay'

// 電子菜單設定的邏輯：最多 2 張圖，上傳到 Storage 的 menu/page-*，寫進 Firestore publicMenu/current。
// Club 版和新版的畫面共用。

const MENU_DOC = ['publicMenu', 'current']
const PAGE_LABELS = ['第 1 頁', '第 2 頁（選填）']
const MAX_PAGES = 2
const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
const UPLOAD_TIMEOUT_MS = 90_000

function extFromMime(mime) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

function formatUploadError(err) {
  const code = err?.code || ''
  if (code === 'storage/unauthorized') {
    return 'Storage 拒絕寫入：請確認已按「附加權限」並發布 Storage 規則，且帳號在 admins 集合內'
  }
  if (code === 'storage/unauthenticated') {
    return '尚未登入或登入已過期，請重新登入管理員'
  }
  if (code === 'storage/canceled') {
    return '上傳已取消'
  }
  if (code === 'storage/unknown' || code === 'storage/object-not-found') {
    return '無法連到 Storage bucket，請確認 firebaseConfig.storageBucket 與 Console 一致'
  }
  return err?.message || '上傳失敗，請稍後再試'
}

/** 相容舊版 imageUrl，並正規化為最多 2 個 slot */
function normalizeMenuSlots(data) {
  const slots = [null, null]
  if (!data) return slots

  if (Array.isArray(data.images)) {
    data.images.slice(0, MAX_PAGES).forEach((img, index) => {
      if (img?.url) slots[index] = { url: img.url, storagePath: img.storagePath || '' }
    })
    return slots
  }

  if (data.imageUrl) {
    slots[0] = { url: data.imageUrl, storagePath: data.storagePath || '' }
  }
  return slots
}

function slotsToFirestorePayload(slots, layout) {
  const images = slots.filter(Boolean)
  return {
    images,
    imageUrl: slots[0]?.url || '',
    storagePath: slots[0]?.storagePath || '',
    display: { layout },
  }
}

async function uploadMenuFile(file, pageIndex, onProgress) {
  const ext = extFromMime(file.type)
  const path = `menu/page-${pageIndex + 1}.${ext}`
  const storageRef = ref(storage, path)

  const task = uploadBytesResumable(storageRef, file, { contentType: file.type })
  await new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      task.cancel()
      reject(new Error('上傳逾時（90 秒），請檢查網路或 Firebase Storage 設定'))
    }, UPLOAD_TIMEOUT_MS)

    task.on(
      'state_changed',
      (snapshot) => {
        const total = snapshot.totalBytes || file.size || 1
        onProgress(Math.round((snapshot.bytesTransferred / total) * 100))
      },
      (err) => {
        window.clearTimeout(timer)
        reject(err)
      },
      () => {
        window.clearTimeout(timer)
        resolve()
      }
    )
  })

  const url = await getDownloadURL(storageRef)
  return { url, storagePath: path }
}

export const MENU_PAGE_LABELS = PAGE_LABELS
export const MENU_ACCEPT = ACCEPT

export function usePublicMenu() {
  const fileInputRef = useRef(null)
  const pendingPageRef = useRef(0)

  const [slots, setSlots] = useState([null, null])
  const [layout, setLayout] = useState(DEFAULT_MENU_LAYOUT)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [busyPage, setBusyPage] = useState(null)
  const [layoutSaving, setLayoutSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, ...MENU_DOC),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setSlots(normalizeMenuSlots(data))
          setLayout(readMenuLayoutFromDoc(data))
          setUpdatedAt(data.updatedAt?.toDate?.() ?? null)
        } else {
          setSlots([null, null])
          setLayout(DEFAULT_MENU_LAYOUT)
          setUpdatedAt(null)
        }
        setIsLoading(false)
      },
      (err) => {
        console.error('載入電子菜單設定失敗:', err)
        setError('載入菜單設定失敗')
        setIsLoading(false)
      }
    )
    return unsubscribe
  }, [])

  const persistMenu = async (nextSlots, nextLayout, message) => {
    await setDoc(
      doc(db, ...MENU_DOC),
      {
        ...slotsToFirestorePayload(nextSlots, nextLayout),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
    if (message) setSuccessMessage(message)
  }

  const persistSlots = async (nextSlots, message) => {
    await persistMenu(nextSlots, layout, message)
  }

  const handleLayoutChange = async (nextLayout) => {
    if (nextLayout === layout || layoutSaving || busyPage != null) return
    const prev = layout
    setLayout(nextLayout)
    try {
      setLayoutSaving(true)
      setError('')
      await persistMenu(slots, nextLayout, '版面已更新，客人頁會自動顯示')
    } catch (err) {
      console.error('更新版面失敗:', err)
      setLayout(prev)
      setError(formatUploadError(err))
    } finally {
      setLayoutSaving(false)
    }
  }

  const handlePickFile = (pageIndex) => {
    pendingPageRef.current = pageIndex
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    const pageIndex = pendingPageRef.current
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('請選擇圖片檔（JPG、PNG、WebP 或 GIF）')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('圖片不可超過 10 MB')
      return
    }

    try {
      setBusyPage(pageIndex)
      setUploadProgress(0)
      setError('')
      setSuccessMessage('')

      const uploaded = await uploadMenuFile(file, pageIndex, setUploadProgress)
      const nextSlots = [...slots]
      nextSlots[pageIndex] = uploaded
      await persistSlots(nextSlots, `${PAGE_LABELS[pageIndex]}已更新，客人頁會自動顯示`)
    } catch (err) {
      console.error('上傳菜單失敗:', err)
      setError(formatUploadError(err))
    } finally {
      setBusyPage(null)
      setUploadProgress(null)
    }
  }

  const handleRemovePage = async (pageIndex) => {
    const image = slots[pageIndex]
    if (!image) return

    try {
      setBusyPage(pageIndex)
      setError('')
      setSuccessMessage('')

      if (image.storagePath) {
        try {
          await deleteObject(ref(storage, image.storagePath))
        } catch (err) {
          console.warn('刪除 Storage 檔案失敗（Firestore 仍會更新）:', err)
        }
      }

      const nextSlots = [...slots]
      nextSlots[pageIndex] = null
      await persistSlots(nextSlots, `${PAGE_LABELS[pageIndex]}已移除`)
    } catch (err) {
      console.error('移除菜單失敗:', err)
      setError(formatUploadError(err))
    } finally {
      setBusyPage(null)
    }
  }

  return { fileInputRef, slots, layout, updatedAt, isLoading, busyPage, layoutSaving, uploadProgress, error, successMessage, handleLayoutChange, handlePickFile, handleFileChange, handleRemovePage }
}
