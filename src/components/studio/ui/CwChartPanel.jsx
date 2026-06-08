export function CwChartPanel({ title, actions, children, className = '' }) {
  return (
    <div
      className={`rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-surface)] p-4 ${className}`}
    >
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title ? (
            <h3 className="text-base font-bold text-[var(--cw-text)]">{title}</h3>
          ) : (
            <span />
          )}
          {actions}
        </div>
      )}
      <div className="min-h-[240px] w-full">{children}</div>
    </div>
  )
}
