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
        
        // 先將整個工作表轉換為 JSON 以查看結構
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        console.log('Excel 內容:', jsonData)
        
        // 尋找目標行
        let targetRow = -1
        const keywords = [
          '桃園國際機場航班運量整點人次預報表(第二航廈)',
          '桃園國際機場航班運量整點人次預報表（第二航廈）',
          '第二航廈',
          'T2',
          '二航廈'
        ]
        
        jsonData.forEach((row, index) => {
          if (row && row[0] && keywords.some(keyword => String(row[0]).includes(keyword))) {
            targetRow = index
            console.log('找到目標行:', index, '內容:', row)
          }
        })
        
        if (targetRow === -1) {
          throw new Error('找不到目標表格，請確認檔案格式是否正確')
        }
        
        // 解析出境人數數據
        const hourlyPassengers = []
        for (let i = 0; i < 24; i++) {
          const row = jsonData[targetRow + 2 + i]
          if (row) {
            const time = String(row[0]).substring(0, 5)  // 時間在第一列
            const passengers = parseInt(row[2]) || 0     // 出境人數在第三列
            
            console.log(`解析行 ${targetRow + 2 + i}:`, { time, passengers, rawRow: row })
            
            hourlyPassengers.push({ time, passengers })
          }
        }
        
        // 取得總計
        const totalRow = jsonData[targetRow + 26]
        const totalPassengers = totalRow ? (parseInt(totalRow[2]) || 0) : 0
        
        console.log('總計行:', totalRow)
        
        const result = {
          terminal2: {
            hourlyPassengers,
            totalPassengers
          }
        }
        
        // 分析數據
        const morningPeak = findMorningPeak(result.terminal2.hourlyPassengers)
        const storeRushHour = calculateStoreRushHour(morningPeak)
        
        resolve({
          rawData: result,
          analysis: {
            morningPeak,
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

// 找出早上的高峰時段
const findMorningPeak = (hourlyData) => {
  const morningData = hourlyData.filter(
    item => {
      const hour = parseInt(item.time.split(':')[0])
      return hour >= 4 && hour <= 13  // 早上 4 點到下午 1 點
    }
  )
  
  return morningData.reduce((max, current) => 
    current.passengers > max.passengers ? current : max
  )
}

// 計算店家的預期高峰時段
const calculateStoreRushHour = (peakTime) => {
  const [hours] = peakTime.time.split(':')
  const peakHour = parseInt(hours)
  
  return {
    start: `${(peakHour - 2).toString().padStart(2, '0')}:00`,
    end: `${(peakHour - 1).toString().padStart(2, '0')}:00`,
    expectedPassengers: Math.round(peakTime.passengers * 0.7) // 假設約 70% 的旅客會經過店家
  }
}

export const getForecastUrl = (date) => {
  // ... URL 生成邏輯
} 