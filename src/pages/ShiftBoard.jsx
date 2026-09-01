import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { DualThemePage } from '../components/studio/DualThemePage'
import { CwAlert, CwButton, CwCard, CwDateInput, CwSelect, CwSkeleton } from '../components/studio/ui'
import ErrorBoundary from '../components/ErrorBoundary'
import { STORES } from './shifts/shiftConstants'
import { addDays, buildShiftBook, groupPeopleByStore, toDateKey } from './shifts/shiftModel'
import { resolveSupportShifts } from './shifts/shiftSupport'
import { applyIdentity, buildIdentity } from './shifts/shiftIdentity'
import {
  pickupMapFrom,
  saveShiftMonth,
  savePersonSettings,
  saveSupportLinks,
  subscribePeopleSettings,
  subscribeShiftMonths,
  subscribeSupportLinks,
} from './shifts/shiftFirestore'
import { listUnresolvedSupport } from './shifts/shiftSupport'
import ShiftTodayPanel from '../components/shifts/ShiftTodayPanel'
import ShiftGrid from '../components/shifts/ShiftGrid'
import { PersonOptionGroups, StoreTabs } from '../components/shifts/shiftUi'

const ShiftStatsPanel = lazy(() => import('../components/shifts/ShiftStatsPanel'))
const PeopleSettingsPanel = lazy(() => import('../components/shifts/PeopleSettingsPanel'))
const PickupExportPanel = lazy(() => import('../components/shifts/PickupExportPanel'))
const ShiftImportPanel = lazy(() => import('../components/shifts/ShiftImportPanel'))
const PersonMonthCalendar = lazy(() => import('../components/shifts/PersonMonthCalendar'))
const SupportResolutionPanel = lazy(() => import('../components/shifts/SupportResolutionPanel'))

const TABS = [
  { key: 'today', label: '今天' },
  { key: 'grid', label: '完整班表' },
  { key: 'stats', label: '統計' },
  { key: 'support', label: '支援班' },
  { key: 'pickup', label: '同事與上車' },
  { key: 'import', label: '匯入' },
]

const BREADCRUMBS = [{ label: 'Brainless', href: '#/sandwich' }, { label: '班表' }]

function PanelFallback() {
  return (
    <div className="space-y-3">
      {/* CwSkeleton 預設底色仍是深色時期的 bg-white/10，在 Club 暖紙上看不見 */}
      <CwSkeleton className="h-8 w-48 bg-[var(--cw-mega-surface)] ring-1 ring-inset ring-[var(--cw-border)]" />
      <CwSkeleton className="h-40 w-full bg-[var(--cw-mega-surface)] ring-1 ring-inset ring-[var(--cw-border)]" />
    </div>
  )
}

/**
 * 班表資料只有管理員能寫（Firestore 規則），沒登入時 Firebase 只會丟一句
 * 「Missing or insufficient permissions」，看不出要做什麼。這裡翻成人話。
 */
function describeSaveError(error) {
  const code = error?.code || ''
  if (code === 'permission-denied' || /insufficient permissions/i.test(error?.message || '')) {
    return '沒有權限寫入班表。班表只有管理員能改，請先到「管理」登入後再試一次。'
  }
  return error?.message || '未知錯誤'
}

function ShiftBoard() {
  const [months, setMonths] = useState([])
  const [peopleSettings, setPeopleSettings] = useState({})
  const [supportLinks, setSupportLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)

  const [activeTab, setActiveTab] = useState('today')
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()))
  const [selectedMonthKey, setSelectedMonthKey] = useState('')
  const [selectedStore, setSelectedStore] = useState(STORES[0].code)
  const [selectedPersonKey, setSelectedPersonKey] = useState(null)

  useEffect(() => {
    const previous = document.title
    document.title = '班表 · Brainless'
    return () => {
      document.title = previous
    }
  }, [])

  useEffect(() => {
    let settled = false
    const unsubscribeMonths = subscribeShiftMonths(
      (next) => {
        setMonths(next)
        if (!settled) {
          settled = true
          setLoading(false)
        }
      },
      (error) => {
        setLoadError(error?.message || '讀取班表失敗')
        setLoading(false)
      }
    )
    const unsubscribePeople = subscribePeopleSettings(setPeopleSettings, (error) => {
      setLoadError(error?.message || '讀取同事設定失敗')
    })
    const unsubscribeSupport = subscribeSupportLinks(setSupportLinks, (error) => {
      setLoadError(error?.message || '讀取支援班配對失敗')
    })
    return () => {
      unsubscribeMonths()
      unsubscribePeople()
      unsubscribeSupport()
    }
  }, [])

  /** 讀進來後再對一次支援班，讓只寫 T3／D7 的補上目的店的實際班別。 */
  const resolvedMonths = useMemo(
    () => resolveSupportShifts(months, supportLinks),
    [months, supportLinks]
  )

  const pendingSupport = useMemo(
    () => listUnresolvedSupport(months, supportLinks),
    [months, supportLinks]
  )

  const identity = useMemo(() => buildIdentity(peopleSettings), [peopleSettings])

  /** 合併前的名單：設定介面要看得到別名才能合併／解除。 */
  const rawBook = useMemo(() => buildShiftBook(resolvedMonths), [resolvedMonths])

  /** 套用暱稱與合併之後的班表，畫面與統計都用這一份。 */
  const book = useMemo(
    () => buildShiftBook(applyIdentity(resolvedMonths, identity)),
    [resolvedMonths, identity]
  )

  const pickupByPerson = useMemo(
    () => pickupMapFrom(peopleSettings, identity),
    [peopleSettings, identity]
  )

  useEffect(() => {
    if (!book.monthKeys.length) return
    setSelectedMonthKey((current) => {
      if (current && book.monthKeys.includes(current)) return current
      const currentMonth = toDateKey(new Date()).slice(0, 7)
      return book.monthKeys.includes(currentMonth)
        ? currentMonth
        : book.monthKeys[book.monthKeys.length - 1]
    })
  }, [book.monthKeys])

  const handleSaveMonths = useCallback(async (monthsToSave) => {
    setSaving(true)
    try {
      for (const month of monthsToSave) {
        // eslint-disable-next-line no-await-in-loop
        await saveShiftMonth(month)
      }
    } catch (error) {
      throw new Error(describeSaveError(error))
    } finally {
      setSaving(false)
    }
  }, [])

  const handleSupportLinkChange = useCallback(
    async ({ monthKey, date, atStore, personKey, slotId }) => {
      const next = supportLinks.filter(
        (link) =>
          !(link.date === date && link.atStore === atStore && link.personKey === personKey)
      )
      if (slotId) next.push({ date, atStore, personKey, slotId })
      setSupportLinks(next)
      setSaving(true)
      try {
        await saveSupportLinks(
          monthKey,
          next.filter((link) => link.date.startsWith(monthKey))
        )
      } catch (error) {
        setLoadError(`儲存支援班配對失敗：${describeSaveError(error)}`)
      } finally {
        setSaving(false)
      }
    },
    [supportLinks]
  )

  const handlePersonSettingsChange = useCallback(async (personKey, settings) => {
    setPeopleSettings((prev) => ({ ...prev, [personKey]: settings }))
    setSaving(true)
    try {
      await savePersonSettings(personKey, settings)
    } catch (error) {
      setLoadError(`儲存同事設定失敗：${error.message}`)
    } finally {
      setSaving(false)
    }
  }, [])

  const gridMonth = useMemo(
    () =>
      book.months.find(
        (month) => month.monthKey === selectedMonthKey && month.storeCode === selectedStore
      ) || null,
    [book.months, selectedMonthKey, selectedStore]
  )

  const peopleGroups = useMemo(() => groupPeopleByStore(book.people), [book.people])

  const selectedPerson = useMemo(
    () => book.people.find((person) => person.key === selectedPersonKey) || null,
    [book.people, selectedPersonKey]
  )

  const availableStores = useMemo(() => {
    const codes = new Set(
      book.months.filter((m) => m.monthKey === selectedMonthKey).map((m) => m.storeCode)
    )
    return STORES.map((store) => ({
      ...store,
      name: codes.has(store.code) ? store.name : `${store.name}（無資料）`,
    }))
  }, [book.months, selectedMonthKey])

  const inner = (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {loadError ? (
        <CwAlert variant="error" title="連線有狀況">
          <div className="flex flex-wrap items-center gap-3">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => setLoadError('')}
              className="cw-touch-target px-2 font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
            >
              知道了
            </button>
          </div>
        </CwAlert>
      ) : null}

      <div
        // 手機上橫向捲動＋隱藏捲軸＝最後兩個分頁看起來不存在。六個短標籤換行剛好兩排，
        // 全部看得到，也不必先發現「這裡可以滑」。桌機本來就一排放得下。
        className="-mx-1 flex flex-wrap items-center gap-2 px-1 pb-1"
      >
        {TABS.map((tab) => {
          const active = tab.key === activeTab
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveTab(tab.key)}
              className={`cw-touch-target rounded-[var(--cw-radius-pill)] border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)] ${
                active
                  ? 'border-[var(--cw-brand)]/40 bg-[var(--cw-brand-muted)] text-[var(--cw-brand-strong)]'
                  : 'border-[var(--cw-border-strong)] text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)]'
              }`}
            >
              {tab.label}
              {tab.key === 'support' && pendingSupport.length ? (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--cw-warning)] px-1.5 text-[11px] font-bold text-white">
                  {pendingSupport.length}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {loading ? (
        <PanelFallback />
      ) : (
        <Suspense fallback={<PanelFallback />}>
          {activeTab === 'today' ? (
            <div className="space-y-5">
              {/* 日期是次要控制項，不該用一整張卡片吃掉手機的第一個畫面 */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-label="前一天"
                  onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                  className="cw-touch-target grid h-11 w-11 place-items-center rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] text-[var(--cw-text)] hover:bg-[var(--cw-mega-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <CwDateInput
                  name="shift-date"
                  className="w-[170px]"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
                <button
                  type="button"
                  aria-label="後一天"
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  className="cw-touch-target grid h-11 w-11 place-items-center rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] text-[var(--cw-text)] hover:bg-[var(--cw-mega-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
                {selectedDate !== toDateKey(new Date()) ? (
                  <CwButton
                    variant="secondary"
                    onClick={() => setSelectedDate(toDateKey(new Date()))}
                  >
                    回到今天
                  </CwButton>
                ) : null}
              </div>
              <ShiftTodayPanel
                book={book}
                dateKey={selectedDate}
                pickupByPerson={pickupByPerson}
                onOpenPickupSettings={() => setActiveTab('pickup')}
              />
            </div>
          ) : null}

          {activeTab === 'grid' ? (
            <div className="space-y-5">
              <CwCard
                title="完整班表"
                subtitle={
                  selectedPersonKey
                    ? '篩選到單一同事時改用月視圖，並可匯出到手機行事曆。'
                    : '與紙本一樣的人×日格子，含崗位與假別。'
                }
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <CwSelect
                    label="月份"
                    name="grid-month"
                    value={selectedMonthKey}
                    onChange={(event) => setSelectedMonthKey(event.target.value)}
                  >
                    {book.monthKeys.length === 0 ? <option value="">尚無資料</option> : null}
                    {book.monthKeys.map((key) => (
                      <option key={key} value={key}>
                        {key.replace('-', ' 年 ')} 月
                      </option>
                    ))}
                  </CwSelect>
                  <CwSelect
                    label="同事"
                    name="grid-person"
                    value={selectedPersonKey || ''}
                    onChange={(event) => setSelectedPersonKey(event.target.value || null)}
                    hint={selectedPersonKey ? '月視圖會跨店顯示他實際上班的地方' : '選一位同事切換成月視圖'}
                  >
                    <option value="">全部同事（店別班表）</option>
                    <PersonOptionGroups groups={peopleGroups} />
                  </CwSelect>
                  {selectedPersonKey ? null : (
                    // 對齊要看標籤與控制項，不是整格的底部：隔壁那格的 hint 掛在下面，
                    // 用 justify-end 會被 hint 一起往下推，看起來就沒對齊。
                    <div className="flex flex-col">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
                        店別
                      </span>
                      <div className="flex min-h-11 items-center">
                        <StoreTabs
                          stores={availableStores}
                          value={selectedStore}
                          onChange={setSelectedStore}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CwCard>

              {selectedPersonKey ? (
                <PersonMonthCalendar
                  book={book}
                  person={selectedPerson}
                  monthKey={selectedMonthKey}
                  onSelectDate={(dateKey) => {
                    setSelectedDate(dateKey)
                    setActiveTab('today')
                  }}
                />
              ) : (
                <ShiftGrid
                  month={gridMonth}
                  highlightDate={selectedDate}
                  highlightPersonKey={selectedPersonKey}
                  onSelectPerson={(key) => setSelectedPersonKey(key)}
                />
              )}
            </div>
          ) : null}

          {activeTab === 'stats' ? (
            <ShiftStatsPanel
              book={book}
              peopleSettings={peopleSettings}
              selectedPersonKey={selectedPersonKey}
              onSelectPerson={setSelectedPersonKey}
            />
          ) : null}

          {activeTab === 'support' ? (
            <SupportResolutionPanel
              book={book}
              months={months}
              links={supportLinks}
              onChangeLink={handleSupportLinkChange}
              saving={saving}
            />
          ) : null}

          {activeTab === 'pickup' ? (
            <div className="space-y-5">
              <PickupExportPanel
                book={book}
                pickupByPerson={pickupByPerson}
                defaultDate={selectedDate}
                supportWarning={
                  pendingSupport.length ? (
                    <CwAlert variant="warning" title="有支援班還沒對上班別">
                      {pendingSupport.length} 天的跨店支援還沒指定是哪一班。
                      如果其中有早班或中班，那些人不會出現在下面的名單裡。
                      <button
                        type="button"
                        className="ml-1 font-semibold underline"
                        onClick={() => setActiveTab('support')}
                      >
                        去「支援班」確認
                      </button>
                    </CwAlert>
                  ) : null
                }
              />
              <PeopleSettingsPanel
                rawPeople={rawBook.people}
                identity={identity}
                peopleSettings={peopleSettings}
                months={resolvedMonths}
                onChange={handlePersonSettingsChange}
                saving={saving}
              />
            </div>
          ) : null}

          {activeTab === 'import' ? (
            <ShiftImportPanel existingMonths={months} onSave={handleSaveMonths} saving={saving} />
          ) : null}
        </Suspense>
      )}
    </div>
  )

  return (
    <ErrorBoundary>
      <DualThemePage
        breadcrumbs={BREADCRUMBS}
        title="班表"
        description={`三家店的完整班表、今天誰上班、交通車名單與統計。${
          months.length ? `目前已同步 ${months.length} 份月班表。` : ''
        }`}
        studio={inner}
      />
    </ErrorBoundary>
  )
}

export default ShiftBoard
