import { Fragment } from 'react'
import { PaperAirplaneIcon, ArrowPathIcon, XMarkIcon, ArrowDownTrayIcon, ClockIcon, DocumentTextIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { CwButton, CwDateInput, tryOpenDatePicker } from '../studio/ui'
import { formatMinAsHHMM } from '../../utils/flightData/flightTime'
import { flightRowKey } from '../../utils/flightData/gates'
import { FLIGHT_STORE_ORDER, FLIGHT_STORES } from '../../utils/flightData/stores'
import FlightRow, { FLIGHT_ROW_GRID, FLIGHT_ROW_GRID_WITH_SUPPORT } from './flight/FlightRow'
import InfoTipIcon from './flight/InfoTipIcon'
import StressCurvePanel from './flight/StressCurvePanel'
import BusyIndexStrip from './flight/BusyIndexStrip'
import { useFlightData } from './useFlightData'
import { FlightDialogs } from './FlightDialogs'
import { FlightStatsTab } from './FlightStatsTab'

function FlightDataContent() {
  const m = useFlightData()
  const {
    isStudio,
    isClub,
    selectedDate,
    setSelectedDate,
    storeKey,
    store,
    selectStore,
    status,
    loading,
    loadingProgress,
    viewMode,
    setViewMode,
    activeTab,
    setActiveTab,
    lastUpdated,
    autoRefresh,
    setAutoRefresh,
    timeFilter,
    setTimeFilter,
    gateFilter,
    setGateFilter,
    setSelectedFlight,
    dataValidation,
    dataDiff,
    showStatusPanel,
    setShowStatusPanel,
    setStressSlotsHelp,
    stressShift,
    setStressShift,
    gateStressWeights,
    setGateStressWeightsModalOpen,
    setDraftGateStressWeights,
    setGateStressSaveState,
    flightData,
    paxDaily,
    storeShifts,
    formatLastUpdated,
    loadFlightData,
    handleLoadData,
    handleLoadToday,
    handleLoadYesterday,
    handleCancelLoad,
    statistics,
    nightSupportPlan,
    nightShiftCfgMerged,
    nightSupportLastRowKeys,
    summaryCards,
    stressSeriesToday,
    stressSummaryToday,
    isUpcomingFlight,
    nowMinutes,
    filteredFlights,
    SkeletonScreen,
    FlightItem,
    gatesInDay,
    nowRowIndex,
    nowRowRef,
    handleExportPNG,
    handleExportStatistics,
    hasStatusPanelContent,
  } = m

  return (
    <div className="space-y-6">
      {isStudio ? (
        lastUpdated ? (
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--cw-border)] pb-4 pt-2 sm:pt-0">
            <span className="inline-flex items-center gap-2 rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-3 py-2 text-sm text-[var(--cw-text-muted)]">
              <ClockIcon className="h-4 w-4 shrink-0 text-[var(--cw-text-muted)]" aria-hidden />
              最後更新：{formatLastUpdated(lastUpdated)}
            </span>
          </div>
        ) : null
      ) : (
        <div className="relative mb-6 text-center sm:mb-8 md:mb-10 pt-16 sm:pt-2 md:pt-0">
          <div className="absolute inset-0 -z-10 flex justify-center">
            <div className="h-64 w-64 animate-pulse-glow rounded-full bg-primary/10 opacity-50 blur-3xl sm:h-80 sm:w-80 md:h-96 md:w-96" />
          </div>
          <div className="title-icon-group group relative mb-4 inline-flex items-center justify-center sm:mb-5 md:mb-6">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-blue-500 opacity-50 blur-xl transition-opacity duration-500 group-hover:opacity-75" />
            <div className="relative inline-flex h-16 w-16 transform items-center justify-center overflow-hidden rounded-xl border-2 border-primary/50 bg-gradient-to-br from-primary/30 via-purple-500/30 to-blue-500/30 shadow-2xl shadow-primary/30 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 sm:h-18 sm:w-18 md:h-20 md:w-20 sm:rounded-2xl">
              <div className="absolute inset-0 animate-gradient bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 bg-[length:200%_100%] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <PaperAirplaneIcon className="relative z-10 h-8 w-8 transform text-primary transition-transform duration-300 group-hover:scale-110 sm:h-9 sm:w-9 md:h-10 md:w-10" />
            </div>
          </div>
          <h1 className="relative mb-2 px-4 text-3xl font-extrabold sm:mb-3 sm:text-4xl md:text-5xl">
            <span className="animate-gradient bg-gradient-to-r from-primary via-purple-400 via-blue-400 to-primary bg-[length:200%_100%] bg-clip-text text-transparent">
              桃園機場 {store.rangeLabel} 航班資料
            </span>
            <span className="absolute inset-0 -z-10 animate-pulse-glow bg-gradient-to-r from-primary via-purple-400 via-blue-400 to-primary bg-clip-text text-transparent opacity-30 blur-xl">
              桃園機場 {store.rangeLabel} 航班資料
            </span>
          </h1>
          {lastUpdated && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 px-4 text-sm text-text-secondary">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface/40 px-3 py-1.5 backdrop-blur-sm">
                <ClockIcon className="h-4 w-4 text-primary/60" />
                <span>最後更新：{formatLastUpdated(lastUpdated)}</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* 控制區 */}
      <div
        className={
          isStudio
            ? 'rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-surface)] p-4 shadow-sm sm:p-6'
            : 'rounded-2xl border border-white/10 bg-surface/35 p-4 shadow-md backdrop-blur-md sm:p-6'
        }
      >
        {/* 門市：只換登機門範圍與權重，資料共用一份，切換不重新抓 */}
        <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
          <span
            className={`text-xs font-medium ${
              isStudio ? 'text-[var(--cw-text-muted)]' : isClub ? 'text-[#76564b]' : 'text-text-secondary'
            }`}
          >
            門市
          </span>
          <div
            role="group"
            aria-label="選擇門市"
            className={`inline-flex gap-0.5 rounded-lg p-0.5 ${
              isStudio
                ? 'border border-[var(--cw-border)] bg-[var(--cw-bg)]'
                : isClub
                  ? 'border border-[#d9b9ad] bg-[#f8eeea]'
                  : 'border border-white/15 bg-white/5'
            }`}
          >
            {FLIGHT_STORE_ORDER.map((k) => {
              const s = FLIGHT_STORES[k]
              const active = k === storeKey
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectStore(k)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? isStudio
                        ? 'bg-[var(--cw-surface-elevated)] text-[var(--cw-text)] shadow-sm'
                        : isClub
                          ? 'bg-[#76564b] text-white shadow-sm'
                          : 'bg-white/15 text-primary shadow-sm'
                      : isStudio
                        ? 'text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)]'
                        : isClub
                          ? 'text-[#76564b] hover:bg-[#f2ddd6]'
                          : 'text-text-secondary hover:bg-white/10'
                  }`}
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  {s.label}
                  <span className="ml-1.5 text-[10px] font-normal tabular-nums opacity-70">{s.rangeLabel}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className={isStudio ? 'mb-4 border-b border-[var(--cw-border)] pb-3' : 'mb-3 sm:mb-4'}>
          <h2
            className={
              isStudio
                ? 'text-base font-bold text-[var(--cw-text)]'
                : 'text-sm font-semibold text-primary sm:text-base'
            }
          >
            篩選與操作
          </h2>
          <p className={`mt-1 text-xs ${isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}`}>
            日期切換、資料刷新、匯出與顯示選項
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
            <label
              htmlFor="flight-data-selected-date"
              className={`whitespace-nowrap text-sm font-semibold sm:text-base ${
                isStudio ? 'text-[var(--cw-text)] cursor-pointer' : 'text-primary'
              }`}
              onClick={
                isStudio
                  ? (e) => {
                      if (e.target === e.currentTarget) {
                        tryOpenDatePicker(document.getElementById('flight-data-selected-date'))
                      }
                    }
                  : undefined
              }
            >
              選擇日期：
            </label>
            {isStudio ? (
              <CwDateInput
                id="flight-data-selected-date"
                value={selectedDate}
                onChange={(e) => {
                  const newDate = e.target.value
                  setSelectedDate(newDate)
                  loadFlightData(newDate)
                }}
                wrapperClassName="w-full max-w-[11.5rem]"
                inputClassName="min-h-11 sm:min-h-11"
              />
            ) : (
              <input
                id="flight-data-selected-date"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const newDate = e.target.value
                  setSelectedDate(newDate)
                  loadFlightData(newDate)
                }}
                className="min-h-[44px] rounded-lg border border-white/20 bg-surface/50 px-4 py-3 text-base text-primary focus:border-purple-500/50 focus:outline-none sm:min-h-0 sm:py-2 sm:text-sm"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {isStudio ? (
              <>
                <CwButton
                  variant="primary"
                  onClick={handleLoadData}
                  disabled={loading}
                  className="min-h-11 flex-1 sm:min-h-11 sm:flex-none"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>重新整理</span>
                </CwButton>
                <CwButton
                  variant="secondary"
                  onClick={handleLoadToday}
                  disabled={loading}
                  className="min-h-11"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  今天
                </CwButton>
                <CwButton
                  variant="secondary"
                  onClick={handleLoadYesterday}
                  disabled={loading}
                  className="min-h-11"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  昨天
                </CwButton>
                {activeTab === 'statistics' && (
                  <div className="flex gap-2">
                    <CwButton
                      variant="secondary"
                      onClick={() => handleExportStatistics('png')}
                      className="min-h-11 px-3 text-xs sm:text-sm"
                      title="匯出統計分析為 PNG"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">PNG</span>
                    </CwButton>
                    <CwButton
                      variant="secondary"
                      onClick={() => handleExportStatistics('pdf')}
                      className="min-h-11 px-3 text-xs sm:text-sm"
                      title="匯出統計分析為 PDF"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">PDF</span>
                    </CwButton>
                  </div>
                )}
                {loading && (
                  <CwButton
                    variant="danger"
                    onClick={handleCancelLoad}
                    className="min-h-11"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="sm:hidden">取消</span>
                  </CwButton>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleLoadData}
                  disabled={loading}
                  className="px-4 sm:px-6 py-3 sm:py-2 bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-[44px] sm:min-h-0 flex-1 sm:flex-none flex items-center justify-center gap-2"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>重新整理</span>
                </button>
                <button
                  onClick={handleLoadToday}
                  disabled={loading}
                  className="px-4 sm:px-6 py-3 sm:py-2 bg-purple-500/50 hover:bg-purple-500/70 active:bg-purple-500/80 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm sm:text-base min-h-[44px] sm:min-h-0"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  今天
                </button>
                <button
                  onClick={handleLoadYesterday}
                  disabled={loading}
                  className="px-4 sm:px-6 py-3 sm:py-2 bg-purple-500/50 hover:bg-purple-500/70 active:bg-purple-500/80 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm sm:text-base min-h-[44px] sm:min-h-0"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  昨天
                </button>
                {activeTab === 'statistics' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExportStatistics('png')}
                      className="px-3 sm:px-4 py-3 sm:py-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-0"
                      title="匯出統計分析為 PNG"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">PNG</span>
                    </button>
                    <button
                      onClick={() => handleExportStatistics('pdf')}
                      className="px-3 sm:px-4 py-3 sm:py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-0"
                      title="匯出統計分析為 PDF"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <DocumentTextIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">PDF</span>
                    </button>
                  </div>
                )}
                {loading && (
                  <button
                    onClick={handleCancelLoad}
                    className="px-4 py-3 sm:py-2 bg-red-500/50 hover:bg-red-500/70 active:bg-red-500/80 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px] sm:min-h-0"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="sm:hidden">取消</span>
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:ml-auto">
            <label className="flex cursor-pointer touch-manipulation items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className={
                  isStudio
                    ? 'h-5 w-5 cursor-pointer rounded accent-zinc-400 focus:ring-[var(--cw-focus-ring)] sm:h-4 sm:w-4'
                    : 'h-5 w-5 cursor-pointer rounded text-purple-500 focus:ring-purple-500 sm:h-4 sm:w-4'
                }
                style={{ WebkitTapHighlightColor: 'transparent' }}
              />
              <span
                className={`text-xs sm:text-sm ${isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}`}
              >
                自動刷新（每 5 分鐘）
              </span>
            </label>
          </div>
        </div>
        
        <div
          className={`pt-1 border-t ${isStudio ? 'border-[var(--cw-border)]' : 'border-white/10'}`}
        >
          <button
            type="button"
            onClick={() => setShowStatusPanel((prev) => !prev)}
            className={
              isStudio
                ? 'inline-flex w-full items-center justify-between gap-2 rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-3 py-2 text-xs text-[var(--cw-text-muted)] transition-colors hover:bg-[var(--cw-mega-surface)] sm:w-auto sm:text-sm'
                : 'inline-flex w-full items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-white/10 sm:w-auto sm:text-sm'
            }
            title="展開或收合狀態與驗證訊息"
          >
            <span className={isStudio ? 'text-[var(--cw-text)]' : ''}>狀態與驗證</span>
            <span className={isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}>
              {showStatusPanel ? '收合' : '展開'}
            </span>
          </button>
        </div>

        {showStatusPanel && hasStatusPanelContent && (
          <div className="mt-3 space-y-3">
        {/* 載入進度條 */}
        {loading && loadingProgress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-text-secondary">載入進度</span>
              <span className="text-sm text-text-secondary">{loadingProgress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {status.message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              status.type === 'loading'
                ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30'
                : status.type === 'error'
                ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                : 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30'
            }`}
          >
            {status.message}
          </div>
        )}

        {/* 資料驗證警告和錯誤 */}
        {dataValidation.warnings.length > 0 && (
          <div className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 rounded-lg p-3 text-sm">
            <div className="font-semibold mb-2">⚠️ 資料驗證警告</div>
            <ul className="list-disc list-inside space-y-1">
              {dataValidation.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {dataValidation.errors.length > 0 && (
          <div className="bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 rounded-lg p-3 text-sm">
            <div className="font-semibold mb-2">❌ 資料驗證錯誤</div>
            <ul className="list-disc list-inside space-y-1">
              {dataValidation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 資料差異提示 */}
        {dataDiff && (dataDiff.added.length > 0 || dataDiff.removed.length > 0 || dataDiff.modified.length > 0) && (
          <div className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-lg p-3 text-sm animate-fade-in">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              資料更新差異
            </div>
            <div className="space-y-2">
              {dataDiff.totalChange !== 0 && (
                <div className="font-medium">
                  總航班數變化：<span className={dataDiff.totalChange > 0 ? 'text-green-400' : 'text-red-400'}>
                    {dataDiff.totalChange > 0 ? '+' : ''}{dataDiff.totalChange} 班
                  </span>
                </div>
              )}
              {dataDiff.added.length > 0 && (
                <div>
                  <span className="text-green-400 font-medium">新增 {dataDiff.added.length} 班：</span>
                  <div className="mt-1 space-y-1">
                    {dataDiff.added.slice(0, 3).map((flight, index) => (
                      <div key={index} className="text-xs pl-4">
                        {flight.time} {flight.gate} {flight.flight_code || flight.flight || 'N/A'}
                      </div>
                    ))}
                    {dataDiff.added.length > 3 && (
                      <div className="text-xs pl-4 text-text-secondary">... 還有 {dataDiff.added.length - 3} 班</div>
                    )}
                  </div>
                </div>
              )}
              {dataDiff.removed.length > 0 && (
                <div>
                  <span className="text-red-400 font-medium">移除 {dataDiff.removed.length} 班：</span>
                  <div className="mt-1 space-y-1">
                    {dataDiff.removed.slice(0, 3).map((flight, index) => (
                      <div key={index} className="text-xs pl-4">
                        {flight.time} {flight.gate} {flight.flight_code || flight.flight || 'N/A'}
                      </div>
                    ))}
                    {dataDiff.removed.length > 3 && (
                      <div className="text-xs pl-4 text-text-secondary">... 還有 {dataDiff.removed.length - 3} 班</div>
                    )}
                  </div>
                </div>
              )}
              {dataDiff.modified.length > 0 && (
                <div>
                  <span className="text-yellow-400 font-medium">狀態變更 {dataDiff.modified.length} 班：</span>
                  <div className="mt-1 space-y-1">
                    {dataDiff.modified.slice(0, 3).map((change, index) => (
                      <div key={index} className="text-xs pl-4">
                        {change.new.time} {change.new.gate} {change.new.flight_code || change.new.flight || 'N/A'}: 
                        <span className="text-text-secondary"> {change.old.status}</span> → 
                        <span className="text-primary"> {change.new.status}</span>
                      </div>
                    ))}
                    {dataDiff.modified.length > 3 && (
                      <div className="text-xs pl-4 text-text-secondary">... 還有 {dataDiff.modified.length - 3} 班</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
          </div>
        )}
      </div>

      {/* Tab 切換 */}
      <div
        className={`mb-4 flex gap-2 border-b sm:mb-6 ${
          isStudio ? 'border-[var(--cw-border)]' : 'border-white/10'
        }`}
      >
        <button
          onClick={() => setActiveTab('data')}
          className={`min-h-[44px] px-4 py-3 text-sm font-medium transition-colors sm:min-h-0 sm:px-6 sm:py-2 sm:text-base ${
            activeTab === 'data'
              ? isStudio
                ? 'border-b-2 border-[var(--cw-text)] text-[var(--cw-text)]'
                : 'border-b-2 border-primary text-primary'
              : isStudio
                ? 'text-[var(--cw-text-muted)] active:text-[var(--cw-text)]'
                : 'text-text-secondary active:text-primary'
          }`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          航班資料
        </button>
        <button
          onClick={() => setActiveTab('statistics')}
          className={`min-h-[44px] px-4 py-3 text-sm font-medium transition-colors sm:min-h-0 sm:px-6 sm:py-2 sm:text-base ${
            activeTab === 'statistics'
              ? isStudio
                ? 'border-b-2 border-[var(--cw-text)] text-[var(--cw-text)]'
                : 'border-b-2 border-primary text-primary'
              : isStudio
                ? 'text-[var(--cw-text-muted)] active:text-[var(--cw-text)]'
                : 'text-text-secondary active:text-primary'
          }`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          統計分析
        </button>
      </div>

      {/* 航班資料 Tab */}
      {activeTab === 'data' && (
        <>
          {/* 統計卡片 - 添加動畫效果 */}
          <BusyIndexStrip days={paxDaily} date={flightData?.date || selectedDate} isStudio={isStudio} isClub={isClub} />
          <div className="animate-fade-in">
            {summaryCards}
          </div>

          {stressSeriesToday && (
            <div
              className={`mt-4 p-4 sm:mt-6 sm:p-5 ${
                isStudio
                  ? 'rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-surface)]'
                  : 'rounded-xl border border-white/10 bg-surface/40 backdrop-blur-md'
              }`}
            >
              <div className="flex flex-wrap items-center gap-1 mb-2">
                <h3
                  className={`text-base font-bold leading-snug sm:text-lg ${
                    isStudio ? 'text-[var(--cw-text)]' : 'text-primary'
                  }`}
                >
                  壓力曲線（當天）
                </h3>
                <button
                  type="button"
                  onClick={() => setStressSlotsHelp('today')}
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isStudio
                      ? 'border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] text-[var(--cw-text)] hover:bg-[var(--cw-surface-elevated)]'
                      : 'border-primary/45 bg-primary/15 text-primary hover:bg-primary/28 active:bg-primary/35'
                  }`}
                  aria-label="壓力曲線完整說明"
                  title="說明"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <InfoTipIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftGateStressWeights({ ...gateStressWeights })
                    setGateStressSaveState('idle')
                    setGateStressWeightsModalOpen(true)
                  }}
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isStudio
                      ? 'border-[var(--cw-border)] bg-[var(--cw-bg)] text-[var(--cw-text)] hover:bg-[var(--cw-mega-surface)] active:opacity-90'
                      : 'border-white/25 bg-white/10 text-primary hover:bg-white/18 active:bg-white/25'
                  }`}
                  aria-label="調整登機門壓力權重（Firebase 同步）"
                  title="登機門權重"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                </button>
              </div>
              <p
                className={`mb-4 text-[11px] leading-relaxed sm:text-xs ${
                  isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'
                }`}
              >
                依<strong>載入班表</strong>（檔案{' '}
                <code
                  className={`rounded px-1 text-[10px] ${
                    isStudio ? 'bg-[var(--cw-bg)] text-[var(--cw-text)]' : 'bg-white/10'
                  }`}
                >
                  date
                </code>
                ）與航班列表計算。圓形圖示為完整規則；<strong>齒輪</strong>可調登機門權重。
              </p>
              <StressCurvePanel
                store={store}
                shifts={storeShifts}
                series={stressSeriesToday}
                summary={stressSummaryToday}
                nowMinutes={nowMinutes}
                flights={flightData?.flights || null}
                pax={flightData?.pax_t2}
                shiftKey={stressShift}
                onShiftChange={setStressShift}
                supportFrom={nightSupportPlan?.supportFrom}
                supportUntil={nightSupportPlan?.supportUntil}
                showSupport={store.nightSupport}
                isStudio={isStudio}
                isClub={isClub}
              />
            </div>
          )}

          {/* 航班列表 */}
      {loading && !flightData ? (
        <SkeletonScreen />
      ) : flightData && flightData.flights ? (
        <div className="space-y-4 animate-fade-in">
          <div
            className={`flex flex-col gap-3 border-b-2 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pb-2 ${
              isStudio ? 'border-[var(--cw-border)]' : 'border-purple-500/30'
            }`}
          >
            <div className="flex flex-col">
              <h2 className={`text-xl font-bold sm:text-2xl ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`}>
                桃園機場 {store.rangeLabel} 航班資料
              </h2>
              <p className={`mt-1 text-xs sm:text-sm ${isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}`}>
                航班列表
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isStudio ? (
                <>
                  <CwButton
                    variant={viewMode === 'simple' ? 'primary' : 'secondary'}
                    onClick={() => setViewMode('simple')}
                    className="min-h-11 px-3 text-xs sm:px-4 sm:text-sm"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    簡潔模式
                  </CwButton>
                  <CwButton
                    variant={viewMode === 'detailed' ? 'primary' : 'secondary'}
                    onClick={() => setViewMode('detailed')}
                    className="min-h-11 px-3 text-xs sm:px-4 sm:text-sm"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    詳細模式
                  </CwButton>
                  <CwButton
                    variant="secondary"
                    onClick={handleExportPNG}
                    className="min-h-11 px-3 text-xs sm:px-4 sm:text-sm"
                    title="匯出為 PNG"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    <span>匯出</span>
                  </CwButton>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setViewMode('simple')}
                    className={`px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-semibold transition-colors text-xs sm:text-sm min-h-[44px] sm:min-h-0 ${
                      viewMode === 'simple'
                        ? 'bg-purple-500 text-white active:bg-purple-600'
                        : 'bg-surface/40 text-text-secondary active:bg-surface/60'
                    }`}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    簡潔模式
                  </button>
                  <button
                    onClick={() => setViewMode('detailed')}
                    className={`px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-semibold transition-colors text-xs sm:text-sm min-h-[44px] sm:min-h-0 ${
                      viewMode === 'detailed'
                        ? 'bg-purple-500 text-white active:bg-purple-600'
                        : 'bg-surface/40 text-text-secondary active:bg-surface/60'
                    }`}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    詳細模式
                  </button>
                  <button
                    onClick={handleExportPNG}
                    className="px-3 sm:px-4 py-2.5 sm:py-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-0"
                    title="匯出為 PNG"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    <span>匯出</span>
                  </button>
                </>
              )}
            </div>
          </div>
          {/* 篩選：時間範圍與登機門。放在列表正上方，離它影響的東西最近 */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div
              role="group"
              aria-label="時間範圍"
              className={`inline-flex gap-0.5 rounded-lg p-0.5 ${
                isStudio
                  ? 'border border-[var(--cw-border)] bg-[var(--cw-bg)]'
                  : isClub
                    ? 'border border-[#d9b9ad] bg-[#f8eeea]'
                    : 'border border-white/15 bg-white/5'
              }`}
            >
              {[
                ['all', '全天'],
                ['next3', '接下來 3 小時'],
                ['upcoming', '尚未起飛']
              ].map(([key, label]) => {
                const active = timeFilter === key
                const disabled = key === 'next3' && nowMinutes == null
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    disabled={disabled}
                    title={disabled ? '只有看今天的資料時才有「現在」' : undefined}
                    onClick={() => setTimeFilter(key)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      active
                        ? isStudio
                          ? 'bg-[var(--cw-surface-elevated)] text-[var(--cw-text)] shadow-sm'
                          : isClub
                            ? 'bg-[#76564b] text-white shadow-sm'
                            : 'bg-white/15 text-primary shadow-sm'
                        : isStudio
                          ? 'text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)]'
                          : isClub
                            ? 'text-[#76564b] hover:bg-[#f2ddd6]'
                            : 'text-text-secondary hover:bg-white/10'
                    }`}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {gatesInDay.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="登機門篩選">
                {gatesInDay.map((gate) => {
                  const active = gateFilter.has(gate)
                  return (
                    <button
                      key={gate}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setGateFilter((prev) => {
                          const next = new Set(prev)
                          if (next.has(gate)) next.delete(gate)
                          else next.add(gate)
                          return next
                        })
                      }
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-colors ${
                        active
                          ? isClub
                            ? 'bg-[#76564b] text-white'
                            : 'bg-primary/25 text-primary ring-1 ring-inset ring-primary/40'
                          : isStudio
                            ? 'border border-[var(--cw-border)] text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)]'
                            : isClub
                              ? 'border border-[#d9b9ad] text-[#76564b] hover:bg-[#f2ddd6]'
                              : 'border border-white/15 text-text-secondary hover:bg-white/10'
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      {gate}
                    </button>
                  )
                })}
                {gateFilter.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setGateFilter(new Set())}
                    className={`text-[11px] underline underline-offset-2 ${
                      isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'
                    }`}
                  >
                    清除
                  </button>
                )}
              </div>
            )}

            <span
              className={`flex items-center gap-3 text-xs tabular-nums sm:ml-auto ${
                isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'
              }`}
            >
              顯示 {filteredFlights.length} / {flightData.flights.length} 班
              {viewMode === 'simple' && nowRowIndex > 0 && (
                <button
                  type="button"
                  onClick={() => nowRowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })}
                  className={`rounded-full px-2.5 py-1 font-semibold ${
                    isClub
                      ? 'border border-[#c84629]/45 text-[#c84629] hover:bg-[#c84629]/10'
                      : 'border border-amber-500/45 text-amber-500 hover:bg-amber-500/10'
                  }`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  跳到現在 ↓
                </button>
              )}
            </span>
          </div>

          {filteredFlights.length === 0 ? (
            <div className={`animate-fade-in py-12 text-center text-sm ${isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}`}>
              <p>{flightData.flights.length === 0 ? '當天沒有航班資料' : '這個篩選條件下沒有航班'}</p>
              {flightData.flights.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTimeFilter('all')
                    setGateFilter(new Set())
                  }}
                  className="mt-2 text-xs underline underline-offset-2"
                >
                  清除篩選
                </button>
              )}
            </div>
          ) : viewMode === 'simple' ? (
            <div
              className={`overflow-hidden animate-scale-in ${
                isStudio
                  ? 'rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-surface)]'
                  : 'rounded-xl border border-white/10 bg-surface/40 shadow-lg backdrop-blur-md'
              }`}
            >
              {/* 欄標題只有桌機需要；手機是堆疊卡片，標題反而是雜訊 */}
              <div
                className={`hidden px-3 py-3 text-xs font-bold tracking-wide sm:px-4 sm:text-sm ${
                  store.nightSupport ? FLIGHT_ROW_GRID_WITH_SUPPORT : FLIGHT_ROW_GRID
                } ${
                  isStudio
                    ? 'border-b border-[var(--cw-border)] bg-[var(--cw-surface-elevated)] text-[var(--cw-text)]'
                    : 'border-b-2 border-purple-500/40 bg-gradient-to-r from-purple-500/25 via-pink-500/20 to-purple-500/25 text-primary'
                }`}
              >
                <span>時間</span>
                <span>登機門</span>
                <span>航班</span>
                <span>狀態</span>
                {store.nightSupport && <span>晚班支援/留店</span>}
              </div>
              <ul className="list-none">
                {filteredFlights.map((flight, idx) => (
                  <Fragment key={flightRowKey(flight)}>
                    {idx === nowRowIndex && (
                      <li ref={nowRowRef} aria-hidden="true" className="relative px-3 py-1 sm:px-4">
                        <div
                          className={`flex items-center gap-2 text-[11px] font-bold tabular-nums ${
                            isClub ? 'text-[#c84629]' : 'text-amber-500'
                          }`}
                        >
                          <span className="shrink-0">現在 {formatMinAsHHMM(nowMinutes)}</span>
                          <span
                            className={`h-px flex-1 ${isClub ? 'bg-[#c84629]/45' : 'bg-amber-500/45'}`}
                          />
                        </div>
                      </li>
                    )}
                    <FlightRow
                      flight={flight}
                      idx={idx}
                      isUpcoming={isUpcomingFlight(flight)}
                      nsCfg={nightShiftCfgMerged}
                      keepStoreUntil={nightSupportPlan?.keepStoreUntil ?? null}
                      isLastDefining={
                        nightSupportLastRowKeys.size > 0 &&
                        nightSupportLastRowKeys.has(flightRowKey(flight))
                      }
                      store={store}
                      isStudio={isStudio}
                      isClub={isClub}
                      onSelectFlight={setSelectedFlight}
                    />
                  </Fragment>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFlights.map((flight, idx) => (
                <FlightItem key={idx} flight={flight} />
              ))}
            </div>
          )}
        </div>
      ) : null}
        </>
      )}

      <FlightDialogs m={m} />

      <FlightStatsTab m={m} />

      {/* 空狀態 - 只在沒有資料且不在載入時顯示 */}
      {!loading && !flightData && (
        <div className="text-center py-12 text-text-secondary">
          <div className="w-20 h-20 mx-auto mb-4 opacity-50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">請選擇日期載入航班資料</h3>
          <p>選擇上方日期並點擊「重新整理」按鈕</p>
        </div>
      )}

    </div>
  )
}

export default FlightDataContent
