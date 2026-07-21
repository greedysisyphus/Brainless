import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { DocumentTextIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { auth, checkAdminStatus } from '../../utils/firebase'
import { getNavItems } from '../../config/navigation.jsx'
import { useChangelog } from '../../contexts/ChangelogContext'
import logoCat from '../../assets/logo-cat.png'
import ThemeSwitcher from '../ThemeSwitcher'

function ClubNavItem({ path, label, Icon }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `club-nav-item group relative z-10 flex shrink-0 flex-col items-center justify-center rounded-xl border text-center transition-all duration-200 hover:z-20 focus-visible:z-20 touch-manipulation sm:rounded-2xl ${
          isActive
            ? 'border-[#171717] bg-[#171717] text-white shadow-[0_8px_16px_rgba(23,23,23,0.16)] sm:shadow-[0_12px_22px_rgba(23,23,23,0.18)]'
            : 'border-black/10 bg-white/55 text-[#4d4d48] hover:-translate-y-0.5 hover:border-[#ec5836] hover:bg-white hover:text-[#171717] hover:shadow-[0_12px_24px_rgba(23,23,23,0.08)]'
        }`
      }
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {({ isActive }) => (
        <>
          <span
            className={`club-nav-icon-box grid place-items-center rounded-lg border sm:rounded-xl ${
              isActive
                ? 'border-white/20 bg-white/10 text-[#ff9b84]'
                : 'border-black/10 bg-[#f7f6f2] text-[#ec5836] group-hover:bg-[#fff1ed]'
            }`}
          >
            <Icon className="club-nav-icon transition-transform duration-300" strokeWidth={1.75} />
          </span>
          <span className="club-nav-label line-clamp-2 px-0.5 font-bold leading-tight lg:leading-snug">
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

export default function ClubShell({ children }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const { openChangelog } = useChangelog()
  useEffect(() => {
    let mounted = true
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return mounted && setIsAdmin(false)
      try { if (mounted) setIsAdmin(await checkAdminStatus(user.uid)) } catch { if (mounted) setIsAdmin(false) }
    })
    return () => { mounted = false; unsub() }
  }, [])
  const navigationItems = useMemo(() => getNavItems(isAdmin), [isAdmin])
  return (
    <div className="club-shell cw-shell-min-h overflow-x-hidden bg-[#f7f6f2] text-[#171717]">
      <header className="sticky top-0 z-[70] border-b border-black/10 bg-[#f7f6f2]/95 backdrop-blur-xl">
        <div className="relative mx-auto flex h-[106px] max-w-[1540px] items-center justify-center px-5 sm:px-8 lg:px-12">
          <button type="button" onClick={openChangelog} className="absolute left-5 grid h-11 w-11 place-items-center rounded-2xl border border-black/10 bg-white text-[#ec5836] shadow-sm sm:left-8 lg:left-12" title="本次更新"><DocumentTextIcon className="h-5 w-5" /></button>
          <NavLink to="/sandwich" className="flex items-center gap-3" aria-label="回到厚片計算器"><img src={logoCat} alt="Brainless" className="h-[66px] w-[66px] rounded-full border-2 border-[#ec5836] object-cover p-1 shadow-[0_8px_20px_rgba(236,88,54,0.18)]" /><span><span className="block text-[30px] font-black leading-none tracking-[-0.075em] text-[#171717] sm:text-[36px]">brainless</span><span className="mt-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#ec5836]"><SparklesIcon className="h-3.5 w-3.5" /> behind the counter</span></span></NavLink>
          <div className="absolute right-5 sm:right-8 lg:right-12"><ThemeSwitcher variant="club" /></div>
        </div>
        <nav className="border-t border-black/10 bg-white/35 px-2 py-1.5 sm:px-5 sm:py-3 lg:px-8" aria-label="主要功能">
          <div className="club-nav-row scrollbar-hide mx-auto -m-1 flex max-w-[1220px] items-stretch justify-start overflow-x-auto p-1 sm:justify-center">
            {navigationItems.map((item) => (
              <ClubNavItem key={item.path} {...item} />
            ))}
          </div>
        </nav>
      </header>
      <main className="relative mx-auto min-h-[calc(100dvh-238px)] max-w-[1540px] px-5 py-9 sm:px-8 lg:px-12 lg:py-12"><div className="pointer-events-none absolute -right-48 top-0 h-[34rem] w-[34rem] rounded-full bg-[#d8e4ff]/45 blur-3xl" /><div className="relative">{children}</div></main>
    </div>
  )
}
