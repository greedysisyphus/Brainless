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

export const GOODS_ORDER_CATALOG_VERSION = 2

const LEGACY_DEFAULT_ITEMS = [
  ['大熱杯', '箱', 2, 2, true],
  ['大熱杯蓋', '箱', 2, 2, true],
  ['小熱杯蓋', '箱', 1, 1, true],
  ['輕食用手套M號', '盒', 1, 3, false],
  ['外帶吐司盒', '箱', 1, 1, true],
  ['外帶小白杯', '條', 2, 4, false],
  ['廚房紙巾', '包', 1, 1, false],
  ['九乘九', '箱', 1, 1, true],
  ['夾鏈袋（大）', '條', 1, 1, false],
  ['黑糖粉', '箱', 1, 1, true],
  ['黑糖蜜', '罐', 1, 2, false],
  ['黑色塑膠刀', '包', 1, 3, false],
  ['保鮮膜', '條', 1, 2, false],
  ['一般紙袋', '箱', 1, 1, true],
  ['大垃圾袋', '袋', 1, 1, false],
  ['粗吸管', '包', 1, 2, false],
  ['細吸管', '包', 2, 5, false],
  ['夾心餅', '盒', 1, 2, false],
  ['帕馬森乾酪', '塊', 2, 6, false],
  ['木攪拌棒', '包', 1, 1, false],
  ['珍珠', '箱', 1, 1, true],
]

/** 照門市叫貨單排序：先左欄由上到下，再右欄由上到下。 */
const DEFAULT_ITEM_DEFS = [
  { name: '外帶大熱杯', unit: '箱', note: '1 箱 20 條，每條 50 入' },
  { name: '外帶小熱杯', unit: '箱', note: '1 箱 20 條，每條 50 入' },
  { name: '外帶大熱杯蓋', unit: '箱', note: '1 箱 20 條，每條 50 入' },
  { name: '外帶小熱杯蓋', unit: '箱', note: '1 箱 20 條，每條 50 入' },
  { name: '外帶卡布杯', unit: '條', note: '小綠杯' },
  { name: '外帶吐司盒', unit: '箱', note: '1 箱 6 條' },
  { name: '小白杯', unit: '條' },
  { name: '廚房紙巾', unit: '包', note: '1 包 6 入' },
  { name: '九乘九紙巾', unit: '箱' },
  { name: '垃圾袋（大）', unit: '袋' },
  { name: '垃圾袋（小）', unit: '條' },
  { name: '一般紙袋', unit: '箱' },
  { name: '濾水網', unit: '包' },
  { name: '抹布、菜瓜布', unit: '包' },
  { name: '吸管（細）、（粗）', unit: '包' },
  { name: '輕食用手套 S', unit: '盒' },
  { name: '輕食用手套 M', unit: '盒' },
  { name: '輕食用手套 L', unit: '盒' },
  { name: '夾鏈袋（大）、（小）', unit: '袋' },
  { name: '黑糖粉', unit: '箱', note: '1 箱 20 包' },
  { name: '黑糖蜜', unit: '罐' },
  { name: '威士忌', unit: '罐' },
  { name: '砂糖', unit: '箱', note: '1 箱 20 包' },
  { name: '陳家蜂蜜', unit: '罐' },
  { name: '辣蜂蜜', unit: '箱', note: '1 箱 8 罐' },
  { name: '珍珠', unit: '箱' },
  { name: '大寒、立秋', unit: '箱' },
  { name: '康普茶', unit: '箱' },
  { name: '伯爵茶葉', unit: '罐' },
  { name: '不知春', unit: '盒' },
  { name: '帕瑪森起司塊', unit: '塊' },
  { name: '夾心餅', unit: '盒', note: 'Noah' },
  { name: '烘焙紙捲', unit: '條' },
  { name: '保鮮膜', unit: '條' },
  { name: '杯架', unit: '條' },
  { name: '木攪拌棒', unit: '包' },
  { name: '黑色塑膠刀、叉', unit: '包', note: '另有箱裝' },
  { name: '濾紙', unit: '箱', note: '1 箱 20 包，每包 100 入' },
  { name: '養豆卡', unit: '箱' },
  { name: '豆貼豆卡', unit: '盒' },
  { name: '氣閥貼', unit: '疊' },
  { name: '咪提袋', unit: '個' },
  { name: '大禮盒＋紙袋', unit: '組' },
  { name: 'Gleam 波光 君小兒', unit: '箱', note: '1 箱 20 入' },
  { name: 'Ripple 漣漪 君大兒', unit: '個' },
  { name: '水、日、寶 掛耳', unit: '箱' },
  { name: '咪、低咖、高價 掛耳', unit: '小箱' },
  { name: 'Hario Alpha 濾杯', unit: '個' },
  { name: '販售用玻璃下壺', unit: '個' },
  { name: '販售用馬克杯', unit: '個' },
  { name: '2waycup 雙線品飲杯', unit: '箱', note: '1 箱 6 入' },
  { name: '販售用濃縮杯', unit: '箱', note: '1 箱 6 入' },
  { name: '販售用古典杯', unit: '箱', note: '1 箱 6 入；可塔朵' },
  { name: '販售用卡布杯', unit: '箱', note: '1 箱 6 入' },
  { name: '販售用小白杯', unit: '箱', note: '1 箱 6 入；FlatWhite' },
  { name: '地板清潔劑', unit: '桶', note: '需要危安放行條' },
  { name: '截油槽清潔劑', unit: '桶', note: '危安' },
  { name: '洗碗精', unit: '桶', note: '危安' },
  { name: '洗手乳', unit: '桶', note: '危安' },
  { name: '酒精', unit: '桶', note: '危安' },
  { name: '漂白水', unit: '桶', note: '危安' },
  { name: '食器用酵素', unit: '桶', note: '危安；白蓋' },
  { name: '咖啡機清潔藥劑', unit: '桶', note: '危安；紅蓋' },
  { name: '烤箱清潔劑', unit: '罐', note: '危安' },
  { name: '烤箱保養油', unit: '罐', note: '危安' },
]

/** 新預設一律先以最低 1、預設叫貨 1 建立；箱裝品支援分數盤點。 */
export const createDefaultItems = () =>
  DEFAULT_ITEM_DEFS.map((definition, index) => ({
    id: `goi_default_v${GOODS_ORDER_CATALOG_VERSION}_${String(index + 1).padStart(2, '0')}`,
    ...definition,
    note: definition.note || '',
    minStock: 1,
    defaultOrderQty: 1,
    allowFraction: definition.unit === '箱',
    disabled: false,
  }))

/** 只自動升級完全未改動的舊預設，保留使用者自行調整過的門市清單。 */
export function shouldUpgradeDefaultCatalog(catalog) {
  if (Number(catalog?.catalogVersion) >= GOODS_ORDER_CATALOG_VERSION) return false
  const items = Array.isArray(catalog?.items) ? catalog.items : []
  if (items.length !== LEGACY_DEFAULT_ITEMS.length) return false
  return items.every((item, index) => {
    const [name, unit, minStock, defaultOrderQty, allowFraction] = LEGACY_DEFAULT_ITEMS[index]
    return (
      item.name === name &&
      item.unit === unit &&
      Number(item.minStock) === minStock &&
      Number(item.defaultOrderQty) === defaultOrderQty &&
      Boolean(item.allowFraction) === allowFraction &&
      !item.disabled
    )
  })
}

export const createDefaultCatalog = (storeId) => ({
  catalogVersion: GOODS_ORDER_CATALOG_VERSION,
  items: createDefaultItems(),
  orderStoreName: getDefaultOrderStoreName(storeId),
  _clientUpdatedAt: Date.now(),
})

export const createEmptyCounts = () => ({
  counts: {},
  _clientUpdatedAt: Date.now(),
})

/**
 * 支援：整數、點數（1.5）、真分數（1/2）、帶分數（1 1/2、1又1/2）。
 * 不支援易混淆的 1/1/2。
 * @returns {{ kind: 'empty' } | { kind: 'incomplete' } | { kind: 'value', value: number } | { kind: 'invalid' }}
 */
export function parseQuantity(raw) {
  if (raw === '' || raw == null) return { kind: 'empty' }
  const original = String(raw)
  if (original.trim() === '') return { kind: 'empty' }

  // 打「1 1/2」時保留尾端空白，勿 trim 掉
  if (/^\d+\s+$/.test(original)) return { kind: 'incomplete' }

  const s = original.trim().replace(/又/g, ' ')

  // 明確拒絕 1/1/2 這類寫法
  if (/^\d+\/\d+\/\d+/.test(s)) return { kind: 'invalid' }

  // 打字中的草稿：0.、1/、1 1、1 1/
  if (
    s === '.' ||
    s === '/' ||
    /^\d+\.$/.test(s) ||
    /^\d+\/$/.test(s) ||
    /^\d+\s+\d+$/.test(s) ||
    /^\d+\s+\d+\/$/.test(s) ||
    (/^\d+\/\d*$/.test(s) && !/^\d+\/\d+$/.test(s))
  ) {
    return { kind: 'incomplete' }
  }

  // 帶分數：1 1/2
  const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/)
  if (mixed) {
    const whole = Number(mixed[1])
    const num = Number(mixed[2])
    const den = Number(mixed[3])
    if (!den) return { kind: 'invalid' }
    const v = whole + num / den
    return Number.isFinite(v) ? { kind: 'value', value: v } : { kind: 'invalid' }
  }

  // 真分數／假分數：1/2、3/2
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (frac) {
    const den = Number(frac[2])
    if (!den) return { kind: 'invalid' }
    const v = Number(frac[1]) / den
    return Number.isFinite(v) ? { kind: 'value', value: v } : { kind: 'invalid' }
  }

  // 點數：0.5、.5、1.5、2
  if (/^-?\d+(\.\d+)?$/.test(s) || /^\.\d+$/.test(s)) {
    const n = Number(s)
    if (!Number.isFinite(n)) return { kind: 'invalid' }
    return { kind: 'value', value: n }
  }

  return { kind: 'invalid' }
}

/** 輸出／顯示：0.5→1/2，1.5→1 1/2；其餘常見分數或小數 */
export function formatQuantity(value) {
  if (value == null || !Number.isFinite(Number(value))) return ''
  const n = Number(value)
  if (Object.is(n, -0)) return '0'
  if (Number.isInteger(n)) return String(n)
  const common = [
    [0.5, '1/2'],
    [1.5, '1 1/2'],
    [2.5, '2 1/2'],
    [0.25, '1/4'],
    [0.75, '3/4'],
    [1.25, '1 1/4'],
    [1.75, '1 3/4'],
    [1 / 3, '1/3'],
    [2 / 3, '2/3'],
  ]
  for (const [num, label] of common) {
    if (Math.abs(n - num) < 1e-9) return label
  }
  // 嘗試轉成帶分數 n d/2（僅分母 2）
  const half = Math.round(n * 2) / 2
  if (Math.abs(n - half) < 1e-9 && !Number.isInteger(half)) {
    const whole = Math.floor(half)
    return whole > 0 ? `${whole} 1/2` : '1/2'
  }
  const rounded = Math.round(n * 1000) / 1000
  return String(rounded)
}

/** 現有貨量：保留使用者輸入字串（份數／點數互通），打字中不強迫正規化 */
export function normalizeCurrentInput(raw) {
  if (raw === '' || raw == null) return ''
  return String(raw)
}

/** 顯示用：字串原樣；數字才做常見分數格式化 */
export function displayCurrentInput(current) {
  if (current === '' || current == null) return ''
  if (typeof current === 'string') return current
  return formatQuantity(current)
}

export function quantityInputToStored(raw, allowFraction = true) {
  const parsed = parseQuantity(raw)
  if (parsed.kind === 'empty') return ''
  if (parsed.kind === 'incomplete' || parsed.kind === 'invalid') return null
  if (!allowFraction && !Number.isInteger(parsed.value)) {
    return null
  }
  return parsed.value
}

export function getItemStatus(item, countEntry) {
  const currentRaw = countEntry?.current
  const parsed = parseQuantity(currentRaw === 0 || currentRaw ? String(currentRaw) : '')
  if (parsed.kind === 'empty' || parsed.kind === 'incomplete') return 'uncounted'
  if (getCurrentQuantityError(item, countEntry)) return 'invalid'

  const suggested = parsed.value < Number(item.minStock)
  const force = countEntry?.forceInclude
  const willOrder = force === true ? true : force === false ? false : suggested
  return willOrder ? 'order' : 'later'
}

export function getCurrentQuantityError(item, countEntry) {
  const currentRaw = countEntry?.current
  const parsed = parseQuantity(currentRaw === 0 || currentRaw ? String(currentRaw) : '')
  if (parsed.kind === 'empty' || parsed.kind === 'incomplete') return ''
  if (parsed.kind === 'invalid') return '請輸入 0、0.5、1/2 或 1 1/2 這類數量。'
  if (parsed.value < 0) return '現有數量不能小於 0。'
  if (!item.allowFraction && !Number.isInteger(parsed.value)) {
    return `${item.unit || '此品項'}只能輸入整數。`
  }
  return ''
}

export function getEffectiveOrderQty(item, countEntry) {
  const override = countEntry?.orderQty
  if (override !== '' && override != null && Number.isFinite(Number(override))) {
    return Number(override)
  }
  return Number(item.defaultOrderQty) || 0
}

export function getOrderQuantityError(item, countEntry) {
  const raw =
    countEntry?.orderQty === '' || countEntry?.orderQty == null
      ? item.defaultOrderQty
      : countEntry.orderQty
  const parsed = parseQuantity(raw)
  if (parsed.kind !== 'value') return '請輸入有效的叫貨量，例如 1、1/2 或 2。'
  if (parsed.value <= 0) return '叫貨量必須大於 0。'
  if (!item.allowFraction && !Number.isInteger(parsed.value)) {
    return `${item.unit || '此品項'}只能輸入整數。`
  }
  return ''
}

export function validateCatalog(catalog) {
  const itemErrors = {}
  ;(catalog?.items || []).forEach((item) => {
    const errors = {}
    if (!String(item.name || '').trim()) errors.name = '請輸入品名。'
    if (!String(item.unit || '').trim()) errors.unit = '請輸入單位。'

    const min = parseQuantity(item.minStock)
    if (min.kind !== 'value' || min.value < 0) {
      errors.minStock = '最低庫存必須是 0 或正數。'
    }

    const defaultQty = parseQuantity(item.defaultOrderQty)
    if (defaultQty.kind !== 'value' || defaultQty.value <= 0) {
      errors.defaultOrderQty = '預設叫貨量必須大於 0。'
    } else if (!item.allowFraction && !Number.isInteger(defaultQty.value)) {
      errors.defaultOrderQty = `${item.unit || '此品項'}只能輸入整數。`
    }

    if (Object.keys(errors).length > 0) itemErrors[item.id] = errors
  })

  return {
    orderStoreName: String(catalog?.orderStoreName || '').trim()
      ? ''
      : '請輸入叫貨店名。',
    itemErrors,
    count: Object.values(itemErrors).reduce(
      (sum, errors) => sum + Object.keys(errors).length,
      0
    ) + (String(catalog?.orderStoreName || '').trim() ? 0 : 1),
  }
}

export const FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'uncounted', label: '未盤點' },
  { id: 'order', label: '需叫貨' },
  { id: 'later', label: '庫存足夠' },
]

export const STATUS_LABELS = {
  uncounted: '未盤點',
  order: '需叫貨',
  later: '庫存足夠',
  invalid: '格式有誤',
}
