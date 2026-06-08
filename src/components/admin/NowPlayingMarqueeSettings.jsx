import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '../../utils/firebase'
import { weatherCategories } from '../../utils/weatherCategories'
import { useTheme } from '../../contexts/ThemeContext'
import {
  ResponsiveCard,
  ResponsiveLabel,
  ResponsiveTitle,
  ResponsiveText,
} from '../common/ResponsiveContainer'
import { CwAlert, CwCard, CwInput, CwTextarea } from '../studio/ui'

const CW_CHECKBOX =
  'h-4 w-4 shrink-0 cursor-pointer rounded border-[var(--cw-border-strong)] accent-zinc-400 focus:ring-[var(--cw-focus-ring)] disabled:opacity-50'

/**
 * 跑馬燈設定（音樂／天氣）；Studio 使用 CwCard / CwInput，Classic 維持 Responsive*。
 */
export default function NowPlayingMarqueeSettings() {
  const { isStudio } = useTheme()

  const [enabled, setEnabled] = useState(false)
  const [showOnlyNowPlaying, setShowOnlyNowPlaying] = useState(false)
  const [showOnlyNowPlayingStrict, setShowOnlyNowPlayingStrict] = useState(false)
  const [speed, setSpeed] = useState(60)
  const [speedInput, setSpeedInput] = useState('60')
  const [weatherPhrases, setWeatherPhrases] = useState({})
  const [weatherPhrasesInput, setWeatherPhrasesInput] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'nowPlayingMarquee', 'global'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          const speedValue = data.speed || 60
          const phrases = data.weatherPhrases || {}
          setEnabled(data.enabled || false)
          setShowOnlyNowPlaying(data.showOnlyNowPlaying || false)
          setShowOnlyNowPlayingStrict(data.showOnlyNowPlayingStrict || false)
          setSpeed(speedValue)
          setSpeedInput(speedValue.toString())
          setWeatherPhrases(phrases)
          setWeatherPhrasesInput(phrases)
        } else {
          setEnabled(false)
          setShowOnlyNowPlaying(false)
          setShowOnlyNowPlayingStrict(false)
          setSpeed(60)
          setSpeedInput('60')
          setWeatherPhrases({})
          setWeatherPhrasesInput({})
        }
        setIsLoading(false)
        setError('')
      },
      (err) => {
        console.error('載入跑馬燈設定失敗:', err)
        setError('載入設定失敗')
        setIsLoading(false)
      }
    )
    return unsubscribe
  }, [])

  const updateSettings = async (updates) => {
    try {
      setIsSaving(true)
      setError('')
      setSuccessMessage('')

      const currentData = {
        enabled,
        showOnlyNowPlaying,
        showOnlyNowPlayingStrict,
        speed,
        weatherPhrases,
        ...updates,
      }

      await setDoc(doc(db, 'nowPlayingMarquee', 'global'), {
        ...currentData,
        lastUpdated: serverTimestamp(),
        updatedBy: auth.currentUser?.uid,
      })

      setSuccessMessage('設定已更新')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('更新設定失敗:', err)
      setError('更新設定失敗')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEnabledChange = async (newEnabled) => {
    setEnabled(newEnabled)
    await updateSettings({ enabled: newEnabled })
  }

  const handleShowOnlyNowPlayingChange = async (newValue) => {
    setShowOnlyNowPlaying(newValue)
    await updateSettings({ showOnlyNowPlaying: newValue })
  }

  const handleShowOnlyNowPlayingStrictChange = async (newValue) => {
    setShowOnlyNowPlayingStrict(newValue)
    await updateSettings({ showOnlyNowPlayingStrict: newValue })
  }

  const handleSpeedChange = async (newSpeed) => {
    const speedValue = Math.max(10, Math.min(300, parseInt(newSpeed, 10) || 60))
    setSpeed(speedValue)
    setSpeedInput(speedValue.toString())
    await updateSettings({ speed: speedValue })
  }

  const handleSpeedInputChange = (e) => {
    setSpeedInput(e.target.value)
  }

  const handleSpeedInputBlur = async () => {
    const numValue = parseInt(speedInput, 10)
    if (!Number.isNaN(numValue) && numValue >= 10 && numValue <= 300) {
      const speedValue = numValue
      setSpeed(speedValue)
      await updateSettings({ speed: speedValue })
    } else {
      setSpeedInput(speed.toString())
    }
  }

  const handleSpeedInputKeyPress = (e) => {
    if (e.key === 'Enter') e.target.blur()
  }

  const handleWeatherPhraseInputChange = (categoryKey, phrase) => {
    setWeatherPhrasesInput({ ...weatherPhrasesInput, [categoryKey]: phrase })
  }

  const handleWeatherPhraseBlur = async (categoryKey) => {
    const phrase = weatherPhrasesInput[categoryKey] || ''
    if (weatherPhrases[categoryKey] !== phrase) {
      const newPhrases = { ...weatherPhrases, [categoryKey]: phrase }
      setWeatherPhrases(newPhrases)
      await updateSettings({ weatherPhrases: newPhrases })
    }
  }

  const controlsDisabled = isSaving || !enabled

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className={
            isStudio
              ? 'h-8 w-8 animate-spin rounded-full border-2 border-[var(--cw-border)] border-t-[var(--cw-text)]'
              : 'h-8 w-8 animate-spin rounded-full border-b-2 border-primary'
          }
          aria-hidden
        />
      </div>
    )
  }

  if (isStudio) {
    return (
      <div className="space-y-4">
        {successMessage ? <CwAlert variant="success">{successMessage}</CwAlert> : null}
        {error ? <CwAlert variant="error">{error}</CwAlert> : null}

        <CwCard
          title="跑馬燈總開關"
          subtitle="控制是否啟用跑馬燈功能"
        >
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleEnabledChange(e.target.checked)}
              disabled={isSaving}
              className={CW_CHECKBOX}
            />
            <span className="text-sm text-[var(--cw-text)]">啟用跑馬燈顯示</span>
          </label>
        </CwCard>

        <CwCard
          title="播歌顯示"
          subtitle="關閉後跑馬燈仍會顯示天氣資訊"
        >
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={showOnlyNowPlaying}
                onChange={(e) => handleShowOnlyNowPlayingChange(e.target.checked)}
                disabled={controlsDisabled}
                className={CW_CHECKBOX}
              />
              <span className="text-sm text-[var(--cw-text)]">顯示音樂播放資訊</span>
            </label>
            {showOnlyNowPlaying ? (
              <label className="flex cursor-pointer items-center gap-3 pl-7">
                <input
                  type="checkbox"
                  checked={showOnlyNowPlayingStrict}
                  onChange={(e) => handleShowOnlyNowPlayingStrictChange(e.target.checked)}
                  disabled={controlsDisabled}
                  className={CW_CHECKBOX}
                />
                <span className="text-sm text-[var(--cw-text-muted)]">
                  只有「正在播放」時才顯示（不顯示「最近播放」）
                </span>
              </label>
            ) : null}
          </div>
        </CwCard>

        <CwCard
          title="跑馬燈速度"
          subtitle="數值越小滾動越快，建議 10–300 秒"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="min-w-[4.5rem] text-xs font-medium uppercase tracking-wide text-[var(--cw-text-muted)]">
                速度（秒）
              </span>
              <input
                type="range"
                min="10"
                max="300"
                step="5"
                value={speed}
                onChange={(e) => handleSpeedChange(e.target.value)}
                disabled={controlsDisabled}
                className="h-1.5 min-w-[8rem] flex-1 cursor-pointer appearance-none rounded-full bg-[var(--cw-mega-surface)] accent-[var(--cw-text)] disabled:opacity-50"
              />
              <CwInput
                type="number"
                min={10}
                max={300}
                value={speedInput}
                onChange={handleSpeedInputChange}
                onBlur={handleSpeedInputBlur}
                onKeyDown={handleSpeedInputKeyPress}
                disabled={controlsDisabled}
                className="w-24 shrink-0"
                inputClassName="min-h-9 text-center cw-tabular"
                aria-label="跑馬燈速度秒數"
              />
            </div>
            <div className="flex justify-between text-[11px] text-[var(--cw-text-muted)]">
              <span>快速 (10s)</span>
              <span>中等 (60s)</span>
              <span>慢速 (300s)</span>
            </div>
          </div>
        </CwCard>

        <CwCard
          title="天氣自訂用語"
          subtitle="每行一則，會隨機選一則接在天氣資訊後"
        >
          <CwAlert variant="neutral" className="mb-4">
            <strong>資料來源：</strong>桃園機場（25.0797°N, 121.2342°E），用語依該地實際天氣顯示。
          </CwAlert>
          <div className="space-y-5">
            {weatherCategories.map((category) => (
              <div key={category.key}>
                <div className="mb-2 flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium text-[var(--cw-text)]">{category.label}</span>
                  <span className="text-xs text-[var(--cw-text-muted)]">{category.description}</span>
                </div>
                <CwTextarea
                  value={weatherPhrasesInput[category.key] || ''}
                  onChange={(e) => handleWeatherPhraseInputChange(category.key, e.target.value)}
                  onBlur={() => handleWeatherPhraseBlur(category.key)}
                  disabled={controlsDisabled}
                  rows={3}
                  hint="每行一個用語"
                />
              </div>
            ))}
          </div>
        </CwCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="text-green-400">✓</div>
            <ResponsiveText color="success">{successMessage}</ResponsiveText>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="text-red-400">✗</div>
            <ResponsiveText color="danger">{error}</ResponsiveText>
          </div>
        </div>
      )}

      <ResponsiveCard>
        <div className="space-y-4">
          <div>
            <ResponsiveTitle level={3} className="mb-2">
              跑馬燈總開關
            </ResponsiveTitle>
            <ResponsiveText size="sm" color="secondary" className="mb-4">
              控制是否啟用跑馬燈功能
            </ResponsiveText>
          </div>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleEnabledChange(e.target.checked)}
              disabled={isSaving}
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <ResponsiveText>啟用跑馬燈顯示</ResponsiveText>
          </label>
        </div>
      </ResponsiveCard>

      <ResponsiveCard>
        <div className="space-y-4">
          <div>
            <ResponsiveTitle level={3} className="mb-2">
              播歌顯示開關
            </ResponsiveTitle>
            <ResponsiveText size="sm" color="secondary" className="mb-4">
              控制是否在跑馬燈中顯示音樂播放資訊。即使關閉，跑馬燈仍會顯示天氣資訊。
            </ResponsiveText>
          </div>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={showOnlyNowPlaying}
                onChange={(e) => handleShowOnlyNowPlayingChange(e.target.checked)}
                disabled={controlsDisabled}
                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <ResponsiveText>顯示音樂播放資訊</ResponsiveText>
            </label>
            {showOnlyNowPlaying && (
              <label className="ml-8 flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={showOnlyNowPlayingStrict}
                  onChange={(e) => handleShowOnlyNowPlayingStrictChange(e.target.checked)}
                  disabled={controlsDisabled}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <ResponsiveText size="sm">只有「正在播放」時才顯示（不顯示「最近播放」）</ResponsiveText>
              </label>
            )}
          </div>
        </div>
      </ResponsiveCard>

      <ResponsiveCard>
        <div className="space-y-4">
          <div>
            <ResponsiveTitle level={3} className="mb-2">
              跑馬燈速度
            </ResponsiveTitle>
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
                disabled={controlsDisabled}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-surface accent-primary"
              />
              <input
                type="number"
                min="10"
                max="300"
                value={speedInput}
                onChange={handleSpeedInputChange}
                onBlur={handleSpeedInputBlur}
                onKeyPress={handleSpeedInputKeyPress}
                disabled={controlsDisabled}
                className="w-20 rounded border border-white/10 bg-surface px-2 py-1 text-center text-primary focus:border-primary/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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

      <ResponsiveCard>
        <div className="space-y-4">
          <div>
            <ResponsiveTitle level={3} className="mb-2">
              天氣自訂用語
            </ResponsiveTitle>
            <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
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
                  disabled={controlsDisabled}
                  rows={3}
                  className="w-full resize-y rounded border border-white/10 bg-surface px-3 py-2 text-primary placeholder-text-secondary focus:border-primary/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
  )
}
