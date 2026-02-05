/**
 * 台灣 2026 年公眾假期與連假起始日，用於「日型」統計（平日／週末／公眾假期／假期前）。
 * 可重疊：同一天可同時屬於多個日型。
 */

/** 給定 YYYY-MM-DD，回傳加減 n 天後的 YYYY-MM-DD */
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 2026 年所有公眾假期日期（含個別假日與連假每一天） */
const PUBLIC_HOLIDAY_DATES_2026 = new Set([
  '2026-01-01', // 元旦
  '2026-02-14', '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', // 春節
  '2026-02-27', '2026-02-28', '2026-03-01', // 和平紀念日
  '2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06', // 清明／兒童節
  '2026-05-01', '2026-05-02', '2026-05-03', // 勞動節
  '2026-06-19', '2026-06-20', '2026-06-21', // 端午
  '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', // 中秋／教師節
  '2026-10-09', '2026-10-10', '2026-10-11', // 國慶
  '2026-10-24', '2026-10-25', '2026-10-26', // 光復節
  '2026-12-25', '2026-12-26', '2026-12-27'  // 行憲紀念日
])

/** 連假起始日（僅用起始日計算「假期前」：起始日前 1 天、前 2 天） */
const CONSECUTIVE_HOLIDAY_STARTS_2026 = [
  '2026-01-01', '2026-02-14', '2026-02-27', '2026-04-03', '2026-05-01',
  '2026-06-19', '2026-09-25', '2026-10-09', '2026-10-24', '2026-12-25'
]

/** 假期前日期：每段連假起始日的前 1 天、前 2 天 */
const PRE_HOLIDAY_DATES_2026 = new Set(
  CONSECUTIVE_HOLIDAY_STARTS_2026.flatMap(start => [
    addDays(start, -1),
    addDays(start, -2)
  ])
)

/**
 * 是否為 2026 公眾假期
 * @param {string} dateStr YYYY-MM-DD
 */
export function isPublicHoliday2026(dateStr) {
  return PUBLIC_HOLIDAY_DATES_2026.has(dateStr)
}

/**
 * 是否為 2026 假期前（連假起始日前 1 天或前 2 天）
 * @param {string} dateStr YYYY-MM-DD
 */
export function isPreHoliday2026(dateStr) {
  return PRE_HOLIDAY_DATES_2026.has(dateStr)
}

export { PUBLIC_HOLIDAY_DATES_2026, PRE_HOLIDAY_DATES_2026 }
