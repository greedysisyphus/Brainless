import { useState } from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

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
  cold: [40, 58, 80, 102, 120, 150]   // 改為累計水量
};

const STANDARD_SEGMENTS = {  // 新增：每段實際注水量
  hot: [40, 38, 42, 42, 38, 30],
  cold: [40, 18, 22, 22, 18, 30]
};

export default function PoursteadyAdjustment() {
  const [mode, setMode] = useState('hot');
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
    const standardSegments = STANDARD_SEGMENTS[mode];
    return segments.map((vol, index) => 
      Math.round(vol - standardSegments[index])
    );
  };

  // 修改處理輸入的函數
  const handleDirectInput = (index, value) => {
    const newVolumes = [...currentVolumes[mode]];
    newVolumes[index] = value;  // 直接存儲輸入值，不轉換

    // 計算實際水量用於顯示
    const actualVolumes = newVolumes.map((vol, i) => 
      vol === '' ? STANDARD_VOLUMES[mode][i] : Number(vol)
    );

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

  // 獲取顯示用的水量（空值顯示標準值）
  const getDisplayVolume = (index) => {
    const value = currentVolumes[mode][index];
    return value === '' ? STANDARD_VOLUMES[mode][index] : Number(value);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 sm:space-y-8">
      {/* 標題區域 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <WaterDropIcon className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">Poursteady 注水量調整</h1>
        </div>
        <button
          onClick={handleReset}
          className={`
            w-full sm:w-auto px-4 py-2 rounded-lg font-medium
            transition-all duration-200
            border border-white/10
            hover:bg-white/5
          `}
        >
          重設
        </button>
      </div>
      
      {/* 模式切換 */}
      <div className="flex gap-2 bg-surface/30 p-1.5 rounded-xl w-full sm:w-fit">
        <button
          onClick={() => setMode('hot')}
          className={`
            flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg font-medium
            transition-all duration-200
            ${mode === 'hot' 
              ? 'bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/20' 
              : 'text-text-secondary hover:bg-white/5'
            }
          `}
        >
          熱手沖
        </button>
        <button
          onClick={() => setMode('cold')}
          className={`
            flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg font-medium
            transition-all duration-200
            ${mode === 'cold' 
              ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20' 
              : 'text-text-secondary hover:bg-white/5'
            }
          `}
        >
          冰手沖
        </button>
      </div>

      {/* 注水量調整表 */}
      <div className="grid gap-4">
        {STANDARD_VOLUMES[mode].map((standardVolume, index) => {
          const displayVolume = getDisplayVolume(index);
          const prevDisplayVolume = index > 0 ? getDisplayVolume(index - 1) : 0;
          const segmentVolume = index === 0 ? displayVolume : displayVolume - prevDisplayVolume;
          const standardSegmentVolume = STANDARD_SEGMENTS[mode][index];
          const adjustment = Math.round(segmentVolume - standardSegmentVolume);
          
          return (
            <div 
              key={index}
              className={`
                bg-gradient-to-br from-surface/30 to-surface/20
                rounded-xl p-5 space-y-4 border border-white/5
                transition-all duration-300 hover:shadow-lg
                ${mode === 'hot' ? 'hover:border-rose-500/20' : 'hover:border-blue-500/20'}
              `}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold
                    ${mode === 'hot' 
                      ? 'bg-gradient-to-br from-rose-400/20 to-amber-400/20 text-rose-400'
                      : 'bg-gradient-to-br from-blue-400/20 to-cyan-400/20 text-blue-400'
                    }
                  `}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">第 {index + 1} 段注水</div>
                    <div className="text-sm text-text-secondary">
                      累計標準: {standardVolume} ml
                      <span className="block sm:inline sm:ml-2">
                        單段標準: {standardSegmentVolume} ml
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <div className="w-full sm:w-32 text-center">
                    <input
                      type="number"
                      value={currentVolumes[mode][index]}
                      onChange={(e) => handleDirectInput(index, e.target.value)}
                      placeholder={STANDARD_VOLUMES[mode][index]}
                      step="0.1"
                      className={`
                        w-full sm:w-24 text-center rounded-lg px-2 py-1.5 text-lg font-bold
                        bg-white/5 border border-white/10 focus:outline-none
                        focus:ring-1 ${mode === 'hot' ? 'focus:ring-rose-500' : 'focus:ring-blue-500'}
                      `}
                    />
                    {adjustment !== 0 && (  // 只在有調整時顯示差異
                      <div className={`text-xs mt-1 ${
                        adjustment > 0 ? 'text-green-400' :
                        'text-red-400'
                      }`}>
                        {adjustment > 0 ? `+${adjustment}` : adjustment} ml
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 總水量顯示 */}
      <div className={`
        bg-gradient-to-br from-surface/30 to-surface/20
        rounded-xl p-5 border border-white/5
        ${mode === 'hot' ? 'hover:border-rose-500/20' : 'hover:border-blue-500/20'}
      `}>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="text-sm text-text-secondary">總注水量</div>
            <div className="text-2xl sm:text-3xl font-bold mt-1">
              {getDisplayVolume(5)} ml
            </div>
            {(() => {
              const currentTotal = getDisplayVolume(5);
              const standardTotal = STANDARD_VOLUMES[mode][5];
              const difference = Math.round(currentTotal - standardTotal);
              return difference !== 0 ? (
                <div className={`text-sm mt-1 ${
                  difference > 0 ? 'text-green-400' :
                  'text-red-400'
                }`}>
                  {difference > 0 ? `+${difference}` : difference} ml
                </div>
              ) : null;
            })()}
          </div>
          <div className="text-right w-full sm:w-auto">
            <div className="text-sm text-text-secondary">標準總量</div>
            <div className="text-xl mt-1">
              {STANDARD_VOLUMES[mode][5]} ml
            </div>
            <div className={`
              text-xs mt-2 px-2 py-1 rounded-full w-fit ml-auto
              ${mode === 'hot' 
                ? 'bg-rose-500/10 text-rose-400' 
                : 'bg-blue-500/10 text-blue-400'
              }
            `}>
              {mode === 'hot' ? '熱手沖' : '冰手沖'}
            </div>
          </div>
        </div>
      </div>

      {/* 調整建議區塊 */}
      <div className="grid gap-2">
        {STANDARD_SEGMENTS[mode].map((standardSegment, index) => {
          const displayVolume = getDisplayVolume(index);
          const prevDisplayVolume = index > 0 ? getDisplayVolume(index - 1) : 0;
          const segmentVolume = index === 0 ? displayVolume : displayVolume - prevDisplayVolume;
          const adjustment = Math.round(standardSegment - segmentVolume);
          
          if (adjustment === 0) return null;  // 只顯示需要調整的段落
          
          return (
            <div 
              key={index}
              className={`
                flex items-center justify-between
                px-4 py-2 rounded-lg
                ${mode === 'hot' ? 'bg-rose-500/5' : 'bg-blue-500/5'}
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`
                  w-6 h-6 rounded-full 
                  flex items-center justify-center 
                  text-sm font-medium
                  ${mode === 'hot' 
                    ? 'bg-rose-400/10 text-rose-400' 
                    : 'bg-blue-400/10 text-blue-400'
                  }
                `}>
                  {index + 1}
                </div>
                <span>第 {index + 1} 段注水</span>
              </div>
              <span className={`
                text-sm px-3 py-1 rounded-full font-medium
                ${adjustment > 0 
                  ? 'bg-green-400/10 text-green-400' 
                  : 'bg-red-400/10 text-red-400'
                }
              `}>
                {adjustment > 0 ? `+${adjustment}` : adjustment} ml
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
} 