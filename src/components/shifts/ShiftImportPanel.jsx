import { useCallback, useRef, useState } from 'react'
import { ArrowUpTrayIcon, CheckCircleIcon, TrashIcon } from '@heroicons/react/24/outline'
import { CwAlert, CwBadge, CwButton, CwCard, CwTextarea } from '../studio/ui'
import { getStoreName } from '../../pages/shifts/shiftConstants'
import { formatTimestamp } from '../../pages/shifts/shiftModel'
import { normalizeShiftExport } from '../../pages/shifts/shiftImport'
import { resolveSupportShifts } from '../../pages/shifts/shiftSupport'

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

/** 匯入 Brainless-SimpleKaffa-Shifts-Convertor 的 JSON 匯出檔（可一次選三家店）。 */
export function ShiftImportPanel({ existingMonths, onSave, saving }) {
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

  return (
    <div className="space-y-5">
      <CwCard
        title="匯入班表"
        subtitle="上傳 Brainless-SimpleKaffa-Shifts-Convertor 的 JSON 匯出檔；可一次選三家店。"
      >
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            handleFiles(event.dataTransfer.files)
          }}
          className="flex flex-col items-center gap-3 rounded-[var(--cw-radius-lg)] border border-dashed border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] px-6 py-10 text-center"
        >
          <ArrowUpTrayIcon className="h-8 w-8 text-[var(--cw-brand)]" />
          <p className="text-sm text-[var(--cw-text-muted)]">
            把 JSON 檔拖進來，或
          </p>
          <CwButton variant="brand" onClick={() => fileInputRef.current?.click()}>
            選擇 JSON 檔
          </CwButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            multiple
            className="hidden"
            onChange={(event) => {
              handleFiles(event.target.files)
              event.target.value = ''
            }}
          />
          <p className="text-xs text-[var(--cw-text-muted)]">
            店別與月份由檔案本身決定，不必手動選。完整的 <code>.json</code> 與
            <code>.flat.json</code> 都能吃；有完整版時建議用它，因為 flat 沒有國定假日與轉檔警告。
          </p>
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--cw-text)]">
            改用貼上 JSON
          </summary>
          <div className="mt-3 space-y-3">
            <CwTextarea
              label="JSON 內容"
              rows={6}
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              placeholder='{ "store": { "code": "central" }, ... }'
            />
            <CwButton variant="secondary" onClick={handlePaste}>
              解析貼上的內容
            </CwButton>
          </div>
        </details>
      </CwCard>

      {errors.length ? (
        <CwAlert variant="error" title="有檔案讀不進來">
          <ul className="space-y-1">
            {errors.map((error, index) => (
              <li key={index}>· {error}</li>
            ))}
          </ul>
        </CwAlert>
      ) : null}

      {result ? (
        <CwAlert variant="success" title="匯入完成">
          {result}
        </CwAlert>
      ) : null}

      {pending.length ? (
        <CwCard
          title={`待儲存 ${pending.length} 份`}
          subtitle="確認店別、月份與人數無誤後再同步到 Firebase。同月同店會覆蓋既有資料。"
          actions={
            <CwButton variant="brand" onClick={handleSave} disabled={saving}>
              {saving ? '同步中…' : '同步到 Firebase'}
            </CwButton>
          }
        >
          <ul className="space-y-3">
            {pending.map((item) => {
              const existing = existingMonths.find(
                (month) =>
                  month.monthKey === item.month.monthKey &&
                  month.storeCode === item.month.storeCode
              )
              const exists = !!existing
              // flat 蓋掉完整版會靜靜地弄丟國定假日與轉檔警告
              const downgrades =
                exists &&
                item.month.source?.format === 'flat' &&
                existing.source?.format !== 'flat'
              return (
                <li
                  key={`${item.month.monthKey}_${item.month.storeCode}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-mega-surface)] p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-[var(--cw-success)]" />
                      <span className="font-semibold text-[var(--cw-text)]">
                        {getStoreName(item.month.storeCode)} · {item.month.year} 年 {item.month.month} 月
                      </span>
                      {exists ? (
                        <CwBadge tone={downgrades ? 'danger' : 'warning'}>
                          {downgrades ? '會覆蓋掉完整版' : '將覆蓋既有資料'}
                        </CwBadge>
                      ) : (
                        <CwBadge tone="success">新增</CwBadge>
                      )}
                      {item.month.source?.format === 'flat' ? <CwBadge>flat</CwBadge> : null}
                      {item.month.warnings?.length ? (
                        <CwBadge tone="warning">{item.month.warnings.length} 則提醒</CwBadge>
                      ) : null}
                      {item.summary.linked ? (
                        <CwBadge tone="success">已含轉換器對照 {item.summary.linked} 格</CwBadge>
                      ) : null}
                      {item.summary.needsReview ? (
                        <CwBadge tone="warning">{item.summary.needsReview} 格待確認</CwBadge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--cw-text-muted)]">
                      {item.label} · {item.summary.headcount} 位同事 · 上班 {item.summary.work} 格 · 休假{' '}
                      {item.summary.leave} 格
                    </p>
                    {downgrades ? (
                      <p className="mt-1 text-xs font-semibold text-[var(--cw-danger)]">
                        這個月這家店已經有完整 .json 的資料。用 flat 覆蓋會弄丟國定假日與轉檔警告，
                        確定要蓋過去再同步。
                      </p>
                    ) : null}
                    {item.month.warnings?.length ? (
                      <ul className="mt-1 text-xs text-[var(--cw-warning)]">
                        {item.month.warnings.map((warning, index) => (
                          <li key={index}>· {warning}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label="移除"
                    className="cw-touch-target grid h-11 w-11 place-items-center rounded-[var(--cw-radius)] text-[var(--cw-text-muted)] hover:bg-[var(--cw-surface)]"
                    onClick={() =>
                      setPending((prev) =>
                        prev.filter(
                          (p) =>
                            !(
                              p.month.monthKey === item.month.monthKey &&
                              p.month.storeCode === item.month.storeCode
                            )
                        )
                      )
                    }
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </li>
              )
            })}
          </ul>
        </CwCard>
      ) : null}

      <CwCard title="已同步的班表" subtitle="存在 Firebase，三家店與各月份共用。">
        {existingMonths.length === 0 ? (
          <p className="text-sm text-[var(--cw-text-muted)]">還沒有任何資料。</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {existingMonths.map((month) => (
              <li
                key={`${month.monthKey}_${month.storeCode}`}
                className="rounded-[var(--cw-radius)] border border-[var(--cw-border)] px-3 py-2 text-sm"
              >
                <div className="font-semibold text-[var(--cw-text)]">
                  {month.year} 年 {month.month} 月 · {getStoreName(month.storeCode)}
                </div>
                <div className="text-xs text-[var(--cw-text-muted)]">
                  {(month.people || []).filter((p) => !p.placeholder).length} 位同事
                  {month.importedAt ? ` · 同步於 ${formatTimestamp(month.importedAt)}` : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CwCard>
    </div>
  )
}

export default ShiftImportPanel
