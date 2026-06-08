export function CwStack({ gap = 'md', children, className = '' }) {
  const gaps = { sm: 'gap-3', md: 'gap-5', lg: 'gap-8' }
  return <div className={`flex flex-col ${gaps[gap] ?? gaps.md} ${className}`}>{children}</div>
}
