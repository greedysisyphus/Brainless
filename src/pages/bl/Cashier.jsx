import { useEffect, useRef, useState } from 'react'
import { ToolPage } from '../../components/bl/shared'
import {
  BASE_CASH,
  DENOMINATIONS,
  cashResult,
  pressDecimalKey,
  pressKey,
  sumCounts,
  toTwd,
} from '../../components/cashier/cashMath'
import '../../styles/bl-cashier.css'

// 狀態與儲存位置跟舊版收銀管理（pages/CashierManagement.jsx）完全相同：
// 同樣的 localStorage key，兩版並存期間在哪一版點鈔，另一版都看得到。
const BOXES = [
  { key: 'cashier', title: '收銀機現金', storageKey: 'cashierDenominations' },
  { key: 'drawer', title: '抽屜現金', storageKey: 'drawerDenominations' },
]
/** 鍵盤「下一個」的順序：收銀機由大到小，接著抽屜 */
const SLOTS = BOXES.flatMap((box) => DENOMINATIONS.map((value) => ({ box: box.key, value })))
const CURRENCIES = [
  ['USD', '美元'],
  ['EUR', '歐元'],
  ['JPY', '日圓'],
  ['CNY', '人民幣'],
  ['HKD', '港幣'],
]
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']

const money = (n) => `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US')}`

function loadJson(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

/** 差額的顏色與文字。dock 是深色底，另給一組亮的 */
function toneOf(difference) {
  if (difference === 0) return { color: 'var(--ok)', onDark: '#a9d6a0', message: '金額正確' }
  if (difference > 0) return { color: 'var(--over)', onDark: '#e6c377', message: '金額過多' }
  return { color: 'var(--short)', onDark: '#f0a091', message: '金額不足' }
}

const Svg = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)
const X = 'M6 6l12 12M18 6L6 18'

/** 金額、匯率是按鈕，點了用頁面底部的數字鍵盤輸入，不叫系統鍵盤 */
function Slot({ label, value, placeholder, active, onSelect }) {
  const ref = useRef(null)
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [active])
  return (
    <div className="f">
      {label}
      <button
        ref={ref}
        type="button"
        className={`slot${value ? '' : ' empty'}`}
        aria-pressed={active}
        aria-label={`${label}：${value || '未填'}`}
        onClick={onSelect}
      >
        {value || (active ? '' : placeholder)}
      </button>
    </div>
  )
}

function Denomination({ value, count, active, onSelect }) {
  const ref = useRef(null)
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [active])
  const n = Number(count) || 0
  return (
    <button ref={ref} type="button" className="den" aria-pressed={active} aria-label={`${value} 元，${n} ${value >= 100 ? '張' : '個'}`} onClick={onSelect}>
      <span className="face">{value}</span>
      <span className="count">
        ×<b className={n === 0 && !active ? 'zero' : ''}>{n}</b>
        {value >= 100 ? '張' : '個'}
      </span>
      <span className="sub">{n ? money(n * value) : ''}</span>
    </button>
  )
}

function ChangeDialog({ dialogRef }) {
  const [rate, setRate] = useState(() => localStorage.getItem('lastExchangeRate') || '')
  const [foreignAmount, setForeignAmount] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [rateHistory, setRateHistory] = useState(() => loadJson('rateHistory', []))

  useEffect(() => {
    localStorage.setItem('rateHistory', JSON.stringify(rateHistory))
  }, [rateHistory])

  const changeRate = (value) => {
    setRate(value)
    if (parseFloat(value) > 0) localStorage.setItem('lastExchangeRate', value)
  }
  const rememberRate = () => {
    if (!(parseFloat(rate) > 0)) return
    setRateHistory((prev) => [rate, ...prev.filter((r) => r !== rate)].slice(0, 10))
  }

  const rateNum = parseFloat(rate)
  const foreignNum = parseFloat(foreignAmount)
  const priceNum = parseFloat(productPrice)
  const valid = rateNum > 0 && foreignNum > 0 && priceNum > 0
  const paidTwd = valid ? toTwd(foreignNum, rateNum) : 0
  const change = paidTwd - priceNum
  const tone = !valid ? '' : change === 0 ? 'var(--ok)' : change < 0 ? 'var(--short)' : 'var(--over)'

  return (
    <dialog ref={dialogRef} aria-labelledby="bl-change-title">
      <h2 id="bl-change-title">
        外幣找零
        <button type="button" className="x" aria-label="關閉外幣找零" onClick={() => dialogRef.current?.close()}>
          <Svg d={X} />
        </button>
      </h2>
      <label>
        匯率（1 外幣 = ? TWD）
        <input
          inputMode="decimal"
          placeholder="輸入匯率"
          value={rate}
          onChange={(e) => changeRate(e.target.value)}
          onBlur={rememberRate}
          onKeyDown={(e) => e.key === 'Enter' && rememberRate()}
        />
      </label>
      {rateHistory.length > 0 ? (
        <div className="rates">
          {rateHistory.map((r) => (
            <span key={r}>
              <button type="button" className="use" onClick={() => changeRate(r)}>
                {r}
              </button>
              <button type="button" className="del" aria-label={`刪除匯率 ${r}`} onClick={() => setRateHistory((prev) => prev.filter((x) => x !== r))}>
                <Svg d={X} size={14} />
              </button>
            </span>
          ))}
          <button type="button" className="text" onClick={() => confirm('清除所有歷史匯率？') && setRateHistory([])}>
            清除全部
          </button>
        </div>
      ) : null}
      <label>
        商品價格（TWD）
        <input inputMode="decimal" placeholder="0" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} />
      </label>
      <label>
        客人付的外幣
        <input inputMode="decimal" placeholder="0" value={foreignAmount} onChange={(e) => setForeignAmount(e.target.value)} />
      </label>
      <div className="change" role="status" style={{ '--tone': tone }}>
        {!valid ? (
          '填好三個數字就會算出找零。'
        ) : (
          <>
            {change === 0 ? '金額剛好，無需找零' : change < 0 ? '金額不足，需補差額' : '需要找零'}
            {change !== 0 ? <b>{money(change)}</b> : null}
            <small>
              外幣 {foreignNum} × 匯率 {rateNum}（捨去）= {money(paidTwd)}
              {change !== 0 ? `，外幣等值 ${(change / rateNum).toFixed(2)}` : ''}
            </small>
          </>
        )}
      </div>
      <button
        type="button"
        className="text"
        onClick={() => {
          setForeignAmount('')
          setProductPrice('')
        }}
      >
        清除輸入
      </button>
    </dialog>
  )
}

export default function Cashier() {
  const [counts, setCounts] = useState(() => Object.fromEntries(BOXES.map((box) => [box.key, loadJson(box.storageKey, {})])))
  const [transactions, setTransactions] = useState(() => loadJson('foreignTransactions', []))
  const [posAmount, setPosAmount] = useState(() => Number(loadJson('posAmount', 0)) || 0)
  const [fxForm, setFxForm] = useState({ currency: 'USD', amount: '', rate: '' })
  // 鍵盤正在輸入的格子：點鈔 { box, value }，外幣 { fx: 'amount' | 'rate' }
  const [active, setActive] = useState(null)
  // 剛選到格子，第一個數字直接取代舊值。用 ref：連按兩鍵時 state 還沒更新
  const freshRef = useRef(false)
  const dialogRef = useRef(null)
  const selectSlot = (slot) => {
    freshRef.current = true
    setActive(slot)
  }

  useEffect(() => {
    BOXES.forEach((box) => localStorage.setItem(box.storageKey, JSON.stringify(counts[box.key])))
  }, [counts])
  useEffect(() => {
    localStorage.setItem('foreignTransactions', JSON.stringify(transactions))
  }, [transactions])
  useEffect(() => {
    localStorage.setItem('posAmount', String(posAmount))
  }, [posAmount])

  const cashierTotal = sumCounts(counts.cashier)
  const drawerTotal = sumCounts(counts.drawer)
  const foreignTotal = transactions.reduce((sum, t) => sum + t.localValue, 0)
  const { actual, difference } = cashResult({ cashierTotal, drawerTotal, foreignTotal, posAmount })
  const tone = toneOf(difference)
  const activeIndex = active?.box ? SLOTS.findIndex((s) => s.box === active.box && s.value === active.value) : -1

  const pressActiveKey = (key) => {
    const fresh = freshRef.current
    freshRef.current = false
    if (active.fx) {
      setFxForm((prev) => ({ ...prev, [active.fx]: pressDecimalKey(prev[active.fx], key, fresh) }))
      return
    }
    if (key === '.') return
    setCounts((prev) => ({
      ...prev,
      [active.box]: { ...prev[active.box], [active.value]: pressKey(prev[active.box][active.value], key, fresh) },
    }))
  }

  // 新增後留著匯率：同幣種常常連收好幾張；換幣種才清
  const addFx = () => {
    const amount = parseFloat(fxForm.amount)
    const rate = parseFloat(fxForm.rate)
    if (!(amount > 0)) return selectSlot({ fx: 'amount' })
    if (!(rate > 0)) return selectSlot({ fx: 'rate' })
    setTransactions((prev) => [...prev, { currency: fxForm.currency, amount, rate, localValue: toTwd(amount, rate), id: Date.now() }])
    setFxForm((prev) => ({ ...prev, amount: '' }))
    setActive(null)
  }

  const goNext = () => {
    if (active.fx === 'amount') return selectSlot({ fx: 'rate' })
    if (active.fx === 'rate') return addFx()
    selectSlot(SLOTS[activeIndex + 1] || null)
  }

  // 實體鍵盤（iPad 外接、電腦）也能用；焦點在輸入框或找零視窗時不攔
  useEffect(() => {
    if (!active) return undefined
    const onKeyDown = (e) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea, dialog')) return
      if (/^[0-9.]$/.test(e.key)) pressActiveKey(e.key)
      else if (e.key === 'Backspace') pressActiveKey('back')
      else if (e.key === 'Enter' || e.key === 'Tab') goNext()
      else if (e.key === 'Escape') setActive(null)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const resetAll = () => {
    if (!confirm('確定要清空這次的點鈔、外幣交易與 POS 金額嗎？\n\n歷史匯率會保留。清空後無法復原。')) return
    setCounts({ cashier: {}, drawer: {} })
    setTransactions([])
    setPosAmount(0)
    setActive(null)
  }
  const clearBox = (box) => {
    if (!confirm(`確定清除「${box.title}」所有張數？`)) return
    setCounts((prev) => ({ ...prev, [box.key]: {} }))
    if (active?.box === box.key) setActive(null)
  }

  const dislikeDays = Math.floor((new Date() - new Date('2024-05-01')) / (1000 * 60 * 60 * 24))
  const isLast = active && (active.fx === 'rate' || activeIndex === SLOTS.length - 1)
  const where = !active
    ? ''
    : active.fx
      ? `外幣 ${fxForm.currency}・${active.fx === 'amount' ? '金額' : '匯率'}`
      : `${BOXES.find((b) => b.key === active.box).title.replace('現金', '')}・$${active.value}`

  return (
    <ToolPage
      className={`bl-cashier${active ? ' keys' : ''}`}
      path="/cashier"
      section="門市營運"
      title="收銀管理"
      titleExtra={
        <>
          <p>討厭算錢的第 {dislikeDays} 天。</p>
          <div className="acts">
            <button type="button" className="text" onClick={() => dialogRef.current?.showModal()}>
              外幣找零
            </button>
            <button type="button" className="text" onClick={resetAll}>
              重置數據
            </button>
          </div>
        </>
      }
    >
      <div className="split">
        <div>
          <div className="boxes">
            {BOXES.map((box, k) => (
              <section key={box.key} aria-label={box.title} style={{ animationDelay: `${0.08 + k * 0.08}s` }}>
                <div className="sec-head">
                  <h2>{box.title}</h2>
                  <b>{money(sumCounts(counts[box.key]))}</b>
                </div>
                {DENOMINATIONS.map((value) => (
                  <Denomination
                    key={value}
                    value={value}
                    count={counts[box.key][value]}
                    active={active?.box === box.key && active.value === value}
                    onSelect={() => selectSlot({ box: box.key, value })}
                  />
                ))}
                <button type="button" className="text" onClick={() => clearBox(box)}>
                  清除{box.title.replace('現金', '')}
                </button>
              </section>
            ))}
          </div>

          <section style={{ animationDelay: '0.25s' }} aria-label="外幣交易">
            <div className="sec-head">
              <h2>外幣交易</h2>
              <b>{money(foreignTotal)}</b>
            </div>
            <div className="fx-form">
              <label>
                幣種
                <select value={fxForm.currency} onChange={(e) => setFxForm((prev) => ({ ...prev, currency: e.target.value, rate: '' }))}>
                  {CURRENCIES.map(([code, name]) => (
                    <option key={code} value={code}>
                      {code}（{name}）
                    </option>
                  ))}
                </select>
              </label>
              <Slot label="金額" value={fxForm.amount} placeholder="外幣金額" active={active?.fx === 'amount'} onSelect={() => selectSlot({ fx: 'amount' })} />
              <Slot label="匯率" value={fxForm.rate} placeholder="1 外幣 = ? TWD" active={active?.fx === 'rate'} onSelect={() => selectSlot({ fx: 'rate' })} />
              <button type="button" className="add" onClick={addFx}>
                新增
              </button>
            </div>
            {transactions.map((t) => (
              <div className="tx" key={t.id}>
                <b>
                  {t.currency} {t.amount.toLocaleString()}
                </b>
                <span>@ {t.rate}</span>
                <em>{money(t.localValue)}</em>
                <button
                  type="button"
                  className="x"
                  aria-label={`刪除 ${t.currency} ${t.amount} 交易`}
                  onClick={() => setTransactions(transactions.filter((x) => x.id !== t.id))}
                >
                  <Svg d={X} />
                </button>
              </div>
            ))}
            {transactions.length > 0 ? (
              <button type="button" className="text" onClick={() => confirm('確定清除所有外幣交易？') && setTransactions([])}>
                清除全部
              </button>
            ) : null}
          </section>
        </div>

        <section className="summary" style={{ animationDelay: '0.35s' }} aria-label="日結匯總">
          <span className="label">實際現金收入</span>
          <div className="actual">
            <b>{money(actual)}</b>
          </div>
          {[
            ['收銀機現金', cashierTotal],
            ['抽屜現金', drawerTotal],
            ['外幣總額', foreignTotal],
            ['基本金額', -BASE_CASH],
          ].map(([label, value]) => (
            <div className="sum-row" key={label}>
              <span>{label}</span>
              <b>{money(value)}</b>
            </div>
          ))}
          <label className="pos">
            POS 機金額
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              placeholder="請輸入 POS 機金額"
              value={posAmount ? String(posAmount) : ''}
              onChange={(e) => setPosAmount(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
            />
          </label>
          <div className="diff" role="status" style={{ '--tone': posAmount > 0 ? tone.color : '' }}>
            {posAmount > 0 ? (
              <>
                <span>差額・{tone.message}</span>
                <b>{money(difference)}</b>
              </>
            ) : (
              <span>填 POS 金額後顯示差額</span>
            )}
          </div>
        </section>
      </div>

      <div className="dock">
        <div>
          <div className="bar" style={{ '--tone': posAmount > 0 ? tone.onDark : '' }}>
            {active ? (
              <span>{where}</span>
            ) : (
              <>
                <span>實際現金</span>
                <b>{money(actual)}</b>
              </>
            )}
            <span className="r">{posAmount > 0 ? `差額 ${money(difference)}・${tone.message.replace('金額', '')}` : '填 POS 後顯示差額'}</span>
            {active ? (
              <button type="button" className="down" aria-label="收起鍵盤" onClick={() => setActive(null)}>
                <Svg d="M6 9l6 6 6-6" size={22} />
              </button>
            ) : null}
          </div>
          {active ? (
            <div className="pad">
              {KEYS.map((key) =>
                key === '.' && !active.fx ? (
                  <span key={key} />
                ) : (
                  <button key={key} type="button" aria-label={key === 'back' ? '倒退' : key} onClick={() => pressActiveKey(key)}>
                    {key === 'back' ? <Svg d="M9 6h11v12H9l-5-6zM12 10l4 4M16 10l-4 4" size={24} /> : key}
                  </button>
                )
              )}
              <button type="button" className="next" onClick={goNext}>
                {isLast ? (active.fx ? '新增' : '完成') : '下一個'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <ChangeDialog dialogRef={dialogRef} />
    </ToolPage>
  )
}
