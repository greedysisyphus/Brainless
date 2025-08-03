import { useState } from 'react'

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
      
      // 分析分隔符
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

  return (
    <div className="container-custom py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">資料格式測試工具</h1>
        <p className="text-center text-text-secondary">檢查 Excel 資料格式是否正確</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 輸入區域 */}
        <div className="bg-surface/40 rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold mb-4 text-blue-400">輸入測試資料</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">從 Excel 複製的資料</label>
            <textarea
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              placeholder="請從 Excel 複製資料並貼上這裡..."
              className="w-full h-64 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-blue-400/50 focus:bg-white/10 resize-none"
            />
          </div>

          <button
            onClick={testFormat}
            className="px-6 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-400 rounded-lg transition-all"
          >
            分析資料格式
          </button>
        </div>

        {/* 結果區域 */}
        <div className="bg-surface/40 rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold mb-4 text-green-400">分析結果</h3>
          
          <div className="bg-surface/20 rounded-lg p-4 border border-white/5">
            <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono">
              {result || '請輸入資料並點擊「分析資料格式」'}
            </pre>
          </div>
        </div>
      </div>

      {/* 格式說明 */}
      <div className="mt-8 bg-surface/40 rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4 text-purple-400">正確的資料格式</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-semibold mb-2 text-orange-400">Excel 格式要求</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
              <li>第一欄：職員編號（如 A45、A51）</li>
              <li>第二欄：姓名（如 林小余、黃紅葉）</li>
              <li>第三欄開始：每日班表（如 K、Y、L、月休）</li>
              <li>欄位之間用 Tab 鍵分隔</li>
              <li>每行代表一位同仁的完整班表</li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-2 text-green-400">範例資料</h4>
            <div className="bg-surface/20 rounded-lg p-4 border border-white/5">
              <pre className="text-sm text-text-secondary font-mono">
{`A45	林小余	K	K	Y	L	月休	Y
A51	黃紅葉	K	K	Y	L	K	Y
A60	李Ashley	Y	L	K	Y	L	K`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-2 text-red-400">常見問題</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
              <li>複製時沒有包含 Tab 分隔符</li>
              <li>職員編號或姓名為空</li>
              <li>資料行數不足</li>
              <li>包含多餘的空格或特殊字符</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataFormatTester 