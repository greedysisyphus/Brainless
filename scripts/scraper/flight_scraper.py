#!/usr/bin/env python3
"""
桃園機場 D11-D18 登機門航班資料爬蟲
從 yuann.tw 網站抓取航班資料
"""

import requests
from bs4 import BeautifulSoup
import json
import time
from datetime import datetime
from typing import List, Dict, Optional
import re

class TaoyuanAirportFlightScraper:
    """桃園機場航班資料爬蟲"""
    
    BASE_URL = "https://yuann.tw/taoyuan-airport-d11-d18-departures/"
    
    def __init__(self, delay: float = 0.5):
        """
        初始化爬蟲
        
        Args:
            delay: 請求之間的延遲時間（秒），避免對伺服器造成負擔
        """
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
    
    def get_flight_data(self, gate: str = None) -> Dict:
        """
        獲取指定登機門的航班資料
        
        Args:
            gate: 登機門代號 (D11-D18)，如果為 None 則獲取所有登機門的資料
        
        Returns:
            包含出發和抵達航班資料的字典
        """
        url = self.BASE_URL
        if gate:
            url += f"?flight_search={gate}"
        
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            response.encoding = 'utf-8'
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 提取出發航班表格
            departure_data = self._extract_table_data(soup, 'departure')
            
            # 提取抵達航班表格
            arrival_data = self._extract_table_data(soup, 'arrival')
            
            return {
                'timestamp': datetime.now().isoformat(),
                'gate': gate or 'ALL',
                'url': url,
                'departure': departure_data,
                'arrival': arrival_data,
                'summary': {
                    'departure_count': len(departure_data.get('data', [])),
                    'arrival_count': len(arrival_data.get('data', [])),
                    'total_count': len(departure_data.get('data', [])) + len(arrival_data.get('data', []))
                }
            }
        except Exception as e:
            return {
                'error': str(e),
                'gate': gate,
                'timestamp': datetime.now().isoformat()
            }
    
    def _extract_table_data(self, soup: BeautifulSoup, flight_type: str) -> Dict:
        """
        提取表格資料
        
        Args:
            soup: BeautifulSoup 物件
            flight_type: 'departure' 或 'arrival'
        
        Returns:
            包含表格資料的字典
        """
        tables = soup.find_all('table', class_='flight-table')
        
        for table in tables:
            # 根據表格內容判斷是出發還是抵達
            table_text = table.get_text().lower()
            is_departure = '出發時間' in table_text or '出發' in table_text
            is_arrival = '抵達時間' in table_text or '抵達' in table_text
            
            if (flight_type == 'departure' and is_departure) or \
               (flight_type == 'arrival' and is_arrival):
                return self._parse_table(table, flight_type)
        
        # 如果找不到對應的表格，返回空資料
        return {
            'type': flight_type,
            'headers': [],
            'data': []
        }
    
    def _parse_table(self, table, flight_type: str) -> Dict:
        """
        解析表格
        
        Args:
            table: BeautifulSoup 表格元素
            flight_type: 'departure' 或 'arrival'
        
        Returns:
            包含表格資料的字典
        """
        # 提取表頭
        headers = []
        thead = table.find('thead')
        if thead:
            header_cells = thead.find_all('th')
            for cell in header_cells:
                # 移除排序連結，只保留文字
                link = cell.find('a')
                if link:
                    headers.append(link.get_text(strip=True))
                else:
                    headers.append(cell.get_text(strip=True))
        
        # 提取資料行
        data = []
        tbody = table.find('tbody')
        if tbody:
            rows = tbody.find_all('tr')
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 6:
                    row_data = self._parse_row(cells, flight_type)
                    if row_data:
                        data.append(row_data)
        
        return {
            'type': flight_type,
            'headers': headers,
            'data': data,
            'row_count': len(data)
        }
    
    def _parse_row(self, cells, flight_type: str) -> Optional[Dict]:
        """
        解析表格行
        
        Args:
            cells: 表格單元格列表
            flight_type: 'departure' 或 'arrival'
        
        Returns:
            解析後的資料字典
        """
        try:
            row_data = {
                'type': flight_type
            }
            
            # 時間
            time_cell = cells[0].get_text(strip=True)
            row_data['time'] = time_cell
            
            # 航班代號
            flight_cell = cells[1]
            flight_link = flight_cell.find('a', href=re.compile(r'flightradar24\.com'))
            if flight_link:
                row_data['flight_code'] = flight_link.get_text(strip=True)
            else:
                row_data['flight_code'] = flight_cell.get_text(strip=True).split('\n')[0]
            
            # 航空公司
            airline_span = flight_cell.find('span', class_='codeshare-name')
            if airline_span:
                row_data['airline'] = airline_span.get_text(strip=True).replace('(', '').replace(')', '')
            else:
                row_data['airline'] = ''
            
            # 完整航班資訊
            row_data['full_flight_info'] = flight_cell.get_text(strip=True)
            
            # 航廈-櫃台/行李轉盤
            row_data['terminal'] = cells[2].get_text(strip=True)
            
            # 登機門
            row_data['gate'] = cells[3].get_text(strip=True)
            
            # 目的地/出發地
            dest_cell = cells[4]
            city_small = dest_cell.find('small')
            code_strong = dest_cell.find('strong')
            
            if city_small and code_strong:
                row_data['city'] = city_small.get_text(strip=True)
                row_data['airport_code'] = code_strong.get_text(strip=True)
            else:
                row_data['city'] = ''
                row_data['airport_code'] = ''
            
            row_data['full_destination'] = dest_cell.get_text(strip=True)
            
            # 狀態
            status_span = dest_cell.find_next('td').find('span', class_=re.compile(r'status'))
            if status_span:
                row_data['status'] = status_span.get_text(strip=True)
                row_data['status_class'] = ' '.join(status_span.get('class', []))
            else:
                row_data['status'] = cells[5].get_text(strip=True)
                row_data['status_class'] = ''
            
            return row_data
        except Exception as e:
            print(f"解析行資料時發生錯誤: {e}")
            return None
    
    def get_all_gates(self, gates: List[str] = None) -> List[Dict]:
        """
        獲取多個登機門的資料
        
        Args:
            gates: 登機門代號列表，如果為 None 則獲取 D11-D18 所有登機門
        
        Returns:
            所有登機門的資料列表
        """
        if gates is None:
            gates = [f'D{i}' for i in range(11, 19)]
        
        results = []
        for gate in gates:
            print(f"正在獲取 {gate} 的資料...")
            data = self.get_flight_data(gate)
            results.append(data)
            
            # 延遲以避免請求過快
            if self.delay > 0:
                time.sleep(self.delay)
        
        return results
    
    def save_to_json(self, data: Dict, filename: str = None):
        """
        將資料儲存為 JSON 檔案
        
        Args:
            data: 要儲存的資料
            filename: 檔案名稱，如果為 None 則自動生成
        """
        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            gate = data.get('gate', 'ALL')
            filename = f'flight_data_{gate}_{timestamp}.json'
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"資料已儲存到 {filename}")
    
    def save_all_to_json(self, data_list: List[Dict], filename: str = None):
        """
        將多個登機門的資料儲存為 JSON 檔案
        
        Args:
            data_list: 資料列表
            filename: 檔案名稱，如果為 None 則自動生成
        """
        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'flight_data_all_gates_{timestamp}.json'
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data_list, f, ensure_ascii=False, indent=2)
        
        print(f"資料已儲存到 {filename}")


def main():
    """主函數 - 使用範例"""
    scraper = TaoyuanAirportFlightScraper(delay=0.5)
    
    # 範例 1: 獲取單個登機門的資料
    print("=" * 60)
    print("範例 1: 獲取 D11 登機門的資料")
    print("=" * 60)
    d11_data = scraper.get_flight_data('D11')
    print(json.dumps(d11_data, ensure_ascii=False, indent=2))
    scraper.save_to_json(d11_data)
    
    # 範例 2: 獲取所有登機門的資料
    print("\n" + "=" * 60)
    print("範例 2: 獲取所有登機門 (D11-D18) 的資料")
    print("=" * 60)
    all_data = scraper.get_all_gates()
    print(f"共獲取 {len(all_data)} 個登機門的資料")
    
    # 統計資訊
    total_departures = sum(d.get('summary', {}).get('departure_count', 0) for d in all_data)
    total_arrivals = sum(d.get('summary', {}).get('arrival_count', 0) for d in all_data)
    print(f"總出發航班數: {total_departures}")
    print(f"總抵達航班數: {total_arrivals}")
    print(f"總航班數: {total_departures + total_arrivals}")
    
    scraper.save_all_to_json(all_data)


if __name__ == '__main__':
    main()
