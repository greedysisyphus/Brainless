/**
 * 增強版 WordPress 航班 API 分析工具
 * 
 * 功能：
 * 1. 自動提取頁面中的 JSON-LD 航班資料（如 Script 11）
 * 2. 詳細記錄 admin-ajax.php 的請求（Payload 和 Response）
 * 3. 檢查所有可能的資料來源
 * 
 * 使用方法：
 * 1. 打開 https://yuann.tw/taoyuan-airport-d11-d18-departures/
 * 2. 打開開發者工具 (F12)
 * 3. 在 Sources > Snippets 中創建新 Snippet，貼上此腳本
 * 4. 執行 Snippet（Cmd+Enter 或 Ctrl+Enter）
 * 5. 重新載入頁面，腳本會自動執行
 */

(function() {
  'use strict';
  
  // 防止重複執行
  if (window._enhancedApiAnalyzerRunning) {
    console.log('⚠️ 腳本已在運行中');
    return;
  }
  window._enhancedApiAnalyzerRunning = true;
  
  console.log('🔍 增強版 WordPress 航班 API 分析工具啟動...\n');
  
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
  
  const jsonLdData = extractJsonLdData();
  if (jsonLdData.length === 0) {
    console.log('⚠️ 未找到 JSON-LD 格式的航班資料');
  }
  
  // ============================================
  // 2. 詳細攔截 admin-ajax.php 請求
  // ============================================
  console.log('\n📋 步驟 2: 設置 admin-ajax.php 請求攔截...\n');
  
  // 攔截 jQuery AJAX（WordPress 常用）
  if (window.jQuery) {
    const originalAjax = window.jQuery.ajax;
    window.jQuery.ajax = function(options) {
      const url = options.url || '';
      
      if (url.includes('admin-ajax')) {
        const requestInfo = {
          url: url,
          method: options.type || 'GET',
          data: options.data,
          action: options.data?.action || (typeof options.data === 'string' ? 
            new URLSearchParams(options.data).get('action') : 'N/A'),
          headers: options.headers || {},
          dataType: options.dataType || 'json'
        };
        
        console.log('📡 [jQuery AJAX - admin-ajax.php]', requestInfo);
        
        // 攔截成功回應
        const originalSuccess = options.success;
        options.success = function(data, textStatus, jqXHR) {
          console.log('📥 [jQuery AJAX RESPONSE - admin-ajax.php]', {
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
          
          if (originalSuccess) {
            originalSuccess.apply(this, arguments);
          }
        };
        
        // 攔截錯誤
        const originalError = options.error;
        options.error = function(jqXHR, textStatus, errorThrown) {
          console.error('❌ [jQuery AJAX ERROR - admin-ajax.php]', {
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
          
          if (originalError) {
            originalError.apply(this, arguments);
          }
        };
      }
      
      return originalAjax.apply(this, arguments);
    };
    
    console.log('✅ jQuery AJAX 攔截已啟動');
  }
  
  // 攔截 fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    const urlStr = typeof url === 'string' ? url : url.url || url.toString();
    
    if (urlStr.includes('admin-ajax')) {
      const requestInfo = {
        url: urlStr,
        method: args[1]?.method || 'GET',
        headers: args[1]?.headers || {},
        body: args[1]?.body || null
      };
      
      console.log('📡 [FETCH - admin-ajax.php]', requestInfo);
      
      return originalFetch.apply(this, args)
        .then(response => {
          const clonedResponse = response.clone();
          
          clonedResponse.json().then(data => {
            console.log('📥 [FETCH RESPONSE - admin-ajax.php]', {
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
          }).catch(() => {
            clonedResponse.text().then(text => {
              console.log('📥 [FETCH RESPONSE - admin-ajax.php (TEXT)]', {
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
    
    if (url.includes('admin-ajax')) {
      const requestInfo = {
        method: xhr._interceptedMethod,
        url: url,
        body: args[0] || null
      };
      
      console.log('📡 [XHR - admin-ajax.php]', requestInfo);
      
      xhr.addEventListener('load', function() {
        try {
          const response = xhr.responseType === 'json' ? 
            xhr.response : 
            JSON.parse(xhr.responseText);
          
          console.log('📥 [XHR RESPONSE - admin-ajax.php]', {
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
        } catch (e) {
          if (xhr.responseText) {
            console.log('📥 [XHR RESPONSE - admin-ajax.php (TEXT)]', {
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
          }
        }
      });
      
      xhr.addEventListener('error', function() {
        console.error('❌ [XHR ERROR - admin-ajax.php]', {
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
  // 3. 搜尋頁面中的 admin-ajax 呼叫代碼
  // ============================================
  console.log('\n📋 步驟 3: 搜尋頁面中的 admin-ajax 呼叫代碼...\n');
  
  const scripts = document.querySelectorAll('script');
  const adminAjaxCalls = [];
  
  scripts.forEach((script, index) => {
    if (script.textContent) {
      const content = script.textContent;
      
      // 搜尋 admin-ajax.php
      if (content.includes('admin-ajax')) {
        const matches = content.match(/admin-ajax\.php[^\s"'`]*/gi);
        if (matches) {
          console.log(`📜 Script ${index + 1} 找到 admin-ajax 呼叫:`, matches);
          adminAjaxCalls.push({ scriptIndex: index + 1, matches });
        }
        
        // 搜尋 action 參數
        const actionMatches = content.match(/action\s*[:=]\s*['"]([^'"]+)['"]/gi);
        if (actionMatches) {
          console.log(`📜 Script ${index + 1} 找到 action 參數:`, actionMatches);
        }
        
        // 搜尋完整的 AJAX 呼叫模式
        const ajaxPattern = /jQuery\.(ajax|post|get)\([^)]*\)/gi;
        const ajaxMatches = content.match(ajaxPattern);
        if (ajaxMatches) {
          console.log(`📜 Script ${index + 1} 找到 jQuery AJAX 呼叫:`, ajaxMatches);
        }
      }
    }
  });
  
  // ============================================
  // 4. 檢查頁面中的資料屬性
  // ============================================
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
    if (jsonLdData.length === 0) {
      console.log('⚠️ 未找到 JSON-LD 資料');
      return;
    }
    console.log('JSON-LD 航班資料：', jsonLdData);
    return jsonLdData;
  };
  
  // ============================================
  // 總結
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ 增強版分析工具已啟動！');
  console.log('='.repeat(60));
  console.log('\n💡 可用指令：');
  console.log('  - _viewInterceptedRequests()  // 查看所有攔截的請求');
  console.log('  - _viewJsonLdData()           // 查看 JSON-LD 航班資料');
  console.log('\n💡 下一步操作：');
  console.log('1. 重新載入頁面（F5 或 Cmd+R）');
  console.log('2. 觀察 Console 中的輸出');
  console.log('3. 特別注意 [jQuery AJAX]、[FETCH] 或 [XHR] 的請求');
  console.log('4. 在 Network 標籤中搜尋：admin-ajax.php');
  console.log('5. 執行 _viewInterceptedRequests() 查看所有攔截的請求');
  console.log('6. 執行 _viewJsonLdData() 查看 JSON-LD 資料');
  console.log('\n');
})();
