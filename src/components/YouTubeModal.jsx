import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'

/**
 * YouTube 影片彈窗組件
 * 使用 YouTube IFrame API 來解決 iOS 自動播放問題
 * @param {boolean} isOpen - 是否顯示彈窗
 * @param {Function} onClose - 關閉彈窗的函數
 * @param {string} videoId - YouTube 影片 ID (例如: dQw4w9WgXcQ)
 */
function YouTubeModal({ isOpen, onClose, videoId = 'dQw4w9WgXcQ' }) {
  const playerRef = useRef(null)
  const containerRef = useRef(null)
  const [playerReady, setPlayerReady] = useState(false)
  const playerId = useRef(`youtube-player-${Math.random().toString(36).substring(2, 11)}`)

  // 當彈窗打開時，禁用背景滾動（iOS 優化）
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${scrollY}px`
      
      return () => {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.width = ''
        document.body.style.top = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])

  // 初始化 YouTube Player
  useEffect(() => {
    if (!isOpen) {
      // 關閉時清理播放器
      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch (e) {
          console.warn('清理播放器時出錯:', e)
        }
        playerRef.current = null
      }
      setPlayerReady(false)
      return
    }

    // 確保 YouTube IFrame API 已載入
    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        createPlayer()
      } else {
        // 如果 API 還沒載入，等待它載入
        const checkInterval = setInterval(() => {
          if (window.YT && window.YT.Player) {
            clearInterval(checkInterval)
            createPlayer()
          }
        }, 100)

        // 設置超時，避免無限等待
        setTimeout(() => {
          clearInterval(checkInterval)
          if (!window.YT || !window.YT.Player) {
            console.error('YouTube IFrame API 載入失敗')
          }
        }, 5000)

        return () => clearInterval(checkInterval)
      }
    }

    const createPlayer = () => {
      if (!containerRef.current || playerRef.current) return

      try {
        playerRef.current = new window.YT.Player(playerId.current, {
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            mute: 1, // 靜音自動播放（iOS 允許）
            playsinline: 1, // iOS 內聯播放
            rel: 0, // 不顯示相關影片
            modestbranding: 1, // 減少 YouTube 品牌標識
            controls: 1,
            enablejsapi: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              setPlayerReady(true)
              // 立即播放（已靜音，iOS 允許）
              event.target.playVideo()
              
              // 嘗試在短暫延遲後取消靜音（需要用戶交互）
              setTimeout(() => {
                try {
                  event.target.unMute()
                } catch (e) {
                  // iOS 可能不允許自動取消靜音，這是正常的
                  console.log('無法自動取消靜音（需要用戶交互）')
                }
              }, 500)
            },
            onStateChange: (event) => {
              // 當影片開始播放時，嘗試取消靜音
              if (event.data === window.YT.PlayerState.PLAYING) {
                setTimeout(() => {
                  try {
                    event.target.unMute()
                  } catch (e) {
                    // 如果無法取消靜音，用戶可以手動點擊播放器上的音量按鈕
                  }
                }, 300)
              }
            },
            onError: (event) => {
              console.error('YouTube 播放器錯誤:', event.data)
            }
          }
        })
      } catch (error) {
        console.error('創建 YouTube 播放器失敗:', error)
      }
    }

    // 延遲初始化，確保 DOM 已準備好
    const timer = setTimeout(initPlayer, 100)

    return () => {
      clearTimeout(timer)
      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch (e) {
          console.warn('清理播放器時出錯:', e)
        }
        playerRef.current = null
      }
    }
  }, [isOpen, videoId])

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

  // 處理點擊播放（用戶交互觸發播放，可以取消靜音）
  const handlePlayerClick = () => {
    if (playerRef.current && playerReady) {
      try {
        playerRef.current.unMute()
      } catch (e) {
        // iOS 可能需要在播放器內部點擊才能取消靜音
      }
    }
  }

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

              {/* 影片容器 - 使用 YouTube IFrame API */}
              <div 
                ref={containerRef}
                className="relative w-full" 
                style={{ paddingBottom: '56.25%' }}
                onClick={handlePlayerClick}
              >
                <div
                  id={playerId.current}
                  className="absolute top-0 left-0 w-full h-full rounded-xl shadow-2xl"
                />
              </div>

              {/* 載入提示 */}
              {!playerReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                  <div className="text-white text-lg">載入中...</div>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export default YouTubeModal
