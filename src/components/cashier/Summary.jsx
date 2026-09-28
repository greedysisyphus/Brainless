import { CwInput } from '../studio/ui'
import { BASE_CASH, cashResult } from './cashMath'

/** 差額的顏色與文字；底部列也用 */
export function differenceTone(difference) {
  if (difference === 0) return { color: 'var(--cw-success)', bg: 'var(--cw-success-muted)', message: '金額正確' }
  if (difference > 0) return { color: 'var(--cw-warning)', bg: 'var(--cw-warning-muted)', message: '金額過多' }
  return { color: 'var(--cw-danger)', bg: 'var(--cw-danger-muted)', message: '金額不足' }
}

function Summary({ cashierTotal, drawerTotal, foreignTotal, posAmount, onPosAmountChange }) {
  const { actual, difference } = cashResult({ cashierTotal, drawerTotal, foreignTotal, posAmount })
  const tone = differenceTone(difference)

  return (
    <div className="space-y-4" role="region" aria-label="日結匯總">
      <CwInput
        label="POS 機金額"
        id="cashier-summary-pos"
        inputMode="numeric"
        pattern="[0-9]*"
        value={posAmount ? String(posAmount) : ''}
        onChange={(e) => onPosAmountChange(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
        placeholder="請輸入 POS 機金額"
      />

      <div className="text-sm tabular-nums">
        {[
          { k: '收銀機現金', v: cashierTotal },
          { k: '抽屜現金', v: drawerTotal },
          { k: '外幣總額', v: foreignTotal },
        ].map((row) => (
          <div key={row.k} className="flex min-h-10 items-center justify-between border-b border-[var(--cw-border)]">
            <span className="text-[var(--cw-text-muted)]">{row.k}</span>
            <span className="text-[var(--cw-text)]">${row.v.toLocaleString()}</span>
          </div>
        ))}
        <div className="flex min-h-10 items-center justify-between border-b border-[var(--cw-border-strong)]">
          <span className="text-[var(--cw-text-muted)]">基本金額</span>
          <span className="text-[var(--cw-text-muted)]">−${BASE_CASH.toLocaleString()}</span>
        </div>
        <div className="flex min-h-12 items-center justify-between">
          <span className="font-semibold text-[var(--cw-text)]">實際現金收入</span>
          <span className="text-xl font-bold text-[var(--cw-text)]">${actual.toLocaleString()}</span>
        </div>
      </div>

      {posAmount > 0 ? (
        <div
          className="flex min-h-12 items-center justify-between gap-3 rounded-[var(--cw-radius)] px-3"
          style={{ background: tone.bg, color: tone.color }}
          role="status"
        >
          <span className="text-sm font-semibold">差額 · {tone.message}</span>
          <span className="text-xl font-bold tabular-nums">${difference.toLocaleString()}</span>
        </div>
      ) : null}
    </div>
  )
}

export default Summary
