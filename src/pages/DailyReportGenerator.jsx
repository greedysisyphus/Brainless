import { useState } from 'react'
import { 
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon
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
  const [selectedMonth, setSelectedMonth] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState('')
  const [showProgress, setShowProgress] = useState(false)

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

  // 內嵌的範本檔案（從 public 資料夾載入）
  const createTemplateFile = async () => {
    try {
      // 從 public 資料夾載入範本檔案
      const response = await fetch('/reports/template.numbers')
      if (!response.ok) {
        throw new Error('無法載入範本檔案')
      }
      const blob = await response.blob()
      // 設定正確的 MIME 類型
      return new Blob([blob], { type: 'application/vnd.apple.numbers' })
    } catch (error) {
      console.error('載入範本檔案失敗:', error)
      // 如果載入失敗，使用預設範本
      const templateContent = `
桃機報表範本
日期：__DATE__
營業時間：__TIME__
銷售額：__SALES__
備註：__NOTES__
      `.trim()
      
      return new Blob([templateContent], { type: 'application/vnd.apple.numbers' })
    }
  }

  // 生成日報表（改為直接下載現成 zip）
  const handleDownload = () => {
    if (!selectedMonth) return;
    const fileName = `桃機日結表_${selectedMonth}月.zip`;
    const url = `/reports/${fileName}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="container-custom py-6">
      <div className="max-w-2xl mx-auto">
        {/* 標題 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileIcon className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold mb-2 text-center">報表生成器</h1>
          </div>
          {/* 名人金句風格副標題（置中） */}
          <div className="mb-6">
            <blockquote className="italic text-gray-400 text-center text-base">
              「我愛改檔名」
              <span className="block text-xs text-gray-500 mt-1 text-center">— 紅葉</span>
            </blockquote>
          </div>
        </div>

        {/* 主要功能區域 */}
        <div className="space-y-6">
          {/* 月份選擇 */}
          <div className="card backdrop-blur-sm bg-surface/80 border border-white/20">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                選擇月份
              </h2>
              
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                  選擇要生成日報表的月份
                </p>
                
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="input-field w-full max-w-xs"
                >
                  <option value="">請選擇月份</option>
                  {months.map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label} ({getDaysInMonth(month.value)}天)
                    </option>
                  ))}
                </select>
                
                {selectedMonth && (
                  <div className="text-sm text-text-secondary">
                    將生成 {getDaysInMonth(selectedMonth)} 個日報表檔案
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 生成按鈕 */}
          <div className="card backdrop-blur-sm bg-surface/80 border border-white/20">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                <ArchiveIcon className="w-5 h-5" />
                生成日報表
              </h2>
              
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                  點擊下方按鈕開始生成整月日報表
                </p>
                
                <button
                  onClick={handleDownload}
                  disabled={!selectedMonth}
                  className="btn-primary w-full max-w-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下載日報表
                </button>
              </div>
            </div>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="card backdrop-blur-sm bg-red-500/10 border border-red-500/30">
              <div className="p-4 flex items-center gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                <span className="text-red-400">{error}</span>
              </div>
            </div>
          )}

          {/* 進度條 */}
          {showProgress && (
            <div className="card backdrop-blur-sm bg-surface/80 border border-white/20">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-primary">生成進度</h3>
                  <span className="text-sm text-text-secondary">{Math.round(progress)}%</span>
                </div>
                
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                
                {isComplete && (
                  <div className="mt-4 flex items-center gap-2 text-green-400">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>日報表生成完成！</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DailyReportGenerator 