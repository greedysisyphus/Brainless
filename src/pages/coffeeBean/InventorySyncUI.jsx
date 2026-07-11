import { CwAlert, CwButton, CwModalFrame } from '../../components/studio/ui'

export function InventorySyncBanner({ status, isStudio, onRetry }) {
  if (!status || status === 'idle' || status === 'synced') return null

  const messages = {
    syncing: '盤點同步中…',
    error: '無法同步到雲端，資料已保留在本機',
    offline: '目前離線，變更僅存於本機',
    conflict: '雲端與本機盤點不一致，請選擇處理方式',
  }

  const text = messages[status]
  if (!text) return null

  if (isStudio) {
    return (
      <CwAlert variant={status === 'error' ? 'error' : 'warning'} className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{text}</span>
          {status === 'error' && onRetry ? (
            <CwButton type="button" variant="secondary" onClick={onRetry}>
              重試同步
            </CwButton>
          ) : null}
        </div>
      </CwAlert>
    )
  }

  return (
    <div
      className={`mb-4 rounded-lg border p-3 text-sm ${
        status === 'error'
          ? 'border-red-500/30 bg-red-500/10 text-red-200'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{text}</span>
        {status === 'error' && onRetry ? (
          <button
            type="button"
            className="rounded-lg border border-white/20 px-3 py-1 text-xs hover:bg-white/10"
            onClick={onRetry}
          >
            重試同步
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function InventoryConflictModal({
  open,
  isStudio,
  storeName,
  onKeepLocal,
  onUseRemote,
  onMerge,
}) {
  if (!open) return null

  const body = (
  <>
      <p className="text-sm leading-relaxed text-[var(--cw-text-muted)]">
        {storeName} 的雲端盤點比本機更新，且你正在編輯中。要如何處理？
      </p>
      <ul className="mt-3 space-y-1 text-xs text-[var(--cw-text-muted)]">
        <li>· <strong className="text-[var(--cw-text)]">保留本機</strong>：以你目前填的為準，稍後覆寫雲端</li>
        <li>· <strong className="text-[var(--cw-text)]">使用雲端</strong>：放棄本機未同步的變更</li>
        <li>· <strong className="text-[var(--cw-text)]">合併</strong>：以雲端為底，保留本機已填的格子</li>
      </ul>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <CwButton type="button" variant="primary" className="sm:flex-1" onClick={onMerge}>
          合併
        </CwButton>
        <CwButton type="button" variant="secondary" className="sm:flex-1" onClick={onKeepLocal}>
          保留本機
        </CwButton>
        <CwButton type="button" variant="ghost" className="sm:flex-1" onClick={onUseRemote}>
          使用雲端
        </CwButton>
      </div>
    </>
  )

  if (isStudio) {
    return (
      <CwModalFrame open={open} onClose={onKeepLocal} title="雲端有較新資料，要合併嗎？" maxWidthClass="max-w-md">
        {body}
      </CwModalFrame>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-surface p-5 shadow-xl">
        <h3 className="mb-3 text-lg font-bold text-primary">雲端有較新資料，要合併嗎？</h3>
        <p className="text-sm leading-relaxed text-text-secondary">
          {storeName} 的雲端盤點比本機更新，且你正在編輯中。要如何處理？
        </p>
        <ul className="mt-3 space-y-1 text-xs text-text-secondary">
          <li>· <strong className="text-primary">保留本機</strong>：以你目前填的為準，稍後覆寫雲端</li>
          <li>· <strong className="text-primary">使用雲端</strong>：放棄本機未同步的變更</li>
          <li>· <strong className="text-primary">合併</strong>：以雲端為底，保留本機已填的格子</li>
        </ul>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" className="btn-primary w-full rounded-lg py-2.5 text-sm font-semibold" onClick={onMerge}>
            合併
          </button>
          <button type="button" className="w-full rounded-lg border border-white/20 py-2.5 text-sm hover:bg-white/10" onClick={onKeepLocal}>
            保留本機
          </button>
          <button type="button" className="w-full rounded-lg py-2.5 text-sm text-text-secondary hover:bg-white/5" onClick={onUseRemote}>
            使用雲端
          </button>
        </div>
      </div>
    </div>
  )
}
