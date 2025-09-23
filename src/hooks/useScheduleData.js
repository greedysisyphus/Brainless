import { useState, useEffect, useMemo } from 'react'
import { validateScheduleData, validateNamesMapping } from '../utils/validation'

/**
 * 班表數據管理 Hook
 */
export const useScheduleData = () => {
  const [schedule, setSchedule] = useState({})
  const [names, setNames] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])
  const [validationWarnings, setValidationWarnings] = useState([])

  // 驗證班表數據
  const validateData = useMemo(() => {
    const scheduleValidation = validateScheduleData(schedule, names)
    const namesValidation = validateNamesMapping(names)
    
    return {
      schedule: scheduleValidation,
      names: namesValidation,
      isValid: scheduleValidation.isValid && namesValidation.isValid
    }
  }, [schedule, names])

  // 更新驗證狀態
  useEffect(() => {
    setValidationErrors([
      ...validateData.schedule.errors,
      ...validateData.names.errors
    ])
    setValidationWarnings([
      ...validateData.schedule.warnings,
      ...validateData.names.warnings
    ])
  }, [validateData])

  // 安全地更新班表數據
  const updateSchedule = (newSchedule) => {
    try {
      setLoading(true)
      setError(null)
      
      if (!newSchedule || typeof newSchedule !== 'object') {
        throw new Error('班表數據格式無效')
      }
      
      setSchedule(newSchedule)
    } catch (err) {
      setError(err.message)
      console.error('更新班表數據時發生錯誤:', err)
    } finally {
      setLoading(false)
    }
  }

  // 安全地更新員工姓名映射
  const updateNames = (newNames) => {
    try {
      if (!newNames || typeof newNames !== 'object') {
        throw new Error('員工姓名映射格式無效')
      }
      
      setNames(newNames)
    } catch (err) {
      setError(err.message)
      console.error('更新員工姓名映射時發生錯誤:', err)
    }
  }

  // 獲取當前班表（安全版本）
  const getCurrentSchedule = () => {
    if (!schedule || Object.keys(schedule).length === 0) {
      return {}
    }
    return schedule
  }

  // 獲取員工姓名（安全版本）
  const getEmployeeName = (employeeId) => {
    return names[employeeId] || employeeId
  }

  // 檢查數據是否可用
  const isDataAvailable = () => {
    return Object.keys(schedule).length > 0 && Object.keys(names).length > 0
  }

  return {
    // 數據
    schedule,
    names,
    
    // 狀態
    loading,
    error,
    validationErrors,
    validationWarnings,
    isValid: validateData.isValid,
    
    // 方法
    updateSchedule,
    updateNames,
    getCurrentSchedule,
    getEmployeeName,
    isDataAvailable,
    
    // 驗證結果
    validation: validateData
  }
}
