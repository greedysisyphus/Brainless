import { parseHHMMToMinutes } from './flightTime.js'
import { SHIFT_META, SHIFT_ORDER, SUPPORT_SHIFT_CODE, getDefaultShiftTimes } from '../../pages/shifts/shiftConstants.js'
import { getMonthsForDate, getWorkingAssignments } from '../../pages/shifts/shiftModel.js'

/**
 * 航班頁的班別，以班表為準。
 *
 * 班別時間是店長每月匯入的（轉換器可以改），所以不能在航班頁再寫死一份 ——
 * 兩份一定會飄。優先序：當月匯入的 shiftTypes → shiftConstants 的預設 → 只剩全天。
 */

function shiftRank(code) {
  const i = SHIFT_ORDER.indexOf(code)
  return i === -1 ? SHIFT_ORDER.length : i
}

function toSpan(start, end) {
  const startMin = parseHHMMToMinutes(start)
  let endMin = parseHHMMToMinutes(end)
  if (startMin == null || endMin == null) return null
  // 跨午夜的班（例如 22:00–06:00）攤平成隔天，槽位掃描才不會倒著算
  if (endMin <= startMin) endMin += 24 * 60
  return { startMin, endMin }
}

/** 該店當月匯入的班別；沒有匯入檔就退回 shiftConstants 的預設時間 */
function rosterShifts(scheduleStoreCode, book, dateKey) {
  const month = getMonthsForDate(book, dateKey).find((m) => m.storeCode === scheduleStoreCode)
  const types = month?.shiftTypes || {}
  const codes = Object.keys(types).filter((c) => c && c !== SUPPORT_SHIFT_CODE)
  if (codes.length) {
    const out = codes
      .map((code) => {
        const span = toSpan(types[code].start, types[code].end)
        if (!span) return null
        return { key: code, label: types[code].label || SHIFT_META[code]?.label || code, ...span }
      })
      .filter(Boolean)
      .sort((a, b) => shiftRank(a.key) - shiftRank(b.key) || a.startMin - b.startMin)
    if (out.length) return { shifts: out, source: 'roster' }
  }

  const defaults = getDefaultShiftTimes(scheduleStoreCode)
  const out = SHIFT_ORDER.filter((c) => c !== SUPPORT_SHIFT_CODE)
    .map((code) => {
      const span = toSpan(defaults[code]?.start, defaults[code]?.end)
      return span ? { key: code, label: SHIFT_META[code]?.label || code, ...span } : null
    })
    .filter(Boolean)
  return { shifts: out, source: 'default' }
}

/**
 * 該店在這一天的班別清單，第一項固定是「全天」（＝營業時間，不是班別）。
 * @returns {{shifts: Array, source: 'roster'|'default'}}
 */
export function resolveStoreShifts(store, book, dateKey) {
  const full = {
    key: 'full',
    label: '全天',
    startMin: store.businessHours.startMin,
    endMin: store.businessHours.endMin
  }
  if (!store.scheduleStoreCode || !book) return { shifts: [full], source: 'default' }
  const { shifts, source } = rosterShifts(store.scheduleStoreCode, book, dateKey)
  return { shifts: [full, ...shifts], source }
}

/**
 * 這一天各班別實際上班的人（含支援過來的同事）。
 * @returns {Record<string, Array<{name: string, isSupport: boolean, positionLabel: string|null}>>}
 */
export function peopleByShiftOn(store, book, dateKey) {
  if (!store.scheduleStoreCode || !book || !dateKey) return {}
  const out = {}
  for (const a of getWorkingAssignments(book, dateKey)) {
    if (a.workStore !== store.scheduleStoreCode) continue
    const key = a.shift || SUPPORT_SHIFT_CODE
    ;(out[key] ||= []).push({
      name: a.name,
      isSupport: !!a.isSupport,
      positionLabel: a.positionLabel || null
    })
  }
  return out
}
