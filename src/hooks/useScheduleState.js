import { useReducer, useCallback } from 'react'
import { scheduleReducer, initialScheduleState, scheduleActions } from '../reducers/scheduleReducer'

/**
 * 班表狀態管理 Hook
 * 提供漸進式狀態管理，與現有 useState 並存
 */
export const useScheduleState = () => {
  const [state, dispatch] = useReducer(scheduleReducer, initialScheduleState)

  // 包裝的 action creators，提供更友好的 API
  const actions = {
    // 月份選擇
    setSelectedMonth: useCallback((month) => {
      dispatch(scheduleActions.setSelectedMonth(month))
    }, []),

    // 員工選擇
    setSelectedEmployee: useCallback((employee) => {
      dispatch(scheduleActions.setSelectedEmployee(employee))
    }, []),

    // 週次選擇
    setSelectedWeek: useCallback((week) => {
      dispatch(scheduleActions.setSelectedWeek(week))
    }, []),

    // 自訂日期範圍
    setCustomDateRange: useCallback((dateRange) => {
      dispatch(scheduleActions.setCustomDateRange(dateRange))
    }, []),

    // 切換自訂範圍模式
    toggleCustomRange: useCallback((enabled) => {
      dispatch(scheduleActions.toggleCustomRange(enabled))
    }, []),

    // 更新班表數據
    updateScheduleData: useCallback((data) => {
      dispatch(scheduleActions.updateScheduleData(data))
    }, []),

    // 載入狀態
    setLoading: useCallback((key, value) => {
      dispatch(scheduleActions.setLoading(key, value))
    }, []),

    // 錯誤狀態
    setError: useCallback((error) => {
      dispatch(scheduleActions.setError(error))
    }, []),

    // 重置狀態
    resetState: useCallback(() => {
      dispatch(scheduleActions.resetState())
    }, []),

    // 批量更新
    batchUpdate: useCallback((updates) => {
      dispatch(scheduleActions.batchUpdate(updates))
    }, [])
  }

  return {
    state,
    actions,
    dispatch
  }
}

/**
 * 混合狀態管理 Hook
 * 同時提供 reducer 和 useState 的狀態
 * 用於漸進式遷移
 */
export const useHybridScheduleState = (useReducerFor = []) => {
  const { state: reducerState, actions } = useScheduleState()
  
  // 這裡可以根據需要混合使用 useState 和 useReducer
  // 例如：新功能使用 reducer，舊功能保持 useState
  
  return {
    // Reducer 狀態（用於新功能）
    reducerState,
    actions,
    
    // 可以添加 useState 狀態（用於舊功能）
    // 這樣可以漸進式遷移，而不需要一次性重構所有狀態
  }
}
