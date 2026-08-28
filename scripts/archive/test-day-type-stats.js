/**
 * 測試：日型統計邏輯與台灣 2026 公眾假日
 * 執行：node scripts/test-day-type-stats.js
 */

import { isPublicHoliday2026, isPreHoliday2026, PUBLIC_HOLIDAY_DATES_2026, PRE_HOLIDAY_DATES_2026 } from '../src/utils/taiwanHolidays2026.js'

// ---------------------------------------------------------------------------
// 1. 台灣 2026 公眾假日日期檢查（對照使用者提供的清單）
// ---------------------------------------------------------------------------
const EXPECTED_2026 = {
  元旦: ['2026-01-01'],
  春節: ['2026-02-14', '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22'],
  和平紀念日: ['2026-02-27', '2026-02-28', '2026-03-01'],
  清明兒童節: ['2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06'],
  勞動節: ['2026-05-01', '2026-05-02', '2026-05-03'],
  端午: ['2026-06-19', '2026-06-20', '2026-06-21'],
  中秋教師節: ['2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'],
  國慶: ['2026-10-09', '2026-10-10', '2026-10-11'],
  光復節: ['2026-10-24', '2026-10-25', '2026-10-26'],
  行憲: ['2026-12-25', '2026-12-26', '2026-12-27']
}

function checkHolidayDates() {
  console.log('========== 1. 台灣 2026 公眾假日日期檢查 ==========')
  const allExpected = new Set(Object.values(EXPECTED_2026).flat())
  const inCode = PUBLIC_HOLIDAY_DATES_2026
  const missing = [...allExpected].filter(d => !inCode.has(d))
  const extra = [...inCode].filter(d => !allExpected.has(d))
  if (missing.length) console.log('  ❌ 缺少日期:', missing)
  if (extra.length) console.log('  ❌ 多出日期:', extra)
  for (const [name, dates] of Object.entries(EXPECTED_2026)) {
    const ok = dates.every(d => inCode.has(d))
    console.log(`  ${ok ? '✓' : '✗'} ${name}: ${dates.length} 天`)
  }
  if (!missing.length && !extra.length) console.log('  ✓ 公眾假期清單與預期一致')
  return missing.length === 0 && extra.length === 0
}

// ---------------------------------------------------------------------------
// 2. 假期前日期（連假起始日前 1、前 2 天）
// ---------------------------------------------------------------------------
const CONSECUTIVE_STARTS = [
  '2026-01-01', '2026-02-14', '2026-02-27', '2026-04-03', '2026-05-01',
  '2026-06-19', '2026-09-25', '2026-10-09', '2026-10-24', '2026-12-25'
]

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function checkPreHolidayDates() {
  console.log('\n========== 2. 假期前日期（連假起始日前 1、前 2 天）==========')
  const expectedPre = new Set(
    CONSECUTIVE_STARTS.flatMap(start => [addDays(start, -1), addDays(start, -2)])
  )
  for (const start of CONSECUTIVE_STARTS) {
    const d1 = addDays(start, -1)
    const d2 = addDays(start, -2)
    const ok = PRE_HOLIDAY_DATES_2026.has(d1) && PRE_HOLIDAY_DATES_2026.has(d2)
    console.log(`  ${ok ? '✓' : '✗'} 起始 ${start} → 假期前: ${d2}, ${d1}`)
  }
  const missing = [...expectedPre].filter(d => !PRE_HOLIDAY_DATES_2026.has(d))
  if (missing.length) console.log('  ❌ 缺少假期前日期:', missing)
  return missing.length === 0
}

// ---------------------------------------------------------------------------
// 3. 日型邏輯模擬（與 FlightDataContent dayTypeStats 一致）
// ---------------------------------------------------------------------------
function getDayOfWeek(dateStr) {
  return new Date(dateStr + 'T00:00:00').getDay() // 0=日, 1=一, ..., 6=六
}

function computeDayTypeStats(multiDayData) {
  const acc = {
    平日: { total: 0, days: 0 },
    週末: { total: 0, days: 0 },
    公眾假期: { total: 0, days: 0 },
    '假期前（連假起始日前 2 天）': { total: 0, days: 0 }
  }
  multiDayData.forEach(day => {
    const dateStr = day.date
    const dow = getDayOfWeek(dateStr)
    const totalFlights = day.totalFlights ?? 0
    if (dow >= 1 && dow <= 5) {
      acc.平日.total += totalFlights
      acc.平日.days += 1
    }
    if (dow === 0 || dow === 5 || dow === 6) {
      acc.週末.total += totalFlights
      acc.週末.days += 1
    }
    if (isPublicHoliday2026(dateStr)) {
      acc.公眾假期.total += totalFlights
      acc.公眾假期.days += 1
    }
    if (isPreHoliday2026(dateStr)) {
      acc['假期前（連假起始日前 2 天）'].total += totalFlights
      acc['假期前（連假起始日前 2 天）'].days += 1
    }
  })
  const order = ['平日', '週末', '公眾假期', '假期前（連假起始日前 2 天）']
  return order.map(type => {
    const { total, days } = acc[type]
    const average = days > 0 ? Math.round((total / days) * 10) / 10 : 0
    return { type, total, days, average }
  }).filter(row => row.days > 0)
}

function runDayTypeScenarios() {
  console.log('\n========== 3. 日型統計模擬 ==========')

  // 情境 A：只有平日（一～五）
  const onlyWeekdays = [
    { date: '2026-01-05', totalFlights: 30 }, // 一
    { date: '2026-01-06', totalFlights: 28 }, // 二
    { date: '2026-01-07', totalFlights: 25 }  // 三
  ]
  const statsA = computeDayTypeStats(onlyWeekdays)
  const aOk = statsA.some(s => s.type === '平日' && s.days === 3 && s.total === 83) &&
    statsA.some(s => s.type === '週末' && s.days === 0) === false
  console.log('  情境 A（僅一～三）: 平日 3 天、週末 0 天')
  console.log('    結果:', statsA.map(s => `${s.type}: ${s.days}天, 平均${s.average}`).join(' | '))
  console.log(`    ${aOk ? '✓' : '✗'} 平日 3 天、總和 83`)

  // 情境 B：含星期五（同時平日與週末）
  const withFriday = [
    { date: '2026-01-09', totalFlights: 20 }, // 五
    { date: '2026-01-10', totalFlights: 15 }, // 六
    { date: '2026-01-11', totalFlights: 18 }  // 日
  ]
  const statsB = computeDayTypeStats(withFriday)
  const weekdayCount = statsB.find(s => s.type === '平日')
  const weekendCount = statsB.find(s => s.type === '週末')
  const bOk = weekdayCount?.days === 1 && weekendCount?.days === 3 // 五算平日 1 天，五+六+日算週末 3 天
  console.log('  情境 B（五、六、日）: 平日 1 天（五）、週末 3 天（五+六+日）')
  console.log('    結果:', statsB.map(s => `${s.type}: ${s.days}天`).join(' | '))
  console.log(`    ${bOk ? '✓' : '✗'} 平日 1 天、週末 3 天`)

  // 情境 C：公眾假期（元旦）
  const withHoliday = [
    { date: '2026-01-01', totalFlights: 10 }
  ]
  const statsC = computeDayTypeStats(withHoliday)
  const holidayRow = statsC.find(s => s.type === '公眾假期')
  const thursday = getDayOfWeek('2026-01-01') === 4 // 2026-01-01 是星期四
  const cOk = holidayRow?.days === 1 && holidayRow?.total === 10 && thursday
  console.log('  情境 C（2026-01-01 元旦，四）: 公眾假期 1 天')
  console.log('    結果:', statsC.map(s => `${s.type}: ${s.days}天`).join(' | '))
  console.log(`    ${cOk ? '✓' : '✗'} 公眾假期 1 天`)

  // 情境 D：假期前（元旦連假起始日前 1、2 天 = 2025-12-30, 2025-12-31）
  const withPreHoliday = [
    { date: '2025-12-30', totalFlights: 40 },
    { date: '2025-12-31', totalFlights: 35 }
  ]
  const statsD = computeDayTypeStats(withPreHoliday)
  const preRow = statsD.find(s => s.type === '假期前（連假起始日前 2 天）')
  const dOk = preRow?.days === 2 && preRow?.total === 75
  console.log('  情境 D（2025-12-30、12-31 元旦假期前）: 假期前 2 天')
  console.log('    結果:', statsD.map(s => `${s.type}: ${s.days}天`).join(' | '))
  console.log(`    ${dOk ? '✓' : '✗'} 假期前 2 天、總和 75`)

  // 情境 E：混合（春節前 2 天 + 春節第一天）
  const mixed = [
    { date: '2026-02-12', totalFlights: 50 }, // 假期前
    { date: '2026-02-13', totalFlights: 45 }, // 假期前
    { date: '2026-02-14', totalFlights: 20 }  // 春節第一天，公眾假期
  ]
  const statsE = computeDayTypeStats(mixed)
  const preE = statsE.find(s => s.type === '假期前（連假起始日前 2 天）')
  const holE = statsE.find(s => s.type === '公眾假期')
  const eOk = preE?.days === 2 && holE?.days === 1
  console.log('  情境 E（春節前 2 天 + 2/14 春節）: 假期前 2 天、公眾假期 1 天')
  console.log('    結果:', statsE.map(s => `${s.type}: ${s.days}天`).join(' | '))
  console.log(`    ${eOk ? '✓' : '✗'}`)

  return aOk && bOk && cOk && dOk && eOk
}

// ---------------------------------------------------------------------------
// 4. addDays 跨月/跨年（與 taiwanHolidays2026 內建邏輯一致，僅驗證 PRE 集合）
// ---------------------------------------------------------------------------
function checkAddDaysEdgeCases() {
  console.log('\n========== 4. 邊界日期（假期前跨年/跨月）==========')
  const cases = [
    ['2026-01-01', -1, '2025-12-31'],
    ['2026-01-01', -2, '2025-12-30'],
    ['2026-02-14', -1, '2026-02-13'],
    ['2026-02-14', -2, '2026-02-12'],
    ['2026-05-01', -1, '2026-04-30'],
    ['2026-05-01', -2, '2026-04-29']
  ]
  let ok = true
  for (const [from, n, expected] of cases) {
    const got = addDays(from, n)
    const match = got === expected
    if (!match) ok = false
    console.log(`  ${match ? '✓' : '✗'} addDays("${from}", ${n}) = "${got}" ${match ? '' : `(預期 ${expected})`}`)
  }
  return ok
}

// ---------------------------------------------------------------------------
// 執行
// ---------------------------------------------------------------------------
const r1 = checkHolidayDates()
const r2 = checkPreHolidayDates()
const r3 = checkAddDaysEdgeCases()
const r4 = runDayTypeScenarios()

console.log('\n========== 總結 ==========')
console.log('  公眾假日日期:', r1 ? '✓' : '✗')
console.log('  假期前日期:  ', r2 ? '✓' : '✗')
console.log('  邊界 addDays:', r3 ? '✓' : '✗')
console.log('  日型統計模擬:', r4 ? '✓' : '✗')
process.exit(r1 && r2 && r3 && r4 ? 0 : 1)
