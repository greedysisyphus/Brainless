import { useSpring, animated } from '@react-spring/web'

export function AnimatedNumber({ value, prefix = '', suffix = '' }) {
  const { number } = useSpring({
    from: { number: 0 },
    number: value,
    delay: 200,
    config: { mass: 1, tension: 20, friction: 10 }
  })

  return (
    <animated.span>
      {prefix}
      {number.to(n => n.toLocaleString())}
      {suffix}
    </animated.span>
  )
} 