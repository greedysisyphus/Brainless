/**
 * 分析桃園機場官方網站的 API 結構
 * 檢查 https://www.taoyuan-airport.com/flight_depart 的資料來源
 */

(function() {
  'use strict';
  
  console.log('🔍 開始分析桃園機場官方網站 API...\n');
  
  const results = {
    apiEndpoints: [],
    networkRequests: [],
    dataSources: [],
    scripts: [],
    embeddedData: []
  };
  
  // ============================================
  // 1. 攔截所有 Network 請求
  // ============================================
  console.log('📋 步驟 1: 攔截 Network 請求...\n');
  
  const interceptNetworkRequests = () => {
    // 攔截 fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      const urlStr = typeof url === 'string' ? url : url.url || url.toString();
      
      if (urlStr.includes('taoyuan-airport.com') || 
          urlStr.includes('flight') || 
          urlStr.includes('depart') ||
          urlStr.includes('arrive') ||
          urlStr.includes('api') ||
          urlStr.includes('gate') ||
          urlStr.includes('d11') ||
          urlStr.includes('d18')) {
        console.log('📡 [FETCH]', {
          url: urlStr,
          method: args[1]?.method || 'GET',
          headers: args[1]?.headers || {},
          body: args[1]?.body || null
        });
        
        results.networkRequests.push({
          type: 'fetch',
          url: urlStr,
          method: args[1]?.method || 'GET',
          timestamp: new Date().toISOString()
        });
        
        // 攔截回應
        return originalFetch.apply(this, args).then(response => {
          const clonedResponse = response.clone();
          
          clonedResponse.json().then(data => {
            console.log('📥 [FETCH RESPONSE]', {
              url: urlStr,
              status: response.status,
              data: data
            });
            
            results.networkRequests[results.networkRequests.length - 1].response = {
              status: response.status,
              data: data
            };
          }).catch(() => {
            clonedResponse.text().then(text => {
              console.log('📥 [FETCH RESPONSE (TEXT)]', {
                url: urlStr,
                status: response.status,
                preview: text.substring(0, 500)
              });
            });
          });
          
          return response;
        });
      }
      
      return originalFetch.apply(this, args);
    };
    
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
      
      if (url && (url.includes('taoyuan-airport.com') || 
                  url.includes('flight') || 
                  url.includes('depart') ||
                  url.includes('arrive') ||
                  url.includes('api') ||
                  url.includes('gate'))) {
        console.log('📡 [XHR]', {
          url: url,
          method: xhr._interceptedMethod
        });
        
        results.networkRequests.push({
          type: 'xhr',
          url: url,
          method: xhr._interceptedMethod,
          timestamp: new Date().toISOString()
        });
        
        xhr.addEventListener('load', function() {
          try {
            const response = xhr.responseType === 'json' ? 
              xhr.response : 
              JSON.parse(xhr.responseText);
            
            console.log('📥 [XHR RESPONSE]', {
              url: url,
              status: xhr.status,
              data: response
            });
            
            const requestIndex = results.networkRequests.findIndex(r => r.url === url);
            if (requestIndex >= 0) {
              results.networkRequests[requestIndex].response = {
                status: xhr.status,
                data: response
              };
            }
          } catch (e) {
            if (xhr.responseText) {
              console.log('📥 [XHR RESPONSE (TEXT)]', {
                url: url,
                status: xhr.status,
                preview: xhr.responseText.substring(0, 500)
              });
            }
          }
        });
      }
      
      return originalXHRSend.apply(this, args);
    };
    
    console.log('✅ Network 請求攔截已啟動');
  };
  
  // ============================================
  // 2. 檢查頁面中的資料來源
  // ============================================
  console.log('\n📋 步驟 2: 檢查頁面中的資料來源...\n');
  
  const checkPageSources = () => {
    // 檢查所有 script 標籤
    const scripts = document.querySelectorAll('script');
    scripts.forEach((script, index) => {
      if (script.src) {
        const src = script.src;
        if (src.includes('api') || 
            src.includes('flight') || 
            src.includes('depart') ||
            src.includes('arrive')) {
          console.log(`📜 Script ${index + 1} (外部):`, src);
          results.scripts.push({ type: 'external', src: src, index: index + 1 });
        }
      } else if (script.textContent) {
        const content = script.textContent;
        
        // 檢查 API URL
        const apiMatches = content.match(/https?:\/\/[^\s"']*\/api[^\s"']*/gi);
        const flightMatches = content.match(/https?:\/\/[^\s"']*(?:flight|depart|arrive|gate)[^\s"']*/gi);
        
        if (apiMatches) {
          console.log(`📜 Script ${index + 1} (內嵌) 找到 API URL:`, apiMatches);
          results.scripts.push({ 
            type: 'inline', 
            index: index + 1, 
            apiUrls: apiMatches
          });
        }
        
        if (flightMatches) {
          console.log(`📜 Script ${index + 1} (內嵌) 找到航班相關 URL:`, flightMatches);
          results.scripts.push({ 
            type: 'inline', 
            index: index + 1, 
            flightUrls: flightMatches
          });
        }
        
        // 檢查資料變數
        const dataVarPatterns = [
          /(?:var|let|const|window\.)\s*(\w*flight\w*Data|\w*airport\w*Data|\w*gate\w*Data)\s*=\s*(\{[\s\S]*?\}|\[[\s\S]*?\])/gi,
          /api[_-]?url\s*[:=]\s*['"]([^'"]+)['"]/gi,
          /endpoint\s*[:=]\s*['"]([^'"]+)['"]/gi,
          /baseUrl\s*[:=]\s*['"]([^'"]+)['"]/gi
        ];
        
        dataVarPatterns.forEach(pattern => {
          const matches = content.matchAll(pattern);
          for (const match of matches) {
            console.log(`📜 Script ${index + 1} 找到資料變數:`, match[1] || match[0]);
            results.embeddedData.push({
              scriptIndex: index + 1,
              match: match[0],
              variable: match[1] || 'unknown'
            });
          }
        });
      }
    });
    
    // 檢查 data-* 屬性
    const dataElements = document.querySelectorAll('[data-api], [data-source], [data-endpoint], [data-url]');
    dataElements.forEach((el, index) => {
      const attrs = {};
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          attrs[attr.name] = attr.value;
        }
      });
      if (Object.keys(attrs).length > 0) {
        console.log(`📦 元素 ${index + 1} 包含資料屬性:`, attrs);
        results.embeddedData.push({
          type: 'data-attribute',
          element: el.tagName,
          attributes: attrs
        });
      }
    });
  };
  
  // ============================================
  // 3. 檢查可能的 API 端點
  // ============================================
  console.log('\n📋 步驟 3: 檢查可能的 API 端點...\n');
  
  const checkPossibleEndpoints = async () => {
    const baseUrl = window.location.origin;
    const possibleEndpoints = [
      '/api/flight',
      '/api/flights',
      '/api/depart',
      '/api/departure',
      '/api/arrive',
      '/api/arrival',
      '/api/gate',
      '/api/gates',
      '/flight/api',
      '/api/v1/flight',
      '/api/v2/flight',
      '/wp-json/wp/v2/flight',
      '/rest/flight'
    ];
    
    console.log('🔗 測試可能的 API 端點...');
    for (const endpoint of possibleEndpoints) {
      try {
        const url = baseUrl + endpoint;
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok || response.status === 405) { // 405 表示端點存在但不支援 HEAD
          console.log(`✅ 找到可能的端點: ${url} (狀態: ${response.status})`);
          results.apiEndpoints.push({
            endpoint: url,
            status: response.status
          });
        }
      } catch (e) {
        // 端點不存在
      }
    }
  };
  
  // ============================================
  // 4. 檢查 URL 參數和查詢方式
  // ============================================
  console.log('\n📋 步驟 4: 分析 URL 參數...\n');
  
  const analyzeUrlParams = () => {
    const url = new URL(window.location.href);
    console.log('📍 當前 URL:', url.href);
    console.log('📍 路徑:', url.pathname);
    console.log('📍 查詢參數:', Object.fromEntries(url.searchParams));
    
    // 檢查是否有其他查詢參數組合
    const possibleParams = ['k', 'time', 'gate', 'date', 'flight', 'terminal'];
    possibleParams.forEach(param => {
      const value = url.searchParams.get(param);
      if (value) {
        console.log(`   ${param}: ${value}`);
      }
    });
  };
  
  // ============================================
  // 5. 檢查頁面中的表格資料
  // ============================================
  console.log('\n📋 步驟 5: 檢查頁面中的表格資料...\n');
  
  const checkTableData = () => {
    const tables = document.querySelectorAll('table');
    console.log(`找到 ${tables.length} 個表格`);
    
    tables.forEach((table, index) => {
      const tableText = table.textContent.toLowerCase();
      if (tableText.includes('flight') || 
          tableText.includes('gate') || 
          tableText.includes('depart') ||
          tableText.includes('arrive')) {
        console.log(`📊 表格 ${index + 1} 包含航班資料`);
        
        // 檢查表格是否有 data-* 屬性
        const attrs = {};
        Array.from(table.attributes).forEach(attr => {
          if (attr.name.startsWith('data-')) {
            attrs[attr.name] = attr.value;
          }
        });
        
        if (Object.keys(attrs).length > 0) {
          console.log(`   資料屬性:`, attrs);
        }
        
        // 檢查表格的 ID 和 Class
        if (table.id) {
          console.log(`   ID: ${table.id}`);
        }
        if (table.className) {
          console.log(`   Class: ${table.className}`);
        }
      }
    });
  };
  
  // ============================================
  // 執行所有檢查
  // ============================================
  
  const runAllChecks = async () => {
    analyzeUrlParams();
    checkPageSources();
    checkTableData();
    interceptNetworkRequests();
    await checkPossibleEndpoints();
    
    // 等待一下讓攔截器捕獲請求
    setTimeout(() => {
      console.log('\n' + '='.repeat(60));
      console.log('📊 分析結果總結');
      console.log('='.repeat(60));
      console.log('\n找到的資訊:');
      console.log(`  - API 端點: ${results.apiEndpoints.length} 個`);
      console.log(`  - Script 線索: ${results.scripts.length} 個`);
      console.log(`  - Network 請求: ${results.networkRequests.length} 個`);
      console.log(`  - 嵌入資料: ${results.embeddedData.length} 個`);
      
      console.log('\n完整結果:');
      console.log(results);
      
      // 保存到全域變數
      window._taoyuanAirportAnalysis = results;
      
      console.log('\n💡 提示: 結果已保存到 window._taoyuanAirportAnalysis');
      console.log('💡 請觸發頁面操作（如搜尋、篩選）來捕獲動態請求');
    }, 2000);
  };
  
  // 立即執行
  runAllChecks();
  
  // 提供手動觸發函數
  window._analyzeTaoyuanAirport = runAllChecks;
  
  console.log('\n💡 提示: 可以執行 _analyzeTaoyuanAirport() 重新分析');
})();
