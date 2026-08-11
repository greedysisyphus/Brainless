import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import {
  getCatalogVersionToken,
  getRevision,
  getUpdatedAt,
  mergeCatalogThreeWay,
  stripCountEntryMeta,
  stripCatalogMeta,
} from './goodsOrderSync.js'

export const GOODS_ORDER_ACTOR_ID_KEY = 'goodsOrderCollaboratorId'
export const GOODS_ORDER_ACTOR_NAME_KEY = 'goodsOrderCollaboratorName'
export const GOODS_ORDER_SYNC_VERSION = 2

export function getOrCreateGoodsOrderActorId(storage = window.localStorage) {
  let existing = ''
  try {
    existing = String(storage?.getItem(GOODS_ORDER_ACTOR_ID_KEY) || '').trim()
  } catch {
    // Safari 私密模式或被封鎖的儲存空間仍可用暫時裝置 ID 操作。
  }
  if (existing) return existing
  const generated =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  try {
    storage?.setItem(GOODS_ORDER_ACTOR_ID_KEY, generated)
  } catch {
    // 無法持久化時維持本次工作階段 ID；不阻擋盤點。
  }
  return generated
}

export function getDefaultActorName(actorId) {
  return `裝置 ${String(actorId || '').replace(/-/g, '').slice(-4).toUpperCase() || '未知'}`
}

export function normalizeActor(actor) {
  return {
    id: String(actor?.id || '').trim(),
    name: String(actor?.name || '').trim() || '未命名裝置',
  }
}

export class CatalogConflictError extends Error {
  constructor({ remoteData, mergedCatalog, conflicts }) {
    super('CATALOG_CONFLICT')
    this.name = 'CatalogConflictError'
    this.remoteData = remoteData
    this.mergedCatalog = mergedCatalog
    this.conflicts = conflicts
  }
}

export class CountsConflictError extends Error {
  constructor({ remoteData, conflicts }) {
    super('COUNTS_CONFLICT')
    this.name = 'CountsConflictError'
    this.remoteData = remoteData
    this.conflicts = conflicts
  }
}

function valuesEqual(a, b) {
  const stable = (value) => {
    if (Array.isArray(value)) return value.map(stable)
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .filter((key) => value[key] !== undefined)
          .map((key) => [key, stable(value[key])])
      )
    }
    return value ?? null
  }
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b))
}

export function prepareCountsRevision({
  remoteData = { counts: {} },
  nextCounts,
  pending,
  actor,
  force = false,
  now = Date.now(),
}) {
  const cleanActor = normalizeActor(actor)
  const remoteRevision = getRevision(remoteData)
  const remoteCounts = remoteData.counts && typeof remoteData.counts === 'object'
    ? remoteData.counts
    : {}
  const itemIds = Object.keys(pending?.items || {})
  const conflicts = []

  if (!force && pending?.replaceAll) {
    const revisionChanged = remoteRevision !== Number(pending.baseRevision || 0)
    const baseUpdatedAt = Number(pending.baseUpdatedAt || 0)
    const timestampChanged = baseUpdatedAt > 0 && getUpdatedAt(remoteData) !== baseUpdatedAt
    if (revisionChanged || timestampChanged) conflicts.push('counts.all')
  }
  if (!force && !pending?.replaceAll) {
    itemIds.forEach((itemId) => {
      const baseEntry = stripCountEntryMeta(pending.items[itemId]?.baseEntry)
      const remoteEntry = stripCountEntryMeta(remoteCounts[itemId])
      if (!valuesEqual(baseEntry, remoteEntry)) conflicts.push(`counts.${itemId}`)
    })
  }
  if (conflicts.length > 0) throw new CountsConflictError({ remoteData, conflicts })

  const counts = pending?.replaceAll ? { ...(nextCounts.counts || {}) } : { ...remoteCounts }
  if (!pending?.replaceAll) {
    itemIds.forEach((itemId) => {
      if (Object.prototype.hasOwnProperty.call(nextCounts.counts || {}, itemId)) {
        counts[itemId] = {
          ...(nextCounts.counts[itemId] || {}),
          _clientUpdatedAt: pending.items[itemId]?.editAt || now,
          _updatedBy: cleanActor,
        }
      } else {
        delete counts[itemId]
      }
    })
  }

  return {
    counts,
    _revision: remoteRevision + 1,
    _syncVersion: GOODS_ORDER_SYNC_VERSION,
    _clientUpdatedAt: now,
    _updatedBy: cleanActor,
  }
}

/**
 * 盤點以交易保存：不同品項會合併到交易當下的最新雲端內容；同一品項或全量清除
 * 若基準版本已改變則停止，避免 last-write-wins 靜默覆蓋。
 */
export async function saveCountsRevision({
  db,
  countsDocId,
  nextCounts,
  pending,
  actor,
  force = false,
}) {
  const countsRef = doc(db, 'settings', countsDocId)
  const cleanActor = normalizeActor(actor)

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(countsRef)
    const remoteData = snapshot.exists() ? snapshot.data() : { counts: {} }
    const now = Date.now()
    const prepared = prepareCountsRevision({
      remoteData,
      nextCounts,
      pending,
      actor: cleanActor,
      force,
      now,
    })
    const payload = {
      ...prepared,
      _updatedAt: serverTimestamp(),
    }
    transaction.set(countsRef, payload)
    return { ...payload, _updatedAt: undefined }
  })
}

function historyDocId(revision) {
  return `v_${String(Math.max(0, revision)).padStart(8, '0')}`
}

/**
 * 以交易方式儲存品項設定：
 * - 雲端未變更：直接建立下一版。
 * - 只有非衝突修改：三方合併後建立下一版。
 * - 同欄位衝突：停止寫入，交由介面決定。
 * 每次寫入前都把現行雲端版本存入 versions 子集合，舊資料無需搬移。
 */
export async function saveCatalogRevision({
  db,
  catalogDocId,
  baseCatalog,
  nextCatalog,
  actor,
  force = false,
}) {
  const catalogRef = doc(db, 'settings', catalogDocId)
  const cleanActor = normalizeActor(actor)

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(catalogRef)
    const remoteData = snapshot.exists() ? snapshot.data() : null
    const remoteRevision = getRevision(remoteData)
    let catalogToSave = stripCatalogMeta(nextCatalog)

    if (
      remoteData &&
      !force &&
      getCatalogVersionToken(remoteData) !== getCatalogVersionToken(baseCatalog)
    ) {
      const merge = mergeCatalogThreeWay(baseCatalog, nextCatalog, remoteData)
      if (merge.conflicts.length > 0) {
        throw new CatalogConflictError({
          remoteData,
          mergedCatalog: merge.catalog,
          conflicts: merge.conflicts,
        })
      }
      catalogToSave = merge.catalog
    }

    if (remoteData) {
      const versionRef = doc(
        collection(db, 'settings', catalogDocId, 'versions'),
        historyDocId(remoteRevision)
      )
      transaction.set(versionRef, {
        ...remoteData,
        _revision: remoteRevision,
        _archivedAt: serverTimestamp(),
        _archivedBy: cleanActor,
      })
    }

    const now = Date.now()
    const payload = {
      ...catalogToSave,
      _revision: remoteRevision + 1,
      _syncVersion: GOODS_ORDER_SYNC_VERSION,
      _clientUpdatedAt: now,
      _updatedAt: serverTimestamp(),
      _updatedBy: cleanActor,
    }
    transaction.set(catalogRef, payload)

    return {
      ...catalogToSave,
      _revision: payload._revision,
      _syncVersion: GOODS_ORDER_SYNC_VERSION,
      _clientUpdatedAt: now,
      _updatedBy: cleanActor,
    }
  })
}

export async function loadCatalogVersions(db, catalogDocId, maxResults = 20) {
  const versionsQuery = query(
    collection(db, 'settings', catalogDocId, 'versions'),
    orderBy('_revision', 'desc'),
    limit(maxResults)
  )
  const snapshot = await getDocs(versionsQuery)
  return snapshot.docs.map((versionDoc) => ({ id: versionDoc.id, ...versionDoc.data() }))
}
