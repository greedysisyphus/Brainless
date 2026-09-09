/**
 * 門市設定：每家店只差「涵蓋哪些登機門」與「權重形狀」。
 * 爬蟲固定抓 D 區全部門（scripts/scraper/fetch-from-txt-api.py），
 * 範圍在這裡決定，之後加店不用動 pipeline。
 */

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => `D${from + i}`)

/** 全部門一律同權重（路過型店家用） */
const flatWeights = (families, w) => Object.fromEntries(families.map((f) => [f, w]))

const D13_FAMILIES = range(11, 18)
const D7_FAMILIES = range(5, 18)

const hm = (h, m = 0) => h * 60 + m

export const FLIGHT_STORE_ORDER = Object.freeze(['d13', 'd7'])

export const FLIGHT_STORES = Object.freeze({
  d13: Object.freeze({
    key: 'd13',
    label: 'D13 店',
    rangeLabel: 'D11-D18',
    gateFamilies: Object.freeze(D13_FAMILIES),
    /** D13 最大；D12＝D14；D15；D16＝D17＝D18 —— 越近店越重（鄰門旅客才會進來） */
    stressWeights: Object.freeze({
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
    }),
    /** 對應班表頁的店代碼（班別時間與當天人員都從那裡讀） */
    scheduleStoreCode: 'D13',
    businessHours: Object.freeze({ startMin: hm(5), endMin: hm(21) }),
    /** 統計卡的分段：D13 以 17:00 關店為界 */
    summaryBuckets: Object.freeze([
      { label: '17:00 前', note: '早段航班量', startMin: 0, endMin: hm(17) },
      { label: '17:00 後', note: '晚段航班量', startMin: hm(17), endMin: hm(24) }
    ]),
    /** 晚班要不要留店，看當天最後一班登機時間 */
    nightSupport: true,
    /** D11 不納入晚班支援 */
    nightGateIncluded: Object.freeze({ ...flatWeights(D13_FAMILIES, true), D11: false }),
    stressDocId: 'flight_gate_stress_weights',
    nightDocId: 'night_shift_support',
    stressLocalKey: 'flightGateStressWeightsV1',
    nightLocalKey: 'flightNightShiftSupportV1'
  }),
  d7: Object.freeze({
    key: 'd7',
    label: 'D7 店',
    rangeLabel: 'D5-D18',
    gateFamilies: Object.freeze(D7_FAMILIES),
    /**
     * 路過型：D5–D18 的旅客都會經過店門口，所以預設拉平，
     * 不套用 D13 店「越近越重」的形狀。實際走道人流要靠齒輪調。
     * ponytail: 平權重是誠實的起點，量出各門差異後再改這張表
     */
    stressWeights: Object.freeze({
      ...flatWeights(D7_FAMILIES, 2.0),
      D_OTHER: 0.6,
      OTHER: 0.5
    }),
    scheduleStoreCode: 'D7',
    /** 營業 05:00–22:00 */
    businessHours: Object.freeze({ startMin: hm(5), endMin: hm(22) }),
    /**
     * null＝統計卡直接照班表的班別切。D7 沒有「17:00 關店」這件事，
     * 切 17:00 前後沒有意義；上班的人要問的是「我這班有幾班機」。
     */
    summaryBuckets: null,
    /** D7 店下班時間固定，不用算留店到幾點 —— 整組晚班支援 UI 在這家店不顯示 */
    nightSupport: false,
    nightGateIncluded: Object.freeze(flatWeights(D7_FAMILIES, true)),
    stressDocId: 'flight_gate_stress_weights_d7',
    nightDocId: 'night_shift_support_d7',
    stressLocalKey: 'flightGateStressWeightsD7V1',
    nightLocalKey: 'flightNightShiftSupportD7V1'
  })
})

export const DEFAULT_FLIGHT_STORE_KEY = 'd13'
export const FLIGHT_STORE_LOCAL_KEY = 'flightDataStoreV1'

export function getFlightStore(key) {
  return FLIGHT_STORES[key] || FLIGHT_STORES[DEFAULT_FLIGHT_STORE_KEY]
}

export function loadStoredFlightStoreKey() {
  if (typeof window === 'undefined') return DEFAULT_FLIGHT_STORE_KEY
  try {
    const raw = localStorage.getItem(FLIGHT_STORE_LOCAL_KEY)
    return FLIGHT_STORES[raw] ? raw : DEFAULT_FLIGHT_STORE_KEY
  } catch {
    return DEFAULT_FLIGHT_STORE_KEY
  }
}

export function cacheFlightStoreKeyLocal(key) {
  try {
    localStorage.setItem(FLIGHT_STORE_LOCAL_KEY, key)
  } catch {
    // ignore
  }
}

/** 找班別；找不到（例如切店後 key 不存在）就退回第一項（全天） */
export function getStoreShift(shifts, shiftKey) {
  return shifts.find((sh) => sh.key === shiftKey) || shifts[0]
}

/** 班表頁的店代碼（'D7'／'D13'）→ 航班門市設定；一店等沒有航班資料的店回 null */
export function getFlightStoreByScheduleCode(code) {
  if (!code) return null
  return FLIGHT_STORE_ORDER.map((k) => FLIGHT_STORES[k]).find((s) => s.scheduleStoreCode === code) || null
}
