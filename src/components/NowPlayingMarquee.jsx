import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { MusicalNoteIcon } from '@heroicons/react/24/outline';
import { getRecentTracks } from '../utils/lastfm';
import { getWeatherForecast, getWeatherInfo } from '../utils/weather';
import { getWeatherCategoryKey } from '../utils/weatherCategories';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';

// 桃園機場的經緯度
const TAOYUAN_AIRPORT_LAT = 25.0797;
const TAOYUAN_AIRPORT_LON = 121.2342;

/**
 * 當前播放歌曲跑馬燈組件
 * 顯示在網頁最上方，從左到右滾動顯示當前播放的歌曲
 */
const NowPlayingMarquee = () => {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    showOnlyNowPlaying: false,
    showOnlyNowPlayingStrict: false, // 只有"正在播放"才顯示
    speed: 60, // 預設 60 秒
    weatherPhrases: {} // 天氣自訂用語
  });
  const marqueeRef = useRef(null);
  const intervalRef = useRef(null);
  const weatherIntervalRef = useRef(null);

  // 獲取天氣數據（桃園機場）
  const fetchWeather = useCallback(async () => {
    setWeatherLoading(true);
    try {
      const data = await getWeatherForecast(TAOYUAN_AIRPORT_LAT, TAOYUAN_AIRPORT_LON);
      setWeather(data);
    } catch (err) {
      console.error('獲取天氣數據失敗:', err);
      // 不設置錯誤狀態，避免影響跑馬燈顯示
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // 獲取當前播放的歌曲
  const fetchNowPlaying = useCallback(async () => {
    if (!settings.showOnlyNowPlaying) {
      setNowPlaying(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      const data = await getRecentTracks(1);
      const tracks = data?.recenttracks?.track || [];
      const track = Array.isArray(tracks) ? tracks[0] : tracks;
      
      if (track && track['@attr']?.nowplaying === 'true') {
        const newTrack = {
          name: track.name,
          artist: track.artist?.['#text'] || track.artist?.name || 'Unknown Artist',
          image: track.image?.[2]?.['#text'] || track.image?.[3]?.['#text'] || null
        };
        setNowPlaying(prev => {
          if (prev && prev.name === newTrack.name && prev.artist === newTrack.artist) {
            return prev;
          }
          return newTrack;
        });
        setError(null);
      } else if (track && track.name) {
        const newTrack = {
          name: track.name,
          artist: track.artist?.['#text'] || track.artist?.name || 'Unknown Artist',
          image: track.image?.[2]?.['#text'] || track.image?.[3]?.['#text'] || null,
          isRecent: true
        };
        setNowPlaying(prev => {
          if (prev && prev.name === newTrack.name && prev.artist === newTrack.artist) {
            return prev;
          }
          return newTrack;
        });
        setError(null);
      } else {
        setNowPlaying(null);
        setError(null);
      }
    } catch (err) {
      setError(err.message);
      setNowPlaying(prev => prev || null);
    } finally {
      setIsLoading(false);
    }
  }, [settings.showOnlyNowPlaying]);

  // 載入跑馬燈設定
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'nowPlayingMarquee', 'global'),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setSettings({
            enabled: data.enabled || false,
            showOnlyNowPlaying: data.showOnlyNowPlaying || false,
            showOnlyNowPlayingStrict: data.showOnlyNowPlayingStrict || false,
            speed: data.speed || 60,
            weatherPhrases: data.weatherPhrases || {}
          });
        } else {
          setSettings({
            enabled: false,
            showOnlyNowPlaying: false,
            showOnlyNowPlayingStrict: false,
            speed: 60,
            weatherPhrases: {}
          });
        }
      },
      (error) => {
        console.error('載入跑馬燈設定失敗:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // 初始化載入和定期更新
  useEffect(() => {
    if (!settings.enabled) {
      setIsLoading(false);
      setNowPlaying(null);
      return;
    }

    fetchNowPlaying();
    fetchWeather(); // 立即載入天氣

    intervalRef.current = setInterval(() => {
      fetchNowPlaying();
    }, 10000);

    // 每 30 分鐘更新一次天氣
    weatherIntervalRef.current = setInterval(() => {
      fetchWeather();
    }, 1800000); // 30 分鐘

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (weatherIntervalRef.current) {
        clearInterval(weatherIntervalRef.current);
        weatherIntervalRef.current = null;
      }
    };
  }, [settings.enabled, fetchNowPlaying, fetchWeather]);

  // 構建顯示文字（音樂和天氣交替）
  const displayText = useMemo(() => {
    // 構建音樂文字
    let musicText = '';
    if (settings.showOnlyNowPlaying && nowPlaying) {
      // 如果開啟了嚴格模式，只有"正在播放"才顯示
      if (settings.showOnlyNowPlayingStrict && nowPlaying.isRecent) {
        musicText = ''; // 不顯示最近播放
      } else {
        if (nowPlaying.isRecent) {
          musicText = `最近播放: ${nowPlaying.artist} - ${nowPlaying.name}`;
        } else {
          musicText = `♪ 正在播放: ${nowPlaying.artist} - ${nowPlaying.name} ♪`;
        }
      }
    }

    // 構建天氣文字
    let weatherText = '';
    if (weather && weather.current) {
      const temp = Math.round(weather.current.temperature_2m);
      const humidity = weather.current.relative_humidity_2m;
      const weatherCode = weather.current.weather_code;
      
      // 獲取天氣描述
      const weatherInfo = getWeatherInfo(weatherCode);
      const weatherDescription = weatherInfo.description || '未知';

      // 計算今天的日期索引（只計算一次）
      const today = new Date().toISOString().split('T')[0];
      let todayIndex = -1;
      if (weather.daily && weather.daily.time) {
        todayIndex = weather.daily.time.findIndex(date => date.startsWith(today));
      }

      // 獲取下雨機率或降雨量（只計算一次）
      let precipitationProb = null;
      let precipitationSum = null;
      
      if (todayIndex >= 0) {
        if (weather.daily.precipitation_probability_max && weather.daily.precipitation_probability_max[todayIndex] !== undefined) {
          precipitationProb = weather.daily.precipitation_probability_max[todayIndex];
        }
        if (weather.daily.precipitation_sum && weather.daily.precipitation_sum[todayIndex] !== undefined) {
          precipitationSum = weather.daily.precipitation_sum[todayIndex];
        }
      }

      // 根據天氣代碼獲取對應的自訂用語（隨機選擇一個）
      let customPhrase = '';
      if (settings.weatherPhrases) {
        const categoryKey = getWeatherCategoryKey(weatherCode);
        if (categoryKey) {
          const phrases = settings.weatherPhrases[categoryKey];
          if (phrases) {
            // 按換行符分割，過濾空行，隨機選擇一個
            const phraseList = phrases
              .split('\n')
              .map(p => p.trim())
              .filter(p => p.length > 0);
            
            if (phraseList.length > 0) {
              // 隨機選擇一個用語
              const randomIndex = Math.floor(Math.random() * phraseList.length);
              customPhrase = phraseList[randomIndex];
            }
          }
        }
      }

      // 組合天氣文字：自訂用語 ｜ 圖標+天氣描述 ｜ 溫度 · 雨機率 · 濕度
      const weatherParts = [];
      
      // 第一部分：自訂用語
      if (customPhrase) {
        weatherParts.push(customPhrase);
      }
      
      // 第二部分：天氣圖標和描述
      const weatherIcon = weatherInfo.icon || '☁️';
      weatherParts.push(`${weatherIcon} ${weatherDescription}`);
      
      // 第三部分：數值資訊（溫度 · 雨機率 · 濕度）
      const valueParts = [];
      valueParts.push(`${temp}°C`);
      
      // 雨量資訊標籤（使用已計算的值）
      let rainLabel = '';
      if (precipitationProb !== null) {
        rainLabel = `下雨機率${precipitationProb}%`;
      } else if (precipitationSum !== null && precipitationSum > 0) {
        rainLabel = `下雨機率${precipitationSum.toFixed(1)}mm`;
      } else {
        rainLabel = '下雨機率0%';
      }
      valueParts.push(rainLabel);
      valueParts.push(`濕度${humidity}%`);
      
      weatherParts.push(valueParts.join(' · '));
      
      // 用 ｜ 分隔主要區塊
      weatherText = weatherParts.join(' ｜ ');
    } else {
      weatherText = '載入天氣中...';
    }

    // 組合：音樂 ｜ 天氣 ｜ 音樂 ｜ 天氣
    // 如果沒有音樂文字，只顯示天氣
    if (musicText) {
      return `${musicText} ｜ ${weatherText} ｜`;
    } else {
      return `${weatherText} ｜`;
    }
  }, [
    nowPlaying?.name, 
    nowPlaying?.artist, 
    nowPlaying?.isRecent, 
    settings.showOnlyNowPlaying, 
    settings.showOnlyNowPlayingStrict, 
    settings.weatherPhrases, 
    weather?.current?.temperature_2m,
    weather?.current?.relative_humidity_2m,
    weather?.current?.weather_code,
    weather?.daily?.precipitation_probability_max,
    weather?.daily?.precipitation_sum,
    weather?.daily?.time
  ]);

  // 生成重複元素
  const marqueeItems = useMemo(() => {
    return Array.from({ length: 30 }, (_, index) => index);
  }, []);

  // 如果未啟用，不顯示跑馬燈
  if (!settings.enabled) {
    return null;
  }

  // 如果開啟了音樂顯示，但沒有音樂資訊且還在載入中，等待載入完成
  if (settings.showOnlyNowPlaying && !nowPlaying && isLoading) {
    return null;
  }

  // 注意：即使開啟了嚴格模式且沒有正在播放的歌曲，也應該顯示天氣資訊
  // 所以這裡不返回 null，讓下面的 displayText 檢查來決定是否顯示

  // 如果沒有顯示內容（既沒有音樂也沒有天氣），不顯示跑馬燈
  if (!displayText || !displayText.trim()) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-purple-900/95 via-blue-900/95 to-purple-900/95 backdrop-blur-md border-b border-purple-500/30 shadow-lg">
      <div className="relative h-6 overflow-hidden">
        <div 
          ref={marqueeRef}
          className="absolute inset-0 flex items-center marquee-container"
        >
          <div className="flex items-center marquee-content">
            {marqueeItems.map((index) => (
              <div key={`marquee-item-${index}`} className="marquee-item">
                <div className={`marquee-icon-container ${settings.showOnlyNowPlaying && nowPlaying ? 'flex' : 'hidden'}`}>
                  <MusicalNoteIcon className={`w-3 h-3 text-purple-400 ${nowPlaying?.isRecent ? '' : 'animate-pulse'}`} />
                </div>
                <span className="marquee-text text-xs font-medium text-white">
                  {displayText}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <style>{`
        .marquee-container {
          will-change: transform;
        }
        .marquee-content {
          display: flex;
          animation: marquee ${settings.speed || 60}s linear infinite;
        }
        .marquee-item {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          padding-left: 1.5rem;
          padding-right: 1.5rem;
        }
        .marquee-icon-container {
          flex-shrink: 0;
          margin-right: 0.375rem;
        }
        .marquee-text {
          white-space: nowrap;
          flex-shrink: 0;
        }
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
};

export default memo(NowPlayingMarquee);
