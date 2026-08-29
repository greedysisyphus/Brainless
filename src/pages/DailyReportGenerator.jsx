import { useMemo, useState } from 'react'
import JSZip from 'jszip'
import {
  CalendarIcon,
  BuildingStorefrontIcon,
  ArchiveBoxArrowDownIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'
import { DualThemePage } from '../components/studio/DualThemePage'
import {
  CwAlert,
  CwButton,
  CwCard,
  CwGrid,
  CwInput,
  CwSelect,
  CwStack,
} from '../components/studio/ui'

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


  const studioReportInner = (
    <CwStack className="!gap-[var(--cw-stack-gap)] max-w-4xl">
      <CwCard title="模式" subtitle="預製 ZIP 或本機自訂樣板打包">
        <div className="flex flex-wrap gap-2">
          <CwButton type="button" variant={mode === 'preset' ? 'primary' : 'secondary'} onClick={() => setMode('preset')}>
            預製下載
          </CwButton>
          <CwButton type="button" variant={mode === 'custom' ? 'primary' : 'secondary'} onClick={() => setMode('custom')}>
            自訂 Template
          </CwButton>
        </div>
      </CwCard>

      <CwCard title="選擇分店">
        <div className="flex flex-wrap gap-2">
          {STORE_OPTIONS.map((store) => (
            <CwButton
              key={store.value}
              type="button"
              variant={selectedStore === store.value ? 'primary' : 'secondary'}
              onClick={() => setSelectedStore(store.value)}
            >
              {store.label}
            </CwButton>
          ))}
        </div>
      </CwCard>

      {mode === 'preset' ? (
        <CwGrid className="!grid-cols-1 md:!grid-cols-2">
          <CwCard title="選擇月份" subtitle="選擇要下載的月份報表">
            <CwSelect
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              selectClassName="cursor-pointer"
            >
              <option value="">請選擇月份</option>
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}（{getDaysInMonth(new Date().getFullYear(), parseInt(month.value, 10))} 天）
                </option>
              ))}
            </CwSelect>
          </CwCard>

          <CwCard title="下載報表" subtitle="下載選定月份的日報表 ZIP 檔">
            <CwButton
              type="button"
              variant="primary"
              className="w-full min-h-12"
              onClick={handleDownload}
              disabled={!selectedMonth}
            >
              <ArchiveBoxArrowDownIcon className="h-5 w-5 shrink-0" />
              下載日報表
            </CwButton>
            {selectedMonth ? (
              <p className="mt-4 text-center text-sm text-[var(--cw-text-muted)]">
                將下載：<strong className="text-[var(--cw-text)]">{selectedStoreLabel}</strong>{' '}
                <strong className="text-[var(--cw-text)]">{selectedMonthLabel}</strong>
              </p>
            ) : null}
          </CwCard>
        </CwGrid>
      ) : (
        <CwGrid className="!grid-cols-1 md:!grid-cols-2">
          <CwCard title="自訂 Template" subtitle="本機即時下載">
            <div className="flex flex-col gap-4 text-sm">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">範圍</p>
                <div className="flex flex-wrap gap-2">
                  <CwButton type="button" variant={customTarget === 'month' ? 'primary' : 'secondary'} onClick={() => setCustomTarget('month')}>
                    單月
                  </CwButton>
                  <CwButton type="button" variant={customTarget === 'year' ? 'primary' : 'secondary'} onClick={() => setCustomTarget('year')}>
                    全年
                  </CwButton>
                </div>
              </div>
              <CwInput
                label="年份"
                type="number"
                min={2000}
                max={2100}
                value={customYear}
                onChange={(e) => setCustomYear(e.target.value)}
              />
              <CwSelect
                label="月份"
                disabled={customTarget === 'year'}
                value={customMonth}
                onChange={(e) => setCustomMonth(e.target.value)}
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </CwSelect>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">樣板來源</p>
                <div className="flex flex-wrap gap-2">
                  <CwButton type="button" variant={templateSource === 'default' ? 'primary' : 'secondary'} onClick={() => setTemplateSource('default')}>
                    使用預設樣板
                  </CwButton>
                  <CwButton type="button" variant={templateSource === 'upload' ? 'primary' : 'secondary'} onClick={() => setTemplateSource('upload')}>
                    上傳 .numbers
                  </CwButton>
                </div>
                {templateSource === 'upload' ? (
                  <input
                    type="file"
                    accept=".numbers,application/zip"
                    className="mt-3 block w-full text-sm text-[var(--cw-text-muted)] file:mr-3 file:rounded-[var(--cw-radius)] file:border file:border-[var(--cw-border)] file:bg-[var(--cw-bg)] file:px-3 file:py-1.5 file:text-[var(--cw-text)]"
                    onChange={(e) => setUploadedTemplate(e.target.files?.[0] || null)}
                  />
                ) : null}
              </div>
            </div>
          </CwCard>

          <CwCard title="立即生成下載" subtitle="當場生成，不寫入 Repo">
            <div className="flex flex-col gap-4 text-sm">
              <p className="text-[var(--cw-text-muted)]">
                來源：
                {templateSource === 'default'
                  ? `預設 ${selectedStoreLabel} 樣板（${getStoreTemplateName(selectedStore)}）`
                  : `上傳檔案（${uploadedTemplate?.name || '尚未選擇'}）`}
              </p>
              <p className="text-[var(--cw-text-muted)]">
                輸出：
                {customTarget === 'year'
                  ? `${getStoreZipPrefix(selectedStore)}_${customYear}_Year_Package.zip`
                  : `${getStoreZipPrefix(selectedStore)}_${customMonth}_Month.zip`}
              </p>
              <CwButton type="button" variant="primary" className="w-full min-h-12" disabled={isCustomPacking} onClick={handlePackCustom}>
                {isCustomPacking ? '生成中…' : '開始生成並下載'}
              </CwButton>
              {customStatus.type !== 'idle' ? (
                <CwAlert
                  variant={
                    customStatus.type === 'error' ? 'error' : customStatus.type === 'success' ? 'success' : 'neutral'
                  }
                >
                  {customStatus.message}
                </CwAlert>
              ) : null}
            </div>
          </CwCard>
        </CwGrid>
      )}
    </CwStack>
  )


  return (
    <DualThemePage
      breadcrumbs={[
        { label: 'Brainless', href: '#/sandwich' },
        { label: '庫存與報表', href: '#/' },
        { label: '報表生成器', href: '#/daily-reports' },
      ]}
      title="報表生成器"
      description="為了部落"
      studio={studioReportInner}
    />
  )
}

export default DailyReportGenerator
