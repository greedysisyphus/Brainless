import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { auth, checkAdminStatus } from '../../utils/firebase'
import { getNavItems } from '../../config/navigation.jsx'
import BrainlessLogo from './BrainlessLogo'
import { ChangelogTrigger, ChangelogUpdateBar } from '../ChangelogNotice'

function ClubNavItem({ path, label, badge, Icon }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `club-nav-item group relative z-10 flex flex-col items-center justify-center rounded-xl border text-center transition-all duration-200 hover:z-20 focus-visible:z-20 touch-manipulation sm:rounded-2xl ${
          isActive
            ? 'border-[#171717] bg-[#171717] text-white shadow-[0_8px_16px_rgba(23,23,23,0.16)] sm:shadow-[0_12px_22px_rgba(23,23,23,0.18)]'
            : 'border-black/10 bg-white/55 text-[#4d4d48] hover:-translate-y-0.5 hover:border-[#ec5836] hover:bg-white hover:text-[#171717] hover:shadow-[0_12px_24px_rgba(23,23,23,0.08)]'
        }`
      }
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {({ isActive }) => (
        <>
          {badge && (
            <span className="absolute right-0.5 top-0.5 z-20 rounded-full border border-[#ec5836]/25 bg-[#fff1ed] px-1 py-px text-[7px] font-black uppercase leading-none tracking-[0.04em] text-[#b3381e] sm:right-1 sm:top-1 sm:text-[8px]">
              {badge}
            </span>
          )}
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
  useEffect(() => {
    let mounted = true
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return mounted && setIsAdmin(false)
      try { if (mounted) setIsAdmin(await checkAdminStatus(user.uid)) } catch { if (mounted) setIsAdmin(false) }
    })
    return () => { mounted = false; unsub() }
  }, [])
  const navigationItems = useMemo(() => getNavItems(isAdmin), [isAdmin])

  // 捲動後把 logo 那排縮起來：header 現在真的會黏住（見下方 overflow-x-clip），
  // 不縮的話手機上會永久吃掉 22% 畫面。
  // 進出用不同門檻（hysteresis）。收合會讓 header 少 42px，瀏覽器的 scroll anchoring
  // 為了不讓畫面內容跳動，會把 scrollY 往回扣掉同樣的量；單一門檻會因此在門檻附近
  // 無限來回收合／展開。兩個門檻之間留 80px 緩衝（> 42），兩個方向都跨不回去。
  const [condensed, setCondensed] = useState(false)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setCondensed((prev) => (prev ? y > 60 : y > 140))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 導覽列左右兩側的漸層提示：11 個工具在手機上一次只看得到 6 個，
  // 捲軸又被 scrollbar-hide 藏住，沒有提示根本不知道右邊還有東西。
  const navRef = useRef(null)
  const [edges, setEdges] = useState({ start: false, end: false })
  useEffect(() => {
    const el = navRef.current
    if (!el) return undefined
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      setEdges({ start: el.scrollLeft > 4, end: max > 4 && el.scrollLeft < max - 4 })
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [navigationItems.length])

  return (
    <div className="club-shell cw-shell-min-h overflow-x-clip bg-[#f7f6f2] text-[#171717]">
      <header className="sticky top-0 z-[70] border-b border-black/10 bg-[#f7f6f2]/95 backdrop-blur-xl">
        <ChangelogUpdateBar />
        <div
          className={`relative mx-auto flex max-w-[1540px] items-center justify-center px-5 transition-[height] duration-200 sm:px-8 lg:px-12 ${
            condensed ? 'h-[64px]' : 'h-[106px]'
          }`}
        >
          <ChangelogTrigger />
          <NavLink
            to="/sandwich"
            aria-label="回到厚片計算器"
            className={`origin-center transition-transform duration-200 ${condensed ? 'scale-[0.58]' : 'scale-100'}`}
          >
            <BrainlessLogo size={66} />
          </NavLink>
        </div>
        <nav className="relative border-t border-black/10 bg-white/35 px-2 py-1.5 sm:px-5 sm:py-3 lg:px-8" aria-label="主要功能">
          <div ref={navRef} className="club-nav-row scrollbar-hide mx-auto -m-1 flex max-w-[1220px] items-stretch justify-start overflow-x-auto p-1">
            {navigationItems.map((item) => (
              <ClubNavItem key={item.path} {...item} />
            ))}
          </div>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#faf9f7] to-transparent transition-opacity duration-200 ${
              edges.start ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#faf9f7] to-transparent transition-opacity duration-200 ${
              edges.end ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </nav>
      </header>
      <main className="relative mx-auto min-h-[calc(100dvh-238px)] max-w-[1540px] px-5 py-9 sm:px-8 lg:px-12 lg:py-12"><div className="pointer-events-none absolute -right-48 top-0 h-[34rem] w-[34rem] rounded-full bg-[#d8e4ff]/45 blur-3xl" /><div className="relative">{children}</div></main>
    </div>
  )
}
