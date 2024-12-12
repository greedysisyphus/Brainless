import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, addDoc, query, orderBy, limit } from 'firebase/firestore'
import { 
  PencilSquareIcon,
  DocumentArrowDownIcon,
  AdjustmentsHorizontalIcon,
  ShareIcon,
  ChevronDownIcon,
  ChartBarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import ExcelToJsonConverter from '../components/ExcelToJsonConverter'
import ScheduleStats from '../components/schedule/ScheduleStats'

// 添加名字映射
const NAME_MAPPINGS = {
  'A45-余盛煌 Noah 店長': '小余',
  'A51-蕭弘業 Eric 副店長': '紅葉',
  'A60-羅稚婕 Ashely 咖啡師': 'Ashley',
  'A88-沈恩廷 Lydia 咖啡師': '恩廷',
  'A89-林渭麟 Jovi 咖啡師': 'Jovi',
  'A93-陳世芬 Nina 咖啡師': 'Nina'
}

// 修改日期選項並添加顏色
const DATE_RANGES = [
  { label: '今天', days: 0, color: 'from-sky-400/20 to-sky-600/20 border-sky-500' },
  { label: '明天', days: 1, color: 'from-indigo-400/20 to-indigo-600/20 border-indigo-500' },
  { label: '後天', days: 2, color: 'from-violet-400/20 to-violet-600/20 border-violet-500' },
  { label: '未來 5 天', days: 5, color: 'from-fuchsia-400/20 to-fuchsia-600/20 border-fuchsia-500' },
  { label: '未來一週', days: 7, color: 'from-rose-400/20 to-rose-600/20 border-rose-500' },
  { label: '全部', days: -1, color: 'from-primary/20 to-secondary/20 border-primary' }
]

// 修改人員標籤的顏色映射
const STAFF_COLORS = {
  '小余': 'from-amber-400/20 to-amber-600/20 border-amber-500',
  '紅葉': 'from-rose-400/20 to-rose-600/20 border-rose-500',
  'Ashley': 'from-purple-400/20 to-purple-600/20 border-purple-500',
  '恩廷': 'from-sky-400/20 to-sky-600/20 border-sky-500',
  'Jovi': 'from-emerald-400/20 to-emerald-600/20 border-emerald-500',
  'Nina': 'from-pink-400/20 to-pink-600/20 border-pink-500'
}

// 添加日期格式化函數
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  if (!dateStr.includes('-')) return dateStr;
  
  try {
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}`;  // 只顯示月/日
  } catch {
    return dateStr;
  }
}

function Schedule() {
  const [scheduleData, setScheduleData] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState('')
  const [dateRange, setDateRange] = useState(-1)
  const [showTools, setShowTools] = useState(false)
  const [showStats, setShowStats] = useState(false)

  // 添加測試用的初始數據
  useEffect(() => {
    console.log('組件已載入')
  }, [])

  // 監聽 Firebase 數據
  useEffect(() => {
    console.log('開始監聽 Firebase')
    
    const q = query(
      collection(db, 'schedules'), 
      orderBy('timestamp', 'desc'),
      limit(1)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        const data = doc.data()
        
        try {
          // 將對象格式轉回數組
          if (data?.scheduleData?.rows) {
            const convertedData = data.scheduleData.rows
              .sort((a, b) => Number(a.id) - Number(b.id))
              .map(row => 
                row.cells
                  .sort((a, b) => Number(a.id) - Number(b.id))
                  .map(cell => cell.value)
              )
            setScheduleData(convertedData)
          }
        } catch (error) {
          console.error('數據轉換錯誤:', error)
        }
      }
    })

    return () => unsubscribe()
  }, [])

  const handlePaste = async (e) => {
    e.preventDefault()
    
    try {
      // 嘗試解析 JSON 數據
      const jsonData = JSON.parse(e.clipboardData.getData('text'))
      
      // 驗證數據格式
      if (!jsonData.schedule || !jsonData.schedule.dates || !jsonData.schedule.employees) {
        throw new Error('無效的數據格式')
      }

      // 轉換為表格格式
      const convertedData = [
        // 第一行：星期幾
        [''].concat(jsonData.schedule.dates.map(date => {
          const day = new Date(date).getDay()
          return ['日', '一', '二', '三', '四', '五', '六'][day]
        })),
        // 第二行：日期
        [''].concat(jsonData.schedule.dates),
        // 員工班次
        ...jsonData.schedule.employees.map(emp => {
          const shifts = new Array(jsonData.schedule.dates.length).fill('月休')
          emp.shifts.forEach(shift => {
            const dateIndex = jsonData.schedule.dates.indexOf(shift.date)
            if (dateIndex !== -1) {
              shifts[dateIndex] = shift.time
            }
          })
          return [`${emp.id}-${emp.fullName}`, ...shifts]
        })
      ]

      setScheduleData(convertedData)

      // 保存到 Firebase - 將數組轉換為對象格式
      try {
        const firestoreData = {
          metadata: jsonData.metadata,
          scheduleData: {
            rows: convertedData.map((row, rowIndex) => ({
              id: rowIndex.toString(),
              cells: row.map((cell, cellIndex) => ({
                id: cellIndex.toString(),
                value: cell
              }))
            }))
          },
          timestamp: new Date(),
          updatedBy: 'anonymous'
        }

        await addDoc(collection(db, 'schedules'), firestoreData)
        console.log('保存成功')
        alert('班表已成功保存！')
      } catch (error) {
        console.error('保存失敗:', error)
        alert(`保存失敗: ${error.message}\n請檢查網絡連接或重新整理頁面`)
      }
    } catch (error) {
      console.error('解析錯誤:', error)
      alert('無法解析 JSON 數據，請確保格式正確')
    }
  }

  // 導出為 CSV
  const exportToCSV = () => {
    const csvContent = scheduleData
      .map(row => row.join(','))
      .join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `schedule_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // 編輯單元格
  const handleCellEdit = (rowIndex, cellIndex, value) => {
    const newData = [...scheduleData]
    newData[rowIndex][cellIndex] = value
    setScheduleData(newData)
  }

  // 更新班次樣式
  const getShiftStyle = (cell) => {
    if (!cell) return '';
    
    // 特休假
    if (cell.includes('特休假')) {
      return {
        background: 'bg-gradient-to-r from-amber-500/20 to-amber-600/20',
        text: 'text-amber-100 font-medium',
        border: 'border-l-4 border-l-amber-500',
        label: '特休'
      };
    }
    
    // 早班：漸層藍色背
    if (cell.includes('4:30-13:00') || cell.includes('4：30-13：00')) {
      return {
        background: 'bg-gradient-to-r from-sky-500/20 to-blue-500/20',
        text: 'text-sky-100 font-medium',
        border: 'border-l-4 border-l-sky-500',
        label: '早班'
      };
    }
    
    // 晚班：漸層紫色背景
    if (cell.includes('13:00-21:30') || cell.includes('13：00-21：30')) {
      return {
        background: 'bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20',
        text: 'text-purple-100 font-medium',
        border: 'border-l-4 border-l-purple-500',
        label: '晚班'
      };
    }

    // 其他排班時間：漸層綠色背景
    if (cell.match(/\d{1,2}[:：]\d{2}-\d{1,2}[:：]\d{2}/)) {
      return {
        background: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20',
        text: 'text-emerald-100 font-medium',
        border: 'border-l-4 border-l-emerald-500',
        label: '排班'
      };
    }

    // 月休
    if (cell === '月休') {
      return {
        background: 'bg-gradient-to-r from-gray-500/10 to-gray-600/10',
        text: 'text-gray-400 font-medium',
        border: 'border-l-4 border-l-gray-500',
        label: '休'
      };
    }

    return null;
  }

  // 格式化表格
  const getFormattedCell = (cell, rowIndex, cellIndex) => {
    if (!formatOptions.showWeekend && (cellIndex === 6 || cellIndex === 7)) {
      return null;
    }
    
    const isToday = formatOptions.highlightToday && 
      cell === new Date().toLocaleDateString('zh-TW');
    
    const isHeader = rowIndex === 0;
    const isFirstColumn = cellIndex === 0;
    const shiftStyle = getShiftStyle(cell);
    
    // 處理日期顯示
    let displayText = cell;
    if (isHeader && cellIndex > 0) {
      displayText = formatDate(cell);
    } else if (isFirstColumn && NAME_MAPPINGS[cell]) {
      displayText = NAME_MAPPINGS[cell];
    } else if (shiftStyle) {
      displayText = shiftStyle.label;
    }
    
    return (
      <td 
        key={cellIndex} 
        className={`
          p-4 border border-white/10
          ${isHeader ? 'font-bold bg-surface/50' : ''}
          ${isFirstColumn ? 'font-semibold sticky left-0 bg-surface text-primary' : ''}
          ${isToday ? 'bg-primary/20 font-bold' : ''}
          ${shiftStyle ? `${shiftStyle.background} ${shiftStyle.text}` : ''}
          ${cell === '月休' ? 'bg-gray-500/20 text-gray-400' : ''}
          ${cell.includes('特休假') ? 'bg-yellow-500/20 text-yellow-200' : ''}
          ${isEditing ? 'cursor-pointer hover:bg-white/5' : ''}
          transition-colors duration-200
          whitespace-nowrap text-center
        `}
        title={cell}  // 顯示完整信息
      >
        {displayText}
      </td>
    );
  }

  // 生成分享連結
  const generateShareLink = () => {
    const encodedData = btoa(JSON.stringify(scheduleData))
    const shareUrl = `${window.location.origin}${window.location.pathname}?data=${encodedData}`
    
    // 複製到剪貼板
    navigator.clipboard.writeText(shareUrl)
      .then(() => alert('分享連結已複製到剪貼板！'))
      .catch(err => {
        console.error('複製失敗:', err)
        alert('分享連結：' + shareUrl)
      })
  }

  // 過濾數據
  const getFilteredData = () => {
    if (!scheduleData.length) return []
    
    let filtered = [...scheduleData]
    
    // 過濾人名
    if (selectedPerson) {
      filtered = [
        filtered[0],  // 保留表頭（星期幾）
        filtered[1],  // 保留日期行
        ...filtered.slice(2).filter(row => {
          const fullName = row[0]
          const shortName = NAME_MAPPINGS[fullName]
          return shortName === selectedPerson || fullName.includes(selectedPerson)
        })
      ]
    }

    // 過濾日期
    if (dateRange >= 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // 找到班表的起始日期
      const firstDate = new Date(filtered[1][1])  // 第二行第二列的日期
      const lastDate = new Date(filtered[1][filtered[1].length - 1])  // 最後一個日期
      
      // 如果今天不在班表的日期範圍內，使用班表的第一天作為考點
      const referenceDate = today >= firstDate && today <= lastDate ? today : firstDate
      
      // 設置目標日期
      const targetDate = new Date(referenceDate)
      if (dateRange > 0) {
        targetDate.setDate(referenceDate.getDate() + dateRange)
      }

      const validColumns = [0]
      const dateRow = filtered[1]
      
      for (let i = 1; i < dateRow.length; i++) {
        const dateStr = dateRow[i]
        if (!dateStr) continue

        try {
          const date = new Date(dateStr)
          date.setHours(0, 0, 0, 0)
          
          if (isNaN(date.getTime())) {
            console.warn('無效的日期:', dateStr)
            continue
          }

          // 根據不同的日期範圍進行過濾
          if (dateRange === 0) {
            // 只顯示參考日期
            if (date.getTime() === referenceDate.getTime()) {
              validColumns.push(i)
            }
          } else if (dateRange === 1) {
            // 顯示參考日期的下一天
            const nextDay = new Date(referenceDate)
            nextDay.setDate(referenceDate.getDate() + 1)
            if (date.getTime() === nextDay.getTime()) {
              validColumns.push(i)
            }
          } else if (dateRange === 2) {
            // 顯示參考日期的後天
            const dayAfterNext = new Date(referenceDate)
            dayAfterNext.setDate(referenceDate.getDate() + 2)
            if (date.getTime() === dayAfterNext.getTime()) {
              validColumns.push(i)
            }
          } else if (dateRange > 2) {
            // 顯示從參考日期開始到指定天數的範圍
            if (date >= referenceDate && date < targetDate) {
              validColumns.push(i)
            }
          }
        } catch (error) {
          console.error('日期解析錯誤:', dateStr, error)
        }
      }

      if (validColumns.length > 1) {
        filtered = filtered.map(row => 
          validColumns.map(index => row[index])
        )
      }
    }

    return filtered
  }

  // 處理從 Excel 轉換來的 JSON 數據
  const handleJsonGenerated = (jsonData) => {
    // 將 JSON 據轉換為表格格式
    const convertedData = [
      // 第一行：星期幾
      [''].concat(jsonData.schedule.dates.map(date => {
        const day = new Date(date).getDay()
        return ['日', '一', '二', '三', '四', '五', '六'][day]
      })),
      // 第二行：日期
      [''].concat(jsonData.schedule.dates),
      // 員工班次
      ...jsonData.schedule.employees.map(emp => {
        const shifts = new Array(jsonData.schedule.dates.length).fill('月休')
        emp.shifts.forEach(shift => {
          const dateIndex = jsonData.schedule.dates.indexOf(shift.date)
          if (dateIndex !== -1) {
            shifts[dateIndex] = shift.time
          }
        })
        return [`${emp.id}-${emp.fullName}`, ...shifts]
      })
    ]

    setScheduleData(convertedData)
  }

  return (
    <div className="container-custom py-8">
      {/* 移除 grid 布局，改用垂直堆疊 */}
      <div className="space-y-6">
        {/* 原有的表格區域 */}
        <div className="card">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="card-header mb-0">班表</h2>  {/* 移除 mb-1，改為 mb-0 */}
              {/* 移除副標題 */}
            </div>
            <div className="flex gap-3">  {/* 增加按鈕間距 */}
              <button 
                onClick={() => setShowTools(!showTools)}
                className={`btn-icon group transition-all duration-200 ${showTools ? 'bg-primary/20 text-primary' : ''}`}
                title="轉換工具"
              >
                <ChevronDownIcon 
                  className={`w-5 h-5 transition-transform duration-200 
                    ${showTools ? 'rotate-180' : ''}`}
                />
              </button>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`btn-icon transition-all duration-200 ${isEditing ? 'bg-primary/20 text-primary' : ''}`}
                title={isEditing ? '完成編輯' : '編輯模式'}
              >
                <PencilSquareIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={exportToCSV}
                className="btn-icon transition-all duration-200 hover:bg-primary/20 hover:text-primary"
                title="導出 CSV"
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowStats(true)}
                className="btn-icon transition-all duration-200 hover:bg-primary/20 hover:text-primary"
                title="查看統計"
              >
                <ChartBarIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 工具抽屜 */}
          <div className={`
            overflow-hidden transition-all duration-300 ease-in-out
            ${showTools ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
          `}>
            <div className="border border-white/10 rounded-lg p-6 mb-8 bg-surface/30 backdrop-blur-sm">
              <ExcelToJsonConverter onJsonGenerated={handleJsonGenerated} />
              {/* JSON 貼上區域 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">步驟 2: JSON 轉換班表</h3>
                <div 
                  className="w-full h-32 border-2 border-dashed border-white/20 
                             rounded-lg p-4 focus:border-primary
                             hover:border-white/30 transition-colors"
                  contentEditable
                  onPaste={handlePaste}
                  placeholder="在此貼上 JSON 數據..."
                />
              </div>
            </div>
          </div>

          {/* 替換原有的選擇同事下拉選單 */}
          <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-6 mb-8">
            {/* 人員標籤過濾器 */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">
                選擇同事
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedPerson('')}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium
                    transition-all duration-200
                    border-2 border-white/10
                    ${!selectedPerson ? 
                      'bg-gradient-to-r from-primary/20 to-secondary/20 border-primary' : 
                      'hover:border-white/20'
                    }
                  `}
                >
                  全部
                </button>
                {Object.entries(NAME_MAPPINGS).map(([fullName, nickname]) => (
                  <button
                    key={nickname}
                    onClick={() => setSelectedPerson(nickname)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium
                      transition-all duration-200 
                      border-2
                      ${selectedPerson === nickname ?
                        `bg-gradient-to-r ${STAFF_COLORS[nickname]} border-l-4` :
                        'border-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    {nickname}
                  </button>
                ))}
              </div>
            </div>

            {/* 更新日期範圍選擇 */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">
                日期範圍
              </label>
              <div className="flex flex-wrap gap-2">
                {DATE_RANGES.map(range => (
                  <button
                    key={range.days}
                    onClick={() => setDateRange(range.days)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium
                      transition-all duration-200
                      border-2
                      ${dateRange === range.days ?
                        `bg-gradient-to-r ${range.color} border-l-4` :
                        'border-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 表格渲染 */}
          {scheduleData && scheduleData.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-white/10 shadow-2xl backdrop-blur-sm">
              <table className="w-full border-collapse bg-surface/30">
                <thead>
                  <tr>
                    <th className="
                      sticky left-0 z-20 
                      bg-surface/95 backdrop-blur-md
                      p-4 border-b-2 border-r border-primary/30
                      text-primary font-bold min-w-[150px]
                      shadow-lg
                    ">
                      同事
                    </th>
                    
                    {/* 日期列 */}
                    {getFilteredData()[1].slice(1).map((header, index) => {
                      const date = new Date(header);
                      const isToday = new Date(header).toDateString() === new Date().toDateString();
                      
                      return (
                        <th key={index} className={`
                          relative
                          p-4 border-b-2 border-primary/30
                          text-center font-bold
                          min-w-[100px] 
                          bg-surface/40
                          backdrop-blur-md
                          transition-colors
                          ${isToday ? 'bg-primary/10' : ''}
                        `}>
                          {isToday && (
                            <span className="
                              absolute top-1 right-1
                              text-[10px] font-semibold
                              bg-primary text-white
                              px-2 py-0.5 rounded-full
                              shadow-lg shadow-primary/20
                              ring-2 ring-primary/50
                              animate-pulse
                            ">
                              今天
                            </span>
                          )}
                          <div className="text-lg text-primary">
                            {formatDate(header)}
                          </div>
                          <div className="text-xs mt-1 text-text-secondary">
                            {['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {getFilteredData().slice(2).map((row, rowIndex) => (
                    <tr key={rowIndex} className="group hover:bg-white/5 transition-colors">
                      <td className="
                        sticky left-0 z-20
                        bg-surface/95 backdrop-blur-md
                        p-4 border-r border-white/10 
                        font-semibold text-primary text-center
                        shadow-lg
                        transition-colors
                        group-hover:bg-surface/90
                      ">
                        {NAME_MAPPINGS[row[0]] || row[0]}
                      </td>
                      
                      {/* 班次單元格 */}
                      {row.slice(1).map((cell, cellIndex) => {
                        const shiftStyle = getShiftStyle(cell);
                        const isToday = new Date(getFilteredData()[1][cellIndex + 1]).toDateString() === new Date().toDateString();
                        
                        return (
                          <td key={cellIndex} className={`
                            relative p-4 
                            border-b border-white/5
                            text-center
                            transition-all duration-300
                            ${shiftStyle ? `
                              ${shiftStyle.background} 
                              ${shiftStyle.text}
                              ${shiftStyle.border}
                              hover:shadow-lg hover:scale-[1.02]
                            ` : ''}
                            ${isToday ? 'ring-2 ring-primary/30 ring-inset' : ''}
                          `}
                          title={cell}
                          >
                            <span className="relative z-10 font-medium">
                              {shiftStyle ? shiftStyle.label : cell}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-text-secondary">
              <p className="text-lg mb-2">尚無班表數據</p>
              <p className="text-sm">點擊上方工具按鈕開始匯入班表</p>
            </div>
          )}
        </div>

        {/* 移除原本的統計面板，改為彈出式視窗 */}
        {showStats && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-white/10">
                <h2 className="text-xl font-bold">班表統計</h2>
                <button 
                  onClick={() => setShowStats(false)}
                  className="btn-icon"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <ScheduleStats 
                  scheduleData={getFilteredData().slice(2).reduce((acc, row) => {
                    const employeeId = row[0];
                    acc[employeeId] = {
                      morning: row.slice(1).filter(cell => 
                        cell.includes('4:30-13:00') || cell.includes('4：30-13：00')
                      ).length,
                      evening: row.slice(1).filter(cell => 
                        cell.includes('13:00-21:30') || cell.includes('13：00-21：30')
                      ).length
                    };
                    return acc;
                  }, {})}
                  employees={Object.entries(NAME_MAPPINGS).map(([fullName, nickname]) => ({
                    id: fullName,
                    name: nickname
                  }))}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Schedule 