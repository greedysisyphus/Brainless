#!/usr/bin/env python3
"""
桃園機場官方網站航班資料爬蟲
從 https://www.taoyuan-airport.com 直接獲取航班資料
"""

import requests
from bs4 import BeautifulSoup
import json
import time
from datetime import datetime
from typing import List, Dict, Optional
import re
from collections import defaultdict

class TaoyuanAirportOfficialScraper:
    """桃園機場官方網站航班資料爬蟲"""
    
    BASE_URL = "https://www.taoyuan-airport.com"
    
    def __init__(self, delay: float = 0.5):
        """
        初始化爬蟲
        
        Args:
            delay: 請求之間的延遲時間（秒），避免對伺服器造成負擔
        """
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
            'Referer': 'https://www.taoyuan-airport.com/'
        })
    
    def get_departure_flights(self, gate: str = None, time_range: str = None) -> Dict:
        """
        獲取出發航班資料
        
        Args:
            gate: 登機門代號 (D11-D18)，如果為 None 則獲取所有登機門
            time_range: 時間範圍，格式如 "14:00-15:59"
        
        Returns:
            包含出發航班資料的字典
        """
        url = f"{self.BASE_URL}/flight_depart"
        params = {}
        
        if gate:
            params['k'] = gate  # 可能是關鍵字搜尋
        if time_range:
            params['time'] = time_range
        
        try:
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            response.encoding = 'utf-8'
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 提取表格資料
            departure_data = self._extract_table_data(soup, 'departure')
            
            return {
                'timestamp': datetime.now().isoformat(),
                'gate': gate or 'ALL',
                'time_range': time_range,
                'url': response.url,
                'departure': departure_data,
                'summary': {
                    'total_count': len(departure_data.get('data', []))
                }
            }
        except Exception as e:
            return {
                'error': str(e),
                'gate': gate,
                'time_range': time_range,
                'timestamp': datetime.now().isoformat()
            }
    
    def get_arrival_flights(self, gate: str = None, time_range: str = None) -> Dict:
        """
        獲取抵達航班資料
        
        Args:
            gate: 登機門代號 (D11-D18)，如果為 None 則獲取所有登機門
            time_range: 時間範圍，格式如 "14:00-15:59"
        
        Returns:
            包含抵達航班資料的字典
        """
        url = f"{self.BASE_URL}/flight_arrive"
        params = {}
        
        if gate:
            params['k'] = gate
        if time_range:
            params['time'] = time_range
        
        try:
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            response.encoding = 'utf-8'
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 提取表格資料
            arrival_data = self._extract_table_data(soup, 'arrival')
            
            return {
                'timestamp': datetime.now().isoformat(),
                'gate': gate or 'ALL',
                'time_range': time_range,
                'url': response.url,
                'arrival': arrival_data,
                'summary': {
                    'total_count': len(arrival_data.get('data', []))
                }
            }
        except Exception as e:
            return {
                'error': str(e),
                'gate': gate,
                'time_range': time_range,
                'timestamp': datetime.now().isoformat()
            }
    
    def _extract_table_data(self, soup: BeautifulSoup, flight_type: str) -> Dict:
        """
        從 HTML 中提取表格資料
        
        Args:
            soup: BeautifulSoup 物件
            flight_type: 'departure' 或 'arrival'
        
        Returns:
            包含表格資料的字典
        """
        data = []
        
        # 尋找所有表格
        tables = soup.find_all('table')
        
        for table in tables:
            # 檢查表格是否包含航班資料
            table_text = table.get_text().lower()
            if 'flight' not in table_text and '航班' not in table_text:
                continue
            
            # 提取表頭
            headers = []
            header_row = table.find('thead')
            if header_row:
                header_cells = header_row.find_all(['th', 'td'])
                headers = [cell.get_text(strip=True) for cell in header_cells]
            else:
                # 如果沒有 thead，嘗試從第一行獲取
                first_row = table.find('tr')
                if first_row:
                    header_cells = first_row.find_all(['th', 'td'])
                    headers = [cell.get_text(strip=True) for cell in header_cells]
            
            # 提取資料行
            rows = table.find_all('tr')[1:] if header_row else table.find_all('tr')
            
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) < 2:  # 至少需要 2 個欄位
                    continue
                
                row_data = {}
                for i, cell in enumerate(cells):
                    header = headers[i] if i < len(headers) else f'column_{i}'
                    value = cell.get_text(strip=True)
                    row_data[header] = value
                
                # 標準化欄位名稱
                flight_info = self._normalize_flight_data(row_data, flight_type)
                if flight_info:
                    data.append(flight_info)
        
        return {
            'data': data,
            'row_count': len(data)
        }
    
    def _normalize_flight_data(self, row_data: Dict, flight_type: str) -> Optional[Dict]:
        """
        標準化航班資料格式
        
        Args:
            row_data: 原始表格資料
            flight_type: 'departure' 或 'arrival'
        
        Returns:
            標準化的航班資料字典
        """
        # 嘗試從不同可能的欄位名稱中提取資料
        flight_code = (
            row_data.get('航班', '') or 
            row_data.get('flight', '') or 
            row_data.get('航班號', '') or
            row_data.get('flight_code', '') or
            row_data.get('flight number', '')
        )
        
        if not flight_code:
            return None
        
        # 提取時間
        time_key = '出發時間' if flight_type == 'departure' else '抵達時間'
        time_str = (
            row_data.get(time_key, '') or
            row_data.get('time', '') or
            row_data.get('時間', '') or
            row_data.get('departure time' if flight_type == 'departure' else 'arrival time', '')
        )
        
        # 提取登機門
        gate = (
            row_data.get('登機門', '') or
            row_data.get('gate', '') or
            row_data.get('登機門號', '') or
            row_data.get('gate number', '')
        )
        
        # 提取航空公司
        airline = (
            row_data.get('航空公司', '') or
            row_data.get('airline', '') or
            row_data.get('航空公司名稱', '')
        )
        
        # 提取目的地/出發地
        if flight_type == 'departure':
            destination = (
                row_data.get('目的地', '') or
                row_data.get('destination', '') or
                row_data.get('前往', '')
            )
        else:
            destination = (
                row_data.get('出發地', '') or
                row_data.get('origin', '') or
                row_data.get('來自', '')
            )
        
        # 提取狀態
        status = (
            row_data.get('狀態', '') or
            row_data.get('status', '') or
            row_data.get('flight status', '')
        )
        
        return {
            'flight_code': flight_code.strip(),
            'time': time_str.strip(),
            'gate': gate.strip(),
            'airline': airline.strip(),
            'destination' if flight_type == 'departure' else 'origin': destination.strip(),
            'status': status.strip()
        }
    
    def check_api_endpoints(self) -> Dict:
        """
        檢查可能的 API 端點
        
        Returns:
            包含找到的 API 端點的字典
        """
        endpoints = {
            'found': [],
            'tested': []
        }
        
        possible_endpoints = [
            '/api/flight',
            '/api/flights',
            '/api/depart',
            '/api/departure',
            '/api/arrive',
            '/api/arrival',
            '/api/gate',
            '/flight/api',
            '/api/v1/flight',
            '/rest/flight'
        ]
        
        for endpoint in possible_endpoints:
            url = f"{self.BASE_URL}{endpoint}"
            endpoints['tested'].append(url)
            
            try:
                response = self.session.head(url, timeout=5, allow_redirects=False)
                if response.status_code in [200, 405]:  # 405 表示端點存在但不支援 HEAD
                    endpoints['found'].append({
                        'url': url,
                        'status': response.status_code
                    })
            except:
                pass
        
        return endpoints


def parse_time(time_str: str, current_year: int) -> Optional[datetime]:
    """解析時間字串，處理 'M/D HH:MM' 格式，並假設年份"""
    match = re.match(r'(\d{1,2})/(\d{1,2})\s*(\d{1,2}):(\d{2})', time_str)
    if match:
        month, day, hour, minute = map(int, match.groups())
        try:
            dt = datetime(current_year, month, day, hour, minute)
            return dt
        except ValueError:
            try:
                dt = datetime(current_year + 1, month, day, hour, minute)
                return dt
            except ValueError:
                pass
    return None


def format_time_for_display(dt: datetime) -> str:
    """格式化時間為顯示格式"""
    return dt.strftime('%H:%M')


def organize_by_date(all_data: List[Dict]) -> Dict:
    """按日期組織航班資料，並計算 17:00 前後的班次數量"""
    date_data = defaultdict(lambda: {
        "flights": [],
        "summary": {
            "before_17:00": 0,
            "after_17:00": 0
        }
    })
    
    current_year = datetime.now().year
    
    for gate_data in all_data:
        if 'error' in gate_data:
            continue
        
        gate = gate_data.get('gate', 'UNKNOWN')
        
        # 處理出發航班
        for flight in gate_data.get('departure', {}).get('data', []):
            time_str = flight.get('time', '')
            dt = parse_time(time_str, current_year)
            
            if dt:
                date_key = dt.strftime('%Y-%m-%d')
                time_display = format_time_for_display(dt)
                
                flight_entry = {
                    "time": time_display,
                    "datetime": dt.isoformat(),
                    "gate": gate,
                    "flight_code": flight.get('flight_code', ''),
                    "airline": flight.get('airline', ''),
                    "type": "departure",
                    "destination": flight.get('destination', ''),
                    "status": flight.get('status', '')
                }
                date_data[date_key]["flights"].append(flight_entry)
                
                if dt.hour < 17:
                    date_data[date_key]["summary"]["before_17:00"] += 1
                else:
                    date_data[date_key]["summary"]["after_17:00"] += 1
        
        # 處理抵達航班
        for flight in gate_data.get('arrival', {}).get('data', []):
            time_str = flight.get('time', '')
            dt = parse_time(time_str, current_year)
            
            if dt:
                date_key = dt.strftime('%Y-%m-%d')
                time_display = format_time_for_display(dt)
                
                flight_entry = {
                    "time": time_display,
                    "datetime": dt.isoformat(),
                    "gate": gate,
                    "flight_code": flight.get('flight_code', ''),
                    "airline": flight.get('airline', ''),
                    "type": "arrival",
                    "origin": flight.get('origin', ''),
                    "status": flight.get('status', '')
                }
                date_data[date_key]["flights"].append(flight_entry)
                
                if dt.hour < 17:
                    date_data[date_key]["summary"]["before_17:00"] += 1
                else:
                    date_data[date_key]["summary"]["after_17:00"] += 1
    
    # 對每個日期的航班進行排序
    for date_key in date_data:
        date_data[date_key]["flights"].sort(key=lambda x: (
            x.get("datetime", "") if x.get("datetime") else "9999-12-31T23:59:59"
        ))
    
    return dict(date_data)


if __name__ == '__main__':
    import os
    import sys
    
    # 確保 data 目錄存在
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    scraper = TaoyuanAirportOfficialScraper(delay=0.5)
    
    print('🔍 檢查桃園機場官方網站 API 端點...')
    api_endpoints = scraper.check_api_endpoints()
    print(f'   測試了 {len(api_endpoints["tested"])} 個可能的端點')
    if api_endpoints['found']:
        print(f'   ✅ 找到 {len(api_endpoints["found"])} 個可能的 API 端點:')
        for endpoint in api_endpoints['found']:
            print(f'      - {endpoint["url"]} (狀態: {endpoint["status"]})')
    else:
        print('   ⚠️  未找到公開的 API 端點，將使用網頁爬蟲方式')
    
    print('\n📋 開始獲取 D11-D18 登機門的航班資料...\n')
    
    gates = [f'D{i}' for i in range(11, 19)]
    all_data = []
    
    for gate in gates:
        print(f'正在獲取 {gate} 的資料...', end=' ')
        
        # 獲取出發航班
        departure_data = scraper.get_departure_flights(gate=gate)
        
        # 獲取抵達航班
        arrival_data = scraper.get_arrival_flights(gate=gate)
        
        # 合併資料
        combined_data = {
            'gate': gate,
            'departure': departure_data.get('departure', {}),
            'arrival': arrival_data.get('arrival', {}),
            'timestamp': datetime.now().isoformat()
        }
        
        if 'error' in departure_data:
            combined_data['error'] = departure_data['error']
        if 'error' in arrival_data:
            combined_data['error'] = arrival_data.get('error', '')
        
        all_data.append(combined_data)
        
        dep_count = len(combined_data['departure'].get('data', []))
        arr_count = len(combined_data['arrival'].get('data', []))
        print(f'✅ 出發: {dep_count} 班, 抵達: {arr_count} 班')
        
        time.sleep(scraper.delay)
    
    print('\n📊 按日期組織資料...')
    date_data = organize_by_date(all_data)
    
    # 儲存每個日期的資料
    for date_key, formatted_data in date_data.items():
        # 建立格式化顯示
        formatted_display = []
        for flight in formatted_data["flights"]:
            gate = flight.get("gate", "")
            flight_code = flight.get("flight_code", "")
            airline = flight.get("airline", "")
            time_str = flight.get("time", "")
            
            display_str = f"{time_str} : {gate} : {flight_code}"
            if airline:
                display_str += f" ({airline})"
            
            formatted_display.append(display_str)
        
        # 建立最終輸出格式
        output = {
            "date": date_key,
            "flights": formatted_data["flights"],
            "summary": {
                "total_flights": len(formatted_data["flights"]),
                "before_17:00": formatted_data["summary"]["before_17:00"],
                "after_17:00": formatted_data["summary"]["after_17:00"]
            },
            "formatted_display": formatted_display
        }
        
        # 儲存 JSON 檔案
        date_file = os.path.join(data_dir, f'flight-data-{date_key}.json')
        with open(date_file, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        
        print(f'✅ 已儲存: flight-data-{date_key}.json')
        print(f'   - 總航班數: {output["summary"]["total_flights"]} 班')
        print(f'   - 17:00 前: {output["summary"]["before_17:00"]} 班')
        print(f'   - 17:00 後: {output["summary"]["after_17:00"]} 班')
    
    print('\n✅ 完成！所有資料已儲存到 data/ 目錄')
