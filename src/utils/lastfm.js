/**
 * Last.fm API 服務
 * API Key: c504380ef91f6497c9b7a9ae9152756c
 * User: greedysisyphus
 */

export const API_KEY = 'c504380ef91f6497c9b7a9ae9152756c'
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
 * @param {number} page - 頁碼（預設 1）
 * @returns {Promise<Object>}
 */
export async function getRecentTracks(limit = 10, page = 1) {
  try {
    const url = buildApiUrl('user.getRecentTracks', { 
      limit: limit.toString(),
      page: page.toString()
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
    console.error('獲取最近播放曲目失敗:', error)
    throw error
  }
}

/**
 * 獲取多頁最近播放的曲目（用於覆蓋7天的數據）
 * @param {number} maxRecords - 最大獲取記錄數（預設 2000）
 * @returns {Promise<Array>}
 */
export async function getRecentTracksMultiplePages(maxRecords = 2000) {
  try {
    const allTracks = []
    const limit = 200 // 每次最多200條
    let page = 1
    let totalPages = 1
    
    while (allTracks.length < maxRecords && page <= totalPages) {
      const data = await getRecentTracks(limit, page)
      const tracks = data?.recenttracks?.track || []
      
      // 確保是數組格式
      const tracksArray = Array.isArray(tracks) ? tracks : [tracks].filter(Boolean)
      allTracks.push(...tracksArray)
      
      // 檢查是否還有更多頁
      const attr = data?.recenttracks?.['@attr']
      if (attr) {
        totalPages = parseInt(attr.totalPages || '1', 10)
        const currentPage = parseInt(attr.page || '1', 10)
        
        // 如果已經獲取完所有頁面，或者已經達到最大記錄數，停止
        if (currentPage >= totalPages || allTracks.length >= maxRecords) {
          break
        }
      } else {
        // 如果沒有分頁信息，只獲取第一頁
        break
      }
      
      page++
      
      // 避免無限循環，最多獲取20頁（4000條記錄）
      if (page > 20) break
    }
    
    return allTracks.slice(0, maxRecords)
  } catch (error) {
    console.error('獲取多頁最近播放曲目失敗:', error)
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

/**
 * 獲取藝術家詳細資訊（用於獲取更好的圖片）
 * @param {string} artistName - 藝術家名稱
 * @returns {Promise<Object>}
 */
export async function getArtistInfo(artistName) {
  try {
    const searchParams = new URLSearchParams({
      method: 'artist.getInfo',
      api_key: API_KEY,
      format: 'json',
      artist: artistName
    })
    const url = `${API_BASE_URL}?${searchParams.toString()}`
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
    console.error(`獲取藝術家資訊失敗 (${artistName}):`, error)
    throw error
  }
}

/**
 * 獲取曲目詳細資訊（用於獲取更好的圖片）
 * @param {string} artistName - 藝術家名稱
 * @param {string} trackName - 曲目名稱
 * @returns {Promise<Object>}
 */
export async function getTrackInfo(artistName, trackName) {
  try {
    const searchParams = new URLSearchParams({
      method: 'track.getInfo',
      api_key: API_KEY,
      format: 'json',
      artist: artistName,
      track: trackName
    })
    const url = `${API_BASE_URL}?${searchParams.toString()}`
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
    console.error(`獲取曲目資訊失敗 (${artistName} - ${trackName}):`, error)
    throw error
  }
}

