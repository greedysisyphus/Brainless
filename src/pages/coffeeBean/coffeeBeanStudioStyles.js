/**
 * 咖啡豆頁專用 Studio 樣式與 shell（Classic 仍由各分支字串處理）。
 */

export const coffeeBeanStudioTokens = {
  cwBeanTitle: 'text-sm font-semibold text-[var(--cw-text)]',
  cwBeanDot: 'h-2 w-2 shrink-0 rounded-full bg-[var(--cw-text-muted)]',
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
