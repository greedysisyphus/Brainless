import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'

/**
 * YouTube 影片彈窗組件
 * @param {boolean} isOpen - 是否顯示彈窗
 * @param {Function} onClose - 關閉彈窗的函數
 * @param {string} videoId - YouTube 影片 ID (例如: dQw4w9WgXcQ)
 */
function YouTubeModal({ isOpen, onClose, videoId = 'dQw4w9WgXcQ' }) {
  // 當彈窗打開時，禁用背景滾動
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // ESC 鍵關閉
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
    }
    
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000]"
            onClick={onClose}
          />
          
          {/* 彈窗內容 */}
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30 
              }}
              className="relative w-full max-w-4xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 關閉按鈕 */}
              <motion.button
                onClick={onClose}
                className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors duration-200 z-10"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="關閉"
              >
                <XMarkIcon className="w-6 h-6" />
              </motion.button>

              {/* 影片容器 */}
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}> {/* 16:9 比例 */}
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-xl shadow-2xl"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export default YouTubeModal
