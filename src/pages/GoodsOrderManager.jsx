import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { DualThemePage } from '../components/studio/DualThemePage'
import { CwAlert, CwBadge, CwButton, CwInput } from '../components/studio/ui'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { db } from '../utils/firebase'
import {
  FILTERS,
  STORES,
  createDefaultCatalog,
  createEmptyCounts,
  formatQuantity,
  getCatalogDocId,
  getCatalogStorageKey,
  getCountsDocId,
  getCountsStorageKey,
  getDefaultOrderStoreName,
  getEffectiveOrderQty,
  getItemStatus,
  getSnapshotDocId,
  getStoreName,
  parseQuantity,
  quantityInputToStored,
} from './goodsOrder/goodsOrderConstants'
import { GoodsOrderPreviewModal } from './goodsOrder/GoodsOrderPreviewModal'
import { GoodsOrderSettingsSheet } from './goodsOrder/GoodsOrderSettingsSheet'
import { GoodsOrderConflictModal, GoodsOrderSyncBanner } from './goodsOrder/GoodsOrderSyncUI'
import {
  COUNTS_SYNC_DEBOUNCE_MS,
  createCountsSyncMeta,
  formatVersionTime,
  getUpdatedAt,
  mergeCountsData,
  resolveCountsSnapshot,
  stripCatalogMeta,
  stripSyncMeta,
} from './goodsOrder/goodsOrderSync'
import { buildOrderLines } from './goodsOrder/goodsOrderText'

const BC = [
  { label: 'Brainless', href: '#/sandwich' },
  { label: '貨物叫貨（測試）', href: '#/goods-order-test' },
]

function statusLabel(status) {
  if (status === 'uncounted') return '未盤點'
  if (status === 'order') return '建議叫'
  if (status === 'later') return '下次'
  return '無效'
}

function statusBadgeTone(status) {
  if (status === 'order') return 'brand'
  if (status === 'uncounted') return 'neutral'
  if (status === 'later') return 'warning'
  return 'danger'
}

function GoodsOrderManager() {
  const [selectedStore, setSelectedStore] = useState('central')
  const [filter, setFilter] = useState('all')
  const [showSettings, setShowSettings] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')
  const [syncStatus, setSyncStatus] = useState('idle')
  const [conflict, setConflict] = useState(null)
  const [localVersionAt, setLocalVersionAt] = useState(0)

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
      const value = typeof next === 'function'
        ? next(
            storeId === 'd7' ? catalogD7 : storeId === 'd13' ? catalogD13 : catalogCentral
          )
        : next
      if (storeId === 'd7') setCatalogD7(value)
      else if (storeId === 'd13') setCatalogD13(value)
      else setCatalogCentral(value)
    },
    [catalogCentral, catalogD7, catalogD13, setCatalogCentral, setCatalogD7, setCatalogD13]
  )

  const setCountsForStore = useCallback(
    (storeId, next) => {
      const prev =
        storeId === 'd7' ? countsD7 : storeId === 'd13' ? countsD13 : countsCentral
      const value = typeof next === 'function' ? next(prev) : next
      if (storeId === 'd7') setCountsD7(value)
      else if (storeId === 'd13') setCountsD13(value)
      else setCountsCentral(value)
      return value
    },
    [countsCentral, countsD7, countsD13, setCountsCentral, setCountsD7, setCountsD13]
  )

  const countsMetaRef = useRef({})
  const countsLatestRef = useRef(countsDoc)
  const countsUnsubRef = useRef(null)
  const countsDebounceRef = useRef(null)
  const prevStoreRef = useRef(selectedStore)
  const catalogDebounceRef = useRef(null)

  useEffect(() => {
    countsLatestRef.current = countsDoc
  }, [countsDoc])

  const getCountsMeta = (storeId) => {
    if (!countsMetaRef.current[storeId]) {
      countsMetaRef.current[storeId] = createCountsSyncMeta()
    }
    return countsMetaRef.current[storeId]
  }

  const flushCountsSync = useCallback(
    async (storeId = selectedStore, override = null) => {
      const fromState =
        storeId === 'd7' ? countsD7 : storeId === 'd13' ? countsD13 : countsCentral
      const inv =
        override ??
        (storeId === selectedStore ? countsLatestRef.current : null) ??
        fromState
      const payload = {
        ...stripSyncMeta(inv),
        _clientUpdatedAt: Date.now(),
      }
      await setDoc(doc(db, 'settings', getCountsDocId(storeId)), payload)
      const meta = getCountsMeta(storeId)
      meta.lastSyncedToCloudAt = payload._clientUpdatedAt
      meta.isDirty = false
      meta.hasReceivedInitialRemote = true
      if (storeId === selectedStore) {
        setSyncStatus('synced')
        setLocalVersionAt(payload._clientUpdatedAt)
      }
    },
    [countsCentral, countsD7, countsD13, selectedStore]
  )

  const markCountsDirty = useCallback(
    (storeId, nextCounts) => {
      const meta = getCountsMeta(storeId)
      meta.isDirty = true
      meta.lastLocalEditAt = Date.now()
      setLocalVersionAt(meta.lastLocalEditAt)
      setCountsForStore(storeId, {
        ...stripSyncMeta(nextCounts),
        _clientUpdatedAt: meta.lastLocalEditAt,
      })
      setSyncStatus('syncing')
      if (countsDebounceRef.current) clearTimeout(countsDebounceRef.current)
      countsDebounceRef.current = setTimeout(() => {
        flushCountsSync(storeId).catch((err) => {
          console.error('[goodsOrder] counts sync failed', err)
          setSyncStatus('error')
        })
      }, COUNTS_SYNC_DEBOUNCE_MS)
    },
    [flushCountsSync, setCountsForStore]
  )

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
    setConflict(null)
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
          const empty = { ...createEmptyCounts(), _clientUpdatedAt: Date.now() }
          setDoc(snap.ref, empty).catch(() => {})
          meta.hasReceivedInitialRemote = true
          return
        }
        const raw = snap.data()
        const remoteUpdatedAt = getUpdatedAt(raw)
        const decision = resolveCountsSnapshot({
          meta,
          remoteUpdatedAt,
          fromCache: snap.metadata.fromCache,
          hasPendingWrites: snap.metadata.hasPendingWrites,
        })
        meta.hasReceivedInitialRemote = true

        if (decision === 'ignore') return
        if (decision === 'conflict') {
          setConflict({
            storeId,
            storeName: getStoreName(storeId),
            remoteData: raw,
            remoteUpdatedAt,
            localUpdatedAt: meta.lastLocalEditAt || getUpdatedAt(countsLatestRef.current),
          })
          setSyncStatus('conflict')
          return
        }

        setCountsForStore(storeId, {
          ...stripSyncMeta(raw),
          _clientUpdatedAt: remoteUpdatedAt || Date.now(),
        })
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
        if (!snap.exists()) {
          const created = createDefaultCatalog(storeId)
          setDoc(snap.ref, created).catch(() => {})
          setCatalogForStore(storeId, created)
          return
        }
        const data = snap.data()
        setCatalogForStore(storeId, {
          ...stripCatalogMeta(data),
          orderStoreName:
            stripCatalogMeta(data).orderStoreName || getDefaultOrderStoreName(storeId),
          _clientUpdatedAt: getUpdatedAt(data) || Date.now(),
        })
      },
      (err) => console.error('[goodsOrder] catalog snapshot', err)
    )
    return () => {
      mounted = false
      unsub()
    }
  }, [selectedStore, setCatalogForStore])

  const persistCatalog = useCallback(
    (storeId, nextCatalog) => {
      const normalized = {
        ...nextCatalog,
        items: (nextCatalog.items || []).map((it) => ({
          ...it,
          minStock: Number(it.minStock) || 0,
          defaultOrderQty: Number(it.defaultOrderQty) || 0,
          allowFraction: !!it.allowFraction,
          disabled: !!it.disabled,
        })),
      }
      setCatalogForStore(storeId, normalized)
      if (catalogDebounceRef.current) clearTimeout(catalogDebounceRef.current)
      catalogDebounceRef.current = setTimeout(() => {
        const payload = {
          ...stripCatalogMeta(normalized),
          _clientUpdatedAt: Date.now(),
        }
        setDoc(doc(db, 'settings', getCatalogDocId(storeId)), payload).catch((err) =>
          console.error('[goodsOrder] catalog sync', err)
        )
      }, 600)
    },
    [setCatalogForStore]
  )

  const activeItems = useMemo(
    () => (catalog.items || []).filter((it) => !it.disabled),
    [catalog.items]
  )

  const rows = useMemo(() => {
    return activeItems
      .map((item) => {
        const entry = countsDoc.counts?.[item.id] || {}
        const status = getItemStatus(item, entry)
        return { item, entry, status }
      })
      .filter(({ status }) => (filter === 'all' ? true : status === filter))
  }, [activeItems, countsDoc.counts, filter])

  const orderPreview = useMemo(
    () =>
      buildOrderLines(
        catalog.items,
        countsDoc.counts,
        catalog.orderStoreName || getDefaultOrderStoreName(selectedStore)
      ),
    [catalog.items, catalog.orderStoreName, countsDoc.counts, selectedStore]
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
    markCountsDirty(selectedStore, next)
  }

  const handleCurrentChange = (item, raw) => {
    const stored = quantityInputToStored(raw, item.allowFraction)
    if (stored === null) {
      // 允許打到一半（如 "1/"），先以字串暫存
      patchCount(item.id, { current: raw })
      return
    }
    patchCount(item.id, { current: stored === '' ? '' : stored })
  }

  const handleOrderQtyChange = (item, raw) => {
    if (raw === '' || raw == null) {
      patchCount(item.id, { orderQty: null })
      return
    }
    const stored = quantityInputToStored(raw, true)
    if (stored === null) {
      patchCount(item.id, { orderQty: raw })
      return
    }
    patchCount(item.id, { orderQty: stored })
  }

  const toggleForce = (item, entry, status) => {
    if (status === 'uncounted') return
    const suggested =
      parseQuantity(entry.current === 0 || entry.current ? String(entry.current) : '').kind ===
        'value' &&
      parseQuantity(String(entry.current)).value < Number(item.minStock)
    if (status === 'order') {
      // 改為下次
      patchCount(item.id, { forceInclude: false })
    } else {
      // 改為要叫
      patchCount(item.id, { forceInclude: suggested ? null : true })
    }
  }

  const openCopyFlow = () => {
    setCopyMessage('')
    if (orderPreview.orderCount === 0) {
      setCopyMessage('本次無需叫貨')
      return
    }
    setShowPreview(true)
  }

  const confirmCopy = async () => {
    const text = orderPreview.text
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    const payload = {
      text,
      orderCount: orderPreview.orderCount,
      _clientUpdatedAt: Date.now(),
    }
    try {
      await setDoc(doc(db, 'settings', getSnapshotDocId(selectedStore)), payload)
    } catch (err) {
      console.error('[goodsOrder] snapshot write', err)
    }
    setShowPreview(false)
    setCopyMessage(`已複製 ${orderPreview.orderCount} 項`)
  }

  const studio = (
    <div className="pb-28">
      <CwAlert variant="warning" className="mb-4">
        測試頁（<code className="text-xs">#/goods-order-test</code>
        ）· 尚未加入主選單導覽
      </CwAlert>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {STORES.map((store) => (
          <CwButton
            key={store.id}
            type="button"
            variant={selectedStore === store.id ? 'brand' : 'secondary'}
            onClick={() => setSelectedStore(store.id)}
          >
            {store.name}
          </CwButton>
        ))}
        <CwButton
          type="button"
          variant="ghost"
          className="ml-auto"
          onClick={() => setShowSettings(true)}
          aria-label="品項設定"
        >
          <Cog6ToothIcon className="h-5 w-5" />
          設定
        </CwButton>
      </div>

      <p className="mb-3 text-xs text-[var(--cw-text-muted)]">
        叫貨標題：三重➡️{catalog.orderStoreName || getDefaultOrderStoreName(selectedStore)}
        {localVersionAt ? ` · 本機 ${formatVersionTime(localVersionAt)}` : null}
      </p>

      <GoodsOrderSyncBanner
        status={syncStatus}
        onRetry={() =>
          flushCountsSync(selectedStore).catch(() => setSyncStatus('error'))
        }
      />

      {copyMessage ? (
        <CwAlert variant={copyMessage.includes('無需') ? 'warning' : 'success'} className="mb-3">
          {copyMessage}
        </CwAlert>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <CwButton
            key={f.id}
            type="button"
            variant={filter === f.id ? 'primary' : 'ghost'}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </CwButton>
        ))}
      </div>

      {/* iPad+: header row */}
      <div className="mb-2 hidden grid-cols-[minmax(0,1.4fr)_5.5rem_4.5rem_5.5rem_auto] gap-2 px-1 text-xs font-semibold text-[var(--cw-text-muted)] md:grid">
        <span>品名</span>
        <span>現有</span>
        <span>最低</span>
        <span>叫貨</span>
        <span>狀態</span>
      </div>

      <ul className="space-y-2">
        {rows.length === 0 ? (
          <li className="rounded-[var(--cw-radius)] border border-dashed border-[var(--cw-border-strong)] px-4 py-8 text-center text-sm text-[var(--cw-text-muted)]">
            此篩選下沒有品項
          </li>
        ) : (
          rows.map(({ item, entry, status }) => {
            const currentDisplay =
              entry.current === '' || entry.current == null
                ? ''
                : formatQuantity(entry.current)
            const orderDisplay =
              entry.orderQty === '' || entry.orderQty == null
                ? formatQuantity(getEffectiveOrderQty(item, entry))
                : formatQuantity(entry.orderQty)
            const showOrderControls = status === 'order' || status === 'later'

            return (
              <li
                key={item.id}
                className="rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] p-3"
              >
                {/* 手機：現有貨量為主 */}
                <div className="md:hidden">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--cw-text)]">{item.name}</p>
                      <p className="text-xs text-[var(--cw-text-muted)]">
                        最低 {formatQuantity(item.minStock)}
                        {item.unit}
                        {item.allowFraction ? ' · 可分數' : ''}
                      </p>
                    </div>
                    <CwBadge tone={statusBadgeTone(status)}>{statusLabel(status)}</CwBadge>
                  </div>
                  <CwInput
                    label="現有貨量"
                    inputMode="decimal"
                    value={
                      typeof entry.current === 'string' && entry.current.includes('/')
                        ? entry.current
                        : currentDisplay
                    }
                    onChange={(e) => handleCurrentChange(item, e.target.value)}
                    placeholder={item.allowFraction ? '例如 1 或 1/2' : '整數'}
                    inputClassName="text-lg"
                  />
                  {showOrderControls ? (
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      {status === 'order' ? (
                        <CwInput
                          label="叫貨量"
                          className="min-w-[7rem] flex-1"
                          inputMode="decimal"
                          value={
                            typeof entry.orderQty === 'string'
                              ? entry.orderQty
                              : orderDisplay
                          }
                          onChange={(e) => handleOrderQtyChange(item, e.target.value)}
                        />
                      ) : null}
                      <CwButton
                        type="button"
                        variant="secondary"
                        onClick={() => toggleForce(item, entry, status)}
                      >
                        {status === 'order' ? '改為下次' : '改為要叫'}
                      </CwButton>
                    </div>
                  ) : null}
                </div>

                {/* iPad+：完整列 */}
                <div className="hidden grid-cols-[minmax(0,1.4fr)_5.5rem_4.5rem_5.5rem_auto] items-center gap-2 md:grid">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--cw-text)]">{item.name}</p>
                    <p className="text-xs text-[var(--cw-text-muted)]">{item.unit}</p>
                  </div>
                  <CwInput
                    inputMode="decimal"
                    value={
                      typeof entry.current === 'string' && entry.current.includes('/')
                        ? entry.current
                        : currentDisplay
                    }
                    onChange={(e) => handleCurrentChange(item, e.target.value)}
                    placeholder="—"
                  />
                  <span className="text-sm text-[var(--cw-text-muted)]">
                    {formatQuantity(item.minStock)}
                  </span>
                  <CwInput
                    inputMode="decimal"
                    disabled={status === 'uncounted'}
                    value={
                      status === 'uncounted'
                        ? ''
                        : typeof entry.orderQty === 'string'
                          ? entry.orderQty
                          : orderDisplay
                    }
                    onChange={(e) => handleOrderQtyChange(item, e.target.value)}
                    placeholder="—"
                  />
                  <div className="flex flex-col items-start gap-1">
                    <CwBadge tone={statusBadgeTone(status)}>{statusLabel(status)}</CwBadge>
                    {showOrderControls ? (
                      <button
                        type="button"
                        className="text-xs text-[var(--cw-brand)] underline"
                        onClick={() => toggleForce(item, entry, status)}
                      >
                        {status === 'order' ? '改下次' : '改要叫'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })
        )}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-[50] border-t border-[var(--cw-border-strong)] bg-[var(--cw-bg)]/95 px-4 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <CwButton type="button" variant="primary" className="w-full" onClick={openCopyFlow}>
          複製叫貨文字
          {orderPreview.orderCount > 0 ? `（本次要叫 ${orderPreview.orderCount} 項）` : ''}
        </CwButton>
      </div>

      <GoodsOrderSettingsSheet
        open={showSettings}
        storeName={getStoreName(selectedStore)}
        orderStoreName={catalog.orderStoreName || getDefaultOrderStoreName(selectedStore)}
        items={catalog.items || []}
        onClose={() => setShowSettings(false)}
        onChangeOrderStoreName={(name) =>
          persistCatalog(selectedStore, { ...catalog, orderStoreName: name })
        }
        onChangeItems={(items) => persistCatalog(selectedStore, { ...catalog, items })}
      />

      <GoodsOrderPreviewModal
        open={showPreview}
        text={orderPreview.text}
        onClose={() => setShowPreview(false)}
        onConfirmCopy={confirmCopy}
      />

      <GoodsOrderConflictModal
        open={!!conflict}
        storeName={conflict?.storeName}
        localUpdatedAt={conflict?.localUpdatedAt}
        remoteUpdatedAt={conflict?.remoteUpdatedAt}
        onKeepLocal={() => {
          setConflict(null)
          flushCountsSync(selectedStore).catch(() => setSyncStatus('error'))
        }}
        onUseRemote={() => {
          if (!conflict) return
          const meta = getCountsMeta(conflict.storeId)
          setCountsForStore(conflict.storeId, {
            ...stripSyncMeta(conflict.remoteData),
            _clientUpdatedAt: conflict.remoteUpdatedAt || Date.now(),
          })
          meta.isDirty = false
          meta.lastSyncedToCloudAt = conflict.remoteUpdatedAt
          meta.lastAppliedRemoteAt = conflict.remoteUpdatedAt
          setConflict(null)
          setSyncStatus('synced')
          setLocalVersionAt(conflict.remoteUpdatedAt)
        }}
        onMerge={() => {
          if (!conflict) return
          const merged = mergeCountsData(countsLatestRef.current, conflict.remoteData)
          markCountsDirty(conflict.storeId, merged)
          setConflict(null)
        }}
      />
    </div>
  )

  return (
    <DualThemePage
      breadcrumbs={BC}
      title="貨物叫貨"
      description="輸入現有貨量，對照最低庫存後複製叫貨文字。"
      classic={
        <div className="p-4 text-sm text-text-secondary">
          貨物叫貨為 Club 介面。請切換到 Club 主題，或直接開啟{' '}
          <a className="underline" href="#/goods-order-test">
            #/goods-order-test
          </a>
          。
        </div>
      }
      studio={studio}
    />
  )
}

export default GoodsOrderManager
