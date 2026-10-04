import { useCallback, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { createEvents } from 'ics'
import { DEFAULT_ICS_OPTIONS, buildEventTitle, buildPersonIcsEvents, buildPersonMonthGrid, getPersonMonthEntries, icsFilename, summarizePersonMonth } from '../../pages/shifts/shiftCalendar'
import { openImageExportWindow, saveCanvasAsPng } from '../../utils/exportImage'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { dateRange, groupPeopleByStore, lastDateOfMonth, personInStore, personLabel, toDateKey } from '../../pages/shifts/shiftModel'
import { CAR_SHIFTS, NO_PICKUP, PICKUP_LOCATIONS } from '../../pages/shifts/shiftConstants'
import { checkMergeSafety } from '../../pages/shifts/shiftIdentity'
import { normalizeShiftExport } from '../../pages/shifts/shiftImport'
import { buildSupportGroups, listCarRiskSupport, resolveSupportShifts } from '../../pages/shifts/shiftSupport'
import {
  buildPickupTable,
  findMissingPickups,
  renderDriverSchedule,
  renderDriverTsv,
  renderPickupText,
  renderPickupTsv,
  resolveExportRange,
} from '../../pages/shifts/shiftExport'
import { findMatchingDays } from '../../pages/shifts/shiftMatch'
import {
  computePartnerFrequency,
  computePersonSummaries,
  computeShiftDistribution,
  computeStoreLoad,
  getVocabInScope,
  selectMonths,
} from '../../pages/shifts/shiftStats'
import { mergeVocab } from '../../pages/shifts/shiftVocab'

const SHOWN_DAYS = 10

/** 找日子分頁的邏輯：記住條件、算出湊得最齊的日子。Club 版和新版的畫面共用。 */
export function useShiftMatch(book) {
  // 點日期會跳去「今天」分頁，回來時條件要還在，不然每看一天就得重選一次
  const [storedWants, setWants] = useLocalStorage('shiftMatchWants', [])

  const nameByKey = useMemo(
    () => Object.fromEntries(book.people.map((p) => [p.key, personLabel(p)])),
    [book.people]
  )
  // 存下來的人可能已經不在班表裡（改名、合併），這種就略過
  const wants = useMemo(
    () => (Array.isArray(storedWants) ? storedWants : []).filter((w) => nameByKey[w?.personKey]),
    [storedWants, nameByKey]
  )

  const dates = useMemo(() => {
    const lastMonth = book.monthKeys[book.monthKeys.length - 1]
    return lastMonth ? dateRange(toDateKey(new Date()), lastDateOfMonth(lastMonth)) : []
  }, [book.monthKeys])

  const days = useMemo(() => findMatchingDays(book, dates, wants), [book, dates, wants])
  const fullCount = days.filter((d) => d.score === wants.length).length
  const shown = days.slice(0, Math.max(SHOWN_DAYS, fullCount)).filter((d) => d.score > 0)

  const update = (index, patch) =>
    setWants(wants.map((w, i) => (i === index ? { ...w, ...patch } : w)))

  return { nameByKey, wants, setWants, days, fullCount, shown, update }
}

/** 統計分頁的邏輯：範圍、排序、各種彙總。Club 版和新版的畫面共用。 */
export function useShiftStats({ book, peopleSettings, selectedPersonKey }) {
  const [monthFilter, setMonthFilter] = useState('all')
  const [metricView, setMetricView] = useState('shift')
  // 搭班頻率兩種問法：「他佔我班的比例」跟「我們實際一起站了多久」，排序也跟著換
  const [partnerView, setPartnerView] = useState('rate')
  const [storeFilter, setStoreFilter] = useState('all')
  const [sort, setSort] = useState({ key: 'workDays', dir: 'desc' })

  /** 點欄位標題排序：同一欄再點一次換方向，換欄時數字欄預設由多到少、姓名由 A 到 Z。 */
  const toggleSort = (key) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: key === 'name' ? 'asc' : 'desc' }
    )

  const monthKeys = monthFilter === 'all' ? undefined : [monthFilter]
  const excludeKeys = useMemo(
    () =>
      Object.entries(peopleSettings || {})
        .filter(([, settings]) => settings?.excludeFromStats)
        .map(([key]) => key),
    [peopleSettings]
  )

  const distribution = useMemo(
    () => computeShiftDistribution(book, { monthKeys }),
    [book, monthFilter]
  )
  const summaries = useMemo(
    () => computePersonSummaries(book, { monthKeys, excludeKeys }),
    [book, monthFilter, excludeKeys]
  )
  const storeLoad = useMemo(() => computeStoreLoad(book, { monthKeys }), [book, monthFilter])
  const partners = useMemo(
    () => computePartnerFrequency(book, selectedPersonKey, { monthKeys, excludeKeys }),
    [book, selectedPersonKey, monthFilter, excludeKeys]
  )

  // 班別／假別欄位一律由匯入檔的代碼表長出來，店長新增的班別會自動出現
  const { shiftCodes, leaveCodes } = useMemo(
    () => getVocabInScope(book, monthKeys),
    [book, monthFilter]
  )
  // 自定班別是單店的（D7 的「支」一店沒有），只查一份月份文件會露出原始代碼，所以合起來查
  const vocabMonth = useMemo(() => mergeVocab(selectMonths(book, monthKeys)), [book, monthFilter])

  // 排序與長度都用「按月攤平的搭班率」：只同期一個月的人不會被同期五個月的人蓋掉
  const rankedPartners = useMemo(() => {
    const byHours = [...partners].sort(
      (a, b) => b.overlapMinutes - a.overlapMinutes || a.name.localeCompare(b.name, 'zh-Hant')
    )
    return partnerView === 'hours' ? byHours : partners
  }, [partners, partnerView])
  const partnerMax =
    partnerView === 'hours'
      ? Math.max(1, ...partners.map((p) => p.overlapMinutes))
      : Math.max(0.01, ...partners.map((p) => p.monthlyRate))

  // 三家店的人混在一份名單裡很難找；先縮到一家再看
  // 分組跟著月份範圍走：看 5 月就照 5 月的歸屬分，看全部就照他最後待的那家店
  const peopleGroups = useMemo(
    () => groupPeopleByStore(book.people, { monthKeys }),
    [book.people, monthFilter]
  )
  const peopleByKey = useMemo(() => {
    const map = new Map()
    book.people.forEach((person) => map.set(person.key, person))
    return map
  }, [book.people])
  const visibleSummaries = useMemo(() => {
    const rows = summaries.filter((summary) =>
      personInStore(peopleByKey.get(summary.personKey) || {}, storeFilter, monthKeys)
    )
    const valueOf = (row) => {
      if (sort.key === 'name') return row.name
      if (sort.key.startsWith('shift:')) return row.byShift[sort.key.slice(6)] || 0
      if (sort.key.startsWith('leave:')) return row.byLeave[sort.key.slice(6)] || 0
      return row[sort.key] || 0
    }
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = valueOf(a)
      const vb = valueOf(b)
      if (typeof va === 'string') return factor * va.localeCompare(vb, 'zh-Hant')
      // 數字相同時用姓名穩定排序，避免每次重算順序都跳
      return factor * (va - vb) || a.name.localeCompare(b.name, 'zh-Hant')
    })
  }, [summaries, peopleByKey, storeFilter, sort])
  // 全期間都是 0 的欄位對排班沒有資訊量，預設收起來
  const activeShiftCodes = useMemo(
    () => shiftCodes.filter((code) => summaries.some((s) => (s.byShift[code] || 0) > 0)),
    [shiftCodes, summaries]
  )
  const activeLeaveCodes = useMemo(
    () => leaveCodes.filter((code) => summaries.some((s) => (s.byLeave[code] || 0) > 0)),
    [leaveCodes, summaries]
  )
  // 匯入檔的 shift_types 會列出店長設定過、但這個範圍一格都沒用到的班別
  // （例如 D7 宣告了自定的「支」卻沒有任何格子用它）。0 個 · 0% 的空長條只是雜訊。
  const distributionCodes = useMemo(
    () => shiftCodes.filter((code) => (distribution.counts[code] || 0) > 0),
    [shiftCodes, distribution]
  )
  // 表格只長出「這批人真的有數字」的欄位。事假一年兩天、喪假七天，
  // 全部攤成欄位就是十六欄的點點海；要看細項就切到「假別」檢視。
  const shownShiftCodes = activeShiftCodes
  const shownLeaveCodes = activeLeaveCodes
  const hasSupport = useMemo(
    () => visibleSummaries.some((s) => s.supportDays > 0 || s.unknownShiftDays > 0),
    [visibleSummaries]
  )
  const maxWorkDays = Math.max(1, ...visibleSummaries.map((s) => s.workDays))
  const selectedSummary = summaries.find((s) => s.personKey === selectedPersonKey)

  return {
    monthFilter,
    setMonthFilter,
    metricView,
    setMetricView,
    partnerView,
    setPartnerView,
    storeFilter,
    setStoreFilter,
    sort,
    toggleSort,
    monthKeys,
    excludeKeys,
    distribution,
    summaries,
    storeLoad,
    partners,
    shiftCodes,
    leaveCodes,
    vocabMonth,
    rankedPartners,
    partnerMax,
    peopleGroups,
    visibleSummaries,
    distributionCodes,
    shownShiftCodes,
    shownLeaveCodes,
    hasSupport,
    maxWorkDays,
    selectedSummary,
  }
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function summarize(month) {
  const people = (month.people || []).filter((p) => !p.placeholder)
  let work = 0
  let leave = 0
  let needsReview = 0
  let linked = 0
  Object.values(month.entries || {}).forEach((byDate) => {
    Object.values(byDate).forEach((entry) => {
      if (entry.kind === 'WORK') work += 1
      else if (entry.kind === 'LEAVE') leave += 1
      if (entry.needsReview) needsReview += 1
      // 轉換器 --link 後處理留下的痕跡。有沒有這個，決定支援班是「目的店寫明是誰」
      // 還是只能靠一對一自動湊——同一個月份的舊檔新檔長得很像，這是唯一分得出來的地方。
      if (
        entry.visitorMatch === 'linked' ||
        entry.atStoreSource === 'linked' ||
        entry.duplicateOf
      ) {
        linked += 1
      }
    })
  })
  return { headcount: people.length, work, leave, needsReview, linked }
}

/** 同事設定的邏輯：名單、篩選、合併檢查。 */
export function usePeopleSettings({ rawPeople, identity, peopleSettings, months, onChange }) {
  const [keyword, setKeyword] = useState('')
  const [openKey, setOpenKey] = useState(null)
  const today = toDateKey(new Date())
  const [mergeError, setMergeError] = useState(null)
  const [storeFilter, setStoreFilter] = useState('all')

  const canonicalPeople = useMemo(
    () =>
      rawPeople
        .filter((person) => !person.placeholder)
        .filter((person) => identity.canonicalOf(person.key) === person.key),
    [rawPeople, identity]
  )

  const rawByKey = useMemo(() => {
    const map = new Map()
    rawPeople.forEach((person) => map.set(person.key, person))
    return map
  }, [rawPeople])

  /** 合併後的店別要含別名的店，否則看起來像沒併到。 */
  const storeCodesOf = useMemo(() => {
    const cache = new Map()
    return (person) => {
      if (cache.has(person.key)) return cache.get(person.key)
      const codes = new Set(person.storeCodes || [])
      identity.aliasesOf(person.key).forEach((alias) => {
        ;(rawByKey.get(alias)?.storeCodes || []).forEach((code) => codes.add(code))
      })
      const list = [...codes]
      cache.set(person.key, list)
      return list
    }
  }, [identity, rawByKey])

  /** 合併後的人要用併進來的別名的店一起算，否則篩選會漏掉他 */
  const withMergedStores = useMemo(
    () =>
      canonicalPeople.map((person) => ({ ...person, storeCodes: storeCodesOf(person) })),
    [canonicalPeople, storeCodesOf]
  )
  const peopleGroups = useMemo(() => groupPeopleByStore(withMergedStores), [withMergedStores])

  const visible = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    return withMergedStores
      .filter((person) => personInStore(person, storeFilter))
      .filter((person) => {
        if (!text) return true
        const nickname = peopleSettings[person.key]?.nickname || ''
        const aliases = identity.aliasesOf(person.key).join(' ')
        return `${person.name} ${nickname} ${aliases}`.toLowerCase().includes(text)
      })
  }, [withMergedStores, keyword, peopleSettings, identity, storeFilter])

  const counts = useMemo(() => {
    const result = { 未設定: 0, [NO_PICKUP]: 0 }
    PICKUP_LOCATIONS.forEach((location) => {
      result[location] = 0
    })
    canonicalPeople.forEach((person) => {
      const pickup = peopleSettings[person.key]?.pickup
      if (!pickup) result['未設定'] += 1
      else result[pickup] = (result[pickup] || 0) + 1
    })
    return result
  }, [canonicalPeople, peopleSettings])

  const handleMerge = (sourceKey, targetKey) => {
    setMergeError(null)
    if (!targetKey) {
      onChange(sourceKey, { ...(peopleSettings[sourceKey] || {}), mergedInto: '' })
      return
    }
    const safety = checkMergeSafety(months, sourceKey, targetKey)
    if (!safety.ok) {
      setMergeError(`${sourceKey} → ${targetKey}：${safety.reason}`)
      return
    }
    const sourceSettings = peopleSettings[sourceKey] || {}
    const targetSettings = peopleSettings[targetKey] || {}
    // 併過去的人如果只有他設過上車地點，順手帶到正式那筆，免得名單突然少一個人
    if (sourceSettings.pickup && !targetSettings.pickup) {
      onChange(targetKey, { ...targetSettings, pickup: sourceSettings.pickup })
    }
    onChange(sourceKey, { ...sourceSettings, mergedInto: targetKey })
    setOpenKey(null)
  }

  // 有人還沒設上車地點＝那天可能少一個人上車，這種情況一開始就展開。
  // 只當初值：如果綁成即時的 prop，最後一個人設好的當下面板會當場收起來，手還在上面。
  const [open, setOpen] = useState(() => (counts['未設定'] || 0) > 0)

  return {
    keyword,
    setKeyword,
    openKey,
    setOpenKey,
    today,
    mergeError,
    storeFilter,
    setStoreFilter,
    canonicalPeople,
    rawByKey,
    storeCodesOf,
    withMergedStores,
    peopleGroups,
    visible,
    counts,
    handleMerge,
    open,
    setOpen,
  }
}

/** 特定日期上車例外的邏輯：新增一段日期、刪除一天。過去的不列出。 */
export function usePickupExceptions({ person, settings, onChange, today }) {
  const [date, setDate] = useState('')
  // 連續幾天不搭車是常態（連假、出遊），一天一天加會加到放棄。留空就是只加那一天。
  const [until, setUntil] = useState('')
  const [location, setLocation] = useState(NO_PICKUP)
  const entries = Object.entries(settings.pickupOn || {}).sort((a, b) => a[0].localeCompare(b[0]))
  const upcoming = entries.filter(([day]) => day >= today)
  const past = entries.length - upcoming.length

  const write = (next) => onChange(person.key, { ...settings, pickupOn: next })
  const days = date ? dateRange(date, until && until >= date ? until : date) : []
  const add = () => {
    if (!days.length) return
    const next = { ...(settings.pickupOn || {}) }
    days.forEach((day) => {
      next[day] = location
    })
    write(next)
    setDate('')
    setUntil('')
  }
  const remove = (day) => {
    const next = { ...(settings.pickupOn || {}) }
    delete next[day]
    write(next)
  }

  return {
    date,
    setDate,
    until,
    setUntil,
    location,
    setLocation,
    upcoming,
    past,
    days,
    add,
    remove,
  }
}

/** 支援班配對的邏輯：分出待確認、已對上，以及可能要坐車卻還沒對上的。 */
export function useSupportGroups(months, links) {
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

  return {
    groups,
    pending,
    settled,
    carRisks,
    monthByStore,
  }
}

/** 匯出上車名單的邏輯：範圍、名單、複製與下載。background 是圖檔的底色。 */
export function usePickupExport({ book, pickupByPerson, defaultDate, background = '#fffdfa' }) {
  const [audience, setAudience] = useState('store')
  const [rangeKey, setRangeKey] = useState('week')
  const [startDate, setStartDate] = useState(defaultDate)
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const tableRef = useRef(null)

  const range = useMemo(() => resolveExportRange(rangeKey, startDate), [rangeKey, startDate])
  const table = useMemo(
    () => buildPickupTable(book, { ...range, pickupByPerson }),
    [book, range, pickupByPerson]
  )
  const missing = useMemo(
    () => findMissingPickups(book, { ...range, pickupByPerson }),
    [book, range, pickupByPerson]
  )

  const forDriver = audience === 'driver'
  const filenameBase = `${forDriver ? '交通車接送表_司機版' : '交通車上車名單'}_${range.from}_${range.to}`
  // 司機版直接用店長平常傳給司機的排班寫法，貼進聊天室就能發
  const renderText = forDriver ? renderDriverSchedule : renderPickupText
  const renderTsv = forDriver ? renderDriverTsv : renderPickupTsv

  const handleCopy = useCallback(async () => {
    const text = renderText(table)
    try {
      await navigator.clipboard.writeText(text)
      setStatus({ variant: 'success', message: '已複製文字名單，可直接貼到群組。' })
    } catch {
      setStatus({ variant: 'error', message: '瀏覽器不允許複製，請改用下載文字檔。' })
    }
  }, [table, renderText])

  const handleDownloadText = useCallback(() => {
    downloadBlob(`${filenameBase}.txt`, renderText(table), 'text/plain;charset=utf-8')
    setStatus({ variant: 'success', message: '文字檔已下載。' })
  }, [filenameBase, table, renderText])

  const handleDownloadTsv = useCallback(() => {
    downloadBlob(`${filenameBase}.tsv`, renderTsv(table), 'text/tab-separated-values;charset=utf-8')
    setStatus({ variant: 'success', message: '表格檔已下載，可貼進試算表。' })
  }, [filenameBase, table, renderTsv])

  const handleDownloadImage = useCallback(async () => {
    if (!tableRef.current) return
    // 視窗要在點擊的當下同步開，等 html2canvas 跑完才開會被 Safari 擋掉
    const previewWindow = openImageExportWindow('交通車接送表')
    setBusy(true)
    try {
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: background,
        scale: 2,
        useCORS: true,
      })
      await saveCanvasAsPng(canvas, `${filenameBase}.png`, {
        title: '交通車接送表',
        previewWindow,
      })
      setStatus({
        variant: 'success',
        message: previewWindow ? '圖檔已開在新分頁，可長按儲存。' : '圖檔已下載。',
      })
    } catch (error) {
      if (previewWindow && !previewWindow.closed) previewWindow.close()
      setStatus({ variant: 'error', message: `產生圖檔失敗：${error.message}` })
    } finally {
      setBusy(false)
    }
  }, [filenameBase])

  return {
    audience,
    setAudience,
    rangeKey,
    setRangeKey,
    startDate,
    setStartDate,
    status,
    busy,
    tableRef,
    range,
    table,
    missing,
    forDriver,
    handleCopy,
    handleDownloadText,
    handleDownloadTsv,
    handleDownloadImage,
  }
}

/** 匯入班表的邏輯：讀檔、解析、同一批一起解析支援班再存。 */
export function useShiftImport({ existingMonths, onSave }) {
  const [pending, setPending] = useState([])
  const [errors, setErrors] = useState([])
  const [pasteText, setPasteText] = useState('')
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  const addRaw = useCallback((raw, label) => {
    const parsed = normalizeShiftExport(raw, { fileName: label })
    if (!parsed.ok) {
      setErrors((prev) => [...prev, `${label}：${parsed.error}`])
      return
    }
    setPending((prev) => {
      const next = prev.filter(
        (item) =>
          !(
            item.month.monthKey === parsed.month.monthKey &&
            item.month.storeCode === parsed.month.storeCode
          )
      )
      return [...next, { label, month: parsed.month, summary: summarize(parsed.month) }]
    })
  }, [])

  const handleFiles = useCallback(
    async (fileList) => {
      setErrors([])
      setResult(null)
      const files = [...(fileList || [])]
      for (const file of files) {
        try {
          const text = await file.text()
          addRaw(JSON.parse(text), file.name)
        } catch (error) {
          setErrors((prev) => [...prev, `${file.name}：不是有效的 JSON（${error.message}）`])
        }
      }
    },
    [addRaw]
  )

  const handlePaste = useCallback(() => {
    setErrors([])
    setResult(null)
    if (!pasteText.trim()) {
      setErrors(['請先貼上 JSON 內容'])
      return
    }
    try {
      addRaw(JSON.parse(pasteText), '貼上的內容')
      setPasteText('')
    } catch (error) {
      setErrors([`貼上的內容不是有效的 JSON（${error.message}）`])
    }
  }, [addRaw, pasteText])

  const handleSave = useCallback(async () => {
    if (!pending.length) return
    setErrors([])
    // 同一批一起解析 T3，支援班才對得到 D13 的實際班別
    const sameMonthExisting = existingMonths.filter((month) =>
      pending.some(
        (item) =>
          item.month.monthKey === month.monthKey && item.month.storeCode !== month.storeCode
      )
    )
    const resolved = resolveSupportShifts([...pending.map((item) => item.month), ...sameMonthExisting])
    const toSave = resolved.filter((month) =>
      pending.some(
        (item) => item.month.monthKey === month.monthKey && item.month.storeCode === month.storeCode
      )
    )
    try {
      await onSave(toSave)
      setResult(`已同步 ${toSave.length} 份班表到 Firebase。`)
      setPending([])
    } catch (error) {
      setErrors([`儲存失敗：${error.message}`])
    }
  }, [existingMonths, onSave, pending])

  return {
    pending,
    setPending,
    errors,
    pasteText,
    setPasteText,
    result,
    fileInputRef,
    handleFiles,
    handlePaste,
    handleSave,
  }
}

/** 單一同事月曆的邏輯：月曆格、當月統計、匯出 .ics 的選項與下載。 */
export function usePersonCalendar({ book, person, monthKey }) {
  const [status, setStatus] = useState(null)
  const [icsOptions, setIcsOptions] = useState(DEFAULT_ICS_OPTIONS)
  const setOption = (key) => (event) =>
    setIcsOptions((prev) => ({ ...prev, [key]: event.target.checked }))

  const grid = useMemo(
    () => buildPersonMonthGrid(book, person?.key, monthKey),
    [book, person, monthKey]
  )
  const summary = useMemo(
    () => summarizePersonMonth(book, person?.key, monthKey),
    [book, person, monthKey]
  )

  /** 拿這個月第一筆實際的班當標題預覽，勾選項一改就看得到結果 */
  const titlePreview = useMemo(() => {
    if (!person) return ''
    const byDate = getPersonMonthEntries(book, person.key, monthKey)
    for (const date of [...byDate.keys()].sort()) {
      const record = byDate.get(date).find((r) => r.kind === 'WORK')
      if (record) return buildEventTitle(record, icsOptions)
    }
    return buildEventTitle({ shiftLabel: '早班', workStore: 'central', positionLabel: '主吧' }, icsOptions)
  }, [book, person, monthKey, icsOptions])

  const download = useCallback(
    (monthKeys) => {
      const events = buildPersonIcsEvents(book, person.key, { monthKeys, ...icsOptions })
      if (!events.length) {
        setStatus({ variant: 'warning', message: '這個範圍沒有可匯出的班。' })
        return
      }
      createEvents(events, (error, value) => {
        if (error) {
          setStatus({ variant: 'error', message: `產生行事曆檔失敗：${error.message || error}` })
          return
        }
        const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = icsFilename(person.name, monthKeys)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        setStatus({
          variant: 'success',
          message: `已匯出 ${events.length} 筆行程。在手機上打開這個檔案就能加進行事曆。`,
        })
      })
    },
    [book, person, icsOptions]
  )

  return { status, icsOptions, setOption, grid, summary, titlePreview, download }
}
