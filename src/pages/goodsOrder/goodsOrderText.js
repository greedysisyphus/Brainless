import {
  GOODS_ORDER_SOURCE,
  formatQuantity,
  getEffectiveOrderQty,
  getItemStatus,
  parseQuantity,
} from './goodsOrderConstants.js'

export function buildOrderLines(items, countsMap, orderStoreName) {
  const active = (items || []).filter((item) => !item.disabled)
  const lines = []
  for (const item of active) {
    const entry = countsMap?.[item.id] || {}
    if (getItemStatus(item, entry) !== 'order') continue
    const qty = getEffectiveOrderQty(item, entry)
    if (!Number.isFinite(qty) || qty <= 0) continue
    lines.push(`${item.name} ${formatQuantity(qty)}${item.unit}`)
  }
  return {
    header: `${GOODS_ORDER_SOURCE}➡️${orderStoreName || ''}`.trim(),
    lines,
    text:
      lines.length === 0
        ? ''
        : [`${GOODS_ORDER_SOURCE}➡️${orderStoreName || ''}`.trim(), ...lines].join('\n'),
    orderCount: lines.length,
  }
}

/**
 * 存進快照的盤點明細：只留已輸入數量的品項，並帶上當時的品名／單位／最低庫存，
 * 之後品項改名或刪除，舊快照仍讀得懂（可用來回推消耗速度）。
 */
export function buildSnapshotItems(items, countsMap) {
  const snapshot = []
  for (const item of items || []) {
    if (item.disabled) continue
    const entry = countsMap?.[item.id] || {}
    const parsed = parseQuantity(
      entry.current === 0 || entry.current ? String(entry.current) : ''
    )
    if (parsed.kind !== 'value') continue
    snapshot.push({
      id: item.id,
      name: item.name,
      unit: item.unit || '',
      current: parsed.value,
      minStock: Number(item.minStock) || 0,
      order: getItemStatus(item, entry) === 'order' ? getEffectiveOrderQty(item, entry) : 0,
    })
  }
  return snapshot
}
