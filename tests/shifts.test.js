import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeShiftExport, monthDocId } from '../src/pages/shifts/shiftImport.js'
import {
  SUPPORT_STATUS,
  buildSupportGroups,
  listCarRiskSupport,
  listUnresolvedSupport,
  resolveSupportShifts,
} from '../src/pages/shifts/shiftSupport.js'
import {
  chunkIntoWeeks,
  buildShiftBook,
  getCarLists,
  getWorkingAssignments,
  groupWorkingByStore,
  addDays,
  dateRange,
} from '../src/pages/shifts/shiftModel.js'
import {
  computePartnerFrequency,
  computePersonSummaries,
  overlapMinutes,
} from '../src/pages/shifts/shiftStats.js'
import {
  buildPickupTable,
  findMissingPickups,
  renderDriverText,
  renderDriverTsv,
  renderPickupText,
  renderPickupTsv,
  resolveExportRange,
  renderDriverSchedule,
} from '../src/pages/shifts/shiftExport.js'
import { CAR_DEPARTURE, carLabelWithTime } from '../src/pages/shifts/shiftConstants.js'

import {
  POSITION_TOKENS,
  collectLeaveCodes,
  collectShiftCodes,
  describeEntry,
  getPositionDisplay,
  getShiftDisplay,
} from '../src/pages/shifts/shiftVocab.js'
import {
  applyIdentity,
  buildIdentity,
  checkMergeSafety,
  normalizeIdentitySettings,
} from '../src/pages/shifts/shiftIdentity.js'
import { pickupMapFrom, normalizePersonSettings } from '../src/pages/shifts/shiftFirestore.js'
import { formatTimestamp, getCrossStoreMoves } from '../src/pages/shifts/shiftModel.js'
import { mergeVocab, getLeaveDisplay } from '../src/pages/shifts/shiftVocab.js'
import { groupPeopleByStore, primaryStoreOf } from '../src/pages/shifts/shiftModel.js'
import {
  getStoreName,
  stopTime,
  canonicalPickup,
  PICKUP_LOCATIONS,
} from '../src/pages/shifts/shiftConstants.js'
import {
  buildPersonIcsEvents,
  buildPersonMonthGrid,
  getPersonMonthEntries,
  icsFilename,
  summarizePersonMonth,
} from '../src/pages/shifts/shiftCalendar.js'

const nextDayCheck = (dateKey) => addDays(dateKey, 1).split('-').map(Number)

/** 仿匯出檔：只保留解析需要的欄位 */
function makeExport({ storeCode, storeName, employees, entries, shiftTypes, positions }) {
  return {
    source: { file: `${storeCode}.jpg`, sha256_16: 'abc', parser_version: '0.1.0' },
    store: { code: storeCode, name: storeName },
    period: { year: 2026, month: 9, days_in_month: 30 },
    business_hours: { open: '05:00', close: '22:00' },
    shift_types: shiftTypes ?? [
      { code: 'MORNING', label: '早班', start: '04:30', end: '13:00' },
      { code: 'MID', label: '中班', start: '05:30', end: '14:00' },
      { code: 'NOON', label: '午班', start: '07:30', end: '16:00' },
      { code: 'EVENING', label: '晚班', start: '14:00', end: '22:30' },
    ],
    positions: positions ?? [
      { code: 'MAIN_BAR', label: '主吧', color: '#f9bf90' },
      { code: 'POS', label: 'POS', color: '#fcfd0c' },
    ],
    leave_types: [
      { code: 'OFF', label: '休假', marker: 'X' },
      { code: 'SCHEDULING', label: '排班日', marker: '排' },
    ],
    employees: employees.map((name, index) => ({
      id: `emp0${index + 1}_${name}`,
      name,
      row: index + 3,
    })),
    days: [
      { date: '2026-09-01', day: 1, weekday: 2, is_weekend: false, note: null },
      { date: '2026-09-02', day: 2, weekday: 3, is_weekend: false, note: '中秋節' },
      { date: '2026-09-03', day: 3, weekday: 4, is_weekend: false, note: null },
    ],
    entries,
    schema_version: '1.0.0',
    stats: { auto_rate: 1 },
    updated_at: '2026-08-30T06:00:00',
  }
}

const cell = (employeeId, date, extra) => ({
  employee_id: employeeId,
  date,
  kind: 'WORK',
  shift: null,
  position: null,
  leave: null,
  at_store: null,
  is_support: false,
  raw_text: '',
  confidence: 1,
  needs_review: false,
  ...extra,
})

function buildFixtureBook() {
  const central = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['小明', 'Ann'],
    entries: [
      cell('emp01_小明', '2026-09-01', { shift: 'MORNING', position: 'MAIN_BAR', raw_text: '' }),
      cell('emp01_小明', '2026-09-02', { shift: 'EVENING', position: 'MAIN_BAR', raw_text: '晚' }),
      cell('emp01_小明', '2026-09-03', { kind: 'LEAVE', leave: 'OFF', raw_text: '✕' }),
      cell('emp02_Ann', '2026-09-01', { shift: 'MID', position: 'POS', raw_text: '中' }),
      cell('emp02_Ann', '2026-09-02', { at_store: 'D13', is_support: true, raw_text: 'T3' }),
      cell('emp02_Ann', '2026-09-03', { kind: 'LEAVE', leave: 'SCHEDULING', raw_text: '排' }),
    ],
  })

  const d13 = makeExport({
    storeCode: 'D13',
    storeName: '超級棧 - 桃機D13',
    employees: ['Ben', '支援'],
    shiftTypes: [
      { code: 'MORNING', label: '早班', start: '04:30', end: '13:00' },
      { code: 'EVENING', label: '晚班', start: '13:00', end: '21:30' },
    ],
    entries: [
      cell('emp01_Ben', '2026-09-01', { shift: 'MORNING', position: 'MAIN_BAR', raw_text: '' }),
      cell('emp01_Ben', '2026-09-02', { shift: 'EVENING', position: 'MAIN_BAR', raw_text: '晚' }),
      cell('emp01_Ben', '2026-09-03', { kind: 'EMPTY', raw_text: '' }),
      cell('emp02_支援', '2026-09-02', { shift: 'EVENING', position: 'POS', raw_text: '晚' }),
    ],
  })

  const months = resolveSupportShifts(
    [central, d13].map((raw) => {
      const result = normalizeShiftExport(raw)
      assert.equal(result.ok, true, result.error)
      return result.month
    })
  )
  return buildShiftBook(months)
}

test('匯入：以姓名當人員鍵，並保留店別與班別時間', () => {
  const result = normalizeShiftExport(
    makeExport({
      storeCode: 'D13',
      storeName: '超級棧 - 桃機D13',
      employees: ['Ben'],
      shiftTypes: [{ code: 'EVENING', label: '晚班', start: '13:00', end: '21:30' }],
      entries: [cell('emp01_Ben', '2026-09-01', { shift: 'EVENING', raw_text: '晚' })],
    })
  )

  assert.equal(result.ok, true)
  assert.equal(result.month.storeCode, 'D13')
  assert.equal(result.month.monthKey, '2026-09')
  assert.equal(monthDocId('2026-09', 'D13'), '2026-09_D13')
  assert.equal(result.month.people[0].key, 'Ben')
  // D13 晚班 13:00-21:30，與其他店不同
  assert.deepEqual(result.month.entries.Ben['2026-09-01'].start, '13:00')
  assert.deepEqual(result.month.entries.Ben['2026-09-01'].end, '21:30')
  assert.equal(result.month.holidays['2026-09-02'], '中秋節')
})

test('匯入：缺少店別或月份時明確失敗', () => {
  assert.equal(normalizeShiftExport(null).ok, false)
  assert.match(normalizeShiftExport({ period: { year: 2026, month: 9 } }).error, /store\.code/)
  assert.match(
    normalizeShiftExport({ store: { code: 'D7' }, entries: [{}] }).error,
    /period\.year/
  )
})

test('支援班：只寫 T3 時，從目的店的「支援」列補上班別、崗位與時間', () => {
  const book = buildFixtureBook()
  const alex = book.byId[monthDocId('2026-09', 'central')].entries.Ann['2026-09-02']
  assert.equal(alex.shift, 'SUPPORT')
  assert.equal(alex.atStore, 'D13')
  assert.equal(alex.resolvedShift, 'EVENING')
  assert.equal(alex.resolvedPosition, 'POS')
  // 用目的店 D13 的晚班時間，不是來源店的 14:00
  assert.equal(alex.start, '13:00')
  assert.equal(alex.end, '21:30')
})

test('支援班：寫了班別（3晚／7早）時直接沿用，時間換成目的店的', () => {
  const central = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['小華'],
    entries: [
      cell('emp01_小華', '2026-09-01', {
        shift: 'EVENING',
        at_store: 'D13',
        is_support: true,
        raw_text: '3晚',
      }),
    ],
  })
  const d13 = makeExport({
    storeCode: 'D13',
    storeName: '超級棧 - 桃機D13',
    employees: ['Ben'],
    shiftTypes: [{ code: 'EVENING', label: '晚班', start: '13:00', end: '21:30' }],
    entries: [cell('emp01_Ben', '2026-09-01', { shift: 'EVENING', raw_text: '晚' })],
  })
  const months = resolveSupportShifts(
    [central, d13].map((raw) => normalizeShiftExport(raw).month)
  )
  const entry = months[0].entries.小華['2026-09-01']
  assert.equal(entry.resolvedShift, 'EVENING')
  assert.equal(entry.start, '13:00')
  assert.equal(entry.end, '21:30')

  const book = buildShiftBook(months)
  const d13Evening = groupWorkingByStore(getWorkingAssignments(book, '2026-09-01'))
    .find((s) => s.storeCode === 'D13')
    .shifts.find((s) => s.shift === 'EVENING')
  assert.deepEqual(d13Evening.people.map((p) => p.name).sort(), ['Ben', '小華'])
})

test('支援班：支援對象不限 D13，D7 一樣算在目的店', () => {
  const central = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['Ann'],
    entries: [
      cell('emp01_Ann', '2026-09-01', { at_store: 'D7', is_support: true, raw_text: 'D7' }),
    ],
  })
  const d7 = makeExport({
    storeCode: 'D7',
    storeName: '超級棧 - 桃機D7',
    employees: ['Gina', '支援'],
    entries: [
      cell('emp01_Gina', '2026-09-01', { shift: 'MORNING', raw_text: '' }),
      cell('emp02_支援', '2026-09-01', { shift: 'MORNING', position: 'MAIN_BAR', raw_text: '' }),
    ],
  })
  const book = buildShiftBook(
    resolveSupportShifts([central, d7].map((raw) => normalizeShiftExport(raw).month))
  )
  const stores = groupWorkingByStore(getWorkingAssignments(book, '2026-09-01'))
  assert.equal(stores.some((s) => s.storeCode === 'central'), false)
  assert.deepEqual(
    stores.find((s) => s.storeCode === 'D7').shifts.find((s) => s.shift === 'MORNING').people.map((p) => p.name).sort(),
    ['Ann', 'Gina']
  )
})

test('今天誰上班：支援班算在實際上班的店，佔位列不列入', () => {
  const book = buildFixtureBook()
  const stores = groupWorkingByStore(getWorkingAssignments(book, '2026-09-02'))
  const d13 = stores.find((s) => s.storeCode === 'D13')

  assert.deepEqual(
    d13.shifts.find((s) => s.shift === 'EVENING').people.map((p) => p.name).sort(),
    ['Ann', 'Ben']
  )
  // 「支援」是匯出檔的佔位列，不是真人
  assert.equal(book.people.some((p) => p.name === '支援' && !p.placeholder), false)
  assert.equal(
    stores.find((s) => s.storeCode === 'central').shifts.some((s) => s.shift === 'EVENING' && s.people.some((p) => p.name === 'Ann')),
    false
  )
})

test('交通車：早班與中班分開算，不搭車者不列入', () => {
  const book = buildFixtureBook()
  const cars = getCarLists(book, '2026-09-01', {
    小明: 'A21環北站',
    Ann: '高鐵站',
    Ben: '不搭車',
  })

  const morning = cars.find((c) => c.shift === 'MORNING')
  const mid = cars.find((c) => c.shift === 'MID')

  assert.equal(morning.total, 1)
  assert.deepEqual(morning.groups.map((g) => g.location), ['A21環北站'])
  assert.deepEqual(morning.groups[0].riders.map((r) => r.name), ['小明'])
  assert.deepEqual(morning.skipped.map((r) => r.name), ['Ben'])

  assert.equal(mid.total, 1)
  assert.deepEqual(mid.groups[0].riders.map((r) => r.name), ['Ann'])
})

test('交通車：未設定上車地點的人會被標出來', () => {
  const book = buildFixtureBook()
  const cars = getCarLists(book, '2026-09-01', {})
  const morning = cars.find((c) => c.shift === 'MORNING')
  assert.deepEqual(morning.groups.map((g) => g.location), ['未設定'])

  const missing = findMissingPickups(book, {
    from: '2026-09-01',
    to: '2026-09-03',
    pickupByPerson: {},
  })
  assert.deepEqual(missing.map((m) => m.name).sort(), ['Ann', 'Ben', '小明'].sort())
  assert.equal(missing.every((m) => m.days === 1), true)
})

test('匯出範圍：一週、二週與整月', () => {
  assert.deepEqual(resolveExportRange('week', '2026-09-14'), {
    from: '2026-09-14',
    to: '2026-09-20',
  })
  assert.deepEqual(resolveExportRange('twoWeeks', '2026-09-14'), {
    from: '2026-09-14',
    to: '2026-09-27',
  })
  assert.deepEqual(resolveExportRange('month', '2026-09-14'), {
    from: '2026-09-01',
    to: '2026-09-30',
  })
  assert.equal(addDays('2026-09-30', 1), '2026-10-01')
  assert.equal(dateRange('2026-09-01', '2026-09-03').length, 3)
})

test('匯出：文字與表格都帶上車地點與人數', () => {
  const book = buildFixtureBook()
  const table = buildPickupTable(book, {
    from: '2026-09-01',
    to: '2026-09-03',
    pickupByPerson: { 小明: 'A21環北站', Ann: '高鐵站', Ben: 'A21環北站' },
  })

  assert.equal(table.dates.length, 3)
  const morning = table.sections.find((s) => s.shift === 'MORNING')
  assert.deepEqual(morning.totals, [2, 0, 0])
  assert.equal(morning.rows.find((r) => r.location === 'A21環北站').total, 2)

  const text = renderPickupText(table)
  // 名單要帶發車時間：早班車 04:00、中班車 05:00
  assert.match(text, /早班車 04:00 發車（2 人）/)
  assert.match(text, /A21環北站：小明（一店）、Ben（D13）/)
  assert.match(text, /中秋節/)
  assert.match(text, /今日無人搭車/)

  const tsv = renderPickupTsv(table)
  assert.match(tsv.split('\n')[0], /^車次\t上車地點\t1（二）/)
  assert.match(tsv.split('\n')[1], /^早班車 04:00\t/)
})

test('統計：班別分布跟著人走，調店與支援算在實際上班的店', () => {
  const book = buildFixtureBook()
  const summaries = computePersonSummaries(book)
  const alex = summaries.find((s) => s.personKey === 'Ann')

  assert.equal(alex.workDays, 2)
  assert.equal(alex.byShift.MID, 1)
  assert.equal(alex.byShift.EVENING, 1)
  assert.equal(alex.supportDays, 1)
  assert.deepEqual(alex.byStore, { central: 1, D13: 1 })
  assert.equal(alex.crossStore, true)
  // 排班日算休假
  assert.equal(alex.byLeave.SCHEDULING, 1)
  assert.equal(alex.leaveDays, 1)
})

test('統計：搭班頻率以同日同店計算，並累計重疊時數', () => {
  const book = buildFixtureBook()
  const partners = computePartnerFrequency(book, 'Ann')
  const ivan = partners.find((p) => p.personKey === 'Ben')

  // 9/2 兩人都在 D13 晚班
  assert.equal(ivan.days, 1)
  assert.equal(ivan.sameShiftDays, 1)
  assert.equal(ivan.overlapHours, 8.5)
  assert.deepEqual(ivan.storeList[0].storeCode, 'D13')

  // 9/1 兩人同在一店但班別不同，仍算搭到班
  const hongye = partners.find((p) => p.personKey === '小明')
  assert.equal(hongye.days, 1)
  assert.equal(hongye.sameShiftDays, 0)
  assert.equal(overlapMinutes({ start: '04:30', end: '13:00' }, { start: '05:30', end: '14:00' }), 450)
  assert.equal(overlapMinutes({ start: '04:30', end: '13:00' }, { start: null, end: null }), null)
})


test('匯入：employee.id 只用來對格子，人員鍵一律用姓名', () => {
  // 轉換器的 id 從 emp01_Gina 改成 D7_Gina（跨月穩定），但跨店仍不通用，
  // 所以本站以姓名當人員鍵，兩種 id 格式都要能匯入。
  const withOldIds = normalizeShiftExport(
    makeExport({
      storeCode: 'D7',
      storeName: '超級棧 - 桃機D7',
      employees: ['Gina'],
      entries: [cell('emp03_Gina', '2026-09-01', { shift: 'MORNING' })],
    })
  )
  const withNewIds = {
    ...makeExport({
      storeCode: 'D7',
      storeName: '超級棧 - 桃機D7',
      employees: ['Gina'],
      entries: [],
    }),
    employees: [{ id: 'D7_Gina', name: 'Gina', row: 3 }],
    entries: [cell('D7_Gina', '2026-09-01', { shift: 'MORNING' })],
  }
  const parsed = normalizeShiftExport(withNewIds)

  assert.equal(withOldIds.month.people[0].key, 'Gina')
  assert.equal(parsed.month.people[0].key, 'Gina')
  assert.equal(parsed.month.entries.Gina['2026-09-01'].shift, 'MORNING')
})

test('匯入：flat 格式也能吃，店別與月份從資料本身推回來', () => {
  const flat = [
    {
      id: 'D7_Gina_2026-08-02',
      employeeId: 'D7_Gina',
      employeeName: 'Gina',
      date: '2026-08-02',
      kind: 'WORK',
      shiftCode: 'MORNING',
      shiftLabel: '早班',
      positionCode: 'MAIN_BAR',
      positionLabel: '主吧',
      isSupport: false,
      atStore: null,
      leaveCode: null,
      start: '2026-08-02T04:30:00+08:00',
      end: '2026-08-02T13:00:00+08:00',
      displayLabel: '早班',
      needsReview: false,
    },
    {
      id: 'D7_Gina_2026-08-01',
      employeeId: 'D7_Gina',
      employeeName: 'Gina',
      date: '2026-08-01',
      kind: 'LEAVE',
      shiftCode: null,
      leaveCode: 'OFF_DESIGNATED',
      leaveLabel: '指定休假',
      isSupport: false,
      start: null,
      end: null,
      displayLabel: '指定休假',
      needsReview: false,
    },
  ]
  const result = normalizeShiftExport(flat, { fileName: '桃機D7_2026-08.flat.json' })

  assert.equal(result.ok, true)
  assert.equal(result.month.storeCode, 'D7')
  assert.equal(result.month.monthKey, '2026-08')
  // 人員鍵仍然是姓名，才跨得了店；employeeId 只是來源
  assert.equal(result.month.people[0].key, 'Gina')
  assert.equal(result.month.entries.Gina['2026-08-02'].shift, 'MORNING')
  assert.equal(result.month.entries.Gina['2026-08-02'].start, '04:30')
  assert.equal(result.month.entries.Gina['2026-08-01'].leave, 'OFF_DESIGNATED')
  // 日期軸要補滿整月，flat 只有排到班的日子
  assert.equal(Object.keys(result.month.days).length, 31)
  // 代碼表從資料本身長出來
  assert.equal(result.month.positions.MAIN_BAR.label, '主吧')
  assert.equal(result.month.leaveTypes.OFF_DESIGNATED.label, '指定休假')
  // flat 拿不到的東西要講清楚
  assert.ok(result.warnings.some((w) => w.includes('國定假日')))
  assert.equal(result.month.source.format, 'flat')
})

test('匯入：flat 的 employeeId 沒有店代碼前綴時明確失敗', () => {
  const result = normalizeShiftExport([
    { employeeId: 'Gina', employeeName: 'Gina', date: '2026-08-01', kind: 'WORK' },
  ])
  assert.equal(result.ok, false)
  assert.match(result.error, /店代碼/)
})

test('語彙：班別與假別清單來自匯入檔，不是寫死的', () => {
  const raw = makeExport({
    storeCode: 'D7',
    storeName: '超級棧 - 桃機D7',
    employees: ['Gina'],
    shiftTypes: [
      { code: 'MORNING', label: '早班', marker: '', start: '04:30', end: '13:00' },
      // 店長在轉換器新增的班別
      { code: 'SPLIT', label: '分段班', marker: '分', start: '06:00', end: '20:00' },
    ],
    entries: [cell('emp01_Gina', '2026-09-01', { shift: 'SPLIT', raw_text: '分' })],
  })
  raw.leave_types.push({ code: 'TYPHOON', label: '颱風假', marker: '颱' })

  const { month } = normalizeShiftExport(raw)
  const display = getShiftDisplay(month, 'SPLIT')

  assert.equal(display.label, '分段班')
  assert.equal(display.short, '分')
  assert.equal(display.known, false)
  assert.equal(display.start, '06:00')
  assert.ok(collectShiftCodes([month]).includes('SPLIT'))
  assert.ok(collectLeaveCodes([month]).includes('TYPHOON'))

  const book = buildShiftBook([month])
  const summary = computePersonSummaries(book).find((s) => s.personKey === 'Gina')
  assert.equal(summary.byShift.SPLIT, 1)

  const group = groupWorkingByStore(getWorkingAssignments(book, '2026-09-01'))[0]
  assert.equal(group.shifts[0].shift, 'SPLIT')
})

test('語彙：崗位色用本站色票，不用匯入檔量到的像素色', () => {
  const { month } = normalizeShiftExport(
    makeExport({
      storeCode: 'D13',
      storeName: '超級棧 - 桃機D13',
      employees: ['Ben'],
      positions: [{ code: 'POS', label: 'POS', color: '#fafd58' }],
      entries: [cell('emp01_Ben', '2026-09-01', { shift: 'MORNING', position: 'POS' })],
    })
  )
  const display = getPositionDisplay(month, 'POS')
  assert.equal(display.label, 'POS')
  assert.notEqual(display.color, '#fafd58')
  assert.equal(display.known, true)
})

test('跨夜班：重疊時數把隔天的下班時間算進去', () => {
  const late = { start: '22:00', end: '06:00', crossesMidnight: true }
  const overnight = { start: '23:00', end: '07:00', crossesMidnight: true }
  assert.equal(overlapMinutes(late, overnight), 7 * 60)

  // 沒有 crossesMidnight 但 end <= start 時同樣視為跨夜
  assert.equal(overlapMinutes({ start: '22:00', end: '06:00' }, { start: '23:00', end: '05:00' }), 6 * 60)

  // 一般班不受影響
  assert.equal(overlapMinutes({ start: '04:30', end: '13:00' }, { start: '05:30', end: '14:00' }), 450)
})

test('跨夜班：crosses_midnight 從匯入檔帶進格子', () => {
  const { month } = normalizeShiftExport(
    makeExport({
      storeCode: 'D13',
      storeName: '超級棧 - 桃機D13',
      employees: ['Ben'],
      shiftTypes: [
        { code: 'EVENING', label: '晚班', start: '22:00', end: '06:00', crosses_midnight: true },
      ],
      entries: [cell('emp01_Ben', '2026-09-01', { shift: 'EVENING', raw_text: '晚' })],
    })
  )
  assert.equal(month.entries.Ben['2026-09-01'].crossesMidnight, true)
  assert.equal(getShiftDisplay(month, 'EVENING').crossesMidnight, true)
})

test('支援班：推測出來的班別會標記來源，紙本寫明的不標', () => {
  const book = buildFixtureBook()
  const inferred = book.byId[monthDocId('2026-09', 'central')].entries.Ann['2026-09-02']
  assert.equal(inferred.resolvedFrom, 'inferred')

  const assignment = getWorkingAssignments(book, '2026-09-02').find((a) => a.name === 'Ann')
  assert.equal(assignment.shiftInferred, true)
})


test('月視圖：週日起頭、補滿前後月，並標出當月範圍', () => {
  const book = buildFixtureBook()
  const grid = buildPersonMonthGrid(book, '小明', '2026-09')

  assert.equal(grid.weeks[0].length, 7)
  // 2026-09-01 是週二，所以第一週前面補兩天 8/30、8/31
  assert.equal(grid.weeks[0][0].dateKey, '2026-08-30')
  assert.equal(grid.weeks[0][0].inMonth, false)
  assert.equal(grid.weeks[0][2].dateKey, '2026-09-01')
  assert.equal(grid.weeks[0][2].inMonth, true)
  assert.equal(grid.weeks[0][2].records[0].shift, 'MORNING')

  const allDates = grid.weeks.flat().map((d) => d.dateKey)
  assert.ok(allDates.includes('2026-09-30'))
})

test('月視圖：跟著人跨店，支援班顯示實際上班的店', () => {
  const book = buildFixtureBook()
  const byDate = getPersonMonthEntries(book, 'Ann', '2026-09')

  assert.equal(byDate.get('2026-09-01')[0].workStore, 'central')
  const support = byDate.get('2026-09-02')[0]
  assert.equal(support.workStore, 'D13')
  assert.equal(support.isSupport, true)
  assert.equal(support.shift, 'EVENING')
  assert.equal(support.shiftInferred, true)

  const summary = summarizePersonMonth(book, 'Ann', '2026-09')
  assert.equal(summary.workDays, 2)
  assert.deepEqual(summary.byStore, { central: 1, D13: 1 })
})

test('行事曆匯出：有時間的班用時段事件，時間走本地時間', () => {
  const book = buildFixtureBook()
  const events = buildPersonIcsEvents(book, '小明', { monthKeys: ['2026-09'] })
  const morning = events.find((e) => e.start.length === 5 && e.start[2] === 1)

  assert.deepEqual(morning.start, [2026, 9, 1, 4, 30])
  assert.deepEqual(morning.duration, { hours: 8, minutes: 30 })
  assert.equal(morning.startInputType, 'local')
  assert.equal(morning.startOutputType, 'local')
  assert.match(morning.title, /早班/)
  assert.match(morning.title, /桃機一店/)
  assert.equal(morning.location, '桃機一店')

  // 預設不含休假
  assert.equal(events.length, 2)
  assert.equal(
    buildPersonIcsEvents(book, '小明', { monthKeys: ['2026-09'], includeLeave: true }).length,
    3
  )
})

test('行事曆匯出：支援班帶目的店的時間與說明', () => {
  const book = buildFixtureBook()
  const events = buildPersonIcsEvents(book, 'Ann', { monthKeys: ['2026-09'] })
  const support = events.find((e) => e.start[2] === 2)

  // D13 晚班 13:00-21:30，不是來源店的 14:00
  assert.deepEqual(support.start, [2026, 9, 2, 13, 0])
  assert.deepEqual(support.duration, { hours: 8, minutes: 30 })
  assert.equal(support.location, '桃機D13')
  assert.match(support.description, /支援班/)
  assert.match(support.description, /推得/)
})

test('行事曆匯出：沒有時間的班匯成全天事件，不瞎編時段', () => {
  const central = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['Ann'],
    entries: [
      cell('emp01_Ann', '2026-09-01', { at_store: 'D13', is_support: true, raw_text: 'T3' }),
    ],
  })
  const book = buildShiftBook(resolveSupportShifts([normalizeShiftExport(central).month]))
  const [event] = buildPersonIcsEvents(book, 'Ann', { monthKeys: ['2026-09'] })

  assert.deepEqual(event.start, [2026, 9, 1])
  assert.deepEqual(event.end, [2026, 9, 2])
  // 月底的全天事件不能寫成 9/31
  assert.deepEqual(nextDayCheck('2026-09-30'), [2026, 10, 1])
  assert.equal(event.duration, undefined)
  assert.match(event.description, /紙本沒寫班別/)
  assert.equal(icsFilename('Ann', ['2026-09']), 'Ann_2026-09.ics')
})


test('行事曆匯出：月底的全天事件跨到下個月，不會產生 9/31', () => {
  const central = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['Ann'],
    entries: [
      cell('emp01_Ann', '2026-09-30', { kind: 'LEAVE', leave: 'OFF', raw_text: '✕' }),
      cell('emp01_Ann', '2026-09-29', { at_store: 'D7', is_support: true, raw_text: 'D7' }),
    ],
  })
  const book = buildShiftBook(resolveSupportShifts([normalizeShiftExport(central).month]))
  const events = buildPersonIcsEvents(book, 'Ann', {
    monthKeys: ['2026-09'],
    includeLeave: true,
  })

  events.forEach((event) => {
    if (!event.end) return
    assert.ok(event.end[2] >= 1 && event.end[2] <= 31, `end 日期不合法：${event.end.join('-')}`)
  })
  const lastDay = events.find((e) => e.start[2] === 30)
  assert.deepEqual(lastDay.end, [2026, 10, 1])
})


/** 阿寶（D7）與阿力（D13）其實是同一個人，兩店寫法不同 */
function buildTwoNameBook(settings = {}) {
  const d7 = makeExport({
    storeCode: 'D7',
    storeName: '超級棧 - 桃機D7',
    employees: ['阿寶', 'Gina'],
    entries: [
      cell('emp01_阿寶', '2026-09-01', { shift: 'MORNING', position: 'MAIN_BAR' }),
      cell('emp01_阿寶', '2026-09-02', { kind: 'LEAVE', leave: 'OFF', raw_text: '✕' }),
      cell('emp02_Gina', '2026-09-01', { shift: 'MID', position: 'POS', raw_text: '中' }),
    ],
  })
  const d13 = makeExport({
    storeCode: 'D13',
    storeName: '超級棧 - 桃機D13',
    employees: ['阿力'],
    shiftTypes: [{ code: 'EVENING', label: '晚班', start: '13:00', end: '21:30' }],
    entries: [cell('emp01_阿力', '2026-09-03', { shift: 'EVENING', raw_text: '晚' })],
  })
  const months = resolveSupportShifts(
    [d7, d13].map((raw) => normalizeShiftExport(raw).month)
  )
  const identity = buildIdentity(settings)
  return { months, identity, book: buildShiftBook(applyIdentity(months, identity)) }
}

test('合併：不設定時兩個名字是兩個人', () => {
  const { book } = buildTwoNameBook()
  assert.deepEqual(
    book.people.map((p) => p.name).sort(),
    ['Gina', '阿力', '阿寶'].sort()
  )
})

test('合併：把阿寶併入阿力後，班表跨店變成同一個人', () => {
  const { book } = buildTwoNameBook({ 阿寶: { mergedInto: '阿力' } })

  const names = book.people.map((p) => p.name).sort()
  assert.deepEqual(names, ['Gina', '阿力'])

  const merged = book.people.find((p) => p.key === '阿力')
  assert.deepEqual(merged.storeCodes, ['D7', 'D13'])
  assert.deepEqual(merged.mergedFrom, ['阿寶'])

  // D7 的班現在掛在阿力底下
  const d7Morning = groupWorkingByStore(getWorkingAssignments(book, '2026-09-01')).find(
    (s) => s.storeCode === 'D7'
  )
  assert.deepEqual(d7Morning.shifts.find((s) => s.shift === 'MORNING').people.map((p) => p.name), [
    '阿力',
  ])

  const summary = computePersonSummaries(book).find((s) => s.personKey === '阿力')
  assert.equal(summary.workDays, 2)
  assert.deepEqual(summary.byStore, { D7: 1, D13: 1 })
  assert.equal(summary.crossStore, true)
  assert.equal(summary.leaveDays, 1)
})

test('暱稱：設了之後名單與統計都顯示暱稱', () => {
  const { book } = buildTwoNameBook({
    阿寶: { mergedInto: '阿力' },
    阿力: { nickname: '阿廷' },
  })
  const person = book.people.find((p) => p.key === '阿力')
  assert.equal(person.name, '阿廷')
  assert.equal(person.sourceName, '阿力')

  const assignment = getWorkingAssignments(book, '2026-09-01').find((a) => a.personKey === '阿力')
  assert.equal(assignment.name, '阿廷')

  const events = buildPersonIcsEvents(book, '阿力', { monthKeys: ['2026-09'] })
  assert.equal(events.length, 2)
})

test('合併：同一天兩邊都有班就擋下來，那是兩個人', () => {
  const { months } = buildTwoNameBook()
  // 阿寶 9/1 上班、Gina 9/1 也上班 → 不該合併
  const unsafe = checkMergeSafety(months, '阿寶', 'Gina')
  assert.equal(unsafe.ok, false)
  assert.match(unsafe.reason, /同時有班/)
  assert.equal(unsafe.clashes[0].date, '2026-09-01')

  // 阿寶與阿力沒有同一天都有班 → 可以合併
  assert.equal(checkMergeSafety(months, '阿寶', '阿力').ok, true)
  assert.equal(checkMergeSafety(months, '阿寶', '阿寶').ok, false)
})

test('合併：鏈式合併會收斂，環不會無限迴圈', () => {
  const chain = buildIdentity({ a: { mergedInto: 'b' }, b: { mergedInto: 'c' } })
  assert.equal(chain.canonicalOf('a'), 'c')
  assert.deepEqual(chain.aliasesOf('c').sort(), ['a', 'b'])

  const cycle = buildIdentity({ a: { mergedInto: 'b' }, b: { mergedInto: 'a' } })
  assert.equal(cycle.canonicalOf('a'), cycle.canonicalOf('b'))
})

test('合併：上車地點跟著正式人員鍵走，別名設過的會頂上', () => {
  const identity = buildIdentity({ 阿寶: { mergedInto: '阿力' } })

  // 只有別名設過 → 併到正式的身上，名單不會少人
  assert.deepEqual(
    pickupMapFrom({ 阿寶: { pickup: '高鐵站', mergedInto: '阿力' } }, identity),
    { 阿力: '高鐵站' }
  )

  // 正式的自己設過 → 以正式的為準
  assert.deepEqual(
    pickupMapFrom(
      { 阿寶: { pickup: '高鐵站', mergedInto: '阿力' }, 阿力: { pickup: 'A21環北站' } },
      identity
    ),
    { 阿力: 'A21環北站' }
  )
})

test('合併設定：只收乾淨的字串', () => {
  assert.deepEqual(normalizeIdentitySettings({ nickname: '  阿廷 ', mergedInto: ' 阿力 ' }), {
    nickname: '阿廷',
    mergedInto: '阿力',
  })
  assert.deepEqual(normalizeIdentitySettings(null), { nickname: '', mergedInto: '' })
})

test('合併：同一份班表裡的兩個別名併成一列，衝突會留下警告', () => {
  const raw = makeExport({
    storeCode: 'D7',
    storeName: '超級棧 - 桃機D7',
    employees: ['阿寶', '阿力'],
    entries: [
      cell('emp01_阿寶', '2026-09-01', { shift: 'MORNING' }),
      cell('emp02_阿力', '2026-09-01', { shift: 'EVENING', raw_text: '晚' }),
      cell('emp02_阿力', '2026-09-02', { shift: 'EVENING', raw_text: '晚' }),
    ],
  })
  const months = [normalizeShiftExport(raw).month]
  const identity = buildIdentity({ 阿寶: { mergedInto: '阿力' } })
  const [merged] = applyIdentity(months, identity)

  assert.equal(merged.people.length, 1)
  assert.equal(merged.people[0].key, '阿力')
  assert.equal(Object.keys(merged.entries['阿力']).length, 2)
  assert.ok(merged.warnings.some((w) => w.includes('2026-09-01')))
})


/* ---------- 支援班配對 ---------- */

const CAR_SHIFT_CODES = ['MORNING', 'MID']

/** 一店與 D7 各派一人在同一天支援 D13；D13 有兩列「支援」，一早一晚。 */
function buildTwoClaimFixture({ d13Slots = ['MORNING', 'EVENING'] } = {}) {
  const central = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['Ann'],
    entries: [cell('emp01_Ann', '2026-09-16', { at_store: 'D13', is_support: true, raw_text: 'T3' })],
  })
  const d7 = makeExport({
    storeCode: 'D7',
    storeName: '超級棧 - 桃機D7',
    employees: ['Lena'],
    entries: [
      cell('emp01_Lena', '2026-09-16', { at_store: 'D13', is_support: true, raw_text: 'T3' }),
    ],
  })
  const d13 = makeExport({
    storeCode: 'D13',
    storeName: '超級棧 - 桃機D13',
    employees: ['Ben', '支援', '支援2'],
    shiftTypes: [
      { code: 'MORNING', label: '早班', marker: '', start: '04:30', end: '13:00' },
      { code: 'EVENING', label: '晚班', marker: '晚', start: '13:00', end: '21:30' },
    ],
    entries: [
      cell('emp01_Ben', '2026-09-16', { shift: 'MORNING', position: 'MAIN_BAR' }),
      ...d13Slots.map((shift, index) =>
        cell(`emp0${index + 2}_${index === 0 ? '支援' : '支援2'}`, '2026-09-16', {
          shift,
          position: 'POS',
          raw_text: shift === 'MORNING' ? '' : '晚',
        })
      ),
    ],
  })
  return [central, d7, d13].map((raw) => normalizeShiftExport(raw).month)
}

test('支援配對：同一天兩人支援、兩個空位時不自動配，標成待指定', () => {
  const months = buildTwoClaimFixture()
  const [group] = buildSupportGroups(months)

  assert.equal(group.atStore, 'D13')
  assert.equal(group.status, SUPPORT_STATUS.AMBIGUOUS)
  assert.equal(group.unresolvedCount, 2)
  assert.deepEqual(group.claims.map((c) => c.personKey).sort(), ['Ann', 'Lena'])
  assert.deepEqual(group.slots.map((s) => s.shift).sort(), ['EVENING', 'MORNING'])

  // 沒配到就維持未定，不會亂猜一個班
  const resolved = resolveSupportShifts(months)
  const alex = resolved.find((m) => m.storeCode === 'central').entries.Ann['2026-09-16']
  assert.equal(alex.shift, 'SUPPORT')
  assert.equal(alex.resolvedShift, undefined)
  assert.equal(alex.start, null)
})

test('支援配對：手動指定之後就對上，早班的人會進早班車', () => {
  const months = buildTwoClaimFixture()
  const links = [
    { date: '2026-09-16', atStore: 'D13', personKey: 'Ann', slotId: '支援' },
    { date: '2026-09-16', atStore: 'D13', personKey: 'Lena', slotId: '支援2' },
  ]

  const [group] = buildSupportGroups(months, links)
  assert.equal(group.status, SUPPORT_STATUS.RESOLVED)
  const claim = group.claims.find((c) => c.personKey === 'Ann')
  assert.equal(claim.resolvedShift, 'MORNING')
  assert.equal(claim.source, 'manual')

  const resolved = resolveSupportShifts(months, links)
  const alex = resolved.find((m) => m.storeCode === 'central').entries.Ann['2026-09-16']
  assert.equal(alex.resolvedShift, 'MORNING')
  assert.equal(alex.resolvedFrom, 'manual')
  assert.equal(alex.start, '04:30')

  // 這就是重點：對上之後 Ann 才會出現在早班車名單裡
  const book = buildShiftBook(resolved)
  const morningCar = getCarLists(book, '2026-09-16', { Ann: 'A21環北站', Lena: '高鐵站' }).find(
    (car) => car.shift === 'MORNING'
  )
  assert.deepEqual(morningCar.groups[0].riders.map((r) => r.name), ['Ann'])
  assert.equal(morningCar.groups[0].riders[0].workStore, 'D13')
})

test('支援配對：沒對上而目的店有早班空位時，明確列為可能漏坐車', () => {
  const months = buildTwoClaimFixture()
  const risks = listCarRiskSupport(months, [], { carShifts: CAR_SHIFT_CODES })

  assert.equal(risks.length, 1)
  assert.deepEqual(risks[0].riskyShifts, ['MORNING'])
  assert.equal(risks[0].date, '2026-09-16')

  // 指定完就不再是風險
  const links = [
    { date: '2026-09-16', atStore: 'D13', personKey: 'Ann', slotId: '支援' },
    { date: '2026-09-16', atStore: 'D13', personKey: 'Lena', slotId: '支援2' },
  ]
  assert.deepEqual(listCarRiskSupport(months, links, { carShifts: CAR_SHIFT_CODES }), [])
})

test('支援配對：目的店只寫一格但兩人都說要去，標成缺空位', () => {
  const months = buildTwoClaimFixture({ d13Slots: ['MORNING'] })
  const [group] = buildSupportGroups(months)
  assert.equal(group.status, SUPPORT_STATUS.AMBIGUOUS)

  // 指定其中一人之後，另一人就變成「目的店沒寫這天的支援班」
  const [after] = buildSupportGroups(months, [
    { date: '2026-09-16', atStore: 'D13', personKey: 'Ann', slotId: '支援' },
  ])
  assert.equal(after.status, SUPPORT_STATUS.MISSING_SLOT)
  assert.equal(after.unresolvedCount, 1)
  assert.equal(after.claims.find((c) => c.personKey === 'Lena').resolvedShift, null)
})

test('支援配對：目的店還沒匯入時說清楚原因，並算成漏坐車風險', () => {
  const central = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['Ann'],
    entries: [cell('emp01_Ann', '2026-09-16', { at_store: 'D13', is_support: true, raw_text: 'T3' })],
  })
  const months = [normalizeShiftExport(central).month]
  const [group] = buildSupportGroups(months)

  assert.equal(group.status, SUPPORT_STATUS.NO_DESTINATION)
  assert.equal(group.destinationImported, false)

  const risks = listCarRiskSupport(months, [], { carShifts: CAR_SHIFT_CODES })
  assert.equal(risks[0].unknownShift, true)
})

test('支援配對：目的店寫了支援班但沒人認領，也要標出來', () => {
  const d13 = makeExport({
    storeCode: 'D13',
    storeName: '超級棧 - 桃機D13',
    employees: ['Ben', '支援'],
    shiftTypes: [{ code: 'MORNING', label: '早班', marker: '', start: '04:30', end: '13:00' }],
    entries: [
      cell('emp01_Ben', '2026-09-16', { shift: 'MORNING' }),
      cell('emp02_支援', '2026-09-16', { shift: 'MORNING', position: 'POS' }),
    ],
  })
  const [group] = buildSupportGroups([normalizeShiftExport(d13).month])
  assert.equal(group.status, SUPPORT_STATUS.EXTRA_SLOT)
  assert.equal(group.claims.length, 0)
  assert.equal(group.slots.length, 1)
})

test('支援配對：一人一空位時照樣自動配，且標成推測', () => {
  const book = buildFixtureBook()
  const entry = book.byId[monthDocId('2026-09', 'central')].entries.Ann['2026-09-02']
  assert.equal(entry.resolvedShift, 'EVENING')
  assert.equal(entry.resolvedFrom, 'inferred')

  const groups = buildSupportGroups(
    [
      book.byId[monthDocId('2026-09', 'central')],
      book.byId[monthDocId('2026-09', 'D13')],
    ].filter(Boolean)
  )
  assert.equal(groups[0].status, SUPPORT_STATUS.RESOLVED)
  assert.equal(groups[0].claims[0].auto, true)
})

test('支援配對：寫明班別的（3早／7晚）班別直接成立，不必配對', () => {
  const months = buildTwoClaimFixture()
  const withDeclared = months.map((month) =>
    month.storeCode === 'central'
      ? {
          ...month,
          entries: {
            Ann: {
              '2026-09-16': {
                ...month.entries.Ann['2026-09-16'],
                shift: 'MORNING',
                raw: '3早',
              },
            },
          },
        }
      : month
  )
  const [group] = buildSupportGroups(withDeclared)
  const alex = group.claims.find((c) => c.personKey === 'Ann')

  // 兩人都要列出來，Ann 的班別已知
  assert.deepEqual(group.claims.map((c) => c.personKey).sort(), ['Ann', 'Lena'])
  assert.equal(alex.declaredShift, 'MORNING')
  assert.equal(alex.resolvedShift, 'MORNING')

  // Ann 認領早班之後只剩 Lena 對晚班，原本的「多人多空位」歧義自己消失了
  const justin = group.claims.find((c) => c.personKey === 'Lena')
  assert.equal(justin.resolvedShift, 'EVENING')
  assert.equal(justin.source, 'auto')
  assert.equal(alex.source, 'sheet')
  assert.equal(group.unresolvedCount, 0)
  assert.equal(group.status, SUPPORT_STATUS.RESOLVED)

  const resolved = resolveSupportShifts(withDeclared)
  const entry = resolved.find((m) => m.storeCode === 'central').entries.Ann['2026-09-16']
  assert.equal(entry.resolvedFrom, 'sheet')
  assert.equal(entry.start, '04:30')
})

test('支援配對：寫明班別的會認領目的店的空位，不會被誤報成沒人認領', () => {
  // D7 的 Lena 寫「3早」＝去 D13 上早班；D13 的「支援」列同一天也寫了早班。
  // 這一格是有人認領的，不能報成「目的店有支援班，但沒有店寫是誰去」。
  const d7 = makeExport({
    storeCode: 'D7',
    storeName: '超級棧 - 桃機D7',
    employees: ['Lena'],
    entries: [
      cell('emp01_Lena', '2026-09-24', {
        shift: 'MORNING',
        at_store: 'D13',
        is_support: true,
        raw_text: '3早',
      }),
    ],
  })
  const d13 = makeExport({
    storeCode: 'D13',
    storeName: '超級棧 - 桃機D13',
    employees: ['Ben', '支援'],
    shiftTypes: [{ code: 'MORNING', label: '早班', marker: '', start: '04:30', end: '13:00' }],
    entries: [
      cell('emp01_Ben', '2026-09-24', { shift: 'MORNING' }),
      cell('emp02_支援', '2026-09-24', { shift: 'MORNING', position: 'MAIN_BAR' }),
    ],
  })
  const months = [d7, d13].map((raw) => normalizeShiftExport(raw).month)
  const [group] = buildSupportGroups(months)

  assert.equal(group.status, SUPPORT_STATUS.RESOLVED)
  assert.equal(group.needsAttention, false)
  assert.equal(group.unresolvedCount, 0)
  assert.equal(group.slots[0].takenBy, 'Lena')
  // 紙本就寫「3早」，不是被系統猜出來或人工指定的
  assert.equal(group.claims[0].source, 'sheet')
  assert.equal(listUnresolvedSupport(months).length, 0)
  assert.deepEqual(listCarRiskSupport(months, [], { carShifts: CAR_SHIFT_CODES }), [])
})

test('支援配對：班別對不上的空位仍算沒人認領', () => {
  // 來源寫「3早」但目的店那天寫的是晚班 —— 兩件不同的事，不能硬湊
  const d7 = makeExport({
    storeCode: 'D7',
    storeName: '超級棧 - 桃機D7',
    employees: ['Lena'],
    entries: [
      cell('emp01_Lena', '2026-09-24', {
        shift: 'MORNING',
        at_store: 'D13',
        is_support: true,
        raw_text: '3早',
      }),
    ],
  })
  const d13 = makeExport({
    storeCode: 'D13',
    storeName: '超級棧 - 桃機D13',
    employees: ['Ben', '支援'],
    shiftTypes: [
      { code: 'MORNING', label: '早班', marker: '', start: '04:30', end: '13:00' },
      { code: 'EVENING', label: '晚班', marker: '晚', start: '13:00', end: '21:30' },
    ],
    entries: [
      cell('emp01_Ben', '2026-09-24', { shift: 'MORNING' }),
      cell('emp02_支援', '2026-09-24', { shift: 'EVENING', raw_text: '晚' }),
    ],
  })
  const [group] = buildSupportGroups([d7, d13].map((raw) => normalizeShiftExport(raw).month))
  assert.equal(group.status, SUPPORT_STATUS.EXTRA_SLOT)
  assert.equal(group.claims[0].resolvedShift, 'MORNING')
  assert.equal(group.unresolvedCount, 0)
})

test('支援配對：未對上的清單可依日期範圍過濾', () => {
  const months = buildTwoClaimFixture()
  assert.equal(listUnresolvedSupport(months).length, 1)
  assert.equal(
    listUnresolvedSupport(months, [], { from: '2026-09-01', to: '2026-09-15' }).length,
    0
  )
  assert.equal(
    listUnresolvedSupport(months, [], { from: '2026-09-16', to: '2026-09-16' }).length,
    1
  )
})


test('個人月視圖：支援班的班別時間與崗位讀目的店的表', () => {
  const central = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['Ann'],
    // 來源店沒有 SUB_BAR 這個崗位，晚班也是 14:00 起
    positions: [{ code: 'MAIN_BAR', label: '主吧', color: '#f9bf90' }],
    entries: [
      cell('emp01_Ann', '2026-09-16', { at_store: 'D13', is_support: true, raw_text: 'T3' }),
    ],
  })
  const d13 = makeExport({
    storeCode: 'D13',
    storeName: '超級棧 - 桃機D13',
    employees: ['Ben', '支援'],
    shiftTypes: [{ code: 'EVENING', label: '晚班', marker: '晚', start: '13:00', end: '21:30' }],
    positions: [{ code: 'SUB_BAR', label: '副吧', color: '#a6a6a6' }],
    entries: [
      cell('emp01_Ben', '2026-09-16', { shift: 'EVENING', raw_text: '晚' }),
      cell('emp02_支援', '2026-09-16', { shift: 'EVENING', position: 'SUB_BAR', raw_text: '晚' }),
    ],
  })
  const book = buildShiftBook(
    resolveSupportShifts([central, d13].map((raw) => normalizeShiftExport(raw).month))
  )
  const [record] = getPersonMonthEntries(book, 'Ann', '2026-09').get('2026-09-16')

  assert.equal(record.workStore, 'D13')
  assert.equal(record.start, '13:00')
  assert.equal(record.end, '21:30')
  // 崗位名稱只有 D13 的表裡有，讀來源店會查不到
  assert.equal(record.positionLabel, '副吧')
  assert.equal(record.displayMonth.storeCode, 'D13')
  assert.equal(record.destinationMissing, false)

  const [event] = buildPersonIcsEvents(book, 'Ann', { monthKeys: ['2026-09'] })
  assert.deepEqual(event.start, [2026, 9, 16, 13, 0])
  assert.equal(event.location, '桃機D13')
  assert.match(event.title, /副吧/)
})

test('個人月視圖：目的店班表沒匯入時標出來，行事曆也註明', () => {
  const central = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['Ann'],
    entries: [
      cell('emp01_Ann', '2026-09-16', {
        shift: 'EVENING',
        at_store: 'D13',
        is_support: true,
        raw_text: '3晚',
      }),
    ],
  })
  const book = buildShiftBook(resolveSupportShifts([normalizeShiftExport(central).month]))
  const [record] = getPersonMonthEntries(book, 'Ann', '2026-09').get('2026-09-16')

  assert.equal(record.destinationMissing, true)
  // 還是會用 D13 的預設時間，而不是來源店的 14:00
  assert.equal(record.start, '13:00')

  const summary = summarizePersonMonth(book, 'Ann', '2026-09')
  assert.equal(summary.destinationMissingDays, 1)

  const [event] = buildPersonIcsEvents(book, 'Ann', { monthKeys: ['2026-09'] })
  assert.match(event.description, /還沒匯入/)
})

test('匯出：司機版只有站點與人數，不含任何姓名', () => {
  const book = buildFixtureBook()
  const table = buildPickupTable(book, {
    from: '2026-09-01',
    to: '2026-09-01',
    pickupByPerson: { 小明: 'A21環北站', Ann: '高鐵站', Ben: 'A21環北站' },
  })

  const driverText = renderDriverText(table)
  assert.match(driverText, /早班車 04:00 發車（共 2 人）/)
  assert.match(driverText, /A21環北站　2 人/)
  assert.doesNotMatch(driverText, /小明|Ben|Ann/)

  const driverTsv = renderDriverTsv(table)
  assert.doesNotMatch(driverTsv, /小明|Ben|Ann/)
  // 每列不再帶「整列合計」欄，只保留每天的人數
  assert.match(driverTsv.split('\n')[1], /^早班車 04:00\tA21環北站\t2$/)
  assert.doesNotMatch(driverTsv, /合計/)
  assert.match(driverTsv, /早班車 04:00\t小計\t2/)

  // 店內版仍然有名字
  assert.match(renderPickupText(table), /小明/)
})

test('匯出：司機版沒人搭車的日子寫「今日不發車」', () => {
  const book = buildFixtureBook()
  const table = buildPickupTable(book, {
    from: '2026-09-03',
    to: '2026-09-03',
    pickupByPerson: { 小明: 'A21環北站' },
  })
  assert.match(renderDriverText(table), /今日不發車/)
})


/* ---------- 崗位色票：感知距離與色覺缺陷模擬 ---------- */

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const srgbToLinear = (c) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const linearToSrgb = (c) => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
  return Math.max(0, Math.min(255, Math.round(v * 255)))
}

/** Viénot 1999 二色覺模擬。色相辨識沒了，明度還在 —— 這正是色票要靠明度階梯的原因。 */
function simulateCvd(hex, type) {
  const [R, G, B] = hex2rgb(hex).map(srgbToLinear)
  let L = 17.8824 * R + 43.5161 * G + 4.11935 * B
  let M = 3.45565 * R + 27.1554 * G + 3.86714 * B
  let S = 0.0299566 * R + 0.184309 * G + 1.46709 * B
  if (type === 'protan') L = 2.02344 * M - 2.52581 * S
  if (type === 'deutan') M = 0.494207 * L + 1.24827 * S
  if (type === 'tritan') S = -0.395913 * L + 0.801109 * M
  return [
    linearToSrgb(0.0809444479 * L - 0.130504409 * M + 0.116721066 * S),
    linearToSrgb(-0.0102485335 * L + 0.0540193266 * M - 0.113614708 * S),
    linearToSrgb(-0.000365296938 * L - 0.00412161469 * M + 0.693511405 * S),
  ]
}

function toLab(rgb) {
  const [r, g, b] = rgb.map(srgbToLinear)
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}
const deltaE = (a, b) => Math.hypot(...toLab(a).map((v, i) => v - toLab(b)[i]))
const relLum = (hex) => {
  const [r, g, b] = hex2rgb(hex).map(srgbToLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (fg, bg) => {
  const a = relLum(fg)
  const b = relLum(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** 三家店實際會同時出現在同一張班表上的崗位組合 */
const STORE_POSITION_SETS = {
  central: ['MAIN_BAR', 'POUR_OVER', 'LIGHT_MEAL', 'POS'],
  D7: ['MAIN_BAR', 'SUB_BAR', 'POUR_OVER', 'LIGHT_MEAL', 'POS'],
  D13: ['MAIN_BAR', 'LIGHT_MEAL', 'POS'],
}

test('崗位色：一般視覺下任兩個崗位都明顯不同', () => {
  const codes = Object.keys(POSITION_TOKENS).filter((code) => code !== 'NONE')
  codes.forEach((a) => {
    codes.forEach((b) => {
      if (a >= b) return
      const d = deltaE(hex2rgb(POSITION_TOKENS[a].bg), hex2rgb(POSITION_TOKENS[b].bg))
      assert.ok(d > 20, `${a} 與 ${b} 的底色太接近（ΔE ${d.toFixed(0)}）`)
    })
  })
})

test('崗位色：明度拉成階梯，色盲下才有東西可分', () => {
  const codes = Object.keys(POSITION_TOKENS).filter((code) => code !== 'NONE')
  const lightness = codes.map((code) => toLab(hex2rgb(POSITION_TOKENS[code].bg))[0])
  const spread = Math.max(...lightness) - Math.min(...lightness)
  // 舊色票全擠在 L* 75–91（跨距 16），色相一被拿掉就整組糊在一起
  assert.ok(spread > 20, `明度跨距只有 ${spread.toFixed(0)}，不足以在色盲下分辨`)
})

test('崗位色：各店實際的崗位組合在三種色盲下都分得出來', () => {
  Object.entries(STORE_POSITION_SETS).forEach(([store, codes]) => {
    ;['deutan', 'protan', 'tritan'].forEach((type) => {
      codes.forEach((a) => {
        codes.forEach((b) => {
          if (a >= b) return
          const d = deltaE(
            simulateCvd(POSITION_TOKENS[a].bg, type),
            simulateCvd(POSITION_TOKENS[b].bg, type)
          )
          assert.ok(d > 12, `${store} 的 ${a} 與 ${b} 在 ${type} 下太接近（ΔE ${d.toFixed(0)}）`)
        })
      })
    })
  })
})

test('崗位色：顏色不是唯一載體 —— 每個崗位都有可印出來的字', () => {
  Object.entries(POSITION_TOKENS).forEach(([code, token]) => {
    if (code === 'NONE') return
    assert.ok(token.initial && token.initial.length <= 2, `${code} 缺少可辨識的崗位字`)
  })
  const initials = Object.entries(POSITION_TOKENS)
    .filter(([code]) => code !== 'NONE')
    .map(([, token]) => token.initial)
  assert.equal(new Set(initials).size, initials.length, '崗位字不能重複')
})

test('崗位色：格子內文字對比全部達 AA', () => {
  Object.entries(POSITION_TOKENS).forEach(([code, token]) => {
    if (code === 'NONE') return
    const ratio = contrast(token.fg, token.bg)
    assert.ok(ratio >= 4.5, `${code} 的文字對比只有 ${ratio.toFixed(2)}:1`)
  })
})

test('崗位色：整格上色與小標記各有一組值，且不用匯入檔的像素色', () => {
  const { month } = normalizeShiftExport(
    makeExport({
      storeCode: 'D13',
      storeName: '超級棧 - 桃機D13',
      employees: ['Ben'],
      positions: [{ code: 'POS', label: 'POS', color: '#fafd58' }],
      entries: [cell('emp01_Ben', '2026-09-01', { shift: 'MORNING', position: 'POS' })],
    })
  )
  const display = getPositionDisplay(month, 'POS')
  assert.ok(display.bg && display.fg && display.color)
  assert.notEqual(display.bg, '#fafd58')
  assert.notEqual(display.color, '#fafd58')
})


test('交通車：發車時間比到店時間早半小時，兩台車各自標示', () => {
  assert.equal(CAR_DEPARTURE.MORNING, '04:00')
  assert.equal(CAR_DEPARTURE.MID, '05:00')
  assert.equal(carLabelWithTime('MORNING'), '早班車 04:00')
  assert.equal(carLabelWithTime('MID'), '中班車 05:00')

  const book = buildFixtureBook()
  const table = buildPickupTable(book, {
    from: '2026-09-01',
    to: '2026-09-01',
    pickupByPerson: { 小明: 'A21環北站', Ann: '高鐵站' },
  })
  assert.deepEqual(
    table.sections.map((s) => [s.label, s.departure]),
    [
      ['早班車', '04:00'],
      ['中班車', '05:00'],
    ]
  )
})


test('週視圖：整月切成週日起頭的週，最後一段可以不滿七天', () => {
  // 2026-09-01 是週二，所以第一段只有 5 天（二～六）
  const dates = Array.from(
    { length: 30 },
    (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`
  )
  const weeks = chunkIntoWeeks(dates)

  assert.equal(weeks[0].length, 5)
  assert.equal(weeks[0][0], '2026-09-01')
  assert.equal(weeks[1][0], '2026-09-06')
  assert.equal(weeks[1].length, 7)
  assert.equal(weeks.flat().length, 30)
  weeks.slice(1).forEach((week) => {
    assert.equal(new Date(week[0]).getUTCDay(), 0, `${week[0]} 不是週日`)
  })
  assert.deepEqual(chunkIntoWeeks([]), [])
})

test('匯出選項：店名與崗位可以各自關掉，休假可選要不要匯出', () => {
  const book = buildFixtureBook()
  const all = buildPersonIcsEvents(book, '小明', {
    monthKeys: ['2026-09'],
    includeStore: true,
    includePosition: true,
  })
  const morning = all.find((e) => e.start.length === 5 && e.start[2] === 1)
  assert.equal(morning.title, '早班 · 桃機一店 · 主吧')
  assert.equal(morning.location, '桃機一店')

  const noStore = buildPersonIcsEvents(book, '小明', {
    monthKeys: ['2026-09'],
    includeStore: false,
    includePosition: true,
  }).find((e) => e.start[2] === 1)
  assert.equal(noStore.title, '早班 · 主吧')
  // 關掉店名時連地點欄位也不寫，而不是留一個空字串
  assert.equal('location' in noStore, false)

  const bare = buildPersonIcsEvents(book, '小明', {
    monthKeys: ['2026-09'],
    includeStore: false,
    includePosition: false,
  }).find((e) => e.start[2] === 1)
  assert.equal(bare.title, '早班')

  // 休假預設不匯出（行事曆留白）
  assert.equal(all.length, 2)
  assert.equal(
    buildPersonIcsEvents(book, '小明', { monthKeys: ['2026-09'], includeLeave: true }).length,
    3
  )
})


test('格子說明：判不出班別的上班格要說清楚，不能只寫「上班」', () => {
  const { month } = normalizeShiftExport(
    makeExport({
      storeCode: 'central',
      storeName: '超級棧 - 桃機一店',
      employees: ['Evan'],
      entries: [
        // 轉檔判出這天有上班，但判不出是哪一班
        { ...cell('emp01_Evan', '2026-09-08', {}), shift: null, position: null, raw_text: '' },
      ],
    })
  )
  const entry = month.entries.Evan['2026-09-08']
  assert.equal(entry.kind, 'WORK')
  assert.equal(entry.shift, null)

  const text = describeEntry(entry, month)
  assert.match(text, /判不出班別/)
  assert.match(text, /對照原圖/)
  assert.notEqual(text, '上班')
})

test('格子說明：正常的班還是簡潔的一行', () => {
  const { month } = normalizeShiftExport(
    makeExport({
      storeCode: 'central',
      storeName: '超級棧 - 桃機一店',
      employees: ['Evan'],
      entries: [cell('emp01_Evan', '2026-09-08', { shift: 'EVENING', position: 'POS', raw_text: '晚' })],
    })
  )
  assert.equal(
    describeEntry(month.entries.Evan['2026-09-08'], month),
    '晚班 · 14:00–22:30 · POS'
  )
})


/* ---------- 對照轉換器的資料契約 ---------- */

test('契約：schema 主版本不同就擋下來，缺版本則警告', () => {
  const base = makeExport({
    storeCode: 'D7',
    storeName: '超級棧 - 桃機D7',
    employees: ['Gina'],
    entries: [cell('emp01_Gina', '2026-09-01', { shift: 'MORNING' })],
  })

  assert.equal(normalizeShiftExport({ ...base, schema_version: '1.4.2' }).ok, true)

  const future = normalizeShiftExport({ ...base, schema_version: '2.0.0' })
  assert.equal(future.ok, false)
  assert.match(future.error, /schema 版本/)
  assert.match(future.error, /2\.0\.0/)

  const missing = normalizeShiftExport({ ...base, schema_version: undefined })
  assert.equal(missing.ok, true)
  assert.ok(missing.warnings.some((w) => w.includes('schema_version')))
})

test('契約：菜口是 VEG_STATION，舊的 COUNTER 仍對得到同一個崗位', () => {
  const { month } = normalizeShiftExport(
    makeExport({
      storeCode: 'D7',
      storeName: '超級棧 - 桃機D7',
      employees: ['Gina'],
      positions: [{ code: 'VEG_STATION', label: '菜口', color: '#ff00ff' }],
      entries: [cell('emp01_Gina', '2026-09-01', { shift: 'MORNING', position: 'VEG_STATION' })],
    })
  )
  const display = getPositionDisplay(month, 'VEG_STATION')
  assert.equal(display.label, '菜口')
  assert.equal(display.known, true)
  assert.equal(display.initial, '菜')
  // 舊代碼進來也要對到同一組色票，不能掉進未知崗位的後備色
  assert.deepEqual(
    [getPositionDisplay(month, 'COUNTER').bg, getPositionDisplay(month, 'COUNTER').initial],
    [display.bg, display.initial]
  )
  // 匯入時就正規化，下游只會看到 VEG_STATION
  assert.equal(month.entries.Gina['2026-09-01'].position, 'VEG_STATION')
})

test('契約：kind UNKNOWN 不能被當成一個正常的班', () => {
  const { month } = normalizeShiftExport(
    makeExport({
      storeCode: 'D7',
      storeName: '超級棧 - 桃機D7',
      employees: ['Gina'],
      entries: [
        { ...cell('emp01_Gina', '2026-09-01', {}), kind: 'UNKNOWN', shift: null, raw_text: '?' },
      ],
    })
  )
  const entry = month.entries.Gina['2026-09-01']
  assert.equal(entry.kind, 'UNKNOWN')

  // 不進出勤名單、不進統計
  const book = buildShiftBook([month])
  assert.equal(getWorkingAssignments(book, '2026-09-01').length, 0)
  // 人還是列得出來，但不算成上班也不算成休假
  const summary = computePersonSummaries(book).find((s) => s.personKey === 'Gina')
  assert.equal(summary.workDays, 0)
  assert.equal(summary.leaveDays, 0)

  // 說明要講清楚，不能沿用上班的文案
  const text = describeEntry(entry, month)
  assert.match(text, /認不出/)
  assert.match(text, /對照原圖/)
})

test('契約：時間以格子自己的 ISO 為準，跨夜由日期差判定', () => {
  const { month } = normalizeShiftExport(
    makeExport({
      storeCode: 'D13',
      storeName: '超級棧 - 桃機D13',
      employees: ['Ben'],
      shiftTypes: [{ code: 'EVENING', label: '晚班', marker: '晚', start: '13:00', end: '21:30' }],
      entries: [
        {
          ...cell('emp01_Ben', '2026-09-01', { shift: 'EVENING', raw_text: '晚' }),
          // 這一格實際跨夜，且與班別表的通則時間不同
          start: '2026-09-01T22:00:00+08:00',
          end: '2026-09-02T06:00:00+08:00',
        },
      ],
    })
  )
  const entry = month.entries.Ben['2026-09-01']
  assert.equal(entry.start, '22:00')
  assert.equal(entry.end, '06:00')
  assert.equal(entry.crossesMidnight, true)
})

test('契約：沒有 ISO 時間時退回班別表', () => {
  const { month } = normalizeShiftExport(
    makeExport({
      storeCode: 'D13',
      storeName: '超級棧 - 桃機D13',
      employees: ['Ben'],
      shiftTypes: [{ code: 'EVENING', label: '晚班', marker: '晚', start: '13:00', end: '21:30' }],
      entries: [cell('emp01_Ben', '2026-09-01', { shift: 'EVENING', raw_text: '晚' })],
    })
  )
  const entry = month.entries.Ben['2026-09-01']
  assert.equal(entry.start, '13:00')
  assert.equal(entry.end, '21:30')
  assert.equal(entry.crossesMidnight, false)
})


test('契約：班表 Total 列會被保留，用來對照本店人力', () => {
  const raw = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['小明', 'Ann'],
    entries: [
      cell('emp01_小明', '2026-09-01', { shift: 'MORNING' }),
      // Ann 這天去 D13 支援 —— 不算本店人力
      cell('emp02_Ann', '2026-09-01', { at_store: 'D13', is_support: true, raw_text: 'T3' }),
    ],
  })
  raw.days[0].total = 1
  raw.days[0].total_source = 'auto'
  raw.days[1].total = 5

  const { month } = normalizeShiftExport(raw)
  assert.equal(month.days['2026-09-01'].total, 1)
  assert.equal(month.days['2026-09-01'].totalSource, 'auto')
  assert.equal(month.days['2026-09-02'].total, 5)
  // 沒寫 total 的日子是 null，不是 0
  assert.equal(month.days['2026-09-03'].total, null)
})

test('契約：本店人力不含去別店支援的人', () => {
  // Total 列的定義就是這樣算的；把支援出去的人算進來會虛胖
  const { month } = normalizeShiftExport(
    makeExport({
      storeCode: 'central',
      storeName: '超級棧 - 桃機一店',
      employees: ['小明', 'Ann'],
      entries: [
        cell('emp01_小明', '2026-09-01', { shift: 'MORNING' }),
        cell('emp02_Ann', '2026-09-01', { at_store: 'D13', is_support: true, raw_text: 'T3' }),
      ],
    })
  )
  const onSite = Object.values(month.entries).filter(
    (byDate) => byDate['2026-09-01']?.kind === 'WORK' && !byDate['2026-09-01'].isSupport
  ).length
  assert.equal(onSite, 1)
})


test('契約：目的店寫了 visitor 就照名字對，不必靠數量湊', () => {
  // 兩人同一天支援 D13、D13 有兩格 —— 沒有 visitor 時這是「多人多空位」歧義
  const months = buildTwoClaimFixture()
  assert.equal(buildSupportGroups(months)[0].status, SUPPORT_STATUS.AMBIGUOUS)

  // 加上 visitor 之後就不歧義了
  const withVisitor = months.map((month) => {
    if (month.storeCode !== 'D13') return month
    const entries = { ...month.entries }
    entries['支援'] = {
      '2026-09-16': { ...entries['支援']['2026-09-16'], visitor: 'Lena' },
    }
    entries['支援2'] = {
      '2026-09-16': { ...entries['支援2']['2026-09-16'], visitor: 'Ann' },
    }
    return { ...month, entries }
  })

  const [group] = buildSupportGroups(withVisitor)
  assert.equal(group.status, SUPPORT_STATUS.RESOLVED)
  assert.equal(group.unresolvedCount, 0)

  const justin = group.claims.find((c) => c.personKey === 'Lena')
  const alex = group.claims.find((c) => c.personKey === 'Ann')
  assert.equal(justin.source, 'visitor')
  assert.equal(alex.source, 'visitor')
  // 支援列是早班、支援2 是晚班，名字決定誰配到哪一格
  assert.equal(justin.resolvedShift, 'MORNING')
  assert.equal(alex.resolvedShift, 'EVENING')
})

test('契約：visitor 有名字但來源店沒匯入時，至少講得出是誰', () => {
  const d13 = makeExport({
    storeCode: 'D13',
    storeName: '超級棧 - 桃機D13',
    employees: ['Ben', '支援'],
    shiftTypes: [{ code: 'EVENING', label: '晚班', marker: '晚', start: '13:00', end: '21:30' }],
    entries: [
      cell('emp01_Ben', '2026-09-16', { shift: 'EVENING', raw_text: '晚' }),
      { ...cell('emp02_支援', '2026-09-16', { shift: 'EVENING', raw_text: '晚' }), visitor: 'Hank' },
    ],
  })
  const [group] = buildSupportGroups([normalizeShiftExport(d13).month])

  assert.equal(group.status, SUPPORT_STATUS.EXTRA_SLOT)
  assert.deepEqual(group.unclaimedVisitors, ['Hank'])
})

test('契約：目前的檔案還沒有 visitor，缺這個欄位也要能跑', () => {
  const book = buildFixtureBook()
  const entry = book.byId[monthDocId('2026-09', 'D13')].entries['支援']['2026-09-02']
  assert.equal(entry.visitor, null)
  // 沒有 visitor 時退回原本的一對一自動配
  const alex = book.byId[monthDocId('2026-09', 'central')].entries.Ann['2026-09-02']
  assert.equal(alex.resolvedShift, 'EVENING')
  assert.equal(alex.resolvedFrom, 'inferred')
})


test('契約：visitor 名字對不起來時記錄下來，但不做模糊比對', () => {
  // 實際遇過：D13 備註寫「Yuni」，真正的人叫「Finn」
  const central = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['Finn'],
    entries: [
      cell('emp01_Finn', '2026-09-04', { at_store: 'D13', is_support: true, raw_text: 'T3' }),
    ],
  })
  const d13 = makeExport({
    storeCode: 'D13',
    storeName: '超級棧 - 桃機D13',
    employees: ['Ben', '支援'],
    shiftTypes: [{ code: 'EVENING', label: '晚班', marker: '晚', start: '13:00', end: '21:30' }],
    entries: [
      cell('emp01_Ben', '2026-09-04', { shift: 'EVENING', raw_text: '晚' }),
      { ...cell('emp02_支援', '2026-09-04', { shift: 'EVENING', raw_text: '晚' }), visitor: 'Yuni' },
    ],
  })
  const months = [central, d13].map((raw) => normalizeShiftExport(raw).month)
  const [group] = buildSupportGroups(months)

  assert.deepEqual(group.visitorMismatches, [
    { visitor: 'Yuni', candidates: ['Finn'], ambiguous: false },
  ])
  // 沒有硬湊成 Finn；班別仍由一對一規則補出來
  const claim = group.claims[0]
  assert.equal(claim.source, 'auto')
  assert.equal(claim.resolvedShift, 'EVENING')
  assert.equal(group.status, SUPPORT_STATUS.RESOLVED)
})

test('契約：Total 的來源與信心度都要保留', () => {
  const raw = makeExport({
    storeCode: 'D7',
    storeName: '超級棧 - 桃機D7',
    employees: ['Gina'],
    entries: [cell('emp01_Gina', '2026-09-01', { shift: 'MORNING' })],
  })
  raw.days[0].total = 6
  raw.days[0].total_source = 'cells'
  raw.days[0].total_confidence = 0.4

  const { month } = normalizeShiftExport(raw)
  assert.equal(month.days['2026-09-01'].totalSource, 'cells')
  assert.equal(month.days['2026-09-01'].totalConfidence, 0.4)
})


test('契約：候選名單跟當天實際去支援的人取交集，剛好一個才算數', () => {
  // 實資料：D13 備註「Yuni」比對名單後候選是 Evan／Finn，
  // 但那天只有 Finn 說要去 D13 —— 交集唯一，可以定案。
  const central = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['Finn', 'Evan'],
    entries: [
      cell('emp01_Finn', '2026-08-04', { at_store: 'D13', is_support: true, raw_text: 'T3' }),
      cell('emp02_Evan', '2026-08-04', { shift: 'EVENING', raw_text: '晚' }),
    ],
  })
  const d13 = makeExport({
    storeCode: 'D13',
    storeName: '超級棧 - 桃機D13',
    employees: ['Ben', '支援'],
    shiftTypes: [{ code: 'EVENING', label: '晚班', marker: '晚', start: '13:00', end: '21:30' }],
    entries: [
      cell('emp01_Ben', '2026-08-04', { shift: 'EVENING', raw_text: '晚' }),
      {
        ...cell('emp02_支援', '2026-08-04', { shift: 'EVENING', raw_text: '晚' }),
        visitor: 'Yuni',
        visitor_resolved: null,
        visitor_match: 'ambiguous',
        visitor_candidates: ['Evan', 'Finn'],
      },
    ],
  })
  const [group] = buildSupportGroups(
    [central, d13].map((raw) => normalizeShiftExport(raw).month)
  )

  const claim = group.claims.find((c) => c.personKey === 'Finn')
  assert.equal(claim.source, 'visitorNarrowed')
  assert.equal(claim.resolvedShift, 'EVENING')
  assert.equal(group.status, SUPPORT_STATUS.RESOLVED)
  assert.deepEqual(group.visitorMismatches, [])
  // 備註原文一定保留，不被改寫成 Finn
  assert.equal(group.slots[0].visitor, 'Yuni')
})

test('契約：交集不只一個就不定案', () => {
  const central = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['Finn', 'Evan'],
    entries: [
      cell('emp01_Finn', '2026-08-04', { at_store: 'D13', is_support: true, raw_text: 'T3' }),
      cell('emp02_Evan', '2026-08-04', { at_store: 'D13', is_support: true, raw_text: 'T3' }),
    ],
  })
  const d13 = makeExport({
    storeCode: 'D13',
    storeName: '超級棧 - 桃機D13',
    employees: ['Ben', '支援'],
    shiftTypes: [{ code: 'EVENING', label: '晚班', marker: '晚', start: '13:00', end: '21:30' }],
    entries: [
      cell('emp01_Ben', '2026-08-04', { shift: 'EVENING', raw_text: '晚' }),
      {
        ...cell('emp02_支援', '2026-08-04', { shift: 'EVENING', raw_text: '晚' }),
        visitor: 'Yuni',
        visitor_match: 'ambiguous',
        visitor_candidates: ['Evan', 'Finn'],
      },
    ],
  })
  const [group] = buildSupportGroups(
    [central, d13].map((raw) => normalizeShiftExport(raw).month)
  )
  // 兩個候選都在當天去 D13 —— 交集不唯一，不猜
  assert.equal(group.visitorMismatches[0].ambiguous, true)
  assert.deepEqual(group.visitorMismatches[0].candidates.sort(), ['Evan', 'Finn'])
  assert.equal(group.claims.every((c) => c.source !== 'visitorNarrowed'), true)
})


/* ---------- atStore 可能是 null ---------- */

test('契約：只寫一個「支」（atStore 為 null）也絕不算本店人力', () => {
  // 判斷依據是 isSupport，不是 atStore 有沒有值
  const { month } = normalizeShiftExport(
    makeExport({
      storeCode: 'D7',
      storeName: '超級棧 - 桃機D7',
      employees: ['Gina', 'Cody'],
      entries: [
        cell('emp01_Gina', '2026-09-01', { shift: 'MORNING' }),
        cell('emp02_Cody', '2026-09-01', { is_support: true, raw_text: '支' }),
      ],
    })
  )
  const jessie = month.entries.Cody['2026-09-01']
  assert.equal(jessie.isSupport, true)
  assert.equal(jessie.atStore, null)

  const book = buildShiftBook([month])
  const jessieAssignment = getWorkingAssignments(book, '2026-09-01').find(
    (a) => a.name === 'Cody'
  )
  // 人在別處，但不知道哪一家 —— 不能退回本店
  assert.equal(jessieAssignment.workStore, null)
  assert.equal(jessieAssignment.supportStoreUnknown, true)

  const d7 = groupWorkingByStore(getWorkingAssignments(book, '2026-09-01')).find(
    (s) => s.storeCode === 'D7'
  )
  assert.deepEqual(d7.people ?? d7.shifts.flatMap((x) => x.people).map((p) => p.name), ['Gina'])

  // 本店人力比照 Total 列：只算 WORK 且非支援
  const onSite = Object.values(month.entries).filter(
    (byDate) => byDate['2026-09-01']?.kind === 'WORK' && !byDate['2026-09-01'].isSupport
  ).length
  assert.equal(onSite, 1)
})

test('契約：沒寫去哪家店時，用「同月哪家店自己的表上有他」反推，唯一才算', () => {
  // 實資料：D7 的 Cody 5/13 只寫「支」，而一店的表上那天有 Cody 上晚班
  const d7 = makeExport({
    storeCode: 'D7',
    storeName: '超級棧 - 桃機D7',
    employees: ['Cody'],
    entries: [cell('emp01_Cody', '2026-09-01', { is_support: true, raw_text: '支' })],
  })
  const central = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['Cody'],
    entries: [cell('emp01_Cody', '2026-09-01', { shift: 'EVENING', raw_text: '晚' })],
  })
  const months = resolveSupportShifts(
    [d7, central].map((raw) => normalizeShiftExport(raw).month)
  )
  const entry = months.find((m) => m.storeCode === 'D7').entries.Cody['2026-09-01']

  assert.equal(entry.resolvedAtStore, 'central')
  assert.equal(entry.destinationFrom, 'ownRecord')
  // 一店自己的表上已經有這筆班了，這一格只是註記
  assert.equal(entry.isShadow, true)
})

test('契約：目的店自己有這個人的班時，支援格不再重複列一次', () => {
  // 實資料：一店的 Ann 5/13 標記支援 D7，而 D7 自己的表上 Ann 上中班
  const central = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['Ann'],
    entries: [
      cell('emp01_Ann', '2026-09-01', { at_store: 'D7', is_support: true, raw_text: 'T3' }),
    ],
  })
  const d7 = makeExport({
    storeCode: 'D7',
    storeName: '超級棧 - 桃機D7',
    employees: ['Ann', 'Gina'],
    entries: [
      cell('emp01_Ann', '2026-09-01', { shift: 'MID', position: 'MAIN_BAR', raw_text: '中' }),
      cell('emp02_Gina', '2026-09-01', { shift: 'MORNING' }),
    ],
  })
  const book = buildShiftBook(
    resolveSupportShifts([central, d7].map((raw) => normalizeShiftExport(raw).month))
  )
  const atD7 = getWorkingAssignments(book, '2026-09-01').filter((a) => a.workStore === 'D7')

  // Ann 只能出現一次，而且帶的是 D7 自己那筆的班別與崗位
  assert.equal(atD7.filter((a) => a.name === 'Ann').length, 1)
  assert.equal(atD7.find((a) => a.name === 'Ann').shift, 'MID')
  assert.equal(atD7.find((a) => a.name === 'Ann').positionLabel, '主吧')
  assert.equal(atD7.length, 2)

  // 跨店仍然看得出來 —— 那筆班掛在 D7 底下
  const summary = computePersonSummaries(book).find((s) => s.personKey === 'Ann')
  assert.deepEqual(summary.byStore, { D7: 1 })
})


/* ---------- 轉換器 --link 後處理 ---------- */

test('契約：duplicate_of 直接標出互換班，不必自己推', () => {
  const central = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['Ann'],
    entries: [
      {
        ...cell('emp01_Ann', '2026-09-01', { at_store: 'D7', is_support: true, raw_text: 'T3' }),
        duplicate_of: { store: 'D7', employee_id: 'D7_Ann' },
      },
    ],
  })
  const d7 = makeExport({
    storeCode: 'D7',
    storeName: '超級棧 - 桃機D7',
    employees: ['Ann'],
    entries: [cell('emp01_Ann', '2026-09-01', { shift: 'MID', raw_text: '中' })],
  })
  const months = resolveSupportShifts(
    [central, d7].map((raw) => normalizeShiftExport(raw).month)
  )
  const entry = months.find((m) => m.storeCode === 'central').entries.Ann['2026-09-01']

  assert.deepEqual(entry.duplicateOf, { store: 'D7', employeeId: 'D7_Ann' })
  assert.equal(entry.isShadow, true)
  assert.equal(entry.shadowOf, 'D7')

  // 目的店那筆才算數，Ann 在 D7 只出現一次
  const book = buildShiftBook(months)
  const atD7 = getWorkingAssignments(book, '2026-09-01').filter((a) => a.workStore === 'D7')
  assert.equal(atD7.length, 1)
  assert.equal(atD7[0].shift, 'MID')
})

test('契約：at_store_source 記錄目的地是怎麼來的', () => {
  const { month } = normalizeShiftExport(
    makeExport({
      storeCode: 'D7',
      storeName: '超級棧 - 桃機D7',
      employees: ['Cody'],
      entries: [
        {
          ...cell('emp01_Cody', '2026-09-01', {
            at_store: 'central',
            is_support: true,
            raw_text: '支',
          }),
          at_store_source: 'linked',
        },
      ],
    })
  )
  const entry = month.entries.Cody['2026-09-01']
  assert.equal(entry.atStore, 'central')
  assert.equal(entry.atStoreSource, 'linked')
})

test('跨檔對照：匯入檔與我方推導不一致時出警告，不安靜地選一邊', () => {
  // 匯入檔說支援 D13，但同月只有一店的班表上有他當天上班
  const d7 = makeExport({
    storeCode: 'D7',
    storeName: '超級棧 - 桃機D7',
    employees: ['Cody'],
    entries: [
      {
        ...cell('emp01_Cody', '2026-09-01', {
          at_store: 'D13',
          is_support: true,
          raw_text: '支',
        }),
        at_store_source: 'linked',
      },
    ],
  })
  const central = makeExport({
    storeCode: 'central',
    storeName: '超級棧 - 桃機一店',
    employees: ['Cody'],
    entries: [cell('emp01_Cody', '2026-09-01', { shift: 'EVENING', raw_text: '晚' })],
  })
  const months = resolveSupportShifts(
    [d7, central].map((raw) => normalizeShiftExport(raw).month)
  )
  const warnings = months.find((m) => m.storeCode === 'D7').warnings

  assert.ok(warnings.some((w) => w.startsWith('跨檔對照')))
  assert.ok(warnings.some((w) => w.includes('D13') && w.includes('central')))
})

test('未命名N 的人員鍵綁店，不同店的同編號不會被併成同一人', () => {
  const central = normalizeShiftExport(
    makeExport({
      storeCode: 'central',
      storeName: '桃機一店',
      employees: ['未命名5'],
      entries: [cell('emp01_未命名5', '2026-09-01', { shift: 'MORNING' })],
    }),
  )
  const d7 = normalizeShiftExport(
    makeExport({
      storeCode: 'D7',
      storeName: '桃機D7',
      employees: ['未命名5'],
      entries: [cell('emp01_未命名5', '2026-09-01', { shift: 'EVENING' })],
    }),
  )
  assert.ok(central.ok && d7.ok)
  const a = central.month.people[0]
  const b = d7.month.people[0]
  assert.notEqual(a.key, b.key, '兩家店的未命名5必須是不同的人員鍵')
  assert.equal(a.name, '未命名5', '顯示用的姓名要保留原樣')
  assert.equal(b.name, '未命名5')
  // 班表格子要跟著新的鍵走，否則整列會讀不到
  assert.equal(central.month.entries[a.key]['2026-09-01'].shift, 'MORNING')
  assert.equal(d7.month.entries[b.key]['2026-09-01'].shift, 'EVENING')
})

test('同一家店的未命名N 跨月仍視為同一人', () => {
  const may = normalizeShiftExport(
    makeExport({
      storeCode: 'central',
      storeName: '桃機一店',
      employees: ['未命名5'],
      entries: [cell('emp01_未命名5', '2026-09-01', { shift: 'MORNING' })],
    }),
  )
  const jun = normalizeShiftExport(
    makeExport({
      storeCode: 'central',
      storeName: '桃機一店',
      employees: ['未命名5'],
      entries: [cell('emp01_未命名5', '2026-09-02', { shift: 'MORNING' })],
    }),
  )
  assert.equal(may.month.people[0].key, jun.month.people[0].key)
})

test('帶時區的時間戳換算成當地，不帶時區的照原樣顯示', () => {
  // 匯入時間存的是 UTC，台北要看到 +8 之後的時間，否則會誤以為同步失敗
  const utc = '2026-08-30T10:50:00.000Z'
  const local = new Date(utc)
  const pad = (n) => String(n).padStart(2, '0')
  const expected = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())} ${pad(local.getHours())}:${pad(local.getMinutes())}`
  assert.equal(formatTimestamp(utc), expected)
  assert.equal(formatTimestamp('2026-08-30T16:20:00+08:00'), '2026-08-30 16:20')

  // 轉換器寫的是沒有時區的當地時間，不能再加一次偏移
  assert.equal(formatTimestamp('2026-08-30T16:20:00'), '2026-08-30 16:20')
  assert.equal(formatTimestamp(''), '')
  assert.equal(formatTimestamp(null), '')
  assert.equal(formatTimestamp('不是時間'), '不是時間')
})

test('自定班別的標籤要跨店查得到，時間衝突時留白', () => {
  const merged = mergeVocab([
    {
      shiftTypes: {
        EVENING: { code: 'EVENING', label: '晚班', start: '14:00', end: '22:30' },
      },
      leaveTypes: { OFF: { code: 'OFF', label: '休假', marker: 'X' } },
    },
    {
      shiftTypes: {
        EVENING: { code: 'EVENING', label: '晚班', start: '13:00', end: '21:30' },
        CUSTOM_支_j776: { code: 'CUSTOM_支_j776', label: '支援', marker: '支' },
      },
      leaveTypes: { CUSTOM_差_fgeu: { code: 'CUSTOM_差_fgeu', label: '出差', marker: '差' } },
    },
  ])
  // 只有 D7 宣告的自定代碼，從合起來的字彙查得到標籤，不會露出原始代碼
  assert.equal(getShiftDisplay(merged, 'CUSTOM_支_j776').label, '支援')
  assert.equal(getLeaveDisplay(merged, 'CUSTOM_差_fgeu').label, '出差')
  // 各店晚班時間不同，合起來看沒有單一正確答案，寧可留白
  assert.equal(getShiftDisplay(merged, 'EVENING').label, '晚班')
  assert.equal(getShiftDisplay(merged, 'EVENING').start, null)
  assert.equal(getShiftDisplay(merged, 'EVENING').end, null)
})

test('互換班兩邊都列進「列外」，且都標明不重複計人力', () => {
  const central = normalizeShiftExport(
    makeExport({
      storeCode: 'central',
      storeName: '桃機一店',
      employees: ['Ann', 'Cody'],
      entries: [
        // 一店寫明 Ann 去 D7
        cell('emp01_Ann', '2026-09-01', { is_support: true, at_store: 'D7', raw_text: 'D7' }),
        // Cody 這天在一店自己的列上上班（她是從 D7 過來的）
        cell('emp02_Cody', '2026-09-01', { shift: 'EVENING', position: 'MAIN_BAR' }),
      ],
    }),
  )
  const d7 = normalizeShiftExport(
    makeExport({
      storeCode: 'D7',
      storeName: '桃機D7',
      employees: ['Ann', 'Cody'],
      entries: [
        cell('emp01_Ann', '2026-09-01', { shift: 'MID', position: 'MAIN_BAR' }),
        // D7 只寫「支」，沒寫去哪家店
        cell('emp02_Cody', '2026-09-01', { is_support: true, at_store: null, raw_text: '支' }),
      ],
    }),
  )
  const resolved = resolveSupportShifts([central.month, d7.month], [])
  const book = buildShiftBook(resolved)
  const moves = getCrossStoreMoves(book, '2026-09-01')
  assert.equal(moves.length, 2)

  const alex = moves.find((m) => m.name === 'Ann')
  assert.equal(alex.fromStore, 'central')
  assert.equal(alex.toStore, 'D7')
  assert.equal(alex.destinationFrom, 'sheet')
  assert.equal(alex.counted, false, 'D7 自己的表已經有 Ann，不能再算一次')

  const jessie = moves.find((m) => m.name === 'Cody')
  assert.equal(jessie.fromStore, 'D7')
  assert.equal(jessie.toStore, 'central', '沒寫目的地，要從一店自己的表反推出來')
  assert.equal(jessie.destinationFrom, 'ownRecord')
  assert.equal(jessie.counted, false)

  // 兩邊的當日人力都只算自己表上的人，不含出去支援的
  resolved.forEach((month) => {
    let n = 0
    Object.values(month.entries).forEach((byDate) => {
      const e = byDate['2026-09-01']
      if (e && e.kind === 'WORK' && !e.isSupport) n += 1
    })
    assert.equal(n, 1, `${month.storeCode} 當日人力應該是 1`)
  })
})

test('檔案沒列的班別不會被內建預設塞回來', () => {
  // D13 沒有中班，轉換器已經不宣告 MID；本站不能自作主張補回去，
  // 否則會長出一個永遠 0 個班的幽靈欄位
  const d13 = normalizeShiftExport(
    makeExport({
      storeCode: 'D13',
      storeName: '桃機D13',
      employees: ['Ben'],
      shiftTypes: [
        { code: 'MORNING', label: '早班', start: '04:30', end: '13:00' },
        { code: 'EVENING', label: '晚班', start: '13:00', end: '21:30' },
      ],
      entries: [cell('emp01_Ben', '2026-09-01', { shift: 'EVENING' })],
    }),
  )
  assert.ok(d13.ok)
  assert.deepEqual(Object.keys(d13.month.shiftTypes).sort(), ['EVENING', 'MORNING'])
  assert.equal(d13.month.shiftTypes.MID, undefined, 'MID 沒被宣告就不該存在')
  // 但檔案有宣告的班別，缺時間時仍要拿得到預設
  assert.equal(d13.month.shiftTypes.EVENING.start, '13:00')
})

test('shift_types 沒列但格子用到的代碼仍補得到時間', () => {
  const m = normalizeShiftExport(
    makeExport({
      storeCode: 'central',
      storeName: '桃機一店',
      employees: ['Kai'],
      shiftTypes: [{ code: 'EVENING', label: '晚班', start: '14:00', end: '22:30' }],
      entries: [cell('emp01_Kai', '2026-09-01', { shift: 'MORNING' })],
    }),
  )
  assert.ok(m.ok)
  assert.equal(m.month.shiftTypes.MORNING.start, '04:30', '用到就要查得到時間')
  assert.equal(m.month.entries.Kai['2026-09-01'].start, '04:30')
})

test('搭班頻率按月攤平：只同期一個月的人不會被同期久的人蓋掉', () => {
  const month = (monthKey, entries) => ({
    monthKey,
    storeCode: 'central',
    storeName: '桃機一店',
    people: [
      { key: 'Ann', name: 'Ann', order: 1 },
      { key: '小昀', name: '小昀', order: 2 },
      { key: '阿哲', name: '阿哲', order: 3 },
    ],
    entries,
    days: {},
    shiftTypes: {},
    leaveTypes: {},
    positions: {},
  })
  const work = { kind: 'WORK', shift: 'MORNING', isSupport: false }
  // 5 月：只有老鳥在，跟 Ann 四天裡搭到一天
  const may = month('2026-05', {
    Ann: { '2026-05-01': work, '2026-05-02': work, '2026-05-03': work, '2026-05-04': work },
    小昀: { '2026-05-01': work },
  })
  // 6 月：新人到職，跟 Ann 兩天全搭到；老鳥還是只搭一天
  const jun = month('2026-06', {
    Ann: { '2026-06-01': work, '2026-06-02': work },
    小昀: { '2026-06-01': work },
    阿哲: { '2026-06-01': work, '2026-06-02': work },
  })
  const book = buildShiftBook([may, jun])
  const partners = computePartnerFrequency(book, 'Ann')
  const senior = partners.find((p) => p.personKey === '小昀')
  const rookie = partners.find((p) => p.personKey === '阿哲')

  // 天數上老鳥贏（2 天 vs 2 天，平手），但比例上新人明顯高
  assert.equal(senior.days, 2)
  assert.equal(rookie.days, 2)
  // 小昀：5 月 1/4、6 月 1/2 → 平均 37.5%
  assert.equal(Math.round(senior.monthlyRate * 1000) / 1000, 0.375)
  // 新人只有 6 月在職，那個月 2/2 → 100%，不因為缺席 5 月被扣分
  assert.equal(rookie.sharedMonths, 1)
  assert.equal(rookie.monthlyRate, 1)
  assert.equal(partners[0].personKey, '阿哲', '按月攤平後新人要排在前面')
})

test('同事分組一人只進一組，依範圍內最後一個月的歸屬', () => {
  const mk = (monthKey, storeCode, people, entries) => ({
    monthKey,
    storeCode,
    storeName: getStoreName(storeCode),
    people: people.map((name, i) => ({ key: name, name, order: i + 1 })),
    entries,
    days: {},
    shiftTypes: {},
    leaveTypes: {},
    positions: {},
  })
  const work = { kind: 'WORK', shift: 'MORNING', isSupport: false }
  // 小美 5 月在一店、6 月調去 D7
  const book = buildShiftBook([
    mk('2026-05', 'central', ['小美', 'Kai'], { 小美: { '2026-05-01': work }, Kai: { '2026-05-01': work } }),
    mk('2026-06', 'D7', ['小美', 'Gina'], { 小美: { '2026-06-01': work }, Gina: { '2026-06-01': work } }),
  ])
  const 小美 = book.people.find((p) => p.key === '小美')
  assert.equal(primaryStoreOf(小美), 'D7', '看全部月份時算他現在待的店')
  assert.equal(primaryStoreOf(小美, ['2026-05']), 'central', '只看 5 月就是一店')

  const all = groupPeopleByStore(book.people)
  const names = all.flatMap((g) => g.people.map((p) => p.key))
  assert.equal(names.length, new Set(names).size, '同一個人不能出現在兩組')
  assert.equal(all.find((g) => g.storeCode === 'D7').people.map((p) => p.key).sort().join(), 'Gina,小美')
  assert.equal(all.find((g) => g.storeCode === 'central').people.map((p) => p.key).join(), 'Kai')

  const mayOnly = groupPeopleByStore(book.people, { monthKeys: ['2026-05'] })
  assert.equal(
    mayOnly.find((g) => g.storeCode === 'central').people.map((p) => p.key).sort().join(),
    'Kai,小美'
  )
})

test('司機版排班表：一台車一段，逐日列出「時間 站名 幾人」', () => {
  const book = buildFixtureBook()
  const table = buildPickupTable(book, {
    from: '2026-09-01',
    to: '2026-09-01',
    pickupByPerson: { 小明: 'A21環北站', Ann: '高鐵站', Ben: 'A21環北站' },
  })
  const text = renderDriverSchedule(table)

  assert.match(text, /^第1班車《《 這是早班車/)
  // 站名用司機那邊的寫法，時間是各站自己的到站時間
  assert.match(text, /03:45 A21環北站 2人/)
  assert.doesNotMatch(text, /小明|Ben|Ann/, '司機版不含姓名')
  // 沒人的站不寫出來，免得司機白跑
  assert.doesNotMatch(text, /高萱/)
  // 兩台車的同一站時間不同，不能互相沿用
  assert.equal(stopTime('高萱門市', 'MORNING'), '03:55')
  assert.equal(stopTime('高萱門市', 'MID'), '04:55')
})

test('舊站名讀出來要對回新站名，不能變成未設定', () => {
  // Firebase 裡存的是改名前的「環西站」，那些同事不能因此從交通車名單消失
  assert.equal(canonicalPickup('環西站'), 'A21環北站')
  assert.equal(canonicalPickup('興南站'), 'A20興南站')
  assert.equal(canonicalPickup('高鐵站'), '高鐵站')
  assert.equal(canonicalPickup(''), '')

  assert.equal(normalizePersonSettings({ pickup: '環西站' }).pickup, 'A21環北站')
  assert.deepEqual(pickupMapFrom({ 小明: { pickup: '環西站' }, Ann: { pickup: '興南站' } }), {
    小明: 'A21環北站',
    Ann: 'A20興南站',
  })
})

test('兩台車各站間隔五分鐘，站序就是行車順序', () => {
  assert.deepEqual(
    PICKUP_LOCATIONS.map((l) => stopTime(l, 'MORNING')),
    ['03:45', '03:50', '03:55', '04:00']
  )
  assert.deepEqual(
    PICKUP_LOCATIONS.map((l) => stopTime(l, 'MID')),
    ['04:45', '04:50', '04:55', '05:00']
  )
})
