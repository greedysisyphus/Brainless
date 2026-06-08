/** ECharts 主題：對齊 studio `--cw-*` Token（字面與 CSS 保持一致） */

export const CW_ECHARTS_THEME_NAME = 'studioCw'

/** @param {typeof import('echarts')} echarts */
export function registerStudioEchartsTheme(echarts) {
  if (!echarts?.registerTheme) return
  if (echarts.__cwStudioThemeRegistered) return
  const border = 'rgba(255, 255, 255, 0.12)'
  const faint = 'rgba(255, 255, 255, 0.08)'
  const series = ['#71717a', '#a1a1aa', '#d4d4d8', '#52525b', '#3f3f46']
  echarts.registerTheme(CW_ECHARTS_THEME_NAME, {
    color: series,
    backgroundColor: '#161616',
    textStyle: { color: '#a3a3a3', fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" },
    categoryAxis: {
      axisLine: { lineStyle: { color: border } },
      axisTick: { lineStyle: { color: faint } },
      axisLabel: { color: '#a3a3a3' },
      splitLine: { lineStyle: { color: faint, type: 'dashed' } },
    },
    valueAxis: {
      axisLine: { lineStyle: { color: border } },
      axisTick: { lineStyle: { color: faint } },
      axisLabel: { color: '#a3a3a3' },
      splitLine: { lineStyle: { color: faint, type: 'dashed' } },
    },
    line: {
      itemStyle: { borderWidth: 1 },
      lineStyle: { width: 2 },
      symbolSize: 4,
      symbol: 'circle',
      smooth: false,
    },
    radar: {
      axisLine: { lineStyle: { color: border } },
      splitLine: { lineStyle: { color: faint } },
      axisName: { color: '#a3a3a3' },
    },
    toolbox: {
      iconStyle: { borderColor: '#a3a3a3' },
      emphasis: { iconStyle: { borderColor: '#f4f4f5' } },
    },
    legend: { textStyle: { color: '#a3a3a3' } },
    tooltip: {
      axisPointer: { lineStyle: { color: faint, width: 1 }, crossStyle: { color: faint } },
      backgroundColor: 'rgba(26, 26, 26, 0.94)',
      borderColor: border,
      borderWidth: 1,
      textStyle: { color: '#ffffff' },
    },
    timeline: { lineStyle: { color: border }, itemStyle: { color: '#a3a3a3' } },
    visualMap: { textStyle: { color: '#a3a3a3' } },
  })
  echarts.__cwStudioThemeRegistered = true
}
