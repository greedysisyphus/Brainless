/** 咖啡豆管理：與 UI 無關的常數與純函數（供 CoffeeBeanManager 引用） */

export const DEFAULT_BEAN_TYPES = {
  brewing: {
    pourOver: ['水洗', '日曬', '阿寶', '台灣豆', 'Geisha'],
    espresso: ['ESP', '水洗'],
  },
  retail: ['水洗', '日曬', '阿寶', '季節', '台灣豆', 'Geisha'],
}

/** D7：dryStorage 預設 true；中央／D13：false */
export const getDefaultBeanLocationsForStore = (store) => {
  const dryStorageDefault = store === 'd7'
  return {
    台灣豆: { store: true, breakRoom: false, dryStorage: dryStorageDefault },
    Geisha: { store: true, breakRoom: false, dryStorage: dryStorageDefault },
  }
}

export const DEFAULT_BEAN_LOCATIONS = getDefaultBeanLocationsForStore('central')

export const convertStoreOnlyToLocations = (storeOnlyBeans, allBeanNames) => {
  const locations = {}
  allBeanNames.forEach((beanName) => {
    locations[beanName] = {
      store: true,
      breakRoom: !storeOnlyBeans.includes(beanName),
      dryStorage: false,
    }
  })
  return locations
}

export const DEFAULT_WEIGHTS = {
  bagWeight: 121,
  ikeaBoxWeight: 365,
  mujiBoxWeight: 365,
  beanWeightPerPack: 19,
}

export const STORES = [
  { id: 'central', name: '中央店' },
  { id: 'd7', name: 'D7 店' },
  { id: 'd13', name: 'D13 店' },
]

export const getStoreName = (storeId) => STORES.find((s) => s.id === storeId)?.name ?? '中央店'
export const getWeightDocId = (storeId) => `coffeeBeanWeight_${storeId}`
export const getBeanTypesDocId = (storeId) => `coffeeBeanTypes_${storeId}`
export const getInventoryStorageKey = (storeId) => `coffeeBeanInventory_${storeId}`
export const getWeightSettingsStorageKey = (storeId) => `coffeeBeanWeightSettings_${storeId}`
export const getBoxWeightKey = (storeId) => (storeId === 'd13' ? 'mujiBoxWeight' : 'ikeaBoxWeight')

export const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

/** containerType: 'bag' | 'ikea' | 'muji' */
export const getPacksFromWeight = (totalG, weightSettings, containerType) => {
  if (totalG === '' || totalG == null) return 0
  const w = typeof totalG === 'number' ? totalG : parseFloat(totalG)
  if (isNaN(w) || w <= 0 || !weightSettings) return 0
  const containerWeight =
    containerType === 'bag'
      ? weightSettings.bagWeight
      : containerType === 'muji'
        ? weightSettings.mujiBoxWeight ?? weightSettings.ikeaBoxWeight
        : weightSettings.ikeaBoxWeight
  const perPack = weightSettings.beanWeightPerPack
  if (containerWeight == null || perPack == null || perPack <= 0) return 0
  const beanWeight = w - Number(containerWeight)
  if (!Number.isFinite(beanWeight) || beanWeight <= 0) return 0
  const result = beanWeight / Number(perPack)
  return Number.isFinite(result) ? result : 0
}

/** 一列「數」超過這個數字，大概是把重量填成了包數 */
export const MAX_PLAUSIBLE_PACKS = 100

/**
 * 這一列的數字跟數／袋／盒對不對得上，對不上就回傳提醒和建議改成的模式。
 * - 數：包數很少超過 100，太大多半是重量（之前水洗 7256 包就是這樣來的）
 * - 袋／盒：比空袋／空盒還輕的重量不可能，多半其實是包數
 * @param {string|number} value
 * @param {'quantity'|'weightBag'|'weightBox'} mode
 * @param {{ bag: number, box: number }} emptyWeights 各店重量設定裡的空袋／空盒重量（g）
 * @returns {null | { message: string, suggest: string[] }}
 */
export function checkRowPlausibility(value, mode, emptyWeights) {
  const v = typeof value === 'number' ? value : parseFloat(value)
  if (!Number.isFinite(v) || v <= 0) return null
  if (mode === 'weightBag' || mode === 'weightBox') {
    const empty = Number(mode === 'weightBag' ? emptyWeights?.bag : emptyWeights?.box) || 0
    if (empty > 0 && v < empty) {
      return {
        message: `比空${mode === 'weightBag' ? '袋' : '盒'} ${empty}g 還輕，是包數？`,
        suggest: ['quantity'],
      }
    }
    return null
  }
  if (v > MAX_PLAUSIBLE_PACKS) {
    return { message: `超過 ${MAX_PLAUSIBLE_PACKS} 包，是重量？`, suggest: ['weightBag', 'weightBox'] }
  }
  return null
}
