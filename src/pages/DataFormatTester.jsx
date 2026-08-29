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
      studio={studioInner}
    />
  )
}

export default DataFormatTester
