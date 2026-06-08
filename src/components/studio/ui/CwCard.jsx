export function CwCard({ title, subtitle, actions, children, className = '' }) {
  return (
    <div
      className={`rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-surface)] p-5 ${className}`}
    >
      {(title || subtitle || actions) && (
        <div className={`mb-4 flex flex-wrap items-start justify-between gap-3 ${!title && !subtitle ? '' : ''}`}>
          <div className="min-w-0">
            {title && <h3 className="text-lg font-bold text-[var(--cw-text)]">{title}</h3>}
            {subtitle && (
              <p className="mt-1 text-sm text-[var(--cw-text-muted)]">{subtitle}</p>
            )}
          </div>
          {actions ? <div className="flex flex-shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      )}
      <div>{children}</div>
    </div>
  )
}
