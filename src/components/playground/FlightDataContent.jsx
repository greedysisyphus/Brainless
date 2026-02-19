import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { PaperAirplaneIcon, ArrowPathIcon, XMarkIcon, ArrowDownTrayIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import * as echarts from 'echarts'
import { isPublicHoliday2026, isPreHoliday2026 } from '../../utils/taiwanHolidays2026'
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
  const [lastWeekData, setLastWeekData] = useState([]) // 上週同期（供歷史趨勢對比）
  const [lastMonthData, setLastMonthData] = useState([]) // 上月同期（供歷史趨勢對比）
  const [lastYearData, setLastYearData] = useState([]) // 去年同期（供歷史趨勢對比）
  const [loadingMultiDay, setLoadingMultiDay] = useState(false)
  const [loadingHistorical, setLoadingHistorical] = useState(false)
  const [hideExpiredFlights, setHideExpiredFlights] = useState(false) // 隱藏已過期航班
  const [selectedFlight, setSelectedFlight] = useState(null) // 選中的航班（用於顯示詳細資料）
  const [dataValidation, setDataValidation] = useState({ warnings: [], errors: [] }) // 資料驗證結果
  const [dataDiff, setDataDiff] = useState(null) // 資料差異
  const previousFlightDataRef = useRef(null) // 保存上次載入的資料
  const abortControllerRef = useRef(null)
  const exportTableRef = useRef(null)
  const exportStatisticsRef = useRef(null) // 統計分析匯出用
  const heatmapRef = useRef(null) // 每小時航班數熱力圖（統計分析）
  const dailyTotalChartRef = useRef(null)
  const destTop10Ref = useRef(null)
  const airlineTop10Ref = useRef(null)
  const hourlyDistRef = useRef(null) // 當天每小時航班數（ECharts）
  const multiDayHourlyTrendRef = useRef(null) // 每小時航班數趨勢（多天比較）ECharts
  const historicalLoadMountedRef = useRef(true)
  const [updateLogs, setUpdateLogs] = useState([]) // 更新日誌
  const [selectedChartDetail, setSelectedChartDetail] = useState(null) // 選中的圖表詳細資訊
  const [showUpdateLog, setShowUpdateLog] = useState(false) // 顯示更新日誌 Modal
  const [selectedLogDetail, setSelectedLogDetail] = useState(null) // 選中的日誌詳細資料
  const [deploymentLogs, setDeploymentLogs] = useState([]) // 部署記錄
  const [destChartMode, setDestChartMode] = useState('bar') // 'bar' | 'race'（統計分析 目的地）
  const [hourlyChartMode, setHourlyChartMode] = useState('area') // 'area' | 'bar'（統計分析 當天每小時）

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
    const basePath = import.meta.env.PROD ? '/Brainless/data/' : '/data/'

    const tryLoadDate = async (tryDate) => {
      const url = `${basePath}flight-data-${tryDate}.json`
      const response = await fetch(url, { signal: abortSignal, cache: 'no-cache' })
      if (!response.ok) return null
      const text = await response.text()
      if (typeof text === 'string' && text.trimStart().startsWith('<')) return null
      try {
        const data = JSON.parse(text)
        return { data, response }
      } catch {
        return null
      }
    }

    console.log('[FlightData] 載入資料:', { date, basePath, timestamp: new Date().toISOString() })

    try {
      setLoadingProgress(30)
      let result = await tryLoadDate(date)
      setLoadingProgress(60)
      let loadedDate = date
      if (!result) {
        for (let i = 1; i <= 14; i++) {
          const d = new Date(date + 'T12:00:00')
          d.setDate(d.getDate() - i)
          const fallbackDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          result = await tryLoadDate(fallbackDate)
          if (result) {
            loadedDate = fallbackDate
            break
          }
        }
      }
      setLoadingProgress(80)
      if (!result) {
        throw new Error('找不到航班資料（請執行 npm run pull-data 或確認 data/ 內有 JSON 檔案）')
      }
      const { data, response } = result
      const effectiveDate = data.date || loadedDate
      if (loadedDate !== date) {
        setStatus({ message: `未找到 ${date} 的檔案，已顯示最近可用：${effectiveDate}`, type: 'info' })
      }

      // 資料驗證
      const validation = validateFlightData(data, effectiveDate)
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
            date: effectiveDate,
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
      if (loadedDate === date) {
        setStatus({ message: `✅ 成功載入 ${formatDate(effectiveDate)} 的資料`, type: 'success' })
      }
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
          fetch(dataUrl, { cache: 'no-cache' })
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

  // 載入上週同期、上月同期、去年同期（與當前期間相同天數與結構，供歷史趨勢對比）
  const loadHistoricalComparisonData = useCallback(async () => {
    if (!multiDayData || multiDayData.length === 0) {
      setLastWeekData([])
      setLastMonthData([])
      setLastYearData([])
      return
    }
    setLoadingHistorical(true)
    const basePath = import.meta.env.PROD ? '/Brainless/data/' : '/data/'
    const toDateStr = (d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    const parseDate = (dateStr) => {
      const [y, m, d] = dateStr.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    const weekAgoDates = multiDayData.map((day) => {
      const d = parseDate(day.date)
      d.setDate(d.getDate() - 7)
      return toDateStr(d)
    })
    const monthAgoDates = multiDayData.map((day) => {
      const d = parseDate(day.date)
      d.setDate(d.getDate() - 30)
      return toDateStr(d)
    })
    const yearAgoDates = multiDayData.map((day) => {
      const d = parseDate(day.date)
      d.setDate(d.getDate() - 365)
      return toDateStr(d)
    })
    const fetchOne = async (dateStr) => {
      try {
        const res = await fetch(`${basePath}flight-data-${dateStr}.json`, { cache: 'no-cache' })
        if (!res.ok) return null
        const text = await res.text()
        if (typeof text === 'string' && text.trimStart().startsWith('<')) return null
        const data = JSON.parse(text)
        return { data, dateStr }
      } catch {
        return null
      }
    }
    const [weekResults, monthResults, yearResults] = await Promise.all([
      Promise.all(weekAgoDates.map(fetchOne)),
      Promise.all(monthAgoDates.map(fetchOne)),
      Promise.all(yearAgoDates.map(fetchOne))
    ])
    if (!historicalLoadMountedRef.current) return
    const buildList = (results) =>
      results
        .map((r) => {
          if (!r || !r.data) return null
          const date = new Date(r.dateStr)
          const flights = r.data.flights || []
          const totalFlights = r.data.summary?.total_flights ?? flights.length
          return {
            date: r.dateStr,
            dateLabel: date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
            totalFlights,
            flights
          }
        })
        .filter(Boolean)
    setLastWeekData(buildList(weekResults))
    setLastMonthData(buildList(monthResults))
    setLastYearData(buildList(yearResults))
    if (historicalLoadMountedRef.current) setLoadingHistorical(false)
  }, [multiDayData])

  // 當多天數據載入後，自動載入上週/上月/去年同期（用於歷史趨勢對比）
  useEffect(() => {
    historicalLoadMountedRef.current = true
    if (multiDayData.length > 0) {
      loadHistoricalComparisonData()
    } else {
      setLastWeekData([])
      setLastMonthData([])
      setLastYearData([])
    }
    return () => { historicalLoadMountedRef.current = false }
  }, [multiDayData, loadHistoricalComparisonData])

  // 當切換到統計 Tab 時自動載入多天數據
  useEffect(() => {
    if (activeTab === 'statistics' && multiDayData.length === 0) {
      loadMultiDayData(30)
    }
  }, [activeTab, multiDayData.length, loadMultiDayData])

  // 載入部署記錄的函數
  const loadDeploymentLogs = useCallback(async () => {
    try {
      const basePath = import.meta.env.PROD ? '/Brainless/data/' : '/data/'
      const response = await fetch(`${basePath}deployment-log.json?t=${Date.now()}`)
      if (!response.ok) {
        setDeploymentLogs([])
        return
      }
      const text = await response.text()
      if (typeof text === 'string' && text.trimStart().startsWith('<')) {
        setDeploymentLogs([])
        return
      }
      const data = JSON.parse(text)
      setDeploymentLogs(data.deployments || [])
    } catch {
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
      const timeStr = flight.time != null ? String(flight.time) : ''
      const hour = parseInt(timeStr.split(':')[0], 10)
      if (!Number.isNaN(hour) && hour >= 0 && hour <= 23) {
        hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1
      }
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

  // 熱力圖資料：(日期, 時段) 每小時班次，供統計分析熱力圖使用
  const heatmapDataFromMultiDay = useMemo(() => {
    if (!multiDayData || multiDayData.length === 0) return []
    const countByDateHour = {}
    multiDayData.forEach(day => {
      const dateStr = day.date
      day.flights.forEach(flight => {
        const hour = parseInt(String(flight.time || '').split(':')[0], 10)
        if (!Number.isNaN(hour) && hour >= 0 && hour <= 23) {
          const key = `${dateStr}-${hour}`
          countByDateHour[key] = (countByDateHour[key] || 0) + 1
        }
      })
    })
    const dates = [...new Set(multiDayData.map(d => d.date))].sort((a, b) => a.localeCompare(b))
    const result = []
    dates.forEach(dateStr => {
      for (let h = 0; h < 24; h++) {
        result.push([dateStr, h, countByDateHour[`${dateStr}-${h}`] ?? 0])
      }
    })
    return result
  }, [multiDayData])

  // 統計分析用：多日彙總 目的地 / 航空公司 Top 10
  const statsByDestination = useMemo(() => {
    if (!multiDayData || multiDayData.length === 0) return []
    const byDest = {}
    multiDayData.forEach(day => {
      day.flights.forEach(flight => {
        const d = (flight.destination || '').trim() || '其他'
        byDest[d] = (byDest[d] || 0) + 1
      })
    })
    return Object.entries(byDest)
      .filter(([name]) => name !== '其他')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }))
  }, [multiDayData])

  const statsByAirline = useMemo(() => {
    if (!multiDayData || multiDayData.length === 0) return []
    const byAirline = {}
    multiDayData.forEach(day => {
      day.flights.forEach(flight => {
        const a = (flight.airline_name || flight.airline_code || '').trim() || '其他'
        byAirline[a] = (byAirline[a] || 0) + 1
      })
    })
    return Object.entries(byAirline)
      .filter(([name]) => name !== '其他')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }))
  }, [multiDayData])

  // Bar Race：依多日日期累加目的地班次，每幀為該日止的 Top 10（累計）
  const statsDestRaceFrames = useMemo(() => {
    if (!multiDayData || multiDayData.length === 0) return []
    const dates = [...multiDayData].map((d) => d.date).sort((a, b) => a.localeCompare(b))
    if (dates.length === 0) return []
    const destinationByDate = {}
    multiDayData.forEach(day => {
      destinationByDate[day.date] = {}
      day.flights.forEach(flight => {
        const dest = (flight.destination || '').trim() || '其他'
        if (dest === '其他') return
        destinationByDate[day.date][dest] = (destinationByDate[day.date][dest] || 0) + 1
      })
    })
    return dates.map((dateStr, i) => {
      const cumulative = {}
      for (let j = 0; j <= i; j++) {
        const day = destinationByDate[dates[j]] || {}
        Object.entries(day).forEach(([dest, count]) => {
          cumulative[dest] = (cumulative[dest] || 0) + count
        })
      }
      const top10 = Object.entries(cumulative)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
      return { date: dateStr, names: top10.map((d) => d[0]), values: top10.map((d) => d[1]) }
    })
  }, [multiDayData])

  // 每小時航班數熱力圖（ECharts），與統計分析其他圖表風格一致
  const CHART_BG = 'transparent'
  const AXIS_COLOR = 'rgba(255,255,255,0.6)'
  const AXIS_LINE = 'rgba(255,255,255,0.15)'
  const SPLIT_LINE = 'rgba(255,255,255,0.08)'
  const TITLE_COLOR = 'rgba(255,255,255,0.9)'
  const TOOLTIP_STYLE_HEATMAP = {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderRadius: 8,
    textStyle: { color: 'rgba(255,255,255,0.9)' }
  }
  const TOOLTIP_STYLE_AXIS = { ...TOOLTIP_STYLE_HEATMAP }

  useEffect(() => {
    if (activeTab !== 'statistics' || !heatmapDataFromMultiDay.length) return
    let cleanup = null
    const id = requestAnimationFrame(() => {
      if (!heatmapRef.current) return
      const chart = echarts.init(heatmapRef.current, 'dark')
      const containerWidth = heatmapRef.current.getBoundingClientRect().width || 400
      const isNarrow = containerWidth < 480
      const dates = [...new Set(heatmapDataFromMultiDay.map(d => d[0]))]
      const heatmapSeriesData = heatmapDataFromMultiDay.map(([dateStr, h, value]) => [h, dates.indexOf(dateStr), value])
      const weekdays = ['日', '一', '二', '三', '四', '五', '六']
      const formatDateShort = (dateStr) => {
        const [y, m, d] = dateStr.split('-')
        const date = new Date(y, parseInt(m, 10) - 1, parseInt(d, 10))
        return `${parseInt(m, 10)}/${parseInt(d, 10)}（週${weekdays[date.getDay()]}）`
      }
      const yAxisLabels = dates.map(d => {
        const [, m, day] = d.split('-')
        return `${parseInt(m, 10)}/${parseInt(day, 10)}`
      })
      const values = heatmapSeriesData.map(d => d[2])
      const dataMax = Math.max(1, ...values)
      const option = {
        backgroundColor: CHART_BG,
        tooltip: {
          trigger: 'item',
          position: 'top',
          ...TOOLTIP_STYLE_HEATMAP,
          formatter: (p) => {
            const [hour, dateIdx, value] = p.data
            const dateStr = dates[dateIdx]
            return `<strong>${formatDateShort(dateStr)}</strong><br/>${String(hour).padStart(2, '0')}:00～${String(hour).padStart(2, '0')}:59 · <strong>${value} 班</strong>`
          }
        },
        grid: { left: 56, right: 48, top: 24, bottom: 92 },
        xAxis: {
          type: 'category',
          name: '時段',
          nameLocation: 'middle',
          nameGap: 28,
          nameTextStyle: { color: AXIS_COLOR, fontSize: 11 },
          data: Array.from({ length: 24 }, (_, i) => `${i}`),
          axisLabel: { color: AXIS_COLOR, fontSize: 10, interval: 2 },
          axisLine: { lineStyle: { color: AXIS_LINE } },
          splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } }
        },
        yAxis: {
          type: 'category',
          name: '日期',
          nameLocation: 'middle',
          nameGap: 42,
          nameTextStyle: { color: AXIS_COLOR, fontSize: 11 },
          data: yAxisLabels,
          axisLabel: { color: AXIS_COLOR, fontSize: 10 },
          axisLine: { lineStyle: { color: AXIS_LINE } },
          splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } }
        },
        visualMap: {
          type: 'continuous',
          min: 0,
          max: dataMax,
          range: [0, dataMax],
          calculable: true,
          orient: 'horizontal',
          left: isNarrow ? '15%' : 'center',
          right: isNarrow ? '15%' : undefined,
          bottom: 12,
          itemWidth: isNarrow ? 20 : 14,
          itemHeight: isNarrow ? Math.min(160, Math.max(100, containerWidth - 80)) : 380,
          text: ['多', '少'],
          textStyle: { color: AXIS_COLOR, fontSize: 10 },
          inRange: {
            color: ['#0f172a', '#0e7490', '#06b6d4', '#10b981', '#eab308', '#f97316', '#ef4444']
          }
        },
        series: [{
          type: 'heatmap',
          data: heatmapSeriesData,
          itemStyle: { borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1 },
          emphasis: { itemStyle: { borderColor: '#8b5cf6', borderWidth: 2 } }
        }]
      }
      chart.setOption(option)
      const onResize = () => {
        if (heatmapRef.current) {
          const w = heatmapRef.current.getBoundingClientRect().width || 400
          const narrow = w < 480
          chart.setOption({
            visualMap: {
              left: narrow ? '15%' : 'center',
              right: narrow ? '15%' : undefined,
              itemWidth: narrow ? 20 : 14,
              itemHeight: narrow ? Math.min(160, Math.max(100, w - 80)) : 380
            }
          })
        }
        chart.resize()
      }
      window.addEventListener('resize', onResize)
      cleanup = () => {
        window.removeEventListener('resize', onResize)
        chart.dispose()
      }
    })
    return () => {
      cancelAnimationFrame(id)
      if (cleanup) cleanup()
    }
  }, [heatmapDataFromMultiDay, activeTab])

  // 每日總航班數（柱狀圖 + 趨勢線）
  useEffect(() => {
    if (activeTab !== 'statistics' || !multiDayData.length) return
    let cleanup = null
    const id = requestAnimationFrame(() => {
      if (!dailyTotalChartRef.current) return
      const chart = echarts.init(dailyTotalChartRef.current, 'dark')
      const labels = multiDayData.map((d) => d.dateLabel)
      const values = multiDayData.map((d) => d.totalFlights)
      const option = {
        backgroundColor: CHART_BG,
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            if (!params?.length) return ''
            const i = params[0].dataIndex
            const p = params[0]
            return `<strong>${labels[i] ?? ''}</strong><br/>${p.marker} ${p.value} 班`
          },
          ...TOOLTIP_STYLE_AXIS
        },
        legend: { data: ['每日航班數', '趨勢線'], bottom: 0, textStyle: { color: AXIS_COLOR } },
        grid: { left: 50, right: 30, top: 24, bottom: 56 },
        xAxis: {
          type: 'category',
          data: labels,
          axisLabel: { color: AXIS_COLOR, fontSize: 10, rotate: 45 },
          axisLine: { lineStyle: { color: AXIS_LINE } }
        },
        yAxis: {
          type: 'value',
          name: '航班數',
          nameTextStyle: { color: AXIS_COLOR },
          axisLabel: { color: AXIS_COLOR },
          splitLine: { lineStyle: { color: SPLIT_LINE } }
        },
        series: [
          {
            type: 'bar',
            name: '每日航班數',
            data: values,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: CHART_COLORS[0] },
                { offset: 1, color: CHART_COLORS[2] }
              ])
            },
            emphasis: { itemStyle: { color: CHART_COLORS[1] } }
          },
          {
            type: 'line',
            name: '趨勢線',
            data: values,
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { width: 2, color: CHART_COLORS[3] },
            itemStyle: { color: CHART_COLORS[3] }
          }
        ]
      }
      chart.setOption(option)
      const onResize = () => chart.resize()
      window.addEventListener('resize', onResize)
      cleanup = () => { window.removeEventListener('resize', onResize); chart.dispose() }
    })
    return () => { cancelAnimationFrame(id); if (cleanup) cleanup() }
  }, [activeTab, multiDayData])

  // 當天每小時航班數（ECharts 面積圖 或 柱狀圖）
  useEffect(() => {
    if (activeTab !== 'statistics' || !statistics?.hourlyDistribution?.length) return
    let cleanup = null
    const id = requestAnimationFrame(() => {
      if (!hourlyDistRef.current) return
      const chart = echarts.init(hourlyDistRef.current, 'dark')
      const hours = statistics.hourlyDistribution.map((d) => d.hour)
      const counts = statistics.hourlyDistribution.map((d) => d.count)
      const isArea = hourlyChartMode === 'area'
      const option = {
        backgroundColor: CHART_BG,
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            if (!params?.length) return ''
            const i = params[0].dataIndex
            return `<strong>${hours[i]}</strong><br/>${params[0].marker} ${params[0].value} 班`
          },
          ...TOOLTIP_STYLE_AXIS
        },
        grid: { left: 50, right: 30, top: 24, bottom: 50 },
        xAxis: {
          type: 'category',
          boundaryGap: !isArea,
          data: hours,
          axisLabel: { color: AXIS_COLOR, fontSize: 10, interval: 2 },
          axisLine: { lineStyle: { color: AXIS_LINE } }
        },
        yAxis: {
          type: 'value',
          name: '航班數',
          nameTextStyle: { color: AXIS_COLOR },
          axisLabel: { color: AXIS_COLOR },
          splitLine: { lineStyle: { color: SPLIT_LINE } }
        },
        series: [isArea
          ? {
              type: 'line',
              name: '航班數',
              data: counts,
              smooth: true,
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(6, 182, 212, 0.5)' },
                  { offset: 1, color: 'rgba(6, 182, 212, 0.03)' }
                ])
              },
              lineStyle: { color: CHART_COLORS[2] },
              itemStyle: { color: CHART_COLORS[2] }
            }
          : {
              type: 'bar',
              data: counts,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#ec4899' },
                  { offset: 1, color: CHART_COLORS[0] }
                ])
              },
              emphasis: { itemStyle: { color: CHART_COLORS[1] } }
            }
        ]
      }
      chart.setOption(option)
      const onResize = () => chart.resize()
      window.addEventListener('resize', onResize)
      cleanup = () => { window.removeEventListener('resize', onResize); chart.dispose() }
    })
    return () => { cancelAnimationFrame(id); if (cleanup) cleanup() }
  }, [activeTab, statistics, hourlyChartMode])

  // 目的地 Top 10（ECharts 橫向柱狀圖 或 Bar Race）
  useEffect(() => {
    if (activeTab !== 'statistics') return
    const hasBar = statsByDestination.length > 0
    const hasRace = destChartMode === 'race' && statsDestRaceFrames.length > 0
    if (!hasBar && !hasRace) return
    let cleanup = null
    const id = requestAnimationFrame(() => {
      if (!destTop10Ref.current) return
      const chart = echarts.init(destTop10Ref.current, 'dark')
      const formatDateLabel = (dateStr) => {
        const [y, m, d] = dateStr.split('-')
        return `${Number(m)}/${Number(d)}`
      }
      if (destChartMode === 'race' && statsDestRaceFrames.length > 0) {
        const baseOption = {
          backgroundColor: CHART_BG,
          tooltip: {
            trigger: 'axis',
            ...TOOLTIP_STYLE_AXIS,
            formatter: (params) => {
              if (!params?.length) return ''
              const p = params[0]
              return `${p.name}<br/>${p.marker} ${p.value} 班（累計）`
            }
          },
          grid: { left: 120, right: 50, top: 24, bottom: 60 },
          animationDuration: 0,
          animationDurationUpdate: 2000,
          animationEasing: 'linear',
          animationEasingUpdate: 'linear',
          xAxis: { type: 'value', name: '航班數', nameTextStyle: { color: AXIS_COLOR }, axisLabel: { color: AXIS_COLOR }, splitLine: { lineStyle: { color: SPLIT_LINE } } },
          yAxis: {
            type: 'category',
            inverse: true,
            axisLabel: { color: AXIS_COLOR, fontSize: 10 },
            axisLine: { lineStyle: { color: AXIS_LINE } },
            animationDuration: 300,
            animationDurationUpdate: 300
          },
          series: [{
            type: 'bar',
            realtimeSort: true,
            animationDurationUpdate: 2000,
            animationEasingUpdate: 'linear',
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: CHART_COLORS[3] },
                { offset: 1, color: CHART_COLORS[0] }
              ])
            },
            emphasis: { itemStyle: { color: CHART_COLORS[1] } },
            label: {
              show: true,
              position: 'right',
              color: AXIS_COLOR,
              formatter: '{c} 班',
              valueAnimation: true
            }
          }]
        }
        const option = {
          ...baseOption,
          timeline: {
            data: statsDestRaceFrames.map((f) => formatDateLabel(f.date)),
            left: 'center',
            bottom: 8,
            width: '80%',
            axisType: 'category',
            currentIndex: 0,
            realtime: false,
            playReverse: false,
            rewind: false,
            loop: false,
            label: { color: AXIS_COLOR, fontSize: 10 },
            checkpointStyle: { color: CHART_COLORS[0] },
            controlStyle: { show: true, itemSize: 14, itemGap: 12, color: AXIS_COLOR },
            playInterval: 500,
            autoPlay: true
          },
          options: statsDestRaceFrames.map((frame) => ({
            yAxis: { data: frame.names },
            series: [{ data: frame.values }]
          }))
        }
        chart.setOption(option, { notMerge: true })
        setTimeout(() => { chart.dispatchAction({ type: 'timelineChange', currentIndex: 0 }) }, 0)
      } else {
        const option = {
          backgroundColor: CHART_BG,
          tooltip: {
            trigger: 'axis',
            formatter: (params) => {
              const p = params?.[0]
              if (!p) return ''
              const i = p.dataIndex
              const d = statsByDestination[i]
              return `${d?.name ?? ''}<br/>${p.marker} ${p.value} 班`
            },
            ...TOOLTIP_STYLE_AXIS
          },
          grid: { left: 120, right: 40, top: 24, bottom: 40 },
          xAxis: {
            type: 'value',
            name: '航班數',
            nameTextStyle: { color: AXIS_COLOR },
            axisLabel: { color: AXIS_COLOR },
            splitLine: { lineStyle: { color: SPLIT_LINE } }
          },
          yAxis: {
            type: 'category',
            inverse: true,
            data: statsByDestination.map((d) => d.name),
            axisLabel: { color: AXIS_COLOR, fontSize: 10 },
            axisLine: { lineStyle: { color: AXIS_LINE } }
          },
          series: [{
            type: 'bar',
            data: statsByDestination.map((d) => d.value),
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: CHART_COLORS[3] },
                { offset: 1, color: CHART_COLORS[0] }
              ])
            },
            emphasis: { itemStyle: { color: CHART_COLORS[1] } }
          }]
        }
        chart.setOption(option)
      }
      const onResize = () => chart.resize()
      window.addEventListener('resize', onResize)
      cleanup = () => { window.removeEventListener('resize', onResize); chart.dispose() }
    })
    return () => { cancelAnimationFrame(id); if (cleanup) cleanup() }
  }, [activeTab, statsByDestination, destChartMode, statsDestRaceFrames])

  // 航空公司 Top 10（ECharts 橫向柱狀圖）
  useEffect(() => {
    if (activeTab !== 'statistics' || !statsByAirline.length) return
    let cleanup = null
    const id = requestAnimationFrame(() => {
      if (!airlineTop10Ref.current) return
      const chart = echarts.init(airlineTop10Ref.current, 'dark')
      const option = {
        backgroundColor: CHART_BG,
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            const p = params?.[0]
            if (!p) return ''
            const i = p.dataIndex
            const d = statsByAirline[i]
            return `${d?.name ?? ''}<br/>${p.marker} ${p.value} 班`
          },
          ...TOOLTIP_STYLE_AXIS
        },
        grid: { left: 100, right: 40, top: 24, bottom: 40 },
        xAxis: {
          type: 'value',
          name: '航班數',
          nameTextStyle: { color: AXIS_COLOR },
          axisLabel: { color: AXIS_COLOR },
          splitLine: { lineStyle: { color: SPLIT_LINE } }
        },
        yAxis: {
          type: 'category',
          inverse: true,
          data: statsByAirline.map((d) => d.name),
          axisLabel: { color: AXIS_COLOR, fontSize: 10 },
          axisLine: { lineStyle: { color: AXIS_LINE } }
        },
        series: [{
          type: 'bar',
          data: statsByAirline.map((d) => d.value),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: CHART_COLORS[4] },
              { offset: 1, color: CHART_COLORS[5] }
            ])
          },
          emphasis: { itemStyle: { color: CHART_COLORS[1] } }
        }]
      }
      chart.setOption(option)
      const onResize = () => chart.resize()
      window.addEventListener('resize', onResize)
      cleanup = () => { window.removeEventListener('resize', onResize); chart.dispose() }
    })
    return () => { cancelAnimationFrame(id); if (cleanup) cleanup() }
  }, [activeTab, statsByAirline])

  // 每小時航班數趨勢（多天比較）— ECharts（與 Demo 同款：多線+面積、dataZoom、圖例）
  useEffect(() => {
    if (activeTab !== 'statistics' || !hourlyTrendingData?.data?.length || !hourlyTrendingData?.dates?.length) return
    let cleanup = null
    const id = requestAnimationFrame(() => {
      if (!multiDayHourlyTrendRef.current) return
      const chart = echarts.init(multiDayHourlyTrendRef.current, 'dark')
      const hours = hourlyTrendingData.data.map((d) => d.hour)
      const dates = hourlyTrendingData.dates.map((label) => ({ dateStr: label, label }))
      const series = dates.map((_, i) =>
        hourlyTrendingData.data.map((point) => point[hourlyTrendingData.dates[i]] ?? 0)
      )
      const option = {
        backgroundColor: CHART_BG,
        tooltip: {
          trigger: 'axis',
          ...TOOLTIP_STYLE_AXIS,
          formatter: (params) => {
            if (!params?.length) return ''
            const h = params[0].dataIndex
            let s = `<strong>${hours[h]}</strong><br/>`
            params.forEach((p, i) => {
              s += `${p.marker} ${dates[i].label}: ${p.value} 班<br/>`
            })
            return s
          }
        },
        legend: {
          type: 'scroll',
          data: dates.map((d) => d.label),
          bottom: 28,
          textStyle: { color: AXIS_COLOR },
          pageButtonItemGap: 8,
          pageTextStyle: { color: AXIS_COLOR }
        },
        grid: { left: 50, right: 30, top: 24, bottom: 72 },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: hours,
          axisLabel: { color: AXIS_COLOR, fontSize: 10, interval: 2 },
          axisLine: { lineStyle: { color: AXIS_LINE } }
        },
        yAxis: {
          type: 'value',
          name: '航班數',
          nameTextStyle: { color: AXIS_COLOR },
          axisLabel: { color: AXIS_COLOR },
          splitLine: { lineStyle: { color: SPLIT_LINE } }
        },
        dataZoom: [
          { type: 'inside', xAxisIndex: 0, start: 0, end: 100 },
          { type: 'slider', xAxisIndex: 0, bottom: 4, height: 18, start: 0, end: 100, textStyle: { color: AXIS_COLOR } }
        ],
        series: dates.map((d, i) => ({
          type: 'line',
          name: d.label,
          data: series[i],
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2, color: CHART_COLORS[i % CHART_COLORS.length] },
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
          areaStyle: { opacity: 0.08, color: CHART_COLORS[i % CHART_COLORS.length] }
        }))
      }
      chart.setOption(option)
      const onResize = () => chart.resize()
      window.addEventListener('resize', onResize)
      cleanup = () => { window.removeEventListener('resize', onResize); chart.dispose() }
    })
    return () => { cancelAnimationFrame(id); if (cleanup) cleanup() }
  }, [activeTab, hourlyTrendingData])

  // 計算多日最繁忙時段
  const busiestHours = useMemo(() => {
    if (!multiDayData || multiDayData.length === 0) return null

    // 統計所有天數中每小時的總航班數
    const hourlyTotal = Array.from({ length: 24 }, () => 0)
    
    // 統計每週幾的航班數
    const weekdayCounts = {
      0: 0, // 星期日
      1: 0, // 星期一
      2: 0, // 星期二
      3: 0, // 星期三
      4: 0, // 星期四
      5: 0, // 星期五
      6: 0  // 星期六
    }
    
    multiDayData.forEach(day => {
      // 計算星期幾
      const date = new Date(day.date)
      const weekday = date.getDay() // 0 = 星期日, 1 = 星期一, ...
      weekdayCounts[weekday] += day.totalFlights
      
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

    // 計算每週幾的平均航班數
    const weekdayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    const weekdayData = Object.entries(weekdayCounts)
      .map(([day, count]) => {
        const dayNum = parseInt(day)
        const dayData = multiDayData.filter(d => {
          const date = new Date(d.date)
          return date.getDay() === dayNum
        })
        const dayCount = dayData.length || 1 // 避免除以零
        return {
          weekday: weekdayNames[dayNum],
          weekdayNum: dayNum,
          total: count,
          average: Math.round((count / dayCount) * 10) / 10,
          days: dayCount
        }
      })
      .filter(item => item.days > 0) // 只顯示有資料的星期幾
      .sort((a, b) => {
        // 依星期順序：星期一(1) → 星期日(0)
        const orderA = a.weekdayNum === 0 ? 7 : a.weekdayNum
        const orderB = b.weekdayNum === 0 ? 7 : b.weekdayNum
        return orderA - orderB
      })

    return {
      topHours: hoursWithCount,
      hourlyData: hourlyAverage.map((avg, hour) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        average: Math.round(avg * 10) / 10,
        total: hourlyTotal[hour]
      })),
      weekdayData: weekdayData // 新增：星期幾統計
    }
  }, [multiDayData])

  // 不同日型（可重疊標籤）平均航班量：平日、週末、公眾假期、假期前
  const dayTypeStats = useMemo(() => {
    if (!multiDayData || multiDayData.length === 0) return null
    const acc = {
      平日: { total: 0, days: 0 },
      週末: { total: 0, days: 0 },
      公眾假期: { total: 0, days: 0 },
      '假期前（連假起始日前 2 天）': { total: 0, days: 0 }
    }
    multiDayData.forEach(day => {
      const dateStr = day.date
      const date = new Date(dateStr + 'T00:00:00')
      const dow = date.getDay() // 0=日, 1=一, ..., 5=五, 6=六
      const totalFlights = day.totalFlights ?? 0
      // 平日：星期一～五
      if (dow >= 1 && dow <= 5) {
        acc.平日.total += totalFlights
        acc.平日.days += 1
      }
      // 週末：五、六、日（五同時算平日與週末）
      if (dow === 0 || dow === 5 || dow === 6) {
        acc.週末.total += totalFlights
        acc.週末.days += 1
      }
      // 公眾假期
      if (isPublicHoliday2026(dateStr)) {
        acc.公眾假期.total += totalFlights
        acc.公眾假期.days += 1
      }
      // 假期前（連假起始日前 1 天、前 2 天）
      if (isPreHoliday2026(dateStr)) {
        acc['假期前（連假起始日前 2 天）'].total += totalFlights
        acc['假期前（連假起始日前 2 天）'].days += 1
      }
    })
    const order = ['平日', '週末', '公眾假期', '假期前（連假起始日前 2 天）']
    return order.map(type => {
      const { total, days } = acc[type]
      const average = days > 0 ? Math.round((total / days) * 10) / 10 : 0
      return { type, total, days, average }
    }).filter(row => row.days > 0)
  }, [multiDayData])

  // 歷史趨勢對比：有至少 7 天歷史資料即顯示比較；或歷史天數 ≥ 當期 80% 亦可
  const HISTORICAL_MIN_DAYS = 7
  const HISTORICAL_MIN_RATIO = 0.8

  // 計算歷史趨勢對比（與上週/上月/去年同期）
  const historicalComparison = useMemo(() => {
    if (!multiDayData || multiDayData.length === 0) return null

    const currentTotal = multiDayData.reduce((sum, day) => sum + day.totalFlights, 0)
    const currentDays = multiDayData.length
    const currentPeriod = {
      totalFlights: currentTotal,
      averagePerDay: currentTotal / currentDays,
      days: currentDays,
      dateRange: multiDayData.length > 0
        ? `${multiDayData[0].dateLabel}–${multiDayData[multiDayData.length - 1].dateLabel}`
        : ''
    }

    const toPeriod = (list) => {
      if (!list || list.length === 0)
        return { totalFlights: null, averagePerDay: null, days: 0, change: null, dateRange: '', sampleSufficient: false }
      const total = list.reduce((sum, day) => sum + day.totalFlights, 0)
      const avg = total / list.length
      const sampleSufficient =
        list.length >= HISTORICAL_MIN_DAYS || list.length >= currentDays * HISTORICAL_MIN_RATIO
      const change = sampleSufficient && currentPeriod.averagePerDay > 0
        ? Math.round(((avg - currentPeriod.averagePerDay) / currentPeriod.averagePerDay) * 100)
        : null
      const dateRange = list.length > 0 ? `${list[0].dateLabel}–${list[list.length - 1].dateLabel}` : ''
      return {
        totalFlights: total,
        averagePerDay: avg,
        days: list.length,
        change,
        dateRange,
        sampleSufficient
      }
    }

    return {
      current: currentPeriod,
      lastWeek: toPeriod(lastWeekData),
      lastMonth: toPeriod(lastMonthData),
      lastYear: toPeriod(lastYearData)
    }
  }, [multiDayData, lastWeekData, lastMonthData, lastYearData])

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
                共掛班號 {codeshareCount} 個
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
            <strong className="text-purple-400 text-sm block mb-2">共掛班號：</strong>
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

  // 匯出統計分析為 PNG 或 PDF
  const handleExportStatistics = async (format = 'png') => {
    try {
      if (!exportStatisticsRef.current) {
        alert('找不到要匯出的統計分析內容')
        return
      }

      // 等待字體載入完成
      await document.fonts.ready
      await new Promise(resolve => setTimeout(resolve, 800))

      const html2canvas = (await import('html2canvas')).default
      
      // 簡化配置，移除可能導致問題的選項
      const canvas = await html2canvas(exportStatisticsRef.current, {
        backgroundColor: '#1a1a1a',
        scale: 2,
        useCORS: true,
        allowTaint: false, // 改為 false，避免跨域問題
        logging: false,
        scrollX: 0,
        scrollY: 0,
        removeContainer: false,
        imageTimeout: 15000,
        onclone: (clonedDoc, element) => {
          // 簡化 onclone，只處理必要的樣式修正
          try {
            const clonedElement = clonedDoc.querySelector('[data-export-statistics]') || element
            if (clonedElement) {
              // 確保背景色正確
              clonedElement.style.backgroundColor = '#1a1a1a'
              // 確保所有文字可見
              const textElements = clonedElement.querySelectorAll('*')
              textElements.forEach((el) => {
                const style = clonedDoc.defaultView?.getComputedStyle(el)
                if (style) {
                  // 確保透明文字變為可見
                  if (style.color === 'rgba(0, 0, 0, 0)' || style.color === 'transparent') {
                    el.style.color = '#ffffff'
                  }
                  // 確保背景透明元素有背景色
                  if (style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent') {
                    if (el.tagName === 'DIV' || el.tagName === 'SPAN') {
                      el.style.backgroundColor = 'transparent'
                    }
                  }
                }
              })
            }
          } catch (e) {
            console.warn('onclone 處理錯誤:', e)
          }
        },
      })

      // 驗證 canvas 是否有效
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas 生成失敗：寬度或高度為 0')
      }

      if (format === 'pdf') {
        const jsPDF = (await import('jspdf')).default
        const pdf = new jsPDF('p', 'mm', 'a4')
        
        // 確保 canvas 轉換為 dataURL 成功
        let imgData
        try {
          imgData = canvas.toDataURL('image/png', 1.0)
          if (!imgData || imgData === 'data:,') {
            throw new Error('Canvas 轉換為圖片失敗')
          }
        } catch (e) {
          console.error('Canvas toDataURL 錯誤:', e)
          throw new Error('無法將 Canvas 轉換為圖片：' + e.message)
        }
        
        const imgWidth = 210 // A4 width in mm
        const pageHeight = 297 // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        let heightLeft = imgHeight
        let position = 0

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }

        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
        pdf.save(`統計分析_${dateStr}.pdf`)
      } else {
        // PNG 匯出
        let dataURL
        try {
          dataURL = canvas.toDataURL('image/png', 1.0)
          if (!dataURL || dataURL === 'data:,') {
            throw new Error('Canvas 轉換為 PNG 失敗')
          }
        } catch (e) {
          console.error('Canvas toDataURL 錯誤:', e)
          throw new Error('無法將 Canvas 轉換為 PNG：' + e.message)
        }

        const link = document.createElement('a')
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
        link.download = `統計分析_${dateStr}.png`
        link.href = dataURL
        
        // 使用 Blob 方式下載，更可靠
        try {
          const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Canvas 轉換為 Blob 失敗'))
              }
            }, 'image/png', 1.0)
          })
          
          const blobUrl = URL.createObjectURL(blob)
          link.href = blobUrl
          link.click()
          
          // 清理
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl)
          }, 100)
        } catch (blobError) {
          // 如果 Blob 方式失敗，使用 dataURL 方式
          console.warn('Blob 方式失敗，使用 dataURL:', blobError)
          link.click()
        }
      }
    } catch (error) {
      console.error('匯出統計分析失敗:', error)
      alert(`匯出統計分析失敗：${error.message}\n\n請檢查瀏覽器控制台以獲取更多資訊。`)
    }
  }

  // 處理圖表點擊事件
  const handleChartClick = (type, key, data) => {
    if (!data) return
    
    let detail = null
    
    if (type === 'hour') {
      // 找出該時段的所有航班
      const flights = []
      if (multiDayData && multiDayData.length > 0) {
        multiDayData.forEach(day => {
          day.flights.forEach(flight => {
            const hour = parseInt(flight.time.split(':')[0])
            const targetHour = parseInt(key.split(':')[0])
            if (hour === targetHour) {
              flights.push({ ...flight, date: day.date, dateLabel: day.dateLabel })
            }
          })
        })
      } else if (flightData && flightData.flights) {
        flightData.flights.forEach(flight => {
          const hour = parseInt(flight.time.split(':')[0])
          const targetHour = parseInt(key.split(':')[0])
          if (hour === targetHour) {
            flights.push(flight)
          }
        })
      }
      detail = {
        type: 'hour',
        title: `${key} 時段航班詳情`,
        data: data,
        flights: flights
      }
    } else if (type === 'weekday') {
      // 找出該星期幾的所有航班
      const flights = []
      const weekdayNum = data.weekdayNum
      if (multiDayData && multiDayData.length > 0) {
        multiDayData.forEach(day => {
          const date = new Date(day.date)
          if (date.getDay() === weekdayNum) {
            day.flights.forEach(flight => {
              flights.push({ ...flight, date: day.date, dateLabel: day.dateLabel })
            })
          }
        })
      }
      detail = {
        type: 'weekday',
        title: `${key} 航班詳情`,
        data: data,
        flights: flights
      }
    } else if (type === 'gate') {
      // 找出該登機門的所有航班
      const flights = []
      if (multiDayData && multiDayData.length > 0) {
        multiDayData.forEach(day => {
          day.flights.forEach(flight => {
            if (flight.gate === key) {
              flights.push({ ...flight, date: day.date, dateLabel: day.dateLabel })
            }
          })
        })
      } else if (flightData && flightData.flights) {
        flightData.flights.forEach(flight => {
          if (flight.gate === key) {
            flights.push(flight)
          }
        })
      }
      detail = {
        type: 'gate',
        title: `登機門 ${key} 航班詳情`,
        data: data,
        flights: flights
      }
    }
    
    if (detail) {
      setSelectedChartDetail(detail)
    }
  }

  // 圖表顏色
  const CHART_COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#3b82f6', '#f97316', '#10b981', '#ef4444', '#6366f1']

  return (
    <div className="space-y-6">
      {/* 頁面標題 - 超現代設計 - 添加 padding-top 避免被跑馬燈和導航欄遮擋（手機模式） */}
      <div className="text-center mb-6 sm:mb-8 md:mb-10 relative pt-16 sm:pt-2 md:pt-0">
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
            {activeTab === 'statistics' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportStatistics('png')}
                  className="px-3 sm:px-4 py-3 sm:py-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-0"
                  title="匯出統計分析為 PNG"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">PNG</span>
                </button>
                <button
                  onClick={() => handleExportStatistics('pdf')}
                  className="px-3 sm:px-4 py-3 sm:py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-0"
                  title="匯出統計分析為 PDF"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </div>
            )}
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
        <div className="space-y-6 animate-fade-in" ref={exportStatisticsRef} data-export-statistics="true">
          {/* 當天統計圖表 - 移到最上方 */}
          {statistics && flightData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* 各登機門航班數量分布 */}
              <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 shadow-lg">
                <h3 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4">各登機門航班數量分布（當天）</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart 
                    data={statistics.gateDistribution}
                    onClick={(data, index) => {
                      if (data && data.activePayload && data.activePayload[0]) {
                        const gate = data.activePayload[0].payload.name
                        const gateData = statistics.gateDistribution.find(d => d.name === gate)
                        handleChartClick('gate', gate, gateData)
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
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

              {/* 時間分布圖表（每小時航班數）（當天）— ECharts 面積圖 / 柱狀圖 */}
              <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 shadow-lg">
                <h3 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4">時間分布（每小時航班數）（當天）</h3>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setHourlyChartMode('area')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${hourlyChartMode === 'area' ? 'bg-white/15 text-primary' : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}
                  >
                    面積圖
                  </button>
                  <button
                    type="button"
                    onClick={() => setHourlyChartMode('bar')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${hourlyChartMode === 'bar' ? 'bg-white/15 text-primary' : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}
                  >
                    柱狀圖
                  </button>
                </div>
                <div ref={hourlyDistRef} className="w-full h-[250px]" />
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
                defaultValue="30"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <option value="3">最近 3 天</option>
                <option value="7">最近 7 天</option>
                <option value="14">最近 14 天</option>
                <option value="30">最近 30 天</option>
                <option value="90">最近 90 天</option>
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

          {/* 每日總航班數（柱狀圖 + 趨勢線）— ECharts */}
          {multiDayData.length > 0 && (
            <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4">每日總航班數</h3>
              <div ref={dailyTotalChartRef} className="w-full h-[280px]" />
            </div>
          )}

          {/* 每小時航班數熱力圖（日期 × 時段） */}
          {heatmapDataFromMultiDay.length > 0 && (
            <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4">每小時航班數熱力圖（日期 × 時段）</h3>
              <div ref={heatmapRef} className="w-full h-[340px]" />
            </div>
          )}

          {/* 目的地航班數 Top 10 — ECharts 柱狀圖 / Bar Race */}
          {(statsByDestination.length > 0 || statsDestRaceFrames.length > 0) && (
            <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4">目的地航班數 Top 10</h3>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setDestChartMode('bar')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${destChartMode === 'bar' ? 'bg-white/15 text-primary' : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}
                >
                  柱狀圖
                </button>
                <button
                  type="button"
                  onClick={() => setDestChartMode('race')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${destChartMode === 'race' ? 'bg-white/15 text-primary' : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}
                >
                  Bar Race
                </button>
              </div>
              <div ref={destTop10Ref} className="w-full h-[320px]" />
            </div>
          )}

          {/* 航空公司航班數 Top 10 — ECharts */}
          {statsByAirline.length > 0 && (
            <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4">航空公司航班數 Top 10</h3>
              <div ref={airlineTop10Ref} className="w-full h-[320px]" />
            </div>
          )}

          {/* 每小時航班數趨勢（多天比較）— ECharts（與 Demo 同款） */}
          {hourlyTrendingData && hourlyTrendingData.data && hourlyTrendingData.dates?.length > 0 && (
            <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4">每小時航班數趨勢（多天比較）</h3>
              <p className="text-xs text-text-secondary mb-2">可縮放時段、圖例切換</p>
              <div ref={multiDayHourlyTrendRef} className="w-full h-[320px]" />
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
                  <BarChart 
                    data={busiestHours.hourlyData}
                    onClick={(data, index) => {
                      if (data && data.activePayload && data.activePayload[0]) {
                        const hour = data.activePayload[0].payload.hour
                        handleChartClick('hour', hour, busiestHours.hourlyData.find(d => d.hour === hour))
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
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
              
              {/* 星期幾統計 */}
              {busiestHours.weekdayData && busiestHours.weekdayData.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="text-base sm:text-lg font-bold text-primary mb-2 sm:mb-3">一週各日平均航班量比較</h4>
                  <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5">
                    <table className="w-full text-left text-sm min-w-[280px]">
                      <thead>
                        <tr className="border-b border-white/10 text-text-secondary">
                          <th className="py-1.5 px-2 sm:px-3 font-medium">星期</th>
                          <th className="py-1.5 px-2 sm:px-3 font-medium text-right">平均（班/天）</th>
                          <th className="py-1.5 px-2 sm:px-3 font-medium text-right">總計（天數）</th>
                        </tr>
                      </thead>
                      <tbody>
                        {busiestHours.weekdayData.map((item) => (
                          <tr key={item.weekday} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                            <td className="py-1 px-2 sm:px-3 text-primary font-medium">{item.weekday}</td>
                            <td className="py-1 px-2 sm:px-3 text-primary font-semibold text-right">{item.average}</td>
                            <td className="py-1 px-2 sm:px-3 text-text-secondary text-right">{item.total} 班（{item.days} 天）</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3">
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart 
                        data={busiestHours.weekdayData}
                        onClick={(data, index) => {
                          if (data && data.activePayload && data.activePayload[0]) {
                            const weekday = data.activePayload[0].payload.weekday
                            handleChartClick('weekday', weekday, busiestHours.weekdayData.find(d => d.weekday === weekday))
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                          dataKey="weekday" 
                          stroke="rgba(255,255,255,0.6)"
                          style={{ fontSize: '11px' }}
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
                          formatter={(value, name, props) => [
                            `${value} 班/天（總計 ${props.payload.total} 班，${props.payload.days} 天）`,
                            '平均航班數'
                          ]}
                        />
                        <Bar dataKey="average" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
                          {busiestHours.weekdayData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* 平日／週末／假期 平均航班量（卡片 + 圖表） */}
              {dayTypeStats && dayTypeStats.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="text-base sm:text-lg font-bold text-primary mb-3 sm:mb-4">平日／週末／假期 平均航班量</h4>
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-4">
                    {dayTypeStats.map((row, index) => (
                      <div
                        key={row.type}
                        className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 flex flex-col gap-1 min-w-[140px] sm:min-w-[160px]"
                        style={{ borderLeftWidth: 4, borderLeftColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      >
                        <div className="text-xs sm:text-sm font-medium text-text-secondary truncate" title={row.type}>{row.type}</div>
                        <div className="text-lg sm:text-xl font-bold text-primary">{row.average} <span className="text-sm font-normal text-text-secondary">班/天</span></div>
                        <div className="text-xs text-text-secondary">共 {row.total} 班（{row.days} 天）</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={dayTypeStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                          dataKey="type"
                          stroke="rgba(255,255,255,0.6)"
                          style={{ fontSize: '10px' }}
                          angle={-20}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis stroke="rgba(255,255,255,0.6)" style={{ fontSize: '12px' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(30, 30, 30, 0.95)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px'
                          }}
                          formatter={(value, name, props) => [
                            `${value} 班/天（總計 ${props.payload.total} 班，${props.payload.days} 天）`,
                            '平均航班數'
                          ]}
                        />
                        <Bar dataKey="average" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
                          {dayTypeStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
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
                      onClick={() => handleChartClick('gate', item.gate, item)}
                    >
                      <div className="text-xs sm:text-sm font-bold text-white mb-1">{item.gate}</div>
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
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-lg sm:text-xl font-bold text-primary">歷史趨勢對比</h3>
                <button
                  type="button"
                  onClick={() => loadHistoricalComparisonData()}
                  disabled={loadingHistorical}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 text-primary hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingHistorical ? '載入中…' : '重新載入對比'}
                </button>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                上週／上月／去年同期 = 與當前期間相同天數，整體往前移 7／30／365 天
              </p>
              {loadingHistorical && (
                <p className="text-xs text-text-secondary mb-3">正在載入上週／上月／去年同期…</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 當前期間 */}
                <div className="bg-white/[0.06] rounded-lg p-4 border border-white/10 border-l-4 border-l-violet-400">
                  <div className="text-sm text-text-secondary mb-2">當前期間</div>
                  <div className="text-2xl font-bold text-primary mb-1">{Math.round(historicalComparison.current.averagePerDay)}</div>
                  <div className="text-xs text-text-secondary">平均 {historicalComparison.current.days} 天</div>
                  {historicalComparison.current.dateRange && (
                    <div className="text-xs text-text-secondary/80 mt-0.5">{historicalComparison.current.dateRange}</div>
                  )}
                  <div className="text-sm text-primary mt-2">總計 {historicalComparison.current.totalFlights} 班</div>
                </div>

                {/* 上週同期 */}
                <div className="bg-white/[0.06] rounded-lg p-4 border border-white/10 border-l-4 border-l-sky-400">
                  <div className="text-sm text-text-secondary mb-2">上週同期</div>
                  {historicalComparison.lastWeek.totalFlights !== null && historicalComparison.lastWeek.days > 0 ? (
                    <>
                      <div className="text-2xl font-bold text-primary mb-1">{Math.round(historicalComparison.lastWeek.averagePerDay)}</div>
                      <div className="text-xs text-text-secondary">
                        平均 {historicalComparison.lastWeek.days} 天
                        {historicalComparison.lastWeek.days < historicalComparison.current.days && (
                          <span className="text-amber-400/90">（共 {historicalComparison.lastWeek.days} 天有資料）</span>
                        )}
                      </div>
                      {historicalComparison.lastWeek.dateRange && (
                        <div className="text-xs text-text-secondary/80 mt-0.5">{historicalComparison.lastWeek.dateRange}</div>
                      )}
                      <div className="text-sm text-primary mt-1">總計 {historicalComparison.lastWeek.totalFlights} 班</div>
                      {historicalComparison.lastWeek.sampleSufficient && historicalComparison.lastWeek.change !== null ? (
                        <div className={`text-sm mt-2 ${
                          historicalComparison.lastWeek.change > 0 ? 'text-green-400' :
                          historicalComparison.lastWeek.change < 0 ? 'text-red-400' : 'text-text-secondary'
                        }`}>
                          {historicalComparison.lastWeek.change > 0 ? '↑' : historicalComparison.lastWeek.change < 0 ? '↓' : '='}
                          {Math.abs(historicalComparison.lastWeek.change)}% 較當期
                        </div>
                      ) : historicalComparison.lastWeek.days > 0 && !historicalComparison.lastWeek.sampleSufficient && (
                        <div className="text-amber-400/90 text-sm mt-2">樣本不足，不比較</div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-text-secondary text-sm">資料不足</div>
                      <div className="text-xs text-text-secondary/80 mt-1">請確認 data/ 內有該時段 flight-data-YYYY-MM-DD.json</div>
                    </>
                  )}
                </div>

                {/* 上月同期 */}
                <div className="bg-white/[0.06] rounded-lg p-4 border border-white/10 border-l-4 border-l-emerald-400">
                  <div className="text-sm text-text-secondary mb-2">上月同期</div>
                  {historicalComparison.lastMonth.totalFlights !== null && historicalComparison.lastMonth.days > 0 ? (
                    <>
                      <div className="text-2xl font-bold text-primary mb-1">{Math.round(historicalComparison.lastMonth.averagePerDay)}</div>
                      <div className="text-xs text-text-secondary">
                        平均 {historicalComparison.lastMonth.days} 天
                        {historicalComparison.lastMonth.days < historicalComparison.current.days && (
                          <span className="text-amber-400/90">（共 {historicalComparison.lastMonth.days} 天有資料）</span>
                        )}
                      </div>
                      {historicalComparison.lastMonth.dateRange && (
                        <div className="text-xs text-text-secondary/80 mt-0.5">{historicalComparison.lastMonth.dateRange}</div>
                      )}
                      <div className="text-sm text-primary mt-1">總計 {historicalComparison.lastMonth.totalFlights} 班</div>
                      {historicalComparison.lastMonth.sampleSufficient && historicalComparison.lastMonth.change !== null ? (
                        <div className={`text-sm mt-2 ${
                          historicalComparison.lastMonth.change > 0 ? 'text-green-400' :
                          historicalComparison.lastMonth.change < 0 ? 'text-red-400' : 'text-text-secondary'
                        }`}>
                          {historicalComparison.lastMonth.change > 0 ? '↑' : historicalComparison.lastMonth.change < 0 ? '↓' : '='}
                          {Math.abs(historicalComparison.lastMonth.change)}% 較當期
                        </div>
                      ) : historicalComparison.lastMonth.days > 0 && !historicalComparison.lastMonth.sampleSufficient && (
                        <div className="text-amber-400/90 text-sm mt-2">樣本不足，不比較</div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-text-secondary text-sm">資料不足</div>
                      <div className="text-xs text-text-secondary/80 mt-1">請確認 data/ 內有該時段 flight-data-YYYY-MM-DD.json</div>
                    </>
                  )}
                </div>

                {/* 去年同期 */}
                <div className="bg-white/[0.06] rounded-lg p-4 border border-white/10 border-l-4 border-l-amber-400">
                  <div className="text-sm text-text-secondary mb-2">去年同期</div>
                  {historicalComparison.lastYear.totalFlights !== null && historicalComparison.lastYear.days > 0 ? (
                    <>
                      <div className="text-2xl font-bold text-primary mb-1">{Math.round(historicalComparison.lastYear.averagePerDay)}</div>
                      <div className="text-xs text-text-secondary">
                        平均 {historicalComparison.lastYear.days} 天
                        {historicalComparison.lastYear.days < historicalComparison.current.days && (
                          <span className="text-amber-400/90">（共 {historicalComparison.lastYear.days} 天有資料）</span>
                        )}
                      </div>
                      {historicalComparison.lastYear.dateRange && (
                        <div className="text-xs text-text-secondary/80 mt-0.5">{historicalComparison.lastYear.dateRange}</div>
                      )}
                      <div className="text-sm text-primary mt-1">總計 {historicalComparison.lastYear.totalFlights} 班</div>
                      {historicalComparison.lastYear.sampleSufficient && historicalComparison.lastYear.change !== null ? (
                        <div className={`text-sm mt-2 ${
                          historicalComparison.lastYear.change > 0 ? 'text-green-400' :
                          historicalComparison.lastYear.change < 0 ? 'text-red-400' : 'text-text-secondary'
                        }`}>
                          {historicalComparison.lastYear.change > 0 ? '↑' : historicalComparison.lastYear.change < 0 ? '↓' : '='}
                          {Math.abs(historicalComparison.lastYear.change)}% 較當期
                        </div>
                      ) : historicalComparison.lastYear.days > 0 && !historicalComparison.lastYear.sampleSufficient && (
                        <div className="text-amber-400/90 text-sm mt-2">樣本不足，不比較</div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-text-secondary text-sm">資料不足</div>
                      <div className="text-xs text-text-secondary/80 mt-1">請確認 data/ 內有該時段 flight-data-YYYY-MM-DD.json</div>
                    </>
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

      {/* 圖表詳細資訊 Modal */}
      {selectedChartDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface/95 backdrop-blur-md border border-white/20 rounded-xl p-4 sm:p-6 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-primary">{selectedChartDetail.title}</h3>
              <button
                onClick={() => setSelectedChartDetail(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6 text-text-secondary" />
              </button>
            </div>
            
            {/* 統計資訊 */}
            {selectedChartDetail.data && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white/5 rounded-lg">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {selectedChartDetail.type === 'hour' && (
                    <>
                      <div>
                        <div className="text-xs sm:text-sm text-text-secondary mb-1">時段</div>
                        <div className="text-base sm:text-lg font-bold text-primary">{selectedChartDetail.data.hour}</div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-text-secondary mb-1">航班數</div>
                        <div className="text-base sm:text-lg font-bold text-primary">{selectedChartDetail.data.count || selectedChartDetail.data.total || 0} 班</div>
                      </div>
                    </>
                  )}
                  {selectedChartDetail.type === 'weekday' && (
                    <>
                      <div>
                        <div className="text-xs sm:text-sm text-text-secondary mb-1">星期</div>
                        <div className="text-base sm:text-lg font-bold text-primary">{selectedChartDetail.data.weekday}</div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-text-secondary mb-1">平均航班數</div>
                        <div className="text-base sm:text-lg font-bold text-primary">{selectedChartDetail.data.average} 班/天</div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-text-secondary mb-1">總航班數</div>
                        <div className="text-base sm:text-lg font-bold text-primary">{selectedChartDetail.data.total} 班</div>
                      </div>
                    </>
                  )}
                  {selectedChartDetail.type === 'gate' && (
                    <>
                      <div>
                        <div className="text-xs sm:text-sm text-text-secondary mb-1">登機門</div>
                        <div className="text-base sm:text-lg font-bold text-primary">{selectedChartDetail.data.gate}</div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-text-secondary mb-1">航班數</div>
                        <div className="text-base sm:text-lg font-bold text-primary">{selectedChartDetail.data.count || selectedChartDetail.data.value || 0} 班</div>
                      </div>
                      {selectedChartDetail.data.average && (
                        <div>
                          <div className="text-xs sm:text-sm text-text-secondary mb-1">平均</div>
                          <div className="text-base sm:text-lg font-bold text-primary">{selectedChartDetail.data.average.toFixed(1)} 班/天</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 航班列表 */}
            {selectedChartDetail.flights && selectedChartDetail.flights.length > 0 && (
              <div>
                <h4 className="text-base sm:text-lg font-bold text-primary mb-3 sm:mb-4">
                  航班列表 ({selectedChartDetail.flights.length} 班)
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedChartDetail.flights.map((flight, index) => (
                    <div
                      key={index}
                      className="p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-base sm:text-lg font-bold text-purple-400">{flight.time}</span>
                          <span className="bg-purple-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                            {flight.gate}
                          </span>
                          <span className="text-primary font-semibold text-sm sm:text-base">{flight.flight_code || flight.flight || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                          {flight.dateLabel && (
                            <span className="text-text-secondary">{flight.dateLabel}</span>
                          )}
                          {flight.destination && (
                            <span className="text-text-secondary">→ {flight.destination}</span>
                          )}
                          {flight.status && (
                            <span className={`px-2 py-1 rounded text-xs ${
                              flight.status.includes('DEPARTED') || flight.status.includes('已出發')
                                ? 'bg-green-500/25 text-green-300'
                                : flight.status.includes('DELAYED') || flight.status.includes('延誤')
                                ? 'bg-yellow-500/25 text-yellow-300'
                                : 'bg-gray-500/20 text-gray-300'
                            }`}>
                              {flight.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {(!selectedChartDetail.flights || selectedChartDetail.flights.length === 0) && (
              <div className="text-center py-8 text-text-secondary">
                <p>沒有找到相關航班資料</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FlightDataContent
