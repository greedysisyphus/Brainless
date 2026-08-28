#!/usr/bin/env python3
"""
獲取 D11-D18 所有登機門的資料並儲存為 JSON
"""

import sys
import json
import os

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

def main():
    print('🚀 開始獲取 D11-D18 所有登機門的資料...')
    print('=' * 60)
    
    scraper = TaoyuanAirportFlightScraper(delay=0.5)
    
    # 獲取所有登機門的資料
    gates = [f'D{i}' for i in range(11, 19)]
    print(f'📡 將獲取 {len(gates)} 個登機門: {", ".join(gates)}')
    print()
    
    all_data = scraper.get_all_gates(gates)
    
    # 建立 data 目錄
    data_dir = os.path.join(current_dir, '../../data')
    os.makedirs(data_dir, exist_ok=True)
    
    # 儲存所有登機門的資料
    all_file = os.path.join(data_dir, 'flight-data-all.json')
    with open(all_file, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    print(f'✅ 已儲存: flight-data-all.json')
    
    # 儲存每個登機門的個別檔案
    success_count = 0
    for gate_data in all_data:
        if 'error' not in gate_data:
            gate = gate_data['gate']
            gate_file = os.path.join(data_dir, f'flight-data-{gate}.json')
            with open(gate_file, 'w', encoding='utf-8') as f:
                json.dump(gate_data, f, ensure_ascii=False, indent=2)
            success_count += 1
            print(f'✅ 已儲存: flight-data-{gate}.json ({gate_data["summary"]["total_count"]} 班)')
        else:
            print(f'❌ {gate_data["gate"]}: {gate_data["error"]}')
    
    # 建立摘要檔案
    summary = {
        'last_updated': all_data[0]['timestamp'] if all_data and 'timestamp' in all_data[0] else None,
        'gates': [d['gate'] for d in all_data if 'error' not in d],
        'total_departures': sum(d.get('summary', {}).get('departure_count', 0) for d in all_data if 'error' not in d),
        'total_arrivals': sum(d.get('summary', {}).get('arrival_count', 0) for d in all_data if 'error' not in d),
        'gate_count': len([d for d in all_data if 'error' not in d])
    }
    
    summary_file = os.path.join(data_dir, 'flight-data-summary.json')
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f'✅ 已儲存: flight-data-summary.json')
    
    print()
    print('=' * 60)
    print(f'📊 統計資訊')
    print('=' * 60)
    print(f'✅ 成功獲取: {summary["gate_count"]} 個登機門')
    print(f'🛫 總出發航班: {summary["total_departures"]} 班')
    print(f'🛬 總抵達航班: {summary["total_arrivals"]} 班')
    print(f'✈️  總航班數: {summary["total_departures"] + summary["total_arrivals"]} 班')
    print()
    print(f'📁 所有檔案已儲存到: {os.path.abspath(data_dir)}')
    print('=' * 60)

if __name__ == '__main__':
    main()
