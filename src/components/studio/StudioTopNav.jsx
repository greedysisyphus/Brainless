import { Fragment, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { BASE_NAV_ITEMS, ADMIN_NAV_META, getNavSections } from '../../config/navigation.jsx'
import { studioSurfaces } from './studioSurfaceClasses'

/** 窄螢幕 pill 用短標，避免直欄堆疊＋超小字 */
const MOBILE_LABEL = {
  '/sandwich': '厚片',
  '/cashier': '收銀',
  '/coffee-beans': '咖啡豆',
  '/daily-reports': '報表',
  '/schedule': '班表',
  '/flight-data': '航班',
  '/poursteady': '手沖機',
  '/playground': 'Playground',
  '/admin': '管理',
}

function mobileLabel(path, fallback) {
  return MOBILE_LABEL[path] ?? fallback
}

/**
 * 手機／窄平板：Header 內橫向 pill 導覽（lg 以上由側欄 + Mega 負責）。
 */
export default function StudioTopNav({ isAdmin }) {
  const groups = useMemo(() => {
    const items = [
      ...BASE_NAV_ITEMS,
      ...(isAdmin
        ? [
            {
              path: ADMIN_NAV_META.path,
              label: ADMIN_NAV_META.label,
              section: ADMIN_NAV_META.section,
              Icon: ADMIN_NAV_META.Icon,
            },
          ]
        : []),
    ]
    const secs = getNavSections(items)
    const map = secs.map((sec) => ({
      section: sec,
      items: items.filter((i) => i.section === sec),
    }))
    return map
  }, [isAdmin])

  return (
    <nav className="relative border-t border-[var(--cw-border)] bg-[var(--cw-header-bg)] lg:hidden" aria-label="快速導覽">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-[var(--cw-header-bg)] to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l from-[var(--cw-header-bg)] to-transparent"
        aria-hidden
      />

      <div className="scrollbar-hide flex justify-center overflow-x-auto overscroll-x-contain px-3">
        <div className="inline-flex items-center gap-1 py-2.5">
          {groups.map(({ section, items }, groupIndex) => (
            <Fragment key={section}>
              {groupIndex > 0 ? (
                <span
                  className="mx-0.5 h-4 w-px shrink-0 bg-[var(--cw-border-strong)]"
                  aria-hidden
                />
              ) : null}
              {items.map(({ path, label, Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  title={label}
                  className={({ isActive }) =>
                    `inline-flex min-h-9 max-w-[9.5rem] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--cw-radius-pill)] px-3 py-2 text-xs font-medium transition-colors duration-150 sm:text-[13px] ${
                      isActive ? studioSurfaces.chipActive : studioSurfaces.chip
                    }`
                  }
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.75} aria-hidden />
                  <span className="truncate">{mobileLabel(path, label)}</span>
                </NavLink>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </nav>
  )
}
