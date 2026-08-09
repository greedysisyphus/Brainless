import { useEffect, useId, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

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
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const generatedTitleId = useId()
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.()
      if (event.key !== 'Tab') return

      const focusable = [...(dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || [])]
      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    const focusFrame = window.requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector(FOCUSABLE_SELECTOR)
      ;(firstFocusable || dialogRef.current)?.focus()
    })
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus()
      }
    }
  }, [open])

  if (!open) return null
  const titleId = ariaLabelledBy || (title ? `cw-modal-title-${generatedTitleId}` : undefined)
  return (
    <div className="fixed inset-0" style={{ zIndex: zOverlay }}>
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="關閉對話框"
        onClick={onClose}
      />
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-y-auto overscroll-contain px-4 py-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] [-webkit-overflow-scrolling:touch] sm:py-[max(2.5rem,env(safe-area-inset-top,0px))] sm:pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
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
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 [-webkit-overflow-scrolling:touch] ${contentMaxHeightClass}`.trim()}
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
