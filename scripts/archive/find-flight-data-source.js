/**
 * 航班資料來源分析腳本
 * 用於找出 yuann.tw 網站是從哪裡獲取航班資料的
 * 
 * 使用方法：
 * 1. 打開 https://yuann.tw/taoyuan-airport-d11-d18-departures/
 * 2. 打開開發者工具 Console
 * 3. 複製此腳本並執行
 */

(function() {
  'use strict';
  
  console.log('🔍 開始分析航班資料來源...\n');
  
  const results = {
    apiEndpoints: [],
    dataSources: [],
    scripts: [],
    networkRequests: [],
    wordPressAPIs: [],
    embeddedData: []
  };
  
  // ============================================
  // 1. 檢查 WordPress REST API
  // ============================================
  console.log('📋 步驟 1: 檢查 WordPress REST API...\n');
  
  const checkWordPressAPI = async () => {
    const apiBase = '/wp-json/wp/v2/';
    const possibleEndpoints = [
      'posts',
      'pages',
      'flight',
      'flights',
      'airport',
      'departure',
      'gate',
      'taoyuan'
    ];
    
    for (const endpoint of possibleEndpoints) {
      try {
        const response = await fetch(`${apiBase}${endpoint}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ 找到 WordPress API: ${apiBase}${endpoint}`, data);
          results.wordPressAPIs.push({
            endpoint: `${apiBase}${endpoint}`,
            data: data
          });
        }
      } catch (e) {
        // API 不存在
      }
    }
    
    // 檢查自定義端點
    try {
      const response = await fetch('/wp-json/');
      if (response.ok) {
        const routes = await response.json();
        console.log('📡 WordPress REST API 路由:', routes);
        results.wordPressAPIs.push({
          endpoint: '/wp-json/',
          routes: routes
        });
      }
    } catch (e) {
      console.log('⚠️ 無法訪問 /wp-json/');
    }
  };
  
  // ============================================
  // 2. 檢查頁面中的資料來源線索
  // ============================================
  console.log('\n📋 步驟 2: 檢查頁面中的資料來源線索...\n');
  
  const checkPageSources = () => {
    // 檢查所有 script 標籤
    const scripts = document.querySelectorAll('script');
    scripts.forEach((script, index) => {
      if (script.src) {
        const src = script.src;
        // 檢查是否包含 API 相關的 URL
        if (src.includes('api') || 
            src.includes('flight') || 
            src.includes('airport') ||
            src.includes('gate') ||
            src.includes('departure')) {
          console.log(`📜 Script ${index + 1} (外部):`, src);
          results.scripts.push({ type: 'external', src: src, index: index + 1 });
        }
      } else if (script.textContent) {
        const content = script.textContent;
        // 檢查是否包含 API URL
        const apiMatches = content.match(/https?:\/\/[^\s"']*\/api[^\s"']*/gi);
        const flightMatches = content.match(/https?:\/\/[^\s"']*(?:flight|airport|gate|departure)[^\s"']*/gi);
        
        if (apiMatches) {
          console.log(`📜 Script ${index + 1} (內嵌) 找到 API URL:`, apiMatches);
          results.scripts.push({ 
            type: 'inline', 
            index: index + 1, 
            apiUrls: apiMatches,
            content: content.substring(0, 1000)
          });
        }
        
        if (flightMatches) {
          console.log(`📜 Script ${index + 1} (內嵌) 找到航班相關 URL:`, flightMatches);
          results.scripts.push({ 
            type: 'inline', 
            index: index + 1, 
            flightUrls: flightMatches,
            content: content.substring(0, 1000)
          });
        }
        
        // 檢查是否有資料變數
        const dataVarPatterns = [
          /(?:var|let|const|window\.)\s*(\w*flight\w*Data|\w*airport\w*Data|\w*gate\w*Data)\s*=\s*(\{[\s\S]*?\}|\[[\s\S]*?\])/gi,
          /data-source\s*[:=]\s*['"]([^'"]+)['"]/gi,
          /api[_-]?url\s*[:=]\s*['"]([^'"]+)['"]/gi,
          /endpoint\s*[:=]\s*['"]([^'"]+)['"]/gi
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
      console.log(`📦 元素 ${index + 1} 包含資料屬性:`, attrs);
      results.embeddedData.push({
        type: 'data-attribute',
        element: el.tagName,
        attributes: attrs
      });
    });
  };
  
  // ============================================
  // 3. 檢查 Network 請求（攔截所有請求）
  // ============================================
  console.log('\n📋 步驟 3: 攔截 Network 請求...\n');
  
  const interceptNetworkRequests = () => {
    // 攔截 fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      const urlStr = typeof url === 'string' ? url : url.url || url.toString();
      
      if (urlStr.includes('api') || 
          urlStr.includes('flight') || 
          urlStr.includes('airport') ||
          urlStr.includes('gate') ||
          urlStr.includes('departure') ||
          urlStr.includes('taoyuan') ||
          urlStr.includes('wp-json')) {
        console.log('📡 [FETCH]', urlStr);
        results.networkRequests.push({
          type: 'fetch',
          url: urlStr,
          method: args[1]?.method || 'GET',
          timestamp: new Date().toISOString()
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
      
      if (url && (url.includes('api') || 
                  url.includes('flight') || 
                  url.includes('airport') ||
                  url.includes('gate') ||
                  url.includes('departure') ||
                  url.includes('taoyuan') ||
                  url.includes('wp-json'))) {
        console.log('📡 [XHR]', url);
        results.networkRequests.push({
          type: 'xhr',
          url: url,
          method: xhr._interceptedMethod,
          timestamp: new Date().toISOString()
        });
      }
      
      return originalXHRSend.apply(this, args);
    };
    
    console.log('✅ Network 請求攔截已啟動');
  };
  
  // ============================================
  // 4. 檢查可能的資料來源網站
  // ============================================
  console.log('\n📋 步驟 4: 檢查可能的資料來源...\n');
  
  const checkPossibleSources = () => {
    // 桃園機場官方網站
    const possibleSources = [
      'https://www.taoyuan-airport.com',
      'https://www.taoyuan-airport.com.tw',
      'https://www.taoyuan-airport.com/api',
      'https://www.caa.gov.tw',
      'https://www.anws.gov.tw',
      'https://www.flightradar24.com',
      'https://www.flightaware.com'
    ];
    
    console.log('🔗 可能的資料來源網站:');
    possibleSources.forEach(source => {
      console.log(`  - ${source}`);
    });
    
    results.dataSources = possibleSources;
  };
  
  // ============================================
  // 5. 檢查頁面中的註解和隱藏資訊
  // ============================================
  console.log('\n📋 步驟 5: 檢查頁面註解和隱藏資訊...\n');
  
  const checkComments = () => {
    // 檢查 HTML 註解
    const htmlContent = document.documentElement.outerHTML;
    const commentMatches = htmlContent.match(/<!--[\s\S]*?-->/g);
    if (commentMatches) {
      commentMatches.forEach((comment, index) => {
        if (comment.includes('api') || 
            comment.includes('flight') || 
            comment.includes('source') ||
            comment.includes('data')) {
          console.log(`💬 註解 ${index + 1}:`, comment.substring(0, 200));
          results.embeddedData.push({
            type: 'comment',
            content: comment
          });
        }
      });
    }
    
    // 檢查 meta 標籤
    const metaTags = document.querySelectorAll('meta');
    metaTags.forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
      const content = meta.getAttribute('content') || '';
      if (name.includes('api') || 
          name.includes('source') || 
          content.includes('api') ||
          content.includes('flight')) {
        console.log(`📄 Meta 標籤:`, { name, content });
        results.embeddedData.push({
          type: 'meta',
          name: name,
          content: content
        });
      }
    });
  };
  
  // ============================================
  // 6. 檢查 WordPress 自定義欄位和短代碼
  // ============================================
  console.log('\n📋 步驟 6: 檢查 WordPress 自定義欄位...\n');
  
  const checkWordPressCustomFields = () => {
    // 檢查是否有自定義欄位的資料
    const customFields = document.querySelectorAll('[class*="custom-field"], [id*="custom-field"], [data-custom]');
    if (customFields.length > 0) {
      console.log(`✅ 找到 ${customFields.length} 個自定義欄位元素`);
      customFields.forEach((el, index) => {
        console.log(`  元素 ${index + 1}:`, {
          className: el.className,
          id: el.id,
          text: el.textContent.substring(0, 100)
        });
      });
    }
    
    // 檢查頁面內容中是否有 API 相關的短代碼
    const pageContent = document.querySelector('.entry-content, .post-content, .page-content, article');
    if (pageContent) {
      const content = pageContent.innerHTML;
      const shortcodeMatches = content.match(/\[[\w-]+[^\]]*api[^\]]*\]/gi);
      if (shortcodeMatches) {
        console.log('📝 找到可能的短代碼:', shortcodeMatches);
        results.embeddedData.push({
          type: 'shortcode',
          matches: shortcodeMatches
        });
      }
    }
  };
  
  // ============================================
  // 7. 檢查伺服器回應標頭
  // ============================================
  console.log('\n📋 步驟 7: 檢查伺服器回應標頭...\n');
  
  const checkResponseHeaders = async () => {
    try {
      const response = await fetch(window.location.href, { method: 'HEAD' });
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
        if (key.toLowerCase().includes('api') || 
            key.toLowerCase().includes('source') ||
            value.includes('api') ||
            value.includes('flight')) {
          console.log(`📋 標頭: ${key} = ${value}`);
        }
      });
      results.networkRequests.push({
        type: 'headers',
        headers: headers
      });
    } catch (e) {
      console.log('⚠️ 無法檢查標頭:', e.message);
    }
  };
  
  // ============================================
  // 8. 檢查頁面源碼中的資料結構
  // ============================================
  console.log('\n📋 步驟 8: 分析頁面源碼中的資料結構...\n');
  
  const analyzeDataStructure = () => {
    // 檢查表格是否有 data-* 屬性指向資料來源
    const tables = document.querySelectorAll('table.flight-table');
    tables.forEach((table, index) => {
      const attrs = {};
      Array.from(table.attributes).forEach(attr => {
        attrs[attr.name] = attr.value;
      });
      
      if (Object.keys(attrs).length > 0) {
        console.log(`📊 表格 ${index + 1} 屬性:`, attrs);
      }
      
      // 檢查表格的父元素
      let parent = table.parentElement;
      let depth = 0;
      while (parent && depth < 5) {
        const parentAttrs = {};
        Array.from(parent.attributes).forEach(attr => {
          if (attr.name.startsWith('data-') || 
              attr.name === 'id' || 
              attr.name === 'class') {
            parentAttrs[attr.name] = attr.value;
          }
        });
        
        if (Object.keys(parentAttrs).length > 0 && 
            (parentAttrs.id || parentAttrs.class)) {
          console.log(`📊 表格 ${index + 1} 父元素 (深度 ${depth}):`, parentAttrs);
        }
        
        parent = parent.parentElement;
        depth++;
      }
    });
  };
  
  // ============================================
  // 執行所有檢查
  // ============================================
  
  const runAllChecks = async () => {
    checkPageSources();
    checkPossibleSources();
    checkComments();
    checkWordPressCustomFields();
    analyzeDataStructure();
    interceptNetworkRequests();
    await checkResponseHeaders();
    await checkWordPressAPI();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 分析結果總結');
    console.log('='.repeat(60));
    console.log('\n找到的資訊:');
    console.log(`  - WordPress API: ${results.wordPressAPIs.length} 個`);
    console.log(`  - Script 線索: ${results.scripts.length} 個`);
    console.log(`  - Network 請求: ${results.networkRequests.length} 個`);
    console.log(`  - 嵌入資料: ${results.embeddedData.length} 個`);
    console.log(`  - 可能來源: ${results.dataSources.length} 個`);
    
    console.log('\n完整結果:');
    console.log(results);
    
    // 保存到全域變數
    window._flightDataSourceAnalysis = results;
    
    console.log('\n💡 提示: 結果已保存到 window._flightDataSourceAnalysis');
    console.log('💡 請重新載入頁面或觸發一些操作（如搜尋），然後再次執行此腳本以捕獲動態請求');
    
    return results;
  };
  
  // 立即執行
  runAllChecks();
  
  // 提供手動觸發函數
  window._analyzeFlightDataSource = runAllChecks;
  
  console.log('\n💡 提示: 可以執行 _analyzeFlightDataSource() 重新分析');
})();
