import { pressDecimalKey } from '../../components/cashier/cashMath.js'

/**
 * 頁內鍵盤按一下之後，數量字串變成什麼。可以打小數（1.5）也可以打分數（1 1/2）。
 * half＝「＋½」：空的變 1/2、整數變「n 1/2」；已經有分數時，倒退拿掉分數那一段，數字鍵等於重打。
 */
export function pressQty(text, key, fresh) {
  const cur = fresh ? '' : String(text ?? '')
  if (key === 'half') return cur === '' || cur === '0' ? '1/2' : /^\d+$/.test(cur) ? `${cur} 1/2` : cur
  if (key === 'back') return cur.includes('/') ? cur.replace(/\s*\d+\/\d*$/, '') : cur.slice(0, -1)
  if (cur.includes('/')) return key === '.' ? cur : key
  return pressDecimalKey(cur, key, false)
}
