/** 收銀機每天留的底錢，不算收入 */
export const BASE_CASH = 20000

export const DENOMINATIONS = [1000, 500, 100, 50, 10, 5, 1]

/** 張數上限：四位數夠數一整疊，也防手滑多按 */
const MAX_COUNT = 9999

/** 外幣折台幣，無條件捨去。先修掉浮點誤差（1.15 × 100 = 114.999…），不然會少算 1 元 */
export function toTwd(amount, rate) {
  return Math.floor(Math.round(amount * rate * 1e6) / 1e6)
}

export function sumCounts(counts = {}) {
  return DENOMINATIONS.reduce((sum, value) => sum + value * (Number(counts[value]) || 0), 0)
}

/** 實際現金收入與跟 POS 的差額 */
export function cashResult({ cashierTotal, drawerTotal, foreignTotal, posAmount }) {
  const actual = cashierTotal + drawerTotal + foreignTotal - BASE_CASH
  return { actual, difference: actual - posAmount }
}

/**
 * 數字鍵盤按一下之後的張數。fresh = 剛選到這一格，第一個數字直接取代舊值。
 * key：'0'–'9' 或 'back'
 */
export function pressKey(count, key, fresh) {
  const current = fresh ? 0 : Number(count) || 0
  if (key === 'back') return fresh ? 0 : Math.floor(current / 10)
  const next = current * 10 + Number(key)
  return next > MAX_COUNT ? current : next
}

/** 外幣金額、匯率用：可打一個小數點，字串保留使用者輸入（例如「31.」） */
export function pressDecimalKey(text, key, fresh) {
  const current = fresh ? '' : String(text ?? '')
  if (key === 'back') return current.slice(0, -1)
  if (key === '.') {
    if (current.includes('.')) return current
    return current === '' ? '0.' : `${current}.`
  }
  if (current.length >= 10) return current
  return current === '0' ? key : current + key
}
