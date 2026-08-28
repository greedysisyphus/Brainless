#!/usr/bin/env python3
"""
快速測試腳本 - 驗證爬蟲基本功能
"""

import sys
import os

# 添加當前目錄到路徑
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

try:
    from flight_scraper import TaoyuanAirportFlightScraper
    
    print("🧪 開始測試爬蟲...")
    print("=" * 60)
    
    scraper = TaoyuanAirportFlightScraper(delay=0.5)
    
    # 測試獲取 D11 登機門的資料
    print("\n📡 正在獲取 D11 登機門的資料...")
    data = scraper.get_flight_data('D11')
    
    if 'error' in data:
        print(f"❌ 錯誤: {data['error']}")
        sys.exit(1)
    
    print(f"✅ 成功獲取資料！")
    print(f"   - 登機門: {data['gate']}")
    print(f"   - 出發航班: {data['summary']['departure_count']} 班")
    print(f"   - 抵達航班: {data['summary']['arrival_count']} 班")
    print(f"   - 總計: {data['summary']['total_count']} 班")
    
    # 顯示前 3 個出發航班
    if data['departure']['data']:
        print("\n前 3 個出發航班:")
        for i, flight in enumerate(data['departure']['data'][:3], 1):
            print(f"  {i}. {flight['time']} | {flight['flight_code']} | {flight['gate']} | {flight.get('city', '')} ({flight.get('airport_code', '')}) | {flight['status']}")
    
    print("\n" + "=" * 60)
    print("✅ 測試通過！爬蟲功能正常")
    print("=" * 60)
    
except ImportError as e:
    print(f"❌ 無法匯入模組: {e}")
    print("\n請確認：")
    print("1. 已安裝依賴: pip3 install requests beautifulsoup4 lxml")
    print("2. flight-scraper.py 檔案在同一目錄")
    sys.exit(1)
except Exception as e:
    print(f"❌ 測試失敗: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
