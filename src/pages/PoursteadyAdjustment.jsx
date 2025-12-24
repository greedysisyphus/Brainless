import { useState } from 'react';
import { BeakerIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

// 自定義水滴圖標組件
function WaterDropIcon(props) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      {...props}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5}
        d="M12 21.5c4.5 0 7.5-3 7.5-7.5C19.5 8.5 12 2.5 12 2.5S4.5 8.5 4.5 14c0 4.5 3 7.5 7.5 7.5z" 
      />
    </svg>
  );
}

const STANDARD_VOLUMES = {
  hot: [40, 78, 120, 162, 200, 230],  // 改為累計水量
  cold: {
    '150ml': [40, 58, 80, 102, 120, 150],   // 原本方案
    '140ml': [40, 58, 80, 102, 120, 140],   // 新方案1
    '130ml': [40, 58, 80, 102, 120, 130]    // 新方案2
  }
};

const STANDARD_SEGMENTS = {  // 新增：每段實際注水量
  hot: [40, 38, 42, 42, 38, 30],
  cold: {
    '150ml': [40, 18, 22, 22, 18, 30],
    '140ml': [40, 18, 22, 22, 18, 20],
    '130ml': [40, 18, 22, 22, 18, 10]
  }
};

export default function PoursteadyAdjustment() {
  const [mode, setMode] = useState('hot');
  const [coldScheme, setColdScheme] = useState('150ml'); // 新增：冰手沖方案選擇
  const [currentVolumes, setCurrentVolumes] = useState({
    hot: Array(6).fill(''),  // 改為空字串陣列
    cold: Array(6).fill('')
  });
  
  // 計算每段實際注水量
  const getSegmentVolumes = (totalVolumes) => {
    return totalVolumes.map((vol, index) => 
      index === 0 ? vol : vol - totalVolumes[index - 1]
    );
  };

  // 計算調整值
  const getAdjustments = (volumes) => {
    const segments = getSegmentVolumes(volumes);
    const standardSegments = mode === 'hot' ? STANDARD_SEGMENTS.hot : STANDARD_SEGMENTS.cold[coldScheme];
    return segments.map((vol, index) => 
      Math.round(vol - standardSegments[index])
    );
  };

  // 修改處理輸入的函數
  const handleDirectInput = (index, value) => {
    const newVolumes = [...currentVolumes[mode]];
    newVolumes[index] = value;  // 直接存儲輸入值，不轉換

    setCurrentVolumes({
      ...currentVolumes,
      [mode]: newVolumes
    });
  };

  // 添加重設函數
  const handleReset = () => {
    setCurrentVolumes({
      ...currentVolumes,
      [mode]: Array(6).fill('')
    });
  };

  // 處理冰手沖方案切換
  const handleColdSchemeChange = (scheme) => {
    setColdScheme(scheme);
    // 切換方案時重設當前輸入
    setCurrentVolumes({
      ...currentVolumes,
      cold: Array(6).fill('')
    });
  };

  // 獲取顯示用的水量（空值顯示標準值）
  const getDisplayVolume = (index) => {
    const value = currentVolumes[mode][index];
    if (mode === 'hot') {
      return value === '' ? STANDARD_VOLUMES.hot[index] : Number(value);
    } else {
      return value === '' ? STANDARD_VOLUMES.cold[coldScheme][index] : Number(value);
    }
  };

  return (
    <div className="container-custom py-4 sm:py-6 md:py-8">
      <div className="max-w-6xl mx-auto">
        {/* 頁面標題 - 超現代設計 */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10 relative">
          {/* 背景動態光暈 - 移動設備縮小 */}
          <div className="absolute inset-0 flex justify-center -z-10">
            <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow opacity-50"></div>
          </div>
          
          {/* 圖標容器 - 3D 效果 */}
          <div className="inline-flex items-center justify-center mb-4 sm:mb-5 md:mb-6 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-blue-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
            <div className="relative inline-flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-gradient-to-br from-primary/30 via-purple-500/30 to-blue-500/30 rounded-xl sm:rounded-2xl border-2 border-primary/50 shadow-2xl shadow-primary/30 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 overflow-hidden">
              {/* 流動背景 */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient bg-[length:200%_100%]"></div>
              <BeakerIcon className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-primary relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          
          {/* 標題 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-2 sm:mb-3 relative px-4">
            <span className="bg-gradient-to-r from-primary via-purple-400 via-blue-400 to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient">
              Poursteady 注水量調整
            </span>
            {/* 文字發光效果 */}
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-purple-400 via-blue-400 to-primary bg-clip-text text-transparent blur-xl opacity-30 -z-10 animate-pulse-glow">
              Poursteady 注水量調整
            </span>
          </h1>
          
          {/* 副標題 */}
          <p className="text-gray-400 text-sm sm:text-base font-medium px-4">最近才發現沒有長智齒</p>
        </div>

        {/* 操作按鈕區域 */}
        <div className="flex flex-wrap justify-center gap-3 mb-6 sm:mb-8">
        <button
          onClick={handleReset}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/30 text-red-400 hover:from-red-500/30 hover:to-orange-500/30 hover:border-red-500/50 transition-all duration-200 flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
          重設
        </button>
      </div>
      
        {/* 模式切換 - 現代化分段控制器 */}
        <div className="mb-6 sm:mb-7 md:mb-8">
          <div className="relative mx-auto max-w-md bg-surface/60 backdrop-blur-md rounded-xl p-1.5 sm:p-2 border border-white/10 shadow-lg">
            {/* 滑動指示器 */}
            <div
              className={`absolute top-1.5 sm:top-2 bottom-1.5 sm:bottom-2 bg-gradient-to-r from-primary to-purple-500 rounded-lg shadow-md transition-all duration-300 ease-out`}
              style={{
                width: 'calc(50% - 4px)',
                left: '4px',
                transform: mode === 'hot' ? 'translateX(0%)' : 'translateX(100%)',
              }}
            ></div>
            <div className="relative grid grid-cols-2 gap-1.5">
        <button
          onClick={() => setMode('hot')}
                className={`relative flex-1 px-4 py-2 text-sm sm:text-base font-medium rounded-lg transition-colors duration-300 z-10 ${
                  mode === 'hot' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
        >
          熱手沖
        </button>
        <button
          onClick={() => setMode('cold')}
                className={`relative flex-1 px-4 py-2 text-sm sm:text-base font-medium rounded-lg transition-colors duration-300 z-10 ${
                  mode === 'cold' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
        >
          冰手沖
        </button>
            </div>
          </div>
      </div>

      {/* 冰手沖方案選擇 */}
      {mode === 'cold' && (
          <div className="mb-6 sm:mb-7 md:mb-8">
            <div className="relative mx-auto max-w-md bg-surface/60 backdrop-blur-md rounded-xl p-1.5 sm:p-2 border border-white/10 shadow-lg">
              {/* 滑動指示器 */}
              <div
                className={`absolute top-1.5 sm:top-2 bottom-1.5 sm:bottom-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg shadow-md transition-all duration-300 ease-out`}
                style={{
                  width: 'calc(33.333% - 4px)',
                  left: '4px',
                  transform: coldScheme === '150ml' ? 'translateX(0%)' :
                            coldScheme === '140ml' ? 'translateX(100%)' :
                            'translateX(200%)',
                }}
              ></div>
              <div className="relative grid grid-cols-3 gap-1.5">
                {['150ml', '140ml', '130ml'].map((scheme) => (
          <button
                    key={scheme}
                    onClick={() => handleColdSchemeChange(scheme)}
                    className={`relative flex-1 px-4 py-2 text-sm sm:text-base font-medium rounded-lg transition-colors duration-300 z-10 ${
                      coldScheme === scheme ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
          >
                    {scheme}
          </button>
                ))}
              </div>
            </div>
        </div>
      )}

      {/* 注水量調整表 */}
        <div className="space-y-4 sm:space-y-5 md:space-y-6 mb-6 sm:mb-8">
        {(mode === 'hot' ? STANDARD_VOLUMES.hot : STANDARD_VOLUMES.cold[coldScheme]).map((standardVolume, index) => {
          const displayVolume = getDisplayVolume(index);
          const prevDisplayVolume = index > 0 ? getDisplayVolume(index - 1) : 0;
          const segmentVolume = index === 0 ? displayVolume : displayVolume - prevDisplayVolume;
          const standardSegmentVolume = mode === 'hot' ? STANDARD_SEGMENTS.hot[index] : STANDARD_SEGMENTS.cold[coldScheme][index];
          const adjustment = Math.round(segmentVolume - standardSegmentVolume);
          
          return (
              <div key={index} className="relative group">
                {/* 卡片背景光暈 */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative backdrop-blur-xl bg-gradient-to-br from-surface/90 via-surface/70 to-surface/90 border-2 border-white/20 rounded-2xl p-4 sm:p-5 md:p-6 shadow-2xl overflow-hidden">
                  {/* 流動背景效果 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-cyan-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient bg-[length:200%_100%]"></div>
                  
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 relative z-10">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="relative group/icon">
                        {mode === 'hot' ? (
                          <>
                            <div className="absolute inset-0 rounded-lg sm:rounded-xl blur-lg group-hover/icon:bg-rose-500/30 transition-all duration-300"></div>
                            <div className="relative p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/40 shadow-lg">
                              <span className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                                {index + 1}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="absolute inset-0 rounded-lg sm:rounded-xl blur-lg group-hover/icon:bg-blue-500/30 transition-all duration-300"></div>
                            <div className="relative p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/40 shadow-lg">
                              <span className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                    {index + 1}
                              </span>
                            </div>
                          </>
                        )}
                  </div>
                  <div>
                        <h3 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-1">
                          第 {index + 1} 段注水
                        </h3>
                        <p className="text-xs sm:text-sm text-text-secondary">
                      累計標準: {standardVolume} ml
                      <span className="block sm:inline sm:ml-2">
                        單段標準: {standardSegmentVolume} ml
                      </span>
                        </p>
                  </div>
                </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="text-center">
                    <input
                      type="number"
                      value={currentVolumes[mode][index]}
                      onChange={(e) => handleDirectInput(index, e.target.value)}
                          placeholder={mode === 'hot' ? STANDARD_VOLUMES.hot[index] : STANDARD_VOLUMES.cold[coldScheme][index]}
                      step="0.1"
                          className="w-24 sm:w-32 px-3 py-2.5 text-center text-lg sm:text-xl font-bold rounded-lg bg-surface/60 border border-white/10 text-white focus:border-blue-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-colors"
                    />
                        {adjustment !== 0 && (
                          <div className={`text-xs sm:text-sm mt-1 font-medium ${
                            adjustment > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {adjustment > 0 ? `+${adjustment}` : adjustment} ml
                      </div>
                    )}
                      </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 總水量顯示 */}
        <div className="relative group mb-6 sm:mb-8">
          {/* 卡片背景光暈 */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative backdrop-blur-xl bg-gradient-to-br from-surface/90 via-surface/70 to-surface/90 border-2 border-white/20 rounded-2xl p-4 sm:p-5 md:p-6 shadow-2xl overflow-hidden">
            {/* 流動背景效果 */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-cyan-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient bg-[length:200%_100%]"></div>
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 relative z-10">
          <div>
                <div className="text-xs sm:text-sm text-text-secondary mb-1">總注水量</div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {getDisplayVolume(5)} ml
            </div>
            {(() => {
              const currentTotal = getDisplayVolume(5);
              const standardTotal = mode === 'hot' ? STANDARD_VOLUMES.hot[5] : STANDARD_VOLUMES.cold[coldScheme][5];
              const difference = Math.round(currentTotal - standardTotal);
              return difference !== 0 ? (
                    <div className={`text-sm mt-1 font-medium ${
                      difference > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {difference > 0 ? `+${difference}` : difference} ml
                </div>
              ) : null;
            })()}
          </div>
              <div className="text-right">
                <div className="text-xs sm:text-sm text-text-secondary mb-1">標準總量</div>
                <div className="text-xl sm:text-2xl font-medium">
              {mode === 'hot' ? STANDARD_VOLUMES.hot[5] : STANDARD_VOLUMES.cold[coldScheme][5]} ml
            </div>
                <div className={`text-xs mt-2 px-3 py-1 rounded-full w-fit ml-auto ${
                  mode === 'hot' 
                ? 'bg-rose-500/10 text-rose-400' 
                : 'bg-blue-500/10 text-blue-400'
                }`}>
              {mode === 'hot' ? '熱手沖' : '冰手沖'}
            </div>
          </div>
        </div>
      </div>
        </div>

        {/* 調整建議區塊 */}
        <div className="relative group">
          {/* 卡片背景光暈 */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative backdrop-blur-xl bg-gradient-to-br from-surface/90 via-surface/70 to-surface/90 border-2 border-white/20 rounded-2xl p-4 sm:p-5 md:p-6 shadow-2xl overflow-hidden">
            {/* 流動背景效果 */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-cyan-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient bg-[length:200%_100%]"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4 sm:mb-5">
                <div className={`w-1 h-5 sm:h-6 rounded-full ${
                  mode === 'hot' ? 'bg-rose-400' : 'bg-blue-400'
                }`} />
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  需調整水量
                </h2>
              </div>

              <div className="grid gap-2 sm:gap-3">
          {(mode === 'hot' ? STANDARD_SEGMENTS.hot : STANDARD_SEGMENTS.cold[coldScheme]).map((standardSegment, index) => {
            const displayVolume = getDisplayVolume(index);
            const prevDisplayVolume = index > 0 ? getDisplayVolume(index - 1) : 0;
            const segmentVolume = index === 0 ? displayVolume : displayVolume - prevDisplayVolume;
            const adjustment = Math.round(standardSegment - segmentVolume);
            
            if (adjustment === 0) return null;  // 只顯示需要調整的段落
            
            return (
              <div 
                key={index}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                        mode === 'hot' ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-blue-500/10 border border-blue-500/20'
                      }`}
              >
                <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          mode === 'hot' 
                            ? 'bg-rose-400/20 text-rose-400' 
                            : 'bg-blue-400/20 text-blue-400'
                        }`}>
                    {index + 1}
                  </div>
                        <span className="font-medium">第 {index + 1} 段注水</span>
                </div>
                      <span className={`text-sm px-4 py-1.5 rounded-full font-medium ${
                        adjustment > 0 
                          ? 'bg-green-400/20 text-green-400 border border-green-400/30' 
                          : 'bg-red-400/20 text-red-400 border border-red-400/30'
                      }`}>
                  {adjustment > 0 ? `+${adjustment}` : adjustment} ml
                </span>
              </div>
            );
          })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 