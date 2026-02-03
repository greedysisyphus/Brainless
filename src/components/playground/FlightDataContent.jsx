import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { PaperAirplaneIcon, ArrowPathIcon, XMarkIcon, ArrowDownTrayIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
// 觸發部署更新

function FlightDataContent() {
  const [selectedDate, setSelectedDate] = useState(() => {
    // 使用本地日期而不是 UTC，確保獲取正確的今天日期
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  const [flightData, setFlightData] = useState(null)
  const [status, setStatus] = useState({ message: '', type: '' })
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [viewMode, setViewMode] = useState('simple') // 'detailed' 或 'simple'
  const [activeTab, setActiveTab] = useState('data') // 'data' 或 'statistics'
  const [lastUpdated, setLastUpdated] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null)
  const [multiDayData, setMultiDayData] = useState([]) // 多天數據
  const [loadingMultiDay, setLoadingMultiDay] = useState(false)
  const [hideExpiredFlights, setHideExpiredFlights] = useState(false) // 隱藏已過期航班
  const [selectedFlight, setSelectedFlight] = useState(null) // 選中的航班（用於顯示詳細資料）
  const [dataValidation, setDataValidation] = useState({ warnings: [], errors: [] }) // 資料驗證結果
  const [dataDiff, setDataDiff] = useState(null) // 資料差異
  const previousFlightDataRef = useRef(null) // 保存上次載入的資料
  const abortControllerRef = useRef(null)
  const exportTableRef = useRef(null)
  const [updateLogs, setUpdateLogs] = useState([]) // 更新日誌
  const [showUpdateLog, setShowUpdateLog] = useState(false) // 顯示更新日誌 Modal
  const [selectedLogDetail, setSelectedLogDetail] = useState(null) // 選中的日誌詳細資料
  const [deploymentLogs, setDeploymentLogs] = useState([]) // 部署記錄

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  // 資料驗證函數
  const validateFlightData = (data, date) => {
    const warnings = []
    const errors = []

    // 檢查基本結構
    if (!data) {
      errors.push('資料為空')
      return { warnings, errors }
    }

    if (!data.flights || !Array.isArray(data.flights)) {
      errors.push('缺少 flights 陣列')
      return { warnings, errors }
    }

    if (!data.summary) {
      warnings.push('缺少 summary 資訊')
    }

    // 檢查日期是否匹配
    if (data.date && data.date !== date) {
      warnings.push(`資料日期 (${data.date}) 與請求日期 (${date}) 不匹配`)
    }

    // 檢查航班資料完整性
    // 注意：實際資料使用 flight_code 而不是 flight
    const requiredFields = ['time', 'gate', 'flight_code']
    const missingFields = []
    const invalidFlights = []

    data.flights.forEach((flight, index) => {
      requiredFields.forEach(field => {
        const value = flight[field]
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          missingFields.push(`航班 ${index + 1} 缺少 ${field}`)
        }
      })

      // 檢查時間格式
      if (flight.time && !/^\d{2}:\d{2}$/.test(flight.time)) {
        invalidFlights.push(`航班 ${index + 1} 時間格式錯誤: ${flight.time}`)
      }

      // 檢查登機門格式
      if (flight.gate && !/^D1[1-8]R?$/.test(flight.gate)) {
        warnings.push(`航班 ${index + 1} 登機門不在 D11-D18 範圍: ${flight.gate}`)
      }
    })

    if (missingFields.length > 0) {
      errors.push(...missingFields.slice(0, 5)) // 只顯示前 5 個錯誤
      if (missingFields.length > 5) {
        errors.push(`... 還有 ${missingFields.length - 5} 個錯誤`)
      }
    }

    if (invalidFlights.length > 0) {
      errors.push(...invalidFlights.slice(0, 3)) // 只顯示前 3 個錯誤
    }

    // 檢查 summary 數據一致性
    if (data.summary) {
      const actualTotal = data.flights.length
      const reportedTotal = data.summary.total_flights || 0
      
      if (Math.abs(actualTotal - reportedTotal) > 0) {
        warnings.push(`航班總數不一致：實際 ${actualTotal} 班，報告 ${reportedTotal} 班`)
      }

      const before17 = data.flights.filter(f => {
        const hour = parseInt(f.time?.split(':')[0] || 0)
        return hour < 17
      }).length
      const after17 = data.flights.length - before17

      if (data.summary['before_17:00'] !== undefined) {
        const reportedBefore = data.summary['before_17:00']
        if (Math.abs(before17 - reportedBefore) > 0) {
          warnings.push(`17:00 前航班數不一致：實際 ${before17} 班，報告 ${reportedBefore} 班`)
        }
      }

      if (data.summary['after_17:00'] !== undefined) {
        const reportedAfter = data.summary['after_17:00']
        if (Math.abs(after17 - reportedAfter) > 0) {
          warnings.push(`17:00 後航班數不一致：實際 ${after17} 班，報告 ${reportedAfter} 班`)
        }
      }
    }

    // 檢查是否有航班資料
    if (data.flights.length === 0) {
      warnings.push('當天沒有航班資料')
    }

    return { warnings, errors }
  }

  // 計算資料差異
  const calculateDataDiff = (oldData, newData) => {
    const changes = {
      added: [],
      removed: [],
      modified: [],
      totalChange: 0
    }

    if (!oldData || !newData || !oldData.flights || !newData.flights) {
      return changes
    }

    // 創建航班索引（使用時間+登機門+航班號作為唯一標識）
    const oldFlightsMap = new Map()
    oldData.flights.forEach(flight => {
      const key = `${flight.time}_${flight.gate}_${flight.flight_code || flight.flight || ''}`
      oldFlightsMap.set(key, flight)
    })

    const newFlightsMap = new Map()
    newData.flights.forEach(flight => {
      const key = `${flight.time}_${flight.gate}_${flight.flight_code || flight.flight || ''}`
      newFlightsMap.set(key, flight)
    })

    // 找出新增的航班
    newFlightsMap.forEach((flight, key) => {
      if (!oldFlightsMap.has(key)) {
        changes.added.push(flight)
      }
    })

    // 找出移除的航班
    oldFlightsMap.forEach((flight, key) => {
      if (!newFlightsMap.has(key)) {
        changes.removed.push(flight)
      }
    })

    // 找出修改的航班（狀態變化）
    newFlightsMap.forEach((newFlight, key) => {
      const oldFlight = oldFlightsMap.get(key)
      if (oldFlight && oldFlight.status !== newFlight.status) {
        changes.modified.push({
          old: oldFlight,
          new: newFlight
        })
      }
    })

    changes.totalChange = newData.flights.length - oldData.flights.length

    return changes
  }

  const formatLastUpdated = (date) => {
    if (!date) return ''
    
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return '剛剛更新'
    if (minutes < 60) return `${minutes} 分鐘前更新`
    if (hours < 24) return `${hours} 小時前更新`
    if (days < 7) return `${days} 天前更新`
    
    // 超過一週，顯示完整日期時間
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 載入航班資料
  const loadFlightData = useCallback(async (date, signal = null) => {
    if (!date) {
      setStatus({ message: '請選擇日期', type: 'error' })
      return
    }

    // 取消之前的請求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // 創建新的 AbortController
    const controller = new AbortController()
    abortControllerRef.current = controller
    const abortSignal = signal || controller.signal

    // 先更新狀態訊息，但不立即清除舊資料（避免跳動）
    // 只有在沒有現有資料時才設置 loading 狀態，避免閃爍
    if (!flightData) {
      setLoading(true)
    }
    setStatus({ message: '正在載入資料...', type: 'loading' })
    setLoadingProgress(0)

    // 根據實際路徑調整
    // 生產環境：/Brainless/data/ (GitHub Pages)
    // 開發環境：/data/ (本地開發)
    const basePath = import.meta.env.PROD ? '/Brainless/data/' : '/data/'
    const dataUrl = `${basePath}flight-data-${date}.json`
    
    console.log('[FlightData] 載入資料:', { date, dataUrl, timestamp: new Date().toISOString() })

    try {
      // 模擬載入進度
      setLoadingProgress(30)
      
      const response = await fetch(dataUrl, { signal: abortSignal })
      setLoadingProgress(60)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`找不到 ${date} 的航班資料`)
        }
        throw new Error(`HTTP 錯誤: ${response.status}`)
      }

      const data = await response.json()
      setLoadingProgress(80)
      
      // 資料驗證
      const validation = validateFlightData(data, date)
      setDataValidation(validation)
      
      // 如果有嚴重錯誤，不載入資料
      if (validation.errors.length > 0) {
        throw new Error(`資料驗證失敗：${validation.errors.join(', ')}`)
      }
      
      // 取得最後更新時間
      const lastModified = response.headers.get('last-modified')
      let updateTime = null
      
      if (lastModified) {
        updateTime = new Date(lastModified)
      } else if (data.updated_at) {
        // 如果 JSON 中有 updated_at 欄位
        updateTime = new Date(data.updated_at)
      } else {
        // 如果都沒有，使用當前時間
        updateTime = new Date()
      }
      
      setLastUpdated(updateTime)
      setLoadingProgress(100)
      
      // 計算資料差異
      let diff = null
      const isSameDate = previousFlightDataRef.current && previousFlightDataRef.current.date === data.date
      
      if (isSameDate) {
        diff = calculateDataDiff(previousFlightDataRef.current, data)
        setDataDiff(diff)
      } else {
        setDataDiff(null)
        // 如果日期不同，清除之前的差異顯示
      }
      
      // 記錄更新日誌（在計算 dataDiff 之後）
      // 只在以下情況記錄日誌：
      // 1. 有實質變化（isSameDate && diff 有變化）
      // 2. 用戶主動載入（不是自動刷新或初始化載入）
      // 3. 首次載入該日期（但不在頁面初始化時記錄，避免刷新時重複記錄）
      try {
        // 檢查是否應該記錄日誌
        const shouldLog = 
          (isSameDate && diff && (diff.added.length > 0 || diff.removed.length > 0 || diff.modified.length > 0)) || // 有實質變化
          (!isSameDate && previousFlightDataRef.current !== null) // 切換日期（但不是首次初始化）
        
        if (shouldLog) {
          const logEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(), // 使用 ISO 字符串以便序列化
            date: date,
            flightCount: data.flights?.length || 0,
            summary: data.summary || {},
            hasChanges: isSameDate && diff && (diff.added.length > 0 || diff.removed.length > 0 || diff.modified.length > 0),
            changes: isSameDate ? diff : null,
            isFirstLoad: !isSameDate && previousFlightDataRef.current !== null // 標記是否為首次載入該日期（排除初始化）
          }
          
          // 從 localStorage 讀取現有日誌
          let existingLogs = []
          try {
            const stored = localStorage.getItem('flightDataUpdateLogs')
            if (stored) {
              existingLogs = JSON.parse(stored)
            }
          } catch (e) {
            console.warn('無法讀取更新日誌:', e)
            existingLogs = []
          }
          
          // 檢查是否已經有相同的記錄（避免重複記錄）
          // 如果最近 1 分鐘內有相同日期的記錄，且沒有變化，則不記錄
          const now = Date.now()
          const oneMinuteAgo = now - 60 * 1000
          const recentSameDateLog = existingLogs.find(log => 
            log.date === date && 
            new Date(log.timestamp).getTime() > oneMinuteAgo &&
            !log.hasChanges
          )
          
          // 如果有實質變化，或者沒有最近的相同記錄，則記錄
          if (logEntry.hasChanges || !recentSameDateLog) {
            // 只保留最近 100 條，避免 localStorage 過大
            const newLogs = [logEntry, ...existingLogs].slice(0, 100)
            
            try {
              localStorage.setItem('flightDataUpdateLogs', JSON.stringify(newLogs))
              setUpdateLogs(newLogs)
            } catch (e) {
              console.warn('無法保存更新日誌（可能 localStorage 已滿）:', e)
              // 如果存儲失敗，至少更新狀態（不包含新條目）
              setUpdateLogs(existingLogs)
            }
          }
        }
      } catch (error) {
        console.error('記錄更新日誌時出錯:', error)
        // 不影響主要功能，繼續執行
      }

      // 保存當前資料作為下次比較的基準
      previousFlightDataRef.current = { ...data }

      // 一次性更新資料和狀態，減少重新渲染
      // 使用函數式更新確保狀態更新是原子的
      setFlightData(prevData => {
        // 如果資料相同，不更新以避免不必要的重新渲染
        if (prevData && prevData.date === data.date) {
          return prevData
        }
        return data
      })
      setStatus({ message: `✅ 成功載入 ${formatDate(date)} 的資料`, type: 'success' })
      setLoading(false)
      setLoadingProgress(0)
    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus({ message: '載入已取消', type: 'error' })
      } else {
        setStatus({ message: `❌ 錯誤: ${error.message}`, type: 'error' })
      }
      // 只有在錯誤時才清除資料
      setFlightData(null)
      setLoading(false)
      setLoadingProgress(0)
    } finally {
      // 確保 loading 狀態被清除
      if (loading) {
        setLoading(false)
      }
      setLoadingProgress(0)
      abortControllerRef.current = null
    }
    // formatDate 是純函數，不需要作為依賴項
    // 注意：這裡不包含 flightData 和 loading，避免無限循環
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLoadData = () => {
    loadFlightData(selectedDate)
  }

  const handleLoadToday = () => {
    // 使用本地日期而不是 UTC
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`
    setSelectedDate(today)
    loadFlightData(today)
  }

  const handleLoadYesterday = () => {
    // 使用本地日期而不是 UTC，確保獲取正確的昨天日期
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const year = yesterday.getFullYear()
    const month = String(yesterday.getMonth() + 1).padStart(2, '0')
    const day = String(yesterday.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    setSelectedDate(dateStr)
    loadFlightData(dateStr)
  }

  const handleCancelLoad = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  // 載入多天數據（從 GitHub data/ 資料夾讀取歷史資料）
  const loadMultiDayData = useCallback(async (days = 7) => {
    setLoadingMultiDay(true)
    
    try {
      // 直接從 GitHub data/ 資料夾讀取 JSON 檔案
      const basePath = import.meta.env.PROD ? '/Brainless/data/' : '/data/'
      const today = new Date()
      const dataPromises = []
      
      // 嘗試讀取最多 days 天的資料
      for (let i = 0; i < days; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        // 使用本地日期而不是 UTC
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`
        const dataUrl = `${basePath}flight-data-${dateStr}.json`
        
        dataPromises.push(
          fetch(dataUrl)
            .then(res => {
              if (res.ok) {
                return res.json().then(data => ({ data, dateStr }))
              }
              return null
            })
            .catch(() => null)
        )
      }
      
      const results = await Promise.all(dataPromises)
      const validData = results
        .map((result) => {
          if (!result || !result.data) return null
          const date = new Date(result.dateStr)
          return {
            date: result.dateStr,
            dateLabel: date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
            totalFlights: result.data.summary?.total_flights || 0,
            flights: result.data.flights || []
          }
        })
        .filter(Boolean)
        .reverse() // 從舊到新排序
      
      console.log(`✅ 從 GitHub data/ 資料夾載入 ${validData.length} 天的資料`)
      setMultiDayData(validData)
    } catch (error) {
      console.error('載入多天數據失敗:', error)
      setMultiDayData([])
    } finally {
      setLoadingMultiDay(false)
    }
  }, [])

  // 當切換到統計 Tab 時自動載入多天數據
  useEffect(() => {
    if (activeTab === 'statistics' && multiDayData.length === 0) {
      loadMultiDayData(7)
    }
  }, [activeTab, multiDayData.length, loadMultiDayData])

  // 載入部署記錄的函數
  const loadDeploymentLogs = useCallback(async () => {
    try {
      const basePath = import.meta.env.PROD ? '/Brainless/data/' : '/data/'
      const response = await fetch(`${basePath}deployment-log.json?t=${Date.now()}`) // 添加時間戳避免緩存
      if (response.ok) {
        const data = await response.json()
        setDeploymentLogs(data.deployments || [])
      } else {
        console.warn('無法載入部署記錄:', response.status)
        setDeploymentLogs([])
      }
    } catch (error) {
      console.warn('載入部署記錄失敗:', error)
      setDeploymentLogs([])
    }
  }, [])

  // 初始化：從 localStorage 載入更新日誌，並從服務器載入部署記錄
  useEffect(() => {
    const logs = JSON.parse(localStorage.getItem('flightDataUpdateLogs') || '[]')
    setUpdateLogs(logs)
    
    // 載入部署記錄
    loadDeploymentLogs()
  }, [loadDeploymentLogs])

  // 自動載入今天的資料（只在組件掛載時執行一次）
  useEffect(() => {
    // 強制計算今天的日期，使用本地時區
    const getTodayDate = () => {
      const now = new Date()
      // 使用本地時區的日期組件，避免 UTC 時區問題
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const day = now.getDate()
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    
    const today = getTodayDate()
    
    // 強制更新 selectedDate 為今天
    setSelectedDate(today)
    
    // 立即載入今天的資料（不檢查 selectedDate，因為它可能還是舊值）
    console.log('[FlightData] 初始化：載入今天的資料', today)
    loadFlightData(today)
    
    // 清理函數
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 自動刷新功能
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadFlightData(selectedDate)
      }, 5 * 60 * 1000) // 每 5 分鐘
      setAutoRefreshInterval(interval)
      
      return () => clearInterval(interval)
    } else {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval)
        setAutoRefreshInterval(null)
      }
    }
  }, [autoRefresh, selectedDate, loadFlightData])

  // ESC 鍵關閉 Modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && selectedFlight) {
        setSelectedFlight(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [selectedFlight])

  // 計算統計資料
  const statistics = useMemo(() => {
    if (!flightData || !flightData.flights) return null

    // 各登機門的航班數量分布
    const gateDistribution = {}
    flightData.flights.forEach(flight => {
      const gate = flight.gate
      gateDistribution[gate] = (gateDistribution[gate] || 0) + 1
    })

    // 時間分布（每小時航班數）
    const hourlyDistribution = {}
    flightData.flights.forEach(flight => {
      const hour = parseInt(flight.time.split(':')[0])
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1
    })

    // 轉換為圖表格式
    const gateChartData = Object.entries(gateDistribution)
      .map(([gate, count]) => ({ name: gate, value: count }))
      .sort((a, b) => a.name.localeCompare(b.name))

    const hourlyChartData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      count: hourlyDistribution[hour] || 0
    }))

    return {
      gateDistribution: gateChartData,
      hourlyDistribution: hourlyChartData
    }
  }, [flightData])

  // 計算每天每小時的趨勢數據
  const hourlyTrendingData = useMemo(() => {
    if (!multiDayData || multiDayData.length === 0) return null

    // 創建每小時的數據結構
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const hourStr = `${hour.toString().padStart(2, '0')}:00`
      const dataPoint = { hour: hourStr }
      
      multiDayData.forEach(day => {
        const hourCount = day.flights.filter(flight => {
          const flightHour = parseInt(flight.time.split(':')[0])
          return flightHour === hour
        }).length
        dataPoint[day.dateLabel] = hourCount
      })
      
      return dataPoint
    })

    return {
      data: hourlyData,
      dates: multiDayData.map(d => d.dateLabel)
    }
  }, [multiDayData])

  // 計算多日最繁忙時段
  const busiestHours = useMemo(() => {
    if (!multiDayData || multiDayData.length === 0) return null

    // 統計所有天數中每小時的總航班數
    const hourlyTotal = Array.from({ length: 24 }, () => 0)
    
    multiDayData.forEach(day => {
      day.flights.forEach(flight => {
        const hour = parseInt(flight.time.split(':')[0])
        hourlyTotal[hour]++
      })
    })

    // 計算平均每小時航班數
    const hourlyAverage = hourlyTotal.map(count => count / multiDayData.length)

    // 找出最繁忙的時段（前 3 名）
    const hoursWithCount = hourlyAverage.map((avg, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      average: Math.round(avg * 10) / 10, // 保留一位小數
      total: hourlyTotal[hour]
    })).sort((a, b) => b.average - a.average).slice(0, 3)

    return {
      topHours: hoursWithCount,
      hourlyData: hourlyAverage.map((avg, hour) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        average: Math.round(avg * 10) / 10,
        total: hourlyTotal[hour]
      }))
    }
  }, [multiDayData])

  // 計算歷史趨勢對比（與上週/上月）
  const historicalComparison = useMemo(() => {
    if (!multiDayData || multiDayData.length === 0) return null

    const today = new Date()
    const currentPeriod = {
      totalFlights: multiDayData.reduce((sum, day) => sum + day.totalFlights, 0),
      averagePerDay: multiDayData.reduce((sum, day) => sum + day.totalFlights, 0) / multiDayData.length,
      days: multiDayData.length
    }

    // 計算上週同期（7天前開始的相同天數）
    const lastWeekStart = new Date(today)
    lastWeekStart.setDate(today.getDate() - 7 - currentPeriod.days + 1)
    
    // 計算上月同期（30天前開始的相同天數）
    const lastMonthStart = new Date(today)
    lastMonthStart.setDate(today.getDate() - 30 - currentPeriod.days + 1)

    // 注意：這裡只是計算結構，實際數據需要從歷史資料中讀取
    // 目前先返回結構，未來可以擴展為實際讀取歷史資料
    return {
      current: currentPeriod,
      lastWeek: {
        // 這裡需要實際讀取上週的資料，暫時返回 null
        totalFlights: null,
        averagePerDay: null,
        change: null
      },
      lastMonth: {
        // 這裡需要實際讀取上月的資料，暫時返回 null
        totalFlights: null,
        averagePerDay: null,
        change: null
      }
    }
  }, [multiDayData])

  // 計算登機門使用熱度（熱力圖數據）
  const gateHeatmapData = useMemo(() => {
    if (!multiDayData || multiDayData.length === 0) {
      // 如果沒有多天數據，使用當天數據
      if (!flightData || !flightData.flights) return null
      
      const gateCounts = {}
      flightData.flights.forEach(flight => {
        const gate = flight.gate
        gateCounts[gate] = (gateCounts[gate] || 0) + 1
      })
      
      const gates = ['D11', 'D11R', 'D12', 'D12R', 'D13', 'D13R', 'D14', 'D14R', 'D15', 'D15R', 'D16', 'D16R', 'D17', 'D17R', 'D18', 'D18R']
      const maxCount = Math.max(...Object.values(gateCounts), 1)
      
      return {
        data: gates.map(gate => ({
          gate,
          count: gateCounts[gate] || 0,
          intensity: gateCounts[gate] ? (gateCounts[gate] / maxCount) : 0
        })),
        maxCount
      }
    }

    // 多天數據：統計每個登機門的總使用次數
    const gateCounts = {}
    multiDayData.forEach(day => {
      day.flights.forEach(flight => {
        const gate = flight.gate
        gateCounts[gate] = (gateCounts[gate] || 0) + 1
      })
    })

    const gates = ['D11', 'D11R', 'D12', 'D12R', 'D13', 'D13R', 'D14', 'D14R', 'D15', 'D15R', 'D16', 'D16R', 'D17', 'D17R', 'D18', 'D18R']
    const maxCount = Math.max(...Object.values(gateCounts), 1)
    const averagePerDay = maxCount / multiDayData.length

    return {
      data: gates.map(gate => ({
        gate,
        count: gateCounts[gate] || 0,
        average: gateCounts[gate] ? (gateCounts[gate] / multiDayData.length) : 0,
        intensity: gateCounts[gate] ? (gateCounts[gate] / maxCount) : 0
      })),
      maxCount,
      averagePerDay
    }
  }, [multiDayData, flightData])

  // 統計卡片數據（移到頂部，避免在條件性 JSX 中使用 useMemo）
  const summaryCards = useMemo(() => {
    if (!flightData || !flightData.summary) return null
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 sm:p-6 text-center text-white">
          <h3 className="text-xs sm:text-sm opacity-90 mb-2">總航班數</h3>
          <div className="text-3xl sm:text-4xl font-bold mb-1">
            {flightData.summary.total_flights ?? 0}
          </div>
          <div className="text-xs opacity-80">班</div>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-red-500 rounded-xl p-4 sm:p-6 text-center text-white">
          <h3 className="text-xs sm:text-sm opacity-90 mb-2">17:00 前</h3>
          <div className="text-3xl sm:text-4xl font-bold mb-1">
            {flightData.summary['before_17:00'] ?? flightData.summary.before_17_00 ?? 0}
          </div>
          <div className="text-xs opacity-80">班</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl p-4 sm:p-6 text-center text-white">
          <h3 className="text-xs sm:text-sm opacity-90 mb-2">17:00 後</h3>
          <div className="text-3xl sm:text-4xl font-bold mb-1">
            {flightData.summary['after_17:00'] ?? flightData.summary.after_17_00 ?? 0}
          </div>
          <div className="text-xs opacity-80">班</div>
        </div>
      </div>
    )
  }, [flightData])

  // 檢查即將出發的航班（1小時內）
  const isUpcomingFlight = useCallback((flight) => {
    if (!flight.datetime) return false
    const flightTime = new Date(flight.datetime)
    const now = new Date()
    const diff = flightTime - now
    // 1小時內且尚未出發
    return diff > 0 && diff <= 60 * 60 * 1000 && !flight.status.includes('DEPARTED')
  }, [])

  // 檢查航班是否已過期（時間已超過當前時間）
  const isExpiredFlight = useCallback((flight) => {
    // 如果狀態顯示已出發，則視為已過期
    if (flight.status && (flight.status.includes('DEPARTED') || flight.status.includes('已出發'))) {
      return true
    }
    
    // 如果有 datetime，使用它來判斷
    if (flight.datetime) {
      const flightTime = new Date(flight.datetime)
      const now = new Date()
      return flightTime < now
    }
    
    // 如果沒有 datetime，嘗試從 selectedDate 和 time 構建
    if (flight.time && selectedDate) {
      try {
        const [hours, minutes] = flight.time.split(':')
        const flightDateTime = new Date(`${selectedDate}T${hours}:${minutes}:00`)
        const now = new Date()
        return flightDateTime < now
      } catch (e) {
        return false
      }
    }
    
    return false
  }, [selectedDate])

  // 過濾航班列表
  const filteredFlights = useMemo(() => {
    if (!flightData || !flightData.flights) return []
    if (!hideExpiredFlights) return flightData.flights
    return flightData.flights.filter(flight => !isExpiredFlight(flight))
  }, [flightData, hideExpiredFlights, isExpiredFlight])

  // 匯出為 PNG
  const exportToPNG = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default
      
      if (!exportTableRef.current) {
        alert('找不到要匯出的表格')
        return
      }

      const canvas = await html2canvas(exportTableRef.current, {
        backgroundColor: '#fafafa',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      })

      const link = document.createElement('a')
      const dateStr = selectedDate.replace(/-/g, '')
      link.download = `航班資料_${dateStr}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      link.click()
    } catch (error) {
      console.error('匯出圖片失敗:', error)
      alert(`匯出圖片失敗：${error.message}`)
    }
  }

  // 骨架屏組件
  const SkeletonScreen = () => (
    <div className="space-y-4 animate-pulse">
      <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-purple-500/25 via-pink-500/20 to-purple-500/25 border-b-2 border-purple-500/40">
                <th className="px-5 py-4"><div className="h-4 bg-white/20 rounded w-16"></div></th>
                <th className="px-5 py-4"><div className="h-4 bg-white/20 rounded w-20"></div></th>
                <th className="px-5 py-4"><div className="h-4 bg-white/20 rounded w-24"></div></th>
                <th className="px-5 py-4"><div className="h-4 bg-white/20 rounded w-20"></div></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="border-b border-white/10">
                  <td className="px-5 py-4"><div className="h-5 bg-white/10 rounded w-12"></div></td>
                  <td className="px-5 py-4"><div className="h-6 bg-white/10 rounded w-16"></div></td>
                  <td className="px-5 py-4"><div className="h-4 bg-white/10 rounded w-24"></div></td>
                  <td className="px-5 py-4"><div className="h-6 bg-white/10 rounded w-20"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const FlightItem = ({ flight }) => {
    const codeshareCount = flight.codeshare_flights ? flight.codeshare_flights.length : 0
    const isUpcoming = isUpcomingFlight(flight)

    return (
      <div className={`bg-surface/40 backdrop-blur-md border rounded-lg p-4 transition-all ${
        isUpcoming 
          ? 'border-yellow-500/50 bg-yellow-500/10 shadow-lg shadow-yellow-500/20' 
          : 'border-white/10 hover:border-purple-500/30'
      }`}>
        {isUpcoming && (
          <div className="mb-2 flex items-center gap-2">
            <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">
              即將出發（1小時內）
            </span>
          </div>
        )}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-purple-400">{flight.time}</span>
            {codeshareCount > 0 && (
              <span className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded-full text-xs font-semibold">
                共同航班 {codeshareCount} 個
              </span>
            )}
          </div>
          <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
            {flight.gate}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <strong className="text-primary">航班：</strong>
            <span>{flight.flight_code}</span>
          </div>
          <div className="flex items-center gap-2">
            <strong className="text-primary">航空公司：</strong>
            <span>{flight.airline_name || flight.airline_code}</span>
          </div>
          <div className="flex items-center gap-2">
            <strong className="text-primary">目的地：</strong>
            <span>{flight.destination}</span>
          </div>
          <div className="flex items-center gap-2">
            <strong className="text-primary">狀態：</strong>
            <span>{flight.status}</span>
          </div>
          {flight.aircraft && (
            <div className="flex items-center gap-2">
              <strong className="text-primary">機型：</strong>
              <span>{flight.aircraft}</span>
            </div>
          )}
        </div>
        {codeshareCount > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <strong className="text-purple-400 text-sm block mb-2">共同航班：</strong>
            <div className="flex flex-wrap gap-2">
              {flight.codeshare_flights.map((cf, idx) => (
                <span
                  key={idx}
                  className="bg-white/10 px-2 py-1 rounded text-xs"
                >
                  {cf.flight_code} ({cf.airline_name})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // 創建 Apple 極簡風格表格 HTML（用於匯出）
  const createMinimalistTableHTML = () => {
    if (!filteredFlights || filteredFlights.length === 0) return ''

    const dateStr = formatDate(selectedDate)
    const rows = filteredFlights.map(flight => {
      const codeshareFlights = flight.codeshare_flights || []
      const allFlights = [flight.flight_code, ...codeshareFlights.map(cf => cf.flight_code)]
      const flightDisplay = allFlights.join(' / ')
      
      const status = flight.status || ''
      const getStatusColor = (status) => {
        if (status.includes('DEPARTED') || status.includes('已出發')) {
          return '#34c759'
        } else if (status.includes('BOARDING') || status.includes('登機中')) {
          return '#007aff'
        } else if (status.includes('DELAYED') || status.includes('延誤')) {
          return '#ff9500'
        } else if (status.includes('CANCELLED') || status.includes('取消')) {
          return '#ff3b30'
        } else {
          return '#8e8e93'
        }
      }
      const statusColor = getStatusColor(status)

      return `
        <tr style="background: ${filteredFlights.indexOf(flight) % 2 === 0 ? '#fafafa' : 'white'};">
          <td style="padding: 16px 20px; text-align: left; font-weight: 600; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">${flight.time}</td>
          <td style="padding: 16px 20px; text-align: center; color: #515154; font-size: 15px; border-bottom: 1px solid #e5e5e7;">
            <span style="background: #007aff; color: white; padding: 4px 12px; border-radius: 8px; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; height: 28px; line-height: 1;">${flight.gate}</span>
          </td>
          <td style="padding: 16px 20px; text-align: left; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">${flightDisplay}</td>
          <td style="padding: 16px 20px; text-align: left; color: ${statusColor}; font-size: 14px; font-weight: 500; border-bottom: 1px solid #e5e5e7;">${status || '未知'}</td>
        </tr>
      `
    }).join('')

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #fafafa; color: #1d1d1f;">
        <div style="background: white; border-radius: 20px; padding: 50px; box-shadow: 0 8px 32px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 50px;">
            <h1 style="color: #1d1d1f; margin: 0 0 12px 0; font-size: 36px; font-weight: 600; letter-spacing: -0.5px; line-height: 1.2;">桃園機場 D11-D18 航班資料</h1>
            <p style="color: #86868b; margin: 0; font-size: 17px; font-weight: 400;">${dateStr}</p>
          </div>
          
          <div style="background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e5e5e7;">
            <table style="width: 100%; border-collapse: collapse; background: white;">
              <thead>
                <tr style="background: #f5f5f7; height: 48px;">
                  <th style="padding: 0 20px; text-align: left; vertical-align: middle; font-weight: 600; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">時間</th>
                  <th style="padding: 0 20px; text-align: center; vertical-align: middle; font-weight: 600; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">登機門</th>
                  <th style="padding: 0 20px; text-align: left; vertical-align: middle; font-weight: 600; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">航班</th>
                  <th style="padding: 0 20px; text-align: left; vertical-align: middle; font-weight: 600; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">狀態</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
  }

  const handleExportPNG = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default
      
      // 創建臨時容器
      const tempContainer = document.createElement('div')
      tempContainer.innerHTML = createMinimalistTableHTML()
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '0'
      tempContainer.style.width = '800px'
      tempContainer.style.height = 'auto'
      tempContainer.style.overflow = 'visible'
      document.body.appendChild(tempContainer)
      
      // 等待渲染完成
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const canvas = await html2canvas(tempContainer.firstElementChild, {
        backgroundColor: '#fafafa',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      })
      
      // 移除臨時容器
      document.body.removeChild(tempContainer)
      
      // 創建下載連結
      const link = document.createElement('a')
      const dateStr = selectedDate.replace(/-/g, '')
      link.download = `航班資料_${dateStr}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      link.click()
    } catch (error) {
      console.error('匯出圖片失敗:', error)
      alert(`匯出圖片失敗：${error.message}`)
    }
  }

  // 圖表顏色
  const CHART_COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#3b82f6', '#f97316', '#10b981', '#ef4444', '#6366f1']

  return (
    <div className="space-y-6">
      {/* 頁面標題 - 超現代設計 - 添加 padding-top 避免被跑馬燈和導航欄遮擋（手機模式） */}
      <div className="text-center mb-6 sm:mb-8 md:mb-10 relative pt-10 sm:pt-2 md:pt-0">
        {/* 背景動態光暈 */}
        <div className="absolute inset-0 flex justify-center -z-10">
          <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow opacity-50"></div>
        </div>
        
        {/* 圖標容器 - 3D 效果 */}
        <div className="inline-flex items-center justify-center mb-4 sm:mb-5 md:mb-6 relative group title-icon-group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-blue-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
          <div className="relative inline-flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-gradient-to-br from-primary/30 via-purple-500/30 to-blue-500/30 rounded-xl sm:rounded-2xl border-2 border-primary/50 shadow-2xl shadow-primary/30 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 overflow-hidden">
            {/* 流動背景 */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient bg-[length:200%_100%]"></div>
            <PaperAirplaneIcon className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-primary relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>
        
        {/* 標題 */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-2 sm:mb-3 relative px-4">
          <span className="bg-gradient-to-r from-primary via-purple-400 via-blue-400 to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient">
            桃園機場 D11-D18 航班資料
          </span>
          {/* 文字發光效果 */}
          <span className="absolute inset-0 bg-gradient-to-r from-primary via-purple-400 via-blue-400 to-primary bg-clip-text text-transparent blur-xl opacity-30 -z-10 animate-pulse-glow">
            桃園機場 D11-D18 航班資料
          </span>
        </h1>
        
        {/* 最後更新時間和更新日誌按鈕 */}
        {lastUpdated && (
          <div className="text-sm text-text-secondary mt-2 px-4 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface/40 backdrop-blur-sm border border-white/10 rounded-lg">
              <ClockIcon className="w-4 h-4 text-primary/60" />
              <span>最後更新：{formatLastUpdated(lastUpdated)}</span>
            </span>
            <button
              onClick={() => {
                setShowUpdateLog(true)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface/40 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-surface/60 transition-colors text-primary/80 hover:text-primary"
              title="查看部署記錄"
            >
              <DocumentTextIcon className="w-4 h-4" />
              <span>更新日誌 ({deploymentLogs.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* 控制區 */}
      <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
            <label className="font-semibold text-primary text-sm sm:text-base whitespace-nowrap">選擇日期：</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                const newDate = e.target.value
                setSelectedDate(newDate)
                // 自動載入新選擇的日期
                loadFlightData(newDate)
              }}
              className="px-4 py-3 sm:py-2 border border-white/20 rounded-lg bg-surface/50 text-primary focus:outline-none focus:border-purple-500/50 text-base sm:text-sm min-h-[44px] sm:min-h-0"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={handleLoadData}
              disabled={loading}
              className="px-4 sm:px-6 py-3 sm:py-2 bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-[44px] sm:min-h-0 flex-1 sm:flex-none flex items-center justify-center gap-2"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>重新整理</span>
            </button>
            <button
              onClick={handleLoadToday}
              disabled={loading}
              className="px-4 sm:px-6 py-3 sm:py-2 bg-purple-500/50 hover:bg-purple-500/70 active:bg-purple-500/80 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm sm:text-base min-h-[44px] sm:min-h-0"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              今天
            </button>
            <button
              onClick={handleLoadYesterday}
              disabled={loading}
              className="px-4 sm:px-6 py-3 sm:py-2 bg-purple-500/50 hover:bg-purple-500/70 active:bg-purple-500/80 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm sm:text-base min-h-[44px] sm:min-h-0"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              昨天
            </button>
            {loading && (
              <button
                onClick={handleCancelLoad}
                className="px-4 py-3 sm:py-2 bg-red-500/50 hover:bg-red-500/70 active:bg-red-500/80 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px] sm:min-h-0"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="sm:hidden">取消</span>
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:ml-auto">
            <label className="flex items-center gap-2 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={hideExpiredFlights}
                onChange={(e) => setHideExpiredFlights(e.target.checked)}
                className="w-5 h-5 sm:w-4 sm:h-4 text-purple-500 rounded focus:ring-purple-500 cursor-pointer"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              />
              <span className="text-xs sm:text-sm text-text-secondary">隱藏已過期航班</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-5 h-5 sm:w-4 sm:h-4 text-purple-500 rounded focus:ring-purple-500 cursor-pointer"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              />
              <span className="text-xs sm:text-sm text-text-secondary">自動刷新（每 5 分鐘）</span>
            </label>
          </div>
        </div>
        
        {/* 載入進度條 */}
        {loading && loadingProgress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-text-secondary">載入進度</span>
              <span className="text-sm text-text-secondary">{loadingProgress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {status.message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              status.type === 'loading'
                ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30'
                : status.type === 'error'
                ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                : 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30'
            }`}
          >
            {status.message}
          </div>
        )}

        {/* 資料驗證警告和錯誤 */}
        {dataValidation.warnings.length > 0 && (
          <div className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 rounded-lg p-3 text-sm">
            <div className="font-semibold mb-2">⚠️ 資料驗證警告</div>
            <ul className="list-disc list-inside space-y-1">
              {dataValidation.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {dataValidation.errors.length > 0 && (
          <div className="bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 rounded-lg p-3 text-sm">
            <div className="font-semibold mb-2">❌ 資料驗證錯誤</div>
            <ul className="list-disc list-inside space-y-1">
              {dataValidation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 資料差異提示 */}
        {dataDiff && (dataDiff.added.length > 0 || dataDiff.removed.length > 0 || dataDiff.modified.length > 0) && (
          <div className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-lg p-3 text-sm animate-fade-in">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              資料更新差異
            </div>
            <div className="space-y-2">
              {dataDiff.totalChange !== 0 && (
                <div className="font-medium">
                  總航班數變化：<span className={dataDiff.totalChange > 0 ? 'text-green-400' : 'text-red-400'}>
                    {dataDiff.totalChange > 0 ? '+' : ''}{dataDiff.totalChange} 班
                  </span>
                </div>
              )}
              {dataDiff.added.length > 0 && (
                <div>
                  <span className="text-green-400 font-medium">新增 {dataDiff.added.length} 班：</span>
                  <div className="mt-1 space-y-1">
                    {dataDiff.added.slice(0, 3).map((flight, index) => (
                      <div key={index} className="text-xs pl-4">
                        {flight.time} {flight.gate} {flight.flight_code || flight.flight || 'N/A'}
                      </div>
                    ))}
                    {dataDiff.added.length > 3 && (
                      <div className="text-xs pl-4 text-text-secondary">... 還有 {dataDiff.added.length - 3} 班</div>
                    )}
                  </div>
                </div>
              )}
              {dataDiff.removed.length > 0 && (
                <div>
                  <span className="text-red-400 font-medium">移除 {dataDiff.removed.length} 班：</span>
                  <div className="mt-1 space-y-1">
                    {dataDiff.removed.slice(0, 3).map((flight, index) => (
                      <div key={index} className="text-xs pl-4">
                        {flight.time} {flight.gate} {flight.flight_code || flight.flight || 'N/A'}
                      </div>
                    ))}
                    {dataDiff.removed.length > 3 && (
                      <div className="text-xs pl-4 text-text-secondary">... 還有 {dataDiff.removed.length - 3} 班</div>
                    )}
                  </div>
                </div>
              )}
              {dataDiff.modified.length > 0 && (
                <div>
                  <span className="text-yellow-400 font-medium">狀態變更 {dataDiff.modified.length} 班：</span>
                  <div className="mt-1 space-y-1">
                    {dataDiff.modified.slice(0, 3).map((change, index) => (
                      <div key={index} className="text-xs pl-4">
                        {change.new.time} {change.new.gate} {change.new.flight_code || change.new.flight || 'N/A'}: 
                        <span className="text-text-secondary"> {change.old.status}</span> → 
                        <span className="text-primary"> {change.new.status}</span>
                      </div>
                    ))}
                    {dataDiff.modified.length > 3 && (
                      <div className="text-xs pl-4 text-text-secondary">... 還有 {dataDiff.modified.length - 3} 班</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tab 切換 */}
      <div className="flex gap-2 border-b border-white/10 mb-4 sm:mb-6">
        <button
          onClick={() => setActiveTab('data')}
          className={`px-4 sm:px-6 py-3 sm:py-2 font-medium transition-colors text-sm sm:text-base min-h-[44px] sm:min-h-0 ${
            activeTab === 'data'
              ? 'text-primary border-b-2 border-primary'
              : 'text-text-secondary active:text-primary'
          }`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          航班資料
        </button>
        <button
          onClick={() => setActiveTab('statistics')}
          className={`px-4 sm:px-6 py-3 sm:py-2 font-medium transition-colors text-sm sm:text-base min-h-[44px] sm:min-h-0 ${
            activeTab === 'statistics'
              ? 'text-primary border-b-2 border-primary'
              : 'text-text-secondary active:text-primary'
          }`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          統計分析
        </button>
      </div>

      {/* 航班資料 Tab */}
      {activeTab === 'data' && (
        <>
          {/* 統計卡片 - 添加動畫效果 */}
          <div className="animate-fade-in">
            {summaryCards}
          </div>

          {/* 航班列表 */}
      {loading && !flightData ? (
        <SkeletonScreen />
      ) : flightData && flightData.flights ? (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 border-b-2 border-purple-500/30 pb-3 sm:pb-2">
            <div className="flex flex-col">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                桃園機場 D11-D18 航班資料
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">航班列表</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setViewMode('simple')}
                className={`px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-semibold transition-colors text-xs sm:text-sm min-h-[44px] sm:min-h-0 ${
                  viewMode === 'simple'
                    ? 'bg-purple-500 text-white active:bg-purple-600'
                    : 'bg-surface/40 text-text-secondary active:bg-surface/60'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                簡潔模式
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-semibold transition-colors text-xs sm:text-sm min-h-[44px] sm:min-h-0 ${
                  viewMode === 'detailed'
                    ? 'bg-purple-500 text-white active:bg-purple-600'
                    : 'bg-surface/40 text-text-secondary active:bg-surface/60'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                詳細模式
              </button>
              <button
                onClick={handleExportPNG}
                className="px-3 sm:px-4 py-2.5 sm:py-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-0"
                title="匯出為 PNG"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>匯出</span>
              </button>
            </div>
          </div>
          {filteredFlights.length === 0 ? (
            <div className="text-center py-12 text-text-secondary animate-fade-in">
              <p>當天沒有航班資料</p>
            </div>
          ) : viewMode === 'simple' ? (
            <div 
              ref={exportTableRef}
              className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-lg animate-scale-in"
            >
              <div className="overflow-x-auto -mx-2 sm:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full border-collapse min-w-[600px] sm:min-w-0">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-500/25 via-pink-500/20 to-purple-500/25 border-b-2 border-purple-500/40">
                      <th className="px-3 sm:px-5 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-primary tracking-wide whitespace-nowrap">時間</th>
                      <th className="px-3 sm:px-5 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-primary tracking-wide whitespace-nowrap">登機門</th>
                      <th className="px-3 sm:px-5 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-primary tracking-wide whitespace-nowrap">航班</th>
                      <th className="px-3 sm:px-5 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-primary tracking-wide whitespace-nowrap">狀態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFlights.map((flight, idx) => {
                      const codeshareFlights = flight.codeshare_flights || []
                      const allFlights = [flight.flight_code, ...codeshareFlights.map(cf => cf.flight_code)]
                      const flightDisplay = allFlights.join(' / ')
                      const isUpcoming = isUpcomingFlight(flight)
                      
                      // 解析狀態並設定顏色
                      const status = flight.status || ''
                      const getStatusColor = (status) => {
                        if (status.includes('DEPARTED') || status.includes('已出發')) {
                          return 'bg-green-500/25 text-green-300 border-green-400/40'
                        } else if (status.includes('BOARDING') || status.includes('登機中')) {
                          return 'bg-blue-500/25 text-blue-300 border-blue-400/40'
                        } else if (status.includes('DELAYED') || status.includes('延誤')) {
                          return 'bg-yellow-500/25 text-yellow-300 border-yellow-400/40'
                        } else if (status.includes('CANCELLED') || status.includes('取消')) {
                          return 'bg-red-500/25 text-red-300 border-red-400/40'
                        } else {
                          return 'bg-gray-500/20 text-gray-300 border-gray-400/30'
                        }
                      }
                      const statusColorClass = getStatusColor(status)
                      
                      return (
                        <tr
                          key={idx}
                          onClick={() => setSelectedFlight(flight)}
                          className={`border-b border-white/10 transition-all duration-200 cursor-pointer hover:bg-purple-500/20 ${
                            isUpcoming
                              ? 'bg-yellow-500/20 active:bg-yellow-500/30'
                              : idx % 2 === 0 
                              ? 'bg-white/3 active:bg-white/10' 
                              : 'bg-white/6 active:bg-white/12'
                          }`}
                        >
                          <td className="px-3 sm:px-5 py-3 sm:py-4">
                            <span className={`font-bold text-base sm:text-lg tracking-tight drop-shadow-sm ${
                              isUpcoming ? 'text-yellow-300' : 'text-purple-300 dark:text-purple-200'
                            }`}>
                              {flight.time}
                            </span>
                          </td>
                          <td className="px-3 sm:px-5 py-3 sm:py-4">
                            <span className="bg-gradient-to-br from-purple-500 to-purple-600 text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold shadow-md inline-flex items-center justify-center min-w-[3rem] sm:min-w-[3.5rem] h-6 sm:h-7">
                              {flight.gate}
                            </span>
                          </td>
                          <td className="px-3 sm:px-5 py-3 sm:py-4">
                            <span className="text-text-secondary font-medium text-sm sm:text-base break-words">{flightDisplay}</span>
                          </td>
                          <td className="px-3 sm:px-5 py-3 sm:py-4">
                            <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border-2 ${statusColorClass} shadow-sm inline-block whitespace-nowrap`}>
                              {status || '未知'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFlights.map((flight, idx) => (
                <FlightItem key={idx} flight={flight} />
              ))}
            </div>
          )}
        </div>
      ) : null}
        </>
      )}

      {/* 航班詳細資料 Modal */}
      {selectedFlight && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedFlight(null)}
        >
          <div 
            className="bg-surface border border-white/20 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-white/10 px-6 py-4 flex items-center justify-between backdrop-blur-md">
              <h3 className="text-xl font-bold text-primary">航班詳細資料</h3>
              <button
                onClick={() => setSelectedFlight(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-primary" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <FlightItem flight={selectedFlight} />
            </div>
          </div>
        </div>
      )}

      {/* 更新日誌 Modal */}
      {showUpdateLog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowUpdateLog(false)}
        >
          <div 
            className="bg-surface border border-white/20 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-white/10 px-6 py-4 flex items-center justify-between backdrop-blur-md">
              <div>
                <h3 className="text-xl font-bold text-primary">更新日誌</h3>
                <p className="text-sm text-text-secondary mt-1">
                  部署記錄: {deploymentLogs.length} 次
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadDeploymentLogs}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="重新整理部署記錄"
                >
                  <ArrowPathIcon className="w-5 h-5 text-primary" />
                </button>
                <button
                  onClick={() => setShowUpdateLog(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-primary" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* 部署記錄區塊 */}
              {deploymentLogs.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">
                  <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>尚無部署記錄</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deploymentLogs.map((deploy, index) => (
                    <div 
                      key={index}
                      className="bg-purple-500/10 backdrop-blur-sm border border-purple-500/30 rounded-lg p-4 hover:border-purple-500/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ClockIcon className="w-4 h-4 text-purple-400" />
                          <span className="text-primary font-semibold">
                            {deploy.timestamp ? new Date(deploy.timestamp).toLocaleString('zh-TW', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            }) : '未知時間'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {deploy.hasDataUpdate ? (
                            <>
                              <span className="text-green-400 font-medium">✓ 有更新航班資料</span>
                              <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">資料更新</span>
                            </>
                          ) : (
                            <>
                              <span className="text-text-secondary">僅代碼部署</span>
                              <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">代碼更新</span>
                            </>
                          )}
                        </div>
                      </div>
                      {deploy.commitMessage && (
                        <div className="mt-2 pt-2 border-t border-purple-500/20 text-xs text-text-secondary">
                          <span className="font-medium">提交訊息：</span>
                          <span className="ml-1">{deploy.commitMessage}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 變化詳細資料 Modal */}
      {selectedLogDetail && selectedLogDetail.changes && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedLogDetail(null)}
        >
          <div 
            className="bg-surface border border-white/20 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-white/10 px-6 py-4 flex items-center justify-between backdrop-blur-md">
              <div>
                <h3 className="text-xl font-bold text-primary">變化詳細資料</h3>
                <p className="text-sm text-text-secondary mt-1">
                  {selectedLogDetail.date} - {selectedLogDetail.timestamp ? new Date(selectedLogDetail.timestamp).toLocaleString('zh-TW') : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-primary" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* 總覽 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {selectedLogDetail.changes.added.length > 0 && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                    <div className="text-green-400 font-bold text-2xl mb-1">
                      +{selectedLogDetail.changes.added.length}
                    </div>
                    <div className="text-sm text-text-secondary">新增航班</div>
                  </div>
                )}
                {selectedLogDetail.changes.removed.length > 0 && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                    <div className="text-red-400 font-bold text-2xl mb-1">
                      -{selectedLogDetail.changes.removed.length}
                    </div>
                    <div className="text-sm text-text-secondary">移除航班</div>
                  </div>
                )}
                {selectedLogDetail.changes.modified.length > 0 && (
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                    <div className="text-yellow-400 font-bold text-2xl mb-1">
                      ~{selectedLogDetail.changes.modified.length}
                    </div>
                    <div className="text-sm text-text-secondary">狀態變更</div>
                  </div>
                )}
                {selectedLogDetail.changes.totalChange !== 0 && (
                  <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
                    <div className={`font-bold text-2xl mb-1 ${
                      selectedLogDetail.changes.totalChange > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {selectedLogDetail.changes.totalChange > 0 ? '+' : ''}{selectedLogDetail.changes.totalChange}
                    </div>
                    <div className="text-sm text-text-secondary">總航班數變化</div>
                  </div>
                )}
              </div>

              {/* 新增的航班 */}
              {selectedLogDetail.changes.added.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                    <span>新增航班 ({selectedLogDetail.changes.added.length} 班)</span>
                  </h4>
                  <div className="bg-surface/40 rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                    {selectedLogDetail.changes.added.map((flight, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-green-500/10 rounded border border-green-500/20">
                        <span className="text-green-400 font-mono text-sm">{flight.time}</span>
                        <span className="bg-green-500/30 text-white px-2 py-1 rounded text-sm font-semibold">
                          {flight.gate}
                        </span>
                        <span className="text-primary font-semibold">{flight.flight_code || flight.flight || 'N/A'}</span>
                        {flight.airline_name && (
                          <span className="text-text-secondary text-sm">({flight.airline_name})</span>
                        )}
                        {flight.destination && (
                          <span className="text-text-secondary text-sm ml-auto">→ {flight.destination}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 移除的航班 */}
              {selectedLogDetail.changes.removed.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
                    <span>移除航班 ({selectedLogDetail.changes.removed.length} 班)</span>
                  </h4>
                  <div className="bg-surface/40 rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                    {selectedLogDetail.changes.removed.map((flight, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-red-500/10 rounded border border-red-500/20">
                        <span className="text-red-400 font-mono text-sm">{flight.time}</span>
                        <span className="bg-red-500/30 text-white px-2 py-1 rounded text-sm font-semibold">
                          {flight.gate}
                        </span>
                        <span className="text-primary font-semibold">{flight.flight_code || flight.flight || 'N/A'}</span>
                        {flight.airline_name && (
                          <span className="text-text-secondary text-sm">({flight.airline_name})</span>
                        )}
                        {flight.destination && (
                          <span className="text-text-secondary text-sm ml-auto">→ {flight.destination}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 狀態變更的航班 */}
              {selectedLogDetail.changes.modified.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">
                    <span>狀態變更 ({selectedLogDetail.changes.modified.length} 班)</span>
                  </h4>
                  <div className="bg-surface/40 rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                    {selectedLogDetail.changes.modified.map((change, idx) => (
                      <div key={idx} className="p-3 bg-yellow-500/10 rounded border border-yellow-500/20">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-yellow-400 font-mono text-sm">{change.new.time}</span>
                          <span className="bg-yellow-500/30 text-white px-2 py-1 rounded text-sm font-semibold">
                            {change.new.gate}
                          </span>
                          <span className="text-primary font-semibold">{change.new.flight_code || change.new.flight || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-text-secondary">狀態：</span>
                          <span className="text-red-400 line-through">{change.old.status || '未知'}</span>
                          <span className="text-primary">→</span>
                          <span className="text-green-400">{change.new.status || '未知'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 統計分析 Tab */}
      {activeTab === 'statistics' && (
        <div className="space-y-6 animate-fade-in">
          {/* 當天統計圖表 - 移到最上方 */}
          {statistics && flightData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* 各登機門航班數量分布 */}
              <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 shadow-lg">
                <h3 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4">各登機門航班數量分布（當天）</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={statistics.gateDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="name" 
                      stroke="rgba(255,255,255,0.6)"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.6)"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(30, 30, 30, 0.95)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
                      {statistics.gateDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 時間分布圖表（每小時航班數） */}
              <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 shadow-lg">
                <h3 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4">時間分布（每小時航班數）（當天）</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={statistics.hourlyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="rgba(255,255,255,0.6)"
                      style={{ fontSize: '11px' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.6)"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(30, 30, 30, 0.95)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="count" fill="#ec4899" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 控制選項 */}
          <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <span className="text-sm text-text-secondary whitespace-nowrap">載入天數：</span>
              <select
                onChange={(e) => loadMultiDayData(parseInt(e.target.value))}
                className="px-4 py-3 sm:py-2 border border-white/20 rounded-lg bg-surface/50 text-primary focus:outline-none focus:border-purple-500/50 text-base sm:text-sm min-h-[44px] sm:min-h-0"
                defaultValue="7"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <option value="3">最近 3 天</option>
                <option value="7">最近 7 天</option>
                <option value="14">最近 14 天</option>
                <option value="30">最近 30 天</option>
              </select>
              {loadingMultiDay && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>載入中...</span>
                </div>
              )}
            </div>
          </div>

          {/* 每天的統計數據（總數量） */}
          {multiDayData.length > 0 && (
            <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4">每天航班總數統計</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={multiDayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="dateLabel" 
                    stroke="rgba(255,255,255,0.6)"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.6)"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 30, 30, 0.95)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [`${value} 班`, '總航班數']}
                  />
                  <Bar dataKey="totalFlights" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 每天每小時航班數的 Trending */}
          {hourlyTrendingData && hourlyTrendingData.data && (
            <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4">每小時航班數趨勢（多天比較）</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={hourlyTrendingData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="rgba(255,255,255,0.6)"
                    style={{ fontSize: '11px' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.6)"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 30, 30, 0.95)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  {hourlyTrendingData.dates.map((date, index) => (
                    <Line 
                      key={date}
                      type="monotone" 
                      dataKey={date} 
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}


          {/* 多日最繁忙時段 */}
          {busiestHours && busiestHours.topHours.length > 0 && (
            <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4">最繁忙時段（多日平均）</h3>
              <div className="space-y-3">
                {busiestHours.topHours.map((item, index) => (
                  <div key={item.hour} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        'bg-amber-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-primary font-semibold">{item.hour}</div>
                        <div className="text-xs text-text-secondary">總計 {item.total} 班</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">{item.average} 班/天</div>
                      <div className="text-xs text-text-secondary">平均</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={busiestHours.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="rgba(255,255,255,0.6)"
                      style={{ fontSize: '10px' }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.6)"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(30, 30, 30, 0.95)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [`${value} 班/天`, '平均航班數']}
                    />
                    <Bar dataKey="average" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 登機門使用熱度熱力圖 */}
          {gateHeatmapData && (
            <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4">
                登機門使用熱度
                {multiDayData.length > 0 && (
                  <span className="text-sm font-normal text-text-secondary ml-2">
                    （{multiDayData.length} 天平均）
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3">
                {gateHeatmapData.data.map((item) => {
                  // 根據強度計算顏色
                  const getColor = (intensity) => {
                    if (intensity === 0) return 'bg-white/5'
                    if (intensity < 0.25) return 'bg-blue-500/30'
                    if (intensity < 0.5) return 'bg-green-500/50'
                    if (intensity < 0.75) return 'bg-yellow-500/70'
                    return 'bg-red-500/90'
                  }
                  
                  return (
                    <div
                      key={item.gate}
                      className={`${getColor(item.intensity)} rounded-lg p-3 sm:p-4 text-center transition-all duration-300 hover:scale-105 cursor-pointer border border-white/10`}
                      title={`${item.gate}: ${item.count} 班${multiDayData.length > 0 ? ` (平均 ${item.average.toFixed(1)} 班/天)` : ''}`}
                    >
                      <div className="text-xs sm:text-sm font-bold text-primary mb-1">{item.gate}</div>
                      <div className="text-lg sm:text-xl font-bold text-white">
                        {multiDayData.length > 0 ? item.average.toFixed(1) : item.count}
                      </div>
                      {multiDayData.length > 0 && (
                        <div className="text-xs text-white/70 mt-1">總 {item.count}</div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>使用強度</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-white/5"></div>
                      <span>低</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-blue-500/30"></div>
                      <span>中低</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-500/50"></div>
                      <span>中</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-yellow-500/70"></div>
                      <span>中高</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-500/90"></div>
                      <span>高</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 歷史趨勢對比 */}
          {historicalComparison && (
            <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4">歷史趨勢對比</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 當前期間 */}
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg p-4 border border-purple-500/30">
                  <div className="text-sm text-text-secondary mb-2">當前期間</div>
                  <div className="text-2xl font-bold text-primary mb-1">{Math.round(historicalComparison.current.averagePerDay)}</div>
                  <div className="text-xs text-text-secondary">平均 {historicalComparison.current.days} 天</div>
                  <div className="text-sm text-primary mt-2">總計 {historicalComparison.current.totalFlights} 班</div>
                </div>
                
                {/* 上週同期 */}
                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg p-4 border border-blue-500/30">
                  <div className="text-sm text-text-secondary mb-2">上週同期</div>
                  {historicalComparison.lastWeek.totalFlights !== null ? (
                    <>
                      <div className="text-2xl font-bold text-primary mb-1">{Math.round(historicalComparison.lastWeek.averagePerDay)}</div>
                      <div className="text-xs text-text-secondary">平均 {historicalComparison.current.days} 天</div>
                      <div className={`text-sm mt-2 ${
                        historicalComparison.lastWeek.change > 0 ? 'text-green-400' : 
                        historicalComparison.lastWeek.change < 0 ? 'text-red-400' : 'text-text-secondary'
                      }`}>
                        {historicalComparison.lastWeek.change > 0 ? '↑' : historicalComparison.lastWeek.change < 0 ? '↓' : '='} 
                        {Math.abs(historicalComparison.lastWeek.change)}%
                      </div>
                    </>
                  ) : (
                    <div className="text-text-secondary text-sm">資料不足</div>
                  )}
                </div>
                
                {/* 上月同期 */}
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg p-4 border border-green-500/30">
                  <div className="text-sm text-text-secondary mb-2">上月同期</div>
                  {historicalComparison.lastMonth.totalFlights !== null ? (
                    <>
                      <div className="text-2xl font-bold text-primary mb-1">{Math.round(historicalComparison.lastMonth.averagePerDay)}</div>
                      <div className="text-xs text-text-secondary">平均 {historicalComparison.current.days} 天</div>
                      <div className={`text-sm mt-2 ${
                        historicalComparison.lastMonth.change > 0 ? 'text-green-400' : 
                        historicalComparison.lastMonth.change < 0 ? 'text-red-400' : 'text-text-secondary'
                      }`}>
                        {historicalComparison.lastMonth.change > 0 ? '↑' : historicalComparison.lastMonth.change < 0 ? '↓' : '='} 
                        {Math.abs(historicalComparison.lastMonth.change)}%
                      </div>
                    </>
                  ) : (
                    <div className="text-text-secondary text-sm">資料不足</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 空狀態 */}
          {!loadingMultiDay && multiDayData.length === 0 && (
            <div className="text-center py-12 text-text-secondary">
              <p>請選擇載入天數以查看統計數據</p>
            </div>
          )}
        </div>
      )}

      {/* 空狀態 - 只在沒有資料且不在載入時顯示 */}
      {!loading && !flightData && (
        <div className="text-center py-12 text-text-secondary">
          <div className="w-20 h-20 mx-auto mb-4 opacity-50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">請選擇日期載入航班資料</h3>
          <p>選擇上方日期並點擊「重新整理」按鈕</p>
        </div>
      )}
    </div>
  )
}

export default FlightDataContent
