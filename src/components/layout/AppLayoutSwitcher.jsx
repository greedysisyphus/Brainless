import { memo } from 'react'
import { useLocation } from 'react-router-dom'
import ClubShell from '../club/ClubShell'
import { ChangelogUpdateBar } from '../ChangelogNotice'

function AppLayoutSwitcher({ children }) {
  const { pathname } = useLocation()
  // 新版頁面（/home 底下）有自己的版面，不套 Club 外殼
  if (pathname === '/home' || pathname.startsWith('/home/')) return children
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
