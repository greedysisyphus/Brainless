import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../utils/firebase';
import { weatherCategories } from '../../utils/weatherCategories';
import ResponsiveContainer, { 
  ResponsiveCard, 
  ResponsiveButton, 
  ResponsiveInput, 
  ResponsiveLabel, 
  ResponsiveTitle, 
  ResponsiveText 
} from '../common/ResponsiveContainer';

/**
 * 跑馬燈設定組件
 * 管理當前播放歌曲跑馬燈的設定
 */
const NowPlayingMarqueeSettings = () => {

  const [enabled, setEnabled] = useState(false);
  const [showOnlyNowPlaying, setShowOnlyNowPlaying] = useState(false);
  const [showOnlyNowPlayingStrict, setShowOnlyNowPlayingStrict] = useState(false); // 只有"正在播放"才顯示
  const [speed, setSpeed] = useState(60); // 預設 60 秒
  const [speedInput, setSpeedInput] = useState('60'); // 用於輸入框的臨時值
  const [weatherPhrases, setWeatherPhrases] = useState({}); // 天氣自訂用語（已保存的值）
  const [weatherPhrasesInput, setWeatherPhrasesInput] = useState({}); // 天氣自訂用語（輸入中的臨時值）
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 載入設定
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'nowPlayingMarquee', 'global'),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const speedValue = data.speed || 60;
          const phrases = data.weatherPhrases || {};
          setEnabled(data.enabled || false);
          setShowOnlyNowPlaying(data.showOnlyNowPlaying || false);
          setShowOnlyNowPlayingStrict(data.showOnlyNowPlayingStrict || false);
          setSpeed(speedValue);
          setSpeedInput(speedValue.toString());
          setWeatherPhrases(phrases);
          setWeatherPhrasesInput(phrases); // 初始化輸入值
        } else {
          // 如果文檔不存在，使用預設值
          setEnabled(false);
          setShowOnlyNowPlaying(false);
          setShowOnlyNowPlayingStrict(false);
          setSpeed(60);
          setSpeedInput('60');
          setWeatherPhrases({});
          setWeatherPhrasesInput({});
        }
        setIsLoading(false);
        setError('');
      },
      (error) => {
        console.error('載入跑馬燈設定失敗:', error);
        setError('載入設定失敗');
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // 更新設定
  const updateSettings = async (updates) => {
    try {
      setIsSaving(true);
      setError('');
      setSuccessMessage('');

      const currentData = {
        enabled: enabled,
        showOnlyNowPlaying: showOnlyNowPlaying,
        showOnlyNowPlayingStrict: showOnlyNowPlayingStrict,
        speed: speed,
        weatherPhrases: weatherPhrases,
        ...updates
      };

      await setDoc(doc(db, 'nowPlayingMarquee', 'global'), {
        ...currentData,
        lastUpdated: serverTimestamp(),
        updatedBy: auth.currentUser?.uid
      });

      setSuccessMessage('設定已更新');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('更新設定失敗:', error);
      setError('更新設定失敗');
    } finally {
      setIsSaving(false);
    }
  };


  // 處理開關變更
  const handleEnabledChange = async (newEnabled) => {
    setEnabled(newEnabled);
    await updateSettings({ enabled: newEnabled });
  };

  // 處理只顯示正在播放的變更
  const handleShowOnlyNowPlayingChange = async (newValue) => {
    setShowOnlyNowPlaying(newValue);
    await updateSettings({ showOnlyNowPlaying: newValue });
  };

  // 處理只有"正在播放"才顯示的變更
  const handleShowOnlyNowPlayingStrictChange = async (newValue) => {
    setShowOnlyNowPlayingStrict(newValue);
    await updateSettings({ showOnlyNowPlayingStrict: newValue });
  };

  // 處理速度變更（滑桿）
  const handleSpeedChange = async (newSpeed) => {
    const speedValue = Math.max(10, Math.min(300, parseInt(newSpeed) || 60)); // 限制在 10-300 秒之間
    setSpeed(speedValue);
    setSpeedInput(speedValue.toString());
    await updateSettings({ speed: speedValue });
  };

  // 處理速度輸入框變更（允許輸入，不立即保存）
  const handleSpeedInputChange = (e) => {
    setSpeedInput(e.target.value);
  };

  // 處理速度輸入框失去焦點或按 Enter（保存）
  const handleSpeedInputBlur = async () => {
    const numValue = parseInt(speedInput);
    if (!isNaN(numValue) && numValue >= 10 && numValue <= 300) {
      const speedValue = numValue;
      setSpeed(speedValue);
      await updateSettings({ speed: speedValue });
    } else {
      // 如果輸入無效，恢復為當前速度值
      setSpeedInput(speed.toString());
    }
  };

  // 處理速度輸入框按 Enter
  const handleSpeedInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.target.blur(); // 觸發 blur 事件來保存
    }
  };

  // 處理天氣自訂用語輸入變更（只更新本地狀態，不保存）
  const handleWeatherPhraseInputChange = (categoryKey, phrase) => {
    setWeatherPhrasesInput({
      ...weatherPhrasesInput,
      [categoryKey]: phrase
    });
  };

  // 處理天氣自訂用語失去焦點（保存到 Firestore）
  const handleWeatherPhraseBlur = async (categoryKey) => {
    const phrase = weatherPhrasesInput[categoryKey] || '';
    // 只有當值改變時才保存
    if (weatherPhrases[categoryKey] !== phrase) {
      const newPhrases = {
        ...weatherPhrases,
        [categoryKey]: phrase
      };
      setWeatherPhrases(newPhrases);
      await updateSettings({ weatherPhrases: newPhrases });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 狀態訊息 */}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="text-green-400">✓</div>
            <ResponsiveText color="success">{successMessage}</ResponsiveText>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="text-red-400">✗</div>
            <ResponsiveText color="danger">{error}</ResponsiveText>
          </div>
        </div>
      )}

      {/* 跑馬燈總開關 */}
      <ResponsiveCard>
        <div className="space-y-4">
          <div>
            <ResponsiveTitle level={3} className="mb-2">跑馬燈總開關</ResponsiveTitle>
            <ResponsiveText size="sm" color="secondary" className="mb-4">
              控制是否啟用跑馬燈功能
            </ResponsiveText>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleEnabledChange(e.target.checked)}
              disabled={isSaving}
              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <ResponsiveText>啟用跑馬燈顯示</ResponsiveText>
          </label>
        </div>
      </ResponsiveCard>

      {/* 播歌顯示開關 */}
      <ResponsiveCard>
        <div className="space-y-4">
          <div>
            <ResponsiveTitle level={3} className="mb-2">播歌顯示開關</ResponsiveTitle>
            <ResponsiveText size="sm" color="secondary" className="mb-4">
              控制是否在跑馬燈中顯示音樂播放資訊。即使關閉，跑馬燈仍會顯示天氣資訊。
            </ResponsiveText>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyNowPlaying}
                onChange={(e) => handleShowOnlyNowPlayingChange(e.target.checked)}
                disabled={isSaving || !enabled}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <ResponsiveText>顯示音樂播放資訊</ResponsiveText>
            </label>
            {showOnlyNowPlaying && (
              <label className="flex items-center gap-3 cursor-pointer ml-8">
                <input
                  type="checkbox"
                  checked={showOnlyNowPlayingStrict}
                  onChange={(e) => handleShowOnlyNowPlayingStrictChange(e.target.checked)}
                  disabled={isSaving || !enabled}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <ResponsiveText size="sm">只有「正在播放」時才顯示（不顯示「最近播放」）</ResponsiveText>
              </label>
            )}
          </div>
        </div>
      </ResponsiveCard>

      {/* 跑馬燈速度設定 */}
      <ResponsiveCard>
        <div className="space-y-4">
          <div>
            <ResponsiveTitle level={3} className="mb-2">跑馬燈速度</ResponsiveTitle>
            <ResponsiveText size="sm" color="secondary" className="mb-4">
              調整跑馬燈滾動速度（數值越小速度越快，建議範圍：10-300 秒）
            </ResponsiveText>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <ResponsiveLabel className="min-w-[80px]">速度（秒）</ResponsiveLabel>
              <input
                type="range"
                min="10"
                max="300"
                step="5"
                value={speed}
                onChange={(e) => handleSpeedChange(e.target.value)}
                disabled={isSaving || !enabled}
                className="flex-1 h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <input
                type="number"
                min="10"
                max="300"
                value={speedInput}
                onChange={handleSpeedInputChange}
                onBlur={handleSpeedInputBlur}
                onKeyPress={handleSpeedInputKeyPress}
                disabled={isSaving || !enabled}
                className="w-20 px-2 py-1 text-center bg-surface border border-white/10 rounded text-primary focus:outline-none focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>快速 (10秒)</span>
              <span>中等 (60秒)</span>
              <span>慢速 (300秒)</span>
            </div>
          </div>
        </div>
      </ResponsiveCard>

      {/* 天氣自訂用語設定 */}
      <ResponsiveCard>
        <div className="space-y-4">
          <div>
            <ResponsiveTitle level={3} className="mb-2">天氣自訂用語</ResponsiveTitle>
            <ResponsiveText size="sm" color="secondary" className="mb-4">
              根據不同天氣狀況設定自訂用語，會顯示在跑馬燈的天氣資訊後面。每種天氣可以設定多個用語（用換行分隔），每次會隨機顯示其中一個。
            </ResponsiveText>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
              <ResponsiveText size="xs" color="secondary">
                <strong>注意：</strong>天氣數據來源為<strong>桃園機場</strong>（經緯度：25.0797°N, 121.2342°E），自訂用語會根據桃園機場的實際天氣狀況顯示。
              </ResponsiveText>
            </div>
          </div>
          <div className="space-y-4">
            {weatherCategories.map((category) => (
              <div key={category.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <ResponsiveLabel className="min-w-[100px]">{category.label}</ResponsiveLabel>
                  <span className="text-xs text-text-secondary">{category.description}</span>
                </div>
                <textarea
                  value={weatherPhrasesInput[category.key] || ''}
                  onChange={(e) => handleWeatherPhraseInputChange(category.key, e.target.value)}
                  onBlur={() => handleWeatherPhraseBlur(category.key)}
                  disabled={isSaving || !enabled}
                  placeholder={`例如：今天不順，真的不能怪天氣\n或者：天氣真好，適合出門走走`}
                  rows={3}
                  className="w-full px-3 py-2 bg-surface border border-white/10 rounded text-primary placeholder-text-secondary focus:outline-none focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed resize-y"
                />
                <ResponsiveText size="xs" color="secondary" className="mt-1">
                  每行一個用語，會隨機選擇其中一個顯示
                </ResponsiveText>
              </div>
            ))}
          </div>
        </div>
      </ResponsiveCard>

    </div>
  );
};

export default NowPlayingMarqueeSettings;
