import { useEffect, useRef, useState } from 'react'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { db, storage } from '../../utils/firebase'
import { useTheme } from '../../contexts/ThemeContext'
import {
  ResponsiveCard,
  ResponsiveButton,
  ResponsiveLabel,
  ResponsiveText,
  ResponsiveTitle,
} from '../common/ResponsiveContainer'
import { CwAlert, CwButton, CwCard } from '../studio/ui'

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

function slotsToFirestorePayload(slots) {
  const images = slots.filter(Boolean)
  return {
    images,
    imageUrl: slots[0]?.url || '',
    storagePath: slots[0]?.storagePath || '',
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

function MenuPageSlot({
  pageIndex,
  label,
  image,
  isBusy,
  uploadProgress,
  isStudio,
  onPick,
  onRemove,
  canRemove,
}) {
  const uploadLabel = image ? `更換${label}` : `上傳${label}`

  const preview = image ? (
    <img
      src={image.url}
      alt={label}
      className="max-h-[50vh] w-full rounded-lg border border-[var(--cw-border)] object-contain bg-black/20"
    />
  ) : (
    <p className="text-sm text-[var(--cw-text-muted)]">尚未上傳</p>
  )

  const progressText =
    isBusy && uploadProgress != null ? `上傳中… ${uploadProgress}%` : isBusy ? '上傳中…' : uploadLabel

  const actions = (
    <div className="flex flex-wrap gap-2">
      {isStudio ? (
        <>
          <CwButton type="button" disabled={isBusy} onClick={onPick}>
            {progressText}
          </CwButton>
          {canRemove ? (
            <CwButton type="button" variant="secondary" disabled={isBusy} onClick={onRemove}>
              移除{label}
            </CwButton>
          ) : null}
        </>
      ) : (
        <>
          <ResponsiveButton onClick={onPick} disabled={isBusy} loading={isBusy}>
            {progressText}
          </ResponsiveButton>
          {canRemove ? (
            <ResponsiveButton onClick={onRemove} disabled={isBusy} variant="secondary">
              移除{label}
            </ResponsiveButton>
          ) : null}
        </>
      )}
    </div>
  )

  return (
    <div className="space-y-3 rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] p-4">
      <ResponsiveLabel className="block font-semibold">{label}</ResponsiveLabel>
      {preview}
      {image?.storagePath ? (
        <p className="text-xs text-[var(--cw-text-muted)]">Storage：{image.storagePath}</p>
      ) : null}
      {actions}
    </div>
  )
}

/**
 * 電子菜單 Phase 1：最多 2 張圖，上傳 Storage menu/page-*，寫入 Firestore publicMenu/current
 */
export default function PublicMenuSettings({ embedded = false }) {
  const { isStudio } = useTheme()
  const fileInputRef = useRef(null)
  const pendingPageRef = useRef(0)

  const [slots, setSlots] = useState([null, null])
  const [updatedAt, setUpdatedAt] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [busyPage, setBusyPage] = useState(null)
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
          setUpdatedAt(data.updatedAt?.toDate?.() ?? null)
        } else {
          setSlots([null, null])
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

  const persistSlots = async (nextSlots, message) => {
    await setDoc(
      doc(db, ...MENU_DOC),
      {
        ...slotsToFirestorePayload(nextSlots),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
    setSuccessMessage(message)
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

  const content = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />

      {error ? (
        isStudio ? (
          <CwAlert variant="error">{error}</CwAlert>
        ) : (
          <ResponsiveText size="sm" className="text-red-400">
            {error}
          </ResponsiveText>
        )
      ) : null}

      {successMessage ? (
        isStudio ? (
          <CwAlert variant="success">{successMessage}</CwAlert>
        ) : (
          <ResponsiveText size="sm" className="text-green-400">
            {successMessage}
          </ResponsiveText>
        )
      ) : null}

      <div className="space-y-4">
        {PAGE_LABELS.map((label, index) => (
          <MenuPageSlot
            key={label}
            pageIndex={index}
            label={label}
            image={slots[index]}
            isBusy={busyPage === index}
            uploadProgress={busyPage === index ? uploadProgress : null}
            isStudio={isStudio}
            onPick={() => handlePickFile(index)}
            onRemove={() => handleRemovePage(index)}
            canRemove={index === 1 && Boolean(slots[1])}
          />
        ))}
      </div>

      {updatedAt ? (
        <ResponsiveText size="xs" color="secondary" className="block">
          上次更新：{updatedAt.toLocaleString('zh-TW')}
        </ResponsiveText>
      ) : null}

      <ResponsiveText size="xs" color="secondary" className="block">
        可只上傳第 1 頁；第 2 頁 Optional。
      </ResponsiveText>
    </>
  )

  if (isLoading) {
    return isStudio ? (
      <CwCard>
        <p className="text-sm text-[var(--cw-text-muted)]">載入菜單設定…</p>
      </CwCard>
    ) : (
      <ResponsiveCard>
        <ResponsiveText>載入菜單設定…</ResponsiveText>
      </ResponsiveCard>
    )
  }

  if (isStudio) {
    const body = (
      <>
        {!embedded ? (
          <div>
            <h2 className="text-lg font-semibold text-[var(--cw-text)]">電子菜單</h2>
            <p className="mt-1 text-sm text-[var(--cw-text-muted)]">
              最多 2 張圖；客人掃 QR 的獨立站會讀取 Firestore，無需重新部署
            </p>
          </div>
        ) : null}
        {content}
      </>
    )

    return embedded ? (
      <div className="space-y-4">{body}</div>
    ) : (
      <CwCard className="space-y-4">{body}</CwCard>
    )
  }

  return embedded ? (
    <div className="space-y-4">{content}</div>
  ) : (
    <ResponsiveCard className="space-y-4">
      <ResponsiveTitle level={2}>電子菜單</ResponsiveTitle>
      <ResponsiveText size="sm" color="secondary">
        最多 2 張圖；客人掃 QR 的獨立站會讀取 Firestore，無需重新部署
      </ResponsiveText>
      {content}
    </ResponsiveCard>
  )
}
