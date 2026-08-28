/**
 * 航班資料讀取器 - 用於 GitHub Pages
 * 從 data 目錄讀取 JSON 檔案
 */

class FlightDataReader {
  constructor(basePath = './data') {
    this.basePath = basePath;
  }

  /**
   * 獲取指定日期的資料
   * @param {string} date - 日期 (格式: YYYY-MM-DD，例如 "2026-02-01")
   * @returns {Promise<Object>}
   */
  async getDateData(date) {
    try {
      const response = await fetch(`${this.basePath}/flight-data-${date}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`獲取 ${date} 資料失敗:`, error);
      throw error;
    }
  }

  /**
   * 獲取指定登機門的資料（已廢棄，改用 getDateData）
   * @deprecated 使用 getDateData 代替
   */
  async getGateData(gate) {
    console.warn('getGateData 已廢棄，請使用 getDateData 獲取按日期分組的資料');
    throw new Error('此方法已不再支援，請使用 getDateData(date)');
  }

  /**
   * 獲取所有日期的資料列表
   * @returns {Promise<Array>} 所有日期的資料陣列
   */
  async getAllDatesData() {
    try {
      const summary = await this.getSummary();
      const dates = summary.dates || [];
      
      const promises = dates.map(date => this.getDateData(date));
      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            date: dates[index],
            error: result.reason.message
          };
        }
      });
    } catch (error) {
      console.error('獲取所有日期資料失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取所有登機門的資料（已廢棄，改用 getAllDatesData）
   * @deprecated 使用 getAllDatesData 代替
   */
  async getAllGatesData() {
    console.warn('getAllGatesData 已廢棄，請使用 getAllDatesData 獲取按日期分組的資料');
    return this.getAllDatesData();
  }

  /**
   * 獲取摘要資訊
   * @returns {Promise<Object>}
   */
  async getSummary() {
    try {
      const response = await fetch(`${this.basePath}/flight-data-summary.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('獲取摘要資訊失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取多個指定日期的資料
   * @param {Array<string>} dates - 日期陣列 (格式: YYYY-MM-DD)
   * @returns {Promise<Array>}
   */
  async getMultipleDatesData(dates) {
    const promises = dates.map(date => this.getDateData(date));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          date: dates[index],
          error: result.reason.message
        };
      }
    });
  }
}

// 如果是在瀏覽器環境，將類別暴露到全域
if (typeof window !== 'undefined') {
  window.FlightDataReader = FlightDataReader;
}

// 如果是在 Node.js 環境，匯出模組
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FlightDataReader;
}
