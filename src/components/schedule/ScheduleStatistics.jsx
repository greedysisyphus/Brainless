import React, { useMemo } from 'react'
import { measurePerformance, useRenderPerformance } from '../../utils/performance'
import { LoadingOverlay, StatisticsSkeleton } from '../LoadingSpinner'

// 過濾統計分析中的同事（排除支援同事和標記為排除統計的同事）
const getFilteredEmployeeIds = (schedule, employeeTags = {}) => {
  return Object.keys(schedule).filter(employeeId => {
    if (employeeId === '_lastUpdated') return false
    
    const tag = employeeTags[employeeId] || 'regular'
    // 只保留一般同事（排除支援同事和排除統計的同事）
    return tag === 'regular'
  })
}

// 統計卡片主題配置
const STATS_THEMES = {
  early: {
    color: 'pink',
    icon: (
      <svg className="w-5 h-5 text-pink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: '早班統計',
    gradient: 'from-pink-500/20 to-rose-500/20',
    border: 'border-pink-400/30'
  },
  afternoon: {
    color: 'orange',
    icon: (
      <svg className="w-5 h-5 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: '午班統計',
    gradient: 'from-orange-500/20 to-amber-500/20',
    border: 'border-orange-400/30'
  },
  night: {
    color: 'blue',
    icon: (
      <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
    title: '晚班統計',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    border: 'border-blue-400/30'
  },
  consecutive: {
    color: 'orange',
    icon: (
      <svg className="w-5 h-5 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: '連續上班',
    gradient: 'from-orange-500/20 to-yellow-500/20',
    border: 'border-orange-400/30'
  },
  stockLover: {
    color: 'emerald',
    icon: (
      <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: '熱愛進貨',
    gradient: 'from-emerald-500/20 to-green-500/20',
    border: 'border-emerald-400/30'
  }
}

// 通用統計卡片組件
const StatCard = ({ title, icon, themeColor, children, isLoading }) => {
  return (
    <div className={`bg-gradient-to-br ${STATS_THEMES[themeColor].gradient} rounded-2xl p-4 border ${STATS_THEMES[themeColor].border} shadow-xl backdrop-blur-sm`}>
      <div className="flex items-center justify-center mb-4">
        <div className={`w-10 h-10 rounded-full bg-${STATS_THEMES[themeColor].color}-500/20 border border-${STATS_THEMES[themeColor].color}-400/30 flex items-center justify-center mr-3`}>
          {icon}
        </div>
        <h3 className={`text-lg font-bold text-${STATS_THEMES[themeColor].color}-300`}>{title}</h3>
      </div>
      <LoadingOverlay isLoading={isLoading}>
        {children}
      </LoadingOverlay>
    </div>
  )
}

// 早班/早中班統計組件
export const EarlyShiftStats = ({ schedule, names, employeeTags = {}, showAll = false, selectedMonth }) => {
  
  const calculateEarlyStats = () => {
    return measurePerformance('早班統計計算', () => {
      const stats = []
      
      // 根據 selectedMonth 計算對應的年份、月份和天數
      let targetYear, targetMonth, daysInMonth
      
      if (!selectedMonth || selectedMonth === 'current') {
        // 使用當前月份
        const currentDate = new Date()
        targetYear = currentDate.getFullYear()
        targetMonth = currentDate.getMonth() + 1
      } else if (selectedMonth === 'next') {
        // 使用下個月
        const nextDate = new Date()
        nextDate.setMonth(nextDate.getMonth() + 1)
        targetYear = nextDate.getFullYear()
        targetMonth = nextDate.getMonth() + 1
      } else {
        // 解析選定的月份
        let monthKey = selectedMonth
        if (selectedMonth.includes('_')) {
          monthKey = selectedMonth.split('_')[0] // 移除店別後綴
        }
        const [year, month] = monthKey.split('-').map(Number)
        targetYear = year
        targetMonth = month
      }
      
      daysInMonth = new Date(targetYear, targetMonth, 0).getDate()
      
      // 判斷使用哪種早中班統計算法（10月及之後早中班合併統計）
      const useNewEarlyMiddleAlgorithm = targetYear > 2025 || (targetYear === 2025 && targetMonth >= 10)
      
      // 只統計一般同事（排除支援同事和排除統計的同事）
      const filteredEmployeeIds = getFilteredEmployeeIds(schedule, employeeTags)
      
      filteredEmployeeIds.forEach(employeeId => {
        let count = 0
        
        for (let day = 1; day <= daysInMonth; day++) {
          const shift = schedule[employeeId]?.[day]
          
          // 早中班統計：根據月份使用不同邏輯
          if (useNewEarlyMiddleAlgorithm) {
            // 2025年10月及之後：早班 + 中班
            if (shift === '早' || shift === '中') {
              count++
            }
          } else {
            // 2025年9月及之前：只有早班
            if (shift === '早') {
              count++
            }
          }
        }
        
        // 包含所有員工，包括次數為0的
        stats.push({
          employeeId,
          name: names[employeeId] || employeeId,
          count
        })
      })
      
      // 按次數降序排序
      const sortedStats = stats.sort((a, b) => b.count - a.count)
      
      // 計算排名（相同次數的排名相同）
      let currentRank = 1
      let previousCount = null
      
      return sortedStats.map((stat, index) => {
        if (previousCount !== null && stat.count !== previousCount) {
          currentRank = index + 1
        }
        previousCount = stat.count
        
        return {
          ...stat,
          rank: currentRank
        }
      })
    }, { logThreshold: 5 })
  }
  
  const earlyStats = calculateEarlyStats()
  const displayStats = showAll ? earlyStats : earlyStats.slice(0, 5)
  
  return (
    <div className="space-y-3">
      {earlyStats.length > 0 ? (
        displayStats.map((stat) => (
          <div 
            key={stat.employeeId}
            className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10 hover:bg-surface/30 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-pink-500/30 border border-pink-400/50 flex items-center justify-center text-xs font-bold text-pink-300">
                {stat.rank}
              </div>
              <span className="text-white font-medium text-sm">{stat.name}</span>
            </div>
            <div className="text-pink-300 font-bold text-sm">{stat.count} 次</div>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-gray-400">
          <div className="text-4xl mb-2">🌅</div>
          <div>本月無早班記錄</div>
        </div>
      )}
    </div>
  )
}

// 午班統計組件
export const AfternoonShiftStats = ({ schedule, names, employeeTags = {}, showAll = false, selectedMonth }) => {
  
  const calculateAfternoonStats = () => {
    return measurePerformance('午班統計計算', () => {
      const stats = []
      
      // 根據 selectedMonth 計算對應的年份、月份和天數
      let targetYear, targetMonth, daysInMonth
      
      if (!selectedMonth || selectedMonth === 'current') {
        // 使用當前月份
        const currentDate = new Date()
        targetYear = currentDate.getFullYear()
        targetMonth = currentDate.getMonth() + 1
      } else if (selectedMonth === 'next') {
        // 使用下個月
        const nextDate = new Date()
        nextDate.setMonth(nextDate.getMonth() + 1)
        targetYear = nextDate.getFullYear()
        targetMonth = nextDate.getMonth() + 1
      } else {
        // 解析選定的月份
        let monthKey = selectedMonth
        if (selectedMonth.includes('_')) {
          monthKey = selectedMonth.split('_')[0] // 移除店別後綴
        }
        const [year, month] = monthKey.split('-').map(Number)
        targetYear = year
        targetMonth = month
      }
      
      daysInMonth = new Date(targetYear, targetMonth, 0).getDate()
      
      // 只統計一般同事（排除支援同事和排除統計的同事）
      const filteredEmployeeIds = getFilteredEmployeeIds(schedule, employeeTags)
      
      filteredEmployeeIds.forEach(employeeId => {
        let count = 0
        
        for (let day = 1; day <= daysInMonth; day++) {
          const shift = schedule[employeeId]?.[day]
          if (shift === '午') {
            count++
          }
        }
        
        // 包含所有員工，包括次數為0的
        stats.push({
          employeeId,
          name: names[employeeId] || employeeId,
          count
        })
      })
      
      // 按次數降序排序
      const sortedStats = stats.sort((a, b) => b.count - a.count)
      
      // 計算排名（相同次數的排名相同）
      let currentRank = 1
      let previousCount = null
      
      return sortedStats.map((stat, index) => {
        if (previousCount !== null && stat.count !== previousCount) {
          currentRank = index + 1
        }
        previousCount = stat.count
        
        return {
          ...stat,
          rank: currentRank
        }
      })
    }, { logThreshold: 5 })
  }
  
  const afternoonStats = calculateAfternoonStats()
  const displayStats = showAll ? afternoonStats : afternoonStats.slice(0, 5)

  return (
    <div className="space-y-3">
      {afternoonStats.length > 0 ? (
        displayStats.map((stat) => (
          <div 
            key={stat.employeeId}
            className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-400/20 rounded-lg hover:bg-orange-500/20 transition-colors cursor-pointer"
            onClick={() => {/* 可以添加點擊事件 */}}
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-orange-500/30 border border-orange-400/50 flex items-center justify-center text-xs font-bold text-orange-300">
                {stat.rank}
              </div>
              <span className="text-white font-medium text-sm">{stat.name}</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-sm text-orange-300">{stat.count} 次</div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-gray-400">
          <div className="text-4xl mb-2">🌞</div>
          <div>無午班記錄</div>
        </div>
      )}
    </div>
  )
}

// 晚班統計組件
export const NightShiftStats = ({ schedule, names, employeeTags = {}, showAll = false, selectedMonth }) => {
  
  const calculateNightStats = () => {
    return measurePerformance('晚班統計計算', () => {
      const stats = []
      
      // 根據 selectedMonth 計算對應的年份、月份和天數
      let targetYear, targetMonth, daysInMonth
      
      if (!selectedMonth || selectedMonth === 'current') {
        // 使用當前月份
        const currentDate = new Date()
        targetYear = currentDate.getFullYear()
        targetMonth = currentDate.getMonth() + 1
      } else if (selectedMonth === 'next') {
        // 使用下個月
        const nextDate = new Date()
        nextDate.setMonth(nextDate.getMonth() + 1)
        targetYear = nextDate.getFullYear()
        targetMonth = nextDate.getMonth() + 1
      } else {
        // 解析選定的月份
        let monthKey = selectedMonth
        if (selectedMonth.includes('_')) {
          monthKey = selectedMonth.split('_')[0] // 移除店別後綴
        }
        const [year, month] = monthKey.split('-').map(Number)
        targetYear = year
        targetMonth = month
      }
      
      daysInMonth = new Date(targetYear, targetMonth, 0).getDate()
      
      // 只統計一般同事（排除支援同事和排除統計的同事）
      const filteredEmployeeIds = getFilteredEmployeeIds(schedule, employeeTags)
      
      filteredEmployeeIds.forEach(employeeId => {
        let count = 0
        
        for (let day = 1; day <= daysInMonth; day++) {
          const shift = schedule[employeeId]?.[day]
          if (shift === '晚') {
            count++
          }
        }
        
        // 包含所有員工，包括次數為0的
        stats.push({
          employeeId,
          name: names[employeeId] || employeeId,
          count
        })
      })
      
      // 按次數降序排序
      const sortedStats = stats.sort((a, b) => b.count - a.count)
      
      // 計算排名（相同次數的排名相同）
      let currentRank = 1
      let previousCount = null
      
      return sortedStats.map((stat, index) => {
        if (previousCount !== null && stat.count !== previousCount) {
          currentRank = index + 1
        }
        previousCount = stat.count
        
        return {
          ...stat,
          rank: currentRank
        }
      })
    }, { logThreshold: 5 })
  }
  
  const nightStats = calculateNightStats()
  const displayStats = showAll ? nightStats : nightStats.slice(0, 5)
  
  return (
    <div className="space-y-3">
      {nightStats.length > 0 ? (
        displayStats.map((stat) => (
          <div 
            key={stat.employeeId}
            className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10 hover:bg-surface/30 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/30 border border-blue-400/50 flex items-center justify-center text-xs font-bold text-blue-300">
                {stat.rank}
              </div>
              <span className="text-white font-medium text-sm">{stat.name}</span>
            </div>
            <div className="text-blue-300 font-bold text-sm">{stat.count} 次</div>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-gray-400">
          <div className="text-4xl mb-2">🌙</div>
          <div>本月無晚班記錄</div>
        </div>
      )}
    </div>
  )
}

// 連續上班統計組件
export const ConsecutiveWorkStats = ({ schedule, names, employeeTags = {}, showAll = false, selectedMonth }) => {
  
  const calculateConsecutiveStats = () => {
    return measurePerformance('連續上班統計計算', () => {
      const stats = []
      
      // 根據 selectedMonth 計算對應的年份、月份和天數
      let targetYear, targetMonth, daysInMonth
      
      if (!selectedMonth || selectedMonth === 'current') {
        // 使用當前月份
        const currentDate = new Date()
        targetYear = currentDate.getFullYear()
        targetMonth = currentDate.getMonth() + 1
      } else if (selectedMonth === 'next') {
        // 使用下個月
        const nextDate = new Date()
        nextDate.setMonth(nextDate.getMonth() + 1)
        targetYear = nextDate.getFullYear()
        targetMonth = nextDate.getMonth() + 1
      } else {
        // 解析選定的月份
        let monthKey = selectedMonth
        if (selectedMonth.includes('_')) {
          monthKey = selectedMonth.split('_')[0] // 移除店別後綴
        }
        const [year, month] = monthKey.split('-').map(Number)
        targetYear = year
        targetMonth = month
      }
      
      daysInMonth = new Date(targetYear, targetMonth, 0).getDate()
      
      // 只統計一般同事（排除支援同事和排除統計的同事）
      const filteredEmployeeIds = getFilteredEmployeeIds(schedule, employeeTags)
      
      filteredEmployeeIds.forEach(employeeId => {
        
        let consecutivePeriods = []
        let currentConsecutive = 0
        
        for (let day = 1; day <= daysInMonth; day++) {
          const shift = schedule[employeeId]?.[day]
          // 只有實際上班的班別才計算為連續上班：早、中、午、晚、D7、高鐵、中央店
          if (shift === '早' || shift === '中' || shift === '午' || shift === '晚' || shift === 'D7' || shift === '高鐵' || shift === '中央店') {
            currentConsecutive++
          } else {
            // 遇到休假、特休或其他非上班班別時，結束當前連續期
            if (currentConsecutive > 0) {
              consecutivePeriods.push(currentConsecutive)
              currentConsecutive = 0
            }
          }
        }
        
        // 處理最後一個連續期
        if (currentConsecutive > 0) {
          consecutivePeriods.push(currentConsecutive)
        }
        
        // 計算平均連續天數
        let avgConsecutive = 0
        if (consecutivePeriods.length > 0) {
          const totalConsecutive = consecutivePeriods.reduce((sum, period) => sum + period, 0)
          avgConsecutive = totalConsecutive / consecutivePeriods.length
        }
        
        // 包含所有員工，包括連續天數為0的
        stats.push({
          employeeId,
          name: names[employeeId] || employeeId,
          avgConsecutive: parseFloat(avgConsecutive.toFixed(1)),
          maxConsecutive: consecutivePeriods.length > 0 ? Math.max(...consecutivePeriods) : 0,
          consecutivePeriods: consecutivePeriods.length
        })
      })
      
      // 按平均連續天數降序排序
      const sortedStats = stats.sort((a, b) => b.avgConsecutive - a.avgConsecutive)
      
      // 計算排名（相同天數的排名相同）
      let currentRank = 1
      let previousCount = null
      
      return sortedStats.map((stat, index) => {
        if (previousCount !== null && stat.avgConsecutive !== previousCount) {
          currentRank = index + 1
        }
        previousCount = stat.avgConsecutive
        
        return {
          ...stat,
          rank: currentRank
        }
      })
    }, { logThreshold: 5 })
  }
  
  const consecutiveStats = calculateConsecutiveStats()
  const displayStats = showAll ? consecutiveStats : consecutiveStats.slice(0, 5)
  
  return (
    <div className="space-y-3">
      {consecutiveStats.length > 0 ? (
        displayStats.map((stat) => (
          <div 
            key={stat.employeeId}
            className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10 hover:bg-surface/30 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-orange-500/30 border border-orange-400/50 flex items-center justify-center text-xs font-bold text-orange-300">
                {stat.rank}
              </div>
              <span className="text-white font-medium text-sm">{stat.name}</span>
            </div>
            <div className="text-right">
              <div className="text-orange-300 font-bold text-sm">{stat.avgConsecutive} 天</div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-gray-400">
          <div className="text-4xl mb-2">⚡</div>
          <div>本月無連續上班記錄</div>
        </div>
      )}
    </div>
  )
}

// 熱愛進貨統計組件
export const StockLoverStats = ({ schedule, names, employeeTags = {}, showAll = false, selectedMonth }) => {
  const calculateStockLoverStats = () => {
    return measurePerformance('熱愛進貨統計計算', () => {
      const stats = []
      
      // 根據 selectedMonth 計算對應的年份、月份和天數
      let targetYear, targetMonth, daysInMonth
      
      if (!selectedMonth || selectedMonth === 'current') {
        // 使用當前月份
        const currentDate = new Date()
        targetYear = currentDate.getFullYear()
        targetMonth = currentDate.getMonth() + 1
      } else if (selectedMonth === 'next') {
        // 使用下個月
        const nextDate = new Date()
        nextDate.setMonth(nextDate.getMonth() + 1)
        targetYear = nextDate.getFullYear()
        targetMonth = nextDate.getMonth() + 1
      } else {
        // 解析選定的月份
        let monthKey = selectedMonth
        if (selectedMonth.includes('_')) {
          monthKey = selectedMonth.split('_')[0] // 移除店別後綴
        }
        const [year, month] = monthKey.split('-').map(Number)
        targetYear = year
        targetMonth = month
      }
      
      daysInMonth = new Date(targetYear, targetMonth, 0).getDate()
      
      // 只統計一般同事（排除支援同事和排除統計的同事）
      const filteredEmployeeIds = getFilteredEmployeeIds(schedule, employeeTags)
      
      // 初始化過濾後的員工
      filteredEmployeeIds.forEach(employeeId => {
        stats.push({
          employeeId,
          name: names[employeeId] || employeeId,
          count: 0
        })
      })
      
      // 判斷使用哪種進貨算法
      const isNewAlgorithm = () => {
        if (!selectedMonth) {
          // 如果沒有指定月份，使用當前月份判斷
          const currentDate = new Date()
          const currentYear = currentDate.getFullYear()
          const currentMonth = currentDate.getMonth() + 1
          return currentYear > 2025 || (currentYear === 2025 && currentMonth >= 10)
        }
        
        // 解析選定的月份
        let monthKey = selectedMonth
        if (selectedMonth.includes('_')) {
          monthKey = selectedMonth.split('_')[0] // 移除店別後綴
        }
        
        const [year, month] = monthKey.split('-').map(Number)
        return year > 2025 || (year === 2025 && month >= 10)
      }
      
      const useNewAlgorithm = isNewAlgorithm()
      
      if (useNewAlgorithm) {
        // 新算法：10月及之後，計算星期三的午班和晚班
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(targetYear, targetMonth - 1, day)
          const dayOfWeek = date.getDay() // 0=星期日, 3=星期三
          
          if (dayOfWeek === 3) { // 星期三
            filteredEmployeeIds.forEach(employeeId => {
              const shift = schedule[employeeId]?.[day]
              
              // 檢查是否為午班或晚班（10月及之後午班和晚班是進貨班）
              // 同時檢查轉換後的代碼和原始代碼，並處理可能的空格問題
              const trimmedShift = shift?.trim()
              if ((trimmedShift === '午' || 
                   trimmedShift === 'X' || trimmedShift === 'XX' ||
                   trimmedShift?.toUpperCase() === 'X' || trimmedShift?.toUpperCase() === 'XX') ||
                  (trimmedShift === '晚' || 
                   trimmedShift === 'Y' || trimmedShift === 'A' || trimmedShift === 'YY' || trimmedShift === '晚班' ||
                   trimmedShift === 'J' || trimmedShift === 'JJ' ||
                   trimmedShift?.toUpperCase() === 'Y' || trimmedShift?.toUpperCase() === 'A' || trimmedShift?.toUpperCase() === 'YY' ||
                   trimmedShift?.toUpperCase() === 'J' || trimmedShift?.toUpperCase() === 'JJ')) {
                const stat = stats.find(s => s.employeeId === employeeId)
                if (stat) stat.count++
              }
            })
          }
        }
      } else {
        // 舊算法：9月及之前，計算星期三的中班、晚班
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(targetYear, targetMonth - 1, day)
          const dayOfWeek = date.getDay() // 0=星期日, 3=星期三
          
          if (dayOfWeek === 3) { // 星期三
            filteredEmployeeIds.forEach(employeeId => {
              const shift = schedule[employeeId]?.[day]
              
              // 檢查是否為中班或晚班（9月及之前中班和晚班是進貨班）
              // 同時檢查轉換後的代碼和原始代碼，並處理可能的空格問題
              const trimmedShift = shift?.trim()
              
              
              if ((trimmedShift === '中' || 
                   trimmedShift === 'L' || trimmedShift === 'LL' || trimmedShift === '中班' ||
                   trimmedShift?.toUpperCase() === 'L' || trimmedShift?.toUpperCase() === 'LL') ||
                  (trimmedShift === '晚' || 
                   trimmedShift === 'Y' || trimmedShift === 'A' || trimmedShift === 'YY' || trimmedShift === '晚班' ||
                   trimmedShift === 'J' || trimmedShift === 'JJ' ||
                   trimmedShift?.toUpperCase() === 'Y' || trimmedShift?.toUpperCase() === 'A' || trimmedShift?.toUpperCase() === 'YY' ||
                   trimmedShift?.toUpperCase() === 'J' || trimmedShift?.toUpperCase() === 'JJ')) {
                const stat = stats.find(s => s.employeeId === employeeId)
                if (stat) {
                  stat.count++
                }
              }
            })
          }
        }
      }
      
      // 按次數降序排序
      const sortedStats = stats.sort((a, b) => b.count - a.count)
      
      // 計算排名（相同次數的排名相同）
      let currentRank = 1
      let previousCount = null
      
      return sortedStats.map((stat, index) => {
        if (previousCount !== null && stat.count !== previousCount) {
          currentRank = index + 1
        }
        previousCount = stat.count
        
        return {
          ...stat,
          rank: currentRank
        }
      })
    }, { logThreshold: 5 })
  }
  
  const stockLoverStats = calculateStockLoverStats()
  const displayStats = showAll ? stockLoverStats : stockLoverStats.slice(0, 5)
  
  return (
    <div className="space-y-3">
      {stockLoverStats.length > 0 ? (
        displayStats.map((stat) => (
          <div 
            key={stat.employeeId}
            className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10 hover:bg-surface/30 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center text-xs font-bold text-emerald-300">
                {stat.rank}
              </div>
              <span className="text-white font-medium text-sm">{stat.name}</span>
            </div>
            <div className="text-emerald-300 font-bold text-sm">{stat.count} 次</div>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-gray-400">
          <div className="text-4xl mb-2">📦</div>
          <div>本月無進貨記錄</div>
        </div>
      )}
    </div>
  )
}

// 主要統計組件
export default function ScheduleStatistics({ schedule, names, employeeTags = {}, loadingStates, selectedEmployee, allSchedules, selectedMonth }) {
  const finishRender = useRenderPerformance('ScheduleStatistics')
  const [showAllStats, setShowAllStats] = React.useState(false)
  
  // 直接使用組件，不依賴 useStatistics hook
  React.useEffect(() => {
    finishRender()
  })

  // 判斷是否為2025年10月及之後
  const isNewAlgorithm = () => {
    if (!selectedMonth || selectedMonth === 'current') {
      // 使用當前月份
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1
      return currentYear > 2025 || (currentYear === 2025 && currentMonth >= 10)
    } else if (selectedMonth === 'next') {
      // 使用下個月
      const nextDate = new Date()
      nextDate.setMonth(nextDate.getMonth() + 1)
      const nextYear = nextDate.getFullYear()
      const nextMonth = nextDate.getMonth() + 1
      return nextYear > 2025 || (nextYear === 2025 && nextMonth >= 10)
    } else {
      // 解析選定的月份
      let monthKey = selectedMonth
      if (selectedMonth.includes('_')) {
        monthKey = selectedMonth.split('_')[0] // 移除店別後綴
      }
      const [year, month] = monthKey.split('-').map(Number)
      return year > 2025 || (year === 2025 && month >= 10)
    }
  }

  const useNewAlgorithm = isNewAlgorithm()

  return (
    <div className="space-y-6">
      {/* 統計卡片網格 */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${useNewAlgorithm ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        {/* 早班/早中班統計 */}
        <StatCard 
          title={useNewAlgorithm ? "早中班統計" : "早班統計"} 
          icon={STATS_THEMES.early.icon} 
          themeColor="early" 
          isLoading={loadingStates.statistics}
        >
          <EarlyShiftStats schedule={schedule} names={names} employeeTags={employeeTags} showAll={showAllStats} selectedMonth={selectedMonth} />
        </StatCard>
        
        {/* 午班統計 - 只在2025年10月及之後顯示 */}
        {useNewAlgorithm && (
          <StatCard 
            title={STATS_THEMES.afternoon.title} 
            icon={STATS_THEMES.afternoon.icon} 
            themeColor="afternoon" 
            isLoading={loadingStates.statistics}
          >
            <AfternoonShiftStats schedule={schedule} names={names} employeeTags={employeeTags} showAll={showAllStats} selectedMonth={selectedMonth} />
          </StatCard>
        )}
        
        <StatCard title={STATS_THEMES.night.title} icon={STATS_THEMES.night.icon} themeColor="night" isLoading={loadingStates.statistics}>
          <NightShiftStats schedule={schedule} names={names} employeeTags={employeeTags} showAll={showAllStats} selectedMonth={selectedMonth} />
        </StatCard>
        <StatCard title={STATS_THEMES.consecutive.title} icon={STATS_THEMES.consecutive.icon} themeColor="consecutive" isLoading={loadingStates.statistics}>
          <ConsecutiveWorkStats schedule={schedule} names={names} employeeTags={employeeTags} showAll={showAllStats} selectedMonth={selectedMonth} />
        </StatCard>
        <StatCard title={STATS_THEMES.stockLover.title} icon={STATS_THEMES.stockLover.icon} themeColor="stockLover" isLoading={loadingStates.statistics}>
          <StockLoverStats schedule={schedule} names={names} employeeTags={employeeTags} showAll={showAllStats} selectedMonth={selectedMonth} />
        </StatCard>
      </div>
      
      {/* 統一的查看全部按鈕 */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowAllStats(!showAllStats)}
          className="px-8 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-400/30 text-blue-300 rounded-xl transition-all duration-200 text-sm font-medium shadow-lg backdrop-blur-sm"
        >
          {showAllStats ? '收起所有排名' : '查看全部排名'}
        </button>
      </div>
    </div>
  )
}
