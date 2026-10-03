import { CwButton, CwModalFrame } from '../components/studio/ui'
import { getCountsStorageKey, getDefaultOrderStoreName, getStoreName } from './goodsOrder/goodsOrderConstants'
import { GoodsOrderPreviewModal } from './goodsOrder/GoodsOrderPreviewModal'
import { GoodsOrderSettingsSheet } from './goodsOrder/GoodsOrderSettingsSheet'
import { GoodsOrderConflictModal } from './goodsOrder/GoodsOrderSyncUI'
import { getRevision, getUpdatedAt, getUpdatedBy, resolveCountsMerge, stripSyncMeta } from './goodsOrder/goodsOrderSync'
import { writeLocalRecord } from './useGoodsOrderManager'

/**
 * 叫貨功能的所有彈窗：空白確認、清除確認、品項設定、輸出預覽、同步衝突。
 * Club 版和新版的畫面共用；m 是 useGoodsOrderManager() 回傳的那一包。
 */
export function GoodsOrderDialogs({ m }) {
  const {
    selectedStore,
    showSettings,
    setShowSettings,
    showPreview,
    setShowPreview,
    showIncompleteConfirm,
    setShowIncompleteConfirm,
    showClearConfirm,
    setShowClearConfirm,
    previewWarning,
    isCopying,
    setSyncStatus,
    catalogSaveStatus,
    catalogCanUndo,
    catalogConflict,
    catalogVersions,
    catalogHistoryStatus,
    conflict,
    setConflict,
    setLocalVersionAt,
    actorName,
    setActorName,
    catalog,
    setCountsForStore,
    countsLatestRef,
    countsDebounceRef,
    countsConflictRef,
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
    progress,
    orderPreview,
    uncountedItemNames,
    partialExportText,
    catalogValidation,
    enteredCount,
    clearEnteredCounts,
    focusNextUnresolved,
    previewIncompleteResult,
    confirmCopy,
  } = m

  return (
    <>
      <CwModalFrame
        open={showIncompleteConfirm}
        onClose={() => setShowIncompleteConfirm(false)}
        title={`有 ${progress.uncounted} 項點貨數量空白`}
        description={`已完成 ${progress.completed}/${progress.total} 項。你仍可輸出目前結果。`}
        maxWidthClass="max-w-md"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <CwButton type="button" variant="secondary" onClick={previewIncompleteResult}>
              仍要輸出文字
            </CwButton>
            <CwButton
              type="button"
              variant="primary"
              onClick={() => {
                setShowIncompleteConfirm(false)
                focusNextUnresolved('')
              }}
            >
              回到空白品項
            </CwButton>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-[var(--cw-text)]">
          空白品項不會列入需叫貨判斷，輸出內容可能不完整：
        </p>
        <ul
          className="mt-3 grid max-h-56 grid-cols-1 gap-x-4 gap-y-1 overflow-y-auto rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] p-3 text-sm text-[var(--cw-text)] sm:grid-cols-2"
          aria-label="點貨數量空白的品項"
        >
          {uncountedItemNames.map((name, index) => (
            <li key={`${name}-${index}`} className="min-w-0 break-words">
              {name}
            </li>
          ))}
        </ul>
      </CwModalFrame>

      <CwModalFrame
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title={`清除${getStoreName(selectedStore)}點貨量？`}
        description={`目前有 ${enteredCount} 項已輸入。`}
        maxWidthClass="max-w-md"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <CwButton type="button" variant="secondary" onClick={() => setShowClearConfirm(false)}>
              取消
            </CwButton>
            <CwButton type="button" variant="danger" onClick={clearEnteredCounts}>
              清除全部點貨量
            </CwButton>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-[var(--cw-text)]">
          清除後，現有數量、叫貨量及人工調整都會恢復為未盤點，並同步到其他裝置；品項設定與其他店別不受影響。
        </p>
      </CwModalFrame>

      <GoodsOrderSettingsSheet
        open={showSettings}
        storeName={getStoreName(selectedStore)}
        orderStoreName={catalog.orderStoreName || getDefaultOrderStoreName(selectedStore)}
        items={catalog.items || []}
        validation={catalogValidation}
        saveStatus={catalogSaveStatus}
        canUndo={catalogCanUndo}
        actorName={actorName}
        lastUpdatedAt={getUpdatedAt(catalog)}
        lastUpdatedBy={getUpdatedBy(catalog)}
        revision={getRevision(catalog)}
        versions={catalogVersions}
        historyStatus={catalogHistoryStatus}
        conflict={catalogConflict}
        onUndo={undoCatalogChange}
        onRetrySave={retryCatalogSave}
        onChangeActorName={setActorName}
        onLoadVersions={loadCatalogHistory}
        onRestoreVersion={restoreCatalogVersion}
        onKeepMerged={keepMergedCatalog}
        onUseRemote={useRemoteCatalog}
        onClose={() => setShowSettings(false)}
        onChangeOrderStoreName={(name) =>
          persistCatalog(selectedStore, { ...catalog, orderStoreName: name })
        }
        onChangeItems={(items) => persistCatalog(selectedStore, { ...catalog, items })}
      />

      <GoodsOrderPreviewModal
        open={showPreview}
        text={previewWarning ? partialExportText : orderPreview.text}
        warning={previewWarning}
        partial={Boolean(previewWarning)}
        busy={isCopying}
        onClose={() => setShowPreview(false)}
        onConfirmCopy={confirmCopy}
      />

      <GoodsOrderConflictModal
        open={
          !!conflict &&
          !showSettings &&
          !showPreview &&
          !showIncompleteConfirm &&
          !showClearConfirm
        }
        storeName={conflict?.storeName}
        localUpdatedAt={conflict?.localUpdatedAt}
        remoteUpdatedAt={conflict?.remoteUpdatedAt}
        onKeepLocal={() => {
          if (conflict) delete countsConflictRef.current[conflict.storeId]
          setConflict(null)
          flushCountsSync(selectedStore, null, { force: true }).catch(() =>
            setSyncStatus(navigator.onLine ? 'error' : 'offline')
          )
        }}
        onUseRemote={() => {
          if (!conflict) return
          const meta = getCountsMeta(conflict.storeId)
          delete countsConflictRef.current[conflict.storeId]
          if (countsDebounceRef.current[conflict.storeId]) {
            clearTimeout(countsDebounceRef.current[conflict.storeId])
            countsDebounceRef.current[conflict.storeId] = null
          }
          const pending = getCountsPending(conflict.storeId)
          pending.replaceAll = false
          pending.editAt = 0
          pending.baseRevision = getRevision(conflict.remoteData)
          pending.baseUpdatedAt = getUpdatedAt(conflict.remoteData)
          pending.items = {}
          persistCountsPending(conflict.storeId)
          const nextRemote = {
            ...stripSyncMeta(conflict.remoteData),
            _clientUpdatedAt: conflict.remoteUpdatedAt || Date.now(),
            _updatedBy: getUpdatedBy(conflict.remoteData),
            _revision: getRevision(conflict.remoteData),
          }
          countsLatestRef.current = nextRemote
          writeLocalRecord(getCountsStorageKey(conflict.storeId), nextRemote)
          setCountsForStore(conflict.storeId, nextRemote)
          meta.isDirty = false
          meta.hasReceivedInitialRemote = true
          meta.lastLocalEditAt = 0
          meta.lastSyncedToCloudAt = conflict.remoteUpdatedAt
          meta.lastAppliedRemoteAt = conflict.remoteUpdatedAt
          setConflict(null)
          setSyncStatus('synced')
          setLocalVersionAt(conflict.remoteUpdatedAt)
        }}
        onMerge={() => {
          if (!conflict) return
          delete countsConflictRef.current[conflict.storeId]
          const pending = getCountsPending(conflict.storeId)
          const { merged, pending: nextPending } = resolveCountsMerge(
            countsLatestRef.current,
            conflict.remoteData,
            pending
          )
          // pending 物件本身被 ref 持有，就地更新；markCountsDirty 看到還有待送項目，不會再改基準
          Object.assign(pending, nextPending)
          countsLatestRef.current = {
            ...merged,
            _revision: getRevision(conflict.remoteData),
            _clientUpdatedAt: getUpdatedAt(conflict.remoteData),
          }
          markCountsDirty(conflict.storeId, merged, { replaceAll: nextPending.replaceAll })
          setConflict(null)
        }}
      />
    </>
  )
}
