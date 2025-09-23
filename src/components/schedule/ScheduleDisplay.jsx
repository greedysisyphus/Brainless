import React, { useMemo } from 'react'
import { measurePerformance } from '../../utils/performance'

// 班表顯示組件
export const ScheduleDisplay = ({ 
  schedule, 
  names, 
  selectedEmployee, 
  selectedWeek, 
  viewMode, 
  filterMode,
  pickupLocations 
}) => {
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

  const getShiftColor = (shift) => {
    const colors = {
      '早': 'bg-pink-500/20 border-pink-400/50 text-pink-300',
      '中': 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300', 
      '晚': 'bg-blue-500/20 border-blue-400/50 text-blue-300',
      '休': 'bg-gray-500/20 border-gray-400/50 text-gray-300',
      '特': 'bg-orange-500/20 border-orange-400/50 text-orange-300'
    }
    return colors[shift] || 'bg-gray-500/20 border-gray-400/50 text-gray-300'
  }

  const getShiftDisplayName = (shift) => {
    const displayNames = {
      '早': '早',
      '中': '中',
      '晚': '晚', 
      '休': '休',
      '特': '特'
    }
    return displayNames[shift] || shift
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
        </h2>
        <div className="text-sm text-gray-400">
          共 {filteredEmployees.length} 位同事
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
                  const shift = schedule[employeeId]?.[day]
                  return (
                    <div key={day} className="text-center py-2 min-w-[60px]">
                      {shift && (
                        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold border ${getShiftColor(shift)}`}>
                          {getShiftDisplayName(shift)}
                        </span>
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
                  const shift = schedule[employeeId]?.[day]
                  return (
                    <div key={day} className="text-center py-2 min-w-[60px]">
                      {shift && (
                        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold border ${getShiftColor(shift)}`}>
                          {getShiftDisplayName(shift)}
                        </span>
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
