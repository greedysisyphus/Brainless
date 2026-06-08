import { normalizeGateKey } from './gates'

export const GATE_STRESS_STORAGE_KEY = 'flightGateStressWeightsV1'
/** Firestore：`settings/{GATE_STRESS_FIREBASE_DOC_ID}`，欄位 `weights` + `updatedAt` */
export const GATE_STRESS_FIREBASE_DOC_ID = 'flight_gate_stress_weights'

/** 預設：D13 最大；D12＝D14；D15；D16＝D17＝D18；D14–D18 含 L／R 與同號合併 */
export const DEFAULT_GATE_STRESS_WEIGHTS = Object.freeze({
  D11: 0.9,
  D12: 2.7,
  D13: 4,
  D14: 2.7,
  D15: 2.4,
  D16: 2.0,
  D17: 2.0,
  D18: 2.0,
  D_OTHER: 1.2,
  OTHER: 1.0
})

export function gateToStressWeightKey(gateRaw) {
  const g = normalizeGateKey(gateRaw)
  if (!g) return 'OTHER'
  if (/^D11(L|R)?$/.test(g)) return 'D11'
  if (/^D12(L|R)?$/.test(g)) return 'D12'
  if (/^D13(L|R)?$/.test(g)) return 'D13'
  const m = g.match(/^D(1[4-8])(L|R)?$/)
  if (m) return `D${m[1]}`
  if (g.startsWith('D')) return 'D_OTHER'
  return 'OTHER'
}

export function mergeGateStressWeights(partial) {
  const out = { ...DEFAULT_GATE_STRESS_WEIGHTS }
  if (!partial || typeof partial !== 'object') return out
  for (const k of Object.keys(DEFAULT_GATE_STRESS_WEIGHTS)) {
    const v = partial[k]
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = v
  }
  return out
}

export function loadStoredGateStressWeights() {
  if (typeof window === 'undefined') return { ...DEFAULT_GATE_STRESS_WEIGHTS }
  try {
    const raw = localStorage.getItem(GATE_STRESS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_GATE_STRESS_WEIGHTS }
    return mergeGateStressWeights(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_GATE_STRESS_WEIGHTS }
  }
}

export function cacheGateStressWeightsLocal(weights) {
  try {
    localStorage.setItem(GATE_STRESS_STORAGE_KEY, JSON.stringify(weights))
  } catch {
    // ignore
  }
}

export function resolveGateStressWeight(gateRaw, weights) {
  const key = gateToStressWeightKey(gateRaw)
  const w = weights[key]
  if (typeof w === 'number' && Number.isFinite(w) && w >= 0) return w
  return DEFAULT_GATE_STRESS_WEIGHTS[key]
}
