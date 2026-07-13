import { CalculatorIcon, CheckCircleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import {
  CwAlert,
  CwBadge,
  CwButton,
  CwCard,
  CwGrid,
  CwEmptyState,
  CwInput,
  CwStack,
} from '../../components/studio/ui'
import { studioSurfaces } from '../../components/studio/studioSurfaceClasses'

/**
 * Studio 專用 UI；state 全部由父組件 SandwichCalculator 提供。
 */
export default function SandwichStudioPanel({
  zhtw,
  selectedStore,
  setSelectedStore,
  loading,
  error,
  values,
  setValues,
  preview,
  results,
  distributionMethods,
  stores,
  calculate,
  resetFields,
  setShowSettings,
  settings,
}) {
  return (
    <CwStack className="!gap-[var(--cw-stack-gap)]">
      <CwCard title={zhtw.sandwich.selectStore}>
        <div className="flex flex-wrap gap-2">
          {stores.map((store) => (
            <CwButton
              key={store.value}
              type="button"
              variant={selectedStore === store.value ? 'primary' : 'secondary'}
              onClick={() => setSelectedStore(store.value)}
            >
              {store.label}
            </CwButton>
          ))}
        </div>
      </CwCard>

      {loading ? (
        <CwCard title={zhtw.common.loading}>
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--cw-border)] border-t-[var(--cw-text)]" />
          </div>
        </CwCard>
      ) : error ? (
        <CwAlert variant="warning">{error}</CwAlert>
      ) : (
        <CwGrid className="!grid-cols-1 lg:!grid-cols-2">
          <CwCard
            title={zhtw.sandwich.inputsTitle}
            subtitle={zhtw.sandwich.inputsSubtitle}
            actions={
              <CwButton
                type="button"
                variant="ghost"
                className="!p-2"
                onClick={() => setShowSettings(true)}
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </CwButton>
            }
          >
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] p-3 text-center">
                <div className="text-[10px] font-semibold uppercase text-[var(--cw-text-muted)]">
                  {zhtw.sandwichUi.summaryTarget}
                </div>
                <div className="mt-1 text-lg font-bold text-[var(--cw-text)]">{preview.totalTarget}</div>
              </div>
              <div className="rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] p-3 text-center">
                <div className="text-[10px] font-semibold uppercase text-[var(--cw-text-muted)]">
                  {zhtw.sandwichUi.summaryExisting}
                </div>
                <div className="mt-1 text-lg font-bold text-[var(--cw-text)]">{preview.totalExisting}</div>
              </div>
              <div className={studioSurfaces.statBlock}>
                <div className={studioSurfaces.statLabel}>{zhtw.sandwichUi.summaryToMake}</div>
                <div className={studioSurfaces.statValue}>{preview.baseTotalNeeded}</div>
              </div>
            </div>

            <CwStack gap="sm">
              <CwInput
                label={zhtw.sandwich.existingSignature}
                type="number"
                min={0}
                inputMode="numeric"
                value={values.existingSignature}
                onWheel={(e) => e.target.blur()}
                onChange={(e) =>
                  setValues({ ...values, existingSignature: e.target.value })
                }
              />
              <CwInput
                label={zhtw.sandwich.existingDark}
                type="number"
                min={0}
                inputMode="numeric"
                value={values.existingDark}
                onWheel={(e) => e.target.blur()}
                onChange={(e) =>
                  setValues({ ...values, existingDark: e.target.value })
                }
              />
              <CwInput
                label={zhtw.sandwich.existingLight}
                type="number"
                min={0}
                inputMode="numeric"
                value={values.existingLight}
                onWheel={(e) => e.target.blur()}
                onChange={(e) =>
                  setValues({ ...values, existingLight: e.target.value })
                }
              />

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
                  {zhtw.sandwich.distribution}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
                  {distributionMethods.map((method) => {
                    const isSelected = values.distribution === method.value
                    return (
                      <CwButton
                        key={method.value}
                        type="button"
                        variant={isSelected ? 'primary' : 'secondary'}
                        onClick={() => setValues({ ...values, distribution: method.value })}
                        className="!justify-start"
                      >
                        {isSelected ? <CheckCircleIcon className="h-4 w-4 shrink-0" /> : null}
                        {method.label}
                      </CwButton>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
                  {zhtw.sandwich.packModeLabel}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      value: 'up',
                      label: `${zhtw.sandwich.packModeUp}（${preview.packUpSlices}${zhtw.sandwichUi.unitPiece}／${preview.bagsCeil}${zhtw.sandwichUi.unitBag}）`,
                      disabled: preview.baseTotalNeeded === 0,
                    },
                    {
                      value: 'down',
                      label: `${zhtw.sandwich.packModeDown}（${preview.packDownSlices}${zhtw.sandwichUi.unitPiece}／${preview.bagsFloor}${zhtw.sandwichUi.unitBag}）`,
                      disabled: !preview.canPackDown,
                    },
                  ].map((opt) => {
                    const isSelected = values.packMode === opt.value
                    return (
                      <CwButton
                        key={opt.value}
                        type="button"
                        variant={isSelected ? 'primary' : 'secondary'}
                        disabled={opt.disabled}
                        onClick={() => setValues({ ...values, packMode: opt.value })}
                      >
                        {opt.label}
                      </CwButton>
                    )
                  })}
                </div>
                {preview.baseTotalNeeded > 0 && preview.canPackDown ? (
                  <p className="mt-2 text-xs text-[var(--cw-text-muted)]">
                    需求 {preview.baseTotalNeeded} 片：可多做成 {preview.packUpSlices} 片，或少做成{' '}
                    {preview.packDownSlices} 片
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <CwButton type="button" variant="pillPrimary" onClick={calculate} className="min-w-[8rem]">
                  <CalculatorIcon className="h-5 w-5" /> {zhtw.sandwich.calculate}
                </CwButton>
                <CwButton type="button" variant="secondary" onClick={resetFields}>
                  {zhtw.sandwich.reset}
                </CwButton>
              </div>
            </CwStack>
          </CwCard>

          <CwCard title={zhtw.sandwich.resultsTitle} subtitle={zhtw.sandwich.resultsSubtitle}>
            {results ? (
              <CwStack gap="sm">
                <div className="rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] p-4">
                  <div className="text-3xl font-bold text-[var(--cw-text)]">
                    {results.totalSignatureNeeded}
                  </div>
                  <div className="text-sm text-[var(--cw-text-muted)]">
                    {zhtw.sandwich.needSignature}（{zhtw.sandwichUi.unitPiece}）
                  </div>
                </div>
                <div className="rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] p-4">
                  <div className="text-3xl font-bold text-[var(--cw-text)]">
                    {results.totalDarkNeeded}
                  </div>
                  <div className="text-sm text-[var(--cw-text-muted)]">
                    {zhtw.sandwich.needDark}（{zhtw.sandwichUi.unitPiece}）
                  </div>
                </div>
                <div className="rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] p-4">
                  <div className="text-3xl font-bold text-[var(--cw-text)]">
                    {results.totalLightNeeded}
                  </div>
                  <div className="text-sm text-[var(--cw-text-muted)]">
                    {zhtw.sandwich.needLight}（{zhtw.sandwichUi.unitPiece}）
                  </div>
                </div>
                <div className="rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] p-4">
                  <div className="text-3xl font-bold text-[var(--cw-text)]">
                    {results.bagsNeeded}
                  </div>
                  <div className="text-sm text-[var(--cw-text-muted)]">
                    {zhtw.sandwich.needBags}（{zhtw.sandwichUi.unitBag}）
                  </div>
                </div>
                <div className="rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] p-4">
                  <div className="text-4xl font-bold text-[var(--cw-text)]">
                    {results.totalSignatureNeeded +
                      results.totalDarkNeeded +
                      results.totalLightNeeded}
                  </div>
                  <div className="text-sm text-[var(--cw-text-muted)]">
                    {zhtw.sandwich.totalNeed}（{zhtw.sandwichUi.unitPiece}）
                  </div>
                </div>
                <div className="rounded-[var(--cw-radius)] border border-[var(--cw-border)] p-4 text-sm text-[var(--cw-text-muted)]">
                  <div className="mb-2 font-semibold text-[var(--cw-text)]">
                    {zhtw.sandwichUi.capacityTitle}
                  </div>
                  <div>
                    {zhtw.sandwichUi.capacityFormula}：
                    <span className="text-[var(--cw-text)]">{results.bagsNeeded}</span> ×{' '}
                    <span className="text-[var(--cw-text)]">{settings.slicesPerLoaf}</span> ={' '}
                    <span className="font-bold text-[var(--cw-text)]">{results.totalSlices}</span>
                  </div>
                  {results.shortfall > 0 ? (
                    <div className="mt-2">
                      {zhtw.sandwichUi.capacityShortfall}：{' '}
                      <span className="font-semibold text-[var(--cw-text)]">{results.shortfall}</span>
                    </div>
                  ) : (
                    <div className="mt-2">
                      {zhtw.sandwichUi.capacityLeftover}：{' '}
                      <span className="font-semibold text-[var(--cw-text)]">{results.extraSlices}</span>
                    </div>
                  )}
                  <div className="mt-2 border-t border-[var(--cw-border)] pt-2">
                    {zhtw.sandwichUi.capacityDistributionTitle}
                    {' — '}
                    {values.distribution === 'even' && zhtw.sandwichUi.capacityEvenDetail}
                    {values.distribution === 'signature' && zhtw.sandwichUi.capacitySignatureDetail}
                    {values.distribution === 'dark' && zhtw.sandwichUi.capacityDarkDetail}
                    {values.distribution === 'light' && zhtw.sandwichUi.capacityLightDetail}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 border-t border-[var(--cw-border)] pt-2">
                    <span>{zhtw.sandwichUi.capacityActual}</span>
                    <CwBadge tone="neutral">招牌 +{results.extraSignature}</CwBadge>
                    <CwBadge tone="neutral">深焙 +{results.extraDark}</CwBadge>
                    <CwBadge tone="neutral">淺焙 +{results.extraLight}</CwBadge>
                  </div>
                </div>
              </CwStack>
            ) : (
              <CwEmptyState title={zhtw.sandwich.resultsTitle} description={zhtw.sandwich.emptyHint} />
            )}
          </CwCard>
        </CwGrid>
      )}
    </CwStack>
  )
}
