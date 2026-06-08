/**
 * 共用的 Studio surface / 表單類名（僅在 isStudio 時使用）。
 * Classic 分支請維持各頁原有 class，避免 import 此檔造成 bundle 混用。
 */

export const studioSurfaces = {
  /** 主內容區大面板（例如盤點表外殼） */
  pagePanel:
    'rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-surface)] shadow-[var(--cw-shadow-sm)]',
  /** 區塊卡片 */
  card: 'rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)]',
  /** 抬高表面（表頭、sticky 工具列） */
  elevated:
    'rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-surface-elevated)]',
  /** 全寬輸入（與 CwInput 對齊語意，不含 label） */
  input:
    'w-full min-h-11 rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-3 py-2.5 text-sm text-[var(--cw-text)] placeholder:text-[var(--cw-text-muted)] focus:border-[var(--cw-border-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--cw-focus-ring)]',
  /** Curated 風格篩選 chip */
  chip:
    'rounded-[var(--cw-radius-sm)] border border-transparent bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--cw-text-muted)] transition-colors duration-150 hover:border-[var(--cw-border)] hover:bg-[var(--cw-mega-surface)] hover:text-[var(--cw-text)]',
  chipActive:
    'rounded-[var(--cw-radius-sm)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] px-3 py-1.5 text-xs font-medium text-[var(--cw-text)] shadow-[var(--cw-shadow-sm)]',
  /** 小段說明文字 */
  muted: 'text-sm text-[var(--cw-text-muted)]',
  /** 標題層級對齊 StudioPageChrome */
  hSection: 'text-lg font-bold text-[var(--cw-text)]',
  /** 統計／KPI 區塊（取代螢光 accent 字） */
  statBlock: 'rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] p-3 text-center',
  statLabel: 'text-[10px] font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]',
  statValue: 'mt-1 text-lg font-bold tabular-nums text-[var(--cw-text)]',
  /** 分頁／Tab 選中 */
  tabActive:
    'border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] text-[var(--cw-text)]',
  /** 有數值的列高亮 */
  rowHighlight: 'border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)]',
}

/**
 * @param {boolean} isStudio
 * @returns {typeof studioSurfaces | Record<string, string>} studio 回傳共用表面；classic 回傳空字串佔位避免條件鍊過長
 */
export function getStudioSurfaces(isStudio) {
  if (!isStudio) {
    return new Proxy(
      {},
      {
        get() {
          return ''
        },
      }
    )
  }
  return studioSurfaces
}
