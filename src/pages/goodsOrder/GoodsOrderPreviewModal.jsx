import { CwButton, CwModalFrame } from '../../components/studio/ui'

export function GoodsOrderPreviewModal({
  open,
  text,
  warning,
  partial = false,
  busy = false,
  onClose,
  onConfirmCopy,
}) {
  if (!open) return null

  return (
    <CwModalFrame
      open={open}
      onClose={onClose}
      title="確認叫貨文字"
      description="唯讀預覽。要改請回清單調整後再複製。"
      maxWidthClass="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <CwButton type="button" variant="ghost" onClick={onClose} disabled={busy}>
            返回調整
          </CwButton>
          <CwButton type="button" variant="primary" onClick={onConfirmCopy} disabled={busy}>
            {busy ? '處理中…' : partial ? '複製部分叫貨單' : '複製並更新快照'}
          </CwButton>
        </div>
      }
    >
      {warning ? (
        <div
          className="mb-4 rounded-[var(--cw-radius)] border border-[var(--cw-warning)] bg-[var(--cw-warning-muted)] p-3 text-sm text-[var(--cw-warning)]"
          role="status"
        >
          {warning}
        </div>
      ) : null}
      <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] p-4 text-sm leading-relaxed text-[var(--cw-text)]">
        {text}
      </pre>
    </CwModalFrame>
  )
}
