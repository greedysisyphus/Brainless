import { formatMinAsHHMM, parseHHMMToMinutes } from './flightTime.js'
import { resolveGateStressWeight } from './gateStressWeights.js'
import { getStoreShift } from './stores.js'

/** 奶酥時刻：起飛前 [60,30] 分鐘視為登機壓力窗，與 60 分鐘觀察槽重疊分鐘數 × 登機門權重計分（權重 Firebase 同步，見標題旁齒輪） */
export const STRESS_BEFORE_DEP_START_MIN = 60
export const STRESS_BEFORE_DEP_END_MIN = 30
export const STRESS_WINDOW_MINUTES = STRESS_BEFORE_DEP_START_MIN - STRESS_BEFORE_DEP_END_MIN
export const SLOT_STEP_MIN = 15

/**
 * 候選 60 分槽的「起點」範圍，由該店的班別決定（見 stores.js）。
 * 最後一段槽起點是 endMin - 60，槽覆蓋到 endMin，也就是那個班在店的最後一刻。
 */
export function stressShiftRange(shiftKey, shifts) {
  const sh = getStoreShift(shifts, shiftKey)
  return { firstStartMin: sh.startMin, lastStartMin: Math.max(sh.startMin, sh.endMin - 60) }
}

export function formatStressShiftSpan(shiftKey, shifts) {
  const sh = getStoreShift(shifts, shiftKey)
  return `${formatMinAsHHMM(sh.startMin)}–${formatMinAsHHMM(sh.endMin)}`
}

export function isStressSlotInSupportPeriod(startMin, supportFrom, supportUntil) {
  if (typeof startMin !== 'number') return false
  const supportStart = parseHHMMToMinutes(supportFrom)
  const supportEnd = parseHHMMToMinutes(supportUntil)
  if (supportStart == null || supportEnd == null || supportEnd <= supportStart) return false
  const slotStart = startMin
  const slotEnd = startMin + 60
  return Math.max(slotStart, supportStart) < Math.min(slotEnd, supportEnd)
}

// 壓力分析：已出發仍代表當日實際客流／登機壓力，必須計入；僅排除取消／延誤取消等
function isStressCancelledFlight(flight) {
  const raw = flight.status || ''
  const s = raw.toUpperCase()
  if (s.includes('CANCEL') || raw.includes('取消')) return true
  return false
}

function getFlightDepartureMs(dateStr, flight) {
  if (flight.datetime) {
    const raw = String(flight.datetime).trim()
    if (raw) {
      if (/[Zz]|[+-]\d{2}:?\d{2}$/.test(raw)) {
        const d = new Date(raw)
        if (!Number.isNaN(d.getTime())) return d.getTime()
      } else {
        const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/)
        if (m) {
          const ms = new Date(
            Number(m[1]),
            Number(m[2]) - 1,
            Number(m[3]),
            Number(m[4]),
            Number(m[5]),
            Number(m[6] || 0)
          ).getTime()
          if (!Number.isNaN(ms)) return ms
        }
        const d = new Date(raw)
        if (!Number.isNaN(d.getTime())) return d.getTime()
      }
    }
  }
  if (flight.time && dateStr) {
    const parts = String(flight.time).split(':')
    const hh = parseInt(parts[0], 10)
    const mm = parseInt(parts[1] || '0', 10)
    if (Number.isNaN(hh)) return null
    return new Date(`${dateStr}T${String(hh).padStart(2, '0')}:${String(Number.isNaN(mm) ? 0 : mm).padStart(2, '0')}:00`).getTime()
  }
  return null
}

function dayStartMs(dateStr) {
  return new Date(`${dateStr}T00:00:00`).getTime()
}

function slotRangeMs(dateStr, startMinFromMidnight) {
  const base = dayStartMs(dateStr)
  return { start: base + startMinFromMidnight * 60 * 1000, end: base + (startMinFromMidnight + 60) * 60 * 1000 }
}

function overlapMinutesMs(a0, a1, b0, b1) {
  const lo = Math.max(a0, b0)
  const hi = Math.min(a1, b1)
  return Math.max(0, (hi - lo) / 60000)
}

function formatSlotRange24h(startMinFromMidnight) {
  const pad = (n) => String(n).padStart(2, '0')
  const h1 = Math.floor(startMinFromMidnight / 60)
  const m1 = startMinFromMidnight % 60
  const end = startMinFromMidnight + 60
  const h2 = Math.floor(end / 60)
  const m2 = end % 60
  return `${pad(h1)}:${pad(m1)}–${pad(h2)}:${pad(m2)}`
}

function enumerateSlotStarts(firstStart, lastStart, step) {
  const out = []
  for (let s = firstStart; s <= lastStart; s += step) out.push(s)
  return out
}

function scoreOneSlotForDay(flights, dateStr, startMinFromMidnight, weights, store) {
  const { start: slot0, end: slot1 } = slotRangeMs(dateStr, startMinFromMidnight)
  let score = 0
  let flightCount = 0
  for (const flight of flights) {
    if (isStressCancelledFlight(flight)) continue
    const depMs = getFlightDepartureMs(dateStr, flight)
    if (depMs == null) continue
    const p0 = depMs - STRESS_BEFORE_DEP_START_MIN * 60 * 1000
    const p1 = depMs - STRESS_BEFORE_DEP_END_MIN * 60 * 1000
    const ov = overlapMinutesMs(p0, p1, slot0, slot1)
    if (ov <= 0) continue
    const w = resolveGateStressWeight(flight.gate, weights, store)
    score += w * (ov / STRESS_WINDOW_MINUTES)
    flightCount += 1
  }
  return { score, flightCount }
}

/**
 * 整段壓力曲線：每 15 分一個點，值為「該點起算 60 分鐘槽」的壓力分數。
 * 舊版只回傳排名前 5 的不重疊槽，看不出一天的形狀，也讓相鄰的同一個峰互相擠掉。
 */
export function stressSlotSeriesDay(flights, dateStr, weights, store, shifts, shiftKey) {
  const { firstStartMin, lastStartMin } = stressShiftRange(shiftKey, shifts)
  return enumerateSlotStarts(firstStartMin, lastStartMin, SLOT_STEP_MIN).map((startMin) => {
    const { score, flightCount } = scoreOneSlotForDay(flights, dateStr, startMin, weights, store)
    return { startMin, score, flightCount, label: formatSlotRange24h(startMin) }
  })
}

/** 同上，但取多日平均（每天各自算分再除以天數） */
export function stressSlotSeriesAcrossDays(multiDayData, weights, store, shifts, shiftKey) {
  const nDays = multiDayData.length
  if (nDays === 0) return []
  const { firstStartMin, lastStartMin } = stressShiftRange(shiftKey, shifts)
  return enumerateSlotStarts(firstStartMin, lastStartMin, SLOT_STEP_MIN).map((startMin) => {
    let sum = 0
    let flights = 0
    for (const day of multiDayData) {
      const r = scoreOneSlotForDay(day.flights || [], day.date, startMin, weights, store)
      sum += r.score
      flights += r.flightCount
    }
    return {
      startMin,
      score: sum / nDays,
      flightCount: flights / nDays,
      label: formatSlotRange24h(startMin)
    }
  })
}

/** 空檔門檻：分數低於當日尖峰的兩成就算「鬆」 */
export const QUIET_SCORE_RATIO = 0.2

/**
 * 曲線的兩個結論：最忙的那一槽，以及最長的一段連續空檔。
 * 「最鬆的第 N 名」沒有意義（尾端沒班機的槽永遠並列 0），能休息多久才是要問的。
 */
export function summarizeStressSeries(series) {
  if (!Array.isArray(series) || series.length === 0) return null
  const maxScore = series.reduce((m, s) => Math.max(m, s.score), 0)
  const peak = series.reduce((best, s) => (best && best.score >= s.score ? best : s), null)
  if (maxScore <= 0) {
    return {
      maxScore: 0,
      peak,
      quiet: { startMin: series[0].startMin, endMin: series[series.length - 1].startMin + 60 }
    }
  }

  const cut = maxScore * QUIET_SCORE_RATIO
  let quiet = null
  let run = null
  for (const s of series) {
    if (s.score <= cut) {
      run = { startMin: run ? run.startMin : s.startMin, endMin: s.startMin + 60 }
      if (!quiet || run.endMin - run.startMin > quiet.endMin - quiet.startMin) quiet = run
    } else {
      run = null
    }
  }
  return { maxScore, peak, quiet }
}

/** 給人看的時間區間，例：09:15–11:45 */
export function formatMinuteSpan(startMin, endMin) {
  return `${formatMinAsHHMM(startMin)}–${formatMinAsHHMM(endMin)}`
}
