/**
 * 同事身分：暱稱與手動合併。
 *
 * 人員鍵預設是匯出檔判讀出來的姓名，但同一個人可能在不同店被寫成／讀成不同字
 * （例如 D7 的「阿寶」與 D13 的「阿力」）。這裡把這種情況收斂成同一個人，
 * 並允許設定顯示用的暱稱。
 */

/** 一份同事設定的正規化形狀（暱稱與合併部分）。 */
export function normalizeIdentitySettings(raw) {
  return {
    nickname: String(raw?.nickname ?? '').trim(),
    mergedInto: String(raw?.mergedInto ?? '').trim(),
  }
}

/**
 * 解析合併關係。支援 a→b→c 的鏈，並擋掉自我合併與環。
 * @param {Record<string, {nickname?: string, mergedInto?: string}>} peopleSettings
 * @returns {{canonicalOf: (key: string) => string, displayNameOf: (key: string, fallback?: string) => string,
 *   aliasesOf: (canonicalKey: string) => string[], hasMerges: boolean}}
 */
export function buildIdentity(peopleSettings = {}) {
  const rawMerge = {}
  Object.entries(peopleSettings).forEach(([key, settings]) => {
    const target = String(settings?.mergedInto ?? '').trim()
    if (target && target !== key) rawMerge[key] = target
  })

  const resolved = new Map()
  const resolve = (key) => {
    if (resolved.has(key)) return resolved.get(key)
    const seen = new Set([key])
    let current = key
    while (rawMerge[current]) {
      const next = rawMerge[current]
      if (seen.has(next)) break // 環：停在這裡，不再往下追
      seen.add(next)
      current = next
    }
    seen.forEach((visited) => resolved.set(visited, current))
    return current
  }

  const canonicalOf = (key) => (key ? resolve(key) : key)

  const aliasIndex = new Map()
  Object.keys(rawMerge).forEach((key) => {
    const canonical = canonicalOf(key)
    if (canonical === key) return
    if (!aliasIndex.has(canonical)) aliasIndex.set(canonical, [])
    aliasIndex.get(canonical).push(key)
  })

  const displayNameOf = (key, fallback) => {
    const canonical = canonicalOf(key)
    const nickname = String(peopleSettings[canonical]?.nickname ?? '').trim()
    return nickname || fallback || canonical
  }

  return {
    canonicalOf,
    displayNameOf,
    aliasesOf: (canonicalKey) => [...(aliasIndex.get(canonicalKey) || [])].sort(),
    hasMerges: Object.keys(rawMerge).length > 0,
  }
}

/** 沒有任何設定時的中性身分，讓呼叫端不必到處判斷 null。 */
export const IDENTITY_NONE = buildIdentity({})

function mergeEntryMaps(target, source, conflicts, canonicalKey) {
  Object.entries(source).forEach(([date, entry]) => {
    if (target[date]) {
      conflicts.push({ personKey: canonicalKey, date })
      return
    }
    target[date] = entry
  })
}

/**
 * 把合併與暱稱套用到月份文件上，產生「人員鍵已經收斂」的副本。
 * 套用之後，下游的名單、統計、月視圖與匯出都不必再認識別名。
 *
 * @param {object[]} months
 * @param {ReturnType<typeof buildIdentity>} identity
 * @returns {object[]}
 */
export function applyIdentity(months, identity = IDENTITY_NONE) {
  const list = Array.isArray(months) ? months.filter(Boolean) : []
  if (!identity?.hasMerges) {
    // 沒有合併時只需要套暱稱
    return list.map((month) => ({
      ...month,
      people: (month.people || []).map((person) => ({
        ...person,
        displayName: identity.displayNameOf(person.key, person.name),
      })),
    }))
  }

  return list.map((month) => {
    const conflicts = []
    const entries = {}
    const peopleByCanonical = new Map()

    ;(month.people || []).forEach((person) => {
      const canonical = identity.canonicalOf(person.key)
      const existing = peopleByCanonical.get(canonical)
      if (existing) {
        // 同一份班表裡出現兩個別名（例如同店兩種寫法），併成一列並記錄來源
        existing.mergedFrom = [...new Set([...(existing.mergedFrom || []), person.key])]
        existing.order = Math.min(existing.order, person.order)
      } else {
        // 被併走的別名一律改用正式人員鍵當名字，否則不同店會各顯示各的寫法
        const baseName = canonical === person.key ? person.name : canonical
        peopleByCanonical.set(canonical, {
          ...person,
          key: canonical,
          name: baseName,
          displayName: identity.displayNameOf(canonical, baseName),
          mergedFrom: canonical === person.key ? [] : [person.key],
        })
      }

      const source = month.entries?.[person.key] || {}
      if (!entries[canonical]) entries[canonical] = {}
      mergeEntryMaps(entries[canonical], source, conflicts, canonical)
    })

    const warnings = [...(month.warnings || [])]
    conflicts.forEach(({ personKey, date }) => {
      warnings.push(`合併後「${personKey}」在 ${date} 有兩筆班，已保留先讀到的那筆，請確認合併設定。`)
    })

    return {
      ...month,
      people: [...peopleByCanonical.values()].sort((a, b) => a.order - b.order),
      entries,
      warnings,
    }
  })
}

/**
 * 合併前的檢查：同一份班表同一天兩人都有班，代表他們是兩個人，不該合併。
 * @returns {{ok: boolean, reason?: string, clashes: {monthKey: string, storeCode: string, date: string}[]}}
 */
export function checkMergeSafety(months, sourceKey, targetKey) {
  if (!sourceKey || !targetKey) return { ok: false, reason: '缺少要合併的同事', clashes: [] }
  if (sourceKey === targetKey) return { ok: false, reason: '不能跟自己合併', clashes: [] }

  const clashes = []
  ;(months || []).forEach((month) => {
    const source = month.entries?.[sourceKey]
    const target = month.entries?.[targetKey]
    if (!source || !target) return
    Object.keys(source).forEach((date) => {
      if (target[date]) clashes.push({ monthKey: month.monthKey, storeCode: month.storeCode, date })
    })
  })

  if (clashes.length) {
    return {
      ok: false,
      reason: `這兩位在 ${clashes.length} 天同時有班（例如 ${clashes[0].date}），看起來是兩個人。`,
      clashes,
    }
  }
  return { ok: true, clashes: [] }
}
