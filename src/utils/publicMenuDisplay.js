/** 客人電子菜單版面；menu-site 需同步 MENU_LAYOUT_IDS / DEFAULT */
export const PUBLIC_MENU_SITE_URL = 'https://simplekaffa-menu.vercel.app/'

export const MENU_LAYOUT_IDS = ['stack', 'row', 'tabs']
export const DEFAULT_MENU_LAYOUT = 'stack'

export const MENU_LAYOUT_OPTIONS = [
  { id: 'stack', label: '上下排列', hint: '兩張圖直向捲動（預設）' },
  { id: 'row', label: '寬螢幕左右', hint: '平板／橫向並排；手機仍上下' },
  { id: 'tabs', label: '分頁切換', hint: '一次一張，點分頁或圓點切換' },
]

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
