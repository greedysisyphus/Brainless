import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { PaperAirplaneIcon, ArrowPathIcon, XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

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
  const abortControllerRef = useRef(null)
  const exportTableRef = useRef(null)

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
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
    
    console.log('Loading data from:', dataUrl) // 調試用

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
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]
    setSelectedDate(dateStr)
    loadFlightData(dateStr)
  }

  const handleCancelLoad = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  // 載入多天數據
  const loadMultiDayData = useCallback(async (days = 7) => {
    setLoadingMultiDay(true)
    const basePath = import.meta.env.PROD ? '/Brainless/data/' : '/data/'
    const today = new Date()
    const dataPromises = []
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dataUrl = `${basePath}flight-data-${dateStr}.json`
      
      dataPromises.push(
        fetch(dataUrl)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      )
    }
    
    try {
      const results = await Promise.all(dataPromises)
      const validData = results
        .map((data, index) => {
          if (!data) return null
          const date = new Date(today)
          date.setDate(date.getDate() - index)
          return {
            date: date.toISOString().split('T')[0],
            dateLabel: date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
            totalFlights: data.summary?.total_flights || 0,
            flights: data.flights || []
          }
        })
        .filter(Boolean)
        .reverse() // 從舊到新排序
      
      setMultiDayData(validData)
    } catch (error) {
      console.error('載入多天數據失敗:', error)
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

  // 自動載入今天的資料（只在組件掛載時執行一次）
  useEffect(() => {
    // 只在組件首次掛載時載入，避免重複載入
    const initialDate = (() => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })()
    
    loadFlightData(initialDate)
    
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

  // 統計卡片數據（移到頂部，避免在條件性 JSX 中使用 useMemo）
  const summaryCards = useMemo(() => {
    if (!flightData || !flightData.summary) return null
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 sm:p-6 text-center text-white">
          <h3 className="text-sm opacity-90 mb-2">總航班數</h3>
          <div className="text-4xl font-bold mb-1">
            {flightData.summary.total_flights ?? 0}
          </div>
          <div className="text-xs opacity-80">班</div>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-red-500 rounded-xl p-4 sm:p-6 text-center text-white">
          <h3 className="text-sm opacity-90 mb-2">17:00 前</h3>
          <div className="text-4xl font-bold mb-1">
            {flightData.summary['before_17:00'] ?? flightData.summary.before_17_00 ?? 0}
          </div>
          <div className="text-xs opacity-80">班</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl p-4 sm:p-6 text-center text-white">
          <h3 className="text-sm opacity-90 mb-2">17:00 後</h3>
          <div className="text-4xl font-bold mb-1">
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
    if (!flightData || !flightData.flights) return ''

    const dateStr = formatDate(selectedDate)
    const rows = flightData.flights.map(flight => {
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
        <tr style="background: ${flightData.flights.indexOf(flight) % 2 === 0 ? '#fafafa' : 'white'};">
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
      {/* 頁面標題 - 超現代設計 */}
      <div className="text-center mb-6 sm:mb-8 md:mb-10 relative">
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
        
        {/* 最後更新時間 */}
        {lastUpdated && (
          <div className="text-sm text-text-secondary mt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface/40 backdrop-blur-sm border border-white/10 rounded-lg">
              <svg className="w-4 h-4 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>最後更新：{formatLastUpdated(lastUpdated)}</span>
            </span>
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
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-3 sm:py-2 border border-white/20 rounded-lg bg-surface/50 text-primary focus:outline-none focus:border-purple-500/50 text-base sm:text-sm min-h-[44px] sm:min-h-0"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={handleLoadData}
              disabled={loading}
              className="px-4 sm:px-6 py-3 sm:py-2 bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-[44px] sm:min-h-0 flex-1 sm:flex-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              載入資料
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
          <label className="flex items-center gap-2 sm:ml-auto cursor-pointer touch-manipulation">
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
          {/* 統計卡片 */}
          {summaryCards}

          {/* 航班列表 */}
      {loading && !flightData ? (
        <SkeletonScreen />
      ) : flightData && flightData.flights ? (
        <div className="space-y-4">
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
          {flightData.flights.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <p>當天沒有航班資料</p>
            </div>
          ) : viewMode === 'simple' ? (
            <div 
              ref={exportTableRef}
              className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-lg"
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
                    {flightData.flights.map((flight, idx) => {
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
                          className={`border-b border-white/10 transition-all duration-200 ${
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
              {flightData.flights.map((flight, idx) => (
                <FlightItem key={idx} flight={flight} />
              ))}
            </div>
          )}
        </div>
      ) : null}
        </>
      )}

      {/* 統計分析 Tab */}
      {activeTab === 'statistics' && (
        <div className="space-y-6">
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
              <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-primary mb-4">時間分布（每小時航班數）（當天）</h3>
                <ResponsiveContainer width="100%" height={300}>
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
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">載入天數：</span>
              <select
                onChange={(e) => loadMultiDayData(parseInt(e.target.value))}
                className="px-4 py-2 border border-white/20 rounded-lg bg-surface/50 text-primary focus:outline-none focus:border-purple-500/50"
                defaultValue="7"
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
            <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-primary mb-4">每天航班總數統計</h3>
              <ResponsiveContainer width="100%" height={300}>
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
            <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-primary mb-4">每小時航班數趨勢（多天比較）</h3>
              <ResponsiveContainer width="100%" height={300}>
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
          <p>選擇上方日期並點擊「載入資料」按鈕</p>
        </div>
      )}
    </div>
  )
}

export default FlightDataContent
