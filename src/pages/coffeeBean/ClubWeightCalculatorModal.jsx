import { useState } from 'react'
import {
  ArrowPathIcon,
  CalculatorIcon,
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid'
import { CwButton, CwInput } from '../../components/studio/ui'
import { STORES, getBoxWeightKey, getStoreName } from './coffeeBeanConstants'

function ClubChoiceChip({ selected, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--cw-radius)] border px-3 py-2 text-sm font-semibold transition-colors ${
        selected
          ? 'border-[var(--cw-brand)]/45 bg-[var(--cw-brand-muted)] text-[var(--cw-brand)]'
          : 'border-[var(--cw-border)] bg-[var(--cw-mega-surface)] text-[var(--cw-text)] hover:border-[var(--cw-border-strong)]'
      } ${className}`}
    >
      {selected ? <CheckIconSolid className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {children}
    </button>
  )
}

/**
 * Club 專用重量換算：計算優先 + 設定摘要列展開。
 * Classic／Studio 仍使用 CoffeeBeanManager 內既有彈窗。
 */
export default function ClubWeightCalculatorModal({
  selectedWeightStore,
  setSelectedWeightStore,
  weightMode,
  setWeightMode,
  weightSettings,
  tempInputValues,
  updateWeightSetting,
  resetWeightSettings,
  calculations,
  updateCalculation,
  addCalculation,
  removeCalculation,
  resetCalculations,
  onClose,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const boxLabel = getBoxWeightKey(selectedWeightStore) === 'mujiBoxWeight' ? 'MUJI 盒子' : 'IKEA 盒子'
  const storeName = getStoreName(selectedWeightStore)
  const boxWeightKey = getBoxWeightKey(selectedWeightStore)
  const bagWeightValue =
    tempInputValues.bagWeight !== undefined ? tempInputValues.bagWeight : weightSettings.bagWeight
  const boxWeightValue =
    tempInputValues[boxWeightKey] !== undefined
      ? tempInputValues[boxWeightKey]
      : weightSettings[boxWeightKey] ?? weightSettings.ikeaBoxWeight
  const totalPacks = calculations.reduce((sum, c) => sum + (c.estimatedPacks || 0), 0)

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/45 touch-manipulation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex min-h-[100dvh] w-full items-center justify-center px-4 py-10 cw-pb-safe pt-[max(2.75rem,calc(env(safe-area-inset-top)+1.25rem))] pb-[max(2rem,env(safe-area-inset-bottom)+1rem)] sm:py-14">
        <div
          className="w-full max-w-3xl max-h-[min(92dvh,900px)] overflow-y-auto rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] p-5 shadow-2xl [-webkit-overflow-scrolling:touch] sm:p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="mb-1 text-xl font-bold text-[var(--cw-text)]">重量換算</h2>
              <p className="text-sm text-[var(--cw-text-muted)]">估算豆包數量</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <CwButton
                type="button"
                variant="secondary"
                className="!min-h-9 !gap-1 !px-3 !py-1.5 !text-xs"
                onClick={resetWeightSettings}
              >
                回復設定
              </CwButton>
              <CwButton type="button" variant="ghost" className="!min-h-9 !p-2" onClick={onClose} aria-label="關閉">
                <XMarkIcon className="h-5 w-5" />
              </CwButton>
            </div>
          </div>

          {/* 設定摘要列：分店與重量參數（容器類型改在外層快速切換） */}
          <div className="mb-4 rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)]">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-expanded={settingsOpen}
            >
              <span className="text-sm font-semibold text-[var(--cw-text)]">
                {storeName}
                <span className="mx-1.5 font-normal text-[var(--cw-text-muted)]">設定</span>
              </span>
              <ChevronDownIcon
                className={`h-5 w-5 shrink-0 text-[var(--cw-text-muted)] transition-transform ${
                  settingsOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {settingsOpen ? (
              <div className="space-y-4 border-t border-[var(--cw-border)] px-3.5 pb-4 pt-3">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">分店</p>
                  <div className="flex flex-wrap gap-2">
                    {STORES.map((store) => (
                      <ClubChoiceChip
                        key={store.id}
                        selected={selectedWeightStore === store.id}
                        onClick={() => setSelectedWeightStore(store.id)}
                        className="min-w-[5.5rem] flex-none sm:flex-1"
                      >
                        {store.name}
                      </ClubChoiceChip>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <CwInput
                    label="銀袋重量 (g)"
                    type="number"
                    value={bagWeightValue}
                    onChange={(e) => updateWeightSetting('bagWeight', e.target.value, false)}
                    onBlur={(e) => updateWeightSetting('bagWeight', e.target.value, true)}
                    placeholder="輸入重量"
                    inputMode="decimal"
                    className="!mb-0"
                  />
                  <CwInput
                    label={`${boxLabel}重量 (g)`}
                    type="number"
                    value={boxWeightValue}
                    onChange={(e) => updateWeightSetting(boxWeightKey, e.target.value, false)}
                    onBlur={(e) => updateWeightSetting(boxWeightKey, e.target.value, true)}
                    placeholder="輸入重量"
                    inputMode="decimal"
                    className="!mb-0"
                  />
                  <CwInput
                    label="每包豆子重量 (g)"
                    type="number"
                    value={
                      tempInputValues.beanWeightPerPack !== undefined
                        ? tempInputValues.beanWeightPerPack
                        : weightSettings.beanWeightPerPack
                    }
                    onChange={(e) => updateWeightSetting('beanWeightPerPack', e.target.value, false)}
                    onBlur={(e) => updateWeightSetting('beanWeightPerPack', e.target.value, true)}
                    placeholder="輸入重量"
                    inputMode="decimal"
                    className="!mb-0 md:col-span-2"
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* 外層快速切換容器類型：計算時常用，不必進設定 */}
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">容器類型</p>
            <div className="flex gap-2">
              <ClubChoiceChip selected={weightMode === 'bag'} onClick={() => setWeightMode('bag')}>
                銀袋
              </ClubChoiceChip>
              <ClubChoiceChip selected={weightMode === 'ikea'} onClick={() => setWeightMode('ikea')}>
                {boxLabel}
              </ClubChoiceChip>
            </div>
          </div>

          {/* 計算優先 */}
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-bold text-[var(--cw-text)]">計算結果</h3>
            <div className="flex flex-wrap gap-2">
              <CwButton
                type="button"
                variant="secondary"
                className="!min-h-9 !gap-2 !px-3 !py-1.5 !text-xs"
                onClick={resetCalculations}
                title="重置所有計算結果"
              >
                <ArrowPathIcon className="h-4 w-4" />
                重置結果
              </CwButton>
              <CwButton type="button" variant="primary" className="!min-h-9 !gap-2 !px-3 !py-1.5 !text-xs" onClick={addCalculation}>
                <PlusIcon className="h-4 w-4" />
                新增計算欄位
              </CwButton>
            </div>
          </div>

          <div className="space-y-3">
            {calculations.map((calc) => (
              <div
                key={calc.id}
                className="rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h5 className="font-semibold text-[var(--cw-text)]">計算欄位 #{calc.id}</h5>
                  {calculations.length > 1 ? (
                    <CwButton
                      type="button"
                      variant="ghost"
                      className="!min-h-9 !p-1.5"
                      onClick={() => removeCalculation(calc.id)}
                      aria-label="刪除此計算欄位"
                    >
                      <TrashIcon className="h-4 w-4 text-red-500/90" />
                    </CwButton>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <CwInput
                    label="總重量 (g，含袋/盒)"
                    type="number"
                    value={calc.totalWeight}
                    onChange={(e) => updateCalculation(calc.id, e.target.value)}
                    placeholder="秤上總重"
                    inputMode="decimal"
                    className="!mb-0"
                  />
                  <div>
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
                      估算包數
                    </span>
                    <div className="flex min-h-11 w-full items-center justify-center rounded-[var(--cw-radius)] border border-[var(--cw-brand)]/35 bg-[var(--cw-brand-muted)] px-3 py-2.5 text-center text-sm font-bold text-[var(--cw-brand)]">
                      {calc.estimatedPacks} 包
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {calculations.length > 1 ? (
            <div className="mt-5 rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] p-5">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex items-center gap-3">
                  <div className="rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-mega-surface)] p-2.5">
                    <CalculatorIcon className="h-5 w-5 text-[var(--cw-brand)]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[var(--cw-text)]">總計估算包數</h4>
                    <p className="text-xs text-[var(--cw-text-muted)]">所有計算欄位的加總</p>
                  </div>
                </div>
                <div className="text-center sm:text-right">
                  <div className="text-2xl font-extrabold text-[var(--cw-brand)] sm:text-3xl">
                    {totalPacks.toFixed(1)}
                  </div>
                  <div className="text-sm font-bold text-[var(--cw-text-muted)]">包</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
