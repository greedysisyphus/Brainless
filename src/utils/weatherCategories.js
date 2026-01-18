/**
 * 天氣分類定義和映射
 * 用於跑馬燈設定和天氣自訂用語匹配
 */

export const weatherCategories = [
  { key: 'sunny', label: '晴天', codes: [0, 1], description: '天氣代碼: 0, 1（晴朗、大部分晴朗）' },
  { key: 'cloudy', label: '多雲', codes: [2, 3], description: '天氣代碼: 2, 3（部分多雲、多雲）' },
  { key: 'foggy', label: '起霧', codes: [45, 48], description: '天氣代碼: 45, 48（霧、結霜霧）' },
  { key: 'lightRain', label: '小雨', codes: [51, 61], description: '天氣代碼: 51, 61（小雨）' },
  { key: 'rainy', label: '下雨', codes: [53, 55, 63, 65], description: '天氣代碼: 53, 55, 63, 65（中雨、大雨）' },
  { key: 'freezingRain', label: '冷雨', codes: [56, 57, 66, 67], description: '天氣代碼: 56, 57, 66, 67（凍雨、強凍雨）' },
  { key: 'snowy', label: '下雪', codes: [71, 73, 75, 77, 85, 86], description: '天氣代碼: 71-86（小雪、中雪、大雪、雪粒）' },
  { key: 'shower', label: '陣雨', codes: [80, 81, 82], description: '天氣代碼: 80, 81, 82（陣雨：小雨、中雨、大雨）' },
  { key: 'thunderstorm', label: '雷雨', codes: [95], description: '天氣代碼: 95（雷暴）' },
  { key: 'thunderstormHail', label: '雷雨冰雹', codes: [96, 99], description: '天氣代碼: 96, 99（雷暴伴冰雹、強雷暴伴冰雹）' }
];

/**
 * 天氣分類映射（用於快速查找）
 */
export const weatherCategoryMap = {
  sunny: [0, 1],
  cloudy: [2, 3],
  foggy: [45, 48],
  lightRain: [51, 61],
  rainy: [53, 55, 63, 65],
  freezingRain: [56, 57, 66, 67],
  snowy: [71, 73, 75, 77, 85, 86],
  shower: [80, 81, 82],
  thunderstorm: [95],
  thunderstormHail: [96, 99]
};

/**
 * 根據天氣代碼獲取對應的分類 key
 * @param {number} weatherCode - 天氣代碼
 * @returns {string|null} 分類 key，如果找不到則返回 null
 */
export function getWeatherCategoryKey(weatherCode) {
  for (const [category, codes] of Object.entries(weatherCategoryMap)) {
    if (codes.includes(weatherCode)) {
      return category;
    }
  }
  return null;
}
