/**
 * 門市範圍與壓力曲線的最小自我檢查：node tests/flightStores.test.mjs
 * 用固定 fixture，不看 data/ 當天實際有哪些門 —— 機場發什麼不該讓測試變紅。
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

import { FLIGHT_STORES } from '../src/utils/flightData/stores.js'
import { gateToFamily, isGateInStore } from '../src/utils/flightData/gates.js'
import { resolveGateStressWeight } from '../src/utils/flightData/gateStressWeights.js'
import { stressSlotSeriesDay, summarizeStressSeries } from '../src/utils/flightData/stressSlots.js'

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
    'full'
  )
  const { maxScore, quiet } = summarizeStressSeries(series)
  const inQuiet = series.filter((s) => s.startMin >= quiet.startMin && s.startMin + 60 <= quiet.endMin)
  assert.ok(inQuiet.length > 0, '空檔區間至少要蓋到一個槽')
  assert.ok(inQuiet.every((s) => s.score <= maxScore * 0.2), '空檔區間內每一槽都要低於尖峰兩成')
}

// 沒有航班時不能爆掉
assert.equal(summarizeStressSeries([]), null)
assert.equal(summarizeStressSeries(stressSlotSeriesDay([], DATE, d13.stressWeights, d13, 'full')).maxScore, 0)

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
