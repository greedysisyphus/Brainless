import { ArrowLeftIcon, Cog6ToothIcon, TrashIcon } from '@heroicons/react/24/outline'
import { DualThemePage } from '../components/studio/DualThemePage'
import { CwAlert, CwBadge, CwButton, CwInput } from '../components/studio/ui'
import { FILTERS, STORES, displayCurrentInput, formatQuantity, getDefaultOrderStoreName, getStoreName } from './goodsOrder/goodsOrderConstants'
import { GoodsOrderSyncBanner } from './goodsOrder/GoodsOrderSyncUI'
import { formatVersionTime, getUpdatedBy } from './goodsOrder/goodsOrderSync'
import { useGoodsOrderManager, BC, TABLE_GRID, tableInputClass, statusLabel, statusBadgeTone, quickCountValues, selectQuantityOnFocus } from './useGoodsOrderManager'
import { GoodsOrderDialogs } from './GoodsOrderDialogs'

function GoodsOrderManager() {
  const m = useGoodsOrderManager()
  const {
    selectedStore,
    setSelectedStore,
    filter,
    setFilter,
    showSettings,
    setShowSettings,
    showPreview,
    showIncompleteConfirm,
    showClearConfirm,
    setShowClearConfirm,
    copyMessage,
    copyMessageVariant,
    snapshotRetryPayload,
    isCopying,
    syncStatus,
    setSyncStatus,
    conflict,
    localVersionAt,
    focusedItemId,
    setFocusedItemId,
    catalog,
    countsDoc,
    quantityInputRefs,
    flushCountsSync,
    rows,
    progress,
    orderPreview,
    enteredCount,
    handleCurrentChange,
    applyCurrentQuick,
    handleCurrentKeyDown,
    handleOrderQtyChange,
    toggleForce,
    openCopyFlow,
    retrySnapshot,
    syncLabel,
    copyActionLabel,
  } = m

  const studio = (
    <div className="pb-32">
      <div
        inert={showSettings || showPreview || showIncompleteConfirm || showClearConfirm || !!conflict ? '' : undefined}
        aria-hidden={showSettings || showPreview || showIncompleteConfirm || showClearConfirm || !!conflict ? 'true' : undefined}
      >
      <header className="sticky top-0 z-40 border-b border-[var(--cw-border)] bg-[var(--cw-bg)]/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
          <div className="flex items-center gap-3">
            <a
              href="#/sandwich"
              aria-label="離開貨物叫貨"
              className="cw-touch-target inline-flex items-center gap-1 rounded-[var(--cw-radius)] px-2 text-sm font-semibold text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)] hover:text-[var(--cw-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
            >
              <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">離開</span>
            </a>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <h1 className="truncate text-xl font-bold tracking-tight text-[var(--cw-text)] sm:text-2xl">
                  貨物叫貨
                </h1>
                <span
                  className="shrink-0 text-xs text-[var(--cw-text-muted)]"
                  role="status"
                  aria-live="polite"
                >
                  {syncLabel}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-[var(--cw-text-muted)]">
                已盤 {progress.completed}/{progress.total}
                {progress.invalid > 0 ? ` · ${progress.invalid} 項格式有誤` : ''}
              </p>
            </div>
            <CwButton
              type="button"
              variant="ghost"
              className="px-2 sm:px-3"
              onClick={() => setShowSettings(true)}
              aria-label="開啟品項設定"
            >
              <Cog6ToothIcon className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">設定</span>
            </CwButton>
          </div>

          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--cw-border)]"
            role="progressbar"
            aria-label="盤點進度"
            aria-valuemin="0"
            aria-valuemax={progress.total}
            aria-valuenow={progress.completed}
          >
            <div
              className="h-full rounded-full bg-[var(--cw-brand)] transition-[width] duration-200 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1 rounded-[var(--cw-radius)] bg-[var(--cw-border)] p-1">
            {STORES.map((store) => (
              <button
                key={store.id}
                type="button"
                className={`cw-touch-target rounded-[10px] px-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--cw-focus-ring)] ${
                  selectedStore === store.id
                    ? 'bg-[var(--cw-mega-surface)] text-[var(--cw-text)] shadow-[var(--cw-shadow-sm)]'
                    : 'text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)]/60 hover:text-[var(--cw-text)]'
                }`}
                onClick={() => setSelectedStore(store.id)}
                aria-pressed={selectedStore === store.id}
              >
                {store.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-[var(--cw-text-muted)]">
          <span>三重➡️{catalog.orderStoreName || getDefaultOrderStoreName(selectedStore)}</span>
          <div className="flex flex-wrap items-center justify-end gap-1">
            {localVersionAt ? (
              <span className="mr-1">
                {syncStatus === 'synced' ? '雲端版本' : '本機變更'} {formatVersionTime(localVersionAt)}
                {getUpdatedBy(countsDoc)?.name ? ` · ${getUpdatedBy(countsDoc).name}` : ''}
              </span>
            ) : null}
            <CwButton
              type="button"
              variant="ghost"
              className="px-2 py-1.5 text-xs"
              disabled={enteredCount === 0}
              onClick={() => setShowClearConfirm(true)}
              aria-label={`清除${getStoreName(selectedStore)}已輸入的點貨量`}
            >
              <TrashIcon className="h-4 w-4" aria-hidden="true" />
              清除點貨量
            </CwButton>
          </div>
        </div>

        <GoodsOrderSyncBanner
          status={syncStatus}
          onRetry={() =>
            flushCountsSync(selectedStore).catch(() => setSyncStatus('error'))
          }
        />

        {copyMessage ? (
          <CwAlert variant={copyMessageVariant} className="mb-3">
            <div className="flex flex-wrap items-center justify-between gap-2" role="status" aria-live="polite">
              <span>{copyMessage}</span>
              {snapshotRetryPayload ? (
                <CwButton
                  type="button"
                  variant="secondary"
                  disabled={isCopying}
                  onClick={retrySnapshot}
                >
                  {isCopying ? '重試中…' : '重試更新快照'}
                </CwButton>
              ) : null}
            </div>
          </CwAlert>
        ) : null}

        <div
          className="mb-4 grid grid-cols-4 gap-1 sm:flex sm:overflow-x-auto sm:pb-1"
          role="group"
          aria-label="篩選盤點品項"
        >
          {FILTERS.map((f) => {
            const count = f.id === 'all' ? progress.total : progress[f.id]
            return (
              <CwButton
                key={f.id}
                type="button"
                variant={filter === f.id ? 'primary' : 'ghost'}
                className="min-w-0 shrink-0 whitespace-nowrap px-1 text-[11px] sm:px-3 sm:text-sm"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
              >
                {f.label} <span className="tabular-nums">{count}</span>
              </CwButton>
            )
          })}
        </div>

        {/* 手機：以連續盤點列取代逐張卡片。 */}
        <ul className="overflow-hidden rounded-[var(--cw-radius-lg)] bg-[var(--cw-mega-surface)] shadow-[var(--cw-shadow-sm)] md:hidden">
          {rows.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-[var(--cw-text-muted)]">
              此篩選沒有品項；可切換其他狀態繼續盤點。
            </li>
          ) : (
            rows.map(({ item, entry, status, currentError, orderError, orderDisplay, showOrderControls }, index) => {
              const currentDisplay = displayCurrentInput(entry.current)
              const showMobileQuicks = focusedItemId === item.id
              const quicks = showMobileQuicks ? quickCountValues(item) : []
              const errorId = `goods-current-error-${item.id}`

              return (
                <li
                  key={item.id}
                  className={`px-4 py-4 ${
                    index < rows.length - 1 ? 'border-b border-[var(--cw-border)]' : ''
                  } ${status === 'order' ? 'bg-[var(--cw-brand-muted)]/40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--cw-text)]">
                        {item.name}
                        <span className="ml-1.5 font-normal text-[var(--cw-text-muted)]">
                          {item.unit}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--cw-text-muted)]">
                        {item.note ? `${item.note} · ` : ''}最低庫存{' '}
                        {formatQuantity(item.minStock)}
                      </p>
                    </div>
                    <CwBadge
                      tone={statusBadgeTone(status)}
                      className="shrink-0 normal-case tracking-normal"
                    >
                      {statusLabel(status)}
                    </CwBadge>
                  </div>

                  <label className="mt-3 block">
                    <span className="mb-1.5 block text-xs font-semibold text-[var(--cw-text-muted)]">
                      現有數量
                    </span>
                    <input
                      ref={(node) => {
                        quantityInputRefs.current[`mobile:${item.id}`] = node
                      }}
                      name={`goods-current-${item.id}`}
                      type="text"
                      // 數字鍵盤：以前用完整鍵盤是為了能打「1 1/2」，但每次都要切鍵盤；
                      // 常用的分數有快捷按鈕（½），其他打小數（1.5）即可，解析兩種都吃
                      inputMode="decimal"
                      enterKeyHint="next"
                      autoComplete="off"
                      value={currentDisplay}
                      onChange={(event) => handleCurrentChange(item, event.target.value)}
                      onFocus={(event) => {
                        setFocusedItemId(item.id)
                        selectQuantityOnFocus(event)
                      }}
                      onKeyDown={(event) => handleCurrentKeyDown(event, item)}
                      onBlur={() => setFocusedItemId((id) => (id === item.id ? null : id))}
                      placeholder="例如 0、0.5、1.5"
                      aria-label={`${item.name} 現有數量`}
                      aria-invalid={status === 'invalid'}
                      aria-describedby={status === 'invalid' ? errorId : undefined}
                      className="min-h-[52px] w-full rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] px-4 text-xl tabular-nums text-[var(--cw-text)] placeholder:text-sm placeholder:text-[var(--cw-text-muted)] focus:border-[var(--cw-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--cw-focus-ring)]"
                    />
                  </label>

                  {status === 'invalid' ? (
                    <p id={errorId} className="mt-1.5 text-sm text-[var(--cw-danger)]">
                      {currentError}
                    </p>
                  ) : null}

                  {showMobileQuicks ? (
                    <div
                      className="mt-2 grid gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${quicks.length}, minmax(0, 1fr))`,
                      }}
                      aria-label={`${item.name} 快速輸入`}
                    >
                      {quicks.map((quantity) => (
                        <button
                          key={quantity}
                          type="button"
                          className="cw-touch-target rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-mega-surface)] px-2 text-sm font-semibold tabular-nums text-[var(--cw-text)] hover:border-[var(--cw-border-strong)] hover:bg-[var(--cw-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--cw-focus-ring)]"
                          onPointerDown={(event) => {
                            // 在按鈕取得焦點、快捷鍵區被卸載前完成輸入。
                            event.preventDefault()
                            applyCurrentQuick(item, quantity)
                          }}
                          onClick={(event) => {
                            // 鍵盤觸發的 click.detail 為 0；滑鼠／觸控已在上方處理。
                            if (event.detail === 0) applyCurrentQuick(item, quantity)
                          }}
                        >
                          {quantity}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {showOrderControls ? (
                    <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-[var(--cw-border)] pt-3">
                      {status === 'order' ? (
                        <div className="min-w-[8rem] flex-1">
                          <CwInput
                            label="叫貨量"
                            name={`goods-order-${item.id}`}
                            inputMode="decimal"
                            enterKeyHint="done"
                            autoComplete="off"
                            value={orderDisplay}
                            aria-label={`${item.name} 叫貨量`}
                            error={orderError}
                            onFocus={selectQuantityOnFocus}
                            onChange={(event) => handleOrderQtyChange(item, event.target.value)}
                          />
                        </div>
                      ) : (
                        <p className="min-w-[8rem] flex-1 text-sm text-[var(--cw-text-muted)]">
                          本次庫存足夠，不會加入叫貨文字
                        </p>
                      )}
                      <CwButton
                        type="button"
                        variant="secondary"
                        onClick={() => toggleForce(item, entry, status)}
                      >
                        {status === 'order' ? '從叫貨移除' : '加入叫貨'}
                      </CwButton>
                    </div>
                  ) : null}
                </li>
              )
            })
          )}
        </ul>

        {/* iPad+：保持同列比較，但所有觸控控制至少 44px。 */}
        <div className="hidden overflow-hidden rounded-[var(--cw-radius-lg)] bg-[var(--cw-mega-surface)] shadow-[var(--cw-shadow-sm)] md:block">
          <div
            className={`grid ${TABLE_GRID} h-11 items-center border-b border-[var(--cw-border)] bg-[var(--cw-bg)] px-4 text-xs font-semibold text-[var(--cw-text-muted)]`}
          >
            <span>品名</span>
            <span className="text-center">現有</span>
            <span className="text-center">最低</span>
            <span className="text-center">叫貨</span>
            <span className="text-center">狀態</span>
            <span className="text-center">調整</span>
          </div>
          {rows.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-[var(--cw-text-muted)]">
              此篩選沒有品項；可切換其他狀態繼續盤點。
            </div>
          ) : (
            rows.map(({ item, entry, status, currentError, orderError, orderDisplay, showOrderControls }, index) => {
              const currentDisplay = displayCurrentInput(entry.current)
              const currentErrorId = `goods-table-current-error-${item.id}`
              const orderErrorId = `goods-table-order-error-${item.id}`

              return (
                <div
                  key={item.id}
                  className={`grid ${TABLE_GRID} min-h-14 items-center px-4 py-1.5 ${
                    index < rows.length - 1 ? 'border-b border-[var(--cw-border)]' : ''
                  } ${status === 'order' ? 'bg-[var(--cw-brand-muted)]/40' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--cw-text)]">
                      <span className="font-semibold">{item.name}</span>
                      <span className="ml-1 text-[var(--cw-text-muted)]">{item.unit}</span>
                    </p>
                    {item.note ? (
                      <p className="truncate text-xs text-[var(--cw-text-muted)]">{item.note}</p>
                    ) : null}
                  </div>
                  <div className="min-w-0 py-1">
                    <input
                      ref={(node) => {
                        quantityInputRefs.current[`table:${item.id}`] = node
                      }}
                      name={`goods-current-${item.id}`}
                      type="text"
                      // 數字鍵盤：以前用完整鍵盤是為了能打「1 1/2」，但每次都要切鍵盤；
                      // 常用的分數有快捷按鈕（½），其他打小數（1.5）即可，解析兩種都吃
                      inputMode="decimal"
                      enterKeyHint="next"
                      autoComplete="off"
                      className={`${tableInputClass} ${
                        status === 'invalid' ? 'border-[var(--cw-danger)]' : ''
                      }`}
                      value={currentDisplay}
                      onFocus={selectQuantityOnFocus}
                      onChange={(event) => handleCurrentChange(item, event.target.value)}
                      onKeyDown={(event) => handleCurrentKeyDown(event, item)}
                      aria-label={`${item.name} 現有數量`}
                      aria-invalid={status === 'invalid'}
                      aria-describedby={status === 'invalid' ? currentErrorId : undefined}
                    />
                    {status === 'invalid' ? (
                      <p id={currentErrorId} className="mt-1 text-center text-xs leading-tight text-[var(--cw-danger)]">
                        {currentError}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-center text-sm tabular-nums text-[var(--cw-text-muted)]">
                    {formatQuantity(item.minStock)}
                  </span>
                  <div className="min-w-0 py-1 text-center">
                    {status === 'order' ? (
                      <>
                        <input
                          name={`goods-order-${item.id}`}
                          type="text"
                          inputMode="decimal"
                          enterKeyHint="done"
                          autoComplete="off"
                          className={`${tableInputClass} ${
                            orderError ? 'border-[var(--cw-danger)]' : ''
                          }`}
                          value={orderDisplay}
                          onFocus={selectQuantityOnFocus}
                          onChange={(event) => handleOrderQtyChange(item, event.target.value)}
                          aria-label={`${item.name} 叫貨量`}
                          aria-invalid={Boolean(orderError)}
                          aria-describedby={orderError ? orderErrorId : undefined}
                        />
                        {orderError ? (
                          <p id={orderErrorId} className="mt-1 text-xs leading-tight text-[var(--cw-danger)]">
                            {orderError}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-sm text-[var(--cw-text-muted)]" aria-hidden="true">
                        —
                      </span>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <CwBadge
                      tone={statusBadgeTone(status)}
                      className="normal-case tracking-normal"
                    >
                      {statusLabel(status)}
                    </CwBadge>
                  </div>
                  <div className="flex justify-center">
                    {showOrderControls ? (
                      <button
                        type="button"
                        className="cw-touch-target rounded-[var(--cw-radius)] px-2 text-xs font-semibold text-[var(--cw-brand)] hover:bg-[var(--cw-brand-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--cw-focus-ring)]"
                        onClick={() => toggleForce(item, entry, status)}
                      >
                        {status === 'order' ? '從叫貨移除' : '加入叫貨'}
                      </button>
                    ) : (
                      <span className="text-xs text-transparent select-none" aria-hidden="true">—</span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--cw-border-strong)] bg-[var(--cw-bg)]/96 px-4 pt-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="hidden min-w-0 flex-1 sm:block">
            <p className="text-sm font-semibold text-[var(--cw-text)]">
              已盤 {progress.completed}/{progress.total}
            </p>
            <p className="truncate text-xs text-[var(--cw-text-muted)]">
              {progress.unresolved > 0
                ? `未盤點 ${progress.uncounted} 項 · 錯誤 ${progress.invalid + progress.orderInvalid} 項`
                : `需叫貨 ${orderPreview.orderCount} 項`}
            </p>
          </div>
          <CwButton
            type="button"
            variant="primary"
            className="w-full sm:w-auto sm:min-w-[20rem]"
            onClick={openCopyFlow}
            disabled={isCopying}
          >
            {isCopying ? '處理中…' : copyActionLabel}
          </CwButton>
        </div>
      </footer>
      </div>

      <GoodsOrderDialogs m={m} />
    </div>
  )

  return (
    <DualThemePage
      breadcrumbs={BC}
      title="貨物叫貨"
      description="輸入現有貨量，對照最低庫存後複製叫貨文字。"
      hideStudioHeader
      studio={studio}
    />
  )
}

export default GoodsOrderManager
