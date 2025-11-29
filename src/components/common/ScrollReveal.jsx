import { useEffect, useRef } from 'react'
import anime from 'animejs/lib/anime.es.js'

/**
 * 滾動觸發顯示動畫組件
 * 參考：https://animejs.com/documentation/#scrollTriggered
 */
export default function ScrollReveal({ 
  children, 
  className = '',
  animation = {
    opacity: [0, 1],
    translateY: [50, 0]
  },
  threshold = 0.1,
  once = true,
  delay = 0,
  duration = 800,
  easing = 'spring(1, 80, 10, 0)'
}) {
  const elementRef = useRef(null)
  const hasAnimatedRef = useRef(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element || (once && hasAnimatedRef.current)) return

    // 設置初始狀態
    if (animation.opacity) {
      element.style.opacity = Array.isArray(animation.opacity) 
        ? animation.opacity[0] 
        : 0
    }
    if (animation.translateY) {
      const fromY = Array.isArray(animation.translateY) 
        ? animation.translateY[0] 
        : 50
      element.style.transform = `translateY(${fromY}px)`
    }

    // Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 動畫元素
            anime({
              targets: element,
              ...animation,
              delay: delay,
              duration: duration,
              easing: easing,
              complete: () => {
                // 重置樣式，讓 CSS 接管
                if (animation.opacity) element.style.opacity = ''
                if (animation.translateY) element.style.transform = ''
              }
            })

            hasAnimatedRef.current = true

            if (once) {
              observer.unobserve(element)
            }
          }
        })
      },
      { threshold }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [animation, threshold, once, delay, duration, easing])

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  )
}

