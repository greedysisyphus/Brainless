#!/usr/bin/env python3
"""
測試按日期分組的腳本
使用現有的 JSON 檔案進行測試
"""

import json
import os
import sys
from datetime import datetime
from collections import defaultdict

def parse_time(time_str):
    """解析時間字串"""
    try:
        time_str = time_str.strip()
        if '(' in time_str:
            time_str = time_str.split('(')[0].strip()
        
        parts = time_str.split()
        if len(parts) < 2:
            return None
        
        date_part = parts[0]
        time_part = parts[1]
        
        date_parts = date_part.split('/')
        if len(date_parts) != 2:
            return None
        
        month = int(date_parts[0])
        day = int(date_parts[1])
        
        time_parts = time_part.split(':')
        if len(time_parts) != 2:
            return None
        
        hour = int(time_parts[0])
        minute = int(time_parts[1])
        
        current_year = datetime.now().year
        return datetime(current_year, month, day, hour, minute)
    except:
        return None

def test_with_existing_data():
    """使用現有的 JSON 檔案測試"""
    data_dir = os.path.join(os.path.dirname(__file__), '../../data')
    
    # 讀取現有的 D12 資料作為測試
    test_file = os.path.join(data_dir, 'flight-data-D12.json')
    
    if not os.path.exists(test_file):
        print(f"❌ 測試檔案不存在: {test_file}")
        print("請先執行 fetch-all-gates.py 生成資料")
        return False
    
    print("📖 讀取測試資料...")
    with open(test_file, 'r', encoding='utf-8') as f:
        gate_data = json.load(f)
    
    # 模擬 organize_by_date 的邏輯
    date_data = defaultdict(lambda: {
        "flights": [],
        "summary": {
            "before_17:00": 0,
            "after_17:00": 0
        }
    })
    
    gate = gate_data['gate']
    
    # 處理出發航班
    for flight in gate_data.get('departure', {}).get('data', []):
        time_str = flight.get('time', '')
        dt = parse_time(time_str)
        
        if dt:
            date_key = dt.strftime('%Y-%m-%d')
            time_display = dt.strftime("%H:%M")
            
            cutoff_time = dt.replace(hour=17, minute=0, second=0, microsecond=0)
            is_before_17 = dt < cutoff_time
            
            flight_entry = {
                "time": time_display,
                "datetime": dt.isoformat(),
                "gate": gate,
                "flight_code": flight.get('flight_code', ''),
                "airline": flight.get('airline', ''),
                "type": "departure"
            }
            
            date_data[date_key]["flights"].append(flight_entry)
            
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
            time_display = dt.strftime("%H:%M")
            
            cutoff_time = dt.replace(hour=17, minute=0, second=0, microsecond=0)
            is_before_17 = dt < cutoff_time
            
            flight_entry = {
                "time": time_display,
                "datetime": dt.isoformat(),
                "gate": gate,
                "flight_code": flight.get('flight_code', ''),
                "airline": flight.get('airline', ''),
                "type": "arrival"
            }
            
            date_data[date_key]["flights"].append(flight_entry)
            
            if is_before_17:
                date_data[date_key]["summary"]["before_17:00"] += 1
            else:
                date_data[date_key]["summary"]["after_17:00"] += 1
    
    # 排序
    for date_key in date_data:
        date_data[date_key]["flights"].sort(key=lambda x: x.get("datetime", ""))
    
    # 顯示結果
    print("\n" + "=" * 60)
    print("📊 測試結果")
    print("=" * 60)
    
    for date_key in sorted(date_data.keys()):
        data = date_data[date_key]
        print(f"\n📅 {date_key}:")
        print(f"   總航班數: {len(data['flights'])} 班")
        print(f"   17:00 前: {data['summary']['before_17:00']} 班")
        print(f"   17:00 後: {data['summary']['after_17:00']} 班")
        
        print(f"\n   前 5 個航班（格式：時間：Gate : 航班）：")
        for flight in data['flights'][:5]:
            airline = f"({flight['airline']})" if flight.get('airline') else ""
            display = f"{flight['time']} : {flight['gate']} : {flight['flight_code']} {airline}".strip()
            print(f"   - {display}")
    
    print("\n✅ 測試完成！")
    return True

if __name__ == '__main__':
    test_with_existing_data()
