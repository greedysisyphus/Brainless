import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { CwButton, CwDateInput } from '../studio/ui'
import { studioSurfaces } from '../studio/studioSurfaceClasses'
import InfoTipIcon from './flight/InfoTipIcon'
import StressCurvePanel from './flight/StressCurvePanel'

/**
 * 航班資料的「統計分析」分頁（多日圖表、排行、歷史對比）。Club 版和新版共用。
 * m 是 useFlightData() 回傳的那一包。
 */
export function FlightStatsTab({ m }) {
  const {
    isStudio,
    isClub,
    CHART_COLORS,
    store,
    activeTab,
    loadingMultiDay,
    loadingHistorical,
    exportStatisticsRef,
    heatmapRef,
    dailyTotalChartRef,
    destTop10Ref,
    airlineTop10Ref,
    hourlyDistRef,
    multiDayHourlyTrendRef,
    gateDateHeatmapRef,
    weekdayChartRef,
    dayTypeChartRef,
    statsOverviewRef,
    statsSlotRef,
    statsGateRef,
    statsTrendRef,
    setStressSlotsHelp,
    stressShift,
    setStressShift,
    destChartMode,
    setDestChartMode,
    hourlyChartMode,
    setHourlyChartMode,
    gateHeatmapViewMode,
    setGateHeatmapViewMode,
    gateHeatmapSortMode,
    setGateHeatmapSortMode,
    gateHeatmapValueMode,
    setGateHeatmapValueMode,
    weekdaySortMode,
    setWeekdaySortMode,
    dayTypeSortMode,
    setDayTypeSortMode,
    rangeStartDate,
    setRangeStartDate,
    rangeEndDate,
    setRangeEndDate,
    gateStressWeights,
    setGateStressWeightsModalOpen,
    setDraftGateStressWeights,
    setGateStressSaveState,
    flightData,
    storeShifts,
    multiDayData,
    loadMultiDayData,
    loadMultiDayDataByRange,
    loadHistoricalComparisonData,
    statistics,
    hourlyTrendingData,
    heatmapDataFromMultiDay,
    statsByDestination,
    statsByAirline,
    statsDestRaceFrames,
    handleChartClick,
    weekdayDisplayData,
    dayTypeDisplayData,
    historicalComparison,
    gateHeatmapData,
    gateHeatmapDisplayData,
    stressSeriesMultiDay,
    stressSummaryMultiDay,
    statsPanelShell,
    statsTitleClass,
    statsChipActive,
    statsChipIdle,
    statsInputClass,
    statsMutedText,
    statsDividerText,
    statsIconBtnStudio,
    statsControlActive,
    statsControlIdle,
    rechartsGrid,
    rechartsAxis,
    rechartsTooltip,
    historyCard,
    historyText,
    historyTitle,
    historyAction,
    historyWarning,
    historyIncrease,
    historyDecrease,
    scrollToStatsSection,
  } = m

  return (
    <>
      {/* 統計分析 Tab */}
      {activeTab === 'statistics' && (
        <div className="space-y-6 animate-fade-in" ref={exportStatisticsRef} data-export-statistics="true">
          <div
            className={
              isStudio
                ? 'sticky top-2 z-20 rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-surface-elevated)] px-3 py-2 shadow-[var(--cw-shadow-sm)]'
                : 'sticky top-2 z-20 rounded-2xl border border-white/10 bg-surface/70 backdrop-blur-md px-3 py-2'
            }
          >
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => scrollToStatsSection(statsOverviewRef)} className={isStudio ? `${studioSurfaces.chip} text-xs sm:text-sm` : 'px-3 py-1.5 rounded-lg text-xs sm:text-sm bg-white/8 hover:bg-white/14 text-text-secondary hover:text-primary transition-colors'}>總覽</button>
              <button type="button" onClick={() => scrollToStatsSection(statsSlotRef)} className={isStudio ? `${studioSurfaces.chip} text-xs sm:text-sm` : 'px-3 py-1.5 rounded-lg text-xs sm:text-sm bg-white/8 hover:bg-white/14 text-text-secondary hover:text-primary transition-colors'}>時段</button>
              <button type="button" onClick={() => scrollToStatsSection(statsGateRef)} className={isStudio ? `${studioSurfaces.chip} text-xs sm:text-sm` : 'px-3 py-1.5 rounded-lg text-xs sm:text-sm bg-white/8 hover:bg-white/14 text-text-secondary hover:text-primary transition-colors'}>登機門</button>
              <button type="button" onClick={() => scrollToStatsSection(statsTrendRef)} className={isStudio ? `${studioSurfaces.chip} text-xs sm:text-sm` : 'px-3 py-1.5 rounded-lg text-xs sm:text-sm bg-white/8 hover:bg-white/14 text-text-secondary hover:text-primary transition-colors'}>趨勢</button>
            </div>
          </div>
          {/* 當天統計圖表 - 移到最上方 */}
          {statistics && flightData && (
            <div ref={statsOverviewRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 scroll-mt-20">
              {/* 各登機門航班數量分布 */}
              <div className={statsPanelShell}>
                <h3 className={statsTitleClass}>各登機門航班數量分布（當天）</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart 
                    data={statistics.gateDistribution}
                    onClick={(data, index) => {
                      if (data && data.activePayload && data.activePayload[0]) {
                        const gate = data.activePayload[0].payload.name
                        const gateData = statistics.gateDistribution.find(d => d.name === gate)
                        handleChartClick('gate', gate, gateData)
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={rechartsGrid} />
                    <XAxis 
                      dataKey="name" 
                      stroke={rechartsAxis}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke={rechartsAxis}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={rechartsTooltip}
                    />
                    <Bar dataKey="value" fill={isStudio ? '#71717a' : '#8b5cf6'} radius={[8, 8, 0, 0]}>
                      {statistics.gateDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 時間分布圖表（每小時航班數）（當天）— ECharts 面積圖 / 柱狀圖 */}
              <div className={statsPanelShell}>
                <h3 className={statsTitleClass}>時間分布（每小時航班數）（當天）</h3>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setHourlyChartMode('area')}
                    className={`text-sm font-medium transition-colors duration-150 ${hourlyChartMode === 'area' ? statsChipActive : statsChipIdle}`}
                  >
                    面積圖
                  </button>
                  <button
                    type="button"
                    onClick={() => setHourlyChartMode('bar')}
                    className={`text-sm font-medium transition-colors duration-150 ${hourlyChartMode === 'bar' ? statsChipActive : statsChipIdle}`}
                  >
                    柱狀圖
                  </button>
                </div>
                <div ref={hourlyDistRef} className="w-full h-[250px]" />
              </div>
            </div>
          )}

          {/* 控制選項（置於多日壓力曲線上方，方便先載入區間） */}
          <div ref={statsSlotRef} className={`${statsPanelShell} scroll-mt-20`}>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className={`text-sm whitespace-nowrap ${statsMutedText}`}>快速載入</span>
              <select
                onChange={(e) => loadMultiDayData(parseInt(e.target.value, 10))}
                className={statsInputClass}
                defaultValue="30"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <option value="3">最近 3 天</option>
                <option value="7">最近 7 天</option>
                <option value="14">最近 14 天</option>
                <option value="30">最近 30 天</option>
                <option value="90">最近 90 天</option>
                <option value="120">最近 120 天</option>
                <option value="150">最近 150 天</option>
              </select>

              <span className={`text-xs hidden sm:inline ${statsDividerText}`}>|</span>
              <span className={`text-sm whitespace-nowrap ${statsMutedText}`}>自訂區間</span>
              {isStudio ? (
                <CwDateInput
                  value={rangeStartDate}
                  onChange={(e) => setRangeStartDate(e.target.value)}
                  wrapperClassName="w-full min-w-[10.5rem] sm:w-auto"
                  inputClassName="min-h-[40px] text-sm"
                />
              ) : (
                <input
                  type="date"
                  value={rangeStartDate}
                  onChange={(e) => setRangeStartDate(e.target.value)}
                  className={statsInputClass}
                />
              )}
              <span className={isStudio ? 'text-sm text-[var(--cw-text-muted)]' : 'text-text-secondary text-sm'}>至</span>
              {isStudio ? (
                <CwDateInput
                  value={rangeEndDate}
                  onChange={(e) => setRangeEndDate(e.target.value)}
                  wrapperClassName="w-full min-w-[10.5rem] sm:w-auto"
                  inputClassName="min-h-[40px] text-sm"
                />
              ) : (
                <input
                  type="date"
                  value={rangeEndDate}
                  onChange={(e) => setRangeEndDate(e.target.value)}
                  className={statsInputClass}
                />
              )}
              {isStudio ? (
                <CwButton
                  type="button"
                  variant="secondary"
                  className="min-h-10 shrink-0"
                  onClick={() => loadMultiDayDataByRange(rangeStartDate, rangeEndDate)}
                >
                  套用
                </CwButton>
              ) : (
                <button
                  type="button"
                  onClick={() => loadMultiDayDataByRange(rangeStartDate, rangeEndDate)}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-primary text-sm font-medium transition-colors min-h-[40px]"
                >
                  套用
                </button>
              )}

              {loadingMultiDay && (
                <div className={`flex items-center gap-2 text-sm ml-1 ${statsMutedText}`}>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>載入中...</span>
                </div>
              )}
            </div>
          </div>

          {stressSeriesMultiDay && multiDayData.length > 0 && (
            <div className={statsPanelShell}>
              <div className="flex flex-wrap items-center gap-1 mb-2">
                <h3 className={isStudio ? 'text-base sm:text-lg font-bold text-[var(--cw-text)] leading-snug' : 'text-base sm:text-lg font-bold text-primary leading-snug'}>壓力曲線（多日平均）</h3>
                <button
                  type="button"
                  onClick={() => setStressSlotsHelp('multi')}
                  className={
                    isStudio
                      ? statsIconBtnStudio
                      : 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-primary/15 text-primary hover:bg-primary/28 active:bg-primary/35 transition-colors'
                  }
                  aria-label="壓力曲線多日平均完整說明"
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
                  className={
                    isStudio
                      ? statsIconBtnStudio
                      : 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-primary hover:bg-white/18 active:bg-white/25 transition-colors'
                  }
                  aria-label="調整登機門壓力權重（Firebase 同步）"
                  title="登機門權重"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                </button>
              </div>
              <p className={`text-[11px] sm:text-xs mb-3 leading-relaxed ${statsMutedText}`}>
                依目前已載入 <strong className={isStudio ? 'text-[var(--cw-text)]' : ''}>{multiDayData.length}</strong> 天做<strong className={isStudio ? 'text-[var(--cw-text)]' : ''}>槽位分數平均</strong>。圓形圖示為完整說明；<strong className={isStudio ? 'text-[var(--cw-text)]' : ''}>齒輪</strong>可調登機門權重。
                {multiDayData[0]?.date && multiDayData[multiDayData.length - 1]?.date && (
                  <span className={`block mt-1 ${isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary/90'}`}>
                    資料範圍：{multiDayData[0].date} ～ {multiDayData[multiDayData.length - 1].date}
                  </span>
                )}
              </p>
              <StressCurvePanel
                store={store}
                shifts={storeShifts}
                series={stressSeriesMultiDay}
                summary={stressSummaryMultiDay}
                shiftKey={stressShift}
                onShiftChange={setStressShift}
                countUnit="班/天"
                isStudio={isStudio}
                isClub={isClub}
              />
            </div>
          )}

          {/* 每日總航班數（柱狀圖 + 趨勢線）— ECharts */}
          {multiDayData.length > 0 && (
            <div ref={statsTrendRef} className={`${statsPanelShell} scroll-mt-20`}>
              <h3 className={statsTitleClass}>每日總航班數</h3>
              <div ref={dailyTotalChartRef} className="w-full h-[280px]" />
            </div>
          )}

          {/* 每小時航班數熱力圖（日期 × 時段） */}
          {heatmapDataFromMultiDay.length > 0 && (
            <div ref={statsGateRef} className={`${statsPanelShell} scroll-mt-20`}>
              <h3 className={statsTitleClass}>每小時航班數熱力圖（日期 × 時段）</h3>
              <div ref={heatmapRef} className="w-full h-[340px]" />
            </div>
          )}

          {/* 每小時航班數趨勢（多天比較）— ECharts（與 Demo 同款） */}
          {hourlyTrendingData && hourlyTrendingData.data && hourlyTrendingData.dates?.length > 0 && (
            <div className={statsPanelShell}>
              <h3 className={statsTitleClass}>每小時航班數趨勢（多天比較）</h3>
              <p className={`text-xs mb-2 ${isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}`}>可縮放時段、圖例切換</p>
              <div ref={multiDayHourlyTrendRef} className="w-full h-[320px]" />
            </div>
          )}


          {/* 一週各日 × 平日／週末／假期 */}
          {(weekdayDisplayData.length > 0 || dayTypeDisplayData.length > 0) && (
            <div className={statsPanelShell}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
              {/* 一週各日平均航班量比較 */}
              {weekdayDisplayData.length > 0 && (
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h4 className="text-base font-bold text-primary">一週各日平均航班量</h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setWeekdaySortMode('fixed')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${weekdaySortMode === 'fixed' ? 'bg-white/15 text-primary' : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}
                      >
                        固定順序
                      </button>
                      <button
                        type="button"
                        onClick={() => setWeekdaySortMode('value')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${weekdaySortMode === 'value' ? 'bg-white/15 text-primary' : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}
                      >
                        熱度排序
                      </button>
                    </div>
                  </div>
                  <div ref={weekdayChartRef} className="w-full h-[180px]" />
                </div>
              )}
              {/* 平日／週末／假期 平均航班量 */}
              {dayTypeDisplayData.length > 0 && (
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h4 className="text-base font-bold text-primary">平日／週末／假期</h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDayTypeSortMode('fixed')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${dayTypeSortMode === 'fixed' ? 'bg-white/15 text-primary' : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}
                      >
                        固定順序
                      </button>
                      <button
                        type="button"
                        onClick={() => setDayTypeSortMode('value')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${dayTypeSortMode === 'value' ? 'bg-white/15 text-primary' : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}
                      >
                        熱度排序
                      </button>
                    </div>
                  </div>
                  <div ref={dayTypeChartRef} className="w-full h-[180px]" />
                </div>
              )}
              </div>
            </div>
          )}

          {/* 目的地航班數 Top 10 — ECharts 柱狀圖 / Bar Race */}
          {(statsByDestination.length > 0 || statsDestRaceFrames.length > 0) && (
            <div className={statsPanelShell}>
              <h3 className={statsTitleClass}>目的地航班數 Top 10</h3>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setDestChartMode('bar')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${destChartMode === 'bar' ? statsControlActive : statsControlIdle}`}
                >
                  柱狀圖
                </button>
                <button
                  type="button"
                  onClick={() => setDestChartMode('race')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${destChartMode === 'race' ? statsControlActive : statsControlIdle}`}
                >
                  Bar Race
                </button>
              </div>
              <div ref={destTop10Ref} className="w-full h-[320px]" />
            </div>
          )}

          {/* 航空公司航班數 Top 10 — ECharts */}
          {statsByAirline.length > 0 && (
            <div className={statsPanelShell}>
              <h3 className={statsTitleClass}>航空公司航班數 Top 10</h3>
              <div ref={airlineTop10Ref} className="w-full h-[320px]" />
            </div>
          )}

          {/* 登機門使用熱度熱力圖 */}
          {gateHeatmapData && (
            <div className={statsPanelShell}>
              <h3 className={statsTitleClass}>
                登機門使用熱度
                {multiDayData.length > 0 && (
                  <span className="text-sm font-normal text-text-secondary ml-2">
                    （{multiDayData.length} 天平均）
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setGateHeatmapViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${gateHeatmapViewMode === 'cards' ? statsControlActive : statsControlIdle}`}
                >
                  卡片視圖
                </button>
                <button
                  type="button"
                  onClick={() => setGateHeatmapViewMode('matrix')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${gateHeatmapViewMode === 'matrix' ? statsControlActive : statsControlIdle}`}
                >
                  Gate × 日期
                </button>
                <span className={`w-px h-6 mx-1 hidden sm:inline-block ${isStudio ? 'bg-[var(--cw-border)]' : 'bg-white/10'}`} />
                <button
                  type="button"
                  onClick={() => setGateHeatmapValueMode('average')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${gateHeatmapValueMode === 'average' ? statsControlActive : statsControlIdle}`}
                >
                  平均
                </button>
                <button
                  type="button"
                  onClick={() => setGateHeatmapValueMode('total')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${gateHeatmapValueMode === 'total' ? statsControlActive : statsControlIdle}`}
                >
                  總計
                </button>
                <span className={`w-px h-6 mx-1 hidden sm:inline-block ${isStudio ? 'bg-[var(--cw-border)]' : 'bg-white/10'}`} />
                <button
                  type="button"
                  onClick={() => setGateHeatmapSortMode('fixed')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${gateHeatmapSortMode === 'fixed' ? statsControlActive : statsControlIdle}`}
                >
                  固定順序
                </button>
                <button
                  type="button"
                  onClick={() => setGateHeatmapSortMode('value')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${gateHeatmapSortMode === 'value' ? statsControlActive : statsControlIdle}`}
                >
                  熱度排序
                </button>
              </div>

              {gateHeatmapViewMode === 'cards' ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                    {(gateHeatmapDisplayData?.items || []).map((item) => (
                      <div
                        key={item.gate}
                        className={`${item.colorClass} rounded-lg p-3 sm:p-4 text-center transition-all duration-300 hover:scale-105 cursor-pointer border border-white/10`}
                        title={`${item.gate}: 總 ${item.count} 班 / 平均 ${Number(item.average || 0).toFixed(1)} 班/天`}
                        onClick={() => handleChartClick('gate', item.gate, item)}
                      >
                        <div className={`text-xs sm:text-sm font-bold mb-1 ${isClub && item.quantileLevel < 3 ? 'text-[#3d2b25]' : 'text-white'}`}>{item.gate}</div>
                        <div className={`text-lg sm:text-xl font-bold ${isClub && item.quantileLevel < 3 ? 'text-[#3d2b25]' : 'text-white'}`}>
                          {gateHeatmapValueMode === 'average'
                            ? Number(item.metric || 0).toFixed(1)
                            : item.metric}
                        </div>
                        <div className={`text-xs mt-1 ${isClub && item.quantileLevel < 3 ? 'text-[#6e5045]' : 'text-white/70'}`}>
                          {gateHeatmapValueMode === 'average' ? `總 ${item.count}` : `平均 ${Number(item.average || 0).toFixed(1)}`}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-4 pt-4 border-t ${isStudio ? 'border-[var(--cw-border)]' : 'border-white/10'}`}>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
                      <span>分位數色階</span>
                      <div className="flex items-center gap-1"><div className={`w-3 h-3 rounded ${isClub ? 'bg-[#f3eeea]' : 'bg-white/5'}`}></div><span>0</span></div>
                      <div className="flex items-center gap-1"><div className={`w-3 h-3 rounded ${isClub ? 'bg-[#efd4ca]' : 'bg-sky-500/25'}`}></div><span>Q1</span></div>
                      <div className="flex items-center gap-1"><div className={`w-3 h-3 rounded ${isClub ? 'bg-[#e8ad99]' : 'bg-cyan-500/35'}`}></div><span>Q2</span></div>
                      <div className="flex items-center gap-1"><div className={`w-3 h-3 rounded ${isClub ? 'bg-[#d97a60]' : 'bg-emerald-500/50'}`}></div><span>Q3</span></div>
                      <div className="flex items-center gap-1"><div className={`w-3 h-3 rounded ${isClub ? 'bg-[#b84b31]' : 'bg-amber-500/70'}`}></div><span>Q4</span></div>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <div ref={gateDateHeatmapRef} className="w-full h-[320px]" />
                  <p className="mt-2 text-xs text-text-secondary">可查看各日期在不同登機門的熱度分布；點擊格子可查看該登機門詳情</p>
                </div>
              )}
            </div>
          )}

          {/* 歷史趨勢對比 */}
          {historicalComparison && (
            <div className={statsPanelShell}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className={statsTitleClass}>歷史趨勢對比</h3>
                <button
                  type="button"
                  onClick={() => loadHistoricalComparisonData()}
                  disabled={loadingHistorical}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${historyAction}`}
                >
                  {loadingHistorical ? '載入中…' : '重新載入對比'}
                </button>
              </div>
              <p className={`text-xs mb-3 ${historyText}`}>
                上週／上月／去年同期 = 與當前期間相同天數，整體往前移 7／30／365 天
              </p>
              {loadingHistorical && (
                <p className={`text-xs mb-3 ${historyText}`}>正在載入上週／上月／去年同期…</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 當前期間 */}
                <div className={`${historyCard} ${isClub ? 'border-l-[#ec5836]' : 'border-l-violet-400'}`}>
                  <div className={`text-sm mb-2 ${historyText}`}>當前期間</div>
                  <div className={`text-2xl font-bold mb-1 ${historyTitle}`}>{Math.round(historicalComparison.current.averagePerDay)}</div>
                  <div className={`text-xs ${historyText}`}>平均 {historicalComparison.current.days} 天</div>
                  {historicalComparison.current.dateRange && (
                    <div className={`text-xs mt-0.5 ${historyText}`}>{historicalComparison.current.dateRange}</div>
                  )}
                  <div className={`text-sm mt-2 ${historyTitle}`}>總計 {historicalComparison.current.totalFlights} 班</div>
                </div>

                {/* 上週同期 */}
                <div className={`${historyCard} ${isClub ? 'border-l-[#d97a60]' : 'border-l-sky-400'}`}>
                  <div className={`text-sm mb-2 ${historyText}`}>上週同期</div>
                  {historicalComparison.lastWeek.totalFlights !== null && historicalComparison.lastWeek.days > 0 ? (
                    <>
                      <div className={`text-2xl font-bold mb-1 ${historyTitle}`}>{Math.round(historicalComparison.lastWeek.averagePerDay)}</div>
                      <div className={`text-xs ${historyText}`}>
                        平均 {historicalComparison.lastWeek.days} 天
                        {historicalComparison.lastWeek.days < historicalComparison.current.days && (
                          <span className={historyWarning}>（共 {historicalComparison.lastWeek.days} 天有資料）</span>
                        )}
                      </div>
                      {historicalComparison.lastWeek.dateRange && (
                        <div className={`text-xs mt-0.5 ${historyText}`}>{historicalComparison.lastWeek.dateRange}</div>
                      )}
                      <div className={`text-sm mt-1 ${historyTitle}`}>總計 {historicalComparison.lastWeek.totalFlights} 班</div>
                      {historicalComparison.lastWeek.sampleSufficient && historicalComparison.lastWeek.change !== null ? (
                        <div className={`text-sm mt-2 ${
                          historicalComparison.lastWeek.change > 0 ? historyIncrease :
                          historicalComparison.lastWeek.change < 0 ? historyDecrease : historyText
                        }`}>
                          {historicalComparison.lastWeek.change > 0 ? '↑' : historicalComparison.lastWeek.change < 0 ? '↓' : '='}
                          {Math.abs(historicalComparison.lastWeek.change)}% 較當期
                        </div>
                      ) : historicalComparison.lastWeek.days > 0 && !historicalComparison.lastWeek.sampleSufficient && (
                        <div className={`text-sm mt-2 ${historyWarning}`}>樣本不足，不比較</div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-text-secondary text-sm">資料不足</div>
                      <div className="text-xs text-text-secondary/80 mt-1">請確認 data/ 內有該時段 flight-data-YYYY-MM-DD.json</div>
                    </>
                  )}
                </div>

                {/* 上月同期 */}
                <div className={`${historyCard} ${isClub ? 'border-l-[#b86a55]' : 'border-l-emerald-400'}`}>
                  <div className={`text-sm mb-2 ${historyText}`}>上月同期</div>
                  {historicalComparison.lastMonth.totalFlights !== null && historicalComparison.lastMonth.days > 0 ? (
                    <>
                      <div className={`text-2xl font-bold mb-1 ${historyTitle}`}>{Math.round(historicalComparison.lastMonth.averagePerDay)}</div>
                      <div className={`text-xs ${historyText}`}>
                        平均 {historicalComparison.lastMonth.days} 天
                        {historicalComparison.lastMonth.days < historicalComparison.current.days && (
                          <span className={historyWarning}>（共 {historicalComparison.lastMonth.days} 天有資料）</span>
                        )}
                      </div>
                      {historicalComparison.lastMonth.dateRange && (
                        <div className={`text-xs mt-0.5 ${historyText}`}>{historicalComparison.lastMonth.dateRange}</div>
                      )}
                      <div className={`text-sm mt-1 ${historyTitle}`}>總計 {historicalComparison.lastMonth.totalFlights} 班</div>
                      {historicalComparison.lastMonth.sampleSufficient && historicalComparison.lastMonth.change !== null ? (
                        <div className={`text-sm mt-2 ${
                          historicalComparison.lastMonth.change > 0 ? historyIncrease :
                          historicalComparison.lastMonth.change < 0 ? historyDecrease : historyText
                        }`}>
                          {historicalComparison.lastMonth.change > 0 ? '↑' : historicalComparison.lastMonth.change < 0 ? '↓' : '='}
                          {Math.abs(historicalComparison.lastMonth.change)}% 較當期
                        </div>
                      ) : historicalComparison.lastMonth.days > 0 && !historicalComparison.lastMonth.sampleSufficient && (
                        <div className={`text-sm mt-2 ${historyWarning}`}>樣本不足，不比較</div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-text-secondary text-sm">資料不足</div>
                      <div className="text-xs text-text-secondary/80 mt-1">請確認 data/ 內有該時段 flight-data-YYYY-MM-DD.json</div>
                    </>
                  )}
                </div>

                {/* 去年同期 */}
                <div className={`${historyCard} ${isClub ? 'border-l-[#9a857d]' : 'border-l-amber-400'}`}>
                  <div className={`text-sm mb-2 ${historyText}`}>去年同期</div>
                  {historicalComparison.lastYear.totalFlights !== null && historicalComparison.lastYear.days > 0 ? (
                    <>
                      <div className={`text-2xl font-bold mb-1 ${historyTitle}`}>{Math.round(historicalComparison.lastYear.averagePerDay)}</div>
                      <div className={`text-xs ${historyText}`}>
                        平均 {historicalComparison.lastYear.days} 天
                        {historicalComparison.lastYear.days < historicalComparison.current.days && (
                          <span className={historyWarning}>（共 {historicalComparison.lastYear.days} 天有資料）</span>
                        )}
                      </div>
                      {historicalComparison.lastYear.dateRange && (
                        <div className={`text-xs mt-0.5 ${historyText}`}>{historicalComparison.lastYear.dateRange}</div>
                      )}
                      <div className={`text-sm mt-1 ${historyTitle}`}>總計 {historicalComparison.lastYear.totalFlights} 班</div>
                      {historicalComparison.lastYear.sampleSufficient && historicalComparison.lastYear.change !== null ? (
                        <div className={`text-sm mt-2 ${
                          historicalComparison.lastYear.change > 0 ? historyIncrease :
                          historicalComparison.lastYear.change < 0 ? historyDecrease : historyText
                        }`}>
                          {historicalComparison.lastYear.change > 0 ? '↑' : historicalComparison.lastYear.change < 0 ? '↓' : '='}
                          {Math.abs(historicalComparison.lastYear.change)}% 較當期
                        </div>
                      ) : historicalComparison.lastYear.days > 0 && !historicalComparison.lastYear.sampleSufficient && (
                        <div className={`text-sm mt-2 ${historyWarning}`}>樣本不足，不比較</div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-text-secondary text-sm">資料不足</div>
                      <div className="text-xs text-text-secondary/80 mt-1">請確認 data/ 內有該時段 flight-data-YYYY-MM-DD.json</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 空狀態 */}
          {!loadingMultiDay && multiDayData.length === 0 && (
            <div className="text-center py-12 text-text-secondary">
              <p>請選擇載入天數以查看統計數據</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
