import { XMarkIcon } from '@heroicons/react/24/outline'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../utils/firebase'
import { CwButton } from '../studio/ui'
import { mergeGateStressWeights } from '../../utils/flightData/gateStressWeights'
import { mergeNightShiftConfig, minutesToTimeInputValue, timeInputValueToMinutes, validateNightShiftDraftForSave } from '../../utils/flightData/nightShiftSupport'
import { stressWindowOf } from '../../utils/flightData/stressSlots'

/**
 * 航班資料的所有彈窗：單一航班詳情、壓力曲線說明、登機門權重、晚班支援參數、圖表明細。Club 版和新版共用。
 * m 是 useFlightData() 回傳的那一包。
 */
export function FlightDialogs({ m }) {
  const {
    isStudio,
    store,
    selectedFlight,
    setSelectedFlight,
    selectedChartDetail,
    setSelectedChartDetail,
    stressSlotsHelp,
    setStressSlotsHelp,
    gateStressWeights,
    gateStressWeightsModalOpen,
    setGateStressWeightsModalOpen,
    draftGateStressWeights,
    setDraftGateStressWeights,
    gateStressSaveState,
    setGateStressSaveState,
    gateStressRemoteError,
    nightShiftModalOpen,
    setNightShiftModalOpen,
    draftNightShift,
    setDraftNightShift,
    nightShiftSaveState,
    setNightShiftSaveState,
    nightShiftRemoteError,
    gateFamilyNumbers,
    nsGateRangeLo,
    setNsGateRangeLo,
    nsGateRangeHi,
    setNsGateRangeHi,
    nightShiftDraftError,
    setNightShiftDraftError,
    FlightItem,
  } = m

  return (
    <>
      {/* 航班詳細資料 Modal */}
      {selectedFlight && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
            isStudio ? 'bg-black/65 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-sm'
          }`}
          onClick={() => setSelectedFlight(null)}
        >
          <div
            className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto shadow-2xl ${
              isStudio
                ? 'rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-surface)]'
                : 'rounded-xl border border-white/20 bg-surface'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className={`sticky top-0 flex items-center justify-between border-b px-6 py-4 ${
                isStudio
                  ? 'border-[var(--cw-border)] bg-[var(--cw-surface-elevated)]'
                  : 'border-white/10 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md'
              }`}
            >
              <h3 className={`text-xl font-bold ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`}>
                航班詳細資料
              </h3>
              <button
                onClick={() => setSelectedFlight(null)}
                className={`rounded-lg p-2 transition-colors ${
                  isStudio
                    ? 'text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)] hover:text-[var(--cw-text)]'
                    : 'hover:bg-white/10'
                }`}
              >
                <XMarkIcon className={`h-6 w-6 ${isStudio ? '' : 'text-primary'}`} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <FlightItem flight={selectedFlight} />
            </div>
          </div>
        </div>
      )}

      {/* 壓力曲線完整說明 */}
      {stressSlotsHelp && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${
            isStudio ? 'bg-black/70 backdrop-blur-sm' : 'bg-black/70 backdrop-blur-md'
          }`}
          onClick={() => setStressSlotsHelp(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="stress-slots-help-title"
        >
          <div
            className={`max-h-[88vh] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col ${
              isStudio
                ? 'rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-surface)]'
                : 'rounded-2xl border border-white/15 bg-surface'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`shrink-0 flex items-center justify-between gap-3 border-b px-4 py-3 ${
                isStudio
                  ? 'border-[var(--cw-border)] bg-[var(--cw-surface-elevated)]'
                  : 'border-white/10 bg-gradient-to-r from-purple-500/15 to-cyan-500/10'
              }`}
            >
              <h3
                id="stress-slots-help-title"
                className={`pr-2 text-lg font-bold ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`}
              >
                {stressSlotsHelp === 'today' ? '壓力曲線 — 當天版說明' : '壓力曲線 — 多日平均版說明'}
              </h3>
              <button
                type="button"
                onClick={() => setStressSlotsHelp(null)}
                className={`shrink-0 rounded-xl p-2 transition-colors ${
                  isStudio
                    ? 'text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)] hover:text-[var(--cw-text)]'
                    : 'text-text-secondary hover:bg-white/10 hover:text-primary'
                }`}
                aria-label="關閉說明"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div
              className={`space-y-4 overflow-y-auto px-4 py-4 text-sm leading-relaxed ${
                isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'
              }`}
            >
              <section>
                <h4 className={`mb-1.5 font-semibold ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`}>
                  原理
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    每班航班會看「起飛前 {stressWindowOf(store).fromMin}～{stressWindowOf(store).toMin} 分鐘」這段壓力窗
                    {store.stressWindow ? '（這家店用交易紀錄校正過）' : ''}。
                  </li>
                  <li>系統用 60 分鐘觀察槽去掃描，計算壓力窗和觀察槽重疊多少分鐘。</li>
                  <li>重疊分鐘數再乘上登機門權重，累加後就是該時段分數。</li>
                  <li>分數越高越忙。曲線每 15 分鐘一根柱子，畫的是一整天的形狀。</li>
                  <li>橘色柱＝分數最高的那一小時；淺色區塊＝最長的一段連續空檔（分數低於尖峰兩成）。</li>
                </ul>
              </section>

              <section>
                <h4 className={`mb-1.5 font-semibold ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`}>
                  權重
                </h4>
                <p>
                  權重代表不同登機門的相對壓力。數值越高，代表同樣重疊分鐘下，該登機門對忙碌度的影響越大。
                  你可以用右上齒輪調整，調整後會同步到雲端設定。
                </p>
              </section>

            </div>
            <div
              className={`shrink-0 border-t px-4 py-3 ${
                isStudio ? 'border-[var(--cw-border)] bg-[var(--cw-bg)]' : 'border-white/10 bg-black/20'
              }`}
            >
              {isStudio ? (
                <CwButton type="button" variant="secondary" onClick={() => setStressSlotsHelp(null)} className="w-full">
                  關閉
                </CwButton>
              ) : (
                <button
                  type="button"
                  onClick={() => setStressSlotsHelp(null)}
                  className="w-full py-2.5 rounded-xl bg-primary/20 border border-primary/35 text-primary font-medium hover:bg-primary/30 transition-colors"
                >
                  關閉
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 登機門壓力權重（Firestore settings 同步） */}
      {gateStressWeightsModalOpen && (
        <div
          className={`fixed inset-0 z-[101] flex items-center justify-center p-4 ${
            isStudio ? 'bg-black/70 backdrop-blur-sm' : 'bg-black/70 backdrop-blur-md'
          }`}
          onClick={() => setGateStressWeightsModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gate-stress-modal-title"
        >
          <div
            className={`max-h-[88vh] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col ${
              isStudio
                ? 'rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-surface)]'
                : 'rounded-2xl border border-white/15 bg-surface'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`shrink-0 flex items-center justify-between gap-3 border-b px-4 py-3 ${
                isStudio
                  ? 'border-[var(--cw-border)] bg-[var(--cw-surface-elevated)]'
                  : 'border-white/10 bg-gradient-to-r from-purple-500/15 to-cyan-500/10'
              }`}
            >
              <h3
                id="gate-stress-modal-title"
                className={`pr-2 text-lg font-bold ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`}
              >
                登機門壓力權重
              </h3>
              <button
                type="button"
                onClick={() => setGateStressWeightsModalOpen(false)}
                className={`shrink-0 rounded-xl p-2 transition-colors ${
                  isStudio
                    ? 'text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)] hover:text-[var(--cw-text)]'
                    : 'text-text-secondary hover:bg-white/10 hover:text-primary'
                }`}
                aria-label="關閉"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div
              className={`flex-1 min-h-0 overflow-y-auto px-4 py-4 text-sm ${
                isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'
              }`}
            >
              {gateStressRemoteError && (
                <p className="text-amber-200/90 text-xs mb-3 leading-relaxed">
                  雲端連線異常：{gateStressRemoteError}。畫面上仍可能為本機快取；儲存時若仍失敗請檢查網路或 Firebase 權限。
                </p>
              )}
              <p className={`mb-3 text-xs leading-relaxed ${isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}`}>
                文件：
                <code
                  className={`rounded px-1 text-[11px] ${
                    isStudio ? 'bg-[var(--cw-bg)] text-[var(--cw-text)]' : 'bg-white/10'
                  }`}
                >
                  settings/{store.stressDocId}
                </code>
                ，欄位{' '}
                <code
                  className={`rounded px-1 text-[11px] ${
                    isStudio ? 'bg-[var(--cw-bg)] text-[var(--cw-text)]' : 'bg-white/10'
                  }`}
                >
                  weights
                </code>
                。含 L／R 與同號共用；儲存後其他裝置即時同步。
              </p>
              <div className="flex flex-wrap gap-3">
                {store.gateFamilies.map((key) => (
                  <label key={key} className="flex flex-col gap-0.5 min-w-[6.5rem] flex-1 sm:max-w-[10rem]">
                    <span className={`text-[11px] leading-tight ${isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}`}>
                      {key}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      step={0.1}
                      value={draftGateStressWeights[key]}
                      onChange={(e) => {
                        const raw = e.target.value
                        if (raw.trim() === '') return
                        const n = parseFloat(raw)
                        if (Number.isNaN(n)) return
                        setDraftGateStressWeights((prev) => ({ ...prev, [key]: Math.min(99, Math.max(0, n)) }))
                      }}
                      className={
                        isStudio
                          ? 'min-h-[40px] w-full rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-2 py-1.5 text-sm text-[var(--cw-text)]'
                          : 'min-h-[40px] w-full rounded-lg border border-white/20 bg-surface/50 px-2 py-1.5 text-sm text-primary'
                      }
                    />
                  </label>
                ))}
              </div>
              {gateStressSaveState === 'error' && (
                <p className="text-red-400/90 text-xs mt-3">儲存失敗，請稍後再試。</p>
              )}
            </div>
            <div
              className={`shrink-0 flex flex-col gap-2 border-t px-4 py-3 sm:flex-row ${
                isStudio ? 'border-[var(--cw-border)] bg-[var(--cw-bg)]' : 'border-white/10 bg-black/20'
              }`}
            >
              {isStudio ? (
                <>
                  <CwButton type="button" variant="secondary" onClick={() => setGateStressWeightsModalOpen(false)} className="flex-1">
                    取消
                  </CwButton>
                  <CwButton
                    type="button"
                    variant="secondary"
                    onClick={() => setDraftGateStressWeights({ ...store.stressWeights })}
                    className="flex-1"
                  >
                    還原預設（草稿）
                  </CwButton>
                  <CwButton
                    type="button"
                    variant="primary"
                    disabled={gateStressSaveState === 'saving'}
                    onClick={async () => {
                      const merged = mergeGateStressWeights(draftGateStressWeights, store)
                      setGateStressSaveState('saving')
                      try {
                        await setDoc(
                          doc(db, 'settings', store.stressDocId),
                          { weights: merged, updatedAt: serverTimestamp() },
                          { merge: true }
                        )
                        setGateStressSaveState('idle')
                        setGateStressWeightsModalOpen(false)
                      } catch (err) {
                        console.error('[gateStressWeights] setDoc 失敗:', err)
                        setGateStressSaveState('error')
                      }
                    }}
                    className="flex-1"
                  >
                    {gateStressSaveState === 'saving' ? '同步中…' : '儲存並同步'}
                  </CwButton>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setGateStressWeightsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/15 text-text-secondary font-medium hover:bg-white/10 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftGateStressWeights({ ...store.stressWeights })}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/15 text-primary font-medium hover:bg-white/10 transition-colors"
                  >
                    還原預設（草稿）
                  </button>
                  <button
                    type="button"
                    disabled={gateStressSaveState === 'saving'}
                    onClick={async () => {
                      const merged = mergeGateStressWeights(draftGateStressWeights, store)
                      setGateStressSaveState('saving')
                      try {
                        await setDoc(
                          doc(db, 'settings', store.stressDocId),
                          { weights: merged, updatedAt: serverTimestamp() },
                          { merge: true }
                        )
                        setGateStressSaveState('idle')
                        setGateStressWeightsModalOpen(false)
                      } catch (err) {
                        console.error('[gateStressWeights] setDoc 失敗:', err)
                        setGateStressSaveState('error')
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-primary/25 border border-primary/40 text-primary font-medium hover:bg-primary/35 transition-colors disabled:opacity-50"
                  >
                    {gateStressSaveState === 'saving' ? '同步中…' : '儲存並同步'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 晚班支援參數（Firestore settings 同步） */}
      {nightShiftModalOpen && store.nightSupport && (
        <div
          className={`fixed inset-0 z-[102] flex items-center justify-center p-4 ${
            isStudio ? 'bg-black/70 backdrop-blur-sm' : 'bg-black/70 backdrop-blur-md'
          }`}
          onClick={() => setNightShiftModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="night-shift-modal-title"
        >
          <div
            className={`max-h-[90vh] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col ${
              isStudio
                ? 'rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-surface)]'
                : 'rounded-2xl border border-white/15 bg-surface'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`shrink-0 flex items-center justify-between gap-3 border-b px-4 py-3 ${
                isStudio
                  ? 'border-[var(--cw-border)] bg-[var(--cw-surface-elevated)]'
                  : 'border-white/10 bg-gradient-to-r from-indigo-500/20 to-violet-500/15'
              }`}
            >
              <h3
                id="night-shift-modal-title"
                className={`pr-2 text-lg font-bold ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`}
              >
                晚班支援參數
              </h3>
              <button
                type="button"
                onClick={() => setNightShiftModalOpen(false)}
                className={`shrink-0 rounded-xl p-2 transition-colors ${
                  isStudio
                    ? 'text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)] hover:text-[var(--cw-text)]'
                    : 'text-text-secondary hover:bg-white/10 hover:text-primary'
                }`}
                aria-label="關閉"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div
              className={`flex-1 min-h-0 space-y-4 overflow-y-auto px-4 py-4 text-sm ${
                isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'
              }`}
            >
              {nightShiftRemoteError && (
                <p className="text-amber-200/90 text-xs leading-relaxed">
                  雲端連線異常：{nightShiftRemoteError}。畫面仍可能為本機快取；請檢查網路或 Firebase 權限。
                </p>
              )}
              <div className="space-y-3">
                <p className={`text-[11px] font-semibold ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary/90'}`}>
                  時間
                </p>
                <label className="block space-y-1">
                  <span className={`text-[11px] ${isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}`}>
                    關店／支援起算
                  </span>
                  <input
                    type="time"
                    step={60}
                    value={minutesToTimeInputValue(draftNightShift.supportStartMin)}
                    onChange={(e) => {
                      const m = timeInputValueToMinutes(e.target.value)
                      if (m == null) return
                      setDraftNightShift((p) => ({ ...p, supportStartMin: m }))
                    }}
                    className={
                      isStudio
                        ? 'min-h-[40px] w-full rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-3 py-2 text-[var(--cw-text)]'
                        : 'min-h-[40px] w-full rounded-lg border border-white/20 bg-surface/50 px-3 py-2 text-primary'
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className={`text-[11px] ${isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}`}>
                    納入晚班判斷的最晚起飛（此時之後不計）
                  </span>
                  <input
                    type="time"
                    step={60}
                    value={minutesToTimeInputValue(draftNightShift.supportEndMin)}
                    onChange={(e) => {
                      const m = timeInputValueToMinutes(e.target.value)
                      if (m == null) return
                      setDraftNightShift((p) => ({ ...p, supportEndMin: m }))
                    }}
                    className={
                      isStudio
                        ? 'min-h-[40px] w-full rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-3 py-2 text-[var(--cw-text)]'
                        : 'min-h-[40px] w-full rounded-lg border border-white/20 bg-surface/50 px-3 py-2 text-primary'
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className={`text-[11px] ${isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}`}>
                    晚班可支援到
                  </span>
                  <input
                    type="time"
                    step={60}
                    value={minutesToTimeInputValue(draftNightShift.shiftEndMin)}
                    onChange={(e) => {
                      const m = timeInputValueToMinutes(e.target.value)
                      if (m == null) return
                      setDraftNightShift((p) => ({ ...p, shiftEndMin: m }))
                    }}
                    className={
                      isStudio
                        ? 'min-h-[40px] w-full rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-3 py-2 text-[var(--cw-text)]'
                        : 'min-h-[40px] w-full rounded-lg border border-white/20 bg-surface/50 px-3 py-2 text-primary'
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className={`text-[11px] ${isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}`}>
                    收班後幾分鐘離店（最早留店＝關店起算＋本值）
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={draftNightShift.closingBufferMin}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10)
                      if (Number.isNaN(n)) return
                      setDraftNightShift((p) => ({
                        ...p,
                        closingBufferMin: Math.min(180, Math.max(0, n))
                      }))
                    }}
                    className={
                      isStudio
                        ? 'min-h-[40px] w-full rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-3 py-2 text-[var(--cw-text)]'
                        : 'min-h-[40px] w-full rounded-lg border border-white/20 bg-surface/50 px-3 py-2 text-primary'
                    }
                  />
                </label>
              </div>
              <div className={`space-y-2 border-t pt-3 ${isStudio ? 'border-[var(--cw-border)]' : 'border-white/10'}`}>
                <p className={`text-[11px] font-semibold ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary/90'}`}>
                  登機門 {store.rangeLabel}
                </p>
                <p
                  className={`text-[10px] leading-relaxed ${
                    isStudio ? 'text-[var(--cw-text-muted)]/90' : 'text-text-secondary/90'
                  }`}
                >
                  以「同號＋L／R」合併判斷。僅勾選的登機門在
                  {minutesToTimeInputValue(draftNightShift.supportStartMin)}–{minutesToTimeInputValue(draftNightShift.supportEndMin)} 內
                  納入晚班支援計算；未勾選者列表顯示「登機門 不列入考慮」。
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <label
                    className={`min-w-0 flex flex-col gap-0.5 text-[11px] ${
                      isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'
                    }`}
                  >
                    起迄
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className={isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}>D</span>
                      <select
                        value={nsGateRangeLo}
                        onChange={(e) => setNsGateRangeLo(Number(e.target.value))}
                        className={
                          isStudio
                            ? 'rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-2 py-1.5 text-[var(--cw-text)]'
                            : 'rounded-lg border border-white/20 bg-surface/50 px-2 py-1.5 text-primary'
                        }
                      >
                        {gateFamilyNumbers.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <span className={isStudio ? 'text-[var(--cw-text-muted)]/80' : 'text-text-secondary/80'}>至</span>
                      <span className={isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}>D</span>
                      <select
                        value={nsGateRangeHi}
                        onChange={(e) => setNsGateRangeHi(Number(e.target.value))}
                        className={
                          isStudio
                            ? 'rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-2 py-1.5 text-[var(--cw-text)]'
                            : 'rounded-lg border border-white/20 bg-surface/50 px-2 py-1.5 text-primary'
                        }
                      >
                        {gateFamilyNumbers.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const lo = Math.min(nsGateRangeLo, nsGateRangeHi)
                          const hi = Math.max(nsGateRangeLo, nsGateRangeHi)
                          setDraftNightShift((prev) => {
                            const g = { ...prev.gateIncluded }
                            for (const n of gateFamilyNumbers) {
                              g[`D${n}`] = n >= lo && n <= hi
                            }
                            return { ...prev, gateIncluded: g }
                          })
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-indigo-400/40 bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30 transition-colors"
                      >
                        套用起迄
                      </button>
                    </div>
                  </label>
                </div>
                <p className="text-[10px] text-amber-200/80">
                  套用起迄：區間內打勾、區間外取消；之後可再單獨微調核取方塊。
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {store.gateFamilies.map((k) => (
                    <label
                      key={k}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-[12px] ${
                        isStudio
                          ? 'border-[var(--cw-border)] bg-[var(--cw-bg)] text-[var(--cw-text)]'
                          : 'border-white/10 bg-white/5 text-primary'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(draftNightShift.gateIncluded?.[k])}
                        onChange={(e) => {
                          setDraftNightShift((p) => ({
                            ...p,
                            gateIncluded: { ...p.gateIncluded, [k]: e.target.checked }
                          }))
                        }}
                        className={isStudio ? 'rounded border-[var(--cw-border)] accent-zinc-400' : 'rounded border-white/30'}
                      />
                      <span>{k}</span>
                    </label>
                  ))}
                </div>
              </div>
              {nightShiftDraftError && (
                <p className="text-amber-200/95 text-xs leading-relaxed">{nightShiftDraftError}</p>
              )}
              {nightShiftSaveState === 'error' && (
                <p className="text-red-400/90 text-xs">儲存失敗，請稍後再試。</p>
              )}
            </div>
            <div
              className={`shrink-0 flex flex-col gap-2 border-t px-4 py-3 sm:flex-row ${
                isStudio ? 'border-[var(--cw-border)] bg-[var(--cw-bg)]' : 'border-white/10 bg-black/20'
              }`}
            >
              {isStudio ? (
                <>
                  <CwButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setNightShiftDraftError(null)
                      setNightShiftModalOpen(false)
                    }}
                    className="flex-1"
                  >
                    取消
                  </CwButton>
                  <CwButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setNightShiftDraftError(null)
                      setDraftNightShift(mergeNightShiftConfig(null, store))
                    }}
                    className="flex-1"
                  >
                    還原預設（草稿）
                  </CwButton>
                  <CwButton
                    type="button"
                    variant="primary"
                    disabled={nightShiftSaveState === 'saving'}
                    onClick={async () => {
                      setNightShiftDraftError(null)
                      const err = validateNightShiftDraftForSave(draftNightShift, store)
                      if (err) {
                        setNightShiftDraftError(err)
                        return
                      }
                      const merged = mergeNightShiftConfig(draftNightShift, store)
                      setNightShiftSaveState('saving')
                      try {
                        await setDoc(
                          doc(db, 'settings', store.nightDocId),
                          {
                            supportStartMin: merged.supportStartMin,
                            supportEndMin: merged.supportEndMin,
                            shiftEndMin: merged.shiftEndMin,
                            closingBufferMin: merged.closingBufferMin,
                            gateIncluded: merged.gateIncluded,
                            updatedAt: serverTimestamp()
                          },
                          { merge: true }
                        )
                        setNightShiftSaveState('idle')
                        setNightShiftModalOpen(false)
                      } catch (e) {
                        console.error('[nightShift] setDoc 失敗:', e)
                        setNightShiftSaveState('error')
                      }
                    }}
                    className="flex-1"
                  >
                    {nightShiftSaveState === 'saving' ? '同步中…' : '儲存並同步'}
                  </CwButton>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setNightShiftDraftError(null)
                      setNightShiftModalOpen(false)
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/15 text-text-secondary font-medium hover:bg-white/10 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNightShiftDraftError(null)
                      setDraftNightShift(mergeNightShiftConfig(null, store))
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/15 text-primary font-medium hover:bg-white/10 transition-colors"
                  >
                    還原預設（草稿）
                  </button>
                  <button
                    type="button"
                    disabled={nightShiftSaveState === 'saving'}
                    onClick={async () => {
                      setNightShiftDraftError(null)
                      const err = validateNightShiftDraftForSave(draftNightShift, store)
                      if (err) {
                        setNightShiftDraftError(err)
                        return
                      }
                      const merged = mergeNightShiftConfig(draftNightShift, store)
                      setNightShiftSaveState('saving')
                      try {
                        await setDoc(
                          doc(db, 'settings', store.nightDocId),
                          {
                            supportStartMin: merged.supportStartMin,
                            supportEndMin: merged.supportEndMin,
                            shiftEndMin: merged.shiftEndMin,
                            closingBufferMin: merged.closingBufferMin,
                            gateIncluded: merged.gateIncluded,
                            updatedAt: serverTimestamp()
                          },
                          { merge: true }
                        )
                        setNightShiftSaveState('idle')
                        setNightShiftModalOpen(false)
                      } catch (e) {
                        console.error('[nightShift] setDoc 失敗:', e)
                        setNightShiftSaveState('error')
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-primary/25 border border-primary/40 text-primary font-medium hover:bg-primary/35 transition-colors disabled:opacity-50"
                  >
                    {nightShiftSaveState === 'saving' ? '同步中…' : '儲存並同步'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 圖表詳細資訊 Modal */}
      {selectedChartDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface/95 backdrop-blur-md border border-white/20 rounded-xl p-4 sm:p-6 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-primary">{selectedChartDetail.title}</h3>
              <button
                onClick={() => setSelectedChartDetail(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6 text-text-secondary" />
              </button>
            </div>
            
            {/* 統計資訊 */}
            {selectedChartDetail.data && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white/5 rounded-lg">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {selectedChartDetail.type === 'hour' && (
                    <>
                      <div>
                        <div className="text-xs sm:text-sm text-text-secondary mb-1">時段</div>
                        <div className="text-base sm:text-lg font-bold text-primary">{selectedChartDetail.data.hour}</div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-text-secondary mb-1">航班數</div>
                        <div className="text-base sm:text-lg font-bold text-primary">{selectedChartDetail.data.count || selectedChartDetail.data.total || 0} 班</div>
                      </div>
                    </>
                  )}
                  {selectedChartDetail.type === 'weekday' && (
                    <>
                      <div>
                        <div className="text-xs sm:text-sm text-text-secondary mb-1">星期</div>
                        <div className="text-base sm:text-lg font-bold text-primary">{selectedChartDetail.data.weekday}</div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-text-secondary mb-1">平均航班數</div>
                        <div className="text-base sm:text-lg font-bold text-primary">{selectedChartDetail.data.average} 班/天</div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-text-secondary mb-1">總航班數</div>
                        <div className="text-base sm:text-lg font-bold text-primary">{selectedChartDetail.data.total} 班</div>
                      </div>
                    </>
                  )}
                  {selectedChartDetail.type === 'gate' && (
                    <>
                      <div>
                        <div className="text-xs sm:text-sm text-text-secondary mb-1">登機門</div>
                        <div className="text-base sm:text-lg font-bold text-primary">{selectedChartDetail.data.gate}</div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-text-secondary mb-1">航班數</div>
                        <div className="text-base sm:text-lg font-bold text-primary">{selectedChartDetail.data.count || selectedChartDetail.data.value || 0} 班</div>
                      </div>
                      {selectedChartDetail.data.average && (
                        <div>
                          <div className="text-xs sm:text-sm text-text-secondary mb-1">平均</div>
                          <div className="text-base sm:text-lg font-bold text-primary">{selectedChartDetail.data.average.toFixed(1)} 班/天</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 航班列表 */}
            {selectedChartDetail.flights && selectedChartDetail.flights.length > 0 && (
              <div>
                <h4 className="text-base sm:text-lg font-bold text-primary mb-3 sm:mb-4">
                  航班列表 ({selectedChartDetail.flights.length} 班)
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedChartDetail.flights.map((flight, index) => (
                    <div
                      key={index}
                      className="p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-base sm:text-lg font-bold text-purple-400">{flight.time}</span>
                          <span className="bg-purple-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                            {flight.gate}
                          </span>
                          <span className="text-primary font-semibold text-sm sm:text-base">{flight.flight_code || flight.flight || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                          {flight.dateLabel && (
                            <span className="text-text-secondary">{flight.dateLabel}</span>
                          )}
                          {flight.destination && (
                            <span className="text-text-secondary">→ {flight.destination}</span>
                          )}
                          {flight.status && (
                            <span className={`px-2 py-1 rounded text-xs ${
                              flight.status.includes('DEPARTED') || flight.status.includes('已出發')
                                ? 'bg-green-500/25 text-green-300'
                                : flight.status.includes('DELAYED') || flight.status.includes('延誤')
                                ? 'bg-yellow-500/25 text-yellow-300'
                                : 'bg-gray-500/20 text-gray-300'
                            }`}>
                              {flight.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {(!selectedChartDetail.flights || selectedChartDetail.flights.length === 0) && (
              <div className="text-center py-8 text-text-secondary">
                <p>沒有找到相關航班資料</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
