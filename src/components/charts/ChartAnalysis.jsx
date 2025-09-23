import React from 'react'
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'

// 圓餅圖組件
export const PieChartComponent = ({ data, colors, title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <div>暫無數據</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-64">
      <h4 className="text-lg font-semibold text-white mb-4 text-center">{title}</h4>
      <ResponsiveContainer width="100%" height="100%">
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
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// 長條圖組件
export const BarChartComponent = ({ data, title, xKey = 'name', yKey = 'value' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <div>暫無數據</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-64">
      <h4 className="text-lg font-semibold text-white mb-4 text-center">{title}</h4>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={yKey} fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// 折線圖組件
export const LineChartComponent = ({ data, title, dataKey = 'value' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <div>暫無數據</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-64">
      <h4 className="text-lg font-semibold text-white mb-4 text-center">{title}</h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={dataKey} stroke="#8884d8" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// 面積圖組件
export const AreaChartComponent = ({ data, title, dataKey = 'value' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <div>暫無數據</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-64">
      <h4 className="text-lg font-semibold text-white mb-4 text-center">{title}</h4>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey={dataKey} stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// 雷達圖組件
export const RadarChartComponent = ({ data, title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <div>暫無數據</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-64">
      <h4 className="text-lg font-semibold text-white mb-4 text-center">{title}</h4>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis />
          <Radar name="統計" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// 圖表分析容器
export const ChartAnalysis = ({ 
  pieChartData, 
  barChartData, 
  lineChartData, 
  areaChartData, 
  radarChartData,
  colors = ['#ec4899', '#06b6d4', '#3b82f6', '#6b7280', '#f97316']
}) => {
  return (
    <div className="space-y-6">
      {/* 圓餅圖 */}
      {pieChartData && (
        <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
          <PieChartComponent 
            data={pieChartData} 
            colors={colors}
            title="班次分佈"
          />
        </div>
      )}

      {/* 長條圖 */}
      {barChartData && (
        <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
          <BarChartComponent 
            data={barChartData} 
            title="班次統計"
          />
        </div>
      )}

      {/* 折線圖 */}
      {lineChartData && (
        <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
          <LineChartComponent 
            data={lineChartData} 
            title="趨勢分析"
          />
        </div>
      )}

      {/* 面積圖 */}
      {areaChartData && (
        <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
          <AreaChartComponent 
            data={areaChartData} 
            title="累積分析"
          />
        </div>
      )}

      {/* 雷達圖 */}
      {radarChartData && (
        <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20 shadow-xl backdrop-blur-sm">
          <RadarChartComponent 
            data={radarChartData} 
            title="多維度分析"
          />
        </div>
      )}
    </div>
  )
}

export default ChartAnalysis
