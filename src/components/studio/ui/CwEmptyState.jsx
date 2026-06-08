export function CwEmptyState({ title, description, actions }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] border-dashed bg-[var(--cw-surface)]/50 px-6 py-14 text-center">
      <div className="mb-4 text-xl font-semibold text-[var(--cw-text)]">{title}</div>
      {description ? (
        <p className="mb-6 max-w-md text-sm text-[var(--cw-text-muted)]">{description}</p>
      ) : null}
      {actions ? <div className="flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  )
}
