import { useEffect, useRef } from 'react'

// 立體貓的畫布。引擎（含 Three.js）是另外一包，這個元件掛上來時才下載。
// 載入中、載入失敗或裝置不支援時這裡什麼都不畫，外面原本的 2D 圖要留著墊底。
// onReady 會拿到引擎的控制物件（繪圖環境被收走又還回來時會再叫一次）；onLost 代表畫面暫時是空的；onFail 代表這台裝置跑不了。
export default function Cat3D({ src, saved, className, label, onReady, onLost, onFail }) {
  const box = useRef(null)
  const handlers = useRef({})
  handlers.current = { onReady, onLost, onFail }
  const initial = useRef(saved) // 存過的參數只在建立時讀一次

  useEffect(() => {
    // 每次都自己建一個 canvas：開發模式下這個 effect 會跑兩次，
    // 共用同一個 canvas 的話，第一次收拾時會把第二次的繪圖環境一起丟掉
    const canvas = document.createElement('canvas')
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', label)
    box.current.append(canvas)
    let cat
    let gone = false
    import('./engine.js')
      .then(({ createCat }) =>
        createCat(canvas, {
          src,
          saved: initial.current,
          stay: false,
          onContext: (lost) => (lost ? handlers.current.onLost?.() : cat && handlers.current.onReady?.(cat)),
        })
      )
      .then((made) => {
        if (gone) return made.dispose()
        cat = made
        handlers.current.onReady?.(made)
      })
      .catch((error) => {
        if (gone) return
        console.error('立體貓載入失敗', error)
        handlers.current.onFail?.(error)
      })
    return () => {
      gone = true
      cat?.dispose()
      canvas.remove()
    }
  }, [src, label])

  return <div ref={box} className={className} />
}
