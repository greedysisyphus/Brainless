import { memo } from 'react'
import Header from './Header'
import Navigation from './Navigation'
import AnimatedBackground from '../AnimatedBackground'
import NowPlayingMarquee from '../NowPlayingMarquee'

/** Classic 視覺與原版 Layout 完全一致（不重掛結構）。 */
function ClassicLayoutInner({ children }) {
  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AnimatedBackground />

      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-indigo-900/20 pointer-events-none z-0" />

      <div className="relative z-10">
        <NowPlayingMarquee />
        <Header />
        <Navigation />
        <main className="py-4 sm:py-5 md:py-6">
          <div className="container-custom">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default memo(ClassicLayoutInner, (prev, next) => prev.children === next.children)
