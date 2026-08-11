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
  mergeCatalogThreeWay,
  stripCatalogMeta,
} from './goodsOrderSync'

export const GOODS_ORDER_ACTOR_ID_KEY = 'goodsOrderCollaboratorId'
export const GOODS_ORDER_ACTOR_NAME_KEY = 'goodsOrderCollaboratorName'
export const GOODS_ORDER_SYNC_VERSION = 2

export function getOrCreateGoodsOrderActorId(storage = window.localStorage) {
  const existing = String(storage.getItem(GOODS_ORDER_ACTOR_ID_KEY) || '').trim()
  if (existing) return existing
  const generated =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  storage.setItem(GOODS_ORDER_ACTOR_ID_KEY, generated)
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

