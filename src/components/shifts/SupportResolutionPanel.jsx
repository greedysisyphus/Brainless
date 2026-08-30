import { useMemo } from 'react'
import { ChevronDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { CwAlert, CwBadge, CwCard, CwEmptyState, CwSelect } from '../studio/ui'
import { CAR_LABELS, CAR_SHIFTS, getStore, getStoreName } from '../../pages/shifts/shiftConstants'
import { formatDateShort } from '../../pages/shifts/shiftModel'
import {
  SUPPORT_STATUS,
  SUPPORT_STATUS_LABELS,
  buildSupportGroups,
  listCarRiskSupport,
} from '../../pages/shifts/shiftSupport'
import { getShiftDisplay } from '../../pages/shifts/shiftVocab'
import { shiftSwatchStyle, ShuttleBusIcon } from './shiftUi'

const STATUS_TONE = {
  [SUPPORT_STATUS.RESOLVED]: 'success',
  [SUPPORT_STATUS.NO_DESTINATION_WRITTEN]: 'warning',
  [SUPPORT_STATUS.AMBIGUOUS]: 'warning',
  [SUPPORT_STATUS.MISSING_SLOT]: 'warning',
  [SUPPORT_STATUS.EXTRA_SLOT]: 'neutral',
  [SUPPORT_STATUS.NO_DESTINATION]: 'warning',
}

function SlotLabel({ slot, month }) {
  const display = getShiftDisplay(month, slot.shift)
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[var(--cw-radius-sm)] px-2 py-0.5 text-xs font-semibold"
      style={shiftSwatchStyle(slot.shift, month)}
    >
      {display?.label ?? slot.shift}
      {slot.start ? <span className="font-normal opacity-80">{slot.start}</span> : null}
    </span>
  )
}

/**
 * 支援班配對。
 * 來源店寫了「誰」去支援、目的店寫了「什麼班」，兩邊都只有一半，這裡把人跟班對起來。
 * 對不上的班可能是早班（04:30 到店），沒對上就不會出現在交通車名單，所以會特別標出來。
 */
export function SupportResolutionPanel({ book, months, links, onChangeLink, saving }) {
  const groups = useMemo(() => buildSupportGroups(months, links), [months, links])
  const pending = useMemo(() => groups.filter((group) => group.needsAttention), [groups])
  // 已經對上的沒有事情要做。全部攤開就是幾十列一模一樣的「已對上」，
  // 把真正要處理的那幾天淹掉——這一頁的重點是還沒對上的。
  const settled = useMemo(() => groups.filter((group) => !group.needsAttention), [groups])
  const carRisks = useMemo(
    () => listCarRiskSupport(months, links, { carShifts: CAR_SHIFTS }),
    [months, links]
  )

  const monthByStore = useMemo(() => {
    const map = new Map()
    months.forEach((month) => map.set(`${month.monthKey}|${month.storeCode}`, month))
    return map
  }, [months])

  if (!months.length) {
    return (
      <CwEmptyState
        title="還沒有班表可以配對"
        description="匯入班表後，跨店支援班會在這裡等你確認是哪一班。"
      />
    )
  }

  if (!groups.length) {
    return (
      <CwCard title="支援班配對" subtitle="目前沒有任何跨店支援班。">
        <p className="text-sm text-[var(--cw-text-muted)]">
          來源店寫「T3」或「D7」時會出現在這裡，等你指定那天實際是哪一班。
        </p>
      </CwCard>
    )
  }

  return (
    <div className="space-y-5">
      {carRisks.length ? (
        <CwAlert variant="warning" title="有支援班可能要坐交通車，但還沒對上">
          <ul className="mt-1 space-y-1">
            {carRisks.map((group) => (
              <li key={group.id}>
                · {formatDateShort(group.date)} 支援 {getStoreName(group.atStore)}：
                {group.claims
                  .filter((claim) => !claim.slotId)
                  .map((claim) => claim.name)
                  .join('、')}
                {group.unknownShift
                  ? '（目的店班表還沒匯入，班別不明）'
                  : `（那天有${group.riskyShifts
                      .map((shift) => CAR_LABELS[shift] || shift)
                      .join('、')}沒人認領）`}
              </li>
            ))}
          </ul>
          <p className="mt-2">
            早班 04:30、中班 05:30 到店都要坐車。沒對上班別的人不會出現在交通車名單，
            請在下面指定，或確認他們自行前往。
          </p>
        </CwAlert>
      ) : null}

      <CwCard
        title="支援班配對"
        subtitle="來源店只寫了「誰」去支援，目的店只寫了「什麼班」，在這裡把兩邊對起來。"
        actions={
          <>
            {saving ? <CwBadge tone="warning">同步中…</CwBadge> : null}
            {pending.length ? (
              <CwBadge tone="warning">{pending.length} 天待確認</CwBadge>
            ) : (
              <CwBadge tone="success">全部對上了</CwBadge>
            )}
          </>
        }
      >
        {pending.length ? (
          <ul className="space-y-3">{pending.map(renderGroup)}</ul>
        ) : null}

        {settled.length ? (
          <details
            className={`rounded-[var(--cw-radius)] border border-[var(--cw-border)] ${
              pending.length ? 'mt-4' : ''
            } [&[open]>summary]:border-b [&[open]_.cw-chevron]:rotate-180`}
          >
            <summary className="cw-touch-target flex cursor-pointer list-none items-center gap-2 border-[var(--cw-border)] px-3 py-2.5 text-sm text-[var(--cw-text-muted)] marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]">
              <span>
                已對上的 <span className="font-semibold text-[var(--cw-text)]">{settled.length}</span> 天
              </span>
              <span className="text-xs">（要改配對再展開）</span>
              <ChevronDownIcon className="cw-chevron ml-auto h-5 w-5 shrink-0 transition-transform" />
            </summary>
            <ul className="space-y-3 p-3">{settled.map(renderGroup)}</ul>
          </details>
        ) : null}

        <p className="mt-4 text-xs text-[var(--cw-text-muted)]">
          對上之後，那個班會照目的店的時間算，也會自動進當天的交通車名單與統計。
          配對結果存在 Firebase，重新匯入同一個月的班表不會清掉。
        </p>
      </CwCard>
    </div>
  )

  function renderGroup(group) {
    const destinationMonth = monthByStore.get(`${group.monthKey}|${group.atStore}`)
            const freeSlots = group.slots.filter((slot) => !slot.takenBy)
            const risky = freeSlots.some((slot) => CAR_SHIFTS.includes(slot.shift))

            return (
              <li
                key={group.id}
                className={`rounded-[var(--cw-radius)] border p-3 ${
                  group.needsAttention
                    ? 'border-[var(--cw-warning)]/50 bg-[var(--cw-warning-muted)]'
                    : 'border-[var(--cw-border)]'
                }`}
              >
                {group.visitorMismatches?.length ? (
                  <p className="mb-2 rounded-[var(--cw-radius-sm)] bg-[var(--cw-warning-muted)] px-2 py-1 text-xs text-[var(--cw-warning)]">
                    {getStoreName(group.atStore)} 的備註原文寫「
                    {group.visitorMismatches.map((m) => m.visitor).join('、')}」
                    {group.visitorMismatches.some((m) => m.ambiguous)
                      ? `，比對名單後可能是「${group.visitorMismatches
                          .flatMap((m) => m.candidates)
                          .join('／')}」，但跟當天實際去支援的人取交集後仍不只一個`
                      : `，但當天說要去支援的是「${group.visitorMismatches
                          .flatMap((m) => m.candidates)
                          .join('、')}」`}
                    —— 沒有硬湊，班別改由下面的規則推得。
                  </p>
                ) : null}
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[var(--cw-text)]">
                    {formatDateShort(group.date)}
                  </span>
                  <CwBadge>{group.atStore ? `支援 ${getStoreName(group.atStore)}` : '支援（未註明去哪家店）'}</CwBadge>
                  <CwBadge tone={STATUS_TONE[group.status]}>
                    {SUPPORT_STATUS_LABELS[group.status]}
                  </CwBadge>
                  {risky ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--cw-warning)]">
                      <ShuttleBusIcon className="h-4 w-4" />
                      可能要坐車
                    </span>
                  ) : null}
                </div>

                {group.claims.length === 0 ? (
                  <p className="text-sm text-[var(--cw-text-muted)]">
                    {getStoreName(group.atStore)} 那天有
                    {group.slots.map((slot) => getShiftDisplay(destinationMonth, slot.shift)?.label).join('、')}
                    的支援班
                    {group.unclaimedVisitors?.length
                      ? `，${getStoreName(group.atStore)} 寫的是「${group.unclaimedVisitors.join('、')}」，但那個人所屬店的班表還沒匯入。`
                      : '，但沒有任何一家店寫是誰去。要嘛來源店漏寫，要嘛那格判讀錯了。'}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {group.claims.map((claim) => (
                      <li
                        key={claim.personKey}
                        className="flex flex-wrap items-center justify-between gap-3"
                      >
                        <span className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold text-[var(--cw-text)]">{claim.name}</span>
                          <span className="text-xs text-[var(--cw-text-muted)]">
                            自 {getStore(claim.homeStore)?.short ?? claim.homeStore} · 紙本寫「
                            {claim.raw || 'T3'}」
                          </span>
                          {claim.resolvedShift ? (
                            <>
                              <SlotLabel
                                slot={
                                  group.slots.find((slot) => slot.slotId === claim.slotId) || {
                                    shift: claim.resolvedShift,
                                  }
                                }
                                month={destinationMonth}
                              />
                              <CwBadge tone={claim.source === 'manual' ? 'brand' : 'neutral'}>
                                {claim.source === 'visitor'
                                  ? '目的店寫明'
                                  : claim.source === 'visitorNarrowed'
                                    ? '候選×當天交集'
                                    : claim.source === 'sheet'
                                    ? '紙本寫明'
                                      : claim.source === 'manual'
                                        ? '手動指定'
                                        : '自動對上'}
                              </CwBadge>
                            </>
                          ) : (
                            <CwBadge tone="warning">班別未定</CwBadge>
                          )}
                        </span>

                        {claim.declaredShift ? (
                          <span className="text-xs text-[var(--cw-text-muted)]">
                            紙本已指定，不需配對
                          </span>
                        ) : group.slots.length ? (
                          <CwSelect
                            name={`support-${group.id}-${claim.personKey}`}
                            className="w-52"
                            value={claim.slotId || ''}
                            onChange={(event) =>
                              onChangeLink({
                                monthKey: group.monthKey,
                                date: group.date,
                                atStore: group.atStore,
                                personKey: claim.personKey,
                                slotId: event.target.value,
                              })
                            }
                          >
                            <option value="">未指定</option>
                            {group.slots.map((slot) => {
                              const display = getShiftDisplay(destinationMonth, slot.shift)
                              const takenByOther =
                                slot.takenBy && slot.takenBy !== claim.personKey
                              return (
                                <option
                                  key={slot.slotId}
                                  value={slot.slotId}
                                  disabled={takenByOther}
                                >
                                  {display?.label ?? slot.shift}
                                  {slot.start ? ` ${slot.start}–${slot.end}` : ''}
                                  {takenByOther ? `（已給 ${slot.takenBy}）` : ''}
                                </option>
                              )
                            })}
                          </CwSelect>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--cw-text-muted)]">
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            {!group.atStore
                              ? '紙本只寫一個「支」，沒寫去哪家店'
                              : group.destinationImported
                                ? `${getStoreName(group.atStore)} 那天沒寫支援班`
                                : `${getStoreName(group.atStore)} 這個月還沒匯入`}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
    )
  }
}

export default SupportResolutionPanel
