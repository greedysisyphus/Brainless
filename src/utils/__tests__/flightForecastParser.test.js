import { describe, it, expect, beforeAll } from 'vitest';
import { getFlightForecast } from '../flightForecastParser';
import { readTestFile, readTestFileContent } from './testUtils';
import dayjs from 'dayjs';

describe('flightForecastParser', () => {
  beforeAll(() => {
    // 輸出 XLS 檔案的實際內容以便調試
    const content = readTestFileContent('2024_12_15.xls');
    console.log('XLS Content:', JSON.stringify(content, null, 2));
  });

  it('should parse real XLS file correctly', async () => {
    const testBuffer = readTestFile('2024_12_15.xls');
    const result = await getFlightForecast(testBuffer);
    
    // 輸出實際數據以供檢查
    console.log('Today\'s forecast:', result.today);
    console.log('Tomorrow\'s forecast:', result.tomorrow);
    
    // 基本格式檢查
    expect(result).toBeTruthy();
    expect(result).toHaveProperty('today');
    expect(result).toHaveProperty('tomorrow');
    
    // 檢查今天的數據
    if (result.today) {
      expect(Array.isArray(result.today)).toBe(true);
      result.today.forEach(item => {
        expect(item).toHaveProperty('time');
        expect(item).toHaveProperty('quantity');
        expect(item.time).toMatch(/^([01]\d|2[0-3]):00$/);
        expect(item.quantity).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(item.quantity)).toBe(true);
      });
    }
  });

  it('should handle missing files gracefully', async () => {
    const result = await getFlightForecast(null);  // 修改這裡，傳入 null 而不是日期字串
    expect(result).not.toBeNull();
    expect(result.today).toBeNull();
    expect(result.tomorrow).toBeNull();
  });

  it('should parse data in correct order', async () => {
    const testBuffer = readTestFile('2024_12_15.xls');  // 使用測試檔案
    const result = await getFlightForecast(testBuffer);
    
    if (result.today) {
      // 檢查第一個和最後一個時間點
      expect(result.today[0].time).toBe('00:00');
      expect(result.today[23].time).toBe('23:00');
      
      // 檢查數據是否按時間順序排列
      for (let i = 1; i < result.today.length; i++) {
        const prevTime = parseInt(result.today[i-1].time);
        const currTime = parseInt(result.today[i].time);
        expect(currTime).toBeGreaterThan(prevTime);
      }
    }
  });
}); 