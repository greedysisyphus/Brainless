import * as XLSX from 'xlsx'

// 用於解析航班預報表的工具函數
export const parseFlightForecast = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          blankrows: false
        })
        
        // 找到第二航廈的數據起始列
        const t2DataStartCol = jsonData[1].findIndex(cell => 
          String(cell).includes('第二航廈')
        )
        
        if (t2DataStartCol === -1) {
          throw new Error('找不到第二航廈的數據')
        }
        
        console.log('第二航廈數據起始列:', t2DataStartCol)
        
        // 找到出境人數的相對位置（應該是第二列）
        const departureOffset = 2  // 出境人數在時間後的第二列
        const t2DepartureCol = t2DataStartCol + departureOffset
        
        console.log('第二航廈出境人數列:', t2DepartureCol)
        
        // 收集 24 小時的數據（從第 4 行開始）
        const hourlyPassengers = []
        const dataStartRow = 3  // 數據從第 4 行開始
        
        for (let i = 0; i < 24; i++) {
          const row = jsonData[dataStartRow + i]
          if (row) {
            const timeCell = row[0]  // 時間在第一列
            const passengerCell = row[t2DepartureCol]  // 使用第二航廈的出境人數列
            
            console.log(`第 ${i + 1} 小時:`, {
              time: timeCell,
              passengers: passengerCell,
              row: dataStartRow + i
            })
            
            hourlyPassengers.push({
              time: String(timeCell).substring(0, 5),
              passengers: parseInt(passengerCell) || 0
            })
          }
        }
        
        // 取得總計（在最後一行）
        const totalRow = jsonData[dataStartRow + 24]
        const totalPassengers = totalRow ? parseInt(totalRow[t2DepartureCol]) || 0 : 
          hourlyPassengers.reduce((sum, curr) => sum + curr.passengers, 0)
        
        console.log('第二航廈總計:', totalPassengers)
        
        const result = {
          terminal2: {
            hourlyPassengers,
            totalPassengers
          }
        }
        
        // 分析數據
        const morningPeaks = findMorningPeak(result.terminal2.hourlyPassengers)
        const storeRushHour = calculateStoreRushHour(morningPeaks)
        
        resolve({
          rawData: result,
          analysis: {
            morningPeaks,
            storeRushHour,
            totalPassengers
          }
        })
        
      } catch (error) {
        console.error('解析錯誤詳情:', error)
        reject(error)
      }
    }
    
    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file)
  })
}

// 找出早上的高峰時段（取兩個最高峰）
const findMorningPeak = (hourlyData) => {
  const morningData = hourlyData.filter(
    item => {
      const hour = parseInt(item.time.split(':')[0])
      return hour >= 4 && hour <= 13  // 早上 4 點到下午 1 點
    }
  )
  
  // 按照人數排序並取前兩名
  const sortedData = [...morningData].sort((a, b) => b.passengers - a.passengers)
  return sortedData.slice(0, 2)
}

// 計算店家預期高峰時段
const calculateStoreRushHour = (peakTimes) => {
  // 取最早的高峰時段來計算店家尖峰
  const earliestPeak = peakTimes.reduce((earliest, current) => {
    const earliestHour = parseInt(earliest.time.split(':')[0])
    const currentHour = parseInt(current.time.split(':')[0])
    return currentHour < earliestHour ? current : earliest
  })
  
  const peakHour = parseInt(earliestPeak.time.split(':')[0])
  
  return {
    start: `${(peakHour - 2).toString().padStart(2, '0')}:00`,
    end: `${(peakHour - 1).toString().padStart(2, '0')}:00`
  }
}

// 獲取指定日期的預報表 URL
export const getForecastUrl = (date) => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  
  // 使用本地數據路徑
  return `/data/${year}_${month}_${day}.xls`
}

// 自動下載並解析預報表
export const autoFetchForecast = async () => {
  try {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const [todayResult, tomorrowResult] = await Promise.all([
      fetchSingleDay(today),
      fetchSingleDay(tomorrow)
    ])
    
    return {
      today: todayResult,
      tomorrow: tomorrowResult
    }
  } catch (error) {
    console.error('自動更新失敗:', error)
    throw error
  }
}

// 獲取單日數據
const fetchSingleDay = async (date) => {
  const url = getForecastUrl(date)
  
  try {
    // 添加請求頭以模擬瀏覽器請求
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.taoyuan-airport.com',
        'Origin': 'https://www.taoyuan-airport.com'
      },
      mode: 'no-cors'  // 嘗試使用 no-cors 模式
    })
    
    if (!response.ok) {
      throw new Error(`下載預報表失敗: ${date.toLocaleDateString()}`)
    }
    
    const blob = await response.blob()
    const result = await parseFlightForecast(blob)
    return result
    
  } catch (error) {
    console.error(`下載 ${date.toLocaleDateString()} 預報表失敗:`, error)
    throw error
  }
} 