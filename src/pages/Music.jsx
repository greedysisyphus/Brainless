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
  getUserInfo, 
  getTopArtists, 
  getTopAlbums,
  getTopTracks
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
  const [activeTab, setActiveTab] = useState('recent')

  // 獲取所有資料
  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [user, recent, recentForChart, artists, albums, tracks] = await Promise.all([
        getUserInfo(),
        getRecentTracks(10),
        getRecentTracks(200), // 獲取更多數據用於圖表
        getTopArtists(10, '1month'),
        getTopAlbums(10, '1month'),
        getTopTracks(10, '1month')
      ])

      setUserInfo(user?.user)
      const tracksList = recent?.recenttracks?.track || []
      const tracksForChart = recentForChart?.recenttracks?.track || []
      // 確保是數組格式
      setRecentTracks(Array.isArray(tracksList) ? tracksList : [tracksList].filter(Boolean))
      setRecentTracksForChart(Array.isArray(tracksForChart) ? tracksForChart : [tracksForChart].filter(Boolean))
      setTopArtists(artists?.topartists?.artist || [])
      setTopAlbums(albums?.topalbums?.album || [])
      setTopTracks(tracks?.toptracks?.track || [])
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
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
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

  // 播放時間趨勢圖數據（按日期分組，最近7天）
  const dailyChartData = useMemo(() => {
    if (!recentTracksForChart || recentTracksForChart.length === 0) return []
    
    // 創建7天的數組，從6天前到今天
    const today = new Date()
    today.setHours(0, 0, 0, 0) // 重置為當天開始時間
    
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today)
      date.setDate(date.getDate() - (6 - i))
      return {
        date: date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
        count: 0,
        fullDate: date,
        dayName: date.toLocaleDateString('zh-TW', { weekday: 'short' })
      }
    })
    
    // 統計每天的播放次數
    recentTracksForChart.forEach(track => {
      if (track.date?.uts && !track['@attr']?.nowplaying) {
        const timestamp = parseInt(track.date.uts, 10) * 1000
        const trackDate = new Date(timestamp)
        trackDate.setHours(0, 0, 0, 0) // 重置為當天開始時間
        
        // 計算天數差
        const diffTime = today - trackDate
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        
        // 如果是在最近7天內，增加對應天的計數
        if (diffDays >= 0 && diffDays < 7) {
          days[6 - diffDays].count++
        }
      }
    })
    
    return days
  }, [recentTracksForChart])

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
    
    recentTracksForChart.forEach(track => {
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
  }, [recentTracksForChart])

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

        {/* 最近播放 */}
        {activeTab === 'recent' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentTracks.map((track, index) => {
              const isNowPlaying = track['@attr']?.nowplaying === 'true'
              const image = track.image?.find(img => img.size === 'large')?.['#text'] ||
                           track.image?.find(img => img.size === 'medium')?.['#text'] ||
                           track.image?.[2]?.['#text']
              
              return (
                <div
                  key={`${track.artist['#text']}-${track.name}-${index}`}
                  className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex gap-4">
                    {image && (
                      <img
                        src={image}
                        alt={track.name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    )}
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
        )}

        {/* 最愛藝術家 */}
        {activeTab === 'artists' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topArtists.map((artist, index) => {
              const image = artist.image?.find(img => img.size === 'large')?.['#text'] ||
                           artist.image?.find(img => img.size === 'medium')?.['#text'] ||
                           artist.image?.[2]?.['#text']
              
              return (
                <div
                  key={artist.mbid || artist.name || index}
                  className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex gap-4">
                    {image && (
                      <img
                        src={image}
                        alt={artist.name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    )}
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

        {/* 最愛專輯 */}
        {activeTab === 'albums' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topAlbums.map((album, index) => {
              const image = album.image?.find(img => img.size === 'large')?.['#text'] ||
                           album.image?.find(img => img.size === 'medium')?.['#text'] ||
                           album.image?.[2]?.['#text']
              
              return (
                <div
                  key={album.mbid || `${album.artist.name}-${album.name}` || index}
                  className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-4 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex gap-4">
                    {image && (
                      <img
                        src={image}
                        alt={album.name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    )}
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
            {dailyChartData.length > 0 && (
              <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl border border-pink-500/30 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">Scrobbles</h2>
                      <div className="text-6xl font-bold text-white mb-2">{totalScrobbles}</div>
                      <div className="text-pink-300 text-sm">最近 7 天</div>
                    </div>
                    {/* 條形圖 */}
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
                            tick={{ fill: '#fff', fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                          />
                          <YAxis 
                            hide={true}
                            domain={[0, 'auto']}
                            allowDecimals={false}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
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
                {topArtists.length > 0 && (() => {
                  const topArtist = topArtists[0]
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
                          {topArtists.slice(1, 5).map((artist, idx) => (
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
                {topAlbums.length > 0 && (() => {
                  const topAlbum = topAlbums[0]
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
                          {topAlbums.slice(1, 5).map((album, idx) => (
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
                {topTracks.length > 0 && (() => {
                  const topTrackList = Array.isArray(topTracks) ? topTracks : [topTracks].filter(Boolean)
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
      </div>
    </div>
  )
}

export default Music

