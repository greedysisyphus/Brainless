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

export function stripCountEntryMeta(entry) {
  if (!entry || typeof entry !== 'object') return {}
  const { _clientUpdatedAt, _updatedBy, ...rest } = entry
  return rest
}

export function normalizeCountsPending(value, fallbackRevision = 0) {
  const raw = value && typeof value === 'object' ? value : {}
  const items = {}
  Object.entries(raw.items && typeof raw.items === 'object' ? raw.items : {}).forEach(
    ([itemId, pending]) => {
      const record = pending && typeof pending === 'object'
        ? pending
        : { editAt: Number(pending) || 0 }
      items[itemId] = {
        editAt: Number(record.editAt) || 0,
        baseEntry: stripCountEntryMeta(record.baseEntry),
      }
    }
  )
  return {
    replaceAll: !!raw.replaceAll,
    editAt: Number(raw.editAt) || 0,
    baseRevision: Number.isFinite(Number(raw.baseRevision))
      ? Number(raw.baseRevision)
      : fallbackRevision,
    baseUpdatedAt: Number(raw.baseUpdatedAt) || 0,
    items,
  }
}

export function hasCountsPending(pending) {
  return !!pending?.replaceAll || Object.keys(pending?.items || {}).length > 0
}

export function stripCatalogMeta(data) {
  if (!data || typeof data !== 'object') {
    return { catalogVersion: 0, items: [], orderStoreName: '' }
  }
  const {
    _clientUpdatedAt,
    _lastUpdatedAt,
    _updatedAt,
    _updatedBy,
    _revision,
    _syncVersion,
    ...rest
  } = data
  return {
    catalogVersion: Number(rest.catalogVersion) || 0,
    items: Array.isArray(rest.items) ? rest.items : [],
    orderStoreName: typeof rest.orderStoreName === 'string' ? rest.orderStoreName : '',
  }
}

export function getUpdatedAt(data) {
  if (!data) return 0
  const t = data._updatedAt ?? data._clientUpdatedAt ?? data._lastUpdatedAt
  if (typeof t === 'number') return t
  if (t && typeof t.toMillis === 'function') return t.toMillis()
  if (typeof t === 'string') {
    const parsed = Date.parse(t)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export function getRevision(data) {
  const revision = Number(data?._revision)
  return Number.isFinite(revision) && revision >= 0 ? revision : 0
}

export function getUpdatedBy(data) {
  const actor = data?._updatedBy
  if (!actor || typeof actor !== 'object') return null
  const id = String(actor.id || '').trim()
  const name = String(actor.name || '').trim()
  if (!id && !name) return null
  return { id, name: name || '未命名裝置' }
}

export function getCatalogVersionToken(data) {
  return `${getRevision(data)}:${getUpdatedAt(data)}`
}

/**
 * 即時收到雲端盤點時，只保留本機尚未送出的品項；其他品項立即採用雲端。
 * 這讓兩個人分開盤不同品項時不會互相蓋掉。
 */
export function mergeCountsWithPending(local, remote, pendingItemIds = []) {
  const localClean = stripSyncMeta(local)
  const remoteClean = stripSyncMeta(remote)
  const pending = new Set(pendingItemIds)
  const counts = { ...(remoteClean.counts || {}) }
  pending.forEach((itemId) => {
    if (Object.prototype.hasOwnProperty.call(localClean.counts || {}, itemId)) {
      counts[itemId] = localClean.counts[itemId]
    } else {
      delete counts[itemId]
    }
  })
  return { counts }
}

const CATALOG_ITEM_FIELDS = [
  'name',
  'unit',
  'note',
  'minStock',
  'defaultOrderQty',
  'allowFraction',
  'disabled',
]

function valuesEqual(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

function chooseThreeWay(base, local, remote, path, conflicts) {
  if (valuesEqual(local, base)) return remote
  if (valuesEqual(remote, base)) return local
  if (valuesEqual(local, remote)) return local
  conflicts.push(path)
  return local
}

function mapItems(items) {
  return new Map((Array.isArray(items) ? items : []).map((item) => [item.id, item]))
}

function mergeItemOrder(baseOrder, localOrder, remoteOrder, conflicts) {
  if (valuesEqual(localOrder, remoteOrder)) return [...localOrder]
  if (valuesEqual(localOrder, baseOrder)) return [...remoteOrder]
  if (valuesEqual(remoteOrder, baseOrder)) return [...localOrder]

  const baseIds = new Set(baseOrder)
  const localExisting = localOrder.filter((id) => baseIds.has(id))
  const remoteExisting = remoteOrder.filter((id) => baseIds.has(id))
  const baseStillPresent = baseOrder.filter(
    (id) => localExisting.includes(id) && remoteExisting.includes(id)
  )
  const localExistingCommon = localExisting.filter((id) => baseStillPresent.includes(id))
  const remoteExistingCommon = remoteExisting.filter((id) => baseStillPresent.includes(id))

  // 兩邊若只各自新增品項，保留共同舊順序並依序接上兩邊新增項目，不視為衝突。
  if (
    valuesEqual(localExistingCommon, baseStillPresent) &&
    valuesEqual(remoteExistingCommon, baseStillPresent)
  ) {
    const merged = [...baseStillPresent]
    ;[...localOrder, ...remoteOrder].forEach((id) => {
      if (!merged.includes(id)) merged.push(id)
    })
    return merged
  }

  conflicts.push('items.order')
  const merged = [...localOrder]
  remoteOrder.forEach((id) => {
    if (!merged.includes(id)) merged.push(id)
  })
  return merged
}

/**
 * 品項設定三方合併：不同品項／不同欄位會自動合併；同一欄位同時修改才列為衝突。
 * 衝突欄位暫以本機草稿呈現，必須由使用者確認後才會寫回。
 */
export function mergeCatalogThreeWay(baseData, localData, remoteData) {
  const base = stripCatalogMeta(baseData)
  const local = stripCatalogMeta(localData)
  const remote = stripCatalogMeta(remoteData)
  const conflicts = []
  const baseItems = mapItems(base.items)
  const localItems = mapItems(local.items)
  const remoteItems = mapItems(remote.items)
  const allIds = new Set([...baseItems.keys(), ...localItems.keys(), ...remoteItems.keys()])
  const mergedById = new Map()

  allIds.forEach((id) => {
    const b = baseItems.get(id)
    const l = localItems.get(id)
    const r = remoteItems.get(id)

    if (!b) {
      if (l && r && !valuesEqual(l, r)) conflicts.push(`items.${id}`)
      if (l || r) mergedById.set(id, l || r)
      return
    }

    if (!l || !r) {
      const survivor = l || r
      if (!survivor) return
      if (valuesEqual(survivor, b)) return
      conflicts.push(`items.${id}.deleted`)
      if (l) mergedById.set(id, l)
      return
    }

    const mergedItem = { id }
    CATALOG_ITEM_FIELDS.forEach((field) => {
      mergedItem[field] = chooseThreeWay(
        b[field],
        l[field],
        r[field],
        `items.${id}.${field}`,
        conflicts
      )
    })
    mergedById.set(id, mergedItem)
  })

  const baseOrder = (base.items || []).map((item) => item.id)
  const localOrder = (local.items || []).map((item) => item.id)
  const remoteOrder = (remote.items || []).map((item) => item.id)
  const mergedOrder = mergeItemOrder(baseOrder, localOrder, remoteOrder, conflicts)

  return {
    catalog: {
      catalogVersion: Math.max(
        Number(base.catalogVersion) || 0,
        Number(local.catalogVersion) || 0,
        Number(remote.catalogVersion) || 0
      ),
      orderStoreName: chooseThreeWay(
        base.orderStoreName,
        local.orderStoreName,
        remote.orderStoreName,
        'orderStoreName',
        conflicts
      ),
      items: mergedOrder.map((id) => mergedById.get(id)).filter(Boolean),
    },
    conflicts: [...new Set(conflicts)],
  }
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
