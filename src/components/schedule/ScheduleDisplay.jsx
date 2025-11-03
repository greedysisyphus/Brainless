import React, { useMemo, useState } from 'react'
import { measurePerformance } from '../../utils/performance'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../utils/firebase'

// 班表顯示組件
export const ScheduleDisplay = ({ 
  schedule, 
  names, 
  selectedEmployee, 
  selectedWeek, 
  viewMode, 
  filterMode,
  pickupLocations,
  selectedMonth,
  onScheduleUpdate // 新增：班表更新回調
}) => {
  // 編輯狀態管理
  const [isEditing, setIsEditing] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  // 班別選項（包含新的班別類型）
  const SHIFT_OPTIONS = [
    { value: '', label: '空白', color: 'bg-gray-500/10 border-gray-400/30 text-gray-400' },
    { value: '早', label: '早班', color: 'bg-pink-500/20 border-pink-400/50 text-pink-300' },
    { value: '中', label: '中班', color: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300' },
    { value: '午', label: '午班', color: 'bg-green-500/20 border-green-400/50 text-green-300' },
    { value: '晚', label: '晚班', color: 'bg-blue-500/20 border-blue-400/50 text-blue-300' },
    { value: '休', label: '休假', color: 'bg-gray-500/20 border-gray-400/50 text-gray-300' },
    { value: '特', label: '特休', color: 'bg-orange-500/20 border-orange-400/50 text-orange-300' },
    { value: 'D7', label: 'D7', color: 'bg-purple-500/20 border-purple-400/50 text-purple-300' },
    { value: '高鐵', label: '高鐵', color: 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300' },
    { value: '中央店', label: '中央店', color: 'bg-amber-500/20 border-amber-400/50 text-amber-300' }
  ]

  const getCurrentSchedule = () => {
    return schedule
  }

  const getFilteredEmployees = () => {
    return measurePerformance('員工篩選計算', () => {
      const employees = Object.keys(schedule).filter(key => key !== '_lastUpdated')
      
      // 數字排序函數
      const sortByNumber = (a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0')
        const numB = parseInt(b.match(/\d+/)?.[0] || '0')
        return numA - numB
      }
      
      return employees.sort(sortByNumber)
    }, { logThreshold: 5 })
  }

  const getWeekDays = () => {
    return measurePerformance('週次計算', () => {
      const weekNumber = parseInt(selectedWeek.replace('week', ''))
      const startDay = (weekNumber - 1) * 7 + 1
      const endDay = Math.min(startDay + 6, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())
      
      const days = []
      for (let day = startDay; day <= endDay; day++) {
        days.push(day)
      }
      return days
    }, { logThreshold: 5 })
  }

  const getCurrentMonthDays = () => {
    return measurePerformance('月份天數計算', () => {
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      const days = []
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(day)
      }
      return days
    }, { logThreshold: 5 })
  }

  // 編輯相關函數
  const startEditing = () => {
    setEditingSchedule({ ...schedule })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setEditingSchedule({})
    setIsEditing(false)
  }

  const updateShift = (employeeId, day, newShift) => {
    setEditingSchedule(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [day]: newShift
      }
    }))
  }

  const saveSchedule = async () => {
    if (!selectedMonth) {
      alert('請選擇要儲存的月份')
      return
    }

    setIsSaving(true)
    try {
      // 準備儲存資料
      const scheduleData = {
        ...editingSchedule,
        _lastUpdated: new Date().toISOString()
      }

      // 儲存到 Firebase
      await setDoc(doc(db, 'schedule', selectedMonth), scheduleData)
      
      // 通知父組件更新
      if (onScheduleUpdate) {
        onScheduleUpdate(scheduleData)
      }
      
      setIsEditing(false)
      setEditingSchedule({})
      alert('班表已儲存')
    } catch (error) {
      console.error('儲存班表失敗:', error)
      alert('儲存失敗，請稍後再試')
    } finally {
      setIsSaving(false)
    }
  }

  const getShiftColor = (shift) => {
    const option = SHIFT_OPTIONS.find(opt => opt.value === shift)
    return option ? option.color : 'bg-gray-500/20 border-gray-400/50 text-gray-300'
  }

  const getShiftDisplayName = (shift) => {
    const option = SHIFT_OPTIONS.find(opt => opt.value === shift)
    return option ? option.label : shift
  }

  // 獲取當前使用的班表（編輯模式使用 editingSchedule，否則使用原始 schedule）
  const getCurrentDisplaySchedule = () => {
    return isEditing ? editingSchedule : schedule
  }

  const filteredEmployees = getFilteredEmployees()
  const weekDays = getWeekDays()
  const monthDays = getCurrentMonthDays()

  return (
    <div className="space-y-6">
      {/* 班表標題 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          {viewMode === 'date' ? '日期視圖' : 
           viewMode === 'employee' ? '員工視圖' : '搭檔視圖'}
          {isEditing && <span className="text-yellow-400 text-lg ml-2">(編輯模式)</span>}
        </h2>
        <div className="flex items-center gap-4">
        <div className="text-sm text-gray-400">
          共 {filteredEmployees.length} 位同事
          </div>
          {!isEditing ? (
            <button
              onClick={startEditing}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-300 rounded-lg transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              編輯
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={saveSchedule}
                disabled={isSaving}
                className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 text-green-300 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isSaving ? '儲存中...' : '儲存'}
              </button>
              <button
                onClick={cancelEditing}
                disabled={isSaving}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                取消
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 班表內容 */}
      <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm overflow-x-auto">
        {viewMode === 'date' && (
          <div className="min-w-full">
            {/* 日期標題行 */}
            <div className="grid grid-cols-8 gap-2 mb-4">
              <div className="text-center font-semibold text-gray-400 py-2">同事</div>
              {monthDays.map(day => (
                <div key={day} className="text-center font-semibold text-gray-400 py-2 min-w-[60px]">
                  {day}
                </div>
              ))}
            </div>
            
            {/* 員工班表行 */}
            {filteredEmployees.map(employeeId => (
              <div key={employeeId} className="grid grid-cols-8 gap-2 mb-2">
                <div className="text-center py-2 font-medium text-white min-w-[100px]">
                  {names[employeeId] || employeeId}
                </div>
                {monthDays.map(day => {
                  const currentSchedule = getCurrentDisplaySchedule()
                  const shift = currentSchedule[employeeId]?.[day]
                  
                  return (
                    <div key={day} className="text-center py-2 min-w-[60px]">
                      {isEditing ? (
                        <select
                          value={shift || ''}
                          onChange={(e) => updateShift(employeeId, day, e.target.value)}
                          className={`w-full px-2 py-1 rounded-lg text-xs font-bold border bg-white/10 text-white focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${getShiftColor(shift)}`}
                        >
                          {SHIFT_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        shift && (
                        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold border ${getShiftColor(shift)}`}>
                          {getShiftDisplayName(shift)}
                        </span>
                        )
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {viewMode === 'employee' && (
          <div className="min-w-full">
            {/* 週次標題行 */}
            <div className="grid grid-cols-8 gap-2 mb-4">
              <div className="text-center font-semibold text-gray-400 py-2">同事</div>
              {weekDays.map(day => (
                <div key={day} className="text-center font-semibold text-gray-400 py-2 min-w-[60px]">
                  {day}
                </div>
              ))}
            </div>
            
            {/* 員工班表行 */}
            {filteredEmployees.map(employeeId => (
              <div key={employeeId} className="grid grid-cols-8 gap-2 mb-2">
                <div className="text-center py-2 font-medium text-white min-w-[100px]">
                  {names[employeeId] || employeeId}
                </div>
                {weekDays.map(day => {
                  const currentSchedule = getCurrentDisplaySchedule()
                  const shift = currentSchedule[employeeId]?.[day]
                  
                  return (
                    <div key={day} className="text-center py-2 min-w-[60px]">
                      {isEditing ? (
                        <select
                          value={shift || ''}
                          onChange={(e) => updateShift(employeeId, day, e.target.value)}
                          className={`w-full px-2 py-1 rounded-lg text-xs font-bold border bg-white/10 text-white focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${getShiftColor(shift)}`}
                        >
                          {SHIFT_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        shift && (
                        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold border ${getShiftColor(shift)}`}>
                          {getShiftDisplayName(shift)}
                        </span>
                        )
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {viewMode === 'partner' && (
          <div className="space-y-4">
            <div className="text-center text-gray-400">
              搭檔視圖功能開發中...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
