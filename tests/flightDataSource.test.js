import test from 'node:test'
import assert from 'node:assert/strict'
import { loadPrimaryThenFallback } from '../src/utils/flightData/dataSource.js'

test('航班資料優先使用 Firestore', async () => {
  let fallbackCalled = false
  const result = await loadPrimaryThenFallback(
    async () => 'firestore',
    async () => { fallbackCalled = true; return 'static' }
  )
  assert.equal(result, 'firestore')
  assert.equal(fallbackCalled, false)
})

test('Firestore 缺資料或失敗時改讀靜態 JSON', async () => {
  assert.equal(await loadPrimaryThenFallback(async () => null, async () => 'static'), 'static')
  assert.equal(await loadPrimaryThenFallback(async () => { throw new Error('offline') }, async () => 'static'), 'static')
})

test('取消載入時不再發出 fallback 請求', async () => {
  const aborted = new Error('aborted')
  aborted.name = 'AbortError'
  await assert.rejects(
    loadPrimaryThenFallback(async () => { throw aborted }, async () => 'static'),
    { name: 'AbortError' }
  )
})
