import { useState, useEffect, useMemo } from 'react'
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../utils/firebase'
import { CalendarIcon, ArrowLeftIcon, ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { createEvents } from 'ics'

function ScheduleCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [shifts, setShifts] = useState([]) // 所有可用的班別
  const [schedules, setSchedules] = useState([]) // 已設定的班表
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedShift, setSelectedShift] = useState('')
  const [isLoading, setIsLoading] = useState(true)

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

  // 格式化日期為 YYYY-MM-DD
  const formatDateKey = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 載入班別列表
  useEffect(() => {
    const q = query(collection(db, 'shifts'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const shiftsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setShifts(shiftsData)
      setIsLoading(false)
    }, (error) => {
      console.error('載入班別失敗:', error)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // 載入當前月份的班表
  useEffect(() => {
    if (!currentYear || currentMonth === null) return

    const startDate = new Date(currentYear, currentMonth, 1)
    const endDate = new Date(currentYear, currentMonth + 1, 0)
    
    const startKey = formatDateKey(startDate)
    const endKey = formatDateKey(endDate)

    const q = query(
      collection(db, 'schedules'),
      where('dateKey', '>=', startKey),
      where('dateKey', '<=', endKey)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const schedulesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setSchedules(schedulesData)
    }, (error) => {
      console.error('載入班表失敗:', error)
    })

    return () => unsubscribe()
  }, [currentYear, currentMonth])

  // 獲取指定日期的班表
  const getScheduleForDate = (date) => {
    const dateKey = formatDateKey(date)
    return schedules.find(s => s.dateKey === dateKey)
  }

  // 獲取班別資訊
  const getShiftInfo = (shiftId) => {
    return shifts.find(s => s.id === shiftId)
  }

  // 上一個月
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  // 下一個月
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // 點擊日期
  const handleDateClick = (date) => {
    setSelectedDate(date)
    const existingSchedule = getScheduleForDate(date)
    setSelectedShift(existingSchedule?.shiftId || '')
  }

  // 儲存班表
  const saveSchedule = async () => {
    if (!selectedDate || !selectedShift) {
      alert('請選擇日期和班別')
      return
    }

    try {
      const dateKey = formatDateKey(selectedDate)
      const existingSchedule = getScheduleForDate(selectedDate)

      const scheduleData = {
        dateKey,
        date: selectedDate.toISOString(),
        shiftId: selectedShift,
        updatedAt: serverTimestamp()
      }

      if (existingSchedule) {
        // 更新現有班表
        await updateDoc(doc(db, 'schedules', existingSchedule.id), scheduleData)
      } else {
        // 新增班表
        scheduleData.createdAt = serverTimestamp()
        await addDoc(collection(db, 'schedules'), scheduleData)
      }

      setSelectedDate(null)
      setSelectedShift('')
    } catch (error) {
      console.error('儲存班表失敗:', error)
      alert('儲存失敗，請稍後再試')
    }
  }

  // 刪除班表
  const deleteSchedule = async (date) => {
    if (!confirm('確定要刪除此日期的班表嗎？')) return

    try {
      const dateKey = formatDateKey(date)
      const existingSchedule = getScheduleForDate(date)
      
      if (existingSchedule) {
        await deleteDoc(doc(db, 'schedules', existingSchedule.id))
      }
    } catch (error) {
      console.error('刪除班表失敗:', error)
      alert('刪除失敗，請稍後再試')
    }
  }

  // 匯出到 Apple Calendar
  const exportToCalendar = async () => {
    if (schedules.length === 0) {
      alert('沒有可匯出的班表')
      return
    }

    try {
      const events = []

      for (const schedule of schedules) {
        const shift = getShiftInfo(schedule.shiftId)
        if (!shift) continue

        const date = new Date(schedule.date)
        const [startHour, startMinute] = parseTime(shift.startTime)
        const [endHour, endMinute] = parseTime(shift.endTime)

        const startDate = new Date(date)
        startDate.setHours(startHour, startMinute, 0, 0)

        const endDate = new Date(date)
        endDate.setHours(endHour, endMinute, 0, 0)

        // 如果結束時間小於開始時間，表示跨日
        if (endDate < startDate) {
          endDate.setDate(endDate.getDate() + 1)
        }

        events.push({
          title: `${shift.store} - ${shift.shiftName}`,
          description: `${shift.startTime} - ${shift.endTime}`,
          start: [
            startDate.getFullYear(),
            startDate.getMonth() + 1,
            startDate.getDate(),
            startDate.getHours(),
            startDate.getMinutes()
          ],
          end: [
            endDate.getFullYear(),
            endDate.getMonth() + 1,
            endDate.getDate(),
            endDate.getHours(),
            endDate.getMinutes()
          ]
        })
      }

      const { error, value } = createEvents(events)

      if (error) {
        console.error('生成日曆失敗:', error)
        alert('生成日曆失敗，請稍後再試')
        return
      }

      // 下載 .ics 文件
      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `班表_${currentYear}年${currentMonth + 1}月.ics`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('匯出失敗:', error)
      alert('匯出失敗，請稍後再試')
    }
  }

  // 解析時間字串（支援多種格式）
  const parseTime = (timeStr) => {
    if (!timeStr) return [0, 0]
    
    const trimmed = timeStr.trim().toLowerCase()
    
    // 處理 12 小時制（如 "1:00 pm" 或 "1:00pm"）
    const pmMatch = trimmed.match(/(\d+):(\d+)\s*(pm|下午)/)
    if (pmMatch) {
      let hour = parseInt(pmMatch[1])
      if (hour !== 12) hour += 12
      return [hour, parseInt(pmMatch[2])]
    }

    const amMatch = trimmed.match(/(\d+):(\d+)\s*(am|上午)/)
    if (amMatch) {
      let hour = parseInt(amMatch[1])
      if (hour === 12) hour = 0
      return [hour, parseInt(amMatch[2])]
    }

    // 處理 24 小時制（如 "13:00" 或 "4:30"）
    const match = trimmed.match(/(\d+):(\d+)/)
    if (match) {
      const hour = parseInt(match[1])
      const minute = parseInt(match[2])
      // 確保小時在 0-23 範圍內，分鐘在 0-59 範圍內
      return [Math.max(0, Math.min(23, hour)), Math.max(0, Math.min(59, minute))]
    }

    // 預設值
    console.warn(`無法解析時間格式: ${timeStr}`)
    return [0, 0]
  }

  // 生成日曆格子
  const calendarDays = useMemo(() => {
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const days = []

    // 添加空白格子（上個月的日期）
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-20 flex items-center justify-center"></div>
      )
    }

    // 添加當月的日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      const schedule = getScheduleForDate(date)
      const shift = schedule ? getShiftInfo(schedule.shiftId) : null
      const isToday = new Date().toDateString() === date.toDateString()

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(date)}
          className={`
            h-20 border border-white/10 rounded-lg p-2 text-left transition-all
            hover:border-green-500/50 hover:bg-green-500/10
            ${isToday ? 'bg-blue-500/20 border-blue-500/50' : ''}
            ${schedule ? 'bg-green-500/20 border-green-500/50' : ''}
          `}
        >
          <div className="text-sm font-medium text-primary mb-1">{day}</div>
          {shift && (
            <div className="text-xs text-text-secondary">
              <div className="font-medium text-green-400">{shift.store}</div>
              <div className="text-xs">{shift.shiftName}</div>
              <div className="text-xs opacity-75">{shift.startTime} - {shift.endTime}</div>
            </div>
          )}
        </button>
      )
    }

    return days
  }, [currentYear, currentMonth, schedules, shifts])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-secondary">載入中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 標題和匯出按鈕 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary mb-1">月曆班表</h2>
          <p className="text-text-secondary text-sm">點擊日期設定班別，完成後可匯出到 Apple Calendar</p>
        </div>
        <button
          onClick={exportToCalendar}
          disabled={schedules.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          <CalendarIcon className="w-5 h-5" />
          <span>匯出到 Apple Calendar</span>
        </button>
      </div>

      {/* 月曆 */}
      <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-lg p-6">
        {/* 月份導航 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-text-secondary" />
          </button>
          
          <h3 className="text-xl font-bold text-primary">
            {currentYear}年 {getMonthName(currentMonth)}
          </h3>
          
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowRightIcon className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* 星期標題 */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {getWeekNames().map((day) => (
            <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-text-secondary">
              {day}
            </div>
          ))}
        </div>

        {/* 日期格子 */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays}
        </div>
      </div>

      {/* 設定班表模態框 */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-white/20 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-primary">
                設定班表 - {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
              </h3>
              <button
                onClick={() => {
                  setSelectedDate(null)
                  setSelectedShift('')
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 選擇班別 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  選擇班別
                </label>
                {shifts.length === 0 ? (
                  <div className="text-sm text-text-secondary p-4 bg-white/5 rounded-lg">
                    尚未建立任何班別，請先到「班別設定」新增班別
                  </div>
                ) : (
                  <select
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-primary focus:outline-none focus:border-green-500/50"
                  >
                    <option value="">請選擇班別</option>
                    {shifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {shift.store} - {shift.shiftName} ({shift.startTime} - {shift.endTime})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 顯示現有班表資訊 */}
              {selectedShift && (() => {
                const shift = getShiftInfo(selectedShift)
                return shift ? (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="text-sm text-text-secondary">
                      <div className="font-medium text-green-400 mb-1">{shift.store} - {shift.shiftName}</div>
                      <div className="text-xs">時間：{shift.startTime} - {shift.endTime}</div>
                    </div>
                  </div>
                ) : null
              })()}
            </div>

            {/* 按鈕 */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => {
                  if (getScheduleForDate(selectedDate)) {
                    deleteSchedule(selectedDate)
                  }
                  setSelectedDate(null)
                  setSelectedShift('')
                }}
                className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                disabled={!getScheduleForDate(selectedDate)}
              >
                刪除
              </button>
              <button
                onClick={() => {
                  setSelectedDate(null)
                  setSelectedShift('')
                }}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-primary rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveSchedule}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                disabled={!selectedShift}
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduleCalendar
