/**
 * 桃園機場 D11-D18 登機門航班資料 API 服務
 * 使用 Node.js + Express 提供 REST API
 */

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = 'https://yuann.tw/taoyuan-airport-d11-d18-departures/';

// 中間件
app.use(cors());
app.use(express.json());

// 快取（簡單的記憶體快取）
const cache = {
  data: null,
  timestamp: null,
  ttl: 15 * 60 * 1000 // 15 分鐘
};

/**
 * 獲取指定登機門的航班資料
 */
async function getFlightData(gate = null) {
  const url = gate ? `${BASE_URL}?flight_search=${gate}` : BASE_URL;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // 提取出發航班表格
    const departureData = extractTableData($, 'departure');
    
    // 提取抵達航班表格
    const arrivalData = extractTableData($, 'arrival');
    
    return {
      timestamp: new Date().toISOString(),
      gate: gate || 'ALL',
      url: url,
      departure: departureData,
      arrival: arrivalData,
      summary: {
        departureCount: departureData.data.length,
        arrivalCount: arrivalData.data.length,
        totalCount: departureData.data.length + arrivalData.data.length
      }
    };
  } catch (error) {
    throw new Error(`獲取資料失敗: ${error.message}`);
  }
}

/**
 * 提取表格資料
 */
function extractTableData($, flightType) {
  const tables = $('table.flight-table');
  let targetTable = null;
  
  tables.each((index, table) => {
    const tableText = $(table).text().toLowerCase();
    const isDeparture = tableText.includes('出發時間') || tableText.includes('出發');
    const isArrival = tableText.includes('抵達時間') || tableText.includes('抵達');
    
    if ((flightType === 'departure' && isDeparture) || 
        (flightType === 'arrival' && isArrival)) {
      targetTable = table;
      return false; // 跳出迴圈
    }
  });
  
  if (!targetTable) {
    return {
      type: flightType,
      headers: [],
      data: []
    };
  }
  
  // 提取表頭
  const headers = [];
  $(targetTable).find('thead th').each((index, th) => {
    const link = $(th).find('a');
    if (link.length) {
      headers.push(link.text().trim());
    } else {
      headers.push($(th).text().trim());
    }
  });
  
  // 提取資料行
  const data = [];
  $(targetTable).find('tbody tr').each((index, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 6) {
      const rowData = parseRow($, cells, flightType);
      if (rowData) {
        data.push(rowData);
      }
    }
  });
  
  return {
    type: flightType,
    headers: headers,
    data: data,
    rowCount: data.length
  };
}

/**
 * 解析表格行
 */
function parseRow($, cells, flightType) {
  try {
    const rowData = {
      type: flightType
    };
    
    // 時間
    rowData.time = $(cells[0]).text().trim();
    
    // 航班代號
    const flightCell = $(cells[1]);
    const flightLink = flightCell.find('a[href*="flightradar24.com"]');
    if (flightLink.length) {
      rowData.flightCode = flightLink.text().trim();
    } else {
      rowData.flightCode = flightCell.text().trim().split('\n')[0];
    }
    
    // 航空公司
    const airlineSpan = flightCell.find('.codeshare-name');
    if (airlineSpan.length) {
      rowData.airline = airlineSpan.text().trim().replace(/[()]/g, '');
    } else {
      rowData.airline = '';
    }
    
    // 完整航班資訊
    rowData.fullFlightInfo = flightCell.text().trim();
    
    // 航廈-櫃台/行李轉盤
    rowData.terminal = $(cells[2]).text().trim();
    
    // 登機門
    rowData.gate = $(cells[3]).text().trim();
    
    // 目的地/出發地
    const destCell = $(cells[4]);
    const citySmall = destCell.find('small');
    const codeStrong = destCell.find('strong');
    
    if (citySmall.length && codeStrong.length) {
      rowData.city = citySmall.text().trim();
      rowData.airportCode = codeStrong.text().trim();
    } else {
      rowData.city = '';
      rowData.airportCode = '';
    }
    
    rowData.fullDestination = destCell.text().trim();
    
    // 狀態
    const statusCell = $(cells[5]);
    const statusSpan = statusCell.find('span[class*="status"]');
    if (statusSpan.length) {
      rowData.status = statusSpan.text().trim();
      rowData.statusClass = statusSpan.attr('class') || '';
    } else {
      rowData.status = statusCell.text().trim();
      rowData.statusClass = '';
    }
    
    return rowData;
  } catch (error) {
    console.error('解析行資料時發生錯誤:', error);
    return null;
  }
}

/**
 * 檢查快取是否有效
 */
function isCacheValid() {
  if (!cache.data || !cache.timestamp) {
    return false;
  }
  return (Date.now() - cache.timestamp) < cache.ttl;
}

// ============================================
// API 路由
// ============================================

/**
 * GET /api/flights
 * 獲取所有登機門的資料（或指定登機門）
 * 
 * Query Parameters:
 *   - gate: 登機門代號 (D11-D18)，可選
 */
app.get('/api/flights', async (req, res) => {
  try {
    const gate = req.query.gate || null;
    
    // 檢查快取（僅限於沒有指定登機門的情況）
    if (!gate && isCacheValid()) {
      return res.json({
        ...cache.data,
        cached: true
      });
    }
    
    const data = await getFlightData(gate);
    
    // 更新快取（僅限於沒有指定登機門的情況）
    if (!gate) {
      cache.data = data;
      cache.timestamp = Date.now();
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/flights/:gate
 * 獲取指定登機門的資料
 */
app.get('/api/flights/:gate', async (req, res) => {
  try {
    const gate = req.params.gate.toUpperCase();
    
    // 驗證登機門格式
    if (!/^D1[1-8]$/.test(gate)) {
      return res.status(400).json({
        error: '無效的登機門代號，請使用 D11-D18'
      });
    }
    
    const data = await getFlightData(gate);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/flights/all
 * 獲取所有登機門 (D11-D18) 的資料
 */
app.get('/api/flights/all', async (req, res) => {
  try {
    const gates = ['D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18'];
    const results = [];
    
    // 並行獲取所有登機門的資料（但限制並發數）
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let i = 0; i < gates.length; i++) {
      const gate = gates[i];
      try {
        const data = await getFlightData(gate);
        results.push(data);
        
        // 延遲以避免請求過快
        if (i < gates.length - 1) {
          await delay(500);
        }
      } catch (error) {
        results.push({
          gate: gate,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // 統計資訊
    const summary = {
      totalGates: results.length,
      totalDepartures: results.reduce((sum, d) => sum + (d.summary?.departureCount || 0), 0),
      totalArrivals: results.reduce((sum, d) => sum + (d.summary?.arrivalCount || 0), 0),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      summary: summary,
      gates: results
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health
 * 健康檢查
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: {
      hasCache: !!cache.data,
      cacheAge: cache.timestamp ? Math.floor((Date.now() - cache.timestamp) / 1000) : null
    }
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 航班資料 API 服務已啟動`);
  console.log(`📍 服務地址: http://localhost:${PORT}`);
  console.log(`📚 API 文件:`);
  console.log(`   GET /api/flights?gate=D11     - 獲取指定登機門的資料`);
  console.log(`   GET /api/flights              - 獲取所有登機門的資料`);
  console.log(`   GET /api/flights/:gate        - 獲取指定登機門的資料`);
  console.log(`   GET /api/flights/all          - 獲取所有登機門 (D11-D18) 的資料`);
  console.log(`   GET /api/health               - 健康檢查`);
});
