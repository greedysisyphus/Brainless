import { useState } from 'react'
import { 
  CalendarIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline'

// 自定義檔案圖示
function FileIcon(props) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      {...props}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5}
        d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" 
      />
      <polyline points="14,2 14,8 20,8" />
    </svg>
  );
}

// 自定義壓縮檔圖示
function ArchiveIcon(props) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      {...props}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" 
      />
    </svg>
  );
}

function DailyReportGenerator() {
  const [selectedStore, setSelectedStore] = useState('central') // 'central' or 'd7'
  const [selectedMonth, setSelectedMonth] = useState('')

  // 月份選項
  const months = [
    { value: '1', label: '1月' },
    { value: '2', label: '2月' },
    { value: '3', label: '3月' },
    { value: '4', label: '4月' },
    { value: '5', label: '5月' },
    { value: '6', label: '6月' },
    { value: '7', label: '7月' },
    { value: '8', label: '8月' },
    { value: '9', label: '9月' },
    { value: '10', label: '10月' },
    { value: '11', label: '11月' },
    { value: '12', label: '12月' }
  ]

  // 獲取月份天數
  const getDaysInMonth = (month) => {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return daysInMonth[parseInt(month) - 1]
  }

  // 生成日報表（改為直接下載現成 zip）
  const handleDownload = () => {
    if (!selectedMonth) return;
    const prefix = selectedStore === 'd7' ? 'D7_DailyReport' : 'DailyReport';
    const fileName = `${prefix}_${selectedMonth}_Month.zip`;
    
    // 檢查是否為開發環境
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const url = isDev 
      ? `/reports/${fileName}`  // 開發環境：使用相對路徑
      : `https://raw.githubusercontent.com/greedysisyphus/Brainless/main/public/reports/${fileName}`; // 生產環境：使用 GitHub
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="container-custom py-8">
      <div className="max-w-3xl mx-auto">
        {/* 標題區域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-xl mb-3 border border-primary/30">
            <FileIcon className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary via-purple-400 to-blue-400 bg-clip-text text-transparent">
            報表生成器
          </h1>
          <p className="text-gray-400 text-sm italic">
            越來越多 Bugs...
          </p>
        </div>

        {/* 主要功能區域 */}
        <div className="space-y-6">
          {/* 分店選擇 */}
          <div className="card backdrop-blur-sm bg-gradient-to-br from-surface/80 to-surface/40 border border-white/20 shadow-xl">
            <div className="p-6">
              <h2 className="text-lg font-bold text-primary mb-4 flex items-center justify-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <BuildingStorefrontIcon className="w-5 h-5" />
                </div>
                選擇分店
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedStore('central')}
                    className={`group relative px-4 py-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                      selectedStore === 'central'
                        ? 'bg-gradient-to-br from-primary/30 to-purple-500/30 border-primary shadow-lg shadow-primary/20'
                        : 'bg-surface/40 border-white/20 hover:border-primary/50'
                    }`}
                  >
                    <div className={`text-center ${selectedStore === 'central' ? 'text-primary' : 'text-gray-300'}`}>
                      <div className="text-xl font-bold">中央店</div>
                    </div>
                    {selectedStore === 'central' && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedStore('d7')}
                    className={`group relative px-4 py-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                      selectedStore === 'd7'
                        ? 'bg-gradient-to-br from-primary/30 to-purple-500/30 border-primary shadow-lg shadow-primary/20'
                        : 'bg-surface/40 border-white/20 hover:border-primary/50'
                    }`}
                  >
                    <div className={`text-center ${selectedStore === 'd7' ? 'text-primary' : 'text-gray-300'}`}>
                      <div className="text-xl font-bold">D7 店</div>
                    </div>
                    {selectedStore === 'd7' && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 月份選擇 */}
          <div className="card backdrop-blur-sm bg-gradient-to-br from-surface/80 to-surface/40 border border-white/20 shadow-xl">
            <div className="p-6">
              <h2 className="text-lg font-bold text-primary mb-4 flex items-center justify-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                <CalendarIcon className="w-5 h-5" />
                </div>
                選擇月份
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="relative w-full max-w-md">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                      className="input-field w-full appearance-none bg-surface/60 border-2 border-white/20 focus:border-primary transition-all duration-300 text-base py-3 px-4 rounded-xl hover:bg-surface/80 cursor-pointer text-center"
                >
                  <option value="">請選擇月份</option>
                  {months.map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label} ({getDaysInMonth(month.value)}天)
                    </option>
                  ))}
                </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 生成按鈕 */}
          <div className="card backdrop-blur-sm bg-gradient-to-br from-surface/80 to-surface/40 border border-white/20 shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="p-2 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-xl border border-primary/30">
                  <ArchiveIcon className="w-6 h-6 text-primary" />
                </div>
              </div>
              
              <div className="space-y-4 text-center">
                <button
                  onClick={handleDownload}
                  disabled={!selectedMonth}
                  className="group relative w-full max-w-md mx-auto px-6 py-4 bg-gradient-to-r from-primary via-purple-500 to-blue-500 text-white font-bold text-base rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 transform hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  下載日報表
                  </span>
                  {selectedMonth && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  )}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default DailyReportGenerator 