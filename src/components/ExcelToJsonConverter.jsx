import { useState } from 'react'

// 添加名字映射（從 ScheduleConverter 複製）
const NAME_MAPPINGS = {
  'A45-余盛煌 Noah 店長': '小余',
  'A51-蕭弘業 Eric 副店長': '紅葉',
  'A60-羅稚婕 Ashely 咖啡師': 'Ashley',
  'A88-沈恩廷 Lydia 咖啡師': '恩廷',
  'A89-林渭麟 Jovi 咖啡師': 'Jovi',
  'A93-陳世芬 Nina 咖啡師': 'Nina'
}

function ExcelToJsonConverter({ onJsonGenerated }) {
  const [jsonOutput, setJsonOutput] = useState('')

  // 獲取暱稱
  const getNickname = (fullName) => {
    return NAME_MAPPINGS[fullName] || fullName
  }

  // 獲取職位
  const getPosition = (fullName) => {
    if (fullName.includes('店長')) return '店長'
    if (fullName.includes('副店長')) return '副店長'
    if (fullName.includes('咖啡師')) return '咖啡師'
    return '職員'
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const clipboardData = e.clipboardData.getData('text')
    
    try {
      // 處理 Excel 數據
      const rows = clipboardData
        .split('\n')
        .map(row => row.trim())
        .filter(row => row.length > 0)
        .map(row => row.split('\t').map(cell => cell.trim()))
        .filter(row => row.length > 1)

      // 提取日期行並解析日期
      const dateRow = rows[1]
      console.log('原始日期行:', dateRow)

      // 生成該月的所有日期
      const generateMonthDates = (firstDate) => {
        const [year, month] = firstDate.split('-')
        const daysInMonth = new Date(year, month, 0).getDate()
        const dates = []
        
        for (let day = 1; day <= daysInMonth; day++) {
          dates.push(`${year}-${month}-${String(day).padStart(2, '0')}`)
        }
        return dates
      }

      // 解析所有日期
      const dates = dateRow.slice(1).map((date, index) => {
        if (!date) {
          console.log(`跳過空日期 at index ${index + 1}`)
          return null
        }
        
        // 處理不同的日期格式
        const match = date.match(/^(\d{2,4})[-\/](\d{1,2})[-\/](\d{1,2})$/)
        if (!match) {
          console.log(`無效的日期格式 at index ${index + 1}:`, date)
          return null
        }
        
        let [_, year, month, day] = match
        
        // 處理兩位數年份
        if (year.length === 2) {
          year = '20' + year
        }
        
        // 確保月和日是兩位數
        month = month.padStart(2, '0')
        day = day.padStart(2, '0')
        
        const formattedDate = `${year}-${month}-${day}`
        console.log(`格式化後的日期 at index ${index + 1}:`, formattedDate)
        return formattedDate
      }).filter(date => date !== null)

      // 獲取月份的完整日期
      const firstDate = dates[0]
      const monthDates = generateMonthDates(firstDate)

      // 轉換為 JSON 格式
      const jsonData = {
        metadata: {
          startDate: monthDates[0],
          endDate: monthDates[monthDates.length - 1],
          lastUpdated: new Date().toISOString(),
          version: "1.0"
        },
        schedule: {
          dates: monthDates,
          employees: rows.slice(2).map(row => {
            // 解析員工 ID 和名稱
            const [id, ...nameParts] = row[0].split('-')
            const fullName = nameParts.join('-').trim()
            
            return {
              id: id,
              fullName: fullName,
              nickname: getNickname(fullName),
              position: getPosition(fullName),
              shifts: row.slice(1).map((shift, index) => {
                if (!shift || shift === '月休' || shift.includes('特休假')) {
                  return {
                    date: monthDates[index],
                    type: 'off',
                    time: shift || '月休'
                  }
                }
                
                return {
                  date: monthDates[index],
                  type: shift.includes('4:30-13:00') ? 'morning' : 
                        shift.includes('13:00-21:30') ? 'afternoon' : 
                        'special',
                  time: shift
                }
              }).filter((shift, index) => index < monthDates.length)
            }
          })
        }
      }

      // 設置 JSON 輸出並通知父組件
      setJsonOutput(JSON.stringify(jsonData, null, 2))
      onJsonGenerated(jsonData)
    } catch (error) {
      console.error('轉換錯誤:', error)
      alert('轉換失敗，請確認數據格式正確')
    }
  }

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">步驟 1: Excel 轉換 JSON</h3>
      <div 
        className="w-full h-32 border-2 border-dashed border-white/20 
                   rounded-lg p-4 focus:border-primary
                   hover:border-white/30 transition-colors"
        contentEditable
        onPaste={handlePaste}
        placeholder="在此貼上 Excel 班表內容..."
      />
      {jsonOutput && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-sm text-text-secondary">生成的 JSON</h4>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(jsonOutput)
                  .then(() => alert('已複製到剪貼板！'))
              }}
              className="btn-primary text-sm py-1 px-3"
            >
              複製 JSON
            </button>
          </div>
          <div className="relative">
            <pre 
              className="
                bg-surface/30 rounded-lg p-4 
                max-h-[200px] overflow-y-auto 
                text-xs text-text-secondary
              "
            >
              <code>{jsonOutput}</code>
            </pre>
            <div 
              className="
                absolute bottom-0 left-0 right-0 h-8
                bg-gradient-to-t from-surface to-transparent
                pointer-events-none
              "
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ExcelToJsonConverter 