import { PlusIcon, TrashIcon, CalculatorIcon, ClipboardDocumentListIcon, ArrowDownTrayIcon, XMarkIcon, BuildingStorefrontIcon, Cog6ToothIcon, ArrowPathIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import BeanTypesSettingsModal from '../components/BeanTypesSettingsModal'
import ExportLogoPicker from './coffeeBean/ExportLogoPicker'
import ClubWeightCalculatorModal from './coffeeBean/ClubWeightCalculatorModal'
import QuantityRow from './coffeeBean/QuantityRow'
import { DualThemePage } from '../components/studio/DualThemePage'
import { CwButton, CwCard, CwInput, CwStack } from '../components/studio/ui'
import { STORES, getBoxWeightKey, getStoreName } from './coffeeBean/coffeeBeanConstants'
import { InventoryConflictModal, InventorySyncBanner } from './coffeeBean/InventorySyncUI'
import { coffeeBeanStudioTokens, getCoffeeBeanLayoutShells } from './coffeeBean/coffeeBeanStudioStyles'
import { useCoffeeBeanManager } from './useCoffeeBeanManager'


const COFFEE_BC = [
  { label: 'Brainless', href: '#/sandwich' },
  { label: '庫存與報表', href: '#/' },
  { label: '咖啡豆管理', href: '#/coffee-beans' },
]

function CoffeeBeanManager() {
  const {
    isStudio,
    isClub,
    showWeightCalculator,
    setShowWeightCalculator,
    showBeanTypesSettings,
    setShowBeanTypesSettings,
    showTutorial,
    setShowTutorial,
    selectedStore,
    setSelectedStore,
    beanTypes,
    getBeanLocation,
    inventoryRef,
    inventory,
    inventorySyncStatus,
    inventoryLocked,
    setInventorySyncStatus,
    inventoryConflict,
    getInventorySyncMeta,
    weightMode,
    setWeightMode,
    selectedWeightStore,
    setSelectedWeightStore,
    openWeightCalculator,
    currentSection,
    exportMode,
    setExportMode,
    customLogoBase64,
    weightSettings,
    weightSettingsForInventory,
    getCellInputMode,
    setCellInputMode,
    calculations,
    flushInventorySync,
    handleInventoryConflictKeepLocal,
    handleInventoryConflictUseRemote,
    handleInventoryConflictMerge,
    addQuantityField,
    updateQuantity,
    updateRetailQuantity,
    removedRow,
    removeRowWithUndo,
    restoreRemovedRow,
    addRetailQuantityField,
    renameBeansInInventory,
    calculateBeanTypeTotal,
    tempInputValues,
    updateWeightSetting,
    addCalculation,
    removeCalculation,
    updateCalculation,
    resetCalculations,
    resetAllData,
    resetWeightSettings,
    handleLogoUpload,
    removeCustomLogo,
    exportInventoryAsImage,
  } = useCoffeeBeanManager()

  const { beanCellShell, calcCellShell, weightFieldShell, weightFieldShellSm } = getCoffeeBeanLayoutShells(isStudio)
  const {
    cwBeanTitle,
    cwBeanDot,
    cwBeanFooterShell,
    cwBeanFooterText,
  } = coffeeBeanStudioTokens

  // 判斷「這列是不是填錯單位」用：這家店空袋／空盒各幾克
  const emptyWeights = {
    bag: weightSettingsForInventory?.bagWeight,
    box: weightSettingsForInventory?.[getBoxWeightKey(selectedStore)],
  }

  const coffeeInner = (
    <div className="mx-auto w-full max-w-6xl">
      <InventorySyncBanner
        status={inventoryLocked ? 'loading' : inventorySyncStatus}
        isStudio={isStudio}
        onRetry={() => {
          setInventorySyncStatus('syncing')
          const dirtyStores = STORES.filter((s) => getInventorySyncMeta(s.id).isDirty)
          const targets = dirtyStores.length > 0 ? dirtyStores : [{ id: selectedStore }]
          Promise.all(targets.map((s) => flushInventorySync(s.id))).catch(() =>
            setInventorySyncStatus('error')
          )
        }}
      />
      <InventoryConflictModal
        open={Boolean(inventoryConflict)}
        isStudio={isStudio}
        storeName={inventoryConflict?.storeName ?? getStoreName(selectedStore)}
        onKeepLocal={handleInventoryConflictKeepLocal}
        onUseRemote={handleInventoryConflictUseRemote}
        onMerge={handleInventoryConflictMerge}
      />
      {isStudio ? (
        <CwStack className="mb-6 !gap-[var(--cw-stack-gap)]">
          <CwCard title="選擇分店" className="border-[var(--cw-border-strong)]">
            <div className="flex flex-wrap gap-2">
              {STORES.map((store) => (
                <CwButton
                  key={store.id}
                  type="button"
                  variant={selectedStore === store.id ? 'primary' : 'secondary'}
                  className="min-h-11"
                  onClick={() => setSelectedStore(store.id)}
                >
                  {store.name}
                </CwButton>
              ))}
            </div>
          </CwCard>
          <div className="flex flex-wrap gap-2">
            <CwButton
              type="button"
              variant="secondary"
              className="min-h-11 gap-2"
              onClick={openWeightCalculator}
            >
              <CalculatorIcon className="h-4 w-4 shrink-0 text-[var(--cw-text-muted)]" />
              重量換算
            </CwButton>
            <CwButton
              type="button"
              variant="secondary"
              className="min-h-11 gap-2"
              onClick={() => setShowBeanTypesSettings(true)}
            >
              <Cog6ToothIcon className="h-4 w-4 shrink-0 text-[var(--cw-text-muted)]" />
              品項設定
            </CwButton>
            <CwButton
              type="button"
              variant="danger"
              className="min-h-11"
              onClick={resetAllData}
              title={`只重置「${getStoreName(selectedStore)}」盤點，不影響其他分店`}
            >
              重置此店
            </CwButton>
          </div>
        </CwStack>
      ) : (
        <>
          {/* 頁面標題（Classic） */}
          <div className="relative mb-6 text-center sm:mb-8 md:mb-10">
            <div className="absolute inset-0 -z-10 flex justify-center">
              <div className="h-64 w-64 rounded-full bg-primary/10 opacity-50 blur-3xl sm:h-80 sm:w-80 md:h-96 md:w-96" />
            </div>

            <div className="title-icon-group group relative mb-4 inline-flex items-center justify-center sm:mb-5 md:mb-6">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-blue-500 opacity-50 blur-xl transition-opacity duration-500 group-hover:opacity-75" />
              <div className="relative inline-flex h-16 w-16 transform items-center justify-center overflow-hidden rounded-xl border-2 border-primary/50 bg-gradient-to-br from-primary/30 via-purple-500/30 to-blue-500/30 shadow-2xl shadow-primary/30 transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 sm:h-[4.5rem] sm:w-[4.5rem] md:h-20 md:w-20 sm:rounded-2xl">
                <div className="absolute inset-0 bg-[length:200%_100%] bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <ClipboardDocumentListIcon className="relative z-10 h-8 w-8 transform text-primary transition-transform duration-300 group-hover:scale-110 sm:h-9 sm:w-9 md:h-10 md:w-10" />
              </div>
            </div>

            <h1 className="relative mb-2 px-4 text-3xl font-extrabold sm:mb-3 sm:text-4xl md:text-5xl">
              <span className="bg-gradient-to-r from-primary via-purple-400 via-blue-400 to-primary bg-clip-text text-transparent">
                咖啡豆管理工具
              </span>
              <span className="absolute inset-0 -z-10 bg-gradient-to-r from-primary via-purple-400 via-blue-400 to-primary bg-clip-text text-transparent opacity-30 blur-xl">
                咖啡豆管理工具
              </span>
            </h1>

            <p className="mb-6 px-4 text-sm font-medium text-gray-400 sm:mb-8 sm:text-base">所以又到星期天</p>
          </div>

          {/* 分店選擇（Classic） */}
          <div className="mb-6 sm:mb-7 md:mb-8">
            <div className="mb-4 flex items-center justify-center gap-2 sm:mb-5 sm:gap-3 md:mb-6">
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-1.5 sm:rounded-xl sm:p-2">
                <BuildingStorefrontIcon className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
              </div>
              <h2 className="text-base font-bold text-primary sm:text-lg">選擇分店</h2>
            </div>

            <div className="relative mx-auto max-w-2xl rounded-xl border border-white/10 bg-surface/60 p-1 sm:rounded-2xl sm:p-1.5">
              <div
                className="absolute bottom-1.5 left-1 top-1.5 rounded-xl bg-gradient-to-r from-primary via-purple-500 to-blue-500 transition-[transform] duration-200 ease-out"
                style={{
                  width: 'calc(33.333% - 4px)',
                  left: '4px',
                  transform:
                    selectedStore === 'central' ? 'translateX(0%)' : selectedStore === 'd7' ? 'translateX(100%)' : 'translateX(200%)',
                }}
              />
              <div className="relative grid grid-cols-3 gap-1.5">
                {STORES.map((store) => {
                  const isSelected = selectedStore === store.id
                  return (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => setSelectedStore(store.id)}
                      className={`relative z-10 min-h-[44px] rounded-lg px-3 py-3 text-xs font-bold transition-colors duration-200 sm:rounded-xl sm:px-4 sm:py-4 sm:text-sm md:px-6 md:py-5 md:text-base ${
                        isSelected ? 'text-white' : 'text-gray-300 active:text-white'
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isSelected ? <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-green-400 shadow-sm" /> : null}
                        <span className="tracking-wide">{store.name}</span>
                      </span>
                      {isSelected ? <div className="absolute inset-0 rounded-xl bg-primary/10 opacity-100" /> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap justify-center gap-3 sm:mb-8">
            <button
              type="button"
              onClick={openWeightCalculator}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-4 py-2.5 text-sm font-medium text-amber-400 transition-all duration-200 hover:border-amber-500/50 hover:from-amber-500/30 hover:to-orange-500/30"
            >
              <CalculatorIcon className="h-4 w-4" />
              重量換算
            </button>
            <button
              type="button"
              onClick={() => setShowBeanTypesSettings(true)}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-purple-500/30 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-2.5 text-sm font-medium text-purple-400 transition-all duration-200 hover:border-purple-500/50 hover:from-purple-500/30 hover:to-pink-500/30"
            >
              <Cog6ToothIcon className="h-4 w-4" />
              品項設定
            </button>
            <button
              type="button"
              onClick={resetAllData}
              title={`只重置「${getStoreName(selectedStore)}」盤點，不影響其他分店`}
              className="min-h-[44px] rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-all duration-200 hover:border-red-500/50 hover:bg-red-500/20"
            >
              重置此店
            </button>
          </div>
        </>
      )}

      {/* 一、咖啡豆盤點表 */}
      <div className={`relative mb-6 sm:mb-8 ${isStudio ? '' : 'group'}`}>
        <div
          className={`pointer-events-none absolute -inset-1 rounded-2xl blur-xl transition-opacity duration-500 ${
            isStudio ? 'hidden' : 'bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100'
          }`}
        />

        <div
          ref={inventoryRef}
          inert={inventoryLocked ? '' : undefined}
          style={inventoryLocked ? { opacity: 0.45 } : undefined}
          className={
            isStudio
              ? 'relative overflow-hidden rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-surface)] p-4 shadow-sm sm:p-5 md:p-6'
              : 'relative overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-surface/90 via-surface/70 to-surface/90 p-4 shadow-2xl backdrop-blur-xl sm:p-5 md:p-6'
          }
          style={{ transform: 'none', willChange: 'auto' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.scale = '1'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.scale = '1'
          }}
        >
          <div
            className={`pointer-events-none absolute inset-0 bg-[length:200%_100%] bg-gradient-to-r from-primary/0 via-purple-500/5 to-blue-500/0 transition-opacity duration-500 ${
              isStudio ? 'hidden' : 'opacity-0 group-hover:opacity-100'
            }`}
          />
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 relative z-10">
            <div className="flex items-center gap-3">
              {isStudio ? (
                <div className="rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] p-2 sm:p-2.5">
                  <ClipboardDocumentListIcon className="h-4 w-4 text-[var(--cw-text)] sm:h-5 sm:w-5 md:h-6 md:w-6" />
                </div>
              ) : (
                <div className="group/icon relative">
                  <div className="absolute inset-0 rounded-lg bg-primary/20 blur-lg transition-all duration-300 group-hover/icon:bg-primary/30 sm:rounded-xl" />
                  <div className="relative rounded-lg border border-primary/40 bg-gradient-to-br from-primary/20 to-purple-500/20 p-2 shadow-lg sm:rounded-xl sm:p-2.5">
                    <ClipboardDocumentListIcon className="h-4 w-4 transform text-primary transition-transform duration-300 group-hover/icon:scale-110 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  </div>
                </div>
              )}
          <div className="flex items-center gap-2">
                <h2
                  className={
                    isStudio
                      ? 'text-lg font-bold text-[var(--cw-text)] sm:text-xl md:text-2xl'
                      : 'bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-lg font-bold text-transparent sm:text-xl md:text-2xl'
                  }
                >
                  咖啡豆盤點表
                </h2>
                <button
                  type="button"
                  onClick={() => setShowTutorial(true)}
                  className={
                    isStudio
                      ? 'rounded-lg p-1.5 text-[var(--cw-text-muted)] transition-colors hover:bg-[var(--cw-bg)] hover:text-[var(--cw-text)]'
                      : 'rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-white/10 hover:text-primary'
                  }
                  title="使用教學"
                  aria-label="使用教學"
                >
                  <QuestionMarkCircleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
          </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ExportLogoPicker
                isStudio={isStudio}
                exportMode={exportMode}
                setExportMode={setExportMode}
                customLogoBase64={customLogoBase64}
                onLogoUpload={handleLogoUpload}
                onRemoveCustomLogo={removeCustomLogo}
                storeName={getStoreName(selectedStore)}
              />

            {isStudio ? (
              <CwButton
                type="button"
                variant="secondary"
                className="min-h-10 gap-2"
                onClick={exportInventoryAsImage}
              >
                <ArrowDownTrayIcon className="h-4 w-4 shrink-0 text-[var(--cw-text-muted)]" />
                匯出圖片
              </CwButton>
            ) : (
              <button
                type="button"
                onClick={exportInventoryAsImage}
                className="flex items-center gap-2 rounded-lg border border-blue-400/30 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 px-4 py-2 text-sm font-medium text-blue-400 transition-all duration-200 hover:border-blue-500/50 hover:from-blue-500/30 hover:to-cyan-500/30"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                匯出圖片
              </button>
            )}
          </div>
        </div>
        
                          {/* 出杯豆：relative z-10 確保在裝飾層之上，左側 數/袋/盒 可點擊 */}
        <div id="brewing-section" className="relative z-10 scroll-mt-56 space-y-4">
          <div
            id="brewing-title"
            className={
              isStudio
                ? 'mb-4 flex items-center gap-3 rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] px-4 py-3'
                : 'mb-4 flex items-center gap-3 rounded-xl border border-blue-400/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 shadow-lg backdrop-blur-md'
            }
          >
            <div
              className={
                isStudio
                  ? 'h-8 w-0.5 rounded-full bg-[var(--cw-text-muted)]'
                  : 'h-8 w-2 rounded-full bg-gradient-to-b from-blue-400 to-purple-400'
              }
            />
            <div>
              <h3 className={isStudio ? 'text-xl font-bold text-[var(--cw-text)]' : 'text-xl font-bold text-blue-400'}>出杯豆</h3>
              <p className={isStudio ? 'text-sm text-[var(--cw-text-muted)]' : 'text-sm text-blue-300/70'}>用於製作飲品的咖啡豆</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className={isStudio ? 'h-3 w-3 rounded-full bg-[var(--cw-text-muted)]' : 'h-3 w-3 rounded-full bg-blue-400'} />
              <span className={isStudio ? 'text-xs font-medium text-[var(--cw-text-muted)]' : 'text-xs font-medium text-blue-300'}>當前區域</span>
            </div>
          </div>
            
            {/* 手沖豆 */}
            <div className="space-y-3">
              <div
                id="pourOver-title"
                className={
                  isStudio
                    ? 'mb-3 flex items-center gap-3 rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-3 py-2'
                    : 'mb-3 flex items-center gap-3 rounded-lg border border-blue-400/10 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 p-3 shadow-md backdrop-blur-sm'
                }
              >
                <div className={isStudio ? 'h-2 w-2 rounded-full bg-[var(--cw-text-muted)]' : 'h-2 w-2 rounded-full bg-blue-400'} />
                <h4 className={isStudio ? 'text-md font-semibold text-[var(--cw-text)]' : 'text-md font-semibold text-blue-300'}>手沖豆</h4>
                <span className={isStudio ? 'text-xs text-[var(--cw-text-muted)]' : 'text-xs text-blue-300/60'}>手沖咖啡專用</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {beanTypes.brewing.pourOver.map(beanType => {
                const location = getBeanLocation(beanType, 'brewing', 'pourOver')
                const beanData = inventory.brewing.pourOver[beanType]
                return (
                  <div key={beanType} className={beanCellShell}>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className={isStudio ? cwBeanTitle : 'text-sm font-semibold text-primary'}>{beanType}</h5>
                      <div className={isStudio ? cwBeanDot : 'h-2 w-2 rounded-full bg-primary/60'} />
                    </div>
                    
                        {/* 店面庫存 */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                              店面庫存
                            </h6>
                            <button
                              onClick={() => addQuantityField('brewing', 'pourOver', beanType, 'store')}
                              className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors hover:scale-110 transform"
                            >
                              <PlusIcon className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-1.5">
                            {(beanData?.store || ['']).map((quantity, index) => {
                              const cellMode = getCellInputMode(beanType, 'brewing', 'pourOver', 'store', index)
                              return (
                                <QuantityRow
 key={index}
 emptyWeights={emptyWeights}
 value={quantity}
 mode={cellMode}
 onChange={(v) => updateQuantity('brewing', 'pourOver', beanType, 'store', index, v)}
 onModeChange={(mode) => setCellInputMode(beanType, 'brewing', 'pourOver', 'store', index, mode)}
 onRemove={(beanData?.store || []).length > 1 ? () => removeRowWithUndo('brewing', 'pourOver', beanType, 'store', index) : null}
 />
                              )
                            })}
                          </div>
                        </div>

                    {/* 員休室庫存 */}
                    {location.breakRoom && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                員休室庫存
                              </h6>
                              <button
                                onClick={() => addQuantityField('brewing', 'pourOver', beanType, 'breakRoom')}
                                className="p-1 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors"
                              >
                                <PlusIcon className="w-3 h-3" />
                              </button>
                            </div>
                            
                            <div className="space-y-1.5">
                              {(beanData?.breakRoom || ['']).map((quantity, index) => {
                                const cellMode = getCellInputMode(beanType, 'brewing', 'pourOver', 'breakRoom', index)
                                return (
                                  <QuantityRow
 key={index}
 emptyWeights={emptyWeights}
 value={quantity}
 mode={cellMode}
 onChange={(v) => updateQuantity('brewing', 'pourOver', beanType, 'breakRoom', index, v)}
 onModeChange={(mode) => setCellInputMode(beanType, 'brewing', 'pourOver', 'breakRoom', index, mode)}
 onRemove={(beanData?.breakRoom || []).length > 1 ? () => removeRowWithUndo('brewing', 'pourOver', beanType, 'breakRoom', index) : null}
 />
                                )
                              })}
                            </div>
                          </div>
                        )}

                    {/* 乾倉 */}
                    {location.dryStorage && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                            乾倉
                          </h6>
                          <button onClick={() => addQuantityField('brewing', 'pourOver', beanType, 'dryStorage')} className="p-1 rounded-lg hover:bg-orange-500/20 text-orange-400 transition-colors">
                            <PlusIcon className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {(beanData?.dryStorage || ['']).map((quantity, index) => {
                            const cellMode = getCellInputMode(beanType, 'brewing', 'pourOver', 'dryStorage', index)
                            return (
                              <QuantityRow
 key={index}
 emptyWeights={emptyWeights}
 value={quantity}
 mode={cellMode}
 onChange={(v) => updateQuantity('brewing', 'pourOver', beanType, 'dryStorage', index, v)}
 onModeChange={(mode) => setCellInputMode(beanType, 'brewing', 'pourOver', 'dryStorage', index, mode)}
 onRemove={(beanData?.dryStorage || []).length > 1 ? () => removeRowWithUndo('brewing', 'pourOver', beanType, 'dryStorage', index) : null}
 />
                            )
                          })}
                        </div>
                      </div>
                    )}
                        
                        <div className={isStudio ? `${cwBeanFooterShell} pt-2` : 'mt-3 rounded-lg border-t border-white/10 bg-gradient-to-r from-primary/10 to-transparent p-2 pt-2'}>
                          <span className={isStudio ? cwBeanFooterText : 'text-xs font-semibold text-primary'}>
                            {beanType}：總共 {Math.floor(calculateBeanTypeTotal(beanData, beanType, 'brewing', 'pourOver'))} 包
                          </span>
                        </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 義式豆 */}
          <div className="space-y-3">
            <div
              id="espresso-title"
              className={
                isStudio
                  ? 'mb-3 flex items-center gap-3 rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-3 py-2'
                  : 'mb-3 flex items-center gap-3 rounded-lg border border-purple-400/10 bg-gradient-to-r from-purple-500/5 to-pink-500/5 p-3 shadow-md backdrop-blur-sm'
              }
            >
              <div className={isStudio ? 'h-2 w-2 rounded-full bg-[var(--cw-text-muted)]' : 'h-2 w-2 rounded-full bg-purple-400'} />
              <h4 className={isStudio ? 'text-md font-semibold text-[var(--cw-text)]' : 'text-md font-semibold text-purple-300'}>義式豆</h4>
              <span className={isStudio ? 'text-xs text-[var(--cw-text-muted)]' : 'text-xs text-purple-300/60'}>義式咖啡專用</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {beanTypes.brewing.espresso.map(beanType => {
                const location = getBeanLocation(beanType, 'brewing', 'espresso')
                const beanData = inventory.brewing.espresso[beanType]
                return (
                  <div key={beanType} className={beanCellShell}>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className={isStudio ? cwBeanTitle : 'text-sm font-semibold text-primary'}>{beanType}</h5>
                      <div className={isStudio ? cwBeanDot : 'h-2 w-2 rounded-full bg-primary/60'} />
                    </div>
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                          店面庫存
                        </h6>
                        <button onClick={() => addQuantityField('brewing', 'espresso', beanType, 'store')} className="p-1 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors">
                          <PlusIcon className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {(beanData?.store || ['']).map((quantity, index) => {
                          const cellMode = getCellInputMode(beanType, 'brewing', 'espresso', 'store', index)
                          return (
                            <QuantityRow
 key={index}
 emptyWeights={emptyWeights}
 value={quantity}
 mode={cellMode}
 onChange={(v) => updateQuantity('brewing', 'espresso', beanType, 'store', index, v)}
 onModeChange={(mode) => setCellInputMode(beanType, 'brewing', 'espresso', 'store', index, mode)}
 onRemove={(beanData?.store || []).length > 1 ? () => removeRowWithUndo('brewing', 'espresso', beanType, 'store', index) : null}
 />
                          )
                        })}
                      </div>
                    </div>
                    {location.breakRoom && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                            員休室庫存
                          </h6>
                          <button onClick={() => addQuantityField('brewing', 'espresso', beanType, 'breakRoom')} className="p-1 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors">
                            <PlusIcon className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {(beanData?.breakRoom || ['']).map((quantity, index) => {
                            const cellMode = getCellInputMode(beanType, 'brewing', 'espresso', 'breakRoom', index)
                            return (
                              <QuantityRow
 key={index}
 emptyWeights={emptyWeights}
 value={quantity}
 mode={cellMode}
 onChange={(v) => updateQuantity('brewing', 'espresso', beanType, 'breakRoom', index, v)}
 onModeChange={(mode) => setCellInputMode(beanType, 'brewing', 'espresso', 'breakRoom', index, mode)}
 onRemove={(beanData?.breakRoom || []).length > 1 ? () => removeRowWithUndo('brewing', 'espresso', beanType, 'breakRoom', index) : null}
 />
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {location.dryStorage && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                            乾倉
                          </h6>
                          <button onClick={() => addQuantityField('brewing', 'espresso', beanType, 'dryStorage')} className="p-1 rounded-lg hover:bg-orange-500/20 text-orange-400 transition-colors">
                            <PlusIcon className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {(beanData?.dryStorage || ['']).map((quantity, index) => {
                            const cellMode = getCellInputMode(beanType, 'brewing', 'espresso', 'dryStorage', index)
                            return (
                              <QuantityRow
 key={index}
 emptyWeights={emptyWeights}
 value={quantity}
 mode={cellMode}
 onChange={(v) => updateQuantity('brewing', 'espresso', beanType, 'dryStorage', index, v)}
 onModeChange={(mode) => setCellInputMode(beanType, 'brewing', 'espresso', 'dryStorage', index, mode)}
 onRemove={(beanData?.dryStorage || []).length > 1 ? () => removeRowWithUndo('brewing', 'espresso', beanType, 'dryStorage', index) : null}
 />
                            )
                          })}
                        </div>
                      </div>
                    )}
                        <div className={isStudio ? `${cwBeanFooterShell} pt-2` : 'mt-3 rounded-lg border-t border-white/10 bg-gradient-to-r from-primary/10 to-transparent p-2 pt-2'}>
                          <span className={isStudio ? cwBeanFooterText : 'text-xs font-semibold text-primary'}>
                            {beanType}：總共 {Math.floor(calculateBeanTypeTotal(beanData, beanType, 'brewing', 'espresso'))} 包
                          </span>
                        </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 賣豆：relative z-10 確保在裝飾層之上，左側 數/袋/盒 可點擊 */}
        <div id="retail-section" className="relative z-10 mt-8 scroll-mt-56 space-y-4 pb-20">
          <div
            id="retail-title"
            className={
              isStudio
                ? 'mb-4 flex items-center gap-3 rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] px-4 py-3'
                : 'mb-4 flex items-center gap-3 rounded-xl border border-orange-400/20 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 p-4 shadow-lg backdrop-blur-md'
            }
          >
            <div
              className={
                isStudio
                  ? 'h-8 w-0.5 rounded-full bg-[var(--cw-text-muted)]'
                  : 'h-8 w-2 rounded-full bg-gradient-to-b from-orange-400 to-yellow-400'
              }
            />
            <div>
              <h3 className={isStudio ? 'text-xl font-bold text-[var(--cw-text)]' : 'text-xl font-bold text-orange-400'}>賣豆</h3>
              <p className={isStudio ? 'text-sm text-[var(--cw-text-muted)]' : 'text-sm text-orange-300/70'}>用於販售的咖啡豆</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className={isStudio ? 'h-3 w-3 rounded-full bg-[var(--cw-text-muted)]' : 'h-3 w-3 rounded-full bg-orange-400'} />
              <span className={isStudio ? 'text-xs font-medium text-[var(--cw-text-muted)]' : 'text-xs font-medium text-orange-300'}>當前區域</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {beanTypes.retail.map(beanType => {
              const location = getBeanLocation(beanType, 'retail')
              const beanData = inventory.retail[beanType]
              return (
                <div key={beanType} className={beanCellShell}>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className={isStudio ? cwBeanTitle : 'text-sm font-semibold text-primary'}>{beanType}</h5>
                    <div className={isStudio ? cwBeanDot : 'h-2 w-2 rounded-full bg-primary/60'} />
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                        店面庫存
                      </h6>
                      <button onClick={() => addRetailQuantityField(beanType, 'store')} className="p-1 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors">
                        <PlusIcon className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {(beanData?.store || ['']).map((quantity, index) => {
                        const cellMode = getCellInputMode(beanType, 'retail', null, 'store', index)
                        return (
                          <QuantityRow
 key={index}
 emptyWeights={emptyWeights}
 value={quantity}
 mode={cellMode}
 onChange={(v) => updateRetailQuantity(beanType, 'store', index, v)}
 onModeChange={(mode) => setCellInputMode(beanType, 'retail', null, 'store', index, mode)}
 onRemove={(beanData?.store || []).length > 1 ? () => removeRowWithUndo('retail', null, beanType, 'store', index) : null}
 />
                        )
                      })}
                    </div>
                  </div>

                  {/* 員休室庫存 */}
                  {location.breakRoom && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                              員休室庫存
                            </h6>
                            <button onClick={() => addRetailQuantityField(beanType, 'breakRoom')} className="p-1 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors">
                              <PlusIcon className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {(beanData?.breakRoom || ['']).map((quantity, index) => {
                              const cellMode = getCellInputMode(beanType, 'retail', null, 'breakRoom', index)
                              return (
                                <QuantityRow
 key={index}
 emptyWeights={emptyWeights}
 value={quantity}
 mode={cellMode}
 onChange={(v) => updateRetailQuantity(beanType, 'breakRoom', index, v)}
 onModeChange={(mode) => setCellInputMode(beanType, 'retail', null, 'breakRoom', index, mode)}
 onRemove={(beanData?.breakRoom || []).length > 1 ? () => removeRowWithUndo('retail', null, beanType, 'breakRoom', index) : null}
 />
                              )
                            })}
                          </div>
                        </div>
                  )}

                  {/* 乾倉 */}
                  {location.dryStorage && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                          乾倉
                        </h6>
                        <button onClick={() => addRetailQuantityField(beanType, 'dryStorage')} className="p-1 rounded-lg hover:bg-orange-500/20 text-orange-400 transition-colors">
                          <PlusIcon className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {(beanData?.dryStorage || ['']).map((quantity, index) => {
                          const cellMode = getCellInputMode(beanType, 'retail', null, 'dryStorage', index)
                          return (
                            <QuantityRow
 key={index}
 emptyWeights={emptyWeights}
 value={quantity}
 mode={cellMode}
 onChange={(v) => updateRetailQuantity(beanType, 'dryStorage', index, v)}
 onModeChange={(mode) => setCellInputMode(beanType, 'retail', null, 'dryStorage', index, mode)}
 onRemove={(beanData?.dryStorage || []).length > 1 ? () => removeRowWithUndo('retail', null, beanType, 'dryStorage', index) : null}
 />
                          )
                        })}
                      </div>
                    </div>
                  )}
                      
                      <div className={isStudio ? `${cwBeanFooterShell} pt-2` : 'mt-3 rounded-lg border-t border-white/10 bg-gradient-to-r from-primary/10 to-transparent p-2 pt-2'}>
                        <span className={isStudio ? cwBeanFooterText : 'text-xs font-semibold text-primary'}>
                          {beanType}：總共 {Math.floor(calculateBeanTypeTotal(beanData, beanType, 'retail', null))} 包
                        </span>
                      </div>
                </div>
              )
            })}
          </div>
        </div>
        </div>
      </div>

      {/* 出杯豆／賣豆 切換：固定在底部中間。以前浮在右上、可拖動，常蓋住清單右上角（豆名那一列），
          拖到哪裡都會擋到東西；底部中間跟右下的計算機同高、不重疊，拇指也最好按 */}
      {removedRow ? (
        <div
          key={removedRow.at}
          role="status"
          className="fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+3.5rem)] left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 whitespace-nowrap rounded-full bg-[var(--cw-text)] py-2 pl-4 pr-2 text-sm text-[var(--cw-bg)] shadow-[var(--cw-shadow-sm)] animate-fade-in md:bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+3.5rem)]"
        >
          已刪除 {removedRow.beanType} 的一列
          <button
            type="button"
            onClick={restoreRemovedRow}
            className="!min-h-0 rounded-full px-3 py-1 font-semibold text-[var(--cw-bg)] underline-offset-2 hover:underline"
          >
            復原
          </button>
        </div>
      ) : null}

      <nav
        aria-label="跳到區域"
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex h-11 -translate-x-1/2 items-center gap-0.5 rounded-full border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)]/95 p-1 shadow-[var(--cw-shadow-sm)] backdrop-blur md:bottom-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
          <button
            type="button"
            onClick={() => document.getElementById('brewing-section')?.scrollIntoView({ behavior: 'smooth' })}
            aria-current={currentSection === 'brewing' ? 'true' : undefined}
            className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${
              currentSection === 'brewing'
                ? 'bg-[var(--cw-text)] text-[var(--cw-bg)]'
                : 'text-[var(--cw-text-muted)] hover:text-[var(--cw-text)]'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            出杯豆
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('retail-section')?.scrollIntoView({ behavior: 'smooth' })}
            aria-current={currentSection === 'retail' ? 'true' : undefined}
            className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${
              currentSection === 'retail'
                ? 'bg-[var(--cw-text)] text-[var(--cw-bg)]'
                : 'text-[var(--cw-text-muted)] hover:text-[var(--cw-text)]'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            賣豆
          </button>
      </nav>

      {/* Classic 浮動重量換算捷徑 */}
      {!isStudio ? (
        <button
          type="button"
          onClick={openWeightCalculator}
          className="fixed bottom-6 right-6 z-50 transform rounded-full border border-primary/30 bg-gradient-to-r from-primary/20 to-purple-500/20 p-4 text-primary shadow-lg transition-all duration-200 hover:scale-110 hover:border-primary/50 hover:from-primary/30 hover:to-purple-500/30 hover:shadow-xl"
          style={{ minWidth: '56px', minHeight: '56px' }}
          aria-label="開啟重量換算"
        >
          <CalculatorIcon className="h-6 w-6" />
        </button>
      ) : null}

      {/* Club 重量換算捷徑：白底珊瑚圖示；彈窗開啟時隱藏；手機／iPad／電腦尺寸不同 */}
      {isClub && !showWeightCalculator ? (
        <button
          type="button"
          onClick={openWeightCalculator}
          className="fixed z-50 inline-flex items-center justify-center rounded-full border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] text-[var(--cw-brand)] shadow-[var(--cw-shadow-sm)] transition-[transform,box-shadow,border-color] hover:border-[var(--cw-brand)]/35 hover:shadow-md active:scale-95 h-11 w-11 right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] md:h-12 md:w-12 md:right-5 md:bottom-[max(1.25rem,env(safe-area-inset-bottom))] lg:h-11 lg:w-11 lg:right-6 lg:bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
          aria-label="開啟重量換算"
          title="重量換算"
        >
          <CalculatorIcon className="h-5 w-5 md:h-6 md:w-6 lg:h-5 lg:w-5" />
        </button>
      ) : null}

      {/* Club 重量換算彈窗（計算優先） */}
      {showWeightCalculator && isClub ? (
        <ClubWeightCalculatorModal
          selectedWeightStore={selectedWeightStore}
          setSelectedWeightStore={setSelectedWeightStore}
          weightMode={weightMode}
          setWeightMode={setWeightMode}
          weightSettings={weightSettings}
          tempInputValues={tempInputValues}
          updateWeightSetting={updateWeightSetting}
          resetWeightSettings={resetWeightSettings}
          calculations={calculations}
          updateCalculation={updateCalculation}
          addCalculation={addCalculation}
          removeCalculation={removeCalculation}
          resetCalculations={resetCalculations}
          onClose={() => setShowWeightCalculator(false)}
        />
      ) : null}

      {/* Classic／Studio 重量換算計算器彈窗 */}
      {showWeightCalculator && !isClub && (
        <div
          className={
            isStudio
              ? 'fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/70 touch-manipulation'
              : 'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm touch-manipulation'
          }
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowWeightCalculator(false)
          }}
        >
          <div
            className={`flex min-h-[100dvh] w-full items-center justify-center px-4 py-10 sm:py-14 ${isStudio ? 'cw-pb-safe pt-[max(2.75rem,calc(env(safe-area-inset-top)+1.25rem))] pb-[max(2rem,env(safe-area-inset-bottom)+1rem)]' : 'pt-[max(2rem,calc(env(safe-area-inset-top)+0.75rem))] pb-10'}`}
          >
            <div
              className={
                isStudio
                  ? 'w-full max-w-3xl max-h-[min(92dvh,900px)] overflow-y-auto rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] p-6 shadow-2xl [-webkit-overflow-scrolling:touch]'
                  : 'max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/20 bg-surface/95 p-6 shadow-2xl backdrop-blur-md'
              }
              onClick={(e) => e.stopPropagation()}
            >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className={`mb-1 text-xl font-bold ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`}>重量換算計算器</h2>
                <p className={`text-sm ${isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}`}>估算豆包數量</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {isStudio ? (
                  <>
                    <CwButton type="button" variant="secondary" className="!min-h-9 !gap-1 !px-3 !py-1.5 !text-xs" onClick={resetWeightSettings}>
                      <span className="h-3 w-3 shrink-0 rounded-full bg-[var(--cw-text-muted)]" />
                      回復設定
                    </CwButton>
                    <CwButton type="button" variant="ghost" className="!min-h-9 !p-2" onClick={() => setShowWeightCalculator(false)} aria-label="關閉">
                      <XMarkIcon className="h-5 w-5" />
                    </CwButton>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={resetWeightSettings}
                      className="flex items-center gap-1 rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-400 transition-all duration-200 hover:border-amber-500/50 hover:bg-amber-500/10"
                    >
                      <span className="h-3 w-3 rounded-full bg-amber-400" />
                      回復設定
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWeightCalculator(false)}
                      className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-500/20"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 店鋪選擇 */}
            <div className="mb-6">
              <div className="mb-4 flex items-center justify-center gap-2">
                <div
                  className={
                    isStudio
                      ? 'rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] p-1.5'
                      : 'rounded-lg border border-primary/20 bg-primary/10 p-1.5'
                  }
                >
                  <BuildingStorefrontIcon className={`h-4 w-4 ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`} />
                </div>
                <h3 className={`text-base font-bold ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`}>選擇分店</h3>
              </div>

              {isStudio ? (
                <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
                  {STORES.map((store) => (
                    <CwButton
                      key={store.id}
                      type="button"
                      variant={selectedWeightStore === store.id ? 'primary' : 'secondary'}
                      className="min-h-11 min-w-[5.5rem]"
                      onClick={() => setSelectedWeightStore(store.id)}
                    >
                      {store.name}
                    </CwButton>
                  ))}
                </div>
              ) : (
                <div className="relative mx-auto max-w-2xl rounded-xl border border-white/10 bg-surface/60 p-1">
                  <div
                    className="absolute bottom-1.5 left-1 top-1.5 rounded-xl bg-gradient-to-r from-primary via-purple-500 to-blue-500 transition-[transform] duration-200 ease-out"
                    style={{
                      width: 'calc(33.333% - 4px)',
                      left: '4px',
                      transform:
                        selectedWeightStore === 'central'
                          ? 'translateX(0%)'
                          : selectedWeightStore === 'd7'
                            ? 'translateX(100%)'
                            : 'translateX(200%)',
                    }}
                  />
                  <div className="relative grid grid-cols-3 gap-1.5">
                    {STORES.map((store) => {
                      const isSelected = selectedWeightStore === store.id
                      return (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => setSelectedWeightStore(store.id)}
                          className={`
                          relative z-10 min-h-[44px]
                          rounded-lg px-3 py-3 text-xs font-bold transition-colors duration-200
                          sm:px-4 sm:py-4 sm:text-sm
                          ${isSelected ? 'text-white' : 'text-gray-300 active:text-white'}
                        `}
                          style={{
                            WebkitTapHighlightColor: 'transparent',
                            touchAction: 'manipulation',
                          }}
                        >
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            {isSelected ? <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-green-400 shadow-sm" /> : null}
                            <span className="tracking-wide">{store.name}</span>
                          </span>
                          {isSelected ? <span className="absolute inset-0 rounded-xl bg-primary/10 opacity-100" /> : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* 模式切換 */}
            <div className="mb-6">
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={
                    isStudio
                      ? 'h-6 w-1 rounded-full bg-[var(--cw-border-strong)]'
                      : 'h-6 w-1 rounded-full bg-gradient-to-b from-amber-400 to-orange-400'
                  }
                />
                <h3 className={`text-lg font-bold ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`}>計算模式</h3>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <label
                  className={
                    isStudio
                      ? `flex cursor-pointer items-center gap-3 rounded-[var(--cw-radius)] border p-3 transition-colors ${
                          weightMode === 'bag'
                            ? 'border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)]'
                            : 'border-[var(--cw-border)] bg-[var(--cw-bg)] hover:border-[var(--cw-border-strong)]'
                        }`
                      : 'flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-surface/40 to-surface/20 p-3 transition-all duration-200 hover:border-amber-400/30'
                  }
                >
                  <input
                    type="radio"
                    value="bag"
                    checked={weightMode === 'bag'}
                    onChange={(e) => setWeightMode(e.target.value)}
                    className={isStudio ? 'h-4 w-4 accent-zinc-400' : 'h-4 w-4 text-amber-400'}
                  />
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${isStudio ? 'bg-[var(--cw-text-muted)]' : 'bg-amber-400'}`} />
                    <span className={`font-medium ${isStudio ? 'text-[var(--cw-text)]' : ''}`}>銀袋</span>
                  </div>
                </label>
                <label
                  className={
                    isStudio
                      ? `flex cursor-pointer items-center gap-3 rounded-[var(--cw-radius)] border p-3 transition-colors ${
                          weightMode === 'ikea'
                            ? 'border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)]'
                            : 'border-[var(--cw-border)] bg-[var(--cw-bg)] hover:border-[var(--cw-border-strong)]'
                        }`
                      : 'flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-surface/40 to-surface/20 p-3 transition-all duration-200 hover:border-amber-400/30'
                  }
                >
                  <input
                    type="radio"
                    value="ikea"
                    checked={weightMode === 'ikea'}
                    onChange={(e) => setWeightMode(e.target.value)}
                    className={isStudio ? 'h-4 w-4 accent-zinc-400' : 'h-4 w-4 text-amber-400'}
                  />
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${isStudio ? 'bg-[var(--cw-text-muted)]' : 'bg-amber-400'}`} />
                    <span className={`font-medium ${isStudio ? 'text-[var(--cw-text)]' : ''}`}>
                      {getBoxWeightKey(selectedWeightStore) === 'mujiBoxWeight' ? 'MUJI 盒子' : 'IKEA 盒子'}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* 重量設定 */}
            <div className="mb-6 space-y-4">
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={
                    isStudio
                      ? 'h-6 w-1 rounded-full bg-[var(--cw-text-muted)]'
                      : 'h-6 w-1 rounded-full bg-gradient-to-b from-blue-400 to-purple-400'
                  }
                />
                <h3 className={`text-lg font-bold ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`}>重量設定</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {isStudio ? (
                  <>
                    <div className={weightFieldShell}>
                      <CwInput
                        label={`${
                          weightMode === 'bag'
                            ? '銀袋重量'
                            : getBoxWeightKey(selectedWeightStore) === 'mujiBoxWeight'
                              ? 'MUJI 盒重量'
                              : 'IKEA 盒重量'
                        } (g)`}
                        type="number"
                        value={(() => {
                          const key = weightMode === 'bag' ? 'bagWeight' : getBoxWeightKey(selectedWeightStore)
                          return tempInputValues[key] !== undefined
                            ? tempInputValues[key]
                            : weightMode === 'bag'
                              ? weightSettings.bagWeight
                              : weightSettings[getBoxWeightKey(selectedWeightStore)] ?? weightSettings.ikeaBoxWeight
                        })()}
                        onChange={(e) =>
                          updateWeightSetting(
                            weightMode === 'bag' ? 'bagWeight' : getBoxWeightKey(selectedWeightStore),
                            e.target.value,
                            false
                          )
                        }
                        onBlur={(e) =>
                          updateWeightSetting(
                            weightMode === 'bag' ? 'bagWeight' : getBoxWeightKey(selectedWeightStore),
                            e.target.value,
                            true
                          )
                        }
                        placeholder="輸入重量"
                        inputMode="decimal"
                        className="!mb-0"
                      />
                    </div>
                    <div className={weightFieldShell}>
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
                        className="!mb-0"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-surface/40 to-surface/20 p-4">
                      <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        {`${
                          weightMode === 'bag'
                            ? '銀袋重量'
                            : getBoxWeightKey(selectedWeightStore) === 'mujiBoxWeight'
                              ? 'MUJI 盒重量'
                              : 'IKEA 盒重量'
                        } (g)`}
                      </span>
                      <input
                        type="number"
                        value={(() => {
                          const key = weightMode === 'bag' ? 'bagWeight' : getBoxWeightKey(selectedWeightStore)
                          return tempInputValues[key] !== undefined
                            ? tempInputValues[key]
                            : weightMode === 'bag'
                              ? weightSettings.bagWeight
                              : weightSettings[getBoxWeightKey(selectedWeightStore)] ?? weightSettings.ikeaBoxWeight
                        })()}
                        onChange={(e) =>
                          updateWeightSetting(
                            weightMode === 'bag' ? 'bagWeight' : getBoxWeightKey(selectedWeightStore),
                            e.target.value,
                            false
                          )
                        }
                        onBlur={(e) =>
                          updateWeightSetting(
                            weightMode === 'bag' ? 'bagWeight' : getBoxWeightKey(selectedWeightStore),
                            e.target.value,
                            true
                          )
                        }
                        className="input-field w-full rounded-lg border-white/10 bg-white/5 px-4 py-3 text-sm transition-all focus:border-blue-400/50 focus:bg-white/10"
                        placeholder="輸入重量"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-surface/40 to-surface/20 p-4">
                      <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                        每包豆子重量 (g)
                      </span>
                      <input
                        type="number"
                        value={
                          tempInputValues.beanWeightPerPack !== undefined
                            ? tempInputValues.beanWeightPerPack
                            : weightSettings.beanWeightPerPack
                        }
                        onChange={(e) => updateWeightSetting('beanWeightPerPack', e.target.value, false)}
                        onBlur={(e) => updateWeightSetting('beanWeightPerPack', e.target.value, true)}
                        className="input-field w-full rounded-lg border-white/10 bg-white/5 px-3 py-2.5 text-sm focus:border-green-400/50 focus:bg-white/10"
                        placeholder="輸入重量"
                        inputMode="decimal"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end">
                {isStudio ? (
                  <CwButton type="button" variant="primary" onClick={addCalculation}>
                    <PlusIcon className="h-4 w-4" />
                    新增計算欄位
                  </CwButton>
                ) : (
                  <button
                    type="button"
                    onClick={addCalculation}
                    className="flex items-center gap-2 rounded-lg border border-primary/30 bg-gradient-to-r from-primary/20 to-purple-500/20 px-4 py-2.5 text-sm font-medium text-primary transition-all duration-200 hover:border-primary/50 hover:from-primary/30 hover:to-purple-500/30"
                  >
                    <PlusIcon className="h-4 w-4" />
                    新增計算欄位
                  </button>
                )}
              </div>
            </div>

            {/* 計算欄位 */}
            <div className="space-y-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={
                      isStudio
                        ? 'h-6 w-1 rounded-full bg-[var(--cw-border-strong)]'
                        : 'h-6 w-1 rounded-full bg-gradient-to-b from-green-400 to-emerald-400'
                    }
                  />
                  <h3 className={`text-lg font-bold ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`}>計算結果</h3>
                </div>
                {isStudio ? (
                  <CwButton
                    type="button"
                    variant="secondary"
                    className="!min-h-9 w-full !gap-2 !px-3 !py-1.5 !text-xs sm:w-auto"
                    title="重置所有計算結果"
                    onClick={resetCalculations}
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    重置結果
                  </CwButton>
                ) : (
                  <button
                    type="button"
                    onClick={resetCalculations}
                    className="flex w-full items-center gap-2 rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-400 transition-all duration-200 hover:border-amber-500/50 hover:bg-amber-500/10 sm:w-auto"
                    title="重置所有計算結果"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    重置結果
                  </button>
                )}
              </div>

              {calculations.map((calc) => (
                <div key={calc.id} className={calcCellShell}>
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <h5 className={`font-semibold ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`}>計算欄位 #{calc.id}</h5>
                      <span className={`h-2 w-2 rounded-full ${isStudio ? 'bg-[var(--cw-text-muted)]/70' : 'bg-primary/60'}`} />
                    </div>
                    {calculations.length > 1 &&
                      (isStudio ? (
                        <CwButton type="button" variant="ghost" className="!min-h-9 !p-1.5" onClick={() => removeCalculation(calc.id)} aria-label="刪除此計算欄位">
                          <TrashIcon className="h-4 w-4 text-red-500/90" />
                        </CwButton>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeCalculation(calc.id)}
                          className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-500/20"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {isStudio ? (
                      <>
                        <div className={weightFieldShellSm}>
                          <CwInput
                            label="總重量 (g，含袋/盒)"
                            type="number"
                            value={calc.totalWeight}
                            onChange={(e) => updateCalculation(calc.id, e.target.value)}
                            placeholder="秤上總重"
                            inputMode="decimal"
                            className="!mb-0"
                          />
                        </div>
                        <div className={weightFieldShellSm}>
                          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">估算包數</span>
                          <div className="flex min-h-11 w-full items-center justify-center rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] px-3 py-2.5 text-center text-sm font-bold text-[var(--cw-text)]">
                            {calc.estimatedPacks} 包
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-surface/40 to-surface/20 p-3">
                          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-secondary">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                            總重量 (g，含袋/盒)
                          </span>
                          <input
                            type="number"
                            value={calc.totalWeight}
                            onChange={(e) => updateCalculation(calc.id, e.target.value)}
                            placeholder="秤上總重"
                            className="input-field w-full rounded-lg border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-blue-400/50 focus:bg-white/10"
                            inputMode="decimal"
                          />
                        </div>
                        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-surface/40 to-surface/20 p-3">
                          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-secondary">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                            估算包數
                          </span>
                          <div className="w-full rounded-lg border border-green-400/30 bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 py-3 text-center text-sm font-bold text-green-400 transition-all hover:border-green-500/50">
                            {calc.estimatedPacks} 包
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {calculations.length > 1 &&
                (isStudio ? (
                  <div className="mt-6 rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] p-6">
                    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                      <div className="flex items-center gap-4">
                        <div className="rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-mega-surface)] p-3">
                          <CalculatorIcon className="h-6 w-6 text-[var(--cw-text)]" />
                        </div>
                        <div>
                          <h4 className="mb-1 text-sm font-medium text-[var(--cw-text-muted)]">總計估算包數</h4>
                          <p className="text-xs text-[var(--cw-text-muted)]">所有計算欄位的加總</p>
                        </div>
                      </div>
                      <div className="text-center sm:text-right">
                        <div className="mb-1 text-2xl font-extrabold text-[var(--cw-text)] sm:text-3xl">
                          {calculations.reduce((sum, c) => sum + (c.estimatedPacks || 0), 0).toFixed(1)}
                        </div>
                        <div className="text-base font-bold text-[var(--cw-text)]">包</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative mt-6">
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-green-500/30 via-emerald-500/30 to-green-400/30 opacity-50 blur-xl transition-opacity duration-500 group-hover:opacity-75" />
                    <div className="relative overflow-hidden rounded-2xl border-2 border-green-400/40 bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-green-400/20 p-6 shadow-2xl backdrop-blur-xl">
                      <div className="absolute inset-0 bg-[length:200%_100%] bg-gradient-to-r from-green-500/0 via-emerald-500/10 to-green-400/0 opacity-50" />
                      <div className="relative z-10 flex flex-col items-center justify-between gap-4 sm:flex-row">
                        <div className="flex items-center gap-4">
                          <div className="rounded-xl border border-green-400/50 bg-gradient-to-br from-green-400/30 to-emerald-400/30 p-3 shadow-lg">
                            <CalculatorIcon className="h-6 w-6 text-green-400" />
                          </div>
                          <div>
                            <h4 className="mb-1 text-sm font-medium text-text-secondary">總計估算包數</h4>
                            <p className="text-xs text-text-secondary/70">所有計算欄位的加總</p>
                          </div>
                        </div>
                        <div className="text-center sm:text-right">
                          <div className="mb-1 bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
                            {calculations.reduce((sum, c) => sum + (c.estimatedPacks || 0), 0).toFixed(1)}
                          </div>
                          <div className="text-base font-bold text-green-400">包</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* 品項設定模態視窗 */}
      <BeanTypesSettingsModal
        isOpen={showBeanTypesSettings}
        onClose={() => setShowBeanTypesSettings(false)}
        selectedStore={selectedStore}
        onRenameBeans={renameBeansInInventory}
      />

      {/* 使用教學模態視窗 */}
      {showTutorial && (
        <div
          className={
            isStudio
              ? 'fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4'
              : 'fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md'
          }
          onClick={() => setShowTutorial(false)}
        >
          <div
            className={
              isStudio
                ? 'flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] shadow-2xl'
                : 'flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-surface shadow-2xl'
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={
                isStudio
                  ? 'flex items-center justify-between border-b border-[var(--cw-border-strong)] px-6 pb-4 pt-6'
                  : 'flex items-center justify-between border-b border-white/10 px-6 pb-4 pt-6'
              }
            >
              <h3 className={isStudio ? 'text-lg font-bold text-[var(--cw-text)]' : 'text-lg font-bold text-primary'}>使用教學</h3>
              <button
                type="button"
                onClick={() => setShowTutorial(false)}
                className={
                  isStudio
                    ? 'rounded-[var(--cw-radius)] p-2 text-[var(--cw-text-muted)] transition-colors hover:bg-[var(--cw-bg)] hover:text-[var(--cw-text)]'
                    : 'rounded-xl p-2 text-text-secondary transition-colors hover:bg-white/10 hover:text-primary'
                }
                aria-label="關閉"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div
              className={
                isStudio
                  ? 'flex-1 space-y-4 overflow-y-auto px-6 py-4 text-sm text-[var(--cw-text)]'
                  : 'flex-1 space-y-4 overflow-y-auto px-6 py-4 text-sm text-primary'
              }
            >
              <section>
                <h4 className="font-semibold text-primary mb-2">填寫方式（每格右側 數／袋／盒）</h4>
                <ul className="list-disc list-inside space-y-1 text-text-secondary">
                  <li><strong className="text-primary">數</strong>：直接輸入「包數」</li>
                  <li><strong className="text-primary">袋</strong>：輸入「秤上總重(g)」含銀袋，系統會扣掉銀袋重後換算成包數</li>
                  <li><strong className="text-primary">盒</strong>：輸入「秤上總重(g)」含 IKEA／MUJI 盒，系統會扣掉盒重後換算成包數</li>
                </ul>
              </section>
              <section>
                <h4 className="font-semibold text-primary mb-2">換算公式</h4>
                <p className="text-text-secondary">包數 = (總重量 − 容器重) ÷ 每包克數</p>
                <p className="text-text-secondary mt-1 text-xs">同一品項可混用不同填寫方式，總包數會自動加總並無條件捨去小數。</p>
              </section>
              <section>
                <h4 className="font-semibold text-primary mb-2">店鋪與重量設定</h4>
                <p className="text-text-secondary">上方可切換中央店／D7／D13，盤點表與「重量換算」會依該店鋪的銀袋重、盒重、每包克數計算。請在「重量換算」內設定各店參數。</p>
              </section>
              <section>
                <h4 className="font-semibold text-primary mb-2">匯出</h4>
                <p className="text-text-secondary">點工具列圓形 Logo 開啟設定，可選預設樣式或上傳自定 Logo，再匯出為 PNG，或複製表格用於報表。</p>
              </section>
            </div>
            <div
              className={
                isStudio
                  ? 'border-t border-[var(--cw-border-strong)] px-6 pb-6 pt-2'
                  : 'border-t border-white/10 px-6 pb-6 pt-2'
              }
            >
              <button
                type="button"
                onClick={() => setShowTutorial(false)}
                className={
                  isStudio
                    ? 'w-full rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] py-2.5 font-medium text-[var(--cw-text)] transition-colors hover:bg-[var(--cw-mega-surface)]'
                    : 'w-full rounded-xl border border-primary/40 bg-primary/25 py-2.5 font-medium text-primary transition-colors hover:bg-primary/35'
                }
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
  )

  return (
    <DualThemePage
      breadcrumbs={COFFEE_BC}
      title="咖啡豆管理工具"
      description="所以又到星期天"
      studio={coffeeInner}
    />
  )
}

export default CoffeeBeanManager
