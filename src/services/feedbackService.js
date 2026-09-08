import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../utils/firebase'

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

/** 上傳前先壓縮：長邊 1600px、JPEG，並確保落在 Storage 規則的 512KB 內。 */
const PHOTO_MAX_EDGE = 1600
const PHOTO_MAX_BYTES = 512 * 1024
export const PHOTO_MAX_SOURCE_BYTES = 15 * 1024 * 1024

export async function compressPhoto(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('這個圖片格式讀不出來（例如 iPhone 的 HEIC），請改存成 JPG 或 PNG')
  }
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  // 畫質逐級退讓，直到塞得進 Storage 規則的上限。
  for (const quality of [0.8, 0.6, 0.45]) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (blob && blob.size <= PHOTO_MAX_BYTES) return blob
  }
  throw new Error('照片太大，請先裁切或改用截圖再上傳')
}

/** 傳入 compressPhoto() 壓好的 blob；回傳的兩個欄位都要存，刪除時才找得回 Storage 檔案。 */
export async function uploadFeedbackPhoto(blob) {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const photoPath = `feedback/${id}.jpg`
  const storageRef = ref(storage, photoPath)
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' })
  return { photoUrl: await getDownloadURL(storageRef), photoPath }
}

async function removePhotoObject(photoPath) {
  if (!photoPath) return
  try {
    await deleteObject(ref(storage, photoPath))
  } catch (error) {
    // 檔案可能已不在，或刪除者不是管理員；Firestore 那邊還是要照刪。
    console.warn('刪除照片失敗:', error)
  }
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

export async function createFeedback({ title, body, category, author, clientId, photo }) {
  const trimmedBody = body.trim()
  // 標題留空就抓內文第一行（規則要求 title 不得為空、最多 80 字）。
  const resolvedTitle = (title.trim() || trimmedBody.split('\n')[0]).slice(0, 80)
  return addDoc(collection(db, 'feedback'), {
    ...(photo ? { photoUrl: photo.photoUrl, photoPath: photo.photoPath } : {}),
    title: resolvedTitle,
    body: trimmedBody,
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

export async function createComment({ feedbackId, body, author, clientId, isAdmin, photo }) {
  const feedbackRef = doc(db, 'feedback', feedbackId)
  const commentsRef = collection(feedbackRef, 'comments')
  await runTransaction(db, async (transaction) => {
    const feedbackSnapshot = await transaction.get(feedbackRef)
    if (!feedbackSnapshot.exists()) throw new Error('這則回饋已不存在')
    const currentCount = Number(feedbackSnapshot.data().commentCount) || 0
    const commentRef = doc(commentsRef)
    transaction.set(commentRef, {
      ...(photo ? { photoUrl: photo.photoUrl, photoPath: photo.photoPath } : {}),
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
  let photoPath = ''
  await runTransaction(db, async (transaction) => {
    const [feedbackSnapshot, commentSnapshot] = await Promise.all([
      transaction.get(feedbackRef),
      transaction.get(commentRef),
    ])
    if (!feedbackSnapshot.exists()) throw new Error('這則回饋已不存在')
    if (!commentSnapshot.exists()) throw new Error('這則留言已不存在')
    photoPath = commentSnapshot.data().photoPath || ''
    const currentCount = Number(feedbackSnapshot.data().commentCount) || 0
    transaction.delete(commentRef)
    transaction.update(feedbackRef, {
      commentCount: Math.max(0, currentCount - 1),
      updatedAt: serverTimestamp(),
    })
  })
  await removePhotoObject(photoPath)
}

export async function deleteFeedback(feedbackId) {
  const feedbackRef = doc(db, 'feedback', feedbackId)
  const [feedbackSnapshot, commentsSnapshot] = await Promise.all([
    getDoc(feedbackRef),
    getDocs(collection(feedbackRef, 'comments')),
  ])
  const photoPaths = [
    feedbackSnapshot.data()?.photoPath,
    ...commentsSnapshot.docs.map((comment) => comment.data().photoPath),
  ].filter(Boolean)

  await Promise.all(commentsSnapshot.docs.map((comment) => deleteDoc(comment.ref)))
  await deleteDoc(feedbackRef)
  await Promise.all(photoPaths.map(removePhotoObject))
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
