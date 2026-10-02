import { useContext } from 'react'
import { InBlShell } from '../bl/chrome'

/**
 * Club 頁面 chrome — Classic routes must not wrap with this component.
 */
export function StudioPageChrome({ breadcrumbs = [], title, description, children }) {
  // 在新版外殼裡：標題由外殼畫，這裡只留說明文字與內容
  const inBlShell = useContext(InBlShell)
  if (inBlShell) {
    return (
      <div className="studio-root">
        {description ? <p className="bl-desc">{description}</p> : null}
        {children}
      </div>
    )
  }
  return (
    <div className="studio-root">
      {(breadcrumbs.length > 0 || title) && (
        <header className="mb-8 pt-4 sm:pt-5 md:pt-6">
          {breadcrumbs.length > 0 ? (
            <nav className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-[var(--cw-text-muted)]">
              {breadcrumbs.map((bc, idx) => (
                <span key={typeof bc.label === 'string' ? bc.label : idx}>
                  {idx > 0 ? <span aria-hidden className="mx-1 text-[var(--cw-border-strong)]">→</span> : null}
                  {bc.href ? (
                    <a href={bc.href} className="hover:text-[var(--cw-text)]">
                      {bc.label}
                    </a>
                  ) : (
                    <span className={idx === breadcrumbs.length - 1 ? 'text-[var(--cw-text)]' : ''}>
                      {bc.label}
                    </span>
                  )}
                </span>
              ))}
            </nav>
          ) : null}
          {title ? (
            <h1 className="text-3xl font-bold tracking-tight text-[var(--cw-text)] md:text-4xl">
              {title}
            </h1>
          ) : null}
          {description ? (
            <p className="mt-2 max-w-2xl text-sm text-[var(--cw-text-muted)]">{description}</p>
          ) : null}
        </header>
      )}
      {children}
    </div>
  )
}
