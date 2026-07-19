import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import logoCat from '../../assets/logo-cat.png'
import exportLogoCat from '../../assets/logo-cat-export.png'

/** 預設 Logo；之後加新款只需往此陣列塞一筆（kind: 'image' | 'none'） */
export const EXPORT_LOGO_PRESETS = [
  {
    id: 'cat',
    label: 'Cat',
    hint: '預設圓形',
    kind: 'image',
    src: exportLogoCat,
  },
  {
    id: 'minimalist',
    label: 'Minimalist',
    hint: '無 Logo',
    kind: 'none',
  },
]

const PANEL_WIDTH = 360

function PreviewMark({ mode, customLogoBase64, size = 44, isStudio }) {
  const ring = isStudio ? 'border-[var(--cw-border)]' : 'border-white/20'
  if (mode === 'minimalist') {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-dashed ${ring} text-[10px] font-semibold ${
          isStudio ? 'bg-[var(--cw-bg)] text-[var(--cw-text-muted)]' : 'bg-surface/40 text-text-secondary'
        }`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        —
      </div>
    )
  }
  if (mode === 'custom') {
    if (customLogoBase64) {
      return (
        <img
          src={customLogoBase64}
          alt=""
          className={`shrink-0 rounded-full border object-cover ${ring}`}
          style={{ width: size, height: size }}
        />
      )
    }
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-dashed ${ring} ${
          isStudio ? 'bg-[var(--cw-bg)] text-[var(--cw-text-muted)]' : 'bg-surface/40 text-text-secondary'
        }`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <PhotoIcon className="h-4 w-4" />
      </div>
    )
  }
  const preset = EXPORT_LOGO_PRESETS.find((p) => p.id === mode)
  const src = preset?.kind === 'image' ? preset.src : logoCat
  return (
    <img
      src={src}
      alt=""
      className={`shrink-0 rounded-full border object-cover ${ring}`}
      style={{ width: size, height: size }}
    />
  )
}

function modeLabel(mode) {
  if (mode === 'custom') return '自定 Logo'
  return EXPORT_LOGO_PRESETS.find((p) => p.id === mode)?.label ?? mode
}

function computePanelStyle(triggerEl) {
  if (!triggerEl) return { top: 0, left: 0, width: PANEL_WIDTH }
  const rect = triggerEl.getBoundingClientRect()
  const width = Math.min(PANEL_WIDTH, window.innerWidth - 16)
  let left = rect.right - width
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
  let top = rect.bottom + 8
  const estimatedHeight = 280
  if (top + estimatedHeight > window.innerHeight - 8) {
    top = Math.max(8, rect.top - estimatedHeight - 8)
  }
  return { top, left, width }
}

/**
 * 方案 D：圖示觸發鈕 + 左選右預覽小窗（預設 Logo / 自定上傳）
 * 面板以 portal 掛到 body，避免被盤點卡 overflow／z-index 擋住。
 */
export default function ExportLogoPicker({
  isStudio,
  exportMode,
  setExportMode,
  customLogoBase64,
  onLogoUpload,
  onRemoveCustomLogo,
  storeName,
}) {
  const [open, setOpen] = useState(false)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: PANEL_WIDTH })
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const fileInputRef = useRef(null)
  const panelId = useId()

  const updatePosition = () => {
    if (triggerRef.current) {
      setPanelPos(computePanelStyle(triggerRef.current))
    }
  }

  useLayoutEffect(() => {
    if (!open) return undefined
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e) => {
      const t = e.target
      if (triggerRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selectPreset = (id) => {
    setExportMode(id)
  }

  const triggerUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    onLogoUpload(e)
    setExportMode('custom')
  }

  const triggerClass = isStudio
    ? `inline-flex items-center justify-center rounded-full border p-1 transition-colors ${
        open
          ? 'border-[var(--cw-border-strong)] bg-[var(--cw-surface-elevated)]'
          : 'border-[var(--cw-border)] bg-[var(--cw-bg)] hover:bg-[var(--cw-mega-surface)]'
      }`
    : `inline-flex items-center justify-center rounded-full border p-1 transition-colors ${
        open
          ? 'border-white/30 bg-surface/60'
          : 'border-white/10 bg-surface/40 hover:border-white/20 hover:bg-surface/60'
      }`

  const panelClass = isStudio
    ? 'fixed z-[200] grid grid-cols-[1fr_1.1fr] overflow-hidden rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] shadow-[var(--cw-shadow-md)]'
    : 'fixed z-[200] grid grid-cols-[1fr_1.1fr] overflow-hidden rounded-xl border border-white/15 bg-surface/95 shadow-xl backdrop-blur-md'

  const leftItemBase = isStudio
    ? 'flex w-full items-center gap-2 rounded-[var(--cw-radius)] px-1.5 py-1.5 text-left text-xs transition-colors'
    : 'flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-xs transition-colors'

  const leftItemActive = isStudio
    ? 'border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] text-[var(--cw-text)]'
    : 'border border-white/20 bg-white/10 text-white'
  const leftItemIdle = isStudio
    ? 'border border-transparent text-[var(--cw-text-muted)] hover:bg-[var(--cw-bg)] hover:text-[var(--cw-text)]'
    : 'border border-transparent text-text-secondary hover:bg-white/5 hover:text-white'

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Logo 設定"
          className={panelClass}
          style={{
            top: panelPos.top,
            left: panelPos.left,
            width: panelPos.width,
          }}
        >
          <div
            className={
              isStudio ? 'border-r border-[var(--cw-border)] p-2.5' : 'border-r border-white/10 p-2.5'
            }
          >
            <p
              className={
                isStudio
                  ? 'mb-2 px-1 text-[11px] font-semibold text-[var(--cw-text)]'
                  : 'mb-2 px-1 text-[11px] font-semibold text-white'
              }
            >
              預設
            </p>
            <div className="flex flex-col gap-1">
              {EXPORT_LOGO_PRESETS.map((preset) => {
                const active = exportMode === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`${leftItemBase} ${active ? leftItemActive : leftItemIdle}`}
                    onClick={() => selectPreset(preset.id)}
                  >
                    <PreviewMark mode={preset.id} size={28} isStudio={isStudio} />
                    <span className="min-w-0">
                      <span className="block font-medium">{preset.label}</span>
                      <span
                        className={
                          isStudio
                            ? 'block text-[10px] text-[var(--cw-text-muted)]'
                            : 'block text-[10px] text-text-secondary'
                        }
                      >
                        {preset.hint}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={triggerUpload}
              className={
                isStudio
                  ? 'mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[var(--cw-radius)] border border-dashed border-[var(--cw-border-strong)] bg-[var(--cw-bg)] px-2 py-2 text-[11px] font-medium text-[var(--cw-text)] hover:bg-[var(--cw-surface-elevated)]'
                  : 'mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/20 bg-surface/40 px-2 py-2 text-[11px] font-medium text-text-secondary hover:border-purple-400/40 hover:text-purple-300'
              }
            >
              <PhotoIcon className="h-3.5 w-3.5" />
              自定上傳
            </button>

            {customLogoBase64 ? (
              <div className="mt-2 flex items-center gap-1.5 px-0.5">
                <button
                  type="button"
                  className={`${leftItemBase} flex-1 ${
                    exportMode === 'custom' ? leftItemActive : leftItemIdle
                  }`}
                  onClick={() => setExportMode('custom')}
                >
                  <PreviewMark
                    mode="custom"
                    customLogoBase64={customLogoBase64}
                    size={28}
                    isStudio={isStudio}
                  />
                  <span className="font-medium">使用自定</span>
                </button>
                <button
                  type="button"
                  onClick={onRemoveCustomLogo}
                  className={
                    isStudio
                      ? 'rounded-[var(--cw-radius)] p-1.5 text-[var(--cw-text-muted)] hover:bg-[var(--cw-bg)] hover:text-red-400'
                      : 'rounded-lg p-1.5 text-text-secondary hover:bg-white/10 hover:text-red-400'
                  }
                  title="移除自定 Logo"
                  aria-label="移除自定 Logo"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>

          <div className={isStudio ? 'bg-[var(--cw-bg)] p-3' : 'bg-black/20 p-3'}>
            <p
              className={
                isStudio
                  ? 'mb-2.5 text-[11px] text-[var(--cw-text-muted)]'
                  : 'mb-2.5 text-[11px] text-text-secondary'
              }
            >
              匯出預覽
            </p>
            <div
              className={
                isStudio
                  ? 'rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-mega-surface)] p-3'
                  : 'rounded-lg border border-white/10 bg-surface/50 p-3'
              }
            >
              <div className="flex items-center gap-2.5">
                <PreviewMark
                  mode={exportMode}
                  customLogoBase64={customLogoBase64}
                  size={44}
                  isStudio={isStudio}
                />
                <div className="min-w-0">
                  <p
                    className={
                      isStudio
                        ? 'truncate text-sm font-bold text-[var(--cw-text)]'
                        : 'truncate text-sm font-bold text-white'
                    }
                  >
                    咖啡豆盤點表
                  </p>
                  <p
                    className={
                      isStudio
                        ? 'truncate text-[10px] text-[var(--cw-text-muted)]'
                        : 'truncate text-[10px] text-text-secondary'
                    }
                  >
                    {storeName} · {modeLabel(exportMode)}
                  </p>
                </div>
              </div>
              <div
                className={
                  isStudio
                    ? 'mt-3 h-1.5 rounded-full bg-[var(--cw-border)]'
                    : 'mt-3 h-1.5 rounded-full bg-white/10'
                }
              />
              <div
                className={
                  isStudio
                    ? 'mt-1.5 h-1.5 w-[70%] rounded-full bg-[var(--cw-border)]'
                    : 'mt-1.5 h-1.5 w-[70%] rounded-full bg-white/10'
                }
              />
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className={
                isStudio
                  ? 'mt-3 w-full rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] px-3 py-2 text-xs font-medium text-[var(--cw-text)] hover:bg-[var(--cw-surface-elevated)]'
                  : 'mt-3 w-full rounded-lg border border-white/15 bg-surface/50 px-3 py-2 text-xs font-medium text-white hover:bg-white/10'
              }
            >
              套用並關閉
            </button>
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={triggerClass}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        title={`Logo：${modeLabel(exportMode)}`}
        onClick={() => setOpen((v) => !v)}
      >
        <PreviewMark
          mode={exportMode}
          customLogoBase64={customLogoBase64}
          size={28}
          isStudio={isStudio}
        />
        <span className="sr-only">Logo 設定</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {panel}
    </div>
  )
}
