import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mergeCatalogThreeWay,
  mergeCountsWithPending,
} from '../src/pages/goodsOrder/goodsOrderSync.js'

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
