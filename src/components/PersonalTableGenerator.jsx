import { useState } from 'react'
import { PrinterIcon, ArrowDownTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'

function PersonalTableGenerator() {
  const [machineType, setMachineType] = useState('')
  const [quantity, setQuantity] = useState('')
  const [pageNumber, setPageNumber] = useState('')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [rows, setRows] = useState(20)

  // 共用輸入欄位樣式
  const inputClassName = "w-full px-4 py-2 bg-surface/60 border border-white/10 rounded-lg text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary/50 transition-colors"
  const labelClassName = "block text-sm font-medium text-text-secondary mb-2"

  // 創建表格 HTML（Apple 風格，A4橫向）
  const createTableHTML = () => {
    const yearDisplay = year || ''
    const monthDisplay = month || ''
    const dayDisplay = day || ''
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4 landscape !important;
            margin: 0 !important;
            orientation: landscape !important;
          }
          @media print {
            @page {
              size: A4 landscape !important;
              margin: 0 !important;
              orientation: landscape !important;
            }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft JhengHei', sans-serif;
            padding: 5.6mm;
            background: #fafafa;
            color: #1d1d1f;
            box-sizing: border-box;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.08);
            height: 100%;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            overflow: hidden;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e5e5e7;
            flex-shrink: 0;
          }
          .header-fields {
            display: flex;
            gap: 20px;
            align-items: flex-end;
            flex: 1;
            width: 100%;
          }
          .field-group {
            margin-bottom: 0;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
          }
          .field-group.machine-type {
            flex: 1;
            min-width: 200px;
          }
          .field-label {
            font-size: 13px;
            color: #1d1d1f;
            margin-bottom: 10px;
            font-weight: 500;
            display: block;
          }
          .field-value {
            font-size: 14px;
            color: #1d1d1f;
            font-weight: 400;
            height: 24px;
            padding: 2px 0;
            border-bottom: 1.5px solid #d2d2d7;
            min-width: 100px;
            display: block;
            width: 100%;
            line-height: 20px;
            box-sizing: border-box;
          }
          .field-group.machine-type .field-value {
            min-width: 200px;
          }
          .field-value.empty {
            color: transparent;
            border-bottom-color: #d2d2d7;
          }
          .date-field {
            margin-top: 0;
            overflow: visible;
          }
          .date-inputs {
            display: flex;
            align-items: flex-end;
            gap: 0;
            height: 24px;
            box-sizing: border-box;
          }
          .date-input-wrapper {
            display: flex;
            align-items: flex-end;
            position: relative;
          }
          .date-input {
            font-size: 14px;
            font-weight: 400;
            padding: 2px 8px;
            border-bottom: 1.5px solid #d2d2d7;
            min-width: 50px;
            text-align: center;
            display: inline-block;
            line-height: 20px;
            height: 24px;
            box-sizing: border-box;
            position: relative;
          }
          .date-input.month,
          .date-input.day {
            min-width: 45px;
          }
          .date-label {
            font-size: 12px;
            color: #8e8e93;
            font-weight: 400;
            white-space: nowrap;
            line-height: 24px;
            padding: 0 4px;
          }
          .table-container {
            width: 100%;
            border: 1px solid #e5e5e7;
            border-collapse: collapse;
            margin-top: 0;
            border-radius: 8px;
            overflow: hidden;
            background: white;
            flex: 1;
            min-height: 0;
          }
          .table-container th,
          .table-container td {
            border: 1px solid #e5e5e7;
            padding: 6px 10px;
            font-size: 11px;
            vertical-align: middle;
          }
          .table-container th {
            background: #f5f5f7;
            font-weight: 600;
            color: #1d1d1f;
            text-align: center;
            padding: 8px 10px;
          }
          .table-container td {
            color: #515154;
            height: 28px;
          }
          .table-container .col-no {
            width: 6%;
            text-align: center;
            color: #1d1d1f;
            font-weight: 500;
          }
          .table-container th.col-code,
          .table-container th.col-chinese,
          .table-container th.col-english,
          .table-container th.col-spec,
          .table-container th.col-location,
          .table-container th.col-remark {
            text-align: center;
          }
          .table-container .col-code {
            width: 11%;
            text-align: left;
          }
          .table-container .col-chinese {
            width: 17%;
            text-align: left;
          }
          .table-container .col-english {
            width: 17%;
            text-align: left;
          }
          .table-container .col-spec {
            width: 16%;
            text-align: left;
          }
          .table-container .col-location {
            width: 12%;
            text-align: left;
          }
          .table-container .col-qty {
            width: 7%;
            text-align: center;
          }
          .table-container .col-remark {
            width: 14%;
            text-align: left;
          }
          .table-container tbody tr:nth-child(even) {
            background: #fafafa;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-fields">
              <div class="field-group date-field">
                <span class="field-label">日期</span>
                <div class="date-inputs">
                  <span class="date-input" style="color: ${year ? '#1d1d1f' : 'transparent'}">${yearDisplay}</span>
                  <span class="date-label">年</span>
                  <span class="date-input month" style="color: ${month ? '#1d1d1f' : 'transparent'}">${monthDisplay}</span>
                  <span class="date-label">月</span>
                  <span class="date-input day" style="color: ${day ? '#1d1d1f' : 'transparent'}">${dayDisplay}</span>
                  <span class="date-label">日</span>
                </div>
              </div>
              <div class="field-group machine-type">
                <span class="field-label">機種</span>
                <span class="field-value ${machineType ? '' : 'empty'}">${machineType || ''}</span>
              </div>
              <div class="field-group">
                <span class="field-label">數量</span>
                <span class="field-value ${quantity ? '' : 'empty'}">${quantity || ''}</span>
              </div>
              <div class="field-group">
                <span class="field-label">P</span>
                <span class="field-value ${pageNumber ? '' : 'empty'}">${pageNumber || ''}</span>
              </div>
            </div>
          </div>
          
          <table class="table-container">
            <thead>
              <tr>
                <th class="col-no">No.</th>
                <th class="col-code">Part Code</th>
                <th class="col-chinese">中文</th>
                <th class="col-english">英文</th>
                <th class="col-spec">規格</th>
                <th class="col-location">零件位置</th>
                <th class="col-qty">Q'ty</th>
                <th class="col-remark">備註</th>
              </tr>
            </thead>
            <tbody>
              ${Array.from({ length: rows }, (_, i) => `
                <tr>
                  <td class="col-no">${i + 1}</td>
                  <td class="col-code"></td>
                  <td class="col-chinese"></td>
                  <td class="col-english"></td>
                  <td class="col-spec"></td>
                  <td class="col-location"></td>
                  <td class="col-qty"></td>
                  <td class="col-remark"></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `
  }

  // 創建表格內容 HTML（用於 html2canvas）
  const createTableContentHTML = () => {
    const yearDisplay = year || ''
    const monthDisplay = month || ''
    const dayDisplay = day || ''
    
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft JhengHei', sans-serif; width: 1123px; height: 794px; padding: 20px; background: #fafafa; color: #1d1d1f; box-sizing: border-box; overflow: hidden;">
        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.08); width: 100%; height: 100%; display: flex; flex-direction: column; box-sizing: border-box; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e7; flex-shrink: 0;">
            <div style="display: flex; gap: 20px; align-items: flex-end; flex: 1; width: 100%;">
              <div style="margin-bottom: 0; flex-shrink: 0; display: flex; flex-direction: column; justify-content: flex-end;">
                <span style="font-size: 13px; color: #1d1d1f; margin-bottom: 10px; font-weight: 500; display: block;">日期</span>
                <div style="display: flex; align-items: flex-end; gap: 0; height: 24px; box-sizing: border-box;">
                  <span style="font-size: 14px; color: ${year ? '#1d1d1f' : 'transparent'}; font-weight: 400; padding: 2px 8px; border-bottom: 1.5px solid #d2d2d7; min-width: 50px; text-align: center; display: inline-block; line-height: 20px; height: 24px; box-sizing: border-box;">${yearDisplay}</span>
                  <span style="font-size: 12px; color: #8e8e93; font-weight: 400; white-space: nowrap; line-height: 24px; padding: 0 4px;">年</span>
                  <span style="font-size: 14px; color: ${month ? '#1d1d1f' : 'transparent'}; font-weight: 400; padding: 2px 8px; border-bottom: 1.5px solid #d2d2d7; min-width: 45px; text-align: center; display: inline-block; line-height: 20px; height: 24px; box-sizing: border-box;">${monthDisplay}</span>
                  <span style="font-size: 12px; color: #8e8e93; font-weight: 400; white-space: nowrap; line-height: 24px; padding: 0 4px;">月</span>
                  <span style="font-size: 14px; color: ${day ? '#1d1d1f' : 'transparent'}; font-weight: 400; padding: 2px 8px; border-bottom: 1.5px solid #d2d2d7; min-width: 45px; text-align: center; display: inline-block; line-height: 20px; height: 24px; box-sizing: border-box;">${dayDisplay}</span>
                  <span style="font-size: 12px; color: #8e8e93; font-weight: 400; white-space: nowrap; line-height: 24px; padding: 0 4px;">日</span>
                </div>
              </div>
              <div style="margin-bottom: 0; flex: 1; min-width: 200px; display: flex; flex-direction: column; justify-content: flex-end;">
                <span style="font-size: 13px; color: #1d1d1f; margin-bottom: 10px; font-weight: 500; display: block;">機種</span>
                <span style="font-size: 14px; color: ${machineType ? '#1d1d1f' : 'transparent'}; font-weight: 400; height: 24px; padding: 2px 0; border-bottom: 1.5px solid #d2d2d7; min-width: 200px; display: block; width: 100%; line-height: 20px; box-sizing: border-box;">${machineType || ''}</span>
              </div>
              <div style="margin-bottom: 0; flex-shrink: 0; display: flex; flex-direction: column; justify-content: flex-end;">
                <span style="font-size: 13px; color: #1d1d1f; margin-bottom: 10px; font-weight: 500; display: block;">數量</span>
                <span style="font-size: 14px; color: ${quantity ? '#1d1d1f' : 'transparent'}; font-weight: 400; height: 24px; padding: 2px 0; border-bottom: 1.5px solid #d2d2d7; min-width: 100px; display: block; line-height: 20px; box-sizing: border-box;">${quantity || ''}</span>
              </div>
              <div style="margin-bottom: 0; flex-shrink: 0; display: flex; flex-direction: column; justify-content: flex-end;">
                <span style="font-size: 13px; color: #1d1d1f; margin-bottom: 10px; font-weight: 500; display: block;">P</span>
                <span style="font-size: 14px; color: ${pageNumber ? '#1d1d1f' : 'transparent'}; font-weight: 400; height: 24px; padding: 2px 0; border-bottom: 1.5px solid #d2d2d7; min-width: 100px; display: block; line-height: 20px; box-sizing: border-box;">${pageNumber || ''}</span>
              </div>
            </div>
          </div>
          
          <table style="width: 100%; border: 1px solid #e5e5e7; border-collapse: collapse; margin-top: 0; border-radius: 8px; overflow: hidden; background: white; flex: 1; min-height: 0;">
            <thead>
              <tr>
                <th style="width: 6%; border: 1px solid #e5e5e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center;">No.</th>
                <th style="width: 11%; border: 1px solid #e5e5e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center;">Part Code</th>
                <th style="width: 17%; border: 1px solid #e5e5e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center;">中文</th>
                <th style="width: 17%; border: 1px solid #e5e5e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center;">英文</th>
                <th style="width: 16%; border: 1px solid #e5e5e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center;">規格</th>
                <th style="width: 12%; border: 1px solid #e5e5e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center;">零件位置</th>
                <th style="width: 7%; border: 1px solid #e5e5e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center;">Q'ty</th>
                <th style="width: 14%; border: 1px solid #e5e5e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center;">備註</th>
              </tr>
            </thead>
            <tbody>
              ${Array.from({ length: rows }, (_, i) => `
                <tr style="background: ${i % 2 === 0 ? 'white' : '#fafafa'};">
                  <td style="width: 6%; border: 1px solid #e5e5e7; padding: 6px 10px; font-size: 11px; vertical-align: middle; color: #1d1d1f; font-weight: 500; text-align: center; height: 28px;">${i + 1}</td>
                  <td style="width: 11%; border: 1px solid #e5e5e7; padding: 6px 10px; font-size: 11px; vertical-align: middle; color: #515154; text-align: left; height: 28px;"></td>
                  <td style="width: 17%; border: 1px solid #e5e5e7; padding: 6px 10px; font-size: 11px; vertical-align: middle; color: #515154; text-align: left; height: 28px;"></td>
                  <td style="width: 17%; border: 1px solid #e5e5e7; padding: 6px 10px; font-size: 11px; vertical-align: middle; color: #515154; text-align: left; height: 28px;"></td>
                  <td style="width: 16%; border: 1px solid #e5e5e7; padding: 6px 10px; font-size: 11px; vertical-align: middle; color: #515154; text-align: left; height: 28px;"></td>
                  <td style="width: 12%; border: 1px solid #e5e5e7; padding: 6px 10px; font-size: 11px; vertical-align: middle; color: #515154; text-align: left; height: 28px;"></td>
                  <td style="width: 7%; border: 1px solid #e5e5e7; padding: 6px 10px; font-size: 11px; vertical-align: middle; color: #515154; text-align: center; height: 28px;"></td>
                  <td style="width: 14%; border: 1px solid #e5e5e7; padding: 6px 10px; font-size: 11px; vertical-align: middle; color: #515154; text-align: left; height: 28px;"></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  }

  // 列印表格
  const handlePrint = () => {
    const htmlContent = createTableHTML()
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('無法開啟新視窗，請允許彈出視窗')
      return
    }
    
    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    // 等待內容載入後列印
    printWindow.onload = () => {
      setTimeout(() => {
        // 確保使用橫向模式
        const style = printWindow.document.createElement('style')
        style.textContent = `
          @media print {
            @page {
              size: A4 landscape !important;
              margin: 0 !important;
            }
            body {
              width: 297mm !important;
              height: 210mm !important;
            }
          }
        `
        printWindow.document.head.appendChild(style)
        printWindow.print()
      }, 500)
    }
    
    // 如果 onload 沒有觸發，也嘗試列印
    setTimeout(() => {
      if (printWindow.document.readyState === 'complete') {
        // 確保使用橫向模式
        const style = printWindow.document.createElement('style')
        style.textContent = `
          @media print {
            @page {
              size: A4 landscape !important;
              margin: 0 !important;
            }
            body {
              width: 297mm !important;
              height: 210mm !important;
            }
          }
        `
        printWindow.document.head.appendChild(style)
        printWindow.print()
      }
    }, 1000)
  }

  // 預覽表格
  const handlePreview = () => {
    const htmlContent = createTableHTML()
    const previewWindow = window.open('', '_blank')
    if (!previewWindow) {
      alert('無法開啟新視窗，請允許彈出視窗')
      return
    }
    
    previewWindow.document.open()
    previewWindow.document.write(htmlContent)
    previewWindow.document.close()
  }

  // 匯出為 PDF
  const handleExportPDF = async () => {
    try {
      // 先檢查模組是否可用
      let html2pdf
      try {
        html2pdf = (await import('html2pdf.js')).default
      } catch (importError) {
        console.error('html2pdf.js 載入失敗:', importError)
        alert('PDF 匯出功能暫時無法使用，請重新整理頁面後再試')
        return
      }

      const htmlContent = createTableContentHTML()
      
      // 創建臨時容器
      const tempContainer = document.createElement('div')
      tempContainer.innerHTML = htmlContent
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '0'
      tempContainer.style.width = '1123px'
      tempContainer.style.height = '794px'
      tempContainer.style.overflow = 'visible'
      tempContainer.style.backgroundColor = '#fafafa'
      document.body.appendChild(tempContainer)
      
      // 獲取要渲染的元素
      const elementToRender = tempContainer.firstElementChild
      
      if (!elementToRender) {
        throw new Error('無法找到要渲染的元素')
      }
      
      // 等待渲染完成
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 確保元素可見（html2pdf 需要元素在視圖中）
      const originalLeft = tempContainer.style.left
      tempContainer.style.left = '0'
      tempContainer.style.top = '0'
      tempContainer.style.zIndex = '9999'
      
      try {
        // 設定 PDF 選項（A4 橫向）
        const opt = {
          margin: 0,
          filename: `個人表格_${year && month && day ? `${year}_${month}_${day}` : '未填寫日期'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2,
            useCORS: true,
            backgroundColor: '#fafafa',
            width: 1123,
            height: 794,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 1123,
            windowHeight: 794
          },
          jsPDF: { 
            unit: 'mm', 
            format: [297, 210], // A4 橫向 (landscape)
            orientation: 'landscape'
          }
        }
        
        // 生成 PDF
        await html2pdf().set(opt).from(elementToRender).save()
        
        // 恢復原始位置
        tempContainer.style.left = originalLeft
        
        // 移除臨時容器
        setTimeout(() => {
          if (tempContainer.parentNode) {
            document.body.removeChild(tempContainer)
          }
        }, 1000)
      } catch (renderError) {
        // 恢復原始位置
        tempContainer.style.left = originalLeft
        // 移除臨時容器
        if (tempContainer.parentNode) {
          document.body.removeChild(tempContainer)
        }
        throw renderError
      }
    } catch (error) {
      console.error('匯出 PDF 失敗:', error)
      alert(`匯出 PDF 失敗：${error.message}`)
    }
  }

  // 匯出為 PNG
  const handleExportPNG = async () => {
    try {
      // 先檢查模組是否可用
      let html2canvas
      try {
        html2canvas = (await import('html2canvas')).default
      } catch (importError) {
        console.error('html2canvas 載入失敗:', importError)
        alert('匯出功能暫時無法使用，請重新整理頁面後再試')
        return
      }

      const htmlContent = createTableContentHTML()
      
      // 創建臨時容器
      const tempContainer = document.createElement('div')
      tempContainer.innerHTML = htmlContent
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '0'
      tempContainer.style.width = '1123px'
      tempContainer.style.height = '794px'
      tempContainer.style.overflow = 'visible'
      tempContainer.style.backgroundColor = '#fafafa'
      document.body.appendChild(tempContainer)
      
      // 獲取要渲染的元素
      const elementToRender = tempContainer.firstElementChild
      
      if (!elementToRender) {
        throw new Error('無法找到要渲染的元素')
      }
      
      // 等待渲染完成
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 確保元素可見（html2canvas 需要元素在視圖中）
      const originalLeft = tempContainer.style.left
      tempContainer.style.left = '0'
      tempContainer.style.top = '0'
      tempContainer.style.zIndex = '9999'
      
      try {
        const canvas = await html2canvas(elementToRender, {
          backgroundColor: '#fafafa',
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          width: 1123,
          height: 794,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1123,
          windowHeight: 794
        })
        
        // 恢復原始位置
        tempContainer.style.left = originalLeft
        
        // 移除臨時容器
        document.body.removeChild(tempContainer)
        
        // 檢查canvas是否有效
        if (!canvas || canvas.width === 0 || canvas.height === 0) {
          throw new Error('Canvas 渲染失敗：寬度或高度為 0')
        }
        
        // 創建下載連結
        const link = document.createElement('a')
        const dateStr = year && month && day ? `${year}_${month}_${day}` : '未填寫日期'
        link.download = `個人表格_${dateStr}.png`
        link.href = canvas.toDataURL('image/png', 1.0)
        link.click()
      } catch (renderError) {
        // 恢復原始位置
        tempContainer.style.left = originalLeft
        // 移除臨時容器
        document.body.removeChild(tempContainer)
        throw renderError
      }
    } catch (error) {
      console.error('匯出 PNG 失敗:', error)
      alert(`匯出 PNG 失敗：${error.message}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* 設定區域 */}
      <div className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold text-primary mb-6">表格設定</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClassName}>機種</label>
            <input
              type="text"
              value={machineType}
              onChange={(e) => setMachineType(e.target.value)}
              placeholder="留空可手寫"
              className={inputClassName}
            />
          </div>
          
          <div>
            <label className={labelClassName}>數量</label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="留空可手寫"
              className={inputClassName}
            />
          </div>
          
          <div>
            <label className={labelClassName}>頁碼 (P)</label>
            <input
              type="text"
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              placeholder="留空可手寫"
              className={inputClassName}
            />
          </div>
          
          <div>
            <label className={labelClassName}>表格行數</label>
            <input
              type="number"
              value={rows}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 20
                setRows(Math.max(1, Math.min(50, value)))
              }}
              min="1"
              max="50"
              className={inputClassName}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClassName}>年份</label>
            <input
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="例如：2024"
              maxLength="4"
              className={inputClassName}
            />
          </div>
          
          <div>
            <label className={labelClassName}>月份</label>
            <input
              type="text"
              value={month}
              onChange={(e) => setMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder="例如：01"
              maxLength="2"
              className={inputClassName}
            />
          </div>
          
          <div>
            <label className={labelClassName}>日期</label>
            <input
              type="text"
              value={day}
              onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder="例如：15"
              maxLength="2"
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handlePreview}
          className="flex-1 min-w-[140px] px-6 py-3 bg-surface/40 border border-white/10 text-primary rounded-lg hover:bg-surface/60 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          預覽表格
        </button>
        
        <button
          onClick={handlePrint}
          className="flex-1 min-w-[140px] px-6 py-3 bg-primary/20 border border-primary/30 text-primary rounded-lg hover:bg-primary/30 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <PrinterIcon className="w-5 h-5" />
          列印表格
        </button>
        
        <button
          onClick={handleExportPDF}
          className="flex-1 min-w-[140px] px-6 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <DocumentArrowDownIcon className="w-5 h-5" />
          匯出 PDF
        </button>
        
        <button
          onClick={handleExportPNG}
          className="flex-1 min-w-[140px] px-6 py-3 bg-primary/20 border border-primary/30 text-primary rounded-lg hover:bg-primary/30 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          匯出 PNG
        </button>
      </div>

    </div>
  )
}

export default PersonalTableGenerator
