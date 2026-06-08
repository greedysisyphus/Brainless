export function StudioSectionTitle({ children, kicker }) {
  return (
    <div className="mb-4">
      {kicker ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--cw-text-muted)]">
          {kicker}
        </p>
      ) : null}
      <h2 className="text-xl font-bold text-[var(--cw-text)]">{children}</h2>
    </div>
  )
}
