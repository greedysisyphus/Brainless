import { useEffect, useRef, useState } from 'react'
import { Keypad } from '../../components/bl/Keypad'
import { ToolPage, jumpTo } from '../../components/bl/shared'
import { InBlShell } from '../../components/bl/chrome'
import { CwAlert, CwButton } from '../../components/studio/ui'
import { FILTERS, STORES, displayCurrentInput, formatQuantity, getDefaultOrderStoreName, getStoreName, parseQuantity } from '../goodsOrder/goodsOrderConstants'
import { pressQty } from '../goodsOrder/goodsOrderKeys'
import { GoodsOrderSyncBanner } from '../goodsOrder/GoodsOrderSyncUI'
import { formatVersionTime, getUpdatedBy } from '../goodsOrder/goodsOrderSync'
import { GoodsOrderDialogs } from '../GoodsOrderDialogs'
import { quickCountValues, useGoodsOrderManager } from '../useGoodsOrderManager'
import '../../styles/bl-order.css'

// 新版叫貨。資料、多人同步、輸出流程全部用舊版同一份邏輯（useGoodsOrderManager）和同一組彈窗，
// 這裡只重畫畫面：點貨表（一項一列）＋一張跟著長出來的叫貨單。
// 點「現有」或叫貨量，底部長出數字鍵盤（不叫系統鍵盤）；可以打小數（1.5）也可以打分數（1 1/2）。
const FILTER_LABELS = { all: '全部', uncounted: '還沒盤', order: '要叫', later: '夠了' }
const WEEKDAYS = '日一二三四五六'
const pad = (n) => String(n).padStart(2, '0')
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches


const Tick = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function Order() {
  const m = useGoodsOrderManager()
  const { selectedStore, catalog, progress, rows, allRows, filter, syncStatus } = m
  const rootRef = useRef(null)
  const dockRef = useRef(null)
  const [cur, setCur] = useState(null) // 鍵盤現在打的是哪一項的哪一格：{ id, field: 'current' | 'order' }
  const fresh = useRef(false) // 剛選到這一格：第一個數字直接取代原本的值
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

  const curRow = cur ? allRows.find((r) => r.item.id === cur.id) : null
  const select = (id, field) => {
    fresh.current = true
    setCur({ id, field })
  }
  const textOf = (row, field) => (field === 'order' ? String(row.orderDisplay ?? '') : displayCurrentInput(row.entry.current))
  const write = (row, field, text) => (field === 'order' ? m.handleOrderQtyChange(row.item, text) : m.handleCurrentChange(row.item, text))
  const press = (key) => {
    if (!curRow) return
    const isFresh = fresh.current
    fresh.current = false
    if (key === 'half' && cur.field === 'order' && !curRow.item.allowFraction) return
    write(curRow, cur.field, pressQty(textOf(curRow, cur.field), key, isFresh))
  }
  // 下一項：往下找畫面上下一個還沒盤（或格式有誤）的品項；沒有了就收起鍵盤
  const next = () => {
    if (!cur) return
    const at = rows.findIndex((r) => r.item.id === cur.id)
    const ordered = [...rows.slice(at + 1), ...rows.slice(0, Math.max(at, 0))]
    const target = ordered.find((r) => r.item.id !== cur.id && (r.status === 'uncounted' || r.status === 'invalid'))
    if (target) select(target.item.id, 'current')
    else setCur(null)
  }
  // 快捷鍵：一按就填好這一項，直接跳下一項
  const quick = (value) => {
    if (!curRow) return
    m.handleCurrentChange(curRow.item, value)
    next()
  }

  // 實體鍵盤（桌機、接了鍵盤的 iPad）：直接打。正在彈窗的輸入框裡打字時不攔。
  const live = useRef({})
  live.current = { press, next, cur }
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!live.current.cur || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable], .modals')) return
      if (/^[0-9.]$/.test(e.key)) live.current.press(e.key)
      else if (e.key === '/') live.current.press('half')
      else if (e.key === 'Backspace') live.current.press('back')
      else if (e.key === 'Enter') live.current.next()
      else if (e.key === 'Escape') setCur(null)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  // 正在填的那一項如果被底部鍵盤擋住，捲到鍵盤上方看得到的地方
  const curKey = cur ? `${cur.id}|${cur.field}` : ''
  useEffect(() => {
    if (!curKey) return undefined
    const timer = setTimeout(() => {
      const el = rootRef.current?.querySelector('.item.on')
      const dockTop = dockRef.current?.getBoundingClientRect().top ?? window.innerHeight
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.bottom > dockTop - 12 || r.top < 130) window.scrollBy({ top: r.top + r.height / 2 - (130 + dockTop) / 2, behavior: reducedMotion() ? 'auto' : 'smooth' })
    }, 320) // 等鍵盤長出來才知道它多高
    return () => clearTimeout(timer)
  }, [curKey])
  // 換店、換篩選：正在填的那一項可能不在畫面上了
  useEffect(() => setCur(null), [selectedStore, filter])

  return (
    <ToolPage className="bl-order" path="/goods-order-test" section="庫存與報表" title="叫貨">
      <InBlShell.Provider value={true}>
        <div className="order" ref={rootRef}>
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
                  <div className={`item${cur?.id === item.id ? ' on' : ''}`} key={item.id} data-s={status}>
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
                    <button
                      type="button"
                      className={`have${status === 'invalid' ? ' bad' : ''}${cur?.id === item.id && cur.field === 'current' ? ' cur' : ''}`}
                      aria-pressed={cur?.id === item.id && cur.field === 'current'}
                      aria-label={`${item.name} 現有：${displayCurrentInput(entry.current) || '還沒盤'} ${item.unit}`}
                      aria-describedby={status === 'invalid' ? errorId : undefined}
                      onClick={() => select(item.id, 'current')}
                    >
                      <b className={displayCurrentInput(entry.current) ? '' : 'blank'}>{displayCurrentInput(entry.current) || '現有'}</b>
                      <u>{item.unit}</u>
                    </button>
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
                            <button
                              type="button"
                              className={`n${cur?.id === item.id && cur.field === 'order' ? ' cur' : ''}`}
                              aria-pressed={cur?.id === item.id && cur.field === 'order'}
                              aria-label={`${item.name} 叫貨量：${orderDisplay} ${item.unit}`}
                              onClick={() => select(item.id, 'order')}
                            >
                              {orderDisplay || '0'}
                            </button>
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

          {/* 底部鍵盤：點「現有」或叫貨量才長出來 */}
          <div className={`dock${curRow ? ' on' : ''}`} ref={dockRef} inert={curRow ? undefined : ''}>
            <div>
              <div className="head">
                <p className="what">
                  {curRow ? (
                    <>
                      <b>{curRow.item.name}</b>
                      {cur.field === 'order' ? '叫貨量' : '現有'}（{curRow.item.unit}）
                    </>
                  ) : null}
                </p>
                <button type="button" className="down" aria-label="收起鍵盤" onClick={() => setCur(null)}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>
              <p className={`calc${curRow && (curRow.status === 'invalid' || curRow.orderError) ? ' warn' : ''}`} aria-live="polite">
                {!curRow
                  ? null
                  : curRow.status === 'invalid'
                    ? curRow.currentError
                    : cur.field === 'order' && curRow.orderError
                      ? curRow.orderError
                      : `最低 ${formatQuantity(curRow.item.minStock)} ${curRow.item.unit}${curRow.item.note ? ` · ${curRow.item.note}` : ''}`}
              </p>
              <div className="quick">
                {curRow && cur.field === 'current'
                  ? quickCountValues(curRow.item).map((q) => (
                      <button key={q} type="button" onClick={() => quick(q)}>
                        {q}
                      </button>
                    ))
                  : null}
                {curRow && (cur.field === 'current' || curRow.item.allowFraction) ? (
                  <button type="button" className="half" aria-label="加二分之一" onClick={() => press('half')}>
                    ＋½
                  </button>
                ) : null}
              </div>
              <p className="hint">直接用鍵盤輸入，/ 是 ½，Enter 下一項，Esc 收起</p>
              <Keypad onKey={press}>
                <button type="button" onClick={() => curRow && write(curRow, cur.field, '')}>
                  清空
                </button>
                <button type="button" className="next wide" onClick={next}>
                  下一項
                </button>
              </Keypad>
            </div>
          </div>

          <div className="foot">
            <span>要叫</span>
            <b>{lines.length}</b>
            <span>項</span>
            <a href="#bl-order-slip" onClick={jumpTo('bl-order-slip')}>看叫貨單 ↓</a>
          </div>

          <div className="legacy modals">
            <GoodsOrderDialogs m={m} />
          </div>
        </div>
      </InBlShell.Provider>
    </ToolPage>
  )
}
