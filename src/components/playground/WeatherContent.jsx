import { useState, useEffect } from 'react';
import { 
  MapPinIcon, 
  MagnifyingGlassIcon,
  CloudIcon,
  SunIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { 
  getWeatherForecast, 
  getCityCoordinates, 
  getCurrentLocation,
  getWeatherInfo 
} from '../../utils/weather';

function WeatherContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [location, setLocation] = useState(null);
  const [searchCity, setSearchCity] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 使用當前位置獲取天氣
  const fetchWeatherByLocation = async (lat, lon, locationName = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getWeatherForecast(lat, lon);
      setWeatherData(data);
      setLocation(locationName || { latitude: lat, longitude: lon });
    } catch (err) {
      setError(err.message);
      console.error('獲取天氣失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  // 使用瀏覽器定位
  const handleUseCurrentLocation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const position = await getCurrentLocation();
      await fetchWeatherByLocation(position.latitude, position.longitude, '當前位置');
    } catch (err) {
      setError(err.message);
      console.error('獲取當前位置失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  // 搜索城市
  const handleSearchCity = async () => {
    if (!searchCity.trim()) {
      return;
    }

    setIsSearching(true);
    setError(null);
    
    try {
      const cityInfo = await getCityCoordinates(searchCity);
      await fetchWeatherByLocation(
        cityInfo.latitude, 
        cityInfo.longitude,
        {
          name: cityInfo.name,
          country: cityInfo.country,
          admin1: cityInfo.admin1
        }
      );
      setSearchCity('');
    } catch (err) {
      setError(err.message);
      console.error('搜索城市失敗:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // 刷新天氣數據
  const handleRefresh = async () => {
    if (!location) return;
    
    const lat = typeof location === 'string' ? null : location.latitude;
    const lon = typeof location === 'string' ? null : location.longitude;
    
    if (lat && lon) {
      await fetchWeatherByLocation(lat, lon, location);
    }
  };

  if (loading && !weatherData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">載入天氣數據中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">天氣</h1>
        <p className="text-text-secondary">查看當前天氣和未來 7 天預報</p>
      </div>

      {/* 搜索和操作區域 */}
      <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchCity()}
                placeholder="輸入城市名稱（例如：台北、Tokyo、New York）"
                className="w-full pl-10 pr-4 py-2 bg-surface/60 border border-white/10 rounded-lg text-primary placeholder-text-secondary focus:outline-none focus:border-primary/50"
              />
            </div>
            <button
              onClick={handleSearchCity}
              disabled={isSearching || !searchCity.trim()}
              className="px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? '搜索中...' : '搜索'}
            </button>
          </div>

          {/* 使用當前位置 */}
          <button
            onClick={handleUseCurrentLocation}
            disabled={loading}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <MapPinIcon className="w-5 h-5" />
            <span>使用當前位置</span>
          </button>

          {/* 刷新 */}
          {weatherData && (
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-surface/60 hover:bg-surface/80 border border-white/10 rounded-lg text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              <span>刷新</span>
            </button>
          )}
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-400">
          <p>{error}</p>
        </div>
      )}

      {/* 天氣數據顯示 */}
      {weatherData && (
        <div className="space-y-6">
          {/* 當前天氣 */}
          {weatherData.current && (
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  {location && (
                    <div className="flex items-center gap-2 text-text-secondary mb-2">
                      <MapPinIcon className="w-5 h-5" />
                      <span>
                        {typeof location === 'string' 
                          ? location 
                          : `${location.name || '未知'}, ${location.country || ''} ${location.admin1 ? `(${location.admin1})` : ''}`
                        }
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-3 mb-2">
                    <div className="text-4xl font-bold text-primary">
                      {Math.round(weatherData.current.temperature_2m)}°C
                    </div>
                    {weatherData.daily && weatherData.daily.temperature_2m_max && weatherData.daily.temperature_2m_min && weatherData.daily.time && (
                      <div className="flex items-center gap-2 text-lg text-text-secondary">
                        <span className="text-primary font-semibold">
                          {Math.round(weatherData.daily.temperature_2m_max[0])}°
                        </span>
                        <span className="text-text-secondary">/</span>
                        <span className="text-text-secondary">
                          {Math.round(weatherData.daily.temperature_2m_min[0])}°
                        </span>
                      </div>
                    )}
                  </div>
                  {weatherData.daily && weatherData.daily.temperature_2m_max && weatherData.daily.temperature_2m_min && (
                    <div className="text-sm text-text-secondary">
                      最高 {Math.round(weatherData.daily.temperature_2m_max[0])}°C / 最低 {Math.round(weatherData.daily.temperature_2m_min[0])}°C
                    </div>
                  )}
                </div>
                <div className="text-6xl">
                  {getWeatherInfo(weatherData.current.weather_code).icon}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <div className="text-sm text-text-secondary mb-1">天氣</div>
                  <div className="text-primary font-medium">
                    {getWeatherInfo(weatherData.current.weather_code).description}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-text-secondary mb-1">濕度</div>
                  <div className="text-primary font-medium">
                    {weatherData.current.relative_humidity_2m}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-text-secondary mb-1">風速</div>
                  <div className="text-primary font-medium">
                    {weatherData.current.wind_speed_10m} km/h
                  </div>
                </div>
                <div>
                  <div className="text-sm text-text-secondary mb-1">風向</div>
                  <div className="text-primary font-medium">
                    {weatherData.current.wind_direction_10m}°
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7 天預報 */}
          {weatherData.daily && (
            <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold text-primary mb-4">7 天預報</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                {weatherData.daily.time.map((date, index) => {
                  const dateObj = new Date(date);
                  const dayName = dateObj.toLocaleDateString('zh-TW', { weekday: 'short' });
                  const monthDay = dateObj.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
                  
                  return (
                    <div
                      key={date}
                      className="bg-surface/60 border border-white/10 rounded-lg p-4 text-center"
                    >
                      <div className="text-sm text-text-secondary mb-2">
                        {dayName}
                      </div>
                      <div className="text-xs text-text-secondary mb-3">
                        {monthDay}
                      </div>
                      <div className="text-3xl mb-3">
                        {getWeatherInfo(weatherData.daily.weather_code[index]).icon}
                      </div>
                      <div className="text-sm text-text-secondary mb-2">
                        {getWeatherInfo(weatherData.daily.weather_code[index]).description}
                      </div>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="text-lg font-bold text-primary">
                          {Math.round(weatherData.daily.temperature_2m_max[index])}°
                        </span>
                        <span className="text-text-secondary">/</span>
                        <span className="text-sm text-text-secondary">
                          {Math.round(weatherData.daily.temperature_2m_min[index])}°
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary">
                        最高 {Math.round(weatherData.daily.temperature_2m_max[index])}°C / 最低 {Math.round(weatherData.daily.temperature_2m_min[index])}°C
                      </div>
                      {weatherData.daily.precipitation_sum && weatherData.daily.precipitation_sum[index] > 0 && (
                        <div className="text-xs text-blue-400 mt-2">
                          💧 {weatherData.daily.precipitation_sum[index]}mm
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 初始狀態提示 */}
      {!weatherData && !loading && !error && (
        <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-12 text-center">
          <CloudIcon className="w-16 h-16 text-text-secondary mx-auto mb-4" />
          <p className="text-text-secondary text-lg mb-4">
            請搜索城市或使用當前位置來查看天氣
          </p>
          <button
            onClick={handleUseCurrentLocation}
            className="px-6 py-3 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg text-primary transition-colors"
          >
            使用當前位置
          </button>
        </div>
      )}
    </div>
  );
}

export default WeatherContent;
