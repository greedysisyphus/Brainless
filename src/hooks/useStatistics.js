import { useMemo } from 'react'
import { calculateShiftStatistics } from '../utils/statistics'
import { validateStatisticsInput } from '../utils/validation'

/**
 * 統計計算 Hook
 */
export const useStatistics = (schedule, names) => {
  // 早班統計
  const earlyStats = useMemo(() => {
    if (!schedule || Object.keys(schedule).length === 0) {
      return []
    }
    
    try {
      return calculateShiftStatistics(schedule, names, '早')
    } catch (error) {
      console.error('計算早班統計時發生錯誤:', error)
      return []
    }
  }, [schedule, names])

  // 晚班統計
  const nightStats = useMemo(() => {
    if (!schedule || Object.keys(schedule).length === 0) {
      return []
    }
    
    try {
      return calculateShiftStatistics(schedule, names, '晚')
    } catch (error) {
      console.error('計算晚班統計時發生錯誤:', error)
      return []
    }
  }, [schedule, names])

  // 中班統計
  const middleStats = useMemo(() => {
    if (!schedule || Object.keys(schedule).length === 0) {
      return []
    }
    
    try {
      return calculateShiftStatistics(schedule, names, '中')
    } catch (error) {
      console.error('計算中班統計時發生錯誤:', error)
      return []
    }
  }, [schedule, names])

  // 熱愛進貨統計（星期三中班和晚班）
  const stockLoverStats = useMemo(() => {
    if (!schedule || Object.keys(schedule).length === 0) {
      return []
    }
    
    try {
      const stats = {}
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        
        let count = 0
        const weeks = []
        
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(new Date().getFullYear(), new Date().getMonth(), day)
          const dayOfWeek = date.getDay()
          
          if (dayOfWeek === 3) { // 星期三
            const weekNumber = Math.ceil(day / 7)
            const shift = schedule[employeeId]?.[day]
            
            if (shift === '中' || shift === '晚') {
              count++
              if (!weeks.includes(weekNumber)) {
                weeks.push(weekNumber)
              }
            }
          }
        }
        
        if (count > 0) {
          stats[employeeId] = {
            name: names[employeeId] || employeeId,
            count,
            weeks
          }
        }
      })
      
      return Object.values(stats).sort((a, b) => b.count - a.count)
    } catch (error) {
      console.error('計算熱愛進貨統計時發生錯誤:', error)
      return []
    }
  }, [schedule, names])

  // 個人統計
  const getPersonalStats = (employeeId) => {
    if (!schedule || !schedule[employeeId]) {
      return {
        name: names[employeeId] || employeeId,
        early: 0,
        middle: 0,
        night: 0,
        rest: 0,
        special: 0,
        total: 0
      }
    }

    const stats = {
      name: names[employeeId] || employeeId,
      early: 0,
      middle: 0,
      night: 0,
      rest: 0,
      special: 0,
      total: 0
    }
    
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    
    for (let day = 1; day <= daysInMonth; day++) {
      const shift = schedule[employeeId]?.[day]
      if (shift) {
        switch (shift) {
          case '早': 
            stats.early++
            stats.total++
            break
          case '中': 
            stats.middle++
            stats.total++
            break
          case '晚': 
            stats.night++
            stats.total++
            break
          case '休': 
            stats.rest++
            break
          case '特': 
            stats.special++
            stats.total++
            break
        }
      }
    }
    
    return stats
  }

  return {
    earlyStats,
    nightStats,
    middleStats,
    stockLoverStats,
    getPersonalStats
  }
}
