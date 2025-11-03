import { validateStatisticsInput, safeGet } from './validation'

// 搭班統計計算快取
const overlapCache = new Map()
const CACHE_EXPIRY = 5 * 60 * 1000 // 5分鐘快取過期

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
 * 判斷是否使用新的搭班算法（2025年10月及之後）
 * @param {string} selectedMonth - 選擇的月份
 * @returns {boolean} 是否使用新算法
 */
const useNewShiftOverlapAlgorithm = (selectedMonth) => {
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

/**
 * 計算搭班統計
 * @param {Object} schedule - 班表數據
 * @param {Object} names - 員工姓名映射
 * @param {string} selectedMonth - 選擇的月份
 * @returns {Object} 搭班統計結果
 */
export const calculateShiftOverlap = (schedule, names, selectedMonth = null) => {
  if (!schedule || Object.keys(schedule).length === 0) {
    return { overlapStats: {}, overlapDetails: {} }
  }

  // 生成快取鍵
  const cacheKey = `${selectedMonth || 'current'}_${JSON.stringify(Object.keys(schedule).sort())}_${JSON.stringify(names)}`
  
  // 檢查快取
  const cached = overlapCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
    return cached.data
  }

  const overlapStats = {}
  const overlapDetails = {}
  
  // 根據選擇的月份計算天數
  let daysInMonth
  if (selectedMonth) {
    let monthKey = selectedMonth
    if (selectedMonth.includes('_')) {
      monthKey = selectedMonth.split('_')[0] // 移除店別後綴
    }
    const [year, month] = monthKey.split('-').map(Number)
    daysInMonth = new Date(year, month, 0).getDate()
  } else {
    daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  }
  
  // 初始化統計資料
  Object.keys(schedule).forEach(employeeId => {
    if (employeeId === '_lastUpdated') return
    overlapStats[employeeId] = {}
    overlapDetails[employeeId] = {}
  })
  
  // 計算每天搭班情況
  for (let day = 1; day <= daysInMonth; day++) {
    const dayShifts = {}
    
    // 收集當天所有班別（排除D7班和高鐵班，因為它們不與同事搭班）
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      const shift = safeGet(schedule[employeeId], day.toString())
      if (shift && shift !== '休' && shift !== 'D7' && shift !== '高鐵') {
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
    
    // 判斷使用哪種搭班算法
    const useNewAlgorithm = useNewShiftOverlapAlgorithm(selectedMonth)
    
    if (useNewAlgorithm) {
      // 新算法：2025年10月及之後
      // 1. 早班 會跟 中班 午班 搭班
      if (dayShifts['早']) {
        if (dayShifts['中']) {
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
        if (dayShifts['午']) {
          dayShifts['早'].forEach(emp1 => {
            dayShifts['午'].forEach(emp2 => {
              if (!overlapStats[emp1][emp2]) overlapStats[emp1][emp2] = 0
              if (!overlapStats[emp2][emp1]) overlapStats[emp2][emp1] = 0
              if (!overlapDetails[emp1][emp2]) overlapDetails[emp1][emp2] = []
              if (!overlapDetails[emp2][emp1]) overlapDetails[emp2][emp1] = []
              
              overlapStats[emp1][emp2]++
              overlapStats[emp2][emp1]++
              overlapDetails[emp1][emp2].push({ day, shift: '早-午' })
              overlapDetails[emp2][emp1].push({ day, shift: '午-早' })
            })
          })
        }
      }
      
      // 2. 中班 會跟 早班 午班 搭班
      if (dayShifts['中']) {
        if (dayShifts['早']) {
          // 早班與中班搭班已經在上面處理過了，避免重複
        }
        if (dayShifts['午']) {
          dayShifts['中'].forEach(emp1 => {
            dayShifts['午'].forEach(emp2 => {
              if (!overlapStats[emp1][emp2]) overlapStats[emp1][emp2] = 0
              if (!overlapStats[emp2][emp1]) overlapStats[emp2][emp1] = 0
              if (!overlapDetails[emp1][emp2]) overlapDetails[emp1][emp2] = []
              if (!overlapDetails[emp2][emp1]) overlapDetails[emp2][emp1] = []
              
              overlapStats[emp1][emp2]++
              overlapStats[emp2][emp1]++
              overlapDetails[emp1][emp2].push({ day, shift: '中-午' })
              overlapDetails[emp2][emp1].push({ day, shift: '午-中' })
            })
          })
        }
      }
      
      // 3. 午班 會跟 早班 午班 晚班 搭班
      if (dayShifts['午']) {
        if (dayShifts['早']) {
          // 早班與午班搭班已經在上面處理過了，避免重複
        }
        if (dayShifts['中']) {
          // 中班與午班搭班已經在上面處理過了，避免重複
        }
        if (dayShifts['晚']) {
          dayShifts['午'].forEach(emp1 => {
            dayShifts['晚'].forEach(emp2 => {
              if (!overlapStats[emp1][emp2]) overlapStats[emp1][emp2] = 0
              if (!overlapStats[emp2][emp1]) overlapStats[emp2][emp1] = 0
              if (!overlapDetails[emp1][emp2]) overlapDetails[emp1][emp2] = []
              if (!overlapDetails[emp2][emp1]) overlapDetails[emp2][emp1] = []
              
              overlapStats[emp1][emp2]++
              overlapStats[emp2][emp1]++
              overlapDetails[emp1][emp2].push({ day, shift: '午-晚' })
              overlapDetails[emp2][emp1].push({ day, shift: '晚-午' })
            })
          })
        }
      }
      
      // 4. 晚班 會跟 午班 搭班
      if (dayShifts['晚']) {
        if (dayShifts['午']) {
          // 午班與晚班搭班已經在上面處理過了，避免重複
        }
      }
    } else {
      // 舊算法：2025年9月及之前
      // 早班與中班搭班
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
    
      // 中班與晚班搭班
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
  }
  
  const result = { overlapStats, overlapDetails }
  
  // 保存到快取
  overlapCache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  })
  
  // 清理過期的快取
  if (overlapCache.size > 50) { // 限制快取大小
    const now = Date.now()
    for (const [key, value] of overlapCache.entries()) {
      if (now - value.timestamp > CACHE_EXPIRY) {
        overlapCache.delete(key)
      }
    }
  }
  
  return result
}
