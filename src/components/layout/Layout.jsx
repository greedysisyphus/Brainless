import { memo } from 'react'
import AppLayoutSwitcher from './AppLayoutSwitcher'

function Layout({ children }) {
  return <AppLayoutSwitcher>{children}</AppLayoutSwitcher>
}

export default memo(Layout, (prev, next) => prev.children === next.children)
