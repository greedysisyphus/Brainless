/** 班表：上車地點名單的表格模型與文字輸出（純函式，可單元測試） */

import {
  CAR_DEPARTURE,
  CAR_LABELS,
  CAR_ORDINAL_LABELS,
  CAR_SHIFTS,
  driverStopName,
  getStoreShortName,
  NO_PICKUP,
  PICKUP_LOCATIONS,
  stopTime,
  UNSET_PICKUP,
} from './shiftConstants.js'
import {
  addDays,
  dateRange,
  formatDateShort,
  getCarLists,
  getMonthsForDate,
  isWeekendDate,
  lastDateOfMonth,
  monthKeyOfDate,
  weekdayLabelOf,
} from './shiftModel.js'

/** 依匯出範圍算出起訖日。month 以起始日所在整月計。 */
export function resolveExportRange(rangeKey, startDateKey) {
  if (!startDateKey) return { from: '', to: '' }
  if (rangeKey === 'month') {
    const monthKey = monthKeyOfDate(startDateKey)
    return { from: `${monthKey}-01`, to: lastDateOfMonth(monthKey) }
  }
  const days = rangeKey === 'twoWeeks' ? 14 : 7
  return { from: startDateKey, to: addDays(startDateKey, days - 1) }
}

function holidayOf(book, dateKey) {
  const months = getMonthsForDate(book, dateKey)
  for (const month of months) {
    const note = month.holidays?.[dateKey]
    if (note) return note
  }
  return ''
}

function locationOrder(location) {
  const index = PICKUP_LOCATIONS.indexOf(location)
  if (index >= 0) return index
  if (location === UNSET_PICKUP) return PICKUP_LOCATIONS.length
  return PICKUP_LOCATIONS.length + 1
}

/**
 * 產生上車地點表：列＝車次×上車地點，欄＝日期。
 * @returns {{dates: object[], sections: object[], hasRiders: boolean}}
 */
export function buildPickupTable(book, { from, to, pickupByPerson = {} } = {}) {
  const dateKeys = from && to ? dateRange(from, to) : []
  const dates = dateKeys.map((dateKey) => ({
    dateKey,
    day: Number(dateKey.slice(8, 10)),
    weekday: weekdayLabelOf(dateKey),
    isWeekend: isWeekendDate(dateKey),
    holiday: holidayOf(book, dateKey),
  }))

  const carsByDate = new Map()
  dateKeys.forEach((dateKey) => {
    carsByDate.set(dateKey, getCarLists(book, dateKey, pickupByPerson))
  })

  let hasRiders = false
  const sections = CAR_SHIFTS.map((shiftCode) => {
    const locations = new Set()
    dateKeys.forEach((dateKey) => {
      const car = carsByDate.get(dateKey).find((c) => c.shift === shiftCode)
      car?.groups.forEach((group) => locations.add(group.location))
    })

    const rows = [...locations]
      .sort((a, b) => locationOrder(a) - locationOrder(b))
      .map((location) => {
        const cells = dateKeys.map((dateKey) => {
          const car = carsByDate.get(dateKey).find((c) => c.shift === shiftCode)
          const group = car?.groups.find((g) => g.location === location)
          const riders = group?.riders || []
          if (riders.length) hasRiders = true
          return { dateKey, riders }
        })
        return {
          location,
          cells,
          total: cells.reduce((sum, cell) => sum + cell.riders.length, 0),
        }
      })

    const totals = dateKeys.map((dateKey) => {
      const car = carsByDate.get(dateKey).find((c) => c.shift === shiftCode)
      return car?.total || 0
    })

    return {
      shift: shiftCode,
      label: CAR_LABELS[shiftCode] || shiftCode,
      ordinalLabel: CAR_ORDINAL_LABELS[shiftCode] || CAR_LABELS[shiftCode] || shiftCode,
      departure: CAR_DEPARTURE[shiftCode] || '',
      rows,
      totals,
      total: totals.reduce((sum, n) => sum + n, 0),
    }
  })

  return { dates, sections, hasRiders }
}

function riderLabel(rider, { withStore = true } = {}) {
  if (!withStore) return rider.name
  const suffix = getStoreShortName(rider.workStore)
  const support = rider.isSupport ? '·支援' : ''
  return `${rider.name}（${suffix}${support}）`
}

/**
 * 文字版上車名單，適合貼進群組。
 */
export function renderPickupText(table, { title = '交通車上車名單', withStore = true } = {}) {
  if (!table || !table.dates.length) return ''
  const first = table.dates[0]
  const last = table.dates[table.dates.length - 1]
  const lines = [title, `${formatDateShort(first.dateKey)} ～ ${formatDateShort(last.dateKey)}`, '']

  table.dates.forEach((date, index) => {
    const blocks = []
    table.sections.forEach((section) => {
      const groups = section.rows
        .map((row) => ({ location: row.location, riders: row.cells[index].riders }))
        .filter((group) => group.riders.length)
      if (!groups.length) return
      const count = groups.reduce((sum, group) => sum + group.riders.length, 0)
      blocks.push(
        [
          `▍${section.label} ${section.departure} 發車（${count} 人）`,
          ...groups.map(
            (group) =>
              `  ${group.location}：${group.riders.map((r) => riderLabel(r, { withStore })).join('、')}`
          ),
        ].join('\n')
      )
    })

    const heading = `${formatDateShort(date.dateKey)}${date.holiday ? ` · ${date.holiday}` : ''}`
    lines.push(heading)
    lines.push(blocks.length ? blocks.join('\n') : '  今日無人搭車')
    lines.push('')
  })

  return lines.join('\n').trimEnd()
}

/** 表格版純文字（Tab 分隔），可直接貼進試算表。 */
export function renderPickupTsv(table, { withStore = false } = {}) {
  if (!table || !table.dates.length) return ''
  const header = ['車次', '上車地點', ...table.dates.map((d) => `${d.day}（${d.weekday}）`)]
  const rows = [header.join('\t')]
  table.sections.forEach((section) => {
    section.rows.forEach((row) => {
      rows.push(
        [
          `${section.label} ${section.departure}`,
          row.location,
          ...row.cells.map((cell) => cell.riders.map((r) => riderLabel(r, { withStore })).join('、')),
        ].join('\t')
      )
    })
    rows.push(
      [`${section.label} ${section.departure}`, '小計', ...section.totals.map(String)].join('\t')
    )
  })
  return rows.join('\n')
}

/** 尚未設定上車地點、但當天要坐交通車的人。 */
export function findMissingPickups(book, { from, to, pickupByPerson = {} } = {}) {
  const missing = new Map()
  dateRange(from, to).forEach((dateKey) => {
    getCarLists(book, dateKey, pickupByPerson).forEach((car) => {
      car.groups
        .filter((group) => group.location === UNSET_PICKUP)
        .forEach((group) => {
          group.riders.forEach((rider) => {
            if (!missing.has(rider.personKey)) {
              missing.set(rider.personKey, { personKey: rider.personKey, name: rider.name, days: 0 })
            }
            missing.get(rider.personKey).days += 1
          })
        })
    })
  })
  return [...missing.values()].sort((a, b) => b.days - a.days)
}

export { NO_PICKUP }


/* ---------- 司機版：不列同事姓名 ---------- */

/**
 * 司機只需要知道「哪一天、幾點、哪一站、接幾個人」，不需要看到誰。
 * 這一版把名字全部換成人數。
 */
export function renderDriverText(table, { title = '交通車接送表（司機版）' } = {}) {
  if (!table || !table.dates.length) return ''
  const first = table.dates[0]
  const last = table.dates[table.dates.length - 1]
  const lines = [title, `${formatDateShort(first.dateKey)} ～ ${formatDateShort(last.dateKey)}`, '']

  table.dates.forEach((date, index) => {
    const blocks = []
    table.sections.forEach((section) => {
      const stops = section.rows
        .map((row) => ({ location: row.location, count: row.cells[index].riders.length }))
        .filter((stop) => stop.count > 0)
      if (!stops.length) return
      const total = stops.reduce((sum, stop) => sum + stop.count, 0)
      blocks.push(
        [
          `▍${section.label} ${section.departure} 發車（共 ${total} 人）`,
          ...stops.map((stop) => `  ${stop.location}　${stop.count} 人`),
        ].join('\n')
      )
    })

    lines.push(`${formatDateShort(date.dateKey)}${date.holiday ? ` · ${date.holiday}` : ''}`)
    lines.push(blocks.length ? blocks.join('\n') : '  今日不發車')
    lines.push('')
  })

  return lines.join('\n').trimEnd()
}


/**
 * 司機版排班表：照店長平常傳給司機的格式 —— 一台車一段，日期底下逐行寫
 * 「幾點　站名　幾人」，沒人的站直接不寫。
 *
 * 這格式贏在司機讀的順序就是他開車的順序（時間由早到晚），不必自己從表格挑。
 * 沒登記時間的站會標出來而不是留白，免得司機以為那站不用停。
 */
export function renderDriverSchedule(table) {
  if (!table || !table.dates.length) return ''
  const lines = []
  table.sections.forEach((section, sectionIndex) => {
    if (sectionIndex) lines.push('', '')
    lines.push(`${section.ordinalLabel}《《 這是${section.label}`)

    table.dates.forEach((date, index) => {
      const stops = section.rows
        .map((row) => ({
          name: driverStopName(row.location),
          time: stopTime(row.location, section.shift),
          count: row.cells[index].riders.length,
        }))
        .filter((stop) => stop.count > 0)
        .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
      if (!stops.length) return

      // 司機看的是「8/1」不是「1」——一次傳好幾週時，只有日沒有月會對錯天
      lines.push('', `${Number(date.dateKey.slice(5, 7))}/${date.day}`)
      stops.forEach((stop) => {
        lines.push(`${stop.time || '（時間未定）'} ${stop.name} ${stop.count}人`)
      })
    })
  })
  return lines.join('\n').trim()
}

/** 司機版表格：欄是日期、列是車次×站點，格子是人數。 */
export function renderDriverTsv(table) {
  if (!table || !table.dates.length) return ''
  const header = ['車次', '上車地點', ...table.dates.map((d) => `${d.day}（${d.weekday}）`)]
  const rows = [header.join('\t')]
  table.sections.forEach((section) => {
    section.rows.forEach((row) => {
      rows.push(
        [
          `${section.label} ${section.departure}`,
          row.location,
          ...row.cells.map((cell) => (cell.riders.length ? String(cell.riders.length) : '')),
        ].join('\t')
      )
    })
    rows.push(
      [`${section.label} ${section.departure}`, '小計', ...section.totals.map(String)].join('\t')
    )
  })
  return rows.join('\n')
}
