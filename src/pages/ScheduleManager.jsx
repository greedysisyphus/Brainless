import { useState, useEffect } from 'react'
import html2canvas from 'html2canvas'
import { 
  CalendarIcon, 
  DocumentArrowUpIcon, 
  UserGroupIcon,
  MapPinIcon,
  ArrowPathIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TruckIcon,
  DocumentTextIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../utils/firebase'

// 上車地點選項
const PICKUP_LOCATIONS = [
  '7-11 新街門市',
  'A21 環北站',
  '7-11 高萱門市',
  'A18 桃園高鐵站',
  'A16 橫山站',
  '大園農會',
  '不搭車'
]

// 班別代碼對應
const SHIFT_CODES = {
  'K': '早',
  'L': '中',
  'Y': '晚',
  '月休': '休',
  'SS': '特',
  'R': '休',
  'KK': '早',
  'YY': '晚',
  '早班': '早',
  '中班': '中',
  '晚班': '晚'
}

function ScheduleManager() {
  // 分頁狀態
  const [activeTab, setActiveTab] = useState('display')
  
  // 班表資料
  const [currentMonthSchedule, setCurrentMonthSchedule] = useState({})
  const [nextMonthSchedule, setNextMonthSchedule] = useState({})
  const [selectedMonth, setSelectedMonth] = useState('current')
  const [lastUpdated, setLastUpdated] = useState({})
  
  // 同事資料
  const [names, setNames] = useState({})
  const [pickupLocations, setPickupLocations] = useState({})
  
  // 顯示設定
  const [viewMode, setViewMode] = useState('date') // 'date' 或 'employee'
  const [filterMode, setFilterMode] = useState('all') // 'all', 'today', '3days', '7days'
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState('week1')
  const [selectedStatsEmployee, setSelectedStatsEmployee] = useState(null)
  
  // 匯入資料
  const [importData, setImportData] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [importError, setImportError] = useState('')
  const [targetMonth, setTargetMonth] = useState('current')
  
  // 同事管理
  const [newEmployee, setNewEmployee] = useState({
    id: '',
    name: '',
    pickupLocation: PICKUP_LOCATIONS[0]
  })
  
  // 載入資料
  useEffect(() => {
    loadScheduleData()
    loadEmployeeData()
  }, [])
  
  // 監聽班表更新
  useEffect(() => {
    const unsubscribeCurrent = onSnapshot(
      doc(db, 'schedule', 'currentMonth'),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data()
          setCurrentMonthSchedule(data)
          setLastUpdated(prev => ({
            ...prev,
            current: data._lastUpdated
          }))
        }
      }
    )
    
    const unsubscribeNext = onSnapshot(
      doc(db, 'schedule', 'nextMonth'),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data()
          setNextMonthSchedule(data)
          setLastUpdated(prev => ({
            ...prev,
            next: data._lastUpdated
          }))
        }
      }
    )
    
    return () => {
      unsubscribeCurrent()
      unsubscribeNext()
    }
  }, [])
  
  const loadScheduleData = async () => {
    try {
      // 載入當月班表
      const currentDoc = await getDocs(collection(db, 'schedule'))
      const currentData = {}
      currentDoc.forEach(doc => {
        if (doc.id === 'currentMonth' || doc.id === 'nextMonth') {
          currentData[doc.id] = doc.data()
        }
      })
      
      if (currentData.currentMonth) {
        setCurrentMonthSchedule(currentData.currentMonth)
        setLastUpdated(prev => ({
          ...prev,
          current: currentData.currentMonth._lastUpdated
        }))
      }
      
      if (currentData.nextMonth) {
        setNextMonthSchedule(currentData.nextMonth)
        setLastUpdated(prev => ({
          ...prev,
          next: currentData.nextMonth._lastUpdated
        }))
      }
    } catch (error) {
      console.error('載入班表資料失敗:', error)
    }
  }
  
  const loadEmployeeData = async () => {
    try {
      // 載入姓名資料
      const namesSnapshot = await getDocs(collection(db, 'names'))
      const namesData = {}
      namesSnapshot.forEach(doc => {
        namesData[doc.id] = doc.data().name
      })
      setNames(namesData)
      
      // 載入上車地點資料
      const locationsSnapshot = await getDocs(collection(db, 'pickupLocations'))
      const locationsData = {}
      locationsSnapshot.forEach(doc => {
        locationsData[doc.id] = doc.data().location
      })
      setPickupLocations(locationsData)
    } catch (error) {
      console.error('載入同事資料失敗:', error)
    }
  }
  
  const saveEmployeeData = async () => {
    try {
      // 儲存姓名資料
      for (const [id, name] of Object.entries(names)) {
        await setDoc(doc(db, 'names', id), { name })
      }
      
      // 儲存上車地點資料
      for (const [id, location] of Object.entries(pickupLocations)) {
        await setDoc(doc(db, 'pickupLocations', id), { location })
      }
      
      alert('同事資料已儲存')
    } catch (error) {
      console.error('儲存同事資料失敗:', error)
      alert('儲存失敗')
    }
  }
  
  const clearEmployeeData = () => {
    if (confirm('確定要清空所有同事資料嗎？')) {
      setNames({})
      setPickupLocations({})
    }
  }
  
  const addEmployee = () => {
    const { id, name, pickupLocation } = newEmployee
    if (!id || !name) {
      alert('請填寫職員編號和姓名')
      return
    }
    
    if (names[id]) {
      alert('職員編號已存在')
      return
    }
    
    setNames(prev => ({ ...prev, [id]: name }))
    setPickupLocations(prev => ({ ...prev, [id]: pickupLocation }))
    setNewEmployee({ id: '', name: '', pickupLocation: PICKUP_LOCATIONS[0] })
  }
  
  const deleteEmployee = (id) => {
    if (confirm(`確定要刪除 ${names[id]} 嗎？`)) {
      setNames(prev => {
        const newNames = { ...prev }
        delete newNames[id]
        return newNames
      })
      setPickupLocations(prev => {
        const newLocations = { ...prev }
        delete newLocations[id]
        return newLocations
      })
    }
  }
  
  const updateEmployeeName = (id, newName) => {
    setNames(prev => ({ ...prev, [id]: newName }))
  }
  
  const updateEmployeeLocation = (id, newLocation) => {
    setPickupLocations(prev => ({ ...prev, [id]: newLocation }))
  }
  
  const parseImportData = () => {
    if (!importData.trim()) {
      setImportError('請輸入資料')
      return
    }
    
    try {
      const lines = importData.trim().split('\n')
      const parsed = {}
      
      let currentEmployee = null
      let lineIndex = 0
      
      for (const line of lines) {
        lineIndex++
        if (!line.trim()) continue
        
        console.log(`處理第 ${lineIndex} 行:`, line)
        
        const columns = line.split('\t')
        console.log('分割後的欄位:', columns)
        
        // 跳過標題行和日期行
        if (lineIndex <= 2) {
          console.log('跳過標題行或日期行')
          continue
        }
        
        // 檢查是否為同事資料行（包含職員編號）
        const employeeId = columns[0].trim()
        const employeeName = columns[1].trim()
        
                 // 檢查是否為有效的同事資料行
         if (employeeId && employeeName && employeeId.match(/^A\d+$/)) {
           console.log('發現同事資料行:', employeeId, employeeName)
           
           // 檢查第三欄是否為「班別排班」
           if (columns[2] && columns[2].trim() === '班別排班') {
             currentEmployee = {
               id: employeeId,
               name: employeeName,
               schedule: []
             }
             
             // 提取班表資料（從第4欄開始，跳過「班別排班」）
             const scheduleData = columns.slice(3)
             console.log('班表資料:', scheduleData)
             
             // 處理班別代碼，只顯示中文說明
             const processedSchedule = scheduleData.map(shift => {
               const trimmedShift = shift.trim()
               if (!trimmedShift) return '' // 保持空白
               
               // 檢查是否為已知的班別代碼
               if (SHIFT_CODES[trimmedShift]) {
                 return SHIFT_CODES[trimmedShift] // 只顯示中文說明
               }
               
               return trimmedShift
             })
             
             console.log('處理後的班表:', processedSchedule)
             
             // 移除姓名中的數字部分
             const cleanName = employeeName.replace(/\d+/g, '').trim()
             
             parsed[employeeId] = {
               name: cleanName,
               schedule: processedSchedule
             }
           }
         }
      }
      
      setParsedData(parsed)
      setImportError('')
    } catch (error) {
      setImportError('解析資料時發生錯誤')
    }
  }
  
  const uploadSchedule = async () => {
    if (!parsedData) {
      alert('請先解析資料')
      return
    }
    
    try {
      const targetCollection = targetMonth === 'current' ? 'currentMonth' : 'nextMonth'
      const scheduleData = {}
      
      for (const [employeeId, data] of Object.entries(parsedData)) {
        if (!employeeId || employeeId.trim() === '') {
          console.warn('跳過空的職員編號')
          continue
        }
        
        scheduleData[employeeId] = {}
        data.schedule.forEach((shift, index) => {
          const date = `${index + 1}`
          
          if (shift && shift.trim()) {
            // 儲存時直接使用中文說明
            scheduleData[employeeId][date] = shift
          }
          // 如果班次為空，不儲存該日期（保持空白）
        })
        
                     // 即使沒有班表資料也保留同事（因為可能有空白的月份）
             console.log(`同事 ${employeeId}: ${Object.keys(scheduleData[employeeId]).length} 個班次`)
      }
      
      scheduleData._lastUpdated = new Date().toISOString()
      
      console.log('準備上傳資料:', scheduleData)
      console.log('資料結構檢查:')
      for (const [employeeId, schedule] of Object.entries(scheduleData)) {
        if (employeeId === '_lastUpdated') continue
        console.log(`- ${employeeId}: ${Object.keys(schedule).length} 個班次`)
      }
      
      await setDoc(doc(db, 'schedule', targetCollection), scheduleData)
      console.log('班表上傳成功')
      
             // 同時更新同事姓名資料
       for (const [employeeId, data] of Object.entries(parsedData)) {
         if (!names[employeeId]) {
           try {
             await setDoc(doc(db, 'names', employeeId), { name: data.name })
             console.log(`同事 ${employeeId} 姓名已更新`)
           } catch (nameError) {
             console.warn(`更新同事 ${employeeId} 姓名失敗:`, nameError)
           }
         }
       }
      
      alert('班表已上傳成功！')
      setImportData('')
      setParsedData(null)
    } catch (error) {
      console.error('上傳班表失敗:', error)
      
      // 提供更詳細的錯誤訊息
      let errorMessage = '上傳失敗'
      if (error.code === 'permission-denied') {
        errorMessage = '權限不足，請檢查 Firebase 安全規則'
      } else if (error.code === 'unavailable') {
        errorMessage = '網路連線問題，請檢查網路連線'
      } else if (error.message) {
        errorMessage = `上傳失敗: ${error.message}`
      }
      
      alert(errorMessage)
    }
  }
  
  // 篩選資料
  const getFilteredEmployees = () => {
    const schedule = selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule
    const employees = Object.keys(schedule).filter(key => key !== '_lastUpdated')
    
    // 數字排序函數
    const sortByNumber = (a, b) => {
      // 提取數字部分
      const numA = parseInt(a.match(/\d+/)?.[0] || '0')
      const numB = parseInt(b.match(/\d+/)?.[0] || '0')
      return numA - numB
    }
    
    if (selectedEmployee) {
      return [selectedEmployee]
    }
    
    return employees.sort(sortByNumber)
  }
  
  // 取得今天的日期
  const getToday = () => {
    const today = new Date()
    return today.getDate()
  }
  
  // 取得接下來幾天的日期
  const getNextDays = (days) => {
    const today = new Date()
    const dates = []
    for (let i = 0; i < days; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date.getDate())
    }
    return dates
  }
  
  // 取得要顯示的日期
  const getDisplayDates = () => {
    switch (filterMode) {
      case 'today':
        return [getToday()]
      case '3days':
        return getNextDays(3)
      case '7days':
        return getNextDays(7)
      default:
        return Array.from({ length: 31 }, (_, i) => i + 1)
    }
  }
  
  // 匯出乘車表
  const exportTransportChart = () => {
    // 創建月曆樣式的匯出元素
    const calendarElement = createCalendarExport()
    
    if (calendarElement) {
      document.body.appendChild(calendarElement)
      
      setTimeout(() => {
        html2canvas(calendarElement, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          allowTaint: true
        }).then(canvas => {
          const link = document.createElement('a')
          link.download = `乘車表_${selectedMonth === 'current' ? '當月' : '下個月'}_${new Date().toISOString().split('T')[0]}.png`
          link.href = canvas.toDataURL()
          link.click()
          
          // 清理臨時元素
          document.body.removeChild(calendarElement)
        }).catch(error => {
          console.error('匯出失敗:', error)
          document.body.removeChild(calendarElement)
        })
      }, 500)
    }
  }
  
  // 生成週選項
  const generateWeekOptions = () => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const weeks = []
    
    for (let week = 1; week <= Math.ceil(daysInMonth / 7); week++) {
      const startDay = (week - 1) * 7 + 1
      const endDay = Math.min(week * 7, daysInMonth)
      weeks.push(
        <option key={`week${week}`} value={`week${week}`}>
          {new Date().getMonth() + 1}月{startDay}日 - {new Date().getMonth() + 1}月{endDay}日
        </option>
      )
    }
    
    return weeks
  }
  
  // 生成 Line 群文字
  const generateLineText = () => {
    const schedule = selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule
    const weekNumber = parseInt(selectedWeek.replace('week', ''))
    const startDay = (weekNumber - 1) * 7 + 1
    const endDay = Math.min(weekNumber * 7, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())
    
    let lineText = ''
    
    for (let day = startDay; day <= endDay; day++) {
      const dayData = {}
      
      // 計算當天各站點人數
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        
        const employeeLocation = pickupLocations[employeeId]
        if (!employeeLocation || employeeLocation === '不搭車') return
        
        const shift = schedule[employeeId]?.[day]
        if (shift === '早') {
          dayData[employeeLocation] = (dayData[employeeLocation] || 0) + 1
        }
      })
      
      // 生成當天文字
      lineText += `${new Date().getMonth() + 1}/${day}\n`
      
      // 如果有乘車需求，顯示站點資訊
      if (Object.keys(dayData).length > 0) {
        // 按照固定順序排列站點
        const orderedLocations = [
          'A21 環北站',
          '7-11 高萱門市', 
          '7-11 新街門市',
          'A18 桃園高鐵站'
        ]
        
        orderedLocations.forEach(location => {
          if (dayData[location]) {
            lineText += `${location}${dayData[location]}人\n`
          }
        })
      }
      
      lineText += '\n'
    }
    
    // 複製到剪貼簿
    navigator.clipboard.writeText(lineText.trim()).then(() => {
      alert('Line 群文字已複製到剪貼簿！')
    }).catch(() => {
      // 如果剪貼簿 API 不可用，顯示文字讓用戶手動複製
      prompt('請複製以下文字：', lineText.trim())
    })
  }
  
  // 計算搭班統計
  const calculateShiftOverlap = () => {
    const schedule = selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule
    const overlapStats = {}
    
    // 初始化統計資料
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      overlapStats[employeeId] = {}
    })
    
    // 取得當月天數
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    
    // 計算每天搭班情況
    for (let day = 1; day <= daysInMonth; day++) {
      const dayShifts = {}
      
      // 收集當天所有班別
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        const shift = schedule[employeeId]?.[day]
        if (shift && shift !== '休') {
          if (!dayShifts[shift]) dayShifts[shift] = []
          dayShifts[shift].push(employeeId)
        }
      })
      
      // 計算搭班關係
      // 同班別內搭班
      Object.keys(dayShifts).forEach(shift => {
        const employees = dayShifts[shift]
        
        for (let i = 0; i < employees.length; i++) {
          for (let j = i + 1; j < employees.length; j++) {
            const emp1 = employees[i]
            const emp2 = employees[j]
            
            if (!overlapStats[emp1][emp2]) overlapStats[emp1][emp2] = 0
            if (!overlapStats[emp2][emp1]) overlapStats[emp2][emp1] = 0
            overlapStats[emp1][emp2]++
            overlapStats[emp2][emp1]++
          }
        }
      })
      
      // 不同班別搭班（根據搭班邏輯）
      // 早班與中班搭班
      if (dayShifts['早'] && dayShifts['中']) {
        dayShifts['早'].forEach(emp1 => {
          dayShifts['中'].forEach(emp2 => {
            if (!overlapStats[emp1][emp2]) overlapStats[emp1][emp2] = 0
            if (!overlapStats[emp2][emp1]) overlapStats[emp2][emp1] = 0
            overlapStats[emp1][emp2]++
            overlapStats[emp2][emp1]++
          })
        })
      }
      
      // 中班與晚班搭班
      if (dayShifts['中'] && dayShifts['晚']) {
        dayShifts['中'].forEach(emp1 => {
          dayShifts['晚'].forEach(emp2 => {
            if (!overlapStats[emp1][emp2]) overlapStats[emp1][emp2] = 0
            if (!overlapStats[emp2][emp1]) overlapStats[emp2][emp1] = 0
            overlapStats[emp1][emp2]++
            overlapStats[emp2][emp1]++
          })
        })
      }
    }
    
    return overlapStats
  }
  
  // 取得某位同事的搭班排行
  const getEmployeeOverlapRanking = (employeeId) => {
    const overlapStats = calculateShiftOverlap()
    const employeeStats = overlapStats[employeeId] || {}
    
    return Object.entries(employeeStats)
      .map(([otherId, count]) => ({
        employeeId: otherId,
        name: names[otherId] || otherId,
        count: count
      }))
      .sort((a, b) => b.count - a.count)
      .filter(item => item.count > 0)
  }
  
  // 創建月曆樣式的匯出元素
  const createCalendarExport = () => {
    const schedule = selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    
    // 計算每天每個站點的人數
    const transportData = {}
    for (let day = 1; day <= daysInMonth; day++) {
      transportData[day] = {}
      PICKUP_LOCATIONS.forEach(location => {
        transportData[day][location] = 0
      })
    }
    
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      
      const employeeLocation = pickupLocations[employeeId]
      if (!employeeLocation || employeeLocation === '不搭車') return
      
      for (let day = 1; day <= daysInMonth; day++) {
        const shift = schedule[employeeId]?.[day]
        if (shift === '早') {
          transportData[day][employeeLocation]++
        }
      }
    })
    
    // 創建月曆容器
    const calendarContainer = document.createElement('div')
    calendarContainer.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: 1200px;
      background: white;
      padding: 40px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #333;
    `
    
    // 標題
    const title = document.createElement('h1')
    title.textContent = `${new Date().getFullYear()}年${new Date().getMonth() + 1}月 乘車統計表`
    title.style.cssText = `
      text-align: center;
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 30px;
      color: #2c3e50;
    `
    calendarContainer.appendChild(title)
    
    // 創建月曆網格
    const calendarGrid = document.createElement('div')
    calendarGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 8px;
      margin-top: 20px;
    `
    
    // 星期標題
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    weekdays.forEach(day => {
      const dayHeader = document.createElement('div')
      dayHeader.textContent = day
      dayHeader.style.cssText = `
        text-align: center;
        font-weight: bold;
        font-size: 18px;
        padding: 15px 10px;
        background: #f8f9fa;
        border-radius: 8px;
        color: #495057;
      `
      calendarGrid.appendChild(dayHeader)
    })
    
    // 計算當月第一天是星期幾
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay()
    
    // 添加空白天數
    for (let i = 0; i < firstDayOfMonth; i++) {
      const emptyDay = document.createElement('div')
      emptyDay.style.cssText = `
        height: 120px;
        background: #f8f9fa;
        border-radius: 8px;
      `
      calendarGrid.appendChild(emptyDay)
    }
    
    // 添加當月天數
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div')
      dayCell.style.cssText = `
        height: 120px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        padding: 8px;
        background: white;
        position: relative;
      `
      
      // 日期
      const dateLabel = document.createElement('div')
      dateLabel.textContent = day
      dateLabel.style.cssText = `
        font-size: 16px;
        font-weight: bold;
        color: #495057;
        margin-bottom: 8px;
        text-align: center;
      `
      dayCell.appendChild(dateLabel)
      
      // 檢查是否有乘車需求
      const hasTransport = PICKUP_LOCATIONS.some(location => 
        location !== '不搭車' && transportData[day]?.[location] > 0
      )
      
             if (hasTransport) {
         // 顯示乘車資訊
         PICKUP_LOCATIONS.filter(location => location !== '不搭車').forEach(location => {
           const count = transportData[day]?.[location] || 0
           if (count > 0) {
             const transportInfo = document.createElement('div')
             transportInfo.style.cssText = `
               font-size: 12px;
               margin: 2px 0;
               color: #333;
               text-align: center;
             `
             transportInfo.textContent = `${location}: ${count}人`
             dayCell.appendChild(transportInfo)
           }
         })
       } else {
         // 無乘車需求
         const noTransport = document.createElement('div')
         noTransport.textContent = '無乘車'
         noTransport.style.cssText = `
           font-size: 12px;
           color: #6c757d;
           text-align: center;
           margin-top: 20px;
         `
         dayCell.appendChild(noTransport)
       }
      
      calendarGrid.appendChild(dayCell)
    }
    
    calendarContainer.appendChild(calendarGrid)
    
    return calendarContainer
  }
  
  return (
    <div className="container-custom py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">班表管理工具</h1>
        <p className="text-center text-text-secondary">早班好</p>
      </div>
      
      {/* 分頁切換 */}
      <div className="flex justify-center mb-6">
        <div className="bg-surface/40 rounded-xl p-1 border border-white/10 w-full max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
            <button
              onClick={() => setActiveTab('display')}
              className={`px-3 py-3 md:px-6 rounded-lg transition-all text-sm md:text-base ${
                activeTab === 'display'
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-400/30'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 inline mr-1 md:mr-2" />
              <span className="hidden sm:inline">顯示班表</span>
              <span className="sm:hidden">班表</span>
            </button>
            <button
              onClick={() => setActiveTab('transport')}
              className={`px-3 py-3 md:px-6 rounded-lg transition-all text-sm md:text-base ${
                activeTab === 'transport'
                  ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-400/30'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <TruckIcon className="w-4 h-4 md:w-5 md:h-5 inline mr-1 md:mr-2" />
              <span className="hidden sm:inline">交通及車費試算</span>
              <span className="sm:hidden">交通</span>
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`px-3 py-3 md:px-6 rounded-lg transition-all text-sm md:text-base ${
                activeTab === 'statistics'
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-400/30'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <ChartBarIcon className="w-4 h-4 md:w-5 md:h-5 inline mr-1 md:mr-2" />
              <span className="hidden sm:inline">統計功能</span>
              <span className="sm:hidden">統計</span>
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-3 py-3 md:px-6 rounded-lg transition-all text-sm md:text-base ${
                activeTab === 'import'
                  ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-400/30'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <DocumentArrowUpIcon className="w-4 h-4 md:w-5 md:h-5 inline mr-1 md:mr-2" />
              <span className="hidden sm:inline">匯入與轉換班表</span>
              <span className="sm:hidden">匯入</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* 顯示班表分頁 */}
      {activeTab === 'display' && (
        <div className="space-y-6">
                      {/* 控制面板 */}
            <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-4 md:p-6 lg:p-8 border border-white/20 shadow-xl backdrop-blur-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* 月份選擇 */}
                <div className="group">
                  <label className="block text-sm font-semibold mb-3 text-blue-300 group-hover:text-blue-200 transition-colors">月份</label>
                  <div className="relative">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full px-3 py-2 md:px-4 md:py-3 bg-white/10 border border-white/20 rounded-xl focus:border-blue-400/50 focus:bg-white/20 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 appearance-none cursor-pointer text-sm md:text-base"
                    >
                      <option value="current">當月</option>
                      <option value="next">下個月</option>
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* 顯示模式 */}
                <div className="group">
                  <label className="block text-sm font-semibold mb-3 text-purple-300 group-hover:text-purple-200 transition-colors">顯示模式</label>
                  <div className="relative">
                    <select
                      value={viewMode}
                      onChange={(e) => setViewMode(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-purple-400/50 focus:bg-white/20 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 appearance-none cursor-pointer"
                    >
                      <option value="date">日期視圖</option>
                      <option value="employee">同事視圖</option>
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* 篩選模式 */}
                <div className="group">
                  <label className="block text-sm font-semibold mb-3 text-green-300 group-hover:text-green-200 transition-colors">篩選</label>
                  <div className="relative">
                    <select
                      value={filterMode}
                      onChange={(e) => setFilterMode(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-green-400/50 focus:bg-white/20 focus:ring-2 focus:ring-green-400/20 transition-all duration-200 appearance-none cursor-pointer"
                    >
                      <option value="all">全部</option>
                      <option value="today">今天</option>
                      <option value="3days">接下來 3 天</option>
                      <option value="7days">接下來 7 天</option>
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* 同事選擇 */}
                <div className="group">
                  <label className="block text-sm font-semibold mb-3 text-orange-300 group-hover:text-orange-200 transition-colors">選擇同事</label>
                  <div className="relative">
                    <select
                      value={selectedEmployee || ''}
                      onChange={(e) => setSelectedEmployee(e.target.value || null)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-orange-400/50 focus:bg-white/20 focus:ring-2 focus:ring-orange-400/20 transition-all duration-200 appearance-none cursor-pointer"
                    >
                      <option value="">顯示所有同事</option>
                      {Object.keys(selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule)
                        .filter(key => key !== '_lastUpdated')
                        .sort((a, b) => {
                          const numA = parseInt(a.match(/\d+/)?.[0] || '0')
                          const numB = parseInt(b.match(/\d+/)?.[0] || '0')
                          return numA - numB
                        })
                        .map(employeeId => (
                          <option key={employeeId} value={employeeId}>
                            {names[employeeId] || employeeId}
                          </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 最後更新時間 */}
              {lastUpdated[selectedMonth] && (
                <div className="mt-6 flex items-center justify-center">
                  <div className="inline-flex items-center px-4 py-2 bg-surface/30 rounded-full border border-white/10">
                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      最後更新：{new Date(lastUpdated[selectedMonth]).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          
           
           
           {/* 班表顯示 */}
           <div className="bg-surface/40 rounded-xl p-6 border border-white/10">
             {viewMode === 'date' ? (
               <DateView 
                 schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
                 names={names}
                 displayDates={getDisplayDates()}
                 filteredEmployees={getFilteredEmployees()}
               />
             ) : (
               <EmployeeView 
                 schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
                 names={names}
                 displayDates={getDisplayDates()}
                 filteredEmployees={getFilteredEmployees()}
               />
             )}
           </div>
        </div>
      )}
      
      {/* 交通及車費試算分頁 */}
      {activeTab === 'transport' && (
        <div className="space-y-6">
                    {/* 控制面板 */}
          <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-8 border border-white/20 shadow-xl backdrop-blur-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 左側：月份選擇和匯出 */}
              <div className="space-y-6">
                {/* 月份選擇 */}
                <div className="group">
                  <label className="block text-sm font-semibold mb-3 text-yellow-300 group-hover:text-yellow-200 transition-colors">月份</label>
                  <div className="relative">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-yellow-400/50 focus:bg-white/20 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-200 appearance-none cursor-pointer"
                    >
                      <option value="current">當月</option>
                      <option value="next">下個月</option>
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* 匯出按鈕 */}
                <div className="group">
                  <label className="block text-sm font-semibold mb-3 text-orange-300 group-hover:text-orange-200 transition-colors">匯出</label>
                  <button
                    onClick={() => exportTransportChart()}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-400/30 text-blue-300 rounded-xl transition-all duration-200 font-medium"
                  >
                    <DocumentArrowUpIcon className="w-4 h-4 inline mr-2" />
                    匯出乘車表
                  </button>
                </div>
              </div>
              
              {/* 右側：Line 群文字和更新時間 */}
              <div className="space-y-6">
                {/* 乘車文字生成 (一週) */}
                <div className="group">
                  <label className="block text-sm font-semibold mb-3 text-green-300 group-hover:text-green-200 transition-colors">乘車文字生成 (一週)</label>
                  <div className="flex space-x-3">
                    <select
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(e.target.value)}
                      className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-green-400/50 focus:bg-white/20 focus:ring-2 focus:ring-green-400/20 transition-all duration-200 appearance-none cursor-pointer"
                    >
                      {generateWeekOptions()}
                    </select>
                    <button
                      onClick={() => generateLineText()}
                      className="px-6 py-3 bg-gradient-to-r from-green-500/20 to-teal-500/20 hover:from-green-500/30 hover:to-teal-500/30 border border-green-400/30 text-green-300 rounded-xl transition-all duration-200 font-medium whitespace-nowrap"
                    >
                      <DocumentTextIcon className="w-4 h-4 inline mr-2" />
                      生成
                    </button>
                  </div>
                </div>
                
                {/* 最後更新時間 */}
                <div className="group">
                  <label className="block text-sm font-semibold mb-3 text-gray-300 group-hover:text-gray-200 transition-colors">更新時間</label>
                  <div className="px-4 py-3 bg-surface/30 rounded-xl border border-white/10">
                    <span className="text-sm text-gray-300">
                      {lastUpdated[selectedMonth] ? new Date(lastUpdated[selectedMonth]).toLocaleString() : '無資料'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 乘車表顯示 */}
          <div className="bg-surface/40 rounded-xl p-6 border border-white/10">
            <TransportChart 
              schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
              names={names}
              pickupLocations={pickupLocations}
            />
          </div>
          

        </div>
      )}
      
      {/* 統計功能分頁 */}
      {activeTab === 'statistics' && (
        <div className="space-y-6">
          {/* 控制面板 */}
          <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-8 border border-white/20 shadow-xl backdrop-blur-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 左側：月份選擇 */}
              <div className="group">
                <label className="block text-sm font-semibold mb-3 text-purple-300 group-hover:text-purple-200 transition-colors">月份</label>
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-purple-400/50 focus:bg-white/20 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 appearance-none cursor-pointer"
                  >
                    <option value="current">當月</option>
                    <option value="next">下個月</option>
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* 右側：更新時間 */}
              <div className="group">
                <label className="block text-sm font-semibold mb-3 text-gray-300 group-hover:text-gray-200 transition-colors">更新時間</label>
                <div className="px-4 py-3 bg-surface/30 rounded-xl border border-white/10">
                  <span className="text-sm text-gray-300">
                    {lastUpdated[selectedMonth] ? new Date(lastUpdated[selectedMonth]).toLocaleString() : '無資料'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
                    {/* 有趣統計資料 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* 早班統計 */}
                          <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-4 border border-white/20 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-pink-500/20 border border-pink-400/30 flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-pink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-pink-300">早班統計</h3>
                </div>
              <EarlyShiftStats 
                schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
                names={names}
              />
            </div>
            
            {/* 晚班統計 */}
            <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-4 border border-white/20 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-center mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-blue-300">晚班統計</h3>
              </div>
              <NightShiftStats 
                schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
                names={names}
              />
            </div>
            
            {/* 連續上班統計 */}
            <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-4 border border-white/20 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-center mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-400/30 flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-orange-300">連續上班統計</h3>
              </div>
              <ConsecutiveWorkStats 
                schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
                names={names}
              />
            </div>
          </div>
          
          {/* 搭班統計表格 */}
          <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-4 md:p-6 lg:p-8 border border-white/20 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-center mb-6 md:mb-8">
              <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mr-2 md:mr-3">
                <svg className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-blue-300">搭班統計表</h3>
            </div>
            <ShiftOverlapTable 
              schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
              names={names}
              onEmployeeClick={setSelectedStatsEmployee}
            />
          </div>
          
          {/* 個人搭班詳情彈窗 */}
          {selectedStatsEmployee && (
            <EmployeeOverlapDetail 
              employeeId={selectedStatsEmployee}
              employeeName={names[selectedStatsEmployee] || selectedStatsEmployee}
              ranking={getEmployeeOverlapRanking(selectedStatsEmployee)}
              onClose={() => setSelectedStatsEmployee(null)}
            />
          )}

        </div>
      )}
      
      {/* 匯入與轉換班表分頁 */}
      {activeTab === 'import' && (
        <div className="space-y-6">
                     {/* 匯入班表 */}
           <div className="bg-surface/60 rounded-xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
             <h3 className="text-xl font-bold mb-4 text-green-300">匯入班表</h3>
             
             {/* 班別代碼說明 */}
             <div className="mb-6 p-4 bg-surface/40 rounded-lg border border-white/10">
               <h4 className="text-lg font-semibold mb-3 text-blue-300">班別代碼說明</h4>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                 {Object.entries(SHIFT_CODES).map(([code, description]) => (
                   <div key={code} className="flex items-center gap-2 p-2 bg-surface/20 rounded border border-white/10">
                     <span className="font-mono bg-white/10 px-2 py-1 rounded text-green-300 font-medium">{code}</span>
                     <span className="text-gray-300 font-medium">= {description}</span>
                   </div>
                 ))}
               </div>
             </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2">目標月份</label>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-green-400/50 focus:bg-white/10"
                >
                  <option value="current">當月</option>
                  <option value="next">下個月</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Excel 資料</label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="從 Excel 複製資料並貼上這裡..."
                  className="w-full h-32 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-green-400/50 focus:bg-white/10 resize-none"
                />
              </div>
            </div>
            
            {importError && (
              <div className="mt-6 p-4 bg-red-600/20 border border-red-500/30 rounded-xl text-red-300 font-medium">
                {importError}
              </div>
            )}
            
            <div className="mt-4 flex gap-3">
              <button
                onClick={parseImportData}
                className="px-6 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 text-green-300 rounded-lg transition-all font-medium"
              >
                解析資料
              </button>
              
              {parsedData && (
                <button
                  onClick={uploadSchedule}
                  className="px-6 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-300 rounded-lg transition-all font-medium"
                >
                  上傳班表
                </button>
              )}
            </div>
          </div>
          
          {/* 預覽表格 */}
          {parsedData && (
            <div className="bg-surface/60 rounded-xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-4 text-blue-300">預覽表格</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse', borderSpacing: 0, border: 'none' }}>
                  <thead>
                    <tr className="bg-surface/40 border-b border-white/20">
                      <th className="text-left p-3 text-blue-300 font-semibold" style={{ border: 'none !important', borderRight: 'none !important', borderLeft: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}>職員編號</th>
                      <th className="text-left p-3 text-purple-300 font-semibold" style={{ border: 'none !important', borderRight: 'none !important', borderLeft: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}>姓名</th>
                      {Array.from({ length: 31 }, (_, i) => (
                        <th key={i} className="text-center p-3 text-green-300 font-medium" style={{ border: 'none !important', borderRight: 'none !important', borderLeft: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}>{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(parsedData).map(([id, data]) => (
                      <tr key={id} className="border-b border-white/10 hover:bg-white/5 transition-all duration-200">
                        <td className="p-3 text-gray-400 font-medium" style={{ border: 'none !important', borderRight: 'none !important', borderLeft: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}>{id}</td>
                        <td className="p-3 text-white font-semibold" style={{ border: 'none !important', borderRight: 'none !important', borderLeft: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}>{data.name}</td>
                        {data.schedule.map((shift, index) => (
                          <td key={index} className="p-2 text-center" style={{ border: 'none !important', borderRight: 'none !important', borderLeft: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}>
                            {shift ? (
                              <div className={`
                                px-3 py-2 rounded-lg text-center text-xs font-bold
                                ${shift === '早' ? 'bg-pink-500 text-white' :
                                  shift === '中' ? 'bg-cyan-500 text-white' :
                                  shift === '晚' ? 'bg-blue-500 text-white' :
                                  shift === '休' ? 'bg-gray-500 text-white' :
                                  shift === '特' ? 'bg-orange-500 text-white' :
                                  shift === '排' ? 'bg-yellow-500 text-white' :
                                  'bg-gray-700 text-gray-300'}
                              `}>
                                {shift}
                              </div>
                            ) : (
                              <div className="w-full h-8 rounded-lg bg-surface/20 border border-white/10"></div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* 同事基本資料管理 */}
          <div className="bg-surface/40 rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold mb-4 text-purple-400">同事基本資料管理</h3>
            
            {/* 操作按鈕 */}
            <div className="flex flex-wrap gap-4 mb-6">
              <button
                onClick={loadEmployeeData}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-400 rounded-lg transition-all flex items-center gap-2"
              >
                <ArrowPathIcon className="w-4 h-4" />
                從 Firebase 讀取資料
              </button>
              
              <button
                onClick={saveEmployeeData}
                className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 text-green-400 rounded-lg transition-all flex items-center gap-2"
              >
                <DocumentArrowUpIcon className="w-4 h-4" />
                儲存姓名與上車地點
              </button>
              
              <button
                onClick={clearEmployeeData}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-400 rounded-lg transition-all flex items-center gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                清空所有資料
              </button>
            </div>
            
            {/* 新增同事 */}
            <div className="bg-surface/20 rounded-lg p-4 mb-6 border border-white/5">
              <h4 className="text-lg font-semibold mb-4 text-orange-400">新增同事</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">職員編號</label>
                  <input
                    type="text"
                    value={newEmployee.id}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, id: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-orange-400/50 focus:bg-white/10"
                    placeholder="例如：A45"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-2">姓名</label>
                  <input
                    type="text"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-orange-400/50 focus:bg-white/10"
                    placeholder="輸入姓名"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-2">上車地點</label>
                  <select
                    value={newEmployee.pickupLocation}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, pickupLocation: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-orange-400/50 focus:bg-white/10"
                  >
                    {PICKUP_LOCATIONS.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button
                onClick={addEmployee}
                className="mt-4 px-6 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/30 text-orange-400 rounded-lg transition-all flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                新增同事
              </button>
            </div>
            
            {/* 同事列表 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-2 text-blue-400">職員編號</th>
                    <th className="text-left p-2 text-purple-400">姓名</th>
                    <th className="text-left p-2 text-green-400">上車地點</th>
                    <th className="text-center p-2 text-red-400">操作</th>
                  </tr>
                </thead>
                                 <tbody>
                   {Object.keys(names)
                     .sort((a, b) => {
                       // 提取數字部分進行數值排序
                       const numA = parseInt(a.replace(/\D/g, '')) || 0
                       const numB = parseInt(b.replace(/\D/g, '')) || 0
                       return numA - numB
                     })
                     .map(id => (
                      <tr key={id} className="border-b border-white/5">
                        <td className="p-2 text-text-secondary">{id}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={names[id] || ''}
                            onChange={(e) => updateEmployeeName(id, e.target.value)}
                            className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded focus:border-purple-400/50 focus:bg-white/10"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={pickupLocations[id] || PICKUP_LOCATIONS[0]}
                            onChange={(e) => updateEmployeeLocation(id, e.target.value)}
                            className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded focus:border-green-400/50 focus:bg-white/10"
                          >
                            {PICKUP_LOCATIONS.map(location => (
                              <option key={location} value={location}>{location}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => deleteEmployee(id)}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-400 rounded transition-all"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 日期視圖組件
function DateView({ schedule, names, displayDates, filteredEmployees }) {
  // 班別顏色對應 - 深色甘特圖風格
  const getShiftColor = (shift) => {
    switch (shift) {
      case '早': return 'bg-pink-500 text-white'
      case '中': return 'bg-cyan-500 text-white'
      case '晚': return 'bg-blue-500 text-white'
      case '休': return 'bg-gray-500 text-white'
      case '特': return 'bg-orange-500 text-white'
      default: return 'bg-gray-700 text-gray-300'
    }
  }

  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <div className="bg-surface/60 rounded-xl shadow-xl border border-white/20 backdrop-blur-sm min-w-full">
        <div className="w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm" style={{ borderCollapse: 'collapse', borderSpacing: 0, border: 'none' }}>
              <thead>
                <tr className="bg-surface/40 border-b border-white/20">
                  <th className="text-left p-2 md:p-3 text-purple-300 font-semibold" style={{ border: 'none !important', borderRight: 'none !important', borderLeft: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}>姓名</th>
                  {displayDates.map((date) => (
                    <th key={date} className="text-center p-1 md:p-3 text-green-300 font-medium" style={{ border: 'none !important', borderRight: 'none !important', borderLeft: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}>
                      <div className="text-xs font-semibold">{date}</div>
                      <div className="text-xs text-gray-400">
                        {['日', '一', '二', '三', '四', '五', '六'][new Date(new Date().getFullYear(), new Date().getMonth(), date).getDay()]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employeeId) => (
                  <tr key={employeeId} className="border-b border-white/10 hover:bg-white/5 transition-all duration-200">
                    <td className="p-2 md:p-3 text-white font-semibold text-xs md:text-sm" style={{ border: 'none !important', borderRight: 'none !important', borderLeft: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}>{names[employeeId] || employeeId}</td>
                    {displayDates.map((date) => {
                      const shift = schedule[employeeId]?.[date]
                      return (
                        <td key={date} className="p-1 md:p-2 text-center" style={{ border: 'none !important', borderRight: 'none !important', borderLeft: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}>
                          {shift ? (
                            <div className={`
                              px-2 py-1 md:px-3 md:py-2 rounded-lg text-center text-xs font-bold
                              ${shift === '早' ? 'bg-pink-500 text-white' :
                                shift === '中' ? 'bg-cyan-500 text-white' :
                                shift === '晚' ? 'bg-blue-500 text-white' :
                                shift === '休' ? 'bg-gray-500 text-white' :
                                shift === '特' ? 'bg-orange-500 text-white' :
                                'bg-gray-700 text-gray-300'}
                            `}>
                              {shift}
                            </div>
                          ) : (
                            <div className="w-full h-6 md:h-8 rounded-lg bg-surface/20 border border-white/10"></div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// 同事視圖組件
function EmployeeView({ schedule, names, displayDates, filteredEmployees }) {
  // 班別顏色對應 - 深色甘特圖風格
  const getShiftColor = (shift) => {
    switch (shift) {
      case '早': return 'bg-pink-500 text-white'
      case '中': return 'bg-cyan-500 text-white'
      case '晚': return 'bg-blue-500 text-white'
      case '休': return 'bg-gray-500 text-white'
      case '特': return 'bg-orange-500 text-white'
      default: return 'bg-gray-700 text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {filteredEmployees.map(employeeId => (
        <div key={employeeId} className="bg-surface/60 rounded-xl p-6 border border-white/20 shadow-xl backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-white mb-1">
              {names[employeeId] || employeeId}
            </h4>
            <p className="text-sm text-gray-400">職員編號：{employeeId}</p>
          </div>
          
          <div className="grid grid-cols-7 gap-3">
            {displayDates.map(date => {
              const shift = schedule[employeeId]?.[date]
              return (
                <div key={date} className="text-center">
                  <div className="text-xs text-gray-400 mb-2 font-medium">
                    {date}
                  </div>
                  {shift ? (
                    <div className={`
                      px-3 py-2 rounded-lg text-center text-xs font-bold
                      transition-all duration-200 hover:shadow-lg hover:scale-105
                      ${getShiftColor(shift)}
                    `}>
                      {shift}
                    </div>
                  ) : (
                    <div className="w-full h-8 rounded-lg bg-surface/20 border border-white/10"></div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function TransportChart({ schedule, names, pickupLocations }) {
  // 取得當月天數
  const getDaysInMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    return new Date(year, month, 0).getDate()
  }
  
  // 計算每天每個站點的人數
  const calculateDailyTransport = () => {
    const daysInMonth = getDaysInMonth()
    const transportData = {}
    
    // 初始化每天每個站點的數據
    for (let day = 1; day <= daysInMonth; day++) {
      transportData[day] = {}
      PICKUP_LOCATIONS.forEach(location => {
        transportData[day][location] = 0
      })
    }
    
    // 統計每天每個站點的人數
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      
      const employeeLocation = pickupLocations[employeeId]
      if (!employeeLocation || employeeLocation === '不搭車') return
      
      for (let day = 1; day <= daysInMonth; day++) {
        const shift = schedule[employeeId]?.[day]
        if (shift === '早') {
          transportData[day][employeeLocation]++
        }
      }
    })
    
    return transportData
  }
  
  const transportData = calculateDailyTransport()
  const daysInMonth = getDaysInMonth()
  
  return (
    <div id="transport-chart" className="bg-surface/60 rounded-xl p-6 border border-white/20">
      <h3 className="text-xl font-bold mb-6 text-yellow-300 text-center">當月乘車統計表</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse', borderSpacing: 0 }}>
          <thead>
            <tr className="bg-surface/40 border-b border-white/20">
              <th className="text-left p-3 text-yellow-300 font-semibold" style={{ border: 'none !important' }}>上車地點</th>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                <th key={day} className="text-center p-2 text-green-300 font-medium" style={{ border: 'none !important' }}>
                  <div className="text-xs font-semibold">{day}</div>
                  <div className="text-xs text-gray-400">
                    {['日', '一', '二', '三', '四', '五', '六'][new Date(new Date().getFullYear(), new Date().getMonth(), day).getDay()]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PICKUP_LOCATIONS.filter(location => location !== '不搭車').map(location => (
              <tr key={location} className="border-b border-white/10 hover:bg-white/5 transition-all duration-200">
                <td className="p-3 text-white font-semibold" style={{ border: 'none !important' }}>{location}</td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const count = transportData[day]?.[location] || 0
                  return (
                    <td key={day} className="p-2 text-center" style={{ border: 'none !important' }}>
                      {count > 0 ? (
                        <div className="px-3 py-2 rounded-lg text-center text-xs font-bold bg-yellow-500/20 border border-yellow-400/30 text-yellow-300">
                          {count}
                        </div>
                      ) : (
                        <div className="w-full h-8 rounded-lg bg-surface/20 border border-white/10"></div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// 搭班統計表格組件
function ShiftOverlapTable({ schedule, names, onEmployeeClick }) {
  const calculateShiftOverlap = () => {
    const overlapStats = {}
    
    // 初始化統計資料
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      overlapStats[employeeId] = {}
    })
    
    // 取得當月天數
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    
    // 計算每天搭班情況
    for (let day = 1; day <= daysInMonth; day++) {
      const dayShifts = {}
      
      // 收集當天所有班別
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        const shift = schedule[employeeId]?.[day]
        if (shift && shift !== '休') {
          if (!dayShifts[shift]) dayShifts[shift] = []
          dayShifts[shift].push(employeeId)
        }
      })
      
      // 計算搭班關係
      // 同班別內搭班
      Object.keys(dayShifts).forEach(shift => {
        const employees = dayShifts[shift]
        
        for (let i = 0; i < employees.length; i++) {
          for (let j = i + 1; j < employees.length; j++) {
            const emp1 = employees[i]
            const emp2 = employees[j]
            
            if (!overlapStats[emp1][emp2]) overlapStats[emp1][emp2] = 0
            if (!overlapStats[emp2][emp1]) overlapStats[emp2][emp1] = 0
            overlapStats[emp1][emp2]++
            overlapStats[emp2][emp1]++
          }
        }
      })
      
      // 不同班別搭班（根據搭班邏輯）
      // 早班與中班搭班
      if (dayShifts['早'] && dayShifts['中']) {
        dayShifts['早'].forEach(emp1 => {
          dayShifts['中'].forEach(emp2 => {
            if (!overlapStats[emp1][emp2]) overlapStats[emp1][emp2] = 0
            if (!overlapStats[emp2][emp1]) overlapStats[emp2][emp1] = 0
            overlapStats[emp1][emp2]++
            overlapStats[emp2][emp1]++
          })
        })
      }
      
      // 中班與晚班搭班
      if (dayShifts['中'] && dayShifts['晚']) {
        dayShifts['中'].forEach(emp1 => {
          dayShifts['晚'].forEach(emp2 => {
            if (!overlapStats[emp1][emp2]) overlapStats[emp1][emp2] = 0
            if (!overlapStats[emp2][emp1]) overlapStats[emp2][emp1] = 0
            overlapStats[emp1][emp2]++
            overlapStats[emp2][emp1]++
          })
        })
      }
    }
    
    return overlapStats
  }
  
  const overlapStats = calculateShiftOverlap()
  const employees = Object.keys(schedule).filter(key => key !== '_lastUpdated').sort((a, b) => {
    // 提取數字部分進行數值排序
    const numA = parseInt(a.match(/\d+/)?.[0] || '0')
    const numB = parseInt(b.match(/\d+/)?.[0] || '0')
    return numA - numB
  })
  
  return (
    <div>
      <h3 className="text-xl font-bold mb-6 text-purple-300 text-center">搭班統計表</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse', borderSpacing: 0 }}>
          <thead>
            <tr className="bg-surface/40 border-b border-white/20">
              <th className="text-left p-3 text-purple-300 font-semibold" style={{ border: 'none !important' }}>同事</th>
              {employees.map(employeeId => (
                <th key={employeeId} className="text-center p-3 text-purple-300 font-medium" style={{ border: 'none !important' }}>
                  {names[employeeId] || employeeId}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(employeeId => (
              <tr key={employeeId} className="border-b border-white/10 hover:bg-white/5 transition-all duration-200">
                <td 
                  className="p-3 text-white font-semibold cursor-pointer hover:text-purple-300 transition-colors" 
                  style={{ border: 'none !important' }}
                  onClick={() => onEmployeeClick(employeeId)}
                >
                  {names[employeeId] || employeeId}
                </td>
                {employees.map(otherId => {
                  const count = overlapStats[employeeId]?.[otherId] || 0
                  return (
                    <td key={otherId} className="p-3 text-center" style={{ border: 'none !important' }}>
                      {employeeId === otherId ? (
                        <div className="w-8 h-8 rounded-lg bg-surface/20 border border-white/10 flex items-center justify-center text-gray-400">-</div>
                      ) : count > 0 ? (
                        <div className="px-3 py-2 rounded-lg text-center text-xs font-bold bg-purple-500/20 border border-purple-400/30 text-purple-300">
                          {count}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-surface/20 border border-white/10 flex items-center justify-center text-gray-400">0</div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// 個人搭班詳情彈窗組件
function EmployeeOverlapDetail({ employeeId, employeeName, ranking, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface/95 rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-purple-300">{employeeName} 的搭班排行</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface/30 rounded-lg text-gray-300 hover:text-white transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {ranking.length > 0 ? (
          <div className="space-y-3">
            {ranking.map((item, index) => (
              <div key={item.employeeId} className="flex items-center justify-between p-4 bg-surface/20 rounded-xl border border-white/10">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 font-bold text-sm">
                    {index + 1}
                  </div>
                  <span className="text-white font-medium">{item.name}</span>
                </div>
                <div className="text-purple-300 font-bold">{item.count} 次</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            本月無搭班記錄
          </div>
        )}
      </div>
    </div>
  )
}

// 班別統計組件
function ShiftTypeStats({ schedule, names }) {
  const calculateShiftStats = () => {
    const stats = {}
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      
      stats[employeeId] = {
        name: names[employeeId] || employeeId,
        early: 0,
        middle: 0,
        night: 0,
        special: 0,
        total: 0
      }
      
      for (let day = 1; day <= daysInMonth; day++) {
        const shift = schedule[employeeId]?.[day]
        if (shift && shift !== '休') {
          stats[employeeId].total++
          switch (shift) {
            case '早':
              stats[employeeId].early++
              break
            case '中':
              stats[employeeId].middle++
              break
            case '晚':
              stats[employeeId].night++
              break
            case '特':
              stats[employeeId].special++
              break
          }
        }
      }
    })
    
    return Object.values(stats).filter(stat => stat.total > 0)
  }
  
  const shiftStats = calculateShiftStats()
  
  return (
    <div className="space-y-4">
      {/* 早班排行 */}
      <div>
        <h4 className="text-lg font-semibold mb-3 text-pink-300">早班排行</h4>
        <div className="space-y-2">
          {shiftStats
            .filter(stat => stat.early > 0)
            .sort((a, b) => b.early - a.early)
            .slice(0, 5)
            .map((stat, index) => (
              <div key={stat.name} className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-pink-300 font-bold text-xs">
                    {index + 1}
                  </div>
                  <span className="text-white font-medium">{stat.name}</span>
                </div>
                <div className="text-pink-300 font-bold">{stat.early} 次</div>
              </div>
            ))}
        </div>
      </div>
      
      {/* 晚班排行 */}
      <div>
        <h4 className="text-lg font-semibold mb-3 text-blue-300">晚班排行</h4>
        <div className="space-y-2">
          {shiftStats
            .filter(stat => stat.night > 0)
            .sort((a, b) => b.night - a.night)
            .slice(0, 5)
            .map((stat, index) => (
              <div key={stat.name} className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 font-bold text-xs">
                    {index + 1}
                  </div>
                  <span className="text-white font-medium">{stat.name}</span>
                </div>
                <div className="text-blue-300 font-bold">{stat.night} 次</div>
              </div>
            ))}
        </div>
      </div>
      

    </div>
  )
}

// 連續上班統計組件
function ConsecutiveWorkStats({ schedule, names }) {
  const calculateConsecutiveStats = () => {
    const stats = {}
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      
      let maxConsecutive = 0
      let currentConsecutive = 0
      let currentStreak = 0
      
      for (let day = 1; day <= daysInMonth; day++) {
        const shift = schedule[employeeId]?.[day]
        if (shift && shift !== '休') {
          currentStreak++
          currentConsecutive = Math.max(currentConsecutive, currentStreak)
        } else {
          currentStreak = 0
        }
      }
      
      maxConsecutive = currentConsecutive
      
      if (maxConsecutive > 0) {
        stats[employeeId] = {
          name: names[employeeId] || employeeId,
          maxConsecutive: maxConsecutive
        }
      }
    })
    
    return Object.values(stats).sort((a, b) => b.maxConsecutive - a.maxConsecutive)
  }
  
  const consecutiveStats = calculateConsecutiveStats()
  
  return (
    <div className="space-y-3">
      {consecutiveStats.slice(0, 5).map((stat, index) => (
        <div key={stat.name} className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-400/30 flex items-center justify-center text-orange-300 font-bold text-xs">
              {index + 1}
            </div>
            <span className="text-white font-medium">{stat.name}</span>
          </div>
          <div className="text-orange-300 font-bold">{stat.maxConsecutive} 天</div>
        </div>
      ))}
    </div>
  )
}

// 早班統計組件
function EarlyShiftStats({ schedule, names }) {
  const calculateEarlyShiftStats = () => {
    const stats = {}
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      
      let earlyCount = 0
      
      for (let day = 1; day <= daysInMonth; day++) {
        const shift = schedule[employeeId]?.[day]
        if (shift === '早') {
          earlyCount++
        }
      }
      
      if (earlyCount > 0) {
        stats[employeeId] = {
          name: names[employeeId] || employeeId,
          earlyCount
        }
      }
    })
    
    return Object.values(stats).sort((a, b) => b.earlyCount - a.earlyCount)
  }
  
  const earlyStats = calculateEarlyShiftStats()
  
  return (
    <div className="space-y-3">
      {earlyStats.slice(0, 5).map((stat, index) => (
        <div key={stat.name} className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-pink-300 font-bold text-xs">
              {index + 1}
            </div>
            <span className="text-white font-medium">{stat.name}</span>
          </div>
          <div className="text-pink-300 font-bold">{stat.earlyCount} 次</div>
        </div>
      ))}
    </div>
  )
}

// 晚班統計組件
function NightShiftStats({ schedule, names }) {
  const calculateNightShiftStats = () => {
    const stats = {}
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      
      let nightCount = 0
      
      for (let day = 1; day <= daysInMonth; day++) {
        const shift = schedule[employeeId]?.[day]
        if (shift === '晚') {
          nightCount++
        }
      }
      
      if (nightCount > 0) {
        stats[employeeId] = {
          name: names[employeeId] || employeeId,
          nightCount
        }
      }
    })
    
    return Object.values(stats).sort((a, b) => b.nightCount - a.nightCount)
  }
  
  const nightStats = calculateNightShiftStats()
  
  return (
    <div className="space-y-3">
      {nightStats.slice(0, 5).map((stat, index) => (
        <div key={stat.name} className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 font-bold text-xs">
              {index + 1}
            </div>
            <span className="text-white font-medium">{stat.name}</span>
          </div>
          <div className="text-blue-300 font-bold">{stat.nightCount} 次</div>
        </div>
      ))}
    </div>
  )
}

export default ScheduleManager 