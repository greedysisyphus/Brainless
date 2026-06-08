import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ArrowsRightLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import StudioTopNav from './StudioTopNav'
import logoCat from '../../assets/logo-cat.png'
import { useChangelog } from '../../contexts/ChangelogContext'
import { useTheme } from '../../contexts/ThemeContext'
import {
  ADMIN_NAV_META,
  getNavSections,
  itemsForSection,
} from '../../config/navigation.jsx'

function MegaMenuItem({ item, close }) {
  const { path, label, Icon } = item
  return (
    <NavLink
      to={path}
      onClick={close}
      className={({ isActive }) =>
        `cw-touch-target flex items-center gap-3 rounded-[var(--cw-radius-lg)] px-3 py-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--cw-focus-ring)] ${
          isActive ? 'bg-white/10' : 'hover:bg-white/5 active:bg-white/10'
        }`
      }
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] text-[var(--cw-text-muted)]">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <span className="flex-1 text-left text-[15px] font-semibold text-[var(--cw-text)]">
        {label}
      </span>
    </NavLink>
  )
}

export default function StudioHeader({ isAdmin }) {
  const wrapRef = useRef(null)
  const { openChangelog } = useChangelog()
  const { setTheme } = useTheme()
  const [megaSection, setMegaSection] = useState(null)
  const sections = getNavSections()

  useEffect(() => {
    function onDocDown(e) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target)) {
        setMegaSection(null)
      }
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('touchstart', onDocDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('touchstart', onDocDown)
    }
  }, [])

  const closeMega = () => setMegaSection(null)

  const toggleMega = (sectionName) => {
    setMegaSection((prev) => (prev === sectionName ? null : sectionName))
  }

  const megaItems = megaSection ? itemsForSection(megaSection) : []

  return (
    <div ref={wrapRef} className="sticky top-6 z-[60] cw-px-safe">
      <header
        className="relative border-b border-[var(--cw-border)] bg-[var(--cw-header-bg)]"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-3 py-2.5 lg:px-4 lg:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-6">
            <div className="flex min-w-0 items-center gap-2">
              <img
                src={logoCat}
                alt=""
                className="h-9 w-9 flex-shrink-0 rounded-full border border-[var(--cw-border-strong)] object-cover md:h-10 md:w-10"
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-[var(--cw-text)] md:text-base">
                  Brainless
                </div>
                <div className="hidden text-[11px] text-[var(--cw-text-muted)] sm:block">
                  Studio Beta
                </div>
              </div>
            </div>

            <nav
              className="hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto lg:flex"
              aria-label="主分組"
            >
              {sections.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => toggleMega(sec)}
                  aria-expanded={megaSection === sec}
                  className={`cw-touch-target flex-shrink-0 rounded-[var(--cw-radius)] px-3 py-2 text-sm font-medium transition-colors ${
                    megaSection === sec
                      ? 'bg-[var(--cw-mega-surface)] text-[var(--cw-text)]'
                      : 'text-[var(--cw-text-muted)] hover:bg-white/5 hover:text-[var(--cw-text)]'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1 lg:gap-2">
            <button
              type="button"
              onClick={openChangelog}
              className="cw-touch-target rounded-[var(--cw-radius)] p-2 text-[var(--cw-text-muted)] hover:bg-white/5 hover:text-[var(--cw-text)]"
              title="本次更新"
            >
              <DocumentTextIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('classic')}
              className="cw-touch-target hidden items-center gap-1 rounded-[var(--cw-radius)] border border-[var(--cw-border)] px-2.5 py-2 text-xs font-semibold text-[var(--cw-text-muted)] hover:border-[var(--cw-border-strong)] hover:text-[var(--cw-text)] sm:inline-flex"
              title="切換為 Classic 主題"
            >
              <ArrowsRightLeftIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
              <span>Classic</span>
            </button>
            {isAdmin ? (
              <NavLink
                to={ADMIN_NAV_META.path}
                onClick={closeMega}
                className={({ isActive }) =>
                  `cw-touch-target rounded-[var(--cw-radius)] border px-2.5 py-2 text-xs font-semibold ${
                    isActive
                      ? 'border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] text-[var(--cw-text)]'
                      : 'border-[var(--cw-border)] text-[var(--cw-text-muted)] hover:border-[var(--cw-border-strong)]'
                  }`
                }
              >
                管理
              </NavLink>
            ) : null}
          </div>
        </div>

        {megaSection && megaItems.length > 0 ? (
          <div className="absolute left-0 right-0 top-full z-[70] cw-px-safe">
            <div className="mx-auto max-w-[960px] px-3 pb-3 pt-2 md:px-4">
              <div
                className="rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-mega-surface)] p-4 shadow-2xl"
                style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}
              >
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--cw-text-muted)]">
                  {megaSection}
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {megaItems.map((item) => (
                    <MegaMenuItem key={item.path || item.label} item={item} close={closeMega} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <StudioTopNav isAdmin={isAdmin} />
      </header>
    </div>
  )
}
