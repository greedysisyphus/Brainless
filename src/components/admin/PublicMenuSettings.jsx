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
import PublicMenuLayoutPreview, { MenuLayoutSelector } from './PublicMenuLayoutPreview'
import { DEFAULT_MENU_LAYOUT, PUBLIC_MENU_SITE_URL, readMenuLayoutFromDoc } from '../../utils/publicMenuDisplay'

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
      className="max-h-44 w-full rounded-[var(--cw-radius)] border border-[var(--cw-border)] object-contain bg-[var(--cw-bg)] sm:max-h-52"
    />
  ) : (
    <div className="flex min-h-[140px] items-center justify-center rounded-[var(--cw-radius)] border border-dashed border-[var(--cw-border)] bg-[var(--cw-bg)] px-3 py-6 text-center text-sm text-[var(--cw-text-muted)]">
      尚未上傳
    </div>
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
    <div className="flex h-full flex-col gap-3 rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-mega-surface)] p-4">
      {isStudio ? (
        <span className="block text-sm font-semibold text-[var(--cw-text)]">{label}</span>
      ) : (
        <ResponsiveLabel className="font-semibold">{label}</ResponsiveLabel>
      )}
      {preview}
      {image?.storagePath ? (
        <p className="truncate text-xs text-[var(--cw-text-muted)]" title={image.storagePath}>
          {image.storagePath}
        </p>
      ) : null}
      {actions}
    </div>
  )
}

function MenuSection({ title, description, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-[var(--cw-text)]">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs text-[var(--cw-text-muted)]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
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

  const content = (
    <div className="space-y-8">
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

      <MenuSection
        title="菜單圖片"
        description="最多 2 張；可只上傳第 1 頁，第 2 頁選填。更新後客人 QR 站會自動同步。"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
      </MenuSection>

      <MenuSection
        title="顯示設定"
        description="選擇客人掃 QR 後的排版。換圖會立即生效；「左右／分頁」需 menu-site 已部署到 Vercel 新版後才會在客人頁顯示。"
      >
        <div className="rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-bg)] p-4 lg:p-5">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,320px)_1fr] xl:items-start">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
                版面
              </p>
              <MenuLayoutSelector
                layout={layout}
                onChange={handleLayoutChange}
                disabled={layoutSaving || busyPage != null}
                variant="grid"
              />
              {layoutSaving ? (
                <ResponsiveText size="xs" color="secondary" className="block">
                  儲存版面中…
                </ResponsiveText>
              ) : null}
            </div>

            <div className="space-y-3 xl:border-l xl:border-[var(--cw-border)] xl:pl-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
                預覽
              </p>
              <PublicMenuLayoutPreview layout={layout} slots={slots} embedded />
            </div>
          </div>
        </div>
      </MenuSection>

      <MenuSection
        title="客人頁預覽"
        description="即時顯示 simplekaffa-menu.vercel.app；與 QR 掃描結果相同。"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {isStudio ? (
              <CwButton
                type="button"
                variant="secondary"
                onClick={() => window.open(PUBLIC_MENU_SITE_URL, '_blank', 'noopener,noreferrer')}
              >
                在新分頁開啟客人頁
              </CwButton>
            ) : (
              <ResponsiveButton
                variant="secondary"
                onClick={() => window.open(PUBLIC_MENU_SITE_URL, '_blank', 'noopener,noreferrer')}
              >
                在新分頁開啟客人頁
              </ResponsiveButton>
            )}
            <ResponsiveText size="xs" color="secondary" className="block sm:inline">
              {PUBLIC_MENU_SITE_URL}
            </ResponsiveText>
          </div>
          <div className="overflow-hidden rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-white">
            <iframe
              src={PUBLIC_MENU_SITE_URL}
              title="客人電子菜單預覽"
              className="h-[min(70vh,640px)] w-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      </MenuSection>

      {updatedAt ? (
        <ResponsiveText size="xs" color="secondary" className="block">
          上次更新：{updatedAt.toLocaleString('zh-TW')}
        </ResponsiveText>
      ) : null}
    </div>
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
              最多 2 張圖；換圖後客人 QR 站會自動同步。版面「左右／分頁」需 Vercel 部署 menu-site 新版。
            </p>
          </div>
        ) : null}
        {content}
      </>
    )

    return embedded ? (
      <div>{body}</div>
    ) : (
      <CwCard className="space-y-4">{body}</CwCard>
    )
  }

  return embedded ? (
    <div>{content}</div>
  ) : (
    <ResponsiveCard className="space-y-4">
      <ResponsiveTitle level={2}>電子菜單</ResponsiveTitle>
      <ResponsiveText size="sm" color="secondary">
        最多 2 張圖；換圖後客人 QR 站會自動同步。版面「左右／分頁」需 Vercel 部署 menu-site 新版。
      </ResponsiveText>
      {content}
    </ResponsiveCard>
  )
}
