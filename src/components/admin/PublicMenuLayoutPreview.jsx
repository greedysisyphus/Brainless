import { useState } from 'react'
import { MENU_LAYOUT_OPTIONS } from '../../utils/publicMenuDisplay'

const ACCENT = '#ec5836'
const BG = '#f7f6f2'
const INK = '#171717'
const MUTED = '#6b6b66'

function PreviewHeader() {
  return (
    <div
      className="flex items-center gap-2 border-b px-2.5 py-2"
      style={{ borderColor: 'rgba(23,23,23,0.1)', background: BG }}
    >
      <span
        className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[7px] font-bold"
        style={{ border: `1.5px solid ${ACCENT}`, color: ACCENT }}
        aria-hidden
      >
        B
      </span>
      <span className="text-[10px] font-bold tracking-tight" style={{ color: INK }}>
        brainless menu
      </span>
    </div>
  )
}

function PreviewImage({ url, label, compact }) {
  if (!url) {
    return (
      <div
        className={`flex w-full items-center justify-center rounded-lg border border-dashed text-[10px] ${
          compact ? 'aspect-[3/5] max-h-36' : 'aspect-[3/4]'
        }`}
        style={{ borderColor: 'rgba(23,23,23,0.16)', color: MUTED, background: '#fff' }}
      >
        {label}
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={label}
      className={`block w-full rounded-lg object-contain ${compact ? 'max-h-36' : ''}`}
      style={{ height: compact ? undefined : 'auto' }}
    />
  )
}

function PreviewBody({ layout, urls, device, tabIndex, onTabChange, compact }) {
  const isWide = device === 'wide'

  if (layout === 'tabs' && urls.length > 1) {
    const safe = Math.min(tabIndex, urls.length - 1)
    return (
      <div className="p-2.5" style={{ background: BG }}>
        <div className="mb-2 flex gap-1.5">
          {urls.map((url, index) => (
            <button
              key={`tab-${index}`}
              type="button"
              onClick={() => onTabChange?.(index)}
              className="flex-1 rounded-lg border px-1 py-1.5 text-[9px] font-bold"
              style={{
                borderColor: safe === index ? ACCENT : 'rgba(23,23,23,0.14)',
                background: safe === index ? 'rgba(236,88,54,0.12)' : '#fff',
                color: safe === index ? ACCENT : MUTED,
              }}
            >
              第 {index + 1} 頁
            </button>
          ))}
        </div>
        <PreviewImage url={urls[safe]} label={`第 ${safe + 1} 頁`} compact={compact} />
        <div className="mt-2 flex justify-center gap-1">
          {urls.map((_, index) => (
            <span
              key={`dot-${index}`}
              className="h-1 w-1 rounded-full"
              style={{ background: safe === index ? ACCENT : 'rgba(23,23,23,0.18)' }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (layout === 'row') {
    return (
      <div
        className={`flex gap-2 p-2.5 ${isWide ? 'flex-row' : 'flex-col'}`}
        style={{ background: BG }}
      >
        {urls.map((url, index) => (
          <div key={`row-${index}`} className="min-w-0 flex-1">
            <PreviewImage url={url} label={`第 ${index + 1} 頁`} compact={compact} />
          </div>
        ))}
        {!isWide ? (
          <p className="text-center text-[9px]" style={{ color: MUTED }}>
            手機仍上下排列
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2.5" style={{ background: BG }}>
      {urls.map((url, index) => (
        <PreviewImage key={`stack-${index}`} url={url} label={`第 ${index + 1} 頁`} compact={compact} />
      ))}
    </div>
  )
}

function PreviewFrame({ layout, urls, device, tabIndex, onTabChange, compact }) {
  const isPhone = device === 'phone'
  const width = isPhone ? (compact ? 200 : 220) : compact ? 300 : 340

  return (
    <div style={{ width }} className="min-w-0 flex-1 sm:flex-none">
      <p className="mb-1.5 text-[10px] text-[var(--cw-text-muted)]">
        {isPhone ? '手機' : '平板／橫向'}
      </p>
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: 'rgba(23,23,23,0.14)', background: BG }}
      >
        {isPhone ? (
          <div className="flex h-3 items-center justify-center bg-black/5">
            <div className="h-1 w-8 rounded bg-black/15" />
          </div>
        ) : null}
        <PreviewHeader />
        <div className={isPhone ? 'max-h-52 overflow-y-auto' : 'max-h-48 overflow-y-auto'}>
          <PreviewBody
            layout={layout}
            urls={urls}
            device={device}
            tabIndex={tabIndex}
            onTabChange={onTabChange}
            compact={compact}
          />
        </div>
      </div>
    </div>
  )
}

export function MenuLayoutSelector({ layout, onChange, disabled, variant = 'list' }) {
  if (variant === 'grid') {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {MENU_LAYOUT_OPTIONS.map((option) => {
          const active = layout === option.id
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.id)}
              className={`rounded-[var(--cw-radius)] border px-3 py-2.5 text-left transition-colors disabled:opacity-60 ${
                active
                  ? 'border-[var(--cw-brand)] bg-[var(--cw-brand-muted)]'
                  : 'border-[var(--cw-border)] bg-[var(--cw-bg)] hover:bg-[var(--cw-mega-surface)]'
              }`}
            >
              <span className="block text-sm font-semibold text-[var(--cw-text)]">{option.label}</span>
              <span className="mt-1 block text-[11px] leading-snug text-[var(--cw-text-muted)]">
                {option.hint}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {MENU_LAYOUT_OPTIONS.map((option) => {
        const active = layout === option.id
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={`flex w-full items-start gap-2.5 rounded-[var(--cw-radius)] border px-3 py-2.5 text-left transition-colors disabled:opacity-60 ${
              active
                ? 'border-[var(--cw-brand)] bg-[var(--cw-brand-muted)]'
                : 'border-[var(--cw-border)] bg-[var(--cw-bg)] hover:bg-[var(--cw-mega-surface)]'
            }`}
          >
            <span
              className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 ${
                active ? 'border-[var(--cw-brand)]' : 'border-[var(--cw-border-strong)]'
              }`}
              aria-hidden
            >
              {active ? (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--cw-brand)]" />
              ) : null}
            </span>
            <span>
              <span className="block text-sm font-semibold text-[var(--cw-text)]">{option.label}</span>
              <span className="mt-0.5 block text-xs text-[var(--cw-text-muted)]">{option.hint}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default function PublicMenuLayoutPreview({ layout, slots, embedded = false }) {
  const [tabIndex, setTabIndex] = useState(0)
  const urls = slots.filter(Boolean).map((s) => s.url)
  const displayUrls = urls.length >= 2 ? urls : urls.length === 1 ? [urls[0]] : [null, null]

  const frames = (
    <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-center">
      <PreviewFrame
        layout={layout}
        urls={displayUrls}
        device="phone"
        tabIndex={tabIndex}
        onTabChange={setTabIndex}
        compact={embedded}
      />
      <PreviewFrame
        layout={layout}
        urls={displayUrls}
        device="wide"
        tabIndex={tabIndex}
        onTabChange={setTabIndex}
        compact={embedded}
      />
    </div>
  )

  if (embedded) {
    return frames
  }

  return (
    <div className="space-y-3 rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-mega-surface)] p-4">
      <div>
        <p className="text-sm font-semibold text-[var(--cw-text)]">即時預覽</p>
        <p className="mt-1 text-xs text-[var(--cw-text-muted)]">
          儲存後客人 QR 站會同步
        </p>
      </div>
      {frames}
    </div>
  )
}
