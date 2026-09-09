/**
 * 門市範圍與壓力曲線的最小自我檢查：node tests/flightStores.test.mjs
 * 用固定 fixture，不看 data/ 當天實際有哪些門 —— 機場發什麼不該讓測試變紅。
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

import { FLIGHT_STORES } from '../src/utils/flightData/stores.js'
import { gateToFamily, isGateInStore } from '../src/utils/flightData/gates.js'
import { resolveGateStressWeight } from '../src/utils/flightData/gateStressWeights.js'
import { peopleByShiftOn, resolveStoreShifts } from '../src/utils/flightData/shiftBridge.js'
import {
  stressShiftRange,
  stressSlotSeriesDay,
  summarizeStressSeries
} from '../src/utils/flightData/stressSlots.js'

const { d7, d13 } = FLIGHT_STORES

assert.equal(gateToFamily('D15R'), 'D15')
assert.equal(gateToFamily('D5'), 'D5')
assert.equal(gateToFamily('d18l'), 'D18')
assert.equal(gateToFamily('A1'), null)
assert.equal(gateToFamily(''), null)

// 範圍：D13 店看不到 D5–D10，D7 店兩段都看得到
assert.equal(isGateInStore('D9', d13), false)
assert.equal(isGateInStore('D9', d7), true)
assert.equal(isGateInStore('D13', d13), true)
assert.equal(isGateInStore('D13', d7), true)
assert.equal(isGateInStore('D4', d7), false)
assert.equal(isGateInStore('D1', d13), false)
assert.ok(d13.gateFamilies.every((g) => d7.gateFamilies.includes(g)), 'D13 範圍應是 D7 的子集')

// D7 店下班時間固定，不算留店
assert.equal(d13.nightSupport, true)
assert.equal(d7.nightSupport, false)

// 班別以班表為準（stores.js 只留營業時間），沒有匯入檔時退回 shiftConstants 的預設
for (const store of [d13, d7]) {
  const { shifts, source } = resolveStoreShifts(store, { months: [] }, '2026-01-02')
  assert.equal(source, 'default')
  assert.equal(shifts[0].key, 'full')
  assert.equal(shifts[0].startMin, store.businessHours.startMin)
  assert.equal(shifts[0].endMin, store.businessHours.endMin)
  assert.deepEqual(shifts.slice(1).map((sh) => sh.label), ['早班', '中班', '午班', '晚班'])

  for (const sh of shifts) {
    const { firstStartMin, lastStartMin } = stressShiftRange(sh.key, shifts)
    assert.equal(firstStartMin, sh.startMin, `${store.key}/${sh.key} 起點`)
    assert.equal(lastStartMin + 60, sh.endMin, `${store.key}/${sh.key} 最後一槽要剛好收在 endMin`)
  }
  // 切店後帶著別家的 key 進來，要退回全天而不是炸掉
  assert.deepEqual(stressShiftRange('這個班別不存在', shifts), stressShiftRange('full', shifts))
}

// D7 營業 05:00–22:00；D13 晚班在班表裡收得比較早
const d7Shifts = resolveStoreShifts(d7, { months: [] }, '2026-01-02').shifts
const d13Shifts = resolveStoreShifts(d13, { months: [] }, '2026-01-02').shifts
assert.equal(d7Shifts[0].startMin, 5 * 60)
assert.equal(d7Shifts[0].endMin, 22 * 60)
assert.equal(d7Shifts.find((sh) => sh.label === '早班').startMin, 4 * 60 + 30)
assert.equal(d7Shifts.find((sh) => sh.label === '晚班').endMin, 22 * 60 + 30)
assert.equal(d13Shifts.find((sh) => sh.label === '晚班').endMin, 21 * 60 + 30)

// 當月匯入的班表要蓋過預設
const book = {
  months: [
    {
      monthKey: '2026-01',
      storeCode: 'D7',
      shiftTypes: { MORNING: { code: 'MORNING', label: '早班', start: '06:00', end: '15:00' } },
      people: [{ key: 'p1', name: '小明' }],
      entries: { p1: { '2026-01-02': { kind: 'WORK', shift: 'MORNING' } } }
    }
  ]
}
const imported = resolveStoreShifts(d7, book, '2026-01-02')
assert.equal(imported.source, 'roster')
assert.deepEqual(imported.shifts.map((sh) => sh.key), ['full', 'MORNING'])
assert.equal(imported.shifts[1].startMin, 6 * 60)
assert.equal(imported.shifts[1].endMin, 15 * 60)
// 別的月份／別家店不該影響
assert.equal(resolveStoreShifts(d13, book, '2026-01-02').source, 'default')
assert.equal(resolveStoreShifts(d7, book, '2026-02-02').source, 'default')

// 當天誰上這班
assert.deepEqual(peopleByShiftOn(d7, book, '2026-01-02').MORNING.map((p) => p.name), ['小明'])
assert.deepEqual(peopleByShiftOn(d13, book, '2026-01-02'), {})

// 統計卡分段：D13 是 17:00 前後的切分，D7 照班別（會重疊，所以不做加總檢查）
assert.deepEqual(d13.summaryBuckets.map((b) => b.label), ['17:00 前', '17:00 後'])
assert.equal(d7.summaryBuckets, null, 'D7 沒有自訂分段，統計卡照班表的班別切')

// 兩家店的雲端設定不能共用同一份文件
assert.notEqual(d13.stressDocId, d7.stressDocId)
assert.notEqual(d13.stressLocalKey, d7.stressLocalKey)

// 權重：範圍內走自己的值，範圍外掉到 D_OTHER
assert.equal(resolveGateStressWeight('D13R', d13.stressWeights, d13), 4)
assert.equal(resolveGateStressWeight('D9', d13.stressWeights, d13), d13.stressWeights.D_OTHER)
assert.equal(resolveGateStressWeight('D9', d7.stressWeights, d7), 2)
assert.equal(resolveGateStressWeight('A1', d7.stressWeights, d7), d7.stressWeights.OTHER)
// 壞掉的遠端設定不該讓分數變 NaN
assert.equal(resolveGateStressWeight('D13', { D13: -1 }, d13), 4)

// 固定班表：D5–D10 只有 D7 店看得到，所以 D7 店的尖峰必定比較高
const DATE = '2026-01-02'
const at = (time, gate) => ({ time, datetime: `${DATE}T${time}:00`, gate, type: 'departure', status: '準時' })
const fixture = [at('08:00', 'D13'), at('08:10', 'D18'), at('08:05', 'D9'), at('08:15', 'D5R'), at('14:00', 'D12')]

const summarize = (store) =>
  summarizeStressSeries(
    stressSlotSeriesDay(
      fixture.filter((f) => isGateInStore(f.gate, store)),
      DATE,
      store.stressWeights,
      store,
      resolveStoreShifts(store, null, DATE).shifts,
      'full'
    )
  )
assert.ok(summarize(d13).maxScore > 0)
assert.ok(summarize(d7).maxScore > summarize(d13).maxScore, 'D7 店尖峰應高於 D13 店')

// 空檔區間內每一槽都要真的鬆，而不是尾端隨便一段
for (const store of [d13, d7]) {
  const series = stressSlotSeriesDay(
    fixture.filter((f) => isGateInStore(f.gate, store)),
    DATE,
    store.stressWeights,
    store,
    resolveStoreShifts(store, null, DATE).shifts,
    'full'
  )
  const { maxScore, quiet } = summarizeStressSeries(series)
  const inQuiet = series.filter((s) => s.startMin >= quiet.startMin && s.startMin + 60 <= quiet.endMin)
  assert.ok(inQuiet.length > 0, '空檔區間至少要蓋到一個槽')
  assert.ok(inQuiet.every((s) => s.score <= maxScore * 0.2), '空檔區間內每一槽都要低於尖峰兩成')
}

// 沒有航班時不能爆掉
assert.equal(summarizeStressSeries([]), null)
assert.equal(summarizeStressSeries(stressSlotSeriesDay([], DATE, d13.stressWeights, d13, resolveStoreShifts(d13, null, DATE).shifts, 'full')).maxScore, 0)

// 真實資料只做冒煙測試：跑得完、不丟例外、範圍過濾不會過頭
const files = readdirSync('data').filter((f) => f.startsWith('flight-data-')).sort()
assert.ok(files.length > 0, 'data/ 需要至少一天的航班檔')
const day = JSON.parse(readFileSync(`data/${files.at(-1)}`, 'utf8'))
const pick = (store) => day.flights.filter((f) => isGateInStore(f.gate, store))
assert.ok(pick(d7).length >= pick(d13).length)
assert.ok(summarize(d7).maxScore > 0)

console.log(
  `✅ fixture：D13 尖峰 ${summarize(d13).maxScore.toFixed(2)}，D7 尖峰 ${summarize(d7).maxScore.toFixed(2)}｜` +
    `${files.at(-1)}：D13 ${pick(d13).length} 班 / D7 ${pick(d7).length} 班`
)
