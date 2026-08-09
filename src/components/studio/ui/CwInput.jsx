import { forwardRef } from 'react'

export const CwInput = forwardRef(function CwInput({
  label,
  id,
  hint,
  error,
  className = '',
  inputClassName = '',
  ...props
}, ref) {
  const inputId = id || props.name || undefined
  const errorId = inputId ? `${inputId}-error` : undefined
  const hintId = inputId ? `${inputId}-hint` : undefined
  const describedBy = [props['aria-describedby'], error ? errorId : hint ? hintId : '']
    .filter(Boolean)
    .join(' ') || undefined
  return (
    <label className={`block ${className}`} htmlFor={inputId}>
      {label ? (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
          {label}
        </span>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={`w-full min-h-11 rounded-[var(--cw-radius)] border bg-[var(--cw-bg)] px-3 py-2.5 text-base text-[var(--cw-text)] placeholder:text-[var(--cw-text-muted)] focus:outline-none focus:ring-1 ${
          error
            ? 'border-[var(--cw-danger)] focus:border-[var(--cw-danger)] focus:ring-[var(--cw-danger)]'
            : 'border-[var(--cw-border)] focus:border-[var(--cw-border-strong)] focus:ring-[var(--cw-focus-ring)]'
        } ${inputClassName}`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        {...props}
        aria-invalid={error ? 'true' : props['aria-invalid']}
        aria-describedby={describedBy}
      />
      {error ? (
        <span id={errorId} className="mt-1 block text-sm text-[var(--cw-danger)]">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="mt-1 block text-xs text-[var(--cw-text-muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  )
})

export function CwTextarea({ label, id, hint, className = '', textareaClassName = '', ...props }) {
  const inputId = id || props.name
  return (
    <label className={`block ${className}`} htmlFor={inputId}>
      {label ? (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
          {label}
        </span>
      ) : null}
      <textarea
        id={inputId}
        className={`w-full resize-y rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-3 py-2.5 text-sm text-[var(--cw-text)] placeholder:text-[var(--cw-text-muted)] focus:border-[var(--cw-border-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--cw-focus-ring)] ${textareaClassName}`}
        {...props}
      />
      {hint ? (
        <span className="mt-1 block text-xs text-[var(--cw-text-muted)]">{hint}</span>
      ) : null}
    </label>
  )
}

export function CwSelect({ label, id, hint, children, className = '', selectClassName = '', ...props }) {
  const inputId = id || props.name
  return (
    <label className={`block ${className}`} htmlFor={inputId}>
      {label ? (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
          {label}
        </span>
      ) : null}
      <select
        id={inputId}
        className={`w-full min-h-11 rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-3 py-2 text-sm text-[var(--cw-text)] focus:border-[var(--cw-border-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--cw-focus-ring)] ${selectClassName}`}
        {...props}
      >
        {children}
      </select>
      {hint ? (
        <span className="mt-1 block text-xs text-[var(--cw-text-muted)]">{hint}</span>
      ) : null}
    </label>
  )
}
