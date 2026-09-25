import { formatMinAsHHMM, parseHHMMToMinutes } from './flightTime.js'
import { resolveGateStressWeight } from './gateStressWeights.js'
import { getStoreShift } from './stores.js'

/**
 * 奶酥時刻：起飛前 [fromMin, toMin] 分鐘視為壓力窗，與 60 分鐘觀察槽重疊分鐘數 × 登機門權重計分（權重 Firebase 同步，見標題旁齒輪）。
 * 各店可在 stores.js 用 stressWindow 覆寫（客人到店的時間不一樣），沒設就用預設。
 */
export const DEFAULT_STRESS_WINDOW = Object.freeze({ fromMin: 60, toMin: 30 })

export function stressWindowOf(store) {
  return store?.stressWindow || DEFAULT_STRESS_WINDOW
}
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

/**
 * 一班大約載多少人：該小時 T2 出發＋轉機離站人數 ÷ 該小時 T2 起飛班數（爬蟲寫進 pax_t2）。
 * 同一小時每班平均分，不看機型；店在管制區內，轉機旅客也會經過，所以一起算。
 * 沒有預報或那一小時對不上班數時回 null，曲線照舊只看班數。
 */
export function estimateFlightPax(flight, pax) {
  const min = parseHHMMToMinutes(flight?.time)
  if (min === null || !pax || !Array.isArray(pax.flights)) return null
  const h = Math.floor(min / 60)
  const n = pax.flights[h]
  if (!(n > 0)) return null
  return ((pax.departure?.[h] || 0) + (pax.transfer?.[h] || 0)) / n
}

function scoreOneSlotForDay(flights, dateStr, startMinFromMidnight, weights, store, pax = null) {
  const { start: slot0, end: slot1 } = slotRangeMs(dateStr, startMinFromMidnight)
  const { fromMin, toMin } = stressWindowOf(store)
  const windowMin = fromMin - toMin
  let score = 0
  let flightCount = 0
  let people = pax ? 0 : null
  for (const flight of flights) {
    if (isStressCancelledFlight(flight)) continue
    const depMs = getFlightDepartureMs(dateStr, flight)
    if (depMs == null) continue
    const p0 = depMs - fromMin * 60 * 1000
    const p1 = depMs - toMin * 60 * 1000
    const ov = overlapMinutesMs(p0, p1, slot0, slot1)
    if (ov <= 0) continue
    const w = resolveGateStressWeight(flight.gate, weights, store)
    score += w * (ov / windowMin)
    flightCount += 1
    // 跟分數同一套重疊比例，不乘登機門權重：這是「這一小時約有多少人在登機」
    if (pax) people += (estimateFlightPax(flight, pax) || 0) * (ov / windowMin)
  }
  return { score, flightCount, people }
}

/**
 * 整段壓力曲線：每 15 分一個點，值為「該點起算 60 分鐘槽」的壓力分數。
 * 舊版只回傳排名前 5 的不重疊槽，看不出一天的形狀，也讓相鄰的同一個峰互相擠掉。
 * 傳入當天的 pax_t2 時，每一槽多一個 people（估計登機人數）；沒有就是 null。
 */
export function stressSlotSeriesDay(flights, dateStr, weights, store, shifts, shiftKey, pax = null) {
  const { firstStartMin, lastStartMin } = stressShiftRange(shiftKey, shifts)
  return enumerateSlotStarts(firstStartMin, lastStartMin, SLOT_STEP_MIN).map((startMin) => {
    const { score, flightCount, people } = scoreOneSlotForDay(flights, dateStr, startMin, weights, store, pax)
    return { startMin, score, flightCount, people, label: formatSlotRange24h(startMin) }
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

/**
 * 計入某一個 60 分槽的航班（給畫面列出來用）。
 *
 * 規則必須跟 scoreOneSlotForDay 一致：看的是該店「起飛前 fromMin–toMin 分鐘」這段壓力窗
 * 有沒有和槽重疊，不是「在這一小時起飛」。用起飛時間去篩會少列一半，
 * 跟同一行顯示的班次數對不起來。
 */
export function stressSlotFlights(flights, startMin, store = null) {
  if (!Array.isArray(flights) || typeof startMin !== 'number') return []
  const { fromMin, toMin } = stressWindowOf(store)
  const from = startMin + toMin
  const to = startMin + 60 + fromMin
  return flights
    .filter((f) => {
      if (isStressCancelledFlight(f)) return false
      const m = parseHHMMToMinutes(f.time)
      return m !== null && m > from && m < to
    })
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
}
