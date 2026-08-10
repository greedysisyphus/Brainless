/** 貨物叫貨：現有貨量本機優先同步 */

export const COUNTS_SYNC_DEBOUNCE_MS = 1200

export function createCountsSyncMeta() {
  return {
    isDirty: false,
    lastLocalEditAt: 0,
    lastSyncedToCloudAt: 0,
    lastAppliedRemoteAt: 0,
    hasReceivedInitialRemote: false,
  }
}

export function stripSyncMeta(data) {
  if (!data || typeof data !== 'object') return { counts: {} }
  const { _clientUpdatedAt, _lastUpdatedAt, ...rest } = data
  return {
    counts: rest.counts && typeof rest.counts === 'object' ? rest.counts : {},
  }
}

export function stripCatalogMeta(data) {
  if (!data || typeof data !== 'object') {
    return { catalogVersion: 0, items: [], orderStoreName: '' }
  }
  const { _clientUpdatedAt, _lastUpdatedAt, ...rest } = data
  return {
    catalogVersion: Number(rest.catalogVersion) || 0,
    items: Array.isArray(rest.items) ? rest.items : [],
    orderStoreName: typeof rest.orderStoreName === 'string' ? rest.orderStoreName : '',
  }
}

export function getUpdatedAt(data) {
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

function isFilled(value) {
  return value !== '' && value != null && String(value).trim() !== ''
}

/** 以雲端為底，本機已填欄位覆蓋 */
export function mergeCountsData(local, remote) {
  const remoteClean = stripSyncMeta(remote)
  const localClean = stripSyncMeta(local)
  const keys = new Set([
    ...Object.keys(remoteClean.counts || {}),
    ...Object.keys(localClean.counts || {}),
  ])
  const counts = {}
  for (const key of keys) {
    const r = remoteClean.counts[key] || {}
    const l = localClean.counts[key] || {}
    counts[key] = {
      current: isFilled(l.current) ? l.current : (r.current ?? ''),
      orderQty:
        l.orderQty !== '' && l.orderQty != null
          ? l.orderQty
          : r.orderQty !== '' && r.orderQty != null
            ? r.orderQty
            : null,
      forceInclude:
        l.forceInclude === true || l.forceInclude === false
          ? l.forceInclude
          : r.forceInclude === true || r.forceInclude === false
            ? r.forceInclude
            : null,
    }
  }
  return { counts }
}

/**
 * 本機優先：編輯中不靜默套用遠端
 * @returns {'apply' | 'ignore' | 'conflict'}
 */
export function resolveCountsSnapshot({
  meta,
  remoteUpdatedAt,
  fromCache,
  hasPendingWrites,
}) {
  if (!meta.hasReceivedInitialRemote) {
    if (meta.isDirty) {
      if (remoteUpdatedAt > meta.lastLocalEditAt) return 'conflict'
      return 'ignore'
    }
    return 'apply'
  }

  if (fromCache && meta.isDirty) return 'ignore'
  if (hasPendingWrites && meta.isDirty) return 'ignore'

  if (meta.isDirty) {
    if (remoteUpdatedAt > meta.lastLocalEditAt) return 'conflict'
    if (remoteUpdatedAt <= meta.lastSyncedToCloudAt && meta.lastSyncedToCloudAt > 0) {
      return 'ignore'
    }
    if (remoteUpdatedAt <= meta.lastLocalEditAt) return 'ignore'
  }

  return 'apply'
}

export function formatVersionTime(ts) {
  if (!ts) return '尚無'
  try {
    return new Date(ts).toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return String(ts)
  }
}
