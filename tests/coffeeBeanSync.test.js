import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeInventoryData, stripInventorySyncMeta } from '../src/pages/coffeeBean/coffeeBeanInventorySync.js'

test('咖啡豆：「數／袋／盒」跟著盤點文件同步，不會在整理時被丟掉', () => {
  const doc = {
    brewing: { pourOver: { 水洗: { store: ['1250'] } }, espresso: {} },
    retail: {},
    modes: { 'brewing.pourOver.水洗.store': ['weightBag'] },
    _clientUpdatedAt: 1,
  }
  assert.deepEqual(stripInventorySyncMeta(doc).modes, { 'brewing.pourOver.水洗.store': ['weightBag'] })
})

test('咖啡豆：舊文件沒有 modes 時維持沒有（頁面靠這點決定要不要搬舊的本機設定）', () => {
  const clean = stripInventorySyncMeta({ brewing: { pourOver: {}, espresso: {} }, retail: {} })
  assert.equal('modes' in clean, false)
})

test('咖啡豆：衝突合併時 modes 也一起合併，本機有填的優先', () => {
  const merged = mergeInventoryData(
    { brewing: { pourOver: {}, espresso: {} }, retail: {}, modes: { a: ['weightBag'] } },
    { brewing: { pourOver: {}, espresso: {} }, retail: {}, modes: { a: ['quantity'], b: ['weightBox'] } }
  )
  assert.deepEqual(merged.modes, { a: ['weightBag'], b: ['weightBox'] })
})

test('咖啡豆：modes 陣列有空洞時補成「數」，不然 Firestore 會拒絕整份文件', () => {
  const holey = []
  holey[2] = 'weightBag'
  const clean = stripInventorySyncMeta({ brewing: { pourOver: {}, espresso: {} }, retail: {}, modes: { k: holey, n: [null, 'weightBox'] } })
  assert.deepEqual(clean.modes, { k: ['quantity', 'quantity', 'weightBag'], n: ['quantity', 'weightBox'] })
  assert.equal(JSON.stringify(clean).includes('null'), false)
})
