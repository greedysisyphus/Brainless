import { useState } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { CwButton, CwInput } from '../../components/studio/ui'
import { createItemId } from './goodsOrderConstants'

function blankItem() {
  return {
    id: createItemId(),
    name: '',
    unit: '箱',
    minStock: 1,
    defaultOrderQty: 1,
    allowFraction: true,
    disabled: false,
  }
}

export function GoodsOrderSettingsSheet({
  open,
  storeName,
  orderStoreName,
  items,
  onClose,
  onChangeOrderStoreName,
  onChangeItems,
}) {
  const [draftName, setDraftName] = useState('')

  if (!open) return null

  const updateItem = (id, patch) => {
    onChangeItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const move = (index, dir) => {
    const next = [...items]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChangeItems(next)
  }

  const addItem = () => {
    const name = draftName.trim()
    const item = blankItem()
    if (name) item.name = name
    onChangeItems([...items, item])
    setDraftName('')
  }

  return (
    <div className="fixed inset-0 z-[12000] flex flex-col bg-[var(--cw-bg)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--cw-border-strong)] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-[var(--cw-text)]">品項設定</h2>
          <p className="text-xs text-[var(--cw-text-muted)]">{storeName} · 僅本店</p>
        </div>
        <CwButton type="button" variant="ghost" onClick={onClose} aria-label="關閉設定">
          <XMarkIcon className="h-5 w-5" />
        </CwButton>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <CwInput
          className="mb-4"
          label="叫貨店名"
          value={orderStoreName}
          onChange={(e) => onChangeOrderStoreName(e.target.value)}
          placeholder="例如 桃機D7"
          hint={`輸出第一行：三重➡️${orderStoreName || '…'}`}
        />

        <div className="mb-3 flex gap-2">
          <CwInput
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="新品項名稱"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addItem()
              }
            }}
          />
          <CwButton type="button" variant="secondary" onClick={addItem}>
            <PlusIcon className="h-4 w-4" />
            新增
          </CwButton>
        </div>

        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className={`rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] p-3 ${
                item.disabled ? 'opacity-55' : ''
              }`}
            >
              <div className="mb-2 flex items-start gap-2">
                <CwInput
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  placeholder="品名"
                  className="flex-1"
                />
                <div className="flex shrink-0 gap-1">
                  <CwButton type="button" variant="ghost" onClick={() => move(index, -1)} aria-label="上移">
                    <ArrowUpIcon className="h-4 w-4" />
                  </CwButton>
                  <CwButton type="button" variant="ghost" onClick={() => move(index, 1)} aria-label="下移">
                    <ArrowDownIcon className="h-4 w-4" />
                  </CwButton>
                  <CwButton
                    type="button"
                    variant="ghost"
                    onClick={() => onChangeItems(items.filter((it) => it.id !== item.id))}
                    aria-label="刪除"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </CwButton>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <CwInput
                  label="單位"
                  value={item.unit}
                  onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                />
                <CwInput
                  label="最低庫存"
                  inputMode="decimal"
                  value={item.minStock}
                  onChange={(e) => updateItem(item.id, { minStock: e.target.value })}
                />
                <CwInput
                  label="預設叫貨量"
                  inputMode="decimal"
                  value={item.defaultOrderQty}
                  onChange={(e) => updateItem(item.id, { defaultOrderQty: e.target.value })}
                />
                <div className="flex flex-col justify-end gap-2 text-xs">
                  <label className="flex items-center gap-2 text-[var(--cw-text)]">
                    <input
                      type="checkbox"
                      checked={!!item.allowFraction}
                      onChange={(e) => updateItem(item.id, { allowFraction: e.target.checked })}
                    />
                    允許分數
                  </label>
                  <label className="flex items-center gap-2 text-[var(--cw-text)]">
                    <input
                      type="checkbox"
                      checked={!!item.disabled}
                      onChange={(e) => updateItem(item.id, { disabled: e.target.checked })}
                    />
                    停用
                  </label>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
