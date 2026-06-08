/** Table wrapper：橫向捲動與 Studio 表頭樣式 */
export function CwTableShell({ children, className = '' }) {
  return (
    <div
      className={`overflow-x-auto rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <table className="min-w-full border-collapse text-left text-sm text-[var(--cw-text)]">
        {children}
      </table>
    </div>
  )
}

export function CwThead({ children }) {
  return (
    <thead className="border-b border-[var(--cw-border)] bg-[var(--cw-mega-surface)] text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
      {children}
    </thead>
  )
}

export function CwTh({ children, className = '' }) {
  return (
    <th className={`px-4 py-3 font-semibold ${className}`}>
      {children}
    </th>
  )
}

export function CwTd({ children, className = '' }) {
  return (
    <td className={`border-t border-[var(--cw-border)] px-4 py-3 ${className}`}>
      {children}
    </td>
  )
}
