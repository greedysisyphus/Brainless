import * as XLSX from 'xlsx';
import { db } from '../firebase.js';
import { setDoc, doc } from 'firebase/firestore';
import dayjs from 'dayjs';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function importXlsToFirebase(fileName) {
  try {
    // 讀取 XLS 檔案
    const filePath = join(__dirname, '../../public/data', fileName);
    const buffer = readFileSync(filePath);
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // 找到第二航廈的列索引
    const terminal2ColumnIndex = data[1].findIndex(cell => 
      cell && cell.includes('桃園國際機場航班運量整點人次預報表(第二航廈)'));

    if (terminal2ColumnIndex === -1) {
      throw new Error('無法找到第二航廈數據');
    }

    // 計算總出境人數
    let totalPassengers = 0;
    const rows = data.slice(3);
    for (const row of rows) {
      if (row[0] && !row[0].includes('小計') && !row[0].includes('總人次') && !row[0].includes('＊本系統')) {
        const passengers = parseInt(row[terminal2ColumnIndex + 2] || 0);
        if (!isNaN(passengers)) {
          totalPassengers += passengers;
        }
      }
    }

    // 從檔名取得日期 (假設檔名格式為 YYYY_MM_DD.xls)
    const dateStr = fileName.split('.')[0];
    const date = dayjs(dateStr.replace(/_/g, '-')); // 將 YYYY_MM_DD 轉換為 YYYY-MM-DD
    const formattedDate = date.format('YYYY-MM-DD');

    // 設置正確的時間戳 (使用實際日期，而不是當前時間)
    const timestamp = date.startOf('day').valueOf();

    console.log(`Importing ${fileName}:`, {
      date: formattedDate,
      passengers: totalPassengers,
      timestamp: timestamp
    });

    // 儲存到 Firebase
    await setDoc(doc(db, 'forecasts', formattedDate), {
      date: formattedDate,
      passengerCount: totalPassengers,
      timestamp: timestamp
    });

    console.log(`成功導入 ${fileName} 的數據：${totalPassengers} 人`);
    return true;
  } catch (error) {
    console.error(`導入 ${fileName} 時發生錯誤:`, error);
    return false;
  }
}

// 導入所有檔案
async function importAllFiles() {
  try {
    const dataDir = join(__dirname, '../../public/data');
    const files = readdirSync(dataDir)
      .filter(file => file.endsWith('.xls'))
      .sort(); // 按檔名排序
    
    console.log(`找到 ${files.length} 個 XLS 檔案`);
    
    let successCount = 0;
    for (const file of files) {
      const success = await importXlsToFirebase(file);
      if (success) successCount++;
    }
    
    console.log(`導入完成：成功 ${successCount}/${files.length} 個檔案`);
  } catch (error) {
    console.error('導入過程中發生錯誤:', error);
  }
}

// 執行導入
importAllFiles(); 