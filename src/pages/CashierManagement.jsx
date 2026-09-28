import { useState, useEffect, useRef } from 'react'
import DenominationCounter, { CountKeypad } from '../components/cashier/DenominationCounter'
import ForeignCurrency from '../components/cashier/ForeignCurrency'
import Summary, { differenceTone } from '../components/cashier/Summary'
import { DENOMINATIONS, cashResult, pressDecimalKey, pressKey, sumCounts, toTwd } from '../components/cashier/cashMath'
import { XMarkIcon, ArrowPathIcon, CalculatorIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { DualThemePage } from '../components/studio/DualThemePage'
import { CwButton, CwCard, CwGrid, CwInput, CwModalFrame, CwStack } from '../components/studio/ui'

const CASHIER_BC = [
  { label: 'Brainless', href: '#/sandwich' },
  { label: '門市營運', href: '#/' },
  { label: '收銀管理', href: '#/cashier' },
]

const BOXES = [
  { key: 'cashier', title: '收銀機現金', storageKey: 'cashierDenominations' },
  { key: 'drawer', title: '抽屜現金', storageKey: 'drawerDenominations' },
]

/** 鍵盤「下一個」的順序：收銀機由大到小，接著抽屜 */
const SLOTS = BOXES.flatMap((box) => DENOMINATIONS.map((value) => ({ box: box.key, value })))

function loadJson(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

function CashierManagement() {
  const [counts, setCounts] = useState(() =>
    Object.fromEntries(BOXES.map((box) => [box.key, loadJson(box.storageKey, {})])),
  )
  const [transactions, setTransactions] = useState(() => loadJson('foreignTransactions', []))
  const [posAmount, setPosAmount] = useState(() => Number(loadJson('posAmount', 0)) || 0)
  const [fxForm, setFxForm] = useState({ currency: 'USD', amount: '', rate: '' })
  // 鍵盤正在輸入的格子：點鈔 { box, value }，外幣 { fx: 'amount' | 'rate' }
  const [active, setActive] = useState(null)
  // 剛選到格子，第一個數字直接取代舊值。用 ref：連按兩鍵時 state 還沒更新
  const freshRef = useRef(false)
  const selectSlot = (slot) => {
    freshRef.current = true
    setActive(slot)
  }
  const [showChangeCalculator, setShowChangeCalculator] = useState(false)

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
  const tone = differenceTone(difference)

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
    setTransactions((prev) => [
      ...prev,
      { currency: fxForm.currency, amount, rate, localValue: toTwd(amount, rate), id: Date.now() },
    ])
    setFxForm((prev) => ({ ...prev, amount: '' }))
    setActive(null)
  }

  const goNext = () => {
    if (active.fx === 'amount') return selectSlot({ fx: 'rate' })
    if (active.fx === 'rate') return addFx()
    selectSlot(SLOTS[activeIndex + 1] || null)
  }

  // 實體鍵盤（iPad 外接、電腦）也能用；焦點在輸入框時不攔
  useEffect(() => {
    if (!active) return undefined
    const onKeyDown = (e) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea')) return
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

  return (
    <DualThemePage
      breadcrumbs={CASHIER_BC}
      title="收銀管理系統"
      description={`討厭算錢的第 ${dislikeDays} 天。`}
      studio={
        <>
          <CwStack className={`!gap-[var(--cw-stack-gap)] ${active ? 'pb-[28rem]' : 'pb-24'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CwButton type="button" variant="secondary" className="min-h-11 gap-2" onClick={() => setShowChangeCalculator(true)}>
                <CalculatorIcon className="h-5 w-5 shrink-0" />
                外幣找零
              </CwButton>
              <CwButton type="button" variant="ghost" className="min-h-11 gap-2 !text-[var(--cw-danger)]" onClick={resetAll}>
                <ArrowPathIcon className="h-5 w-5 shrink-0" />
                重置數據
              </CwButton>
            </div>
            <CwGrid className="!grid-cols-1 lg:!grid-cols-2">
              {BOXES.map((box) => (
                <CwCard
                  key={box.key}
                  title={box.title}
                  actions={
                    <span className="text-lg font-bold tabular-nums text-[var(--cw-text)]">
                      ${sumCounts(counts[box.key]).toLocaleString()}
                    </span>
                  }
                >
                  <DenominationCounter
                    title={box.title}
                    counts={counts[box.key]}
                    activeValue={active?.box === box.key ? active.value : null}
                    onSelect={(value) => selectSlot({ box: box.key, value })}
                    onClear={() => clearBox(box)}
                  />
                </CwCard>
              ))}
              <CwCard
                title="外幣交易"
                actions={<span className="text-lg font-bold tabular-nums text-[var(--cw-text)]">${foreignTotal.toLocaleString()}</span>}
              >
                <ForeignCurrency
                  transactions={transactions}
                  onChange={setTransactions}
                  form={fxForm}
                  onCurrencyChange={(currency) => setFxForm((prev) => ({ ...prev, currency, rate: '' }))}
                  activeField={active?.fx}
                  onSelectField={(fx) => selectSlot({ fx })}
                  onAdd={addFx}
                />
              </CwCard>
              <CwCard title="日結匯總">
                <Summary
                  cashierTotal={cashierTotal}
                  drawerTotal={drawerTotal}
                  foreignTotal={foreignTotal}
                  posAmount={posAmount}
                  onPosAmountChange={setPosAmount}
                />
              </CwCard>
            </CwGrid>
          </CwStack>

          <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--cw-border)] bg-[var(--cw-surface)] px-4 pt-2 shadow-[0_-4px_16px_rgba(28,25,20,0.06)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-md">
              <div className="flex min-h-11 items-center justify-between gap-3 text-sm tabular-nums">
                {active ? (
                  <span className="text-[var(--cw-text-muted)]">
                    {active.fx
                      ? `外幣 ${fxForm.currency} · ${active.fx === 'amount' ? '金額' : '匯率'}`
                      : `${BOXES.find((b) => b.key === active.box).title.replace('現金', '')} · $${active.value}`}
                  </span>
                ) : (
                  <span>
                    <span className="text-[var(--cw-text-muted)]">實際現金 </span>
                    <span className="font-bold text-[var(--cw-text)]">${actual.toLocaleString()}</span>
                  </span>
                )}
                <div className="flex items-center gap-1">
                  {posAmount > 0 ? (
                    <span className="font-semibold" style={{ color: tone.color }}>
                      差額 ${difference.toLocaleString()} · {tone.message.replace('金額', '')}
                    </span>
                  ) : (
                    <span className="text-[var(--cw-text-muted)]">填 POS 後顯示差額</span>
                  )}
                  {active ? (
                    <button
                      type="button"
                      onClick={() => setActive(null)}
                      className="cw-touch-target -mr-2 flex items-center justify-center rounded-[var(--cw-radius)] text-[var(--cw-text-muted)] hover:bg-[var(--cw-bg)] hover:text-[var(--cw-text)]"
                      aria-label="收起鍵盤"
                    >
                      <ChevronDownIcon className="h-5 w-5" />
                    </button>
                  ) : null}
                </div>
              </div>
              {active ? (
                <div className="mt-1">
                  <CountKeypad
                    decimal={Boolean(active.fx)}
                    nextLabel={active.fx === 'rate' || activeIndex === SLOTS.length - 1 ? (active.fx ? '新增' : '完成') : '下一個'}
                    onKey={pressActiveKey}
                    onNext={goNext}
                  />
                </div>
              ) : null}
            </div>
          </footer>

          <ForeignChangeModal open={showChangeCalculator} onClose={() => setShowChangeCalculator(false)} />
        </>
      }
    />
  )
}

function ForeignChangeModal({ open, onClose }) {
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
  const status =
    change === 0
      ? { color: 'var(--cw-success)', bg: 'var(--cw-success-muted)', title: '金額剛好，無需找零' }
      : change < 0
        ? { color: 'var(--cw-danger)', bg: 'var(--cw-danger-muted)', title: '金額不足，需補差額' }
        : { color: 'var(--cw-warning)', bg: 'var(--cw-warning-muted)', title: '需要找零' }

  return (
    <CwModalFrame
      open={open}
      onClose={onClose}
      title="外幣找零計算器"
      maxWidthClass="max-w-md"
      headerActions={
        <button
          type="button"
          onClick={onClose}
          className="cw-touch-target flex items-center justify-center rounded-[var(--cw-radius)] text-[var(--cw-text-muted)] hover:bg-[var(--cw-bg)] hover:text-[var(--cw-text)]"
          aria-label="關閉外幣找零計算器"
        >
          <XMarkIcon className="h-7 w-7" />
        </button>
      }
      footer={
        <CwButton
          type="button"
          variant="secondary"
          className="w-full min-h-11"
          onClick={() => {
            setForeignAmount('')
            setProductPrice('')
          }}
        >
          清除輸入
        </CwButton>
      }
    >
      <div className="space-y-4">
        <div>
          <CwInput
            label="匯率 (1 外幣 = ? TWD)"
            id="cashier-change-rate"
            inputMode="decimal"
            value={rate}
            onChange={(e) => changeRate(e.target.value)}
            onBlur={rememberRate}
            onKeyDown={(e) => e.key === 'Enter' && rememberRate()}
            error={rate && !(rateNum > 0) ? '匯率必須大於 0' : undefined}
            placeholder="輸入匯率"
          />
          {rateHistory.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {rateHistory.map((r) => (
                <div
                  key={r}
                  className="flex items-center rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)]"
                >
                  <button
                    type="button"
                    onClick={() => changeRate(r)}
                    className="min-h-10 px-3 text-sm font-medium tabular-nums text-[var(--cw-text)]"
                  >
                    {r}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRateHistory((prev) => prev.filter((x) => x !== r))}
                    className="flex min-h-10 w-8 items-center justify-center text-[var(--cw-text-muted)] hover:text-[var(--cw-danger)]"
                    aria-label={`刪除匯率 ${r}`}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => confirm('清除所有歷史匯率？') && setRateHistory([])}
                className="min-h-10 px-2 text-xs text-[var(--cw-text-muted)] hover:text-[var(--cw-danger)]"
              >
                清除全部
              </button>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CwInput
            label="商品價格 (TWD)"
            id="cashier-change-price"
            inputMode="decimal"
            value={productPrice}
            onChange={(e) => setProductPrice(e.target.value)}
            placeholder="0"
          />
          <CwInput
            label="客人付的外幣"
            id="cashier-change-foreign"
            inputMode="decimal"
            value={foreignAmount}
            onChange={(e) => setForeignAmount(e.target.value)}
            placeholder="0"
          />
        </div>

        {valid ? (
          <div
            className="rounded-[var(--cw-radius-lg)] border p-5 text-center"
            style={{ borderColor: status.color, background: status.bg }}
            role="status"
          >
            <div className="text-sm font-semibold" style={{ color: status.color }}>
              {status.title}
            </div>
            {change !== 0 ? (
              <>
                <div className="mt-2 text-4xl font-bold tabular-nums text-[var(--cw-text)]">${change.toLocaleString()}</div>
                <div className="mt-1 text-sm text-[var(--cw-text-muted)]">外幣等值：{(change / rateNum).toFixed(2)}</div>
              </>
            ) : null}
            <details className="mt-3 text-left">
              <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-[var(--cw-text-muted)]">
                計算步驟
              </summary>
              <div className="space-y-2 border-t border-[var(--cw-border)] pt-3 text-sm tabular-nums">
                <div className="flex justify-between">
                  <span className="text-[var(--cw-text-muted)]">外幣 {foreignNum} × 匯率 {rateNum}（捨去）</span>
                  <span className="font-semibold text-[var(--cw-text)]">${paidTwd.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--cw-text-muted)]">減商品價格</span>
                  <span className="font-semibold text-[var(--cw-danger)]">-${priceNum.toLocaleString()}</span>
                </div>
              </div>
            </details>
          </div>
        ) : null}
      </div>
    </CwModalFrame>
  )
}

export default CashierManagement
