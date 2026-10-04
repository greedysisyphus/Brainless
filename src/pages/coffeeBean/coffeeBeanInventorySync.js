/** 咖啡豆盤點：雲端同步 meta 與合併邏輯 */

export const INVENTORY_SYNC_DEBOUNCE_MS = 1200
/** 開頁或切店後等雲端資料多久；超過就先開放填寫（之後資料到了會跳衝突視窗） */
export const INVENTORY_REMOTE_WAIT_MS = 8000

/* 「這家店有還沒上傳的修改」記在裝置上。只放記憶體的話，離線盤完把頁面關掉，
   下次開頁會把雲端資料直接套上來，離線盤的那份就默默不見了。 */
const dirtyKey = (storeId) => `coffeeBeanInventoryDirty_${storeId}`

/** 上次離開時還沒上傳的修改時間；沒有就回 0 */
export function readPendingEditAt(storeId) {
  try {
    const at = Number(localStorage.getItem(dirtyKey(storeId)))
    return Number.isFinite(at) && at > 0 ? at : 0
  } catch {
    return 0
  }
}

/** at 給時間＝記下有未上傳的修改；給 0＝已經上傳或已放棄，清掉 */
export function writePendingEditAt(storeId, at) {
  try {
    if (at) localStorage.setItem(dirtyKey(storeId), String(at))
    else localStorage.removeItem(dirtyKey(storeId))
  } catch {
    // 存不了就退回只記在記憶體
  }
}

export function createInventorySyncMeta(storeId) {
  const pendingAt = storeId ? readPendingEditAt(storeId) : 0
  return {
    isDirty: pendingAt > 0,
    lastLocalEditAt: pendingAt,
    lastSyncedToCloudAt: 0,
    lastAppliedRemoteAt: 0,
    hasReceivedInitialRemote: false,
  }
}

/**
 * 點第 3 列的「袋」而前兩列從沒點過時，陣列前面會是空洞（undefined）。
 * 以前只存本機沒差；Firestore 看到 undefined 會拒絕整份文件 →「無法同步到雲端」。
 * 空洞一律補成預設的「數」。
 */
function cleanModes(modes) {
  const out = {}
  Object.entries(modes).forEach(([key, arr]) => {
    if (!Array.isArray(arr)) return
    out[key] = Array.from(arr, (m) => (m === 'weightBag' || m === 'weightBox' ? m : 'quantity'))
  })
  return out
}

export function stripInventorySyncMeta(data) {
  if (!data || typeof data !== 'object') {
    return { brewing: { pourOver: {}, espresso: {} }, retail: {} }
  }
  const { _clientUpdatedAt, _lastUpdatedAt, ...rest } = data
  return {
    brewing: rest.brewing || { pourOver: {}, espresso: {} },
    retail: rest.retail || {},
    // 每列是「數／袋／盒」：跟數字放同一份文件才會一起同步。
    // 舊文件沒有這欄時保持 undefined（不補 {}），頁面靠這點判斷要不要搬舊的本機設定。
    ...(rest.modes && typeof rest.modes === 'object' ? { modes: cleanModes(rest.modes) } : {}),
  }
}

export function getInventoryUpdatedAt(data) {
  if (!data) return 0
  const t = data._clientUpdatedAt ?? data._lastUpdatedAt
  if (typeof t === 'number') return t
  if (t && typeof t.toMillis === 'function') return t.toMillis()
  if (typeof t === 'string') {
    const parsed = Date.parse(t)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function isFilledQuantity(value) {
  return value !== '' && value != null && String(value).trim() !== ''
}

function mergeQuantityArrays(remoteArr = [''], localArr = ['']) {
  const maxLen = Math.max(remoteArr.length, localArr.length)
  const result = []
  for (let i = 0; i < maxLen; i++) {
    const localCell = localArr[i]
    const remoteCell = remoteArr[i]
    result.push(isFilledQuantity(localCell) ? localCell : (remoteCell ?? ''))
  }
  return result
}

function mergeInventoryObjects(remoteObj = {}, localObj = {}) {
  const keys = new Set([...Object.keys(remoteObj), ...Object.keys(localObj)])
  const out = {}
  for (const key of keys) {
    const remoteVal = remoteObj[key]
    const localVal = localObj[key]
    if (Array.isArray(remoteVal) || Array.isArray(localVal)) {
      out[key] = mergeQuantityArrays(remoteVal, localVal)
    } else if (remoteVal && typeof remoteVal === 'object' && !Array.isArray(remoteVal)) {
      out[key] = mergeInventoryObjects(remoteVal, localVal && typeof localVal === 'object' ? localVal : {})
    } else if (localVal !== undefined) {
      out[key] = localVal
    } else {
      out[key] = remoteVal
    }
  }
  return out
}

/** 以雲端為底，本機已填數字覆蓋同格（合併） */
export function mergeInventoryData(local, remote) {
  const remoteClean = stripInventorySyncMeta(remote)
  const localClean = stripInventorySyncMeta(local)
  return {
    brewing: {
      pourOver: mergeInventoryObjects(remoteClean.brewing?.pourOver, localClean.brewing?.pourOver),
      espresso: mergeInventoryObjects(remoteClean.brewing?.espresso, localClean.brewing?.espresso),
    },
    retail: mergeInventoryObjects(remoteClean.retail, localClean.retail),
    ...(remoteClean.modes || localClean.modes
      ? { modes: mergeInventoryObjects(remoteClean.modes, localClean.modes) }
      : {}),
  }
}

/**
 * 是否應套用遠端盤點 snapshot
 * @returns {'apply' | 'ignore' | 'conflict'}
 */
export function resolveInventorySnapshot({
  meta,
  remoteUpdatedAt,
  fromCache,
  hasPendingWrites,
}) {
  // 首次遠端資料到的時候使用者已經開始填（慢網常見）：畫面上是這台裝置上次留下的舊資料加上剛填的幾格，
  // 兩邊誰新誰舊程式分不出來。不蓋本機、也不讓本機蓋雲端，一律交給使用者選。
  // （以前這裡回 ignore，接著整份舊資料被上傳，雲端的盤點就被蓋掉。）
  if (!meta.hasReceivedInitialRemote) {
    return meta.isDirty ? 'conflict' : 'apply'
  }

  if (fromCache && meta.isDirty) {
    return 'ignore'
  }

  if (hasPendingWrites && meta.isDirty) {
    return 'ignore'
  }

  if (meta.isDirty) {
    if (remoteUpdatedAt > meta.lastLocalEditAt) {
      return 'conflict'
    }
    // 自己上傳的回音、或比本機編輯更舊的雲端 → 不蓋畫面
    if (remoteUpdatedAt <= meta.lastSyncedToCloudAt && meta.lastSyncedToCloudAt > 0) {
      return 'ignore'
    }
    if (remoteUpdatedAt <= meta.lastLocalEditAt) {
      return 'ignore'
    }
  }

  return 'apply'
}

/* ── 寫入紀錄：盤點文件裡留最近幾筆「誰、什麼時候、做了什麼」，資料不見時查得到來源 ── */

export const WRITE_LOG_LIMIT = 30
const DEVICE_ID_KEY = 'brainless_device_id'

/** 這台裝置的代號（隨機、存在本機）加上看得懂的機型 */
export function getDeviceStamp() {
  let id = ''
  try {
    id = localStorage.getItem(DEVICE_ID_KEY) || ''
    if (!id) {
      id = Math.random().toString(36).slice(2, 8)
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
  } catch {
    id = 'nostore'
  }
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const kind = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Macintosh/.test(ua)
          ? 'Mac'
          : /Windows/.test(ua)
            ? 'Windows'
            : '其他'
  return `${kind}-${id}`
}

/** 有填數字的格數。紀錄裡看這個數字突然掉下去，就知道是哪一次寫入把資料弄不見的 */
export function countFilledCells(inventory) {
  const walk = (node) => {
    if (Array.isArray(node)) return node.filter(isFilledQuantity).length
    if (node && typeof node === 'object') return Object.values(node).reduce((sum, child) => sum + walk(child), 0)
    return 0
  }
  return walk(inventory?.brewing) + walk(inventory?.retail)
}

/**
 * 在紀錄尾端加一筆。同一台裝置連續的「編輯」併成一筆（更新時間、次數、格數），
 * 不然盤一次點就把三十筆用完了。
 */
export function appendWriteLog(log, entry) {
  const list = Array.isArray(log) ? log.filter((item) => item && typeof item === 'object') : []
  const last = list[list.length - 1]
  if (last && entry.action === 'edit' && last.action === 'edit' && last.device === entry.device && last.page === entry.page) {
    const auto = (last.auto || 0) + (entry.auto || 0)
    return [...list.slice(0, -1), { ...last, at: entry.at, cells: entry.cells, times: (last.times || 1) + 1, ...(auto ? { auto } : {}) }]
  }
  return [...list, entry].slice(-WRITE_LOG_LIMIT)
}
