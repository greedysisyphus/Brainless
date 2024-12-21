import * as XLSX from 'xlsx';

// 讀取 XLS 檔案內容的輔助函數
async function readXlsContent(filePath) {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    return data;
  } catch (error) {
    console.error('Error reading XLS file:', error);
    return null;
  }
}

// 使用方式
const data = await readXlsContent('/data/2024_12_15.xls');
console.log('XLS Content:', data); 