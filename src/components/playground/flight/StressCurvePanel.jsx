import {
  formatMinuteSpan,
  formatStressShiftSpan,
  isStressSlotInSupportPeriod
} from '../../../utils/flightData/stressSlots'

const VIEW_W = 600
const VIEW_H = 150
const PAD_X = 8
const PAD_TOP = 24
const PAD_BOTTOM = 18

/**
 * 一天的壓力曲線。取代舊的「高峰 Top5／離峰 Top5」兩張清單：
 * 排名看不出一天的形狀，相鄰的同一個峰會互相擠掉，而尾端沒班機的槽永遠並列離峰第一。
 * 曲線 + 一句結論（最忙的一小時、最長的一段空檔）回答的是同一個問題，但看得懂。
 */
export default function StressCurvePanel({
  shifts,
  series,
  summary,
  shiftKey,
  onShiftChange,
  countUnit = '班',
  supportFrom = null,
  supportUntil = null,
  showSupport = true,
  isStudio = false,
  isClub = false
}) {
  const text = isStudio ? 'text-[var(--cw-text)]' : isClub ? 'text-[#3f2f2a]' : 'text-primary'
  const muted = isStudio ? 'text-[var(--cw-text-muted)]' : isClub ? 'text-[#76564b]' : 'text-text-secondary'
  const barFill = isClub ? '#d9b9ad' : isStudio ? 'rgba(120,120,130,0.45)' : 'rgba(255,255,255,0.22)'
  const peakFill = isClub ? '#c84629' : '#f59e0b'
  const quietFill = isClub ? 'rgba(118,86,75,0.14)' : 'rgba(34,211,238,0.16)'
  const supportStroke = isClub ? '#9f3d28' : '#818cf8'
  const axisText = isClub ? '#76564b' : isStudio ? 'rgba(90,90,100,0.85)' : 'rgba(255,255,255,0.5)'

  const n = series.length
  const innerW = VIEW_W - PAD_X * 2
  const chartH = VIEW_H - PAD_TOP - PAD_BOTTOM
  const step = n > 0 ? innerW / n : 0
  const barW = Math.max(1, step - 1)
  const maxScore = summary && summary.maxScore > 0 ? summary.maxScore : 1
  const xAt = (i) => PAD_X + i * step
  const yAt = (score) => PAD_TOP + chartH - (score / maxScore) * chartH

  const quietIdx = summary?.quiet
    ? series.reduce((acc, s, i) => {
        if (s.startMin >= summary.quiet.startMin && s.startMin + 60 <= summary.quiet.endMin) acc.push(i)
        return acc
      }, [])
    : []
  const peakIdx = summary?.peak ? series.findIndex((s) => s.startMin === summary.peak.startMin) : -1

  // 兩小時一個刻度就夠，再密手機讀不到
  const tickEvery = 8
  const fmtCount = (v) => (Number.isInteger(v) ? v : v.toFixed(1))

  const headline = summary
    ? summary.maxScore > 0
      ? `最忙 ${summary.peak.label}（${fmtCount(summary.peak.flightCount)} ${countUnit}）· 最鬆 ${formatMinuteSpan(summary.quiet.startMin, summary.quiet.endMin)}`
      : '這個區間沒有航班'
    : ''

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1" role="group" aria-label="掃描班別">
        {shifts.map((sh) => {
          const k = sh.key
          const active = shiftKey === k
          return (
            <button
              key={k}
              type="button"
              onClick={() => onShiftChange(k)}
              aria-pressed={active}
              className={`flex-1 min-w-[4.75rem] rounded-md px-2 py-1.5 text-center transition-colors ${
                active
                  ? isClub
                    ? 'border border-[#65463c] bg-[#76564b] text-white shadow-sm'
                    : 'border border-white/25 bg-white/15 text-primary shadow-sm'
                  : isClub
                    ? 'border border-[#d9b9ad] bg-white/80 text-[#76564b] hover:bg-[#f2ddd6]'
                    : 'border border-white/10 bg-black/10 text-text-secondary hover:bg-white/10'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              <span className="block text-xs font-semibold">{sh.label}</span>
              <span className="mt-0.5 block text-[10px] font-normal leading-tight tabular-nums opacity-75">
                {formatStressShiftSpan(k, shifts)}
              </span>
            </button>
          )
        })}
      </div>

      <p className={`text-sm font-semibold ${text}`}>{headline}</p>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full"
        style={{ height: 'auto' }}
        role="img"
        aria-label={headline}
      >
        {quietIdx.length > 0 && (
          <rect
            x={xAt(quietIdx[0])}
            y={PAD_TOP}
            width={xAt(quietIdx[quietIdx.length - 1]) + barW - xAt(quietIdx[0])}
            height={chartH}
            fill={quietFill}
            rx={3}
          />
        )}
        {series.map((slot, i) => {
          const isPeak = i === peakIdx
          // 最低 1px：0 分的槽也要看得到基線，滑上去才有數字可讀
          const h = Math.max(1, chartH - (yAt(slot.score) - PAD_TOP))
          const inSupport = showSupport && isStressSlotInSupportPeriod(slot.startMin, supportFrom, supportUntil)
          return (
            <rect
              key={slot.startMin}
              x={xAt(i)}
              y={PAD_TOP + chartH - h}
              width={barW}
              height={h}
              rx={1}
              fill={isPeak ? peakFill : barFill}
              stroke={inSupport ? supportStroke : 'none'}
              strokeWidth={inSupport ? 0.6 : 0}
            >
              <title>{`${slot.label}｜${fmtCount(slot.flightCount)} ${countUnit}｜分數 ${slot.score.toFixed(2)}`}</title>
            </rect>
          )
        })}
        {peakIdx >= 0 && summary.maxScore > 0 && (
          <text
            x={Math.min(VIEW_W - PAD_X, Math.max(PAD_X + 34, xAt(peakIdx) + barW / 2))}
            y={PAD_TOP - 8}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill={peakFill}
          >
            {summary.peak.label}
          </text>
        )}
        {series.map((slot, i) =>
          i % tickEvery === 0 ? (
            <text
              key={`t${slot.startMin}`}
              x={xAt(i) + barW / 2}
              y={VIEW_H - 5}
              textAnchor="middle"
              fontSize="10"
              fill={axisText}
            >
              {slot.label.slice(0, 5)}
            </text>
          ) : null
        )}
      </svg>

      <p className={`text-[11px] leading-relaxed ${muted}`}>
        每根柱子是「該時刻起算 60 分鐘」的登機壓力（滑過看班次與分數）。橘色為最忙的一小時，
        淺色區塊是最長的一段空檔（低於尖峰兩成）
        {showSupport && supportFrom && supportUntil ? '，外框標示落在晚班支援期間的時段' : ''}。
      </p>
    </div>
  )
}
