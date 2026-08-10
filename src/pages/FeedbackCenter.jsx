import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { auth, checkAdminStatus } from '../utils/firebase'
import { useTheme } from '../contexts/ThemeContext'
import {
  createComment,
  createFeedback,
  deleteComment,
  deleteFeedback,
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  subscribeToComments,
  subscribeToFeedback,
  toggleFeedbackVote,
  updateFeedbackStatus,
} from '../services/feedbackService'

const IDENTITY_KEY = 'brainlessFeedbackIdentity'
const CLIENT_ID_KEY = 'brainlessFeedbackClientId'
const STORE_OPTIONS = ['中央店', 'D7 店', 'D13 店', '其他']

const CATEGORY_ICONS = {
  feature: LightBulbIcon,
  bug: ExclamationTriangleIcon,
  discussion: QuestionMarkCircleIcon,
}

const STATUS_TONES = {
  reviewing: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  planned: 'bg-blue-100 text-blue-800 ring-blue-600/20',
  inProgress: 'bg-violet-100 text-violet-800 ring-violet-600/20',
  completed: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  declined: 'bg-stone-200 text-stone-700 ring-stone-500/20',
}

const CLASSIC_STATUS_TONES = {
  reviewing: 'bg-amber-400/10 text-amber-300 ring-amber-400/30',
  planned: 'bg-sky-400/10 text-sky-300 ring-sky-400/30',
  inProgress: 'bg-violet-400/10 text-violet-300 ring-violet-400/30',
  completed: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30',
  declined: 'bg-slate-400/10 text-slate-300 ring-slate-400/30',
}

function getClientId() {
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY)
    if (existing) return existing
    const next = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `feedback-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(CLIENT_ID_KEY, next)
    return next
  } catch {
    return `feedback-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

function readIdentity() {
  try {
    const parsed = JSON.parse(localStorage.getItem(IDENTITY_KEY) || '{}')
    return { name: parsed.name || '', store: parsed.store || '' }
  } catch {
    return { name: '', store: '' }
  }
}

function saveIdentity(identity) {
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
  } catch {
    // 無痕模式或儲存空間不可用時，仍允許本次送出。
  }
}

function formatTime(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  if (!date || Number.isNaN(date.getTime())) return '剛剛'
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMinutes < 1) return '剛剛'
  if (diffMinutes < 60) return `${diffMinutes} 分鐘前`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} 小時前`
  if (diffMinutes < 10080) return `${Math.floor(diffMinutes / 1440)} 天前`
  return new Intl.DateTimeFormat('zh-TW', { month: 'short', day: 'numeric' }).format(date)
}

function StatusBadge({ status, isClub }) {
  const resolved = FEEDBACK_STATUSES[status] || FEEDBACK_STATUSES.reviewing
  const tones = isClub ? STATUS_TONES : CLASSIC_STATUS_TONES
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tones[status] || tones.reviewing}`}>
      {resolved.label}
    </span>
  )
}

function IdentityFields({ identity, onChange, isClub, idPrefix }) {
  const fieldClass = isClub
    ? 'border-black/15 bg-white text-[#171717] placeholder:text-[#777168] focus:border-[#ec5836] focus:ring-[#ec5836]/20'
    : 'border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-primary focus:ring-primary/20'
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className={`mb-1.5 block text-sm font-semibold ${isClub ? 'text-[#4f4a43]' : 'text-slate-300'}`}>你的暱稱</span>
        <input
          id={`${idPrefix}-name`}
          value={identity.name}
          onChange={(event) => onChange({ ...identity, name: event.target.value })}
          maxLength={30}
          autoComplete="nickname"
          placeholder="暱稱"
          className={`min-h-11 w-full rounded-xl border px-3.5 py-2.5 text-base outline-none ring-2 ring-transparent transition ${fieldClass}`}
        />
      </label>
      <label className="block">
        <span className={`mb-1.5 block text-sm font-semibold ${isClub ? 'text-[#4f4a43]' : 'text-slate-300'}`}>分店</span>
        <select
          id={`${idPrefix}-store`}
          value={identity.store}
          onChange={(event) => onChange({ ...identity, store: event.target.value })}
          className={`min-h-11 w-full rounded-xl border px-3.5 py-2.5 text-base outline-none ring-2 ring-transparent transition ${fieldClass}`}
        >
          <option value="">請選擇</option>
          {STORE_OPTIONS.map((store) => <option key={store} value={store}>{store}</option>)}
        </select>
      </label>
    </div>
  )
}

function VoteButton({ feedback, clientId, isClub, busy, onVote, compact = false }) {
  const voted = Array.isArray(feedback.voterIds) && feedback.voterIds.includes(clientId)
  return (
    <button
      type="button"
      disabled={busy}
      onClick={(event) => {
        event.stopPropagation()
        onVote(feedback.id)
      }}
      aria-pressed={voted}
      aria-label={voted ? '取消我也需要' : '我也需要'}
      className={`group inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${
        compact ? 'h-12 w-12 flex-col text-xs' : 'min-h-11 px-3.5 text-sm'
      } ${
        voted
          ? isClub
            ? 'border-[#ec5836] bg-[#fff1ed] text-[#b3381e] focus-visible:outline-[#ec5836]'
            : 'border-primary/60 bg-primary/20 text-violet-200 focus-visible:outline-primary'
          : isClub
            ? 'border-black/10 bg-white text-[#595349] hover:border-[#ec5836] hover:text-[#b3381e] focus-visible:outline-[#ec5836]'
            : 'border-white/10 bg-white/5 text-slate-300 hover:border-primary/60 hover:text-white focus-visible:outline-primary'
      }`}
    >
      <ChevronUpIcon className="h-4 w-4" strokeWidth={2.25} />
      <span>{Number(feedback.voteCount) || 0}</span>
    </button>
  )
}

function Composer({ open, onClose, onCreated, onSelectExisting, feedbackItems, identity, setIdentity, clientId, isClub }) {
  const [form, setForm] = useState({ title: '', body: '', category: 'feature' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmedNoDuplicate, setConfirmedNoDuplicate] = useState(false)
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const similarFeedback = useMemo(() => {
    const normalized = form.title.trim().toLocaleLowerCase('zh-TW')
    if (normalized.length < 2) return []
    const terms = normalized.split(/\s+/).filter((term) => term.length >= 2)
    return feedbackItems
      .map((item) => {
        const haystack = `${item.title || ''} ${item.body || ''}`.toLocaleLowerCase('zh-TW')
        let score = haystack.includes(normalized) ? 5 : 0
        for (const term of terms) if (haystack.includes(term)) score += 1
        return { item, score }
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ item }) => item)
  }, [feedbackItems, form.title])

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const onKeyDown = (event) => event.key === 'Escape' && onCloseRef.current()
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => panelRef.current?.querySelector('input')?.focus())
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null
  const fieldClass = isClub
    ? 'border-black/15 bg-white text-[#171717] placeholder:text-[#777168] focus:border-[#ec5836] focus:ring-[#ec5836]/20'
    : 'border-white/10 bg-[#151521] text-white placeholder:text-slate-500 focus:border-primary focus:ring-primary/20'
  const submit = async (event) => {
    event.preventDefault()
    if (!identity.name.trim() || !identity.store) return setError('請先填寫暱稱與分店。')
    if (form.title.trim().length < 4) return setError('標題至少需要 4 個字。')
    if (form.body.trim().length < 10) return setError('請再多描述一點，至少需要 10 個字。')
    if (!confirmedNoDuplicate) return setError('請先確認上方沒有相同的回饋。')
    setSaving(true)
    setError('')
    try {
      saveIdentity(identity)
      const created = await createFeedback({ ...form, author: identity, clientId })
      setForm({ title: '', body: '', category: 'feature' })
      setConfirmedNoDuplicate(false)
      onCreated(created.id)
      onClose()
    } catch (err) {
      console.error('建立回饋失敗:', err)
      setError('目前無法送出回饋，請確認網路後再試一次。')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="fixed inset-0 z-[10000]">
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="關閉新增回饋" onClick={onClose} />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-composer-title"
        className={`absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-hidden shadow-[-20px_0_60px_rgba(0,0,0,0.24)] ${isClub ? 'bg-[#f7f6f2] text-[#171717]' : 'bg-[#111119] text-white'}`}
      >
        <header className={`flex items-start justify-between border-b px-5 py-5 sm:px-7 ${isClub ? 'border-black/10' : 'border-white/10'}`}>
          <div>
            <h2 id="feedback-composer-title" className="text-2xl font-black tracking-[-0.02em]">新增回饋</h2>
            <p className={`mt-1 text-sm ${isClub ? 'text-[#666057]' : 'text-slate-400'}`}>先說清楚情境，其他人就更容易加入討論。</p>
          </div>
          <button type="button" onClick={onClose} className={`grid h-11 w-11 place-items-center rounded-xl ${isClub ? 'hover:bg-black/5' : 'hover:bg-white/10'}`} aria-label="關閉">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </header>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
            <fieldset>
              <legend className={`mb-2 text-sm font-semibold ${isClub ? 'text-[#4f4a43]' : 'text-slate-300'}`}>回饋類型</legend>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(FEEDBACK_CATEGORIES).map(([key, value]) => {
                  const Icon = CATEGORY_ICONS[key]
                  const active = form.category === key
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setForm({ ...form, category: key })}
                      className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-bold transition ${active ? isClub ? 'border-[#ec5836] bg-[#fff1ed] text-[#b3381e]' : 'border-primary bg-primary/20 text-violet-100' : isClub ? 'border-black/10 bg-white text-[#595349] hover:border-black/25' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25'}`}
                    >
                      <Icon className="h-5 w-5" />
                      {value.shortLabel}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <label className="block">
              <span className={`mb-1.5 block text-sm font-semibold ${isClub ? 'text-[#4f4a43]' : 'text-slate-300'}`}>標題</span>
              <input
                value={form.title}
                onChange={(event) => {
                  setForm({ ...form, title: event.target.value })
                  setConfirmedNoDuplicate(false)
                }}
                maxLength={80}
                placeholder="標題"
                className={`min-h-12 w-full rounded-xl border px-4 py-3 text-base outline-none ring-2 ring-transparent transition ${fieldClass}`}
              />
            </label>
            {form.title.trim().length >= 2 && (
              <section aria-labelledby="similar-feedback-title" className={`rounded-xl p-4 ${isClub ? 'bg-[#ebe7df]' : 'bg-white/[0.05]'}`}>
                <h3 id="similar-feedback-title" className={`text-sm font-black ${isClub ? 'text-[#37332e]' : 'text-white'}`}>先看看有沒有相同回饋</h3>
                {similarFeedback.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {similarFeedback.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectExisting(item.id)
                          onClose()
                        }}
                        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold transition ${isClub ? 'bg-white text-[#37332e] hover:text-[#b3381e]' : 'bg-white/[0.06] text-slate-200 hover:bg-white/10 hover:text-white'}`}
                      >
                        <span className="line-clamp-2">{item.title}</span>
                        <span className="shrink-0 font-medium opacity-60">▲ {Number(item.voteCount) || 0}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={`mt-2 text-sm ${isClub ? 'text-[#666057]' : 'text-slate-400'}`}>目前沒有找到相似內容，可以繼續補充說明。</p>
                )}
                <label className={`mt-3 flex cursor-pointer items-start gap-3 text-sm font-semibold ${isClub ? 'text-[#4f4a43]' : 'text-slate-300'}`}>
                  <input
                    type="checkbox"
                    checked={confirmedNoDuplicate}
                    onChange={(event) => setConfirmedNoDuplicate(event.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded border-black/20 text-[#ec5836] focus:ring-[#ec5836]"
                  />
                  <span>我確認沒有相同回饋，要建立新的討論串。</span>
                </label>
              </section>
            )}
            <label className="block">
              <span className={`mb-1.5 block text-sm font-semibold ${isClub ? 'text-[#4f4a43]' : 'text-slate-300'}`}>詳細說明</span>
              <textarea
                value={form.body}
                onChange={(event) => setForm({ ...form, body: event.target.value })}
                maxLength={2000}
                rows={7}
                placeholder="你原本想完成什麼？目前發生什麼？如果是功能許願，希望它怎麼運作？"
                className={`w-full resize-y rounded-xl border px-4 py-3 text-base leading-7 outline-none ring-2 ring-transparent transition ${fieldClass}`}
              />
              <span className={`mt-1 block text-right text-xs ${isClub ? 'text-[#777168]' : 'text-slate-500'}`}>{form.body.length}/2000</span>
            </label>
            <IdentityFields identity={identity} onChange={setIdentity} isClub={isClub} idPrefix="new-feedback" />
            {error && <p role="alert" className={`rounded-xl px-4 py-3 text-sm font-medium ${isClub ? 'bg-red-50 text-red-700' : 'bg-red-400/10 text-red-300'}`}>{error}</p>}
          </div>
          <footer className={`flex shrink-0 items-center justify-end gap-3 border-t px-5 py-4 sm:px-7 ${isClub ? 'border-black/10 bg-white/60' : 'border-white/10 bg-white/[0.03]'}`}>
            <button type="button" onClick={onClose} className={`min-h-11 rounded-xl px-4 text-sm font-bold ${isClub ? 'text-[#595349] hover:bg-black/5' : 'text-slate-300 hover:bg-white/10'}`}>稍後再說</button>
            <button type="submit" disabled={saving} className={`min-h-11 rounded-xl px-5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${isClub ? 'bg-[#171717] hover:bg-[#ec5836]' : 'bg-primary hover:bg-violet-500'}`}>{saving ? '送出中…' : '送出回饋'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function ThreadDetail({ feedback, comments, commentsLoading, identity, setIdentity, clientId, isClub, isAdmin, onBack, onDeleted, onVote, voteBusy }) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState(null)
  const [deletingFeedback, setDeletingFeedback] = useState(false)
  if (!feedback) return null
  const category = FEEDBACK_CATEGORIES[feedback.category] || FEEDBACK_CATEGORIES.discussion
  const CategoryIcon = CATEGORY_ICONS[feedback.category] || ChatBubbleLeftRightIcon
  const submitComment = async (event) => {
    event.preventDefault()
    if (!identity.name.trim() || !identity.store) return setError('請先填寫暱稱與分店。')
    if (comment.trim().length < 2) return setError('留言至少需要 2 個字。')
    setSending(true)
    setError('')
    try {
      saveIdentity(identity)
      await createComment({ feedbackId: feedback.id, body: comment, author: identity, clientId, isAdmin })
      setComment('')
    } catch (err) {
      console.error('留言失敗:', err)
      setError('留言沒有送出，請確認網路後再試一次。')
    } finally {
      setSending(false)
    }
  }
  const changeStatus = async (event) => {
    setStatusBusy(true)
    try {
      await updateFeedbackStatus(feedback.id, event.target.value)
    } catch (err) {
      console.error('更新狀態失敗:', err)
      setError('狀態更新失敗，請稍後再試。')
    } finally {
      setStatusBusy(false)
    }
  }
  const removeComment = async (item) => {
    if (!window.confirm(`確定要刪除「${item.author?.name || '匿名'}」的這則留言嗎？刪除後無法復原。`)) return
    setDeletingCommentId(item.id)
    setError('')
    try {
      await deleteComment(feedback.id, item.id)
    } catch (err) {
      console.error('刪除留言失敗:', err)
      setError('留言刪除失敗，請確認管理員權限與網路後再試一次。')
    } finally {
      setDeletingCommentId(null)
    }
  }
  const removeFeedback = async () => {
    if (!window.confirm(`確定要刪除「${feedback.title}」以及裡面的所有留言嗎？刪除後無法復原。`)) return
    setDeletingFeedback(true)
    setError('')
    try {
      await deleteFeedback(feedback.id)
      onDeleted()
    } catch (err) {
      console.error('刪除回饋失敗:', err)
      setError('回饋刪除失敗，請確認管理員權限與網路後再試一次。')
    } finally {
      setDeletingFeedback(false)
    }
  }
  return (
    <article className={`min-w-0 overflow-hidden rounded-2xl ${isClub ? 'bg-white shadow-[0_18px_50px_rgba(23,23,23,0.08)]' : 'border border-white/10 bg-[#1b1b28]/90 shadow-[0_18px_50px_rgba(0,0,0,0.24)]'}`}>
      <div className={`border-b p-5 sm:p-7 ${isClub ? 'border-black/10' : 'border-white/10'}`}>
        <button type="button" onClick={onBack} className={`mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold lg:hidden ${isClub ? 'text-[#595349] hover:bg-black/5' : 'text-slate-300 hover:bg-white/10'}`}><ArrowLeftIcon className="h-5 w-5" />返回列表</button>
        <div className="flex items-start gap-4">
          <VoteButton feedback={feedback} clientId={clientId} isClub={isClub} busy={voteBusy} onVote={onVote} compact />
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${isClub ? 'text-[#b3381e]' : 'text-violet-300'}`}><CategoryIcon className="h-4 w-4" />{category.label}</span>
              <StatusBadge status={feedback.status} isClub={isClub} />
            </div>
            <h2 className={`text-balance text-2xl font-black leading-tight tracking-[-0.025em] sm:text-3xl ${isClub ? 'text-[#171717]' : 'text-white'}`}>{feedback.title}</h2>
            <p className={`mt-3 text-sm ${isClub ? 'text-[#777168]' : 'text-slate-400'}`}>{feedback.author?.name || '匿名'} · {feedback.author?.store || '未提供分店'} · {formatTime(feedback.createdAt)}</p>
          </div>
        </div>
        <p className={`mt-6 whitespace-pre-wrap break-words text-base leading-7 ${isClub ? 'text-[#37332e]' : 'text-slate-200'}`}>{feedback.body}</p>
        {isAdmin && (
          <div className={`mt-6 border-t pt-5 ${isClub ? 'border-black/10' : 'border-white/10'}`}>
            <div className="mb-3">
              <p className={`text-sm font-black ${isClub ? 'text-[#171717]' : 'text-white'}`}>管理員模式</p>
              <p className={`mt-1 text-xs ${isClub ? 'text-[#777168]' : 'text-slate-400'}`}>你可以更新處理狀態、刪除整則回饋或管理下方留言。</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className={`flex flex-1 flex-col gap-1.5 text-sm font-semibold ${isClub ? 'text-[#4f4a43]' : 'text-slate-300'}`}>
                處理狀態
                <select value={feedback.status || 'reviewing'} disabled={statusBusy || deletingFeedback} onChange={changeStatus} className={`min-h-11 rounded-xl border px-3 py-2 outline-none ${isClub ? 'border-black/15 bg-[#f7f6f2]' : 'border-white/10 bg-[#111119]'}`}>
                  {Object.entries(FEEDBACK_STATUSES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
                </select>
              </label>
              <button type="button" disabled={deletingFeedback} onClick={removeFeedback} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black transition disabled:opacity-50 ${isClub ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : 'border-red-400/30 bg-red-400/10 text-red-300 hover:bg-red-400/20'}`}>
                <TrashIcon className="h-4 w-4" />
                {deletingFeedback ? '刪除中…' : '刪除這則回饋'}
              </button>
            </div>
          </div>
        )}
      </div>
      <section aria-labelledby="comments-heading" className="p-5 sm:p-7">
        <div className="mb-6 flex items-center justify-between">
          <h3 id="comments-heading" className={`text-lg font-black ${isClub ? 'text-[#171717]' : 'text-white'}`}>討論串</h3>
          <span className={`text-sm ${isClub ? 'text-[#777168]' : 'text-slate-400'}`}>{comments.length} 則留言</span>
        </div>
        {commentsLoading ? (
          <div className="space-y-4" aria-label="正在載入留言">
            {[1, 2].map((item) => <div key={item} className={`h-24 animate-pulse rounded-xl ${isClub ? 'bg-[#f1eee8]' : 'bg-white/5'}`} />)}
          </div>
        ) : comments.length === 0 ? (
          <div className={`rounded-xl py-10 text-center ${isClub ? 'bg-[#f7f6f2] text-[#666057]' : 'bg-white/[0.03] text-slate-400'}`}>
            <ChatBubbleLeftRightIcon className="mx-auto mb-3 h-7 w-7" />
            <p className="font-semibold">還沒有人留言</p>
            <p className="mt-1 text-sm">補充使用情境，或告訴大家你也遇到了。</p>
          </div>
        ) : (
          <div className={`divide-y ${isClub ? 'divide-black/10' : 'divide-white/10'}`}>
            {comments.map((item) => (
              <div key={item.id} className="py-5 first:pt-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`font-black ${isClub ? 'text-[#171717]' : 'text-white'}`}>{item.author?.name || '匿名'}</span>
                  <span className={isClub ? 'text-[#777168]' : 'text-slate-500'}>· {item.author?.store || '未提供分店'}</span>
                  {item.authorRole === 'admin' && <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isClub ? 'bg-[#171717] text-white' : 'bg-primary text-white'}`}>管理員</span>}
                  <span className={`ml-auto text-xs ${isClub ? 'text-[#8a847b]' : 'text-slate-500'}`}>{formatTime(item.createdAt)}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      disabled={deletingCommentId === item.id}
                      onClick={() => removeComment(item)}
                      className={`inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-bold transition disabled:opacity-50 ${isClub ? 'text-red-700 hover:bg-red-50' : 'text-red-300 hover:bg-red-400/10'}`}
                      aria-label={`刪除 ${item.author?.name || '匿名'} 的留言`}
                    >
                      <TrashIcon className="h-4 w-4" />
                      {deletingCommentId === item.id ? '刪除中…' : '刪除留言'}
                    </button>
                  )}
                </div>
                <p className={`mt-2 whitespace-pre-wrap break-words leading-7 ${isClub ? 'text-[#37332e]' : 'text-slate-200'}`}>{item.body}</p>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={submitComment} className={`mt-7 border-t pt-6 ${isClub ? 'border-black/10' : 'border-white/10'}`}>
          <IdentityFields identity={identity} onChange={setIdentity} isClub={isClub} idPrefix="comment" />
          <label className="mt-4 block">
            <span className={`mb-1.5 block text-sm font-semibold ${isClub ? 'text-[#4f4a43]' : 'text-slate-300'}`}>{isAdmin ? '以管理員身分回覆' : '加入討論'}</span>
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={4} placeholder="寫下補充、使用情境或建議…" className={`w-full resize-y rounded-xl border px-4 py-3 text-base leading-7 outline-none ring-2 ring-transparent transition ${isClub ? 'border-black/15 bg-[#f7f6f2] text-[#171717] placeholder:text-[#777168] focus:border-[#ec5836] focus:ring-[#ec5836]/20' : 'border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-primary focus:ring-primary/20'}`} />
          </label>
          {error && <p role="alert" className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium ${isClub ? 'bg-red-50 text-red-700' : 'bg-red-400/10 text-red-300'}`}>{error}</p>}
          <div className="mt-3 flex justify-end">
            <button type="submit" disabled={sending} className={`min-h-11 rounded-xl px-5 text-sm font-bold text-white transition disabled:opacity-50 ${isClub ? 'bg-[#171717] hover:bg-[#ec5836]' : 'bg-primary hover:bg-violet-500'}`}>{sending ? '留言送出中…' : '送出留言'}</button>
          </div>
        </form>
      </section>
    </article>
  )
}

export default function FeedbackCenter() {
  const { isClub } = useTheme()
  const [feedbackItems, setFeedbackItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [identity, setIdentity] = useState(readIdentity)
  const [clientId] = useState(getClientId)
  const [voteBusy, setVoteBusy] = useState(new Set())
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => subscribeToFeedback(
    (items) => {
      setFeedbackItems(items)
      setLoading(false)
      setLoadError('')
    },
    (error) => {
      console.error('載入回饋失敗:', error)
      setLoadError('目前無法載入回饋，請確認網路後重新整理。')
      setLoading(false)
    }
  ), [])

  useEffect(() => {
    if (!selectedId) {
      setComments([])
      return undefined
    }
    setCommentsLoading(true)
    return subscribeToComments(selectedId, (items) => {
      setComments(items)
      setCommentsLoading(false)
    }, (error) => {
      console.error('載入留言失敗:', error)
      setCommentsLoading(false)
    })
  }, [selectedId])

  useEffect(() => auth.onAuthStateChanged(async (user) => {
    if (!user) return setIsAdmin(false)
    setIsAdmin(await checkAdminStatus(user.uid))
  }), [])

  const selected = feedbackItems.find((item) => item.id === selectedId) || null
  const visibleItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('zh-TW')
    const filtered = feedbackItems.filter((item) => {
      if (category !== 'all' && item.category !== category) return false
      if (!term) return true
      return `${item.title || ''} ${item.body || ''}`.toLocaleLowerCase('zh-TW').includes(term)
    })
    if (sort === 'votes') return [...filtered].sort((a, b) => (Number(b.voteCount) || 0) - (Number(a.voteCount) || 0))
    if (sort === 'active') return [...filtered].sort((a, b) => (Number(b.commentCount) || 0) - (Number(a.commentCount) || 0))
    return filtered
  }, [feedbackItems, category, search, sort])

  const handleVote = async (feedbackId) => {
    if (voteBusy.has(feedbackId)) return
    setVoteBusy((current) => new Set(current).add(feedbackId))
    try {
      await toggleFeedbackVote(feedbackId, clientId)
    } catch (error) {
      console.error('投票失敗:', error)
      setLoadError('投票沒有成功，請確認網路後再試一次。')
    } finally {
      setVoteBusy((current) => {
        const next = new Set(current)
        next.delete(feedbackId)
        return next
      })
    }
  }

  return (
    <div className="pb-16">
      <section className={`relative overflow-hidden rounded-2xl px-5 py-7 sm:px-8 sm:py-9 ${isClub ? 'bg-[#171717] text-white shadow-[0_22px_55px_rgba(23,23,23,0.16)]' : 'border border-white/10 bg-[#1b1b28]/90 text-white shadow-[0_22px_55px_rgba(0,0,0,0.24)]'}`}>
        <div className={`absolute -right-16 -top-24 h-64 w-64 rounded-full ${isClub ? 'bg-[#ec5836]/25' : 'bg-primary/20'} blur-3xl`} aria-hidden />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-balance text-3xl font-black tracking-[-0.03em] sm:text-4xl">回饋</h1>
              {isAdmin && <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-200 ring-1 ring-inset ring-emerald-300/30">管理員模式</span>}
            </div>
            <p className="mt-3 max-w-[68ch] text-sm leading-6 text-slate-300 sm:text-base">回報使用問題、提出功能需求、查看處理進度，並在討論串中留言補充。</p>
            {isAdmin && <p className="mt-2 text-xs font-semibold text-emerald-200">選擇一則回饋，即可變更狀態、刪除回饋或管理留言。</p>}
          </div>
          <button type="button" onClick={() => setComposerOpen(true)} className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-5 font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${isClub ? 'bg-[#ec5836] text-white hover:bg-[#ff7758] focus-visible:outline-white' : 'bg-primary text-white hover:bg-violet-500 focus-visible:outline-white'}`}><PlusIcon className="h-5 w-5" />新增回饋</button>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)]">
        <section className={`${selected ? 'hidden lg:block' : 'block'} min-w-0`} aria-label="回饋列表">
          <div className={`sticky top-3 z-20 mb-4 space-y-3 rounded-2xl p-3 sm:p-4 ${isClub ? 'bg-[#f7f6f2]/95 shadow-[0_10px_35px_rgba(23,23,23,0.06)] backdrop-blur' : 'border border-white/10 bg-[#13131a]/95 backdrop-blur'}`}>
            <label className="relative block">
              <MagnifyingGlassIcon className={`pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 ${isClub ? 'text-[#777168]' : 'text-slate-500'}`} />
              <span className="sr-only">搜尋回饋</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜尋回饋…" className={`min-h-11 w-full rounded-xl border py-2.5 pl-11 pr-4 text-base outline-none ring-2 ring-transparent ${isClub ? 'border-black/10 bg-white text-[#171717] placeholder:text-[#777168] focus:border-[#ec5836] focus:ring-[#ec5836]/20' : 'border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-primary focus:ring-primary/20'}`} />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label="回饋類型">
              {[['all', '全部'], ...Object.entries(FEEDBACK_CATEGORIES).map(([key, value]) => [key, value.shortLabel])].map(([key, label]) => (
                <button key={key} type="button" aria-pressed={category === key} onClick={() => setCategory(key)} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-bold transition ${category === key ? isClub ? 'bg-[#171717] text-white' : 'bg-primary text-white' : isClub ? 'bg-white text-[#595349] hover:bg-[#ebe7df]' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{label}</button>
              ))}
            </div>
            <div className={`flex items-center justify-between border-t pt-3 ${isClub ? 'border-black/10' : 'border-white/10'}`}>
              <span className={`text-sm ${isClub ? 'text-[#777168]' : 'text-slate-400'}`}>{visibleItems.length} 則回饋</span>
              <label className="flex items-center gap-2 text-sm">
                <span className={isClub ? 'text-[#777168]' : 'text-slate-400'}>排序</span>
                <select value={sort} onChange={(event) => setSort(event.target.value)} className={`min-h-10 rounded-lg border px-2.5 font-semibold outline-none ${isClub ? 'border-black/10 bg-white text-[#37332e]' : 'border-white/10 bg-[#1b1b28] text-slate-200'}`}>
                  <option value="newest">最新</option>
                  <option value="votes">最多人需要</option>
                  <option value="active">最多討論</option>
                </select>
              </label>
            </div>
          </div>

          {loadError && <p role="alert" className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${isClub ? 'bg-red-50 text-red-700' : 'bg-red-400/10 text-red-300'}`}>{loadError}</p>}
          {loading ? (
            <div className="space-y-3" aria-label="正在載入回饋">
              {[1, 2, 3].map((item) => <div key={item} className={`h-36 animate-pulse rounded-2xl ${isClub ? 'bg-white' : 'bg-white/5'}`} />)}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className={`rounded-2xl px-6 py-16 text-center ${isClub ? 'bg-white text-[#666057]' : 'border border-white/10 bg-white/[0.03] text-slate-400'}`}>
              <MagnifyingGlassIcon className="mx-auto mb-4 h-8 w-8" />
              <p className={`text-lg font-black ${isClub ? 'text-[#171717]' : 'text-white'}`}>{feedbackItems.length === 0 ? '第一則回饋，就從你開始' : '找不到符合的回饋'}</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6">{feedbackItems.length === 0 ? '提出你希望改善的地方，其他人就能加入討論。' : '換個關鍵字或清除篩選條件再看看。'}</p>
              {feedbackItems.length === 0 && <button type="button" onClick={() => setComposerOpen(true)} className={`mt-5 min-h-11 rounded-xl px-5 text-sm font-bold text-white ${isClub ? 'bg-[#ec5836]' : 'bg-primary'}`}>新增第一則回饋</button>}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleItems.map((item) => {
                const itemCategory = FEEDBACK_CATEGORIES[item.category] || FEEDBACK_CATEGORIES.discussion
                const Icon = CATEGORY_ICONS[item.category] || ChatBubbleLeftRightIcon
                const active = selectedId === item.id
                return (
                  <article key={item.id} className={`group flex gap-3 rounded-2xl p-4 transition sm:p-5 ${active ? isClub ? 'bg-[#171717] text-white shadow-[0_16px_35px_rgba(23,23,23,0.14)]' : 'border border-primary/50 bg-primary/15' : isClub ? 'bg-white hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(23,23,23,0.08)]' : 'border border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]'}`}>
                    <VoteButton feedback={item} clientId={clientId} isClub={isClub && !active} busy={voteBusy.has(item.id)} onVote={handleVote} compact />
                    <button type="button" onClick={() => setSelectedId(item.id)} className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current" aria-label={`查看回饋：${item.title}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold ${active ? 'text-slate-300' : isClub ? 'text-[#b3381e]' : 'text-violet-300'}`}><Icon className="h-4 w-4" />{itemCategory.label}</span>
                        <StatusBadge status={item.status} isClub={isClub && !active} />
                      </div>
                      <h2 className={`mt-2 line-clamp-2 text-base font-black leading-snug sm:text-lg ${active ? 'text-white' : isClub ? 'text-[#171717]' : 'text-white'}`}>{item.title}</h2>
                      <p className={`mt-2 line-clamp-2 text-sm leading-6 ${active ? 'text-slate-300' : isClub ? 'text-[#666057]' : 'text-slate-400'}`}>{item.body}</p>
                      <div className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${active ? 'text-slate-400' : isClub ? 'text-[#8a847b]' : 'text-slate-500'}`}>
                        <span>{item.author?.name || '匿名'} · {item.author?.store || '未提供分店'}</span>
                        <span className="inline-flex items-center gap-1"><ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />{Number(item.commentCount) || 0}</span>
                        <span>{formatTime(item.createdAt)}</span>
                      </div>
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className={`${selected ? 'block' : 'hidden lg:block'} min-w-0`} aria-label="回饋內容">
          {selected ? (
            <ThreadDetail feedback={selected} comments={comments} commentsLoading={commentsLoading} identity={identity} setIdentity={setIdentity} clientId={clientId} isClub={isClub} isAdmin={isAdmin} onBack={() => setSelectedId(null)} onDeleted={() => setSelectedId(null)} onVote={handleVote} voteBusy={voteBusy.has(selected.id)} />
          ) : (
            <div className={`sticky top-4 rounded-2xl px-8 py-20 text-center ${isClub ? 'bg-white text-[#666057] shadow-[0_18px_50px_rgba(23,23,23,0.06)]' : 'border border-white/10 bg-white/[0.03] text-slate-400'}`}>
              <ArrowTrendingUpIcon className="mx-auto mb-4 h-9 w-9" />
              <p className={`text-xl font-black ${isClub ? 'text-[#171717]' : 'text-white'}`}>選一則回饋加入討論</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6">看看其他門市遇到的情況，按下「我也需要」或補充你的使用經驗。</p>
            </div>
          )}
        </section>
      </div>

      <Composer open={composerOpen} onClose={() => setComposerOpen(false)} onCreated={setSelectedId} onSelectExisting={setSelectedId} feedbackItems={feedbackItems} identity={identity} setIdentity={setIdentity} clientId={clientId} isClub={isClub} />
    </div>
  )
}
