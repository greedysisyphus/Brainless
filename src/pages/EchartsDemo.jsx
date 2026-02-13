import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import * as echarts from 'echarts'

// 與統計分析一致：圖表配色、背景、tooltip 樣式
const CHART_COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#3b82f6', '#f97316', '#10b981', '#ef4444', '#6366f1']
const CHART_BG = 'transparent'
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(30, 30, 30, 0.95)',
  borderColor: 'rgba(255,255,255,0.2)',
  borderWidth: 1,
  borderRadius: 8,
  textStyle: { color: 'rgba(255,255,255,0.9)' }
}
const AXIS_COLOR = 'rgba(255,255,255,0.6)'
const AXIS_LINE = 'rgba(255,255,255,0.15)'
const SPLIT_LINE = 'rgba(255,255,255,0.08)'
const TITLE_COLOR = 'rgba(255,255,255,0.9)'

/**
 * Charts Testing：熱力圖、柱狀圖、雷達圖、南丁格爾圖、日曆圖、箱型圖、桑基圖、面積圖等
 * 熱力圖、每日總數柱狀圖、每小時平均面積圖、雷達（週別）、南丁格爾（登機門）、桑基（登機門→目的地）皆可接真實航班 JSON
 */
function EchartsDemo() {
  const heatmapRef = useRef(null)
  const barRef = useRef(null)
  const radarRef = useRef(null)
  const roseRef = useRef(null)
  const calendarRef = useRef(null)
  const boxplotRef = useRef(null)
  const sankeyRef = useRef(null)
  const areaRef = useRef(null)
  const destBarRef = useRef(null)
  const airlineBarRef = useRef(null)
  const gaugeRef = useRef(null)
  const compareLineRef = useRef(null)

  const [realData, setRealData] = useState(null)
  const [loadingHeatmap, setLoadingHeatmap] = useState(true)
  const [destChartMode, setDestChartMode] = useState('bar') // 'bar' | 'race'

  // 從與航班資料頁相同的 data/ 載入多天航班，彙整：熱力圖、每日總數、每小時平均、週別、登機門、桑基
  const loadHeatmapFlightData = useCallback(async (days = 14) => {
    setLoadingHeatmap(true)
    try {
      const basePath = import.meta.env.PROD ? '/Brainless/data/' : '/data/'
      const today = new Date()
      const dataPromises = []
      for (let i = 0; i < days; i++) {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const dateStr = `${y}-${m}-${day}`
        const dataUrl = `${basePath}flight-data-${dateStr}.json`
        dataPromises.push(
          fetch(dataUrl, { cache: 'no-cache' })
            .then((res) => (res.ok ? res.json().then((data) => ({ data, dateStr })) : null))
            .catch(() => null)
        )
      }
      const results = await Promise.all(dataPromises)
      const countByDateHour = {}
      const totalByDate = {}
      const hourSums = Array(24).fill(0)
      const byWeekday = [0, 0, 0, 0, 0, 0, 0]
      const byGate = {}
      const gateToDest = {}
      const byDestination = {}
      const byAirline = {}
      const destinationByDate = {}
      let dayCount = 0
      results.forEach((result) => {
        if (!result || !result.data || !result.data.flights) return
        const dateStr = result.dateStr
        destinationByDate[dateStr] = {}
        const [y, m, d] = dateStr.split('-').map(Number)
        const weekday = new Date(y, m - 1, d).getDay()
        let dateTotal = 0
        result.data.flights.forEach((flight) => {
          const timeStr = flight.time || ''
          const hour = parseInt(timeStr.split(':')[0], 10)
          if (!Number.isNaN(hour) && hour >= 0 && hour <= 23) {
            const key = `${dateStr}-${hour}`
            countByDateHour[key] = (countByDateHour[key] || 0) + 1
            hourSums[hour] += 1
            dateTotal += 1
          }
          const gate = (flight.gate || '').replace(/R$/, '')
          const dest = (flight.destination || '').trim() || '其他'
          const airline = (flight.airline_name || flight.airline_code || '').trim() || '其他'
          if (gate) {
            byGate[gate] = (byGate[gate] || 0) + 1
            const linkKey = `${gate}|${dest}`
            gateToDest[linkKey] = (gateToDest[linkKey] || 0) + 1
          }
          byDestination[dest] = (byDestination[dest] || 0) + 1
          byAirline[airline] = (byAirline[airline] || 0) + 1
          destinationByDate[dateStr][dest] = (destinationByDate[dateStr][dest] || 0) + 1
        })
        totalByDate[dateStr] = dateTotal
        byWeekday[weekday] = (byWeekday[weekday] || 0) + dateTotal
        dayCount += 1
      })
      const hourlyAvg = dayCount > 0 ? hourSums.map((s) => Math.round((s / dayCount) * 10) / 10) : hourSums
      const gates = [...new Set(Object.keys(byGate))]
      const dests = [...new Set(Object.keys(gateToDest).map((k) => k.split('|')[1]))]
      const sankeyNodes = [...gates.map((g) => ({ name: g })), ...dests.map((d) => ({ name: d }))]
      const sankeyLinks = Object.entries(gateToDest).map(([key, value]) => {
        const [source, target] = key.split('|')
        return { source, target, value }
      })
      setRealData({
        countByDateHour,
        totalByDate,
        destinationByDate,
        hourlyAvg,
        byWeekday,
        byGate,
        byDestination,
        byAirline,
        sankey: { nodes: sankeyNodes, links: sankeyLinks },
        dayCount
      })
    } catch (e) {
      console.error('載入航班資料失敗:', e)
      setRealData(null)
    } finally {
      setLoadingHeatmap(false)
    }
  }, [])

  useEffect(() => {
    loadHeatmapFlightData(14)
  }, [loadHeatmapFlightData])

  // 熱力圖資料：有真實資料則用 (日期, 時段) 實際班次，缺的格為 0；無則用假資料
  const heatmapData = useMemo(() => {
    const end = new Date()
    const data = []
    const countByDateHour = realData?.countByDateHour
    for (let d = 13; d >= 0; d--) {
      const date = new Date(end.getFullYear(), end.getMonth(), end.getDate() - d)
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${day}`
      for (let h = 0; h < 24; h++) {
        let value
        if (countByDateHour) {
          const key = `${dateStr}-${h}`
          value = countByDateHour[key] ?? 0
        } else {
          const seed = (s) => {
            let h0 = 0
            for (let i = 0; i < s.length; i++) h0 = (Math.imul(31, h0) + s.charCodeAt(i)) | 0
            return Math.abs(h0)
          }
          const n = seed(`${dateStr}-${h}`) % 12
          const peak = (h >= 6 && h <= 10 ? 8 : 0) + (h >= 17 && h <= 21 ? 6 : 0)
          value = n + peak
        }
        data.push([dateStr, h, value])
      }
    }
    return data
  }, [realData])

  // 每日總航班數（柱狀圖）：真實資料或假資料
  const barChartData = useMemo(() => {
    if (realData?.totalByDate && Object.keys(realData.totalByDate).length > 0) {
      const dates = Object.keys(realData.totalByDate).sort()
      return dates.map((d) => {
        const [y, m, day] = d.split('-')
        return { date: d, label: `${Number(m)}/${Number(day)}`, value: realData.totalByDate[d] }
      })
    }
    const end = new Date()
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (13 - i))
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${day}`
      return { date: dateStr, label: `${Number(m)}/${Number(day)}`, value: Math.floor(Math.random() * 30) + 80 }
    })
  }, [realData])

  // 雷達圖：一週各日航班數（真實資料或假資料）
  const radarData = useMemo(() => {
    const names = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
    if (realData?.byWeekday && realData.byWeekday.some((v) => v > 0)) {
      const values = realData.byWeekday
      const max = Math.max(60, ...values)
      return { indicators: names.map((name, i) => ({ name, max })), values }
    }
    return {
      indicators: names.map((n) => ({ name: n, max: 60 })),
      values: [44, 42, 38, 45, 40, 52, 48]
    }
  }, [realData])

  // 南丁格爾圖：各登機門航班數（真實資料或假資料）
  const roseData = useMemo(() => {
    if (realData?.byGate && Object.keys(realData.byGate).length > 0) {
      const gates = ['D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18']
      const list = gates.map((g) => ({ name: g, value: realData.byGate[g] ?? 0 })).filter((d) => d.value > 0)
      if (list.length > 0) return list
    }
    return [
      { name: 'D11', value: 12 },
      { name: 'D12', value: 18 },
      { name: 'D13', value: 15 },
      { name: 'D14', value: 22 },
      { name: 'D15', value: 14 },
      { name: 'D16', value: 10 },
      { name: 'D17', value: 8 },
      { name: 'D18', value: 6 }
    ]
  }, [realData])

  // 日曆圖：有真實資料用近 14 日每日總班次，無則當月假資料
  const calendarData = useMemo(() => {
    if (realData?.totalByDate && Object.keys(realData.totalByDate).length > 0) {
      return Object.entries(realData.totalByDate).map(([dateStr, value]) => [dateStr, value])
    }
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const data = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      data.push([dateStr, Math.floor(Math.random() * 25) + 15])
    }
    return data
  }, [realData])

  const calendarRange = useMemo(() => {
    if (realData?.totalByDate && Object.keys(realData.totalByDate).length > 0) {
      const dates = Object.keys(realData.totalByDate).sort()
      return [dates[0], dates[dates.length - 1]]
    }
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [realData])

  // 箱型圖：每小時航班數分布（多日）[min, Q1, median, Q3, max]，真實資料或假資料
  const boxplotData = useMemo(() => {
    if (realData?.countByDateHour && realData?.totalByDate) {
      const dates = Object.keys(realData.totalByDate).sort()
      return Array.from({ length: 24 }, (_, h) => {
        const raw = dates.map((dateStr) => realData.countByDateHour[`${dateStr}-${h}`] ?? 0).filter((v) => v != null)
        if (raw.length === 0) return [0, 0, 0, 0, 0]
        raw.sort((a, b) => a - b)
        const min = raw[0]
        const max = raw[raw.length - 1]
        const q1 = raw[Math.floor(raw.length * 0.25)]
        const median = raw[Math.floor(raw.length * 0.5)]
        const q3 = raw[Math.floor(raw.length * 0.75)]
        return [min, q1, median, q3, max]
      })
    }
    return Array.from({ length: 24 }, (_, h) => {
      const base = (h >= 6 && h <= 10 ? 6 : 0) + (h >= 17 && h <= 21 ? 4 : 0)
      const raw = Array.from({ length: 14 }, () => Math.floor(Math.random() * 10) + base)
      raw.sort((a, b) => a - b)
      const min = raw[0]
      const max = raw[raw.length - 1]
      const q1 = raw[Math.floor(raw.length * 0.25)]
      const median = raw[Math.floor(raw.length * 0.5)]
      const q3 = raw[Math.floor(raw.length * 0.75)]
      return [min, q1, median, q3, max]
    })
  }, [realData])

  // 桑基圖：登機門 → 目的地（真實資料或假資料）
  const sankeyData = useMemo(() => {
    if (realData?.sankey?.nodes?.length && realData.sankey.links?.length) {
      return realData.sankey
    }
    const nodes = [
      { name: 'D11' }, { name: 'D12' }, { name: 'D13' }, { name: 'D14' },
      { name: 'D15' }, { name: 'D16' }, { name: 'D17' }, { name: 'D18' },
      { name: 'NRT 東京' }, { name: 'HKG 香港' }, { name: 'ICN 首爾' }, { name: 'BKK 曼谷' },
      { name: 'SIN 新加坡' }, { name: 'KIX 大阪' }, { name: 'PVG 上海' }
    ]
    const links = [
      { source: 'D11', target: 'NRT 東京', value: 8 },
      { source: 'D11', target: 'HKG 香港', value: 5 },
      { source: 'D12', target: 'ICN 首爾', value: 10 },
      { source: 'D12', target: 'HKG 香港', value: 8 },
      { source: 'D13', target: 'BKK 曼谷', value: 7 },
      { source: 'D14', target: 'SIN 新加坡', value: 6 },
      { source: 'D14', target: 'HKG 香港', value: 9 },
      { source: 'D15', target: 'KIX 大阪', value: 5 },
      { source: 'D15', target: 'PVG 上海', value: 6 },
      { source: 'D16', target: 'ICN 首爾', value: 4 },
      { source: 'D17', target: 'NRT 東京', value: 3 },
      { source: 'D18', target: 'BKK 曼谷', value: 2 }
    ]
    return { nodes, links }
  }, [realData])

  // 面積圖：每小時航班數（真實為多日平均，無則假資料）
  const areaData = useMemo(() => {
    if (realData?.hourlyAvg?.length) {
      return realData.hourlyAvg.map((count, h) => ({ hour: `${h}:00`, count }))
    }
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}:00`,
      count: Math.floor(Math.random() * 8) + (h >= 6 && h <= 10 ? 5 : 0) + (h >= 17 && h <= 21 ? 4 : 0)
    }))
  }, [realData])

  // 目的地 Top 10（橫向柱狀圖）
  const destBarData = useMemo(() => {
    if (realData?.byDestination && Object.keys(realData.byDestination).length > 0) {
      return Object.entries(realData.byDestination)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }))
    }
    return [
      { name: '東京 NRT', value: 28 },
      { name: '香港 HKG', value: 24 },
      { name: '首爾 ICN', value: 18 },
      { name: '曼谷 BKK', value: 14 },
      { name: '大阪 KIX', value: 12 },
      { name: '上海 PVG', value: 10 },
      { name: '新加坡 SIN', value: 8 },
      { name: '沖繩 OKA', value: 6 },
      { name: '宿霧 CEB', value: 4 },
      { name: '其他', value: 12 }
    ]
  }, [realData])

  // Bar Race：依「有統計的日期」累加目的地班次，每幀為該日止的 Top 10（累計）；日期嚴格由早到晚
  const destRaceFrames = useMemo(() => {
    const dbd = realData?.destinationByDate
    if (!dbd || Object.keys(dbd).length === 0) return []
    const dates = Object.keys(dbd).sort((a, b) => a.localeCompare(b))
    return dates.map((dateStr, i) => {
      const cumulative = {}
      for (let j = 0; j <= i; j++) {
        const day = dbd[dates[j]] || {}
        Object.entries(day).forEach(([dest, count]) => {
          cumulative[dest] = (cumulative[dest] || 0) + count
        })
      }
      const top10 = Object.entries(cumulative)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
      return { date: dateStr, names: top10.map((d) => d[0]), values: top10.map((d) => d[1]) }
    })
  }, [realData])

  // KPI：今日、昨日航班數（來自 totalByDate）
  const kpiToday = useMemo(() => {
    if (!realData?.totalByDate) return null
    const t = new Date()
    const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
    const y = new Date(t.getTime() - 86400000)
    const yesterdayStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
    return {
      today: realData.totalByDate[todayStr] ?? '—',
      yesterday: realData.totalByDate[yesterdayStr] ?? '—'
    }
  }, [realData])

  // 航空公司 Top 10（橫向柱狀圖）
  const airlineBarData = useMemo(() => {
    if (realData?.byAirline && Object.keys(realData.byAirline).length > 0) {
      return Object.entries(realData.byAirline)
        .filter(([name]) => name !== '其他')
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }))
    }
    return [
      { name: '長榮航空', value: 45 },
      { name: '中華航空', value: 38 },
      { name: '星宇航空', value: 28 },
      { name: '國泰航空', value: 18 },
      { name: '日本航空', value: 14 },
      { name: '韓亞航空', value: 10 },
      { name: '泰國航空', value: 8 },
      { name: '新加坡航空', value: 6 },
      { name: '全日本空輸', value: 5 },
      { name: '其他', value: 12 }
    ]
  }, [realData])

  // 儀表盤：近 14 日總航班數
  const gaugeTotal = useMemo(() => {
    if (!realData?.totalByDate) return 0
    return Object.values(realData.totalByDate).reduce((a, b) => a + b, 0)
  }, [realData])

  // 今日 vs 昨日 每小時航班數（雙線比較）
  const compareLineData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)
    if (realData?.countByDateHour) {
      const t = new Date()
      const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
      const y = new Date(t.getTime() - 86400000)
      const yesterdayStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
      const todayCounts = hours.map((_, h) => realData.countByDateHour[`${todayStr}-${h}`] ?? 0)
      const yesterdayCounts = hours.map((_, h) => realData.countByDateHour[`${yesterdayStr}-${h}`] ?? 0)
      return { hours, todayCounts, yesterdayCounts, todayStr, yesterdayStr }
    }
    const todayCounts = Array.from({ length: 24 }, (_, h) => Math.floor(Math.random() * 6) + (h >= 6 && h <= 10 ? 4 : 0) + (h >= 17 && h <= 21 ? 3 : 0))
    const yesterdayCounts = Array.from({ length: 24 }, (_, h) => Math.floor(Math.random() * 6) + (h >= 6 && h <= 10 ? 3 : 0) + (h >= 17 && h <= 21 ? 2 : 0))
    const t = new Date()
    const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
    const y = new Date(t.getTime() - 86400000)
    const yesterdayStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
    return { hours, todayCounts, yesterdayCounts, todayStr, yesterdayStr }
  }, [realData])

  useEffect(() => {
    if (!heatmapRef.current) return
    const chart = echarts.init(heatmapRef.current, 'dark')
    const dates = [...new Set(heatmapData.map((d) => d[0]))]
    const heatmapSeriesData = heatmapData.map(([dateStr, h, value]) => [h, dates.indexOf(dateStr), value])
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    const formatDateShort = (dateStr) => {
      const [y, m, d] = dateStr.split('-')
      const date = new Date(y, parseInt(m, 10) - 1, parseInt(d, 10))
      return `${parseInt(m, 10)}/${parseInt(d, 10)}（週${weekdays[date.getDay()]}）`
    }
    const yAxisLabels = dates.map((d) => {
      const [_, m, day] = d.split('-')
      return `${parseInt(m, 10)}/${parseInt(day, 10)}`
    })
    const values = heatmapSeriesData.map((d) => d[2])
    const dataMax = Math.max(1, ...values)
    const option = {
      backgroundColor: CHART_BG,
      title: { text: '每小時航班數熱力圖（日期 × 時段）', left: 'center', textStyle: { color: TITLE_COLOR } },
      tooltip: {
        trigger: 'item',
        position: 'top',
        ...TOOLTIP_STYLE,
        formatter: (p) => {
          const [hour, dateIdx, value] = p.data
          const dateStr = dates[dateIdx]
          return `<strong>${formatDateShort(dateStr)}</strong><br/>${String(hour).padStart(2, '0')}:00～${String(hour).padStart(2, '0')}:59 · <strong>${value} 班</strong>`
        }
      },
      grid: { left: 56, right: 48, top: 44, bottom: 92 },
      xAxis: {
        type: 'category',
        name: '時段',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: AXIS_COLOR, fontSize: 11 },
        data: Array.from({ length: 24 }, (_, i) => `${i}`),
        axisLabel: { color: AXIS_COLOR, fontSize: 10, interval: 2 },
        axisLine: { lineStyle: { color: AXIS_LINE } },
        splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } }
      },
      yAxis: {
        type: 'category',
        name: '日期',
        nameLocation: 'middle',
        nameGap: 42,
        nameTextStyle: { color: AXIS_COLOR, fontSize: 11 },
        data: yAxisLabels,
        axisLabel: { color: AXIS_COLOR, fontSize: 10 },
        axisLine: { lineStyle: { color: AXIS_LINE } },
        splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } }
      },
      visualMap: {
        type: 'continuous',
        min: 0,
        max: dataMax,
        range: [0, dataMax],
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 12,
        itemWidth: 14,
        itemHeight: 380,
        text: ['多', '少'],
        textStyle: { color: AXIS_COLOR, fontSize: 10 },
        inRange: {
          color: [
            '#0f172a',
            '#0e7490',
            '#06b6d4',
            '#10b981',
            '#eab308',
            '#f97316',
            '#ef4444'
          ]
        }
      },
      series: [{
        type: 'heatmap',
        data: heatmapSeriesData,
        itemStyle: { borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1 },
        emphasis: { itemStyle: { borderColor: CHART_COLORS[0], borderWidth: 2 } }
      }]
    }
    chart.setOption(option)
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [heatmapData])

  useEffect(() => {
    if (!barRef.current) return
    const chart = echarts.init(barRef.current, 'dark')
    const option = {
      backgroundColor: CHART_BG,
      title: { text: '每日總航班數（柱狀圖）', left: 'center', textStyle: { color: TITLE_COLOR } },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const p = params?.[0]
          if (!p) return ''
          const i = p.dataIndex
          const d = barChartData[i]
          return `${d?.date ?? ''}<br/>${p.marker} ${p.value} 班`
        },
        ...TOOLTIP_STYLE
      },
      grid: { left: 50, right: 30, top: 50, bottom: 60 },
      xAxis: {
        type: 'category',
        data: barChartData.map((d) => d.label),
        axisLabel: { color: AXIS_COLOR, fontSize: 10, rotate: 45 },
        axisLine: { lineStyle: { color: AXIS_LINE } }
      },
      yAxis: {
        type: 'value',
        name: '航班數',
        nameTextStyle: { color: AXIS_COLOR },
        axisLabel: { color: AXIS_COLOR },
        splitLine: { lineStyle: { color: SPLIT_LINE } }
      },
      series: [{
        type: 'bar',
        data: barChartData.map((d) => d.value),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: CHART_COLORS[0] },
            { offset: 1, color: CHART_COLORS[2] }
          ])
        },
        emphasis: { itemStyle: { color: CHART_COLORS[1] } }
      }]
    }
    chart.setOption(option)
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [barChartData])

  useEffect(() => {
    if (!radarRef.current) return
    const chart = echarts.init(radarRef.current, 'dark')
    const option = {
      backgroundColor: CHART_BG,
      title: { text: '一週各日平均航班數（雷達圖）', left: 'center', textStyle: { color: TITLE_COLOR } },
      tooltip: TOOLTIP_STYLE,
      radar: {
        indicator: radarData.indicators,
        splitArea: { areaStyle: { color: [`${CHART_COLORS[0]}14`, `${CHART_COLORS[0]}28`] } },
        axisLine: { lineStyle: { color: AXIS_LINE } },
        splitLine: { lineStyle: { color: AXIS_LINE } },
        axisName: { color: TITLE_COLOR }
      },
      series: [{
        type: 'radar',
        data: [{ value: radarData.values, name: '平均航班數', areaStyle: { color: `${CHART_COLORS[0]}66` }, lineStyle: { color: CHART_COLORS[0] }, itemStyle: { color: CHART_COLORS[0] } }]
      }]
    }
    chart.setOption(option)
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [radarData])

  useEffect(() => {
    if (!roseRef.current) return
    const chart = echarts.init(roseRef.current, 'dark')
    const option = {
      backgroundColor: CHART_BG,
      title: { text: '各登機門航班占比（南丁格爾圖）', left: 'center', textStyle: { color: TITLE_COLOR } },
      tooltip: { trigger: 'item', formatter: '{b}: {c} 班 ({d}%)', ...TOOLTIP_STYLE },
      legend: { orient: 'vertical', left: 'left', textStyle: { color: AXIS_COLOR } },
      series: [{
        type: 'pie',
        radius: [20, 120],
        center: ['55%', '55%'],
        roseType: 'area',
        itemStyle: { borderRadius: 6 },
        data: roseData.map((d, i) => ({ ...d, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] } }))
      }]
    }
    chart.setOption(option)
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [roseData])

  useEffect(() => {
    if (!calendarRef.current) return
    const chart = echarts.init(calendarRef.current, 'dark')
    const option = {
      backgroundColor: CHART_BG,
      title: {
        text: Array.isArray(calendarRange) ? '近 14 日每日航班數（日曆圖）' : '當月每日航班數（日曆圖）',
        left: 'center',
        textStyle: { color: TITLE_COLOR }
      },
      tooltip: { formatter: (p) => `${p.data[0]}: ${p.data[1]} 班`, ...TOOLTIP_STYLE },
      calendar: {
        top: 50,
        left: 40,
        right: 40,
        bottom: 30,
        range: calendarRange,
        cellSize: ['auto', 22],
        itemStyle: { borderWidth: 2, borderColor: AXIS_LINE },
        dayLabel: { color: AXIS_COLOR },
        monthLabel: { color: TITLE_COLOR },
        yearLabel: { color: TITLE_COLOR }
      },
      visualMap: {
        min: 0,
        max: Math.max(1, 45, ...(calendarData.map((d) => d[1]) || [])),
        type: 'piecewise',
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: { color: ['#0f172a', CHART_COLORS[2], CHART_COLORS[3], CHART_COLORS[0], CHART_COLORS[4]] },
        textStyle: { color: AXIS_COLOR }
      },
      series: [{
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: calendarData
      }]
    }
    chart.setOption(option)
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [calendarData, calendarRange])

  useEffect(() => {
    if (!boxplotRef.current) return
    const chart = echarts.init(boxplotRef.current, 'dark')
    const hours = Array.from({ length: 24 }, (_, i) => `${i}`)
    const option = {
      backgroundColor: CHART_BG,
      title: { text: '每小時航班數分布（箱型圖，多日）', left: 'center', textStyle: { color: TITLE_COLOR } },
      tooltip: {
        trigger: 'item',
        formatter: (p) => {
          const [min, q1, median, q3, max] = p.data
          return `${p.name}:00<br/>最小 ${min} / Q1 ${q1} / 中位 ${median} / Q3 ${q3} / 最大 ${max} 班`
        },
        ...TOOLTIP_STYLE
      },
      grid: { left: 50, right: 30, top: 50, bottom: 60 },
      xAxis: { type: 'category', data: hours, axisLabel: { color: AXIS_COLOR }, axisLine: { lineStyle: { color: AXIS_LINE } } },
      yAxis: { type: 'value', name: '航班數', nameTextStyle: { color: AXIS_COLOR }, axisLabel: { color: AXIS_COLOR }, splitLine: { lineStyle: { color: SPLIT_LINE } } },
      series: [{
        type: 'boxplot',
        data: boxplotData,
        itemStyle: { color: CHART_COLORS[0], borderColor: CHART_COLORS[3] },
        emphasis: { itemStyle: { borderColor: CHART_COLORS[1] } }
      }]
    }
    chart.setOption(option)
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [boxplotData])

  useEffect(() => {
    if (!sankeyRef.current) return
    const chart = echarts.init(sankeyRef.current, 'dark')
    const option = {
      backgroundColor: CHART_BG,
      title: { text: '登機門 → 目的地 流量（桑基圖）', left: 'center', textStyle: { color: TITLE_COLOR } },
      tooltip: { trigger: 'item', formatter: '{b}: {c} 班', ...TOOLTIP_STYLE },
      color: CHART_COLORS,
      series: [{
        type: 'sankey',
        data: sankeyData.nodes.map((n) => ({ name: n.name })),
        links: sankeyData.links,
        lineStyle: { color: 'gradient', curveness: 0.5 },
        itemStyle: { borderWidth: 0 },
        label: { color: TITLE_COLOR },
        emphasis: { focus: 'adjacency' }
      }]
    }
    chart.setOption(option)
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [sankeyData])

  useEffect(() => {
    if (!areaRef.current) return
    const chart = echarts.init(areaRef.current, 'dark')
    const option = {
      backgroundColor: CHART_BG,
      title: { text: '每小時航班數（面積圖）', left: 'center', textStyle: { color: TITLE_COLOR } },
      tooltip: { trigger: 'axis', formatter: '{b}<br/>{a}: {c} 班', ...TOOLTIP_STYLE },
      grid: { left: 50, right: 30, top: 50, bottom: 50 },
      xAxis: { type: 'category', boundaryGap: false, data: areaData.map((d) => d.hour), axisLabel: { color: AXIS_COLOR }, axisLine: { lineStyle: { color: AXIS_LINE } } },
      yAxis: { type: 'value', name: '航班數', nameTextStyle: { color: AXIS_COLOR }, axisLabel: { color: AXIS_COLOR }, splitLine: { lineStyle: { color: SPLIT_LINE } } },
      series: [{
        type: 'line',
        name: '航班數',
        data: areaData.map((d) => d.count),
        smooth: true,
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: `${CHART_COLORS[2]}80` }, { offset: 1, color: `${CHART_COLORS[2]}08` }]) },
        lineStyle: { color: CHART_COLORS[2] },
        itemStyle: { color: CHART_COLORS[2] }
      }]
    }
    chart.setOption(option)
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [areaData])

  useEffect(() => {
    if (!destBarRef.current) return
    const chart = echarts.init(destBarRef.current, 'dark')
    const formatDateLabel = (dateStr) => {
      const [y, m, d] = dateStr.split('-')
      return `${Number(m)}/${Number(d)}`
    }
    if (destChartMode === 'race' && destRaceFrames.length > 0) {
      const baseOption = {
        backgroundColor: CHART_BG,
        title: { text: '目的地航班數 Bar Race（累計 Top 10）', left: 'center', textStyle: { color: TITLE_COLOR } },
        tooltip: {
          trigger: 'axis',
          ...TOOLTIP_STYLE,
          formatter: (params) => {
            if (!params?.length) return ''
            const p = params[0]
            return `${p.name}<br/>${p.marker} ${p.value} 班（累計）`
          }
        },
        grid: { left: 120, right: 50, top: 50, bottom: 60 },
        animationDuration: 0,
        animationDurationUpdate: 2000,
        animationEasing: 'linear',
        animationEasingUpdate: 'linear',
        xAxis: { type: 'value', name: '航班數', nameTextStyle: { color: AXIS_COLOR }, axisLabel: { color: AXIS_COLOR }, splitLine: { lineStyle: { color: SPLIT_LINE } } },
        yAxis: {
          type: 'category',
          inverse: true,
          axisLabel: { color: AXIS_COLOR, fontSize: 10 },
          axisLine: { lineStyle: { color: AXIS_LINE } },
          animationDuration: 300,
          animationDurationUpdate: 300
        },
        series: [{
          type: 'bar',
          realtimeSort: true,
          animationDurationUpdate: 2000,
          animationEasingUpdate: 'linear',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: CHART_COLORS[3] },
              { offset: 1, color: CHART_COLORS[0] }
            ])
          },
          emphasis: { itemStyle: { color: CHART_COLORS[1] } },
          label: {
            show: true,
            position: 'right',
            color: AXIS_COLOR,
            formatter: '{c} 班',
            valueAnimation: true
          }
        }]
      }
      const option = {
        ...baseOption,
        timeline: {
          data: destRaceFrames.map((f) => formatDateLabel(f.date)),
          left: 'center',
          bottom: 8,
          width: '80%',
          axisType: 'category',
          currentIndex: 0,
          realtime: false,
          playReverse: false,
          rewind: false,
          loop: true,
          label: { color: AXIS_COLOR, fontSize: 10 },
          checkpointStyle: { color: CHART_COLORS[0] },
          controlStyle: { show: true, itemSize: 14, itemGap: 12, color: AXIS_COLOR },
          playInterval: 500,
          autoPlay: true
        },
        options: destRaceFrames.map((frame) => ({
          yAxis: { data: frame.names },
          series: [{ data: frame.values }]
        }))
      }
      chart.setOption(option, { notMerge: true })
      setTimeout(() => {
        chart.dispatchAction({ type: 'timelineChange', currentIndex: 0 })
      }, 0)
    } else {
      const option = {
        backgroundColor: CHART_BG,
        title: { text: '目的地航班數 Top 10（橫向柱狀圖）', left: 'center', textStyle: { color: TITLE_COLOR } },
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            const p = params?.[0]
            if (!p) return ''
            const i = p.dataIndex
            const d = destBarData[i]
            return `${d?.name ?? ''}<br/>${p.marker} ${p.value} 班`
          },
          ...TOOLTIP_STYLE
        },
        grid: { left: 120, right: 40, top: 50, bottom: 40 },
        xAxis: {
          type: 'value',
          name: '航班數',
          nameTextStyle: { color: AXIS_COLOR },
          axisLabel: { color: AXIS_COLOR },
          splitLine: { lineStyle: { color: SPLIT_LINE } }
        },
        yAxis: {
          type: 'category',
          data: destBarData.map((d) => d.name),
          axisLabel: { color: AXIS_COLOR, fontSize: 10 },
          axisLine: { lineStyle: { color: AXIS_LINE } }
        },
        series: [{
          type: 'bar',
          data: destBarData.map((d) => d.value),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: CHART_COLORS[3] },
              { offset: 1, color: CHART_COLORS[0] }
            ])
          },
          emphasis: { itemStyle: { color: CHART_COLORS[1] } }
        }]
      }
      chart.setOption(option)
    }
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [destBarData, destChartMode, destRaceFrames])

  useEffect(() => {
    if (!airlineBarRef.current) return
    const chart = echarts.init(airlineBarRef.current, 'dark')
    const option = {
      backgroundColor: CHART_BG,
      title: { text: '航空公司航班數 Top 10（橫向柱狀圖）', left: 'center', textStyle: { color: TITLE_COLOR } },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const p = params?.[0]
          if (!p) return ''
          const i = p.dataIndex
          const d = airlineBarData[i]
          return `${d?.name ?? ''}<br/>${p.marker} ${p.value} 班`
        },
        ...TOOLTIP_STYLE
      },
      grid: { left: 100, right: 40, top: 50, bottom: 40 },
      xAxis: {
        type: 'value',
        name: '航班數',
        nameTextStyle: { color: AXIS_COLOR },
        axisLabel: { color: AXIS_COLOR },
        splitLine: { lineStyle: { color: SPLIT_LINE } }
      },
      yAxis: {
        type: 'category',
        data: airlineBarData.map((d) => d.name),
        axisLabel: { color: AXIS_COLOR, fontSize: 10 },
        axisLine: { lineStyle: { color: AXIS_LINE } }
      },
      series: [{
        type: 'bar',
        data: airlineBarData.map((d) => d.value),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: CHART_COLORS[4] },
            { offset: 1, color: CHART_COLORS[5] }
          ])
        },
        emphasis: { itemStyle: { color: CHART_COLORS[1] } }
      }]
    }
    chart.setOption(option)
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [airlineBarData])

  useEffect(() => {
    if (!gaugeRef.current) return
    const chart = echarts.init(gaugeRef.current, 'dark')
    const max = Math.max(1, Math.ceil((gaugeTotal * 1.2) / 100) * 100)
    const option = {
      backgroundColor: CHART_BG,
      title: { text: '近 14 日總航班數（儀表盤）', left: 'center', textStyle: { color: TITLE_COLOR } },
      tooltip: { formatter: () => `近 14 日合計：${gaugeTotal} 班`, ...TOOLTIP_STYLE },
      series: [{
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max,
        splitNumber: 5,
        itemStyle: { color: CHART_COLORS[0] },
        progress: { show: true, width: 14, roundCap: true },
        pointer: { show: false },
        axisLine: { lineStyle: { width: 14, color: [[1, 'rgba(255,255,255,0.08)']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { color: AXIS_COLOR, distance: -24 },
        title: { show: false },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '10%'],
          fontSize: 28,
          fontWeight: 'bold',
          color: TITLE_COLOR,
          formatter: '{value} 班'
        },
        data: [{ value: gaugeTotal }]
      }]
    }
    chart.setOption(option)
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [gaugeTotal])

  useEffect(() => {
    if (!compareLineRef.current) return
    const chart = echarts.init(compareLineRef.current, 'dark')
    const { hours, todayCounts, yesterdayCounts, todayStr, yesterdayStr } = compareLineData
    const formatLabel = (s) => {
      const [y, m, d] = s.split('-')
      return `${Number(m)}/${Number(d)}`
    }
    const option = {
      backgroundColor: CHART_BG,
      title: { text: '今日 vs 昨日 每小時航班數', left: 'center', textStyle: { color: TITLE_COLOR } },
      tooltip: {
        trigger: 'axis',
        ...TOOLTIP_STYLE,
        formatter: (params) => {
          if (!params?.length) return ''
          const h = params[0].dataIndex
          const today = todayCounts[h]
          const yesterday = yesterdayCounts[h]
          return `${String(h).padStart(2, '0')}:00<br/>${formatLabel(todayStr)}: ${today} 班<br/>${formatLabel(yesterdayStr)}: ${yesterday} 班`
        }
      },
      legend: {
        data: [formatLabel(todayStr), formatLabel(yesterdayStr)],
        bottom: 0,
        textStyle: { color: AXIS_COLOR }
      },
      grid: { left: 50, right: 30, top: 50, bottom: 36 },
      xAxis: { type: 'category', boundaryGap: false, data: hours, axisLabel: { color: AXIS_COLOR }, axisLine: { lineStyle: { color: AXIS_LINE } } },
      yAxis: { type: 'value', name: '航班數', nameTextStyle: { color: AXIS_COLOR }, axisLabel: { color: AXIS_COLOR }, splitLine: { lineStyle: { color: SPLIT_LINE } } },
      series: [
        { type: 'line', name: formatLabel(todayStr), data: todayCounts, smooth: true, lineStyle: { color: CHART_COLORS[0] }, itemStyle: { color: CHART_COLORS[0] } },
        { type: 'line', name: formatLabel(yesterdayStr), data: yesterdayCounts, smooth: true, lineStyle: { color: CHART_COLORS[2] }, itemStyle: { color: CHART_COLORS[2] } }
      ]
    }
    chart.setOption(option)
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [compareLineData])

  return (
    <div className="min-h-screen bg-background text-primary p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Charts Testing</h1>
          <p className="text-text-secondary text-sm sm:text-base">
            熱力圖、柱狀、雷達、南丁格爾、日曆、箱型、桑基、面積、目的地/航空公司 Top10、儀表盤、今日vs昨日 — 皆接真實航班資料
          </p>
        </header>

        {kpiToday != null && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center">
              <p className="text-text-secondary text-sm">今日航班數</p>
              <p className="text-2xl font-bold text-primary mt-1">{kpiToday.today}</p>
              <p className="text-xs text-text-secondary mt-0.5">班</p>
            </div>
            <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center">
              <p className="text-text-secondary text-sm">昨日航班數</p>
              <p className="text-2xl font-bold text-primary mt-1">{kpiToday.yesterday}</p>
              <p className="text-xs text-text-secondary mt-0.5">班</p>
            </div>
            <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 col-span-2 sm:col-span-1 flex items-center justify-center min-h-[120px]">
              <div ref={gaugeRef} className="w-full h-[120px]" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg relative">
            {loadingHeatmap && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface/60 rounded-xl z-10">
                <span className="text-text-secondary text-sm">載入航班資料中…</span>
              </div>
            )}
            <p className="text-xs text-text-secondary mb-1">
              資料來源：與「航班資料／統計分析」相同（data/ flight-data-*.json）
            </p>
            <div ref={heatmapRef} className="w-full h-[340px]" />
          </div>
          <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg">
            <p className="text-xs text-text-secondary mb-1">
              同上資料：近 14 日每日總班次
            </p>
            <div ref={barRef} className="w-full h-[320px]" />
          </div>
          <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg">
            <div ref={radarRef} className="w-full h-[320px]" />
          </div>
          <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg">
            <div ref={roseRef} className="w-full h-[320px]" />
          </div>
          <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg">
            <div ref={calendarRef} className="w-full h-[360px]" />
          </div>
          <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg">
            <div ref={boxplotRef} className="w-full h-[320px]" />
          </div>
          <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg">
            <div ref={areaRef} className="w-full h-[320px]" />
          </div>
          <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg">
            <p className="text-xs text-text-secondary mb-1">同上資料：目的地彙總</p>
            {destRaceFrames.length > 0 && (
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setDestChartMode('bar')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${destChartMode === 'bar' ? 'bg-white/15 text-primary' : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}
                >
                  柱狀圖
                </button>
                <button
                  type="button"
                  onClick={() => setDestChartMode('race')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${destChartMode === 'race' ? 'bg-white/15 text-primary' : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}
                >
                  Bar Race
                </button>
              </div>
            )}
            <div ref={destBarRef} className="w-full h-[320px]" />
          </div>
          <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg">
            <p className="text-xs text-text-secondary mb-1">同上資料：航空公司彙總</p>
            <div ref={airlineBarRef} className="w-full h-[320px]" />
          </div>
          <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg lg:col-span-2">
            <p className="text-xs text-text-secondary mb-1">今日 vs 昨日 每小時班次</p>
            <div ref={compareLineRef} className="w-full h-[280px]" />
          </div>
          <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg lg:col-span-2">
            <div ref={sankeyRef} className="w-full h-[340px]" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default EchartsDemo
