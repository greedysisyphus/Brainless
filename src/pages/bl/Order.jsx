import { useEffect, useState } from 'react'
import { ToolPage } from '../../components/bl/shared'
import { InBlShell } from '../../components/bl/chrome'
import { CwAlert, CwButton } from '../../components/studio/ui'
import { FILTERS, STORES, displayCurrentInput, formatQuantity, getDefaultOrderStoreName, getStoreName, parseQuantity } from '../goodsOrder/goodsOrderConstants'
import { GoodsOrderSyncBanner } from '../goodsOrder/GoodsOrderSyncUI'
import { formatVersionTime, getUpdatedBy } from '../goodsOrder/goodsOrderSync'
import { GoodsOrderDialogs } from '../GoodsOrderDialogs'
import { quickCountValues, selectQuantityOnFocus, useGoodsOrderManager } from '../useGoodsOrderManager'
import '../../styles/bl-order.css'

// 新版叫貨。資料、多人同步、輸出流程全部用舊版同一份邏輯（useGoodsOrderManager）和同一組彈窗，
// 這裡只重畫畫面：點貨表（一項一列）＋一張跟著長出來的叫貨單。
const FILTER_LABELS = { all: '全部', uncounted: '還沒盤', order: '要叫', later: '夠了' }
const WEEKDAYS = '日一二三四五六'
const pad = (n) => String(n).padStart(2, '0')

const Tick = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function Order() {
  const m = useGoodsOrderManager()
  const { selectedStore, catalog, progress, rows, allRows, filter, syncStatus, focusedItemId } = m
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  const orderTo = catalog.orderStoreName || getDefaultOrderStoreName(selectedStore)
  const lines = allRows.filter((r) => r.status === 'order' && !r.orderError)
  const blocking = progress.invalid + progress.orderInvalid
  const updatedBy = getUpdatedBy(m.countsDoc)?.name

  // ＋／−：整數品項一次 1，可填分數的一次 0.5；最少 1 個單位（要不叫就按「不叫」）
  const step = (row, dir) => {
    const cur = parseQuantity(row.orderDisplay)
    const unit = row.item.allowFraction ? 0.5 : 1
    const next = Math.max(unit, (cur.kind === 'value' ? cur.value : 0) + dir * unit)
    m.handleOrderQtyChange(row.item, formatQuantity(next))
  }

  return (
    <ToolPage className="bl-order" path="/goods-order-test" section="庫存與報表" title="叫貨">
      <InBlShell.Provider value={true}>
        <div className="order">
          <div className="stores" role="group" aria-label="分店">
            {STORES.map((s) => (
              <button key={s.id} type="button" aria-pressed={selectedStore === s.id} onClick={() => m.setSelectedStore(s.id)}>
                {s.name}
              </button>
            ))}
            <button type="button" className="setup" onClick={() => m.setShowSettings(true)}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d="M2 4h7M12 4h2M2 8h2M7 8h7M2 12h8M13 12h1" />
                <circle cx="10.5" cy="4" r="1.6" />
                <circle cx="5.5" cy="8" r="1.6" />
                <circle cx="11.5" cy="12" r="1.6" />
              </svg>
              品項設定
            </button>
          </div>

          <div className="legacy notice">
            <GoodsOrderSyncBanner status={syncStatus} onRetry={() => m.flushCountsSync(selectedStore).catch(() => m.setSyncStatus('error'))} />
            {m.copyMessage ? (
              <CwAlert variant={m.copyMessageVariant}>
                <div className="flex flex-wrap items-center justify-between gap-2" role="status" aria-live="polite">
                  <span>{m.copyMessage}</span>
                  {m.snapshotRetryPayload ? (
                    <CwButton type="button" variant="secondary" disabled={m.isCopying} onClick={m.retrySnapshot}>
                      {m.isCopying ? '重試中…' : '重試更新快照'}
                    </CwButton>
                  ) : null}
                </div>
              </CwAlert>
            ) : null}
          </div>

          <div className="split">
            <div className="ledger">
              <div className="bar-top">
                <p className="prog">
                  <b>{progress.completed}</b>
                  <span>
                    ／ {progress.total} 項已盤{progress.invalid > 0 ? ` · ${progress.invalid} 項格式有誤` : ''}
                  </span>
                  <span className="sync" role="status" aria-live="polite">
                    {m.syncLabel}
                  </span>
                </p>
                <div className="meter" role="progressbar" aria-label="盤點進度" aria-valuemin="0" aria-valuemax={progress.total} aria-valuenow={progress.completed}>
                  <i style={{ width: `${progress.percent}%` }} />
                </div>
                <div className="filters" role="group" aria-label="篩選盤點品項">
                  {FILTERS.map((f) => (
                    <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => m.setFilter(f.id)}>
                      {FILTER_LABELS[f.id] || f.label}
                      <b>{f.id === 'all' ? progress.total : progress[f.id]}</b>
                    </button>
                  ))}
                </div>
              </div>
              <div className="cols" aria-hidden="true">
                <span>品名</span>
                <span>現有</span>
                <span>最低</span>
                <span>叫貨</span>
              </div>

              {rows.length === 0 ? <p className="empty">這個篩選沒有品項，可以切到其他狀態繼續盤。</p> : null}
              {rows.map((row) => {
                const { item, entry, status, currentError, orderError, orderDisplay } = row
                const skipped = status === 'later' && entry.forceInclude === false
                const errorId = `bl-order-error-${item.id}`
                return (
                  <div className="item" key={item.id} data-s={status}>
                    <div className="name">
                      <h3>
                        {item.name}
                        <small>{item.unit}</small>
                      </h3>
                      <p className="note">
                        <span className="min-inline">
                          最低 {formatQuantity(item.minStock)}
                          {item.note ? ' · ' : ''}
                        </span>
                        {item.note}
                      </p>
                    </div>
                    <label className={`have${status === 'invalid' ? ' bad' : ''}`}>
                      <input
                        ref={(node) => {
                          m.quantityInputRefs.current[`table:${item.id}`] = node
                        }}
                        name={`goods-current-${item.id}`}
                        type="text"
                        inputMode="decimal"
                        enterKeyHint="next"
                        autoComplete="off"
                        placeholder="現有"
                        value={displayCurrentInput(entry.current)}
                        aria-label={`${item.name} 現有幾${item.unit}`}
                        aria-invalid={status === 'invalid'}
                        aria-describedby={status === 'invalid' ? errorId : undefined}
                        onChange={(e) => m.handleCurrentChange(item, e.target.value)}
                        onFocus={(e) => {
                          m.setFocusedItemId(item.id)
                          selectQuantityOnFocus(e)
                        }}
                        onBlur={() => m.setFocusedItemId((id) => (id === item.id ? null : id))}
                        onKeyDown={(e) => m.handleCurrentKeyDown(e, item)}
                      />
                      <u>{item.unit}</u>
                    </label>
                    <span className="min" aria-label="最低庫存">
                      {formatQuantity(item.minStock)}
                    </span>
                    <div className="ord">
                      {status === 'uncounted' ? (
                        '還沒盤'
                      ) : status === 'invalid' ? (
                        <span className="err" id={errorId}>
                          {currentError}
                        </span>
                      ) : status === 'order' ? (
                        <>
                          <span className="arrow">→</span>
                          <span className={`qty${orderError ? ' bad' : ''}`}>
                            <button type="button" aria-label={`少叫一點`} onClick={() => step(row, -1)}>
                              −
                            </button>
                            <input
                              name={`goods-order-${item.id}`}
                              type="text"
                              inputMode="decimal"
                              enterKeyHint="done"
                              autoComplete="off"
                              value={orderDisplay}
                              aria-label={`${item.name} 叫貨量`}
                              aria-invalid={Boolean(orderError)}
                              style={{ width: `${Math.max(2, String(orderDisplay).length + 0.6)}ch` }}
                              onFocus={selectQuantityOnFocus}
                              onChange={(e) => m.handleOrderQtyChange(item, e.target.value)}
                            />
                            <i>{item.unit}</i>
                            <button type="button" aria-label={`多叫一點`} onClick={() => step(row, 1)}>
                              ＋
                            </button>
                          </span>
                          <button type="button" className="skip" onClick={() => m.toggleForce(item, entry, status)}>
                            不叫
                          </button>
                        </>
                      ) : skipped ? (
                        <>
                          低於最低，這次不叫
                          <button type="button" className="also" onClick={() => m.toggleForce(item, entry, status)}>
                            還是叫
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="ok">
                            <Tick />夠
                          </span>
                          <button type="button" className="also" onClick={() => m.toggleForce(item, entry, status)}>
                            也叫一些
                          </button>
                        </>
                      )}
                    </div>
                    {orderError ? <p className="err wide">{orderError}</p> : null}
                    {/* 正在填的那一項：常用數字一按就填（0、½、最低−1、最低），填完自動跳下一項 */}
                    {focusedItemId === item.id ? (
                      <div className="quick" aria-label={`${item.name} 快速輸入`}>
                        {quickCountValues(item).map((q) => (
                          <button
                            key={q}
                            type="button"
                            onPointerDown={(e) => {
                              // 在按鈕搶走焦點、這排消失之前就填進去
                              e.preventDefault()
                              m.applyCurrentQuick(item, q)
                            }}
                            onClick={(e) => e.detail === 0 && m.applyCurrentQuick(item, q)}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>

            {/* 叫貨單：一邊盤，這張要傳出去的單就一邊長出來 */}
            <aside className="slip-wrap" id="bl-order-slip" aria-label="叫貨單">
              <div className="slip">
                <p className="to">
                  三重<i>→</i>
                  {orderTo}
                </p>
                <p className="when">
                  {now.getMonth() + 1} 月 {now.getDate()} 日 星期{WEEKDAYS[now.getDay()]} · {pad(now.getHours())}:{pad(now.getMinutes())}
                </p>
                {lines.length ? (
                  <>
                    <ol>
                      {lines.map(({ item, orderDisplay }) => (
                        <li key={item.id}>
                          <span>{item.name}</span>
                          <b>
                            {orderDisplay}
                            <i>{item.unit}</i>
                          </b>
                        </li>
                      ))}
                    </ol>
                    <p className="sumline">
                      共
                      <b>
                        {lines.length}
                        <i>項</i>
                      </b>
                    </p>
                  </>
                ) : (
                  <p className="none">還沒有要叫的。填了「現有」，低於最低的會自動列進來。</p>
                )}
              </div>
              <button className="copy" type="button" disabled={m.isCopying} onClick={m.openCopyFlow}>
                {m.isCopying ? '處理中…' : blocking > 0 ? `先修正 ${blocking} 個錯誤` : lines.length ? '預覽並複製叫貨文字' : progress.uncounted > 0 ? '預覽目前結果' : '完成盤點 · 這次都夠'}
              </button>
              {progress.uncounted > 0 ? <p className="warn">還有 {progress.uncounted} 項沒盤，叫貨單只含已經盤過的。</p> : null}
              <div className="tools">
                <button type="button" className="danger" disabled={m.enteredCount === 0} onClick={() => m.setShowClearConfirm(true)} aria-label={`清除${getStoreName(selectedStore)}已輸入的點貨量`}>
                  清除點貨量
                </button>
              </div>
              {m.localVersionAt ? (
                <p className="ver">
                  {syncStatus === 'synced' ? '雲端版本' : '本機變更'} {formatVersionTime(m.localVersionAt)}
                  {updatedBy ? ` · ${updatedBy}` : ''}
                </p>
              ) : null}
            </aside>
          </div>

          <div className="foot">
            <span>要叫</span>
            <b>{lines.length}</b>
            <span>項</span>
            <a href="#bl-order-slip">看叫貨單 ↓</a>
          </div>

          <div className="legacy modals">
            <GoodsOrderDialogs m={m} />
          </div>
        </div>
      </InBlShell.Provider>
    </ToolPage>
  )
}
