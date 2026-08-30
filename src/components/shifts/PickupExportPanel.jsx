import { Fragment, useCallback, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { ClipboardDocumentIcon, PhotoIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { CwAlert, CwBadge, CwButton, CwCard, CwDateInput, CwSelect } from '../studio/ui'
import { EXPORT_RANGES, UNSET_PICKUP, getStoreShortName, driverStopName, stopTime } from '../../pages/shifts/shiftConstants'
import { formatDateShort } from '../../pages/shifts/shiftModel'
import {
  buildPickupTable,
  findMissingPickups,
  renderDriverSchedule,
  renderDriverText,
  renderDriverTsv,
  renderPickupText,
  renderPickupTsv,
  resolveExportRange,
} from '../../pages/shifts/shiftExport'

function riderText(rider) {
  return `${rider.name}（${getStoreShortName(rider.workStore)}${rider.isSupport ? '·支援' : ''}）`
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** 匯出上車地點名單：一週／二週／整月，文字檔或表格圖檔。 */
const AUDIENCES = [
  { key: 'store', label: '店內版（含姓名）', hint: '給同事看，知道自己跟誰同車。' },
  { key: 'driver', label: '司機版（只有人數）', hint: '給司機看，不含任何同事姓名。' },
]

export function PickupExportPanel({ book, pickupByPerson, defaultDate, supportWarning }) {
  const [audience, setAudience] = useState('store')
  const [rangeKey, setRangeKey] = useState('week')
  const [startDate, setStartDate] = useState(defaultDate)
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const tableRef = useRef(null)

  const range = useMemo(() => resolveExportRange(rangeKey, startDate), [rangeKey, startDate])
  const table = useMemo(
    () => buildPickupTable(book, { ...range, pickupByPerson }),
    [book, range, pickupByPerson]
  )
  const missing = useMemo(
    () => findMissingPickups(book, { ...range, pickupByPerson }),
    [book, range, pickupByPerson]
  )

  const forDriver = audience === 'driver'
  const filenameBase = `${forDriver ? '交通車接送表_司機版' : '交通車上車名單'}_${range.from}_${range.to}`
  // 司機版直接用店長平常傳給司機的排班寫法，貼進聊天室就能發
  const renderText = forDriver ? renderDriverSchedule : renderPickupText
  const renderTsv = forDriver ? renderDriverTsv : renderPickupTsv

  const handleCopy = useCallback(async () => {
    const text = renderText(table)
    try {
      await navigator.clipboard.writeText(text)
      setStatus({ variant: 'success', message: '已複製文字名單，可直接貼到群組。' })
    } catch {
      setStatus({ variant: 'error', message: '瀏覽器不允許複製，請改用下載文字檔。' })
    }
  }, [table, renderText])

  const handleDownloadText = useCallback(() => {
    downloadBlob(`${filenameBase}.txt`, renderText(table), 'text/plain;charset=utf-8')
    setStatus({ variant: 'success', message: '文字檔已下載。' })
  }, [filenameBase, table, renderText])

  const handleDownloadTsv = useCallback(() => {
    downloadBlob(`${filenameBase}.tsv`, renderTsv(table), 'text/tab-separated-values;charset=utf-8')
    setStatus({ variant: 'success', message: '表格檔已下載，可貼進試算表。' })
  }, [filenameBase, table, renderTsv])

  const handleDownloadImage = useCallback(async () => {
    if (!tableRef.current) return
    setBusy(true)
    try {
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: '#fffdfa',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `${filenameBase}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      setStatus({ variant: 'success', message: '圖檔已下載。' })
    } catch (error) {
      setStatus({ variant: 'error', message: `產生圖檔失敗：${error.message}` })
    } finally {
      setBusy(false)
    }
  }, [filenameBase])

  return (
    <CwCard
      title="匯出上車地點"
      subtitle="依日期列出早班車與中班車的上車名單，可輸出文字檔或表格圖檔。"
      actions={
        <>
          <CwButton variant="secondary" onClick={handleCopy}>
            <ClipboardDocumentIcon className="h-4 w-4" />
            複製文字
          </CwButton>
          <CwButton variant="secondary" onClick={handleDownloadText}>
            <DocumentTextIcon className="h-4 w-4" />
            文字檔
          </CwButton>
          <CwButton variant="secondary" onClick={handleDownloadTsv}>
            表格檔
          </CwButton>
          <CwButton variant="brand" onClick={handleDownloadImage} disabled={busy}>
            <PhotoIcon className="h-4 w-4" />
            {busy ? '產生中…' : '圖檔'}
          </CwButton>
        </>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CwSelect
          label="給誰看"
          name="pickup-audience"
          value={audience}
          onChange={(event) => setAudience(event.target.value)}
          hint={AUDIENCES.find((a) => a.key === audience)?.hint}
        >
          {AUDIENCES.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </CwSelect>
        <CwSelect
          label="範圍"
          name="pickup-range"
          value={rangeKey}
          onChange={(event) => setRangeKey(event.target.value)}
        >
          {EXPORT_RANGES.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </CwSelect>
        <CwDateInput
          label={rangeKey === 'month' ? '月份內任一天' : '起始日'}
          name="pickup-start"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
        <div className="flex items-end text-sm text-[var(--cw-text-muted)]">
          {range.from ? `${formatDateShort(range.from)} ～ ${formatDateShort(range.to)}` : '請選日期'}
        </div>
      </div>

      {supportWarning ? <div className="mb-4">{supportWarning}</div> : null}

      {missing.length ? (
        <CwAlert variant="warning" title="有人還沒設定上車地點" className="mb-4">
          {missing.map((person) => `${person.name}（${person.days} 天）`).join('、')}
          ，名單裡會先列在「{UNSET_PICKUP}」。
        </CwAlert>
      ) : null}

      {status ? (
        <CwAlert variant={status.variant} className="mb-4">
          {status.message}
        </CwAlert>
      ) : null}

      {!table.dates.length ? (
        <p className="text-sm text-[var(--cw-text-muted)]">請先選擇日期範圍。</p>
      ) : !table.hasRiders ? (
        <p className="text-sm text-[var(--cw-text-muted)]">這段期間沒有人要坐交通車。</p>
      ) : (
        <div
          className="overflow-x-auto rounded-[var(--cw-radius)] border-b border-r border-[var(--cw-border)]"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div ref={tableRef} className="min-w-max bg-[var(--cw-surface)] p-4">
            <div className="mb-3">
              <div className="text-lg font-black text-[var(--cw-text)]">
                {forDriver ? '交通車接送表' : '交通車上車名單'}
              </div>
              <div className="text-xs text-[var(--cw-text-muted)]">
                {formatDateShort(range.from)} ～ {formatDateShort(range.to)}
              </div>
            </div>
            <table className="border-separate border-spacing-0 border-l border-t border-[var(--cw-border)] text-xs">
              <thead>
                <tr>
                  <th className="border-b border-r border-[var(--cw-border)] bg-[var(--cw-mega-surface)] px-2 py-1.5 text-center font-semibold text-[var(--cw-text-muted)]">
                    車次
                  </th>
                  <th className="border-b border-r border-[var(--cw-border)] bg-[var(--cw-mega-surface)] px-2 py-1.5 text-center font-semibold text-[var(--cw-text-muted)]">
                    上車地點
                  </th>
                  {table.dates.map((date) => (
                    <th
                      key={date.dateKey}
                      className={`min-w-[92px] border-b border-r border-[var(--cw-border)] px-2 py-1.5 text-center font-semibold ${
                        date.isWeekend
                          ? 'bg-[var(--cw-brand-muted)] text-[var(--cw-brand-strong)]'
                          : 'bg-[var(--cw-mega-surface)] text-[var(--cw-text-muted)]'
                      }`}
                    >
                      <div>
                        {date.day}（{date.weekday}）
                      </div>
                      {date.holiday ? (
                        <div className="text-[10px] text-[var(--cw-brand)]">{date.holiday}</div>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.sections.map((section) => (
                  <Fragment key={section.shift}>
                    {section.rows.map((row, rowIndex) => (
                      <tr key={`${section.shift}-${row.location}`}>
                        {rowIndex === 0 ? (
                          <th
                            rowSpan={section.rows.length + 1}
                            className="border-b border-r border-[var(--cw-border)] bg-[var(--cw-mega-surface)] px-2 py-1.5 text-center align-middle font-bold text-[var(--cw-text)]"
                          >
                            <div>{forDriver ? section.ordinalLabel : section.label}</div>
                            {forDriver ? (
                              <div className="text-[11px] font-normal text-[var(--cw-text-muted)]">
                                {section.label}
                              </div>
                            ) : null}
                          </th>
                        ) : null}
                        <th
                          className={`whitespace-nowrap border-b border-r border-[var(--cw-border)] px-2 py-1.5 text-center align-middle font-semibold ${
                            row.location === UNSET_PICKUP
                              ? 'text-[var(--cw-warning)]'
                              : 'text-[var(--cw-text)]'
                          }`}
                        >
                          <div>{forDriver ? driverStopName(row.location) : row.location}</div>
                          {stopTime(row.location, section.shift) ? (
                            <div className="text-[11px] font-semibold tabular-nums text-[var(--cw-brand-strong)]">
                              {stopTime(row.location, section.shift)}
                            </div>
                          ) : null}
                        </th>
                        {row.cells.map((cell) => (
                          <td
                            key={cell.dateKey}
                            className={`border-b border-r border-[var(--cw-border)] px-2 py-1.5 text-center align-middle text-[var(--cw-text)] ${
                              forDriver ? 'tabular-nums' : ''
                            }`}
                          >
                            {!cell.riders.length ? (
                              <span className="text-[var(--cw-text-muted)]/50">—</span>
                            ) : forDriver ? (
                              <span className="font-semibold">{cell.riders.length}</span>
                            ) : (
                              cell.riders.map((rider) => (
                                <div key={rider.personKey}>{riderText(rider)}</div>
                              ))
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr key={`${section.shift}-total`} className="bg-[var(--cw-mega-surface)]">
                      <th className="border-b border-r border-[var(--cw-border)] px-2 py-1.5 text-center align-middle font-semibold text-[var(--cw-text-muted)]">
                        小計
                      </th>
                      {section.totals.map((total, index) => (
                        <td
                          key={table.dates[index].dateKey}
                          className="border-b border-r border-[var(--cw-border)] px-2 py-1.5 text-center align-middle font-semibold tabular-nums text-[var(--cw-text)]"
                        >
                          {total}
                        </td>
                      ))}
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[10px] text-[var(--cw-text-muted)]">
              {forDriver
                ? '早班車 04:00 發車、04:30 到店；中班車 05:00 發車、05:30 到店。兩台車分開，數字為該站要接的人數。'
                : '早班車 04:00 發車、04:30 到店；中班車 05:00 發車、05:30 到店。兩台車分開，括號為當天上班的店。'}
            </p>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-[var(--cw-text-muted)]">
        {forDriver
          ? '司機版不含任何同事姓名，只有站點與人數。'
          : '店內版含姓名與當天上班的店。'}
        文字檔適合貼進群組；表格檔（.tsv）可貼進試算表；圖檔就是上面這張表。
        {table.hasRiders ? <CwBadge className="ml-2">{table.dates.length} 天</CwBadge> : null}
      </p>
    </CwCard>
  )
}

export default PickupExportPanel
