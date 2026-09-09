import { gateToFamily } from './gates.js'

/**
 * 登機門壓力權重：每家店一份（門號範圍與權重形狀不同，見 stores.js）。
 * Firestore：`settings/{store.stressDocId}`，欄位 `weights` + `updatedAt`
 */

export function gateToStressWeightKey(gateRaw, store) {
  const fam = gateToFamily(gateRaw)
  if (!fam) return 'OTHER'
  return store.gateFamilies.includes(fam) ? fam : 'D_OTHER'
}

export function mergeGateStressWeights(partial, store) {
  const out = { ...store.stressWeights }
  if (!partial || typeof partial !== 'object') return out
  for (const k of Object.keys(store.stressWeights)) {
    const v = partial[k]
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = v
  }
  return out
}

export function loadStoredGateStressWeights(store) {
  if (typeof window === 'undefined') return { ...store.stressWeights }
  try {
    const raw = localStorage.getItem(store.stressLocalKey)
    if (!raw) return { ...store.stressWeights }
    return mergeGateStressWeights(JSON.parse(raw), store)
  } catch {
    return { ...store.stressWeights }
  }
}

export function cacheGateStressWeightsLocal(weights, store) {
  try {
    localStorage.setItem(store.stressLocalKey, JSON.stringify(weights))
  } catch {
    // ignore
  }
}

export function resolveGateStressWeight(gateRaw, weights, store) {
  const key = gateToStressWeightKey(gateRaw, store)
  const w = weights?.[key]
  if (typeof w === 'number' && Number.isFinite(w) && w >= 0) return w
  return store.stressWeights[key]
}
