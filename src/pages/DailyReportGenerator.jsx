import { useMemo, useState } from 'react'
import JSZip from 'jszip'
import { 
  CalendarIcon,
  BuildingStorefrontIcon,
  ArchiveBoxArrowDownIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline'

const STORE_OPTIONS = [
  { value: 'central', label: '中央店' },
  { value: 'd7', label: 'D7 店' },
  { value: 'd13', label: 'D13 店' }
]

const MONTH_OPTIONS = [
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

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function getStoreZipPrefix(store) {
  if (store === 'd7') return 'D7_DailyReport'
  if (store === 'd13') return 'D13_DailyReport'
  return 'DailyReport'
}

function getStoreTemplateName(store) {
  if (store === 'd7') return 'D7_template.numbers'
  if (store === 'd13') return 'D13_template.numbers'
  return 'Central_temple.numbers'
}

function getStoreDailyName(store, month, day) {
  if (store === 'd7') return `D7日結表 ${month}-${day}.numbers`
  if (store === 'd13') return `D13日結表 ${month}-${day}.numbers`
  return `桃機日結表 ${month}-${day}.numbers`
}

function triggerBlobDownload(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function DailyReportGenerator() {
  const [selectedStore, setSelectedStore] = useState('central') // 'central', 'd7', or 'd13'
  const [selectedMonth, setSelectedMonth] = useState('')
  const [mode, setMode] = useState('preset') // 'preset' | 'custom'
  const [customTarget, setCustomTarget] = useState('month') // 'month' | 'year'
  const [customMonth, setCustomMonth] = useState('1')
  const [customYear, setCustomYear] = useState(String(new Date().getFullYear()))
  const [templateSource, setTemplateSource] = useState('default') // 'default' | 'upload'
  const [uploadedTemplate, setUploadedTemplate] = useState(null)
  const [customStatus, setCustomStatus] = useState({ type: 'idle', message: '' })
  const [isCustomPacking, setIsCustomPacking] = useState(false)
  const basePath = import.meta.env.BASE_URL || '/'

  // 生成日報表（改為直接下載現成 zip）
  const handleDownload = () => {
    if (!selectedMonth) return
    const prefix = getStoreZipPrefix(selectedStore)
    const fileName = `${prefix}_${selectedMonth}_Month.zip`

    // 檢查是否為開發環境
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const url = isDev 
      ? `/reports/${fileName}`  // 開發環境：使用相對路徑
      : `https://raw.githubusercontent.com/greedysisyphus/Brainless/main/public/reports/${fileName}` // 生產環境：使用 GitHub

    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const selectedStoreLabel = useMemo(
    () => STORE_OPTIONS.find((s) => s.value === selectedStore)?.label || '中央店',
    [selectedStore]
  )

  const selectedMonthLabel = useMemo(
    () => MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label || '',
    [selectedMonth]
  )

  const handlePackCustom = async () => {
    const y = parseInt(customYear, 10)
    if (!Number.isFinite(y) || y < 2000 || y > 2100) {
      setCustomStatus({ type: 'error', message: '年份請輸入 2000–2100。' })
      return
    }
    if (templateSource === 'upload' && !uploadedTemplate) {
      setCustomStatus({ type: 'error', message: '請先上傳 .numbers 樣板。' })
      return
    }

    setIsCustomPacking(true)
    setCustomStatus({ type: 'working', message: '準備樣板中…' })

    try {
      let templateBytes
      if (templateSource === 'upload') {
        templateBytes = await uploadedTemplate.arrayBuffer()
      } else {
        const templateName = getStoreTemplateName(selectedStore)
        const res = await fetch(`${basePath}reports/${templateName}`, { cache: 'no-cache' })
        if (!res.ok) throw new Error(`讀取預設樣板失敗 (${res.status})`)
        templateBytes = await res.arrayBuffer()
      }

      const prefix = getStoreZipPrefix(selectedStore)
      const monthsToBuild = customTarget === 'year' ? MONTH_OPTIONS.map((m) => m.value) : [customMonth]

      if (customTarget === 'month') {
        const m = parseInt(monthsToBuild[0], 10)
        setCustomStatus({ type: 'working', message: `正在打包 ${y} 年 ${m} 月…` })
        const zip = new JSZip()
        const days = getDaysInMonth(y, m)
        for (let d = 1; d <= days; d += 1) {
          zip.file(getStoreDailyName(selectedStore, m, d), templateBytes)
        }
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
        const outName = `${prefix}_${m}_Month.zip`
        triggerBlobDownload(blob, outName)
        setCustomStatus({ type: 'success', message: `完成：${outName}` })
      } else {
        setCustomStatus({ type: 'working', message: `正在打包 ${y} 全年（12 個月份）…` })
        const annual = new JSZip()
        for (const mStr of monthsToBuild) {
          const m = parseInt(mStr, 10)
          const monthZip = new JSZip()
          const days = getDaysInMonth(y, m)
          for (let d = 1; d <= days; d += 1) {
            monthZip.file(getStoreDailyName(selectedStore, m, d), templateBytes)
          }
          const monthBlob = await monthZip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
          annual.file(`${prefix}_${m}_Month.zip`, monthBlob)
        }
        const annualBlob = await annual.generateAsync({ type: 'blob', compression: 'DEFLATE' })
        const outName = `${prefix}_${y}_Year_Package.zip`
        triggerBlobDownload(annualBlob, outName)
        setCustomStatus({ type: 'success', message: `完成：${outName}` })
      }
    } catch (err) {
      setCustomStatus({ type: 'error', message: err?.message || '打包失敗，請稍後再試。' })
    } finally {
      setIsCustomPacking(false)
    }
  }

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

        {/* 模式切換 */}
        <div className="mb-6 sm:mb-7 md:mb-8">
          <div className="mx-auto max-w-2xl bg-surface/60 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 border border-white/10">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setMode('preset')}
                className={`px-4 py-3 rounded-xl text-sm sm:text-base font-semibold transition-colors ${
                  mode === 'preset'
                    ? 'bg-gradient-to-r from-primary via-purple-500 to-blue-500 text-white'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                預製下載
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`px-4 py-3 rounded-xl text-sm sm:text-base font-semibold transition-colors ${
                  mode === 'custom'
                    ? 'bg-gradient-to-r from-primary via-purple-500 to-blue-500 text-white'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                自訂 Template
              </button>
            </div>
          </div>
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
              {STORE_OPTIONS.map((store) => {
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

        {mode === 'preset' ? (
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
                  {MONTH_OPTIONS.map(month => (
                      <option key={month.value} value={month.value} className="bg-surface text-white">
                      {month.label} ({getDaysInMonth(new Date().getFullYear(), parseInt(month.value, 10))}天)
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
                        {selectedStoreLabel} {selectedMonthLabel}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative backdrop-blur-xl bg-gradient-to-br from-surface/90 via-surface/70 to-surface/90 border-2 border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5 relative z-10">
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/40 shadow-lg">
                    <ArrowUpTrayIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                      自訂 Template
                    </h2>
                    <p className="text-[10px] sm:text-xs md:text-sm text-text-secondary">本機即時下載</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-text-secondary mb-2">範圍</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomTarget('month')}
                        className={`px-3 py-2 rounded-lg border transition-colors ${
                          customTarget === 'month'
                            ? 'border-primary/50 bg-primary/20 text-primary'
                            : 'border-white/15 bg-surface/40 text-text-secondary'
                        }`}
                      >
                        單月
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomTarget('year')}
                        className={`px-3 py-2 rounded-lg border transition-colors ${
                          customTarget === 'year'
                            ? 'border-primary/50 bg-primary/20 text-primary'
                            : 'border-white/15 bg-surface/40 text-text-secondary'
                        }`}
                      >
                        全年
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-text-secondary">年份</span>
                      <input
                        type="number"
                        min={2000}
                        max={2100}
                        value={customYear}
                        onChange={(e) => setCustomYear(e.target.value)}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-surface/40 text-primary"
                      />
                    </label>
                    <label className="block">
                      <span className="text-text-secondary">月份</span>
                      <select
                        value={customMonth}
                        disabled={customTarget === 'year'}
                        onChange={(e) => setCustomMonth(e.target.value)}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-surface/40 text-primary disabled:opacity-50"
                      >
                        {MONTH_OPTIONS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div>
                    <p className="text-text-secondary mb-2">樣板來源</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTemplateSource('default')}
                        className={`px-3 py-2 rounded-lg border transition-colors ${
                          templateSource === 'default'
                            ? 'border-primary/50 bg-primary/20 text-primary'
                            : 'border-white/15 bg-surface/40 text-text-secondary'
                        }`}
                      >
                        使用預設樣板
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateSource('upload')}
                        className={`px-3 py-2 rounded-lg border transition-colors ${
                          templateSource === 'upload'
                            ? 'border-primary/50 bg-primary/20 text-primary'
                            : 'border-white/15 bg-surface/40 text-text-secondary'
                        }`}
                      >
                        上傳 .numbers
                      </button>
                    </div>
                    {templateSource === 'upload' && (
                      <div className="mt-3">
                        <input
                          type="file"
                          accept=".numbers,application/zip"
                          onChange={(e) => setUploadedTemplate(e.target.files?.[0] || null)}
                          className="block w-full text-sm text-text-secondary file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-white/20 file:bg-surface/50 file:text-primary hover:file:bg-surface/70"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative backdrop-blur-xl bg-gradient-to-br from-surface/90 via-surface/70 to-surface/90 border-2 border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5 relative z-10">
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/40 shadow-lg">
                    <ArchiveBoxArrowDownIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                      立即生成下載
                    </h2>
                    <p className="text-[10px] sm:text-xs md:text-sm text-text-secondary">當場生成，不寫入 Repo</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-sm text-text-secondary leading-relaxed">
                    <p>
                      來源：{templateSource === 'default'
                        ? `預設 ${selectedStoreLabel} 樣板（${getStoreTemplateName(selectedStore)}）`
                        : `上傳檔案（${uploadedTemplate?.name || '尚未選擇'}）`}
                    </p>
                    <p>
                      輸出：{customTarget === 'year'
                        ? `${getStoreZipPrefix(selectedStore)}_${customYear}_Year_Package.zip`
                        : `${getStoreZipPrefix(selectedStore)}_${customMonth}_Month.zip`}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isCustomPacking}
                    onClick={handlePackCustom}
                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-primary via-purple-500 to-blue-500 text-white font-bold text-base rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCustomPacking ? '生成中…' : '開始生成並下載'}
                  </button>

                  {customStatus.type !== 'idle' && (
                    <p
                      className={`text-sm ${
                        customStatus.type === 'error'
                          ? 'text-red-300'
                          : customStatus.type === 'success'
                            ? 'text-emerald-300'
                            : 'text-primary'
                      }`}
                    >
                      {customStatus.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DailyReportGenerator 
