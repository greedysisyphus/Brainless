import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'

function normalizeMenuImages(data) {
  if (!data) return []

  if (Array.isArray(data.images)) {
    return data.images.map((img) => img?.url).filter(Boolean)
  }

  if (data.imageUrl) {
    return [data.imageUrl]
  }

  return []
}

export default function App() {
  const [imageUrls, setImageUrls] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'publicMenu', 'current'),
      (snap) => {
        const urls = snap.exists() ? normalizeMenuImages(snap.data()) : []
        setImageUrls(urls)
        setStatus(urls.length ? 'ready' : 'empty')
      },
      () => setStatus('error')
    )
    return unsubscribe
  }, [])

  if (status === 'loading') {
    return (
      <main className="page">
        <p className="hint">載入菜單…</p>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="page">
        <p className="hint error">無法載入菜單，請稍後再試</p>
      </main>
    )
  }

  if (status === 'empty' || imageUrls.length === 0) {
    return (
      <main className="page">
        <p className="hint">菜單尚未上架</p>
      </main>
    )
  }

  return (
    <main className="page menu">
      <div className="menu-stack">
        {imageUrls.map((url, index) => (
          <img
            key={`${url}-${index}`}
            src={url}
            alt={imageUrls.length > 1 ? `菜單第 ${index + 1} 頁` : '菜單'}
            className="menu-image"
          />
        ))}
      </div>
    </main>
  )
}
