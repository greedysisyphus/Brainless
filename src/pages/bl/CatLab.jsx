import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { catHead } from '../../components/bl/shared'

// 立體水彩貓的測試頁（/home/cat-lab，沒有放進導覽）。
// 整頁由 cat3d/lab.js 用原生 DOM 組出來，這裡只負責掛上去和收拾。
// 網址可以帶參數固定姿勢，例如 #/home/cat-lab?yaw=30&blink=0.5
export default function CatLab() {
  const root = useRef(null)
  const { search } = useLocation()

  useEffect(() => {
    let stop
    let gone = false
    import('../../components/bl/cat3d/lab.js')
      .then(({ mountLab }) => mountLab(root.current, { src: catHead, query: search }))
      .then((dispose) => {
        if (gone) dispose()
        else stop = dispose
      })
    return () => {
      gone = true
      stop?.()
    }
  }, [search])

  return <div ref={root} />
}
