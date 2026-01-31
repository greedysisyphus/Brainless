import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'

// 班次定義（與 Clock.jsx 保持一致）
const SHIFTS = {
  morning: { name: '早班', start: 4 * 60 + 30, end: 13 * 60, color: 'bg-blue-500' },      // 04:30 - 13:00
  mid: { name: '中班', start: 5 * 60 + 30, end: 14 * 60, color: 'bg-green-500' },          // 05:30 - 14:00
  noon: { name: '午班', start: 7 * 60 + 30, end: 16 * 60, color: 'bg-yellow-500' },         // 07:30 - 16:00
  evening: { name: '晚班', start: 14 * 60, end: 22 * 60 + 30, color: 'bg-purple-500' }      // 14:00 - 22:30
}

// 移除視圖切換，只保留甘特圖風格

function ShiftTimelineModal({ isOpen, onClose }) {
  const [currentTime, setCurrentTime] = useState(null)
  const [shiftData, setShiftData] = useState([])

  useEffect(() => {
    if (!isOpen) return

    const updateTime = () => {
      const now = new Date()
      const hour = now.getHours()
      const minutes = now.getMinutes()
      const currentMinutes = hour * 60 + minutes
      
      setCurrentTime(currentMinutes)
      
      // 計算每個班次的狀態和倒數
      const data = Object.entries(SHIFTS).map(([key, shift]) => {
        const isActive = currentMinutes >= shift.start && currentMinutes < shift.end
        let remaining = null
        let status = 'upcoming'
        let label = ''
        
        if (isActive) {
          remaining = shift.end - currentMinutes
          status = 'active'
          label = '離下班還有'
        } else {
          if (currentMinutes < shift.start) {
            remaining = shift.start - currentMinutes
            status = 'upcoming'
            label = '離上班還有'
          } else {
            remaining = (24 * 60 - currentMinutes) + shift.start
            status = 'upcoming'
            label = '離上班還有'
          }
        }
        
        return {
          key,
          ...shift,
          isActive,
          remaining,
          status,
          label,
          startPercent: (shift.start / (24 * 60)) * 100,
          endPercent: (shift.end / (24 * 60)) * 100,
          widthPercent: ((shift.end - shift.start) / (24 * 60)) * 100
        }
      })
      
      setShiftData(data)
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)

    return () => clearInterval(timer)
  }, [isOpen])

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  const formatCountdown = (minutes) => {
    if (minutes === null) return ''
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}小時 ${mins}分鐘`
  }

  const getTimeStyle = (minutes) => {
    if (minutes === null) return 'text-text-secondary'
    if (minutes <= 30) return 'text-red-400'
    if (minutes <= 120) return 'text-orange-400'
    return 'text-primary'
  }

  const currentTimePercent = currentTime ? (currentTime / (24 * 60)) * 100 : 0

  // 計算班次的垂直位置（每個班次固定車道）
  const calculateShiftPositions = () => {
    // 定義班次順序（早、中、午、晚）
    const shiftOrder = { morning: 0, mid: 1, noon: 2, evening: 3 }
    
    // 為每個班次分配固定車道
    const positions = shiftData.map((shift) => ({
      shift,
      laneIndex: shiftOrder[shift.key] ?? 0
    }))
    
    // 計算需要的車道數量
    const laneCount = Math.max(...positions.map(p => p.laneIndex)) + 1
    
    return { positions, laneCount }
  }

  const { positions, laneCount } = calculateShiftPositions()
  const laneHeight = 60 // 每個車道的高度
  const timelineHeight = Math.max(400, laneCount * laneHeight + 40)

  // 渲染甘特圖風格時間軸
  const renderGanttView = () => {
    const hours = Array.from({ length: 25 }, (_, i) => i) // 0-24
    
    return (
      <div className="space-y-6">
        {/* 時間軸主體 */}
        <div className="relative bg-background/30 rounded-lg border border-primary/10 overflow-hidden">
          {/* 垂直網格線 - 每小時 */}
          <div className="absolute inset-0">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute top-0 bottom-0 w-px bg-primary/10"
                style={{ left: `${(hour / 24) * 100}%` }}
              />
            ))}
          </div>
          
          {/* 時間標記 - 每6小時 */}
          <div className="absolute -top-6 left-0 right-0 flex justify-between px-2">
            {[0, 6, 12, 18, 24].map((hour) => (
              <span key={hour} className="text-xs text-text-secondary">
                {hour}:00
              </span>
            ))}
          </div>
          
          {/* 班次條狀圖 */}
          <div 
            className="relative"
            style={{ height: `${timelineHeight}px`, padding: '20px 10px' }}
          >
            {positions.map(({ shift, laneIndex }) => {
              const leftPercent = (shift.start / (24 * 60)) * 100
              const widthPercent = ((shift.end - shift.start) / (24 * 60)) * 100
              const top = laneIndex * laneHeight + 10
              
              return (
                <div
                  key={shift.key}
                  className={`absolute ${shift.color} ${
                    shift.isActive ? 'opacity-100 shadow-lg' : 'opacity-60'
                  } rounded-lg border-2 border-white/20 transition-all hover:opacity-100`}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    top: `${top}px`,
                    height: `${laneHeight - 20}px`,
                    minWidth: '60px',
                    overflow: 'hidden'
                  }}
                >
                  <div 
                    className="h-full w-full flex items-center justify-center px-2"
                    style={{ 
                      boxSizing: 'border-box',
                      position: 'relative',
                      zIndex: 1
                    }}
                  >
                    <div 
                      className="font-semibold text-white text-sm text-center whitespace-nowrap"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
                    >
                      {shift.name}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* 當前時間指示線 */}
            {currentTime !== null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                style={{ left: `${currentTimePercent}%` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                  {formatTime(currentTime)}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 班次詳細資訊卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {shiftData.map((shift) => (
            <motion.div
              key={shift.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg border-2 transition-all ${
                shift.isActive
                  ? 'border-primary bg-primary/10'
                  : 'border-primary/20 bg-background/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${shift.color}`} />
                <span className="font-semibold text-white">{shift.name}</span>
                {shift.isActive && (
                  <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                    進行中
                  </span>
                )}
              </div>
              <div className="text-sm text-text-secondary mb-2">
                {formatTime(shift.start)} - {formatTime(shift.end)}
              </div>
              {shift.remaining !== null && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-text-secondary">{shift.label}</span>
                  <span className={`font-medium text-sm ${getTimeStyle(shift.remaining)}`}>
                    {formatCountdown(shift.remaining)}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  // 使用 Portal 渲染到 document.body，確保顯示在最上層
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]"
            onClick={onClose}
          />
          
          {/* 彈窗內容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-surface rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-primary/20">
              {/* 標題欄 */}
              <div className="flex items-center justify-between p-6 border-b border-primary/20">
                <h2 className="text-2xl font-bold text-white">班次時間軸</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* 時間軸區域 */}
              <div className="p-6">
                {renderGanttView()}

                {/* 當前時間顯示 */}
                {currentTime !== null && (
                  <div className="text-center pt-6 mt-6 border-t border-primary/20">
                    <div className="text-text-secondary text-sm mb-1">當前時間</div>
                    <div className="text-2xl font-bold text-white">
                      {formatTime(currentTime)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  // 使用 Portal 渲染到 document.body
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }
  
  return null
}

export default ShiftTimelineModal
