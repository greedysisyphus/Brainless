import { memo } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import ClubShell from '../club/ClubShell'
import { ChangelogUpdateBar } from '../ChangelogNotice'
import { getSiteTheme, newPathFor } from '../../utils/siteTheme'

function AppLayoutSwitcher({ children }) {
  const { pathname, hash } = useLocation()
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
