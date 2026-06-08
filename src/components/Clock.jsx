import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ShiftTimelineModal from './ShiftTimelineModal'

// 班次定義
const SHIFTS = {
  morning: { name: '早班', start: 4 * 60 + 30, end: 13 * 60 },      // 04:30 - 13:00
  mid: { name: '中班', start: 5 * 60 + 30, end: 14 * 60 },          // 05:30 - 14:00
  noon: { name: '午班', start: 7 * 60 + 30, end: 16 * 60 },         // 07:30 - 16:00
  evening: { name: '晚班', start: 14 * 60, end: 22 * 60 + 30 }      // 14:00 - 22:30
}

function Clock({ visualVariant = 'classic', layout = 'inline' }) {
  const isCraft = visualVariant === 'studio'
  const isSidebar = layout === 'sidebar'
  const [activeShifts, setActiveShifts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showTimeline, setShowTimeline] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const hour = now.getHours()
      const minutes = now.getMinutes()
      const currentMinutes = hour * 60 + minutes
      
      const activeShiftsList = []
      const upcomingShiftsList = []
      
      // 檢查每個班次
      Object.entries(SHIFTS).forEach(([key, shift]) => {
        const isActive = currentMinutes >= shift.start && currentMinutes < shift.end
        
        if (isActive) {
          // 正在進行中的班次
          const remaining = shift.end - currentMinutes
          activeShiftsList.push({
            key,
            name: shift.name,
            type: 'workEnd',
            remaining,
            priority: 1 // 進行中的班次優先級最高
          })
        } else {
          // 計算到下一個開始時間的距離
          let remaining
          if (currentMinutes < shift.start) {
            remaining = shift.start - currentMinutes
          } else {
            // 已經過了，計算到明天的時間
            remaining = (24 * 60 - currentMinutes) + shift.start
          }
          upcomingShiftsList.push({
            key,
            name: shift.name,
            type: 'workStart',
            remaining,
            priority: 2 // 即將開始的班次優先級次之
          })
        }
      })
      
      // 合併：先顯示進行中的班次，再顯示下一個即將開始的班次
      const allShifts = [...activeShiftsList, ...upcomingShiftsList]
      
      // 排序：先按優先級（進行中 > 即將開始），再按剩餘時間
      allShifts.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return a.remaining - b.remaining
      })
      
      // 保存所有相關的班次（最多4個）
      const relevantShifts = allShifts.slice(0, 4)
      // 資料與上一瞬相同時保留原陣列參考，避免每秒觸發 Header/Navigation 整樹重繪（桌面閃爍）
      setActiveShifts((prev) => {
        if (prev.length !== relevantShifts.length) return relevantShifts
        for (let i = 0; i < prev.length; i++) {
          const a = prev[i]
          const b = relevantShifts[i]
          if (
            a.key !== b.key ||
            a.type !== b.type ||
            a.remaining !== b.remaining ||
            a.priority !== b.priority
          ) {
            return relevantShifts
          }
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // 當班次列表改變時，重置索引
  useEffect(() => {
    if (currentIndex >= activeShifts.length) {
      setCurrentIndex(0)
    }
  }, [activeShifts, currentIndex])

  // 輪流切換顯示的班次
  useEffect(() => {
    if (activeShifts.length <= 1) return

    const rotateTimer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeShifts.length)
    }, 5000) // 每5秒切換一次

    return () => clearInterval(rotateTimer)
  }, [activeShifts.length])

  // 根據剩餘時間返回樣式
  const getTimeStyle = (minutes) => {
    if (minutes === null) {
      return isCraft ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'
    }
    if (isCraft) {
      if (minutes <= 30) return 'border-red-500/40 bg-red-500/15 text-red-200'
      if (minutes <= 120) return 'border-amber-500/40 bg-amber-500/15 text-amber-200'
      return 'border-[var(--cw-border-strong)] bg-[var(--cw-surface-elevated)] text-[var(--cw-text)]'
    }
    if (minutes <= 30) return 'text-red-400 bg-red-400/10 ring-1 ring-red-400'
    if (minutes <= 120) return 'text-orange-400 bg-orange-400/10 ring-1 ring-orange-400'
    return 'text-primary bg-primary/10 ring-1 ring-primary'
  }

  const formatCountdown = (minutes) => {
    if (minutes === null) return ''
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}小時 ${mins}分鐘`
  }

  if (activeShifts.length === 0) {
    return null
  }

  // 獲取當前要顯示的班次
  const currentShift = activeShifts[currentIndex]
  const shiftActionLabel = currentShift.type === 'workEnd' ? '離下班還有' : '離上班還有'

  const rootClass =
    isCraft && isSidebar
      ? 'w-full rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-bg)] p-3 text-left transition-colors hover:bg-[var(--cw-mega-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]'
      : 'flex min-h-[28px] cursor-pointer flex-wrap items-center justify-center gap-1 text-xs transition-opacity hover:opacity-80 sm:gap-2 sm:text-sm'

  const timePillClass = isCraft
    ? `cw-tabular inline-flex w-fit rounded-[var(--cw-radius-sm)] border px-2.5 py-1 text-sm font-semibold transition-colors duration-150 ${getTimeStyle(currentShift.remaining)}`
    : `whitespace-nowrap rounded-full px-2 py-0.5 font-medium transition-all duration-300 sm:px-3 sm:py-1 ${getTimeStyle(currentShift.remaining)}`

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={rootClass}
        onClick={() => setShowTimeline(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setShowTimeline(true)
          }
        }}
        title="點擊查看完整時間軸"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentShift.key}
            initial={{ opacity: 0, ...(isCraft ? {} : { y: -10 }) }}
            animate={{ opacity: 1, ...(isCraft ? {} : { y: 0 }) }}
            exit={{ opacity: 0, ...(isCraft ? {} : { y: 10 }) }}
            transition={{ duration: isCraft ? 0.15 : 0.3 }}
            className={
              isCraft && isSidebar
                ? 'flex w-full flex-col items-stretch gap-1.5'
                : 'flex items-center gap-1 sm:gap-2'
            }
          >
            {isCraft && isSidebar ? (
              <>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
                  班次倒數
                </span>
                <span className="text-sm font-medium text-[var(--cw-text)]">
                  {currentShift.name}
                  <span className="font-normal text-[var(--cw-text-muted)]"> · {shiftActionLabel}</span>
                </span>
                <span className={timePillClass}>{formatCountdown(currentShift.remaining)}</span>
              </>
            ) : (
              <>
                <span
                  className={`whitespace-nowrap ${isCraft ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}`}
                >
                  {currentShift.name}
                  {shiftActionLabel}
                </span>
                <span className={timePillClass}>{formatCountdown(currentShift.remaining)}</span>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <ShiftTimelineModal isOpen={showTimeline} onClose={() => setShowTimeline(false)} />
    </>
  )
}

export default Clock 