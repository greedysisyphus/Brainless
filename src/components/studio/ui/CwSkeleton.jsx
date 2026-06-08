export function CwSkeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--cw-radius)] bg-white/10 ${className}`}
      aria-hidden
    />
  )
}
