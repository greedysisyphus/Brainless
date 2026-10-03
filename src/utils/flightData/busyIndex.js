/**
 * 忙碌指數：當天 T2 出發＋轉機預報人數 ÷ 平常的一天 × 100。100＝跟平常一樣，110＝比平常多一成。
 * 畫面上顯示的是 diff（index − 100），也就是「比平常多／少幾 %」。
 * 「平常」＝前 91 天（約一季）的中位數；用中位數是因為連假那一兩天不會把基準拉高，
 * 用一季是因為只看 28 天時，春節那種長假會把基準墊高一成，假期中和節後一個月都被壓低。
 * （以前拿最高紀錄當 100，一個中秋連假就把其他日子全壓在「普通」）。
 * 用 T2 人數而不是班數：D7 店 9 月的每日來客跟 T2 人數 r=0.80，跟 D 區班數只有 0.35–0.68
 * （班數每天差不多，差的是每班載多少人）。
 */
export const BUSY_LEVELS = Object.freeze([
  { min: 118, label: '爆' },
  { min: 106, label: '忙' },
  { min: 95, label: '普通' },
  { min: 0, label: '輕鬆' }
])

const BASELINE_DAYS = 91
/** 前面不到這麼多天有資料時（剛開始記錄、或查很早的日期），改用全部紀錄的中位數 */
const MIN_BASELINE_DAYS = 14

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const dayNumber = (date) => Math.round(Date.parse(`${date}T00:00:00Z`) / 86400000)

/** +8%、−2%、±0% */
export const formatBusyDiff = (diff) => `${diff > 0 ? '+' : diff < 0 ? '−' : '±'}${Math.abs(diff)}%`

export function busyIndexOn(days, date) {
  const total = days?.[date]
  if (!(total > 0)) return null
  const today = dayNumber(date)
  const recent = Object.keys(days)
    .filter((k) => days[k] > 0 && today - dayNumber(k) >= 1 && today - dayNumber(k) <= BASELINE_DAYS)
    .map((k) => days[k])
  const baseline = Math.round(
    median(recent.length >= MIN_BASELINE_DAYS ? recent : Object.values(days).filter((v) => v > 0))
  )
  const index = Math.round((total / baseline) * 100)
  return { index, diff: index - 100, total, baseline, label: BUSY_LEVELS.find((l) => index >= l.min).label }
}
