import React from 'react'

// 個人搭班詳情彈窗組件
export default function EmployeeOverlapDetail({ employeeId, employeeName, ranking, onClose }) {
  // 計算搭班統計
  const calculateOverlapStats = () => {
    const totalOverlaps = ranking.reduce((sum, item) => sum + item.count, 0)
    const avgOverlaps = ranking.length > 0 ? (totalOverlaps / ranking.length).toFixed(1) : 0
    const maxOverlaps = ranking.length > 0 ? ranking[0].count : 0
    
    return { totalOverlaps, avgOverlaps, maxOverlaps }
  }
  
  const stats = calculateOverlapStats()
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gradient-to-br from-surface/95 to-surface/85 rounded-2xl sm:rounded-3xl p-6 sm:p-10 border border-primary/20 shadow-2xl shadow-primary/10 max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-primary/20">
              {employeeName.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-primary via-purple-500 to-secondary bg-clip-text text-transparent">
                {employeeName}
              </h3>
              <p className="text-text-secondary text-xs font-medium">搭班統計詳細分析</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-primary/20 rounded-xl text-text-secondary hover:text-primary transition-all duration-300 hover:scale-110 group"
          >
            <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* 統計摘要 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="group bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 text-center border border-purple-400/30 hover:border-purple-400/50 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-purple-500/20">
            <div className="text-xl font-bold text-purple-300 group-hover:text-purple-200 transition-colors mb-1">{stats.totalOverlaps}</div>
            <div className="text-xs text-purple-200/80 font-medium">總搭班次數</div>
            <div className="w-full bg-purple-500/20 rounded-full h-1.5 mt-2">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full" style={{width: '100%'}}></div>
            </div>
          </div>
          <div className="group bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-4 text-center border border-blue-400/30 hover:border-blue-400/50 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-blue-500/20">
            <div className="text-xl font-bold text-blue-300 group-hover:text-blue-200 transition-colors mb-1">{stats.avgOverlaps}</div>
            <div className="text-xs text-blue-200/80 font-medium">平均搭班次數</div>
            <div className="w-full bg-blue-500/20 rounded-full h-1.5 mt-2">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full" style={{width: `${(parseFloat(stats.avgOverlaps) / stats.maxOverlaps) * 100}%`}}></div>
            </div>
          </div>
          <div className="group bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl p-4 text-center border border-emerald-400/30 hover:border-emerald-400/50 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-emerald-500/20">
            <div className="text-xl font-bold text-emerald-300 group-hover:text-emerald-200 transition-colors mb-1">{stats.maxOverlaps}</div>
            <div className="text-xs text-emerald-200/80 font-medium">最多搭班次數</div>
            <div className="w-full bg-emerald-500/20 rounded-full h-1.5 mt-2">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full" style={{width: '100%'}}></div>
            </div>
          </div>
        </div>
      
        {/* 搭班排行 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              搭班排行榜
            </h4>
            <div className="text-xs text-text-secondary bg-surface/40 px-2 py-1 rounded-full border border-white/10">
              共 {ranking.length} 位夥伴
            </div>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
            {ranking.length > 0 ? (
              ranking.map((item, index) => (
                <div key={item.employeeId} className="group flex items-center justify-between bg-gradient-to-r from-surface/60 to-surface/40 rounded-lg p-3 border border-white/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10">
                  <div className="flex items-center space-x-3">
                    <div className={`relative w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all duration-300 group-hover:scale-110 ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 border-yellow-300 text-white shadow-lg shadow-yellow-500/30' :
                      index === 1 ? 'bg-gradient-to-br from-gray-400 to-slate-500 border-gray-300 text-white shadow-lg shadow-gray-500/30' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-500 border-orange-300 text-white shadow-lg shadow-orange-500/30' :
                      'bg-gradient-to-br from-primary to-secondary border-primary text-white shadow-lg shadow-primary/30'
                    }`}>
                      {index < 3 && (
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full flex items-center justify-center">
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                        </div>
                      )}
                      {index + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-semibold text-sm group-hover:text-primary transition-colors">{item.name}</span>
                      <span className="text-text-secondary text-xs">搭班夥伴</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="text-primary font-bold text-sm">{item.count}</div>
                      <div className="text-text-secondary text-xs">次數</div>
                    </div>
                    <div className="w-10 h-1.5 bg-surface/40 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500 group-hover:from-secondary group-hover:to-primary"
                        style={{width: `${(item.count / stats.maxOverlaps) * 100}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface/40 flex items-center justify-center">
                  <svg className="w-6 h-6 text-text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <div className="text-text-secondary text-sm font-medium mb-1">暫無搭班記錄</div>
                <div className="text-text-secondary/60 text-xs">本月該同事尚未與其他人搭班</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
