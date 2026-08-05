import { CwAlert, CwButton, CwModalFrame } from '../../components/studio/ui'
import { formatVersionTime } from './goodsOrderSync'

export function GoodsOrderSyncBanner({ status, onRetry }) {
  if (!status || status === 'idle' || status === 'synced') return null

  const messages = {
    syncing: '盤點同步中…',
    error: '無法同步到雲端，資料已保留在本機',
    offline: '目前離線，變更僅存於本機',
    conflict: '雲端與本機不一致，請選擇處理方式',
  }

  return (
    <CwAlert variant={status === 'error' ? 'error' : 'warning'} className="mb-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{messages[status] || status}</span>
        {status === 'error' && onRetry ? (
          <CwButton type="button" variant="secondary" onClick={onRetry}>
            重試同步
          </CwButton>
        ) : null}
      </div>
    </CwAlert>
  )
}

export function GoodsOrderConflictModal({
  open,
  storeName,
  localUpdatedAt,
  remoteUpdatedAt,
  onKeepLocal,
  onUseRemote,
  onMerge,
}) {
  if (!open) return null

  return (
    <CwModalFrame open={open} onClose={onKeepLocal} title="雲端有較新資料" maxWidthClass="max-w-md">
      <p className="text-sm leading-relaxed text-[var(--cw-text-muted)]">
        {storeName} 的雲端盤點比本機新，且你正在編輯中（本機優先，尚未套用雲端）。
      </p>
      <ul className="mt-3 space-y-2 text-sm text-[var(--cw-text)]">
        <li>
          <span className="text-[var(--cw-text-muted)]">本機版本：</span>
          {formatVersionTime(localUpdatedAt)}
        </li>
        <li>
          <span className="text-[var(--cw-text-muted)]">雲端版本：</span>
          {formatVersionTime(remoteUpdatedAt)}
        </li>
      </ul>
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
    </CwModalFrame>
  )
}
