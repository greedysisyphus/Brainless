// ==UserScript==
// @name         WordPress 航班 API 分析工具
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  自動分析 yuann.tw 網站的航班 API，提取 JSON-LD 資料並監控 admin-ajax.php 請求（帶 UI 面板）
// @author       You
// @match        https://yuann.tw/*
// @match        http://yuann.tw/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';
  
  // 等待頁面載入完成
  const init = () => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runAnalyzer);
    } else {
      runAnalyzer();
    }
  };
  
  // ============================================
  // UI 面板創建和管理
  // ============================================
  const createUIPanel = () => {
    // 如果面板已存在，先移除
    const existingPanel = document.getElementById('api-analyzer-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    const panel = document.createElement('div');
    panel.id = 'api-analyzer-panel';
    panel.innerHTML = `
      <style>
        #api-analyzer-panel {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 450px;
          max-height: 80vh;
          background: #1a1a1a;
          border: 2px solid #4a9eff;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          color: #e0e0e0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        #api-analyzer-panel.collapsed {
          height: auto;
        }
        #api-analyzer-panel .panel-header {
          background: linear-gradient(135deg, #4a9eff 0%, #357abd 100%);
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: move;
          user-select: none;
        }
        #api-analyzer-panel .panel-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: white;
        }
        #api-analyzer-panel .panel-controls {
          display: flex;
          gap: 8px;
        }
        #api-analyzer-panel .panel-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          transition: background 0.2s;
        }
        #api-analyzer-panel .panel-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        #api-analyzer-panel .panel-btn.copy-btn {
          width: auto;
          padding: 0 10px;
          font-size: 11px;
        }
        #api-analyzer-panel .panel-btn.copy-btn.copied {
          background: #4caf50;
          color: white;
        }
        #api-analyzer-panel .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: #1a1a1a;
        }
        #api-analyzer-panel.collapsed .panel-content {
          display: none;
        }
        #api-analyzer-panel .section {
          margin-bottom: 20px;
        }
        #api-analyzer-panel .section-title {
          font-size: 13px;
          font-weight: 600;
          color: #4a9eff;
          margin-bottom: 10px;
          padding-bottom: 6px;
          border-bottom: 1px solid #333;
        }
        #api-analyzer-panel .data-item {
          background: #252525;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 8px;
          word-break: break-all;
        }
        #api-analyzer-panel .data-label {
          font-size: 11px;
          color: #888;
          margin-bottom: 4px;
        }
        #api-analyzer-panel .data-value {
          font-size: 12px;
          color: #e0e0e0;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          white-space: pre-wrap;
          max-height: 200px;
          overflow-y: auto;
        }
        #api-analyzer-panel .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          margin-left: 8px;
        }
        #api-analyzer-panel .status-success {
          background: #4caf50;
          color: white;
        }
        #api-analyzer-panel .status-error {
          background: #f44336;
          color: white;
        }
        #api-analyzer-panel .status-warning {
          background: #ff9800;
          color: white;
        }
        #api-analyzer-panel .empty-state {
          text-align: center;
          padding: 20px;
          color: #888;
          font-size: 12px;
        }
        #api-analyzer-panel .json-viewer {
          background: #1e1e1e;
          border: 1px solid #333;
          border-radius: 4px;
          padding: 8px;
          max-height: 300px;
          overflow-y: auto;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-size: 11px;
          line-height: 1.4;
        }
        #api-analyzer-panel .request-item {
          background: #252525;
          border-left: 3px solid #4a9eff;
          border-radius: 4px;
          padding: 10px;
          margin-bottom: 10px;
        }
        #api-analyzer-panel .request-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        #api-analyzer-panel .request-type {
          font-size: 11px;
          color: #4a9eff;
          font-weight: 600;
        }
        #api-analyzer-panel .request-url {
          font-size: 11px;
          color: #888;
          word-break: break-all;
        }
      </style>
      <div class="panel-header">
        <h3>🔍 API 分析工具</h3>
        <div class="panel-controls">
          <button class="panel-btn copy-btn" id="copy-data" title="複製所有資料">📋 Copy</button>
          <button class="panel-btn" id="toggle-panel" title="摺疊/展開">−</button>
          <button class="panel-btn" id="close-panel" title="關閉">×</button>
        </div>
      </div>
      <div class="panel-content">
        <div class="section" id="jsonld-section">
          <div class="section-title">JSON-LD 航班資料</div>
          <div id="jsonld-content" class="empty-state">載入中...</div>
        </div>
        <div class="section" id="requests-section">
          <div class="section-title">攔截的航班 API 請求 <span id="request-count">(0)</span></div>
          <div id="requests-content" class="empty-state">等待請求...</div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // 拖曳功能
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    const header = panel.querySelector('.panel-header');
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.panel-controls')) return;
      isDragging = true;
      initialX = e.clientX - panel.offsetLeft;
      initialY = e.clientY - panel.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      panel.style.left = currentX + 'px';
      panel.style.top = currentY + 'px';
      panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // 摺疊/展開
    panel.querySelector('#toggle-panel').addEventListener('click', () => {
      panel.classList.toggle('collapsed');
      panel.querySelector('#toggle-panel').textContent = 
        panel.classList.contains('collapsed') ? '+' : '−';
    });

    // 關閉
    panel.querySelector('#close-panel').addEventListener('click', () => {
      panel.remove();
    });

    // 複製資料
    panel.querySelector('#copy-data').addEventListener('click', async () => {
      const copyBtn = panel.querySelector('#copy-data');
      const originalText = copyBtn.textContent;
      
      try {
        // 收集所有資料
        let report = '='.repeat(60) + '\n';
        report += 'API 分析報告\n';
        report += '='.repeat(60) + '\n\n';
        report += `生成時間: ${new Date().toLocaleString('zh-TW')}\n`;
        report += `網址: ${window.location.href}\n\n`;
        
        // JSON-LD 和 HTML 資料
        report += '─'.repeat(60) + '\n';
        report += 'JSON-LD 和 HTML 航班資料\n';
        report += '─'.repeat(60) + '\n\n';
        
        if (window._jsonLdFlightData && window._jsonLdFlightData.length > 0) {
          window._jsonLdFlightData.forEach((item, index) => {
            report += `[資料來源 ${index + 1}: ${item.source || 'unknown'}]\n`;
            report += `索引: ${item.scriptIndex}\n`;
            
            if (item.data && item.data.type === 'table') {
              // HTML 表格資料
              report += `類型: HTML 表格\n`;
              report += `表格資訊: ${JSON.stringify(item.data.info, null, 2)}\n`;
              report += `表頭: ${JSON.stringify(item.data.headers, null, 2)}\n`;
              report += `資料行數: ${item.data.rows.length}\n`;
              report += `資料內容:\n`;
              
              // 以表格格式輸出
              if (item.data.headers && item.data.headers.length > 0) {
                report += item.data.headers.join(' | ') + '\n';
                report += '-'.repeat(item.data.headers.join(' | ').length) + '\n';
              }
              
              item.data.rows.forEach((row, rowIndex) => {
                report += row.join(' | ') + '\n';
              });
              
              report += `\nHTML 預覽（前 2000 字）:\n${item.data.html.substring(0, 2000)}\n`;
            } else if (item.data && item.data.type === 'structured-container') {
              // 結構化容器資料
              report += `類型: 結構化容器\n`;
              report += `ID: ${item.data.id || 'N/A'}\n`;
              report += `Class: ${item.data.className || 'N/A'}\n`;
              report += `文字內容（前 1000 字）:\n${item.data.text.substring(0, 1000)}\n`;
              report += `HTML 預覽（前 2000 字）:\n${item.data.html.substring(0, 2000)}\n`;
            } else {
              // 標準 JSON 資料
              report += `類型: JSON\n`;
              report += JSON.stringify(item.data, null, 2);
            }
            
            report += '\n' + '─'.repeat(60) + '\n\n';
          });
        } else {
          report += '⚠️ 未找到 JSON-LD 或 HTML 表格資料\n\n';
        }
        
        // 攔截的請求
        report += '─'.repeat(60) + '\n';
        report += '攔截的航班 API 請求\n';
        report += '─'.repeat(60) + '\n\n';
        
        if (window._interceptedAjaxRequests && window._interceptedAjaxRequests.length > 0) {
          window._interceptedAjaxRequests.forEach((req, index) => {
            report += `[請求 ${index + 1}]\n`;
            report += `類型: ${req.type}\n`;
            report += `URL: ${req.request.url}\n`;
            report += `方法: ${req.request.method || 'N/A'}\n`;
            
            if (req.request.action && req.request.action !== 'N/A') {
              report += `Action: ${req.request.action}\n`;
            }
            
            const status = req.response?.status || req.error?.status || 'N/A';
            report += `狀態碼: ${status}\n`;
            
            if (req.response) {
              report += `回應資料:\n`;
              if (req.response.data) {
                report += JSON.stringify(req.response.data, null, 2);
              } else if (req.response.text) {
                report += req.response.text;
              }
              report += '\n';
            } else if (req.error) {
              report += `錯誤資訊:\n`;
              report += `狀態: ${req.error.status} ${req.error.statusText || ''}\n`;
              report += `錯誤: ${req.error.error || 'N/A'}\n`;
              if (req.error.responseText) {
                report += `回應內容: ${req.error.responseText.substring(0, 500)}\n`;
              }
            }
            
            report += `時間戳記: ${req.timestamp}\n`;
            report += '\n' + '─'.repeat(60) + '\n\n';
          });
        } else {
          report += '⚠️ 尚未攔截到任何請求\n\n';
        }
        
        report += '='.repeat(60) + '\n';
        report += '報告結束\n';
        report += '='.repeat(60) + '\n';
        
        // 複製到剪貼板
        await navigator.clipboard.writeText(report);
        
        // 顯示成功反饋
        copyBtn.textContent = '✓ 已複製';
        copyBtn.classList.add('copied');
        
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.classList.remove('copied');
        }, 2000);
        
      } catch (err) {
        console.error('複製失敗:', err);
        copyBtn.textContent = '✗ 失敗';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      }
    });

    return panel;
  };

  const updateUIPanel = () => {
    let panel = document.getElementById('api-analyzer-panel');
    if (!panel) {
      panel = createUIPanel();
    }

    // 更新 JSON-LD 資料（包含 HTML 表格資料）
    const jsonldContent = panel.querySelector('#jsonld-content');
    if (window._jsonLdFlightData && window._jsonLdFlightData.length > 0) {
      jsonldContent.innerHTML = window._jsonLdFlightData.map((item, index) => {
        // 如果是 HTML 表格資料，特殊處理
        if (item.data && item.data.type === 'table') {
          const tableInfo = item.data.info || {};
          const headers = item.data.headers || [];
          const rows = item.data.rows || [];
          const rowCount = item.data.rowCount || 0;
          
          return `
            <div class="data-item">
              <div class="data-label">
                📊 表格 ${item.scriptIndex} 
                <span style="color: #888; font-size: 10px;">
                  (${rowCount} 行, ${tableInfo.columnCount || 0} 列)
                </span>
              </div>
              ${headers.length > 0 ? `
                <div style="margin: 8px 0; padding: 8px; background: #2a2a2a; border-radius: 4px;">
                  <div style="font-size: 11px; color: #4a9eff; margin-bottom: 4px;">表頭：</div>
                  <div style="font-size: 11px; color: #e0e0e0;">${escapeHtml(headers.join(' | '))}</div>
                </div>
              ` : ''}
              ${rows.length > 0 ? `
                <div style="margin: 8px 0; padding: 8px; background: #2a2a2a; border-radius: 4px; max-height: 200px; overflow-y: auto;">
                  <div style="font-size: 11px; color: #4a9eff; margin-bottom: 4px;">資料預覽（前 10 行）：</div>
                  ${rows.slice(0, 10).map((row, rowIndex) => `
                    <div style="font-size: 11px; color: #e0e0e0; margin: 2px 0; padding: 4px; background: #1e1e1e; border-radius: 2px;">
                      ${escapeHtml(row.join(' | '))}
                    </div>
                  `).join('')}
                  ${rows.length > 10 ? `<div style="font-size: 10px; color: #888; margin-top: 4px;">... 還有 ${rows.length - 10} 行資料</div>` : ''}
                </div>
              ` : ''}
              <div style="margin-top: 8px; font-size: 10px; color: #888;">
                來源: ${item.source || 'unknown'} | 
                ID: ${tableInfo.id || 'N/A'} | 
                Class: ${tableInfo.className || 'N/A'}
              </div>
            </div>
          `;
        } else if (item.data && item.data.type === 'structured-container') {
          // 結構化容器資料
          return `
            <div class="data-item">
              <div class="data-label">📦 容器 ${item.scriptIndex}</div>
              <div style="margin: 8px 0; padding: 8px; background: #2a2a2a; border-radius: 4px;">
                <div style="font-size: 11px; color: #4a9eff; margin-bottom: 4px;">資訊：</div>
                <div style="font-size: 11px; color: #e0e0e0;">
                  ID: ${item.data.id || 'N/A'}<br>
                  Class: ${item.data.className || 'N/A'}<br>
                  文字預覽: ${escapeHtml(item.data.text.substring(0, 300))}...
                </div>
              </div>
              <div style="margin-top: 8px; font-size: 10px; color: #888;">
                來源: ${item.source || 'unknown'}
              </div>
            </div>
          `;
        } else {
          // 標準 JSON-LD 資料
          const dataStr = JSON.stringify(item.data, null, 2);
          return `
            <div class="data-item">
              <div class="data-label">Script ${item.scriptIndex}</div>
              <div class="json-viewer">${escapeHtml(dataStr)}</div>
            </div>
          `;
        }
      }).join('');
    } else {
      jsonldContent.innerHTML = '<div class="empty-state">⚠️ 未找到 JSON-LD 或 HTML 表格資料</div>';
    }

    // 更新請求列表
    const requestsContent = panel.querySelector('#requests-content');
    const requestCount = panel.querySelector('#request-count');
    if (window._interceptedAjaxRequests && window._interceptedAjaxRequests.length > 0) {
      requestCount.textContent = `(${window._interceptedAjaxRequests.length})`;
      requestsContent.innerHTML = window._interceptedAjaxRequests.map((req, index) => {
        const status = req.response?.status || req.error?.status || 'N/A';
        const statusClass = status >= 200 && status < 300 ? 'status-success' : 
                           status >= 400 ? 'status-error' : 'status-warning';
        const statusText = status >= 200 && status < 300 ? '成功' : 
                          status >= 400 ? '錯誤' : '未知';
        
        const dataPreview = req.response?.data ? 
          JSON.stringify(req.response.data, null, 2).substring(0, 500) : 
          req.response?.text?.substring(0, 500) || 
          req.error?.responseText?.substring(0, 500) || 
          '無資料';
        
        return `
          <div class="request-item">
            <div class="request-header">
              <span class="request-type">${req.type}</span>
              <span class="status-badge ${statusClass}">${status} ${statusText}</span>
            </div>
            <div class="request-url">${escapeHtml(req.request.url)}</div>
            ${req.request.action && req.request.action !== 'N/A' ? 
              `<div class="data-label">Action: ${escapeHtml(req.request.action)}</div>` : ''}
            <div class="data-value">${escapeHtml(dataPreview)}${dataPreview.length >= 500 ? '...' : ''}</div>
          </div>
        `;
      }).join('');
    } else {
      requestCount.textContent = '(0)';
      requestsContent.innerHTML = '<div class="empty-state">等待請求...</div>';
    }
  };

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const runAnalyzer = () => {
    // 防止重複執行
    if (window._enhancedApiAnalyzerRunning) {
      console.log('⚠️ 腳本已在運行中');
      return;
    }
    window._enhancedApiAnalyzerRunning = true;
    
    console.log('🔍 [Tampermonkey] WordPress 航班 API 分析工具啟動...\n');
    
    // 創建 UI 面板
    setTimeout(() => {
      createUIPanel();
      updateUIPanel();
    }, 500);
    
    // ============================================
    // 1. 提取 JSON-LD 格式的航班資料
    // ============================================
    console.log('📋 步驟 1: 提取 JSON-LD 航班資料...\n');
    
    const extractJsonLdData = () => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"], script');
      const flightData = [];
      
      scripts.forEach((script, index) => {
        if (!script.textContent) return;
        
        const content = script.textContent.trim();
        
        // 檢查是否為 JSON-LD 格式
        if (script.type === 'application/ld+json' || 
            content.startsWith('{') || 
            content.startsWith('[')) {
          try {
            const data = JSON.parse(content);
            
            // 檢查是否包含 schema.org 格式
            if (data['@context'] === 'https://schema.org' || 
                data['@context']?.includes('schema.org')) {
              console.log(`✅ 找到 JSON-LD 資料 (Script ${index + 1}):`, {
                context: data['@context'],
                type: data['@type'] || data['@graph']?.[0]?.['@type'],
                graphLength: data['@graph']?.length || 'N/A',
                data: data
              });
              flightData.push({ scriptIndex: index + 1, data });
            }
            
            // 檢查是否包含航班相關關鍵字
            const dataStr = JSON.stringify(data).toLowerCase();
            if ((dataStr.includes('flight') || 
                 dataStr.includes('gate') || 
                 dataStr.includes('departure') ||
                 dataStr.includes('d11') ||
                 dataStr.includes('d18') ||
                 dataStr.includes('airport')) &&
                !flightData.some(fd => fd.scriptIndex === index + 1)) {
              console.log(`✅ 找到航班相關資料 (Script ${index + 1}):`, data);
              flightData.push({ scriptIndex: index + 1, data });
            }
          } catch (e) {
            // 不是有效的 JSON
          }
        }
      });
      
      return flightData;
    };
    
    // 延遲提取，確保所有 script 標籤都已載入
    setTimeout(() => {
      const jsonLdData = extractJsonLdData();
      if (jsonLdData.length === 0) {
        console.log('⚠️ 未找到 JSON-LD 格式的航班資料');
      }
      
      // 保存到全域變數
      window._jsonLdFlightData = jsonLdData;
      
      // 搜尋頁面中直接嵌入的航班資料
      const embeddedFlightData = searchEmbeddedFlightData();
      if (embeddedFlightData.length > 0) {
        console.log('✅ 找到頁面中嵌入的航班資料:', embeddedFlightData);
        window._jsonLdFlightData = window._jsonLdFlightData.concat(embeddedFlightData);
      }
      
      // 更新 UI 面板
      updateUIPanel();
    }, 1000);
    
    // 搜尋頁面中直接嵌入的航班資料
    const searchEmbeddedFlightData = () => {
      const flightData = [];
      const keywords = ['flight', 'gate', 'departure', 'd11', 'd12', 'd13', 'd14', 'd15', 'd16', 'd17', 'd18', 'airport', 'taoyuan'];
      
      // 1. 搜尋所有 script 標籤中的航班資料
      const scripts = document.querySelectorAll('script');
      scripts.forEach((script, index) => {
        if (!script.textContent) return;
        const content = script.textContent;
        const contentLower = content.toLowerCase();
        
        // 檢查是否包含航班關鍵字
        if (keywords.some(kw => contentLower.includes(kw))) {
          // 嘗試提取 JSON 資料
          try {
            // 搜尋 JSON 物件
            const jsonMatches = content.match(/\{[\s\S]*?\}/g);
            if (jsonMatches) {
              jsonMatches.forEach(match => {
                try {
                  const data = JSON.parse(match);
                  const dataStr = JSON.stringify(data).toLowerCase();
                  if (keywords.some(kw => dataStr.includes(kw))) {
                    console.log(`✅ Script ${index + 1} 找到航班相關 JSON:`, data);
                    flightData.push({ scriptIndex: index + 1, data, source: 'embedded-script' });
                  }
                } catch (e) {
                  // 不是有效的 JSON
                }
              });
            }
            
            // 搜尋變數賦值（如 var flights = [...], const data = {...}）
            const varPatterns = [
              /(?:var|let|const)\s+(\w*flight\w*|\w*gate\w*|\w*data\w*)\s*=\s*(\{[\s\S]*?\}|\[[\s\S]*?\])/gi,
              /window\.(\w*flight\w*|\w*gate\w*)\s*=\s*(\{[\s\S]*?\}|\[[\s\S]*?\])/gi
            ];
            
            varPatterns.forEach(pattern => {
              const matches = content.matchAll(pattern);
              for (const match of matches) {
                try {
                  const data = JSON.parse(match[2]);
                  const dataStr = JSON.stringify(data).toLowerCase();
                  if (keywords.some(kw => dataStr.includes(kw))) {
                    console.log(`✅ Script ${index + 1} 找到航班變數 ${match[1]}:`, data);
                    flightData.push({ scriptIndex: index + 1, data, source: 'embedded-variable', variableName: match[1] });
                  }
                } catch (e) {
                  // 不是有效的 JSON
                }
              }
            });
          } catch (e) {
            // 解析失敗
          }
        }
      });
      
      // 2. 搜尋 data-* 屬性中的航班資料
      const dataElements = document.querySelectorAll('[data-flight], [data-gate], [data-departure], [data-api]');
      dataElements.forEach((el, index) => {
        const attrs = {};
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('data-')) {
            attrs[attr.name] = attr.value;
          }
        });
        
        // 嘗試解析 JSON
        Object.keys(attrs).forEach(key => {
          try {
            const data = JSON.parse(attrs[key]);
            const dataStr = JSON.stringify(data).toLowerCase();
            if (keywords.some(kw => dataStr.includes(kw))) {
              console.log(`✅ 元素找到航班資料屬性 ${key}:`, data);
              flightData.push({ scriptIndex: `element-${index}`, data, source: 'data-attribute', attribute: key });
            }
          } catch (e) {
            // 不是 JSON
          }
        });
      });
      
      // 3. 搜尋 window 物件中的航班相關變數
      const windowKeys = Object.keys(window).filter(key => 
        keywords.some(kw => key.toLowerCase().includes(kw))
      );
      
      windowKeys.forEach(key => {
        try {
          const value = window[key];
          if (typeof value === 'object' && value !== null) {
            const valueStr = JSON.stringify(value).toLowerCase();
            if (keywords.some(kw => valueStr.includes(kw))) {
              console.log(`✅ window.${key} 包含航班資料:`, value);
              flightData.push({ scriptIndex: 'window', data: value, source: 'window-object', variableName: key });
            }
          }
        } catch (e) {
          // 無法存取
        }
      });
      
      // 4. 搜尋 HTML 表格中的航班資料（增強版）
      const tables = document.querySelectorAll('table');
      tables.forEach((table, index) => {
        const tableText = table.textContent.toLowerCase();
        // 更寬鬆的匹配條件：只要包含任何航班相關關鍵字就提取
        if (keywords.some(kw => tableText.includes(kw)) || 
            tableText.includes('航班') || 
            tableText.includes('登機門') ||
            tableText.includes('出發') ||
            tableText.includes('到達') ||
            /D1[1-8]/.test(tableText) ||
            /[A-Z]{2}\d{3,4}/.test(tableText)) {
          // 提取表格資料
          const rows = Array.from(table.querySelectorAll('tr'));
          const tableData = rows.map(row => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            return cells.map(cell => cell.textContent.trim());
          });
          
          // 提取表格的完整 HTML（用於分析結構）
          const tableHtml = table.outerHTML;
          
          // 提取表格的 class 和 id（可能有助於識別）
          const tableInfo = {
            id: table.id || 'N/A',
            className: table.className || 'N/A',
            rowCount: rows.length,
            columnCount: rows[0] ? rows[0].querySelectorAll('td, th').length : 0
          };
          
          console.log(`✅ 表格 ${index + 1} 包含航班資料:`, {
            info: tableInfo,
            data: tableData,
            preview: tableData.slice(0, 5) // 只顯示前 5 行作為預覽
          });
          
          flightData.push({ 
            scriptIndex: `table-${index + 1}`, 
            data: { 
              type: 'table',
              info: tableInfo,
              headers: tableData[0] || [],
              rows: tableData.slice(1),
              rowCount: tableData.length,
              html: tableHtml.substring(0, 5000), // 增加 HTML 長度限制
              fullHtml: tableHtml // 完整 HTML（用於深度分析）
            }, 
            source: 'html-table' 
          });
        }
      });
      
      // 4.1 如果沒有找到表格，檢查是否有其他結構化資料容器
      if (tables.length === 0 || flightData.filter(fd => fd.source === 'html-table').length === 0) {
        // 檢查 div 中的結構化資料（可能是自定義的表格結構）
        const dataContainers = document.querySelectorAll('div[class*="table"], div[class*="list"], div[class*="flight"], div[class*="gate"]');
        dataContainers.forEach((container, index) => {
          const containerText = container.textContent.toLowerCase();
          if (keywords.some(kw => containerText.includes(kw)) || 
              /D1[1-8]/.test(containerText) ||
              /[A-Z]{2}\d{3,4}/.test(containerText)) {
            console.log(`✅ 找到結構化資料容器 ${index + 1}:`, {
              className: container.className,
              id: container.id,
              textPreview: container.textContent.substring(0, 500),
              htmlPreview: container.outerHTML.substring(0, 1000)
            });
            
            flightData.push({
              scriptIndex: `container-${index + 1}`,
              data: {
                type: 'structured-container',
                className: container.className,
                id: container.id,
                text: container.textContent,
                html: container.outerHTML.substring(0, 10000)
              },
              source: 'html-container'
            });
          }
        });
      }
      
      // 5. 搜尋包含航班關鍵字的 div 或其他元素
      const flightElements = document.querySelectorAll('div, span, p, li');
      const foundElements = [];
      flightElements.forEach((el, index) => {
        if (foundElements.length >= 10) return; // 限制數量
        const text = el.textContent.toLowerCase();
        if (keywords.some(kw => text.includes(kw)) && text.length < 500) {
          // 檢查是否包含航班號碼格式（如 CI123, BR456, D11, D18）
          const hasFlightPattern = /[A-Z]{2}\d{3,4}|D1[1-8]|登機門|航班|出發/.test(el.textContent);
          if (hasFlightPattern) {
            foundElements.push({
              tag: el.tagName,
              text: el.textContent.trim().substring(0, 200),
              html: el.outerHTML.substring(0, 500)
            });
          }
        }
      });
      
      if (foundElements.length > 0) {
        console.log(`✅ 找到 ${foundElements.length} 個包含航班資料的元素`);
        flightData.push({
          scriptIndex: 'html-elements',
          data: { type: 'html-elements', elements: foundElements },
          source: 'html-content'
        });
      }
      
      return flightData;
    };
    
    // ============================================
    // 2. 詳細攔截所有可能的航班 API 請求
    // ============================================
    console.log('\n📋 步驟 2: 設置航班 API 請求攔截...\n');
    
    // 檢查 URL 是否與航班相關
    const isFlightRelated = (url) => {
      const urlLower = url.toLowerCase();
      const keywords = ['admin-ajax', 'flight', 'gate', 'departure', 'd11', 'd12', 'd13', 'd14', 'd15', 'd16', 'd17', 'd18', 'airport', 'taoyuan', 'api', 'wp-json'];
      return keywords.some(keyword => urlLower.includes(keyword));
    };
    
    // 攔截 jQuery AJAX（WordPress 常用）
    const interceptJQueryAjax = () => {
      if (window.jQuery) {
        const originalAjax = window.jQuery.ajax;
        window.jQuery.ajax = function(options) {
          const url = options.url || '';
          
          if (isFlightRelated(url)) {
            const requestInfo = {
              url: url,
              method: options.type || 'GET',
              data: options.data,
              action: options.data?.action || (typeof options.data === 'string' ? 
                new URLSearchParams(options.data).get('action') : 'N/A'),
              headers: options.headers || {},
              dataType: options.dataType || 'json'
            };
            
            console.log('📡 [jQuery AJAX]', requestInfo);
            
            // 攔截成功回應
            const originalSuccess = options.success;
            options.success = function(data, textStatus, jqXHR) {
              console.log('📥 [jQuery AJAX RESPONSE]', {
                url: url,
                status: jqXHR.status,
                statusText: jqXHR.statusText,
                responseHeaders: jqXHR.getAllResponseHeaders(),
                data: data,
                dataType: typeof data,
                dataPreview: typeof data === 'object' ? 
                  JSON.stringify(data).substring(0, 500) : 
                  String(data).substring(0, 500)
              });
              
              // 保存到全域變數供後續查看
              if (!window._interceptedAjaxRequests) {
                window._interceptedAjaxRequests = [];
              }
              window._interceptedAjaxRequests.push({
                type: 'jQuery AJAX',
                request: requestInfo,
                response: {
                  status: jqXHR.status,
                  data: data
                },
                timestamp: new Date().toISOString()
              });
              
              // 更新 UI 面板
              updateUIPanel();
              
              if (originalSuccess) {
                originalSuccess.apply(this, arguments);
              }
            };
            
            // 攔截錯誤
            const originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
              console.error('❌ [jQuery AJAX ERROR]', {
                url: url,
                status: jqXHR.status,
                statusText: jqXHR.statusText,
                error: errorThrown,
                responseText: jqXHR.responseText?.substring(0, 1000),
                responseHeaders: jqXHR.getAllResponseHeaders()
              });
              
              // 保存錯誤到全域變數
              if (!window._interceptedAjaxRequests) {
                window._interceptedAjaxRequests = [];
              }
              window._interceptedAjaxRequests.push({
                type: 'jQuery AJAX',
                request: requestInfo,
                error: {
                  status: jqXHR.status,
                  statusText: jqXHR.statusText,
                  error: errorThrown,
                  responseText: jqXHR.responseText
                },
                timestamp: new Date().toISOString()
              });
              
              // 更新 UI 面板
              updateUIPanel();
              
              if (originalError) {
                originalError.apply(this, arguments);
              }
            };
          }
          
          return originalAjax.apply(this, arguments);
        };
        
        console.log('✅ jQuery AJAX 攔截已啟動');
      } else {
        // jQuery 尚未載入，稍後再試
        setTimeout(interceptJQueryAjax, 500);
      }
    };
    
    // 立即嘗試攔截，如果 jQuery 尚未載入則稍後重試
    interceptJQueryAjax();
    
    // 攔截 fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      const urlStr = typeof url === 'string' ? url : url.url || url.toString();
      
      if (isFlightRelated(urlStr)) {
        const requestInfo = {
          url: urlStr,
          method: args[1]?.method || 'GET',
          headers: args[1]?.headers || {},
          body: args[1]?.body || null
        };
        
          console.log('📡 [FETCH]', requestInfo);
        
        return originalFetch.apply(this, args)
          .then(response => {
            const clonedResponse = response.clone();
            
            clonedResponse.json().then(data => {
              console.log('📥 [FETCH RESPONSE]', {
                url: urlStr,
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                data: data,
                dataPreview: JSON.stringify(data).substring(0, 500)
              });
              
              // 保存到全域變數
              if (!window._interceptedAjaxRequests) {
                window._interceptedAjaxRequests = [];
              }
              window._interceptedAjaxRequests.push({
                type: 'FETCH',
                request: requestInfo,
                response: {
                  status: response.status,
                  data: data
                },
                timestamp: new Date().toISOString()
              });
              
              // 更新 UI 面板
              updateUIPanel();
            }).catch(() => {
              clonedResponse.text().then(text => {
                console.log('📥 [FETCH RESPONSE (TEXT)]', {
                  url: urlStr,
                  status: response.status,
                  statusText: response.statusText,
                  preview: text.substring(0, 1000)
                });
                
                // 保存到全域變數
                if (!window._interceptedAjaxRequests) {
                  window._interceptedAjaxRequests = [];
                }
                window._interceptedAjaxRequests.push({
                  type: 'FETCH',
                  request: requestInfo,
                  response: {
                    status: response.status,
                    text: text
                  },
                  timestamp: new Date().toISOString()
                });
                
                // 更新 UI 面板
                updateUIPanel();
              });
            });
            
            return response;
          });
      }
      
      return originalFetch.apply(this, args);
    };
    
    console.log('✅ FETCH 攔截已啟動');
    
    // 攔截 XHR
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._interceptedUrl = url;
      this._interceptedMethod = method;
      return originalXHROpen.apply(this, [method, url, ...rest]);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      const xhr = this;
      const url = xhr._interceptedUrl;
      
      if (isFlightRelated(url)) {
        const requestInfo = {
          method: xhr._interceptedMethod,
          url: url,
          body: args[0] || null
        };
        
        console.log('📡 [XHR]', requestInfo);
        
        xhr.addEventListener('load', function() {
          try {
            const response = xhr.responseType === 'json' ? 
              xhr.response : 
              JSON.parse(xhr.responseText);
            
            console.log('📥 [XHR RESPONSE]', {
              method: xhr._interceptedMethod,
              url: url,
              status: xhr.status,
              statusText: xhr.statusText,
              responseHeaders: xhr.getAllResponseHeaders(),
              data: response,
              dataPreview: typeof response === 'object' ? 
                JSON.stringify(response).substring(0, 500) : 
                String(response).substring(0, 500)
            });
            
            // 保存到全域變數
            if (!window._interceptedAjaxRequests) {
              window._interceptedAjaxRequests = [];
            }
            window._interceptedAjaxRequests.push({
              type: 'XHR',
              request: requestInfo,
              response: {
                status: xhr.status,
                data: response
              },
              timestamp: new Date().toISOString()
            });
            
            // 更新 UI 面板
            updateUIPanel();
          } catch (e) {
            if (xhr.responseText) {
              console.log('📥 [XHR RESPONSE (TEXT)]', {
                method: xhr._interceptedMethod,
                url: url,
                status: xhr.status,
                statusText: xhr.statusText,
                preview: xhr.responseText.substring(0, 1000)
              });
              
              // 保存到全域變數
              if (!window._interceptedAjaxRequests) {
                window._interceptedAjaxRequests = [];
              }
              window._interceptedAjaxRequests.push({
                type: 'XHR',
                request: requestInfo,
                response: {
                  status: xhr.status,
                  text: xhr.responseText
                },
                timestamp: new Date().toISOString()
              });
              
              // 更新 UI 面板
              updateUIPanel();
            }
          }
        });
        
        xhr.addEventListener('error', function() {
          console.error('❌ [XHR ERROR]', {
            method: xhr._interceptedMethod,
            url: url,
            status: xhr.status,
            statusText: xhr.statusText
          });
        });
      }
      
      return originalXHRSend.apply(this, args);
    };
    
    console.log('✅ XHR 攔截已啟動');
    
    // ============================================
    // 3. 搜尋頁面中的 API 呼叫代碼
    // ============================================
    setTimeout(() => {
      console.log('\n📋 步驟 3: 搜尋頁面中的 API 呼叫代碼...\n');
      
      const scripts = document.querySelectorAll('script');
      const apiCalls = [];
      const flightKeywords = ['flight', 'gate', 'departure', 'd11', 'd12', 'd13', 'd14', 'd15', 'd16', 'd17', 'd18', 'airport', 'taoyuan'];
      
      scripts.forEach((script, index) => {
        if (script.textContent) {
          const content = script.textContent;
          const contentLower = content.toLowerCase();
          
          // 搜尋 admin-ajax.php
          if (content.includes('admin-ajax')) {
            const matches = content.match(/admin-ajax\.php[^\s"'`]*/gi);
            if (matches) {
              console.log(`📜 Script ${index + 1} 找到 admin-ajax 呼叫:`, matches);
              apiCalls.push({ scriptIndex: index + 1, type: 'admin-ajax', matches });
            }
            
            // 搜尋 action 參數
            const actionMatches = content.match(/action\s*[:=]\s*['"]([^'"]+)['"]/gi);
            if (actionMatches) {
              console.log(`📜 Script ${index + 1} 找到 action 參數:`, actionMatches);
            }
          }
          
          // 搜尋包含航班關鍵字的 API 呼叫
          if (flightKeywords.some(kw => contentLower.includes(kw))) {
            // 搜尋 fetch 呼叫
            const fetchMatches = content.match(/fetch\s*\([^)]*['"]([^'"]*flight[^'"]*|[^'"]*gate[^'"]*|[^'"]*departure[^'"]*|[^'"]*d1[1-8][^'"]*|[^'"]*airport[^'"]*|[^'"]*taoyuan[^'"]*)['"]/gi);
            if (fetchMatches) {
              console.log(`📜 Script ${index + 1} 找到航班相關 fetch 呼叫:`, fetchMatches);
              apiCalls.push({ scriptIndex: index + 1, type: 'fetch', matches: fetchMatches });
            }
            
            // 搜尋 XMLHttpRequest 呼叫
            const xhrMatches = content.match(/\.open\s*\([^)]*['"]([^'"]*flight[^'"]*|[^'"]*gate[^'"]*|[^'"]*departure[^'"]*|[^'"]*d1[1-8][^'"]*|[^'"]*airport[^'"]*|[^'"]*taoyuan[^'"]*)['"]/gi);
            if (xhrMatches) {
              console.log(`📜 Script ${index + 1} 找到航班相關 XHR 呼叫:`, xhrMatches);
              apiCalls.push({ scriptIndex: index + 1, type: 'xhr', matches: xhrMatches });
            }
            
            // 搜尋完整的 AJAX 呼叫模式
            const ajaxPattern = /jQuery\.(ajax|post|get)\s*\([^)]*['"]([^'"]*flight[^'"]*|[^'"]*gate[^'"]*|[^'"]*departure[^'"]*|[^'"]*d1[1-8][^'"]*|[^'"]*airport[^'"]*|[^'"]*taoyuan[^'"]*)['"]/gi;
            const ajaxMatches = content.match(ajaxPattern);
            if (ajaxMatches) {
              console.log(`📜 Script ${index + 1} 找到航班相關 jQuery AJAX 呼叫:`, ajaxMatches);
              apiCalls.push({ scriptIndex: index + 1, type: 'jquery-ajax', matches: ajaxMatches });
            }
          }
        }
      });
    }, 2000);
    
    // ============================================
    // 4. 檢查頁面中的資料屬性
    // ============================================
    setTimeout(() => {
      console.log('\n📋 步驟 4: 檢查頁面元素的資料屬性...\n');
      
      const dataElements = document.querySelectorAll('[data-action], [data-api], [data-endpoint], [data-gate], [data-flight]');
      if (dataElements.length > 0) {
        console.log(`✅ 找到 ${dataElements.length} 個包含資料屬性的元素`);
        dataElements.slice(0, 10).forEach((el, index) => {
          const attrs = Array.from(el.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .reduce((acc, attr) => {
              acc[attr.name] = attr.value;
              return acc;
            }, {});
          console.log(`  - ${el.tagName} (${el.className}):`, attrs);
        });
      } else {
        console.log('⚠️ 未找到包含資料屬性的元素');
      }
    }, 2000);
    
    // ============================================
    // 5. 提供查看函數
    // ============================================
    window._viewInterceptedRequests = function() {
      if (!window._interceptedAjaxRequests || window._interceptedAjaxRequests.length === 0) {
        console.log('⚠️ 尚未攔截到任何請求');
        return;
      }
      
      console.table(window._interceptedAjaxRequests.map(req => ({
        type: req.type,
        url: req.request.url,
        method: req.request.method,
        action: req.request.action,
        status: req.response?.status || req.error?.status || 'N/A',
        timestamp: req.timestamp
      })));
      
      console.log('\n完整資料：', window._interceptedAjaxRequests);
    };
    
    window._viewJsonLdData = function() {
      if (!window._jsonLdFlightData || window._jsonLdFlightData.length === 0) {
        console.log('⚠️ 未找到 JSON-LD 資料');
        return;
      }
      console.log('JSON-LD 航班資料：', window._jsonLdFlightData);
      return window._jsonLdFlightData;
    };
    
    // 新增：查看 HTML 表格資料的專用函數
    window._viewTableData = function() {
      if (!window._jsonLdFlightData || window._jsonLdFlightData.length === 0) {
        console.log('⚠️ 未找到任何資料');
        return;
      }
      
      const tableData = window._jsonLdFlightData.filter(item => 
        item.data && item.data.type === 'table'
      );
      
      if (tableData.length === 0) {
        console.log('⚠️ 未找到 HTML 表格資料');
        console.log('💡 提示：資料可能在其他格式中，執行 _viewJsonLdData() 查看所有資料');
        return;
      }
      
      console.log(`✅ 找到 ${tableData.length} 個包含航班資料的表格：\n`);
      
      tableData.forEach((item, index) => {
        console.group(`📊 表格 ${index + 1} (${item.scriptIndex})`);
        console.log('資訊：', item.data.info);
        console.log('表頭：', item.data.headers);
        console.log(`資料行數：${item.data.rows.length}`);
        console.log('前 5 行資料：', item.data.rows.slice(0, 5));
        console.log('完整資料：', item.data.rows);
        console.log('HTML 預覽：', item.data.html.substring(0, 1000));
        console.groupEnd();
      });
      
      return tableData;
    };
    
    // 新增：查看所有找到的航班資料（包含表格、容器等）
    window._viewAllFlightData = function() {
      if (!window._jsonLdFlightData || window._jsonLdFlightData.length === 0) {
        console.log('⚠️ 未找到任何航班資料');
        return;
      }
      
      console.log(`✅ 找到 ${window._jsonLdFlightData.length} 個資料來源：\n`);
      
      window._jsonLdFlightData.forEach((item, index) => {
        console.group(`📦 資料來源 ${index + 1}: ${item.source || 'unknown'}`);
        console.log('索引：', item.scriptIndex);
        console.log('類型：', item.data?.type || 'unknown');
        
        if (item.data?.type === 'table') {
          console.log('表格資訊：', item.data.info);
          console.log('表頭：', item.data.headers);
          console.log(`資料行數：${item.data.rows.length}`);
          console.log('資料預覽：', item.data.rows.slice(0, 3));
        } else if (item.data?.type === 'structured-container') {
          console.log('容器資訊：', {
            id: item.data.id,
            className: item.data.className,
            textPreview: item.data.text.substring(0, 200)
          });
        } else {
          console.log('資料：', item.data);
        }
        
        console.groupEnd();
      });
      
      return window._jsonLdFlightData;
    };
    
    // ============================================
    // 總結
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ [Tampermonkey] 增強版分析工具已啟動！');
    console.log('='.repeat(60));
    console.log('\n💡 分析結果會自動顯示在右上角的浮動面板中');
    console.log('\n💡 可用指令（Console）：');
    console.log('  - _viewInterceptedRequests()  // 查看所有攔截的請求');
    console.log('  - _viewJsonLdData()           // 查看 JSON-LD 航班資料');
    console.log('  - _viewTableData()             // 查看 HTML 表格資料（新增）');
    console.log('  - _viewAllFlightData()         // 查看所有找到的航班資料（新增）');
    console.log('\n💡 此腳本會自動執行，無需手動操作');
    console.log('💡 重新載入頁面後會自動重新執行');
    console.log('💡 如果找不到 API 請求，資料可能是直接嵌入在 HTML 中');
    console.log('\n');
    
    // 定期更新 UI 面板（每 2 秒）
    setInterval(() => {
      if (document.getElementById('api-analyzer-panel')) {
        updateUIPanel();
      }
    }, 2000);
  };
  
  // 立即執行
  init();
  
  // 監聽頁面導航（SPA 應用）
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(runAnalyzer, 1000);
    }
  }).observe(document, { subtree: true, childList: true });
})();
