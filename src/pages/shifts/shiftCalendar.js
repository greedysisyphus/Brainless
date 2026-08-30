/** 個人月視圖與行事曆匯出（純函式，可單元測試） */

import { SUPPORT_SHIFT_CODE, getStoreName, supportLabel } from './shiftConstants.js'
import {
  addDays,
  effectiveShift,
  effectiveStore,
  isWeekendDate,
  lastDateOfMonth,
  parseDateKey,
  toDateKey,
} from './shiftModel.js'
import { getLeaveDisplay, getPositionLabelIn, getShiftDisplay } from './shiftVocab.js'

function monthsOf(book, monthKey) {
  return (book?.months || []).filter((month) => month.monthKey === monthKey)
}

/**
 * 某人在某月的每日紀錄。同一天可能有兩筆（例如月中調店，兩家店的班表都有他）。
 * @returns {Map<string, object[]>} dateKey -> 紀錄陣列
 */
export function getPersonMonthEntries(book, personKey, monthKey) {
  const byDate = new Map()
  if (!personKey) return byDate

  const monthsThisPeriod = monthsOf(book, monthKey)

  monthsThisPeriod.forEach((month) => {
    const person = (month.people || []).find((p) => p.key === personKey)
    if (!person || person.placeholder) return
    Object.entries(month.entries?.[personKey] || {}).forEach(([date, entry]) => {
      if (!entry || entry.kind === 'EMPTY' || entry.isShadow) return
      const shift = effectiveShift(entry)
      const workStore = effectiveStore(entry, month.storeCode)
      const position = entry.position || entry.resolvedPosition || null

      // 支援班要照「上班的那家店」讀班別時間與崗位名稱：
      // 班別標籤、時間與崗位在各店都可能不同（D13 晚班 13:00 起、崗位表也不一樣），
      // 用來源店的表會讓月視圖與匯出的行事曆對不上實際上班時間。
      const destinationMonth =
        entry.isSupport && (entry.atStore || entry.resolvedAtStore)
          ? monthsThisPeriod.find(
              (m) => m.storeCode === (entry.atStore || entry.resolvedAtStore)
            ) || null
          : month
      const displayMonth = destinationMonth || month
      const destinationMissing = !!entry.isSupport && !!entry.atStore && !destinationMonth

      const record = {
        date,
        kind: entry.kind,
        shift,
        shiftLabel:
          shift === SUPPORT_SHIFT_CODE
            ? supportLabel(entry.atStore, null)
            : getShiftDisplay(displayMonth, shift)?.label || shift || '',
        shiftUnknown: shift === SUPPORT_SHIFT_CODE,
        shiftInferred: entry.resolvedFrom === 'inferred',
        leave: entry.leave || null,
        leaveLabel: getLeaveDisplay(month, entry.leave)?.label || '',
        leaveMarker: getLeaveDisplay(month, entry.leave)?.marker || '',
        position,
        positionLabel: getPositionLabelIn(displayMonth, position),
        homeStore: month.storeCode,
        workStore,
        isSupport: !!entry.isSupport,
        destinationMissing,
        start: entry.start || null,
        end: entry.end || null,
        crossesMidnight: !!entry.crossesMidnight,
        needsReview: !!entry.needsReview,
        holiday: month.holidays?.[date] || '',
        sourceMonth: month,
        displayMonth,
      }
      if (!byDate.has(date)) byDate.set(date, [])
      byDate.get(date).push(record)
    })
  })

  return byDate
}

/**
 * Apple 行事曆式的月格子：固定週日起頭，補滿前後月的日子。
 * @returns {{monthKey: string, weeks: object[][]}}
 */
export function buildPersonMonthGrid(book, personKey, monthKey) {
  if (!/^\d{4}-\d{2}$/.test(String(monthKey || ''))) return { monthKey, weeks: [] }
  const byDate = getPersonMonthEntries(book, personKey, monthKey)

  const firstDate = `${monthKey}-01`
  const lastDate = lastDateOfMonth(monthKey)
  const leading = parseDateKey(firstDate)?.getDay() ?? 0
  let cursor = addDays(firstDate, -leading)

  const weeks = []
  let guard = 0
  while (guard < 6) {
    const week = []
    for (let i = 0; i < 7; i += 1) {
      week.push({
        dateKey: cursor,
        day: Number(cursor.slice(8, 10)),
        inMonth: cursor >= firstDate && cursor <= lastDate,
        isWeekend: isWeekendDate(cursor),
        isToday: cursor === toDateKey(new Date()),
        records: byDate.get(cursor) || [],
        holiday: (byDate.get(cursor) || [])[0]?.holiday || '',
      })
      cursor = addDays(cursor, 1)
    }
    weeks.push(week)
    guard += 1
    if (cursor > lastDate) break
  }

  return { monthKey, weeks }
}

/** 個人這個月的摘要（上班天數、各班別、跨店）。 */
export function summarizePersonMonth(book, personKey, monthKey) {
  const byDate = getPersonMonthEntries(book, personKey, monthKey)
  const summary = {
    workDays: 0,
    leaveDays: 0,
    byShift: {},
    byStore: {},
    supportDays: 0,
    unknownShiftDays: 0,
    destinationMissingDays: 0,
  }
  byDate.forEach((records) => {
    records.forEach((record) => {
      if (record.kind === 'WORK') {
        summary.workDays += 1
        if (record.shift) summary.byShift[record.shift] = (summary.byShift[record.shift] || 0) + 1
        summary.byStore[record.workStore] = (summary.byStore[record.workStore] || 0) + 1
        if (record.isSupport) summary.supportDays += 1
        if (record.shiftUnknown) summary.unknownShiftDays += 1
        if (record.destinationMissing) summary.destinationMissingDays += 1
      } else if (record.kind === 'LEAVE') {
        summary.leaveDays += 1
      }
    })
  })
  return summary
}

/** 全天事件的結束日是隔天；月底不能直接 day + 1（會變成 9/31）。 */
function nextDayParts(dateKey) {
  return addDays(dateKey, 1).split('-').map(Number)
}

function timeParts(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(time || ''))
  return match ? [Number(match[1]), Number(match[2])] : null
}

/**
 * 把某人的班轉成行事曆事件。
 * 上班用有時間的事件；沒有時間的（紙本只寫 T3／D7）與休假用全天事件。
 *
 * @param {object} book
 * @param {string} personKey
 * @param {{monthKeys?: string[], includeLeave?: boolean}} options
 * @returns {object[]} ics 的 createEvents() 可直接吃的物件
 */
export const DEFAULT_ICS_OPTIONS = {
  includeStore: true,
  includePosition: true,
  includeLeave: false,
}

/** 事件標題：班別必留，店名與崗位可選。 */
export function buildEventTitle(record, { includeStore, includePosition } = DEFAULT_ICS_OPTIONS) {
  const bits = [record.shiftLabel || '上班']
  if (includeStore) bits.push(getStoreName(record.workStore))
  if (includePosition && record.positionLabel) bits.push(record.positionLabel)
  return bits.join(' · ')
}

export function buildPersonIcsEvents(book, personKey, options = {}) {
  const {
    monthKeys,
    includeLeave = DEFAULT_ICS_OPTIONS.includeLeave,
    includeStore = DEFAULT_ICS_OPTIONS.includeStore,
    includePosition = DEFAULT_ICS_OPTIONS.includePosition,
  } = options
  const keys = monthKeys && monthKeys.length ? monthKeys : book?.monthKeys || []
  const events = []

  keys.forEach((monthKey) => {
    const byDate = getPersonMonthEntries(book, personKey, monthKey)
    ;[...byDate.keys()].sort().forEach((date) => {
      byDate.get(date).forEach((record, index) => {
        const [year, month, day] = date.split('-').map(Number)
        const uid = `${personKey}-${date}-${index}-brainless-shifts`
        const storeName = getStoreName(record.workStore)

        if (record.kind === 'LEAVE') {
          if (!includeLeave) return
          events.push({
            uid,
            title: record.leaveLabel || '休假',
            start: [year, month, day],
            end: nextDayParts(date),
            description: record.leave === 'SCHEDULING' ? '店長排班日，不上班' : '',
            categories: ['班表', '休假'],
            productId: 'brainless/shifts',
          })
          return
        }

        const startParts = timeParts(record.start)
        const endParts = timeParts(record.end)
        const title = buildEventTitle(record, { includeStore, includePosition })

        const descriptionBits = []
        if (record.isSupport) {
          descriptionBits.push(`支援班：自${getStoreName(record.homeStore)}支援${storeName}`)
        }
        if (record.shiftUnknown) descriptionBits.push('紙本沒寫班別，無上下班時間')
        if (record.destinationMissing) {
          descriptionBits.push(`${storeName}這個月的班表還沒匯入，時間可能不準`)
        }
        if (record.shiftInferred) descriptionBits.push('班別由目的店「支援」列推得，非紙本原文')
        if (record.needsReview) descriptionBits.push('轉檔判讀信心不足，請對照原圖確認')

        if (!startParts || !endParts) {
          // 沒有時間的班（例如只寫 T3）就放全天，不要瞎編時段
          events.push({
            uid,
            title,
            start: [year, month, day],
            end: nextDayParts(date),
            location: includeStore ? storeName : undefined,
            description: descriptionBits.join('\n'),
            categories: ['班表'],
            productId: 'brainless/shifts',
          })
          return
        }

        const startMinutes = startParts[0] * 60 + startParts[1]
        let endMinutes = endParts[0] * 60 + endParts[1]
        if (record.crossesMidnight || endMinutes <= startMinutes) endMinutes += 24 * 60
        const durationMinutes = endMinutes - startMinutes

        events.push({
          uid,
          title,
          start: [year, month, day, startParts[0], startParts[1]],
          startInputType: 'local',
          startOutputType: 'local',
          duration: {
            hours: Math.floor(durationMinutes / 60),
            minutes: durationMinutes % 60,
          },
          location: includeStore ? storeName : undefined,
          description: descriptionBits.join('\n'),
          categories: ['班表'],
          productId: 'brainless/shifts',
        })
      })
    })
  })

  return events.map((event) => {
    const clean = { ...event }
    Object.keys(clean).forEach((key) => {
      if (clean[key] === undefined) delete clean[key]
    })
    return clean
  })
}

export function icsFilename(personName, monthKeys) {
  const scope = monthKeys && monthKeys.length === 1 ? monthKeys[0] : '全部月份'
  return `${personName || '班表'}_${scope}.ics`
}
