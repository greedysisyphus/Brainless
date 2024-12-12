import { useState, useEffect } from 'react'
import { parseFlightForecast, getForecastUrl } from '../utils/flightForecastParser'
import { Tab } from '@headlessui/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function FlightForecastTest() {
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

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

  // 渲染詳細數據
  const renderDetails = (data) => {
    if (!data?.rawData?.terminal2?.hourlyPassengers) return null
    
    const chartData = data.rawData.terminal2.hourlyPassengers.map(item => ({
      time: item.time,
      passengers: item.passengers
    }))

    return (
      <div className="bg-surface/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-6">詳細數據</h3>
        
        {/* 圖表區域 */}
        <div className="h-[400px] mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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
                  backgroundColor: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px'
                }}
                itemStyle={{ color: '#000000' }}
                labelStyle={{ color: '#666666' }}
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

        {/* 表格區域 */}
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
              {data.rawData.terminal2.hourlyPassengers.map(item => {
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
                  {data.analysis.totalPassengers.toLocaleString()} 人
                </td>
                <td className="p-3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // 修改 renderAnalysis 函數
  const renderAnalysis = (data) => {
    if (!data) return null
    
    return (
      <div className="space-y-6">
        <div className="bg-surface/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">分析結果</h3>
          
          <div className="grid gap-4">
            <div>
              <div className="text-sm text-text-secondary">最高人流時段</div>
              <div className="space-y-2">
                {data.analysis.morningPeaks.map((peak, index) => (
                  <div key={peak.time} className="text-xl font-bold">
                    {index + 1}. {peak.time}（{peak.passengers} 人）
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm text-text-secondary">預期店家尖峰</div>
              <div className="text-xl font-bold">
                {data.analysis.storeRushHour.start} - {data.analysis.storeRushHour.end}
              </div>
            </div>

            <div>
              <div className="text-sm text-text-secondary">總出境人數</div>
              <div className="text-xl font-bold">
                {data.analysis.totalPassengers} 人
              </div>
            </div>
          </div>
        </div>

        {/* 使用新的詳細數據渲染函數 */}
        {renderDetails(data)}
      </div>
    )
  }

  return (
    <div className="container-custom py-8">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="card-header">航班預報分析</h2>
          <div className="flex items-center gap-4">
            {lastUpdate && (
              <span className="text-sm text-text-secondary">
                最後更新：{lastUpdate.toLocaleString()}
              </span>
            )}
            <button 
              onClick={autoUpdate}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? '更新中...' : '立即更新'}
            </button>
          </div>
        </div>

        {/* 動上傳區（保留原有功能）*/}
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
                     hover:file:bg-primary/90"
          />
        </div>

        {/* 分析結果顯示 */}
        {result && (
          <Tab.Group>
            <Tab.List className="flex space-x-1 rounded-xl bg-surface/20 p-1 mb-6">
              <Tab className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                 ${selected 
                   ? 'bg-white text-primary shadow'
                   : 'text-text-secondary hover:bg-white/[0.12] hover:text-text'
                 }`
              }>
                今日預報
              </Tab>
              <Tab className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                 ${selected
                   ? 'bg-white text-primary shadow'
                   : 'text-text-secondary hover:bg-white/[0.12] hover:text-text'
                 }`
              }>
                明日預報
              </Tab>
            </Tab.List>
            <Tab.Panels>
              <Tab.Panel>{renderAnalysis(result.today)}</Tab.Panel>
              <Tab.Panel>{renderAnalysis(result.tomorrow)}</Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        )}

        {error && (
          <div className="text-error mt-4">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default FlightForecastTest 