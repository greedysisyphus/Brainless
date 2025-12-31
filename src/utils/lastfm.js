/**
 * Last.fm API 服務
 * API Key: c504380ef91f6497c9b7a9ae9152756c
 * User: greedysisyphus
 */

const API_KEY = 'c504380ef91f6497c9b7a9ae9152756c'
const API_BASE_URL = 'https://ws.audioscrobbler.com/2.0/'
const USERNAME = 'greedysisyphus'

/**
 * 構建 API URL
 */
function buildApiUrl(method, params = {}) {
  const searchParams = new URLSearchParams({
    method,
    api_key: API_KEY,
    format: 'json',
    user: USERNAME,
    ...params
  })
  return `${API_BASE_URL}?${searchParams.toString()}`
}

/**
 * 獲取最近播放的曲目
 * @param {number} limit - 返回的曲目數量（1-200，預設 10）
 * @returns {Promise<Object>}
 */
export async function getRecentTracks(limit = 10) {
  try {
    const url = buildApiUrl('user.getRecentTracks', { limit: limit.toString() })
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`API 請求失敗: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.error) {
      throw new Error(`Last.fm API 錯誤: ${data.message}`)
    }
    
    return data
  } catch (error) {
    console.error('獲取最近播放曲目失敗:', error)
    throw error
  }
}

/**
 * 獲取用戶資訊
 * @returns {Promise<Object>}
 */
export async function getUserInfo() {
  try {
    const url = buildApiUrl('user.getInfo')
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`API 請求失敗: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.error) {
      throw new Error(`Last.fm API 錯誤: ${data.message}`)
    }
    
    return data
  } catch (error) {
    console.error('獲取用戶資訊失敗:', error)
    throw error
  }
}

/**
 * 獲取最愛藝術家
 * @param {number} limit - 返回的數量（1-1000，預設 10）
 * @param {string} period - 時間段（overall, 7day, 1month, 3month, 6month, 12month）
 * @returns {Promise<Object>}
 */
export async function getTopArtists(limit = 10, period = 'overall') {
  try {
    const url = buildApiUrl('user.getTopArtists', {
      limit: limit.toString(),
      period
    })
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`API 請求失敗: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.error) {
      throw new Error(`Last.fm API 錯誤: ${data.message}`)
    }
    
    return data
  } catch (error) {
    console.error('獲取最愛藝術家失敗:', error)
    throw error
  }
}

/**
 * 獲取最愛專輯
 * @param {number} limit - 返回的數量（1-1000，預設 10）
 * @param {string} period - 時間段
 * @returns {Promise<Object>}
 */
export async function getTopAlbums(limit = 10, period = 'overall') {
  try {
    const url = buildApiUrl('user.getTopAlbums', {
      limit: limit.toString(),
      period
    })
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`API 請求失敗: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.error) {
      throw new Error(`Last.fm API 錯誤: ${data.message}`)
    }
    
    return data
  } catch (error) {
    console.error('獲取最愛專輯失敗:', error)
    throw error
  }
}

/**
 * 獲取最愛曲目
 * @param {number} limit - 返回的數量（1-1000，預設 10）
 * @param {string} period - 時間段
 * @returns {Promise<Object>}
 */
export async function getTopTracks(limit = 10, period = 'overall') {
  try {
    const url = buildApiUrl('user.getTopTracks', {
      limit: limit.toString(),
      period
    })
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`API 請求失敗: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.error) {
      throw new Error(`Last.fm API 錯誤: ${data.message}`)
    }
    
    return data
  } catch (error) {
    console.error('獲取最愛曲目失敗:', error)
    throw error
  }
}

