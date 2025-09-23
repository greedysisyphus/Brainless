// 班表管理狀態 reducer
export const scheduleReducer = (state, action) => {
  switch (action.type) {
    // 月份選擇
    case 'SET_SELECTED_MONTH':
      return {
        ...state,
        selectedMonth: action.payload,
        // 當月份改變時，重置相關狀態
        selectedEmployee: null,
        selectedWeek: 1,
        customDateRange: { startDate: null, endDate: null },
        useCustomRange: false
      }

    // 員工選擇
    case 'SET_SELECTED_EMPLOYEE':
      return {
        ...state,
        selectedEmployee: action.payload
      }

    // 週次選擇
    case 'SET_SELECTED_WEEK':
      return {
        ...state,
        selectedWeek: action.payload,
        // 當選擇週次時，關閉自訂日期範圍
        useCustomRange: false,
        customDateRange: { startDate: null, endDate: null }
      }

    // 自訂日期範圍
    case 'SET_CUSTOM_DATE_RANGE':
      return {
        ...state,
        customDateRange: action.payload,
        // 當設定自訂日期時，關閉週次選擇
        selectedWeek: 1
      }

    // 切換日期範圍模式
    case 'TOGGLE_CUSTOM_RANGE':
      return {
        ...state,
        useCustomRange: action.payload,
        // 切換時重置相關狀態
        ...(action.payload ? 
          { selectedWeek: 1 } : 
          { customDateRange: { startDate: null, endDate: null } }
        )
      }

    // 班表數據更新
    case 'UPDATE_SCHEDULE_DATA':
      return {
        ...state,
        schedule: action.payload.schedule,
        names: action.payload.names,
        lastUpdated: action.payload.lastUpdated
      }

    // 載入狀態
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value
        }
      }

    // 錯誤狀態
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      }

    // 重置狀態
    case 'RESET_STATE':
      return {
        ...state,
        selectedEmployee: null,
        selectedWeek: 1,
        customDateRange: { startDate: null, endDate: null },
        useCustomRange: false,
        error: null
      }

    // 批量更新
    case 'BATCH_UPDATE':
      return {
        ...state,
        ...action.payload
      }

    default:
      return state
  }
}

// 初始狀態
export const initialScheduleState = {
  // 月份選擇
  selectedMonth: 'current',
  
  // 員工選擇
  selectedEmployee: null,
  
  // 週次選擇
  selectedWeek: 1,
  
  // 自訂日期範圍
  customDateRange: {
    startDate: null,
    endDate: null
  },
  useCustomRange: false,
  
  // 班表數據
  schedule: {},
  names: {},
  lastUpdated: {},
  
  // 載入狀態
  loading: {
    schedule: false,
    statistics: false,
    export: false
  },
  
  // 錯誤狀態
  error: null
}

// Action creators（可選，用於類型安全）
export const scheduleActions = {
  setSelectedMonth: (month) => ({ type: 'SET_SELECTED_MONTH', payload: month }),
  setSelectedEmployee: (employee) => ({ type: 'SET_SELECTED_EMPLOYEE', payload: employee }),
  setSelectedWeek: (week) => ({ type: 'SET_SELECTED_WEEK', payload: week }),
  setCustomDateRange: (dateRange) => ({ type: 'SET_CUSTOM_DATE_RANGE', payload: dateRange }),
  toggleCustomRange: (enabled) => ({ type: 'TOGGLE_CUSTOM_RANGE', payload: enabled }),
  updateScheduleData: (data) => ({ type: 'UPDATE_SCHEDULE_DATA', payload: data }),
  setLoading: (key, value) => ({ type: 'SET_LOADING', payload: { key, value } }),
  setError: (error) => ({ type: 'SET_ERROR', payload: error }),
  resetState: () => ({ type: 'RESET_STATE' }),
  batchUpdate: (updates) => ({ type: 'BATCH_UPDATE', payload: updates })
}
