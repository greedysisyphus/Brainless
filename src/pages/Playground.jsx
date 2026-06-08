import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MusicalNoteIcon, CloudIcon, CalendarIcon, ArrowLeftIcon, ChartBarIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
import { CocktailIcon } from '../config/navigation.jsx'
import { Suspense, lazy } from 'react'
import LoadingPage from './LoadingPage'
import { DualThemePage } from '../components/studio/DualThemePage'
import { CwBadge, CwButton, CwCard, CwInput, CwStack } from '../components/studio/ui'

const MusicContent = lazy(() => import('../components/playground/MusicContent'))
const WeatherContent = lazy(() => import('../components/playground/WeatherContent'))
const ScheduleManager = lazy(() => import('../components/playground/ScheduleManager'))
const EchartsDemo = lazy(() => import('./EchartsDemo'))
const AlcoholContent = lazy(() => import('../components/playground/AlcoholContent'))

const PLAY_ROOT_BC = [{ label: 'Brainless', href: '#/sandwich' }, { label: 'Playground', href: '#/playground' }]

const PAGE_META = {
  music: {
    crumb: '音樂',
    title: '音樂 Playground',
    description: '實驗音樂相關內容。',
  },
  weather: {
    crumb: '天氣',
    title: '天氣',
    description: '實驗天氣相關元件。',
  },
  schedule: {
    crumb: '班表匯出',
    title: '班表匯出',
    description: 'Playground 內輕量班表輸出介面。',
  },
  charts: {
    crumb: 'Charts Testing',
    title: 'Charts Testing',
    description: 'ECharts／圖表演練區。',
  },
  studioui: {
    crumb: 'Studio UI',
    title: 'Studio 元件樣板',
    description: 'CwButton／CwCard／CwInput 等對照，改版時請優先對齊此區。',
  },
  alcohol: {
    crumb: '酒精計算',
    title: '酒精濃度計算器',
    description: '複合調酒總酒精量、稀釋與換算 ml／shot。',
  },
}

function Playground() {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentPage, setCurrentPage] = useState(null)

  useEffect(() => {
    const hash = location.hash
    if (hash.includes('#music')) setCurrentPage('music')
    else if (hash.includes('#weather')) setCurrentPage('weather')
    else if (hash.includes('#schedule')) setCurrentPage('schedule')
    else if (hash.includes('#charts')) setCurrentPage('charts')
    else if (hash.includes('#studio-ui') || hash.includes('#craft-ui')) setCurrentPage('studioui')
    else if (hash.includes('#alcohol')) setCurrentPage('alcohol')
    else setCurrentPage(null)
  }, [location.hash])

  const breadcrumbs = useMemo(() => {
    if (!currentPage || !PAGE_META[currentPage]) return PLAY_ROOT_BC
    return [...PLAY_ROOT_BC, { label: PAGE_META[currentPage].crumb }]
  }, [currentPage])

  const title = currentPage ? PAGE_META[currentPage].title : 'Playground'
  const description = currentPage ? PAGE_META[currentPage].description : '實驗一些實驗。'

  const classicCatalog = (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="ui-warm-panel rounded-xl p-3">
            <MusicalNoteIcon className="h-8 w-8 text-purple-400" />
          </div>
          <div>
            <h2 className="mb-1 text-3xl font-bold text-primary">Playground</h2>
            <p className="text-text-secondary">實驗一些實驗</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          onClick={() => navigate('/playground#music')}
          className="group rounded-xl border border-white/10 bg-surface/40 p-6 backdrop-blur-md transition-all hover:scale-105 hover:border-purple-500/30"
        >
          <div className="flex items-center gap-4">
            <div className="ui-warm-panel rounded-lg p-3 transition-transform group-hover:scale-110">
              <MusicalNoteIcon className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-primary">音樂</h3>
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate('/playground#weather')}
          className="group rounded-xl border border-white/10 bg-surface/40 p-6 backdrop-blur-md transition-all hover:scale-105 hover:border-cyan-500/30"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-gradient-to-br from-cyan-500/20 to-teal-500/20 p-3 transition-transform group-hover:scale-110">
              <CloudIcon className="h-6 w-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-primary">天氣</h3>
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate('/playground#schedule')}
          className="group rounded-xl border border-white/10 bg-surface/40 p-6 backdrop-blur-md transition-all hover:scale-105 hover:border-green-500/30"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-3 transition-transform group-hover:scale-110">
              <CalendarIcon className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-primary">班表匯出</h3>
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate('/playground#alcohol')}
          className="group rounded-xl border border-white/10 bg-surface/40 p-6 backdrop-blur-md transition-all hover:scale-105 hover:border-pink-500/30"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-gradient-to-br from-pink-500/20 to-rose-500/20 p-3 transition-transform group-hover:scale-110">
              <CocktailIcon className="h-6 w-6 text-pink-400" />
            </div>
            <h3 className="text-xl font-bold text-primary">酒精計算</h3>
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate('/playground#charts')}
          className="group rounded-xl border border-white/10 bg-surface/40 p-6 backdrop-blur-md transition-all hover:scale-105 hover:border-amber-500/30 md:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-3 transition-transform group-hover:scale-110">
              <ChartBarIcon className="h-6 w-6 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-primary">Charts Testing</h3>
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate('/playground#studio-ui')}
          className="group rounded-xl border border-white/10 bg-surface/40 p-6 backdrop-blur-md transition-all hover:scale-105 hover:border-primary/30 md:col-span-2 lg:col-span-3"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-gradient-to-br from-lime-500/20 to-emerald-500/20 p-3 transition-transform group-hover:scale-110">
              <Squares2X2Icon className="h-6 w-6 text-lime-300" />
            </div>
            <h3 className="text-xl font-bold text-primary">Studio UI 樣板</h3>
          </div>
          <p className="mt-2 text-left text-sm text-text-secondary">對照 Cw 元件與 token，建議在 Studio 主題下開啟。</p>
        </button>
      </div>
    </div>
  )

  const studioCatalog = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {[
        { id: 'music', icon: MusicalNoteIcon, label: '音樂', sub: '#music', accent: 'text-purple-300' },
        { id: 'weather', icon: CloudIcon, label: '天氣', sub: '#weather', accent: 'text-cyan-300' },
        { id: 'schedule', icon: CalendarIcon, label: '班表匯出', sub: '#schedule', accent: 'text-emerald-300' },
        { id: 'charts', icon: ChartBarIcon, label: 'Charts Testing', sub: '#charts', accent: 'text-amber-300' },
        { id: 'alcohol', icon: CocktailIcon, label: '酒精計算', sub: '#alcohol', accent: 'text-pink-300' },
        {
          id: 'studioui',
          icon: Squares2X2Icon,
          label: 'Studio UI 樣板',
          sub: '#studio-ui',
          accent: 'text-lime-300',
        },
      ].map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => navigate(`/playground${item.sub}`)}
          className="text-left transition-opacity hover:opacity-95"
        >
          <CwCard className={`h-full border-[var(--cw-border-strong)] p-5 transition-colors hover:border-[var(--cw-border-strong)]/50`}>
            <div className="flex items-start gap-4">
              <div className={`rounded-xl border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] p-3 ${item.accent}`}>
                <item.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[var(--cw-text)]">{item.label}</p>
                <p className="mt-1 text-xs text-[var(--cw-text-muted)]">進入 Playground · {PAGE_META[item.id]?.description ?? ''}</p>
              </div>
            </div>
          </CwCard>
        </button>
      ))}
    </div>
  )

  const subClassic = (
    <div className="mx-auto max-w-6xl">
      <button
        type="button"
        onClick={() => navigate('/playground')}
        className="mb-6 flex items-center gap-2 text-text-secondary transition-colors hover:text-primary"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        <span>返回目錄</span>
      </button>
      <Suspense fallback={<LoadingPage />}>
        {currentPage === 'music' && <MusicContent />}
        {currentPage === 'weather' && <WeatherContent />}
        {currentPage === 'schedule' && <ScheduleManager />}
        {currentPage === 'charts' && <EchartsDemo />}
        {currentPage === 'alcohol' && <AlcoholContent />}
        {currentPage === 'studioui' && (
          <div className="rounded-xl border border-white/10 bg-surface/40 p-6">
            <p className="text-text-secondary">
              Studio UI 元件樣板主要在 <strong className="text-primary">Studio</strong> 主題下檢視；請用頂部主題切換後重新進入此頁。
            </p>
          </div>
        )}
      </Suspense>
    </div>
  )

  const studioUiShowcase = (
    <CwStack>
      <CwCard title="CwButton" className="border-[var(--cw-border-strong)]">
        <div className="flex flex-wrap gap-2">
          <CwButton type="button" variant="primary">
            Primary
          </CwButton>
          <CwButton type="button" variant="secondary">
            Secondary
          </CwButton>
          <CwButton type="button" variant="ghost">
            Ghost
          </CwButton>
          <CwButton type="button" variant="danger">
            Danger
          </CwButton>
        </div>
      </CwCard>
      <CwCard title="CwInput · CwBadge" className="border-[var(--cw-border-strong)]">
        <div className="grid gap-4 md:grid-cols-2">
          <CwInput label="範例欄位" placeholder="輸入文字" />
          <div className="flex flex-wrap items-end gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">CwBadge</span>
            <CwBadge>預設</CwBadge>
          </div>
        </div>
      </CwCard>
      <CwCard title="CwCard 表面" className="border-[var(--cw-border-strong)]">
        <p className="text-sm text-[var(--cw-text-muted)]">盤點表、班表區塊請優先使用此卡與 border token，與 shell 一致。</p>
      </CwCard>
    </CwStack>
  )

  const subStudio = (
    <div className="space-y-6">
      <button
        type="button"
        className="text-sm font-semibold text-[var(--cw-text)] hover:underline"
        onClick={() => navigate('/playground')}
      >
        ← 返回 Playground 目錄
      </button>
      <Suspense fallback={<LoadingPage />}>
        {currentPage === 'music' && <MusicContent />}
        {currentPage === 'weather' && <WeatherContent />}
        {currentPage === 'schedule' && <ScheduleManager />}
        {currentPage === 'charts' && <EchartsDemo />}
        {currentPage === 'alcohol' && <AlcoholContent />}
        {currentPage === 'studioui' && studioUiShowcase}
      </Suspense>
    </div>
  )

  const classicInner = (
    <div className="container-custom py-8">{currentPage === null ? classicCatalog : subClassic}</div>
  )

  const studioInner = (
    <div className="px-4 py-8 sm:px-6 lg:px-8">{currentPage === null ? studioCatalog : subStudio}</div>
  )

  return (
    <DualThemePage
      breadcrumbs={breadcrumbs}
      title={title}
      description={description}
      classic={classicInner}
      studio={studioInner}
    />
  )
}

export default Playground
