import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import {
  CalculatorIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  DocumentTextIcon,
  BeakerIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline'


// 自定義雞尾酒圖示
function CocktailIcon(props) {
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

// 功能卡片數據
const FEATURES = [
  {
    path: '/sandwich',
    icon: CalculatorIcon,
    title: '三明治計算器',
    description: '快速計算三明治製作需求，支援多店鋪管理',
    color: 'from-purple-500/20 to-pink-500/20'
  },
  {
    path: '/cashier',
    icon: BanknotesIcon,
    title: '收銀管理',
    description: '完整的收銀系統，追蹤每日營業狀況',
    color: 'from-blue-500/20 to-cyan-500/20'
  },
  {
    path: '/coffee-beans',
    icon: ClipboardDocumentListIcon,
    title: '咖啡豆管理',
    description: '管理咖啡豆庫存和使用記錄',
    color: 'from-amber-500/20 to-orange-500/20'
  },
  {
    path: '/schedule',
    icon: CalendarIcon,
    title: '班表管理',
    description: '智能班表排程和員工管理系統',
    color: 'from-indigo-500/20 to-purple-500/20'
  },
  {
    path: '/daily-reports',
    icon: DocumentTextIcon,
    title: '報表生成器',
    description: '自動生成各類營業報表，提升工作效率',
    color: 'from-green-500/20 to-emerald-500/20'
  },
  {
    path: '/poursteady',
    icon: BeakerIcon,
    title: '手沖機調整',
    description: '精準調整手沖咖啡機參數',
    color: 'from-red-500/20 to-rose-500/20'
  },
  {
    path: '/music',
    icon: MusicalNoteIcon,
    title: 'Playground',
    description: '實驗性功能和個人專案展示',
    color: 'from-purple-500/20 to-pink-500/20'
  },
]

/**
 * Linear 風格的首頁
 * 參考 Linear 官網的設計和動畫效果
 */
function HomepageLinear() {
  const heroRef = useRef(null)
  const featuresRef = useRef(null)
  const { scrollYProgress } = useScroll()

  // Hero 區域的視差效果
  const heroY = useTransform(scrollYProgress, [0, 0.5], ['0%', '30%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])

  // 滾動視差效果已由 Framer Motion 處理

  return (
    <div className="min-h-screen">
      {/* Hero 區域 - 模仿 Linear 的大標題設計 */}
      <section 
        ref={heroRef}
        className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
      >
        {/* 背景漸變 */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a]" />
        
        {/* 動態背景元素 */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 70%)'
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        {/* Hero 內容 */}
        <motion.div
          className="relative z-10 text-center px-6 max-w-5xl mx-auto"
          style={{
            y: heroY,
            opacity: heroOpacity
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold text-white mb-6 tracking-tight leading-none">
              <span className="block">Brainless</span>
              <span className="block text-white/60 text-4xl sm:text-5xl md:text-6xl mt-4 font-normal">
                為咖啡店打造的工作系統
              </span>
            </h1>
            
            <motion.p
              className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              整合各種工具，提升效率，專注於為顧客提供最好的服務體驗
            </motion.p>

            {/* CTA 按鈕 */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link to="/sandwich">
                <motion.button
                  className="px-8 py-4 bg-white text-[#0a0a0a] rounded-lg font-semibold text-base hover:bg-white/90 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  開始使用
                </motion.button>
              </Link>
              <motion.button
                className="px-8 py-4 bg-white/5 text-white rounded-lg font-semibold text-base border border-white/10 hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                了解更多
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* 滾動提示 */}
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <motion.div
            className="w-6 h-10 border-2 border-white/20 rounded-full flex items-start justify-center p-2"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* 功能展示區域 */}
      <section 
        ref={featuresRef}
        className="relative py-32 px-6"
      >
        <div className="max-w-7xl mx-auto">
          {/* 標題 */}
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-5xl sm:text-6xl font-bold text-white mb-6 tracking-tight">
              功能完整的工作系統
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              整合所有必要工具，讓工作流程更順暢
            </p>
          </motion.div>

          {/* 功能卡片網格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => (
              <FeatureCard
                key={feature.path}
                {...feature}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

/**
 * 功能卡片組件
 */
function FeatureCard({ path, icon: Icon, title, description, color, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1]
      }}
    >
      <Link to={path}>
        <motion.div
          className="feature-card relative group p-8 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300 cursor-pointer h-full"
          whileHover={{ y: -8, scale: 1.02 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* 背景漸變 */}
          <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`} />
          
          {/* 內容 */}
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Icon className="w-6 h-6 text-white" />
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-3">
              {title}
            </h3>
            
            <p className="text-white/60 leading-relaxed">
              {description}
            </p>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}

export default HomepageLinear
