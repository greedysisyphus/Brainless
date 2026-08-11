import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hasCountsPending,
  mergeCatalogThreeWay,
  mergeCountsWithPending,
  normalizeCountsPending,
  stripCountEntryMeta,
} from '../src/pages/goodsOrder/goodsOrderSync.js'
import {
  getEffectiveOrderQty,
  getOrderQuantityError,
} from '../src/pages/goodsOrder/goodsOrderConstants.js'
import {
  CountsConflictError,
  prepareCountsRevision,
} from '../src/pages/goodsOrder/goodsOrderCollaboration.js'

const item = (id, name, minStock = 1) => ({
  id,
  name,
  unit: '箱',
  note: '',
  minStock,
  defaultOrderQty: 1,
  allowFraction: true,
  disabled: false,
})

test('多人盤點只保留尚未同步的本機品項，其他品項採雲端', () => {
  const local = {
    counts: {
      cup: { current: '2' },
      paper: { current: '1' },
    },
  }
  const remote = {
    counts: {
      cup: { current: '8' },
      paper: { current: '4' },
      bag: { current: '3' },
    },
  }

  assert.deepEqual(mergeCountsWithPending(local, remote, ['cup']), {
    counts: {
      cup: { current: '2' },
      paper: { current: '4' },
      bag: { current: '3' },
    },
  })
})

test('品項設定會自動合併不同品項的修改', () => {
  const base = { catalogVersion: 2, orderStoreName: 'D7', items: [item('a', '杯'), item('b', '紙')] }
  const local = { ...base, items: [item('a', '大杯'), item('b', '紙')] }
  const remote = { ...base, items: [item('a', '杯'), item('b', '濾紙')] }

  const result = mergeCatalogThreeWay(base, local, remote)
  assert.deepEqual(result.conflicts, [])
  assert.equal(result.catalog.items[0].name, '大杯')
  assert.equal(result.catalog.items[1].name, '濾紙')
})

test('品項設定會標記同一欄位的同時修改', () => {
  const base = { catalogVersion: 2, orderStoreName: 'D7', items: [item('a', '杯')] }
  const local = { ...base, items: [item('a', '大杯')] }
  const remote = { ...base, items: [item('a', '小杯')] }

  const result = mergeCatalogThreeWay(base, local, remote)
  assert.deepEqual(result.conflicts, ['items.a.name'])
  assert.equal(result.catalog.items[0].name, '大杯')
})

test('一方刪除、另一方修改同一品項時不會靜默遺失', () => {
  const base = { catalogVersion: 2, orderStoreName: 'D7', items: [item('a', '杯')] }
  const local = { ...base, items: [] }
  const remote = { ...base, items: [item('a', '大杯')] }

  const result = mergeCatalogThreeWay(base, local, remote)
  assert.deepEqual(result.conflicts, ['items.a.deleted'])
  assert.equal(result.catalog.items.length, 0)
})

test('兩台裝置各自新增不同品項時會自動合併，不誤判排序衝突', () => {
  const base = { catalogVersion: 2, orderStoreName: 'D7', items: [item('a', '杯')] }
  const local = { ...base, items: [...base.items, item('local', '本機新增')] }
  const remote = { ...base, items: [...base.items, item('remote', '雲端新增')] }

  const result = mergeCatalogThreeWay(base, local, remote)
  assert.deepEqual(result.conflicts, [])
  assert.deepEqual(result.catalog.items.map(({ id }) => id), ['a', 'local', 'remote'])
})

test('兩台裝置同時以不同方式重排既有品項時仍會提示衝突', () => {
  const base = {
    catalogVersion: 2,
    orderStoreName: 'D7',
    items: [item('a', 'A'), item('b', 'B'), item('c', 'C')],
  }
  const local = { ...base, items: [base.items[1], base.items[0], base.items[2]] }
  const remote = { ...base, items: [base.items[0], base.items[2], base.items[1]] }

  const result = mergeCatalogThreeWay(base, local, remote)
  assert.deepEqual(result.conflicts, ['items.order'])
})

test('舊版待同步格式可無痛升級並保留基準資料', () => {
  const pending = normalizeCountsPending({
    replaceAll: false,
    baseRevision: 3,
    baseUpdatedAt: 1234,
    items: { cup: 5678 },
  })

  assert.equal(hasCountsPending(pending), true)
  assert.deepEqual(pending, {
    replaceAll: false,
    editAt: 0,
    baseRevision: 3,
    baseUpdatedAt: 1234,
    items: { cup: { editAt: 5678, baseEntry: {} } },
  })
})

test('比較同一盤點品項時忽略同步中繼欄位', () => {
  assert.deepEqual(
    stripCountEntryMeta({
      current: '2',
      orderQty: 1,
      _clientUpdatedAt: 123,
      _updatedBy: { id: 'a', name: 'A' },
    }),
    { current: '2', orderQty: 1 }
  )
})

test('盤點交易只改本機待同步品項，保留另一位使用者修改的其他品項', () => {
  const actor = { id: 'local', name: 'D7 iPad' }
  const result = prepareCountsRevision({
    remoteData: {
      _revision: 4,
      counts: {
        cup: { current: '1' },
        paper: { current: '9' },
      },
    },
    nextCounts: {
      counts: {
        cup: { current: '2' },
        paper: { current: '1' },
      },
    },
    pending: {
      replaceAll: false,
      items: { cup: { editAt: 100, baseEntry: { current: '1' } } },
    },
    actor,
    now: 200,
  })

  assert.equal(result._revision, 5)
  assert.equal(result.counts.cup.current, '2')
  assert.equal(result.counts.paper.current, '9')
})

test('同一盤點品項已被別人修改時停止交易', () => {
  assert.throws(
    () => prepareCountsRevision({
      remoteData: { _revision: 2, counts: { cup: { current: '8' } } },
      nextCounts: { counts: { cup: { current: '2' } } },
      pending: {
        replaceAll: false,
        items: { cup: { editAt: 100, baseEntry: { current: '1' } } },
      },
      actor: { id: 'local', name: 'D7 iPad' },
    }),
    (error) =>
      error instanceof CountsConflictError &&
      error.conflicts.includes('counts.cup')
  )
})

test('同一盤點內容只有欄位順序不同時不誤判為衝突', () => {
  const result = prepareCountsRevision({
    remoteData: {
      _revision: 2,
      counts: { cup: { forceInclude: null, orderQty: 1, current: '2' } },
    },
    nextCounts: { counts: { cup: { current: '3', orderQty: 1, forceInclude: null } } },
    pending: {
      replaceAll: false,
      items: {
        cup: {
          editAt: 100,
          baseEntry: { current: '2', orderQty: 1, forceInclude: null },
        },
      },
    },
    actor: { id: 'local', name: 'D7 iPad' },
  })

  assert.equal(result.counts.cup.current, '3')
})

test('清除全部前雲端版本已改變時停止交易', () => {
  assert.throws(
    () => prepareCountsRevision({
      remoteData: { _revision: 6, _clientUpdatedAt: 600, counts: { cup: { current: '8' } } },
      nextCounts: { counts: {} },
      pending: {
        replaceAll: true,
        baseRevision: 5,
        baseUpdatedAt: 500,
        items: {},
      },
      actor: { id: 'local', name: 'D7 iPad' },
    }),
    (error) =>
      error instanceof CountsConflictError &&
      error.conflicts.includes('counts.all')
  )
})

test('叫貨量清空後保持空白，不會立刻恢復預設值', () => {
  const catalogItem = item('cup', '杯')
  catalogItem.defaultOrderQty = 1

  assert.equal(getEffectiveOrderQty(catalogItem, { orderQty: null }), 1)
  assert.equal(getEffectiveOrderQty(catalogItem, { orderQty: '' }), 0)
  assert.match(getOrderQuantityError(catalogItem, { orderQty: '' }), /請輸入有效的叫貨量/)
})
