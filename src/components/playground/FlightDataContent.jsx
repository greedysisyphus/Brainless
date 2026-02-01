import { useState, useEffect } from 'react'

function FlightDataContent() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [flightData, setFlightData] = useState(null)
  const [status, setStatus] = useState({ message: '', type: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 自動載入今天的資料
    loadFlightData(selectedDate)
  }, [])

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  const loadFlightData = async (date) => {
    if (!date) {
      setStatus({ message: '請選擇日期', type: 'error' })
      return
    }

    setLoading(true)
    setStatus({ message: '正在載入資料...', type: 'loading' })

    // 根據實際路徑調整
    // 生產環境：/Brainless/data/ (GitHub Pages)
    // 開發環境：/data/ (本地開發)
    const basePath = import.meta.env.PROD ? '/Brainless/data/' : '/data/'
    const dataUrl = `${basePath}flight-data-${date}.json`
    
    console.log('Loading data from:', dataUrl) // 調試用

    try {
      const response = await fetch(dataUrl)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`找不到 ${date} 的航班資料`)
        }
        throw new Error(`HTTP 錯誤: ${response.status}`)
      }

      const data = await response.json()
      setFlightData(data)
      setStatus({ message: `✅ 成功載入 ${formatDate(date)} 的資料`, type: 'success' })
    } catch (error) {
      setStatus({ message: `❌ 錯誤: ${error.message}`, type: 'error' })
      setFlightData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadData = () => {
    loadFlightData(selectedDate)
  }

  const handleLoadToday = () => {
    const today = new Date().toISOString().split('T')[0]
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

  const FlightItem = ({ flight }) => {
    const codeshareCount = flight.codeshare_flights ? flight.codeshare_flights.length : 0

    return (
      <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-lg p-4 hover:border-purple-500/30 transition-all">
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

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30 text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">✈️ 桃園機場 D11-D18 航班資料</h1>
        <p className="text-text-secondary">離境航班即時資訊</p>
      </div>

      {/* 控制區 */}
      <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="font-semibold text-primary">選擇日期：</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-white/20 rounded-lg bg-surface/50 text-primary focus:outline-none focus:border-purple-500/50"
          />
          <button
            onClick={handleLoadData}
            disabled={loading}
            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            載入資料
          </button>
          <button
            onClick={handleLoadToday}
            disabled={loading}
            className="px-6 py-2 bg-purple-500/50 hover:bg-purple-500/70 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            今天
          </button>
          <button
            onClick={handleLoadYesterday}
            disabled={loading}
            className="px-6 py-2 bg-purple-500/50 hover:bg-purple-500/70 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            昨天
          </button>
        </div>
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

      {/* 統計卡片 */}
      {flightData && flightData.summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 text-center text-white">
            <h3 className="text-sm opacity-90 mb-2">總航班數</h3>
            <div className="text-4xl font-bold mb-1">
              {flightData.summary.total_flights ?? 0}
            </div>
            <div className="text-xs opacity-80">班</div>
          </div>
          <div className="bg-gradient-to-br from-pink-500 to-red-500 rounded-xl p-6 text-center text-white">
            <h3 className="text-sm opacity-90 mb-2">17:00 前</h3>
            <div className="text-4xl font-bold mb-1">
              {flightData.summary['before_17:00'] ?? flightData.summary.before_17_00 ?? 0}
            </div>
            <div className="text-xs opacity-80">班</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl p-6 text-center text-white">
            <h3 className="text-sm opacity-90 mb-2">17:00 後</h3>
            <div className="text-4xl font-bold mb-1">
              {flightData.summary['after_17:00'] ?? flightData.summary.after_17_00 ?? 0}
            </div>
            <div className="text-xs opacity-80">班</div>
          </div>
        </div>
      )}

      {/* 航班列表 */}
      {flightData && flightData.flights && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-primary border-b-2 border-purple-500/30 pb-2">
            航班列表
          </h2>
          {flightData.flights.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <p>當天沒有航班資料</p>
            </div>
          ) : (
            <div className="space-y-3">
              {flightData.flights.map((flight, idx) => (
                <FlightItem key={idx} flight={flight} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 空狀態 */}
      {!flightData && !loading && (
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
