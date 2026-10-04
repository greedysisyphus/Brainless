import test from 'node:test'
import assert from 'node:assert/strict'
import { appendWriteLog, countFilledCells, createInventorySyncMeta, mergeInventoryData, resolveInventorySnapshot, stripInventorySyncMeta, WRITE_LOG_LIMIT } from '../src/pages/coffeeBean/coffeeBeanInventorySync.js'

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

test('咖啡豆：數字跟數／袋／盒對不上時提醒', async () => {
  const { checkRowPlausibility } = await import('../src/pages/coffeeBean/coffeeBeanConstants.js')
  const empty = { bag: 150, box: 365 }
  assert.equal(checkRowPlausibility('16', 'quantity', empty), null)
  assert.deepEqual(checkRowPlausibility('1250', 'quantity', empty).suggest, ['weightBag', 'weightBox'])
  assert.deepEqual(checkRowPlausibility('16', 'weightBag', empty).suggest, ['quantity'])
  assert.equal(checkRowPlausibility('1250', 'weightBag', empty), null)
  assert.deepEqual(checkRowPlausibility('300', 'weightBox', empty).suggest, ['quantity'])
  assert.equal(checkRowPlausibility('', 'quantity', empty), null)
})

test('咖啡豆：雲端資料到之前就填了東西 → 一律跳衝突，不默默蓋掉任何一邊', () => {
  const meta = { ...createInventorySyncMeta(), isDirty: true, lastLocalEditAt: 2000 }
  // 雲端比較舊（以前這種情況回 ignore，接著本機舊資料被整份上傳）
  assert.equal(resolveInventorySnapshot({ meta, remoteUpdatedAt: 1000, fromCache: false, hasPendingWrites: false }), 'conflict')
  assert.equal(resolveInventorySnapshot({ meta, remoteUpdatedAt: 3000, fromCache: false, hasPendingWrites: false }), 'conflict')
  // 沒動過就直接套用雲端
  assert.equal(resolveInventorySnapshot({ meta: createInventorySyncMeta(), remoteUpdatedAt: 1000, fromCache: false, hasPendingWrites: false }), 'apply')
})

test('咖啡豆：自己上傳的回音不會被當成衝突', () => {
  const meta = { ...createInventorySyncMeta(), hasReceivedInitialRemote: true, isDirty: true, lastLocalEditAt: 2000, lastSyncedToCloudAt: 1500 }
  assert.equal(resolveInventorySnapshot({ meta, remoteUpdatedAt: 1500, fromCache: false, hasPendingWrites: false }), 'ignore')
})

test('咖啡豆：寫入紀錄——同一台連續編輯併成一筆，清空另記一筆，最多留固定筆數', () => {
  const edit = (at, device = 'iPad-a', cells = 3) => ({ at, device, action: 'edit', page: 'new', cells })
  let log = appendWriteLog(undefined, edit(1))
  log = appendWriteLog(log, edit(2, 'iPad-a', 5))
  assert.equal(log.length, 1)
  assert.deepEqual(log[0], { at: 2, device: 'iPad-a', action: 'edit', page: 'new', cells: 5, times: 2 })
  log = appendWriteLog(log, { at: 3, device: 'iPad-a', action: 'reset', page: 'new', cells: 0 })
  log = appendWriteLog(log, edit(4, 'iPhone-b'))
  assert.deepEqual(log.map((e) => e.action), ['edit', 'reset', 'edit'])
  // 不是人按的次數會累加
  assert.equal(appendWriteLog(appendWriteLog([], { ...edit(1), auto: 1 }), { ...edit(2), auto: 2 })[0].auto, 3)
  assert.equal('auto' in appendWriteLog(appendWriteLog([], edit(1)), edit(2))[0], false)
  for (let i = 0; i < 50; i += 1) log = appendWriteLog(log, edit(10 + i, `d${i}`))
  assert.equal(log.length, WRITE_LOG_LIMIT)
  assert.equal(log.at(-1).device, 'd49')
})

test('咖啡豆：有填數字的格數', () => {
  assert.equal(countFilledCells({ brewing: { pourOver: { 水洗: { store: ['1250', ''], breakRoom: ['2'] } }, espresso: {} }, retail: { 日曬: { store: ['', '0'] } }, modes: { a: ['weightBag'] } }), 3)
  assert.equal(countFilledCells(null), 0)
})

test('咖啡豆：上次沒傳完的修改記在裝置上，下次開頁一開始就是「有未上傳的修改」', async () => {
  const { readPendingEditAt, writePendingEditAt } = await import('../src/pages/coffeeBean/coffeeBeanInventorySync.js')
  const store = new Map()
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
  try {
    assert.equal(createInventorySyncMeta('central').isDirty, false)
    writePendingEditAt('central', 1234)
    assert.equal(readPendingEditAt('central'), 1234)
    const meta = createInventorySyncMeta('central')
    assert.equal(meta.isDirty, true)
    assert.equal(meta.lastLocalEditAt, 1234)
    // 所以雲端資料一到就是衝突，不會默默套用雲端
    assert.equal(resolveInventorySnapshot({ meta, remoteUpdatedAt: 9999, fromCache: false, hasPendingWrites: false }), 'conflict')
    assert.equal(createInventorySyncMeta('d7').isDirty, false) // 各店分開記
    writePendingEditAt('central', 0)
    assert.equal(createInventorySyncMeta('central').isDirty, false)
  } finally {
    delete globalThis.localStorage
  }
})
