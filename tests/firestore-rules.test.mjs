/**
 * Firestore 規則的回歸測試。
 *
 * 重點不是「班表鎖住了嗎」，是**其他功能有沒有被我改壞** —— 規則是 OR 邏輯，
 * 很容易改一條就波及全部，而且壞掉不會有編譯錯誤，只會在使用者按儲存時才炸。
 *
 * 需要 Java 與 firebase emulator，所以不在 `npm test` 裡。跑法：
 *   npm run test:rules
 */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
} from '@firebase/rules-unit-testing'
import { doc, setDoc, getDoc } from 'firebase/firestore'

const env = await initializeTestEnvironment({
  projectId: 'rules-check',
  firestore: { rules: fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
})

// 先用「繞過規則」的通道種一個 admin
await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'admins/admin-uid'), { ok: true })
})

const anon = env.unauthenticatedContext().firestore()
const admin = env.authenticatedContext('admin-uid').firestore()
const user = env.authenticatedContext('some-staff-uid').firestore()

const results = []
const check = async (label, promise, shouldPass) => {
  try {
    await (shouldPass ? assertSucceeds(promise) : assertFails(promise))
    results.push(['✓', label])
  } catch (e) {
    results.push(['✗', label + ' ← ' + String(e.message).slice(0, 60)])
  }
}

// ── 班表：讀開放、寫只有管理員 ────────────────────────────────
await check('匿名可以「讀」班表', getDoc(doc(anon, 'shiftMonths/2026-09_D7')), true)
await check('匿名不能「寫」班表', setDoc(doc(anon, 'shiftMonths/x'), { a: 1 }), false)
await check('登入但非管理員也不能寫班表', setDoc(doc(user, 'shiftMonths/x'), { a: 1 }), false)
await check('管理員可以寫班表', setDoc(doc(admin, 'shiftMonths/x'), { a: 1 }), true)
await check('匿名不能寫支援班配對', setDoc(doc(anon, 'shiftSupportLinks/x'), { a: 1 }), false)
await check('管理員可以寫支援班配對', setDoc(doc(admin, 'shiftSupportLinks/x'), { a: 1 }), true)

// ── 其他功能：一行都不能受影響 ────────────────────────────────
const untouched = [
  ['上車地點設定', 'shiftPeople/somebody'],
  ['咖啡豆／盤點／叫貨', 'settings/beans'],
  ['舊班表', 'schedule/2026-09'],
  ['舊班表(複數)', 'schedules/x'],
  ['厚片', 'sandwiches/x'],
  ['預測', 'forecasts/x'],
  ['跑馬燈', 'nowPlayingMarquee/current'],
  ['姓名表', 'names/x'],
  ['員工標籤', 'employeeTags/x'],
  ['員工店別', 'employeeStores/x'],
  ['上車地點清單', 'pickupLocations/x'],
]
for (const [label, path] of untouched) {
  await check(`匿名仍可寫：${label}`, setDoc(doc(anon, path), { a: 1 }), true)
  await check(`匿名仍可讀：${label}`, getDoc(doc(anon, path)), true)
}

// ── feedback 的既有保護不能被我改壞 ───────────────────────────
await check('feedback 仍擋掉亂寫', setDoc(doc(anon, 'feedback/x'), { a: 1 }), false)
await check('feedback 仍可讀', getDoc(doc(anon, 'feedback/x')), true)

await env.cleanup()
const fails = results.filter(([m]) => m === '✗')
results.forEach(([m, l]) => console.log(' ', m, l))
console.log(`\n通過 ${results.length - fails.length} / ${results.length}`)
process.exit(fails.length ? 1 : 0)
