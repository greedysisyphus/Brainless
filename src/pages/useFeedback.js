import { useEffect, useMemo, useRef, useState } from 'react'
import { auth, checkAdminStatus } from '../utils/firebase'
import {
  compressPhoto,
  createComment,
  createFeedback,
  deleteComment,
  deleteFeedback,
  PHOTO_MAX_SOURCE_BYTES,
  subscribeToComments,
  subscribeToFeedback,
  uploadFeedbackPhoto,
  toggleFeedbackVote,
  updateFeedbackStatus,
} from '../services/feedbackService'

// 回饋頁的邏輯：訂閱、投票、發文、留言、管理員操作。Club 版和新版的畫面共用。

const IDENTITY_KEY = 'brainlessFeedbackIdentity'
const CLIENT_ID_KEY = 'brainlessFeedbackClientId'
export const STORE_OPTIONS = ['中央店', 'D7 店', 'D13 店', '其他']

// 手機虛擬鍵盤的 Enter 就是換行，只在有滑鼠的裝置上啟用 Enter 送出。
export const CAN_ENTER_SEND = typeof window !== 'undefined'
  && Boolean(window.matchMedia?.('(pointer: fine)').matches)

export function submitOnEnter(event) {
  if (!CAN_ENTER_SEND) return
  // 中文輸入法選字中的 Enter 是在選字，不是送出。
  if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent?.isComposing) return
  event.preventDefault()
  event.currentTarget.form?.requestSubmit()
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

export function formatTime(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  if (!date || Number.isNaN(date.getTime())) return '剛剛'
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMinutes < 1) return '剛剛'
  if (diffMinutes < 60) return `${diffMinutes} 分鐘前`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} 小時前`
  if (diffMinutes < 10080) return `${Math.floor(diffMinutes / 1440)} 天前`
  return new Intl.DateTimeFormat('zh-TW', { month: 'short', day: 'numeric' }).format(date)
}

// 標題留空時是從內文第一行抓的，這時內文不要再把同一句話重播一次。
export function bodyWithoutTitle(feedback) {
  const body = feedback.body || ''
  const title = feedback.title || ''
  return title && body.startsWith(title) ? body.slice(title.length).trim() : body
}

export function usePhotoField({ photo, onChange }) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState('')

  useEffect(() => {
    if (!photo?.blob) {
      setPreview('')
      return undefined
    }
    const url = URL.createObjectURL(photo.blob)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const pick = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    if (!file.type.startsWith('image/')) return setError('請選擇圖片檔。')
    if (file.size > PHOTO_MAX_SOURCE_BYTES) return setError('原始檔太大，請先縮圖再上傳。')
    setBusy(true)
    try {
      const blob = await compressPhoto(file)
      onChange({ blob })
    } catch (err) {
      console.error('照片處理失敗:', err)
      setError(err?.message || '照片讀取失敗，請換一張試試。')
    } finally {
      setBusy(false)
    }
  }

  const clear = () => {
    onChange(null)
    setError('')
  }

  return { inputRef, error, busy, preview, pick, clear }
}

export function useComposer({ open, onClose, onCreated, identity, clientId }) {
  const [form, setForm] = useState({ title: '', body: '', category: 'feature' })
  const [photo, setPhoto] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

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

  const submit = async (event) => {
    event.preventDefault()
    if (!identity.name.trim() || !identity.store) return setError('請先填寫暱稱與分店。')
    if (!form.body.trim()) return setError('請填寫詳細說明。')
    setSaving(true)
    setError('')
    try {
      saveIdentity(identity)
      const uploaded = photo ? await uploadFeedbackPhoto(photo.blob) : null
      const created = await createFeedback({ ...form, author: identity, clientId, photo: uploaded })
      setForm({ title: '', body: '', category: 'feature' })
      setPhoto(null)
      onCreated(created.id)
      onClose()
    } catch (err) {
      console.error('建立回饋失敗:', err)
      setError('目前無法送出回饋，請確認網路後再試一次。')
    } finally {
      setSaving(false)
    }
  }

  return { form, setForm, photo, setPhoto, error, saving, panelRef, submit }
}

export function useThread({ feedback, identity, clientId, isAdmin, onDeleted }) {
  const [comment, setComment] = useState('')
  const [commentPhoto, setCommentPhoto] = useState(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState(null)
  const [deletingFeedback, setDeletingFeedback] = useState(false)
  const submitComment = async (event) => {
    event.preventDefault()
    if (!identity.name.trim() || !identity.store) return setError('請先填寫暱稱與分店。')
    if (!comment.trim() && !commentPhoto) return setError('請填寫留言，或附一張照片。')
    setSending(true)
    setError('')
    try {
      saveIdentity(identity)
      const uploaded = commentPhoto ? await uploadFeedbackPhoto(commentPhoto.blob) : null
      await createComment({ feedbackId: feedback.id, body: comment, author: identity, clientId, isAdmin, photo: uploaded })
      setComment('')
      setCommentPhoto(null)
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

  return { comment, setComment, commentPhoto, setCommentPhoto, error, sending, statusBusy, deletingCommentId, deletingFeedback, submitComment, changeStatus, removeComment, removeFeedback }
}

export function useFeedbackCenter() {
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
  const [retryKey, setRetryKey] = useState(0)

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
  ), [retryKey])

  // 連不上資料庫時不會報錯，只會一直等。等太久就讓畫面說一聲，並給重試
  const [loadingSlow, setLoadingSlow] = useState(false)
  useEffect(() => {
    setLoadingSlow(false)
    if (!loading) return undefined
    const timer = setTimeout(() => setLoadingSlow(true), 6000)
    return () => clearTimeout(timer)
  }, [loading, retryKey])
  const retryLoad = () => {
    setLoading(true)
    setLoadError('')
    setRetryKey((n) => n + 1)
  }

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

  return { feedbackItems, loading, loadError, selectedId, setSelectedId, comments, commentsLoading, category, setCategory, sort, setSort, search, setSearch, composerOpen, setComposerOpen, identity, setIdentity, clientId, voteBusy, isAdmin, selected, visibleItems, handleVote, loadingSlow, retryLoad }
}
