import { useState, useEffect } from 'react'

function Clock() {
  const [countdown, setCountdown] = useState(null)
  const [countdownType, setCountdownType] = useState(null)
  const [shift, setShift] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const hour = now.getHours()
      const minutes = now.getMinutes()
      const currentMinutes = hour * 60 + minutes
      
      const morningStart = 4 * 60 + 30  // 04:30
      const morningEnd = 13 * 60        // 13:00
      const afternoonEnd = 21 * 60 + 30 // 21:30
      
      let remainingTime = null
      
      if (currentMinutes >= morningStart && currentMinutes < morningEnd) {
        remainingTime = morningEnd - currentMinutes
        setCountdownType('workEnd')
        setShift('morning')
      } else if (currentMinutes >= morningEnd && currentMinutes < afternoonEnd) {
        remainingTime = afternoonEnd - currentMinutes
        setCountdownType('workEnd')
        setShift('afternoon')
      } else {
        if (currentMinutes < morningStart) {
          remainingTime = morningStart - currentMinutes
        } else {
          remainingTime = (24 * 60 - currentMinutes) + morningStart
        }
        setCountdownType('workStart')
        setShift('morning')
      }
      
      setCountdown(remainingTime)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // 根據剩餘時間返回樣式
  const getTimeStyle = (minutes) => {
    if (minutes === null) return 'text-text-secondary'
    if (minutes <= 30) return 'text-red-400 bg-red-400/10 ring-1 ring-red-400'
    if (minutes <= 120) return 'text-orange-400 bg-orange-400/10 ring-1 ring-orange-400'
    return 'text-primary bg-primary/10 ring-1 ring-primary'
  }

  const formatCountdown = (minutes) => {
    if (minutes === null) return ''
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}小時 ${mins}分鐘`
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-text-secondary">
        {countdownType === 'workEnd' 
          ? `${shift === 'morning' ? '早班' : '晚班'}離下班還有 ` 
          : '早班離上班還有 '}
      </span>
      <span className={`
        font-medium px-3 py-1 rounded-full
        ${getTimeStyle(countdown)}
        transition-all duration-300
      `}>
        {formatCountdown(countdown)}
      </span>
    </div>
  )
}

export default Clock 