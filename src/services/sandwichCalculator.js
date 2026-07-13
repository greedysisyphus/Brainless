// 厚片計算器純邏輯（一條吐司 = N 片；可多包／少包）

function toInt(value) {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

const TYPES = ['signature', 'dark', 'light']

/** 依分配方式決定「多出／優先保留」的順序 */
function priorityOrder(distribution) {
  switch (distribution) {
    case 'signature':
      return ['signature', 'dark', 'light']
    case 'dark':
      return ['dark', 'signature', 'light']
    case 'light':
      return ['light', 'signature', 'dark']
    default:
      return null // even
  }
}

/** 將 extra 片依優先順序灑到各類型 */
function distributeExtra(extraSlices, distribution) {
  const extra = { signature: 0, dark: 0, light: 0 }
  if (extraSlices <= 0) return extra

  const order = priorityOrder(distribution)
  if (!order) {
    // 平均：盡量均分，餘數給前幾個
    const base = Math.floor(extraSlices / 3)
    let rem = extraSlices - base * 3
    for (const key of TYPES) {
      extra[key] = base + (rem > 0 ? 1 : 0)
      if (rem > 0) rem -= 1
    }
    return extra
  }

  extra[order[0]] = extraSlices
  return extra
}

/**
 * 容量不足時：依優先順序盡量滿足（優先者先拿滿），平均則按比例縮減
 */
function allocateWithinCapacity(baseNeeded, totalSlices, distribution) {
  const baseTotal = TYPES.reduce((s, k) => s + baseNeeded[k], 0)
  const allocated = { signature: 0, dark: 0, light: 0 }

  if (totalSlices <= 0 || baseTotal <= 0) return allocated

  const order = priorityOrder(distribution)
  if (!order) {
    // 按比例，最大餘數法
    const raw = TYPES.map((k) => ({
      key: k,
      exact: (baseNeeded[k] / baseTotal) * totalSlices,
    }))
    let used = 0
    for (const row of raw) {
      row.floor = Math.floor(row.exact)
      row.frac = row.exact - row.floor
      used += row.floor
    }
    let rem = totalSlices - used
    raw
      .slice()
      .sort((a, b) => b.frac - a.frac)
      .forEach((row) => {
        if (rem > 0) {
          row.floor += 1
          rem -= 1
        }
      })
    for (const row of raw) allocated[row.key] = row.floor
    return allocated
  }

  let remaining = totalSlices
  for (const key of order) {
    const take = Math.min(baseNeeded[key], remaining)
    allocated[key] = take
    remaining -= take
  }
  return allocated
}

/**
 * @param {object} values
 * @param {object} settings
 */
export function calculateSandwichPlan(values, settings) {
  const slicesPerLoaf = Math.max(
    1,
    toInt(settings.slicesPerLoaf ?? settings.breadPerBag ?? 10)
  )
  const targetSignature = Math.max(0, toInt(settings.targetSignature ?? settings.targetHam))
  const targetDark = Math.max(0, toInt(settings.targetDark ?? settings.targetSalami))
  const targetLight = Math.max(0, toInt(settings.targetLight))

  const existingSignature = Math.max(
    0,
    toInt(values.existingSignature ?? values.existingHam)
  )
  const existingDark = Math.max(0, toInt(values.existingDark ?? values.existingSalami))
  const existingLight = Math.max(0, toInt(values.existingLight))

  const distribution = normalizeDistribution(values.distribution)
  const packMode = values.packMode === 'down' ? 'down' : 'up'

  const baseNeeded = {
    signature: Math.max(0, targetSignature - existingSignature),
    dark: Math.max(0, targetDark - existingDark),
    light: Math.max(0, targetLight - existingLight),
  }
  const baseTotalNeeded =
    baseNeeded.signature + baseNeeded.dark + baseNeeded.light

  const bagsCeil =
    baseTotalNeeded === 0 ? 0 : Math.ceil(baseTotalNeeded / slicesPerLoaf)
  const bagsFloor =
    baseTotalNeeded === 0 ? 0 : Math.floor(baseTotalNeeded / slicesPerLoaf)

  // 少包：不足一整條時仍至少 0；若 floor===0 且有需求，少包=0（僅多包有意義）
  let bagsNeeded = packMode === 'down' ? bagsFloor : bagsCeil
  if (packMode === 'down' && bagsFloor === 0 && bagsCeil > 0) {
    bagsNeeded = 0
  }

  const totalSlices = bagsNeeded * slicesPerLoaf
  const packUpSlices = bagsCeil * slicesPerLoaf
  const packDownSlices = bagsFloor * slicesPerLoaf
  const canPackDown = bagsFloor > 0 && bagsFloor < bagsCeil
  const canPackUp = bagsCeil > bagsFloor || (bagsCeil > 0 && bagsFloor === bagsCeil)

  let totals
  let extra = { signature: 0, dark: 0, light: 0 }
  let shortfall = 0

  if (totalSlices >= baseTotalNeeded) {
    const extraSlices = totalSlices - baseTotalNeeded
    extra = distributeExtra(extraSlices, distribution)
    totals = {
      signature: baseNeeded.signature + extra.signature,
      dark: baseNeeded.dark + extra.dark,
      light: baseNeeded.light + extra.light,
    }
  } else {
    shortfall = baseTotalNeeded - totalSlices
    totals = allocateWithinCapacity(baseNeeded, totalSlices, distribution)
    extra = { signature: 0, dark: 0, light: 0 }
  }

  return {
    // 新欄位
    totalSignatureNeeded: totals.signature,
    totalDarkNeeded: totals.dark,
    totalLightNeeded: totals.light,
    bagsNeeded,
    loavesNeeded: bagsNeeded,
    slicesPerLoaf,
    totalTarget: targetSignature + targetDark + targetLight,
    totalExisting: existingSignature + existingDark + existingLight,
    baseSignatureNeeded: baseNeeded.signature,
    baseDarkNeeded: baseNeeded.dark,
    baseLightNeeded: baseNeeded.light,
    baseTotalNeeded,
    totalSlices,
    extraSlices: Math.max(0, totalSlices - baseTotalNeeded),
    shortfall,
    extraSignature: extra.signature,
    extraDark: extra.dark,
    extraLight: extra.light,
    packMode,
    bagsCeil,
    bagsFloor,
    packUpSlices,
    packDownSlices,
    canPackDown,
    canPackUp,
    // 舊欄位別名（過渡，避免漏改 UI 爆掉）
    totalHamNeeded: totals.signature,
    totalSalamiNeeded: totals.dark,
    baseHamNeeded: baseNeeded.signature,
    baseSalamiNeeded: baseNeeded.dark,
    extraHam: extra.signature,
    extraSalami: extra.dark,
  }
}

export function normalizeDistribution(d) {
  if (d === 'ham' || d === 'signature') return 'signature'
  if (d === 'salami' || d === 'dark') return 'dark'
  if (d === 'light') return 'light'
  return 'even'
}

export function normalizeThickSettings(data, defaults) {
  const d = data || {}
  return {
    slicesPerLoaf: toInt(d.slicesPerLoaf ?? d.breadPerBag) || defaults.slicesPerLoaf,
    targetSignature: Math.max(0, toInt(d.targetSignature ?? d.targetHam ?? defaults.targetSignature)),
    targetDark: Math.max(0, toInt(d.targetDark ?? d.targetSalami ?? defaults.targetDark)),
    targetLight: Math.max(0, toInt(d.targetLight ?? defaults.targetLight)),
  }
}

export function normalizeThickValues(data, defaults) {
  const d = data || {}
  return {
    existingSignature: d.existingSignature ?? d.existingHam ?? defaults.existingSignature,
    existingDark: d.existingDark ?? d.existingSalami ?? defaults.existingDark,
    existingLight: d.existingLight ?? defaults.existingLight,
    distribution: normalizeDistribution(d.distribution ?? defaults.distribution),
    packMode: d.packMode === 'down' ? 'down' : 'up',
  }
}
