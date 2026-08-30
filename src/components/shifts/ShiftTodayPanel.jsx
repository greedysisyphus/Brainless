import { useMemo } from 'react'
import { UserGroupIcon } from '@heroicons/react/24/outline'
import { CwBadge, CwCard, CwEmptyState } from '../studio/ui'
import {
  CAR_DEPARTURE,
  CAR_LABELS,
  CAR_SHIFTS,
  SHIFT_META,
  UNSET_PICKUP,
  getStore,
  getStoreShortName,
} from '../../pages/shifts/shiftConstants'
import { getShiftDisplay } from '../../pages/shifts/shiftVocab'
import {
  formatDateShort,
  getCarLists,
  getCrossStoreMoves,
  getDayAssignments,
  getWorkingAssignments,
  groupWorkingByStore,
  getMonthsForDate,
} from '../../pages/shifts/shiftModel'
import { ShiftPill, PositionTag, ShuttleBusIcon } from './shiftUi'

function HolidayNote({ book, dateKey }) {
  const note = useMemo(() => {
    for (const month of getMonthsForDate(book, dateKey)) {
      if (month.holidays?.[dateKey]) return month.holidays[dateKey]
    }
    return ''
  }, [book, dateKey])
  if (!note) return null
  return <CwBadge tone="brand">{note}</CwBadge>
}

/** 姓名靠左、崗位靠右 —— 崗位對齊成一欄才掃得動，不然每列長度不一會很亂。 */
function PersonLine({ person, month }) {
  const flags = [
    person.isSupport ? `支援自${getStore(person.homeStore)?.short ?? person.homeStore}` : null,
    person.shiftUnknown ? '紙本沒寫班別' : null,
    person.shiftInferred ? '班別推測' : null,
    person.needsReview ? '待確認' : null,
  ].filter(Boolean)

  return (
    <li className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="min-w-0 truncate font-semibold text-[var(--cw-text)]">{person.name}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        {flags.length ? (
          <CwBadge tone="warning" title={flags.join(' · ')}>
            {flags[0]}
          </CwBadge>
        ) : null}
        <PositionTag month={month} position={person.position} />
      </span>
    </li>
  )
}

export function ShiftTodayPanel({ book, dateKey, pickupByPerson, onOpenPickupSettings }) {
  const monthsForDate = getMonthsForDate(book, dateKey)
  const monthByStore = useMemo(() => {
    const map = {}
    monthsForDate.forEach((month) => {
      map[month.storeCode] = month
    })
    return map
  }, [monthsForDate])

  const working = useMemo(() => getWorkingAssignments(book, dateKey), [book, dateKey])
  const byStore = useMemo(() => groupWorkingByStore(working), [working])
  const cars = useMemo(
    () => getCarLists(book, dateKey, pickupByPerson),
    [book, dateKey, pickupByPerson]
  )
  const onLeave = useMemo(
    () => getDayAssignments(book, dateKey).filter((a) => a.kind === 'LEAVE'),
    [book, dateKey]
  )
  const crossStoreMoves = useMemo(() => getCrossStoreMoves(book, dateKey), [book, dateKey])

  if (!monthsForDate.length) {
    return (
      <CwEmptyState
        title={`${formatDateShort(dateKey)} 沒有班表資料`}
        description="這個月份還沒有匯入任何一家店的班表。到「匯入」分頁上傳轉換器的 JSON 匯出檔即可。"
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* 交通車是最有時效性的資訊（早班 04:30 到店），所以排在名單之前 */}
      <CwCard
        title={`${formatDateShort(dateKey)} 誰坐交通車`}
        subtitle="早班車與中班車分開算；午班與晚班不排交通車。"
        actions={<HolidayNote book={book} dateKey={dateKey} />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {cars.map((car) => {
            const unset = car.groups.find((group) => group.location === UNSET_PICKUP)
            return (
              <div
                key={car.shift}
                className="rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-mega-surface)] p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-baseline gap-2 font-bold text-[var(--cw-text)]">
                    <ShuttleBusIcon className="h-5 w-5 shrink-0 self-center text-[var(--cw-brand)]" />
                    {CAR_LABELS[car.shift]}
                    <span className="text-xs font-semibold tabular-nums text-[var(--cw-brand-strong)]">
                      {CAR_DEPARTURE[car.shift]} 發車
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-[var(--cw-text-muted)]">
                    {car.total} 人
                  </span>
                </div>

                {car.groups.length === 0 ? (
                  <p className="text-sm text-[var(--cw-text-muted)]">今天沒有人要坐這班車。</p>
                ) : (
                  <ul className="divide-y divide-[var(--cw-border)]">
                    {car.groups.map((group) => {
                      const unset = group.location === UNSET_PICKUP
                      return (
                        <li key={group.location} className="grid grid-cols-[auto_1fr] gap-x-3 py-1.5 text-sm">
                          <span
                            className={`flex items-baseline gap-1 whitespace-nowrap font-semibold ${
                              unset ? 'text-[var(--cw-warning)]' : 'text-[var(--cw-text)]'
                            }`}
                          >
                            {group.location}
                            <span className="text-xs font-normal tabular-nums text-[var(--cw-text-muted)]">
                              {group.riders.length}
                            </span>
                          </span>
                          <span className="text-[var(--cw-text-muted)]">
                            {group.riders
                              .map(
                                (rider) =>
                                  `${rider.name}（${getStoreShortName(rider.workStore)}${
                                    rider.isSupport ? '·支援' : ''
                                  }）`
                              )
                              .join('、')}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {car.skipped.length || unset ? (
                  <div className="mt-3 space-y-1.5 border-t border-[var(--cw-border)] pt-2 text-xs text-[var(--cw-text-muted)]">
                    {car.skipped.length ? (
                      <p>不搭車：{car.skipped.map((a) => a.name).join('、')}</p>
                    ) : null}
                    {unset ? (
                      <button
                        type="button"
                        onClick={onOpenPickupSettings}
                        className="cw-touch-target text-left font-semibold text-[var(--cw-text-muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--cw-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
                      >
                        {unset.riders.length} 人還沒設定上車地點 → 去設定
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-xs text-[var(--cw-text-muted)]">
          {CAR_SHIFTS.map((code) => `${CAR_LABELS[code]} ${CAR_DEPARTURE[code]} 發車`).join('、')}
          ；只有{CAR_SHIFTS.map((code) => SHIFT_META[code].label).join('、')}排交通車，
          跨店支援（T3／D7）的同事會算在實際上班的那家店。
        </p>
      </CwCard>

      {crossStoreMoves.length ? (
        <CwCard
          title="列外（跨店）"
          subtitle="紙本寫了但不算在自己店裡的班；避免同一個人被兩邊各算一次。"
        >
          <ul className="space-y-2">
            {crossStoreMoves.map((move) => (
              <li
                key={`${move.fromStore}-${move.personKey}`}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-mega-surface)] px-3 py-2 text-sm"
              >
                <span className="font-semibold text-[var(--cw-text)]">{move.name}</span>
                <span className="text-[var(--cw-text-muted)]">
                  {getStoreShortName(move.fromStore)} →{' '}
                  {move.toStore ? getStoreShortName(move.toStore) : '（紙本沒寫去哪家店）'}
                </span>
                {move.shiftUnknown ? (
                  <CwBadge tone="warning">班別未定</CwBadge>
                ) : (
                  <ShiftPill shift={move.shift} month={monthByStore[move.toStore]} />
                )}
                {move.destinationFrom === 'ownRecord' ? (
                  <CwBadge title="目的店沒寫，是比對「哪家店自己的表上有他這天的班」推得的">
                    推得
                  </CwBadge>
                ) : null}
                <span className="ml-auto text-xs text-[var(--cw-text-muted)]">
                  {move.counted
                    ? `計入 ${move.toStore ? getStoreShortName(move.toStore) : '目的店'} 人力`
                    : '目的店自己已列，這裡不重複計'}
                </span>
              </li>
            ))}
          </ul>
        </CwCard>
      ) : null}

      <CwCard title="誰上班" subtitle={`三家店合計 ${working.length} 人次`}>
        {byStore.length === 0 ? (
          <p className="text-sm text-[var(--cw-text-muted)]">這天沒有人排班。</p>
        ) : (
          <div className="grid items-stretch gap-4 md:grid-cols-3">
            {byStore.map((store) => (
              <div
                key={store.storeCode ?? 'unknown-store'}
                className="flex h-full flex-col rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-mega-surface)] p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-[var(--cw-border-strong)] pb-2">
                  <span className="font-bold text-[var(--cw-text)]">{store.storeName}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--cw-text-muted)]">
                    <UserGroupIcon className="h-4 w-4" />
                    {store.total} 人
                  </span>
                </div>
                <div className="space-y-4">
                  {store.shifts.map((group) => (
                    <div key={group.shift ?? 'other'}>
                      <div className="mb-1 flex items-baseline justify-between gap-2 border-b border-[var(--cw-border)] pb-1">
                        <ShiftPill shift={group.shift} month={monthByStore[store.storeCode]} />
                        {(() => {
                          const display = getShiftDisplay(monthByStore[store.storeCode], group.shift)
                          if (!display?.start || !display?.end) return null
                          return (
                            <span className="text-[11px] tabular-nums text-[var(--cw-text-muted)]">
                              {display.start}–{display.end}
                              {display.crossesMidnight ? '（跨夜）' : ''}
                            </span>
                          )
                        })()}
                      </div>
                      <ul className="pl-0.5">
                        {group.people.map((person) => (
                          <PersonLine
                            key={`${person.personKey}-${person.shift}`}
                            person={person}
                            month={monthByStore[store.storeCode]}
                          />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {onLeave.length ? (
          <div className="mt-4 border-t border-[var(--cw-border)] pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
              休假 {onLeave.length} 人
            </p>
            <div className="flex flex-wrap gap-1.5">
              {onLeave.map((person) => (
                <span
                  key={person.personKey}
                  className="rounded-[var(--cw-radius-sm)] border border-[var(--cw-border)] px-2 py-0.5 text-xs text-[var(--cw-text-muted)]"
                >
                  {person.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </CwCard>

    </div>
  )
}

export default ShiftTodayPanel
