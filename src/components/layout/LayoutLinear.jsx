import { useEffect, useRef, memo } from 'react'
import { useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import { motion, AnimatePresence } from 'framer-motion'
import HeaderLinear from './HeaderLinear'
import NavigationLinear from './NavigationLinear'
import NowPlayingMarquee from '../NowPlayingMarquee'

/**
 * Linear 風格的 Layout
 * 使用 Framer Motion、GSAP 和 Lenis 實現流暢的動畫效果
 * 參考：https://linear.app/homepage
 */
function LayoutLinear({ children }) {
  const location = useLocation()
  const lenisRef = useRef(null)
  const containerRef = useRef(null)

  // 初始化 Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    })

    lenisRef.current = lenis

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  // 路由變化時，Lenis 重新計算並滾動到頂部
  useEffect(() => {
    if (lenisRef.current) {
      // 使用 Lenis 實現平滑滾動到頂部
      lenisRef.current.scrollTo(0, { 
        duration: 0.6,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
      })
    }
  }, [location.pathname])

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden"
    >
      {/* 背景 - Linear 風格的極簡背景 */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* 極淡的網格圖案 */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      {/* 內容層 */}
      <div className="relative z-10">
        {/* 當前播放歌曲跑馬燈 - 最頂層 */}
        <NowPlayingMarquee />
        
        {/* Linear 風格頁首 */}
        <HeaderLinear />
        
        {/* Linear 風格導航 */}
        <NavigationLinear />
        
        {/* 主要內容 - 使用 Framer Motion 實現頁面轉場 */}
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ 
              duration: 0.3, 
              ease: [0.16, 1, 0.3, 1] // Linear 風格的緩動函數
            }}
            className={location.pathname === '/' ? '' : 'py-12'}
          >
            {location.pathname === '/' ? (
              children
            ) : (
              <div className="max-w-7xl mx-auto px-6">
                {children}
              </div>
            )}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  )
}

// 使用 React.memo 包裝 LayoutLinear 組件，防止不必要的重新渲染
// 但由於 children 和 location 可能會改變，我們需要自定義比較函數
export default memo(LayoutLinear, (prevProps, nextProps) => {
  // 如果 children 相同，不重新渲染
  // 注意：location 的變化會導致組件重新渲染，這是預期的行為
  return prevProps.children === nextProps.children
})
