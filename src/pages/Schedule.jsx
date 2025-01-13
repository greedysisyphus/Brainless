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
  XMarkIcon,
  UsersIcon,
  SunIcon,  // 早班
  MoonIcon,  // 晚班
  FireIcon,  // 最長連續
  TrophyIcon,  // 獎盃
  ArrowTrendingUpIcon  // 趨勢
} from '@heroicons/react/24/outline'
import ExcelToJsonConverter from '../components/ExcelToJsonConverter'

// 添加名字映射
const NAME_MAPPINGS = {
  'A45-余盛煌 Noah 店長': '小余',
  'A51-蕭弘業 Eric 副店長': '紅葉',
  'A60-羅稚婕 Ashely 咖啡師': 'Ashley',
  'A88-沈恩廷 Lydia 咖啡師': '恩廷',
  'A89-林渭麟 Jovi 咖啡師': 'Jovi',
  'A93-陳世芬 Nina 咖啡師': 'Nina',
  'A102-張敏涵 Roxie 咖啡師': 'Roxie',
  'A101-劉芷溶 Nan 咖啡師': 'Nan'
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

// 添加班次類型常量
const SHIFT_TYPES = {
  MORNING: '早班',
  EVENING: '晚班',
  MIDDLE: '中班',
  HSR: '高鐵',
  OFF: '休假',
  SPECIAL: '特休'
}

// 添加配搭計算函數
function calculatePairings(scheduleData) {
  const pairings = {}
  const pairingDetails = {} // 新增：記錄配搭的具體日期

  // 初始化
  Object.values(NAME_MAPPINGS).forEach(name1 => {
    pairings[name1] = {}
    pairingDetails[name1] = {} // 新增：初始化詳情記錄
    Object.values(NAME_MAPPINGS).forEach(name2 => {
      if (name1 !== name2) {
        pairings[name1][name2] = 0
        pairingDetails[name1][name2] = [] // 新增：初始化日期陣列
      }
    })
  })

  // 獲取每天的班次
  const dates = scheduleData[1].slice(1)
  dates.forEach((date, dateIndex) => {
    const dayShifts = {}
    
    // 收集當天每個人的班次
    scheduleData.slice(2).forEach(row => {
      const name = NAME_MAPPINGS[row[0]]
      const shift = row[dateIndex + 1]
      
      let shiftType = null
      if (shift.includes('4:30-13:00') || shift.includes('4：30-13：00')) {
        shiftType = SHIFT_TYPES.MORNING
      } else if (shift.includes('13:00-21:30') || shift.includes('13：00-21：30')) {
        shiftType = SHIFT_TYPES.EVENING
      } else if (shift.includes('7:30-16:00') || shift.includes('7：30-16：00')) {
        shiftType = SHIFT_TYPES.MIDDLE
      }
      
      if (shiftType) {
        dayShifts[name] = shiftType
      }
    })

    // 計算配搭次數
    const staffNames = Object.keys(dayShifts)
    for (let i = 0; i < staffNames.length; i++) {
      const name1 = staffNames[i]
      const shift1 = dayShifts[name1]
      
      for (let j = i + 1; j < staffNames.length; j++) {
        const name2 = staffNames[j]
        const shift2 = dayShifts[name2]

        let shouldCount = false

        // 早班配早班
        if (shift1 === SHIFT_TYPES.MORNING && shift2 === SHIFT_TYPES.MORNING) {
          shouldCount = true
        }
        // 晚班配晚班
        else if (shift1 === SHIFT_TYPES.EVENING && shift2 === SHIFT_TYPES.EVENING) {
          shouldCount = true
        }
        // 中班配早班或晚班
        else if ((shift1 === SHIFT_TYPES.MIDDLE && 
                (shift2 === SHIFT_TYPES.MORNING || shift2 === SHIFT_TYPES.EVENING)) ||
                (shift2 === SHIFT_TYPES.MIDDLE && 
                (shift1 === SHIFT_TYPES.MORNING || shift1 === SHIFT_TYPES.EVENING))) {
          shouldCount = true
        }

        if (shouldCount) {
          pairings[name1][name2]++
          pairings[name2][name1]++
          // 新增：記錄配搭日期和班次
          pairingDetails[name1][name2].push({
            date: formatDate(date),
            shifts: `${name1}(${shift1}) - ${name2}(${shift2})`
          })
          pairingDetails[name2][name1].push({
            date: formatDate(date),
            shifts: `${name2}(${shift2}) - ${name1}(${shift1})`
          })
        }
      }
    }
  })

  return { pairings, pairingDetails }
}

// 修改 PairingsStats 組件
function PairingsStats({ pairings: { pairings, pairingDetails }, onClose }) {
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [selectedPair, setSelectedPair] = useState(null)
  const maxPairings = Math.max(...Object.values(pairings).flatMap(p => Object.values(p)))

  const getColorClass = (count) => {
    if (count === 0) return 'bg-surface/30';
    const intensity = Math.ceil((count / maxPairings) * 5);
    switch (intensity) {
      case 1: return 'bg-primary/10';
      case 2: return 'bg-primary/20';
      case 3: return 'bg-primary/30';
      case 4: return 'bg-primary/40';  // 修正這裡，從 400 改為 40
      case 5: return 'bg-primary/50';
      default: return 'bg-surface/30';
    }
  };

  // 獲取指定同事的配搭統計
  const getStaffPairings = (staffName) => {
    const pairs = pairings[staffName] || {}
    return Object.entries(pairs)
      .filter(([name, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))
  }

  const getTotalPairings = (staffName) => {
    if (!staffName) return null;
    return Object.values(pairings[staffName] || {}).reduce((sum, count) => sum + count, 0);
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedStaff(null);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div>
      {/* Toggle Buttons */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-secondary mb-3">
          選擇同事
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStaff(null)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium
              transition-all duration-200
              border-2 border-white/10
              ${!selectedStaff ? 
                'bg-gradient-to-r from-primary/20 to-secondary/20 border-primary' : 
                'hover:border-white/20'
              }
            `}
          >
            全部
          </button>
          {Object.values(NAME_MAPPINGS).map(name => (
            <button
              key={name}
              onClick={() => setSelectedStaff(name)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium
                transition-all duration-200 
                border-2
                ${selectedStaff === name
                  ? `bg-gradient-to-r ${STAFF_COLORS[name] || 'from-primary/20 to-secondary/20'} 
                     border-l-2 shadow-lg shadow-black/20 scale-105`
                  : 'border-white/10 hover:border-white/20 hover:scale-105'
                }
              `}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {selectedStaff ? (
        <div className="space-y-3">
          {getStaffPairings(selectedStaff).map(({ name, count }) => (
            <div 
              key={name}
              onClick={() => setSelectedPair(selectedPair === name ? null : name)}
              className={`
                p-4 rounded-lg
                ${getColorClass(count)}
                transform transition-all duration-200
                hover:scale-[1.02] hover:shadow-lg
                cursor-pointer
              `}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{name}</span>
                <div className="flex items-center gap-2">
                  <span className="bg-black/20 px-3 py-1 rounded-full text-sm">
                    配搭 {count} 次
                  </span>
                  <div className="w-16 h-2 rounded-full bg-black/20 overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${(count / maxPairings) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {/* 配搭詳情 */}
              {selectedPair === name && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  {pairingDetails[selectedStaff][name].map((detail, index) => (
                    <div key={index} className="text-sm flex justify-between items-center">
                      <span className="text-text-secondary">{detail.date}</span>
                      <span>{detail.shifts}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <div className="min-w-[640px] p-3 sm:p-0">
            <table className="w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="p-1.5 sm:p-2 bg-surface/50 rounded-lg w-16 sm:w-20 text-center text-xs sm:text-sm">
                    同事
                  </th>
                  {Object.values(NAME_MAPPINGS).map(name => (
                    <th key={name} className="p-1.5 sm:p-2 bg-surface/50 rounded-lg w-16 sm:w-20 text-center text-xs sm:text-sm">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(pairings).map(([name1, pairs]) => (
                  <tr key={name1}>
                    <td className="p-1.5 sm:p-2 font-medium bg-surface/30 rounded-lg text-center text-xs sm:text-sm">
                      {name1}
                    </td>
                    {Object.values(NAME_MAPPINGS).map(name2 => {
                      const count = name1 === name2 ? null : pairs[name2] || 0
                      return (
                        <td 
                          key={name2} 
                          className={`
                            p-1.5 sm:p-2 text-center rounded-lg text-xs sm:text-sm
                            ${count === null ? 'bg-surface/10' : getColorClass(count)}
                          `}
                        >
                          {count === null ? '-' : count}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 圖例 */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <div className="text-text-secondary">配搭頻率：</div>
        {[0, 1, 2, 3, 4, 5].map(level => (
          <div key={level} className="flex items-center gap-1 sm:gap-2">
            <div className={`
              w-4 h-4 sm:w-6 sm:h-6 rounded 
              ${level === 0 ? 'bg-surface/30' : `bg-primary/${level * 10}`}
            `} />
            <span className="text-text-secondary">
              {level === 0 ? '無' : `${Math.floor((level / 5) * maxPairings)}次`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// 添加票價常量
const TICKET_PRICES = {
  A19_A13: {
    single: 40,
    monthly: 735,
    quarterly: 2079,
    fourMonths: 2268,
  },
  A21_A13: {
    single: 65,
    monthly: 1260,
    quarterly: 3564,
    fourMonths: 3888,
  }
}

// 新增 StaffTicketCard 子組件
function StaffTicketCard({ staffCost }) {
  const minCost = Math.min(
    staffCost.monthlyExpenses.citizen,
    staffCost.monthlyExpenses.tpass,
    staffCost.monthlyExpenses.fourMonths
  );

  const ticketOptions = [
    {
      name: '市民卡 (7折)',
      cost: staffCost.monthlyExpenses.citizen,
      color: 'amber'
    },
    {
      name: 'TPass 799',
      cost: staffCost.monthlyExpenses.tpass,
      color: 'blue'
    },
    {
      name: '定期票 (120天)',
      cost: staffCost.monthlyExpenses.fourMonths,
      color: 'emerald'
    }
  ];

  return (
    <div className="bg-surface/30 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* 標題區 */}
      <div className="bg-white/5 px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`
              w-8 h-8 rounded-full 
              flex items-center justify-center
              bg-gradient-to-br ${STAFF_COLORS[staffCost.name] || 'from-primary/20 to-secondary/20'}
            `}>
              {staffCost.name[0]}
            </div>
            <div className="font-medium text-lg">{staffCost.name}</div>
          </div>
          <div className="text-sm text-text-secondary px-2 py-1 bg-white/5 rounded-full">
            {staffCost.rides.total} 次/120天
          </div>
        </div>
      </div>

      {/* 費用區 */}
      <div className="p-4 space-y-3">
        {/* 票價選項 */}
        {ticketOptions.map(option => (
          <div
            key={option.name}
            className={`
              flex justify-between items-center p-2 rounded-lg
              ${option.cost === minCost ? 
                `bg-${option.color}-500/10 text-${option.color}-100` : 
                'bg-white/5'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full bg-${option.color}-400`} />
              <span className="text-sm">{option.name}</span>
            </div>
            <span className={`font-medium ${
              option.cost === minCost ? `text-${option.color}-400` : ''
            }`}>
              ${option.cost}/月
            </span>
          </div>
        ))}

        {/* 最佳方案 - 更新樣式 */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                <div>
                  <div className="text-sm text-text-secondary">最佳方案</div>
                  <div className="text-xs text-primary/80 mt-0.5">
                    每月可省 ${Math.max(
                      staffCost.monthlyExpenses.citizen,
                      staffCost.monthlyExpenses.tpass,
                      staffCost.monthlyExpenses.fourMonths
                    ) - minCost} 元
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  ${minCost}
                </div>
                <div className="text-xs text-text-secondary">每月</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 修改 TicketComparison 組件
function TicketComparison({ scheduleData }) {
  const [station, setStation] = useState('A19')
  const [selectedStaff, setSelectedStaff] = useState(null)
  
  // 計算特定同事的乘車費用
  const calculateStaffRideCosts = (staffName) => {
    if (!scheduleData || scheduleData.length < 2) return null

    // 找到該同事的班表行
    const staffRow = scheduleData.slice(2).find(row => 
      NAME_MAPPINGS[row[0]] === staffName
    )
    if (!staffRow) return null

    const totalDays = scheduleData[1].slice(1).length
    const projectedDays = 120 // 推算120天
    const projectionRatio = projectedDays / totalDays

    let singleRides = 0
    let doubleRides = 0

    // 統計該同事的班次
    staffRow.slice(1).forEach(shift => {
      if (shift.includes('4:30-13:00') || shift.includes('4：30-13：00') ||
          shift.includes('6:00-14:30') || shift.includes('6：00-14：30')) {
        singleRides++ // 早班和高鐵班算單程
      } else if (shift.includes('7:30-16:00') || shift.includes('7：30-16：00') ||
                shift.includes('13:00-21:30') || shift.includes('13：00-21：30')) {
        doubleRides++ // 中班和晚班算雙程
      }
    })

    // 推算120天的搭乘次數
    const projectedSingleRides = Math.round(singleRides * projectionRatio)
    const projectedDoubleRides = Math.round(doubleRides * projectionRatio)
    const totalRides = projectedSingleRides + (projectedDoubleRides * 2)

    const prices = TICKET_PRICES[`${station}_A13`]
    
    return {
      name: staffName,
      period: projectedDays,
      rides: {
        single: projectedSingleRides,
        double: projectedDoubleRides,
        total: totalRides
      },
      costs: {
        regular: totalRides * prices.single,
        citizen: Math.round(totalRides * prices.single * 0.7),
        tpass: 799 * 4,
        monthly: prices.monthly * 4,
        quarterly: Math.ceil(prices.quarterly * (projectedDays / 90)),
        fourMonths: prices.fourMonths
      }
    }
  }

  // 計算所有同事的費用
  const allStaffCosts = Object.values(NAME_MAPPINGS).map(name => 
    calculateStaffRideCosts(name)
  ).filter(Boolean)

  return (
    <div className="space-y-6">
      {/* 車站選擇 */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-6">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">
            選擇同事
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedStaff(null)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium
                transition-all duration-200
                border-2 border-white/10
                ${!selectedStaff ? 
                  'bg-gradient-to-r from-primary/20 to-secondary/20 border-primary' : 
                  'hover:border-white/20'
                }
              `}
            >
              全部
            </button>
            {Object.values(NAME_MAPPINGS).map(name => (
              <button
                key={name}
                onClick={() => setSelectedStaff(name)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium
                  transition-all duration-200 
                  border-2
                  ${selectedStaff === name ?
                    `bg-gradient-to-r ${STAFF_COLORS[name] || 'from-primary/20 to-secondary/20'} border-l-2` :
                    'border-white/10 hover:border-white/20'
                  }
                `}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">
            選擇起點站
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setStation('A19')}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-200
                ${station === 'A19' 
                  ? 'bg-primary text-white' 
                  : 'bg-surface/50 text-text-secondary hover:bg-surface/70'
                }
              `}
            >
              A19 體育園區站
            </button>
            <button
              onClick={() => setStation('A21')}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-200
                ${station === 'A21' 
                  ? 'bg-primary text-white' 
                  : 'bg-surface/50 text-text-secondary hover:bg-surface/70'
                }
              `}
            >
              A21 環北站
            </button>
          </div>
        </div>
      </div>

      {/* 費用顯示 */}
      {selectedStaff ? (
        <StaffCostDetail 
          costs={allStaffCosts.find(c => c.name === selectedStaff)}
          station={station}
        />
      ) : (
        // 顯示所有同事的概覽
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allStaffCosts
            .map(staffCost => ({
              ...staffCost,
              monthlyExpenses: {
                citizen: Math.round(staffCost.costs.citizen / 4),
                tpass: 799,
                fourMonths: Math.round(staffCost.costs.fourMonths / 4)
              }
            }))
            .sort((a, b) => {
              const aMinCost = Math.min(
                a.monthlyExpenses.citizen,
                a.monthlyExpenses.tpass,
                a.monthlyExpenses.fourMonths
              );
              const bMinCost = Math.min(
                b.monthlyExpenses.citizen,
                b.monthlyExpenses.tpass,
                b.monthlyExpenses.fourMonths
              );
              return bMinCost - aMinCost;
            })
            .map(staffCost => (
              <StaffTicketCard key={staffCost.name} staffCost={staffCost} />
            ))}
        </div>
      )}
    </div>
  )
}

// 添加單個同事的詳細資訊組件
function StaffCostDetail({ costs, station }) {
  if (!costs) return null;

  const currentStation = station || 'A19';
  const prices = TICKET_PRICES[`${currentStation}_A13`];

  // 計算每月花費並排序
  const monthlyExpenses = [
    {
      name: '原價',
      total: costs.costs.regular,
      monthly: Math.round(costs.costs.regular / 4),
      description: '無折扣',
      color: 'from-neutral-500/10 to-neutral-600/5'
    },
    {
      name: '桃園市民卡',
      total: costs.costs.citizen,
      monthly: Math.round(costs.costs.citizen / 4),
      description: '7折優惠',
      color: 'from-amber-500/10 to-amber-600/5'
    },
    {
      name: 'TPass 799',
      total: costs.costs.tpass,
      monthly: 799,
      description: '不限搭乘次數',
      color: 'from-sky-500/10 to-sky-600/5'
    },
    {
      name: '定期票 30天',
      total: costs.costs.monthly,
      monthly: prices.monthly,
      description: '每月購買一次',
      color: 'from-emerald-500/10 to-emerald-600/5'
    },
    {
      name: '定期票 120天',
      total: costs.costs.fourMonths,
      monthly: Math.round(costs.costs.fourMonths / 4),
      description: '一次購買四個月',
      color: 'from-violet-500/10 to-violet-600/5'
    }
  ].sort((a, b) => a.monthly - b.monthly);

  const lowestCost = monthlyExpenses[0].monthly;

  return (
    <>
      {/* 搭乘統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface/30 rounded-lg p-4">
          <div className="text-sm text-text-secondary mb-1">預估期間</div>
          <div className="text-xl font-bold">{costs.period} 天</div>
        </div>
        <div className="bg-surface/30 rounded-lg p-4">
          <div className="text-sm text-text-secondary mb-1">總搭乘次數</div>
          <div className="text-xl font-bold">{costs.rides.total} 次</div>
          <div className="text-sm text-text-secondary mt-1">
            單程 {costs.rides.single} 次 · 雙程 {costs.rides.double} 次
          </div>
        </div>
        <div className="bg-surface/30 rounded-lg p-4">
          <div className="text-sm text-text-secondary mb-1">每月平均</div>
          <div className="text-xl font-bold">
            {Math.round(costs.rides.total / 4)} 次
          </div>
        </div>
      </div>

      {/* 票價比較 */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">票價方案比較</h3>
          <div className="text-sm text-text-secondary">
            按每月費用排序
          </div>
        </div>
        <div className="space-y-3">
          {monthlyExpenses.map((expense, index) => (
            <div 
              key={expense.name}
              className={`
                relative overflow-hidden
                rounded-lg transition-all duration-200
                ${index === 0 ? 'ring-2 ring-primary/30' : ''}
                hover:shadow-lg hover:scale-[1.01]
                bg-surface/20 backdrop-blur-sm
              `}
            >
              <div className={`
                absolute inset-0 bg-gradient-to-br ${expense.color}
                ${index === 0 ? 'opacity-100' : 'opacity-50'}
              `} />
              <div className="relative p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {expense.name}
                      {index === 0 && (
                        <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                          最佳方案
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-text-secondary mt-0.5">
                      {expense.description}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      ${expense.monthly}
                      <span className="text-sm text-text-secondary ml-1">/月</span>
                    </div>
                    <div className="text-sm text-text-secondary">
                      總計 ${expense.total}
                    </div>
                  </div>
                </div>
                {index === 0 && (
                  <div className="text-xs text-text-secondary mt-3 pt-3 border-t border-white/10">
                    比次低方案每月可省 ${monthlyExpenses[1].monthly - lowestCost} 元
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// 修改 ScheduleStats 組件
function ScheduleStats({ scheduleData, employees }) {
  const [selectedStaff, setSelectedStaff] = useState(null);

  // 計算個人班次統計
  const calculatePersonalStats = (employeeData) => {
    // 確保 employeeData 存在
    if (!employeeData || !Array.isArray(employeeData)) {
      return {
        morning: 0,
        evening: 0,
        middle: 0,
        hsr: 0,
        holidays: 0,
        total: 0,
        consecutiveWork: { max: 0, average: 0 },
        weekends: 0
      };
    }

    const shifts = employeeData;
    return {
      // 基本班次統計
      morning: shifts.filter(cell => 
        cell.includes('4:30-13:00') || 
        cell.includes('4：30-13：00')
      ).length,
      evening: shifts.filter(cell => 
        cell.includes('13:00-21:30') || 
        cell.includes('13：00-21：30')
      ).length,
      middle: shifts.filter(cell => 
        cell.includes('7:30-16:00') || 
        cell.includes('7：30-16：00')
      ).length,
      hsr: shifts.filter(cell => 
        cell.includes('6:00-14:30') || 
        cell.includes('6：00-14：30')
      ).length,
      
      // 國定假日統計
      holidays: shifts.filter(cell => cell.includes('國')).length,
      
      // 計算總班次
      total: shifts.filter(cell => cell.trim() !== '').length,
      
      // 計算連續工作天數
      consecutiveWork: calculateConsecutiveWork(shifts),
      
      // 週末班次
      weekends: calculateWeekendShifts(shifts)
    }
  }

  // 修改計算連續工作天數的函數
  const calculateConsecutiveWork = (shifts) => {
    let current = 0;
    let max = 0;
    let sequences = [];

    // 處理最後一個序列
    const processLastSequence = () => {
      if (current > 0) {
        sequences.push(current);
        max = Math.max(max, current);
      }
    };

    shifts.forEach(shift => {
      // 如果是工作日（不是空白且不是月休）
      if (shift.trim() !== '' && !shift.includes('月休')) {
        current++;
      } else {
        processLastSequence();
        current = 0;
      }
    });

    // 確保處理最後一個序列
    processLastSequence();

    return {
      max,
      average: sequences.length > 0 
        ? Math.round(sequences.reduce((a, b) => a + b, 0) / sequences.length * 10) / 10
        : 0,
      sequences  // 可選：保存所有連續工作序列，用於除錯
    };
  };

  // 計算週末班次
  const calculateWeekendShifts = (shifts) => {
    // 假設第一天的星期已知，可以從這裡計算每個班次是否在週末
    return shifts.filter((shift, index) => {
      const dayOfWeek = (index % 7);
      return (dayOfWeek === 0 || dayOfWeek === 6) && shift.trim() !== '';
    }).length;
  }

  // 計算排名數據
  const getRankings = () => {
    const stats = employees.map(employee => ({
      name: employee.name,
      ...calculatePersonalStats(scheduleData[employee.id])
    }));

    return {
      morningShifts: [...stats].sort((a, b) => b.morning - a.morning),
      eveningShifts: [...stats].sort((a, b) => b.evening - a.evening),
      maxConsecutive: [...stats].sort((a, b) => b.consecutiveWork.max - a.consecutiveWork.max),
      avgConsecutive: [...stats].sort((a, b) => b.consecutiveWork.average - a.consecutiveWork.average)
    };
  };

  const rankings = getRankings();

  return (
    <div className="space-y-8">
      {/* 排名榜 */}
      {!selectedStaff && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 早班王 */}
          <div className="bg-gradient-to-br from-amber-500/5 to-amber-600/10 rounded-lg overflow-hidden border border-amber-500/10 shadow-lg shadow-amber-500/5">
            <div className="bg-amber-500/10 px-4 py-3 border-b border-amber-500/10">
              <div className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-400/10">
                  <SunIcon className="w-5 h-5" />
                </div>
                早班王
                <TrophyIcon className="w-4 h-4 ml-auto animate-bounce text-amber-400/80" />
              </div>
            </div>
            <div className="p-4 space-y-3">
              {rankings.morningShifts.slice(0, 3).map((staff, index) => (
                <div 
                  key={staff.name}
                  className="flex items-center justify-between bg-amber-400/5 rounded-lg p-2.5
                           transition-all duration-200 hover:bg-amber-400/10 hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold
                      shadow-lg ${index === 0 
                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-black ring-2 ring-amber-400/50' 
                        : index === 1 
                          ? 'bg-gradient-to-br from-amber-600/90 to-amber-700/90 text-amber-100 ring-1 ring-amber-500/30'
                          : 'bg-gradient-to-br from-amber-800/80 to-amber-900/80 text-amber-300'
                        }
                      `}>
                      {index + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className={`font-medium ${index === 0 ? 'text-amber-400' : 'text-amber-300/90'}`}>
                        {staff.name}
                      </span>
                      {index === 0 && (
                        <span className="text-xs text-amber-400/50">
                          早班之王 👑
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`font-bold ${index === 0 ? 'text-amber-400' : 'text-amber-300/90'}`}>
                      {staff.morning}
                    </span>
                    <span className="text-xs text-amber-400/50">班次</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 晚班王 */}
          <div className="bg-gradient-to-br from-blue-500/5 to-blue-600/10 rounded-lg overflow-hidden border border-blue-500/10 shadow-lg shadow-blue-500/5">
            <div className="bg-blue-500/10 px-4 py-3 border-b border-blue-500/10">
              <div className="text-lg font-bold text-blue-400 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-400/10">
                  <MoonIcon className="w-5 h-5" />
                </div>
                晚班王
                <TrophyIcon className="w-4 h-4 ml-auto animate-bounce text-blue-400/80" />
              </div>
            </div>
            <div className="p-4 space-y-3">
              {rankings.eveningShifts.slice(0, 3).map((staff, index) => (
                <div 
                  key={staff.name}
                  className="flex items-center justify-between bg-blue-400/5 rounded-lg p-2.5
                           transition-all duration-200 hover:bg-blue-400/10 hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold
                      shadow-lg ${index === 0 
                        ? 'bg-gradient-to-br from-blue-400 to-blue-500 text-black ring-2 ring-blue-400/50' 
                        : index === 1 
                          ? 'bg-gradient-to-br from-blue-600/90 to-blue-700/90 text-blue-100 ring-1 ring-blue-500/30'
                          : 'bg-gradient-to-br from-blue-800/80 to-blue-900/80 text-blue-300'
                        }
                      `}>
                      {index + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className={`font-medium ${index === 0 ? 'text-blue-400' : 'text-blue-300/90'}`}>
                        {staff.name}
                      </span>
                      {index === 0 && (
                        <span className="text-xs text-blue-400/50">
                          晚班之王 👑
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`font-bold ${index === 0 ? 'text-blue-400' : 'text-blue-300/90'}`}>
                      {staff.evening}
                    </span>
                    <span className="text-xs text-blue-400/50">班次</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 最長連續 */}
          <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 rounded-lg overflow-hidden border border-emerald-500/10 shadow-lg shadow-emerald-500/5">
            <div className="bg-emerald-500/10 px-4 py-3 border-b border-emerald-500/10">
              <div className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-400/10">
                  <FireIcon className="w-5 h-5" />
                </div>
                最長連續
                <ArrowTrendingUpIcon className="w-4 h-4 ml-auto text-emerald-400/80" />
              </div>
            </div>
            <div className="p-4 space-y-3">
              {rankings.maxConsecutive.slice(0, 3).map((staff, index) => (
                <div 
                  key={staff.name}
                  className="flex items-center justify-between bg-emerald-400/5 rounded-lg p-2.5
                           transition-all duration-200 hover:bg-emerald-400/10 hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold
                      shadow-lg ${index === 0 
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-black ring-2 ring-emerald-400/50' 
                        : index === 1 
                          ? 'bg-gradient-to-br from-emerald-600/90 to-emerald-700/90 text-emerald-100 ring-1 ring-emerald-500/30'
                          : 'bg-gradient-to-br from-emerald-800/80 to-emerald-900/80 text-emerald-300'
                        }
                      `}>
                      {index + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className={`font-medium ${index === 0 ? 'text-emerald-400' : 'text-emerald-300/90'}`}>
                        {staff.name}
                      </span>
                      {index === 0 && (
                        <span className="text-xs text-emerald-400/50">
                          連續之王 👑
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`font-bold ${index === 0 ? 'text-emerald-400' : 'text-emerald-300/90'}`}>
                      {staff.consecutiveWork.max}
                    </span>
                    <span className="text-xs text-emerald-400/50">天</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 平均連續 */}
          <div className="bg-gradient-to-br from-violet-500/5 to-violet-600/10 rounded-lg overflow-hidden border border-violet-500/10 shadow-lg shadow-violet-500/5">
            <div className="bg-violet-500/10 px-4 py-3 border-b border-violet-500/10">
              <div className="text-lg font-bold text-violet-400 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-400/10">
                  <ChartBarIcon className="w-5 h-5" />
                </div>
                平均連續
                <ArrowTrendingUpIcon className="w-4 h-4 ml-auto text-violet-400/80" />
              </div>
            </div>
            <div className="p-4 space-y-3">
              {rankings.avgConsecutive.slice(0, 3).map((staff, index) => (
                <div 
                  key={staff.name}
                  className="flex items-center justify-between bg-violet-400/5 rounded-lg p-2.5
                           transition-all duration-200 hover:bg-violet-400/10 hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold
                      shadow-lg ${index === 0 
                        ? 'bg-gradient-to-br from-violet-400 to-violet-500 text-black ring-2 ring-violet-400/50' 
                        : index === 1 
                          ? 'bg-gradient-to-br from-violet-600/90 to-violet-700/90 text-violet-100 ring-1 ring-violet-500/30'
                          : 'bg-gradient-to-br from-violet-800/80 to-violet-900/80 text-violet-300'
                        }
                      `}>
                      {index + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className={`font-medium ${index === 0 ? 'text-violet-400' : 'text-violet-300/90'}`}>
                        {staff.name}
                      </span>
                      {index === 0 && (
                        <span className="text-xs text-violet-400/50">
                          平均之王 👑
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`font-bold ${index === 0 ? 'text-violet-400' : 'text-violet-300/90'}`}>
                      {staff.consecutiveWork.average}
                    </span>
                    <span className="text-xs text-violet-400/50">天</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 人員過濾器 */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          選擇同事
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStaff(null)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium
              transition-all duration-200
              border-2 border-white/10
              ${!selectedStaff ? 
                'bg-gradient-to-r from-primary/20 to-secondary/20 border-primary' : 
                'hover:border-white/20'
              }
            `}
          >
            全部
          </button>
          {employees.map(employee => (
            <button
              key={employee.id}
              onClick={() => setSelectedStaff(employee.name)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium
                transition-all duration-200 
                border-2
                ${selectedStaff === employee.name ?
                  `bg-gradient-to-r ${STAFF_COLORS[employee.name] || 'from-primary/20 to-secondary/20'} border-l-4` :
                  'border-white/10 hover:border-white/20'
                }
              `}
            >
              {employee.name}
            </button>
          ))}
        </div>
      </div>

      {/* 個人班次分析 */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <UsersIcon className="w-5 h-5 text-primary" />
          </div>
          個人班次分析
        </h3>
        <div className="grid grid-cols-1 gap-6">
          {employees
            .filter(employee => !selectedStaff || employee.name === selectedStaff)
            .map(employee => {
              const stats = calculatePersonalStats(scheduleData[employee.id]);
              
              return (
                <div 
                  key={employee.id}
                  className={`
                    bg-gradient-to-br from-surface/30 to-surface/20
                    rounded-lg overflow-hidden border border-white/5
                    transition-all duration-300 hover:shadow-lg
                    ${selectedStaff === employee.name ? 'ring-2 ring-primary/30' : ''}
                  `}
                >
                  {/* 標題區 */}
                  <div className="bg-white/5 px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded-full 
                        flex items-center justify-center
                        bg-gradient-to-br ${STAFF_COLORS[employee.name] || 'from-primary/20 to-secondary/20'}
                        shadow-lg
                      `}>
                        {employee.name[0]}
                      </div>
                      <div className="font-medium text-lg">{employee.name}</div>
                    </div>
                  </div>

                  <div className="p-4 space-y-6">
                    {/* 班次分布 */}
                    <div>
                      <div className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
                        <div className="w-1 h-4 bg-primary/50 rounded-full" />
                        班次分布
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-amber-400/5 rounded-lg p-3 space-y-1 border border-amber-400/10">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-amber-400/10">
                              <SunIcon className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="text-sm text-amber-400/80">早班</div>
                          </div>
                          <div className="text-xl font-bold text-amber-400">{stats.morning}</div>
                          <div className="text-xs text-amber-400/50">
                            {Math.round(stats.morning / stats.total * 100)}%
                          </div>
                        </div>

                        <div className="bg-blue-400/5 rounded-lg p-3 space-y-1 border border-blue-400/10">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-blue-400/10">
                              <MoonIcon className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="text-sm text-blue-400/80">晚班</div>
                          </div>
                          <div className="text-xl font-bold text-blue-400">{stats.evening}</div>
                          <div className="text-xs text-blue-400/50">
                            {Math.round(stats.evening / stats.total * 100)}%
                          </div>
                        </div>

                        <div className="bg-emerald-400/5 rounded-lg p-3 space-y-1 border border-emerald-400/10">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-emerald-400/10">
                              <div className="w-4 h-4 rounded-full bg-emerald-400/20" />
                            </div>
                            <div className="text-sm text-emerald-400/80">中班</div>
                          </div>
                          <div className="text-xl font-bold text-emerald-400">{stats.middle}</div>
                          <div className="text-xs text-emerald-400/50">
                            {Math.round(stats.middle / stats.total * 100)}%
                          </div>
                        </div>

                        <div className="bg-violet-400/5 rounded-lg p-3 space-y-1 border border-violet-400/10">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-violet-400/10">
                              <div className="w-4 h-4 rounded-full bg-violet-400/20" />
                            </div>
                            <div className="text-sm text-violet-400/80">高鐵班</div>
                          </div>
                          <div className="text-xl font-bold text-violet-400">{stats.hsr}</div>
                          <div className="text-xs text-violet-400/50">
                            {Math.round(stats.hsr / stats.total * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 其他統計 */}
                    <div>
                      <div className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
                        <div className="w-1 h-4 bg-primary/50 rounded-full" />
                        其他統計
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-rose-400/5 rounded-lg p-3 space-y-1 border border-rose-400/10">
                          <div className="text-sm text-rose-400/80">國定假日</div>
                          <div className="text-xl font-bold text-rose-400">{stats.holidays}</div>
                          <div className="text-xs text-rose-400/50">次</div>
                        </div>

                        <div className="bg-pink-400/5 rounded-lg p-3 space-y-1 border border-pink-400/10">
                          <div className="text-sm text-pink-400/80">週末班次</div>
                          <div className="text-xl font-bold text-pink-400">{stats.weekends}</div>
                          <div className="text-xs text-pink-400/50">次</div>
                        </div>

                        <div className="bg-emerald-400/5 rounded-lg p-3 space-y-1 border border-emerald-400/10">
                          <div className="text-sm text-emerald-400/80">最長連續</div>
                          <div className="text-xl font-bold text-emerald-400">{stats.consecutiveWork.max}</div>
                          <div className="text-xs text-emerald-400/50">天</div>
                        </div>

                        <div className="bg-violet-400/5 rounded-lg p-3 space-y-1 border border-violet-400/10">
                          <div className="text-sm text-violet-400/80">平均連續</div>
                          <div className="text-xl font-bold text-violet-400">{stats.consecutiveWork.average}</div>
                          <div className="text-xs text-violet-400/50">天</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function Schedule() {
  const [scheduleData, setScheduleData] = useState([])
  const [selectedPerson, setSelectedPerson] = useState('')
  const [dateRange, setDateRange] = useState(-1)
  const [showTools, setShowTools] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [pairings, setPairings] = useState({})
  const [showPairings, setShowPairings] = useState(false)
  const [activeView, setActiveView] = useState('schedule') // 'schedule', 'stats', 'pairings'

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

  // 當班表數據更新時計算配搭
  useEffect(() => {
    if (scheduleData.length > 2) {
      const newPairings = calculatePairings(scheduleData)
      setPairings(newPairings)
    }
  }, [scheduleData])

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
    
    // 早班：漸層藍色背景
    if (cell.includes('4:30-13:00') || cell.includes('4：30-13：00')) {
      return {
        background: 'bg-gradient-to-r from-sky-500/20 to-blue-500/20',
        text: 'text-sky-100 font-medium',
        border: 'border-l-4 border-l-sky-500',
        label: '早班'
      };
    }
    
    // 中班：漸層紅色背景
    if (cell.includes('7:30-16:00') || cell.includes('7：30-16：00')) {
      return {
        background: 'bg-gradient-to-r from-rose-500/20 to-pink-500/20',
        text: 'text-rose-100 font-medium',
        border: 'border-l-4 border-l-rose-500',
        label: '中班'
      };
    }
    
    // 高鐵班：漸層青色背景
    if (cell.includes('6:00-14:30') || cell.includes('6：00-14：30')) {
      return {
        background: 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20',
        text: 'text-cyan-100 font-medium',
        border: 'border-l-4 border-l-cyan-500',
        label: '高鐵'
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
      <div className="space-y-6">
        <div className="card">
          {/* 主選單 */}
          <div className="flex flex-col gap-4 mb-8">
            {/* 主標題 */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="card-header mb-0">班表</h2>
                <p className="text-sm text-text-secondary mt-1">
                  {activeView === 'schedule' && '查看與管理班表'}
                  {activeView === 'stats' && '查看班表統計數據'}
                  {activeView === 'pairings' && '查看同事配搭情況'}
                </p>
              </div>
              <div className="flex gap-3">
                {activeView === 'schedule' && (
                  <>
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
                      onClick={exportToCSV}
                      className="btn-icon transition-all duration-200 hover:bg-primary/20 hover:text-primary"
                      title="導出 CSV"
                    >
                      <DocumentArrowDownIcon className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 選單列 */}
            <div className="flex items-center gap-2 px-1">
              <div className="flex bg-surface/50 backdrop-blur-sm rounded-lg p-1">
                <button
                  onClick={() => setActiveView('schedule')}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium
                    transition-all duration-200
                    ${activeView === 'schedule' 
                      ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }
                  `}
                >
                  班表
                </button>
                <button
                  onClick={() => setActiveView('stats')}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium
                    transition-all duration-200
                    ${activeView === 'stats' 
                      ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }
                  `}
                >
                  班表統計
                </button>
                <button
                  onClick={() => setActiveView('pairings')}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium
                    transition-all duration-200
                    ${activeView === 'pairings' 
                      ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }
                  `}
                >
                  配搭統計
                </button>
                <button
                  onClick={() => setActiveView('tickets')}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium
                    transition-all duration-200
                    ${activeView === 'tickets' 
                      ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }
                  `}
                >
                  票價試算
                </button>
              </div>
            </div>
          </div>

          {/* 工具抽屜 */}
          {activeView === 'schedule' && (
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
          )}

          {/* 內容區域 */}
          {activeView === 'schedule' && (
            <>
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
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
              )}
            </>
          )}

          {activeView === 'stats' && (
            <div className="p-6">
              <ScheduleStats 
                scheduleData={scheduleData.slice(2).reduce((acc, row) => {
                  if (!row || !row[0]) return acc;
                  const employeeId = row[0];
                  return {
                    ...acc,
                    [employeeId]: row.slice(1)
                  };
                }, {})}
                employees={Object.entries(NAME_MAPPINGS).map(([fullName, nickname]) => ({
                  id: fullName,
                  name: nickname
                }))}
              />
            </div>
          )}

          {activeView === 'pairings' && Object.keys(pairings).length > 0 && (
            <div className="p-6">
              <PairingsStats 
                pairings={pairings}
                onClose={() => setActiveView('schedule')}
              />
            </div>
          )}

          {/* 添加票價比較視圖 */}
          {activeView === 'tickets' && (
            <div className="p-6">
              <TicketComparison scheduleData={getFilteredData()} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Schedule 