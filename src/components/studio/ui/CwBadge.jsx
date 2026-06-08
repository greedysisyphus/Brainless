export function CwBadge({ children, tone = 'neutral', className = '' }) {
  const tones = {
    neutral:
      'border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] text-[var(--cw-text-muted)]',
    brand: 'border-[var(--cw-brand)]/35 bg-[var(--cw-brand-muted)] text-[var(--cw-brand)]',
    /** @deprecated 請改用 brand */
    accent: 'border-[var(--cw-brand)]/35 bg-[var(--cw-brand-muted)] text-[var(--cw-brand)]',
    success: 'border-emerald-500/35 bg-emerald-950/30 text-emerald-200',
    warning: 'border-amber-500/35 bg-amber-950/30 text-amber-200',
    danger: 'border-red-500/35 bg-red-950/30 text-red-200',
  }
  return (
    <span
      className={`inline-flex items-center rounded-[var(--cw-radius-sm)] border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${tones[tone] ?? tones.neutral} ${className}`}
    >
      {children}
    </span>
  )
}
