import { memo, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import ClubShell from '../club/ClubShell'
import { ChangelogUpdateBar } from '../ChangelogNotice'
import { getSiteTheme, newPathFor } from '../../utils/siteTheme'

function AppLayoutSwitcher({ children }) {
  const { pathname, hash } = useLocation()
  // 把目前的工具寫進網址的 ?p=，給 iOS「加入主畫面」用（它會丟掉 # 後面的部分，原因見 main.jsx）。
  // 只換網址列、不換頁；路由的狀態放在 history.state 裡，原樣帶著。
  useEffect(() => {
    const tool = /^\/home\/([a-z0-9-]+)$/.exec(pathname)?.[1] || ''
    const url = new URL(window.location.href)
    if ((url.searchParams.get('p') || '') === tool) return
    if (tool) url.searchParams.set('p', tool)
    else url.searchParams.delete('p')
    window.history.replaceState(window.history.state, '', url)
  }, [pathname])
  // 新版頁面（/home 底下）有自己的版面，不套 Club 外殼
  if (pathname === '/home' || pathname.startsWith('/home/')) return children
  // 全站只用新版：開舊網址（書籤、加到主畫面的捷徑）會帶到新版的同一個工具
  const newPath = getSiteTheme() === 'new' ? newPathFor(pathname) : null
  if (newPath) return <Navigate to={`${newPath}${hash}`} replace />
  const isFocusedGoodsOrder = pathname === '/goods-order-test'
  if (isFocusedGoodsOrder) {
    return (
      <div className="cw-shell-min-h overflow-x-hidden bg-[var(--cw-bg)] text-[var(--cw-text)]">
        <ChangelogUpdateBar />
        <main>{children}</main>
      </div>
    )
  }
  return <ClubShell>{children}</ClubShell>
}

export default memo(AppLayoutSwitcher, (prev, next) => prev.children === next.children)
