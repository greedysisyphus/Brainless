import React, { useMemo } from 'react'
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts'
import { measurePerformance, useRenderPerformance } from '../../utils/performance'

// 班次類型分布圓餅圖組件
export const ShiftTypePieChart = ({ schedule }) => {
  const calculateShiftTypeDistribution = () => {
    return measurePerformance('班次類型分布計算', () => {
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
        { name: '特休', value: distribution.special, color: '#f97316' }
      ].filter(item => item.value > 0)
    }, { logThreshold: 5 })
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
export const ShiftTrendChart = ({ schedule, names }) => {
  const calculateShiftTrend = () => {
    return measurePerformance('班次趨勢計算', () => {
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      const data = []
      
      // 取得所有班次類型
      const allShifts = new Set()
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        for (let day = 1; day <= daysInMonth; day++) {
          const shift = schedule[employeeId]?.[day]
          if (shift) allShifts.add(shift)
        }
      })
      
      const availableShifts = Array.from(allShifts).filter(shift => shift !== '休')
      
      // 計算每日各班次人數
      for (let day = 1; day <= daysInMonth; day++) {
        const dayData = { date: `${day}日` }
        
        availableShifts.forEach(shift => {
          let count = 0
          Object.keys(schedule).forEach(employeeId => {
            if (employeeId === '_lastUpdated') return
            if (schedule[employeeId]?.[day] === shift) {
              count++
            }
          })
          dayData[shift] = count
        })
        
        data.push(dayData)
      }
      
      return { data, availableShifts }
    }, { logThreshold: 5 })
  }
  
  const { data, availableShifts } = calculateShiftTrend()
  
  const getShiftColor = (shift) => {
    const colors = {
      '早': '#ec4899',
      '中': '#06b6d4', 
      '晚': '#3b82f6',
      '特': '#f97316'
    }
    return colors[shift] || '#6b7280'
  }
  
  return (
    <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
      <h3 className="text-xl font-bold mb-6 text-blue-300 text-center">班次趨勢變化</h3>
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
          <XAxis 
            dataKey="date" 
            stroke="#ffffff80"
            tick={{ fontSize: 12 }}
          />
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
          {availableShifts.map(shift => (
            <Line 
              key={shift}
              type="monotone" 
              dataKey={shift} 
              stroke={getShiftColor(shift)} 
              strokeWidth={2}
              name={shift}
              dot={{ fill: getShiftColor(shift), strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: getShiftColor(shift), strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      
      {/* 統計摘要 */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
        {availableShifts.map(shift => (
          <div key={shift} className="text-center p-3 bg-surface/20 rounded-lg border border-white/10">
            <div className="text-2xl font-bold" style={{ color: getShiftColor(shift) }}>
              {data.reduce((sum, day) => sum + (day[shift] || 0), 0)}
            </div>
            <div className="text-sm text-gray-400">{shift}班總計</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 班次分布圖表組件
export const ShiftDistributionChart = ({ schedule, names }) => {
  const calculateShiftDistribution = () => {
    return measurePerformance('班次分布計算', () => {
      const data = []
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      
      Object.keys(schedule).forEach(employeeId => {
        if (employeeId === '_lastUpdated') return
        
        const employeeName = names[employeeId] || employeeId
        const shifts = { early: 0, middle: 0, night: 0, rest: 0, special: 0 }
        
        for (let day = 1; day <= daysInMonth; day++) {
          const shift = schedule[employeeId]?.[day]
          if (shift) {
            switch (shift) {
              case '早': shifts.early++; break
              case '中': shifts.middle++; break
              case '晚': shifts.night++; break
              case '休': shifts.rest++; break
              case '特': shifts.special++; break
            }
          }
        }
        
        data.push({
          name: employeeName,
          ...shifts
        })
      })
      
      return data.sort((a, b) => {
        // 按職員編號排序
        const numA = parseInt(a.name.match(/\d+/)?.[0] || '0')
        const numB = parseInt(b.name.match(/\d+/)?.[0] || '0')
        return numA - numB
      })
    }, { logThreshold: 5 })
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
          <Bar dataKey="special" stackId="a" fill="#f97316" name="特休" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// 主要圖表組件
export default function ScheduleCharts({ schedule, names }) {
  const finishRender = useRenderPerformance('ScheduleCharts')
  React.useEffect(() => {
    finishRender()
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <ShiftTypePieChart schedule={schedule} />
      <ShiftTrendChart schedule={schedule} names={names} />
      <div className="lg:col-span-2">
        <ShiftDistributionChart schedule={schedule} names={names} />
      </div>
    </div>
  )
}
