import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function readTestFile(fileName) {
  const filePath = join(__dirname, '../../../public/data', fileName);
  const buffer = readFileSync(filePath);
  return buffer;
}

export function readTestFileContent(fileName) {
  const buffer = readTestFile(fileName);
  const workbook = XLSX.read(buffer);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  return data;
} 