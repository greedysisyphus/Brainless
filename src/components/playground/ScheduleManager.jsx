import { useState } from 'react'
import ShiftSettings from './ShiftSettings'
import ScheduleCalendar from './ScheduleCalendar'
import { Cog6ToothIcon, CalendarIcon } from '@heroicons/react/24/outline'

function ScheduleManager() {
  const [activeTab, setActiveTab] = useState('calendar') // 'calendar' 或 'settings'

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">班表匯出</h1>
        <p className="text-text-secondary">
          快速輸入班表並匯出到 Apple Calendar 月曆
        </p>
      </div>

      {/* Tab 切換 */}
      <div className="flex items-center gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`
            flex items-center gap-2 px-4 py-2 border-b-2 transition-colors
            ${activeTab === 'calendar'
              ? 'border-green-500 text-green-400'
              : 'border-transparent text-text-secondary hover:text-primary'
            }
          `}
        >
          <CalendarIcon className="w-5 h-5" />
          <span>月曆班表</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`
            flex items-center gap-2 px-4 py-2 border-b-2 transition-colors
            ${activeTab === 'settings'
              ? 'border-green-500 text-green-400'
              : 'border-transparent text-text-secondary hover:text-primary'
            }
          `}
        >
          <Cog6ToothIcon className="w-5 h-5" />
          <span>班別設定</span>
        </button>
      </div>

      {/* 內容區域 */}
      <div>
        {activeTab === 'calendar' && <ScheduleCalendar />}
        {activeTab === 'settings' && <ShiftSettings />}
      </div>
    </div>
  )
}

export default ScheduleManager
