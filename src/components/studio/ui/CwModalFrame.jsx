/**
 * Studio 對話框骨架：backdrop、置中面板、標題列、可選 footer。
 * 以 flex 欄位配置確保 header/footer 在短視窗（如 iPad）上始終可見，僅內容區捲動。
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
  contentMaxHeightClass = '',
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
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-y-auto px-4 py-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] [-webkit-overflow-scrolling:touch] sm:py-[max(2.5rem,env(safe-area-inset-top,0px))] sm:pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`pointer-events-auto relative flex max-h-[min(100%,880px)] w-full ${maxWidthClass} flex-col overflow-hidden rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || description || headerActions) && (
            <div className="flex shrink-0 gap-4 border-b border-[var(--cw-border-strong)] p-6">
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
          <div
            className={`min-h-0 flex-1 overflow-y-auto p-6 [-webkit-overflow-scrolling:touch] ${contentMaxHeightClass}`.trim()}
          >
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] p-6">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
