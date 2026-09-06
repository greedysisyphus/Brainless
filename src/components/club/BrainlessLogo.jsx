import { useEffect, useRef, useState } from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'
import logoCat from '../../assets/logo-cat.png'

/**
 * Brainless 標記：水彩貓照片本身在動 —— 眼皮下垂、耳朵抽動、鼻頭嗅聞、
 * 頭部呼吸擺動、鏡頭推近拉遠，並會朝滑鼠 / 手指的方向偏。
 *
 * 手法是把照片切成幾塊（眼、耳、口鼻）重新投影再各自變形，沒有另外畫圖。
 * 只保留必要的時間軸與 easing，未引入動畫框架；圖片沿用既有的 logo-cat.png。
 *
 * 右邊的 wordmark 直接吃同一組 lift / rot / earRot，所以整組 logo 是同一個生物在動：
 * 貓抬頭時字跟著上浮、朝游標傾，耳朵抽動時 sparkles 閃一下。
 */

const SRC = 640 // 原圖尺寸
const STAGE = 1080 // 合成畫布尺寸
const K = STAGE / SRC
const PAPER = '#eed2c0' // 補洞用的紙色，取自原圖背景
const TOTAL = 12 // 一輪長度（秒）
const CUES = { Doze: 0, Flick: 3.5, Look: 5.5, Drift: 9 } // 各段起點

// 眼皮框刻意畫得比眼睛大，閉眼時要能完全蓋住虹膜；
// lead = 完全睜眼時眼皮邊緣停的位置；sx/sy = 拿來當眼皮的那塊額頭毛
const EYES = [
  { x: 150, y: 142, w: 124, h: 116, lead: 0.17, sx: 276, sy: 116 },
  { x: 376, y: 204, w: 118, h: 114, lead: 0.2, sx: 296, sy: 132 },
]
const EAR = { x: 452, y: 108, w: 188, h: 140, pvx: 6, pvy: 82 }
const MUZZLE = { x: 232, y: 272, w: 190, h: 156 }
const FOCUS = { x: 320, y: 224 }

const easeOutQuad = (t) => t * (2 - t)
const easeOutCubic = (t) => --t * t * t + 1
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1)
const MOTION = { glide: easeInOutCubic, settle: easeOutCubic, snap: easeOutQuad }

/** 依關鍵格 [時間, 值, easing] 取出 T 當下的值 */
function seg(T, keys) {
  if (T <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [t0, v0] = keys[i - 1]
    const [t1, v1, ease] = keys[i]
    if (T <= t1) {
      const p = t1 === t0 ? 1 : (T - t0) / (t1 - t0)
      return v0 + (v1 - v0) * (ease || MOTION.glide)(p)
    }
  }
  return keys[keys.length - 1][1]
}

/** 沉重想睡的眨眼：慢慢閉、停住、慢慢睜 */
function blinkP(T, at, close, hold, open) {
  const t = T - at
  if (t < 0 || t > close + hold + open) return 0
  if (t < close) return MOTION.snap(t / close)
  if (t < close + hold) return 1
  return 1 - MOTION.settle((t - close - hold) / open)
}

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** 0→TOTAL 循環的時鐘；分頁隱藏時暫停，回來接續 */
function useLoopClock(active) {
  const [T, setT] = useState(0)
  const tRef = useRef(0)
  useEffect(() => {
    if (!active) return undefined
    let raf = 0
    let startedAt = performance.now()
    const tick = (now) => {
      tRef.current = ((now - startedAt) / 1000) % TOTAL
      setT(tRef.current)
      raf = requestAnimationFrame(tick)
    }
    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) {
        startedAt = performance.now() - tRef.current * 1000
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active])
  return T
}

/** 追游標 / 手指，帶阻尼；沒動的時候完全閒置 */
function usePointerLean(enabled) {
  const [lean, setLean] = useState({ x: 0, y: 0 })
  const target = useRef({ x: 0, y: 0 })
  const cur = useRef({ x: 0, y: 0 })
  useEffect(() => {
    if (!enabled) return undefined
    let raf = 0
    let live = false
    const tick = () => {
      const c = cur.current
      const tg = target.current
      const nx = c.x + (tg.x - c.x) * 0.08
      const ny = c.y + (tg.y - c.y) * 0.08
      cur.current = { x: nx, y: ny }
      setLean({ x: nx, y: ny })
      if (Math.abs(tg.x - nx) > 0.002 || Math.abs(tg.y - ny) > 0.002) raf = requestAnimationFrame(tick)
      else live = false
    }
    const onMove = (e) => {
      const t = e.touches && e.touches[0] ? e.touches[0] : e
      const w = window.innerWidth || 1
      const h = window.innerHeight || 1
      target.current = {
        x: Math.max(-1, Math.min(1, (t.clientX / w - 0.5) * 2)),
        y: Math.max(-1, Math.min(1, (t.clientY / h - 0.5) * 2)),
      }
      if (!live) {
        live = true
        tick()
      }
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('touchmove', onMove)
    }
  }, [enabled])
  return lean
}

export default function BrainlessLogo({
  size = 66,
  className = '',
  pushIn = 0.2,
  sleepiness = 0.8,
  eyeTracking = true,
}) {
  const [animated] = useState(() => !prefersReducedMotion())
  const T = useLoopClock(animated)
  const lean = usePointerLean(animated && eyeTracking)

  // 鏡頭：懶懶地推向眼睛再拉回來，讓循環接縫對得上
  const zMax = 1 + 0.16 * pushIn
  const z = seg(T, [
    [CUES.Look - 0.6, 1],
    [CUES.Look + 2.8, zMax],
    [TOTAL - 0.3, 1, MOTION.glide],
  ])
  const k = (z - 1) / (zMax - 1 || 1)
  const fx = STAGE / 2 + (FOCUS.x * K - STAGE / 2) * k
  const fy = STAGE / 2 + (FOCUS.y * K - STAGE / 2) * k
  const dx = 9 * Math.sin((2 * Math.PI * T) / 12) - lean.x * 14
  const dy = 6 * Math.sin((2 * Math.PI * T) / 6) - lean.y * 8

  // 頭：緩慢的睏倦搖晃，耳朵抽動時抬一下，並朝游標傾
  const rot =
    seg(T, [
      [CUES.Flick - 0.2, 0],
      [CUES.Flick + 0.9, -3.4, MOTION.settle],
      [CUES.Look + 2.2, 3.8],
      [TOTAL, 0, MOTION.glide],
    ]) + lean.x * 2.2
  const lift = seg(T, [
    [CUES.Flick + 0.1, 0],
    [CUES.Flick + 0.45, -9, MOTION.snap],
    [CUES.Look + 1.2, -3],
    [TOTAL - 0.2, 0, MOTION.glide],
  ])
  const breath = 1 + 0.013 * Math.sin((2 * Math.PI * T) / 3)
  const sway = 1 + 0.006 * Math.sin((2 * Math.PI * T) / 4 + 1)

  // 眼皮：平時半垂，愈睏垂愈重
  const rest = seg(T, [
    [0, 0.34 * sleepiness],
    [CUES.Flick + 0.35, 0.06, MOTION.snap],
    [CUES.Look + 2.6, 0.18 * sleepiness],
    [TOTAL, 0.34 * sleepiness, MOTION.glide],
  ])
  let lid = rest
  ;[
    [CUES.Doze + 1.9, 0.16, 0.1, 0.3],
    [CUES.Look + 0.5, 0.2, 0.42, 0.5], // 最長最重的那次
    [CUES.Drift + 1.1, 0.24, 0.3, 0.6],
  ].forEach(([at, c, h, o]) => {
    lid = Math.max(lid, blinkP(T, at, c, h, o))
  })

  // 耳朵：快速彈開再收回
  const earRot = seg(T, [
    [CUES.Flick + 0.12, 0],
    [CUES.Flick + 0.2, -2.6, MOTION.snap],
    [CUES.Flick + 0.34, 1.4, MOTION.snap],
    [CUES.Flick + 0.62, 0, MOTION.settle],
    [CUES.Look + 2.5, 0],
    [CUES.Look + 2.62, 1.6, MOTION.snap],
    [CUES.Look + 2.95, 0, MOTION.settle],
  ])
  // 口鼻：慢慢嗅一下
  const sniff = 1 + 0.014 * Math.max(0, Math.sin((2 * Math.PI * T) / 6 - 0.6))

  const bgImg = {
    backgroundImage: `url(${logoCat})`,
    backgroundSize: `${SRC}px ${SRC}px`,
    backgroundRepeat: 'no-repeat',
  }
  const mask = (value) => ({ maskImage: value, WebkitMaskImage: value })

  // wordmark 取貓的動作等比縮小，讓兩邊是同一個節拍而不是各動各的
  const wordY = lift * 0.22
  const wordRot = rot * 0.14
  // sparkles 閃光：快速亮起、慢慢暗下，一輪閃兩次（耳朵抽動、快睡著前）
  let twinkle = 0
  ;[
    [CUES.Flick + 0.18, 0.12, 0.04, 0.34],
    [CUES.Drift + 1.25, 0.12, 0.04, 0.36],
  ].forEach(([at, c, h, o]) => {
    twinkle = Math.max(twinkle, blinkP(T, at, c, h, o))
  })

  return (
    <span className={`flex items-center gap-3 ${className}`}>
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        width: size,
        height: size,
        flexShrink: 0,
        boxSizing: 'border-box',
        borderRadius: '50%',
        border: '2px solid #ec5836',
        padding: 4,
        background: PAPER,
        boxShadow: '0 8px 20px rgba(236,88,54,0.18)',
      }}
    >
      <div style={{ position: 'relative', height: '100%', borderRadius: '50%', overflow: 'hidden', background: PAPER }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: STAGE,
            height: STAGE,
            transformOrigin: '0 0',
            transform: `scale(${(size - 12) / STAGE})`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: STAGE,
              height: STAGE,
              transformOrigin: '0 0',
              transform: `translate(${STAGE / 2 - fx + dx}px, ${STAGE / 2 - fy + dy}px) scale(${z})`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: SRC,
                height: SRC,
                transformOrigin: '0 0',
                transform: `scale(${K * 1.1}) translate(${-SRC * 0.045}px, ${-SRC * 0.03}px)`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: SRC,
                  height: SRC,
                  transformOrigin: `${SRC / 2}px ${SRC}px`,
                  transform: `translateY(${lift * 0.35}px) rotate(${rot}deg) scale(${sway}, ${breath})`,
                }}
              >
                <img src={logoCat} width={SRC} height={SRC} alt="" style={{ display: 'block' }} />

                {/* 耳朵：紙色補丁蓋住原本的耳朵，上面疊一份會轉的耳朵 */}
                <div
                  style={{
                    position: 'absolute',
                    left: EAR.x + 48,
                    top: EAR.y,
                    width: EAR.w - 48,
                    height: EAR.h,
                    background: 'linear-gradient(160deg, #f0d3bd, #e9cdb4)',
                    ...mask('linear-gradient(to right, transparent 0px, #000 34px)'),
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: EAR.x,
                    top: EAR.y,
                    width: EAR.w,
                    height: EAR.h,
                    ...bgImg,
                    backgroundPosition: `-${EAR.x}px -${EAR.y}px`,
                    transformOrigin: `${EAR.pvx}px ${EAR.pvy}px`,
                    transform: `rotate(${earRot}deg)`,
                    ...mask('linear-gradient(to right, transparent 0px, #000 26px)'),
                  }}
                />

                {/* 口鼻嗅聞 */}
                <div
                  style={{
                    position: 'absolute',
                    left: MUZZLE.x,
                    top: MUZZLE.y,
                    width: MUZZLE.w,
                    height: MUZZLE.h,
                    ...bgImg,
                    backgroundPosition: `-${MUZZLE.x}px -${MUZZLE.y}px`,
                    transformOrigin: '50% 70%',
                    transform: `scale(${sniff})`,
                    ...mask('radial-gradient(closest-side, #000 45%, transparent 100%)'),
                  }}
                />

                {/* 眼皮：取眼睛正上方的毛往下滑 */}
                {EYES.map((e, i) => {
                  const p = Math.min(1, lid + (i === 1 ? 0.02 : 0))
                  return (
                    <div
                      key={e.sx}
                      style={{
                        position: 'absolute',
                        left: e.x,
                        top: e.y,
                        width: e.w,
                        height: e.h,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        ...mask('radial-gradient(closest-side, #000 62%, transparent 100%)'),
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          ...bgImg,
                          backgroundPosition: `-${e.sx}px -${e.sy}px`,
                          transform: `translateY(${(p - 1 + e.lead) * e.h}px)`,
                          filter: 'blur(0.9px)',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: '38%',
                            background: 'linear-gradient(to bottom, rgba(74,44,58,0), rgba(74,44,58,0.34))',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            opacity: 0.3 * p,
                            background: 'radial-gradient(closest-side, rgba(108,76,104,0.55), rgba(108,76,104,0))',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </span>

      <span
        style={{
          display: 'block',
          transform: `translateY(${wordY}px) rotate(${wordRot}deg)`,
          transformOrigin: 'left center',
        }}
      >
        <span className="block text-[30px] font-black leading-none tracking-[-0.075em] text-[#171717] sm:text-[36px]">
          brainless
        </span>
        <span className="mt-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#ec5836]">
          <SparklesIcon
            className="h-3.5 w-3.5"
            style={{
              transform: `scale(${0.96 + twinkle * 0.2})`,
              opacity: 0.62 + twinkle * 0.38,
              strokeWidth: 1.5 + twinkle * 0.45,
            }}
          />{' '}
          behind the counter
        </span>
      </span>
    </span>
  )
}
