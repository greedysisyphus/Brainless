/**
 * 忙碌指數：當天 T2 出發＋轉機預報人數 ÷ 目前紀錄中最忙的一天 × 100。
 * 用 T2 人數而不是班數：D7 店 9 月的每日來客跟 T2 人數 r=0.80，跟 D 區班數只有 0.35–0.68
 * （班數每天差不多，差的是每班載多少人）。最忙的一天被刷新時，舊日子的指數會跟著變低。
 */
export const BUSY_LEVELS = Object.freeze([
  { min: 100, label: '爆' },
  { min: 85, label: '忙' },
  { min: 70, label: '普通' },
  { min: 0, label: '輕鬆' }
])

export function busyIndexOn(days, date) {
  const total = days?.[date]
  if (!(total > 0)) return null
  const values = Object.values(days).filter((v) => v > 0)
  const peakDate = Object.keys(days).find((k) => days[k] === Math.max(...values))
  const index = Math.round((total / days[peakDate]) * 100)
  return { index, total, peakDate, label: BUSY_LEVELS.find((l) => index >= l.min).label }
}
