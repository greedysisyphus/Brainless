import React, { useMemo, useState } from 'react'
import { calculateShiftOverlap } from '../../utils/statistics'

// 搭班統計表格組件
export default function ShiftOverlapTable({ schedule, names, onEmployeeClick, selectedMonth }) {
  // 顯示模式狀態：'table' 表格模式，'cards' 卡片模式
  const [displayMode, setDisplayMode] = useState('table')
  // 過濾器狀態：選中的同事ID列表
  const [selectedEmployees, setSelectedEmployees] = useState(new Set())
  
  // 使用 useMemo 優化計算性能
  const { overlapStats, overlapDetails, employees, summary } = useMemo(() => {
    const { overlapStats, overlapDetails } = calculateShiftOverlap(schedule, names, selectedMonth)
    
    const employees = Object.keys(schedule)
      .filter(key => key !== '_lastUpdated')
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0')
        const numB = parseInt(b.match(/\d+/)?.[0] || '0')
        return numA - numB
      })

    const calculateSummary = () => {
      let totalOverlaps = 0
      let maxOverlap = 0
      
      Object.values(overlapStats).forEach(employeeStats => {
        Object.values(employeeStats).forEach(count => {
          totalOverlaps += count
          maxOverlap = Math.max(maxOverlap, count)
        })
      })
      
      return { totalOverlaps, maxOverlap }
    }
    
    const summary = calculateSummary()
    return { overlapStats, overlapDetails, employees, summary }
  }, [schedule, names, selectedMonth])

  // 初始化時選擇所有同事，默認顯示全部
  React.useEffect(() => {
    if (employees.length > 0 && selectedEmployees.size === 0) {
      setSelectedEmployees(new Set(employees))
    }
  }, [employees, selectedEmployees.size])

  // 點擊同事名字，只顯示該同事的搭班資料
  const toggleEmployee = (employeeId) => {
    setSelectedEmployees(new Set([employeeId]))
  }

  // 顯示全部同事
  const showAllEmployees = () => {
    setSelectedEmployees(new Set(employees))
  }

  // 過濾後的同事列表 - 顯示選中的同事（默認顯示全部）
  const filteredEmployees = selectedEmployees.size > 0 
    ? employees.filter(employeeId => selectedEmployees.has(employeeId))
    : employees

  // 獲取搭班次數的顏色樣式（使用柔和的紫藍色漸變）
  const getOverlapColor = (count, maxCount) => {
    if (count === 0) return 'bg-surface/30 border-white/20 text-gray-400'
    
    const percentage = maxCount > 0 ? (count / maxCount) : 0
    
    // 根據搭班次數使用柔和的紫藍色漸變（降低銳利感）
    if (percentage >= 0.9) {
      // 最高頻率：柔和的深紫色
      return 'bg-gradient-to-br from-purple-600/80 to-purple-700/80 border-purple-400/50 text-white shadow-md shadow-purple-500/30'
    } else if (percentage >= 0.7) {
      // 高頻率：溫和的紫色
      return 'bg-gradient-to-br from-purple-500/80 to-purple-600/80 border-purple-400/50 text-white shadow-md shadow-purple-500/25'
    } else if (percentage >= 0.5) {
      // 中高頻率：主色調到柔和紫色
      return 'bg-gradient-to-br from-indigo-500/80 to-purple-500/80 border-indigo-400/50 text-white shadow-sm shadow-indigo-500/25'
    } else if (percentage >= 0.3) {
      // 中頻率：溫和藍色到主色調
      return 'bg-gradient-to-br from-blue-500/80 to-indigo-500/80 border-blue-400/50 text-white shadow-sm shadow-blue-500/20'
    } else if (percentage >= 0.1) {
      // 低頻率：淡藍色到藍色
      return 'bg-gradient-to-br from-blue-400/80 to-blue-500/80 border-blue-300/50 text-white shadow-sm shadow-blue-400/15'
    } else {
      // 最低頻率：淡藍紫色
      return 'bg-gradient-to-br from-indigo-400/80 to-blue-400/80 border-indigo-300/50 text-white shadow-sm shadow-indigo-400/15'
    }
  }

  return (
    <div className="space-y-6">
      {/* 標題和Tab切換 */}
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold bg-gradient-to-r from-primary via-purple-500 to-secondary bg-clip-text text-transparent">
            搭班統計表
          </h3>
          <div className="w-16 h-0.5 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full opacity-80"></div>
          <p className="text-text-secondary text-xs font-medium">
            本月同事班次配對統計分析
          </p>
          {displayMode === 'cards' && (
            <div className="text-xs text-text-secondary/60">
              {selectedEmployees.size === employees.length 
                ? `顯示全部 ${employees.length} 位同事的搭班統計` 
                : selectedEmployees.size === 1
                ? `正在查看 ${Array.from(selectedEmployees)[0] ? names[Array.from(selectedEmployees)[0]] || Array.from(selectedEmployees)[0] : ''} 的搭班統計`
                : `顯示 ${selectedEmployees.size} 位同事的搭班統計`}
            </div>
          )}
        </div>
        
        {/* Tab切換按鈕 */}
        <div className="flex justify-center px-4">
          <div className="bg-surface/60 rounded-xl p-1 border border-white/10 backdrop-blur-sm w-full max-w-sm">
            <div className="flex gap-1">
              <button
                onClick={() => setDisplayMode('table')}
                className={`flex-1 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 touch-optimized ${
                  displayMode === 'table'
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-text-secondary hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0V4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1z" />
                  </svg>
                  <span className="hidden sm:inline">表格模式</span>
                  <span className="sm:hidden">表格</span>
                </div>
              </button>
              <button
                onClick={() => setDisplayMode('cards')}
                className={`flex-1 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 touch-optimized ${
                  displayMode === 'cards'
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-text-secondary hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="hidden sm:inline">卡片模式</span>
                  <span className="sm:hidden">卡片</span>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        {/* 卡片模式過濾器 */}
        {displayMode === 'cards' && (
          <div className="space-y-3">
            {/* 全選按鈕 */}
            <div className="flex justify-center">
              <button
                onClick={showAllEmployees}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  selectedEmployees.size === employees.length
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-secondary text-white shadow-lg shadow-secondary/20 hover:bg-secondary/80'
                }`}
              >
                {selectedEmployees.size === employees.length ? '顯示全部' : 
                 selectedEmployees.size === 0 ? '顯示全部' : 
                 '顯示全部'}
              </button>
            </div>
            
            {/* 同事選擇按鈕 */}
            <div className="bg-surface/40 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
              <div className="text-xs text-text-secondary font-medium mb-2 text-center">點擊同事名字查看其搭班統計</div>
              <div className="flex flex-wrap justify-center gap-2">
                {employees.map(employeeId => (
                  <button
                    key={employeeId}
                    onClick={() => toggleEmployee(employeeId)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 touch-optimized ${
                      selectedEmployees.has(employeeId)
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-surface/60 text-text-secondary hover:text-white hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {names[employeeId] || employeeId}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 桌面端：表格模式 */}
      {displayMode === 'table' && (
        <div className="hidden lg:block">
          <div className="bg-gradient-to-br from-surface/80 to-surface/60 rounded-2xl border border-white/10 shadow-2xl shadow-primary/5 overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed" style={{ borderCollapse: 'collapse', borderSpacing: 0 }}>
                <thead>
                  <tr className="bg-gradient-to-r from-primary/20 via-purple-500/20 to-secondary/20 border-b border-primary/30">
                    <th className="text-left p-3 text-primary font-bold text-sm tracking-wide w-32" style={{ border: 'none !important' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                        同事姓名
                      </div>
                    </th>
                    {employees.map(employeeId => (
                      <th key={employeeId} className="text-center p-2 text-primary font-semibold text-sm w-16" style={{ border: 'none !important' }}>
                        <div className="flex justify-center">
                          <div className="transform transition-all duration-300 hover:scale-105 truncate max-w-full" title={names[employeeId] || employeeId}>
                            {names[employeeId] || employeeId}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employeeId, index) => (
                    <tr key={employeeId} className="group border-b border-white/5 hover:bg-gradient-to-r hover:from-primary/5 hover:to-secondary/5 transition-all duration-300">
                      <td 
                        className="p-3 text-white font-semibold text-sm cursor-pointer hover:text-primary transition-all duration-300 transform hover:translate-x-1 w-32" 
                        style={{ border: 'none !important' }}
                        onClick={() => onEmployeeClick(employeeId)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shadow-lg">
                            {index + 1}
                          </div>
                          <span className="group-hover:text-primary transition-colors duration-300 truncate" title={names[employeeId] || employeeId}>
                            {names[employeeId] || employeeId}
                          </span>
                        </div>
                      </td>
                      {employees.map(otherId => {
                        const count = overlapStats[employeeId]?.[otherId] || 0
                        
                        return (
                          <td key={otherId} className="p-2 text-center w-16" style={{ border: 'none !important' }}>
                            <div className="flex justify-center">
                              {employeeId === otherId ? (
                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-surface/60 to-surface/40 border border-primary/20 flex items-center justify-center text-text-secondary text-xs font-medium shadow-inner">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50"></div>
                                </div>
                              ) : count > 0 ? (
                                <div 
                                  className={`px-2 py-1.5 rounded-lg text-center text-xs font-bold border cursor-pointer hover:scale-110 hover:rotate-1 transition-all duration-300 shadow-lg hover:shadow-primary/20 ${getOverlapColor(count, summary.maxOverlap)}`}
                                  title={`${names[employeeId] || employeeId} 與 ${names[otherId] || otherId} 搭班 ${count} 次`}
                                >
                                  <div className="relative">
                                    {count}
                                    <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-lg bg-surface/30 border border-white/5 flex items-center justify-center text-text-secondary/50 text-sm hover:border-white/10 transition-all duration-300">
                                  <span className="text-xs opacity-60">—</span>
                                </div>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* 表格底部統計 */}
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border-t border-primary/20 p-3">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-text-secondary font-medium">總搭班次數：</span>
                  <span className="text-primary font-bold text-sm">{summary.totalOverlaps}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-text-secondary font-medium">最高搭班：</span>
                  <span className="text-secondary font-bold text-sm">{summary.maxOverlap} 次</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 桌面端：卡片模式 */}
      {displayMode === 'cards' && (
        <div className="hidden lg:block">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📊</div>
              <div className="text-lg mb-2">暫無搭班資料</div>
              <div className="text-sm">請確保已載入班表資料</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredEmployees.map((employeeId, index) => (
              <div key={employeeId} className="group bg-gradient-to-br from-surface/90 to-surface/70 rounded-xl p-3 border border-white/10 shadow-lg shadow-primary/5 hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-1 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <div 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => onEmployeeClick(employeeId)}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-primary/20">
                      {index + 1}
                    </div>
                    <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors duration-300 truncate">
                      {names[employeeId] || employeeId}
                    </h4>
                  </div>
                  <span className="text-xs text-primary font-semibold bg-primary/20 px-2 py-1 rounded-full">統計</span>
                </div>
                
                {/* 搭班夥伴網格 */}
                <div className="bg-gradient-to-br from-white/5 to-transparent rounded-lg p-2 border border-white/5">
                  <h5 className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
                    搭班統計
                  </h5>
                  <div className="grid grid-cols-3 gap-1">
                    {employees.map(otherId => {
                      const count = overlapStats[employeeId]?.[otherId] || 0
                      
                      if (employeeId === otherId) return null
                      
                      return (
                        <div key={otherId} className="group text-center space-y-0.5">
                      <div className="text-xs text-text-secondary font-medium truncate group-hover:text-primary transition-colors leading-tight text-center">
                        {names[otherId] || otherId}
                      </div>
                      {count > 0 ? (
                        <div 
                          className={`px-1 py-0.5 rounded text-xs font-bold border cursor-pointer hover:scale-110 hover:rotate-1 transition-all duration-300 flex items-center justify-center ${getOverlapColor(count, summary.maxOverlap)}`}
                          title={`與 ${names[otherId] || otherId} 搭班 ${count} 次`}
                        >
                          <div className="relative">
                            {count}
                            <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-white/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded bg-surface/30 border border-white/5 flex items-center justify-center text-text-secondary/30 text-xs hover:border-white/10 transition-all duration-300 mx-auto">
                          <span className="text-xs leading-none">—</span>
                        </div>
                      )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      )}

      {/* 移動端和平板：始終顯示卡片布局 */}
      <div className="lg:hidden space-y-4">
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📊</div>
            <div className="text-lg mb-2">暫無搭班資料</div>
            <div className="text-sm">請確保已載入班表資料</div>
          </div>
        ) : (
          filteredEmployees.map((employeeId, index) => (
          <div key={employeeId} className="group bg-gradient-to-br from-surface/90 to-surface/70 rounded-xl p-4 border border-white/10 shadow-lg shadow-primary/5 hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-1 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => onEmployeeClick(employeeId)}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-primary/20">
                  {index + 1}
                </div>
                <h4 className="text-base font-bold text-white group-hover:text-primary transition-colors duration-300">
                  {names[employeeId] || employeeId}
                </h4>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-primary font-semibold bg-primary/20 px-2 py-1 rounded-full">搭班統計</span>
                <span className="text-xs text-text-secondary mt-1">點擊查看詳情</span>
              </div>
            </div>
            
            {/* 搭班夥伴網格 */}
            <div className="bg-gradient-to-br from-white/5 to-transparent rounded-lg p-3 border border-white/5">
              <h5 className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                搭班夥伴統計
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {employees.map(otherId => {
                  const count = overlapStats[employeeId]?.[otherId] || 0
                  
                  if (employeeId === otherId) return null
                  
                  return (
                    <div key={otherId} className="group text-center space-y-1">
                      <div className="text-xs text-text-secondary font-medium truncate group-hover:text-primary transition-colors">
                        {names[otherId] || otherId}
                      </div>
                      {count > 0 ? (
                        <div 
                          className={`px-2 py-1.5 rounded-lg text-xs font-bold border cursor-pointer hover:scale-110 hover:rotate-1 transition-all duration-300 ${getOverlapColor(count, summary.maxOverlap)}`}
                          title={`與 ${names[otherId] || otherId} 搭班 ${count} 次`}
                        >
                          <div className="relative">
                            {count}
                            <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-white/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-surface/30 border border-white/5 flex items-center justify-center text-text-secondary/30 text-xs hover:border-white/10 transition-all duration-300">
                          <span className="text-xs">—</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  )
}