import { useCallback, useMemo, useState } from 'react'
import { createEvents } from 'ics'
import { ArrowDownTrayIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { CwAlert, CwBadge, CwButton, CwCard, CwEmptyState } from '../studio/ui'
import { WEEKDAY_LABELS, getStoreName, getStoreShortName } from '../../pages/shifts/shiftConstants'
import {
  DEFAULT_ICS_OPTIONS,
  buildEventTitle,
  buildPersonIcsEvents,
  buildPersonMonthGrid,
  getPersonMonthEntries,
  icsFilename,
  summarizePersonMonth,
} from '../../pages/shifts/shiftCalendar'
import { getShiftDisplay } from '../../pages/shifts/shiftVocab'
import { shiftSwatchStyle } from './shiftUi'

function DayCell({ day, onSelectDate }) {
  const work = day.records.filter((record) => record.kind === 'WORK')
  const leave = day.records.filter((record) => record.kind === 'LEAVE')

  return (
    <td
      className={`h-[104px] w-[14.28%] border border-[var(--cw-border)] p-1 align-top ${
        day.inMonth ? '' : 'bg-[var(--cw-mega-surface)]/60'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelectDate?.(day.dateKey)}
        className="flex h-full w-full flex-col gap-1 text-left"
      >
        <div className="flex items-center justify-between gap-1">
          <span
            className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
              day.isToday
                ? 'bg-[var(--cw-brand)] text-white'
                : day.inMonth
                  ? day.isWeekend
                    ? 'text-[var(--cw-brand-strong)]'
                    : 'text-[var(--cw-text)]'
                  : 'text-[var(--cw-text-muted)]/50'
            }`}
          >
            {day.day}
          </span>
          {day.holiday ? (
            <span className="truncate text-[10px] font-semibold text-[var(--cw-brand)]">
              {day.holiday}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          {work.map((record, index) => {
            const display = getShiftDisplay(record.displayMonth, record.shift)
            return (
              <span
                key={`${record.date}-w-${index}`}
                className={`block truncate rounded-[var(--cw-radius-sm)] px-1.5 py-1 text-[11px] font-semibold leading-tight ${
                  record.isSupport ? 'ring-1 ring-[var(--cw-brand)]/45' : ''
                }`}
                style={shiftSwatchStyle(record.shift, record.displayMonth)}
                title={[
                  record.shiftLabel,
                  record.start && record.end ? `${record.start}–${record.end}` : '無時間',
                  getStoreName(record.workStore),
                  record.positionLabel,
                  record.destinationMissing ? '該店班表未匯入，時間可能不準' : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              >
                <span className="block truncate">
                  {record.shiftUnknown ? record.shiftLabel : display?.label ?? record.shift}
                  {record.shiftInferred ? ' ?' : ''}
                  {record.destinationMissing ? ' ⚠' : ''}
                </span>
                <span className="block truncate font-normal opacity-80">
                  {record.start ? `${record.start} · ` : ''}
                  {getStoreShortName(record.workStore)}
                  {record.positionLabel ? ` · ${record.positionLabel}` : ''}
                </span>
              </span>
            )
          })}

          {leave.map((record, index) => (
            <span
              key={`${record.date}-l-${index}`}
              className="block truncate rounded-[var(--cw-radius-sm)] border border-dashed border-[var(--cw-border-strong)] px-1.5 py-0.5 text-[11px] text-[var(--cw-text-muted)]"
              title={record.leave === 'SCHEDULING' ? '店長排班日，不上班' : record.leaveLabel}
            >
              {record.leaveMarker} {record.leaveLabel}
            </span>
          ))}
        </div>
      </button>
    </td>
  )
}

/** 單一同事的月視圖，格式接近 Apple 行事曆；可匯出 .ics 加進手機行事曆。 */
export function PersonMonthCalendar({ book, person, monthKey, onSelectDate }) {
  const [status, setStatus] = useState(null)
  const [icsOptions, setIcsOptions] = useState(DEFAULT_ICS_OPTIONS)
  const setOption = (key) => (event) =>
    setIcsOptions((prev) => ({ ...prev, [key]: event.target.checked }))

  const grid = useMemo(
    () => buildPersonMonthGrid(book, person?.key, monthKey),
    [book, person, monthKey]
  )
  const summary = useMemo(
    () => summarizePersonMonth(book, person?.key, monthKey),
    [book, person, monthKey]
  )

  /** 拿這個月第一筆實際的班當標題預覽，勾選項一改就看得到結果 */
  const titlePreview = useMemo(() => {
    if (!person) return ''
    const byDate = getPersonMonthEntries(book, person.key, monthKey)
    for (const date of [...byDate.keys()].sort()) {
      const record = byDate.get(date).find((r) => r.kind === 'WORK')
      if (record) return buildEventTitle(record, icsOptions)
    }
    return buildEventTitle({ shiftLabel: '早班', workStore: 'central', positionLabel: '主吧' }, icsOptions)
  }, [book, person, monthKey, icsOptions])

  const download = useCallback(
    (monthKeys) => {
      const events = buildPersonIcsEvents(book, person.key, { monthKeys, ...icsOptions })
      if (!events.length) {
        setStatus({ variant: 'warning', message: '這個範圍沒有可匯出的班。' })
        return
      }
      createEvents(events, (error, value) => {
        if (error) {
          setStatus({ variant: 'error', message: `產生行事曆檔失敗：${error.message || error}` })
          return
        }
        const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = icsFilename(person.name, monthKeys)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        setStatus({
          variant: 'success',
          message: `已匯出 ${events.length} 筆行程。在手機上打開這個檔案就能加進行事曆。`,
        })
      })
    },
    [book, person, icsOptions]
  )

  if (!person) {
    return (
      <CwEmptyState
        title="選一位同事看月視圖"
        description="選了之後會用行事曆的排版顯示他整個月的班，並且可以匯出到手機行事曆。"
      />
    )
  }

  const hasAnything = grid.weeks.some((week) => week.some((day) => day.records.length))

  return (
    <CwCard
      title={`${person.name} · ${monthKey.replace('-', ' 年 ')} 月`}
      subtitle={
        hasAnything
          ? `上班 ${summary.workDays} 天 · 休假 ${summary.leaveDays} 天${
              summary.supportDays ? ` · 支援 ${summary.supportDays} 天` : ''
            }`
          : '這個月沒有他的班表資料'
      }
      actions={
        <>
          {Object.keys(summary.byStore).length > 1 ? <CwBadge tone="brand">跨店</CwBadge> : null}
          <CwButton variant="secondary" onClick={() => download([monthKey])}>
            <ArrowDownTrayIcon className="h-4 w-4" />
            匯出這個月
          </CwButton>
          <CwButton variant="brand" onClick={() => download(book.monthKeys)}>
            <CalendarDaysIcon className="h-4 w-4" />
            匯出全部月份
          </CwButton>
        </>
      }
    >
      <div className="mb-4 rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-mega-surface)] p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
          匯出選項
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--cw-text)]">
          <label className="cw-touch-target flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--cw-brand)]"
              checked={icsOptions.includeStore}
              onChange={setOption('includeStore')}
            />
            店名（同時作為地點）
          </label>
          <label className="cw-touch-target flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--cw-brand)]"
              checked={icsOptions.includePosition}
              onChange={setOption('includePosition')}
            />
            崗位
          </label>
          <label className="cw-touch-target flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--cw-brand)]"
              checked={icsOptions.includeLeave}
              onChange={setOption('includeLeave')}
            />
            休假（全天事件）
          </label>
        </div>
        <p className="mt-2 text-xs text-[var(--cw-text-muted)]">
          行事曆上會長這樣：
          <span className="ml-1 rounded-[var(--cw-radius-sm)] bg-[var(--cw-surface)] px-2 py-0.5 font-semibold text-[var(--cw-text)]">
            {titlePreview}
          </span>
          {icsOptions.includeLeave ? '　休假那幾天會有全天行程。' : '　休假那幾天在行事曆上留白。'}
        </p>
      </div>

      {summary.destinationMissingDays || summary.unknownShiftDays ? (
        <CwAlert variant="warning" title="支援班的時間可能不準" className="mb-4">
          <ul className="space-y-1">
            {summary.destinationMissingDays ? (
              <li>
                · 有 {summary.destinationMissingDays} 天是去別店支援，但
                <strong>那家店這個月的班表還沒匯入</strong>
                ，只能用預設時間。把該店的匯出檔一起匯入，時間才會正確。
              </li>
            ) : null}
            {summary.unknownShiftDays ? (
              <li>
                · 有 {summary.unknownShiftDays} 天紙本只寫「T3／D7」沒寫班別，會匯成全天行程。
                到「支援班」分頁指定是哪一班之後就會變成正確的時段。
              </li>
            ) : null}
          </ul>
        </CwAlert>
      ) : null}

      {status ? (
        <CwAlert variant={status.variant} className="mb-4">
          {status.message}
        </CwAlert>
      ) : null}

      {!hasAnything ? (
        <p className="text-sm text-[var(--cw-text-muted)]">
          這個月沒有匯入到 {person.name} 的班表。換個月份，或到「匯入」分頁補上該店的匯出檔。
        </p>
      ) : (
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full min-w-[560px] table-fixed border-collapse">
            <thead>
              <tr>
                {WEEKDAY_LABELS.map((label, index) => (
                  <th
                    key={label}
                    className={`border border-[var(--cw-border)] bg-[var(--cw-mega-surface)] px-1 py-2 text-xs font-semibold ${
                      index === 0 || index === 6
                        ? 'text-[var(--cw-brand-strong)]'
                        : 'text-[var(--cw-text-muted)]'
                    }`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.weeks.map((week) => (
                <tr key={week[0].dateKey}>
                  {week.map((day) => (
                    <DayCell key={day.dateKey} day={day} onSelectDate={onSelectDate} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-[var(--cw-text-muted)]">
        匯出的是 .ics 檔：iPhone 直接點開就會問要加到哪個行事曆；Google 日曆用「設定 → 匯入與匯出 →
        匯入」上傳。時間是本地時間，不會因為時區跑掉。紙本沒寫班別的支援班（T3／D7）會匯成全天行程。
      </p>
    </CwCard>
  )
}

export default PersonMonthCalendar
