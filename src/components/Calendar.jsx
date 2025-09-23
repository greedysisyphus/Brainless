import React, { useState } from 'react'

const Calendar = ({ selectedDate, onDateSelect, className = '' }) => {
  const [currentDate, setCurrentDate] = useState(selectedDate ? new Date(selectedDate) : new Date())
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
  const [viewYear, setViewYear] = useState(currentDate.getFullYear())

  // 獲取月份名稱
  const getMonthName = (month) => {
    const months = [
      '一月', '二月', '三月', '四月', '五月', '六月',
      '七月', '八月', '九月', '十月', '十一月', '十二月'
    ]
    return months[month]
  }

  // 獲取星期名稱
  const getWeekNames = () => {
    return ['日', '一', '二', '三', '四', '五', '六']
  }

  // 獲取月份的第一天
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay()
  }

  // 獲取月份的天數
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate()
  }

  // 生成日曆格子
  const generateCalendarDays = () => {
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const days = []

    // 添加空白格子（上個月的日期）
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-7 w-7 flex items-center justify-center"></div>
      )
    }

    // 添加當月的日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewYear, viewMonth, day)
      const isSelected = selectedDate && 
        selectedDate.getFullYear() === viewYear &&
        selectedDate.getMonth() === viewMonth &&
        selectedDate.getDate() === day
      
      const isToday = new Date().toDateString() === date.toDateString()

      days.push(
        <button
          key={day}
          onClick={() => onDateSelect(date)}
          className={`
            h-7 w-7 rounded text-xs font-medium transition-all duration-200
            flex items-center justify-center
            hover:bg-green-400/20 hover:scale-105
            ${isSelected 
              ? 'bg-green-400 text-white shadow-lg' 
              : isToday 
                ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30'
                : 'text-gray-300 hover:text-white'
            }
          `}
        >
          {day}
        </button>
      )
    }

    return days
  }

  // 上一個月
  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  // 下一個月
  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  return (
    <div className={`bg-gradient-to-br from-surface/80 to-surface/60 rounded-lg p-3 border border-white/20 shadow-lg backdrop-blur-sm ${className}`}>
      {/* 月曆標題 */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goToPreviousMonth}
          className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-sm font-bold text-white">
          {viewYear}年 {getMonthName(viewMonth)}
        </h3>
        
        <button
          onClick={goToNextMonth}
          className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 星期標題 */}
      <div className="grid grid-cols-7 mb-1.5">
        {getWeekNames().map((day) => (
          <div key={day} className="h-6 w-7 flex items-center justify-center text-xs font-medium text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* 日期格子 */}
      <div className="grid grid-cols-7">
        {generateCalendarDays()}
      </div>
    </div>
  )
}

// 日期範圍選擇器
export const DateRangePicker = ({ startDate, endDate, onStartDateSelect, onEndDateSelect, className = '' }) => {
  const [showStartCalendar, setShowStartCalendar] = useState(false)
  const [showEndCalendar, setShowEndCalendar] = useState(false)

  const formatDate = (date) => {
    if (!date) return ''
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 開始日期選擇 */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-300">開始日期</label>
        <button
          onClick={() => {
            setShowStartCalendar(!showStartCalendar)
            setShowEndCalendar(false)
          }}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-left hover:bg-white/20 transition-colors focus:border-green-400/50 text-sm"
        >
          {startDate ? formatDate(startDate) : '選擇開始日期'}
        </button>
        
        {showStartCalendar && (
          <div className="mt-1.5">
            <Calendar
              selectedDate={startDate}
              onDateSelect={(date) => {
                onStartDateSelect(date)
                setShowStartCalendar(false)
              }}
            />
          </div>
        )}
      </div>

      {/* 結束日期選擇 */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-300">結束日期</label>
        <button
          onClick={() => {
            setShowEndCalendar(!showEndCalendar)
            setShowStartCalendar(false)
          }}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-left hover:bg-white/20 transition-colors focus:border-green-400/50 text-sm"
        >
          {endDate ? formatDate(endDate) : '選擇結束日期'}
        </button>
        
        {showEndCalendar && (
          <div className="mt-1.5">
            <Calendar
              selectedDate={endDate}
              onDateSelect={(date) => {
                onEndDateSelect(date)
                setShowEndCalendar(false)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default Calendar
