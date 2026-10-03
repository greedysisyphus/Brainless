import { useShiftMatch } from './useShiftPanels'
import { formatDateShort } from '../../pages/shifts/shiftModel'
import { MATCH_CONDITIONS, describeDayStatus } from '../../pages/shifts/shiftMatch'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { CwBadge, CwCard, CwSelect } from '../studio/ui'
import { PersonOptionGroups, shiftSwatchStyle } from './shiftUi'

/**
 * 找日子：挑幾個人、各自設條件（上班／休假／下午有空…），列出從今天起湊得最齊的日子。
 * 只看今天以後 —— 要約的是還沒到的日子。
 */
export function ShiftMatchPanel({ book, peopleGroups, onSelectDate }) {
  const { nameByKey, wants, setWants, days, fullCount, shown, update } = useShiftMatch(book)

  return (
    // 桌機左邊設條件、右邊看結果，改條件時結果就在眼前；手機上下疊
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <CwCard title="找日子" subtitle="挑幾位同事、各自設條件，找出從今天起最多人對得上的日子。">
        <div className="space-y-2">
          {wants.map((want, index) => (
            <div key={want.personKey} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--cw-text)]">
                {nameByKey[want.personKey]}
              </span>
              <CwSelect
                name={`match-condition-${want.personKey}`}
                aria-label={`${nameByKey[want.personKey]} 的條件`}
                className="w-40 shrink-0"
                value={want.condition}
                onChange={(event) => update(index, { condition: event.target.value })}
              >
                {MATCH_CONDITIONS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </CwSelect>
              <button
                type="button"
                aria-label={`移除 ${nameByKey[want.personKey]}`}
                onClick={() => setWants(wants.filter((_, i) => i !== index))}
                className="cw-touch-target grid h-11 w-11 shrink-0 place-items-center rounded-[var(--cw-radius)] text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)] hover:text-[var(--cw-text)]"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
          <CwSelect
            name="match-add-person"
            aria-label="加入同事"
            value=""
            onChange={(event) => {
              const personKey = event.target.value
              if (personKey) setWants([...wants, { personKey, condition: 'WORK' }])
            }}
          >
            <option value="">＋ 加入同事…</option>
            <PersonOptionGroups
              groups={peopleGroups.map((g) => ({
                ...g,
                people: g.people.filter((p) => !wants.some((w) => w.personKey === p.key)),
              }))}
            />
          </CwSelect>
        </div>
        <p className="mt-3 text-xs text-[var(--cw-text-muted)]">
          「下午有空」＝休假，或早班、中班（13、14 點下班）。「隔天晚班或休假」＝那天晚上可以玩到凌晨，列出的日期是出去的那一晚。
        </p>
      </CwCard>

      {wants.length ? (
        <CwCard
          title={fullCount ? `${fullCount} 天全部對得上` : '沒有全部對得上的日子'}
          subtitle={fullCount ? '點日期看那天完整的班。' : '下面是最接近的，劃掉的是卡住的人。'}
        >
          {shown.length ? (
            <ul className="-mx-1 divide-y divide-[var(--cw-border)]">
              {shown.map((day) => (
                <li key={day.date}>
                  <button
                    type="button"
                    onClick={() => onSelectDate?.(day.date)}
                    className="flex w-full flex-col gap-1.5 rounded-[var(--cw-radius-sm)] px-1 py-3 text-left hover:bg-[var(--cw-mega-surface)] sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span className="flex shrink-0 items-center gap-2 sm:w-36">
                      <span className="text-sm font-semibold text-[var(--cw-text)]">
                        {formatDateShort(day.date)}
                      </span>
                      <CwBadge tone={day.score === wants.length ? 'success' : 'neutral'}>
                        {day.score}/{wants.length}
                      </CwBadge>
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {day.results.map((r) => (
                        // 班別用跟班表其他地方一樣的顏色（晚班紫、休假灰…），一眼分得出誰是哪種；
                        // 符合與否改用外框／刪除線表示，不再整顆塗綠 —— 全綠就只剩字能分辨
                        <span
                          key={r.personKey}
                          className={`inline-flex items-center gap-1 rounded-[var(--cw-radius-sm)] border py-0.5 pl-1.5 pr-0.5 text-xs ${
                            r.ok
                              ? 'border-[var(--cw-success)]/50 font-semibold text-[var(--cw-text)]'
                              : 'border-transparent text-[var(--cw-text-muted)] line-through opacity-70'
                          }`}
                        >
                          {nameByKey[r.personKey]}
                          <span
                            className="rounded-[3px] px-1 font-semibold"
                            style={
                              r.assignment?.kind === 'WORK'
                                ? shiftSwatchStyle(r.assignment.shift)
                                : shiftSwatchStyle(null)
                            }
                          >
                            {r.nextDay ? <span className="mr-0.5 font-normal opacity-70">隔天</span> : null}
                            {describeDayStatus(r.assignment)}
                          </span>
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--cw-text-muted)]">今天以後的班表裡，沒有任何一天對得上。</p>
          )}
        </CwCard>
      ) : null}
    </div>
  )
}

export default ShiftMatchPanel
