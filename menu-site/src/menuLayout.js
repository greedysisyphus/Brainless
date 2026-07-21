/** 與 Brainless src/utils/publicMenuDisplay.js 同步 */
export const MENU_LAYOUT_IDS = ['stack', 'row', 'tabs']
export const DEFAULT_MENU_LAYOUT = 'stack'

export function normalizeMenuLayout(value) {
  if (typeof value === 'string' && MENU_LAYOUT_IDS.includes(value)) {
    return value
  }
  return DEFAULT_MENU_LAYOUT
}

export function readMenuLayoutFromDoc(data) {
  if (!data) return DEFAULT_MENU_LAYOUT
  return normalizeMenuLayout(data.display?.layout ?? data.layout)
}
