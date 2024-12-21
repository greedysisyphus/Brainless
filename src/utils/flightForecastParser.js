import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Taipei')

export async function getFlightForecast(testBuffer = null) {
  try {
    const today = dayjs().tz('Asia/Taipei')
    const tomorrow = today.add(1, 'day')
    
    const forecasts = await Promise.all([
      readForecastFile(today, testBuffer),
      readForecastFile(tomorrow, testBuffer)
    ])

    return {
      today: forecasts[0],
      tomorrow: forecasts[1]
    }
  } catch (error) {
    console.error('Error getting flight forecast:', error)
    return null
  }
}

async function readForecastFile(date, testBuffer = null) {
  try {
    let workbook;
    if (testBuffer) {
      workbook = XLSX.read(testBuffer);
    } else {
      const fileName = date.format('YYYY_MM_DD');
      const response = await fetch(`/data/${fileName}.xls`);
      const arrayBuffer = await response.arrayBuffer();
      workbook = XLSX.read(arrayBuffer);
    }
    
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    
    // 找到第二航廈的列索引
    const terminal2ColumnIndex = data[1].findIndex(cell => 
      cell && cell.includes('桃園國際機場航班運量整點人次預報表(第二航廈)'))
    
    if (terminal2ColumnIndex === -1) {
      throw new Error('無法找到第二航廈數據')
    }
    
    // 獲取出境數據的列
    const departureData = data.slice(3).map(row => ({
      time: row[0]?.split(' ~ ')[0], // 取時間區間的開始時間
      quantity: parseInt(row[terminal2ColumnIndex + 2] || 0) // 出境桃園數量在第二航廈起始列後的第二列
    })).filter(item => 
      item.time && 
      item.time !== '小計' &&  // 改用嚴格比較
      item.time !== '總計' &&  // 改用嚴格比較
      !item.time.includes('總人次') &&
      !item.time.includes('＊本系統') // 過濾掉免責聲明
    )
    
    // 格式化數據
    return departureData.map(item => ({
      time: item.time,
      quantity: item.quantity || 0
    }))
  } catch (error) {
    console.error(`Error reading forecast file for ${date.format('YYYY-MM-DD')}:`, error)
    return null
  }
} 