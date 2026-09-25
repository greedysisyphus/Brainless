import { busyIndexOn } from '../../../utils/flightData/busyIndex'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function shiftDate(date, days) {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const md = (date) => {
  const d = new Date(`${date}T12:00:00`)
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`
}

/** 選定日與之後兩天的忙碌指數；官方預報約提前兩天，所以後面的日子沒資料就不顯示 */
export default function BusyIndexStrip({ days, date, isStudio = false, isClub = false }) {
  if (!days || !date) return null
  const items = [0, 1, 2]
    .map((offset) => ({ offset, date: shiftDate(date, offset), busy: busyIndexOn(days, shiftDate(date, offset)) }))
    .filter((item) => item.busy)
  if (items.length === 0) return null

  const text = isStudio ? 'text-[var(--cw-text)]' : isClub ? 'text-[#3f2f2a]' : 'text-primary'
  const muted = isStudio ? 'text-[var(--cw-text-muted)]' : isClub ? 'text-[#76564b]' : 'text-text-secondary'
  const hot = isClub ? 'text-[#c84629]' : 'text-amber-500'
  const { peakDate } = items[0].busy

  return (
    <div
      className={`mb-4 p-4 sm:mb-6 sm:p-5 ${
        isStudio
          ? 'rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-surface)]'
          : 'rounded-xl border border-white/10 bg-surface/40 backdrop-blur-md'
      }`}
    >
      <h3 className={`text-base font-bold sm:text-lg ${text}`}>忙碌指數</h3>
      <div className="mt-2 grid grid-cols-3 gap-3">
        {items.map(({ offset, date: d, busy }) => (
          <div key={d} className={offset === 0 ? '' : 'opacity-75'}>
            <div className={`text-[11px] sm:text-xs ${muted}`}>{md(d)}</div>
            <div className={`text-2xl font-bold tabular-nums sm:text-3xl ${busy.index >= 85 ? hot : text}`}>
              {busy.index}
              <span className="ml-1.5 text-sm font-semibold">{busy.label}</span>
            </div>
          </div>
        ))}
      </div>
      <p className={`mt-2 text-[11px] leading-relaxed sm:text-xs ${muted}`}>
        100＝目前紀錄中最忙的 {md(peakDate)}（T2 預報 {days[peakDate].toLocaleString()} 人）。依桃機 T2 出發＋轉機預報，約提前兩天出來；
        有更忙的一天就會成為新的 100。
      </p>
    </div>
  )
}
