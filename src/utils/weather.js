/**
 * Open-Meteo 天氣 API 工具函數
 * 完全免費，無需 API key
 * 文檔：https://open-meteo.com/en/docs
 */

const API_BASE_URL = 'https://api.open-meteo.com/v1';

/**
 * 獲取當前天氣和未來 7 天預報
 * @param {number} latitude - 緯度
 * @param {number} longitude - 經度
 * @returns {Promise<Object>} 天氣數據
 */
export async function getWeatherForecast(latitude, longitude) {
  try {
    const url = new URL(`${API_BASE_URL}/forecast`);
    url.searchParams.append('latitude', latitude);
    url.searchParams.append('longitude', longitude);
    url.searchParams.append('current', 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m');
    url.searchParams.append('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max');
    url.searchParams.append('timezone', 'auto');
    url.searchParams.append('forecast_days', '7');

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`天氣 API 請求失敗: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('獲取天氣數據失敗:', error);
    throw error;
  }
}

/**
 * 根據城市名稱獲取經緯度（使用 Open-Meteo 的地理編碼 API）
 * @param {string} cityName - 城市名稱
 * @returns {Promise<Object>} 包含經緯度的位置信息
 */
export async function getCityCoordinates(cityName) {
  try {
    const url = new URL(`${API_BASE_URL}/geocoding`);
    url.searchParams.append('name', cityName);
    url.searchParams.append('count', '1');
    url.searchParams.append('language', 'zh');

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`地理編碼 API 請求失敗: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return {
        latitude: data.results[0].latitude,
        longitude: data.results[0].longitude,
        name: data.results[0].name,
        country: data.results[0].country,
        admin1: data.results[0].admin1 // 省/州
      };
    }
    
    throw new Error('找不到該城市');
  } catch (error) {
    console.error('獲取城市座標失敗:', error);
    throw error;
  }
}

/**
 * 獲取用戶當前位置（使用瀏覽器 Geolocation API）
 * @returns {Promise<Object>} 包含經緯度的位置信息
 */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('瀏覽器不支持地理位置服務'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(new Error(`獲取位置失敗: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 分鐘緩存
      }
    );
  });
}

/**
 * 天氣代碼對應的天氣描述和圖標
 * WMO Weather interpretation codes (WW)
 * https://open-meteo.com/en/docs
 */
export const weatherCodes = {
  0: { description: '晴朗', icon: '☀️', emoji: 'sunny' },
  1: { description: '大部分晴朗', icon: '🌤️', emoji: 'partly-sunny' },
  2: { description: '部分多雲', icon: '⛅', emoji: 'partly-cloudy' },
  3: { description: '多雲', icon: '☁️', emoji: 'cloudy' },
  45: { description: '霧', icon: '🌫️', emoji: 'foggy' },
  48: { description: '結霜霧', icon: '🌫️', emoji: 'foggy' },
  51: { description: '小雨', icon: '🌦️', emoji: 'light-rain' },
  53: { description: '中雨', icon: '🌧️', emoji: 'moderate-rain' },
  55: { description: '大雨', icon: '🌧️', emoji: 'heavy-rain' },
  56: { description: '凍雨', icon: '🌨️', emoji: 'freezing-rain' },
  57: { description: '強凍雨', icon: '🌨️', emoji: 'freezing-rain' },
  61: { description: '小雨', icon: '🌦️', emoji: 'light-rain' },
  63: { description: '中雨', icon: '🌧️', emoji: 'moderate-rain' },
  65: { description: '大雨', icon: '🌧️', emoji: 'heavy-rain' },
  66: { description: '凍雨', icon: '🌨️', emoji: 'freezing-rain' },
  67: { description: '強凍雨', icon: '🌨️', emoji: 'freezing-rain' },
  71: { description: '小雪', icon: '🌨️', emoji: 'light-snow' },
  73: { description: '中雪', icon: '❄️', emoji: 'moderate-snow' },
  75: { description: '大雪', icon: '❄️', emoji: 'heavy-snow' },
  77: { description: '雪粒', icon: '❄️', emoji: 'snow-grains' },
  80: { description: '小雨', icon: '🌦️', emoji: 'light-rain' },
  81: { description: '中雨', icon: '🌧️', emoji: 'moderate-rain' },
  82: { description: '大雨', icon: '🌧️', emoji: 'heavy-rain' },
  85: { description: '小雪', icon: '🌨️', emoji: 'light-snow' },
  86: { description: '大雪', icon: '❄️', emoji: 'heavy-snow' },
  95: { description: '雷暴', icon: '⛈️', emoji: 'thunderstorm' },
  96: { description: '雷暴伴冰雹', icon: '⛈️', emoji: 'thunderstorm-hail' },
  99: { description: '強雷暴伴冰雹', icon: '⛈️', emoji: 'thunderstorm-hail' }
};

/**
 * 根據天氣代碼獲取天氣信息
 * @param {number} code - 天氣代碼
 * @returns {Object} 天氣信息
 */
export function getWeatherInfo(code) {
  return weatherCodes[code] || { description: '未知', icon: '❓', emoji: 'unknown' };
}
