/**
 * WordPress API 分析工具 - Bookmarklet 版本
 * 
 * 使用方法：
 * 1. 將下面的代碼複製
 * 2. 在瀏覽器中創建新書籤
 * 3. 將書籤的 URL 設為下面的代碼（去掉註解）
 * 4. 在任何頁面上點擊書籤即可執行
 * 
 * 或者使用 Chrome DevTools Snippets：
 * 1. 打開 DevTools (F12)
 * 2. 切換到 Sources 標籤
 * 3. 點擊左側的 Snippets
 * 4. 創建新 Snippet，貼上代碼
 * 5. 右鍵點擊 Snippet，選擇 "Run"
 */

(function() {
  if (window._wpApiAnalyzerRunning) {
    console.log('⚠️ 腳本已在運行中');
    return;
  }
  window._wpApiAnalyzerRunning = true;
  
  console.log('🔍 開始分析 WordPress 網站的航班 API...\n');

  // ============================================
  // 1. 檢查 WordPress 環境
  // ============================================
  console.log('📋 檢查 WordPress 環境...\n');

  const wpChecks = {
    hasAjaxUrl: !!window.ajaxurl,
    hasWp: !!window.wp,
    hasJQuery: !!window.jQuery,
    hasAdminAjax: document.querySelector('script[src*="admin-ajax"]') !== null
  };

  console.log('WordPress 環境檢查：', wpChecks);

  if (window.ajaxurl) {
    console.log('✅ 找到 ajaxurl:', window.ajaxurl);
  }

  if (window.wp) {
    console.log('✅ 找到 wp 物件，包含：', Object.keys(window.wp || {}));
  }

  if (window.jQuery) {
    console.log('✅ 找到 jQuery，版本：', window.jQuery.fn.jquery);
  }

  // ============================================
  // 2. 攔截 jQuery AJAX 請求（WordPress 常用）
  // ============================================
  if (window.jQuery) {
    console.log('\n📡 攔截 jQuery AJAX 請求...\n');
    
    const originalAjax = window.jQuery.ajax;
    window.jQuery.ajax = function(options) {
      const url = options.url || '';
      
      // 特別關注 admin-ajax.php 和包含 api/flight/gate 的請求
      if (url.includes('admin-ajax') || 
          url.includes('api') || 
          url.includes('flight') || 
          url.includes('gate') ||
          url.includes('departure') ||
          url.includes('taoyuan') ||
          url.includes('airport')) {
        
        console.log('📡 [jQuery AJAX]', {
          url: url,
          method: options.type || 'GET',
          data: options.data,
          action: options.data?.action || 'N/A'
        });
        
        // 攔截成功回應
        const originalSuccess = options.success;
        options.success = function(data, textStatus, jqXHR) {
          console.log('📥 [jQuery AJAX RESPONSE]', {
            url: url,
            status: jqXHR.status,
            data: data,
            dataType: typeof data
          });
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
            error: errorThrown
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

  // ============================================
  // 3. 攔截 fetch 請求
  // ============================================
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    const urlStr = typeof url === 'string' ? url : url.url || url.toString();
    
    if (urlStr.includes('admin-ajax') || 
        urlStr.includes('api') || 
        urlStr.includes('flight') || 
        urlStr.includes('gate') ||
        urlStr.includes('departure') ||
        urlStr.includes('taoyuan') ||
        urlStr.includes('airport')) {
      
      console.log('📡 [FETCH]', {
        url: urlStr,
        method: args[1]?.method || 'GET'
      });
    }
    
    return originalFetch.apply(this, args)
      .then(response => {
        if (urlStr.includes('admin-ajax') || 
            urlStr.includes('api') || 
            urlStr.includes('flight') || 
            urlStr.includes('gate') ||
            urlStr.includes('departure') ||
            urlStr.includes('taoyuan') ||
            urlStr.includes('airport')) {
          
          response.clone().json().then(data => {
            console.log('📥 [FETCH RESPONSE]', {
              url: urlStr,
              data: data
            });
          }).catch(() => {
            response.clone().text().then(text => {
              if (text.length < 1000) {
                console.log('📥 [FETCH RESPONSE - TEXT]', {
                  url: urlStr,
                  preview: text.substring(0, 500)
                });
              }
            });
          });
        }
        return response;
      });
  };

  // ============================================
  // 4. 攔截 XMLHttpRequest
  // ============================================
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
    
    if (url.includes('admin-ajax') || 
        url.includes('api') || 
        url.includes('flight') || 
        url.includes('gate') ||
        url.includes('departure') ||
        url.includes('taoyuan') ||
        url.includes('airport')) {
      
      console.log('📡 [XHR]', {
        method: xhr._interceptedMethod,
        url: url
      });
      
      xhr.addEventListener('load', function() {
        try {
          const response = xhr.responseType === 'json' ? xhr.response : JSON.parse(xhr.responseText);
          console.log('📥 [XHR RESPONSE]', {
            method: xhr._interceptedMethod,
            url: url,
            status: xhr.status,
            data: response
          });
        } catch (e) {
          if (xhr.responseText && xhr.responseText.length < 1000) {
            console.log('📥 [XHR RESPONSE - TEXT]', {
              method: xhr._interceptedMethod,
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

  // ============================================
  // 5. 搜尋頁面中的 admin-ajax 呼叫
  // ============================================
  console.log('\n🔎 搜尋頁面中的 admin-ajax 相關代碼...\n');

  const scripts = document.querySelectorAll('script');
  scripts.forEach((script, index) => {
    if (script.textContent) {
      const content = script.textContent;
      
      // 搜尋 admin-ajax.php
      if (content.includes('admin-ajax')) {
        const matches = content.match(/admin-ajax\.php[^\s"'`]*/gi);
        if (matches) {
          console.log(`📜 Script ${index + 1} 找到 admin-ajax 呼叫:`, matches);
        }
        
        // 搜尋 action 參數
        const actionMatches = content.match(/action\s*[:=]\s*['"]([^'"]+)['"]/gi);
        if (actionMatches) {
          console.log(`📜 Script ${index + 1} 找到 action 參數:`, actionMatches);
        }
      }
    }
  });

  // ============================================
  // 6. 檢查頁面載入時的資料
  // ============================================
  console.log('\n🔎 檢查頁面中的初始資料...\n');

  // 搜尋包含航班資料的 script 標籤（可能是 JSON）
  scripts.forEach((script, index) => {
    if (script.textContent) {
      const content = script.textContent.trim();
      
      // 檢查是否為 JSON 資料
      if (content.startsWith('{') || content.startsWith('[')) {
        try {
          const data = JSON.parse(content);
          // 檢查是否包含航班相關資料
          const dataStr = JSON.stringify(data).toLowerCase();
          if (dataStr.includes('flight') || 
              dataStr.includes('gate') || 
              dataStr.includes('departure') ||
              dataStr.includes('d11') ||
              dataStr.includes('d18')) {
            console.log(`📜 Script ${index + 1} 包含航班資料:`, data);
          }
        } catch (e) {
          // 不是有效的 JSON
        }
      }
    }
  });

  // ============================================
  // 7. 檢查 data 屬性
  // ============================================
  console.log('\n🔎 檢查頁面元素的資料屬性...\n');

  const dataElements = document.querySelectorAll('[data-action], [data-api], [data-endpoint]');
  if (dataElements.length > 0) {
    console.log(`找到 ${dataElements.length} 個包含資料屬性的元素`);
    dataElements.slice(0, 10).forEach((el, index) => {
      const attrs = Array.from(el.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .map(attr => `${attr.name}="${attr.value}"`)
        .join(', ');
      console.log(`  - ${el.tagName}: ${attrs}`);
    });
  }

  // ============================================
  // 總結
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ 監控已啟動！');
  console.log('='.repeat(60));
  console.log('\n💡 下一步操作：');
  console.log('1. 重新載入頁面（F5 或 Cmd+R）');
  console.log('2. 觀察 Console 中的輸出');
  console.log('3. 特別注意標記為 [jQuery AJAX]、[FETCH] 或 [XHR] 的請求');
  console.log('4. 如果看到 admin-ajax.php，檢查其 action 參數');
  console.log('5. 在 Network 標籤中搜尋：admin-ajax, wp-json, api');
  console.log('\n');
})();
