import { ArchiveBoxArrowDownIcon } from '@heroicons/react/24/outline'
import { DualThemePage } from '../components/studio/DualThemePage'
import { CwAlert, CwButton, CwCard, CwGrid, CwInput, CwSelect, CwStack } from '../components/studio/ui'
import { useDailyReportGenerator, STORE_OPTIONS, MONTH_OPTIONS, getDaysInMonth, getStoreZipPrefix, getStoreTemplateName } from './useDailyReportGenerator'

function DailyReportGenerator() {
  const m = useDailyReportGenerator()
  const {
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
    isCustomPacking,
    handleDownload,
    selectedStoreLabel,
    selectedMonthLabel,
    handlePackCustom,
  } = m

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
