import { useState, useEffect, useMemo } from 'react'
import { 
  MusicalNoteIcon, 
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar,
  RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts'
import { 
  getRecentTracks, 
  getRecentTracksMultiplePages,
  getUserInfo, 
  getTopArtists, 
  getTopAlbums,
  getTopTracks,
  getArtistInfo,
  getTrackInfo,
  API_KEY
} from '../utils/lastfm'

function Music() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userInfo, setUserInfo] = useState(null)
  const [recentTracks, setRecentTracks] = useState([])
  const [recentTracksForChart, setRecentTracksForChart] = useState([]) // 用於圖表的更多數據
  const [topArtists, setTopArtists] = useState([])
  const [topAlbums, setTopAlbums] = useState([])
  const [topTracks, setTopTracks] = useState([])
  const [topArtists7day, setTopArtists7day] = useState([]) // 7天數據
  const [topAlbums7day, setTopAlbums7day] = useState([])
  const [topTracks7day, setTopTracks7day] = useState([])
  const [topArtists30day, setTopArtists30day] = useState([]) // 30天數據
  const [topAlbums30day, setTopAlbums30day] = useState([])
  const [topTracks30day, setTopTracks30day] = useState([])
  const [topArtistsOverall, setTopArtistsOverall] = useState([]) // 總計數據
  const [topAlbumsOverall, setTopAlbumsOverall] = useState([])
  const [topTracksOverall, setTopTracksOverall] = useState([])
  const [activeTab, setActiveTab] = useState('recent')
  const [scrobblesView, setScrobblesView] = useState('7days') // '7days' 或 'total'
  const [periodView, setPeriodView] = useState('7days') // '7days', '30days', 'overall' - 用於藝術家、專輯、歌曲標籤頁
  const [recentTracksLimit, setRecentTracksLimit] = useState(20) // 最近播放列表顯示數量
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMoreTracks, setHasMoreTracks] = useState(true)

  // 過濾有效圖片（排除佔位符）的共用函數
  const filterValidImages = (images) => {
    if (!images || !Array.isArray(images)) return []
    return images.filter(img => 
      img && 
      img['#text'] && 
      img['#text'] !== '' &&
      !img['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f') &&
      !img['#text'].includes('default') &&
      !img['#text'].includes('placeholder')
    )
  }

  // 獲取所有資料
  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      // 先獲取用戶信息和第一頁數據
      const [user, recent] = await Promise.all([
        getUserInfo(),
        getRecentTracks(20) // 初始載入 20 條
      ])

      // 然後並行獲取其他數據
      const [recentForChart, artists7day, albums7day, tracks7day, artists30day, albums30day, tracks30day, artistsOverall, albumsOverall, tracksOverall] = await Promise.all([
        getRecentTracksMultiplePages(2000), // 獲取最多2000條記錄，確保完整覆蓋7天數據
        getTopArtists(10, '7day'), // 最近7天
        getTopAlbums(10, '7day'),
        getTopTracks(10, '7day'),
        getTopArtists(10, '1month'), // 最近30天
        getTopAlbums(10, '1month'),
        getTopTracks(10, '1month'),
        getTopArtists(10, 'overall'), // 總計
        getTopAlbums(10, 'overall'),
        getTopTracks(10, 'overall')
      ])

      setUserInfo(user?.user)
      const tracksList = recent?.recenttracks?.track || []
      // 確保是數組格式
      const tracksArray = Array.isArray(tracksList) ? tracksList : [tracksList].filter(Boolean)
      setRecentTracks(tracksArray)
      // 檢查是否還有更多數據
      const attr = recent?.recenttracks?.['@attr']
      if (attr) {
        const totalPages = parseInt(attr.totalPages || '1', 10)
        const currentPage = parseInt(attr.page || '1', 10)
        setHasMoreTracks(currentPage < totalPages)
      } else {
        setHasMoreTracks(tracksArray.length >= 20) // 如果獲取了 20 條，可能還有更多
      }
      // recentForChart 已經是數組格式（從 getRecentTracksMultiplePages 返回）
      setRecentTracksForChart(Array.isArray(recentForChart) ? recentForChart : [])
      // 如果記錄數不多（少於 30 條），直接顯示全部，否則顯示 20 條
      if (tracksArray.length <= 30) {
        setRecentTracksLimit(tracksArray.length)
      } else {
        setRecentTracksLimit(20) // 重置顯示數量
      }
      
      // 處理藝術家數據，確保圖片數組格式正確
      const processArtists = (artistsData) => {
        if (!artistsData) return []
        const artistsList = Array.isArray(artistsData) ? artistsData : [artistsData]
        return artistsList.map(artist => {
          // 確保 artist.image 是數組格式，但不過濾圖片（讓顯示邏輯來處理）
          if (artist.image && !Array.isArray(artist.image)) {
            artist.image = [artist.image]
          }
          return artist
        })
      }
      
      // 處理專輯數據，確保圖片數組格式正確
      const processAlbums = (albumsData) => {
        const albumsList = Array.isArray(albumsData) ? albumsData : (albumsData ? [albumsData] : [])
        return albumsList.map(album => {
          if (album.image) {
            if (!Array.isArray(album.image)) {
              album.image = [album.image]
            }
            album.image = album.image.filter(img => img && img['#text'] && img['#text'] !== '')
          }
          return album
        })
      }
      
      // 處理曲目數據，確保圖片數組格式正確（與專輯處理邏輯一致）
      const processTracks = (tracksData) => {
        if (!tracksData) return []
        const tracksList = Array.isArray(tracksData) ? tracksData : [tracksData].filter(Boolean)
        return tracksList.map(track => {
          if (track.image) {
            if (!Array.isArray(track.image)) {
              track.image = [track.image]
            }
            // 不過濾圖片（讓顯示邏輯來處理佔位符）
          }
          return track
        })
      }
      
      // 處理藝術家數據（基本處理）
      const processedArtists7day = processArtists(artists7day?.topartists?.artist)
      const processedArtists30day = processArtists(artists30day?.topartists?.artist)
      const processedArtistsOverall = processArtists(artistsOverall?.topartists?.artist)
      
      // 為每個藝術家獲取詳細資訊以獲取更好的圖片
      // 使用 Promise.allSettled 避免單個失敗影響全部
      const enhanceArtistsWithInfo = async (artistsList) => {
        const enhancedArtists = await Promise.allSettled(
          artistsList.map(async (artist, index) => {
            try {
              // 添加延遲以避免 API 速率限制（每 200ms 一個請求）
              if (index > 0) {
                await new Promise(resolve => setTimeout(resolve, 200 * index))
              }
              
              const artistInfo = await getArtistInfo(artist.name)
              const detailedImages = artistInfo?.artist?.image
              
              // 如果獲取到詳細資訊中的圖片，優先使用（過濾掉佔位符後）
              if (detailedImages && Array.isArray(detailedImages)) {
                const validImages = filterValidImages(detailedImages)
                
                // 如果有有效的圖片，替換原有的圖片
                if (validImages.length > 0) {
                  return { ...artist, image: validImages }
                }
                
                // 備選方案：如果 artist.getInfo 沒有有效圖片，嘗試從藝術家的 top albums 獲取專輯封面
                // 注意：這個備選方案會增加 API 請求，只在必要時使用
                try {
                  const searchParams = new URLSearchParams({
                    method: 'artist.getTopAlbums',
                    api_key: API_KEY,
                    format: 'json',
                    artist: artist.name,
                    limit: '3' // 減少到 3 個專輯以節省請求
                  })
                  const albumUrl = `https://ws.audioscrobbler.com/2.0/?${searchParams.toString()}`
                  const albumResponse = await fetch(albumUrl)
                  
                  if (albumResponse.ok) {
                    const albumData = await albumResponse.json()
                    if (albumData.error) {
                      throw new Error(albumData.message)
                    }
                    
                    const albums = albumData?.topalbums?.album
                    if (albums) {
                      const albumsList = Array.isArray(albums) ? albums : [albums]
                      // 找到第一個有有效圖片的專輯
                      for (const album of albumsList) {
                        if (album.image) {
                          const albumImages = Array.isArray(album.image) ? album.image : [album.image]
                          const validAlbumImages = filterValidImages(albumImages)
                          
                          if (validAlbumImages.length > 0) {
                            return { ...artist, image: validAlbumImages }
                          }
                        }
                      }
                    }
                  }
                } catch (albumError) {
                  // 靜默失敗，不影響主要流程
                  console.warn(`無法從專輯獲取備選圖片 (${artist.name}):`, albumError.message)
                }
              }
              
              return artist
            } catch (error) {
              console.warn(`無法獲取藝術家 ${artist.name} 的詳細資訊:`, error.message)
              return artist // 失敗時返回原始數據
            }
          })
        )
        
        // 正確處理 Promise.allSettled 的結果
        return enhancedArtists.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value
          } else {
            // 如果失敗，返回原始藝術家數據
            console.warn(`藝術家增強失敗:`, result.reason)
            return artistsList[index]
          }
        }).filter(Boolean)
      }
      
      // 為 7天、30天和總計的藝術家獲取詳細資訊
      const [enhancedArtists7day, enhancedArtists30day, enhancedArtistsOverall] = await Promise.all([
        enhanceArtistsWithInfo(processedArtists7day),
        enhanceArtistsWithInfo(processedArtists30day), // 30天也增強圖片
        enhanceArtistsWithInfo(processedArtistsOverall)
      ])
      
      // 為每個 track 獲取詳細資訊以獲取更好的圖片
      // 使用 Promise.allSettled 避免單個失敗影響全部
      const enhanceTracksWithInfo = async (tracksList) => {
        // 先處理基本數據
        const processedTracks = processTracks(tracksList)
        
        // 為每個 track 獲取詳細資訊（只為前 10 個，避免過多請求）
        const enhancedTracks = await Promise.allSettled(
          processedTracks.slice(0, 10).map(async (track, index) => {
            try {
              // 添加延遲以避免 API 速率限制（每 200ms 一個請求）
              if (index > 0) {
                await new Promise(resolve => setTimeout(resolve, 200 * index))
              }
              
              const trackInfo = await getTrackInfo(track.artist.name, track.name)
              const detailedImages = trackInfo?.track?.album?.image || trackInfo?.track?.image
              
              // 如果獲取到詳細資訊中的圖片，優先使用（過濾掉佔位符後）
              if (detailedImages && Array.isArray(detailedImages)) {
                const validImages = filterValidImages(detailedImages)
                
                // 如果有有效的圖片，替換原有的圖片
                if (validImages.length > 0) {
                  return { ...track, image: validImages }
                }
              }
              return track
            } catch (error) {
              console.warn(`無法獲取曲目 ${track.artist.name} - ${track.name} 的詳細資訊:`, error.message)
              return track // 失敗時返回原始數據
            }
          })
        )
        
        // 正確處理 Promise.allSettled 的結果
        const enhanced = enhancedTracks.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value
          } else {
            console.warn(`曲目增強失敗:`, result.reason)
            return processedTracks[index]
          }
        }).filter(Boolean)
        
        // 合併增強後的 tracks 和未增強的 tracks
        return [...enhanced, ...processedTracks.slice(10)]
      }
      
      // 為 7天、30天和總計的 tracks 獲取詳細資訊
      const [enhancedTracks7day, enhancedTracks30day, enhancedTracksOverall] = await Promise.all([
        enhanceTracksWithInfo(tracks7day?.toptracks?.track),
        enhanceTracksWithInfo(tracks30day?.toptracks?.track), // 30天也增強圖片
        enhanceTracksWithInfo(tracksOverall?.toptracks?.track)
      ])
      
      // 設置所有 state
      setTopArtists7day(enhancedArtists7day)
      setTopAlbums7day(processAlbums(albums7day?.topalbums?.album))
      setTopTracks7day(enhancedTracks7day)
      setTopArtists30day(enhancedArtists30day)
      setTopAlbums30day(processAlbums(albums30day?.topalbums?.album))
      setTopTracks30day(enhancedTracks30day)
      setTopArtistsOverall(enhancedArtistsOverall)
      setTopAlbumsOverall(processAlbums(albumsOverall?.topalbums?.album))
      setTopTracksOverall(enhancedTracksOverall)
      
      // 根據預設的 periodView 設置當前顯示的數據
      setTopArtists(enhancedArtists7day)
      setTopAlbums(processAlbums(albums7day?.topalbums?.album))
      setTopTracks(processTracks(tracks7day?.toptracks?.track))
    } catch (err) {
      console.error('獲取音樂資料失敗:', err)
      setError(err.message || '獲取音樂資料失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 根據 periodView 動態更新當前顯示的數據
  useEffect(() => {
    if (periodView === '7days') {
      setTopArtists(topArtists7day)
      setTopAlbums(topAlbums7day)
      setTopTracks(topTracks7day)
    } else if (periodView === '30days') {
      setTopArtists(topArtists30day)
      setTopAlbums(topAlbums30day)
      setTopTracks(topTracks30day)
    } else if (periodView === 'overall') {
      setTopArtists(topArtistsOverall)
      setTopAlbums(topAlbumsOverall)
      setTopTracks(topTracksOverall)
    }
  }, [periodView, topArtists7day, topAlbums7day, topTracks7day, topArtists30day, topAlbums30day, topTracks30day, topArtistsOverall, topAlbumsOverall, topTracksOverall])

  // 格式化播放時間
  const formatDate = (dateObj) => {
    // 如果沒有日期對象，表示正在播放
    if (!dateObj || !dateObj.uts) return '正在播放'
    
    try {
      // Last.fm API 返回的是 Unix timestamp (秒)
      const timestamp = parseInt(dateObj.uts, 10) * 1000 // 轉換為毫秒
      const date = new Date(timestamp)
      const now = new Date()
      const diff = now - date
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)

      if (minutes < 1) return '剛剛'
      if (minutes < 60) return `${minutes} 分鐘前`
      if (hours < 24) return `${hours} 小時前`
      if (days < 7) return `${days} 天前`
      
      return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
    } catch (error) {
      console.error('時間格式化錯誤:', error)
      return '未知'
    }
  }

  // 格式化數字
  const formatNumber = (num) => {
    if (!num) return '0'
    const n = parseInt(num, 10)
    // 小於 1 萬的數字直接顯示完整數字
    if (n < 10000) return n.toLocaleString('zh-TW')
    // 1 萬到 100 萬之間使用 K 格式，顯示更精確的小數
    if (n >= 1000000) {
      // 超過 100 萬，如果小數點後為 0，只顯示整數部分
      const millions = n / 1000000
      return millions % 1 === 0 ? `${millions.toFixed(0)}M` : `${millions.toFixed(1)}M`
    }
    // 1 萬到 100 萬之間使用 K 格式
    const thousands = n / 1000
    // 如果小數點後為 0，只顯示整數部分
    if (thousands % 1 === 0) {
      return `${thousands.toFixed(0)}K`
    }
    // 否則顯示一位小數，但如果小數點是 .0 結尾，則不顯示
    return `${thousands.toFixed(1)}K`
  }

  // 圖表數據計算
  const chartColors = ['#ec4899', '#06b6d4', '#3b82f6', '#8b5cf6', '#f97316', '#10b981', '#ef4444', '#6366f1']

  // 最愛藝術家圓餅圖數據
  const artistPieData = useMemo(() => {
    if (!topArtists || topArtists.length === 0) return []
    
    return topArtists.slice(0, 8).map((artist, index) => ({
      name: artist.name.length > 15 ? artist.name.substring(0, 15) + '...' : artist.name,
      value: parseInt(artist.playcount, 10),
      fullName: artist.name
    }))
  }, [topArtists])

  // 播放時間趨勢圖數據（按小時分組）
  const hourlyChartData = useMemo(() => {
    if (!recentTracksForChart || recentTracksForChart.length === 0) return []
    
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0, label: `${i}:00` }))
    
    recentTracksForChart.forEach(track => {
      if (track.date?.uts && !track['@attr']?.nowplaying) {
        const timestamp = parseInt(track.date.uts, 10) * 1000
        const date = new Date(timestamp)
        const hour = date.getHours()
        hourlyData[hour].count++
      }
    })
    
    return hourlyData
  }, [recentTracksForChart])

  // 播放時間趨勢圖數據（按日期分組，最近7天或30天）
  const dailyChartData = useMemo(() => {
    if (!recentTracksForChart || recentTracksForChart.length === 0) return []
    
    // 根據 scrobblesView 決定天數
    const daysCount = scrobblesView === '30days' ? 30 : 7
    
    // 創建天數的數組，從 (daysCount-1) 天前到今天
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()) // 使用本地時區的今天開始時間
    
    const days = Array.from({ length: daysCount }, (_, i) => {
      const date = new Date(today)
      date.setDate(date.getDate() - (daysCount - 1 - i))
      // 創建一個標準化的日期字符串用於匹配（YYYY-MM-DD格式）
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      return {
        date: date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
        count: 0,
        fullDate: date,
        dayName: date.toLocaleDateString('zh-TW', { weekday: 'short' }),
        dateKey: dateKey // 用於匹配的日期鍵
      }
    })
    
    // 創建日期映射表，方便查找
    const dateMap = new Map()
    days.forEach((day, index) => {
      dateMap.set(day.dateKey, index)
    })
    
    // 統計每天的播放次數
    recentTracksForChart.forEach(track => {
      if (track.date?.uts && !track['@attr']?.nowplaying) {
        const timestamp = parseInt(track.date.uts, 10) * 1000
        const trackDate = new Date(timestamp)
        // 使用本地時區的日期開始時間
        const trackDateStart = new Date(trackDate.getFullYear(), trackDate.getMonth(), trackDate.getDate())
        // 創建日期鍵用於匹配
        const trackDateKey = `${trackDateStart.getFullYear()}-${String(trackDateStart.getMonth() + 1).padStart(2, '0')}-${String(trackDateStart.getDate()).padStart(2, '0')}`
        
        // 直接在映射表中查找對應的日期索引
        const dayIndex = dateMap.get(trackDateKey)
        if (dayIndex !== undefined) {
          days[dayIndex].count++
        }
      }
    })
    
    return days
  }, [recentTracksForChart, scrobblesView])

  // 計算總播放次數
  const totalScrobbles = useMemo(() => {
    return dailyChartData.reduce((sum, day) => sum + day.count, 0)
  }, [dailyChartData])

  // 找到最活躍的時段
  const busiestHour = useMemo(() => {
    if (!hourlyChartData.length) return null
    const maxHour = hourlyChartData.reduce((max, hour) => hour.count > max.count ? hour : max, hourlyChartData[0])
    return {
      hour: maxHour.hour,
      count: maxHour.count
    }
  }, [hourlyChartData])

  // 藝術家播放次數長條圖數據
  const artistBarData = useMemo(() => {
    if (!topArtists || topArtists.length === 0) return []
    
    return topArtists.slice(0, 10).map(artist => ({
      name: artist.name.length > 20 ? artist.name.substring(0, 20) + '...' : artist.name,
      plays: parseInt(artist.playcount, 10),
      fullName: artist.name
    }))
  }, [topArtists])

  // 計算 Top Music 統計（Artists, Albums, Tracks 數量）
  const topMusicStats = useMemo(() => {
    const uniqueArtists = new Set()
    const uniqueAlbums = new Set()
    const uniqueTracks = new Set()
    
    // 根據視圖模式過濾數據
    const tracksToCount = scrobblesView === '7days' 
      ? recentTracksForChart.filter(track => {
          if (!track.date?.uts || track['@attr']?.nowplaying) return false
          const timestamp = parseInt(track.date.uts, 10) * 1000
          const trackDate = new Date(timestamp)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          trackDate.setHours(0, 0, 0, 0)
          const diffDays = Math.floor((today - trackDate) / (1000 * 60 * 60 * 24))
          return diffDays >= 0 && diffDays < 7
        })
      : scrobblesView === '30days'
      ? recentTracksForChart.filter(track => {
          if (!track.date?.uts || track['@attr']?.nowplaying) return false
          const timestamp = parseInt(track.date.uts, 10) * 1000
          const trackDate = new Date(timestamp)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          trackDate.setHours(0, 0, 0, 0)
          const diffDays = Math.floor((today - trackDate) / (1000 * 60 * 60 * 24))
          return diffDays >= 0 && diffDays < 30
        })
      : recentTracksForChart // 總計模式：使用所有數據（最多200條）
    
    tracksToCount.forEach(track => {
      if (track.artist?.['#text']) uniqueArtists.add(track.artist['#text'])
      if (track.album?.['#text']) uniqueAlbums.add(track.album['#text'])
      if (track.name) uniqueTracks.add(track.name)
    })
    
    const current = {
      artists: uniqueArtists.size,
      albums: uniqueAlbums.size,
      tracks: uniqueTracks.size,
      timestamp: Date.now()
    }
    
    // 獲取上次的統計數據（用於計算變化）
    let previous = null
    try {
      const saved = localStorage.getItem('lastfm_stats_previous')
      if (saved) {
        const parsed = JSON.parse(saved)
        // 只使用24小時內的數據
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          previous = parsed
        }
      }
    } catch (e) {
      console.error('讀取上次統計失敗:', e)
    }
    
    // 保存當前數據
    try {
      localStorage.setItem('lastfm_stats_previous', JSON.stringify(current))
    } catch (e) {
      console.error('保存統計失敗:', e)
    }
    
    // 計算百分比變化
    const calculateChange = (current, previous) => {
      if (!previous || previous === 0) return null
      const change = ((current - previous) / previous) * 100
      return Math.round(change)
    }
    
    return {
      artists: current.artists,
      albums: current.albums,
      tracks: current.tracks,
      artistsChange: previous ? calculateChange(current.artists, previous.artists) : null,
      albumsChange: previous ? calculateChange(current.albums, previous.albums) : null,
      tracksChange: previous ? calculateChange(current.tracks, previous.tracks) : null
    }
  }, [recentTracksForChart, scrobblesView])

  // Listening Clock 徑向圖數據
  const listeningClockData = useMemo(() => {
    if (!hourlyChartData.length) return []
    const maxCount = Math.max(...hourlyChartData.map(h => h.count), 1)
    return hourlyChartData.map(hour => ({
      hour: hour.hour,
      count: hour.count,
      fill: `hsl(${(hour.hour / 24) * 240}, 70%, 60%)`,
      percentage: (hour.count / maxCount) * 100
    }))
  }, [hourlyChartData])

  // 每日條形圖數據（用於 Scrobbles 區域）
  const weeklyBarData = useMemo(() => {
    if (!dailyChartData || dailyChartData.length === 0) return []
    
    // 確保所有天都有數據，即使為0也要顯示
    return dailyChartData.map(day => ({
      day: day.dayName,
      date: day.date,
      count: day.count || 0 // 確保至少為0
    }))
  }, [dailyChartData])

  if (loading) {
    return (
      <div className="container-custom py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <ArrowPathIcon className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">正在載入音樂資料...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container-custom py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-primary/20 border border-primary/30 text-primary rounded-lg hover:bg-primary/30 transition-colors"
            >
              重新載入
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-custom py-8">
      <div className="max-w-6xl mx-auto">
        {/* 標題區域 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
                <MusicalNoteIcon className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-primary mb-1">Playground</h1>
                <p className="text-text-secondary">
                  實驗一些實驗
                </p>
              </div>
            </div>
            <button
              onClick={fetchData}
              className="p-2 rounded-lg bg-surface/40 border border-white/10 text-text-secondary hover:text-primary hover:bg-surface/60 transition-colors"
              title="重新載入"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>

          {/* 統計卡片 */}
          {userInfo && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold text-primary mb-1">
                  {formatNumber(userInfo.playcount)}
                </div>
                <div className="text-sm text-text-secondary">總播放次數</div>
              </div>
              <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold text-primary mb-1">
                  {formatNumber(userInfo.artist_count)}
                </div>
                <div className="text-sm text-text-secondary">不同藝術家</div>
              </div>
              <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold text-primary mb-1">
                  {formatNumber(userInfo.album_count)}
                </div>
                <div className="text-sm text-text-secondary">不同專輯</div>
              </div>
            </div>
          )}
        </div>

        {/* Tab 切換 */}
        <div className="flex gap-2 mb-6 border-b border-white/10">
          {[
            { id: 'recent', label: '最近播放' },
            { id: 'artists', label: '最愛藝術家' },
            { id: 'albums', label: '最愛專輯' },
            { id: 'tracks', label: '最愛歌曲' },
            { id: 'stats', label: '統計' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 時間選擇器（僅在藝術家、專輯、歌曲標籤頁顯示） */}
        {(activeTab === 'artists' || activeTab === 'albums' || activeTab === 'tracks') && (
          <div className="flex gap-2 mb-6">
            {[
              { id: '7days', label: '7 天' },
              { id: '30days', label: '30 天' },
              { id: 'overall', label: '總計' }
            ].map((period) => (
              <button
                key={period.id}
                onClick={() => setPeriodView(period.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  periodView === period.id
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-surface/40 text-text-secondary hover:text-primary hover:bg-surface/60 border border-white/10'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        )}

        {/* 最近播放 */}
        {activeTab === 'recent' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentTracks.slice(0, recentTracksLimit).map((track, index) => {
              const isNowPlaying = track['@attr']?.nowplaying === 'true'
              // 嘗試多種方式獲取圖片
              let image = null
              if (track.image && Array.isArray(track.image)) {
                // 按優先順序嘗試不同大小的圖片
                image = track.image.find(img => img && img.size === 'large' && img['#text'] && img['#text'] !== '')?.['#text'] ||
                       track.image.find(img => img && img.size === 'extralarge' && img['#text'] && img['#text'] !== '')?.['#text'] ||
                       track.image.find(img => img && img.size === 'medium' && img['#text'] && img['#text'] !== '')?.['#text'] ||
                       track.image.find(img => img && img.size === 'small' && img['#text'] && img['#text'] !== '')?.['#text'] ||
                       track.image.find(img => img && img['#text'] && img['#text'] !== '')?.['#text']
              }
              
              // 過濾掉 Last.fm 的預設佔位符圖片（通常是包含特定 hash 的 URL）
              if (image && (image.includes('2a96cbd8b46e442fc41c2b86b821562f') || 
                           image.includes('default') || 
                           image.includes('placeholder'))) {
                image = null
              }
              
              return (
                <div
                  key={`${track.artist['#text']}-${track.name}-${index}`}
                  className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex gap-4">
                    {image ? (
                      <img
                        src={image}
                        alt={track.name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          const fallback = e.target.nextElementSibling
                          if (fallback) fallback.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div className={`w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0 ${image ? 'hidden' : ''}`}>
                      <MusicalNoteIcon className="w-8 h-8 text-purple-400/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-primary truncate">
                          {track.name}
                        </h3>
                        {isNowPlaying && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full flex-shrink-0">
                            播放中
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary truncate mb-2">
                        {track.artist['#text']}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatDate(track.date)}
                      </p>
                    </div>
                  </div>
                </div>
              )
              })}
            </div>
            
            {/* 載入更多按鈕（顯示已載入但未顯示的記錄） */}
            {activeTab === 'recent' && recentTracks.length > recentTracksLimit && (() => {
              const remaining = recentTracks.length - recentTracksLimit
              // 如果剩餘數量很少（少於 10 條），自動顯示全部
              if (remaining <= 10) {
                // 自動顯示全部
                if (recentTracksLimit < recentTracks.length) {
                  setTimeout(() => setRecentTracksLimit(recentTracks.length), 0)
                }
                return null
              }
              
              return (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => setRecentTracksLimit(prev => prev + 50)}
                    className="px-6 py-3 bg-primary/20 border border-primary/30 text-primary rounded-lg hover:bg-primary/30 transition-colors font-medium"
                  >
                    載入更多（顯示 {recentTracksLimit} / {recentTracks.length}）
                  </button>
                </div>
              )
            })()}
            
            {/* 載入更多數據按鈕（從 API 獲取更多記錄） */}
            {activeTab === 'recent' && hasMoreTracks && recentTracksLimit >= recentTracks.length && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={async () => {
                    setLoadingMore(true)
                    try {
                      // 計算需要載入的頁數（每頁 200 條）
                      const currentPage = Math.ceil(recentTracks.length / 200) + 1
                      const newTracksData = await getRecentTracks(200, currentPage)
                      const newTracks = newTracksData?.recenttracks?.track || []
                      const newTracksArray = Array.isArray(newTracks) ? newTracks : [newTracks].filter(Boolean)
                      
                      if (newTracksArray.length > 0) {
                        setRecentTracks(prev => [...prev, ...newTracksArray])
                        setRecentTracksLimit(prev => prev + newTracksArray.length)
                        
                        // 檢查是否還有更多
                        const attr = newTracksData?.recenttracks?.['@attr']
                        if (attr) {
                          const totalPages = parseInt(attr.totalPages || '1', 10)
                          const page = parseInt(attr.page || '1', 10)
                          setHasMoreTracks(page < totalPages)
                        } else {
                          setHasMoreTracks(newTracksArray.length >= 200)
                        }
                      } else {
                        setHasMoreTracks(false)
                      }
                    } catch (err) {
                      console.error('載入更多播放記錄失敗:', err)
                    } finally {
                      setLoadingMore(false)
                    }
                  }}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-primary/20 border border-primary/30 text-primary rounded-lg hover:bg-primary/30 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      載入中...
                    </>
                  ) : (
                    '載入更多記錄'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 最愛藝術家 */}
        {activeTab === 'artists' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topArtists.map((artist, index) => {
              // 調試：檢查第一個藝術家的顯示數據
              if (index === 0) {
                console.log('=== 藝術家顯示調試 ===')
                console.log('Artist:', artist.name)
                console.log('Artist image data:', artist.image)
                console.log('Is array:', Array.isArray(artist.image))
              }
              
              // 嘗試多種方式獲取圖片（與專輯邏輯保持一致）
              let image = null
              
              if (artist.image && Array.isArray(artist.image)) {
                // 按優先順序嘗試不同大小的圖片（與專輯邏輯一致）
                image = artist.image.find(img => img && img.size === 'extralarge' && img['#text'] && img['#text'] !== '')?.['#text'] ||
                       artist.image.find(img => img && img.size === 'large' && img['#text'] && img['#text'] !== '')?.['#text'] ||
                       artist.image.find(img => img && img.size === 'medium' && img['#text'] && img['#text'] !== '')?.['#text'] ||
                       artist.image.find(img => img && img.size === 'small' && img['#text'] && img['#text'] !== '')?.['#text'] ||
                       artist.image.find(img => img && img.size === 'mega' && img['#text'] && img['#text'] !== '')?.['#text'] ||
                       artist.image.find(img => img && img['#text'] && img['#text'] !== '')?.['#text']
              }
              
              // 調試：輸出找到的圖片 URL
              if (index === 0) {
                console.log('Found image URL:', image)
              }
              
              // 過濾掉 Last.fm 的預設佔位符圖片（與專輯邏輯一致）
              if (image && (image.includes('2a96cbd8b46e442fc41c2b86b821562f') || 
                           image.includes('default') || 
                           image.includes('placeholder'))) {
                if (index === 0) {
                  console.log('❌ 圖片被過濾（是佔位符）')
                }
                image = null
              }
              
              // 調試：輸出最終圖片
              if (index === 0) {
                console.log('Final image URL:', image)
              }
              
              return (
                <div
                  key={artist.mbid || artist.name || index}
                  className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex gap-4">
                    {image ? (
                      <img
                        src={image}
                        alt={artist.name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          const fallback = e.target.nextElementSibling
                          if (fallback) fallback.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div className={`w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0 ${image ? 'hidden' : ''}`}>
                      <MusicalNoteIcon className="w-8 h-8 text-purple-400/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-text-secondary w-6">
                          #{index + 1}
                        </span>
                        <h3 className="font-semibold text-primary truncate">
                          {artist.name}
                        </h3>
                      </div>
                      <p className="text-sm text-text-secondary">
                        {formatNumber(artist.playcount)} 次播放
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 最愛歌曲 */}
        {activeTab === 'tracks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topTracks.map((track, index) => {
              // 獲取圖片 URL（按優先順序嘗試不同大小）
              let image = null
              
              // 方法1：從 track.image 獲取
              if (track.image && Array.isArray(track.image)) {
                const validImages = filterValidImages(track.image)
                image = validImages.find(img => img.size === 'large')?.['#text'] ||
                       validImages.find(img => img.size === 'extralarge')?.['#text'] ||
                       validImages.find(img => img.size === 'medium')?.['#text'] ||
                       validImages.find(img => img.size === 'small')?.['#text'] ||
                       validImages[0]?.['#text']
              }
              
              // 方法2：如果 track 沒有圖片，嘗試從 track.album 獲取
              if (!image && track.album?.image) {
                const albumImages = Array.isArray(track.album.image) ? track.album.image : [track.album.image]
                const validAlbumImages = filterValidImages(albumImages)
                image = validAlbumImages.find(img => img.size === 'large')?.['#text'] ||
                       validAlbumImages.find(img => img.size === 'extralarge')?.['#text'] ||
                       validAlbumImages.find(img => img.size === 'medium')?.['#text'] ||
                       validAlbumImages[0]?.['#text']
              }
              
              return (
                <div
                  key={track.mbid || `${track.artist.name}-${track.name}` || index}
                  className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex gap-4">
                    {image ? (
                      <img
                        src={image}
                        alt={track.name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          const fallback = e.target.nextElementSibling
                          if (fallback) fallback.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div className={`w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0 ${image ? 'hidden' : ''}`}>
                      <MusicalNoteIcon className="w-8 h-8 text-blue-400/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-text-secondary w-6">
                          #{index + 1}
                        </span>
                        <h3 className="font-semibold text-primary truncate">
                          {track.name}
                        </h3>
                      </div>
                      <p className="text-sm text-text-secondary truncate mb-1">
                        {track.artist.name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatNumber(track.playcount)} 次播放
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 最愛專輯 */}
        {activeTab === 'albums' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topAlbums.map((album, index) => {
              // 嘗試多種方式獲取圖片
              let image = null
              if (album.image && Array.isArray(album.image)) {
                // 按優先順序嘗試不同大小的圖片
                image = album.image.find(img => img && img.size === 'large' && img['#text'] && img['#text'] !== '')?.['#text'] ||
                       album.image.find(img => img && img.size === 'extralarge' && img['#text'] && img['#text'] !== '')?.['#text'] ||
                       album.image.find(img => img && img.size === 'medium' && img['#text'] && img['#text'] !== '')?.['#text'] ||
                       album.image.find(img => img && img.size === 'small' && img['#text'] && img['#text'] !== '')?.['#text'] ||
                       album.image.find(img => img && img['#text'] && img['#text'] !== '')?.['#text']
              }
              
              // 過濾掉 Last.fm 的預設佔位符圖片
              if (image && (image.includes('2a96cbd8b46e442fc41c2b86b821562f') || 
                           image.includes('default') || 
                           image.includes('placeholder'))) {
                image = null
              }
              
              return (
                <div
                  key={album.mbid || `${album.artist.name}-${album.name}` || index}
                  className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex gap-4">
                    {image ? (
                      <img
                        src={image}
                        alt={album.name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          const fallback = e.target.nextElementSibling
                          if (fallback) fallback.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div className={`w-16 h-16 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0 ${image ? 'hidden' : ''}`}>
                      <MusicalNoteIcon className="w-8 h-8 text-green-400/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-text-secondary w-6">
                          #{index + 1}
                        </span>
                        <h3 className="font-semibold text-primary truncate">
                          {album.name}
                        </h3>
                      </div>
                      <p className="text-sm text-text-secondary truncate mb-1">
                        {album.artist.name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatNumber(album.playcount)} 次播放
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 統計視覺化 - Last.fm 風格 */}
        {activeTab === 'stats' && (
          <div className="space-y-8">
            {/* Scrobbles 區域 - 粉色背景，帶條形圖 */}
            {(dailyChartData.length > 0 || userInfo?.playcount) && (
              <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl border border-pink-500/30 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-white">Scrobbles</h2>
                        {/* 切換按鈕 */}
                        <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1 border border-white/20">
                          <button
                            onClick={() => setScrobblesView('7days')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                              scrobblesView === '7days'
                                ? 'bg-white/20 text-white shadow-sm'
                                : 'text-pink-200/70 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            7 天
                          </button>
                          <button
                            onClick={() => setScrobblesView('30days')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                              scrobblesView === '30days'
                                ? 'bg-white/20 text-white shadow-sm'
                                : 'text-pink-200/70 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            30 天
                          </button>
                          <button
                            onClick={() => setScrobblesView('total')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                              scrobblesView === 'total'
                                ? 'bg-white/20 text-white shadow-sm'
                                : 'text-pink-200/70 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            總計
                          </button>
                        </div>
                      </div>
                      <div className="text-6xl font-bold text-white mb-2">
                        {scrobblesView === 'total' 
                          ? formatNumber(userInfo?.playcount || 0)
                          : totalScrobbles
                        }
                      </div>
                      <div className="text-pink-300 text-sm">
                        {scrobblesView === '7days' ? '最近 7 天' : 
                         scrobblesView === '30days' ? '最近 30 天' : 
                         '總播放次數'}
                      </div>
                    </div>
                    {/* 條形圖 - 在 7 天和 30 天視圖時顯示 */}
                    {(scrobblesView === '7days' || scrobblesView === '30days') && dailyChartData.length > 0 && (
                      <div className="w-64 h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={weeklyBarData}
                            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                          >
                            <Bar 
                              dataKey="count" 
                              fill="#ec4899" 
                              radius={[4, 4, 0, 0]}
                              minPointSize={2}
                            />
                            <XAxis 
                              dataKey="day" 
                              tick={{ fill: '#fff', fontSize: scrobblesView === '30days' ? 7 : 9 }}
                              axisLine={false}
                              tickLine={false}
                              interval={scrobblesView === '30days' ? 4 : 0}
                            />
                            <YAxis 
                              hide={true}
                              domain={[0, 'auto']}
                              allowDecimals={false}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {/* 總計視圖時顯示圖標或裝飾 */}
                    {scrobblesView === 'total' && (
                      <div className="w-64 h-32 flex items-center justify-center">
                        <div className="text-6xl opacity-20">🎵</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TOP MUSIC 區域 */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">TOP MUSIC</h2>
              
              {/* 三個小統計卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-purple-500/30 rounded-xl border border-purple-500/40 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-purple-200 mb-2 font-medium">Artists</div>
                      <div className="text-4xl font-bold text-white mb-2">{topMusicStats.artists}</div>
                      {topMusicStats.artistsChange !== null && (
                        <div className={`text-sm font-semibold ${topMusicStats.artistsChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {topMusicStats.artistsChange >= 0 ? '↑' : '↓'}{Math.abs(topMusicStats.artistsChange)}%
                        </div>
                      )}
                    </div>
                    <div className="w-12 h-12 flex items-end justify-center">
                      <div className="flex gap-0.5 items-end h-full">
                        <div className="w-2 bg-purple-300 rounded-t" style={{ height: '60%' }}></div>
                        <div className="w-2 bg-purple-300 rounded-t" style={{ height: '85%' }}></div>
                        <div className="w-2 bg-purple-300 rounded-t" style={{ height: '45%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-teal-500/30 rounded-xl border border-teal-500/40 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-teal-200 mb-2 font-medium">Albums</div>
                      <div className="text-4xl font-bold text-white mb-2">{topMusicStats.albums}</div>
                      {topMusicStats.albumsChange !== null && (
                        <div className={`text-sm font-semibold ${topMusicStats.albumsChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {topMusicStats.albumsChange >= 0 ? '↑' : '↓'}{Math.abs(topMusicStats.albumsChange)}%
                        </div>
                      )}
                    </div>
                    <div className="w-12 h-12 flex items-end justify-center">
                      <div className="flex gap-0.5 items-end h-full">
                        <div className="w-2 bg-teal-300 rounded-t" style={{ height: '70%' }}></div>
                        <div className="w-2 bg-teal-300 rounded-t" style={{ height: '50%' }}></div>
                        <div className="w-2 bg-teal-300 rounded-t" style={{ height: '90%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-500/30 rounded-xl border border-blue-500/40 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-blue-200 mb-2 font-medium">Tracks</div>
                      <div className="text-4xl font-bold text-white mb-2">{topMusicStats.tracks}</div>
                      {topMusicStats.tracksChange !== null && (
                        <div className={`text-sm font-semibold ${topMusicStats.tracksChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {topMusicStats.tracksChange >= 0 ? '↑' : '↓'}{Math.abs(topMusicStats.tracksChange)}%
                        </div>
                      )}
                    </div>
                    <div className="w-12 h-12 flex items-end justify-center">
                      <div className="flex gap-0.5 items-end h-full">
                        <div className="w-2 bg-blue-300 rounded-t" style={{ height: '55%' }}></div>
                        <div className="w-2 bg-blue-300 rounded-t" style={{ height: '75%' }}></div>
                        <div className="w-2 bg-blue-300 rounded-t" style={{ height: '40%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 三個大卡片：Top Artist, Top Album, Top Track */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Top Artist */}
                {(() => {
                  const currentTopArtists = scrobblesView === '7days' ? topArtists7day : 
                                           scrobblesView === '30days' ? topArtists30day : 
                                           topArtistsOverall
                  if (currentTopArtists.length === 0) return null
                  const topArtist = currentTopArtists[0]
                  const artistImage = topArtist.image?.find(img => img.size === 'large')?.['#text'] ||
                                     topArtist.image?.find(img => img.size === 'extralarge')?.['#text'] ||
                                     topArtist.image?.[3]?.['#text']
                  return (
                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                      <div className="relative w-full h-48">
                        {artistImage ? (
                          <img 
                            src={artistImage} 
                            alt={topArtist.name}
                            className="w-full h-48 object-cover"
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-full h-48 bg-gradient-to-br from-purple-500/20 to-pink-500/20"></div>
                        )}
                        <div className="absolute bottom-0 left-0 bg-purple-500/90 px-3 py-1.5 rounded-tr-lg">
                          <span className="text-xs font-bold text-white uppercase tracking-wide">Top Artist</span>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="text-xl font-bold text-white mb-1">
                          #1 {topArtist.name}
                        </div>
                        <div className="text-sm text-gray-400 mb-5">
                          {formatNumber(topArtist.playcount)} scrobbles
                        </div>
                        <div className="space-y-1.5">
                          {currentTopArtists.slice(1, 5).map((artist, idx) => (
                            <div key={artist.mbid || artist.name || idx} className="text-sm text-gray-300">
                              #{idx + 2} {artist.name} {formatNumber(artist.playcount)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Top Album */}
                {(() => {
                  const currentTopAlbums = scrobblesView === '7days' ? topAlbums7day : 
                                          scrobblesView === '30days' ? topAlbums30day : 
                                          topAlbumsOverall
                  if (currentTopAlbums.length === 0) return null
                  const topAlbum = currentTopAlbums[0]
                  const albumImage = topAlbum.image?.find(img => img.size === 'large')?.['#text'] ||
                                    topAlbum.image?.find(img => img.size === 'extralarge')?.['#text'] ||
                                    topAlbum.image?.[3]?.['#text']
                  return (
                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                      <div className="relative w-full h-48">
                        {albumImage ? (
                          <img 
                            src={albumImage} 
                            alt={topAlbum.name}
                            className="w-full h-48 object-cover"
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-full h-48 bg-gradient-to-br from-green-500/20 to-emerald-500/20"></div>
                        )}
                        <div className="absolute bottom-0 left-0 bg-green-500/90 px-3 py-1.5 rounded-tr-lg">
                          <span className="text-xs font-bold text-white uppercase tracking-wide">Top Album</span>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="text-xl font-bold text-white mb-1">
                          #1 {topAlbum.name}
                        </div>
                        <div className="text-sm text-gray-400 mb-5">
                          {topAlbum.artist?.name || topAlbum.artist?.['#text']} • {formatNumber(topAlbum.playcount)} scrobbles
                        </div>
                        <div className="space-y-1.5">
                          {currentTopAlbums.slice(1, 5).map((album, idx) => (
                            <div key={album.mbid || `${album.artist?.name || ''}-${album.name}` || idx} className="text-sm text-gray-300">
                              #{idx + 2} {album.name} {formatNumber(album.playcount)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Top Track */}
                {(() => {
                  const currentTopTracks = scrobblesView === '7days' ? topTracks7day : 
                                         scrobblesView === '30days' ? topTracks30day : 
                                         topTracksOverall
                  const topTrackList = Array.isArray(currentTopTracks) ? currentTopTracks : [currentTopTracks].filter(Boolean)
                  if (topTrackList.length === 0) return null
                  
                  const topTrack = topTrackList[0]
                  const trackImage = topTrack.image?.find(img => img.size === 'large')?.['#text'] ||
                                    topTrack.image?.find(img => img.size === 'extralarge')?.['#text'] ||
                                    topTrack.image?.[3]?.['#text']
                  
                  return (
                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                      <div className="relative w-full h-48">
                        {trackImage ? (
                          <img 
                            src={trackImage} 
                            alt={topTrack.name}
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              const fallback = e.target.nextElementSibling
                              if (fallback) {
                                fallback.style.display = 'flex'
                              }
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-48 bg-gradient-to-br from-blue-500/20 to-purple-500/20 ${trackImage ? 'hidden' : 'flex'} items-center justify-center`}>
                          <MusicalNoteIcon className="w-24 h-24 text-blue-400/50" />
                        </div>
                        <div className="absolute bottom-0 left-0 bg-blue-500/90 px-3 py-1.5 rounded-tr-lg">
                          <span className="text-xs font-bold text-white uppercase tracking-wide">Top Track</span>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="text-xl font-bold text-white mb-1">
                          #1 {topTrack.name}
                        </div>
                        <div className="text-sm text-gray-400 mb-5">
                          {topTrack.artist?.name || topTrack.artist?.['#text'] || 'Unknown Artist'} • {formatNumber(topTrack.playcount)} scrobbles
                        </div>
                        <div className="space-y-1.5">
                          {topTrackList.slice(1, 5).map((track, idx) => (
                            <div key={track.mbid || `${track.artist?.name || track.artist?.['#text']}-${track.name}` || idx} className="text-sm text-gray-300">
                              #{idx + 2} {track.name} {formatNumber(track.playcount)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Listening Clock - 徑向條形圖 */}
            {listeningClockData.length > 0 && busiestHour && (
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Listening Clock</h3>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Busiest hour</div>
                    <div className="text-lg font-bold text-white">
                      {busiestHour.hour.toString().padStart(2, '0')}:00 ({busiestHour.count} scrobbles)
                    </div>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ResponsiveContainer width="100%" height={400}>
                    <RadialBarChart 
                      cx="50%" 
                      cy="50%" 
                      innerRadius="30%" 
                      outerRadius="90%" 
                      data={listeningClockData}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <PolarAngleAxis 
                        type="number" 
                        domain={[0, 23]} 
                        angleAxisId={0} 
                        tick={false}
                      />
                      <RadialBar 
                        dataKey="count" 
                        cornerRadius={4}
                        fill="#06b6d4"
                      />
                      <Tooltip 
                        formatter={(value) => [`${value} scrobbles`]}
                        labelFormatter={(label) => `${label.toString().padStart(2, '0')}:00`}
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #ffffff20',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Quick Facts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {totalScrobbles > 0 && (
                <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                  <div className="text-sm text-gray-400 mb-2">總播放次數</div>
                  <div className="text-3xl font-bold text-white mb-1">{totalScrobbles}</div>
                  <div className="text-xs text-gray-500">最近 7 天</div>
                </div>
              )}
              {dailyChartData.length > 0 && (
                <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                  <div className="text-sm text-gray-400 mb-2">平均每日播放</div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {Math.round(totalScrobbles / dailyChartData.length)}
                  </div>
                  <div className="text-xs text-gray-500">次/天</div>
                </div>
              )}
              {busiestHour && (
                <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                  <div className="text-sm text-gray-400 mb-2">最活躍時段</div>
                  <div className="text-3xl font-bold text-white mb-1">{busiestHour.hour.toString().padStart(2, '0')}:00</div>
                  <div className="text-xs text-gray-500">{busiestHour.count} scrobbles</div>
                </div>
              )}
            </div>

            {/* 空狀態 */}
            {dailyChartData.length === 0 && topArtists.length === 0 && (
              <div className="text-center py-12">
                <p className="text-text-secondary">沒有足夠的數據來顯示統計</p>
              </div>
            )}
          </div>
        )}

        {/* 空狀態 */}
        {activeTab === 'recent' && recentTracks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary">沒有最近的播放記錄</p>
          </div>
        )}
        {activeTab === 'artists' && topArtists.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary">沒有藝術家資料</p>
          </div>
        )}
        {activeTab === 'albums' && topAlbums.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary">沒有專輯資料</p>
          </div>
        )}
        {activeTab === 'tracks' && topTracks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary">沒有歌曲資料</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Music

