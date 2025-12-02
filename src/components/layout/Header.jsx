import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Clock from '../Clock'
import CatSpeechBubble from '../CatSpeechBubble'
import { useTheme } from '../../contexts/ThemeContext'
import logoCat from '../../assets/logo-cat.png'
import { SparklesIcon, PaintBrushIcon } from '@heroicons/react/24/outline'

function Header() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className={`${theme === 'linear' ? 'bg-[#0d0d0d]/80 backdrop-blur-xl border-b border-white/5' : 'bg-surface'} text-white sticky top-0 z-50`}>
      <div className="container-custom py-3 sm:py-4 md:py-6">
        <div className="flex flex-col items-center relative min-h-[80px] sm:min-h-[100px]">
          {/* 主題切換按鈕 - 固定在左上角，移動設備優化 */}
          <motion.button
            onClick={toggleTheme}
            className={`absolute top-0 left-0 z-10 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300 touch-manipulation ${
              theme === 'linear'
                ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                : 'bg-primary/20 hover:bg-primary/30 border border-primary/30'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title={theme === 'linear' ? '切換到經典風格' : '切換到 Linear 風格'}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {theme === 'linear' ? (
              <PaintBrushIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            ) : (
              <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            )}
            {/* 切換指示器 - 移動設備上隱藏 */}
            <span className="hidden sm:block absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
          </motion.button>

          {/* Logo 和標題區域 - 居中顯示，移動設備優化 */}
          <div className="flex flex-col items-center gap-2 sm:gap-3 md:gap-4 px-12 sm:px-0">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <motion.img 
                src={logoCat}
                alt="Cat Logo" 
                className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full border-2 border-primary p-1 logo logo-glow logo-float"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              />
              <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                <h1 className={`text-xl sm:text-2xl md:text-4xl font-bold ${
                  theme === 'linear' 
                    ? 'text-white' 
                    : 'bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'
                }`}>
                  Brainless
                </h1>
                {/* 時鐘 - 移動設備也顯示，但調整樣式 */}
                <div className="w-full max-w-xs">
                  <Clock />
                </div>
              </div>
            </div>
          </div>
          
          {/* 貓咪留言區域 - 移動設備優化 */}
          <div className="hidden sm:block mt-2">
            <CatSpeechBubble />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header 