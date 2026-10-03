import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'
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

/** 數字從 0 數上來；值變了就從畫面上現在的數字接著數 */
function CountUp({ value }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? value : 0)
  const shownRef = useRef(shown)
  useEffect(() => {
    if (reduce) {
      setShown(value)
      return undefined
    }
    const controls = animate(shownRef.current, value, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        shownRef.current = v
        setShown(Math.round(v))
      },
    })
    return () => controls.stop()
  }, [value, reduce])
  return shown
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
  const { baseline } = items[0].busy

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
            <div className={`text-2xl font-bold tabular-nums sm:text-3xl ${busy.index >= 106 ? hot : text}`}>
              {busy.diff > 0 ? '+' : busy.diff < 0 ? '−' : '±'}
              <CountUp value={Math.abs(busy.diff)} />%
              {/* 標籤等數字數完才浮出來，key 讓換日期時重播 */}
              <span
                key={busy.label}
                className="ml-1.5 inline-block animate-fade-in text-sm font-semibold"
                style={{ animationDelay: '0.45s', animationFillMode: 'both' }}
              >
                {busy.label}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className={`mt-2 text-[11px] leading-relaxed sm:text-xs ${muted}`}>
        跟平常的一天比（前三個月 T2 人數的中位數，約 {baseline.toLocaleString()} 人）；+10% 就是比平常多一成。依桃機 T2
        出發＋轉機預報，約提前兩天出來。
      </p>
    </div>
  )
}
