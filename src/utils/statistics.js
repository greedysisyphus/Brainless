import { validateStatisticsInput, safeGet } from './validation'

/**
 * 通用班次統計計算函數
 * @param {Object} schedule - 班表數據
 * @param {Object} names - 員工姓名映射
 * @param {string} targetShift - 目標班別
 * @returns {Array} 統計結果
 */
export const calculateShiftStatistics = (schedule, names, targetShift) => {
  // 數據驗證
  const validation = validateStatisticsInput(schedule, names, targetShift)
  if (!validation.isValid) {
    console.error('統計計算輸入驗證失敗:', validation.errors)
    return []
  }
  
  const stats = {}
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  
  // 安全地處理員工數據
  const employeeIds = Object.keys(schedule).filter(key => key !== '_lastUpdated')
  
  employeeIds.forEach(employeeId => {
    try {
      let count = 0
      
      for (let day = 1; day <= daysInMonth; day++) {
        const shift = safeGet(schedule[employeeId], day.toString())
        if (shift === targetShift) {
          count++
        }
      }
      
      if (count > 0) {
        stats[employeeId] = {
          name: safeGet(names, employeeId, employeeId),
          count
        }
      }
    } catch (error) {
      console.warn(`處理員工 ${employeeId} 的統計數據時發生錯誤:`, error)
    }
  })
  
  return Object.values(stats).sort((a, b) => b.count - a.count)
}

/**
 * 計算連續上班統計
 * @param {Object} schedule - 班表數據
 * @param {Object} names - 員工姓名映射
 * @returns {Array} 連續上班統計結果
 */
export const calculateConsecutiveWorkStats = (schedule, names) => {
  if (!schedule || Object.keys(schedule).length === 0) {
    return []
  }

  const stats = {}
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  
  Object.keys(schedule).forEach(employeeId => {
    if (employeeId === '_lastUpdated') return
    
    let maxConsecutive = 0
    let currentConsecutive = 0
    
    for (let day = 1; day <= daysInMonth; day++) {
      const shift = safeGet(schedule[employeeId], day.toString())
      
      if (shift && shift !== '休') {
        currentConsecutive++
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
      } else {
        currentConsecutive = 0
      }
    }
    
    if (maxConsecutive > 0) {
      stats[employeeId] = {
        name: safeGet(names, employeeId, employeeId),
        maxConsecutive,
        riskLevel: maxConsecutive >= 6 ? 'high' : maxConsecutive >= 4 ? 'medium' : 'low'
      }
    }
  })
  
  return Object.values(stats).sort((a, b) => b.maxConsecutive - a.maxConsecutive)
}

/**
 * 計算搭班統計
 * @param {Object} schedule - 班表數據
 * @param {Object} names - 員工姓名映射
 * @returns {Object} 搭班統計結果
 */
export const calculateShiftOverlap = (schedule, names) => {
  if (!schedule || Object.keys(schedule).length === 0) {
    return { overlapStats: {}, overlapDetails: {} }
  }

  const overlapStats = {}
  const overlapDetails = {}
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  
  // 初始化統計資料
  Object.keys(schedule).forEach(employeeId => {
    if (employeeId === '_lastUpdated') return
    overlapStats[employeeId] = {}
    overlapDetails[employeeId] = {}
  })
  
  // 計算每天搭班情況
  for (let day = 1; day <= daysInMonth; day++) {
    const dayShifts = {}
    
    // 收集當天所有班別
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      const shift = safeGet(schedule[employeeId], day.toString())
      if (shift && shift !== '休') {
        if (!dayShifts[shift]) dayShifts[shift] = []
        dayShifts[shift].push(employeeId)
      }
    })
    
    // 計算搭班關係
    // 同班別內搭班
    Object.keys(dayShifts).forEach(shift => {
      const employees = dayShifts[shift]
      
      for (let i = 0; i < employees.length; i++) {
        for (let j = i + 1; j < employees.length; j++) {
          const emp1 = employees[i]
          const emp2 = employees[j]
          
          if (!overlapStats[emp1][emp2]) overlapStats[emp1][emp2] = 0
          if (!overlapStats[emp2][emp1]) overlapStats[emp2][emp1] = 0
          if (!overlapDetails[emp1][emp2]) overlapDetails[emp1][emp2] = []
          if (!overlapDetails[emp2][emp1]) overlapDetails[emp2][emp1] = []
          
          overlapStats[emp1][emp2]++
          overlapStats[emp2][emp1]++
          overlapDetails[emp1][emp2].push({ day, shift })
          overlapDetails[emp2][emp1].push({ day, shift })
        }
      }
    })
    
    // 不同班別搭班
    if (dayShifts['早'] && dayShifts['中']) {
      dayShifts['早'].forEach(emp1 => {
        dayShifts['中'].forEach(emp2 => {
          if (!overlapStats[emp1][emp2]) overlapStats[emp1][emp2] = 0
          if (!overlapStats[emp2][emp1]) overlapStats[emp2][emp1] = 0
          if (!overlapDetails[emp1][emp2]) overlapDetails[emp1][emp2] = []
          if (!overlapDetails[emp2][emp1]) overlapDetails[emp2][emp1] = []
          
          overlapStats[emp1][emp2]++
          overlapStats[emp2][emp1]++
          overlapDetails[emp1][emp2].push({ day, shift: '早-中' })
          overlapDetails[emp2][emp1].push({ day, shift: '中-早' })
        })
      })
    }
    
    if (dayShifts['中'] && dayShifts['晚']) {
      dayShifts['中'].forEach(emp1 => {
        dayShifts['晚'].forEach(emp2 => {
          if (!overlapStats[emp1][emp2]) overlapStats[emp1][emp2] = 0
          if (!overlapStats[emp2][emp1]) overlapStats[emp2][emp1] = 0
          if (!overlapDetails[emp1][emp2]) overlapDetails[emp1][emp2] = []
          if (!overlapDetails[emp2][emp1]) overlapDetails[emp2][emp1] = []
          
          overlapStats[emp1][emp2]++
          overlapStats[emp2][emp1]++
          overlapDetails[emp1][emp2].push({ day, shift: '中-晚' })
          overlapDetails[emp2][emp1].push({ day, shift: '晚-中' })
        })
      })
    }
  }
  
  return { overlapStats, overlapDetails }
}
