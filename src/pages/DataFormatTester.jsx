import { useState } from 'react'
import { DualThemePage } from '../components/studio/DualThemePage'
import { CwButton, CwCard, CwStack, CwTextarea } from '../components/studio/ui'

const DT_BC = [
  { label: 'Brainless', href: '#/sandwich' },
  { label: '人事與航班', href: '#/' },
  { label: '資料格式測試', href: '#/data-tester' },
]

function DataFormatTester() {
  const [testData, setTestData] = useState('')
  const [result, setResult] = useState('')

  const testFormat = () => {
    if (!testData.trim()) {
      setResult('請輸入測試資料')
      return
    }

    const lines = testData.trim().split('\n')
    let analysis = '資料格式分析結果：\n\n'

    analysis += `總行數: ${lines.length}\n\n`

    lines.forEach((line, index) => {
      if (!line.trim()) {
        analysis += `第 ${index + 1} 行: 空白行\n`
        return
      }

      analysis += `第 ${index + 1} 行: "${line}"\n`

      const tabColumns = line.split('\t')
      const spaceColumns = line.split(/\s+/)

      analysis += `  Tab 分隔: ${tabColumns.length} 個欄位\n`
      analysis += `  空格分隔: ${spaceColumns.length} 個欄位\n`

      if (tabColumns.length >= 2) {
        analysis += `  職員編號: "${tabColumns[0].trim()}"\n`
        analysis += `  姓名: "${tabColumns[1].trim()}"\n`
        analysis += `  班表欄位數: ${tabColumns.length - 2}\n`
      } else if (spaceColumns.length >= 2) {
        analysis += `  職員編號: "${spaceColumns[0].trim()}"\n`
        analysis += `  姓名: "${spaceColumns[1].trim()}"\n`
        analysis += `  班表欄位數: ${spaceColumns.length - 2}\n`
      } else {
        analysis += `  ❌ 格式錯誤：欄位數不足\n`
      }

      analysis += '\n'
    })

    setResult(analysis)
  }

  const hintBlockClassic = (
    <div className="mt-8 rounded-xl border border-white/10 bg-surface/40 p-6">
      <h3 className="mb-4 text-xl font-bold text-purple-400">正確的資料格式</h3>
      <div className="space-y-4">
        <div>
          <h4 className="mb-2 text-lg font-semibold text-orange-400">Excel 格式要求</h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
            <li>第一欄：職員編號（如 A45、A51）</li>
            <li>第二欄：姓名（如 林小余、黃紅葉）</li>
            <li>第三欄開始：每日班表（如 K、Y、L、月休）</li>
            <li>欄位之間用 Tab 鍵分隔</li>
            <li>每行代表一位同仁的完整班表</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-lg font-semibold text-green-400">範例資料</h4>
          <div className="rounded-lg border border-white/5 bg-surface/20 p-4">
            <pre className="font-mono text-sm text-text-secondary">
              {`A45	林小余	K	K	Y	L	月休	Y
A51	黃紅葉	K	K	Y	L	K	Y
A60	李Ashley	Y	L	K	Y	L	K`}
            </pre>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-lg font-semibold text-red-400">常見問題</h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
            <li>複製時沒有包含 Tab 分隔符</li>
            <li>職員編號或姓名為空</li>
            <li>資料行數不足</li>
            <li>包含多餘的空格或特殊字符</li>
          </ul>
        </div>
      </div>
    </div>
  )

  const hintBlockCraft = (
    <CwCard title="正確格式與範例">
      <p className="text-sm font-semibold text-[var(--cw-text)]">Excel 複製規則</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--cw-text-muted)]">
        <li>第一欄職員編號、第二欄姓名</li>
        <li>之後為每日班表欄</li>
        <li>以 Tab 分隔</li>
      </ul>
      <pre className="mt-4 overflow-x-auto rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] p-3 font-mono text-xs text-[var(--cw-text-muted)]">
        {`A45	林小余	K	K	Y	L
A51	黃紅葉	K	K	Y	L`}
      </pre>
    </CwCard>
  )

  const classicInner = (
    <div className="container-custom py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-center text-3xl font-bold">資料格式測試工具</h1>
        <p className="text-center text-text-secondary">檢查 Excel 資料格式是否正確</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-surface/40 p-6">
          <h3 className="mb-4 text-xl font-bold text-blue-400">輸入測試資料</h3>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold">從 Excel 複製的資料</label>
            <textarea
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              placeholder="請從 Excel 複製資料並貼上這裡..."
              className="focus:border-blue-400/50 h-64 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2 focus:bg-white/10"
            />
          </div>
          <button
            type="button"
            onClick={testFormat}
            className="rounded-lg border border-blue-400/30 bg-blue-500/20 px-6 py-2 text-blue-400 transition-all hover:bg-blue-500/30"
          >
            分析資料格式
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-surface/40 p-6">
          <h3 className="mb-4 text-xl font-bold text-green-400">分析結果</h3>
          <div className="rounded-lg border border-white/5 bg-surface/20 p-4">
            <pre className="font-mono text-sm whitespace-pre-wrap text-text-secondary">
              {result || '請輸入資料並點擊「分析資料格式」'}
            </pre>
          </div>
        </div>
      </div>
      {hintBlockClassic}
    </div>
  )

  const studioInner = (
    <CwStack className="!gap-[var(--cw-stack-gap)]">
      <div className="grid gap-6 lg:grid-cols-2">
        <CwCard title="輸入測試資料">
          <CwTextarea
            value={testData}
            onChange={(e) => setTestData(e.target.value)}
            placeholder="從 Excel 複製並貼上…"
            rows={12}
            textareaClassName="font-mono text-sm min-h-[12rem]"
          />
          <CwButton type="button" variant="primary" className="mt-4" onClick={testFormat}>
            分析資料格式
          </CwButton>
        </CwCard>

        <CwCard title="分析結果">
          <pre className="max-h-[24rem] overflow-auto rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] p-4 font-mono text-xs whitespace-pre-wrap text-[var(--cw-text-muted)]">
            {result || '請輸入資料並點擊「分析資料格式」'}
          </pre>
        </CwCard>
      </div>
      {hintBlockCraft}
    </CwStack>
  )

  return (
    <DualThemePage
      breadcrumbs={DT_BC}
      title="資料格式測試工具"
      description="檢查從 Excel 複製貼上班表資料是否符合 Tab 欄結構。"
      classic={classicInner}
      studio={studioInner}
    />
  )
}

export default DataFormatTester
