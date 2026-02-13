import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  MusicalNoteIcon, 
  CloudIcon,
  CalendarIcon,
  ArrowLeftIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { Suspense, lazy } from 'react'
import LoadingPage from './LoadingPage'

// 懶加載音樂、天氣、班表、圖表組件
const MusicContent = lazy(() => import('../components/playground/MusicContent'))
const WeatherContent = lazy(() => import('../components/playground/WeatherContent'))
const ScheduleManager = lazy(() => import('../components/playground/ScheduleManager'))
const EchartsDemo = lazy(() => import('./EchartsDemo'))

function Playground() {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentPage, setCurrentPage] = useState(null)
  
  // 從 URL hash 獲取當前頁面
  useEffect(() => {
    const hash = location.hash
    if (hash.includes('#music')) {
      setCurrentPage('music')
    } else if (hash.includes('#weather')) {
      setCurrentPage('weather')
    } else if (hash.includes('#schedule')) {
      setCurrentPage('schedule')
    } else if (hash.includes('#charts')) {
      setCurrentPage('charts')
    } else {
      setCurrentPage(null)
    }
  }, [location.hash])

  // 如果沒有指定頁面，顯示目錄
  if (currentPage === null) {
    return (
      <div className="container-custom py-8">
        <div className="max-w-4xl mx-auto">
          {/* 標題區域 */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
                <MusicalNoteIcon className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-primary mb-1">Playground</h1>
                <p className="text-text-secondary">
                  實驗一些實驗
                </p>
              </div>
            </div>
          </div>

          {/* 目錄 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 音樂 */}
            <button
              onClick={() => navigate('/playground#music')}
              className="group bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-all hover:scale-105"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg group-hover:scale-110 transition-transform">
                  <MusicalNoteIcon className="w-6 h-6 text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-primary">音樂</h2>
              </div>
            </button>

            {/* 天氣 */}
            <button
              onClick={() => navigate('/playground#weather')}
              className="group bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-cyan-500/30 transition-all hover:scale-105"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-lg group-hover:scale-110 transition-transform">
                  <CloudIcon className="w-6 h-6 text-cyan-400" />
                </div>
                <h2 className="text-xl font-bold text-primary">天氣</h2>
              </div>
            </button>

            {/* 班表匯出 */}
            <button
              onClick={() => navigate('/playground#schedule')}
              className="group bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-green-500/30 transition-all hover:scale-105"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg group-hover:scale-110 transition-transform">
                  <CalendarIcon className="w-6 h-6 text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-primary">班表匯出</h2>
              </div>
            </button>

            {/* Charts Testing */}
            <button
              onClick={() => navigate('/playground#charts')}
              className="group bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-amber-500/30 transition-all hover:scale-105"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg group-hover:scale-110 transition-transform">
                  <ChartBarIcon className="w-6 h-6 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-primary">Charts Testing</h2>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 顯示對應的內容頁面
  return (
    <div className="container-custom py-8">
      <div className="max-w-6xl mx-auto">
        {/* 返回按鈕 */}
        <button
          onClick={() => navigate('/playground')}
          className="flex items-center gap-2 mb-6 text-text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>返回目錄</span>
        </button>

        {/* 內容區域 */}
        <Suspense fallback={<LoadingPage />}>
          {currentPage === 'music' && <MusicContent />}
          {currentPage === 'weather' && <WeatherContent />}
          {currentPage === 'schedule' && <ScheduleManager />}
          {currentPage === 'charts' && <EchartsDemo />}
        </Suspense>
      </div>
    </div>
  )
}

export default Playground
