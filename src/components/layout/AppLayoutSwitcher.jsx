import { memo } from 'react'
import { useLocation } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import ClassicLayoutInner from './ClassicLayoutInner'
import ClubShell from '../club/ClubShell'

/** Classic 或 Club 殼層；已移除 Studio 主題。 */
function AppLayoutSwitcher({ children }) {
  const { isClub } = useTheme()
  const { pathname } = useLocation()
  const isFocusedGoodsOrder = pathname === '/goods-order-test'
  if (isClub) {
    if (isFocusedGoodsOrder) {
      return (
        <div className="cw-shell-min-h overflow-x-hidden bg-[var(--cw-bg)] text-[var(--cw-text)]">
          <main>{children}</main>
        </div>
      )
    }
    return <ClubShell>{children}</ClubShell>
  }
  return <ClassicLayoutInner>{children}</ClassicLayoutInner>
}

export default memo(AppLayoutSwitcher, (prev, next) => prev.children === next.children)
