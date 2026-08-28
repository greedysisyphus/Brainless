#!/usr/bin/env python3
"""
獲取 D11-D18 所有登機門的資料，按日期分組儲存
輸出格式：
- 時間：Gate : 航班（以時間排序）
- 17:00 pm 前的班次總數量
- 17:00 pm 後的班機總數量
"""

import sys
import json
import os
from datetime import datetime
from collections import defaultdict

# 添加當前目錄到路徑
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

try:
    from flight_scraper import TaoyuanAirportFlightScraper
except ImportError as e:
    print("❌ 無法匯入模組，請先安裝依賴：")
    print("   pip3 install requests beautifulsoup4 lxml")
    print(f"\n錯誤詳情: {e}")
    sys.exit(1)

def parse_time(time_str):
    """
    解析時間字串，例如 "2/1 17:10" 或 "2/1 17:45(實際抵達: 17:45)"
    返回 datetime 物件（使用當前年份）
    """
    try:
        # 處理格式如 "2/1 17:10" 或 "2/1 17:45(實際抵達: 17:45)"
        time_str = time_str.strip()
        
        # 如果有括號，提取括號前的時間
        if '(' in time_str:
            time_str = time_str.split('(')[0].strip()
        
        parts = time_str.split()
        if len(parts) < 2:
            return None
        
        date_part = parts[0]  # "2/1" 或 "1/31"
        time_part = parts[1]   # "17:10"
        
        # 解析日期
        date_parts = date_part.split('/')
        if len(date_parts) != 2:
            return None
        
        month = int(date_parts[0])
        day = int(date_parts[1])
        
        # 解析時間
        time_parts = time_part.split(':')
        if len(time_parts) != 2:
            return None
        
        hour = int(time_parts[0])
        minute = int(time_parts[1])
        
        # 使用當前年份
        current_year = datetime.now().year
        return datetime(current_year, month, day, hour, minute)
    except Exception as e:
        return None

def format_time_for_display(dt):
    """格式化時間為顯示格式"""
    if dt is None:
        return None
    return dt.strftime("%H:%M")

def organize_by_date(all_data):
    """
    將所有登機門的資料按日期分組
    返回格式：
    {
        "2026-02-01": {
            "flights": [
                {
                    "time": "17:10",
                    "gate": "D11",
                    "flight_code": "JX791",
                    "airline": "星宇",
                    "type": "departure",
                    "destination": "菲律賓克拉克 (CRK)",
                    "status": "準時ON TIME"
                }
            ],
            "summary": {
                "before_17:00": 10,
                "after_17:00": 5
            }
        }
    }
    """
    date_data = defaultdict(lambda: {
        "flights": [],
        "summary": {
            "before_17:00": 0,
            "after_17:00": 0
        }
    })
    
    for gate_data in all_data:
        if 'error' in gate_data:
            continue
        
        gate = gate_data['gate']
        
        # 處理出發航班
        for flight in gate_data.get('departure', {}).get('data', []):
            time_str = flight.get('time', '')
            dt = parse_time(time_str)
            
            if dt:
                date_key = dt.strftime('%Y-%m-%d')
                time_display = format_time_for_display(dt)
                
                # 判斷是否在 17:00 前（基於該航班的日期和時間）
                cutoff_time = dt.replace(hour=17, minute=0, second=0, microsecond=0)
                is_before_17 = dt < cutoff_time
                
                flight_entry = {
                    "time": time_display,
                    "datetime": dt.isoformat(),
                    "gate": gate,
                    "flight_code": flight.get('flight_code', ''),
                    "airline": flight.get('airline', ''),
                    "type": "departure",
                    "destination": f"{flight.get('city', '')} ({flight.get('airport_code', '')})".strip(),
                    "status": flight.get('status', '')
                }
                
                date_data[date_key]["flights"].append(flight_entry)
                
                # 計算 17:00 前後的數量
                if is_before_17:
                    date_data[date_key]["summary"]["before_17:00"] += 1
                else:
                    date_data[date_key]["summary"]["after_17:00"] += 1
        
        # 處理抵達航班
        for flight in gate_data.get('arrival', {}).get('data', []):
            time_str = flight.get('time', '')
            dt = parse_time(time_str)
            
            if dt:
                date_key = dt.strftime('%Y-%m-%d')
                time_display = format_time_for_display(dt)
                
                # 判斷是否在 17:00 前（基於該航班的日期和時間）
                cutoff_time = dt.replace(hour=17, minute=0, second=0, microsecond=0)
                is_before_17 = dt < cutoff_time
                
                flight_entry = {
                    "time": time_display,
                    "datetime": dt.isoformat(),
                    "gate": gate,
                    "flight_code": flight.get('flight_code', ''),
                    "airline": flight.get('airline', ''),
                    "type": "arrival",
                    "destination": f"{flight.get('city', '')} ({flight.get('airport_code', '')})".strip(),
                    "status": flight.get('status', '')
                }
                
                date_data[date_key]["flights"].append(flight_entry)
                
                # 計算 17:00 前後的數量
                if is_before_17:
                    date_data[date_key]["summary"]["before_17:00"] += 1
                else:
                    date_data[date_key]["summary"]["after_17:00"] += 1
    
    # 對每個日期的航班按時間排序
    for date_key in date_data:
        date_data[date_key]["flights"].sort(key=lambda x: (
            x.get("datetime", "") if x.get("datetime") else "9999-12-31T23:59:59"
        ))
    
    return dict(date_data)

def format_flight_display(flight):
    """格式化航班顯示：時間：Gate : 航班"""
    airline = f"({flight['airline']})" if flight.get('airline') else ""
    return f"{flight['time']} : {flight['gate']} : {flight['flight_code']} {airline}".strip()

def main():
    print('🚀 開始獲取 D11-D18 所有登機門的資料...')
    print('=' * 60)
    
    scraper = TaoyuanAirportFlightScraper(delay=0.5)
    
    # 獲取所有登機門的資料
    gates = [f'D{i}' for i in range(11, 19)]
    print(f'📡 正在獲取 {len(gates)} 個登機門: {", ".join(gates)}')
    print()
    
    all_data = scraper.get_all_gates(gates)
    
    # 按日期組織資料
    print('📅 正在按日期組織資料...')
    date_data = organize_by_date(all_data)
    
    # 建立 data 目錄
    data_dir = os.path.join(current_dir, '../../data')
    os.makedirs(data_dir, exist_ok=True)
    
    # 儲存每個日期的資料
    for date_key, data in sorted(date_data.items()):
        # 建立格式化的資料
        formatted_data = {
            "date": date_key,
            "last_updated": datetime.now().isoformat(),
            "flights": data["flights"],
            "summary": {
                "total_flights": len(data["flights"]),
                "before_17:00": data["summary"]["before_17:00"],
                "after_17:00": data["summary"]["after_17:00"]
            },
            "formatted_display": [
                format_flight_display(f) for f in data["flights"]
            ]
        }
        
        # 儲存 JSON 檔案
        date_file = os.path.join(data_dir, f'flight-data-{date_key}.json')
        with open(date_file, 'w', encoding='utf-8') as f:
            json.dump(formatted_data, f, ensure_ascii=False, indent=2)
        
        print(f'✅ 已儲存: flight-data-{date_key}.json')
        print(f'   - 總航班數: {formatted_data["summary"]["total_flights"]} 班')
        print(f'   - 17:00 前: {formatted_data["summary"]["before_17:00"]} 班')
        print(f'   - 17:00 後: {formatted_data["summary"]["after_17:00"]} 班')
    
    # 建立摘要檔案
    summary = {
        "last_updated": datetime.now().isoformat(),
        "dates": sorted(date_data.keys()),
        "total_dates": len(date_data),
        "total_flights": sum(len(d["flights"]) for d in date_data.values()),
        "total_before_17:00": sum(d["summary"]["before_17:00"] for d in date_data.values()),
        "total_after_17:00": sum(d["summary"]["after_17:00"] for d in date_data.values())
    }
    
    summary_file = os.path.join(data_dir, 'flight-data-summary.json')
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f'\n✅ 已儲存: flight-data-summary.json')
    
    print()
    print('=' * 60)
    print('📊 總計統計')
    print('=' * 60)
    print(f'📅 日期數: {summary["total_dates"]} 天')
    print(f'✈️  總航班數: {summary["total_flights"]} 班')
    print(f'🌅 17:00 前總計: {summary["total_before_17:00"]} 班')
    print(f'🌆 17:00 後總計: {summary["total_after_17:00"]} 班')
    print()
    print(f'📁 所有檔案已儲存到: {os.path.abspath(data_dir)}')
    print('=' * 60)
    
    # 顯示範例格式
    if date_data:
        first_date = sorted(date_data.keys())[0]
        first_flights = date_data[first_date]["flights"][:5]
        print(f'\n📋 {first_date} 的前 5 個航班（格式：時間：Gate : 航班）：')
        for flight in first_flights:
            print(f'   {format_flight_display(flight)}')

if __name__ == '__main__':
    main()
