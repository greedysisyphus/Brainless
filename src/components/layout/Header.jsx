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
      <div className="container-custom py-4 md:py-6">
        <div className="flex flex-col items-center relative">
          {/* 主題切換按鈕 - 固定在左上角 */}
          <motion.button
            onClick={toggleTheme}
            className={`absolute top-0 left-0 z-10 p-3 rounded-xl transition-all duration-300 ${
              theme === 'linear'
                ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                : 'bg-primary/20 hover:bg-primary/30 border border-primary/30'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title={theme === 'linear' ? '切換到經典風格' : '切換到 Linear 風格'}
          >
            {theme === 'linear' ? (
              <PaintBrushIcon className="w-5 h-5 text-white" />
            ) : (
              <SparklesIcon className="w-5 h-5 text-primary" />
            )}
            {/* 切換指示器 */}
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
          </motion.button>

          {/* Logo 和標題區域 - 居中顯示 */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <motion.img 
                src={logoCat}
                alt="Cat Logo" 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-primary p-1 logo logo-glow logo-float"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              />
              <div className="flex flex-col items-center gap-1">
                <h1 className={`text-2xl sm:text-4xl font-bold ${
                  theme === 'linear' 
                    ? 'text-white' 
                    : 'bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'
                }`}>
                  Brainless
                </h1>
                <Clock />
              </div>
            </div>
            
            {/* 貓咪留言區域 */}
            <CatSpeechBubble />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header 