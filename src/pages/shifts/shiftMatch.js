import { SHIFT_META } from './shiftConstants.js'
import { addDays, getDayAssignments } from './shiftModel.js'

/**
 * 找日子用的條件：「A 早班、B 休假」這種組合，找哪天湊得最齊。
 *
 * 「下午有空」是約出去玩最常問的：休假，或早班／中班（13:00、14:00 下班）。
 * ponytail: 用班別代碼判斷，不看實際下班時間；哪天出現更晚下的早班再改成比 end。
 */
export const MATCH_CONDITIONS = [
  { key: 'WORK', label: '有上班', test: (a) => a.kind === 'WORK' },
  { key: 'OFF', label: '休假', test: (a) => a.kind === 'LEAVE' },
  {
    key: 'PM_FREE',
    label: '下午有空',
    test: (a) => a.kind === 'LEAVE' || (a.kind === 'WORK' && ['MORNING', 'MID'].includes(a.shift)),
  },
  {
    // 凌晨出去玩：當天上什麼班都行（晚班 22:30 也下班了），要看的是隔天不用早起。
    // 所以這個條件檢查的是「隔天」那一格；午班 07:30 上班還是太早，不算。
    key: 'NEXT_LATE',
    label: '隔天晚班或休假',
    nextDay: true,
    test: (a) => a.kind === 'LEAVE' || (a.kind === 'WORK' && a.shift === 'EVENING'),
  },
  ...['MORNING', 'MID', 'NOON', 'EVENING'].map((code) => ({
    key: code,
    label: SHIFT_META[code].label,
    test: (a) => a.kind === 'WORK' && a.shift === code,
  })),
]

const CONDITION_BY_KEY = Object.fromEntries(MATCH_CONDITIONS.map((c) => [c.key, c]))

/** 那天那個人的狀態，給畫面顯示用。 */
export function describeDayStatus(assignment) {
  if (!assignment) return '沒班表'
  if (assignment.kind === 'LEAVE') return '休假'
  if (assignment.kind === 'WORK') {
    if (assignment.shiftUnknown) return '支援（班別未定）'
    return SHIFT_META[assignment.shift]?.label || '上班'
  }
  return '空白'
}

/**
 * 逐日檢查每個人的條件，依「符合幾個人」排序（同分依日期）。
 * 湊不齊的日子也留著 —— 「差一個人」的那天通常才是最值得去喬的。
 *
 * @param {object} book
 * @param {string[]} dates
 * @param {{personKey:string, condition:string}[]} wants
 * @returns {{date:string, score:number, results:{personKey:string, ok:boolean, assignment:object|null, status:string, nextDay:boolean}[]}[]}
 */
export function findMatchingDays(book, dates, wants) {
  if (!wants.length) return []
  const cache = new Map()
  const assignmentsOn = (date) => {
    if (!cache.has(date)) {
      const byPerson = new Map()
      getDayAssignments(book, date).forEach((a) => {
        // 互換班那種同一天兩家店都有格子，有上班的那格才是真的
        if (!byPerson.has(a.personKey) || a.kind === 'WORK') byPerson.set(a.personKey, a)
      })
      cache.set(date, byPerson)
    }
    return cache.get(date)
  }
  return dates
    .map((date) => {
      const byPerson = assignmentsOn(date)
      const results = wants.map(({ personKey, condition }) => {
        const cond = CONDITION_BY_KEY[condition]
        // 隔天的班沒匯入（月底、下個月還沒出）就不算符合，不猜
        const subject = cond?.nextDay
          ? assignmentsOn(addDays(date, 1)).get(personKey) || null
          : byPerson.get(personKey) || null
        const ok = !!subject && !!cond.test(subject)
        const status = cond?.nextDay ? `隔天${describeDayStatus(subject)}` : describeDayStatus(subject)
        return { personKey, ok, assignment: subject, status, nextDay: !!cond?.nextDay }
      })
      return { date, score: results.filter((r) => r.ok).length, results, hasData: byPerson.size > 0 }
    })
    .filter((day) => day.hasData)
    .map(({ hasData, ...day }) => day)
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
}
