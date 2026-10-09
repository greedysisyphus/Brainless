import test from 'node:test'
import assert from 'node:assert/strict'
import { boxOf, labelLines, labelText, makeLabel, nextSpot, shortDate, stepDate, wrapLine } from '../src/pages/stockPhoto/labelModel.js'

test('shortDate 用照片上的寫法，不補零', () => {
  assert.equal(shortDate('2026-09-04'), '9/4')
  assert.equal(shortDate('2026-10-14'), '10/14')
  assert.equal(shortDate(''), '')
})

test('stepDate 跨月、跨年照日曆走', () => {
  assert.equal(stepDate('2026-09-30', 1), '2026-10-01')
  assert.equal(stepDate('2026-03-01', -1), '2026-02-28')
  assert.equal(stepDate('2026-12-31', 1), '2027-01-01')
})

test('labelText 組出 日期 品名*數量', () => {
  const esp = makeLabel({ text: 'ESP', dated: true }, { date: '2026-09-14' })
  assert.equal(labelText(esp), '9/14 ESP')
  assert.equal(labelText({ ...esp, qty: 2 }), '9/14 ESP*2')
  assert.equal(labelText(makeLabel({ text: '大杯' }, { date: '2026-09-14' })), '大杯')
  assert.equal(labelText(makeLabel({ kind: 'cross' })), '')
})

test('直排一個字一行，空白不算', () => {
  const v = makeLabel({ text: '下週 還推車', vertical: true })
  assert.deepEqual(labelLines(v), ['下', '週', '還', '推', '車'])
  assert.deepEqual(labelLines(makeLabel({ text: '9/11 SW*2\n9/22 ESP*2' })), ['9/11 SW*2', '9/22 ESP*2'])
})

test('nextSpot 接在上一個正下方，到底就換一欄', () => {
  const first = makeLabel({ text: 'ESP' }, { x: 0.3, y: 0.4, size: 0.04 })
  const below = nextSpot(first, 0.75)
  assert.equal(below.x, 0.3)
  assert.ok(below.y > first.y)
  const bottom = { ...first, y: 0.95 }
  const wrapped = nextSpot(bottom, 0.75)
  assert.ok(wrapped.x > bottom.x)
  assert.ok(wrapped.y < 0.2)
})

test('boxOf 高度跟著照片比例換算', () => {
  const l = makeLabel({ text: '大杯' }, { size: 0.05 })
  const wide = boxOf(l, 4 / 3)
  const tall = boxOf(l, 3 / 4)
  assert.equal(wide.w, tall.w)
  assert.ok(wide.h > tall.h)
})

test('wrapLine 中文逐字斷，英數字整組不拆', () => {
  assert.deepEqual(wrapLine('下週還推車', 2), ['下週', '還推', '車'])
  // 放不下時 ESP 整組換到下一行，不會拆成 ES／P
  assert.deepEqual(wrapLine('9/14 ESP', 2.5), ['9/14', 'ESP'])
  assert.deepEqual(wrapLine('ABCDEFGH', 1.2), ['AB', 'CD', 'EF', 'GH'])
})

test('labelLines 設了寬度才換行，直排不受影響', () => {
  const l = makeLabel({ text: '牛紙 手乳 客砂' })
  assert.deepEqual(labelLines(l), ['牛紙 手乳 客砂'])
  assert.deepEqual(labelLines({ ...l, wrap: 2 }), ['牛紙', '手乳', '客砂'])
  const box = boxOf({ ...l, wrap: 2 }, 1)
  assert.equal(box.w, (2 + 0.62 * 2) * l.size)
  assert.deepEqual(labelLines({ ...l, wrap: 2, vertical: true }).length, 6)
})
