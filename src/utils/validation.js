// 數據驗證工具函數

/**
 * 驗證班表數據的完整性
 * @param {Object} schedule - 班表數據
 * @param {Object} names - 員工姓名映射
 * @returns {Object} 驗證結果
 */
export const validateScheduleData = (schedule, names = {}) => {
  const errors = []
  const warnings = []
  
  // 檢查基本結構
  if (!schedule || typeof schedule !== 'object') {
    errors.push('班表數據格式無效')
    return { isValid: false, errors, warnings }
  }
  
  // 檢查是否有員工數據
  const employeeIds = Object.keys(schedule).filter(key => key !== '_lastUpdated')
  if (employeeIds.length === 0) {
    warnings.push('沒有找到員工班表數據')
  }
  
  // 檢查每個員工的數據
  employeeIds.forEach(employeeId => {
    const employeeData = schedule[employeeId]
    
    if (!employeeData) {
      errors.push(`員工 ${employeeId} 的數據為空`)
      return
    }
    
    // 檢查是否有班表數據
    if (!employeeData.schedule || typeof employeeData.schedule !== 'object') {
      errors.push(`員工 ${employeeId} 的班表數據格式錯誤`)
      return
    }
    
    // 檢查班表數據的完整性
    const scheduleData = employeeData.schedule
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    
    for (let day = 1; day <= daysInMonth; day++) {
      const shift = scheduleData[day]
      if (shift && !['早', '中', '晚', '休', '特'].includes(shift)) {
        warnings.push(`員工 ${employeeId} 第 ${day} 天的班別 "${shift}" 不是標準班別`)
      }
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * 驗證員工姓名映射
 * @param {Object} names - 員工姓名映射
 * @returns {Object} 驗證結果
 */
export const validateNamesMapping = (names) => {
  const errors = []
  const warnings = []
  
  if (!names || typeof names !== 'object') {
    errors.push('員工姓名映射格式無效')
    return { isValid: false, errors, warnings }
  }
  
  Object.entries(names).forEach(([employeeId, name]) => {
    if (!name || typeof name !== 'string') {
      errors.push(`員工 ${employeeId} 的姓名無效`)
    } else if (name.trim().length === 0) {
      warnings.push(`員工 ${employeeId} 的姓名為空`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * 驗證統計計算的輸入參數
 * @param {Object} schedule - 班表數據
 * @param {Object} names - 員工姓名映射
 * @param {string} targetShift - 目標班別
 * @returns {Object} 驗證結果
 */
export const validateStatisticsInput = (schedule, names, targetShift) => {
  const errors = []
  
  if (!schedule || typeof schedule !== 'object') {
    errors.push('班表數據無效')
  }
  
  if (!names || typeof names !== 'object') {
    errors.push('員工姓名映射無效')
  }
  
  if (!targetShift || typeof targetShift !== 'string') {
    errors.push('目標班別無效')
  } else if (!['早', '中', '晚', '休', '特'].includes(targetShift)) {
    errors.push(`不支援的班別: ${targetShift}`)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 安全的數據獲取函數
 * @param {Object} obj - 目標物件
 * @param {string} path - 屬性路徑
 * @param {*} defaultValue - 預設值
 * @returns {*} 屬性值或預設值
 */
export const safeGet = (obj, path, defaultValue = null) => {
  try {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : defaultValue
    }, obj)
  } catch (error) {
    console.warn('safeGet error:', error)
    return defaultValue
  }
}

/**
 * 安全的數組操作
 * @param {Array} array - 目標數組
 * @param {Function} callback - 回調函數
 * @returns {Array} 處理後的數組
 */
export const safeArrayMap = (array, callback) => {
  if (!Array.isArray(array)) {
    console.warn('safeArrayMap: 輸入不是數組', array)
    return []
  }
  
  try {
    return array.map(callback)
  } catch (error) {
    console.error('safeArrayMap error:', error)
    return []
  }
}
