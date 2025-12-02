import { useState } from 'react'
import { 
  CalendarIcon,
  BuildingStorefrontIcon,
  ArchiveBoxArrowDownIcon
} from '@heroicons/react/24/outline'

function DailyReportGenerator() {
  const [selectedStore, setSelectedStore] = useState('central') // 'central', 'd7', or 'd13'
  const [selectedMonth, setSelectedMonth] = useState('')
  
  // 店鋪選項
  const stores = [
    { value: 'central', label: '中央店' },
    { value: 'd7', label: 'D7 店' },
    { value: 'd13', label: 'D13 店' }
  ]

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
    let prefix = 'DailyReport';
    if (selectedStore === 'd7') {
      prefix = 'D7_DailyReport';
    } else if (selectedStore === 'd13') {
      prefix = 'D13_DailyReport';
    }
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
    <div className="container-custom py-4 sm:py-6 md:py-8">
      <div className="max-w-6xl mx-auto">
        {/* 頁面標題 - 超現代設計 */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10 relative">
          {/* 背景動態光暈 - 移動設備縮小 */}
          <div className="absolute inset-0 flex justify-center -z-10">
            <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow opacity-50"></div>
          </div>
          
          {/* 圖標容器 - 3D 效果 */}
          <div className="inline-flex items-center justify-center mb-4 sm:mb-5 md:mb-6 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-blue-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
            <div className="relative inline-flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-gradient-to-br from-primary/30 via-purple-500/30 to-blue-500/30 rounded-xl sm:rounded-2xl border-2 border-primary/50 shadow-2xl shadow-primary/30 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 overflow-hidden">
              {/* 流動背景 */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient bg-[length:200%_100%]"></div>
              <ArchiveBoxArrowDownIcon className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-primary relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          
          {/* 標題 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-2 sm:mb-3 relative px-4">
            <span className="bg-gradient-to-r from-primary via-purple-400 via-blue-400 to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient">
              報表生成器
            </span>
            {/* 文字發光效果 */}
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-purple-400 via-blue-400 to-primary bg-clip-text text-transparent blur-xl opacity-30 -z-10 animate-pulse-glow">
              報表生成器
            </span>
          </h1>
          
          {/* 副標題 */}
          <p className="text-gray-400 text-sm sm:text-base font-medium px-4">為了部落</p>
        </div>

        {/* 分店選擇 - 現代化分段控制器 */}
        <div className="mb-6 sm:mb-7 md:mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-5 md:mb-6">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg sm:rounded-xl border border-primary/20">
              <BuildingStorefrontIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-primary">選擇分店</h2>
          </div>
          
          {/* 分段控制器容器 - 簡化設計，優化性能 */}
          <div className="relative mx-auto max-w-2xl bg-surface/60 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 border border-white/10">
            {/* 滑動指示器 - 純 CSS 動畫，極簡實現 */}
            <div
              className="absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-primary via-purple-500 to-blue-500 transition-[transform] duration-200 ease-out"
              style={{
                width: 'calc(33.333% - 4px)',
                left: '4px',
                transform: selectedStore === 'central' ? 'translateX(0%)' :
                          selectedStore === 'd7' ? 'translateX(100%)' :
                          'translateX(200%)'
              }}
            />
            
            {/* 選項按鈕 - 簡化動畫效果 */}
            <div className="relative grid grid-cols-3 gap-1.5">
              {stores.map((store) => {
                const isSelected = selectedStore === store.value
                return (
                  <button
                    key={store.value}
                    onClick={() => setSelectedStore(store.value)}
                    className={`
                      relative z-10
                      px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5
                      rounded-lg sm:rounded-xl
                      font-bold text-xs sm:text-sm md:text-base
                      transition-colors duration-200
                      ${isSelected 
                        ? 'text-white' 
                        : 'text-gray-300 active:text-white'
                      }
                    `}
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation'
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full shadow-sm" />
                      )}
                      <span className="tracking-wide">{store.label}</span>
                    </span>
                    
                    {/* 選中時的背景效果 - 簡化版本 */}
                    {isSelected && (
                      <div className="absolute inset-0 rounded-xl bg-primary/10 opacity-100" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
          {/* 月份選擇卡片 - 超現代設計 */}
          <div className="relative group">
            {/* 卡片背景光暈 */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative backdrop-blur-xl bg-gradient-to-br from-surface/90 via-surface/70 to-surface/90 border-2 border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-2xl hover:shadow-primary/20 transition-all duration-500 transform hover:-translate-y-1 overflow-hidden">
              {/* 流動背景效果 */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-purple-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient bg-[length:200%_100%]"></div>
              
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5 md:mb-6 relative z-10">
                <div className="relative group/icon">
                  <div className="absolute inset-0 bg-primary/20 rounded-lg sm:rounded-xl blur-lg group-hover/icon:bg-primary/30 transition-all duration-300"></div>
                  <div className="relative p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/40 shadow-lg">
                    <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary transform group-hover/icon:scale-110 transition-transform duration-300" />
                  </div>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                    選擇月份
                  </h2>
                  <p className="text-[10px] sm:text-xs md:text-sm text-text-secondary">選擇要下載的月份報表</p>
                </div>
              </div>

              <div className="relative z-10">
                <div className="relative w-full">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="relative w-full pl-4 pr-12 py-3 bg-surface/60 border-2 border-white/10 focus:border-primary/50 focus:bg-surface/80 rounded-xl transition-all duration-300 text-base text-white cursor-pointer appearance-none hover:bg-surface/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="" className="bg-surface text-gray-400">請選擇月份</option>
                    {months.map(month => (
                      <option key={month.value} value={month.value} className="bg-surface text-white">
                        {month.label} ({getDaysInMonth(month.value)}天)
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 下載按鈕卡片 - 超現代設計 */}
          <div className="relative group">
            {/* 卡片背景光暈 */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative backdrop-blur-xl bg-gradient-to-br from-surface/90 via-surface/70 to-surface/90 border-2 border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-2xl hover:shadow-primary/20 transition-all duration-500 transform hover:-translate-y-1 overflow-hidden">
              {/* 流動背景效果 */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-purple-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient bg-[length:200%_100%]"></div>
              
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5 md:mb-6 relative z-10">
                <div className="relative group/icon">
                  <div className="absolute inset-0 bg-primary/20 rounded-lg sm:rounded-xl blur-lg group-hover/icon:bg-primary/30 transition-all duration-300"></div>
                  <div className="relative p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/40 shadow-lg">
                    <ArchiveBoxArrowDownIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary transform group-hover/icon:scale-110 transition-transform duration-300" />
                  </div>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                    下載報表
                  </h2>
                  <p className="text-[10px] sm:text-xs md:text-sm text-text-secondary">下載選定月份的日報表 ZIP 文件</p>
                </div>
              </div>

              <div className="relative z-10">
                <button
                  onClick={handleDownload}
                  disabled={!selectedMonth}
                  className="group/btn relative w-full py-3 sm:py-4 bg-gradient-to-r from-primary via-purple-500 to-blue-500 text-white font-bold text-base rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <ArchiveBoxArrowDownIcon className="w-5 h-5" />
                    下載日報表
                  </span>
                  {selectedMonth && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                  )}
                </button>
                
                {selectedMonth && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-400">
                      將下載：<span className="text-primary font-semibold">
                        {selectedStore === 'central' ? '中央店' : selectedStore === 'd7' ? 'D7 店' : 'D13 店'} {months.find(m => m.value === selectedMonth)?.label}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DailyReportGenerator 
