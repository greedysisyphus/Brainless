import { memo } from 'react'
import Header from './Header'
import Navigation from './Navigation'
import AnimatedBackground from '../AnimatedBackground'
import NowPlayingMarquee from '../NowPlayingMarquee'

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* 動態背景 */}
      <AnimatedBackground />
      
      {/* 漸變遮罩層 */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-indigo-900/20 pointer-events-none z-0" />
      
      {/* 內容層 */}
      <div className="relative z-10">
      {/* 當前播放歌曲跑馬燈 - 最頂層 */}
      <NowPlayingMarquee />
      
      {/* 頁首 - 最高層次 */}
      <Header />
      
      {/* 導航 - 第二層次 */}
      <Navigation />
      
      {/* 主要內容 - 第三層次 */}
      <main className="py-4 sm:py-5 md:py-6">
        <div className="container-custom">
          {children}
        </div>
      </main>
      </div>
    </div>
  )
}

// 使用 React.memo 包裝 Layout 組件，防止不必要的重新渲染
// 但由於 children 可能會改變，我們需要自定義比較函數
export default memo(Layout, (prevProps, nextProps) => {
  // 如果 children 相同，不重新渲染
  return prevProps.children === nextProps.children
}) 