/** Studio-only button; does not mutate classic .btn-primary */
export function CwButton({
  children,
  variant = 'primary',
  type = 'button',
  disabled,
  className = '',
  ...rest
}) {
  const base =
    'cw-touch-target inline-flex items-center justify-center gap-2 rounded-[var(--cw-radius)] px-4 py-2.5 text-sm font-semibold transition-[color,background-color,border-color,opacity] duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50'
  const variants = {
    primary:
      'bg-[var(--cw-fg-emphasis)] text-[var(--cw-fg-emphasis-contrast)] hover:opacity-90 focus-visible:outline-[var(--cw-focus-ring)]',
    secondary:
      'border border-[var(--cw-border-strong)] bg-transparent text-[var(--cw-text)] hover:bg-[var(--cw-mega-surface)] focus-visible:outline-[var(--cw-focus-ring)]',
    ghost:
      'border border-transparent bg-transparent text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)] hover:text-[var(--cw-text)] focus-visible:outline-[var(--cw-focus-ring)]',
    danger:
      'border border-red-500/35 bg-red-950/40 text-red-200 hover:bg-red-950/55 focus-visible:outline-[var(--cw-focus-ring)]',
    brand:
      'bg-[var(--cw-brand-muted)] text-[var(--cw-brand)] border border-[var(--cw-brand)]/35 hover:bg-[var(--cw-brand)]/20 focus-visible:outline-[var(--cw-focus-ring)]',
    /** @deprecated 請改用 brand；保留相容 */
    pillPrimary:
      'rounded-[var(--cw-radius-pill)] border border-[var(--cw-brand)]/35 bg-[var(--cw-brand-muted)] px-5 py-2.5 text-[var(--cw-brand)] hover:bg-[var(--cw-brand)]/20 focus-visible:outline-[var(--cw-focus-ring)]',
  }
  const v = variants[variant] ?? variants.primary
  return (
    <button type={type} disabled={disabled} className={`${base} ${v} ${className}`} {...rest}>
      {children}
    </button>
  )
}
