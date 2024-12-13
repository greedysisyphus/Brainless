import { useState, useEffect } from 'react'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'

function FlowForecastAlert() {
  const [forecastData, setForecastData] = useState(null)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // 從 localStorage 獲取預報數據
    const data = localStorage.getItem('forecastData')
    if (data) {
      const parsed = JSON.parse(data)
      if (parsed.tomorrow) {
        setForecastData(parsed.tomorrow)
      }
    }
  }, [])

  if (!forecastData || !isVisible) return null

  // 判斷是否是高峰日
  const isHighTraffic = forecastData.analysis.totalPassengers >= 23000

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="mb-6 relative overflow-hidden">
        {/* 主要容器 */}
        <div className="rounded-xl bg-gradient-to-r from-orange-400/20 to-primary/20 p-5 backdrop-blur-sm
                      border border-orange-400/20 shadow-lg">
          {/* 關閉按鈕 */}
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-3 right-3 text-text-secondary 
                       hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
          
          {/* 內容區域 */}
          <div className="flex items-start gap-4">
            {/* 圖標 */}
            <div className="p-2 rounded-lg bg-orange-400/10">
              <ExclamationTriangleIcon className="w-6 h-6 text-orange-400" />
            </div>

            {/* 文字內容 */}
            <div className="flex-1">
              <h3 className="font-medium text-lg bg-gradient-to-r from-orange-400 to-primary 
                           bg-clip-text text-transparent mb-2">
                明日人流提醒
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                明天預計總出境人數為 
                <span className="text-orange-400 font-medium mx-1">
                  {forecastData.analysis.totalPassengers.toLocaleString()}
                </span>
                人
                {isHighTraffic && (
                  <span className="block mt-1 text-orange-400">
                    ⚠️ 由於人流較多，建議多準備一些三明治
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* 裝飾性背景元素 */}
          <div className="absolute -top-12 -right-8 w-32 h-32 bg-orange-400/10 
                        rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-primary/10 
                        rounded-full blur-2xl pointer-events-none" />
        </div>
      </div>
    </div>
  )
}

export default FlowForecastAlert 