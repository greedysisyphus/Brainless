import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Clock from '../Clock'
import { ADMIN_NAV_META, getNavSections, getNavItems, itemsForSection } from '../../config/navigation.jsx'
import { CwButton } from './ui/CwButton'

export default function StudioMobileDrawer({ open, onClose, isAdmin }) {
  useEffect(() => {
    function onEsc(e) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  if (!open) return null

  const navItems = getNavItems(isAdmin, { includeAdmin: false })
  const sections = getNavSections(navItems)

  return (
    <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="關閉選單"
        onClick={onClose}
      />
      <div
        className="cw-pb-safe cw-pt-safe absolute bottom-0 left-0 top-0 flex w-[min(100%-3rem,20rem)] flex-col border-r border-[var(--cw-border)] bg-[var(--cw-sidebar)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--cw-border)] px-3 py-3">
          <span className="text-sm font-bold text-[var(--cw-text)]">選單</span>
          <button
            type="button"
            className="cw-touch-target rounded-[var(--cw-radius)] p-2 text-[var(--cw-text-muted)] hover:bg-white/5"
            onClick={onClose}
            aria-label="關閉"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="mb-4">
            <Clock visualVariant="studio" layout="sidebar" />
          </div>
          {sections.map((sec) => (
            <div key={sec} className="mb-5">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--cw-text-muted)]">
                {sec}
              </div>
              <ul className="space-y-1">
                {itemsForSection(sec, navItems).map(({ path, label, Icon }) => (
                  <li key={path}>
                    <NavLink
                      to={path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-[var(--cw-radius-lg)] px-2 py-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--cw-focus-ring)] ${
                          isActive ? 'bg-white/10' : 'active:bg-white/10'
                        }`
                      }
                      style={({ isActive }) => ({
                        boxShadow: isActive ? 'inset 3px 0 0 0 var(--cw-text)' : undefined,
                      })}
                    >
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] text-[var(--cw-text-muted)]">
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <span className="text-sm font-semibold text-[var(--cw-text)]">{label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {isAdmin ? (
            <div className="mb-5 border-t border-[var(--cw-border)] pt-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--cw-text-muted)]">
                {ADMIN_NAV_META.section}
              </div>
              <NavLink
                to={ADMIN_NAV_META.path}
                onClick={onClose}
                className="flex items-center gap-3 rounded-[var(--cw-radius-lg)] px-2 py-2.5 active:bg-white/10"
              >
                {(() => {
                  const AdminIcon = ADMIN_NAV_META.Icon
                  return <AdminIcon className="h-6 w-6 text-[var(--cw-text-muted)]" />
                })()}
                <span className="text-sm font-semibold text-[var(--cw-text)]">
                  {ADMIN_NAV_META.label}
                </span>
              </NavLink>
            </div>
          ) : null}
          <div className="pt-2 pb-6">
            <CwButton variant="secondary" type="button" className="w-full" onClick={onClose}>
              完成
            </CwButton>
          </div>
        </nav>
      </div>
    </div>
  )
}
