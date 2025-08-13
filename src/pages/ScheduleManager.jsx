import { useState, useEffect } from 'react'
import html2canvas from 'html2canvas'
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'
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

// 車費方案常數
const FARE_PLANS = {
  'A21 環北站': {
    name: 'A21 環北站',
    originalPrice: 65,
    monthlyPass: {
      30: 1260,
      90: 3564,
      120: 3888
    }
  },
  'A19 體育園區站': {
    name: 'A19 體育園區站',
    originalPrice: 40,
    monthlyPass: {
      30: 735,
      90: 2079,
      120: 2268
    }
  },
  '7-11 高萱門市': {
    name: 'A19 體育園區站',
    originalPrice: 40,
    monthlyPass: {
      30: 735,
      90: 2079,
      120: 2268
    }
  },
  'A18 桃園高鐵站': {
    name: 'A18 桃園高鐵站',
    originalPrice: 35,
    monthlyPass: {
      30: 630,
      90: 1782,
      120: 1944
    }
  }
}

// TPass 方案
const TPASS_PLAN = {
  name: 'TPass 799',
  price: 799,
  days: 30,
  description: 'A7-A22 無限搭乘 30天'
}

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
  const [viewMode, setViewMode] = useState('date') // 'date', 'employee', 'partner'
  const [filterMode, setFilterMode] = useState('all') // 'all', 'today', '3days', '7days'
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState('week1')
  const [selectedStatsEmployee, setSelectedStatsEmployee] = useState(null)
  const [selectedOverlapEmployee, setSelectedOverlapEmployee] = useState(null)
  
  // 新增篩選功能
  const [selectedShifts, setSelectedShifts] = useState([]) // 選中的班次
  const [dateRange, setDateRange] = useState({ start: 1, end: 31 }) // 日期範圍
  const [selectedEmployees, setSelectedEmployees] = useState([]) // 選中的多個同事
  
  // 統計分頁狀態
  const [statsTab, setStatsTab] = useState('charts') // 'charts' 或 'overlap'
  
  // 交通分頁狀態
  const [transportTab, setTransportTab] = useState('chart') // 'chart' 或 'fare'
  
  // 車費試算狀態
  const [fareCalculationEmployee, setFareCalculationEmployee] = useState(null)
  
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
  
  // 當切換統計標籤頁時，清除另一個標籤頁的選中狀態
  useEffect(() => {
    if (statsTab === 'charts') {
      setSelectedOverlapEmployee(null)
    } else if (statsTab === 'overlap') {
      setSelectedStatsEmployee(null)
    }
  }, [statsTab])
  
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
    
    let filteredEmployees = employees
    
    // 單一同事篩選
    if (selectedEmployee) {
      filteredEmployees = [selectedEmployee]
    }
    // 多個同事篩選
    else if (selectedEmployees.length > 0) {
      filteredEmployees = selectedEmployees
    }
    
    return filteredEmployees.sort(sortByNumber)
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
      case 'custom':
        return Array.from({ length: dateRange.end - dateRange.start + 1 }, (_, i) => dateRange.start + i)
      default:
        return Array.from({ length: 31 }, (_, i) => i + 1)
    }
  }
  
  // 計算車費
  const calculateFare = (employeeId) => {
    // 自動計算整個月的日期範圍
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const startDate = 1
    const endDate = daysInMonth
    if (!employeeId || !pickupLocations[employeeId]) return null
    
    const location = pickupLocations[employeeId]
    if (location === '不搭車' || !FARE_PLANS[location]) return null
    
    const schedule = selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule
    const employeeSchedule = schedule[employeeId]
    if (!employeeSchedule) return null
    
    let totalTrips = 0
    let workDays = 0
    
    // 計算指定日期範圍內的乘車次數
    for (let day = startDate; day <= endDate; day++) {
      const shift = employeeSchedule[day]
      if (shift && shift !== '休' && shift !== '特') {
        workDays++
        // 早班：1次，中班：2次，晚班：2次
        if (shift === '早') {
          totalTrips += 1
        } else if (shift === '中' || shift === '晚') {
          totalTrips += 2
        }
      }
    }
    
    if (totalTrips === 0) return null
    
    const farePlan = FARE_PLANS[location]
    const originalTotal = totalTrips * farePlan.originalPrice
    const citizenCardTotal = Math.ceil(originalTotal * 0.7) // 桃園市民卡 7折
    
    // 計算各種定期票方案
    const monthlyPassOptions = []
    Object.entries(farePlan.monthlyPass).forEach(([days, price]) => {
      const daysInt = parseInt(days)
      const totalDays = endDate - startDate + 1
      
      // 定期票都按1個月計算，用平均價格比較
      const totalCost = price // 使用票券原價作為總費用
      // 平均每月價格 = 票券價格 ÷ 票券涵蓋的月數
      const averagePricePerMonth = price / (daysInt / 30)
      
      monthlyPassOptions.push({
        days: daysInt,
        price: price, // 單張票券原價
        totalCost: totalCost, // 總費用（等於票券原價）
        averagePricePerMonth: averagePricePerMonth, // 平均每月價格
        savings: originalTotal - totalCost
      })
    })
    
    // TPass 分析 (一個月799元)
    const tpassTotal = TPASS_PLAN.price // 固定799元一個月
    const totalDays = endDate - startDate + 1
    const tpassDailyCost = tpassTotal / 30 // 每日平均成本
    
    // 計算需要多少額外搭乘才能讓 TPass 划算
    const breakEvenTrips = Math.ceil((tpassTotal - originalTotal) / farePlan.originalPrice)
    
    // TPass 使用建議
    const tpassRecommendation = () => {
      if (originalTotal >= tpassTotal) {
        return { type: 'recommended', text: 'TPass比原價划算，強烈推薦！' }
      } else if (breakEvenTrips <= 5) {
        return { type: 'consider', text: `只需額外搭乘${breakEvenTrips}次即可回本，建議考慮` }
      } else if (breakEvenTrips <= 10) {
        return { type: 'maybe', text: `需要額外搭乘${breakEvenTrips}次才回本，可考慮其他方案` }
      } else {
        return { type: 'not-recommended', text: `需要額外搭乘${breakEvenTrips}次才回本，不建議` }
      }
    }
    
    return {
      employeeId,
      employeeName: names[employeeId] || employeeId,
      location,
      workDays,
      totalTrips,
      originalTotal,
      citizenCardTotal,
      monthlyPassOptions,
      tpassTotal,
      tpassDailyCost,
      breakEvenTrips,
      tpassRecommendation: tpassRecommendation(),
      recommendations: []
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
                      <option value="partner">搭班視圖</option>
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
                      <option value="custom">自定義範圍</option>
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
            


            {/* 進階篩選面板 */}
            {(filterMode === 'custom' || selectedShifts.length > 0 || selectedEmployees.length > 0) && (
              <div className="bg-gradient-to-br from-surface/50 to-surface/30 rounded-2xl p-4 md:p-6 border border-white/15 shadow-lg backdrop-blur-sm">
                <h4 className="text-lg font-semibold mb-4 text-cyan-300">進階篩選</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* 日期範圍選擇 */}
                  {filterMode === 'custom' && (
                    <div className="group">
                      <label className="block text-sm font-semibold mb-3 text-cyan-300">日期範圍</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={dateRange.start}
                          onChange={(e) => setDateRange(prev => ({ ...prev, start: parseInt(e.target.value) }))}
                          className="w-1/2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-cyan-400/50 focus:bg-white/20 text-sm"
                          placeholder="開始日期"
                        />
                        <span className="text-gray-400 self-center">至</span>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={dateRange.end}
                          onChange={(e) => setDateRange(prev => ({ ...prev, end: parseInt(e.target.value) }))}
                          className="w-1/2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:border-cyan-400/50 focus:bg-white/20 text-sm"
                          placeholder="結束日期"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* 班次篩選 */}
                  <div className="group">
                    <label className="block text-sm font-semibold mb-3 text-pink-300">班次篩選</label>
                    <div className="flex flex-wrap gap-2">
                      {['早', '中', '晚', '休', '特'].map(shift => (
                        <button
                          key={shift}
                          onClick={() => {
                            if (selectedShifts.includes(shift)) {
                              setSelectedShifts(prev => prev.filter(s => s !== shift))
                            } else {
                              setSelectedShifts(prev => [...prev, shift])
                            }
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                            selectedShifts.includes(shift)
                              ? 'bg-pink-500 text-white border border-pink-400'
                              : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
                          }`}
                        >
                          {shift}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 多同事選擇 */}
                  <div className="group">
                    <label className="block text-sm font-semibold mb-3 text-orange-300">多同事選擇</label>
                    <div className="max-h-32 overflow-y-auto">
                      {Object.keys(selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule)
                        .filter(key => key !== '_lastUpdated')
                        .sort((a, b) => {
                          const numA = parseInt(a.match(/\d+/)?.[0] || '0')
                          const numB = parseInt(b.match(/\d+/)?.[0] || '0')
                          return numA - numB
                        })
                        .map(employeeId => (
                          <label key={employeeId} className="flex items-center gap-2 mb-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedEmployees.includes(employeeId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEmployees(prev => [...prev, employeeId])
                                } else {
                                  setSelectedEmployees(prev => prev.filter(id => id !== employeeId))
                                }
                              }}
                              className="w-4 h-4 text-orange-500 bg-white/10 border-white/20 rounded focus:ring-orange-400/50"
                            />
                            <span className="text-sm text-gray-300">{names[employeeId] || employeeId}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
                
                {/* 清除篩選按鈕 */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedShifts([])
                      setSelectedEmployees([])
                      setDateRange({ start: 1, end: 31 })
                      setFilterMode('all')
                    }}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 rounded-lg transition-all text-sm"
                  >
                    清除所有篩選
                  </button>
                </div>
              </div>
            )}
          
           
           
           {/* 班表顯示 */}
           <div className="bg-surface/40 rounded-xl p-6 border border-white/10">
             {viewMode === 'date' ? (
               <DateView 
                 schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
                 names={names}
                 displayDates={getDisplayDates()}
                 filteredEmployees={getFilteredEmployees()}
                 selectedShifts={selectedShifts}
               />
             ) : viewMode === 'employee' ? (
               <EmployeeView 
                 schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
                 names={names}
                 displayDates={getDisplayDates()}
                 filteredEmployees={getFilteredEmployees()}
                 selectedShifts={selectedShifts}
               />
             ) : viewMode === 'partner' ? (
               <DailyPartnerView 
                 schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
                 names={names}
                 displayDates={getDisplayDates()}
                 selectedEmployee={selectedEmployee}
               />
             ) : (
               <ThreeDView 
                 schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
                 names={names}
                 displayDates={getDisplayDates()}
                 filteredEmployees={getFilteredEmployees()}
                 selectedShifts={selectedShifts}
               />
             )}
           </div>
        </div>
      )}
      
      {/* 交通及車費試算分頁 */}
      {activeTab === 'transport' && (
        <div className="space-y-6">
          {/* 標籤頁切換 */}
          <div className="bg-surface/60 rounded-2xl p-2 border border-white/20">
            <div className="flex space-x-2">
              <button
                onClick={() => setTransportTab('chart')}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                  transportTab === 'chart'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                乘車表
              </button>
              <button
                onClick={() => setTransportTab('fare')}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                  transportTab === 'fare'
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                車費試算
              </button>
            </div>
          </div>

          {/* 乘車表標籤頁 */}
          {transportTab === 'chart' && (
            <>
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
            </>
          )}

          {/* 車費試算標籤頁 */}
          {transportTab === 'fare' && (
            <>
              {/* 控制面板 */}
              <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-8 border border-white/20 shadow-xl backdrop-blur-sm">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* 月份選擇 */}
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
                  
                  {/* 同事選擇 */}
                  <div className="group">
                    <label className="block text-sm font-semibold mb-3 text-blue-300 group-hover:text-blue-200 transition-colors">選擇同事</label>
                    <div className="relative">
                      <select
                        value={fareCalculationEmployee || ''}
                        onChange={(e) => setFareCalculationEmployee(e.target.value || null)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-blue-400/50 focus:bg-white/20 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 appearance-none cursor-pointer"
                      >
                        <option value="">請選擇同事</option>
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
                        <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 車費試算結果 */}
              <div className="bg-surface/40 rounded-xl p-6 border border-white/10">
                <FareCalculator 
                  schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
                  names={names}
                  pickupLocations={pickupLocations}
                  selectedEmployee={fareCalculationEmployee}
                  calculateFare={calculateFare}
                />
              </div>
            </>
          )}
        </div>
      )}
      
                {/* 統計功能分頁 */}
      {activeTab === 'statistics' && (
        <div className="space-y-6">
          {/* 控制面板 */}
          <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-8 border border-white/20 shadow-xl backdrop-blur-sm">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
              
              {/* 中間：統計分頁切換 */}
              <div className="group">
                <label className="block text-sm font-semibold mb-3 text-blue-300 group-hover:text-blue-200 transition-colors">統計類型</label>
                <div className="bg-surface/40 rounded-xl p-1 border border-white/10">
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => setStatsTab('charts')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        statsTab === 'charts'
                          ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      圖表分析
                    </button>
                    <button
                      onClick={() => setStatsTab('overlap')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        statsTab === 'overlap'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      搭班統計表
                    </button>
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
          
          {/* TAB1: 搭班統計表 */}
          {statsTab === 'overlap' && (
            <div className="space-y-6">
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
                  onEmployeeClick={setSelectedOverlapEmployee}
                />
              </div>
              
              {/* 個人搭班詳情彈窗 */}
              {selectedOverlapEmployee && (
                <EmployeeOverlapDetail 
                  employeeId={selectedOverlapEmployee}
                  employeeName={names[selectedOverlapEmployee] || selectedOverlapEmployee}
                  ranking={getEmployeeOverlapRanking(selectedOverlapEmployee)}
                  onClose={() => setSelectedOverlapEmployee(null)}
                />
              )}
            </div>
          )}
          
          {/* TAB2: 圖表分析 */}
          {statsTab === 'charts' && (
            <div className="space-y-6">
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
              
              {/* 圖表分析區域 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* 班次類型分布圓餅圖 */}
                <ShiftTypePieChart 
                  schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
                />
                
                {/* 班次趨勢變化折線圖 */}
                <ShiftTrendChart 
                  schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
                  names={names}
                />
              </div>
              
              {/* 班次分布圖表 */}
              <ShiftDistributionChart 
                schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
                names={names}
              />
              
              {/* 班次分配偏差度分析 */}
              <ShiftBiasAnalysis 
                schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
                names={names}
              />
              
              {/* 個人統計儀表板 */}
              <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
                <h3 className="text-xl font-bold mb-4 text-purple-300 text-center">個人統計儀表板</h3>
                
                {/* 同事選擇器 */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-3 text-purple-300">選擇同事</label>
                  <div className="relative">
                    <select
                      value={selectedStatsEmployee || ''}
                      onChange={(e) => setSelectedStatsEmployee(e.target.value || null)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-purple-400/50 focus:bg-white/20 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 appearance-none cursor-pointer"
                    >
                      <option value="">請選擇一個同事查看個人統計</option>
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
                      <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <PersonalDashboard 
                  schedule={selectedMonth === 'current' ? currentMonthSchedule : nextMonthSchedule}
                  names={names}
                  selectedEmployee={selectedStatsEmployee}
                />
              </div>
            </div>
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
function DateView({ schedule, names, displayDates, filteredEmployees, selectedShifts }) {
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
                  <th className="text-center p-2 md:p-3 text-purple-300 font-semibold sticky left-0 z-10 bg-surface/95" style={{ border: 'none !important', borderRight: 'none !important', borderLeft: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}>姓名</th>
                  {displayDates.map((date) => {
                    const isToday = date === new Date().getDate()
                    return (
                      <th
                        key={date}
                        className={`text-center p-1 md:p-3 font-medium relative ${isToday ? 'text-primary' : 'text-green-300'}`}
                        style={{ border: 'none !important', borderRight: 'none !important', borderLeft: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}
                        title={isToday ? '今天' : undefined}
                        data-today={isToday ? 'true' : undefined}
                      >
                        <div className={`relative text-xs font-semibold inline-flex items-center justify-center w-7 h-7 rounded ${isToday ? 'bg-primary/20 ring-2 ring-primary' : ''}`}>
                          {date}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {['日', '一', '二', '三', '四', '五', '六'][new Date(new Date().getFullYear(), new Date().getMonth(), date).getDay()]}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employeeId, index) => (
                  <tr key={employeeId} className="border-b border-white/10 hover:bg-white/5 transition-all duration-200 group" data-employee-id={employeeId} data-row-index={index}>
                    <td className="p-2 md:p-3 text-white font-semibold text-xs md:text-sm sticky left-0 z-10 bg-surface/95 group-hover:bg-surface/100 text-center" style={{ border: 'none !important', borderRight: 'none !important', borderLeft: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}>
                      <span className="group-hover:text-primary transition-colors">{names[employeeId] || employeeId}</span>
                    </td>
                    {displayDates.map((date) => {
                      const shift = schedule[employeeId]?.[date]
                      const isToday = date === new Date().getDate()
                      
                      // 班次篩選邏輯
                      if (selectedShifts && selectedShifts.length > 0) {
                        if (!shift || !selectedShifts.includes(shift)) {
                          return (
                            <td key={date} className="p-1 md:p-2 text-center" style={{ border: 'none !important', borderRight: 'none !important', borderLeft: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}>
                              <div className={`w-full h-6 md:h-8 rounded-lg border ${isToday ? 'bg-primary/5 border-primary/30' : 'bg-surface/10 border-white/5'} opacity-50`}></div>
                            </td>
                          )
                        }
                      }
                      
                                              return (
                          <td key={date} className={`p-1 md:p-2 text-center ${isToday ? 'bg-primary/5' : ''}`} style={{ border: 'none !important', borderRight: 'none !important', borderLeft: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}>
                            {shift ? (
                              <div className={`
                                px-2 py-1 md:px-3 md:py-2 rounded-lg text-center text-xs font-bold
                                ${isToday ? 'ring-2 ring-primary/50 ' : ''}${shift === '早' ? 'bg-pink-500 text-white' :
                                  shift === '中' ? 'bg-cyan-500 text-white' :
                                  shift === '晚' ? 'bg-blue-500 text-white' :
                                  shift === '休' ? 'bg-gray-500 text-white' :
                                  shift === '特' ? 'bg-orange-500 text-white' :
                                  'bg-gray-700 text-gray-300'}
                              `}>
                                {shift}
                              </div>
                            ) : (
                              <div className={`w-full h-6 md:h-8 rounded-lg border ${isToday ? 'bg-primary/5 border-primary/30' : 'bg-surface/20 border-white/10'}`}></div>
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
function EmployeeView({ schedule, names, displayDates, filteredEmployees, selectedShifts }) {
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
              
              // 班次篩選邏輯
              if (selectedShifts && selectedShifts.length > 0) {
                if (!shift || !selectedShifts.includes(shift)) {
                  return (
                    <div key={date} className="text-center">
                      <div className="text-xs text-gray-400 mb-2 font-medium">
                        {date}
                      </div>
                      <div className="w-full h-8 rounded-lg bg-surface/10 border border-white/5 opacity-50"></div>
                    </div>
                  )
                }
              }
              
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
    const overlapDetails = {} // 儲存詳細的搭班日期
    
    // 初始化統計資料
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      overlapStats[employeeId] = {}
      overlapDetails[employeeId] = {}
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
            if (!overlapDetails[emp1][emp2]) overlapDetails[emp1][emp2] = []
            if (!overlapDetails[emp2][emp1]) overlapDetails[emp2][emp1] = []
            
            overlapStats[emp1][emp2]++
            overlapStats[emp2][emp1]++
            overlapDetails[emp1][emp2].push({ day, shift })
            overlapDetails[emp2][emp1].push({ day, shift })
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
            if (!overlapDetails[emp1][emp2]) overlapDetails[emp1][emp2] = []
            if (!overlapDetails[emp2][emp1]) overlapDetails[emp2][emp1] = []
            
            overlapStats[emp1][emp2]++
            overlapStats[emp2][emp1]++
            overlapDetails[emp1][emp2].push({ day, shift: '早-中' })
            overlapDetails[emp2][emp1].push({ day, shift: '中-早' })
          })
        })
      }
      
      // 中班與晚班搭班
      if (dayShifts['中'] && dayShifts['晚']) {
        dayShifts['中'].forEach(emp1 => {
          dayShifts['晚'].forEach(emp2 => {
            if (!overlapStats[emp1][emp2]) overlapStats[emp1][emp2] = 0
            if (!overlapStats[emp2][emp1]) overlapStats[emp2][emp1] = 0
            if (!overlapDetails[emp1][emp2]) overlapDetails[emp1][emp2] = []
            if (!overlapDetails[emp2][emp1]) overlapDetails[emp2][emp1] = []
            
            overlapStats[emp1][emp2]++
            overlapStats[emp2][emp1]++
            overlapDetails[emp1][emp2].push({ day, shift: '中-晚' })
            overlapDetails[emp2][emp1].push({ day, shift: '晚-中' })
          })
        })
      }
    }
    
    return { overlapStats, overlapDetails }
  }
  
  const { overlapStats, overlapDetails } = calculateShiftOverlap()
  const employees = Object.keys(schedule).filter(key => key !== '_lastUpdated').sort((a, b) => {
    // 提取數字部分進行數值排序
    const numA = parseInt(a.match(/\d+/)?.[0] || '0')
    const numB = parseInt(b.match(/\d+/)?.[0] || '0')
    return numA - numB
  })
  
  // 計算統計摘要
  const calculateSummary = () => {
    let totalOverlaps = 0
    let maxOverlap = 0
    let totalPairs = 0
    
    employees.forEach(emp1 => {
      employees.forEach(emp2 => {
        if (emp1 !== emp2) {
          const count = overlapStats[emp1]?.[emp2] || 0
          if (count > 0) {
            totalOverlaps += count
            maxOverlap = Math.max(maxOverlap, count)
            totalPairs++
          }
        }
      })
    })
    
    return {
      totalOverlaps,
      maxOverlap,
      averageOverlap: totalPairs > 0 ? (totalOverlaps / totalPairs).toFixed(1) : 0,
      totalPairs
    }
  }
  
  const summary = calculateSummary()
  
  // 取得顏色深淺
  const getOverlapColor = (count, maxCount) => {
    if (count === 0) return 'bg-surface/20 border-white/10 text-gray-400'
    const intensity = Math.min(count / maxCount, 1)
    if (intensity > 0.7) return 'bg-purple-500/40 border-purple-400/50 text-purple-200'
    if (intensity > 0.4) return 'bg-purple-500/30 border-purple-400/40 text-purple-300'
    return 'bg-purple-500/20 border-purple-400/30 text-purple-300'
  }
  
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
                        <div 
                          className={`px-3 py-2 rounded-lg text-center text-xs font-bold border cursor-pointer hover:scale-105 transition-all ${getOverlapColor(count, summary.maxOverlap)}`}
                          title={`${names[employeeId] || employeeId} 與 ${names[otherId] || otherId} 搭班 ${count} 次`}
                        >
                          {count}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-surface/10 border border-white/5 flex items-center justify-center text-gray-500 opacity-50">-</div>
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
  const [selectedPartner, setSelectedPartner] = useState(null)
  
  // 計算搭班統計
  const calculateOverlapStats = () => {
    const totalOverlaps = ranking.reduce((sum, item) => sum + item.count, 0)
    const avgOverlaps = ranking.length > 0 ? (totalOverlaps / ranking.length).toFixed(1) : 0
    const maxOverlaps = ranking.length > 0 ? ranking[0].count : 0
    
    return { totalOverlaps, avgOverlaps, maxOverlaps }
  }
  
  const stats = calculateOverlapStats()
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface/95 rounded-2xl p-8 border border-white/20 shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-purple-300">{employeeName} 的搭班詳情</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface/30 rounded-lg text-gray-300 hover:text-white transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* 統計摘要 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-surface/40 rounded-lg p-4 border border-white/10">
            <div className="text-2xl font-bold text-purple-300">{stats.totalOverlaps}</div>
            <div className="text-sm text-gray-400">總搭班次數</div>
          </div>
          <div className="bg-surface/40 rounded-lg p-4 border border-white/10">
            <div className="text-2xl font-bold text-blue-300">{stats.avgOverlaps}</div>
            <div className="text-sm text-gray-400">平均搭班次數</div>
          </div>
          <div className="bg-surface/40 rounded-lg p-4 border border-white/10">
            <div className="text-2xl font-bold text-green-300">{stats.maxOverlaps}</div>
            <div className="text-sm text-gray-400">最高搭班次數</div>
          </div>
        </div>
        
        {ranking.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-purple-300 mb-4">搭班排行</h4>
            {ranking.map((item, index) => (
              <div 
                key={item.employeeId} 
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all hover:scale-105 ${
                  selectedPartner === item.employeeId 
                    ? 'bg-purple-500/30 border-purple-400/50' 
                    : 'bg-surface/20 border-white/10 hover:bg-surface/30'
                }`}
                onClick={() => setSelectedPartner(selectedPartner === item.employeeId ? null : item.employeeId)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500/20 border-yellow-400/30 text-yellow-300' :
                    index === 1 ? 'bg-gray-500/20 border-gray-400/30 text-gray-300' :
                    index === 2 ? 'bg-orange-500/20 border-orange-400/30 text-orange-300' :
                    'bg-purple-500/20 border-purple-400/30 text-purple-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <span className="text-white font-medium">{item.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-purple-300 font-bold">{item.count} 次</div>
                  <div className="text-xs text-gray-400">
                    {((item.count / stats.totalOverlaps) * 100).toFixed(1)}%
                  </div>
                </div>
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

// 時間軸視圖組件
function TimelineView({ schedule, names, displayDates, filteredEmployees, selectedShifts }) {
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
    <div className="space-y-8">
      {filteredEmployees.map(employeeId => (
        <div key={employeeId} className="bg-surface/60 rounded-xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
          <div className="mb-6">
            <h4 className="text-xl font-semibold text-white mb-2">
              {names[employeeId] || employeeId}
            </h4>
            <p className="text-sm text-gray-400">職員編號：{employeeId}</p>
          </div>
          
          {/* 時間軸 */}
          <div className="relative">
            {/* 時間軸線 */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 via-purple-400 to-pink-400"></div>
            
            <div className="space-y-4">
              {displayDates.map((date, index) => {
                const shift = schedule[employeeId]?.[date]
                
                // 班次篩選邏輯
                if (selectedShifts && selectedShifts.length > 0) {
                  if (!shift || !selectedShifts.includes(shift)) {
                    return (
                      <div key={date} className="relative flex items-center">
                        {/* 時間點 */}
                        <div className="absolute left-2 w-4 h-4 bg-gray-400 rounded-full border-2 border-white/20 transform -translate-x-1/2"></div>
                        
                        {/* 日期標籤 */}
                        <div className="ml-8 flex-shrink-0">
                          <div className="text-sm font-medium text-gray-400">{date}日</div>
                          <div className="text-xs text-gray-500">
                            {['日', '一', '二', '三', '四', '五', '六'][new Date(new Date().getFullYear(), new Date().getMonth(), date).getDay()]}
                          </div>
                        </div>
                        
                        {/* 班次內容 */}
                        <div className="ml-6 flex-1">
                          <div className="w-full h-8 rounded-lg bg-surface/10 border border-white/5 opacity-50"></div>
                        </div>
                      </div>
                    )
                  }
                }
                
                return (
                  <div key={date} className="relative flex items-center group">
                    {/* 時間點 */}
                    <div className="absolute left-2 w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full border-2 border-white/20 transform -translate-x-1/2 shadow-lg group-hover:scale-125 transition-transform duration-200"></div>
                    
                    {/* 日期標籤 */}
                    <div className="ml-8 flex-shrink-0">
                      <div className="text-sm font-medium text-white">{date}日</div>
                      <div className="text-xs text-gray-400">
                        {['日', '一', '二', '三', '四', '五', '六'][new Date(new Date().getFullYear(), new Date().getMonth(), date).getDay()]}
                      </div>
                    </div>
                    
                    {/* 班次內容 */}
                    <div className="ml-6 flex-1">
                      {shift ? (
                        <div className={`
                          px-4 py-3 rounded-lg text-center text-sm font-bold
                          transition-all duration-300 hover:scale-105 hover:shadow-lg
                          ${getShiftColor(shift)}
                        `}>
                          {shift}
                        </div>
                      ) : (
                        <div className="w-full h-12 rounded-lg bg-surface/20 border border-white/10 flex items-center justify-center text-gray-400 text-sm">
                          無班次
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// 3D 視圖組件
function ThreeDView({ schedule, names, displayDates, filteredEmployees, selectedShifts }) {
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
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-white mb-2">3D 班表視圖</h3>
        <p className="text-gray-400">立體展示班次安排</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEmployees.map(employeeId => (
          <div key={employeeId} className="group perspective-1000">
            <div className="relative transform-style-preserve-3d transition-all duration-500 group-hover:rotate-y-12">
              {/* 3D 卡片 */}
              <div className="bg-gradient-to-br from-surface/80 to-surface/60 rounded-2xl p-6 border border-white/20 shadow-2xl backdrop-blur-sm transform-style-preserve-3d">
                {/* 卡片正面 */}
                <div className="transform-style-preserve-3d">
                  <div className="mb-6 text-center">
                    <h4 className="text-xl font-bold text-white mb-2">
                      {names[employeeId] || employeeId}
                    </h4>
                    <p className="text-sm text-gray-400">職員編號：{employeeId}</p>
                  </div>
                  
                  {/* 3D 班次網格 */}
                  <div className="grid grid-cols-7 gap-2">
                    {displayDates.map((date, index) => {
                      const shift = schedule[employeeId]?.[date]
                      
                      // 班次篩選邏輯
                      if (selectedShifts && selectedShifts.length > 0) {
                        if (!shift || !selectedShifts.includes(shift)) {
                          return (
                            <div key={date} className="relative group/item">
                              <div className="w-full h-16 rounded-lg bg-surface/10 border border-white/5 opacity-50 transform transition-all duration-300 group-hover/item:scale-110 group-hover/item:rotate-y-6"></div>
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-gray-500">
                                <span>{date}</span>
                              </div>
                            </div>
                          )
                        }
                      }
                      
                      return (
                        <div key={date} className="relative group/item">
                          <div className={`
                            w-full h-16 rounded-lg text-center text-xs font-bold
                            transform transition-all duration-300 
                            group-hover/item:scale-110 group-hover/item:rotate-y-6 group-hover/item:shadow-xl
                            ${shift ? getShiftColor(shift) : 'bg-surface/20 border border-white/10'}
                          `}>
                            <div className="flex flex-col items-center justify-center h-full">
                              <span className="text-xs opacity-75">{date}</span>
                              <span className="font-bold">{shift || ''}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {/* 卡片陰影效果 */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 班次分布圖表組件
function ShiftDistributionChart({ schedule, names }) {
  const calculateShiftDistribution = () => {
    const distribution = {}
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      
      const employeeName = names[employeeId] || employeeId
      distribution[employeeName] = {
        name: employeeName,
        early: 0,
        middle: 0,
        night: 0,
        rest: 0,
        special: 0,
        total: 0
      }
      
      for (let day = 1; day <= daysInMonth; day++) {
        const shift = schedule[employeeId]?.[day]
        if (shift) {
          distribution[employeeName].total++
          switch (shift) {
            case '早':
              distribution[employeeName].early++
              break
            case '中':
              distribution[employeeName].middle++
              break
            case '晚':
              distribution[employeeName].night++
              break
            case '休':
              distribution[employeeName].rest++
              break
            case '特':
              distribution[employeeName].special++
              break
          }
        }
      }
    })
    
    return Object.values(distribution).filter(item => item.total > 0)
  }
  
  const data = calculateShiftDistribution()
  
  return (
    <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
      <h3 className="text-xl font-bold mb-6 text-purple-300 text-center">各同事班次分布</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
          <XAxis dataKey="name" stroke="#ffffff80" />
          <YAxis stroke="#ffffff80" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.8)', 
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#ffffff'
            }}
          />
          <Legend />
          <Bar dataKey="early" stackId="a" fill="#ec4899" name="早班" />
          <Bar dataKey="middle" stackId="a" fill="#06b6d4" name="中班" />
          <Bar dataKey="night" stackId="a" fill="#3b82f6" name="晚班" />
          <Bar dataKey="rest" stackId="a" fill="#6b7280" name="休假" />
          <Bar dataKey="special" stackId="a" fill="#f97316" name="特殊" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// 班次分配偏差度分析組件
function ShiftBiasAnalysis({ schedule, names }) {
  const calculateBiasAnalysis = () => {
    const biasData = {}
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    
    // 計算總班次數
    let totalShifts = { early: 0, middle: 0, night: 0, rest: 0, special: 0 }
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      
      for (let day = 1; day <= daysInMonth; day++) {
        const shift = schedule[employeeId]?.[day]
        if (shift) {
          switch (shift) {
            case '早': totalShifts.early++; break
            case '中': totalShifts.middle++; break
            case '晚': totalShifts.night++; break
            case '休': totalShifts.rest++; break
            case '特': totalShifts.special++; break
          }
        }
      }
    })
    
    // 計算理想分配（平均分配）
    const totalEmployees = Object.keys(schedule).filter(key => key !== '_lastUpdated').length
    const idealPerEmployee = {
      early: totalShifts.early / totalEmployees,
      middle: totalShifts.middle / totalEmployees,
      night: totalShifts.night / totalEmployees,
      rest: totalShifts.rest / totalEmployees,
      special: totalShifts.special / totalEmployees
    }
    
    // 計算每個同事的偏差
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      
      const employeeName = names[employeeId] || employeeId
      const actual = { early: 0, middle: 0, night: 0, rest: 0, special: 0 }
      
      for (let day = 1; day <= daysInMonth; day++) {
        const shift = schedule[employeeId]?.[day]
        if (shift) {
          switch (shift) {
            case '早': actual.early++; break
            case '中': actual.middle++; break
            case '晚': actual.night++; break
            case '休': actual.rest++; break
            case '特': actual.special++; break
          }
        }
      }
      
      // 計算偏差度
      const bias = {
        name: employeeName,
        earlyBias: ((actual.early - idealPerEmployee.early) / idealPerEmployee.early * 100).toFixed(1),
        middleBias: ((actual.middle - idealPerEmployee.middle) / idealPerEmployee.middle * 100).toFixed(1),
        nightBias: ((actual.night - idealPerEmployee.night) / idealPerEmployee.night * 100).toFixed(1),
        restBias: ((actual.rest - idealPerEmployee.rest) / idealPerEmployee.rest * 100).toFixed(1),
        specialBias: ((actual.special - idealPerEmployee.special) / idealPerEmployee.special * 100).toFixed(1)
      }
      
      biasData[employeeName] = bias
    })
    
    return Object.values(biasData)
  }
  
  const biasData = calculateBiasAnalysis()
  
  return (
    <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
      <h3 className="text-xl font-bold mb-6 text-orange-300 text-center">班次分配偏差度分析</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/20">
              <th className="text-left p-3 text-white font-semibold">同事</th>
              <th className="text-center p-3 text-pink-300 font-semibold">早班偏差</th>
              <th className="text-center p-3 text-cyan-300 font-semibold">中班偏差</th>
              <th className="text-center p-3 text-blue-300 font-semibold">晚班偏差</th>
              <th className="text-center p-3 text-gray-300 font-semibold">休假偏差</th>
              <th className="text-center p-3 text-orange-300 font-semibold">特殊偏差</th>
            </tr>
          </thead>
          <tbody>
            {biasData.map((item, index) => (
              <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                <td className="p-3 text-white font-medium">{item.name}</td>
                <td className={`p-3 text-center font-bold ${parseFloat(item.earlyBias) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.earlyBias}%
                </td>
                <td className={`p-3 text-center font-bold ${parseFloat(item.middleBias) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.middleBias}%
                </td>
                <td className={`p-3 text-center font-bold ${parseFloat(item.nightBias) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.nightBias}%
                </td>
                <td className={`p-3 text-center font-bold ${parseFloat(item.restBias) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.restBias}%
                </td>
                <td className={`p-3 text-center font-bold ${parseFloat(item.specialBias) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.specialBias}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// 班次類型分布圓餅圖組件
function ShiftTypePieChart({ schedule }) {
  const calculateShiftTypeDistribution = () => {
    const distribution = { early: 0, middle: 0, night: 0, rest: 0, special: 0 }
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      
      for (let day = 1; day <= daysInMonth; day++) {
        const shift = schedule[employeeId]?.[day]
        if (shift) {
          switch (shift) {
            case '早': distribution.early++; break
            case '中': distribution.middle++; break
            case '晚': distribution.night++; break
            case '休': distribution.rest++; break
            case '特': distribution.special++; break
          }
        }
      }
    })
    
    return [
      { name: '早班', value: distribution.early, color: '#ec4899' },
      { name: '中班', value: distribution.middle, color: '#06b6d4' },
      { name: '晚班', value: distribution.night, color: '#3b82f6' },
      { name: '休假', value: distribution.rest, color: '#6b7280' },
      { name: '特殊', value: distribution.special, color: '#f97316' }
    ].filter(item => item.value > 0)
  }
  
  const data = calculateShiftTypeDistribution()
  
  return (
    <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
      <h3 className="text-xl font-bold mb-6 text-green-300 text-center">班次類型分布</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.8)', 
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#ffffff'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// 班次趨勢變化折線圖組件
function ShiftTrendChart({ schedule, names }) {
  const calculateShiftTrend = () => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const data = []
    
    for (let day = 1; day <= daysInMonth; day++) {
      let early = 0, middle = 0, night = 0, rest = 0, special = 0
      
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        
        const shift = schedule[employeeId]?.[day]
        switch (shift) {
          case '早': early++; break
          case '中': middle++; break
          case '晚': night++; break
          case '休': rest++; break
          case '特': special++; break
        }
      })
      
      data.push({
        date: `${day}日`,
        early,
        middle,
        night,
        rest,
        special
      })
    }
    
    return data
  }
  
  const data = calculateShiftTrend()
  
  return (
    <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
      <h3 className="text-xl font-bold mb-6 text-blue-300 text-center">班次趨勢變化</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
          <XAxis dataKey="date" stroke="#ffffff80" />
          <YAxis stroke="#ffffff80" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.8)', 
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#ffffff'
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="early" stroke="#ec4899" strokeWidth={2} name="早班" />
          <Line type="monotone" dataKey="middle" stroke="#06b6d4" strokeWidth={2} name="中班" />
          <Line type="monotone" dataKey="night" stroke="#3b82f6" strokeWidth={2} name="晚班" />
          <Line type="monotone" dataKey="rest" stroke="#6b7280" strokeWidth={2} name="休假" />
          <Line type="monotone" dataKey="special" stroke="#f97316" strokeWidth={2} name="特殊" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// 個人統計儀表板組件
function PersonalDashboard({ schedule, names, selectedEmployee }) {
  if (!selectedEmployee) {
    return (
      <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
        <h3 className="text-xl font-bold mb-4 text-purple-300 text-center">個人統計儀表板</h3>
        <p className="text-center text-gray-400">請選擇一個同事查看個人統計</p>
      </div>
    )
  }
  
  const calculatePersonalStats = () => {
    const stats = {
      name: names[selectedEmployee] || selectedEmployee,
      early: 0,
      middle: 0,
      night: 0,
      rest: 0,
      special: 0,
      total: 0
    }
    
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    
    for (let day = 1; day <= daysInMonth; day++) {
      const shift = schedule[selectedEmployee]?.[day]
      if (shift) {
        switch (shift) {
          case '早': 
            stats.early++; 
            stats.total++; // 只有實際上班才計入工作天數
            break
          case '中': 
            stats.middle++; 
            stats.total++; // 只有實際上班才計入工作天數
            break
          case '晚': 
            stats.night++; 
            stats.total++; // 只有實際上班才計入工作天數
            break
          case '休': 
            stats.rest++; 
            // 休假不計入工作天數
            break
          case '特': 
            stats.special++; 
            stats.total++; // 只有實際上班才計入工作天數
            break
        }
      }
    }
    
    return stats
  }
  
  const personalStats = calculatePersonalStats()
  
  // 計算圓餅圖數據
  const pieChartData = [
    { name: '早班', value: personalStats.early, color: '#ec4899' },
    { name: '中班', value: personalStats.middle, color: '#06b6d4' },
    { name: '晚班', value: personalStats.night, color: '#3b82f6' },
    { name: '休假', value: personalStats.rest, color: '#6b7280' },
    { name: '特殊', value: personalStats.special, color: '#f97316' }
  ].filter(item => item.value > 0)
  
  // 計算連續上班分析數據
  const calculateConsecutiveWorkData = () => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const consecutivePeriods = []
    let currentStreak = 0
    let periodCount = 0
    
    for (let day = 1; day <= daysInMonth; day++) {
      const shift = schedule[selectedEmployee]?.[day]
      
      if (shift && shift !== '休') {
        currentStreak++
      } else {
        if (currentStreak > 0) {
          periodCount++
          consecutivePeriods.push({
            period: `期間${periodCount}`,
            consecutiveDays: currentStreak,
            trend: currentStreak >= 6 ? '高' : currentStreak >= 4 ? '中' : '低'
          })
        }
        currentStreak = 0
      }
    }
    
    // 處理最後一個連續期
    if (currentStreak > 0) {
      periodCount++
      consecutivePeriods.push({
        period: `期間${periodCount}`,
        consecutiveDays: currentStreak,
                    trend: currentStreak >= 6 ? '高' : currentStreak >= 4 ? '中' : '低'
      })
    }
    
    return consecutivePeriods
  }
  
  // 計算班次轉換分析數據
  const calculateShiftTransitions = () => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const transitions = []
    
    for (let day = 1; day < daysInMonth; day++) {
      const currentShift = schedule[selectedEmployee]?.[day]
      const nextShift = schedule[selectedEmployee]?.[day + 1]
      
      if (currentShift && nextShift) {
        transitions.push({
          from: currentShift,
          to: nextShift,
          day: day
        })
      }
    }
    
    return transitions
  }
  
  // 渲染班次轉換流程圖
  const renderShiftTransitionFlow = () => {
    const transitions = calculateShiftTransitions()
    const transitionCounts = {}
    
    // 統計轉換頻率
    transitions.forEach(t => {
      const key = `${t.from}→${t.to}`
      transitionCounts[key] = (transitionCounts[key] || 0) + 1
    })
    
    // 排序顯示最常見的轉換
    const sortedTransitions = Object.entries(transitionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
    
    return (
      <div className="space-y-3">
        <div className="text-sm text-gray-400 text-center mb-4">
          最常見的班次轉換模式
        </div>
        {sortedTransitions.map(([transition, count], index) => {
          const [from, to] = transition.split('→')
          const getShiftColor = (shift) => {
            switch (shift) {
              case '早': return 'bg-pink-500'
              case '中': return 'bg-cyan-500'
              case '晚': return 'bg-blue-500'
              case '休': return 'bg-gray-500'
              case '特': return 'bg-orange-500'
              default: return 'bg-gray-400'
            }
          }
          
          return (
            <div key={transition} className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${getShiftColor(from)} flex items-center justify-center text-white text-xs font-bold`}>
                  {from}
                </div>
                <div className="text-gray-400">→</div>
                <div className={`w-8 h-8 rounded-full ${getShiftColor(to)} flex items-center justify-center text-white text-xs font-bold`}>
                  {to}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-400">{count}</div>
                <div className="text-xs text-gray-400">次</div>
              </div>
            </div>
          )
        })}
        
        {sortedTransitions.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            本月無班次轉換記錄
          </div>
        )}
      </div>
    )
  }
  
  // 計算每日班次分布數據
  const dailyShiftData = () => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const data = []
    
    for (let day = 1; day <= daysInMonth; day++) {
      const shift = schedule[selectedEmployee]?.[day]
      data.push({
        day: `${day}日`,
        shift: shift || '無班次',
        value: shift ? 1 : 0
      })
    }
    
    return data
  }
  
  // 計算連續上班趨勢數據
  const calculateConsecutiveTrendData = () => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const trendData = []
    
    for (let day = 1; day <= daysInMonth; day++) {
      let currentStreak = 0
      let riskLevel = 0
      
      // 計算到當天為止的連續上班天數
      for (let d = 1; d <= day; d++) {
        const shift = schedule[selectedEmployee]?.[d]
        if (shift && shift !== '休') {
          currentStreak++
        } else {
          if (currentStreak > 0) {
            if (currentStreak >= 7) riskLevel = 3
            else if (currentStreak >= 5) riskLevel = 2
            else riskLevel = 1
          }
          currentStreak = 0
        }
      }
      
      // 處理跨月的情況
      if (currentStreak > 0) {
        if (currentStreak >= 7) riskLevel = 3
        else if (currentStreak >= 5) riskLevel = 2
        else riskLevel = 1
      }
      
      trendData.push({
        date: `${day}日`,
        consecutiveDays: currentStreak,
        riskLevel: riskLevel
      })
    }
    
    return trendData
  }
  
  // 計算班次轉換數據
  const calculateShiftTransitionData = () => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const transitionCounts = {}
    
    for (let day = 1; day < daysInMonth; day++) {
      const currentShift = schedule[selectedEmployee]?.[day]
      const nextShift = schedule[selectedEmployee]?.[day + 1]
      
      if (currentShift && nextShift) {
        const key = `${currentShift}→${nextShift}`
        transitionCounts[key] = (transitionCounts[key] || 0) + 1
      }
    }
    
    return Object.entries(transitionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([transition, value]) => ({
        transition,
        value
      }))
  }
  
  // 計算班次轉換統計
  const calculateShiftTransitionStats = () => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const transitionCounts = {}
    
    for (let day = 1; day < daysInMonth; day++) {
      const currentShift = schedule[selectedEmployee]?.[day]
      const nextShift = schedule[selectedEmployee]?.[day + 1]
      
      if (currentShift && nextShift) {
        const key = `${currentShift}→${nextShift}`
        if (!transitionCounts[key]) {
          const [from, to] = key.split('→')
          transitionCounts[key] = {
            from,
            to,
            count: 0
          }
        }
        transitionCounts[key].count++
      }
    }
    
    return Object.values(transitionCounts).sort((a, b) => b.count - a.count)
  }
  

  
  // 獲取班次顏色
  const getShiftColor = (shift) => {
    switch (shift) {
      case '早': return '#ec4899'
      case '中': return '#06b6d4'
      case '晚': return '#3b82f6'
      case '休': return '#6b7280'
      case '特': return '#f97316'
      default: return '#9ca3af'
    }
  }
  
  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center p-4 bg-pink-500/20 rounded-lg border border-pink-400/30">
          <div className="text-2xl font-bold text-pink-300">{personalStats.early}</div>
          <div className="text-sm text-pink-200">早班</div>
        </div>
        <div className="text-center p-4 bg-cyan-500/20 rounded-lg border border-cyan-400/30">
          <div className="text-2xl font-bold text-cyan-300">{personalStats.middle}</div>
          <div className="text-sm text-cyan-200">中班</div>
        </div>
        <div className="text-center p-4 bg-blue-500/20 rounded-lg border border-blue-400/30">
          <div className="text-2xl font-bold text-blue-300">{personalStats.night}</div>
          <div className="text-sm text-blue-200">晚班</div>
        </div>
        <div className="text-center p-4 bg-gray-500/20 rounded-lg border border-gray-400/30">
          <div className="text-2xl font-bold text-gray-300">{personalStats.rest}</div>
          <div className="text-sm text-gray-200">休假</div>
        </div>
        <div className="text-center p-4 bg-orange-500/20 rounded-lg border border-orange-400/30">
          <div className="text-2xl font-bold text-orange-300">{personalStats.special}</div>
          <div className="text-sm text-orange-200">特殊</div>
        </div>
      </div>
      
      {/* 工作統計 */}
      <div className="text-center p-4 bg-surface/40 rounded-lg border border-white/10">
        <div className="text-lg font-semibold text-white">
          總工作天數：{personalStats.total} 天
        </div>
        <div className="text-sm text-gray-400">
          工作率：{((personalStats.total / 31) * 100).toFixed(1)}%
        </div>
      </div>
      
      {/* 視覺化圖表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 班次佔比圓餅圖 */}
        <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
          <h4 className="text-lg font-bold mb-4 text-purple-300 text-center">班次佔比</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* 每日班次分布熱力圖 */}
        <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
          <h4 className="text-lg font-bold mb-4 text-blue-300 text-center">每日班次分布</h4>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* 星期標題 */}
            {['日', '一', '二', '三', '四', '五', '六'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {/* 空白天數（當月第一天前的空白） */}
            {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() }, (_, i) => (
              <div key={`empty-${i}`} className="h-8 bg-surface/20 rounded border border-white/5"></div>
            ))}
            {/* 當月天數 */}
            {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }, (_, i) => {
              const day = i + 1
              const shift = schedule[selectedEmployee]?.[day]
              const getShiftColor = (shift) => {
                switch (shift) {
                  case '早': return 'bg-pink-500 text-white'
                  case '中': return 'bg-cyan-500 text-white'
                  case '晚': return 'bg-blue-500 text-white'
                  case '休': return 'bg-gray-500 text-white'
                  case '特': return 'bg-orange-500 text-white'
                  default: return 'bg-surface/20 text-gray-400 border border-white/10'
                }
              }
              const getShiftTooltip = (shift) => {
                switch (shift) {
                  case '早': return '早班'
                  case '中': return '中班'
                  case '晚': return '晚班'
                  case '休': return '休假'
                  case '特': return '特殊班'
                  default: return '無班次'
                }
              }
              
              return (
                <div 
                  key={day}
                  className={`h-8 rounded border flex items-center justify-center text-xs font-bold transition-all hover:scale-110 cursor-pointer ${getShiftColor(shift)}`}
                  title={`${day}日 - ${getShiftTooltip(shift)}`}
                >
                  {day}
                </div>
              )
            })}
          </div>
          {/* 圖例 */}
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-pink-500 rounded"></div>
              <span className="text-gray-300">早班</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-cyan-500 rounded"></div>
              <span className="text-gray-300">中班</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-300">晚班</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span className="text-gray-300">休假</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-gray-300">特殊</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 連續上班分析圖 */}
      <div className="space-y-6">
        {/* 連續上班堆疊長條圖 */}
        <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
          <h4 className="text-lg font-bold mb-4 text-orange-300 text-center">連續上班天數分析</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={calculateConsecutiveWorkData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="period" stroke="#ffffff80" />
              <YAxis stroke="#ffffff80" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
                formatter={(value, name) => {
                  const riskLabels = {
                    highRisk: '高 (≥6天)',
                    mediumRisk: '中 (4-5天)',
                    lowRisk: '低 (1-3天)'
                  }
                  return [value, riskLabels[name] || name]
                }}
              />
              <Legend />
              <Bar dataKey="consecutiveDays" fill="#f97316" name="連續天數" />
            </BarChart>
          </ResponsiveContainer>
          
          {/* 等級說明 */}
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-center p-2 bg-red-500/20 rounded-lg border border-red-400/30">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
              <span className="text-red-300">高 (≥6天)</span>
            </div>
            <div className="flex items-center justify-center p-2 bg-orange-500/20 rounded-lg border border-orange-400/30">
              <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
              <span className="text-orange-300">中 (4-5天)</span>
            </div>
            <div className="flex items-center justify-center p-2 bg-green-500/20 rounded-lg border border-green-400/30">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
              <span className="text-green-300">低 (1-3天)</span>
            </div>
          </div>
        </div>
        
        {/* 連續上班趨勢線 */}
        <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
          <h4 className="text-lg font-bold mb-4 text-blue-300 text-center">連續上班頻率趨勢</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={calculateConsecutiveTrendData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="date" stroke="#ffffff80" />
              <YAxis stroke="#ffffff80" domain={[0, 6]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="consecutiveDays" stroke="#8b5cf6" strokeWidth={3} name="連續天數" />
              <Line type="monotone" dataKey="riskLevel" stroke="#ef4444" strokeWidth={2} name="等級" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* 班次轉換分析圖 */}
      <div className="space-y-6">
        {/* 班次轉換桑基圖 */}
        <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
          <h4 className="text-lg font-bold mb-4 text-purple-300 text-center">班次轉換關係圖</h4>
          
          {/* 簡化版桑基圖 - 使用長條圖表示轉換關係 */}
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={calculateShiftTransitionData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="transition" stroke="#ffffff80" />
              <YAxis stroke="#ffffff80" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
                formatter={(value, name, props) => [
                  `${props.payload.transition}: ${value}次`,
                  '轉換次數'
                ]}
              />
              <Bar dataKey="value" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
          
          {/* 班次轉換統計 */}
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {calculateShiftTransitionStats().slice(0, 8).map((transition, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: getShiftColor(transition.from) }}
                  >
                    {transition.from}
                  </div>
                  <span className="text-gray-400">→</span>
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: getShiftColor(transition.to) }}
                  >
                    {transition.to}
                  </div>
                </div>
                <div className="text-purple-300 font-bold">{transition.count}</div>
              </div>
            ))}
          </div>
        </div>
        

      </div>
    </div>
  )
}

// 連續上班分析圖組件
function ConsecutiveWorkAnalysisChart({ schedule, names }) {
  const calculateConsecutiveWorkData = () => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const employeeData = []
    
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      
      const employeeName = names[employeeId] || employeeId
      const consecutivePeriods = []
      let currentStreak = 0
      let periodCount = 0
      
      for (let day = 1; day <= daysInMonth; day++) {
        const shift = schedule[employeeId]?.[day]
        
        if (shift && shift !== '休') {
          currentStreak++
        } else {
          if (currentStreak > 0) {
            periodCount++
            consecutivePeriods.push({
              period: `期間${periodCount}`,
              days: currentStreak,
              risk: currentStreak >= 6 ? 'high' : currentStreak >= 4 ? 'medium' : 'low'
            })
            currentStreak = 0
          }
        }
      }
      
      // 處理最後一個連續期間
      if (currentStreak > 0) {
        periodCount++
        consecutivePeriods.push({
          period: `期間${periodCount}`,
          days: currentStreak,
          risk: currentStreak >= 6 ? 'high' : currentStreak >= 4 ? 'medium' : 'low'
        })
      }
      
      if (consecutivePeriods.length > 0) {
        // 計算各等級的天數
        let highRiskDays = 0
        let mediumRiskDays = 0
        let lowRiskDays = 0
        
        consecutivePeriods.forEach(period => {
          if (period.risk === 'high') {
            highRiskDays += period.days
          } else if (period.risk === 'medium') {
            mediumRiskDays += period.days
          } else {
            lowRiskDays += period.days
          }
        })
        
        employeeData.push({
          name: employeeName,
          periods: consecutivePeriods,
          totalConsecutiveDays: consecutivePeriods.reduce((sum, p) => sum + p.days, 0),
          maxConsecutiveDays: Math.max(...consecutivePeriods.map(p => p.days)),
          highRisk: highRiskDays,
          mediumRisk: mediumRiskDays,
          lowRisk: lowRiskDays,
          riskLevel: consecutivePeriods.some(p => p.risk === 'high') ? 'high' : 
                    consecutivePeriods.some(p => p.risk === 'medium') ? 'medium' : 'low'
        })
      }
    })
    
    return employeeData.sort((a, b) => b.totalConsecutiveDays - a.totalConsecutiveDays)
  }
  
  const calculateTrendData = () => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const trendData = []
    
    for (let day = 1; day <= daysInMonth; day++) {
      let consecutiveCount = 0
      let highRiskCount = 0
      let mediumRiskCount = 0
      let lowRiskCount = 0
      
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        
        // 計算該員工到當天為止的連續上班天數
        let currentStreak = 0
        for (let d = 1; d <= day; d++) {
          const shift = schedule[employeeId]?.[d]
          if (shift && shift !== '休') {
            currentStreak++
          } else {
            if (currentStreak > 0) {
              if (currentStreak >= 6) highRiskCount++
              else if (currentStreak >= 4) mediumRiskCount++
              else lowRiskCount++
              consecutiveCount++
            }
            currentStreak = 0
          }
        }
        
        // 處理跨月的情況
        if (currentStreak > 0) {
          if (currentStreak >= 6) highRiskCount++
          else if (currentStreak >= 4) mediumRiskCount++
          else lowRiskCount++
          consecutiveCount++
        }
      })
      
      trendData.push({
        date: `${day}日`,
        consecutivePeriods: consecutiveCount,
        highRisk: highRiskCount,
        mediumRisk: mediumRiskCount,
        lowRisk: lowRiskCount
      })
    }
    
    return trendData
  }
  
  const employeeData = calculateConsecutiveWorkData()
  const trendData = calculateTrendData()
  
  return (
    <div className="space-y-6">
      {/* 連續上班堆疊長條圖 */}
      <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
        <h3 className="text-xl font-bold mb-6 text-orange-300 text-center">連續上班天數分析</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={employeeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey="name" stroke="#ffffff80" />
            <YAxis stroke="#ffffff80" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#ffffff'
              }}
              formatter={(value, name) => {
                const riskLabels = {
                  highRisk: '高 (≥6天)',
                  mediumRisk: '中 (4-5天)',
                  lowRisk: '低 (1-3天)'
                }
                return [value, riskLabels[name] || name]
              }}
            />
            <Legend />
            <Bar dataKey="highRisk" stackId="a" fill="#ef4444" name="highRisk" />
            <Bar dataKey="mediumRisk" stackId="a" fill="#f97316" name="mediumRisk" />
            <Bar dataKey="lowRisk" stackId="a" fill="#22c55e" name="lowRisk" />
          </BarChart>
        </ResponsiveContainer>
        
        {/* 等級說明 */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center justify-center p-2 bg-red-500/20 rounded-lg border border-red-400/30">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span className="text-red-300">高 (≥6天)</span>
          </div>
          <div className="flex items-center justify-center p-2 bg-orange-500/20 rounded-lg border border-orange-400/30">
            <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
            <span className="text-orange-300">中 (4-5天)</span>
          </div>
          <div className="flex items-center justify-center p-2 bg-green-500/20 rounded-lg border border-green-400/30">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-green-300">低 (1-3天)</span>
          </div>
        </div>
      </div>
      
      {/* 連續上班趨勢線 */}
      <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
        <h3 className="text-xl font-bold mb-6 text-blue-300 text-center">連續上班頻率趨勢</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey="date" stroke="#ffffff80" />
            <YAxis stroke="#ffffff80" domain={[0, 6]} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#ffffff'
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="consecutivePeriods" stroke="#8b5cf6" strokeWidth={3} name="連續期間數" />
            <Line type="monotone" dataKey="highRisk" stroke="#ef4444" strokeWidth={2} name="高期間" />
            <Line type="monotone" dataKey="mediumRisk" stroke="#f97316" strokeWidth={2} name="中期間" />
            <Line type="monotone" dataKey="lowRisk" stroke="#22c55e" strokeWidth={2} name="低期間" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// 班次轉換分析圖組件
function ShiftTransitionAnalysisChart({ schedule, names }) {
  const calculateShiftTransitionData = () => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const transitions = []
    const transitionCounts = {}
    
    // 計算所有員工的班次轉換
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated') return
      
      for (let day = 1; day < daysInMonth; day++) {
        const currentShift = schedule[employeeId]?.[day]
        const nextShift = schedule[employeeId]?.[day + 1]
        
        if (currentShift && nextShift) {
          const key = `${currentShift}→${nextShift}`
          transitionCounts[key] = (transitionCounts[key] || 0) + 1
          
          transitions.push({
            from: currentShift,
            to: nextShift,
            employee: names[employeeId] || employeeId,
            day: day
          })
        }
      }
    })
    
    // 轉換為桑基圖數據格式
    const sankeyData = Object.entries(transitionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10) // 只顯示前10個最常見的轉換
      .map(([transition, value]) => {
        const [from, to] = transition.split('→')
        return {
          transition: `${from}→${to}`,
          source: from,
          target: to,
          value: value
        }
      })
    
    return {
      transitions,
      transitionCounts,
      sankeyData
    }
  }
  
  const calculateFlowData = () => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const flowData = []
    
    // 分析班次安排的邏輯性
    for (let day = 1; day <= daysInMonth - 2; day++) {
      const dayTransitions = []
      
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        
        const day1 = schedule[employeeId]?.[day]
        const day2 = schedule[employeeId]?.[day + 1]
        const day3 = schedule[employeeId]?.[day + 2]
        
        if (day1 && day2 && day3) {
          dayTransitions.push({
            employee: names[employeeId] || employeeId,
            pattern: `${day1}→${day2}→${day3}`,
            logical: isLogicalTransition(day1, day2, day3)
          })
        }
      })
      
      if (dayTransitions.length > 0) {
        flowData.push({
          date: `${day}日`,
          totalTransitions: dayTransitions.length,
          logicalTransitions: dayTransitions.filter(t => t.logical).length,
          illogicalTransitions: dayTransitions.filter(t => !t.logical).length,
          patterns: dayTransitions.map(t => t.pattern)
        })
      }
    }
    
    return flowData
  }
  
  const isLogicalTransition = (shift1, shift2, shift3) => {
    // 定義合理的班次轉換邏輯
    const logicalPatterns = [
      '早→中→晚', '早→中→休', '早→晚→休',
      '中→晚→休', '中→早→休', '晚→休→早',
      '休→早→中', '休→早→晚', '休→中→晚',
      '早→休→中', '中→休→晚', '晚→休→中'
    ]
    
    const pattern = `${shift1}→${shift2}→${shift3}`
    return logicalPatterns.includes(pattern)
  }
  
  const { transitions, transitionCounts, sankeyData } = calculateShiftTransitionData()
  const flowData = calculateFlowData()
  
  const getShiftColor = (shift) => {
    switch (shift) {
      case '早': return '#ec4899'
      case '中': return '#06b6d4'
      case '晚': return '#3b82f6'
      case '休': return '#6b7280'
      case '特': return '#f97316'
      default: return '#9ca3af'
    }
  }
  
  return (
    <div className="space-y-6">
      {/* 班次轉換桑基圖 */}
      <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
        <h3 className="text-xl font-bold mb-6 text-purple-300 text-center">班次轉換關係圖</h3>
        
        {/* 簡化版桑基圖 - 使用長條圖表示轉換關係 */}
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={sankeyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey="transition" stroke="#ffffff80" />
            <YAxis stroke="#ffffff80" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#ffffff'
              }}
              formatter={(value, name, props) => [
                `${props.payload.transition}: ${value}次`,
                '轉換次數'
              ]}
            />
            <Bar dataKey="value" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
        
        {/* 班次轉換統計 */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(transitionCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8)
            .map(([transition, count]) => {
              const [from, to] = transition.split('→')
              return (
                <div key={transition} className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: getShiftColor(from) }}
                    >
                      {from}
                    </div>
                    <span className="text-gray-400">→</span>
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: getShiftColor(to) }}
                    >
                      {to}
                    </div>
                  </div>
                  <div className="text-purple-300 font-bold">{count}</div>
                </div>
              )
            })}
        </div>
      </div>
      
      {/* 班次安排邏輯性分析 */}
      <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
        <h3 className="text-xl font-bold mb-6 text-green-300 text-center">班次安排邏輯性分析</h3>
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={flowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey="date" stroke="#ffffff80" />
            <YAxis stroke="#ffffff80" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#ffffff'
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="logicalTransitions" stroke="#22c55e" strokeWidth={2} name="合理轉換" />
            <Line type="monotone" dataKey="illogicalTransitions" stroke="#ef4444" strokeWidth={2} name="不合理轉換" />
            <Line type="monotone" dataKey="totalTransitions" stroke="#8b5cf6" strokeWidth={3} name="總轉換數" />
          </LineChart>
        </ResponsiveContainer>
        
        {/* 邏輯性統計 */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-500/20 rounded-lg border border-green-400/30">
            <div className="text-2xl font-bold text-green-300">
              {flowData.reduce((sum, d) => sum + d.logicalTransitions, 0)}
            </div>
            <div className="text-sm text-green-200">合理轉換</div>
          </div>
          <div className="text-center p-4 bg-red-500/20 rounded-lg border border-red-400/30">
            <div className="text-2xl font-bold text-red-300">
              {flowData.reduce((sum, d) => sum + d.illogicalTransitions, 0)}
            </div>
            <div className="text-sm text-red-200">不合理轉換</div>
          </div>
          <div className="text-center p-4 bg-purple-500/20 rounded-lg border border-purple-400/30">
            <div className="text-2xl font-bold text-purple-300">
              {flowData.length > 0 ? 
                Math.round((flowData.reduce((sum, d) => sum + d.logicalTransitions, 0) / 
                flowData.reduce((sum, d) => sum + d.totalTransitions, 0)) * 100) : 0}%
            </div>
            <div className="text-sm text-purple-200">邏輯性比例</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 車費試算組件
function FareCalculator({ schedule, names, pickupLocations, selectedEmployee, calculateFare }) {
  const [isLoading, setIsLoading] = useState(false)
  const [fareData, setFareData] = useState(null)

  useEffect(() => {
    if (selectedEmployee) {
      setIsLoading(true)
      // 模擬載入時間
      setTimeout(() => {
        const data = calculateFare(selectedEmployee)
        setFareData(data)
        setIsLoading(false)
      }, 500)
    } else {
      setFareData(null)
    }
  }, [selectedEmployee, calculateFare])

  if (!selectedEmployee) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-4">請選擇一位同事來計算車費</div>
        <div className="text-gray-500 text-sm">選擇同事後，將顯示該同事的車費分析</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <div className="text-gray-400 text-lg">正在計算車費...</div>
      </div>
    )
  }
  
  if (!fareData) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-4">無法計算車費</div>
        <div className="text-gray-500 text-sm">該同事可能不搭車或沒有班表資料</div>
      </div>
    )
  }

  // 找出最優惠的方案
  const allOptions = [
    { name: '原價', cost: fareData.originalTotal, type: 'original' },
    { name: '桃園市民卡 7折', cost: fareData.citizenCardTotal, type: 'citizen' },
    ...fareData.monthlyPassOptions.map(option => ({
      name: `${option.days}天定期票`,
      cost: option.averagePricePerMonth, // 使用平均每月價格作為主要比較價格
      type: 'monthly',
      days: option.days,
      savings: option.savings,
      averagePricePerMonth: option.averagePricePerMonth,
      price: option.price, // 單張票券原價
      originalPrice: option.totalCost // 票券原價
    })),
    { name: 'TPass 799', cost: fareData.tpassTotal, type: 'tpass' }
  ]

  // 智能推薦算法
  const getRecommendations = (fareData, allOptions) => {
    const recommendations = {
      bestValue: null,      // 最划算
      mostFlexible: null,   // 最靈活
      bestForFrequent: null, // 適合常搭
      bestForOccasional: null // 適合偶爾搭
    }
    
    // 最划算方案
    recommendations.bestValue = allOptions.reduce((min, option) => 
      option.cost < min.cost ? option : min
    )
    
    // 最靈活方案（無使用限制）
    recommendations.mostFlexible = allOptions.find(option => 
      option.type === 'original' || option.type === 'citizen'
    ) || recommendations.bestValue
    
    // 根據搭乘次數推薦
    if (fareData.totalTrips > 20) {
      // 常搭推薦：專門推薦TPass（無限制搭乘）
      recommendations.bestForFrequent = allOptions.find(option => 
        option.type === 'tpass'
      ) || recommendations.bestValue
    } else if (fareData.totalTrips < 10) {
      recommendations.bestForOccasional = allOptions.find(option => 
        option.type === 'original' || option.type === 'citizen'
      ) || recommendations.bestValue
    } else {
      recommendations.bestForFrequent = recommendations.bestValue
      recommendations.bestForOccasional = recommendations.bestValue
    }
    
    return recommendations
  }

  const recommendations = getRecommendations(fareData, allOptions)
  const bestOption = recommendations.bestValue

  return (
    <div className="space-y-6">
      {/* 基本資訊 */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-6 border border-blue-400/30">
        <h3 className="text-xl font-bold text-blue-300 mb-4">車費試算結果</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{fareData.employeeName}</div>
            <div className="text-sm text-gray-400">同事</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-300">{fareData.location}</div>
            <div className="text-sm text-gray-400">上車地點</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-300">{fareData.totalTrips} 次</div>
            <div className="text-sm text-gray-400">總搭乘次數</div>
          </div>
        </div>
      </div>

      {/* 車費方案比較 */}
      <div className="bg-surface/40 rounded-xl p-6 border border-white/20">
        <h4 className="text-lg font-semibold text-purple-300 mb-4">車費方案比較</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {allOptions.map((option, index) => (
            <div 
              key={index}
              className={`p-3 sm:p-4 rounded-lg border transition-all duration-300 relative transform hover:scale-105 hover:shadow-lg animate-fade-in-up ${
                option.cost === bestOption.cost 
                  ? 'bg-green-500/20 border-green-400/50 text-green-300 ring-2 ring-green-400/30' 
                  : 'bg-surface/20 border-white/20 text-white hover:bg-surface/30'
              }`}
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'both'
              }}
            >
              {/* 推薦標籤系統 */}
              <div className="absolute -top-2 -right-2 flex flex-col gap-1">
                {option.cost === bestOption.cost && (
                  <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg animate-pulse">
                    🏆 最划算
                  </div>
                )}
                {option.cost === recommendations.mostFlexible?.cost && option.type !== 'original' && (
                  <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                    🎯 最靈活
                  </div>
                )}
                {option.cost === recommendations.bestForFrequent?.cost && fareData.totalTrips > 20 && (
                  <div className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                    ⚡ 常搭推薦
                  </div>
                )}
                {option.cost === recommendations.bestForOccasional?.cost && fareData.totalTrips < 10 && (
                  <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                    💡 偶爾搭
                  </div>
                )}
              </div>
              
              {/* 方案圖示 */}
              <div className="flex items-center gap-2 mb-3">
                {option.type === 'original' && (
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                )}
                {option.type === 'citizen' && (
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                )}
                {option.type === 'monthly' && (
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {option.type === 'tpass' && (
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                <span className="font-semibold text-sm">{option.name}</span>
              </div>
              
              <div className="text-xl sm:text-2xl font-bold mb-2 transition-all duration-300 animate-price-change">${option.cost}</div>
              

              
              {option.type === 'monthly' && (
                <div className="text-xs text-gray-400 mb-1">
                  <span className="text-xs text-gray-500">票券原價 ${option.originalPrice}</span>
                </div>
              )}
              
              {option.type === 'tpass' && (
                <div className="text-xs text-gray-400">
                  A22-A7 坐到哭
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 車費分析儀表板 */}
      <div className="space-y-6">
        {/* 統計摘要 */}
        <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl p-6 border border-indigo-400/30">
          <h4 className="text-xl font-bold text-indigo-300 mb-6">
            車費分析儀表板
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface/30 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">${Math.min(...allOptions.map(o => o.cost))}</div>
              <div className="text-sm text-gray-400">最低費用</div>
            </div>
            <div className="bg-surface/30 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-400">${Math.max(...allOptions.map(o => o.cost))}</div>
              <div className="text-sm text-gray-400">最高費用</div>
            </div>
            <div className="bg-surface/30 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-400">${fareData.originalTotal - Math.min(...allOptions.map(o => o.cost))}</div>
              <div className="text-sm text-gray-400">最大節省</div>
            </div>
            <div className="bg-surface/30 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">{allOptions.length}</div>
              <div className="text-sm text-gray-400">方案數量</div>
            </div>
          </div>
        </div>



        {/* 趨勢分析 */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 rounded-xl p-6 border border-emerald-400/20 shadow-lg">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h5 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
              搭乘次數 vs 費用效益分析
            </h5>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-emerald-400"></div>
              <span className="hidden sm:inline">即時分析</span>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
            <LineChart data={Array.from({length: 40}, (_, i) => {
              const trips = i + 1
              const originalCost = trips * fareData.originalTotal / fareData.totalTrips
              const citizenCost = Math.ceil(originalCost * 0.7)
              const tpassCost = 799 // TPass固定799元
              
              // 獲取120天定期票的實際平均每月費用
              const monthly120Pass = fareData.monthlyPassOptions.find(option => option.days === 120)
              const monthly120Cost = monthly120Pass ? monthly120Pass.averagePricePerMonth : 486
              
              return {
                trips,
                原價: Math.round(originalCost),
                市民卡: citizenCost,
                TPass: tpassCost,
                '120天票': Math.round(monthly120Cost)
              }
            })}>
              <defs>
                <linearGradient id="originalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="citizenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="tpassGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="trips" 
                stroke="#9ca3af" 
                fontSize={10}
                className="sm:text-xs"
                tickLine={false}
                axisLine={{ stroke: '#4b5563', strokeWidth: 1 }}
                interval="preserveStartEnd"
                label={{ 
                  value: '搭乘次數', 
                  position: 'insideBottom', 
                  offset: -5, 
                  style: { 
                    textAnchor: 'middle', 
                    fill: '#9ca3af',
                    fontSize: '11px',
                    fontWeight: '500'
                  } 
                }}
              />
              <YAxis 
                stroke="#9ca3af" 
                fontSize={10}
                className="sm:text-xs"
                tickLine={false}
                axisLine={{ stroke: '#4b5563', strokeWidth: 1 }}
                tickFormatter={(value) => `$${value}`}
                width={50}
                label={{ 
                  value: '費用', 
                  angle: -90, 
                  position: 'insideLeft', 
                  style: { 
                    textAnchor: 'middle', 
                    fill: '#9ca3af',
                    fontSize: '11px',
                    fontWeight: '500'
                  } 
                }}
              />
              <Tooltip 
                formatter={(value, name) => [`$${value}`, name]}
                labelFormatter={(trips) => `搭乘 ${trips} 次`}
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '12px',
                  color: '#fff',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                  padding: '12px'
                }}
                cursor={{ stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Line 
                type="monotone" 
                dataKey="原價" 
                stroke="#ef4444" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4, stroke: '#ef4444', strokeWidth: 1, fill: '#fff' }}
              />
              <Line 
                type="monotone" 
                dataKey="市民卡" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4, stroke: '#3b82f6', strokeWidth: 1, fill: '#fff' }}
              />
              <Line 
                type="monotone" 
                dataKey="TPass" 
                stroke="#f59e0b" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4, stroke: '#f59e0b', strokeWidth: 1, fill: '#fff' }}
              />
              <Line 
                type="monotone" 
                dataKey="120天票" 
                stroke="#10b981" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 1, fill: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
          
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-surface/20 rounded-lg border border-emerald-400/10">
            <div className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              此圖顯示不同搭乘次數下各方案的費用變化，幫助您了解在什麼情況下哪種方案最划算。
              <span className="text-emerald-300 font-medium">交叉點</span>表示方案間的轉換時機。
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

// 每日搭班視圖組件
function DailyPartnerView({ schedule, names, displayDates, selectedEmployee }) {
  if (!selectedEmployee) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-4">請選擇一位同事來查看搭班情況</div>
        <div className="text-gray-500 text-sm">在左側選擇同事後，將顯示該同事每天的搭班同事</div>
      </div>
    )
  }

  // 計算搭班邏輯
  const getPartnersForDay = (day) => {
    const selectedShift = schedule[selectedEmployee]?.[day]
    if (!selectedShift || selectedShift === '休') return []
    
    const partners = []
    
    Object.keys(schedule).forEach(employeeId => {
      if (employeeId === '_lastUpdated' || employeeId === selectedEmployee) return
      
      const partnerShift = schedule[employeeId]?.[day]
      if (!partnerShift || partnerShift === '休') return
      
      // 同班搭班
      if (partnerShift === selectedShift) {
        partners.push({
          id: employeeId,
          name: names[employeeId] || employeeId,
          shift: partnerShift,
          type: '同班'
        })
      }
      // 跨班搭班
      else if (
        (selectedShift === '早' && partnerShift === '中') ||
        (selectedShift === '中' && partnerShift === '晚') ||
        (selectedShift === '中' && partnerShift === '早') ||
        (selectedShift === '晚' && partnerShift === '中')
      ) {
        partners.push({
          id: employeeId,
          name: names[employeeId] || employeeId,
          shift: partnerShift,
          type: '跨班'
        })
      }
    })
    
    return partners
  }

  // 取得班次顏色
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

  // 取得搭班類型顏色
  const getPartnerTypeColor = (type) => {
    switch (type) {
      case '同班': return 'bg-green-500/20 border-green-400/30 text-green-300'
      case '跨班': return 'bg-purple-500/20 border-purple-400/30 text-purple-300'
      default: return 'bg-gray-500/20 border-gray-400/30 text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* 標題和選中同事資訊 */}
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-4 sm:p-6 border border-purple-400/30">
        <h3 className="text-lg sm:text-xl font-bold text-purple-300 mb-2">每日搭班視圖</h3>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-white font-semibold text-sm sm:text-base">
            同事：<span className="text-purple-300">{names[selectedEmployee] || selectedEmployee}</span>
          </div>
        </div>
      </div>

      {/* 日曆式搭班顯示 */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
        {displayDates.map((date) => {
          const isToday = date === new Date().getDate()
          const selectedShift = schedule[selectedEmployee]?.[date]
          const partners = getPartnersForDay(date)
          
          return (
            <div 
              key={date} 
              className={`bg-surface/60 rounded-xl p-2 sm:p-3 md:p-4 border transition-all duration-200 ${
                isToday 
                  ? 'border-primary/50 bg-primary/10 ring-2 ring-primary/30' 
                  : 'border-white/20 hover:border-white/30'
              }`}
            >
              {/* 日期標題 */}
              <div className="text-center mb-2 sm:mb-3">
                <div className={`text-sm sm:text-base md:text-lg font-bold ${isToday ? 'text-primary' : 'text-white'}`}>
                  {date}
                </div>
                <div className="text-xs text-gray-400 hidden sm:block">
                  {['日', '一', '二', '三', '四', '五', '六'][new Date(new Date().getFullYear(), new Date().getMonth(), date).getDay()]}
                </div>
              </div>

              {/* 選中同事的班次 */}
              <div className="mb-2 sm:mb-3">
                <div className="text-xs text-gray-400 mb-1">我的班次</div>
                {selectedShift ? (
                  <div className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-center text-xs sm:text-sm font-bold ${getShiftColor(selectedShift)}`}>
                    {selectedShift}
                  </div>
                ) : (
                  <div className="px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-center text-xs sm:text-sm text-gray-400 bg-surface/20 border border-white/10">
                    無班次
                  </div>
                )}
              </div>

              {/* 搭班同事列表 */}
              <div>
                <div className="text-xs text-gray-400 mb-1 sm:mb-2">搭班同事 ({partners.length})</div>
                {partners.length > 0 ? (
                  <div className="space-y-1 sm:space-y-2">
                    {partners.map((partner) => (
                      <div 
                        key={partner.id}
                        className={`p-1 sm:p-2 rounded-lg border text-xs ${getPartnerTypeColor(partner.type)}`}
                      >
                        <div className="font-medium mb-0.5 sm:mb-1 text-xs sm:text-xs truncate">{partner.name}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs opacity-80 hidden sm:inline">{partner.type}</span>
                          <div className={`px-1 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-bold ${getShiftColor(partner.shift)}`}>
                            {partner.shift}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 text-center py-1 sm:py-2">
                    {selectedShift && selectedShift !== '休' ? '無搭班同事' : '休息日'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>


    </div>
  )
}

export default ScheduleManager 