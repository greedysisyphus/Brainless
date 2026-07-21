import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { readMenuLayoutFromDoc } from './menuLayout'

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

function MenuImage({ url, index, total }) {
  const alt = total > 1 ? `菜單第 ${index + 1} 頁` : '菜單'
  return <img src={url} alt={alt} className="menu-image" loading={index === 0 ? 'eager' : 'lazy'} />
}

function MenuStack({ imageUrls }) {
  return (
    <div className="menu-stack">
      {imageUrls.map((url, index) => (
        <MenuImage key={`${url}-${index}`} url={url} index={index} total={imageUrls.length} />
      ))}
    </div>
  )
}

function MenuRow({ imageUrls }) {
  return (
    <div className="menu-row">
      {imageUrls.map((url, index) => (
        <div key={`${url}-${index}`} className="menu-row-item">
          <MenuImage url={url} index={index} total={imageUrls.length} />
        </div>
      ))}
    </div>
  )
}

function MenuTabs({ imageUrls }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const safeIndex = Math.min(activeIndex, Math.max(0, imageUrls.length - 1))

  useEffect(() => {
    if (activeIndex >= imageUrls.length) {
      setActiveIndex(0)
    }
  }, [activeIndex, imageUrls.length])

  if (imageUrls.length <= 1) {
    return <MenuStack imageUrls={imageUrls} />
  }

  return (
    <div className="menu-tabs">
      <div className="menu-tab-bar" role="tablist" aria-label="菜單分頁">
        {imageUrls.map((url, index) => (
          <button
            key={url}
            type="button"
            role="tab"
            aria-selected={safeIndex === index}
            className={`menu-tab-btn${safeIndex === index ? ' is-active' : ''}`}
            onClick={() => setActiveIndex(index)}
          >
            第 {index + 1} 頁
          </button>
        ))}
      </div>
      <div className="menu-tab-panel" role="tabpanel">
        <MenuImage url={imageUrls[safeIndex]} index={safeIndex} total={imageUrls.length} />
      </div>
      <div className="menu-tab-dots" aria-hidden>
        {imageUrls.map((url, index) => (
          <span key={url} className={`menu-tab-dot${safeIndex === index ? ' is-active' : ''}`} />
        ))}
      </div>
    </div>
  )
}

function MenuBody({ layout, imageUrls }) {
  if (layout === 'row') return <MenuRow imageUrls={imageUrls} />
  if (layout === 'tabs') return <MenuTabs imageUrls={imageUrls} />
  return <MenuStack imageUrls={imageUrls} />
}

export default function App() {
  const [imageUrls, setImageUrls] = useState([])
  const [layout, setLayout] = useState('stack')
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'publicMenu', 'current'),
      (snap) => {
        const data = snap.exists() ? snap.data() : null
        const urls = data ? normalizeMenuImages(data) : []
        setImageUrls(urls)
        setLayout(readMenuLayoutFromDoc(data))
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
      <div className="menu-shell">
        <MenuBody layout={layout} imageUrls={imageUrls} />
      </div>
    </main>
  )
}
