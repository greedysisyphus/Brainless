import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  MusicalNoteIcon, 
  DocumentTextIcon,
  CloudIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { Suspense, lazy } from 'react'
import LoadingPage from './LoadingPage'

// 懶加載音樂、個人表格和天氣組件
const MusicContent = lazy(() => import('../components/playground/MusicContent'))
const PersonalTableGenerator = lazy(() => import('../components/PersonalTableGenerator'))
const WeatherContent = lazy(() => import('../components/playground/WeatherContent'))

function Playground() {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentPage, setCurrentPage] = useState(null)
  
  // 從 URL hash 獲取當前頁面
  useEffect(() => {
    const hash = location.hash
    if (hash.includes('#music')) {
      setCurrentPage('music')
    } else if (hash.includes('#table')) {
      setCurrentPage('table')
    } else if (hash.includes('#weather')) {
      setCurrentPage('weather')
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

            {/* 個人表格 */}
            <button
              onClick={() => navigate('/playground#table')}
              className="group bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-blue-500/30 transition-all hover:scale-105"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg group-hover:scale-110 transition-transform">
                  <DocumentTextIcon className="w-6 h-6 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-primary">個人表格</h2>
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
          {currentPage === 'table' && <PersonalTableGenerator />}
          {currentPage === 'weather' && <WeatherContent />}
        </Suspense>
      </div>
    </div>
  )
}

export default Playground
