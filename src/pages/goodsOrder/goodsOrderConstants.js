/** 貨物叫貨：常數與純函數 */

export const GOODS_ORDER_SOURCE = '三重'

export const STORES = [
  { id: 'central', name: '中央店', defaultOrderStoreName: '桃機一' },
  { id: 'd7', name: 'D7 店', defaultOrderStoreName: '桃機D7' },
  { id: 'd13', name: 'D13 店', defaultOrderStoreName: '桃機D13' },
]

export const getStoreName = (storeId) => STORES.find((s) => s.id === storeId)?.name ?? '中央店'

export const getDefaultOrderStoreName = (storeId) =>
  STORES.find((s) => s.id === storeId)?.defaultOrderStoreName ?? '桃機一'

export const getCatalogDocId = (storeId) => `goodsOrderCatalog_${storeId}`
export const getCountsDocId = (storeId) => `goodsOrderCounts_${storeId}`
export const getSnapshotDocId = (storeId) => `goodsOrderSnapshot_${storeId}`
export const getCatalogStorageKey = (storeId) => `goodsOrderCatalog_local_${storeId}`
export const getCountsStorageKey = (storeId) => `goodsOrderCounts_local_${storeId}`

let _idSeq = 0
export const createItemId = () => {
  _idSeq += 1
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `goi_${crypto.randomUUID()}`
  }
  return `goi_${Date.now()}_${_idSeq}`
}

/** 測試用預設品項（各店可各自改，不共用） */
export const createDefaultItems = () => {
  const defs = [
    { name: '大熱杯', unit: '箱', minStock: 2, defaultOrderQty: 2, allowFraction: true },
    { name: '大熱杯蓋', unit: '箱', minStock: 2, defaultOrderQty: 2, allowFraction: true },
    { name: '小熱杯蓋', unit: '箱', minStock: 1, defaultOrderQty: 1, allowFraction: true },
    { name: '輕食用手套M號', unit: '盒', minStock: 1, defaultOrderQty: 3, allowFraction: false },
    { name: '外帶吐司盒', unit: '箱', minStock: 1, defaultOrderQty: 1, allowFraction: true },
    { name: '外帶小白杯', unit: '條', minStock: 2, defaultOrderQty: 4, allowFraction: false },
    { name: '廚房紙巾', unit: '包', minStock: 1, defaultOrderQty: 1, allowFraction: false },
    { name: '九乘九', unit: '箱', minStock: 1, defaultOrderQty: 1, allowFraction: true },
    { name: '夾鏈袋（大）', unit: '條', minStock: 1, defaultOrderQty: 1, allowFraction: false },
    { name: '黑糖粉', unit: '箱', minStock: 1, defaultOrderQty: 1, allowFraction: true },
    { name: '黑糖蜜', unit: '罐', minStock: 1, defaultOrderQty: 2, allowFraction: false },
    { name: '黑色塑膠刀', unit: '包', minStock: 1, defaultOrderQty: 3, allowFraction: false },
    { name: '保鮮膜', unit: '條', minStock: 1, defaultOrderQty: 2, allowFraction: false },
    { name: '一般紙袋', unit: '箱', minStock: 1, defaultOrderQty: 1, allowFraction: true },
    { name: '大垃圾袋', unit: '袋', minStock: 1, defaultOrderQty: 1, allowFraction: false },
    { name: '粗吸管', unit: '包', minStock: 1, defaultOrderQty: 2, allowFraction: false },
    { name: '細吸管', unit: '包', minStock: 2, defaultOrderQty: 5, allowFraction: false },
    { name: '夾心餅', unit: '盒', minStock: 1, defaultOrderQty: 2, allowFraction: false },
    { name: '帕馬森乾酪', unit: '塊', minStock: 2, defaultOrderQty: 6, allowFraction: false },
    { name: '木攪拌棒', unit: '包', minStock: 1, defaultOrderQty: 1, allowFraction: false },
    { name: '珍珠', unit: '箱', minStock: 1, defaultOrderQty: 1, allowFraction: true },
  ]
  return defs.map((d) => ({
    id: createItemId(),
    name: d.name,
    unit: d.unit,
    minStock: d.minStock,
    defaultOrderQty: d.defaultOrderQty,
    allowFraction: d.allowFraction,
    disabled: false,
  }))
}

export const createDefaultCatalog = (storeId) => ({
  items: createDefaultItems(),
  orderStoreName: getDefaultOrderStoreName(storeId),
  _clientUpdatedAt: Date.now(),
})

export const createEmptyCounts = () => ({
  counts: {},
  _clientUpdatedAt: Date.now(),
})

/**
 * @returns {{ kind: 'empty' } | { kind: 'value', value: number } | { kind: 'invalid' }}
 */
export function parseQuantity(raw) {
  if (raw === '' || raw == null) return { kind: 'empty' }
  const s = String(raw).trim()
  if (s === '') return { kind: 'empty' }
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (frac) {
    const den = Number(frac[2])
    if (!den) return { kind: 'invalid' }
    const v = Number(frac[1]) / den
    return Number.isFinite(v) ? { kind: 'value', value: v } : { kind: 'invalid' }
  }
  const n = Number(s)
  if (!Number.isFinite(n)) return { kind: 'invalid' }
  return { kind: 'value', value: n }
}

/** 常見分數優先：0.5 → 1/2；其餘整數或小數 */
export function formatQuantity(value) {
  if (value == null || !Number.isFinite(Number(value))) return ''
  const n = Number(value)
  if (Object.is(n, -0)) return '0'
  if (Number.isInteger(n)) return String(n)
  const common = [
    [0.5, '1/2'],
    [1.5, '3/2'],
    [0.25, '1/4'],
    [0.75, '3/4'],
    [1 / 3, '1/3'],
    [2 / 3, '2/3'],
  ]
  for (const [num, label] of common) {
    if (Math.abs(n - num) < 1e-9) return label
  }
  const rounded = Math.round(n * 1000) / 1000
  return String(rounded)
}

export function quantityInputToStored(raw, allowFraction) {
  const parsed = parseQuantity(raw)
  if (parsed.kind === 'empty') return ''
  if (parsed.kind === 'invalid') return null
  if (!allowFraction && !Number.isInteger(parsed.value)) {
    return null
  }
  return parsed.value
}

export function getItemStatus(item, countEntry) {
  const currentRaw = countEntry?.current
  const parsed = parseQuantity(currentRaw === 0 || currentRaw ? String(currentRaw) : '')
  if (parsed.kind === 'empty') return 'uncounted'
  if (parsed.kind === 'invalid') return 'invalid'

  const suggested = parsed.value < Number(item.minStock)
  const force = countEntry?.forceInclude
  const willOrder = force === true ? true : force === false ? false : suggested
  return willOrder ? 'order' : 'later'
}

export function getEffectiveOrderQty(item, countEntry) {
  const override = countEntry?.orderQty
  if (override !== '' && override != null && Number.isFinite(Number(override))) {
    return Number(override)
  }
  return Number(item.defaultOrderQty) || 0
}

export const FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'uncounted', label: '未盤點' },
  { id: 'order', label: '建議叫' },
  { id: 'later', label: '下次' },
]
