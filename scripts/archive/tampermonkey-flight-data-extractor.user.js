// ==UserScript==
// @name         桃園機場 D11-D18 航班資料提取工具
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自動提取 yuann.tw 網站上的航班表格資料，支援多登機門查詢和資料匯出
// @author       You
// @match        https://yuann.tw/taoyuan-airport-d11-d18-departures/*
// @match        http://yuann.tw/taoyuan-airport-d11-d18-departures/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
  'use strict';
  
  console.log('🚀 航班資料提取工具啟動...');
  
  // ============================================
  // 資料提取核心功能
  // ============================================
  
  /**
   * 提取單個表格的資料
   * @param {HTMLTableElement} table - 表格元素
   * @param {string} type - 表格類型 ('departure' 或 'arrival')
   * @returns {Array} 提取的資料陣列
   */
  const extractTableData = (table, type = 'unknown') => {
    if (!table) return [];
    
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => {
      // 移除排序連結的文字，只保留標題
      const link = th.querySelector('a');
      return link ? link.textContent.trim() : th.textContent.trim();
    });
    
    const data = rows.map((row, index) => {
      const cells = Array.from(row.querySelectorAll('td'));
      const rowData = {
        index: index + 1,
        type: type
      };
      
      // 根據表格類型提取不同的欄位
      cells.forEach((cell, cellIndex) => {
        const header = headers[cellIndex] || `column_${cellIndex}`;
        let value = cell.textContent.trim();
        
        // 特殊處理：提取航班代號中的主要航班號
        if (header.includes('航班代號')) {
          const flightLink = cell.querySelector('a[href*="flightradar24.com"]');
          if (flightLink) {
            const flightCode = flightLink.textContent.trim();
            const airline = cell.querySelector('.codeshare-name')?.textContent.trim() || '';
            rowData.flightCode = flightCode;
            rowData.airline = airline.replace(/[()]/g, '');
            rowData.fullFlightInfo = value;
          } else {
            rowData.flightCode = value.split('\n')[0].trim();
            rowData.fullFlightInfo = value;
          }
        }
        // 特殊處理：提取目的地/出發地的城市和代碼
        else if (header.includes('目的地') || header.includes('出發地')) {
          const small = cell.querySelector('small');
          const strong = cell.querySelector('strong');
          if (small && strong) {
            rowData.city = small.textContent.trim();
            rowData.airportCode = strong.textContent.trim();
            rowData.fullDestination = value;
          } else {
            rowData.fullDestination = value;
          }
        }
        // 特殊處理：提取狀態
        else if (header.includes('狀態')) {
          const statusSpan = cell.querySelector('span[class*="status"]');
          if (statusSpan) {
            rowData.status = statusSpan.textContent.trim();
            rowData.statusClass = statusSpan.className;
          } else {
            rowData.status = value;
          }
        }
        // 一般欄位
        else {
          // 將欄位名稱轉換為 camelCase
          const camelKey = header
            .replace(/[\/\s▲]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .split('_')
            .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
          
          rowData[camelKey] = value;
        }
      });
      
      return rowData;
    });
    
    return {
      type: type,
      headers: headers,
      rowCount: data.length,
      data: data
    };
  };
  
  /**
   * 提取當前頁面的所有航班資料
   * @returns {Object} 包含出發和抵達航班資料的物件
   */
  const extractAllFlightData = () => {
    const tables = document.querySelectorAll('table.flight-table');
    
    let departureData = null;
    let arrivalData = null;
    
    tables.forEach((table, index) => {
      // 根據表格內容判斷是出發還是抵達
      const tableText = table.textContent;
      const isDeparture = tableText.includes('出發時間') || tableText.includes('出發');
      const isArrival = tableText.includes('抵達時間') || tableText.includes('抵達');
      
      if (isDeparture && !departureData) {
        departureData = extractTableData(table, 'departure');
      } else if (isArrival && !arrivalData) {
        arrivalData = extractTableData(table, 'arrival');
      } else if (!departureData && index === 0) {
        // 如果無法判斷，第一個表格預設為出發
        departureData = extractTableData(table, 'departure');
      } else if (!arrivalData && index === 1) {
        // 第二個表格預設為抵達
        arrivalData = extractTableData(table, 'arrival');
      }
    });
    
    // 從 URL 提取當前查詢的登機門
    const urlParams = new URLSearchParams(window.location.search);
    const flightSearch = urlParams.get('flight_search') || 'ALL';
    
    return {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      gate: flightSearch,
      departure: departureData,
      arrival: arrivalData,
      summary: {
        departureCount: departureData?.rowCount || 0,
        arrivalCount: arrivalData?.rowCount || 0,
        totalCount: (departureData?.rowCount || 0) + (arrivalData?.rowCount || 0)
      }
    };
  };
  
  /**
   * 獲取指定登機門的資料（透過 fetch）
   * @param {string} gate - 登機門代號 (D11-D18)
   * @returns {Promise<Object>} 提取的資料
   */
  const fetchGateData = async (gate) => {
    try {
      const url = `https://yuann.tw/taoyuan-airport-d11-d18-departures/?flight_search=${gate}`;
      const response = await fetch(url);
      const html = await response.text();
      
      // 解析 HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // 提取表格資料
      const tables = doc.querySelectorAll('table.flight-table');
      let departureData = null;
      let arrivalData = null;
      
      tables.forEach((table, index) => {
        const tableText = table.textContent;
        const isDeparture = tableText.includes('出發時間') || tableText.includes('出發');
        const isArrival = tableText.includes('抵達時間') || tableText.includes('抵達');
        
        if (isDeparture && !departureData) {
          departureData = extractTableData(table, 'departure');
        } else if (isArrival && !arrivalData) {
          arrivalData = extractTableData(table, 'arrival');
        }
      });
      
      return {
        timestamp: new Date().toISOString(),
        url: url,
        gate: gate,
        departure: departureData,
        arrival: arrivalData,
        summary: {
          departureCount: departureData?.rowCount || 0,
          arrivalCount: arrivalData?.rowCount || 0,
          totalCount: (departureData?.rowCount || 0) + (arrivalData?.rowCount || 0)
        }
      };
    } catch (error) {
      console.error(`❌ 獲取 ${gate} 資料失敗:`, error);
      return {
        gate: gate,
        error: error.message
      };
    }
  };
  
  /**
   * 批量獲取多個登機門的資料
   * @param {Array<string>} gates - 登機門代號陣列
   * @returns {Promise<Array>} 所有登機門的資料陣列
   */
  const fetchMultipleGates = async (gates = ['D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18']) => {
    console.log(`📡 開始獲取 ${gates.length} 個登機門的資料...`);
    const results = [];
    
    for (const gate of gates) {
      console.log(`  正在獲取 ${gate}...`);
      const data = await fetchGateData(gate);
      results.push(data);
      // 避免請求過快，稍作延遲
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  };
  
  // ============================================
  // UI 面板
  // ============================================
  
  const createUIPanel = () => {
    const existingPanel = document.getElementById('flight-data-extractor-panel');
    if (existingPanel) {
      existingPanel.remove();
    }
    
    const panel = document.createElement('div');
    panel.id = 'flight-data-extractor-panel';
    panel.innerHTML = `
      <style>
        #flight-data-extractor-panel {
          position: fixed;
          top: 20px;
          left: 20px;
          width: 500px;
          max-height: 90vh;
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
        #flight-data-extractor-panel .panel-header {
          background: linear-gradient(135deg, #4a9eff 0%, #357abd 100%);
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: move;
          user-select: none;
        }
        #flight-data-extractor-panel .panel-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: white;
        }
        #flight-data-extractor-panel .panel-controls {
          display: flex;
          gap: 8px;
        }
        #flight-data-extractor-panel .panel-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: background 0.2s;
        }
        #flight-data-extractor-panel .panel-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        #flight-data-extractor-panel .panel-btn.copy-btn {
          width: auto;
          padding: 0 12px;
          font-size: 12px;
        }
        #flight-data-extractor-panel .panel-btn.copy-btn.copied {
          background: #4caf50;
        }
        #flight-data-extractor-panel .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: #1a1a1a;
        }
        #flight-data-extractor-panel.collapsed .panel-content {
          display: none;
        }
        #flight-data-extractor-panel .section {
          margin-bottom: 20px;
        }
        #flight-data-extractor-panel .section-title {
          font-size: 13px;
          font-weight: 600;
          color: #4a9eff;
          margin-bottom: 10px;
          padding-bottom: 6px;
          border-bottom: 1px solid #333;
        }
        #flight-data-extractor-panel .info-item {
          background: #252525;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 8px;
        }
        #flight-data-extractor-panel .info-label {
          font-size: 11px;
          color: #888;
          margin-bottom: 4px;
        }
        #flight-data-extractor-panel .info-value {
          font-size: 12px;
          color: #e0e0e0;
        }
        #flight-data-extractor-panel .action-btn {
          width: 100%;
          padding: 10px;
          margin: 8px 0;
          background: #4a9eff;
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        #flight-data-extractor-panel .action-btn:hover {
          background: #357abd;
        }
        #flight-data-extractor-panel .action-btn:disabled {
          background: #555;
          cursor: not-allowed;
        }
        #flight-data-extractor-panel .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          margin-left: 8px;
        }
        #flight-data-extractor-panel .status-success {
          background: #4caf50;
          color: white;
        }
        #flight-data-extractor-panel .empty-state {
          text-align: center;
          padding: 20px;
          color: #888;
          font-size: 12px;
        }
      </style>
      <div class="panel-header">
        <h3>✈️ 航班資料提取工具</h3>
        <div class="panel-controls">
          <button class="panel-btn copy-btn" id="copy-json" title="複製 JSON">📋 JSON</button>
          <button class="panel-btn copy-btn" id="copy-csv" title="複製 CSV">📊 CSV</button>
          <button class="panel-btn" id="toggle-panel" title="摺疊/展開">−</button>
          <button class="panel-btn" id="close-panel" title="關閉">×</button>
        </div>
      </div>
      <div class="panel-content">
        <div class="section">
          <div class="section-title">📊 當前頁面資料</div>
          <div id="current-data" class="empty-state">載入中...</div>
        </div>
        <div class="section">
          <div class="section-title">🔧 工具</div>
          <button class="action-btn" id="extract-current">提取當前頁面資料</button>
          <button class="action-btn" id="fetch-all-gates">獲取所有登機門 (D11-D18)</button>
          <div id="fetch-status" style="margin-top: 10px; font-size: 11px; color: #888;"></div>
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
    
    // 提取當前頁面資料
    panel.querySelector('#extract-current').addEventListener('click', () => {
      const data = extractAllFlightData();
      window._flightData = data;
      updateCurrentData(data);
      console.log('✅ 資料已提取:', data);
    });
    
    // 獲取所有登機門
    panel.querySelector('#fetch-all-gates').addEventListener('click', async () => {
      const btn = panel.querySelector('#fetch-all-gates');
      const statusDiv = panel.querySelector('#fetch-status');
      btn.disabled = true;
      btn.textContent = '獲取中...';
      statusDiv.textContent = '正在獲取資料，請稍候...';
      
      try {
        const allData = await fetchMultipleGates();
        window._allGatesData = allData;
        updateCurrentData({ allGates: allData });
        statusDiv.textContent = `✅ 已獲取 ${allData.length} 個登機門的資料`;
        console.log('✅ 所有登機門資料:', allData);
      } catch (error) {
        statusDiv.textContent = `❌ 獲取失敗: ${error.message}`;
        console.error('❌ 獲取失敗:', error);
      } finally {
        btn.disabled = false;
        btn.textContent = '獲取所有登機門 (D11-D18)';
      }
    });
    
    // 複製 JSON
    panel.querySelector('#copy-json').addEventListener('click', async () => {
      const data = window._flightData || extractAllFlightData();
      const json = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(json);
      const btn = panel.querySelector('#copy-json');
      btn.textContent = '✓ 已複製';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = '📋 JSON';
        btn.classList.remove('copied');
      }, 2000);
    });
    
    // 複製 CSV
    panel.querySelector('#copy-csv').addEventListener('click', async () => {
      const data = window._flightData || extractAllFlightData();
      const csv = convertToCSV(data);
      await navigator.clipboard.writeText(csv);
      const btn = panel.querySelector('#copy-csv');
      btn.textContent = '✓ 已複製';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = '📊 CSV';
        btn.classList.remove('copied');
      }, 2000);
    });
    
    return panel;
  };
  
  const updateCurrentData = (data) => {
    const contentDiv = document.getElementById('current-data');
    if (!contentDiv) return;
    
    if (data.allGates) {
      // 顯示所有登機門的摘要
      const summary = data.allGates.reduce((acc, gateData) => {
        if (gateData.summary) {
          acc.departure += gateData.summary.departureCount;
          acc.arrival += gateData.summary.arrivalCount;
          acc.total += gateData.summary.totalCount;
        }
        return acc;
      }, { departure: 0, arrival: 0, total: 0 });
      
      contentDiv.innerHTML = `
        <div class="info-item">
          <div class="info-label">登機門數量</div>
          <div class="info-value">${data.allGates.length} 個</div>
        </div>
        <div class="info-item">
          <div class="info-label">總航班數</div>
          <div class="info-value">${summary.total} 班</div>
        </div>
        <div class="info-item">
          <div class="info-label">出發航班</div>
          <div class="info-value">${summary.departure} 班</div>
        </div>
        <div class="info-item">
          <div class="info-label">抵達航班</div>
          <div class="info-value">${summary.arrival} 班</div>
        </div>
      `;
    } else {
      // 顯示單個頁面的資料
      contentDiv.innerHTML = `
        <div class="info-item">
          <div class="info-label">登機門</div>
          <div class="info-value">${data.gate || 'ALL'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">出發航班</div>
          <div class="info-value">${data.summary?.departureCount || 0} 班</div>
        </div>
        <div class="info-item">
          <div class="info-label">抵達航班</div>
          <div class="info-value">${data.summary?.arrivalCount || 0} 班</div>
        </div>
        <div class="info-item">
          <div class="info-label">總計</div>
          <div class="info-value">${data.summary?.totalCount || 0} 班</div>
        </div>
      `;
    }
  };
  
  const convertToCSV = (data) => {
    if (data.allGates) {
      // 多個登機門的資料
      let csv = '登機門,類型,時間,航班代號,航空公司,登機門,目的地/出發地,狀態\n';
      data.allGates.forEach(gateData => {
        if (gateData.departure?.data) {
          gateData.departure.data.forEach(row => {
            csv += `${gateData.gate},出發,${row['出發時間/實際出發'] || ''},${row.flightCode || ''},${row.airline || ''},${row['登機門'] || ''},${row.fullDestination || ''},${row.status || ''}\n`;
          });
        }
        if (gateData.arrival?.data) {
          gateData.arrival.data.forEach(row => {
            csv += `${gateData.gate},抵達,${row['抵達時間/實際抵達'] || ''},${row.flightCode || ''},${row.airline || ''},${row['登機門'] || ''},${row.fullDestination || ''},${row.status || ''}\n`;
          });
        }
      });
      return csv;
    } else {
      // 單個頁面的資料
      let csv = '類型,時間,航班代號,航空公司,登機門,目的地/出發地,狀態\n';
      if (data.departure?.data) {
        data.departure.data.forEach(row => {
          csv += `出發,${row['出發時間/實際出發'] || ''},${row.flightCode || ''},${row.airline || ''},${row['登機門'] || ''},${row.fullDestination || ''},${row.status || ''}\n`;
        });
      }
      if (data.arrival?.data) {
        data.arrival.data.forEach(row => {
          csv += `抵達,${row['抵達時間/實際抵達'] || ''},${row.flightCode || ''},${row.airline || ''},${row['登機門'] || ''},${row.fullDestination || ''},${row.status || ''}\n`;
        });
      }
      return csv;
    }
  };
  
  // ============================================
  // 全域函數（供 Console 使用）
  // ============================================
  
  window._extractFlightData = extractAllFlightData;
  window._fetchGateData = fetchGateData;
  window._fetchMultipleGates = fetchMultipleGates;
  
  // ============================================
  // 初始化
  // ============================================
  
  // 等待頁面載入完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        createUIPanel();
        const data = extractAllFlightData();
        window._flightData = data;
        updateCurrentData(data);
      }, 1000);
    });
  } else {
    setTimeout(() => {
      createUIPanel();
      const data = extractAllFlightData();
      window._flightData = data;
      updateCurrentData(data);
    }, 1000);
  }
  
  console.log('✅ 航班資料提取工具已啟動');
  console.log('💡 可用函數：');
  console.log('  - _extractFlightData()      // 提取當前頁面資料');
  console.log('  - _fetchGateData(gate)     // 獲取指定登機門資料');
  console.log('  - _fetchMultipleGates()    // 獲取所有登機門資料');
  console.log('  - window._flightData       // 當前提取的資料');
  console.log('  - window._allGatesData      // 所有登機門的資料');
})();
