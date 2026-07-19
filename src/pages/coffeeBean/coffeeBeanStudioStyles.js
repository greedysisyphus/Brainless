/**
 * 咖啡豆頁專用 Studio 樣式與 shell（Classic 仍由各分支字串處理）。
 */

export const coffeeBeanStudioTokens = {
  cwBeanTitle: 'text-sm font-semibold text-[var(--cw-text)]',
  cwBeanDot: 'h-2 w-2 shrink-0 rounded-full bg-[var(--cw-text-muted)]',
  cwInvInput:
    'input-field min-w-0 flex-1 rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-2.5 py-1.5 text-sm text-[var(--cw-text)] placeholder:text-[var(--cw-text-muted)] focus:border-[var(--cw-border-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--cw-focus-ring)]',
  cwInvInputLg:
    'input-field min-w-0 flex-1 rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-3 py-2 text-sm text-[var(--cw-text)] placeholder:text-[var(--cw-text-muted)] focus:border-[var(--cw-border-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--cw-focus-ring)]',
  cwCellModeGroup:
    'flex shrink-0 gap-0.5 rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] p-0.5',
  /** 數／袋／盒 選中（三種模式同一視覺，避免與群組底同色） */
  cwCellModeActive:
    'rounded-[var(--cw-radius-sm)] border border-[var(--cw-border-strong)] bg-[var(--cw-surface-elevated)] px-2 py-1 text-[11px] font-semibold text-[var(--cw-text)] shadow-[var(--cw-shadow-sm)] ring-1 ring-[var(--cw-focus-ring)]',
  cwCellModeIdle:
    'rounded-[var(--cw-radius-sm)] border border-transparent px-2 py-1 text-[11px] font-medium text-[var(--cw-text-muted)] hover:border-[var(--cw-border)] hover:bg-[var(--cw-mega-surface)] hover:text-[var(--cw-text)]',
  cwBeanFooterShell: 'mt-3 rounded-lg border border-[var(--cw-border)] bg-[var(--cw-mega-surface)] p-2',
  cwBeanFooterText: 'text-xs font-semibold text-[var(--cw-text)]',
}

export function getCoffeeBeanLayoutShells(isStudio) {
  return {
    beanCellShell: isStudio
      ? 'rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] p-3'
      : 'rounded-xl border border-white/10 bg-gradient-to-br from-surface/60 to-surface/40 p-3',
    calcCellShell: isStudio
      ? 'rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] p-4'
      : 'rounded-xl border border-white/10 bg-gradient-to-br from-surface/60 to-surface/40 p-4',
    weightFieldShell: isStudio
      ? 'rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] p-4'
      : 'rounded-xl border border-white/10 bg-gradient-to-br from-surface/40 to-surface/20 p-4',
    weightFieldShellSm: isStudio
      ? 'rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] p-3'
      : 'rounded-lg border border-white/10 bg-gradient-to-br from-surface/40 to-surface/20 p-3',
  }
}

export function getCoffeeCellModeBtnClass(isStudio, active, modeKey) {
  const t = coffeeBeanStudioTokens
  if (!active) {
    return isStudio ? t.cwCellModeIdle : 'text-text-secondary hover:bg-white/10'
  }
  if (!isStudio) {
    return modeKey === 'quantity' ? 'bg-primary/30 text-primary' : 'bg-amber-500/30 text-amber-400'
  }
  return t.cwCellModeActive
}
