import { useEffect, useState } from 'react'

/**
 * 視窗是否窄到放不下整月班表（Tailwind md 斷點）。
 * 用 matchMedia 而不是 resize 事件，切換方向或轉螢幕時才不會漏。
 */
export function useIsNarrow(query = '(max-width: 767px)') {
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches
  )

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const media = window.matchMedia(query)
    const onChange = (event) => setIsNarrow(event.matches)
    setIsNarrow(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])

  return isNarrow
}

export default useIsNarrow
