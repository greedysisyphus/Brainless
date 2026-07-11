/** 咖啡豆盤點：雲端同步 meta 與合併邏輯 */

export const INVENTORY_SYNC_DEBOUNCE_MS = 1200

export function createInventorySyncMeta() {
  return {
    isDirty: false,
    lastLocalEditAt: 0,
    lastSyncedToCloudAt: 0,
    lastAppliedRemoteAt: 0,
    hasReceivedInitialRemote: false,
  }
}

export function stripInventorySyncMeta(data) {
  if (!data || typeof data !== 'object') {
    return { brewing: { pourOver: {}, espresso: {} }, retail: {} }
  }
  const { _clientUpdatedAt, _lastUpdatedAt, ...rest } = data
  return {
    brewing: rest.brewing || { pourOver: {}, espresso: {} },
    retail: rest.retail || {},
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
  // 首次遠端資料：若使用者已開始填寫（慢網常見），不可整份蓋回本機
  if (!meta.hasReceivedInitialRemote) {
    if (meta.isDirty) {
      if (remoteUpdatedAt > meta.lastLocalEditAt) {
        return 'conflict'
      }
      return 'ignore'
    }
    return 'apply'
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
