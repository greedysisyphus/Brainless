import { useMemo, useState } from 'react'
import { ChevronDownIcon, LinkIcon, LinkSlashIcon } from '@heroicons/react/24/outline'
import { CwAlert, CwBadge, CwButton, CwInput, CwSelect } from '../studio/ui'
import {
  NO_PICKUP,
  PICKUP_LOCATIONS,
  PICKUP_OPTIONS,
  getStoreName,
} from '../../pages/shifts/shiftConstants'
import { checkMergeSafety } from '../../pages/shifts/shiftIdentity'
import { groupPeopleByStore, personInStore } from '../../pages/shifts/shiftModel'
import { PersonOptionGroups, StoreFilterChips } from './shiftUi'

/**
 * 同事設定：暱稱、上車地點、手動合併與排除統計。
 * 合併是給「同一個人在不同店被寫成不同字」用的（例如 D7 的阿寶＝D13 的阿力）。
 */
export function PeopleSettingsPanel({
  rawPeople,
  identity,
  peopleSettings,
  months,
  onChange,
  saving,
}) {
  const [keyword, setKeyword] = useState('')
  const [openKey, setOpenKey] = useState(null)
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

  return (
    // 設定好就很少再動，預設收起來；但「有人沒設上車地點」是要處理的事，那種情況自動打開。
    <details
      className="rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-surface)] [&[open]>summary]:border-b [&[open]>summary_.cw-chevron]:rotate-180"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cw-touch-target flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 border-[var(--cw-border)] px-4 py-3 marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]">
        <span className="font-bold text-[var(--cw-text)]">同事設定</span>
        <span className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--cw-text-muted)]">
          {Object.entries(counts).map(([location, count]) => (
            <span
              key={location}
              className={`rounded-[var(--cw-radius-sm)] border px-2 py-0.5 ${
                location === '未設定' && count > 0
                  ? 'border-[var(--cw-warning)] bg-[var(--cw-warning-muted)] font-semibold text-[var(--cw-warning)]'
                  : 'border-[var(--cw-border)]'
              }`}
            >
              {location} {count}
            </span>
          ))}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {saving ? <CwBadge tone="warning">同步中…</CwBadge> : null}
          <ChevronDownIcon className="cw-chevron h-5 w-5 shrink-0 text-[var(--cw-text-muted)] transition-transform" />
        </span>
      </summary>

      <div className="p-4">
      <p className="mb-4 text-sm text-[var(--cw-text-muted)]">
        暱稱、上車地點與合併。合併是給同一個人在不同店被寫成不同字時用的。
      </p>

      {mergeError ? (
        <CwAlert variant="error" title="沒有合併" className="mb-4">
          {mergeError}
        </CwAlert>
      ) : null}

      <div className="mb-4 space-y-3">
        <StoreFilterChips
          groups={peopleGroups}
          value={storeFilter}
          onChange={setStoreFilter}
          total={withMergedStores.length}
        />
        <CwInput
          name="people-search"
          placeholder="搜尋姓名或暱稱"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-[var(--cw-text-muted)]">
          {rawPeople.length
            ? storeFilter === 'all'
              ? '找不到符合的同事。'
              : `${getStoreName(storeFilter)}沒有符合的同事。`
            : '匯入班表後才會有同事名單。'}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--cw-border)]">
          {visible.map((person) => {
            const settings = peopleSettings[person.key] || {}
            const aliases = identity.aliasesOf(person.key)
            const open = openKey === person.key
            const mergeTargets = withMergedStores.filter((other) => other.key !== person.key)

            return (
              <li key={person.key} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[var(--cw-text)]">
                        {settings.nickname || person.name}
                      </span>
                      {settings.nickname ? (
                        <span className="text-xs text-[var(--cw-text-muted)]">（{person.name}）</span>
                      ) : null}
                      {storeCodesOf(person).map((code) => (
                        <CwBadge key={code}>{getStoreName(code)}</CwBadge>
                      ))}
                      {storeCodesOf(person).length > 1 ? (
                        <CwBadge tone="brand">跨店</CwBadge>
                      ) : null}
                      {person.unnamed ? <CwBadge tone="warning">姓名待確認</CwBadge> : null}
                      {aliases.length ? (
                        <CwBadge tone="brand">
                          <LinkIcon className="mr-1 inline h-3 w-3" />
                          含 {aliases.join('、')}
                        </CwBadge>
                      ) : null}
                    </div>
                    {settings.excludeFromStats ? (
                      <p className="mt-1 text-xs text-[var(--cw-text-muted)]">已排除統計</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <CwSelect
                      name={`pickup-${person.key}`}
                      className="w-40"
                      value={settings.pickup || ''}
                      onChange={(event) =>
                        onChange(person.key, { ...settings, pickup: event.target.value })
                      }
                    >
                      <option value="">未設定</option>
                      {PICKUP_OPTIONS.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </CwSelect>
                    <button
                      type="button"
                      onClick={() => setOpenKey(open ? null : person.key)}
                      aria-expanded={open}
                      className="cw-touch-target inline-flex items-center gap-1 rounded-[var(--cw-radius)] px-2 py-2 text-xs font-semibold text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)]"
                    >
                      更多
                      <ChevronDownIcon
                        className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>
                </div>

                {open ? (
                  <div className="mt-3 grid gap-3 rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-mega-surface)] p-3 sm:grid-cols-2">
                    <CwInput
                      label="暱稱"
                      name={`nickname-${person.key}`}
                      placeholder={person.name}
                      value={settings.nickname || ''}
                      onChange={(event) =>
                        onChange(person.key, { ...settings, nickname: event.target.value })
                      }
                      hint="設了之後名單、月視圖與匯出都顯示暱稱"
                    />

                    <CwSelect
                      label="合併到另一位同事"
                      name={`merge-${person.key}`}
                      value=""
                      onChange={(event) => handleMerge(person.key, event.target.value)}
                      hint="兩邊同一天都有班就不會讓你合併"
                    >
                      <option value="">不合併</option>
                      <PersonOptionGroups
                        groups={groupPeopleByStore(
                          mergeTargets.map((other) => ({
                            ...other,
                            storeCodes: storeCodesOf(other),
                          }))
                        )}
                        labelOf={(other) =>
                          `併入 ${peopleSettings[other.key]?.nickname || other.name}`
                        }
                      />
                    </CwSelect>

                    <label className="flex items-center gap-2 text-xs text-[var(--cw-text-muted)]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--cw-brand)]"
                        checked={!!settings.excludeFromStats}
                        onChange={(event) =>
                          onChange(person.key, {
                            ...settings,
                            excludeFromStats: event.target.checked,
                          })
                        }
                      />
                      排除統計
                    </label>

                    {aliases.length ? (
                      <div className="sm:col-span-2">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
                          已合併進來的名字
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {aliases.map((alias) => (
                            <CwButton
                              key={alias}
                              variant="secondary"
                              onClick={() => handleMerge(alias, '')}
                            >
                              <LinkSlashIcon className="h-4 w-4" />
                              解除 {alias}
                              {rawByKey.get(alias)?.storeCodes?.length
                                ? `（${rawByKey
                                    .get(alias)
                                    .storeCodes.map(getStoreName)
                                    .join('、')}）`
                                : ''}
                            </CwButton>
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

      <p className="mt-4 text-xs text-[var(--cw-text-muted)]">
        選「{NO_PICKUP}」的同事不會出現在交通車名單；「未設定」的人會被標成待補。
        合併之後，班表、統計、搭班與行事曆都會當成同一個人；設定隨時可以解除。
      </p>
      </div>
    </details>
  )
}

export default PeopleSettingsPanel
