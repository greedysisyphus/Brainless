import { useEffect, useRef } from 'react'
import anime from 'animejs/lib/anime.es.js'

/**
 * 使用 Anime.js 的數字動畫組件
 * 參考：https://animejs.com/documentation/#numberAnimation
 */
export function AnimatedNumberAnime({ 
  value, 
  prefix = '', 
  suffix = '',
  duration = 1500,
  easing = 'easeOutExpo',
  decimals = 0
}) {
  const numberRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    if (numberRef.current === null) return

    const fromValue = parseFloat(numberRef.current.dataset.value) || 0
    const toValue = typeof value === 'number' ? value : parseFloat(value) || 0

    // 取消之前的動畫
    if (animationRef.current) {
      animationRef.current.pause()
    }

    // 創建數字動畫
    animationRef.current = anime({
      targets: { count: fromValue },
      count: toValue,
      duration: duration,
      easing: easing,
      update: function(anim) {
        const currentValue = anim.animatables[0].target.count
        const formatted = decimals > 0 
          ? currentValue.toFixed(decimals)
          : Math.round(currentValue)
        numberRef.current.textContent = `${prefix}${formatted.toLocaleString()}${suffix}`
        numberRef.current.dataset.value = currentValue
      }
    })

    return () => {
      if (animationRef.current) {
        animationRef.current.pause()
      }
    }
  }, [value, prefix, suffix, duration, easing, decimals])

  return (
    <span 
      ref={numberRef}
      data-value={0}
      data-testid="animated-number"
    >
      {prefix}0{suffix}
    </span>
  )
}

