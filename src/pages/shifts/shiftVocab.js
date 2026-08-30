/**
 * 班表語彙：班別、假別與崗位的顯示資訊。
 *
 * 權威來源是匯入檔自己帶的 shift_types／leave_types／positions 三張表
 * （店長可以在轉換器介面新增班別，本站不能寫死清單）。
 * 這裡的常數只提供「已知代碼」的樣式與缺值時的後備標籤。
 */

import {
  LEAVE_META,
  POSITION_FALLBACK_LABELS,
  SHIFT_META,
  SHIFT_ORDER,
  SUPPORT_SHIFT_CODE,
  LEAVE_ORDER,
  canonicalPositionCode,
  supportLabel,
} from './shiftConstants.js'

/** 未知代碼的配色（不使用匯入檔量到的像素色，那不是設計色票）。 */
const UNKNOWN_SHIFT_STYLES = [
  { bg: '#e4e0d6', fg: '#4a443a' },
  { bg: '#dfe6e4', fg: '#2f4c47' },
  { bg: '#eadfe6', fg: '#5c3c50' },
  { bg: '#e6e3d2', fg: '#54502f' },
]

/**
 * 崗位色票。
 *
 * 沿用紙本班表的色相（主吧橘、副吧灰、手沖藍、輕食綠、菜口粉、POS 黃），
 * 但**明度刻意拉成階梯**（L* 70→93）。色覺缺陷會破壞色相辨識、不會破壞明度，
 * 所以明度階梯是這六個色在色盲眼中仍分得開的唯一原因。
 *
 * 即便如此，六個類別在三種色盲下都無法拉到安全距離，
 * 所以顏色**不是**崗位的唯一載體 —— 每一格另外印 `initial` 這個字。
 * 顏色負責掃視速度，字負責正確性。
 *
 * `bg`／`fg` 是整格上色用的一對（文字對比皆 ≥ 4.5:1），
 * `dot` 是小標記用的飽和版，`initial` 是格子裡的崗位單字。
 */
export const POSITION_TOKENS = {
  MAIN_BAR: { bg: '#ea976e', fg: '#552a14', dot: '#c25f2c', initial: '吧' },
  SUB_BAR: { bg: '#dad3cb', fg: '#403b34', dot: '#7a7268', initial: '副' },
  POUR_OVER: { bg: '#99bfeb', fg: '#123853', dot: '#2f6fae', initial: '沖' },
  LIGHT_MEAL: { bg: '#bbe9b5', fg: '#1d3d1e', dot: '#3f8040', initial: '輕' },
  VEG_STATION: { bg: '#f6b4ce', fg: '#57233c', dot: '#b8497f', initial: '菜' },
  POS: { bg: '#fdec92', fg: '#413a0d', dot: '#b39406', initial: 'P' },
  NONE: { bg: 'transparent', fg: 'var(--cw-text-muted)', dot: 'transparent', initial: '' },
}

const UNKNOWN_POSITION_TOKENS = [
  { bg: '#c6dbd9', fg: '#20403e', dot: '#4f807d', initial: '' },
  { bg: '#d5cbe8', fg: '#332755', dot: '#6f5aa0', initial: '' },
  { bg: '#e5d3bf', fg: '#453014', dot: '#8f6b45', initial: '' },
  { bg: '#c3dbe6', fg: '#1d3b46', dot: '#4a7c8c', initial: '' },
  { bg: '#e2dbbd', fg: '#3d3714', dot: '#7d7040', initial: '' },
]

function hashIndex(text, length) {
  let hash = 0
  for (let i = 0; i < String(text).length; i += 1) {
    hash = (hash * 31 + String(text).charCodeAt(i)) >>> 0
  }
  return hash % length
}

function firstGlyph(text) {
  return String(text || '').trim().slice(0, 1)
}

/**
 * 班別顯示資訊。標籤與時間以匯入檔為準，樣式用本站色票。
 * @returns {{code: string, label: string, short: string, bg: string, fg: string,
 *   start: string|null, end: string|null, crossesMidnight: boolean, known: boolean}}
 */
export function getShiftDisplay(month, code) {
  if (!code) return null
  const fromFile = month?.shiftTypes?.[code] || null
  const known = SHIFT_META[code] || null
  const style = known || UNKNOWN_SHIFT_STYLES[hashIndex(code, UNKNOWN_SHIFT_STYLES.length)]
  const label = fromFile?.label || known?.label || code
  return {
    code,
    label,
    short: known?.short || firstGlyph(fromFile?.marker) || firstGlyph(label) || code,
    bg: style.bg,
    fg: style.fg,
    start: fromFile?.start || null,
    end: fromFile?.end || null,
    crossesMidnight: !!fromFile?.crossesMidnight,
    known: !!known,
  }
}

export function getShiftLabelIn(month, code) {
  return getShiftDisplay(month, code)?.label || code || '—'
}

/**
 * 把多份月份文件的班別／假別表合成一份查詢用的字彙。
 *
 * 自定班別是**單店單月**的東西（D7 的「支」是 `CUSTOM_支_j776`，一店根本沒有這個代碼），
 * 所以跨店畫面若只拿其中一份月份文件查標籤，查不到的就會露出原始代碼。
 *
 * 時間只在「所有宣告這個代碼的月份都一致」時才保留 —— D13 的晚班是 13:00、
 * 其他兩店是 14:00，合起來看時就沒有單一正確答案，寧可留白也不要顯示錯的那個。
 */
export function mergeVocab(months) {
  const shiftTypes = {}
  const leaveTypes = {}
  const conflicting = new Set()
  ;(months || []).forEach((month) => {
    Object.entries(month?.shiftTypes || {}).forEach(([code, type]) => {
      const seen = shiftTypes[code]
      if (!seen) {
        shiftTypes[code] = { ...type }
        return
      }
      if (seen.start !== type.start || seen.end !== type.end) conflicting.add(code)
    })
    Object.entries(month?.leaveTypes || {}).forEach(([code, type]) => {
      if (!leaveTypes[code]) leaveTypes[code] = { ...type }
    })
  })
  conflicting.forEach((code) => {
    shiftTypes[code] = { ...shiftTypes[code], start: null, end: null, crossesMidnight: false }
  })
  return { shiftTypes, leaveTypes }
}

/** 假別顯示資訊。 */
export function getLeaveDisplay(month, code) {
  if (!code) return null
  const fromFile = month?.leaveTypes?.[code] || null
  const known = LEAVE_META[code] || null
  return {
    code,
    label: fromFile?.label || known?.label || code,
    marker: fromFile?.marker || known?.marker || firstGlyph(fromFile?.label || known?.label) || '休',
    known: !!known,
  }
}

/** 崗位顯示資訊。色票走本站 token，不用匯入檔量到的像素色。 */
export function getPositionDisplay(month, code) {
  if (!code) return null
  const canonical = canonicalPositionCode(code)
  const fromFile = month?.positions?.[code] || month?.positions?.[canonical] || null
  const token =
    POSITION_TOKENS[canonical] ??
    UNKNOWN_POSITION_TOKENS[hashIndex(canonical, UNKNOWN_POSITION_TOKENS.length)]
  const label = fromFile?.label || POSITION_FALLBACK_LABELS[canonical] || code
  return {
    code,
    label,
    color: token.dot,
    bg: token.bg,
    fg: token.fg,
    // 顏色以外的第二個載體：色盲同事靠這個字讀崗位，不是靠底色
    initial: token.initial || firstGlyph(label),
    known: POSITION_TOKENS[canonical] !== undefined,
  }
}

export function getPositionLabelIn(month, code) {
  return getPositionDisplay(month, code)?.label || ''
}

function orderByKnownThenFile(codes, knownOrder) {
  return [...codes].sort((a, b) => {
    const ia = knownOrder.indexOf(a)
    const ib = knownOrder.indexOf(b)
    if (ia >= 0 && ib >= 0) return ia - ib
    if (ia >= 0) return -1
    if (ib >= 0) return 1
    return a.localeCompare(b)
  })
}

/**
 * 這批月份實際用到的班別代碼（含匯入檔宣告但沒排到的），已知的排前面。
 * @param {object[]} months
 * @param {{includeSupport?: boolean}} options
 */
export function collectShiftCodes(months, { includeSupport = false } = {}) {
  const codes = new Set()
  ;(months || []).forEach((month) => {
    Object.keys(month?.shiftTypes || {}).forEach((code) => codes.add(code))
    Object.values(month?.entries || {}).forEach((byDate) => {
      Object.values(byDate).forEach((entry) => {
        if (entry?.shift) codes.add(entry.shift)
        if (entry?.resolvedShift) codes.add(entry.resolvedShift)
      })
    })
  })
  // T3 在匯入檔裡是一個 shift_type，但本站以 SUPPORT 表示未定班別的支援
  codes.delete('T3')
  if (includeSupport) codes.add(SUPPORT_SHIFT_CODE)
  else codes.delete(SUPPORT_SHIFT_CODE)
  return orderByKnownThenFile(codes, SHIFT_ORDER)
}

/** 這批月份實際用到的假別代碼。 */
export function collectLeaveCodes(months) {
  const codes = new Set()
  ;(months || []).forEach((month) => {
    Object.keys(month?.leaveTypes || {}).forEach((code) => codes.add(code))
    Object.values(month?.entries || {}).forEach((byDate) => {
      Object.values(byDate).forEach((entry) => {
        if (entry?.leave) codes.add(entry.leave)
      })
    })
  })
  return orderByKnownThenFile(codes, LEAVE_ORDER)
}

/** 這個月用到的崗位代碼（依匯入檔宣告順序，未指定排最後）。 */
export function collectPositionCodes(month) {
  const declared = Object.keys(month?.positions || {})
  const used = new Set()
  Object.values(month?.entries || {}).forEach((byDate) => {
    Object.values(byDate).forEach((entry) => {
      const code = entry?.position || entry?.resolvedPosition
      if (code) used.add(code)
    })
  })
  used.forEach((code) => {
    if (!declared.includes(code)) declared.push(code)
  })
  return declared.filter((code) => code !== 'NONE')
}

/**
 * 一格班表的完整說明文字。tooltip 與點開的詳情共用同一份，
 * 因為 title 在手機上根本觸發不了，不能是唯一的出口。
 */
export function describeEntry(entry, month) {
  if (!entry) return ''
  if (entry.kind === 'EMPTY') return '不適用'
  if (entry.kind === 'UNKNOWN') {
    return `轉檔認不出這一格${entry.raw ? `（原圖寫「${entry.raw}」）` : ''}，請對照原圖確認`
  }
  if (entry.kind === 'LEAVE') {
    const leave = getLeaveDisplay(month, entry.leave)
    return entry.leave === 'SCHEDULING'
      ? `${leave?.label ?? '休假'}（店長排班日，不上班）`
      : leave?.label ?? '休假'
  }
  const shift =
    entry.shift === SUPPORT_SHIFT_CODE ? entry.resolvedShift || SUPPORT_SHIFT_CODE : entry.shift
  const shiftDisplay = getShiftDisplay(month, shift)
  const position = entry.position || entry.resolvedPosition
  // 有些格子轉檔判出「這天有上班」但判不出是哪一班；講「上班」兩個字等於什麼都沒說
  const shiftUnreadable = !entry.isSupport && !shift

  return [
    entry.isSupport ? supportLabel(entry.atStore, shift) : shiftDisplay?.label ?? '上班',
    shiftUnreadable
      ? `轉檔判不出班別${entry.raw ? `（原圖寫「${entry.raw}」）` : '（原圖那格沒有字）'}，請對照原圖`
      : null,
    entry.start && entry.end
      ? `${entry.start}–${entry.end}${entry.crossesMidnight ? '（跨夜）' : ''}`
      : entry.shift === SUPPORT_SHIFT_CODE
        ? '紙本沒寫班別，無上下班時間'
        : null,
    getPositionDisplay(month, position)?.label,
    entry.resolvedFrom === 'inferred' ? '班別為對照目的店「支援」列推得' : null,
    entry.needsReview ? '判讀信心不足，請對照原圖確認' : null,
  ]
    .filter(Boolean)
    .join(' · ')
}
