import { Fragment } from 'react'
import { PersonOptionGroups } from '../../components/shifts/shiftUi'
import { usePeopleSettings, usePickupExceptions, usePickupExport, useShiftImport, useSupportGroups } from '../../components/shifts/useShiftPanels'
import {
  CAR_LABELS,
  CAR_SHIFTS,
  EXPORT_RANGES,
  NO_PICKUP,
  PICKUP_OPTIONS,
  UNSET_PICKUP,
  driverStopName,
  getStore,
  getStoreName,
  getStoreShortName,
  stopTime,
} from '../shifts/shiftConstants'
import { formatDateShort, formatTimestamp, groupPeopleByStore } from '../shifts/shiftModel'
import { SUPPORT_STATUS, SUPPORT_STATUS_LABELS } from '../shifts/shiftSupport'
import { getShiftDisplay } from '../shifts/shiftVocab'
import { tintOf } from './ShiftsMore'

// 班表的「支援班」「同事與上車」「匯入」分頁。這三頁會寫進 Firebase；
// 寫入與算法都在 useShiftPanels 和 Shifts.jsx 傳進來的 onChange／onSave（跟 Club 版共用），這裡只有畫面。

const Chevron = () => (
  <svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
)
const Cross = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

const SOURCE_LABELS = { visitor: '目的店寫明', visitorNarrowed: '候選×當天交集', sheet: '紙本寫明', manual: '手動指定' }

/* ───────── 支援班 ───────── */

export function SupportPanel({ months, links, onChangeLink, saving }) {
  const { groups, pending, settled, carRisks, monthByStore } = useSupportGroups(months, links)

  if (!months.length) {
    return (
      <div className="empty">
        <p>還沒有班表可以配對</p>
        匯入班表後，跨店支援班會在這裡等你確認是哪一班。
      </div>
    )
  }
  if (!groups.length) {
    return (
      <div className="empty">
        <p>目前沒有跨店支援班</p>
        來源店寫「T3」或「D7」時會出現在這裡，等你指定那天實際是哪一班。
      </div>
    )
  }

  const renderGroup = (group) => {
    const destMonth = monthByStore.get(`${group.monthKey}|${group.atStore}`)
    const risky = group.slots.some((slot) => !slot.takenBy && CAR_SHIFTS.includes(slot.shift))
    const mm = group.visitorMismatches
    return (
      <li key={group.id} className={`grp${group.needsAttention ? ' todo' : ''}`}>
        <p className="gh">
          <b className="num">{formatDateShort(group.date)}</b>
          <span>{group.atStore ? `支援 ${getStoreName(group.atStore)}` : '支援（未註明去哪家店）'}</span>
          <em className={group.status === SUPPORT_STATUS.RESOLVED ? 'ok' : group.status === SUPPORT_STATUS.EXTRA_SLOT ? '' : 'warn'}>{SUPPORT_STATUS_LABELS[group.status]}</em>
          {risky ? <em className="warn">可能要坐車</em> : null}
        </p>
        {mm?.length ? (
          <p className="why">
            {getStoreName(group.atStore)} 的備註原文寫「{mm.map((x) => x.visitor).join('、')}」
            {mm.some((x) => x.ambiguous)
              ? `，比對名單後可能是「${mm.flatMap((x) => x.candidates).join('／')}」，但跟當天實際去支援的人取交集後仍不只一個`
              : `，但當天說要去支援的是「${mm.flatMap((x) => x.candidates).join('、')}」`}
            —— 沒有硬湊，班別改由下面的規則推得。
          </p>
        ) : null}
        {group.claims.length === 0 ? (
          <p className="why">
            {getStoreName(group.atStore)} 那天有{group.slots.map((slot) => getShiftDisplay(destMonth, slot.shift)?.label).join('、')}的支援班
            {group.unclaimedVisitors?.length
              ? `，${getStoreName(group.atStore)} 寫的是「${group.unclaimedVisitors.join('、')}」，但那個人所屬店的班表還沒匯入。`
              : '，但沒有任何一家店寫是誰去。要嘛來源店漏寫，要嘛那格判讀錯了。'}
          </p>
        ) : (
          group.claims.map((claim) => {
            const slot = group.slots.find((s) => s.slotId === claim.slotId)
            const shift = slot?.shift || claim.resolvedShift
            return (
              <div key={claim.personKey} className="claim">
                <b>{claim.name}</b>
                <small>
                  自 {getStore(claim.homeStore)?.short ?? claim.homeStore}・紙本寫「{claim.raw || 'T3'}」
                </small>
                {claim.resolvedShift ? (
                  <>
                    <span className="chip" style={{ background: tintOf(shift) }}>
                      {getShiftDisplay(destMonth, shift)?.label ?? shift}
                      {slot?.start ? <i> {slot.start}</i> : null}
                    </span>
                    {/* 備註原文跟定案的人不一樣＝那個名字是推出來的，把原文標出來才查得回去 */}
                    {slot?.visitor && slot.visitor !== claim.personKey ? (
                      <em className="warn" title={`目的店備註原文寫「${slot.visitor}」，比對後定為 ${claim.personKey}`}>
                        原文「{slot.visitor}」
                      </em>
                    ) : null}
                    <small className={claim.source === 'manual' ? 'manual' : ''}>{SOURCE_LABELS[claim.source] || '自動對上'}</small>
                  </>
                ) : (
                  <em className="warn">班別未定</em>
                )}
                <span className="act">
                  {claim.declaredShift ? (
                    <small>紙本已指定，不需配對</small>
                  ) : group.slots.length ? (
                    <select
                      aria-label={`${claim.name} ${formatDateShort(group.date)} 的班別`}
                      value={claim.slotId || ''}
                      onChange={(e) => onChangeLink({ monthKey: group.monthKey, date: group.date, atStore: group.atStore, personKey: claim.personKey, slotId: e.target.value })}
                    >
                      <option value="">未指定</option>
                      {group.slots.map((s) => {
                        const taken = s.takenBy && s.takenBy !== claim.personKey
                        return (
                          <option key={s.slotId} value={s.slotId} disabled={taken}>
                            {getShiftDisplay(destMonth, s.shift)?.label ?? s.shift}
                            {s.start ? ` ${s.start}–${s.end}` : ''}
                            {taken ? `（已給 ${s.takenBy}）` : ''}
                          </option>
                        )
                      })}
                    </select>
                  ) : (
                    <small>
                      {!group.atStore ? '紙本只寫一個「支」，沒寫去哪家店' : group.destinationImported ? `${getStoreName(group.atStore)} 那天沒寫支援班` : `${getStoreName(group.atStore)} 這個月還沒匯入`}
                    </small>
                  )}
                </span>
              </div>
            )
          })
        )}
      </li>
    )
  }

  return (
    <div className="panel support">
      {carRisks.length ? (
        <div className="warnbox" role="alert">
          <b>有支援班可能要坐交通車，但還沒對上</b>
          <ul>
            {carRisks.map((group) => (
              <li key={group.id}>
                {formatDateShort(group.date)} 支援 {getStoreName(group.atStore)}：
                {group.claims
                  .filter((claim) => !claim.slotId)
                  .map((claim) => claim.name)
                  .join('、')}
                {group.unknownShift ? '（目的店班表還沒匯入，班別不明）' : `（那天有${group.riskyShifts.map((shift) => CAR_LABELS[shift] || shift).join('、')}沒人認領）`}
              </li>
            ))}
          </ul>
          <p>早班 04:30、中班 05:30 到店都要坐車。沒對上班別的人不會出現在交通車名單，請在下面指定，或確認他們自行前往。</p>
        </div>
      ) : null}

      <section className="block">
        <h3>
          支援班配對
          <small>
            {pending.length ? (
              <>
                <b>{pending.length}</b> 天待確認
              </>
            ) : (
              '全部對上了'
            )}
            {saving ? '・同步中…' : ''}
          </small>
        </h3>
        {pending.length ? <ul className="grps">{pending.map(renderGroup)}</ul> : null}
        {settled.length ? (
          <details className="fold">
            <summary>
              已對上的 <b className="num">{settled.length}</b> 天 <small>要改配對再展開</small>
              <Chevron />
            </summary>
            <ul className="grps">{settled.map(renderGroup)}</ul>
          </details>
        ) : null}
        <p className="note">來源店只寫了「誰」去支援，目的店只寫了「什麼班」，在這裡把兩邊對起來。對上之後，那個班會照目的店的時間算，也會自動進交通車名單與統計。配對結果存在 Firebase，重新匯入同一個月的班表不會清掉。</p>
      </section>
    </div>
  )
}

/* ───────── 同事與上車：匯出 ───────── */

const riderText = (rider) => `${rider.name}（${getStoreShortName(rider.workStore)}${rider.isSupport ? '·支援' : ''}）`

export function PickupPanel({ book, pickupByPerson, defaultDate, supportWarning }) {
  const m = usePickupExport({ book, pickupByPerson, defaultDate, background: '#f6f1e7' })
  const { range, table, forDriver } = m
  return (
    <section className="block pickup">
      <h3>
        匯出上車地點 <small>早班車與中班車的上車名單</small>
      </h3>
      <div className="ctl top">
        <div className="pills" role="group" aria-label="給誰看">
          <button type="button" aria-pressed={!forDriver} onClick={() => m.setAudience('store')}>
            店內版 <small>含姓名</small>
          </button>
          <button type="button" aria-pressed={forDriver} onClick={() => m.setAudience('driver')}>
            司機版 <small>只有人數</small>
          </button>
        </div>
        <div className="pills" role="group" aria-label="範圍">
          {EXPORT_RANGES.map((o) => (
            <button key={o.key} type="button" aria-pressed={m.rangeKey === o.key} onClick={() => m.setRangeKey(o.key)}>
              {o.label}
            </button>
          ))}
        </div>
        <label className="jump">
          <span>{m.rangeKey === 'month' ? '月份內任一天' : '起始日'}</span>
          <input type="date" value={m.startDate} onChange={(e) => m.setStartDate(e.target.value)} />
        </label>
      </div>
      <div className="ctl outs">
        <span className="rng">{range.from ? `${formatDateShort(range.from)} ～ ${formatDateShort(range.to)}` : '請選日期'}</span>
        <button type="button" className="btn" onClick={m.handleCopy}>
          複製文字
        </button>
        <button type="button" className="btn" onClick={m.handleDownloadText}>
          文字檔
        </button>
        <button type="button" className="btn" onClick={m.handleDownloadTsv}>
          表格檔
        </button>
        <button type="button" className="btn pri" onClick={m.handleDownloadImage} disabled={m.busy}>
          {m.busy ? '產生中…' : '圖檔'}
        </button>
      </div>

      {supportWarning}
      {m.missing.length ? (
        <p className="alert soft">
          還沒設定上車地點：{m.missing.map((person) => `${person.name}（${person.days} 天）`).join('、')}，名單裡會先列在「{UNSET_PICKUP}」。
        </p>
      ) : null}
      {m.status ? (
        <p className={`alert ${m.status.variant === 'error' ? '' : 'good'}`} role="status">
          {m.status.message}
        </p>
      ) : null}

      {!table.dates.length ? (
        <p className="note first">請先選擇日期範圍。</p>
      ) : !table.hasRiders ? (
        <p className="note first">這段期間沒有人要坐交通車。</p>
      ) : (
        <div className="sheet-wrap">
          {/* 這一塊就是圖檔的內容 */}
          <div ref={m.tableRef} className="sheet">
            <p className="ttl">
              {forDriver ? '交通車接送表' : '交通車上車名單'}
              <small>
                {formatDateShort(range.from)} ～ {formatDateShort(range.to)}
              </small>
            </p>
            <table>
              <thead>
                <tr>
                  <th>車次</th>
                  <th>上車地點</th>
                  {table.dates.map((date) => (
                    <th key={date.dateKey} className={date.isWeekend ? 'we' : ''}>
                      {date.day}（{date.weekday}）{date.holiday ? <small>{date.holiday}</small> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.sections.map((section) => (
                  <Fragment key={section.shift}>
                    {section.rows.map((row, rowIndex) => (
                      <tr key={`${section.shift}-${row.location}`}>
                        {rowIndex === 0 ? (
                          <th rowSpan={section.rows.length + 1} className="car">
                            {forDriver ? section.ordinalLabel : section.label}
                            {forDriver ? <small>{section.label}</small> : null}
                          </th>
                        ) : null}
                        <th className={row.location === UNSET_PICKUP ? 'unset' : ''}>
                          {forDriver ? driverStopName(row.location) : row.location}
                          {stopTime(row.location, section.shift) ? <small>{stopTime(row.location, section.shift)}</small> : null}
                        </th>
                        {row.cells.map((cell) => (
                          <td key={cell.dateKey}>
                            {!cell.riders.length ? <span className="zero">—</span> : forDriver ? <b>{cell.riders.length}</b> : cell.riders.map((rider) => <div key={rider.personKey}>{riderText(rider)}</div>)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="sub">
                      <th>小計</th>
                      {section.totals.map((total, index) => (
                        <td key={table.dates[index].dateKey}>{total}</td>
                      ))}
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
            <p className="foot">早班車 04:00 發車、04:30 到店；中班車 05:00 發車、05:30 到店。兩台車分開，{forDriver ? '數字為該站要接的人數。' : '括號為當天上班的店。'}</p>
          </div>
        </div>
      )}
      <p className="note">
        {forDriver ? '司機版不含任何同事姓名，只有站點與人數。' : '店內版含姓名與當天上班的店。'}文字適合貼進群組；表格檔（.tsv）可貼進試算表；圖檔就是上面這張表。
      </p>
    </section>
  )
}

/* ───────── 同事與上車：同事設定 ───────── */

function Exceptions({ person, settings, onChange, today }) {
  const x = usePickupExceptions({ person, settings, onChange, today })
  return (
    <div className="exc">
      <p className="lab">特定日期例外</p>
      {x.upcoming.length ? (
        <ul>
          {x.upcoming.map(([day, value]) => (
            <li key={day}>
              <b>{formatDateShort(day)}</b>
              {value}
              <button type="button" aria-label={`刪除 ${day} 的例外`} onClick={() => x.remove(day)}>
                <Cross />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dim">還沒有例外，平常都照上面的設定。</p>
      )}
      <div className="row">
        <label>
          <span>日期</span>
          <input type="date" value={x.date} min={today} onChange={(e) => x.setDate(e.target.value)} />
        </label>
        <label>
          <span>到（可留空）</span>
          <input type="date" value={x.until} min={x.date || today} onChange={(e) => x.setUntil(e.target.value)} />
        </label>
        <label>
          <span>那幾天</span>
          <select value={x.location} onChange={(e) => x.setLocation(e.target.value)}>
            {PICKUP_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn" onClick={x.add} disabled={!x.days.length}>
          {x.days.length > 1 ? `新增 ${x.days.length} 天` : '新增例外'}
        </button>
      </div>
      {x.past ? <p className="dim">另有 {x.past} 筆已過期的例外沒有列出（資料留著，不影響往後的名單）。</p> : null}
    </div>
  )
}

export function PeoplePanel({ rawPeople, identity, peopleSettings, months, onChange, saving }) {
  const m = usePeopleSettings({ rawPeople, identity, peopleSettings, months, onChange })
  return (
    // 設定好就很少再動，預設收起來；有人沒設上車地點時自動打開
    <details className="fold people-set" open={m.open} onToggle={(e) => m.setOpen(e.currentTarget.open)}>
      <summary>
        <span className="t">同事設定</span>
        <span className="counts">
          {Object.entries(m.counts).map(([location, count]) => (
            <i key={location} className={location === '未設定' && count > 0 ? 'warn' : ''}>
              {location} <b>{count}</b>
            </i>
          ))}
        </span>
        {saving ? <small>同步中…</small> : null}
        <Chevron />
      </summary>

      {m.mergeError ? (
        <p className="alert" role="alert">
          沒有合併：{m.mergeError}
        </p>
      ) : null}
      <div className="ctl">
        <div className="pills" role="group" aria-label="分店">
          {[{ storeCode: 'all', storeName: '全部', people: m.withMergedStores }, ...m.peopleGroups].map((g) => (
            <button key={g.storeCode || 'none'} type="button" aria-pressed={m.storeFilter === g.storeCode} onClick={() => m.setStoreFilter(g.storeCode)}>
              {g.storeName} <small>{g.people.length}</small>
            </button>
          ))}
        </div>
        <input className="search" type="search" aria-label="搜尋姓名或暱稱" placeholder="搜尋姓名或暱稱" value={m.keyword} onChange={(e) => m.setKeyword(e.target.value)} />
      </div>

      {m.visible.length === 0 ? (
        <p className="note first">{rawPeople.length ? (m.storeFilter === 'all' ? '找不到符合的同事。' : `${getStoreName(m.storeFilter)}沒有符合的同事。`) : '匯入班表後才會有同事名單。'}</p>
      ) : (
        <ul className="plist">
          {m.visible.map((person) => {
            const settings = peopleSettings[person.key] || {}
            const aliases = identity.aliasesOf(person.key)
            const open = m.openKey === person.key
            return (
              <li key={person.key} className={open ? 'open' : ''}>
                <div className="prow">
                  <p>
                    <b>{settings.nickname || person.name}</b>
                    {settings.nickname ? <small>（{person.name}）</small> : null}
                    {person.unnamed ? <em className="warn">姓名待確認</em> : null}
                    {aliases.length ? <small>含 {aliases.join('、')}</small> : null}
                    {settings.excludeFromStats ? <small>已排除統計</small> : null}
                  </p>
                  <select className={settings.pickup ? '' : 'unset'} aria-label={`${person.name} 的上車地點`} value={settings.pickup || ''} onChange={(e) => onChange(person.key, { ...settings, pickup: e.target.value })}>
                    <option value="">未設定</option>
                    {PICKUP_OPTIONS.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="more" aria-expanded={open} onClick={() => m.setOpenKey(open ? null : person.key)}>
                    更多
                    <Chevron />
                  </button>
                </div>
                {open ? (
                  <div className="pmore">
                    <label>
                      <span>暱稱</span>
                      <input type="text" placeholder={person.name} value={settings.nickname || ''} onChange={(e) => onChange(person.key, { ...settings, nickname: e.target.value })} />
                      <small>設了之後名單、月視圖與匯出都顯示暱稱</small>
                    </label>
                    <label>
                      <span>合併到另一位同事</span>
                      <select value="" onChange={(e) => m.handleMerge(person.key, e.target.value)}>
                        <option value="">不合併</option>
                        <PersonOptionGroups
                          groups={groupPeopleByStore(m.withMergedStores.filter((other) => other.key !== person.key).map((other) => ({ ...other, storeCodes: m.storeCodesOf(other) })))}
                          labelOf={(other) => `併入 ${peopleSettings[other.key]?.nickname || other.name}`}
                        />
                      </select>
                      <small>兩邊同一天都有班就不會讓你合併</small>
                    </label>
                    <Exceptions person={person} settings={settings} onChange={onChange} today={m.today} />
                    <label className="check">
                      <input type="checkbox" checked={!!settings.excludeFromStats} onChange={(e) => onChange(person.key, { ...settings, excludeFromStats: e.target.checked })} />
                      排除統計
                    </label>
                    {aliases.length ? (
                      <div className="exc">
                        <p className="lab">已合併進來的名字</p>
                        <div className="row">
                          {aliases.map((alias) => (
                            <button key={alias} type="button" className="btn" onClick={() => m.handleMerge(alias, '')}>
                              解除 {alias}
                              {m.rawByKey.get(alias)?.storeCodes?.length ? `（${m.rawByKey.get(alias).storeCodes.map(getStoreName).join('、')}）` : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
      <p className="note">
        選「{NO_PICKUP}」的同事不會出現在交通車名單；「未設定」的人會被標成待補。合併是給同一個人在不同店被寫成不同字時用的，之後班表、統計、搭班與行事曆都會當成同一個人；隨時可以解除。
      </p>
    </details>
  )
}

/* ───────── 匯入 ───────── */

export function ImportPanel({ existingMonths, onSave, saving }) {
  const m = useShiftImport({ existingMonths, onSave })
  const same = (a, b) => a.monthKey === b.monthKey && a.storeCode === b.storeCode
  return (
    <div className="panel import">
      <section className="block">
        <h3>
          匯入班表 <small>Shifts-Convertor 的 JSON 匯出檔，可一次選三家店</small>
        </h3>
        <div
          className="drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            m.handleFiles(e.dataTransfer.files)
          }}
        >
          <p>把 JSON 檔拖進來，或</p>
          <button type="button" className="btn pri" onClick={() => m.fileInputRef.current?.click()}>
            選擇 JSON 檔
          </button>
          <input
            ref={m.fileInputRef}
            type="file"
            accept="application/json,.json"
            multiple
            hidden
            onChange={(e) => {
              m.handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <small>
            店別與月份由檔案本身決定，不必手動選。完整的 .json 與 .flat.json 都能吃；有完整版時建議用它，flat 沒有國定假日與轉檔警告。
          </small>
        </div>
        <details className="fold paste">
          <summary>
            改用貼上 JSON
            <Chevron />
          </summary>
          <textarea aria-label="JSON 內容" rows={6} value={m.pasteText} onChange={(e) => m.setPasteText(e.target.value)} placeholder='{ "store": { "code": "central" }, ... }' />
          <button type="button" className="btn" onClick={m.handlePaste}>
            解析貼上的內容
          </button>
        </details>
        {m.errors.length ? (
          <div className="alert" role="alert">
            有檔案讀不進來
            <ul>
              {m.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {m.result ? (
          <p className="alert good" role="status">
            {m.result}
          </p>
        ) : null}
      </section>

      {m.pending.length ? (
        <section className="block">
          <h3>
            待儲存 <b className="num">{m.pending.length}</b> 份<small>同月同店會覆蓋既有資料</small>
            <button type="button" className="btn pri" onClick={m.handleSave} disabled={saving}>
              {saving ? '同步中…' : '同步到 Firebase'}
            </button>
          </h3>
          <ul className="pend">
            {m.pending.map((item) => {
              const existing = existingMonths.find((month) => same(month, item.month))
              // flat 蓋掉完整版會靜靜地弄丟國定假日與轉檔警告
              const downgrades = !!existing && item.month.source?.format === 'flat' && existing.source?.format !== 'flat'
              return (
                <li key={`${item.month.monthKey}_${item.month.storeCode}`}>
                  <div>
                    <p className="gh">
                      <b>
                        {getStoreName(item.month.storeCode)}・{item.month.year} 年 {item.month.month} 月
                      </b>
                      <em className={existing ? 'warn' : 'ok'}>{downgrades ? '會覆蓋掉完整版' : existing ? '將覆蓋既有資料' : '新增'}</em>
                      {item.month.source?.format === 'flat' ? <em>flat</em> : null}
                      {item.summary.linked ? <em className="ok">已含轉換器對照 {item.summary.linked} 格</em> : null}
                      {item.summary.needsReview ? <em className="warn">{item.summary.needsReview} 格待確認</em> : null}
                    </p>
                    <p className="dim">
                      {item.label}・{item.summary.headcount} 位同事・上班 {item.summary.work} 格・休假 {item.summary.leave} 格
                    </p>
                    {downgrades ? <p className="bad">這個月這家店已經有完整 .json 的資料。用 flat 覆蓋會弄丟國定假日與轉檔警告，確定要蓋過去再同步。</p> : null}
                    {item.month.warnings?.length ? (
                      <ul className="warns">
                        {item.month.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <button type="button" className="round sm" aria-label="移除" onClick={() => m.setPending((prev) => prev.filter((p) => !same(p.month, item.month)))}>
                    <Cross />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <section className="block">
        <h3>
          已同步的班表 <small>存在 Firebase，三家店與各月份共用</small>
        </h3>
        {existingMonths.length === 0 ? (
          <p className="note first">還沒有任何資料。</p>
        ) : (
          <ul className="synced">
            {existingMonths.map((month) => (
              <li key={`${month.monthKey}_${month.storeCode}`}>
                <b>
                  <span className="num">
                    {month.year}/{month.month}
                  </span>
                  {getStoreName(month.storeCode)}
                </b>
                <small>
                  {(month.people || []).filter((p) => !p.placeholder).length} 位同事
                  {month.importedAt ? `・同步於 ${formatTimestamp(month.importedAt)}` : ''}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
