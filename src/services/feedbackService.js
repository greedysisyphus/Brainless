import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../utils/firebase'

export const FEEDBACK_CATEGORIES = {
  feature: { label: '功能許願', shortLabel: '許願' },
  bug: { label: '問題回報', shortLabel: '問題' },
  discussion: { label: '操作討論', shortLabel: '討論' },
}

export const FEEDBACK_STATUSES = {
  reviewing: { label: '待確認' },
  planned: { label: '已排程' },
  inProgress: { label: '處理中' },
  completed: { label: '已完成' },
  declined: { label: '暫不處理' },
}

function normalizeSnapshot(snapshot) {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export function subscribeToFeedback(onData, onError) {
  const feedbackQuery = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'))
  return onSnapshot(feedbackQuery, (snapshot) => onData(normalizeSnapshot(snapshot)), onError)
}

export function subscribeToComments(feedbackId, onData, onError) {
  const commentsQuery = query(
    collection(db, 'feedback', feedbackId, 'comments'),
    orderBy('createdAt', 'asc')
  )
  return onSnapshot(commentsQuery, (snapshot) => onData(normalizeSnapshot(snapshot)), onError)
}

export async function createFeedback({ title, body, category, author, clientId }) {
  return addDoc(collection(db, 'feedback'), {
    title: title.trim(),
    body: body.trim(),
    category,
    status: 'reviewing',
    author: {
      name: author.name.trim(),
      store: author.store.trim(),
    },
    creatorClientId: clientId,
    voterIds: [clientId],
    voteCount: 1,
    commentCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function createComment({ feedbackId, body, author, clientId, isAdmin }) {
  const feedbackRef = doc(db, 'feedback', feedbackId)
  const commentsRef = collection(feedbackRef, 'comments')
  await runTransaction(db, async (transaction) => {
    const feedbackSnapshot = await transaction.get(feedbackRef)
    if (!feedbackSnapshot.exists()) throw new Error('這則回饋已不存在')
    const currentCount = Number(feedbackSnapshot.data().commentCount) || 0
    const commentRef = doc(commentsRef)
    transaction.set(commentRef, {
      body: body.trim(),
      author: {
        name: author.name.trim(),
        store: author.store.trim(),
      },
      authorClientId: clientId,
      authorRole: isAdmin ? 'admin' : 'member',
      createdAt: serverTimestamp(),
    })
    transaction.update(feedbackRef, {
      commentCount: currentCount + 1,
      updatedAt: serverTimestamp(),
    })
  })
}

export async function deleteComment(feedbackId, commentId) {
  const feedbackRef = doc(db, 'feedback', feedbackId)
  const commentRef = doc(db, 'feedback', feedbackId, 'comments', commentId)
  await runTransaction(db, async (transaction) => {
    const [feedbackSnapshot, commentSnapshot] = await Promise.all([
      transaction.get(feedbackRef),
      transaction.get(commentRef),
    ])
    if (!feedbackSnapshot.exists()) throw new Error('這則回饋已不存在')
    if (!commentSnapshot.exists()) throw new Error('這則留言已不存在')
    const currentCount = Number(feedbackSnapshot.data().commentCount) || 0
    transaction.delete(commentRef)
    transaction.update(feedbackRef, {
      commentCount: Math.max(0, currentCount - 1),
      updatedAt: serverTimestamp(),
    })
  })
}

export async function deleteFeedback(feedbackId) {
  const feedbackRef = doc(db, 'feedback', feedbackId)
  const commentsSnapshot = await getDocs(collection(feedbackRef, 'comments'))

  await Promise.all(commentsSnapshot.docs.map((comment) => deleteDoc(comment.ref)))
  await deleteDoc(feedbackRef)
}

export async function toggleFeedbackVote(feedbackId, clientId) {
  const feedbackRef = doc(db, 'feedback', feedbackId)
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(feedbackRef)
    if (!snapshot.exists()) throw new Error('這則回饋已不存在')
    const data = snapshot.data()
    const voterIds = Array.isArray(data.voterIds) ? data.voterIds : []
    const hasVoted = voterIds.includes(clientId)
    const nextVoterIds = hasVoted
      ? voterIds.filter((id) => id !== clientId)
      : [...voterIds, clientId]
    transaction.update(feedbackRef, {
      voterIds: nextVoterIds,
      voteCount: nextVoterIds.length,
      updatedAt: serverTimestamp(),
    })
    return !hasVoted
  })
}

export function updateFeedbackStatus(feedbackId, status) {
  if (!FEEDBACK_STATUSES[status]) throw new Error('未知的回饋狀態')
  return updateDoc(doc(db, 'feedback', feedbackId), {
    status,
    updatedAt: serverTimestamp(),
  })
}
