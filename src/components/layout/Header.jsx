import { Link } from 'react-router-dom'
import { useState, memo } from 'react'
import { motion } from 'framer-motion'
import Clock from '../Clock'
import CatSpeechBubble from '../CatSpeechBubble'
import YouTubeModal from '../YouTubeModal'
import logoCat from '../../assets/logo-cat.png'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
import { useChangelog } from '../../contexts/ChangelogContext'

function Header() {
  const { openChangelog } = useChangelog()
  const [showVideo, setShowVideo] = useState(false)

  return (
    <header className="bg-surface text-white sticky top-6 sm:top-6 z-[60]">
      <div className="container-custom pt-2 sm:pt-4 md:pt-6 pb-3 sm:pb-2 md:pb-4">
        <div className="flex flex-col items-center relative min-h-[70px] sm:min-h-[85px]">
          {/* 本次更新按鈕 - 左上角 */}
          <motion.button
            onClick={openChangelog}
            className="absolute top-0 left-0 z-10 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300 touch-manipulation bg-primary/20 hover:bg-primary/30 border border-primary/30"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="本次更新內容"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </motion.button>

          {/* Logo 和標題區域 - 居中顯示，移動設備優化 */}
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 md:gap-3 px-12 sm:px-0">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <motion.img 
              src={logoCat}
              alt="Cat Logo" 
                className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full border-2 border-primary p-1 logo logo-glow logo-float cursor-pointer"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300 }}
                onClick={() => setShowVideo(true)}
                title="點擊我！"
            />
              <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                <h1 className="text-xl sm:text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
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
          <div className="hidden sm:block mt-1">
          <CatSpeechBubble />
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

// 使用 React.memo 包裝組件，防止 CatSpeechBubble 的狀態更新導致不必要的重新渲染
export default memo(Header) 