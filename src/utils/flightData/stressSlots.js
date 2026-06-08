import { formatMinAsHHMM, parseHHMMToMinutes } from './flightTime'
import { resolveGateStressWeight } from './gateStressWeights'

/** 奶酥時刻：起飛前 [60,30] 分鐘視為登機壓力窗，與 60 分鐘觀察槽重疊分鐘數 × 登機門權重計分（權重 Firebase 同步，見標題旁齒輪） */
export const STRESS_BEFORE_DEP_START_MIN = 60
export const STRESS_BEFORE_DEP_END_MIN = 30
export const STRESS_WINDOW_MINUTES = STRESS_BEFORE_DEP_START_MIN - STRESS_BEFORE_DEP_END_MIN
export const SLOT_STEP_MIN = 15

/** 高峰／離峰共用：候選 60 分槽「起點」範圍；lastStartMin 為最後一段槽起點，槽覆蓋至 lastStartMin+60 */
export const STRESS_SHIFT_PRESETS = Object.freeze({
  full: { label: '全天', firstStartMin: 5 * 60, lastStartMin: 20 * 60 },
  morning: { label: '早班', firstStartMin: 5 * 60, lastStartMin: 12 * 60 + 30 },
  evening: { label: '晚班', firstStartMin: 13 * 60 + 30, lastStartMin: 20 * 60 }
})

export const STRESS_SHIFT_ORDER = ['full', 'morning', 'evening']

export function stressShiftRange(shiftKey) {
  const p = STRESS_SHIFT_PRESETS[shiftKey] || STRESS_SHIFT_PRESETS.full
  return { firstStartMin: p.firstStartMin, lastStartMin: p.lastStartMin }
}

export function formatStressShiftSpan(shiftKey) {
  const { firstStartMin, lastStartMin } = stressShiftRange(shiftKey)
  return `${formatMinAsHHMM(firstStartMin)}–${formatMinAsHHMM(lastStartMin + 60)}`
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

function scoreOneSlotForDay(flights, dateStr, startMinFromMidnight, weights) {
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
    const w = resolveGateStressWeight(flight.gate, weights)
    score += w * (ov / STRESS_WINDOW_MINUTES)
    flightCount += 1
  }
  return { score, flightCount }
}

function pickTopDisjointSlots(scored, count, highest) {
  const sorted = [...scored].sort((a, b) => (highest ? b.score - a.score : a.score - b.score))
  const picked = []
  for (const item of sorted) {
    if (picked.length >= count) break
    const a0 = item.startMin
    const a1 = a0 + 60
    const overlaps = picked.some((p) => {
      const b0 = p.startMin
      const b1 = b0 + 60
      return !(a1 <= b0 || b1 <= a0)
    })
    if (!overlaps) picked.push(item)
  }
  return picked
}

export function computeStressSlotsDay(flights, dateStr, weights, peakShiftKey, lowShiftKey) {
  const peakR = stressShiftRange(peakShiftKey)
  const lowR = stressShiftRange(lowShiftKey)
  const peakStarts = enumerateSlotStarts(peakR.firstStartMin, peakR.lastStartMin, SLOT_STEP_MIN)
  const peakScored = peakStarts.map((startMin) => {
    const { score, flightCount } = scoreOneSlotForDay(flights, dateStr, startMin, weights)
    return { startMin, score, flightCount, label: formatSlotRange24h(startMin) }
  })
  const peak = pickTopDisjointSlots(peakScored, 5, true)

  const lowStarts = enumerateSlotStarts(lowR.firstStartMin, lowR.lastStartMin, SLOT_STEP_MIN)
  const lowScored = lowStarts.map((startMin) => {
    const { score, flightCount } = scoreOneSlotForDay(flights, dateStr, startMin, weights)
    return { startMin, score, flightCount, label: formatSlotRange24h(startMin) }
  })
  const low = pickTopDisjointSlots(lowScored, 5, false)

  return { peak, low }
}

export function averageStressSlotsAcrossDays(multiDayData, weights, peakShiftKey, lowShiftKey) {
  const nDays = multiDayData.length
  if (nDays === 0) return { peak: [], low: [] }

  const peakR = stressShiftRange(peakShiftKey)
  const lowR = stressShiftRange(lowShiftKey)
  const peakStarts = enumerateSlotStarts(peakR.firstStartMin, peakR.lastStartMin, SLOT_STEP_MIN)
  const peakAgg = new Map(peakStarts.map((sm) => [sm, { sum: 0, flights: 0 }]))
  const lowStarts = enumerateSlotStarts(lowR.firstStartMin, lowR.lastStartMin, SLOT_STEP_MIN)
  const lowAgg = new Map(lowStarts.map((sm) => [sm, { sum: 0, flights: 0 }]))

  for (const day of multiDayData) {
    const flights = day.flights || []
    for (const sm of peakStarts) {
      const { score, flightCount } = scoreOneSlotForDay(flights, day.date, sm, weights)
      const cur = peakAgg.get(sm)
      cur.sum += score
      cur.flights += flightCount
    }
    for (const sm of lowStarts) {
      const { score, flightCount } = scoreOneSlotForDay(flights, day.date, sm, weights)
      const cur = lowAgg.get(sm)
      cur.sum += score
      cur.flights += flightCount
    }
  }

  const peakAveraged = peakStarts.map((startMin) => ({
    startMin,
    score: peakAgg.get(startMin).sum / nDays,
    flightCount: peakAgg.get(startMin).flights / nDays,
    label: formatSlotRange24h(startMin)
  }))
  const lowAveraged = lowStarts.map((startMin) => ({
    startMin,
    score: lowAgg.get(startMin).sum / nDays,
    flightCount: lowAgg.get(startMin).flights / nDays,
    label: formatSlotRange24h(startMin)
  }))

  return {
    peak: pickTopDisjointSlots(peakAveraged, 5, true),
    low: pickTopDisjointSlots(lowAveraged, 5, false)
  }
}
