import { NavLink, useLocation } from 'react-router-dom'
import Clock from '../Clock'
import { getNavItems } from '../../config/navigation.jsx'

/** 桌面／平板：側欄捷徑（與 Mega 同源資料） */
export default function StudioSidebar({ isAdmin }) {
  const { pathname } = useLocation()

  const items = getNavItems(isAdmin)

  const bySection = items.reduce((acc, it) => {
    if (!acc[it.section]) acc[it.section] = []
    acc[it.section].push(it)
    return acc
  }, {})

  return (
    <aside className="hidden w-52 flex-shrink-0 flex-col overflow-y-auto border-r border-[var(--cw-border)] bg-[var(--cw-sidebar)] pb-4 pt-6 lg:flex lg:w-56">
      <div className="px-3 pt-1 text-[11px] font-semibold uppercase leading-relaxed tracking-wide text-[var(--cw-text-muted)]">
        快速導覽
      </div>
      <div className="mt-3 px-2">
        <Clock visualVariant="studio" layout="sidebar" />
      </div>
      <nav className="mt-4 flex flex-1 flex-col gap-6 px-2">
        {Object.entries(bySection).map(([sec, rows]) => (
          <div key={sec}>
            <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--cw-text-muted)]">
              {sec}
            </div>
            <ul className="space-y-0.5">
              {rows.map(({ path, label, Icon, accentColor }) => {
                const active = pathname === path || pathname.startsWith(`${path}/`)
                return (
                  <li key={path}>
                    <NavLink
                      to={path}
                      className={`flex items-center gap-2 rounded-[var(--cw-radius)] px-2 py-2 text-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--cw-focus-ring)] ${
                        active
                          ? 'bg-white/10 text-[var(--cw-text)]'
                          : 'text-[var(--cw-text-muted)] hover:bg-white/5 hover:text-[var(--cw-text)]'
                      }`}
                      style={{
                        WebkitTapHighlightColor: 'transparent',
                        boxShadow: active ? 'inset 3px 0 0 0 var(--cw-text)' : undefined,
                      }}
                    >
                      <span
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--cw-border-strong)] text-[var(--cw-text-muted)]"
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="truncate">{label}</span>
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
