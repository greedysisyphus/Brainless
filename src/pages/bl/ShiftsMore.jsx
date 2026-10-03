import { PersonOptionGroups } from '../../components/shifts/shiftUi'
import { useShiftMatch, useShiftStats } from '../../components/shifts/useShiftPanels'
import { WEEKDAY_LABELS, getStoreName, getStoreShortName } from '../shifts/shiftConstants'
import { parseDateKey } from '../shifts/shiftModel'
import { MATCH_CONDITIONS, describeDayStatus } from '../shifts/shiftMatch'
import { getLeaveDisplay, getShiftDisplay } from '../shifts/shiftVocab'

// 班表的「找日子」與「統計」分頁。算法在 useShiftPanels（跟 Club 版共用），這裡只有畫面。

const KNOWN_TINTS = ['MORNING', 'MID', 'NOON', 'EVENING', 'SUPPORT']
const tintName = (code) => (KNOWN_TINTS.includes(code) ? code : 'OTHER')
export const tintOf = (code) => `var(--${tintName(code)})`
/** 長條用的深一階：淡色票放在米色底上看不出來 */
const deepOf = (code) => `var(--${tintName(code)}-d)`

const Num = ({ value }) => (value ? value : <span className="zero">·</span>)

function Seg({ value, onChange, options, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([key, text]) => (
        <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)}>
          {text}
        </button>
      ))}
    </div>
  )
}

export function MatchPanel({ book, peopleGroups, onSelectDate }) {
  const { nameByKey, wants, setWants, fullCount, shown, update } = useShiftMatch(book)
  return (
    <div className="panel match">
      <section className="block who-wants">
        <h3>
          找日子 <small>挑幾位同事、各自設條件</small>
        </h3>
        {wants.map((want, index) => (
          <div key={want.personKey} className="want">
            <b>{nameByKey[want.personKey]}</b>
            <select aria-label={`${nameByKey[want.personKey]} 的條件`} value={want.condition} onChange={(e) => update(index, { condition: e.target.value })}>
              {MATCH_CONDITIONS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <button type="button" className="round sm" aria-label={`移除 ${nameByKey[want.personKey]}`} onClick={() => setWants(wants.filter((_, i) => i !== index))}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ))}
        <select
          className="add"
          aria-label="加入同事"
          value=""
          onChange={(e) => {
            if (e.target.value) setWants([...wants, { personKey: e.target.value, condition: 'WORK' }])
          }}
        >
          <option value="">＋ 加入同事</option>
          <PersonOptionGroups groups={peopleGroups.map((g) => ({ ...g, people: g.people.filter((p) => !wants.some((w) => w.personKey === p.key)) }))} />
        </select>
        <p className="note">「下午有空」＝休假，或早班、中班。「隔天晚班或休假」＝那天晚上可以玩到凌晨，列出的是出去的那一晚。</p>
      </section>

      <section className="block days" aria-live="polite">
        {wants.length ? (
          <>
            <h3>
              {fullCount ? (
                <>
                  <b className="num">{fullCount}</b> 天全部對得上
                </>
              ) : (
                '沒有全部對得上的日子'
              )}
              <small>{fullCount ? '點日期看那天的班' : '下面是最接近的'}</small>
            </h3>
            {shown.length ? (
              shown.map((day) => {
                const d = parseDateKey(day.date)
                return (
                  <button key={day.date} type="button" className={`day${day.score === wants.length ? ' full' : ''}`} onClick={() => onSelectDate?.(day.date)}>
                    <time>
                      <b className="num">
                        {d.getMonth() + 1}/{d.getDate()}
                      </b>
                      {WEEKDAY_LABELS[d.getDay()]}
                    </time>
                    <span className="score">
                      {day.score}/{wants.length}
                    </span>
                    <span className="ppl">
                      {day.results.map((r) => (
                        <span key={r.personKey} className={r.ok ? '' : 'no'}>
                          {nameByKey[r.personKey]}
                          <i style={{ background: r.assignment?.kind === 'WORK' ? tintOf(r.assignment.shift) : undefined }}>
                            {r.nextDay ? '隔天' : ''}
                            {describeDayStatus(r.assignment)}
                          </i>
                        </span>
                      ))}
                    </span>
                  </button>
                )
              })
            ) : (
              <p className="note first">今天以後的班表裡，沒有任何一天對得上。</p>
            )}
          </>
        ) : (
          <p className="hint">先在左邊加入同事，這裡會列出從今天起最多人對得上的日子。</p>
        )}
      </section>
    </div>
  )
}

function SortTh({ k, m, title, className = '', children }) {
  const active = m.sort.key === k
  return (
    <th scope="col" className={className} title={title} aria-sort={active ? (m.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className={active ? 'on' : ''} onClick={() => m.toggleSort(k)}>
        {children}
        <span aria-hidden="true">{active && m.sort.dir === 'asc' ? '▲' : '▼'}</span>
      </button>
    </th>
  )
}

export function StatsPanel({ book, peopleSettings, selectedPersonKey, onSelectPerson }) {
  const m = useShiftStats({ book, peopleSettings, selectedPersonKey })
  const { distribution, vocabMonth, selectedSummary, partnerView, metricView } = m
  const label = (code) => getShiftDisplay(vocabMonth, code)?.label ?? code

  if (!book.months.length) {
    return (
      <div className="empty">
        <p>還沒有可統計的班表</p>
        匯入至少一份班表後，這裡會出現班別分布、各店出勤與搭班頻率。
      </div>
    )
  }

  return (
    <div className="panel stats">
      <div className="gridbar">
        <select aria-label="月份" value={m.monthFilter} onChange={(e) => m.setMonthFilter(e.target.value)}>
          <option value="all">全部月份</option>
          {book.monthKeys.map((key) => (
            <option key={key} value={key}>
              {key.replace('-', ' 年 ')} 月
            </option>
          ))}
        </select>
        <span className="note">
          {m.excludeKeys.length ? `已排除 ${m.excludeKeys.length} 人` : '所有同事都列入'}　調店與支援算在實際上班的那家店
        </span>
      </div>

      <div className="pair">
        <section className="block">
          <h3>
            班別分布
            <small>
              合計 <b>{distribution.total}</b> 個班
            </small>
          </h3>
          {m.distributionCodes.length ? (
            m.distributionCodes.map((code) => {
              const count = distribution.counts[code] || 0
              return (
                <div key={code} className="dist">
                  <span className="chip" style={{ background: tintOf(code) }}>
                    {label(code)}
                  </span>
                  <p className="track">
                    <i style={{ width: `${(count / distribution.total) * 100}%`, background: deepOf(code) }} />
                  </p>
                  <b className="num">{count}</b>
                  <span>{Math.round((count / distribution.total) * 100)}%</span>
                </div>
              )
            })
          ) : (
            <p className="note first">這個範圍沒有排到班。</p>
          )}
          {distribution.unknownSupport ? <p className="note">另有 {distribution.unknownSupport} 個支援班紙本沒寫班別，未計入。</p> : null}
        </section>

        <section className="block">
          <h3>
            各店出勤 <small>人次含跨店支援進來的班</small>
          </h3>
          {m.storeLoad.map((store) => (
            <div key={store.storeCode} className="load-row">
              <span>{store.storeName}</span>
              <small>
                {store.headcount} 人{store.supportShifts ? `・支援 ${store.supportShifts}` : ''}
              </small>
              <b className="num">{store.shifts}</b>
              <i>人次</i>
            </div>
          ))}
        </section>
      </div>

      <section className="block partners">
        <h3>
          搭班頻率
          <small>{partnerView === 'rate' ? '你上班的日子有幾成跟他同店，逐月平均' : '實際重疊的時數'}</small>
        </h3>
        <div className="ctl">
          <select aria-label="選一位同事" value={selectedPersonKey || ''} onChange={(e) => onSelectPerson(e.target.value || null)}>
            <option value="">選一位同事</option>
            <PersonOptionGroups groups={m.peopleGroups} />
          </select>
          <Seg
            label="搭班的算法"
            value={partnerView}
            onChange={m.setPartnerView}
            options={[
              ['rate', '每月平均'],
              ['hours', '總時數'],
            ]}
          />
        </div>
        {!selectedPersonKey ? (
          <p className="note first">選一位同事，或直接點下面表格裡的姓名。</p>
        ) : m.partners.length === 0 ? (
          <p className="note first">這個範圍內沒有搭到班的紀錄。</p>
        ) : (
          <div className="ptable">
            <div className="hd" aria-hidden="true">
              <span>同事</span>
              <span />
              <span>搭班</span>
              <span>時數</span>
              <span>天數</span>
              <span>同班別</span>
            </div>
            {m.rankedPartners.slice(0, 15).map((p) => {
              const handover = p.overlapMinutes === 0 && p.days > 0
              return (
                <div key={p.personKey} className="row">
                  <button type="button" onClick={() => onSelectPerson(p.personKey)}>
                    {p.name}
                  </button>
                  <p className="track">
                    <i style={{ width: `${((partnerView === 'hours' ? p.overlapMinutes : p.monthlyRate) / m.partnerMax) * 100}%` }} />
                  </p>
                  <span className={partnerView === 'rate' ? 'lead' : ''}>{Math.round(p.monthlyRate * 100)}%</span>
                  {/* 0 小時不是壞掉：中班 14:00 下班、晚班 14:00 上班，剛好接在一起 */}
                  <span className={partnerView === 'hours' ? 'lead' : ''} title={handover ? '那天兩人都有班，但一個下班另一個才上班' : undefined}>
                    {handover ? '交班' : p.overlapHours}
                  </span>
                  <span>{p.days}</span>
                  <span>{p.sameShiftDays}</span>
                </div>
              )
            })}
          </div>
        )}
        {selectedSummary?.positions?.length ? (
          <p className="posn">
            <span>{selectedSummary.name} 站過的崗位</span>
            {selectedSummary.positions.map((x) => (
              <i key={`${x.storeCode}-${x.position}`}>
                {getStoreName(x.storeCode)}・{x.label} <b>{x.count}</b>
              </i>
            ))}
          </p>
        ) : null}
      </section>

      <section className="block everyone">
        <h3>
          每個人的班 <small>點姓名看他的搭班頻率</small>
        </h3>
        <div className="ctl">
          <div className="pills" role="group" aria-label="分店">
            {[{ storeCode: 'all', storeName: '全部', people: m.summaries }, ...m.peopleGroups].map((g) => (
              <button key={g.storeCode || 'none'} type="button" aria-pressed={m.storeFilter === g.storeCode} onClick={() => m.setStoreFilter(g.storeCode)}>
                {g.storeName} <small>{g.people.length}</small>
              </button>
            ))}
          </div>
          <Seg
            label="看班別或假別"
            value={metricView}
            onChange={m.setMetricView}
            options={[
              ['shift', '班別'],
              ['leave', '假別'],
            ]}
          />
        </div>
        <div className="scroll people">
          <table>
            <thead>
              <tr>
                <SortTh k="name" m={m} className="name">
                  同事
                </SortTh>
                <SortTh k="workDays" m={m}>
                  上班
                </SortTh>
                {metricView === 'shift' ? (
                  <>
                    <th scope="col" className="mix">
                      班別比重
                    </th>
                    {m.shownShiftCodes.map((code) => (
                      <SortTh key={code} k={`shift:${code}`} m={m} title={label(code)}>
                        {getShiftDisplay(vocabMonth, code)?.short ?? code}
                      </SortTh>
                    ))}
                    {m.hasSupport ? (
                      <SortTh k="supportDays" m={m} className="sep" title="在別家店上班的班數">
                        支援
                      </SortTh>
                    ) : null}
                    <SortTh k="leaveDays" m={m} className="sep">
                      休假
                    </SortTh>
                  </>
                ) : (
                  <>
                    <SortTh k="leaveDays" m={m} title="所有假別加總">
                      合計
                    </SortTh>
                    {m.shownLeaveCodes.map((code) => (
                      <SortTh key={code} k={`leave:${code}`} m={m}>
                        {getLeaveDisplay(vocabMonth, code)?.label ?? code}
                      </SortTh>
                    ))}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {m.visibleSummaries.map((s) => {
                const segs = m.shownShiftCodes.filter((code) => s.byShift[code] > 0)
                return (
                  <tr key={s.personKey} className={s.personKey === selectedPersonKey ? 'sel' : ''}>
                    <th scope="row" className="name">
                      <button type="button" onClick={() => onSelectPerson(s.personKey)}>
                        {s.name}
                        <small>
                          {Object.entries(s.byStore || {})
                            .sort((a, b) => b[1] - a[1])
                            .map(([code]) => getStoreShortName(code))
                            .join(' · ')}
                        </small>
                      </button>
                    </th>
                    <td className="strong">
                      <Num value={s.workDays} />
                    </td>
                    {metricView === 'shift' ? (
                      <>
                        <td className="mix">
                          {segs.length ? (
                            <p style={{ width: `${Math.max(12, (s.workDays / m.maxWorkDays) * 100)}%` }} title={segs.map((code) => `${label(code)} ${s.byShift[code]}`).join('、')}>
                              {segs.map((code) => (
                                <i key={code} style={{ width: `${(s.byShift[code] / s.workDays) * 100}%`, background: deepOf(code) }} />
                              ))}
                            </p>
                          ) : null}
                        </td>
                        {m.shownShiftCodes.map((code) => (
                          <td key={code}>
                            <Num value={s.byShift[code]} />
                          </td>
                        ))}
                        {m.hasSupport ? (
                          <td className="sep">
                            <Num value={s.supportDays} />
                          </td>
                        ) : null}
                        <td className="sep">
                          <Num value={s.leaveDays} />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="strong">
                          <Num value={s.leaveDays} />
                        </td>
                        {m.shownLeaveCodes.map((code) => (
                          <td key={code}>
                            <Num value={s.byLeave[code]} />
                          </td>
                        ))}
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="note">
          {metricView === 'shift' ? '「支援」是去別家店上的班，已計入上班天數。' : '「排班日」是店長的排班日，不上班，計入休假。沒人請過的假別不列出來。'}
          {m.storeFilter !== 'all' ? `　只看 ${getStoreName(m.storeFilter)}（${m.visibleSummaries.length} 人），在兩家店都有班的人兩邊都會出現。` : ''}
        </p>
      </section>
    </div>
  )
}
