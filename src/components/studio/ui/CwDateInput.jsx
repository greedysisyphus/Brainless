import { useCallback, useRef } from 'react'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'

/** @param {HTMLInputElement | null} input */
export function tryOpenDatePicker(input) {
  if (!input) return
  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker()
      return
    } catch {
      /* 已開啟、不支援或需使用者手勢時略過 */
    }
  }
  input.focus({ preventScroll: true })
}

/**
 * Studio 日期輸入：整欄點擊 + 右側日曆鈕皆會嘗試開啟原生選擇器（修正深色主題圖示難點、點擊區過小）。
 */
export function CwDateInput({
  label,
  id,
  hint,
  className = '',
  inputClassName = '',
  wrapperClassName = '',
  onClick,
  ...props
}) {
  const inputRef = useRef(null)
  const inputId = id || props.name

  const openPicker = useCallback(() => {
    tryOpenDatePicker(inputRef.current)
  }, [])

  const handleInputClick = useCallback(
    (e) => {
      tryOpenDatePicker(e.currentTarget)
      onClick?.(e)
    },
    [onClick]
  )

  const field = (
    <div className={`relative ${wrapperClassName}`}>
      <input
        ref={inputRef}
        id={inputId}
        type="date"
        className={`cw-date-input w-full min-h-11 rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] py-2.5 pl-3 pr-11 text-sm text-[var(--cw-text)] placeholder:text-[var(--cw-text-muted)] focus:border-[var(--cw-border-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--cw-focus-ring)] ${inputClassName}`}
        style={{ WebkitTapHighlightColor: 'transparent', colorScheme: 'dark' }}
        onClick={handleInputClick}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="開啟日期選擇器"
        className="absolute inset-y-0 right-0 z-[1] flex w-11 min-w-11 items-center justify-center rounded-r-[var(--cw-radius)] text-[var(--cw-text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--cw-text)]"
        onPointerDown={(e) => {
          e.preventDefault()
          openPicker()
        }}
        onClick={(e) => e.preventDefault()}
      >
        <CalendarDaysIcon className="h-5 w-5 pointer-events-none" aria-hidden />
      </button>
    </div>
  )

  if (label) {
    return (
      <label
        className={`block ${className}`}
        htmlFor={inputId}
        onClick={(e) => {
          if (e.target === e.currentTarget) openPicker()
        }}
      >
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
          {label}
        </span>
        {field}
        {hint ? <span className="mt-1 block text-xs text-[var(--cw-text-muted)]">{hint}</span> : null}
      </label>
    )
  }

  return (
    <div className={className}>
      {field}
      {hint ? <span className="mt-1 block text-xs text-[var(--cw-text-muted)]">{hint}</span> : null}
    </div>
  )
}
