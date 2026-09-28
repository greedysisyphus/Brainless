import test from 'node:test'
import assert from 'node:assert/strict'
import { toTwd, sumCounts, cashResult, pressKey, pressDecimalKey, BASE_CASH } from '../src/components/cashier/cashMath.js'

test('toTwd 無條件捨去且不被浮點誤差少算', () => {
  assert.equal(toTwd(100, 1.15), 115)
  assert.equal(toTwd(10, 31.57), 315)
  assert.equal(toTwd(3, 0.1), 0)
})

test('sumCounts 忽略空值與非面額', () => {
  assert.equal(sumCounts({ 1000: 2, 100: '3', 5: undefined, 7: 9 }), 2300)
  assert.equal(sumCounts(), 0)
})

test('cashResult 扣底錢後跟 POS 比', () => {
  const r = cashResult({ cashierTotal: 25000, drawerTotal: 1000, foreignTotal: 500, posAmount: 6000 })
  assert.equal(r.actual, 26500 - BASE_CASH)
  assert.equal(r.difference, 500)
})

test('pressKey：剛選到先取代，之後接在後面，倒退刪一位，有上限', () => {
  assert.equal(pressKey(7, '3', true), 3)
  assert.equal(pressKey(3, '5', false), 35)
  assert.equal(pressKey(35, 'back', false), 3)
  assert.equal(pressKey(35, 'back', true), 0)
  assert.equal(pressKey(9999, '1', false), 9999)
})

test('pressDecimalKey：一個小數點、開頭補 0、倒退', () => {
  assert.equal(pressDecimalKey('31', '.', false), '31.')
  assert.equal(pressDecimalKey('31.', '.', false), '31.')
  assert.equal(pressDecimalKey('31.', '5', false), '31.5')
  assert.equal(pressDecimalKey('', '.', false), '0.')
  assert.equal(pressDecimalKey('0', '7', false), '7')
  assert.equal(pressDecimalKey('31.5', 'back', false), '31.')
  assert.equal(pressDecimalKey('31.5', '2', true), '2')
})
