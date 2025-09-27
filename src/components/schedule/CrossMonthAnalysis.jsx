import React, { useMemo, useCallback } from 'react'
import { measurePerformance, useRenderPerformance } from '../../utils/performance'
import { LoadingOverlay, StatisticsSkeleton } from '../LoadingSpinner'
import ScheduleStatistics from './ScheduleStatistics'
import ScheduleCharts from './ScheduleCharts'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

// 過濾統計分析中的同事（排除支援同事和標記為排除統計的同事）
const getFilteredEmployeeIds = (schedule, employeeTags = {}) => {
  return Object.keys(schedule).filter(employeeId => {
    if (employeeId === '_lastUpdated') return false
    
    const employeeTag = employeeTags[employeeId]
    // 只統計一般同事，排除支援同事和排除統計的同事
    return employeeTag === 'regular' || employeeTag === undefined
  })
}

// 快取機制
const statsCache = new Map()
const CACHE_EXPIRY = 5 * 60 * 1000 // 5分鐘快取過期

// 生成快取鍵
const generateCacheKey = (allSchedules, names, employeeTags = {}, availableMonths) => {
  const scheduleKeys = Object.keys(allSchedules || {}).sort().join(',')
  const nameKeys = Object.keys(names || {}).sort().join(',')
  const tagKeys = Object.keys(employeeTags || {}).sort().map(id => `${id}:${employeeTags[id]}`).join(',')
  const monthKeys = (availableMonths || []).map(m => m.key).sort().join(',')
  return `${scheduleKeys}|${nameKeys}|${tagKeys}|${monthKeys}`
}

// 檢查快取是否有效
const isCacheValid = (timestamp) => {
  return Date.now() - timestamp < CACHE_EXPIRY
}

// 統計分析工具函數
const calculateTrend = (values) => {
  if (values.length < 2) return 'stable'
  const first = values[0]
  const last = values[values.length - 1]
  const change = ((last - first) / first) * 100
  
  if (change > 5) return 'rising'
  if (change < -5) return 'falling'
  return 'stable'
}

const calculateStandardDeviation = (values) => {
  if (values.length < 2) return 0
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  return Math.sqrt(variance).toFixed(1)
}

const calculatePercentile = (value, allValues) => {
  const sorted = [...allValues].sort((a, b) => a - b)
  const index = sorted.findIndex(v => v >= value)
  return Math.round(((sorted.length - index) / sorted.length) * 100)
}

const getTrendIcon = (trend) => {
  switch (trend) {
    case 'rising': return '📈'
    case 'falling': return '📉'
    default: return '➡️'
  }
}

const getTrendColor = (trend) => {
  switch (trend) {
    case 'rising': return 'text-green-400'
    case 'falling': return 'text-red-400'
    default: return 'text-gray-400'
  }
}

const getValueColor = (value, maxValue) => {
  const ratio = value / maxValue
  if (ratio >= 0.8) return 'text-green-400'
  if (ratio >= 0.6) return 'text-yellow-400'
  if (ratio >= 0.4) return 'text-orange-400'
  return 'text-red-400'
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
    title: '早中班平均',
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
    title: '午班平均',
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
    title: '晚班平均',
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
    title: '連續上班平均',
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
    title: '進貨平均',
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

// 檢測員工最早入職月份
const getEmployeeHireMonth = (employeeId, allSchedules, availableMonths) => {
  if (!availableMonths || availableMonths.length === 0) return null
  
  const sortedMonths = availableMonths
    .map(month => {
      const [year, monthNum] = month.key.split('-')
      return {
        key: month.key,
        year: parseInt(year),
        month: parseInt(monthNum),
        sortKey: month.key
      }
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  for (const monthInfo of sortedMonths) {
    const schedule = allSchedules[monthInfo.key]
    
    if (schedule && schedule[employeeId]) {
      // 排除系統欄位
      if (employeeId === '_lastUpdated') continue
      
      // 檢查該月份是否有實際的班表資料（非空）
      const hasData = Object.values(schedule[employeeId]).some(shift => shift && shift !== '')
      if (hasData) {
        return monthInfo
      }
    }
  }
  return null
}

// 計算跨月連續上班（真正的跨月連續上班天數）
const calculateCrossMonthConsecutive = (employeeId, allSchedules, availableMonths) => {
  const crossMonthPeriods = []
  
  // 按時間順序排序月份（從最早到最晚）
  const sortedMonths = [...availableMonths].sort((a, b) => a.key.localeCompare(b.key))
  
  // 建立一個包含所有月份所有日期的時間線
  const allDays = []
  for (const monthInfo of sortedMonths) {
    const schedule = allSchedules[monthInfo.key]
    if (!schedule || !schedule[employeeId]) continue
    
    const [year, monthNum] = monthInfo.key.split('-')
    const daysInMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 0).getDate()
    
    for (let day = 1; day <= daysInMonth; day++) {
      const shift = schedule[employeeId][day]
      allDays.push({
        year: parseInt(year),
        month: parseInt(monthNum),
        day: day,
        shift: shift
      })
    }
  }
  
  // 找到所有跨月連續上班期
  let currentConsecutive = 0
  let isCrossMonthPeriod = false
  
  for (let i = 0; i < allDays.length; i++) {
    const currentDay = allDays[i]
    const nextDay = allDays[i + 1]
    
    // 只有早、中、午、晚、D7、高鐵、中央店班才算連續上班
    const isCurrentDayWorking = currentDay.shift === '早' || currentDay.shift === '中' || currentDay.shift === '午' || currentDay.shift === '晚' || currentDay.shift === 'D7' || currentDay.shift === '高鐵' || currentDay.shift === '中央店'
    
    if (isCurrentDayWorking) {
      currentConsecutive++
      
      // 檢查是否跨月
      if (nextDay && 
          (nextDay.month !== currentDay.month || nextDay.year !== currentDay.year)) {
        // 如果下一天是不同月份，檢查下一天是否也上班
        const isNextDayWorking = nextDay.shift === '早' || nextDay.shift === '中' || nextDay.shift === '午' || nextDay.shift === '晚' || nextDay.shift === 'D7' || nextDay.shift === '高鐵' || nextDay.shift === '中央店'
        if (isNextDayWorking) {
          isCrossMonthPeriod = true
        }
      }
    } else {
      // 遇到休假、特休或其他非上班班別時，結束當前連續期
      if (currentConsecutive > 0 && isCrossMonthPeriod) {
        crossMonthPeriods.push(currentConsecutive)
      }
      currentConsecutive = 0
      isCrossMonthPeriod = false
    }
  }
  
  // 處理最後一個連續期
  if (currentConsecutive > 0 && isCrossMonthPeriod) {
    crossMonthPeriods.push(currentConsecutive)
  }
  
  // 計算平均跨月連續天數
  let avgConsecutive = 0
  if (crossMonthPeriods.length > 0) {
    const totalConsecutive = crossMonthPeriods.reduce((sum, period) => sum + period, 0)
    avgConsecutive = totalConsecutive / crossMonthPeriods.length
  }
  
  return {
    avgConsecutive: parseFloat(avgConsecutive.toFixed(1)),
    maxConsecutive: crossMonthPeriods.length > 0 ? Math.max(...crossMonthPeriods) : 0,
    consecutivePeriods: crossMonthPeriods.length
  }
}

// 計算跨月統計資料（優化版）
const calculateCrossMonthStats = (allSchedules, names, employeeTags = {}, availableMonths) => {
  // 檢查快取
  const cacheKey = generateCacheKey(allSchedules, names, employeeTags, availableMonths)
  const cached = statsCache.get(cacheKey)
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data
  }

  return measurePerformance('跨月統計計算', () => {
    const employeeStats = {}
    
    // 獲取所有一般同事（從所有班表中收集）
    const allRegularEmployees = new Set()
    
    // 遍歷所有月份的班表，收集所有一般同事
    availableMonths.forEach(monthInfo => {
      const schedule = allSchedules[monthInfo.key]
      if (schedule) {
        // 使用統一的過濾函數來獲取一般同事
        const filteredEmployeeIds = getFilteredEmployeeIds(schedule, employeeTags)
        filteredEmployeeIds.forEach(employeeId => {
          allRegularEmployees.add(employeeId)
        })
      }
    })
    
    // 初始化所有一般同事的統計資料
    Array.from(allRegularEmployees).forEach(employeeId => {
      const hireMonth = getEmployeeHireMonth(employeeId, allSchedules, availableMonths)
      
      if (hireMonth) {
        // 計算跨月連續上班
        const crossMonthConsecutive = calculateCrossMonthConsecutive(employeeId, allSchedules, availableMonths)
        
        employeeStats[employeeId] = {
          employeeId: employeeId,
          name: names[employeeId] || employeeId,
          hireMonth: hireMonth,
          months: 0,
          totalEarly: 0,
          totalAfternoon: 0,  // 午班統計總計
          totalNight: 0,
          totalConsecutive: 0,
          totalStock: 0,
          // 跨月連續上班資料（只有多個月資料時才有意義）
          crossMonthAvgConsecutive: 0,
          crossMonthMaxConsecutive: 0,
          crossMonthPeriods: 0
        }
      }
    })

    // 計算每個月的統計資料
    availableMonths.forEach(monthInfo => {
      const schedule = allSchedules[monthInfo.key]
      if (!schedule) return

      Object.keys(employeeStats).forEach(employeeId => {
        const employeeData = schedule[employeeId]
        if (!employeeData) return

        const hireMonth = employeeStats[employeeId].hireMonth
        // 只計算入職後的月份
        if (monthInfo.key >= hireMonth.sortKey) {
          // 建立月份資訊物件
          const [year, monthNum] = monthInfo.key.split('-')
          const monthData = {
            key: monthInfo.key,
            year: parseInt(year),
            month: parseInt(monthNum)
          }
          
          const monthlyStat = calculateMonthlyStats(employeeData, monthData)
          // 只累加總計，不儲存詳細資料
          employeeStats[employeeId].months++
          employeeStats[employeeId].totalEarly += monthlyStat.early
          employeeStats[employeeId].totalAfternoon += monthlyStat.afternoon  // 午班統計
          employeeStats[employeeId].totalNight += monthlyStat.night
          employeeStats[employeeId].totalConsecutive += monthlyStat.avgConsecutive
          employeeStats[employeeId].totalStock += monthlyStat.stock
        }
      })
    })

    // 計算平均值和跨月連續上班（只有多個月資料時才計算跨月連續）
    Object.keys(employeeStats).forEach(employeeId => {
      const stats = employeeStats[employeeId]
      if (stats.months > 0) {
        stats.avgEarly = (stats.totalEarly / stats.months).toFixed(1)
        stats.avgAfternoon = (stats.totalAfternoon / stats.months).toFixed(1)  // 午班平均值
        stats.avgNight = (stats.totalNight / stats.months).toFixed(1)
        stats.avgConsecutive = (stats.totalConsecutive / stats.months).toFixed(1)
        stats.avgStock = (stats.totalStock / stats.months).toFixed(1)
        
        // 只有當員工有多個月的資料時，才計算跨月連續上班
        if (stats.months > 1) {
          const crossMonthConsecutive = calculateCrossMonthConsecutive(employeeId, allSchedules, availableMonths)
          stats.crossMonthAvgConsecutive = crossMonthConsecutive.avgConsecutive
          stats.crossMonthMaxConsecutive = crossMonthConsecutive.maxConsecutive
          stats.crossMonthPeriods = crossMonthConsecutive.consecutivePeriods
        }
      }
    })

    // 儲存到快取
    statsCache.set(cacheKey, {
      data: employeeStats,
      timestamp: Date.now()
    })

    return employeeStats
  })
}

// 按需計算員工的月份詳細資料（分批處理版本）
const calculateEmployeeMonthlyDetails = (employeeId, allSchedules, availableMonths, names, employeeTags = {}) => {
  const hireMonth = getEmployeeHireMonth(employeeId, allSchedules, availableMonths)
  if (!hireMonth) return []

  // 排除系統欄位
  if (employeeId === '_lastUpdated') return []

  // 只統計一般同事（排除支援同事和排除統計的同事）
  const employeeTag = employeeTags[employeeId]
  if (employeeTag !== 'regular' && employeeTag !== undefined) return []

  const monthlyDetails = []
  
  // 篩選出需要計算的月份，並按時間倒序排序（最新的在上面）
  const relevantMonths = availableMonths
    .filter(monthInfo => monthInfo.key >= hireMonth.sortKey)
    .sort((a, b) => b.key.localeCompare(a.key))

  // 分批處理，每批處理 3 個月，避免阻塞 UI
  const BATCH_SIZE = 3
  for (let i = 0; i < relevantMonths.length; i += BATCH_SIZE) {
    const batch = relevantMonths.slice(i, i + BATCH_SIZE)
    
    batch.forEach(monthInfo => {
      const schedule = allSchedules[monthInfo.key]
      if (!schedule || !schedule[employeeId]) return

      const [year, monthNum] = monthInfo.key.split('-')
      const monthData = {
        key: monthInfo.key,
        year: parseInt(year),
        month: parseInt(monthNum)
      }
      
      const monthlyStat = calculateMonthlyStats(schedule[employeeId], monthData)
      monthlyDetails.push({
        ...monthlyStat,
        year: monthData.year,
        month: monthData.month
      })
    })
  }

  return monthlyDetails
}

// 計算單月統計資料
const calculateMonthlyStats = (schedule, monthInfo) => {
  const daysInMonth = new Date(monthInfo.year, monthInfo.month - 1, 0).getDate()
  let early = 0
  let afternoon = 0  // 午班統計
  let night = 0
  let consecutivePeriods = []
  let currentConsecutive = 0
  let stock = 0

  // 判斷使用哪種進貨算法（10月及之後使用新算法）
  const useNewStockAlgorithm = monthInfo.year > 2025 || (monthInfo.year === 2025 && monthInfo.month >= 10)
  
  // 判斷使用哪種早中班統計算法（10月及之後早中班合併統計）
  const useNewEarlyMiddleAlgorithm = monthInfo.year > 2025 || (monthInfo.year === 2025 && monthInfo.month >= 10)

  for (let day = 1; day <= daysInMonth; day++) {
    const shift = schedule[day]
    if (shift) {
      // 早中班統計：根據月份使用不同邏輯
      if (useNewEarlyMiddleAlgorithm) {
        // 2025年10月及之後：早班 + 中班
        if (shift === '早' || shift === '中') {
          early++
        }
      } else {
        // 2025年9月及之前：只有早班
        if (shift === '早') {
          early++
        }
      }
      
      // 午班統計：根據月份使用不同邏輯
      if (useNewEarlyMiddleAlgorithm) {
        // 2025年10月及之後：午班統計
        if (shift === '午') {
          afternoon++
        }
      } else {
        // 2025年9月及之前：中班統計（顯示為午班平均）
        if (shift === '中') {
          afternoon++
        }
      }
      if (shift === '晚') night++
      
      // 進貨統計：根據月份使用不同算法
      const trimmedShift = shift?.trim()
      if (useNewStockAlgorithm) {
        // 新算法：10月及之後，計算星期三的午班和晚班
        // 同時檢查轉換後的代碼和原始代碼，並處理可能的空格問題
        if ((trimmedShift === '午' || 
             trimmedShift === 'X' || trimmedShift === 'XX' ||
             trimmedShift?.toUpperCase() === 'X' || trimmedShift?.toUpperCase() === 'XX') ||
            (trimmedShift === '晚' || 
             trimmedShift === 'Y' || trimmedShift === 'A' || trimmedShift === 'YY' || trimmedShift === '晚班' ||
             trimmedShift === 'J' || trimmedShift === 'JJ' ||
             trimmedShift?.toUpperCase() === 'Y' || trimmedShift?.toUpperCase() === 'A' || trimmedShift?.toUpperCase() === 'YY' ||
             trimmedShift?.toUpperCase() === 'J' || trimmedShift?.toUpperCase() === 'JJ')) {
          const date = new Date(monthInfo.year, monthInfo.month - 1, day)
          if (date.getDay() === 3) { // 星期三
            stock++
          }
        }
      } else {
        // 舊算法：9月及之前，計算星期三的中班和晚班
        // 同時檢查轉換後的代碼和原始代碼，並處理可能的空格問題
        if ((trimmedShift === '中' || 
             trimmedShift === 'L' || trimmedShift === 'LL' || trimmedShift === '中班' ||
             trimmedShift?.toUpperCase() === 'L' || trimmedShift?.toUpperCase() === 'LL') ||
            (trimmedShift === '晚' || 
             trimmedShift === 'Y' || trimmedShift === 'A' || trimmedShift === 'YY' || trimmedShift === '晚班' ||
             trimmedShift === 'J' || trimmedShift === 'JJ' ||
             trimmedShift?.toUpperCase() === 'Y' || trimmedShift?.toUpperCase() === 'A' || trimmedShift?.toUpperCase() === 'YY' ||
             trimmedShift?.toUpperCase() === 'J' || trimmedShift?.toUpperCase() === 'JJ')) {
          const date = new Date(monthInfo.year, monthInfo.month - 1, day)
          if (date.getDay() === 3) { // 星期三
            stock++
          }
        }
      }
      
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

  return { 
    early, 
    afternoon,  // 午班統計
    night, 
    avgConsecutive: parseFloat(avgConsecutive.toFixed(1)),
    maxConsecutive: consecutivePeriods.length > 0 ? Math.max(...consecutivePeriods) : 0,
    consecutivePeriods: consecutivePeriods.length,
    stock 
  }
}

// 早中班平均統計組件
export const EarlyShiftAvgStats = ({ employeeStats, showAll = false, onEmployeeClick }) => {
  const calculateEarlyAvgStats = () => {
    const allStats = Object.values(employeeStats)
      .map(stat => ({
        employeeId: stat.employeeId,
        name: stat.name,
        avgEarly: parseFloat(stat.avgEarly) || 0,
        months: stat.months
      }))
      .filter(stat => stat.months > 0)
    
    const allValues = allStats.map(stat => stat.avgEarly)
    const maxValue = Math.max(...allValues)
    
    return allStats
      .sort((a, b) => b.avgEarly - a.avgEarly)
      .map((stat, index) => ({
        ...stat,
        rank: index + 1,
        percentile: calculatePercentile(stat.avgEarly, allValues),
        colorClass: getValueColor(stat.avgEarly, maxValue)
      }))
  }

  const earlyStats = calculateEarlyAvgStats()
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
              <span 
                className="text-white font-medium text-sm cursor-pointer hover:text-pink-200 transition-colors"
                onClick={() => onEmployeeClick && onEmployeeClick(stat)}
              >
                {stat.name}
              </span>
            </div>
            <div className="text-right">
              <div className={`font-bold text-sm ${stat.colorClass}`}>{stat.avgEarly} 次/月</div>
              <div className="text-gray-400 text-xs">
                ({stat.months}個月)
              </div>
            </div>
          </div>
        ))
      ) : (
                <div className="text-center py-6 text-gray-400">
                  <div className="text-4xl mb-2">🌅</div>
                  <div>無跨月早中班記錄</div>
                </div>
      )}
    </div>
  )
}

// 晚班平均統計組件
// 午班平均統計組件
export const AfternoonShiftAvgStats = ({ employeeStats, showAll = false, onEmployeeClick }) => {
  const calculateAfternoonAvgStats = () => {
    const allStats = Object.values(employeeStats)
      .map(stat => ({
        employeeId: stat.employeeId,
        name: stat.name,
        avgAfternoon: parseFloat(stat.avgAfternoon) || 0,
        months: stat.months
      }))
      .filter(stat => stat.months > 0)
    
    const allValues = allStats.map(stat => stat.avgAfternoon)
    const maxValue = Math.max(...allValues)
    
    return allStats
      .sort((a, b) => b.avgAfternoon - a.avgAfternoon)
      .map((stat, index) => ({
        ...stat,
        rank: index + 1,
        percentile: calculatePercentile(stat.avgAfternoon, allValues),
        colorClass: getValueColor(stat.avgAfternoon, maxValue)
      }))
  }

  const afternoonStats = calculateAfternoonAvgStats()
  const displayStats = showAll ? afternoonStats : afternoonStats.slice(0, 5)

  return (
    <div className="space-y-3">
      {afternoonStats.length > 0 ? (
        displayStats.map((stat) => (
          <div 
            key={stat.employeeId}
            className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10 hover:bg-surface/30 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-orange-500/30 border border-orange-400/50 flex items-center justify-center text-xs font-bold text-orange-300">
                {stat.rank}
              </div>
              <span 
                className="text-white font-medium cursor-pointer hover:text-orange-300 transition-colors"
                onClick={() => onEmployeeClick(stat.employeeId)}
              >
                {stat.name}
              </span>
            </div>
            <div className="text-right">
              <div className={`font-bold text-sm ${stat.colorClass}`}>{stat.avgAfternoon} 次/月</div>
              <div className="text-xs text-gray-400">{stat.months} 個月</div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center text-gray-400 py-8">
          <div className="text-4xl mb-2">📊</div>
          <div>暫無午班統計數據</div>
        </div>
      )}
    </div>
  )
}

export const NightShiftAvgStats = ({ employeeStats, showAll = false, onEmployeeClick }) => {
  const calculateNightAvgStats = () => {
    const allStats = Object.values(employeeStats)
      .map(stat => ({
        employeeId: stat.employeeId,
        name: stat.name,
        avgNight: parseFloat(stat.avgNight) || 0,
        months: stat.months
      }))
      .filter(stat => stat.months > 0)
    
    const allValues = allStats.map(stat => stat.avgNight)
    const maxValue = Math.max(...allValues)
    
    return allStats
      .sort((a, b) => b.avgNight - a.avgNight)
      .map((stat, index) => ({
        ...stat,
        rank: index + 1,
        percentile: calculatePercentile(stat.avgNight, allValues),
        colorClass: getValueColor(stat.avgNight, maxValue)
      }))
  }

  const nightStats = calculateNightAvgStats()
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
              <span 
                className="text-white font-medium text-sm cursor-pointer hover:text-blue-200 transition-colors"
                onClick={() => onEmployeeClick && onEmployeeClick(stat)}
              >
                {stat.name}
              </span>
            </div>
            <div className="text-right">
              <div className={`font-bold text-sm ${stat.colorClass}`}>{stat.avgNight} 次/月</div>
              <div className="text-gray-400 text-xs">
                ({stat.months}個月)
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-gray-400">
          <div className="text-4xl mb-2">🌙</div>
          <div>無跨月晚班記錄</div>
        </div>
      )}
    </div>
  )
}

// 連續上班平均統計組件
export const ConsecutiveWorkAvgStats = ({ employeeStats, showAll = false, onEmployeeClick }) => {
  const calculateConsecutiveAvgStats = () => {
    const allStats = Object.values(employeeStats)
      .map(stat => ({
        employeeId: stat.employeeId,
        name: stat.name,
        avgConsecutive: parseFloat(stat.avgConsecutive) || 0,
        crossMonthAvgConsecutive: parseFloat(stat.crossMonthAvgConsecutive) || 0,
        months: stat.months
      }))
      .filter(stat => stat.months > 0)
    
    const allValues = allStats.map(stat => stat.avgConsecutive)
    const maxValue = Math.max(...allValues)
    
    return allStats
      .sort((a, b) => b.avgConsecutive - a.avgConsecutive)
      .map((stat, index) => ({
        ...stat,
        rank: index + 1,
        percentile: calculatePercentile(stat.avgConsecutive, allValues),
        colorClass: getValueColor(stat.avgConsecutive, maxValue)
      }))
  }

  const consecutiveStats = calculateConsecutiveAvgStats()
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
              <span 
                className="text-white font-medium text-sm cursor-pointer hover:text-orange-200 transition-colors"
                onClick={() => onEmployeeClick && onEmployeeClick(stat)}
              >
                {stat.name}
              </span>
            </div>
            <div className="text-right">
              <div className={`font-bold text-sm ${stat.colorClass}`}>{stat.avgConsecutive} 天/月</div>
              <div className="text-gray-500 text-xs">
                ({stat.months}個月)
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-gray-400">
          <div className="text-4xl mb-2">⚡</div>
          <div>無跨月連續上班記錄</div>
        </div>
      )}
    </div>
  )
}

// 進貨平均統計組件
export const StockLoverAvgStats = ({ employeeStats, showAll = false, onEmployeeClick }) => {
  const calculateStockAvgStats = () => {
    const allStats = Object.values(employeeStats)
      .map(stat => ({
        employeeId: stat.employeeId,
        name: stat.name,
        avgStock: parseFloat(stat.avgStock) || 0,
        months: stat.months
      }))
      .filter(stat => stat.months > 0)
    
    const allValues = allStats.map(stat => stat.avgStock)
    const maxValue = Math.max(...allValues)
    
    return allStats
      .sort((a, b) => b.avgStock - a.avgStock)
      .map((stat, index) => ({
        ...stat,
        rank: index + 1,
        percentile: calculatePercentile(stat.avgStock, allValues),
        colorClass: getValueColor(stat.avgStock, maxValue)
      }))
  }

  const stockStats = calculateStockAvgStats()
  const displayStats = showAll ? stockStats : stockStats.slice(0, 5)

  return (
    <div className="space-y-3">
      {stockStats.length > 0 ? (
        displayStats.map((stat) => (
          <div 
            key={stat.employeeId}
            className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10 hover:bg-surface/30 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center text-xs font-bold text-emerald-300">
                {stat.rank}
              </div>
              <span 
                className="text-white font-medium text-sm cursor-pointer hover:text-emerald-200 transition-colors"
                onClick={() => onEmployeeClick && onEmployeeClick(stat)}
              >
                {stat.name}
              </span>
            </div>
            <div className="text-right">
              <div className={`font-bold text-sm ${stat.colorClass}`}>{stat.avgStock} 次/月</div>
              <div className="text-gray-400 text-xs">
                ({stat.months}個月)
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-gray-400">
          <div className="text-4xl mb-2">📦</div>
          <div>無跨月進貨記錄</div>
        </div>
      )}
    </div>
  )
}

// 員工詳細資料彈窗組件
const EmployeeDetailModal = ({ employee, onClose, allSchedules, availableMonths, names, employeeTags = {} }) => {
  const [monthlyDetails, setMonthlyDetails] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(false)

  // 按需載入月份詳細資料
  React.useEffect(() => {
    if (employee) {
      setIsLoading(true)
      // 使用 setTimeout 避免阻塞 UI
      setTimeout(() => {
        const details = calculateEmployeeMonthlyDetails(
          employee.employeeId, 
          allSchedules, 
          availableMonths, 
          names,
          employeeTags
        )
        setMonthlyDetails(details)
        setIsLoading(false)
      }, 0)
    }
  }, [employee, allSchedules, availableMonths, names, employeeTags])

  // 計算趨勢分析
  const getTrendAnalysis = () => {
    if (monthlyDetails.length < 2) return null
    
    const earlyValues = monthlyDetails.map(d => d.early)
    const nightValues = monthlyDetails.map(d => d.night)
    const consecutiveValues = monthlyDetails.map(d => d.avgConsecutive)
    const stockValues = monthlyDetails.map(d => d.stock)
    
    return {
      early: {
        trend: calculateTrend(earlyValues),
        stdDev: calculateStandardDeviation(earlyValues)
      },
      night: {
        trend: calculateTrend(nightValues),
        stdDev: calculateStandardDeviation(nightValues)
      },
      consecutive: {
        trend: calculateTrend(consecutiveValues),
        stdDev: calculateStandardDeviation(consecutiveValues)
      },
      stock: {
        trend: calculateTrend(stockValues),
        stdDev: calculateStandardDeviation(stockValues)
      }
    }
  }

  const trendAnalysis = getTrendAnalysis()

  if (!employee) return null

  const getShiftDisplayName = (shift) => {
    const shiftNames = {
      '早': '早班',
      '中': '中班', 
      '晚': '晚班',
      '休': '休假',
      '特': '特休'
    }
    return shiftNames[shift] || shift
  }

  const getMonthDisplayName = (monthInfo) => {
    return `${monthInfo.year}年${monthInfo.month}月`
  }

  // 處理點擊外部區域關閉
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-gradient-to-br from-surface/90 to-surface/70 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 shadow-xl backdrop-blur-sm max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{employee.name} 的跨月統計詳情</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 員工基本資訊 */}
        <div className="mb-6 p-4 bg-surface/40 rounded-lg border border-white/10">
          <div className="text-center text-sm">
            <span className="text-gray-400">統計期間：</span>
            <span className="text-white">{employee.months}個月</span>
          </div>
        </div>

        {/* 月份詳細資料 */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-cyan-300">各月份詳細資料</h4>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-300 mx-auto"></div>
              <div className="text-gray-400 mt-2">載入中...</div>
            </div>
          ) : (
            monthlyDetails.map((monthStat, index) => {
              return (
                <div key={index} className="bg-surface/30 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-white">
                      {monthStat.year}年{monthStat.month}月
                    </h5>
                    <span className="text-xs text-gray-400">
                      第 {index + 1} 個月
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">早中班次數</span>
                          <span className="text-pink-300 font-bold">{monthStat.early}</span>
                        </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-pink-400 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min((monthStat.early / 20) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">午班次數</span>
                        <span className="text-orange-300 font-bold">{monthStat.afternoon}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-orange-400 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min((monthStat.afternoon / 20) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">晚班次數</span>
                        <span className="text-blue-300 font-bold">{monthStat.night}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-400 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min((monthStat.night / 20) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">連續上班天數</span>
                        <span className="text-orange-300 font-bold">{monthStat.avgConsecutive}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-orange-400 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min((monthStat.avgConsecutive / 10) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">進貨次數</span>
                        <span className="text-emerald-300 font-bold">{monthStat.stock}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-emerald-400 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min((monthStat.stock / 10) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 平均值摘要與趨勢分析 */}
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-400/30">
            <h4 className="text-lg font-semibold text-purple-300 mb-3">平均值摘要</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-sm">
                <div className="text-center">
                  <div className="text-pink-300 font-bold text-lg">{employee.avgEarly} 次/月</div>
                  <div className="text-gray-400">早中班平均</div>
                  {trendAnalysis && (
                    <div className={`text-xs mt-1 ${getTrendColor(trendAnalysis.early.trend)}`}>
                      {getTrendIcon(trendAnalysis.early.trend)} 標準差: {trendAnalysis.early.stdDev}
                    </div>
                  )}
                </div>
              <div className="text-center">
                <div className="text-blue-300 font-bold text-lg">{employee.avgNight} 次/月</div>
                <div className="text-gray-400">晚班平均</div>
                {trendAnalysis && (
                  <div className={`text-xs mt-1 ${getTrendColor(trendAnalysis.night.trend)}`}>
                    {getTrendIcon(trendAnalysis.night.trend)} 標準差: {trendAnalysis.night.stdDev}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-orange-300 font-bold text-lg">{employee.avgConsecutive} 天/月</div>
                <div className="text-gray-400">連續上班平均</div>
                {trendAnalysis && (
                  <div className={`text-xs mt-1 ${getTrendColor(trendAnalysis.consecutive.trend)}`}>
                    {getTrendIcon(trendAnalysis.consecutive.trend)} 標準差: {trendAnalysis.consecutive.stdDev}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-emerald-300 font-bold text-lg">{employee.avgStock} 次/月</div>
                <div className="text-gray-400">進貨平均</div>
                {trendAnalysis && (
                  <div className={`text-xs mt-1 ${getTrendColor(trendAnalysis.stock.trend)}`}>
                    {getTrendIcon(trendAnalysis.stock.trend)} 標準差: {trendAnalysis.stock.stdDev}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 趨勢圖表 */}
          {monthlyDetails.length > 1 && (
            <div className="p-3 sm:p-4 bg-surface/40 rounded-lg border border-white/10">
              <h4 className="text-base sm:text-lg font-semibold text-cyan-300 mb-3 sm:mb-4">月度趨勢圖</h4>
              <div className="h-64 sm:h-48 md:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={monthlyDetails
                      .slice()
                      .sort((a, b) => `${a.year}-${a.month.toString().padStart(2, '0')}`.localeCompare(`${b.year}-${b.month.toString().padStart(2, '0')}`))
                      .map(d => ({
                        month: `${d.year}/${d.month}`,
                        early: d.early,
                        afternoon: d.afternoon,
                        night: d.night,
                        consecutive: d.avgConsecutive,
                        stock: d.stock
                      }))}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#ffffff80"
                      tick={{ fontSize: 12 }}
                      className="x-axis-responsive"
                    />
                    <YAxis 
                      stroke="#ffffff80"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '14px'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ 
                        fontSize: '14px',
                        paddingTop: '10px'
                      }}
                    />
                     <Line type="monotone" dataKey="early" stroke="#ec4899" strokeWidth={2} name="早中班" />
                    <Line type="monotone" dataKey="afternoon" stroke="#f97316" strokeWidth={2} name="午班" />
                    <Line type="monotone" dataKey="night" stroke="#3b82f6" strokeWidth={2} name="晚班" />
                    <Line type="monotone" dataKey="consecutive" stroke="#f97316" strokeWidth={2} name="平均連續上班" />
                    <Line type="monotone" dataKey="stock" stroke="#10b981" strokeWidth={2} name="進貨" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 主要跨月分析組件
export default function CrossMonthAnalysis({ allSchedules, names, employeeTags = {}, availableMonths }) {
  const [showAllStats, setShowAllStats] = React.useState(false)
  const [selectedEmployee, setSelectedEmployee] = React.useState(null)
  
  const employeeStats = useMemo(() => {
    if (!allSchedules || Object.keys(allSchedules).length === 0 || !names || Object.keys(names).length === 0) {
      return {}
    }
    
    if (!availableMonths || availableMonths.length === 0) {
      return {}
    }
    
    return calculateCrossMonthStats(allSchedules, names, employeeTags, availableMonths)
  }, [allSchedules, names, employeeTags, availableMonths])

  const hasData = Object.keys(employeeStats).length > 0

  // 處理員工點擊事件
  const handleEmployeeClick = (stat) => {
    const fullEmployeeData = employeeStats[stat.employeeId]
    if (fullEmployeeData) {
      setSelectedEmployee(fullEmployeeData)
    }
  }

  return (
    <div className="space-y-6">

      {!hasData ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-xl mb-2">暫無跨月資料</div>
          <div className="text-sm">請確保已載入多個月份的班表資料</div>
        </div>
      ) : (
        <>
          {/* 統計卡片網格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatCard title={STATS_THEMES.early.title} icon={STATS_THEMES.early.icon} themeColor="early" isLoading={false}>
              <EarlyShiftAvgStats employeeStats={employeeStats} showAll={showAllStats} onEmployeeClick={handleEmployeeClick} />
            </StatCard>
            <StatCard title={STATS_THEMES.afternoon.title} icon={STATS_THEMES.afternoon.icon} themeColor="afternoon" isLoading={false}>
              <AfternoonShiftAvgStats employeeStats={employeeStats} showAll={showAllStats} onEmployeeClick={handleEmployeeClick} />
            </StatCard>
            <StatCard title={STATS_THEMES.night.title} icon={STATS_THEMES.night.icon} themeColor="night" isLoading={false}>
              <NightShiftAvgStats employeeStats={employeeStats} showAll={showAllStats} onEmployeeClick={handleEmployeeClick} />
            </StatCard>
            <StatCard title={STATS_THEMES.consecutive.title} icon={STATS_THEMES.consecutive.icon} themeColor="consecutive" isLoading={false}>
              <ConsecutiveWorkAvgStats employeeStats={employeeStats} showAll={showAllStats} onEmployeeClick={handleEmployeeClick} />
            </StatCard>
            <StatCard title={STATS_THEMES.stockLover.title} icon={STATS_THEMES.stockLover.icon} themeColor="stockLover" isLoading={false}>
              <StockLoverAvgStats employeeStats={employeeStats} showAll={showAllStats} onEmployeeClick={handleEmployeeClick} />
            </StatCard>
          </div>
          
          {/* 統一的查看全部按鈕 */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowAllStats(!showAllStats)}
              className="px-8 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-400/30 text-purple-300 rounded-xl transition-all duration-200 text-sm font-medium shadow-lg backdrop-blur-sm"
            >
              {showAllStats ? '收起所有排名' : '查看全部排名'}
            </button>
          </div>

        </>
      )}

      {/* 員工詳細資料彈窗 */}
      {selectedEmployee && (
        <EmployeeDetailModal 
          employee={selectedEmployee} 
          onClose={() => setSelectedEmployee(null)}
          allSchedules={allSchedules}
          availableMonths={availableMonths}
          names={names}
          employeeTags={employeeTags}
        />
      )}
    </div>
  )
}
