import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { db } from '../utils/firebase'
import { STATUS_LABELS, STORES, createDefaultCatalog, createEmptyCounts, formatQuantity, getCatalogDocId, getCatalogStorageKey, getCountsDocId, getCountsStorageKey, getDefaultOrderStoreName, getCurrentQuantityError, getEffectiveOrderQty, getItemStatus, getOrderQuantityError, getSnapshotDocId, getStoreName, normalizeCurrentInput, parseQuantity, quantityInputToStored, shouldUpgradeDefaultCatalog, validateCatalog } from './goodsOrder/goodsOrderConstants'
import { CatalogConflictError, CountsConflictError, GOODS_ORDER_ACTOR_NAME_KEY, getDefaultActorName, getOrCreateGoodsOrderActorId, loadCatalogVersions, saveCatalogRevision, saveCountsRevision } from './goodsOrder/goodsOrderCollaboration'
import { COUNTS_SYNC_DEBOUNCE_MS, createCountsSyncMeta, getRevision, getUpdatedAt, getUpdatedBy, hasCountsPending, mergeCountsWithPending, normalizeCountsPending, resolveCountsSnapshot, stripCatalogMeta, stripCountEntryMeta, stripSyncMeta } from './goodsOrder/goodsOrderSync'
import { buildOrderLines, buildSnapshotItems } from './goodsOrder/goodsOrderText'


export const BC = [
  { label: 'Brainless', href: '#/sandwich' },
  { label: '貨物叫貨（測試）', href: '#/goods-order-test' },
]

export const countsPendingStorageKey = (storeId) => `goodsOrderCountsPending_v2_${storeId}`
export const catalogDraftStorageKey = (storeId) => `goodsOrderCatalogDraft_v2_${storeId}`

export function readLocalRecord(key) {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

export function writeLocalRecord(key, value) {
  try {
    if (value == null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error('[goodsOrder] local sync state', error)
  }
}

/** iPad 表：品名 | 現有 | 最低 | 叫貨 | 狀態 | 操作 — 表頭與列共用 */
export const TABLE_GRID =
  'grid-cols-[minmax(0,1fr)_6.25rem_4rem_6.25rem_6.5rem_5rem] gap-x-2'

export const tableInputClass =
  'box-border h-11 w-full rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-2 text-center text-base tabular-nums text-[var(--cw-text)] focus:border-[var(--cw-border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--cw-focus-ring)] disabled:opacity-40'

export function statusLabel(status) {
  return STATUS_LABELS[status] || STATUS_LABELS.invalid
}

export function statusBadgeTone(status) {
  if (status === 'order') return 'brand'
  if (status === 'uncounted') return 'neutral'
  if (status === 'later') return 'success'
  return 'danger'
}

export function hasEnteredCount(entry = {}) {
  return entry.current !== '' && entry.current !== null && entry.current !== undefined
}

/** 快速輸入：0、半箱／1，再加上最低庫存與差一格，重複的值只留一顆。 */
export function quickCountValues(item) {
  const min = Number(item.minStock) || 1
  const round = (value) => (item.allowFraction ? value : Math.round(value))
  const values = [0, item.allowFraction ? 0.5 : 1, round(min - 1), round(min)].filter(
    (value) => value >= 0
  )
  return [...new Set(values)].map(formatQuantity)
}

export function selectQuantityOnFocus(event) {
  // 手機點入已有數字時直接全選，可直接輸入新值；再次點擊仍可自行移動游標。
  event.currentTarget.select()
}

/**
 * 叫貨功能的全部邏輯：品項、點貨量、多人協作同步、叫貨文字。畫面（Club 版的 GoodsOrderManager、新版的 pages/bl/Order）只負責顯示，兩邊共用這一份。
 */
export function useGoodsOrderManager() {
  const [selectedStore, setSelectedStore] = useState('central')
  const [filter, setFilter] = useState('all')
  const [showSettings, setShowSettings] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showIncompleteConfirm, setShowIncompleteConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [previewWarning, setPreviewWarning] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [copyMessageVariant, setCopyMessageVariant] = useState('success')
  const [snapshotRetryPayload, setSnapshotRetryPayload] = useState(null)
  const [isCopying, setIsCopying] = useState(false)
  const [syncStatus, setSyncStatus] = useState('idle')
  const [catalogSaveStatus, setCatalogSaveStatus] = useState('idle')
  const [catalogCanUndo, setCatalogCanUndo] = useState(false)
  const [catalogConflict, setCatalogConflict] = useState(null)
  const [catalogVersions, setCatalogVersions] = useState([])
  const [catalogHistoryStatus, setCatalogHistoryStatus] = useState('idle')
  const [conflict, setConflict] = useState(null)
  const [localVersionAt, setLocalVersionAt] = useState(0)
  const [focusedItemId, setFocusedItemId] = useState(null)

  const actorIdRef = useRef(getOrCreateGoodsOrderActorId())
  const [actorName, setActorName] = useLocalStorage(
    GOODS_ORDER_ACTOR_NAME_KEY,
    getDefaultActorName(actorIdRef.current)
  )
  const syncActor = useMemo(
    () => ({
      id: actorIdRef.current,
      name: String(actorName || '').trim() || getDefaultActorName(actorIdRef.current),
    }),
    [actorName]
  )

  const [catalogCentral, setCatalogCentral] = useLocalStorage(
    getCatalogStorageKey('central'),
    createDefaultCatalog('central')
  )
  const [catalogD7, setCatalogD7] = useLocalStorage(
    getCatalogStorageKey('d7'),
    createDefaultCatalog('d7')
  )
  const [catalogD13, setCatalogD13] = useLocalStorage(
    getCatalogStorageKey('d13'),
    createDefaultCatalog('d13')
  )

  const [countsCentral, setCountsCentral] = useLocalStorage(
    getCountsStorageKey('central'),
    createEmptyCounts()
  )
  const [countsD7, setCountsD7] = useLocalStorage(getCountsStorageKey('d7'), createEmptyCounts())
  const [countsD13, setCountsD13] = useLocalStorage(
    getCountsStorageKey('d13'),
    createEmptyCounts()
  )

  const catalog = useMemo(() => {
    if (selectedStore === 'd7') return catalogD7
    if (selectedStore === 'd13') return catalogD13
    return catalogCentral
  }, [selectedStore, catalogCentral, catalogD7, catalogD13])

  const countsDoc = useMemo(() => {
    if (selectedStore === 'd7') return countsD7
    if (selectedStore === 'd13') return countsD13
    return countsCentral
  }, [selectedStore, countsCentral, countsD7, countsD13])

  const setCatalogForStore = useCallback(
    (storeId, next) => {
      const apply = (previous) => (typeof next === 'function' ? next(previous) : next)
      if (storeId === 'd7') setCatalogD7(apply)
      else if (storeId === 'd13') setCatalogD13(apply)
      else setCatalogCentral(apply)
    },
    [setCatalogCentral, setCatalogD7, setCatalogD13]
  )

  const setCountsForStore = useCallback(
    (storeId, next) => {
      const apply = (previous) => (typeof next === 'function' ? next(previous) : next)
      if (storeId === 'd7') setCountsD7(apply)
      else if (storeId === 'd13') setCountsD13(apply)
      else setCountsCentral(apply)
    },
    [setCountsCentral, setCountsD7, setCountsD13]
  )

  const countsMetaRef = useRef({})
  const countsLatestRef = useRef(countsDoc)
  const countsUnsubRef = useRef(null)
  const countsDebounceRef = useRef({})
  const prevStoreRef = useRef(selectedStore)
  const selectedStoreRef = useRef(selectedStore)
  const catalogDebounceRef = useRef({})
  const catalogLatestRef = useRef(catalog)
  const catalogBaseRef = useRef(
    Object.fromEntries(
      STORES.map(({ id }) => [id, readLocalRecord(catalogDraftStorageKey(id))?.baseCatalog || null])
    )
  )
  const catalogRemotePendingRef = useRef({})
  const catalogSaveLockRef = useRef({})
  const catalogConflictPausedRef = useRef({})
  const catalogUndoRef = useRef({})
  const catalogEditGroupRef = useRef({})
  const catalogEditVersionRef = useRef({})
  const catalogDirtyRef = useRef(
    Object.fromEntries(
      STORES.map(({ id }) => [id, !!readLocalRecord(catalogDraftStorageKey(id))?.dirty])
    )
  )
  const countsPendingRef = useRef(
    Object.fromEntries(
      STORES.map(({ id }) => [
        id,
        normalizeCountsPending(readLocalRecord(countsPendingStorageKey(id))),
      ])
    )
  )
  const countsConflictRef = useRef({})
  const countsFlushLockRef = useRef({})
  const countsResumeRef = useRef({})
  const catalogResumeRef = useRef({})
  const quantityInputRefs = useRef({})

  const getVisibleInputRef = (refs, itemId) => {
    const candidates = [refs.current[`mobile:${itemId}`], refs.current[`table:${itemId}`]]
    return (
      candidates.find((node) => node && node.getClientRects().length > 0) ||
      candidates.find(Boolean) ||
      null
    )
  }

  useEffect(() => {
    const previousTitle = document.title
    document.title = '貨物叫貨｜Brainless'
    return () => {
      document.title = previousTitle
    }
  }, [])

  useEffect(() => {
    countsLatestRef.current = countsDoc
  }, [countsDoc])

  useEffect(() => {
    catalogLatestRef.current = catalog
  }, [catalog])

  useEffect(() => {
    selectedStoreRef.current = selectedStore
    setCatalogConflict(null)
    setCatalogVersions([])
    setCatalogHistoryStatus('idle')
    setCatalogCanUndo(Boolean(catalogUndoRef.current[selectedStore]))
    setCatalogSaveStatus(
      validateCatalog(catalog).count > 0
        ? 'invalid'
        : catalogDirtyRef.current[selectedStore]
          ? 'error'
          : 'idle'
    )
    const savedCountsConflict = countsConflictRef.current[selectedStore] || null
    setConflict(savedCountsConflict)
    if (savedCountsConflict) setSyncStatus('conflict')
  }, [selectedStore])

  const getCountsMeta = (storeId) => {
    if (!countsMetaRef.current[storeId]) {
      countsMetaRef.current[storeId] = createCountsSyncMeta()
      const pending = getCountsPending(storeId)
      if (hasCountsPending(pending)) {
        countsMetaRef.current[storeId].isDirty = true
        countsMetaRef.current[storeId].lastLocalEditAt = Math.max(
          Number(pending.editAt) || 0,
          ...Object.values(pending.items).map((item) => Number(item.editAt) || 0)
        )
      }
    }
    return countsMetaRef.current[storeId]
  }

  const getCountsPending = (storeId) => {
    if (!countsPendingRef.current[storeId]) {
      countsPendingRef.current[storeId] = normalizeCountsPending(
        readLocalRecord(countsPendingStorageKey(storeId))
      )
    }
    return countsPendingRef.current[storeId]
  }

  const persistCountsPending = (storeId) => {
    const pending = getCountsPending(storeId)
    writeLocalRecord(
      countsPendingStorageKey(storeId),
      hasCountsPending(pending) ? pending : null
    )
  }

  const flushCountsSync = useCallback(
    async (storeId = selectedStore, override = null, { force = false } = {}) => {
      while (countsFlushLockRef.current[storeId]) {
        await countsFlushLockRef.current[storeId]
      }
      if (countsConflictRef.current[storeId] && !force) return null

      let releaseFlushLock
      const flushLock = new Promise((resolve) => {
        releaseFlushLock = resolve
      })
      countsFlushLockRef.current[storeId] = flushLock
      try {
      const fromState =
        storeId === 'd7' ? countsD7 : storeId === 'd13' ? countsD13 : countsCentral
      const inv =
        override ??
        (storeId === selectedStore ? countsLatestRef.current : null) ??
        fromState
      const pending = getCountsPending(storeId)
      if (!hasCountsPending(pending)) return null
      const capturedPending = {
        replaceAll: pending.replaceAll,
        editAt: pending.editAt,
        baseRevision: pending.baseRevision,
        baseUpdatedAt: pending.baseUpdatedAt,
        items: Object.fromEntries(
          Object.entries(pending.items).map(([itemId, record]) => [itemId, { ...record }])
        ),
      }
      let saved
      try {
        saved = await saveCountsRevision({
          db,
          countsDocId: getCountsDocId(storeId),
          nextCounts: stripSyncMeta(inv),
          pending: capturedPending,
          actor: syncActor,
          force,
        })
      } catch (err) {
        if (err instanceof CountsConflictError) {
          const nextConflict = {
            storeId,
            storeName: getStoreName(storeId),
            remoteData: err.remoteData,
            remoteUpdatedAt: getUpdatedAt(err.remoteData),
            localUpdatedAt: getCountsMeta(storeId).lastLocalEditAt,
            conflicts: err.conflicts,
          }
          countsConflictRef.current[storeId] = nextConflict
          if (storeId === selectedStoreRef.current) {
            setConflict(nextConflict)
            setSyncStatus('conflict')
          }
          return null
        }
        throw err
      }

      const livePending = getCountsPending(storeId)
      if (
        capturedPending.replaceAll &&
        livePending.replaceAll &&
        livePending.editAt === capturedPending.editAt
      ) {
        livePending.replaceAll = false
      }
      Object.entries(capturedPending.items).forEach(([itemId, record]) => {
        if (livePending.items[itemId]?.editAt === record.editAt) {
          delete livePending.items[itemId]
        } else if (livePending.items[itemId]) {
          // 同一品項在交易進行中又輸入一次：第二次修改應以本次剛寫入的值為新基準，
          // 否則下一次送出會把自己的前一次寫入誤判為他人衝突。
          livePending.items[itemId].baseEntry = stripCountEntryMeta(saved.counts?.[itemId])
        }
      })
      livePending.baseRevision = getRevision(saved)
      livePending.baseUpdatedAt = getUpdatedAt(saved)
      delete countsConflictRef.current[storeId]
      persistCountsPending(storeId)
      const meta = getCountsMeta(storeId)
      meta.lastSyncedToCloudAt = getUpdatedAt(saved)
      meta.isDirty = hasCountsPending(livePending)
      meta.hasReceivedInitialRemote = true
      if (storeId === selectedStore) {
        setConflict(null)
        setSyncStatus(meta.isDirty ? 'syncing' : 'synced')
        setLocalVersionAt(getUpdatedAt(saved))
      }
      return saved
      } finally {
        if (countsFlushLockRef.current[storeId] === flushLock) {
          delete countsFlushLockRef.current[storeId]
        }
        releaseFlushLock()
      }
    },
    [countsCentral, countsD7, countsD13, selectedStore, syncActor]
  )

  const markCountsDirty = useCallback(
    (storeId, nextCounts, { itemId = null, replaceAll = false } = {}) => {
      const meta = getCountsMeta(storeId)
      meta.isDirty = true
      meta.lastLocalEditAt = Date.now()
      const pending = getCountsPending(storeId)
      pending.editAt = meta.lastLocalEditAt
      if (!hasCountsPending(pending)) {
        pending.baseRevision = getRevision(countsLatestRef.current)
        pending.baseUpdatedAt = getUpdatedAt(countsLatestRef.current)
      }
      if (replaceAll) {
        pending.replaceAll = true
        pending.items = {}
      } else if (itemId) {
        const previous = pending.items[itemId]
        pending.items[itemId] = {
          editAt: meta.lastLocalEditAt,
          baseEntry: previous?.baseEntry || stripCountEntryMeta(
            countsLatestRef.current?.counts?.[itemId]
          ),
        }
      }
      setLocalVersionAt(meta.lastLocalEditAt)
      const localDoc = {
        ...stripSyncMeta(nextCounts),
        _clientUpdatedAt: meta.lastLocalEditAt,
        _updatedBy: syncActor,
        _revision: getRevision(countsLatestRef.current),
      }
      // useLocalStorage 會在 effect 寫入；同步狀態需在關頁前立即落盤，避免 debounce 視窗遺失。
      writeLocalRecord(getCountsStorageKey(storeId), localDoc)
      persistCountsPending(storeId)
      if (storeId === selectedStoreRef.current) countsLatestRef.current = localDoc
      setCountsForStore(storeId, localDoc)
      setSyncStatus(navigator.onLine ? 'syncing' : 'offline')
      if (countsDebounceRef.current[storeId]) clearTimeout(countsDebounceRef.current[storeId])
      countsDebounceRef.current[storeId] = setTimeout(() => {
        countsDebounceRef.current[storeId] = null
        flushCountsSync(storeId).catch((err) => {
          console.error('[goodsOrder] counts sync failed', err)
          setSyncStatus(navigator.onLine ? 'error' : 'offline')
        })
      }, COUNTS_SYNC_DEBOUNCE_MS)
    },
    [flushCountsSync, setCountsForStore, syncActor]
  )

  // 重新整理後若 localStorage 還有待同步品項，自動接續交易，不先用雲端覆蓋草稿。
  useEffect(() => {
    const pending = getCountsPending(selectedStore)
    if (!hasCountsPending(pending) || countsResumeRef.current[selectedStore]) return undefined
    countsResumeRef.current[selectedStore] = true
    setSyncStatus(navigator.onLine ? 'syncing' : 'offline')
    const timer = window.setTimeout(() => {
      flushCountsSync(selectedStore).catch((err) => {
        console.error('[goodsOrder] resume counts sync', err)
        setSyncStatus(navigator.onLine ? 'error' : 'offline')
      })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [selectedStore])

  // 切店 flush
  useEffect(() => {
    const prev = prevStoreRef.current
    if (prev && prev !== selectedStore) {
      const meta = getCountsMeta(prev)
      if (meta.isDirty) {
        const prevInv =
          prev === 'd7' ? countsD7 : prev === 'd13' ? countsD13 : countsCentral
        flushCountsSync(prev, prevInv).catch((e) =>
          console.error('[goodsOrder] flush on store switch', e)
        )
      }
    }
    prevStoreRef.current = selectedStore
    setConflict(countsConflictRef.current[selectedStore] || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore])

  // counts remote (本機優先)
  useEffect(() => {
    if (countsUnsubRef.current) {
      countsUnsubRef.current()
      countsUnsubRef.current = null
    }
    const storeId = selectedStore
    let mounted = true

    const unsub = onSnapshot(
      doc(db, 'settings', getCountsDocId(storeId)),
      (snap) => {
        if (!mounted) return
        const meta = getCountsMeta(storeId)
        if (!snap.exists()) {
          // 手機裡的暫存說「沒有這份文件」不代表雲端真的沒有（離線、暫存被清過都會這樣）。
          // 這時寫預設值上去，連線後會蓋掉雲端真正的資料 —— 等雲端親口說沒有再建立。
          if (snap.metadata.fromCache) return
          const empty = { ...createEmptyCounts(), _clientUpdatedAt: Date.now() }
          setDoc(snap.ref, empty).catch(() => {})
          meta.hasReceivedInitialRemote = true
          return
        }
        const raw = snap.data()
        const remoteUpdatedAt = getUpdatedAt(raw)
        const pending = getCountsPending(storeId)

        if (meta.isDirty && !pending.replaceAll) {
          const merged = mergeCountsWithPending(
            countsLatestRef.current,
            raw,
            Object.keys(pending.items)
          )
          const nextLocal = {
            ...merged,
            _clientUpdatedAt: Math.max(remoteUpdatedAt, meta.lastLocalEditAt),
            _updatedBy: getUpdatedBy(raw),
            _revision: getRevision(raw),
          }
          countsLatestRef.current = nextLocal
          setCountsForStore(storeId, nextLocal)
          meta.hasReceivedInitialRemote = true
          meta.lastAppliedRemoteAt = remoteUpdatedAt
          return
        }
        if (meta.isDirty && pending.replaceAll) {
          // 全量清除／合併的衝突由 Firestore transaction 的 revision 檢查決定，
          // 不用不同裝置的本機時鐘猜測，離線時也不覆蓋本機草稿。
          meta.hasReceivedInitialRemote = true
          return
        }
        const decision = resolveCountsSnapshot({
          meta,
          remoteUpdatedAt,
          fromCache: snap.metadata.fromCache,
          hasPendingWrites: snap.metadata.hasPendingWrites,
        })
        meta.hasReceivedInitialRemote = true

        if (decision === 'ignore') return
        if (decision === 'conflict') {
          const nextConflict = {
            storeId,
            storeName: getStoreName(storeId),
            remoteData: raw,
            remoteUpdatedAt,
            localUpdatedAt: meta.lastLocalEditAt || getUpdatedAt(countsLatestRef.current),
          }
          countsConflictRef.current[storeId] = nextConflict
          setConflict(nextConflict)
          setSyncStatus('conflict')
          return
        }

        const nextRemote = {
          ...stripSyncMeta(raw),
          _clientUpdatedAt: remoteUpdatedAt || Date.now(),
          _updatedBy: getUpdatedBy(raw),
          _revision: getRevision(raw),
        }
        countsLatestRef.current = nextRemote
        setCountsForStore(storeId, nextRemote)
        meta.lastAppliedRemoteAt = remoteUpdatedAt
        if (!meta.isDirty) {
          meta.lastSyncedToCloudAt = Math.max(meta.lastSyncedToCloudAt, remoteUpdatedAt)
          setSyncStatus('synced')
          setLocalVersionAt(remoteUpdatedAt)
        }
      },
      (err) => {
        console.error('[goodsOrder] counts snapshot', err)
        if (getCountsMeta(storeId).isDirty) setSyncStatus('error')
      }
    )
    countsUnsubRef.current = unsub
    return () => {
      mounted = false
      unsub()
    }
  }, [selectedStore, setCountsForStore])

  // catalog remote (即時)
  useEffect(() => {
    const storeId = selectedStore
    let mounted = true
    const unsub = onSnapshot(
      doc(db, 'settings', getCatalogDocId(storeId)),
      (snap) => {
        if (!mounted) return
        if (catalogDirtyRef.current[storeId]) {
          catalogRemotePendingRef.current[storeId] = snap.exists() ? snap.data() : null
          return
        }
        if (!snap.exists()) {
          if (snap.metadata.fromCache) return // 同上：暫存說沒有，不代表雲端沒有
          const created = createDefaultCatalog(storeId)
          setDoc(snap.ref, created).catch(() => {})
          setCatalogForStore(storeId, created)
          catalogBaseRef.current[storeId] = created
          return
        }
        const data = snap.data()
        if (shouldUpgradeDefaultCatalog(data)) {
          const upgraded = {
            ...createDefaultCatalog(storeId),
            orderStoreName: data.orderStoreName || getDefaultOrderStoreName(storeId),
            _clientUpdatedAt: Date.now(),
          }
          setCatalogForStore(storeId, upgraded)
          catalogBaseRef.current[storeId] = upgraded
          saveCatalogRevision({
            db,
            catalogDocId: getCatalogDocId(storeId),
            baseCatalog: data,
            nextCatalog: upgraded,
            actor: syncActor,
          }).catch((err) => console.error('[goodsOrder] default catalog upgrade', err))
          return
        }
        const nextCatalog = {
          ...stripCatalogMeta(data),
          orderStoreName:
            stripCatalogMeta(data).orderStoreName || getDefaultOrderStoreName(storeId),
          _clientUpdatedAt: getUpdatedAt(data) || Date.now(),
          _updatedAt: data._updatedAt,
          _updatedBy: getUpdatedBy(data),
          _revision: getRevision(data),
          _syncVersion: data._syncVersion,
        }
        setCatalogForStore(storeId, nextCatalog)
        catalogLatestRef.current = nextCatalog
        catalogBaseRef.current[storeId] = nextCatalog
        catalogRemotePendingRef.current[storeId] = null
      },
      (err) => console.error('[goodsOrder] catalog snapshot', err)
    )
    return () => {
      mounted = false
      unsub()
    }
  }, [selectedStore, setCatalogForStore, syncActor])

  const persistCatalog = useCallback(
    (storeId, nextCatalog, { captureUndo = true, force = false } = {}) => {
      if (!catalogBaseRef.current[storeId]) {
        catalogBaseRef.current[storeId] = catalogLatestRef.current
      }
      if (captureUndo && !catalogEditGroupRef.current[storeId]) {
        catalogUndoRef.current[storeId] = catalogLatestRef.current
        catalogEditGroupRef.current[storeId] = true
        if (storeId === selectedStoreRef.current) setCatalogCanUndo(true)
      }

      catalogDirtyRef.current[storeId] = true
      catalogEditVersionRef.current[storeId] =
        (catalogEditVersionRef.current[storeId] || 0) + 1
      const editVersion = catalogEditVersionRef.current[storeId]
      catalogLatestRef.current = nextCatalog
      writeLocalRecord(getCatalogStorageKey(storeId), nextCatalog)
      setCatalogForStore(storeId, nextCatalog)
      writeLocalRecord(catalogDraftStorageKey(storeId), {
        dirty: true,
        baseCatalog: catalogBaseRef.current[storeId],
        updatedAt: Date.now(),
      })
      if (catalogDebounceRef.current[storeId]) {
        clearTimeout(catalogDebounceRef.current[storeId])
      }

      const validation = validateCatalog(nextCatalog)
      if (validation.count > 0) {
        if (storeId === selectedStoreRef.current) setCatalogSaveStatus('invalid')
        return
      }

      if (storeId === selectedStoreRef.current) setCatalogSaveStatus('saving')
      catalogDebounceRef.current[storeId] = setTimeout(async () => {
        catalogDebounceRef.current[storeId] = null
        while (catalogSaveLockRef.current[storeId]) {
          await catalogSaveLockRef.current[storeId]
        }
        if (
          catalogConflictPausedRef.current[storeId] ||
          catalogEditVersionRef.current[storeId] !== editVersion
        ) {
          return
        }
        let releaseCatalogLock
        const catalogLock = new Promise((resolve) => {
          releaseCatalogLock = resolve
        })
        catalogSaveLockRef.current[storeId] = catalogLock
        const normalized = {
          ...nextCatalog,
          orderStoreName: String(nextCatalog.orderStoreName).trim(),
          items: (nextCatalog.items || []).map((it) => ({
            ...it,
            note: String(it.note || '').trim(),
            minStock: parseQuantity(it.minStock).value,
            defaultOrderQty: parseQuantity(it.defaultOrderQty).value,
            allowFraction: !!it.allowFraction,
            disabled: !!it.disabled,
          })),
        }
        try {
          const saved = await saveCatalogRevision({
            db,
            catalogDocId: getCatalogDocId(storeId),
            baseCatalog: catalogBaseRef.current[storeId],
            nextCatalog: normalized,
            actor: syncActor,
            force,
          })
          catalogConflictPausedRef.current[storeId] = false
          catalogBaseRef.current[storeId] = saved
          catalogRemotePendingRef.current[storeId] = null
          if (catalogEditVersionRef.current[storeId] === editVersion) {
            catalogDirtyRef.current[storeId] = false
            writeLocalRecord(catalogDraftStorageKey(storeId), null)
            catalogEditGroupRef.current[storeId] = false
            catalogLatestRef.current = saved
            setCatalogForStore(storeId, saved)
            if (storeId === selectedStoreRef.current) {
              setCatalogSaveStatus('saved')
              setCatalogConflict(null)
            }
          } else {
            // 儲存期間又有新輸入：把剛完成的版本設為下一次送出的共同基準。
            writeLocalRecord(catalogDraftStorageKey(storeId), {
              dirty: true,
              baseCatalog: saved,
              updatedAt: Date.now(),
            })
          }
        } catch (err) {
          if (err instanceof CatalogConflictError) {
            catalogConflictPausedRef.current[storeId] = true
            catalogRemotePendingRef.current[storeId] = err.remoteData
            if (storeId === selectedStoreRef.current) {
              setCatalogConflict({
                storeId,
                remoteData: err.remoteData,
                mergedCatalog: err.mergedCatalog,
                conflicts: err.conflicts,
              })
              setCatalogSaveStatus('conflict')
            }
            return
          }
          console.error('[goodsOrder] catalog sync', err)
          if (storeId === selectedStoreRef.current) setCatalogSaveStatus('error')
        } finally {
          if (catalogSaveLockRef.current[storeId] === catalogLock) {
            delete catalogSaveLockRef.current[storeId]
          }
          releaseCatalogLock()
        }
      }, 600)
    },
    [setCatalogForStore, syncActor]
  )

  // 品項設定在關頁前尚未送出時，重新開啟會保留草稿並自動續傳。
  useEffect(() => {
    if (!catalogDirtyRef.current[selectedStore] || catalogResumeRef.current[selectedStore]) {
      return undefined
    }
    catalogResumeRef.current[selectedStore] = true
    if (validateCatalog(catalog).count > 0) {
      setCatalogSaveStatus('invalid')
      return undefined
    }
    const timer = window.setTimeout(() => {
      persistCatalog(selectedStore, catalogLatestRef.current, { captureUndo: false })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [selectedStore])

  useEffect(() => {
    const handleOffline = () => {
      if (getCountsMeta(selectedStore).isDirty) setSyncStatus('offline')
    }
    const handleOnline = () => {
      const pending = getCountsPending(selectedStore)
      if (hasCountsPending(pending)) {
        setSyncStatus('syncing')
        flushCountsSync(selectedStore).catch((err) => {
          console.error('[goodsOrder] online counts sync', err)
          setSyncStatus('error')
        })
      }
      if (
        catalogDirtyRef.current[selectedStore] &&
        validateCatalog(catalogLatestRef.current).count === 0
      ) {
        persistCatalog(selectedStore, catalogLatestRef.current, { captureUndo: false })
      }
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [selectedStore, flushCountsSync, persistCatalog])

  const undoCatalogChange = () => {
    const previous = catalogUndoRef.current[selectedStore]
    if (!previous) return
    delete catalogUndoRef.current[selectedStore]
    catalogEditGroupRef.current[selectedStore] = false
    setCatalogCanUndo(false)
    persistCatalog(selectedStore, previous, { captureUndo: false })
  }

  const retryCatalogSave = () => {
    persistCatalog(selectedStore, catalogLatestRef.current, { captureUndo: false })
  }

  const loadCatalogHistory = useCallback(async () => {
    const storeId = selectedStoreRef.current
    setCatalogHistoryStatus('loading')
    try {
      const versions = await loadCatalogVersions(db, getCatalogDocId(storeId))
      if (storeId !== selectedStoreRef.current) return
      setCatalogVersions(versions)
      setCatalogHistoryStatus('loaded')
    } catch (err) {
      console.error('[goodsOrder] catalog history', err)
      if (storeId === selectedStoreRef.current) setCatalogHistoryStatus('error')
    }
  }, [])

  const restoreCatalogVersion = (version) => {
    const restored = {
      ...stripCatalogMeta(version),
      orderStoreName:
        stripCatalogMeta(version).orderStoreName || getDefaultOrderStoreName(selectedStore),
    }
    persistCatalog(selectedStore, restored)
  }

  const useRemoteCatalog = () => {
    if (!catalogConflict) return
    const conflictStoreId = catalogConflict.storeId
    if (catalogDebounceRef.current[conflictStoreId]) {
      clearTimeout(catalogDebounceRef.current[conflictStoreId])
      catalogDebounceRef.current[conflictStoreId] = null
    }
    const remote = catalogConflict.remoteData
    const next = {
      ...stripCatalogMeta(remote),
      orderStoreName:
        stripCatalogMeta(remote).orderStoreName || getDefaultOrderStoreName(conflictStoreId),
      _clientUpdatedAt: getUpdatedAt(remote) || Date.now(),
      _updatedAt: remote._updatedAt,
      _updatedBy: getUpdatedBy(remote),
      _revision: getRevision(remote),
      _syncVersion: remote._syncVersion,
    }
    catalogDirtyRef.current[conflictStoreId] = false
    catalogConflictPausedRef.current[conflictStoreId] = false
    catalogEditVersionRef.current[conflictStoreId] =
      (catalogEditVersionRef.current[conflictStoreId] || 0) + 1
    catalogEditGroupRef.current[conflictStoreId] = false
    writeLocalRecord(catalogDraftStorageKey(conflictStoreId), null)
    delete catalogUndoRef.current[conflictStoreId]
    setCatalogCanUndo(false)
    catalogBaseRef.current[conflictStoreId] = next
    catalogLatestRef.current = next
    writeLocalRecord(getCatalogStorageKey(conflictStoreId), next)
    setCatalogForStore(conflictStoreId, next)
    setCatalogConflict(null)
    setCatalogSaveStatus('saved')
  }

  const keepMergedCatalog = () => {
    if (!catalogConflict) return
    const { storeId, remoteData, mergedCatalog } = catalogConflict
    catalogConflictPausedRef.current[storeId] = false
    catalogBaseRef.current[storeId] = remoteData
    catalogLatestRef.current = mergedCatalog
    setCatalogForStore(storeId, mergedCatalog)
    setCatalogConflict(null)
    // 確認當下仍重新讀取交易中的最新版本；若第三台裝置又修改，會再次合併／提示。
    persistCatalog(storeId, mergedCatalog, { captureUndo: false })
  }

  const activeItems = useMemo(
    () => (catalog.items || []).filter((it) => !it.disabled),
    [catalog.items]
  )

  const allRows = useMemo(() => {
    return activeItems.map((item) => {
      const entry = countsDoc.counts?.[item.id] || {}
      const status = getItemStatus(item, entry)
      const currentError = getCurrentQuantityError(item, entry)
      const orderError = status === 'order' ? getOrderQuantityError(item, entry) : ''
      const orderDisplay =
        entry.orderQty == null
          ? formatQuantity(getEffectiveOrderQty(item, entry))
          : typeof entry.orderQty === 'string'
            ? entry.orderQty
            : formatQuantity(entry.orderQty)
      return {
        item,
        entry,
        status,
        currentError,
        orderError,
        orderDisplay,
        showOrderControls: status === 'order' || status === 'later',
      }
    })
  }, [activeItems, countsDoc.counts])

  const rows = useMemo(
    () => allRows.filter(({ status }) => (filter === 'all' ? true : status === filter)),
    [allRows, filter]
  )

  const progress = useMemo(() => {
    const counts = { uncounted: 0, order: 0, later: 0, invalid: 0, orderInvalid: 0 }
    allRows.forEach(({ status, orderError }) => {
      counts[status] = (counts[status] || 0) + 1
      if (orderError) counts.orderInvalid += 1
    })
    const total = allRows.length
    const completed = counts.order + counts.later
    const unresolved = counts.uncounted + counts.invalid + counts.orderInvalid
    return {
      ...counts,
      total,
      completed,
      unresolved,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [allRows])

  const orderPreview = useMemo(
    () =>
      buildOrderLines(
        catalog.items,
        countsDoc.counts,
        catalog.orderStoreName || getDefaultOrderStoreName(selectedStore)
      ),
    [catalog.items, catalog.orderStoreName, countsDoc.counts, selectedStore]
  )

  const snapshotItems = useMemo(
    () => buildSnapshotItems(catalog.items, countsDoc.counts),
    [catalog.items, countsDoc.counts]
  )

  const uncountedItemNames = useMemo(
    () => allRows.filter(({ status }) => status === 'uncounted').map(({ item }) => item.name),
    [allRows]
  )

  const partialExportText = useMemo(
    () =>
      orderPreview.text ||
      `${orderPreview.header}\n目前沒有已確認需叫貨的品項`,
    [orderPreview.header, orderPreview.text]
  )

  const catalogValidation = useMemo(() => validateCatalog(catalog), [catalog])

  const enteredCount = useMemo(
    () => allRows.filter(({ entry }) => hasEnteredCount(entry)).length,
    [allRows]
  )

  const patchCount = (itemId, patch) => {
    const prev = countsLatestRef.current || countsDoc
    const next = {
      counts: {
        ...(prev.counts || {}),
        [itemId]: {
          current: '',
          orderQty: null,
          forceInclude: null,
          ...(prev.counts?.[itemId] || {}),
          ...patch,
        },
      },
    }
    markCountsDirty(selectedStore, next, { itemId })
  }

  const clearEnteredCounts = () => {
    const empty = createEmptyCounts()
    countsLatestRef.current = empty
    markCountsDirty(selectedStore, empty, { replaceAll: true })
    setFilter('all')
    setFocusedItemId(null)
    setSnapshotRetryPayload(null)
    setCopyMessageVariant('success')
    setCopyMessage(`已清除${getStoreName(selectedStore)}的點貨量`)
    setShowClearConfirm(false)
  }

  const handleCurrentChange = (item, raw) => {
    // 現有貨量一律保留字串，支援份數（1/2）與點數（0.5）；打字中不強制正規化
    patchCount(item.id, { current: normalizeCurrentInput(raw) })
  }

  const focusNextUnresolved = (itemId) => {
    const currentIndex = allRows.findIndex(({ item }) => item.id === itemId)
    const ordered = [
      ...allRows.slice(currentIndex + 1),
      ...allRows.slice(0, Math.max(currentIndex, 0)),
    ]
    const next = ordered.find(
      ({ item, status }) => item.id !== itemId && (status === 'uncounted' || status === 'invalid')
    )
    if (!next) return
    const input = getVisibleInputRef(quantityInputRefs, next.item.id)
    if (!input) return

    // iOS Safari 只允許在使用者事件的同步呼叫堆疊裡移動輸入焦點。
    // focus 若延後到 requestAnimationFrame，按鈕看似有按下但鍵盤與下一格都不會移動。
    try {
      input.focus({ preventScroll: true })
    } catch {
      input.focus()
    }
    requestAnimationFrame(() => {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const continueAfterCurrent = (item, current) => {
    const entry = countsLatestRef.current?.counts?.[item.id] || {}
    const nextStatus = getItemStatus(item, { ...entry, current })
    if (nextStatus === 'order') {
      setFocusedItemId(null)
      return
    }
    focusNextUnresolved(item.id)
  }

  const applyCurrentQuick = (item, value) => {
    patchCount(item.id, { current: value })
    continueAfterCurrent(item, value)
  }

  const handleCurrentKeyDown = (event, item) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (parseQuantity(event.currentTarget.value).kind === 'value') {
      continueAfterCurrent(item, event.currentTarget.value)
    }
  }

  const handleOrderQtyChange = (item, raw) => {
    if (raw === '' || raw == null) {
      // 空字串代表使用者正在重打；null 才代表尚未覆寫、採用品項預設值。
      patchCount(item.id, { orderQty: '' })
      return
    }
    const stored = quantityInputToStored(raw, item.allowFraction)
    if (stored === null) {
      patchCount(item.id, { orderQty: raw })
      return
    }
    patchCount(item.id, { orderQty: stored })
  }

  const toggleForce = (item, entry, status) => {
    if (status === 'uncounted') return
    // 不帶 forceInclude 重算一次，看規則本身建議叫或不叫。
    const suggested = getItemStatus(item, { ...entry, forceInclude: null }) === 'order'
    if (status === 'order') {
      patchCount(item.id, { forceInclude: false })
    } else {
      patchCount(item.id, { forceInclude: suggested ? null : true })
    }
  }

  /**
   * 叫貨快照：主文件放「最新一次」（其他地方讀這份），另外每次都存一筆進 history。
   * 以前每次輸出都覆蓋上一次，快照原本要拿來算消耗量，只剩一筆就算不出來。
   * history 的編號用這次的時間，重試更新時不會多存一筆。
   */
  const saveSnapshot = (storeId, payload) => {
    const snapshotRef = doc(db, 'settings', getSnapshotDocId(storeId))
    return Promise.all([
      setDoc(snapshotRef, payload),
      setDoc(doc(snapshotRef, 'history', `s_${payload._clientUpdatedAt}`), payload),
    ])
  }

  const completeNoOrder = async () => {
    const payload = {
      text: '',
      orderCount: 0,
      items: snapshotItems,
      _clientUpdatedAt: Date.now(),
    }
    setIsCopying(true)
    try {
      await saveSnapshot(selectedStore, payload)
      setSnapshotRetryPayload(null)
      setCopyMessageVariant('success')
      setCopyMessage('盤點完成，本次庫存足夠；快照已更新')
    } catch (err) {
      console.error('[goodsOrder] empty snapshot write', err)
      setSnapshotRetryPayload(payload)
      setCopyMessageVariant('warning')
      setCopyMessage('盤點已完成，但快照更新失敗；可重試更新')
    } finally {
      setIsCopying(false)
    }
  }

  const openCopyFlow = () => {
    setCopyMessage('')
    setSnapshotRetryPayload(null)
    if (catalogValidation.count > 0) {
      setCopyMessageVariant('error')
      setCopyMessage(`品項設定有 ${catalogValidation.count} 個錯誤，請先修正再輸出`)
      setShowSettings(true)
      return
    }
    if (progress.invalid + progress.orderInvalid > 0) {
      setCopyMessageVariant('error')
      setCopyMessage(`還有 ${progress.invalid + progress.orderInvalid} 個數量格式錯誤，請先修正再輸出`)
      return
    }
    if (progress.uncounted > 0) {
      setShowIncompleteConfirm(true)
      return
    }
    if (orderPreview.orderCount === 0) {
      completeNoOrder()
      return
    }
    setPreviewWarning('')
    setShowPreview(true)
  }

  const previewIncompleteResult = () => {
    setShowIncompleteConfirm(false)
    setPreviewWarning(
      orderPreview.orderCount > 0
        ? `只包含已完成 ${progress.completed}/${progress.total} 項中的 ${orderPreview.orderCount} 個需叫貨品項；另有 ${progress.uncounted} 項空白。`
        : `已完成 ${progress.completed}/${progress.total} 項，目前沒有已確認需叫貨的品項；另有 ${progress.uncounted} 項空白。`
    )
    setShowPreview(true)
  }

  const confirmCopy = async () => {
    const isPartial = Boolean(previewWarning)
    const text = isPartial ? partialExportText : orderPreview.text
    setIsCopying(true)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        const copied = document.execCommand('copy')
        document.body.removeChild(ta)
        if (!copied) throw new Error('copy command failed')
      } catch (err) {
        console.error('[goodsOrder] clipboard write', err)
        setCopyMessageVariant('error')
        setCopyMessage('無法複製叫貨文字，請允許剪貼簿權限後重試')
        setIsCopying(false)
        return
      }
    }
    const payload = {
      text,
      orderCount: orderPreview.orderCount,
      items: snapshotItems,
      _clientUpdatedAt: Date.now(),
    }
    try {
      await saveSnapshot(selectedStore, payload)
      setSnapshotRetryPayload(null)
      setCopyMessageVariant(isPartial ? 'warning' : 'success')
      setCopyMessage(
        isPartial
          ? orderPreview.orderCount > 0
            ? `已複製部分叫貨單 ${orderPreview.orderCount} 項，尚有 ${progress.uncounted} 項空白；快照已更新`
            : `已複製未完成盤點文字，尚有 ${progress.uncounted} 項空白；快照已更新`
          : `已複製 ${orderPreview.orderCount} 項，快照已更新`
      )
    } catch (err) {
      console.error('[goodsOrder] snapshot write', err)
      setSnapshotRetryPayload(payload)
      setCopyMessageVariant('warning')
      setCopyMessage(
        isPartial
          ? '已複製未完成盤點文字，但快照更新失敗；可重試更新'
          : `已複製 ${orderPreview.orderCount} 項，但快照更新失敗；可重試更新`
      )
    }
    setShowPreview(false)
    setPreviewWarning('')
    setIsCopying(false)
  }

  const retrySnapshot = async () => {
    if (!snapshotRetryPayload) return
    setIsCopying(true)
    try {
      await saveSnapshot(selectedStore, snapshotRetryPayload)
      setSnapshotRetryPayload(null)
      setCopyMessageVariant('success')
      setCopyMessage('快照已更新')
    } catch (err) {
      console.error('[goodsOrder] snapshot retry', err)
      setCopyMessageVariant('warning')
      setCopyMessage('快照仍無法更新，盤點資料已保留在本機')
    } finally {
      setIsCopying(false)
    }
  }

  const syncLabel = {
    idle: '準備同步',
    syncing: '同步中…',
    synced: '已同步',
    offline: '離線保存',
    error: '同步失敗',
    conflict: '待處理',
  }[syncStatus] || '同步狀態'

  const blockingErrorCount = progress.invalid + progress.orderInvalid + catalogValidation.count
  const copyActionLabel = blockingErrorCount > 0
    ? `修正 ${blockingErrorCount} 個錯誤後再輸出`
    : progress.uncounted > 0
      ? `尚有 ${progress.uncounted} 項空白 · 仍可輸出文字`
    : orderPreview.orderCount > 0
      ? `預覽並複製 ${orderPreview.orderCount} 項`
      : '完成盤點 · 本次庫存足夠'

  return {
    selectedStore,
    setSelectedStore,
    filter,
    setFilter,
    showSettings,
    setShowSettings,
    showPreview,
    setShowPreview,
    showIncompleteConfirm,
    setShowIncompleteConfirm,
    showClearConfirm,
    setShowClearConfirm,
    previewWarning,
    setPreviewWarning,
    copyMessage,
    setCopyMessage,
    copyMessageVariant,
    setCopyMessageVariant,
    snapshotRetryPayload,
    setSnapshotRetryPayload,
    isCopying,
    setIsCopying,
    syncStatus,
    setSyncStatus,
    catalogSaveStatus,
    setCatalogSaveStatus,
    catalogCanUndo,
    setCatalogCanUndo,
    catalogConflict,
    setCatalogConflict,
    catalogVersions,
    setCatalogVersions,
    catalogHistoryStatus,
    setCatalogHistoryStatus,
    conflict,
    setConflict,
    localVersionAt,
    setLocalVersionAt,
    focusedItemId,
    setFocusedItemId,
    actorIdRef,
    actorName,
    setActorName,
    syncActor,
    catalogCentral,
    setCatalogCentral,
    catalogD7,
    setCatalogD7,
    catalogD13,
    setCatalogD13,
    countsCentral,
    setCountsCentral,
    countsD7,
    setCountsD7,
    countsD13,
    setCountsD13,
    catalog,
    countsDoc,
    setCatalogForStore,
    setCountsForStore,
    countsMetaRef,
    countsLatestRef,
    countsUnsubRef,
    countsDebounceRef,
    prevStoreRef,
    selectedStoreRef,
    catalogDebounceRef,
    catalogLatestRef,
    catalogBaseRef,
    catalogRemotePendingRef,
    catalogSaveLockRef,
    catalogConflictPausedRef,
    catalogUndoRef,
    catalogEditGroupRef,
    catalogEditVersionRef,
    catalogDirtyRef,
    countsPendingRef,
    countsConflictRef,
    countsFlushLockRef,
    countsResumeRef,
    catalogResumeRef,
    quantityInputRefs,
    getVisibleInputRef,
    getCountsMeta,
    getCountsPending,
    persistCountsPending,
    flushCountsSync,
    markCountsDirty,
    persistCatalog,
    undoCatalogChange,
    retryCatalogSave,
    loadCatalogHistory,
    restoreCatalogVersion,
    useRemoteCatalog,
    keepMergedCatalog,
    activeItems,
    allRows,
    rows,
    progress,
    orderPreview,
    snapshotItems,
    uncountedItemNames,
    partialExportText,
    catalogValidation,
    enteredCount,
    patchCount,
    clearEnteredCounts,
    handleCurrentChange,
    focusNextUnresolved,
    continueAfterCurrent,
    applyCurrentQuick,
    handleCurrentKeyDown,
    handleOrderQtyChange,
    toggleForce,
    saveSnapshot,
    completeNoOrder,
    openCopyFlow,
    previewIncompleteResult,
    confirmCopy,
    retrySnapshot,
    syncLabel,
    blockingErrorCount,
    copyActionLabel,
  }
}
