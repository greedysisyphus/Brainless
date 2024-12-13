import { useState, useEffect } from 'react'
import { parseFlightForecast, getForecastUrl } from '../utils/flightForecastParser'
import { Tab } from '@headlessui/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts'
import { ChartBarIcon, ClockIcon, UsersIcon } from '@heroicons/react/24/outline'

function FlightForecast() {
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showFileInfo, setShowFileInfo] = useState(false)

  // 組件掛載時檢查是否需要更新
  useEffect(() => {
    const checkAndUpdate = async () => {
      // 從 localStorage 獲取上次更新時間
      const lastUpdateStr = localStorage.getItem('lastForecastUpdate')
      const lastUpdate = lastUpdateStr ? new Date(lastUpdateStr) : null
      
      // 如果沒有上次更新時間，或者上次更新不是今天，則更新
      const now = new Date()
      const needsUpdate = !lastUpdate || 
        lastUpdate.toDateString() !== now.toDateString()
      
      if (needsUpdate) {
        await autoUpdate()
      } else {
        // 如果有緩存的數據，直接使用
        const cachedData = localStorage.getItem('forecastData')
        if (cachedData) {
          setResult(JSON.parse(cachedData))
          setLastUpdate(new Date(lastUpdateStr))
        }
      }
    }

    checkAndUpdate()

    // 設定每天 00:05 的自動更新
    const calculateNextUpdate = () => {
      const now = new Date()
      const next = new Date(now)
      next.setDate(next.getDate() + 1)
      next.setHours(0, 5, 0, 0)
      return next.getTime() - now.getTime()
    }

    const timer = setTimeout(() => {
      autoUpdate()
      // 設定每24小時更新一次
      const dailyTimer = setInterval(autoUpdate, 24 * 60 * 60 * 1000)
      return () => clearInterval(dailyTimer)
    }, calculateNextUpdate())

    return () => clearTimeout(timer)
  }, [])

  // 自動更新函數
  const autoUpdate = async () => {
    setLoading(true)
    try {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      // 從 GitHub public data 獲取數據
      const [todayResponse, tomorrowResponse] = await Promise.all([
        fetch(getForecastUrl(today)),
        fetch(getForecastUrl(tomorrow))
      ])
      
      if (!todayResponse.ok || !tomorrowResponse.ok) {
        throw new Error('下載預報表失敗')
      }
      
      const [todayBlob, tomorrowBlob] = await Promise.all([
        todayResponse.blob(),
        tomorrowResponse.blob()
      ])
      
      const [todayResult, tomorrowResult] = await Promise.all([
        parseFlightForecast(todayBlob),
        parseFlightForecast(tomorrowBlob)
      ])
      
      const result = {
        today: todayResult,
        tomorrow: tomorrowResult
      }
      
      setResult(result)
      setError(null)
      
      // 儲存更新時間和數據到 localStorage
      const now = new Date()
      localStorage.setItem('lastForecastUpdate', now.toISOString())
      localStorage.setItem('forecastData', JSON.stringify(result))
      setLastUpdate(now)
      
    } catch (error) {
      console.error('自動更新失敗:', error)
      setError(`自動更新失敗: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    try {
      const result = await parseFlightForecast(file)
      setResult(result)
      setError(null)
    } catch (error) {
      console.error('解析失敗:', error)
      setError(`解析失敗: ${error.message}`)
      setResult(null)
    }
  }

  // 修改 renderAnalysis 函數
  const renderAnalysis = (data) => {
    if (!data?.analysis) return null
    
    const { analysis, rawData } = data
    const { morningPeaks, storeRushHour, totalPassengers } = analysis
    
    return (
      <div className="space-y-6">
        {/* 分析結果卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 最高人流時段 */}
          <div className="card bg-gradient-to-br from-primary/10 to-surface p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <ChartBarIcon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">最高人流時段</h3>
            </div>
            <div className="space-y-2">
              {morningPeaks?.map((peak, index) => (
                <div key={peak.time} 
                     className="flex justify-between items-center p-3 rounded-lg bg-surface/50">
                  <span className="text-text-secondary">
                    {index + 1}. {peak.time}
                  </span>
                  <span className="font-medium text-primary">
                    {peak.passengers?.toLocaleString()} 人
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 預期店家尖峰 */}
          <div className="card bg-gradient-to-br from-secondary/10 to-surface p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-secondary/10">
                <ClockIcon className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-lg font-medium">預期店家尖峰</h3>
            </div>
            <div className="p-3 rounded-lg bg-surface/50">
              <div className="text-text-secondary mb-2">預計尖峰時段</div>
              <div className="text-xl font-medium text-secondary">
                {storeRushHour?.start} - {storeRushHour?.end}
              </div>
            </div>
          </div>

          {/* 總出境人數 */}
          <div className="card bg-gradient-to-br from-green-400/10 to-surface p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-400/10">
                <UsersIcon className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-medium">總出境人數</h3>
            </div>
            <div className="p-3 rounded-lg bg-surface/50">
              <div className="text-3xl font-bold text-green-400">
                {totalPassengers?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-text-secondary mt-1">人次</div>
            </div>
          </div>
        </div>

        {/* 圖表區域 */}
        <div className="card p-6">
          <h3 className="text-lg font-medium mb-6">詳細數據</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rawData.terminal2.hourlyPassengers}>
                <defs>
                  <linearGradient id="colorPassengers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis 
                  dataKey="time" 
                  stroke="#ffffff60"
                  tick={{ fill: '#ffffff90' }}
                />
                <YAxis 
                  stroke="#ffffff60"
                  tick={{ fill: '#ffffff90' }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                  itemStyle={{ color: '#ffffff' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area
                  type="monotone"
                  dataKey="passengers"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorPassengers)"
                />
                <Line 
                  type="monotone" 
                  dataKey="passengers" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="出境人數"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 表格區域 */}
        <div className="card p-6">
          <h3 className="text-lg font-medium mb-6">詳細時段數據</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="text-left p-3 font-semibold text-sm text-text-secondary">時段</th>
                  <th className="text-right p-3 font-semibold text-sm text-text-secondary">預估人數</th>
                  <th className="text-left p-3 font-semibold text-sm text-text-secondary">人流量</th>
                </tr>
              </thead>
              <tbody>
                {rawData.terminal2.hourlyPassengers.map(item => {
                  const getStatus = (count) => {
                    if (count >= 3000) return ['高', 'ring-1 ring-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]']
                    if (count >= 1500) return ['中', 'ring-1 ring-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b]']
                    return ['低', 'ring-1 ring-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]']
                  }
                  
                  const [level, colorClass] = getStatus(item.passengers)
                  
                  return (
                    <tr 
                      key={item.time} 
                      className="border-t border-white/10 hover:bg-white/5"
                    >
                      <td className="p-3">{item.time}</td>
                      <td className="text-right p-3">
                        {item.passengers.toLocaleString()} 人
                      </td>
                      <td className="p-3">
                        <span 
                          className={`
                            inline-flex items-center justify-center 
                            w-12 h-6 rounded-full text-xs font-medium 
                            ${colorClass}
                          `}
                        >
                          {level}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                <tr className="border-t border-white/10 bg-white/5 font-semibold">
                  <td className="p-3">總計</td>
                  <td className="text-right p-3">
                    {totalPassengers?.toLocaleString() || 0} 人
                  </td>
                  <td className="p-3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // 新增一個函數來獲取檔案名稱
  const getFileNames = () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    return {
      today: `${today.getFullYear()}_${String(today.getMonth() + 1).padStart(2, '0')}_${String(today.getDate()).padStart(2, '0')}.xls`,
      tomorrow: `${tomorrow.getFullYear()}_${String(tomorrow.getMonth() + 1).padStart(2, '0')}_${String(tomorrow.getDate()).padStart(2, '0')}.xls`
    }
  }

  return (
    <div className="container-custom py-8">
      <div className="card">
        {/* 標題區域 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            航班預報分析
          </h2>
          <div className="flex items-center gap-4">
            {lastUpdate && (
              <span className="text-sm text-text-secondary">
                最後更新：{lastUpdate.toLocaleString()}
              </span>
            )}
            <button 
              onClick={autoUpdate}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? "更新中..." : "立即更新"}
            </button>
            <button 
              onClick={() => setShowUpload(!showUpload)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 
                       text-text-secondary rounded-lg transition-colors"
            >
              {showUpload ? '隱藏上傳' : '手動上傳'}
            </button>
            <button 
              onClick={() => setShowFileInfo(!showFileInfo)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 
                       text-text-secondary rounded-lg transition-colors"
            >
              {showFileInfo ? '隱藏檔案' : '檔案資訊'}
            </button>
          </div>
        </div>

        {/* 檔案資訊顯示區域 */}
        {showFileInfo && (
          <div className="mb-6 space-y-2">
            <div className="p-3 rounded-lg bg-surface/50">
              <div className="text-sm text-text-secondary">今日檔案</div>
              <div className="font-medium">{getFileNames().today}</div>
            </div>
            <div className="p-3 rounded-lg bg-surface/50">
              <div className="text-sm text-text-secondary">明日檔案</div>
              <div className="font-medium">{getFileNames().tomorrow}</div>
            </div>
          </div>
        )}

        {/* 手動上傳區域 - 使用條件渲染 */}
        {showUpload && (
          <div className="mb-8">
            <label className="block text-sm text-text-secondary mb-2">
              手動上傳預報表
            </label>
            <input
              type="file"
              accept=".xls,.ods"
              onChange={handleFileUpload}
              className="block w-full text-sm text-text-secondary
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-primary file:text-white
                       hover:file:bg-primary/90
                       cursor-pointer"
            />
          </div>
        )}

        {/* Tab 區域 */}
        {result && (
          <Tab.Group>
            <Tab.List className="flex space-x-1 rounded-xl bg-surface/20 p-1 mb-6">
              {['今日預報', '明日預報'].map((tab) => (
                <Tab
                  key={tab}
                  className={({ selected }) => `
                    w-full rounded-lg py-2.5 text-sm font-medium leading-5
                    ring-white/60 ring-offset-2 ring-offset-surface focus:outline-none
                    ${selected 
                      ? 'bg-white text-primary shadow'
                      : 'text-text-secondary hover:bg-white/[0.12] hover:text-white'
                    }
                  `}
                >
                  {tab}
                </Tab>
              ))}
            </Tab.List>
            <Tab.Panels>
              <Tab.Panel>{renderAnalysis(result.today)}</Tab.Panel>
              <Tab.Panel>{renderAnalysis(result.tomorrow)}</Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        )}

        {error && (
          <div className="bg-red-400/10 text-red-400 p-4 rounded-lg mt-4">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default FlightForecast 