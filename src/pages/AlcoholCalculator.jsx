import { useState } from 'react';
import { PlusIcon, XMarkIcon, BeakerIcon } from '@heroicons/react/24/outline';

// 添加自定義雞尾酒圖示
function CocktailIcon(props) {
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
        d="M12 20v-7m0 0l6-6.5H6L12 13zm-4-9h8m-8 0l-2-2m10 2l2-2" 
      />
    </svg>
  );
}

function AlcoholCalculator() {
  const [liquors, setLiquors] = useState([
    { volume: '', concentration: '', unit: 'ml', id: Date.now() }
  ]);
  const [ice, setIce] = useState({
    method: 'volume', // 'volume' 或 'cubes'
    volume: '', // 直接輸入體積
    cubes: '', // 冰塊數量
    cubeWeight: '', // 改為空字串
  });
  const [result, setResult] = useState(null);
  // 添加單位切換狀態
  const [unit, setUnit] = useState('ml'); // 'shot' 或 'ml'

  // 單位轉換函數
  const convertValue = (value, fromUnit, toUnit) => {
    if (!value) return '';
    const val = parseFloat(value);
    if (fromUnit === toUnit) return val;
    return fromUnit === 'shot' ? (val * 30) : (val / 30);
  };

  // 切換單位時轉換所有數值
  const toggleUnit = () => {
    const newUnit = unit === 'shot' ? 'ml' : 'shot';
    // 轉換所有酒的容量
    setLiquors(liquors.map(liquor => ({
      ...liquor,
      unit: newUnit,
      volume: convertValue(liquor.volume, liquor.unit, newUnit).toString()
    })));
    // 轉換融冰容量
    setIce(ice => ({
      ...ice,
      volume: convertValue(ice.volume, unit, newUnit).toString(),
      cubes: convertValue(ice.cubes, unit, newUnit).toString(),
      cubeWeight: convertValue(ice.cubeWeight, unit, newUnit).toString()
    }));
    setUnit(newUnit);
  };

  // 添加新的酒
  const addLiquor = () => {
    setLiquors([...liquors, { volume: '', concentration: '', unit: 'ml', id: Date.now() }]);
  };

  // 移除酒
  const removeLiquor = (id) => {
    if (liquors.length > 1) {
      setLiquors(liquors.filter(liquor => liquor.id !== id));
    }
  };

  // 更新酒的數值
  const updateLiquor = (id, field, value) => {
    setLiquors(liquors.map(liquor => 
      liquor.id === id ? { ...liquor, [field]: value } : liquor
    ));
  };

  // 更新單個酒的單位
  const toggleLiquorUnit = (id) => {
    setLiquors(liquors.map(liquor => {
      if (liquor.id !== id) return liquor;
      const newUnit = liquor.unit === 'shot' ? 'ml' : 'shot';
      return {
        ...liquor,
        unit: newUnit,
        volume: convertValue(liquor.volume, liquor.unit, newUnit).toString()
      };
    }));
  };

  // 計算結果
  const calculate = () => {
    const totalAlcohol = liquors.reduce((sum, { volume, concentration, unit }) => {
      const v = parseFloat(volume) || 0;
      const actualVolume = unit === 'shot' ? v * 30 : v;
      const c = parseFloat(concentration) || 0;
      return sum + (actualVolume * (c / 100));
    }, 0);

    const totalVolume = liquors.reduce((sum, { volume, unit }) => {
      const v = parseFloat(volume) || 0;
      return sum + (unit === 'shot' ? v * 30 : v);
    }, 0);

    // 計算融冰體積
    let meltedIceVolume = 0;
    if (ice.method === 'volume') {
      meltedIceVolume = parseFloat(ice.volume) || 0;
    } else {
      const cubes = parseFloat(ice.cubes) || 0;
      const weight = parseFloat(ice.cubeWeight) || 0;
      meltedIceVolume = cubes * weight; // 1g = 1ml
    }

    const finalVolume = totalVolume + meltedIceVolume;
    const finalConcentration = (totalAlcohol / finalVolume) * 100;

    setResult({
      originalConcentration: (totalAlcohol / totalVolume) * 100,
      finalConcentration,
      totalVolume: finalVolume,
      pureAlcohol: totalAlcohol,
      meltedIceVolume
    });
  };

  // 添加重設函數
  const resetAll = () => {
    setLiquors([{ volume: '', concentration: '', unit: 'ml', id: Date.now() }]);
    setIce({
      method: 'volume',
      volume: '',
      cubes: '',
      cubeWeight: '',
    });
    setResult(null);
  };

  return (
    <div className="container-custom py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-surface rounded-2xl p-6 shadow-xl">
          {/* 修改標題圖示 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                <CocktailIcon className="w-8 h-8 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                酒精濃度計算器
              </h1>
            </div>
          </div>

          {/* 主要內容區塊 */}
          <div className="space-y-8">
            {/* 酒類輸入區域 */}
            <div className="bg-white/5 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-blue-400 rounded-full"></span>
                酒類清單
              </h2>
              
              {/* 酒的輸入列表 */}
              <div className="space-y-4">
                {liquors.map((liquor, index) => (
                  <div 
                    key={liquor.id} 
                    className="bg-white/5 rounded-lg p-4 transition-all duration-200 hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-blue-400">酒類 {index + 1}</div>
                      {liquors.length > 1 && (
                        <button
                          onClick={() => removeLiquor(liquor.id)}
                          className="p-1 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-sm text-text-secondary">容量</label>
                          <button
                            onClick={() => toggleLiquorUnit(liquor.id)}
                            className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 
                                     hover:bg-blue-500/20 transition-colors text-blue-400"
                          >
                            {liquor.unit === 'shot' ? 'ml' : 'shot'}
                          </button>
                        </div>
                        <input
                          type="number"
                          value={liquor.volume}
                          onChange={(e) => updateLiquor(liquor.id, 'volume', e.target.value)}
                          className="input-field w-full"
                          placeholder={liquor.unit === 'shot' ? "1 shot = 30ml" : "輸入毫升"}
                          min="0"
                          step={liquor.unit === 'shot' ? "0.5" : "1"}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-text-secondary mb-1">濃度 (%)</label>
                        <input
                          type="number"
                          value={liquor.concentration}
                          onChange={(e) => updateLiquor(liquor.id, 'concentration', e.target.value)}
                          className="input-field w-full"
                          placeholder="輸入濃度"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 添加酒按鈕 */}
              <button
                onClick={addLiquor}
                className="w-full py-3 rounded-lg border-2 border-dashed border-blue-500/30
                         hover:bg-blue-500/5 text-blue-400
                         transition-all duration-200 group"
              >
                <div className="flex items-center justify-center gap-2">
                  <PlusIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">添加酒類</span>
                </div>
              </button>
            </div>

            {/* 融冰計算區域 */}
            <div className="bg-white/5 rounded-xl p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-blue-400 rounded-full"></span>
                融冰計算
              </h2>

              <div className="space-y-4">
                {/* 計算方式選擇 */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setIce(ice => ({ ...ice, method: 'volume' }))}
                    className={`p-3 rounded-lg transition-all duration-200 ${
                      ice.method === 'volume' 
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                        : 'bg-white/5 hover:bg-white/10 text-text-secondary'
                    }`}
                  >
                    <div className="text-sm font-medium">直接輸入體積</div>
                    <div className="text-xs mt-1 opacity-60">手動輸入融冰量</div>
                  </button>
                  <button
                    onClick={() => setIce(ice => ({ ...ice, method: 'cubes' }))}
                    className={`p-3 rounded-lg transition-all duration-200 ${
                      ice.method === 'cubes'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-white/5 hover:bg-white/10 text-text-secondary'
                    }`}
                  >
                    <div className="text-sm font-medium">計算冰塊體積</div>
                    <div className="text-xs mt-1 opacity-60">根據冰塊計算</div>
                  </button>
                </div>

                {/* 輸入區域 */}
                <div className="bg-white/5 rounded-lg p-4">
                  {ice.method === 'volume' ? (
                    <div>
                      <label className="block text-sm text-text-secondary mb-2">
                        融冰體積 (ml)
                      </label>
                      <input
                        type="number"
                        value={ice.volume}
                        onChange={(e) => setIce(ice => ({ ...ice, volume: e.target.value }))}
                        className="input-field w-full"
                        placeholder="輸入預計融化的體積"
                        min="0"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-text-secondary mb-2">
                            冰塊數量
                          </label>
                          <input
                            type="number"
                            value={ice.cubes}
                            onChange={(e) => setIce(ice => ({ ...ice, cubes: e.target.value }))}
                            className="input-field w-full"
                            placeholder="輸入數量"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-text-secondary mb-2">
                            每個冰塊重量 (g)
                          </label>
                          <input
                            type="number"
                            value={ice.cubeWeight}
                            onChange={(e) => setIce(ice => ({ ...ice, cubeWeight: e.target.value }))}
                            className="input-field w-full"
                            placeholder="輸入冰塊重量"
                            min="0"
                          />
                        </div>
                      </div>
                      {ice.cubes && ice.cubeWeight && (
                        <div className="text-sm bg-blue-500/10 text-blue-400 rounded-lg p-3">
                          預計融化體積：{(parseFloat(ice.cubes) * parseFloat(ice.cubeWeight)).toFixed(0)} ml
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-4">
              <button
                onClick={calculate}
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500
                         text-white font-medium shadow-lg shadow-blue-500/25
                         hover:shadow-xl hover:shadow-blue-500/40 
                         transition-all duration-200"
              >
                計算結果
              </button>
              <button
                onClick={resetAll}
                className="flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 
                         text-text-secondary transition-all duration-200"
              >
                重設
              </button>
            </div>

            {/* 結果顯示 */}
            {result && (
              <div className="grid grid-cols-2 gap-4 animate-fade-in">
                <div className="col-span-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg p-4">
                  <div className="text-sm text-gray-300">
                    {result.meltedIceVolume > 0 ? '加入融冰後濃度' : '酒精濃度'}
                  </div>
                  <div className="text-3xl font-bold text-blue-400 mt-1">
                    {result.finalConcentration.toFixed(2)}%
                  </div>
                  {result.meltedIceVolume > 0 && (
                    <div className="text-sm text-gray-300 mt-2">
                      調酒前濃度：{result.originalConcentration.toFixed(2)}%
                    </div>
                  )}
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-text-secondary">總容量</div>
                  <div className="text-xl font-bold mt-1">
                    {unit === 'shot' 
                      ? `${(result.totalVolume / 30).toFixed(1)} shot`
                      : `${result.totalVolume.toFixed(0)} ml`
                    }
                  </div>
                  <div className="text-sm text-text-secondary mt-1">
                    {unit === 'shot' 
                      ? `${result.totalVolume.toFixed(0)} ml`
                      : `${(result.totalVolume / 30).toFixed(1)} shot`
                    }
                  </div>
                  {result.meltedIceVolume > 0 && (
                    <div className="text-sm text-text-secondary mt-1">
                      含融冰：{result.meltedIceVolume.toFixed(0)} ml
                    </div>
                  )}
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-text-secondary">純酒精含量</div>
                  <div className="text-xl font-bold mt-1">
                    {unit === 'shot'
                      ? `${(result.pureAlcohol / 30).toFixed(1)} shot`
                      : `${result.pureAlcohol.toFixed(0)} ml`
                    }
                  </div>
                  <div className="text-sm text-text-secondary mt-1">
                    {unit === 'shot'
                      ? `${result.pureAlcohol.toFixed(0)} ml`
                      : `${(result.pureAlcohol / 30).toFixed(1)} shot`
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlcoholCalculator; 