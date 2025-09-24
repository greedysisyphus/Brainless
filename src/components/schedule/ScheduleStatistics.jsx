import React, { useMemo } from 'react'
import { measurePerformance, useRenderPerformance } from '../../utils/performance'
import { LoadingOverlay, StatisticsSkeleton } from '../LoadingSpinner'

// 統計卡片主題配置
const STATS_THEMES = {
  early: {
    color: 'pink',
    icon: (
      <svg className="w-5 h-5 text-pink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: '早班統計',
    gradient: 'from-pink-500/20 to-rose-500/20',
    border: 'border-pink-400/30'
  },
  night: {
    color: 'blue',
    icon: (
      <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
    title: '晚班統計',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    border: 'border-blue-400/30'
  },
  consecutive: {
    color: 'orange',
    icon: (
      <svg className="w-5 h-5 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: '連續上班',
    gradient: 'from-orange-500/20 to-yellow-500/20',
    border: 'border-orange-400/30'
  },
  stockLover: {
    color: 'emerald',
    icon: (
      <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: '熱愛進貨',
    gradient: 'from-emerald-500/20 to-green-500/20',
    border: 'border-emerald-400/30'
  }
}

// 通用統計卡片組件
const StatCard = ({ title, icon, themeColor, children, isLoading }) => {
  return (
    <div className={`bg-gradient-to-br ${STATS_THEMES[themeColor].gradient} rounded-2xl p-4 border ${STATS_THEMES[themeColor].border} shadow-xl backdrop-blur-sm`}>
      <div className="flex items-center justify-center mb-4">
        <div className={`w-10 h-10 rounded-full bg-${STATS_THEMES[themeColor].color}-500/20 border border-${STATS_THEMES[themeColor].color}-400/30 flex items-center justify-center mr-3`}>
          {icon}
        </div>
        <h3 className={`text-lg font-bold text-${STATS_THEMES[themeColor].color}-300`}>{title}</h3>
      </div>
      <LoadingOverlay isLoading={isLoading}>
        {children}
      </LoadingOverlay>
    </div>
  )
}

// 早班統計組件
export const EarlyShiftStats = ({ schedule, names, showAll = false }) => {
  
  const calculateEarlyStats = () => {
    return measurePerformance('早班統計計算', () => {
      const stats = []
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        let count = 0
        
        for (let day = 1; day <= daysInMonth; day++) {
          const shift = schedule[employeeId]?.[day]
          if (shift === '早') {
            count++
          }
        }
        
        // 包含所有員工，包括次數為0的
        stats.push({
          employeeId,
          name: names[employeeId] || employeeId,
          count
        })
      })
      
      // 按次數降序排序
      const sortedStats = stats.sort((a, b) => b.count - a.count)
      
      // 計算排名（相同次數的排名相同）
      let currentRank = 1
      let previousCount = null
      
      return sortedStats.map((stat, index) => {
        if (previousCount !== null && stat.count !== previousCount) {
          currentRank = index + 1
        }
        previousCount = stat.count
        
        return {
          ...stat,
          rank: currentRank
        }
      })
    }, { logThreshold: 5 })
  }
  
  const earlyStats = calculateEarlyStats()
  const displayStats = showAll ? earlyStats : earlyStats.slice(0, 5)
  
  return (
    <div className="space-y-3">
      {earlyStats.length > 0 ? (
        displayStats.map((stat) => (
          <div 
            key={stat.employeeId}
            className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10 hover:bg-surface/30 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-pink-500/30 border border-pink-400/50 flex items-center justify-center text-xs font-bold text-pink-300">
                {stat.rank}
              </div>
              <span className="text-white font-medium text-sm">{stat.name}</span>
            </div>
            <div className="text-pink-300 font-bold text-sm">{stat.count} 次</div>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-gray-400">
          <div className="text-4xl mb-2">🌅</div>
          <div>本月無早班記錄</div>
        </div>
      )}
    </div>
  )
}

// 晚班統計組件
export const NightShiftStats = ({ schedule, names, showAll = false }) => {
  
  const calculateNightStats = () => {
    return measurePerformance('晚班統計計算', () => {
      const stats = []
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        let count = 0
        
        for (let day = 1; day <= daysInMonth; day++) {
          const shift = schedule[employeeId]?.[day]
          if (shift === '晚') {
            count++
          }
        }
        
        // 包含所有員工，包括次數為0的
        stats.push({
          employeeId,
          name: names[employeeId] || employeeId,
          count
        })
      })
      
      // 按次數降序排序
      const sortedStats = stats.sort((a, b) => b.count - a.count)
      
      // 計算排名（相同次數的排名相同）
      let currentRank = 1
      let previousCount = null
      
      return sortedStats.map((stat, index) => {
        if (previousCount !== null && stat.count !== previousCount) {
          currentRank = index + 1
        }
        previousCount = stat.count
        
        return {
          ...stat,
          rank: currentRank
        }
      })
    }, { logThreshold: 5 })
  }
  
  const nightStats = calculateNightStats()
  const displayStats = showAll ? nightStats : nightStats.slice(0, 5)
  
  return (
    <div className="space-y-3">
      {nightStats.length > 0 ? (
        displayStats.map((stat) => (
          <div 
            key={stat.employeeId}
            className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10 hover:bg-surface/30 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/30 border border-blue-400/50 flex items-center justify-center text-xs font-bold text-blue-300">
                {stat.rank}
              </div>
              <span className="text-white font-medium text-sm">{stat.name}</span>
            </div>
            <div className="text-blue-300 font-bold text-sm">{stat.count} 次</div>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-gray-400">
          <div className="text-4xl mb-2">🌙</div>
          <div>本月無晚班記錄</div>
        </div>
      )}
    </div>
  )
}

// 連續上班統計組件
export const ConsecutiveWorkStats = ({ schedule, names, showAll = false }) => {
  
  const calculateConsecutiveStats = () => {
    return measurePerformance('連續上班統計計算', () => {
      const stats = []
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        
        let maxConsecutive = 0
        let currentConsecutive = 0
        
        for (let day = 1; day <= daysInMonth; day++) {
          const shift = schedule[employeeId]?.[day]
          if (shift && shift !== '休' && shift !== '特') {
            currentConsecutive++
          } else {
            maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
            currentConsecutive = 0
          }
        }
        
        // 處理最後一個連續期
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
        
        // 包含所有員工，包括連續天數為0的
        stats.push({
          employeeId,
          name: names[employeeId] || employeeId,
          maxConsecutive
        })
      })
      
      // 按連續天數降序排序
      const sortedStats = stats.sort((a, b) => b.maxConsecutive - a.maxConsecutive)
      
      // 計算排名（相同天數的排名相同）
      let currentRank = 1
      let previousCount = null
      
      return sortedStats.map((stat, index) => {
        if (previousCount !== null && stat.maxConsecutive !== previousCount) {
          currentRank = index + 1
        }
        previousCount = stat.maxConsecutive
        
        return {
          ...stat,
          rank: currentRank
        }
      })
    }, { logThreshold: 5 })
  }
  
  const consecutiveStats = calculateConsecutiveStats()
  const displayStats = showAll ? consecutiveStats : consecutiveStats.slice(0, 5)
  
  return (
    <div className="space-y-3">
      {consecutiveStats.length > 0 ? (
        displayStats.map((stat) => (
          <div 
            key={stat.employeeId}
            className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10 hover:bg-surface/30 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-orange-500/30 border border-orange-400/50 flex items-center justify-center text-xs font-bold text-orange-300">
                {stat.rank}
              </div>
              <span className="text-white font-medium text-sm">{stat.name}</span>
            </div>
            <div className="text-orange-300 font-bold text-sm">{stat.maxConsecutive} 天</div>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-gray-400">
          <div className="text-4xl mb-2">⚡</div>
          <div>本月無連續上班記錄</div>
        </div>
      )}
    </div>
  )
}

// 熱愛進貨統計組件
export const StockLoverStats = ({ schedule, names, showAll = false }) => {
  
  const calculateStockLoverStats = () => {
    return measurePerformance('熱愛進貨統計計算', () => {
      const stats = []
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      
      // 初始化所有員工
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        stats.push({
          employeeId,
          name: names[employeeId] || employeeId,
          count: 0
        })
      })
      
      // 計算每個星期三的中班和晚班
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(new Date().getFullYear(), new Date().getMonth(), day)
        const dayOfWeek = date.getDay() // 0=星期日, 3=星期三
        
        if (dayOfWeek === 3) { // 星期三
          Object.keys(schedule).forEach(employeeId => {
            if (employeeId === '_lastUpdated') return
            const shift = schedule[employeeId]?.[day]
            
            // 檢查是否為中班或晚班
            if (shift === '中' || shift === '晚') {
              const stat = stats.find(s => s.employeeId === employeeId)
              if (stat) stat.count++
            }
          })
        }
      }
      
      // 按次數降序排序
      const sortedStats = stats.sort((a, b) => b.count - a.count)
      
      // 計算排名（相同次數的排名相同）
      let currentRank = 1
      let previousCount = null
      
      return sortedStats.map((stat, index) => {
        if (previousCount !== null && stat.count !== previousCount) {
          currentRank = index + 1
        }
        previousCount = stat.count
        
        return {
          ...stat,
          rank: currentRank
        }
      })
    }, { logThreshold: 5 })
  }
  
  const stockLoverStats = calculateStockLoverStats()
  const displayStats = showAll ? stockLoverStats : stockLoverStats.slice(0, 5)
  
  return (
    <div className="space-y-3">
      {stockLoverStats.length > 0 ? (
        displayStats.map((stat) => (
          <div 
            key={stat.employeeId}
            className="flex items-center justify-between p-3 bg-surface/20 rounded-lg border border-white/10 hover:bg-surface/30 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center text-xs font-bold text-emerald-300">
                {stat.rank}
              </div>
              <span className="text-white font-medium text-sm">{stat.name}</span>
            </div>
            <div className="text-emerald-300 font-bold text-sm">{stat.count} 次</div>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-gray-400">
          <div className="text-4xl mb-2">📦</div>
          <div>本月無進貨記錄</div>
        </div>
      )}
    </div>
  )
}

// 主要統計組件
export default function ScheduleStatistics({ schedule, names, loadingStates, selectedEmployee, allSchedules, selectedMonth }) {
  const finishRender = useRenderPerformance('ScheduleStatistics')
  const [showAllStats, setShowAllStats] = React.useState(false)
  
  // 直接使用組件，不依賴 useStatistics hook
  React.useEffect(() => {
    finishRender()
  })

  return (
    <div className="space-y-6">
      {/* 統計卡片網格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={STATS_THEMES.early.title} icon={STATS_THEMES.early.icon} themeColor="early" isLoading={loadingStates.statistics}>
          <EarlyShiftStats schedule={schedule} names={names} showAll={showAllStats} />
        </StatCard>
        <StatCard title={STATS_THEMES.night.title} icon={STATS_THEMES.night.icon} themeColor="night" isLoading={loadingStates.statistics}>
          <NightShiftStats schedule={schedule} names={names} showAll={showAllStats} />
        </StatCard>
        <StatCard title={STATS_THEMES.consecutive.title} icon={STATS_THEMES.consecutive.icon} themeColor="consecutive" isLoading={loadingStates.statistics}>
          <ConsecutiveWorkStats schedule={schedule} names={names} showAll={showAllStats} />
        </StatCard>
        <StatCard title={STATS_THEMES.stockLover.title} icon={STATS_THEMES.stockLover.icon} themeColor="stockLover" isLoading={loadingStates.statistics}>
          <StockLoverStats schedule={schedule} names={names} showAll={showAllStats} />
        </StatCard>
      </div>
      
      {/* 統一的查看全部按鈕 */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowAllStats(!showAllStats)}
          className="px-8 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-400/30 text-blue-300 rounded-xl transition-all duration-200 text-sm font-medium shadow-lg backdrop-blur-sm"
        >
          {showAllStats ? '收起所有排名' : '查看全部排名'}
        </button>
      </div>
    </div>
  )
}
