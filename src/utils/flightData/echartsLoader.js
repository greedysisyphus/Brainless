/** Singleton dynamic import — ECharts 僅在使用時載入，減輕航班資料頁首屏 bundle */
let echartsPromise

export function loadEcharts() {
  if (!echartsPromise) {
    echartsPromise = import('echarts')
  }
  return echartsPromise
}
