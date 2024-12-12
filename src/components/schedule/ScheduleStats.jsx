import { useMemo } from 'react'

function ScheduleStats({ scheduleData, employees }) {
  const stats = useMemo(() => {
    const result = {
      byEmployee: {},
      overall: {
        totalShifts: 0,
        morningShifts: 0,
        eveningShifts: 0
      }
    }
    
    // 使用傳入的班次數據
    Object.entries(scheduleData).forEach(([employeeId, shifts]) => {
      result.byEmployee[employeeId] = {
        name: employees.find(emp => emp.id === employeeId)?.name || employeeId,
        totalShifts: shifts.morning + shifts.evening,
        morningShifts: shifts.morning,
        eveningShifts: shifts.evening,
        shiftRatio: shifts.morning + shifts.evening > 0 
          ? (shifts.morning / (shifts.morning + shifts.evening) * 100).toFixed(1)
          : 0
      }
      
      result.overall.morningShifts += shifts.morning
      result.overall.eveningShifts += shifts.evening
      result.overall.totalShifts += shifts.morning + shifts.evening
    })
    
    return result
  }, [scheduleData, employees])

  return (
    <div className="bg-surface rounded-xl p-6 shadow-xl">
      <h2 className="text-xl font-bold mb-4">班表統計</h2>
      
      {/* 總覽 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-sm text-text-secondary">總班次</div>
          <div className="text-2xl font-bold">{stats.overall.totalShifts}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-sm text-text-secondary">早班</div>
          <div className="text-2xl font-bold">{stats.overall.morningShifts}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-sm text-text-secondary">晚班</div>
          <div className="text-2xl font-bold">{stats.overall.eveningShifts}</div>
        </div>
      </div>
      
      {/* 個人統計 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-2">個人統計</h3>
        {Object.values(stats.byEmployee).map(emp => (
          <div key={emp.name} className="bg-white/5 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">{emp.name}</span>
              <span className="text-sm text-text-secondary">
                共 {emp.totalShifts} 班
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-text-secondary">早班</div>
                <div>{emp.morningShifts}</div>
              </div>
              <div>
                <div className="text-text-secondary">晚班</div>
                <div>{emp.eveningShifts}</div>
              </div>
              <div>
                <div className="text-text-secondary">早班比例</div>
                <div>{emp.shiftRatio}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ScheduleStats 