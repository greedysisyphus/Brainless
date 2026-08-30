/** 班表：店別、班別、崗位、假別與上車地點的共用常數 */

export const SHIFT_SCHEMA_VERSION = 1

/** 支援的匯出檔 schema 主版本。主版本不同代表結構可能變了，不能硬讀。 */
export const SUPPORTED_EXPORT_SCHEMA_MAJOR = 1

/** 三家店。code 對齊 Brainless-SimpleKaffa-Shifts-Convertor 匯出檔的 store.code */
export const STORES = [
  { code: 'central', name: '桃機一店', short: '一店', fullName: '超級棧 - 桃機一店' },
  { code: 'D7', name: '桃機D7', short: 'D7', fullName: '超級棧 - 桃機D7' },
  { code: 'D13', name: '桃機D13', short: 'D13', fullName: '超級棧 - 桃機D13' },
]

export const STORE_CODES = STORES.map((s) => s.code)

export function getStore(code) {
  return STORES.find((s) => s.code === code) || null
}

export function getStoreName(code) {
  return getStore(code)?.name || code || '未註明店別'
}

/** 短名，給名單與匯出用。沒寫店別時給看得懂的字，不要漏出 null。 */
export function getStoreShortName(code) {
  return getStore(code)?.short || code || '未註明'
}

/**
 * 班別預設時間。匯入檔若帶自己的時間以匯入檔為準（每月每店可能不同），
 * 這裡只是缺值時的後備。D13 晚班較早收班。
 */
export const DEFAULT_SHIFT_TIMES = {
  MORNING: { start: '04:30', end: '13:00' },
  MID: { start: '05:30', end: '14:00' },
  NOON: { start: '07:30', end: '16:00' },
  EVENING: { start: '14:00', end: '22:30' },
}

export const STORE_SHIFT_TIME_OVERRIDES = {
  D13: {
    EVENING: { start: '13:00', end: '21:30' },
  },
}

export function getDefaultShiftTimes(storeCode) {
  return { ...DEFAULT_SHIFT_TIMES, ...(STORE_SHIFT_TIME_OVERRIDES[storeCode] || {}) }
}

/**
 * 已知班別的樣式與後備標籤。**這不是班別清單** —— 清單以匯入檔的 shift_types 為準
 * （店長可在轉換器新增班別）；未知代碼由 shiftVocab 配中性色。
 */
export const SHIFT_META = {
  MORNING: { code: 'MORNING', label: '早班', short: '早', bg: '#f7ddc4', fg: '#7a3f0d', order: 1 },
  MID: { code: 'MID', label: '中班', short: '中', bg: '#d5e4f2', fg: '#1d4d75', order: 2 },
  NOON: { code: 'NOON', label: '午班', short: '午', bg: '#d9e8cd', fg: '#2f5d22', order: 3 },
  EVENING: { code: 'EVENING', label: '晚班', short: '晚', bg: '#dcd9ef', fg: '#3d3675', order: 4 },
  SUPPORT: { code: 'SUPPORT', label: '支援', short: '支', bg: 'rgba(198, 64, 34, 0.16)', fg: '#9f301b', order: 5 },
}

/** 支援班（T3／D7／3晚／7早…）沒寫班別時的暫代代碼。 */
export const SUPPORT_SHIFT_CODE = 'SUPPORT'

export const SHIFT_ORDER = ['MORNING', 'MID', 'NOON', 'EVENING', SUPPORT_SHIFT_CODE]

/** 匯出檔的支援記號：T3＝去 D13、D7＝去 D7；3早／7晚等於指定班別的支援。 */
export function supportLabel(atStoreCode, shiftCode) {
  // 班表有時只寫一個「支」，沒註明去哪家店 —— 那不是資料漏了，是紙本就沒寫
  const store = atStoreCode ? getStoreName(atStoreCode) : '（未註明去哪家店）'
  const shift = shiftCode && shiftCode !== SUPPORT_SHIFT_CODE ? SHIFT_META[shiftCode]?.label : ''
  return shift ? `支援 ${store} ${shift}` : `支援 ${store}`
}

/** 早班與中班各自一台交通車，分開統計。 */
export const CAR_SHIFTS = ['MORNING', 'MID']

export const CAR_LABELS = {
  MORNING: '早班車',
  MID: '中班車',
}

/** 發車時間。比到店時間早半小時：早班 04:30 到店、中班 05:30 到店。 */
export const CAR_DEPARTURE = {
  MORNING: '04:00',
  MID: '05:00',
}

export function carLabelWithTime(shiftCode) {
  const label = CAR_LABELS[shiftCode] || shiftCode
  const time = CAR_DEPARTURE[shiftCode]
  return time ? `${label} ${time}` : label
}

/**
 * 上車地點。**這些字串是 Firebase 裡存的值**，要改名一定要同時在 PICKUP_LEGACY_ALIASES 補一筆，
 * 否則已設定過的同事會全部變成「未設定」，那天就少人上車。
 * 要改給司機看的寫法請改 PICKUP_STOP_META.driverName。順序＝早班車的行車順序。
 */
export const PICKUP_LOCATIONS = ['A21環北站', 'A20興南站', '高萱門市', '高鐵站']

/**
 * 舊的站名寫法。`環西站` 是記錯的，正確是機捷 A21 環北站；興南站補上 A20 編號。
 * Firebase 裡已經存了舊字串，讀取時一律先過這張表，不然那些同事會變成「未設定」。
 */
export const PICKUP_LEGACY_ALIASES = {
  環西站: 'A21環北站',
  環北站: 'A21環北站',
  興南站: 'A20興南站',
}

/** 把（可能是舊寫法的）上車地點正規化成現行站名。 */
export function canonicalPickup(location) {
  const value = String(location ?? '').trim()
  if (!value) return ''
  return PICKUP_LEGACY_ALIASES[value] || value
}

/**
 * 每站的司機版寫法與上車時間。
 *
 * 司機那張表是照「幾點到哪一站」排的，不是一個發車時間配一串站名 —— 早班車 03:45 到環北、
 * 03:55 到高萱、04:00 到高鐵，中班車則是 04:45 與 05:00。時間為 null 代表那台車不停這站
 * （或還沒問到時間），匯出時會照實標明而不是自己編一個。
 */
export const PICKUP_STOP_META = {
  A21環北站: { driverName: 'A21環北站', times: { MORNING: '03:45', MID: '04:45' } },
  A20興南站: { driverName: 'A20興南站', times: { MORNING: '03:50', MID: '04:50' } },
  高萱門市: { driverName: '7-11高萱門市', times: { MORNING: '03:55', MID: '04:55' } },
  高鐵站: { driverName: '桃園高鐵站', times: { MORNING: '04:00', MID: '05:00' } },
}

/** 司機版的站名；沒登記過的站就照原字串。 */
export function driverStopName(location) {
  return PICKUP_STOP_META[location]?.driverName || location
}

/** 這台車幾點到這一站；沒有就回 null。 */
export function stopTime(location, shiftCode) {
  return PICKUP_STOP_META[location]?.times?.[shiftCode] ?? null
}

/** 司機表的車次寫法：第1班車＝早班車、第2班車＝中班車。 */
export const CAR_ORDINAL_LABELS = {
  MORNING: '第1班車',
  MID: '第2班車',
}

export const NO_PICKUP = '不搭車'

export const PICKUP_OPTIONS = [...PICKUP_LOCATIONS, NO_PICKUP]

export const UNSET_PICKUP = '未設定'

/**
 * 已知假別的標籤與記號後備；實際清單同樣以匯入檔的 leave_types 為準。
 * SCHEDULING（排）是店長的排班日，不上班，也算休假。
 */
export const LEAVE_META = {
  ANNUAL: { code: 'ANNUAL', label: '特休假', marker: '◎', order: 1 },
  OFF_DESIGNATED: { code: 'OFF_DESIGNATED', label: '指定休假', marker: 'off', order: 2 },
  OFF: { code: 'OFF', label: '休假', marker: '✕', order: 3 },
  SICK: { code: 'SICK', label: '病假', marker: '病', order: 4 },
  PERSONAL: { code: 'PERSONAL', label: '事假', marker: '事', order: 5 },
  BEREAVEMENT: { code: 'BEREAVEMENT', label: '喪假', marker: '喪', order: 6 },
  OFFICIAL: { code: 'OFFICIAL', label: '公假', marker: '公', order: 7 },
  SCHEDULING: { code: 'SCHEDULING', label: '排班日', marker: '排', order: 8 },
}

export const LEAVE_ORDER = Object.values(LEAVE_META)
  .sort((a, b) => a.order - b.order)
  .map((l) => l.code)

/** 崗位名稱各店可能不同，匯入檔帶什麼就用什麼；這裡只做缺值後備。色票見 shiftVocab。 */
export const POSITION_FALLBACK_LABELS = {
  NONE: '未指定',
  MAIN_BAR: '主吧',
  SUB_BAR: '副吧',
  POUR_OVER: '手沖',
  LIGHT_MEAL: '輕食',
  VEG_STATION: '菜口',
  POS: 'POS',
}

/** 舊代碼對到現行代碼。菜口在轉換器裡是 VEG_STATION，早期我們寫成 COUNTER。 */
export const POSITION_CODE_ALIASES = {
  COUNTER: 'VEG_STATION',
}

export function canonicalPositionCode(code) {
  if (!code) return code
  return POSITION_CODE_ALIASES[code] || code
}

/**
 * 匯入檔裡不是真人的列（例如 D13 的「支援」列）。
 * 同一天有兩個人來支援時，班表會多開一列（支援2、支援三…），所以用樣式比對而不是固定清單。
 */
export const PLACEHOLDER_PERSON_NAMES = ['支援', '支援班', '備註']

export const PLACEHOLDER_PERSON_PATTERN =
  /^(支援班|支援|備註)\s*[（(]?\s*[0-9０-９一二三四五六七八九十]*\s*[)）]?$/

export const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

export const EXPORT_RANGES = [
  { key: 'week', label: '一週', days: 7 },
  { key: 'twoWeeks', label: '二週', days: 14 },
  { key: 'month', label: '整月', days: null },
]

/** Firestore 集合名稱 */
export const SHIFT_MONTHS_COLLECTION = 'shiftMonths'
export const SHIFT_PEOPLE_COLLECTION = 'shiftPeople'
export const SHIFT_SUPPORT_COLLECTION = 'shiftSupportLinks'
