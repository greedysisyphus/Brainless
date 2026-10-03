import { useMemo, useState } from 'react'
import JSZip from 'jszip'


export const STORE_OPTIONS = [
  { value: 'central', label: '中央店' },
  { value: 'd7', label: 'D7 店' },
  { value: 'd13', label: 'D13 店' }
]

export const MONTH_OPTIONS = [
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

export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

export function getStoreZipPrefix(store) {
  if (store === 'd7') return 'D7_DailyReport'
  if (store === 'd13') return 'D13_DailyReport'
  return 'DailyReport'
}

export function getStoreTemplateName(store) {
  if (store === 'd7') return 'D7_template.numbers'
  if (store === 'd13') return 'D13_template.numbers'
  return 'Central_temple.numbers'
}

export function getStoreDailyName(store, month, day) {
  if (store === 'd7') return `D7日結表 ${month}-${day}.numbers`
  if (store === 'd13') return `D13日結表 ${month}-${day}.numbers`
  return `桃機日結表 ${month}-${day}.numbers`
}

export function triggerBlobDownload(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 報表生成器的邏輯：選分店與月份、下載預製 ZIP、用樣板在本機打包。Club 版和新版的畫面共用。
 */
export function useDailyReportGenerator() {
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

  return {
    selectedStore,
    setSelectedStore,
    selectedMonth,
    setSelectedMonth,
    mode,
    setMode,
    customTarget,
    setCustomTarget,
    customMonth,
    setCustomMonth,
    customYear,
    setCustomYear,
    templateSource,
    setTemplateSource,
    uploadedTemplate,
    setUploadedTemplate,
    customStatus,
    setCustomStatus,
    isCustomPacking,
    setIsCustomPacking,
    basePath,
    handleDownload,
    selectedStoreLabel,
    selectedMonthLabel,
    handlePackCustom,
  }
}
