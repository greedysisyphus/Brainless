import { memo } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import ClassicLayoutInner from './ClassicLayoutInner'
import ClubShell from '../club/ClubShell'

/** Classic 或 Club 殼層；已移除 Studio 主題。 */
function AppLayoutSwitcher({ children }) {
  const { isClub } = useTheme()
  if (isClub) {
    return <ClubShell>{children}</ClubShell>
  }
  return <ClassicLayoutInner>{children}</ClassicLayoutInner>
}

export default memo(AppLayoutSwitcher, (prev, next) => prev.children === next.children)
