import { formatMinAsHHMM, parseHHMMToMinutes } from './flightTime.js'
import { gateToFamily } from './gates.js'

/**
 * 晚班支援參數：時間欄位全店共用預設，納入哪些登機門由各店設定決定（見 stores.js）。
 * Firestore：`settings/{store.nightDocId}`
 */
export const DEFAULT_NIGHT_SHIFT_TIMES = Object.freeze({
  supportStartMin: 17 * 60, // 17:00 關店／支援起算
  supportEndMin: 21 * 60, // 21:00 前起飛的航班納入晚班支援判斷
  shiftEndMin: 21 * 60 + 30, // 21:30 晚班可支援到的時刻
  closingBufferMin: 30 // 收班後幾分鐘離店
})

/** 該店的晚班支援預設（時間 + 登機門開關） */
export function defaultNightShiftSupport(store) {
  return { ...DEFAULT_NIGHT_SHIFT_TIMES, gateIncluded: { ...store.nightGateIncluded } }
}

function clampIntOr(n, min, max, fallback) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function mergeNightShiftConfig(partial, store) {
  const g0 = { ...store.nightGateIncluded }
  if (partial && typeof partial.gateIncluded === 'object' && partial.gateIncluded) {
    for (const k of store.gateFamilies) {
      if (typeof partial.gateIncluded[k] === 'boolean') g0[k] = partial.gateIncluded[k]
    }
  }
  const supportStartMin = clampIntOr(
    partial?.supportStartMin,
    0,
    24 * 60 - 1,
    DEFAULT_NIGHT_SHIFT_TIMES.supportStartMin
  )
  let supportEndMin = clampIntOr(
    partial?.supportEndMin,
    0,
    24 * 60,
    DEFAULT_NIGHT_SHIFT_TIMES.supportEndMin
  )
  if (supportEndMin <= supportStartMin) {
    supportEndMin = Math.min(24 * 60, supportStartMin + 60)
  }
  let shiftEndMin = clampIntOr(
    partial?.shiftEndMin,
    0,
    24 * 60,
    DEFAULT_NIGHT_SHIFT_TIMES.shiftEndMin
  )
  if (shiftEndMin < supportEndMin) shiftEndMin = supportEndMin
  const closingBufferMin = clampIntOr(
    partial?.closingBufferMin,
    0,
    3 * 60,
    DEFAULT_NIGHT_SHIFT_TIMES.closingBufferMin
  )
  return {
    supportStartMin,
    supportEndMin,
    shiftEndMin,
    closingBufferMin,
    gateIncluded: g0
  }
}

export function loadStoredNightShiftConfig(store) {
  if (typeof window === 'undefined') return mergeNightShiftConfig(null, store)
  try {
    const raw = localStorage.getItem(store.nightLocalKey)
    if (!raw) return mergeNightShiftConfig(null, store)
    return mergeNightShiftConfig(JSON.parse(raw), store)
  } catch {
    return mergeNightShiftConfig(null, store)
  }
}

export function cacheNightShiftConfigLocal(config, store) {
  try {
    localStorage.setItem(store.nightLocalKey, JSON.stringify(config))
  } catch {
    // ignore
  }
}

export function isNightSupportTargetGate(gateRaw, config, store) {
  const cfg = mergeNightShiftConfig(config, store)
  const fam = gateToFamily(gateRaw)
  if (!fam) return false
  return cfg.gateIncluded[fam] === true
}

export function formatGateIncludedSummary(cfg, store) {
  const c = mergeNightShiftConfig(cfg, store)
  const on = store.gateFamilies.filter((k) => c.gateIncluded[k])
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

export function validateNightShiftDraftForSave(d, store) {
  const c = mergeNightShiftConfig(d, store)
  if (!store.gateFamilies.some((k) => c.gateIncluded[k])) {
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

export function computeNightSupportPlan(flights, config, store) {
  const c = mergeNightShiftConfig(config, store)
  const tStart = formatMinAsHHMM(c.supportStartMin)
  const tEnd = formatMinAsHHMM(c.supportEndMin)
  const gatesStr = formatGateIncludedSummary(c, store)
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
      isNightSupportTargetGate(flight?.gate, c, store)
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
