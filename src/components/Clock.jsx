import { useState, useEffect } from 'react'

function Clock() {
  const [countdown, setCountdown] = useState(null)
  const [countdownType, setCountdownType] = useState(null)
  const [shift, setShift] = useState(null) // 'morning' | 'afternoon' | null

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
        setShift('morning') // 預設顯示早班
      }
      
      setCountdown(remainingTime)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatCountdown = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}小時 ${mins}分鐘`
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-text-secondary font-medium">
        {countdownType === 'workEnd' 
          ? `${shift === 'morning' ? '早班' : '晚班'}離下班還有` 
          : '早班離上班還有'}
      </span>
      <span className={`
        font-medium px-3 py-1 rounded-full
        ${countdownType === 'workEnd' 
          ? 'text-primary bg-primary/10 animate-pulse'
          : 'text-secondary bg-secondary/10 animate-pulse'
        }
      `}>
        {formatCountdown(countdown)}
      </span>
    </div>
  )
}

export default Clock 