/**
 * 支援班配對。
 *
 * 兩邊的紙本各缺一半：
 * - 來源店（一店／D7）寫「T3」「D7」＝**誰**要去支援，但沒寫是什麼班。
 * - 目的店（D13）的「支援」列寫**什麼班**，但沒寫是誰。
 *
 * 這裡把兩邊配起來。配不出來的一律留白並標出來，不用猜的，
 * 因為配錯或漏配的代價是：那天其實是早班（04:30 到店），人卻沒被排進交通車。
 */

import { SUPPORT_SHIFT_CODE, getDefaultShiftTimes } from './shiftConstants.js'

export const SUPPORT_STATUS = {
  RESOLVED: 'resolved',
  NO_DESTINATION_WRITTEN: 'no_destination_written',
  AMBIGUOUS: 'ambiguous',
  MISSING_SLOT: 'missing_slot',
  EXTRA_SLOT: 'extra_slot',
  NO_DESTINATION: 'no_destination',
}

export const SUPPORT_STATUS_LABELS = {
  [SUPPORT_STATUS.NO_DESTINATION_WRITTEN]: '紙本沒寫去哪家店',
  [SUPPORT_STATUS.RESOLVED]: '已對上',
  [SUPPORT_STATUS.AMBIGUOUS]: '同一天多人支援，要指定誰是哪一班',
  [SUPPORT_STATUS.MISSING_SLOT]: '目的店那天沒寫支援班，班別無從得知',
  [SUPPORT_STATUS.EXTRA_SLOT]: '目的店有支援班，但沒有店寫是誰去',
  [SUPPORT_STATUS.NO_DESTINATION]: '目的店這個月的班表還沒匯入',
}

export function groupId(monthKey, date, atStore) {
  return `${monthKey}|${date}|${atStore}`
}

export function linkKeyOf(link) {
  return `${link.date}|${link.atStore}|${link.personKey}`
}

/** 目的店「支援」列的一格＝一個待認領的班。用列名當 slotId，重新匯入也還對得上。 */
function collectSlots(months) {
  const byGroup = new Map()
  months.forEach((month) => {
    ;(month.people || [])
      .filter((person) => person.placeholder)
      .forEach((person) => {
        Object.entries(month.entries?.[person.key] || {}).forEach(([date, entry]) => {
          if (entry?.kind !== 'WORK' || !entry.shift || entry.shift === SUPPORT_SHIFT_CODE) return
          const id = groupId(month.monthKey, date, month.storeCode)
          if (!byGroup.has(id)) byGroup.set(id, [])
          byGroup.get(id).push({
            slotId: person.key,
            shift: entry.shift,
            position: entry.position || null,
            start: entry.start || null,
            end: entry.end || null,
            crossesMidnight: !!entry.crossesMidnight,
            // 目的店自己寫了是誰來，配對就不必用猜的
            visitor: entry.visitor || null,
            visitorResolved: entry.visitorResolved || null,
            visitorMatch: entry.visitorMatch || null,
            visitorCandidates: entry.visitorCandidates || [],
          })
        })
      })
  })
  return byGroup
}

/**
 * 來源店寫了「要去支援」的格子。
 *
 * 兩種都要收：只寫「T3／D7」的（沒班別，要配對），
 * 以及寫了「3早／7晚」的（已知班別）。後者雖然不必配對，但它**認領了目的店的那一格**——
 * 漏掉它，目的店那格就會被誤報成「有支援班但沒有店寫是誰去」。
 */
function collectClaims(months) {
  const byGroup = new Map()
  months.forEach((month) => {
    ;(month.people || []).forEach((person) => {
      if (person.placeholder) return
      Object.entries(month.entries?.[person.key] || {}).forEach(([date, entry]) => {
        if (!entry?.isSupport || entry.atStore === month.storeCode) return
        // 目的店自己的表上已經有這個人了，不需要配對
        if (entry.isShadow) return
        // 只寫一個「支」、沒註明去哪家店的也要收 —— 配不到空位，但要看得到
        const id = groupId(month.monthKey, date, entry.atStore || '')
        if (!byGroup.has(id)) byGroup.set(id, [])
        byGroup.get(id).push({
          personKey: person.key,
          name: person.name,
          homeStore: month.storeCode,
          monthKey: month.monthKey,
          date,
          atStore: entry.atStore,
          raw: entry.raw || '',
          declaredShift: entry.shift === SUPPORT_SHIFT_CODE ? null : entry.shift,
          declaredPosition: entry.position || null,
        })
      })
    })
  })
  return byGroup
}

/**
 * 把來源的「誰」與目的店的「什麼班」配起來。
 *
 * 配對規則，由強到弱：
 * 1. 使用者手動指定的（links）永遠優先。
 * 2. 剩下剛好一人對一班時自動配。
 * 3. 其餘一律留白，並標出狀態讓人來決定 —— 不猜。
 *
 * @param {object[]} months 已正規化的月份文件
 * @param {{date: string, atStore: string, personKey: string, slotId: string}[]} links 手動指定
 * @returns {object[]} 每個（月、日、目的店）一組
 */
export function buildSupportGroups(months, links = []) {
  const list = Array.isArray(months) ? months.filter(Boolean) : []
  const slotsByGroup = collectSlots(list)
  const claimsByGroup = collectClaims(list)

  const importedStores = new Set(list.map((month) => `${month.monthKey}|${month.storeCode}`))
  const linkMap = new Map()
  ;(Array.isArray(links) ? links : []).forEach((link) => {
    if (link?.date && link?.atStore && link?.personKey) linkMap.set(linkKeyOf(link), link.slotId)
  })

  const ids = new Set([...slotsByGroup.keys(), ...claimsByGroup.keys()])
  const groups = []

  ;[...ids].sort().forEach((id) => {
    const [monthKey, date, atStore] = id.split('|')
    const slots = (slotsByGroup.get(id) || []).map((slot) => ({ ...slot, takenBy: null }))
    const claims = (claimsByGroup.get(id) || []).map((claim) => ({
      ...claim,
      slotId: null,
      // 紙本已經寫明班別的，班別直接成立，不必等配對
      resolvedShift: claim.declaredShift || null,
      resolvedPosition: claim.declaredShift ? claim.declaredPosition : null,
      // sheet＝紙本就寫明了；auto＝一對一自動配；manual＝人工指定
      source: claim.declaredShift ? 'sheet' : null,
      auto: false,
    }))
    const destinationImported = importedStores.has(`${monthKey}|${atStore}`)

    // 1. 目的店寫了來的人是誰就照名字對 —— 這是最強的證據。
    //    轉換器比對過名單：visitorResolved 是它確定的人；對不上單一人時只給候選，
    //    絕不模糊比對（「Yuni」離「Yunni」和「Yumi」一樣近，硬猜必錯一半）。
    //    候選跟「當天實際說要去那家店的人」取交集，剛好一個才算數。
    const visitorMismatches = []
    slots
      .filter((slot) => slot.visitor)
      .forEach((slot) => {
        const open = claims.filter((c) => !c.slotId)
        const exact = slot.visitorResolved
          ? open.find((c) => c.personKey === slot.visitorResolved)
          : open.find((c) => c.personKey === slot.visitor)

        let matched = exact
        let source = 'visitor'
        if (!matched && slot.visitorCandidates?.length) {
          const narrowed = open.filter((c) => slot.visitorCandidates.includes(c.personKey))
          if (narrowed.length === 1) {
            matched = narrowed[0]
            source = 'visitorNarrowed'
          }
        }

        if (!matched) {
          visitorMismatches.push({
            visitor: slot.visitor,
            candidates: slot.visitorCandidates?.length
              ? slot.visitorCandidates
              : open.map((c) => c.name),
            ambiguous: slot.visitorMatch === 'ambiguous',
          })
          return
        }

        slot.takenBy = matched.personKey
        matched.slotId = slot.slotId
        matched.resolvedShift = matched.declaredShift || slot.shift
        matched.resolvedPosition = matched.declaredPosition || slot.position
        matched.source = source
      })

    // 2. 紙本寫明班別的（3早／7晚）先認領班別相同的空位，
    //    目的店那一格才不會被當成沒人認領
    claims
      .filter((claim) => claim.declaredShift && !claim.slotId)
      .forEach((claim) => {
        const slot = slots.find((s) => !s.takenBy && s.shift === claim.declaredShift)
        if (!slot) return
        slot.takenBy = claim.personKey
        claim.slotId = slot.slotId
        if (!claim.resolvedPosition) claim.resolvedPosition = slot.position
      })

    // 3. 手動指定
    claims.forEach((claim) => {
      if (claim.declaredShift || claim.slotId) return
      const wanted = linkMap.get(linkKeyOf({ date, atStore, personKey: claim.personKey }))
      if (!wanted) return
      const slot = slots.find((s) => s.slotId === wanted && !s.takenBy)
      if (!slot) return
      slot.takenBy = claim.personKey
      claim.slotId = slot.slotId
      claim.resolvedShift = slot.shift
      claim.resolvedPosition = slot.position
      claim.source = 'manual'
      claim.auto = false
    })

    // 4. 剩下剛好一對一才自動配
    const openClaims = claims.filter((claim) => !claim.slotId && !claim.declaredShift)
    const openSlots = slots.filter((slot) => !slot.takenBy)
    if (openClaims.length === 1 && openSlots.length === 1) {
      openSlots[0].takenBy = openClaims[0].personKey
      openClaims[0].slotId = openSlots[0].slotId
      openClaims[0].resolvedShift = openSlots[0].shift
      openClaims[0].resolvedPosition = openSlots[0].position
      openClaims[0].source = 'auto'
      openClaims[0].auto = true
    }

    // 「未解決」指的是不知道班別，不是沒對到空位
    const unresolvedClaims = claims.filter((claim) => !claim.resolvedShift)
    const freeSlots = slots.filter((slot) => !slot.takenBy)

    let status = SUPPORT_STATUS.RESOLVED
    if (!atStore && unresolvedClaims.length) status = SUPPORT_STATUS.NO_DESTINATION_WRITTEN
    else if (unresolvedClaims.length && !destinationImported) status = SUPPORT_STATUS.NO_DESTINATION
    else if (unresolvedClaims.length && freeSlots.length) status = SUPPORT_STATUS.AMBIGUOUS
    else if (unresolvedClaims.length) status = SUPPORT_STATUS.MISSING_SLOT
    else if (freeSlots.length) status = SUPPORT_STATUS.EXTRA_SLOT

    groups.push({
      id,
      monthKey,
      date,
      atStore,
      claims,
      slots,
      destinationImported,
      status,
      needsAttention: status !== SUPPORT_STATUS.RESOLVED,
      unresolvedCount: unresolvedClaims.length,
      // 目的店寫了是誰來、但來源店的班表還沒匯入時，至少講得出名字
      unclaimedVisitors: freeSlots.map((slot) => slot.visitor).filter(Boolean),
      visitorMismatches,
    })
  })

  return groups
}

/**
 * 各店「自己那張表上」的真人上班紀錄，用來判斷支援格是不是影子。
 * key: monthKey|storeCode|personKey|date
 */
function buildOwnRecordIndex(months) {
  const index = new Map()
  months.forEach((month) => {
    ;(month.people || []).forEach((person) => {
      if (person.placeholder) return
      Object.entries(month.entries?.[person.key] || {}).forEach(([date, entry]) => {
        if (entry?.kind !== 'WORK' || entry.isSupport) return
        index.set(`${month.monthKey}|${month.storeCode}|${person.key}|${date}`, month.storeCode)
      })
    })
  })
  return index
}

function destinationTimesOf(months, monthKey, atStore) {
  const month = months.find((m) => m.monthKey === monthKey && m.storeCode === atStore)
  if (month?.shiftTypes) return month.shiftTypes
  return Object.fromEntries(
    Object.entries(getDefaultShiftTimes(atStore)).map(([code, time]) => [
      code,
      { code, ...time, crossesMidnight: false },
    ])
  )
}

/**
 * 把配對結果與時間換算寫回月份文件。
 *
 * - 寫明班別的支援（3早／7晚）：沿用班別，時間換成目的店的。
 * - 只寫 T3／D7 的：配到了就補上班別（標成推測），配不到就維持「班別未定」。
 *
 * @returns {object[]} 新的月份文件陣列（不改動輸入）
 */
export function resolveSupportShifts(months, links = []) {
  const list = Array.isArray(months) ? months.filter(Boolean) : []
  if (list.length === 0) return []

  const ownRecords = buildOwnRecordIndex(list)
  const storeCodes = [...new Set(list.map((m) => m.storeCode))]

  const groups = buildSupportGroups(list, links)
  const claimIndex = new Map()
  groups.forEach((group) => {
    group.claims.forEach((claim) => {
      claimIndex.set(`${group.monthKey}|${group.date}|${group.atStore}|${claim.personKey}`, claim)
    })
  })

  return list.map((month) => {
    let changed = false
    const entries = {}
    const crossChecks = []

    Object.entries(month.entries || {}).forEach(([personKey, byDate]) => {
      const next = {}
      Object.entries(byDate).forEach(([date, entry]) => {
        if (!entry?.isSupport || entry.atStore === month.storeCode) {
          next[date] = entry
          return
        }

        const resolved = { ...entry }

        // 同月哪家店「自己的表上」有這個人當天上班 —— 剛好一家就是目的地。
        // 轉換器 --link 也算同一件事；兩邊獨立算，不一致就代表有一邊錯了。
        const hits = storeCodes.filter(
          (code) =>
            code !== month.storeCode &&
            ownRecords.has(`${month.monthKey}|${code}|${personKey}|${date}`)
        )
        const derivedDestination = hits.length === 1 ? hits[0] : null

        if (!resolved.atStore && derivedDestination) {
          resolved.resolvedAtStore = derivedDestination
          resolved.destinationFrom = 'ownRecord'
        }
        if (
          resolved.atStore &&
          derivedDestination &&
          resolved.atStore !== derivedDestination &&
          entry.atStoreSource === 'linked'
        ) {
          crossChecks.push(
            `${date} ${personKey}：匯入檔說支援 ${resolved.atStore}，但同月只有 ${derivedDestination} 的班表上有他當天上班`
          )
        }

        const destination = resolved.atStore || resolved.resolvedAtStore || null

        // 目的店自己的表上已經有這個人當天的班了 —— 這一格只是「他今天不在本店」的註記，
        // 不是另一個班。留著會在目的店把同一個人列兩次。
        const derivedShadow =
          !!destination && ownRecords.has(`${month.monthKey}|${destination}|${personKey}|${date}`)
        const fileShadow = entry.duplicateOf?.store || null

        if (fileShadow || derivedShadow) {
          resolved.isShadow = true
          resolved.shadowOf = fileShadow || destination
        }
        if (!!fileShadow !== derivedShadow) {
          crossChecks.push(
            `${date} ${personKey}：互換班判定不一致（匯入檔 ${fileShadow || '無'}／我方推得 ${
              derivedShadow ? destination : '無'
            }）`
          )
        }

        const times = destinationTimesOf(list, month.monthKey, destination)

        if (entry.shift === SUPPORT_SHIFT_CODE) {
          const claim = claimIndex.get(`${month.monthKey}|${date}|${entry.atStore}|${personKey}`)
          if (claim?.resolvedShift) {
            resolved.resolvedShift = claim.resolvedShift
            resolved.resolvedPosition = claim.resolvedPosition || null
            resolved.resolvedFrom = claim.auto ? 'inferred' : 'manual'
          } else {
            // 配不到就維持未定：寧可顯示「紙本沒寫班別」，也不要猜出一個錯的班
            delete resolved.resolvedShift
            delete resolved.resolvedPosition
            delete resolved.resolvedFrom
          }
        } else {
          resolved.resolvedShift = entry.shift
          resolved.resolvedPosition = entry.position || null
          resolved.resolvedFrom = 'sheet'
        }

        const destinationType = times[resolved.resolvedShift]
        if (destinationType) {
          resolved.start = destinationType.start
          resolved.end = destinationType.end
          resolved.crossesMidnight = !!destinationType.crossesMidnight
        } else {
          resolved.start = null
          resolved.end = null
        }

        if (
          resolved.resolvedShift !== entry.resolvedShift ||
          resolved.resolvedFrom !== entry.resolvedFrom ||
          resolved.isShadow !== entry.isShadow ||
          resolved.resolvedAtStore !== entry.resolvedAtStore ||
          resolved.start !== entry.start ||
          resolved.end !== entry.end
        ) {
          changed = true
        }
        next[date] = resolved
      })
      entries[personKey] = next
    })

    if (!changed && !crossChecks.length) return month
    return {
      ...month,
      entries,
      warnings: crossChecks.length
        ? [...(month.warnings || []), ...crossChecks.map((c) => `跨檔對照：${c}`)]
        : month.warnings,
    }
  })
}

/**
 * 還沒對上班別的支援班。這些人可能是早班或中班 —— 也就是可能要坐交通車卻沒被排進去。
 * @param {object[]} months
 * @param {object[]} links
 * @param {{from?: string, to?: string}} range 只看這段日期
 */
export function listUnresolvedSupport(months, links = [], { from, to } = {}) {
  return buildSupportGroups(months, links)
    .filter((group) => group.needsAttention)
    .filter((group) => (!from || group.date >= from) && (!to || group.date <= to))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.atStore || '').localeCompare(b.atStore || ''))
}

/** 這段期間可能漏掉交通車的人：支援班沒對上，而目的店那天有早班或中班的空位。 */
export function listCarRiskSupport(months, links = [], { from, to, carShifts = [] } = {}) {
  return listUnresolvedSupport(months, links, { from, to })
    .filter((group) => group.unresolvedCount > 0)
    .map((group) => ({
      ...group,
      // 目的店寫了但還沒被認領的班次裡，有沒有需要坐車的
      riskyShifts: group.slots
        .filter((slot) => !slot.takenBy && carShifts.includes(slot.shift))
        .map((slot) => slot.shift),
      unknownShift: !group.destinationImported || group.slots.length === 0,
    }))
    .filter((group) => group.riskyShifts.length > 0 || group.unknownShift)
}
