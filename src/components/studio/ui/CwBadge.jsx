export function CwBadge({ children, tone = 'neutral', className = '' }) {
  const tones = {
    neutral:
      'border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] text-[var(--cw-text-muted)]',
    brand: 'border-[var(--cw-brand)]/35 bg-[var(--cw-brand-muted)] text-[var(--cw-brand)]',
    /** @deprecated 請改用 brand */
    accent: 'border-[var(--cw-brand)]/35 bg-[var(--cw-brand-muted)] text-[var(--cw-brand)]',
    success: 'border-[var(--cw-success)] bg-[var(--cw-success-muted)] text-[var(--cw-success)]',
    warning: 'border-[var(--cw-warning)] bg-[var(--cw-warning-muted)] text-[var(--cw-warning)]',
    danger: 'border-[var(--cw-danger)] bg-[var(--cw-danger-muted)] text-[var(--cw-danger)]',
  }
  return (
    <span
      className={`inline-flex items-center rounded-[var(--cw-radius-sm)] border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${tones[tone] ?? tones.neutral} ${className}`}
    >
      {children}
    </span>
  )
}
