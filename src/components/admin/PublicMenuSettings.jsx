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
import { PUBLIC_MENU_SITE_URL } from '../../utils/publicMenuDisplay'
import { MENU_ACCEPT as ACCEPT, MENU_PAGE_LABELS as PAGE_LABELS, usePublicMenu } from './usePublicMenu'


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
  readOnly = false,
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

  const actions = readOnly ? null : (
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

function MenuLoginHint({ isStudio }) {
  const loginLink = (
    <a
      href="#/admin"
      className={
        isStudio
          ? 'font-semibold text-[var(--cw-text)] underline underline-offset-2 hover:opacity-90'
          : 'font-semibold text-primary underline underline-offset-2 hover:text-primary/90'
      }
    >
      登入管理員
    </a>
  )

  if (isStudio) {
    return (
      <CwAlert variant="neutral">
        如需修改菜單圖片或顯示版面，請先 {loginLink}。
      </CwAlert>
    )
  }

  return (
    <ResponsiveText
      size="sm"
      color="secondary"
      className="block rounded-lg border border-white/10 bg-surface/40 px-4 py-3"
    >
      如需修改菜單圖片或顯示版面，請先 {loginLink}。
    </ResponsiveText>
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
export default function PublicMenuSettings({ embedded = false, canEdit = true }) {
  const { isStudio } = useTheme()
  const { fileInputRef, slots, layout, updatedAt, isLoading, busyPage, layoutSaving, uploadProgress, error, successMessage, handleLayoutChange, handlePickFile, handleFileChange, handleRemovePage } = usePublicMenu()

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

      {!canEdit ? <MenuLoginHint isStudio={isStudio} /> : null}

      <MenuSection
        title="菜單圖片"
        description={
          canEdit
            ? '最多 2 張；可只上傳第 1 頁，第 2 頁選填。更新後客人 QR 站會自動同步。'
            : '目前上架中的菜單圖片。'
        }
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
              readOnly={!canEdit}
              onPick={() => handlePickFile(index)}
              onRemove={() => handleRemovePage(index)}
              canRemove={index === 1 && Boolean(slots[1])}
            />
          ))}
        </div>
      </MenuSection>

      <MenuSection
        title="顯示設定"
        description={
          canEdit
            ? '選擇客人掃 QR 後的排版。換圖會立即生效；「左右／分頁」需 menu-site 已部署到 Vercel 新版後才會在客人頁顯示。'
            : '目前客人頁使用的排版。'
        }
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
                disabled={!canEdit || layoutSaving || busyPage != null}
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
