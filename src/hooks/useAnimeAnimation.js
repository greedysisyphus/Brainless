import { useEffect, useRef } from 'react'
import anime from 'animejs/lib/anime.es.js'

/**
 * Anime.js Hook - 提供常用動畫效果
 */
export const useAnimeAnimation = () => {
  const animeInstanceRef = useRef(null)

  // 清理函數
  useEffect(() => {
    return () => {
      if (animeInstanceRef.current) {
        animeInstanceRef.current.pause()
        animeInstanceRef.current = null
      }
    }
  }, [])

  /**
   * 卡片進入動畫（使用 Stagger）
   */
  const animateCardsIn = (selector, options = {}) => {
    const {
      delay = 0,
      stagger = 100,
      duration = 600,
      easing = 'spring(1, 80, 10, 0)'
    } = options

    animeInstanceRef.current = anime({
      targets: selector,
      opacity: [0, 1],
      translateY: [50, 0],
      scale: [0.8, 1],
      delay: anime.stagger(stagger, { start: delay }),
      duration: duration,
      easing: easing
    })

    return animeInstanceRef.current
  }

  /**
   * 數字計數動畫
   */
  const animateNumber = (target, from, to, options = {}) => {
    const {
      duration = 1500,
      easing = 'easeOutExpo',
      formatValue = (val) => Math.round(val),
      onUpdate = null
    } = options

    animeInstanceRef.current = anime({
      targets: { value: from },
      value: to,
      duration: duration,
      easing: easing,
      update: function(anim) {
        const currentValue = formatValue(anim.animatables[0].target.value)
        if (target && typeof target === 'object' && target.current) {
          target.current.textContent = currentValue
        } else if (typeof target === 'string') {
          const el = document.querySelector(target)
          if (el) el.textContent = currentValue
        }
        if (onUpdate) onUpdate(currentValue)
      }
    })

    return animeInstanceRef.current
  }

  /**
   * 滾動觸發動畫
   */
  const animateOnScroll = (selector, options = {}) => {
    const {
      threshold = 0.1,
      once = true,
      animation = {
        opacity: [0, 1],
        translateY: [50, 0]
      }
    } = options

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            anime({
              targets: entry.target,
              ...animation,
              duration: 800,
              easing: 'spring(1, 80, 10, 0)'
            })

            if (once) {
              observer.unobserve(entry.target)
            }
          }
        })
      },
      { threshold }
    )

    const elements = document.querySelectorAll(selector)
    elements.forEach((el) => observer.observe(el))

    return () => {
      elements.forEach((el) => observer.unobserve(el))
    }
  }

  /**
   * Timeline 創建器
   */
  const createTimeline = (options = {}) => {
    return anime.timeline({
      autoplay: false,
      ...options
    })
  }

  /**
   * 文字動畫效果
   */
  const animateText = (selector, text, options = {}) => {
    const {
      duration = 2000,
      easing = 'easeOutExpo',
      delay = 0
    } = options

    const element = typeof selector === 'string' 
      ? document.querySelector(selector) 
      : selector

    if (!element) return

    // 設置初始狀態
    element.textContent = ''
    
    // 使用 Anime.js 動畫文字
    const chars = text.split('').map((char, i) => {
      const span = document.createElement('span')
      span.textContent = char === ' ' ? '\u00A0' : char
      span.style.opacity = '0'
      span.style.display = 'inline-block'
      element.appendChild(span)
      return span
    })

    anime({
      targets: chars,
      opacity: [0, 1],
      translateY: [20, 0],
      delay: anime.stagger(50, { start: delay }),
      duration: duration / chars.length,
      easing: easing
    })

    return { chars }
  }

  return {
    animateCardsIn,
    animateNumber,
    animateOnScroll,
    createTimeline,
    animateText
  }
}

