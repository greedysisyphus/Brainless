import { memo } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import ClassicLayoutInner from './ClassicLayoutInner'
import StudioShell from '../studio/StudioShell'

/**
 * Routes always render inside this wrapper: Classic uses existing Layout visuals;
 * Studio uses StudioShell (no AnimatedBackground).
 */
function AppLayoutSwitcher({ children }) {
  const { isStudio } = useTheme()
  if (isStudio) {
    return <StudioShell>{children}</StudioShell>
  }
  return <ClassicLayoutInner>{children}</ClassicLayoutInner>
}

export default memo(AppLayoutSwitcher, (prev, next) => prev.children === next.children)
