import { useMemo, useCallback } from 'react'
import { useDataCache, useComputedCache } from './useDataCache'
import { measurePerformance } from '../utils/performance'

/**
 * 統計計算快取 Hook
 * @param {Object} schedule - 班表數據
 * @param {Object} names - 姓名映射
 * @param {Object} options - 配置選項
 * @returns {Object} 統計計算結果
 */
export const useStatisticsCache = (schedule, names, options = {}) => {
  const {
    enableCache = true,
    ttl = 10 * 60 * 1000, // 10分鐘
    maxSize = 50
  } = options

  // 早班統計快取
  const earlyShiftStats = useComputedCache(
    () => measurePerformance('calculateEarlyShiftStats', () => {
      const stats = {}
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        let count = 0
        
        for (let day = 1; day <= daysInMonth; day++) {
          const shift = schedule[employeeId]?.[day]
          if (shift === '早') count++
        }
        
        if (count > 0) {
          stats[employeeId] = {
            name: names[employeeId] || employeeId,
            count
          }
        }
      })
      
      return Object.values(stats).sort((a, b) => b.count - a.count)
    }),
    [schedule, names],
    { cacheKey: 'earlyShiftStats', ttl, enableCache }
  )

  // 晚班統計快取
  const nightShiftStats = useComputedCache(
    () => measurePerformance('calculateNightShiftStats', () => {
      const stats = {}
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        let count = 0
        
        for (let day = 1; day <= daysInMonth; day++) {
          const shift = schedule[employeeId]?.[day]
          if (shift === '晚') count++
        }
        
        if (count > 0) {
          stats[employeeId] = {
            name: names[employeeId] || employeeId,
            count
          }
        }
      })
      
      return Object.values(stats).sort((a, b) => b.count - a.count)
    }),
    [schedule, names],
    { cacheKey: 'nightShiftStats', ttl, enableCache }
  )

  // 連續上班統計快取
  const consecutiveWorkStats = useComputedCache(
    () => measurePerformance('calculateConsecutiveWorkStats', () => {
      const stats = {}
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        
        let maxConsecutive = 0
        let currentStreak = 0
        
        for (let day = 1; day <= daysInMonth; day++) {
          const shift = schedule[employeeId]?.[day]
          if (shift && shift !== '休') {
            currentStreak++
            maxConsecutive = Math.max(maxConsecutive, currentStreak)
          } else {
            currentStreak = 0
          }
        }
        
        if (maxConsecutive > 0) {
          stats[employeeId] = {
            name: names[employeeId] || employeeId,
            maxConsecutive
          }
        }
      })
      
      return Object.values(stats).sort((a, b) => b.maxConsecutive - a.maxConsecutive)
    }),
    [schedule, names],
    { cacheKey: 'consecutiveWorkStats', ttl, enableCache }
  )

  // 熱愛進貨統計快取
  const stockLoverStats = useComputedCache(
    () => measurePerformance('calculateStockLoverStats', () => {
      const stats = {}
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      
      // 初始化所有員工
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        stats[employeeId] = {
          name: names[employeeId] || employeeId,
          count: 0,
          weeks: []
        }
      })
      
      // 計算每個星期三的中班和晚班
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(new Date().getFullYear(), new Date().getMonth(), day)
        const dayOfWeek = date.getDay() // 0=星期日, 3=星期三
        
        if (dayOfWeek === 3) { // 星期三
          const weekNumber = Math.ceil(day / 7) // 計算是第幾週
          
          Object.keys(schedule).forEach(employeeId => {
            if (employeeId === '_lastUpdated') return
            const shift = schedule[employeeId]?.[day]
            
            if (shift === '中' || shift === '晚') {
              stats[employeeId].count++
              if (!stats[employeeId].weeks.includes(weekNumber)) {
                stats[employeeId].weeks.push(weekNumber)
              }
            }
          })
        }
      }
      
      return Object.values(stats)
        .filter(stat => stat.count > 0)
        .sort((a, b) => b.count - a.count)
    }),
    [schedule, names],
    { cacheKey: 'stockLoverStats', ttl, enableCache }
  )

  // 班次分布統計快取
  const shiftDistributionStats = useComputedCache(
    () => measurePerformance('calculateShiftDistributionStats', () => {
      const distribution = {}
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        
        const employeeName = names[employeeId] || employeeId
        distribution[employeeName] = {
          name: employeeName,
          early: 0,
          middle: 0,
          night: 0,
          rest: 0,
          special: 0,
          total: 0
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
          const shift = schedule[employeeId]?.[day]
          if (shift) {
            distribution[employeeName].total++
            switch (shift) {
              case '早': distribution[employeeName].early++; break
              case '中': distribution[employeeName].middle++; break
              case '晚': distribution[employeeName].night++; break
              case '休': distribution[employeeName].rest++; break
              case '特': distribution[employeeName].special++; break
            }
          }
        }
      })
      
      return Object.values(distribution)
        .filter(item => item.total > 0)
        .sort((a, b) => {
          const employeeIdA = Object.keys(names).find(key => names[key] === a.name) || a.name
          const employeeIdB = Object.keys(names).find(key => names[key] === b.name) || b.name
          const numA = parseInt(employeeIdA.match(/\d+/)?.[0] || '0')
          const numB = parseInt(employeeIdB.match(/\d+/)?.[0] || '0')
          return numA - numB
        })
    }),
    [schedule, names],
    { cacheKey: 'shiftDistributionStats', ttl, enableCache }
  )

  // 班次趨勢統計快取
  const shiftTrendStats = useComputedCache(
    () => measurePerformance('calculateShiftTrendStats', () => {
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      const trendData = []
      
      for (let day = 1; day <= daysInMonth; day++) {
        let early = 0, middle = 0, night = 0, rest = 0, special = 0
        
        Object.keys(schedule).forEach(employeeId => {
          if (employeeId === '_lastUpdated') return
          
          const shift = schedule[employeeId]?.[day]
          switch (shift) {
            case '早': early++; break
            case '中': middle++; break
            case '晚': night++; break
            case '休': rest++; break
            case '特': special++; break
          }
        })
        
        trendData.push({
          date: `${day}日`,
          day: day,
          early,
          middle,
          night,
          rest,
          special
        })
      }
      
      return trendData
    }),
    [schedule],
    { cacheKey: 'shiftTrendStats', ttl, enableCache }
  )

  // 清除所有統計快取
  const clearStatisticsCache = useCallback(() => {
    // 這裡可以實現清除特定快取的邏輯
    console.log('清除統計快取')
  }, [])

  return {
    earlyShiftStats,
    nightShiftStats,
    consecutiveWorkStats,
    stockLoverStats,
    shiftDistributionStats,
    shiftTrendStats,
    clearStatisticsCache
  }
}
