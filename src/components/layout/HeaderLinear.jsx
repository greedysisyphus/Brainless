import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import Clock from '../Clock'
import CatSpeechBubble from '../CatSpeechBubble'
import YouTubeModal from '../YouTubeModal'
import logoCat from '../../assets/logo-cat.png'
import { SparklesIcon, PaintBrushIcon } from '@heroicons/react/24/outline'

/**
 * Linear 風格的 Header
 * 極簡設計，參考 Linear 官網
 */
function HeaderLinear() {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const isHomepage = location.pathname === '/'
  const [showVideo, setShowVideo] = useState(false)

  return (
    <header className={`sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06] transition-all duration-300 ${isHomepage ? 'bg-transparent border-transparent' : ''}`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16 relative">
          {/* Logo 和標題 - 極簡設計 */}
          <div className="flex items-center gap-3">
            <motion.img 
              src={logoCat}
              alt="Cat Logo" 
              className="w-8 h-8 rounded-full cursor-pointer"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.1, rotate: 5, opacity: 0.8 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowVideo(true)}
              title="點擊我！"
            />
            <Link to="/">
              <motion.div 
                className="flex items-center gap-4 cursor-pointer"
                whileHover={{ opacity: 0.8 }}
              >
                <h1 className="text-lg font-medium text-white tracking-tight">
                  Brainless
                </h1>
                {!isHomepage && (
                  <>
                    <div className="h-4 w-px bg-white/10" />
                    <Clock />
                  </>
                )}
              </motion.div>
            </Link>
          </div>

          {/* 右側操作區域 - 預留空間避免與固定按鈕重疊 */}
          <div className="flex items-center gap-3 pr-12 relative">
            {/* 貓咪留言 - 簡化版本（首頁不顯示） */}
            {!isHomepage && (
              <div className="hidden sm:block relative z-10">
                <CatSpeechBubble />
              </div>
            )}

            {/* 主題切換按鈕 - Linear 風格 */}
            <motion.button
              onClick={toggleTheme}
              className="relative z-20 p-2 rounded-lg hover:bg-white/[0.06] transition-colors duration-200 flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={theme === 'linear' ? '切換到經典風格' : '切換到 Linear 風格'}
            >
              {theme === 'linear' ? (
                <PaintBrushIcon className="w-4 h-4 text-white/70" />
              ) : (
                <SparklesIcon className="w-4 h-4 text-white/70" />
              )}
            </motion.button>
          </div>
        </div>
      </div>
      
      {/* YouTube 影片彈窗 */}
      <YouTubeModal 
        isOpen={showVideo} 
        onClose={() => setShowVideo(false)} 
        videoId="dQw4w9WgXcQ"
      />
    </header>
  )
}

export default HeaderLinear
