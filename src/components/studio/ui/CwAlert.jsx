/** Studio-toned alerts (Firebase banner, inline errors). */
export function CwAlert({ variant = 'warning', title, children, className = '' }) {
  const styles = {
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
    error: 'border-red-500/40 bg-red-500/10 text-red-100',
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
    neutral: 'border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] text-[var(--cw-text)]',
  }
  return (
    <div
      className={`rounded-[var(--cw-radius-lg)] border p-4 text-sm ${styles[variant]} ${className}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {title ? <div className="mb-2 font-semibold">{title}</div> : null}
      <div className="text-[var(--cw-text-muted)] [&_strong]:text-[var(--cw-text)]">{children}</div>
    </div>
  )
}
