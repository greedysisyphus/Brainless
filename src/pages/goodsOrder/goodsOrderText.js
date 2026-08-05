import {
  GOODS_ORDER_SOURCE,
  formatQuantity,
  getEffectiveOrderQty,
  getItemStatus,
} from './goodsOrderConstants'

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
