/**
 * Studio 對話框骨架：backdrop、置中面板、標題列、可選 footer。
 * 不含動畫；需要時由外層包 AnimatePresence。
 */
export function CwModalFrame({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  headerActions,
  maxWidthClass = 'max-w-4xl',
  contentMaxHeightClass = 'max-h-[calc(90vh-180px)]',
  zOverlay = 10000,
  ariaLabelledBy,
}) {
  if (!open) return null
  const titleId = ariaLabelledBy || (title ? 'cw-modal-title' : undefined)
  return (
    <div className="fixed inset-0" style={{ zIndex: zOverlay }}>
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="關閉對話框"
        onClick={onClose}
      />
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-y-auto p-4 py-10 [-webkit-overflow-scrolling:touch] sm:py-14">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`pointer-events-auto relative max-h-[min(90dvh,880px)] w-full ${maxWidthClass} overflow-hidden rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || description || headerActions) && (
            <div className="flex gap-4 border-b border-[var(--cw-border-strong)] p-6">
              <div className="min-w-0 flex-1">
                {title ? (
                  <h2 id={titleId} className="mb-1 text-2xl font-bold text-[var(--cw-text)]">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p className="text-sm text-[var(--cw-text-muted)]">{description}</p>
                ) : null}
              </div>
              {headerActions ? <div className="flex shrink-0 flex-col items-end gap-2">{headerActions}</div> : null}
            </div>
          )}
          <div className={`overflow-y-auto p-6 [-webkit-overflow-scrolling:touch] ${contentMaxHeightClass}`}>{children}</div>
          {footer ? (
            <div className="border-t border-[var(--cw-border-strong)] p-6">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
