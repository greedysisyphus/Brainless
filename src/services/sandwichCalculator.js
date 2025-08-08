// 純計算邏輯，便於單元測試與重用

function toInt(value) {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export function calculateSandwichPlan(values, settings) {
  const breadPerBag = Math.max(1, toInt(settings.breadPerBag))
  const targetHam = Math.max(0, toInt(settings.targetHam))
  const targetSalami = Math.max(0, toInt(settings.targetSalami))

  const existingHam = Math.max(0, toInt(values.existingHam))
  const existingSalami = Math.max(0, toInt(values.existingSalami))
  const extraBags = Math.max(0, toInt(values.extraBags))
  const distribution = values.distribution || 'even'

  const baseHamNeeded = Math.max(0, targetHam - existingHam)
  const baseSalamiNeeded = Math.max(0, targetSalami - existingSalami)
  const baseTotalNeeded = baseHamNeeded + baseSalamiNeeded

  // 最少以 baseTotalNeeded 推算包數，再加上使用者指定的額外包數
  const minimumBags = Math.max(0, Math.ceil(baseTotalNeeded / breadPerBag))
  const bagsNeeded = minimumBags + extraBags
  const totalSlices = bagsNeeded * breadPerBag

  // 多出來的片數（可能為 0）依分配方式灑到火腿/臘腸
  const extraSlices = Math.max(0, totalSlices - baseTotalNeeded)

  let extraHam = 0
  let extraSalami = 0
  switch (distribution) {
    case 'ham':
      extraHam = extraSlices
      break
    case 'salami':
      extraSalami = extraSlices
      break
    default: {
      extraHam = Math.floor(extraSlices / 2)
      extraSalami = extraSlices - extraHam
    }
  }

  const totalHamNeeded = baseHamNeeded + extraHam
  const totalSalamiNeeded = baseSalamiNeeded + extraSalami

  return {
    totalHamNeeded,
    totalSalamiNeeded,
    bagsNeeded,
    totalTarget: targetHam + targetSalami,
    totalExisting: existingHam + existingSalami,
    baseHamNeeded,
    baseSalamiNeeded,
    baseTotalNeeded,
    totalSlices,
    extraSlices,
    extraHam,
    extraSalami
  }
}


