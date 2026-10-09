import test from 'node:test'
import assert from 'node:assert/strict'
import { boxOf, labelLines, labelText, makeLabel, nextSpot, nextTail, shortDate, sortByUse, stepDate, tailPoints, wrapLine } from '../src/pages/stockPhoto/labelModel.js'

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

test('sortByUse 常用的排前面，沒用過的維持原本順序，帶日期的分開算', () => {
  const items = [{ text: '大杯' }, { text: '小杯' }, { text: 'ESP', dated: true }, { text: 'ESP' }, { kind: 'cross', text: '劃掉' }]
  const sorted = sortByUse(items, { 'd:ESP': 5, cross: 2, 小杯: 2 })
  assert.deepEqual(sorted.map((p) => (p.dated ? 'd:' : '') + p.text), ['d:ESP', '小杯', '劃掉', '大杯', 'ESP'])
  assert.equal(items[0].text, '大杯')
})

test('箭頭：按一下換一個方向，尖端凸出框外，繞向跟框一樣是順時針', () => {
  const seen = []
  for (let t = nextTail(undefined); t; t = nextTail(t)) seen.push(t)
  assert.deepEqual(seen, ['down', 'left', 'up', 'right'])
  // 框中心 (100, 50)、寬 40 高 20、字高 10
  const round = (pts) => pts.map((p) => p.map((v) => Math.round(v * 10) / 10))
  assert.deepEqual(round(tailPoints('down', 100, 50, 40, 20, 10)), [[104.2, 58], [104.2, 60], [100, 65.5], [95.8, 60], [95.8, 58]])
  assert.deepEqual(round(tailPoints('left', 100, 50, 40, 20, 10))[2], [74.5, 50])
  for (const t of seen) {
    const [, a, b, c] = tailPoints(t, 100, 50, 40, 20, 10)
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
    assert.ok(cross > 0, t)
  }
})
