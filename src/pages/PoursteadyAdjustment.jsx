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
  hot: [40, 38, 42, 42, 38, 30],
  cold: [40, 18, 22, 22, 18, 30]
};

export default function PoursteadyAdjustment() {
  const [mode, setMode] = useState('hot');
  const [currentVolumes, setCurrentVolumes] = useState({
    hot: [...STANDARD_VOLUMES.hot],
    cold: [...STANDARD_VOLUMES.cold]
  });
  
  const [adjustments, setAdjustments] = useState({
    hot: Array(6).fill(0),
    cold: Array(6).fill(0)
  });

  const handleAdjustment = (index, value) => {
    const newAdjustments = [...adjustments[mode]];
    newAdjustments[index] = Math.round(value);
    
    const newVolumes = [...currentVolumes[mode]];
    newVolumes[index] = STANDARD_VOLUMES[mode][index] + newAdjustments[index];

    setAdjustments({
      ...adjustments,
      [mode]: newAdjustments
    });

    setCurrentVolumes({
      ...currentVolumes,
      [mode]: newVolumes
    });
  };

  const handleDirectInput = (index, value) => {
    const newVolumes = [...currentVolumes[mode]];
    const newValue = value === '' ? STANDARD_VOLUMES[mode][index] : Number(value);
    newVolumes[index] = newValue;

    const newAdjustments = [...adjustments[mode]];
    newAdjustments[index] = Math.round(newValue - STANDARD_VOLUMES[mode][index]);

    setCurrentVolumes({
      ...currentVolumes,
      [mode]: newVolumes
    });

    setAdjustments({
      ...adjustments,
      [mode]: newAdjustments
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <WaterDropIcon className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Poursteady 注水量調整</h1>
      </div>
      
      {/* 模式切換 */}
      <div className="flex gap-3 bg-surface/30 p-1.5 rounded-xl w-fit">
        <button
          onClick={() => setMode('hot')}
          className={`
            px-6 py-2.5 rounded-lg font-medium
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
            px-6 py-2.5 rounded-lg font-medium
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
        {STANDARD_VOLUMES[mode].map((standardVolume, index) => (
          <div 
            key={index}
            className={`
              bg-gradient-to-br from-surface/30 to-surface/20
              rounded-xl p-5 space-y-4 border border-white/5
              transition-all duration-300 hover:shadow-lg
              ${mode === 'hot' ? 'hover:border-rose-500/20' : 'hover:border-blue-500/20'}
            `}
          >
            <div className="flex justify-between items-center">
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
                    標準: {standardVolume} ml
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex-1">
                <input
                  type="range"
                  min={-10}
                  max={10}
                  value={adjustments[mode][index]}
                  onChange={(e) => handleAdjustment(index, Number(e.target.value))}
                  className={`
                    w-full appearance-none h-1.5 rounded-full bg-white/10
                    [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:cursor-pointer
                    ${mode === 'hot'
                      ? '[&::-webkit-slider-thumb]:bg-rose-500'
                      : '[&::-webkit-slider-thumb]:bg-blue-500'
                    }
                  `}
                />
                <div className="flex justify-between text-sm text-text-secondary mt-2">
                  <span>-10 ml</span>
                  <span>0</span>
                  <span>+10 ml</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAdjustment(index, adjustments[mode][index] - 1)}
                  className={`
                    p-2 rounded-lg hover:bg-white/5
                    transition-colors duration-200
                    ${adjustments[mode][index] <= -10 ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  disabled={adjustments[mode][index] <= -10}
                >
                  <ArrowDownIcon className="w-4 h-4" />
                </button>
                
                <div className="w-32 text-center">
                  <input
                    type="number"
                    value={currentVolumes[mode][index]}
                    onChange={(e) => handleDirectInput(index, e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        handleDirectInput(index, STANDARD_VOLUMES[mode][index]);
                      }
                    }}
                    step="0.1"
                    className={`
                      w-24 text-center rounded-lg px-2 py-1.5 text-lg font-bold
                      bg-white/5 border border-white/10 focus:outline-none
                      focus:ring-1 ${mode === 'hot' ? 'focus:ring-rose-500' : 'focus:ring-blue-500'}
                    `}
                  />
                  <div className={`text-xs mt-1 ${
                    adjustments[mode][index] > 0 ? 'text-green-400' :
                    adjustments[mode][index] < 0 ? 'text-red-400' :
                    'text-text-secondary'
                  }`}>
                    {adjustments[mode][index] > 0 ? `+${adjustments[mode][index]}` : adjustments[mode][index]} ml
                  </div>
                </div>
                
                <button
                  onClick={() => handleAdjustment(index, adjustments[mode][index] + 1)}
                  className={`
                    p-2 rounded-lg hover:bg-white/5
                    transition-colors duration-200
                    ${adjustments[mode][index] >= 10 ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  disabled={adjustments[mode][index] >= 10}
                >
                  <ArrowUpIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 總水量顯示 */}
      <div className={`
        bg-gradient-to-br from-surface/30 to-surface/20
        rounded-xl p-5 border border-white/5
        ${mode === 'hot' ? 'hover:border-rose-500/20' : 'hover:border-blue-500/20'}
      `}>
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm text-text-secondary">總注水量</div>
            <div className="text-3xl font-bold mt-1">
              {Math.round(currentVolumes[mode].reduce((a, b) => a + b, 0))} ml
            </div>
            {(() => {
              const currentTotal = Math.round(currentVolumes[mode].reduce((a, b) => a + b, 0));
              const standardTotal = STANDARD_VOLUMES[mode].reduce((a, b) => a + b, 0);
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
          <div className="text-right">
            <div className="text-sm text-text-secondary">標準總量</div>
            <div className="text-xl mt-1">
              {STANDARD_VOLUMES[mode].reduce((a, b) => a + b, 0)} ml
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
    </div>
  );
} 