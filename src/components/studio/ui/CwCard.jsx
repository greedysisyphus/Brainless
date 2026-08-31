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
          {/* flex-shrink-0 在窄螢幕會把 actions 撐出畫面（chips、下拉選單都可能比 375px 寬），
              所以只在放得下的時候不縮，窄的時候讓它換行並自己捲。 */}
          {actions ? (
            <div className="flex min-w-0 max-w-full flex-wrap gap-2 sm:flex-shrink-0">{actions}</div>
          ) : null}
        </div>
      )}
      <div>{children}</div>
    </div>
  )
}
