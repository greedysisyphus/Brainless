export function CwGrid({ children, className = '' }) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {children}
    </div>
  )
}
