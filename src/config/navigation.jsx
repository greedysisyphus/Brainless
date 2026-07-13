import React from 'react'
import {
  CalculatorIcon,
  BanknotesIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  CalendarIcon,
  Cog6ToothIcon,
  MusicalNoteIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'

/** SVG 雞尾酒圖示（與 Navigation 原版一致） */
export function CocktailIcon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 20v-7m0 0l6-6.5H6L12 13zm-4-9h8m-8 0l-2-2m10 2l2-2"
      />
    </svg>
  )
}

/**
 * Studio Mega / Sidebar 共用；Classic Navigation 可依此組 icon。
 * section：頂部分組；accentColor：squircle 邊框色
 */
export const BASE_NAV_ITEMS = [
  {
    path: '/sandwich',
    label: '厚片計算器',
    section: '門市營運',
    accentColor: '#facc15',
    Icon: CalculatorIcon,
  },
  {
    path: '/cashier',
    label: '收銀管理',
    section: '門市營運',
    accentColor: '#22d3ee',
    Icon: BanknotesIcon,
  },
  {
    path: '/coffee-beans',
    label: '咖啡豆管理',
    section: '庫存與報表',
    accentColor: '#c084fc',
    Icon: ClipboardDocumentListIcon,
  },
  {
    path: '/daily-reports',
    label: '報表生成器',
    section: '庫存與報表',
    accentColor: '#fb923c',
    Icon: DocumentTextIcon,
  },
  {
    path: '/schedule',
    label: '班表管理',
    section: '人事與航班',
    accentColor: '#4ade80',
    Icon: CalendarIcon,
  },
  {
    path: '/flight-data',
    label: '航班資料',
    section: '人事與航班',
    accentColor: '#94a3b8',
    Icon: PaperAirplaneIcon,
  },
  {
    path: '/poursteady',
    label: '手沖機調整',
    section: '門市工具',
    accentColor: '#38bdf8',
    Icon: BeakerIcon,
  },
  {
    path: '/playground',
    label: 'Playground',
    section: '實驗',
    accentColor: '#a78bfa',
    Icon: MusicalNoteIcon,
  },
]

export const ADMIN_NAV_META = {
  path: '/admin',
  label: '管理設定',
  section: '系統',
  accentColor: '#d4ff00',
  Icon: Cog6ToothIcon,
}

/** 取得不重複的分組標題順序（依首次出現） */
export function getNavSections(items = BASE_NAV_ITEMS) {
  const seen = new Set()
  const order = []
  for (const it of items) {
    if (!seen.has(it.section)) {
      seen.add(it.section)
      order.push(it.section)
    }
  }
  return order
}

export function itemsForSection(sectionName, items = BASE_NAV_ITEMS) {
  return items.filter((i) => i.section === sectionName)
}
