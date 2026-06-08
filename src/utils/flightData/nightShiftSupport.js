import { formatMinAsHHMM, parseHHMMToMinutes } from './flightTime'

/** 晚班支援參數預設（登機門 D12–D18 納入、D11 不納入） */
export const NIGHT_SHIFT_GATE_ORDER = Object.freeze(['D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18'])
export const NIGHT_SHIFT_LOCAL_KEY = 'flightNightShiftSupportV1'
/** Firestore：`settings/{NIGHT_SHIFT_FIREBASE_DOC_ID}` */
export const NIGHT_SHIFT_FIREBASE_DOC_ID = 'night_shift_support'

export const DEFAULT_NIGHT_SHIFT_SUPPORT = Object.freeze({
  supportStartMin: 17 * 60, // 17:00 關店／支援起算
  supportEndMin: 21 * 60, // 21:00 前起飛的航班納入晚班支援判斷
  shiftEndMin: 21 * 60 + 30, // 21:30 晚班可支援到的時刻
  closingBufferMin: 30, // 收班後幾分鐘離店
  gateIncluded: Object.freeze({
    D11: false,
    D12: true,
    D13: true,
    D14: true,
    D15: true,
    D16: true,
    D17: true,
    D18: true
  })
})

function clampIntOr(n, min, max, fallback) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function mergeNightShiftConfig(partial) {
  const g0 = { ...DEFAULT_NIGHT_SHIFT_SUPPORT.gateIncluded }
  if (partial && typeof partial.gateIncluded === 'object' && partial.gateIncluded) {
    for (const k of NIGHT_SHIFT_GATE_ORDER) {
      if (typeof partial.gateIncluded[k] === 'boolean') g0[k] = partial.gateIncluded[k]
    }
  }
  const supportStartMin = clampIntOr(
    partial?.supportStartMin,
    0,
    24 * 60 - 1,
    DEFAULT_NIGHT_SHIFT_SUPPORT.supportStartMin
  )
  let supportEndMin = clampIntOr(
    partial?.supportEndMin,
    0,
    24 * 60,
    DEFAULT_NIGHT_SHIFT_SUPPORT.supportEndMin
  )
  if (supportEndMin <= supportStartMin) {
    supportEndMin = Math.min(24 * 60, supportStartMin + 60)
  }
  let shiftEndMin = clampIntOr(
    partial?.shiftEndMin,
    0,
    24 * 60,
    DEFAULT_NIGHT_SHIFT_SUPPORT.shiftEndMin
  )
  if (shiftEndMin < supportEndMin) shiftEndMin = supportEndMin
  const closingBufferMin = clampIntOr(
    partial?.closingBufferMin,
    0,
    3 * 60,
    DEFAULT_NIGHT_SHIFT_SUPPORT.closingBufferMin
  )
  return {
    supportStartMin,
    supportEndMin,
    shiftEndMin,
    closingBufferMin,
    gateIncluded: g0
  }
}

export function loadStoredNightShiftConfig() {
  if (typeof window === 'undefined') return mergeNightShiftConfig(null)
  try {
    const raw = localStorage.getItem(NIGHT_SHIFT_LOCAL_KEY)
    if (!raw) return mergeNightShiftConfig(null)
    return mergeNightShiftConfig(JSON.parse(raw))
  } catch {
    return mergeNightShiftConfig(null)
  }
}

export function cacheNightShiftConfigLocal(config) {
  try {
    localStorage.setItem(NIGHT_SHIFT_LOCAL_KEY, JSON.stringify(config))
  } catch {
    // ignore
  }
}

/** 將登機門正規成 D11…D18（L/R 併入同號），不屬於此範圍則 null */
export function gateToD11D18Family(gateRaw) {
  if (gateRaw == null || gateRaw === '') return null
  const g = String(gateRaw).trim().toUpperCase()
  const m = g.match(/^D(1[1-8])(L|R)?$/)
  return m ? `D${m[1]}` : null
}

export function isNightSupportTargetGate(gateRaw, config) {
  const cfg = mergeNightShiftConfig(config)
  const fam = gateToD11D18Family(gateRaw)
  if (!fam) return false
  return cfg.gateIncluded[fam] === true
}

export function formatGateIncludedSummary(cfg) {
  const c = mergeNightShiftConfig(cfg)
  const on = NIGHT_SHIFT_GATE_ORDER.filter((k) => c.gateIncluded[k])
  return on.length ? on.join('、') : '（無）'
}

/** `<input type="time" step={60} />` 用：0:00–23:59 */
export function minutesToTimeInputValue(totalMin) {
  const t = Math.max(0, Math.min(24 * 60 - 1, totalMin))
  const h = Math.floor(t / 60)
  const m = t % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function timeInputValueToMinutes(s) {
  if (!s || typeof s !== 'string') return null
  const p = s.split(':')
  const h = parseInt(p[0], 10)
  const mm = parseInt(p[1] || '0', 10)
  if (Number.isNaN(h) || Number.isNaN(mm)) return null
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null
  return h * 60 + mm
}

export function validateNightShiftDraftForSave(d) {
  const c = mergeNightShiftConfig(d)
  if (!NIGHT_SHIFT_GATE_ORDER.some((k) => c.gateIncluded[k])) {
    return '請至少勾選一個登機門。'
  }
  if (c.supportEndMin <= c.supportStartMin) {
    return '「納入判斷的最晚起飛」須晚於「關店／起算時刻」。'
  }
  if (c.shiftEndMin < c.supportEndMin) {
    return '「晚班支援結束」不可早於「納入判斷截止」。'
  }
  if (c.supportStartMin + c.closingBufferMin > c.shiftEndMin) {
    return '關店起算時刻 + 收班緩衝 不可超過 晚班支援結束 時間。'
  }
  return null
}

export function computeNightSupportPlan(flights, config) {
  const c = mergeNightShiftConfig(config)
  const tStart = formatMinAsHHMM(c.supportStartMin)
  const tEnd = formatMinAsHHMM(c.supportEndMin)
  const gatesStr = formatGateIncludedSummary(c)
  const base = {
    needSupport: false,
    keepStoreUntil: null,
    supportFrom: null,
    supportUntil: null,
    supportMinutes: 0,
    lastFlightGate: null,
    lastFlightTime: null,
    note: ''
  }
  if (!Array.isArray(flights) || flights.length === 0) {
    return { ...base, note: '當天無航班資料' }
  }

  const eligibleFlights = flights
    .filter((flight) => (flight?.type || 'departure') === 'departure')
    .map((flight) => ({
      ...flight,
      minutes: parseHHMMToMinutes(flight?.time)
    }))
    .filter((flight) => (
      flight.minutes !== null &&
      flight.minutes >= c.supportStartMin &&
      flight.minutes <= c.supportEndMin &&
      isNightSupportTargetGate(flight?.gate, c)
    ))

  const minimumKeepStoreMin = c.supportStartMin + c.closingBufferMin

  if (eligibleFlights.length === 0) {
    const start = minimumKeepStoreMin
    return {
      ...base,
      needSupport: true,
      keepStoreUntil: formatMinAsHHMM(start),
      supportFrom: formatMinAsHHMM(start),
      supportUntil: formatMinAsHHMM(c.shiftEndMin),
      supportMinutes: c.shiftEndMin - start,
      note: `${tStart}–${tEnd} 內，${gatesStr} 無符合航班，晚班可支援 1、2 店`
    }
  }

  const lastFlight = eligibleFlights.reduce((latest, current) => {
    if (!latest || current.minutes > latest.minutes) return current
    return latest
  }, null)

  const keepUntilMin = Math.min(
    c.shiftEndMin,
    Math.max(
      minimumKeepStoreMin,
      (lastFlight?.minutes || c.supportStartMin) + c.closingBufferMin
    )
  )
  const supportMinutes = Math.max(0, c.shiftEndMin - keepUntilMin)

  return {
    ...base,
    needSupport: supportMinutes > 0,
    keepStoreUntil: formatMinAsHHMM(keepUntilMin),
    supportFrom: supportMinutes > 0 ? formatMinAsHHMM(keepUntilMin) : null,
    supportUntil: supportMinutes > 0 ? formatMinAsHHMM(c.shiftEndMin) : null,
    supportMinutes,
    lastFlightGate: lastFlight?.gate || null,
    lastFlightTime: lastFlight?.time || null,
    note: supportMinutes > 0
      ? `最後航班 ${lastFlight?.gate || ''} ${lastFlight?.time || ''}，收班後可支援 1、2 店`
      : `最後航班 ${lastFlight?.gate || ''} ${lastFlight?.time || ''}，收班後已接近晚班下班`
  }
}
