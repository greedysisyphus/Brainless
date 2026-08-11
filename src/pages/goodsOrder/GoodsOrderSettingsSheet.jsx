import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsUpDownIcon,
  ArrowUturnLeftIcon,
  ClockIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { CwAlert, CwButton, CwInput } from '../../components/studio/ui'
import { createItemId } from './goodsOrderConstants'
import { formatVersionTime, getUpdatedAt, getUpdatedBy } from './goodsOrderSync'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function blankItem() {
  return {
    id: createItemId(),
    name: '',
    unit: '箱',
    note: '',
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
  validation,
  saveStatus,
  canUndo,
  actorName,
  lastUpdatedAt,
  lastUpdatedBy,
  revision,
  versions,
  historyStatus,
  conflict,
  onClose,
  onUndo,
  onRetrySave,
  onChangeOrderStoreName,
  onChangeItems,
  onChangeActorName,
  onLoadVersions,
  onRestoreVersion,
  onKeepMerged,
  onUseRemote,
}) {
  const [draftName, setDraftName] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [query, setQuery] = useState('')
  const [reorderMode, setReorderMode] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [restoreCandidateId, setRestoreCandidateId] = useState(null)
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    onLoadVersions?.()
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key !== 'Tab') return

      const focusable = [...(dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || [])]
      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    const focusFrame = window.requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector(FOCUSABLE_SELECTOR)
      ;(firstFocusable || dialogRef.current)?.focus()
    })
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus()
      }
    }
  }, [open, onLoadVersions])

  if (!open) return null

  const saveStatusText = {
    idle: '自動儲存',
    saving: '儲存中…',
    saved: '已自動儲存',
    invalid: `有 ${validation?.count || 0} 個欄位需要修正`,
    error: '自動儲存失敗',
    conflict: '有其他人的修改待確認',
  }[saveStatus] || '自動儲存'

  const visibleItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      const normalizedQuery = query.trim().toLocaleLowerCase()
      return [item.name, item.unit, item.note].some((value) =>
        String(value || '').toLocaleLowerCase().includes(normalizedQuery)
      )
    })

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
    if (!name) return
    const item = blankItem()
    item.name = name
    onChangeItems([...items, item])
    setDraftName('')
    setExpandedId(item.id)
  }

  const removeItem = (item) => {
    if (expandedId === item.id) setExpandedId(null)
    onChangeItems(items.filter((candidate) => candidate.id !== item.id))
  }

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[12000] flex flex-col bg-[var(--cw-bg)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goods-order-settings-title"
      tabIndex={-1}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--cw-border)] px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <h2 id="goods-order-settings-title" className="truncate text-xl font-bold tracking-tight text-[var(--cw-text)]">
            品項設定
          </h2>
          <p className="mt-0.5 text-sm text-[var(--cw-text-muted)]">
            {storeName} · 僅本店 ·{' '}
            <span
              className={
                saveStatus === 'error' || saveStatus === 'invalid'
                  ? 'text-[var(--cw-danger)]'
                  : saveStatus === 'conflict'
                    ? 'text-[var(--cw-warning)]'
                    : ''
              }
              role="status"
              aria-live="polite"
            >
              {saveStatusText}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {saveStatus === 'error' ? (
            <CwButton type="button" variant="secondary" onClick={onRetrySave}>
              重試
            </CwButton>
          ) : null}
          <CwButton
            type="button"
            variant="ghost"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="復原上一次設定變更"
          >
            <ArrowUturnLeftIcon className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">復原</span>
          </CwButton>
          <CwButton type="button" variant="ghost" onClick={onClose} aria-label="關閉設定">
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </CwButton>
        </div>
      </header>

      {conflict ? (
        <div className="shrink-0 border-b border-[var(--cw-border)] px-5 py-3">
          <CwAlert variant="warning">
            <div role="alert">
              <p className="font-semibold">另一台裝置修改了相同設定</p>
              <p className="mt-1 text-sm leading-relaxed">
                已自動合併不同品項；仍有 {conflict.conflicts?.length || 1} 個相同欄位需要決定。無論選哪一個，目前雲端版本都會保留在版本紀錄。
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <CwButton type="button" variant="primary" onClick={onKeepMerged}>
                  保留我的衝突欄位並合併
                </CwButton>
                <CwButton type="button" variant="secondary" onClick={onUseRemote}>
                  使用最新雲端版本
                </CwButton>
              </div>
            </div>
          </CwAlert>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className="mb-8 rounded-[var(--cw-radius-lg)] bg-[var(--cw-mega-surface)] p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-[var(--cw-text)]">多人協作</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--cw-text-muted)]">
                不同品項會自動合併；同一欄位同時修改時會請你確認。
              </p>
            </div>
            <span className="rounded-full border border-[var(--cw-border)] px-2.5 py-1 text-xs text-[var(--cw-text-muted)]">
              {revision > 0 ? `版本 ${revision}` : '相容舊版資料'}
            </span>
          </div>
          <CwInput
            label="這台裝置的顯示名稱"
            name="goods-order-actor-name"
            autoComplete="off"
            value={actorName}
            onChange={(event) => onChangeActorName(event.target.value)}
            placeholder="例如 D7 iPad、怡君手機…"
            hint="其他使用者可用這個名稱辨認最後更新來源。"
          />
          <p className="mt-3 text-xs leading-relaxed text-[var(--cw-text-muted)]" role="status">
            最後更新：{lastUpdatedAt ? formatVersionTime(lastUpdatedAt) : '尚無雲端紀錄'}
            {lastUpdatedBy?.name ? ` · ${lastUpdatedBy.name}` : ''}
          </p>
        </section>

        <section className="mb-8">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--cw-text-muted)]">
            叫貨標題
          </h3>
          <CwInput
            label="叫貨店名"
            name="goods-order-store-name"
            autoComplete="off"
            value={orderStoreName}
            onChange={(e) => onChangeOrderStoreName(e.target.value)}
            placeholder="例如 桃機D7…"
            error={validation?.orderStoreName}
            hint={`輸出：三重➡️${orderStoreName || '…'}`}
          />
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--cw-text-muted)]">
              品項清單
            </h3>
            <span className="text-xs text-[var(--cw-text-muted)]">
              {query ? `${visibleItems.length}/${items.length} 項` : `${items.length} 項`}
            </span>
          </div>

          <div className="mb-5 flex gap-2">
            <CwInput
              label="新增品項"
              name="goods-new-item"
              autoComplete="off"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="新品項名稱…"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addItem()
                }
              }}
            />
            <CwButton
              type="button"
              variant="secondary"
              onClick={addItem}
              disabled={!draftName.trim()}
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              新增
            </CwButton>
          </div>

          <div className="mb-5 flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <MagnifyingGlassIcon
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--cw-text-muted)]"
                aria-hidden="true"
              />
              <input
                type="search"
                name="goods-item-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜尋品項…"
                aria-label="搜尋品項"
                className="min-h-11 w-full rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] py-2.5 pl-10 pr-3 text-base text-[var(--cw-text)] placeholder:text-[var(--cw-text-muted)] focus:border-[var(--cw-border-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--cw-focus-ring)]"
              />
            </div>
            <CwButton
              type="button"
              variant={reorderMode ? 'brand' : 'secondary'}
              onClick={() => {
                setQuery('')
                setExpandedId(null)
                setReorderMode((value) => !value)
              }}
              aria-pressed={reorderMode}
            >
              <ArrowsUpDownIcon className="h-5 w-5" aria-hidden="true" />
              {reorderMode ? '完成排序' : '調整順序'}
            </CwButton>
          </div>

          <ul className="space-y-2">
            {visibleItems.map(({ item, index }) => {
              const expanded = expandedId === item.id
              return (
                <li
                  key={item.id}
                  className={`rounded-[var(--cw-radius-lg)] border bg-[var(--cw-mega-surface)] transition-colors ${
                    item.disabled
                      ? 'border-[var(--cw-border)] opacity-60'
                      : 'border-[var(--cw-border)]'
                  }`}
                >
                  <div className="flex items-center gap-1 px-2 py-2">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--cw-radius)] px-2 py-2 text-left hover:bg-[var(--cw-bg)]/60"
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                      aria-expanded={expanded}
                    >
                      <ChevronDownIcon
                        className={`h-4 w-4 shrink-0 text-[var(--cw-text-muted)] transition-transform ${
                          expanded ? 'rotate-0' : '-rotate-90'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-[var(--cw-text)]">
                          {item.name || '（未命名）'}
                        </span>
                        <span className="mt-0.5 block text-xs text-[var(--cw-text-muted)]">
                          {item.unit || '—'}
                          {item.note ? ` · ${item.note}` : ''}
                          {item.disabled ? ' · 已停用' : ''}
                          {!expanded
                            ? ` · 最低 ${item.minStock} · 預設叫 ${item.defaultOrderQty}`
                            : ''}
                        </span>
                      </span>
                    </button>
                    {reorderMode ? (
                    <div className="flex shrink-0 items-center gap-0.5 pr-1">
                      <button
                        type="button"
                        className="cw-touch-target rounded-md p-2 text-[var(--cw-text-muted)] hover:bg-[var(--cw-bg)] hover:text-[var(--cw-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--cw-focus-ring)] disabled:pointer-events-none disabled:opacity-30"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label={`上移 ${item.name || '未命名品項'}`}
                      >
                        <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="cw-touch-target rounded-md p-2 text-[var(--cw-text-muted)] hover:bg-[var(--cw-bg)] hover:text-[var(--cw-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--cw-focus-ring)] disabled:pointer-events-none disabled:opacity-30"
                        onClick={() => move(index, 1)}
                        disabled={index === items.length - 1}
                        aria-label={`下移 ${item.name || '未命名品項'}`}
                      >
                        <ArrowDownIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    ) : null}
                  </div>

                  {expanded ? (
                    <div className="space-y-3 border-t border-[var(--cw-border)] px-4 py-4">
                      <CwInput
                        label="品名"
                        name={`goods-item-name-${item.id}`}
                        autoComplete="off"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        placeholder="品名…"
                        error={validation?.itemErrors?.[item.id]?.name}
                      />
                      <CwInput
                        label="備註（選填）"
                        name={`goods-item-note-${item.id}`}
                        autoComplete="off"
                        value={item.note || ''}
                        onChange={(e) => updateItem(item.id, { note: e.target.value })}
                        placeholder="例如 1 箱 20 包、危安、白蓋…"
                      />
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <CwInput
                          label="單位"
                          name={`goods-item-unit-${item.id}`}
                          autoComplete="off"
                          value={item.unit}
                          onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                          error={validation?.itemErrors?.[item.id]?.unit}
                        />
                        <CwInput
                          label="最低庫存"
                          name={`goods-item-min-${item.id}`}
                          inputMode="decimal"
                          autoComplete="off"
                          value={item.minStock}
                          onChange={(e) => updateItem(item.id, { minStock: e.target.value })}
                          error={validation?.itemErrors?.[item.id]?.minStock}
                        />
                        <CwInput
                          label="預設叫貨"
                          name={`goods-item-order-${item.id}`}
                          inputMode="decimal"
                          autoComplete="off"
                          value={item.defaultOrderQty}
                          onChange={(e) =>
                            updateItem(item.id, { defaultOrderQty: e.target.value })
                          }
                          error={validation?.itemErrors?.[item.id]?.defaultOrderQty}
                        />
                      </div>
                      <label className="flex items-center gap-2.5 text-sm text-[var(--cw-text)]">
                        <input
                          name={`goods-item-disabled-${item.id}`}
                          type="checkbox"
                          className="h-4 w-4"
                          checked={!!item.disabled}
                          onChange={(e) => updateItem(item.id, { disabled: e.target.checked })}
                        />
                        停用（不出現在盤點）
                      </label>
                      <div className="flex justify-end border-t border-[var(--cw-border)] pt-3">
                        <CwButton
                          type="button"
                          variant="danger"
                          onClick={() => removeItem(item)}
                          aria-label={`刪除 ${item.name || '未命名品項'}；可使用復原找回`}
                        >
                          <TrashIcon className="h-4 w-4" aria-hidden="true" />
                          刪除品項
                        </CwButton>
                      </div>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
          {visibleItems.length === 0 ? (
            <div className="rounded-[var(--cw-radius-lg)] border border-dashed border-[var(--cw-border-strong)] px-4 py-10 text-center">
              <p className="text-sm font-semibold text-[var(--cw-text)]">找不到符合「{query}」的品項</p>
              <button
                type="button"
                className="cw-touch-target mt-2 rounded-[var(--cw-radius)] px-3 text-sm font-semibold text-[var(--cw-brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--cw-focus-ring)]"
                onClick={() => setQuery('')}
              >
                清除搜尋
              </button>
            </div>
          ) : null}
        </section>

        <section className="mt-8 border-t border-[var(--cw-border)] pt-6">
          <button
            type="button"
            className="cw-touch-target flex w-full items-center justify-between gap-3 rounded-[var(--cw-radius)] px-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--cw-focus-ring)]"
            onClick={() => {
              setHistoryOpen((value) => !value)
              setRestoreCandidateId(null)
              if (!historyOpen) onLoadVersions?.()
            }}
            aria-expanded={historyOpen}
          >
            <span className="flex items-center gap-2 font-semibold text-[var(--cw-text)]">
              <ClockIcon className="h-5 w-5" aria-hidden="true" />
              版本紀錄與還原
            </span>
            <ChevronDownIcon
              className={`h-4 w-4 text-[var(--cw-text-muted)] transition-transform ${historyOpen ? '' : '-rotate-90'}`}
              aria-hidden="true"
            />
          </button>

          {historyOpen ? (
            <div className="mt-3">
              <p className="mb-3 text-xs leading-relaxed text-[var(--cw-text-muted)]">
                還原不會刪除目前內容；系統會先保存目前版本，再建立一個新的還原版本。
              </p>
              {historyStatus === 'loading' ? (
                <p className="py-5 text-center text-sm text-[var(--cw-text-muted)]">載入版本紀錄…</p>
              ) : historyStatus === 'error' ? (
                <div className="flex items-center justify-between gap-2 rounded-[var(--cw-radius)] border border-[var(--cw-danger)]/30 p-3 text-sm text-[var(--cw-danger)]">
                  <span>無法載入版本紀錄</span>
                  <CwButton type="button" variant="secondary" onClick={onLoadVersions}>重試</CwButton>
                </div>
              ) : versions.length === 0 ? (
                <p className="rounded-[var(--cw-radius)] border border-dashed border-[var(--cw-border-strong)] px-3 py-5 text-center text-sm text-[var(--cw-text-muted)]">
                  下一次設定儲存後，這裡會開始保留舊版本。
                </p>
              ) : (
                <ul className="space-y-2">
                  {versions.map((version) => {
                    const versionActor = getUpdatedBy(version)
                    const selected = restoreCandidateId === version.id
                    return (
                      <li key={version.id} className="rounded-[var(--cw-radius)] border border-[var(--cw-border)] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0 text-sm">
                            <p className="font-semibold text-[var(--cw-text)]">
                              版本 {Number(version._revision) || 0}
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--cw-text-muted)]">
                              {formatVersionTime(getUpdatedAt(version))}
                              {versionActor?.name ? ` · ${versionActor.name}` : ''}
                              {` · ${(version.items || []).length} 項`}
                            </p>
                          </div>
                          <CwButton
                            type="button"
                            variant="ghost"
                            disabled={saveStatus === 'saving' || saveStatus === 'invalid'}
                            onClick={() => setRestoreCandidateId(selected ? null : version.id)}
                          >
                            {selected ? '取消' : '選擇還原'}
                          </CwButton>
                        </div>
                        {selected ? (
                          <div className="mt-3 flex flex-col gap-2 border-t border-[var(--cw-border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-xs text-[var(--cw-text-muted)]">確定以此內容建立新版本？</span>
                            <CwButton
                              type="button"
                              variant="primary"
                              onClick={() => {
                                onRestoreVersion(version)
                                setRestoreCandidateId(null)
                              }}
                            >
                              還原此版本
                            </CwButton>
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
