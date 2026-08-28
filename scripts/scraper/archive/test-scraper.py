#!/usr/bin/env python3
"""
測試爬蟲腳本 - 驗證功能是否正常
"""

import sys
import json
import os

# 添加當前目錄到路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flight_scraper import TaoyuanAirportFlightScraper

def test_single_gate():
    """測試獲取單個登機門的資料"""
    print("=" * 60)
    print("測試 1: 獲取單個登機門 (D11) 的資料")
    print("=" * 60)
    
    scraper = TaoyuanAirportFlightScraper(delay=0.5)
    data = scraper.get_flight_data('D11')
    
    if 'error' in data:
        print(f"❌ 錯誤: {data['error']}")
        return False
    
    print(f"✅ 成功獲取 D11 登機門的資料")
    print(f"   - 出發航班: {data['summary']['departure_count']} 班")
    print(f"   - 抵達航班: {data['summary']['arrival_count']} 班")
    print(f"   - 總計: {data['summary']['total_count']} 班")
    
    # 顯示前 3 個出發航班
    if data['departure']['data']:
        print("\n前 3 個出發航班:")
        for i, flight in enumerate(data['departure']['data'][:3], 1):
            print(f"  {i}. {flight['time']} | {flight['flight_code']} | {flight['gate']} | {flight.get('city', '')} ({flight.get('airport_code', '')}) | {flight['status']}")
    
    return True

def test_all_gates():
    """測試獲取所有登機門的資料"""
    print("\n" + "=" * 60)
    print("測試 2: 獲取所有登機門 (D11-D18) 的資料")
    print("=" * 60)
    
    scraper = TaoyuanAirportFlightScraper(delay=0.5)
    all_data = scraper.get_all_gates(['D11', 'D12'])  # 只測試兩個，避免時間過長
    
    success_count = 0
    error_count = 0
    
    for gate_data in all_data:
        if 'error' in gate_data:
            print(f"❌ {gate_data['gate']}: {gate_data['error']}")
            error_count += 1
        else:
            print(f"✅ {gate_data['gate']}: {gate_data['summary']['total_count']} 班")
            success_count += 1
    
    print(f"\n成功: {success_count}, 失敗: {error_count}")
    return error_count == 0

def test_data_structure():
    """測試資料結構是否正確"""
    print("\n" + "=" * 60)
    print("測試 3: 驗證資料結構")
    print("=" * 60)
    
    scraper = TaoyuanAirportFlightScraper(delay=0.5)
    data = scraper.get_flight_data('D11')
    
    if 'error' in data:
        print(f"❌ 無法獲取資料: {data['error']}")
        return False
    
    # 檢查必要欄位
    required_fields = ['timestamp', 'gate', 'departure', 'arrival', 'summary']
    missing_fields = [field for field in required_fields if field not in data]
    
    if missing_fields:
        print(f"❌ 缺少必要欄位: {missing_fields}")
        return False
    
    # 檢查 departure 結構
    if 'data' not in data['departure']:
        print("❌ departure 缺少 data 欄位")
        return False
    
    # 檢查資料行結構
    if data['departure']['data']:
        flight = data['departure']['data'][0]
        required_flight_fields = ['time', 'flight_code', 'gate', 'status']
        missing_flight_fields = [field for field in required_flight_fields if field not in flight]
        
        if missing_flight_fields:
            print(f"❌ 航班資料缺少欄位: {missing_flight_fields}")
            return False
    
    print("✅ 資料結構正確")
    return True

def test_json_output():
    """測試 JSON 輸出是否有效"""
    print("\n" + "=" * 60)
    print("測試 4: 驗證 JSON 輸出")
    print("=" * 60)
    
    scraper = TaoyuanAirportFlightScraper(delay=0.5)
    data = scraper.get_flight_data('D11')
    
    if 'error' in data:
        print(f"❌ 無法獲取資料: {data['error']}")
        return False
    
    try:
        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        parsed = json.loads(json_str)
        
        if parsed == data:
            print("✅ JSON 序列化和反序列化成功")
            print(f"   JSON 大小: {len(json_str)} 字元")
            return True
        else:
            print("❌ JSON 序列化後資料不一致")
            return False
    except Exception as e:
        print(f"❌ JSON 處理錯誤: {e}")
        return False

def main():
    """執行所有測試"""
    print("🧪 開始測試爬蟲功能...\n")
    
    results = []
    
    # 執行測試
    results.append(("單個登機門", test_single_gate()))
    results.append(("所有登機門", test_all_gates()))
    results.append(("資料結構", test_data_structure()))
    results.append(("JSON 輸出", test_json_output()))
    
    # 顯示結果
    print("\n" + "=" * 60)
    print("測試結果總結")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "✅ 通過" if result else "❌ 失敗"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\n總計: {passed} 通過, {failed} 失敗")
    
    if failed == 0:
        print("\n🎉 所有測試通過！")
        return 0
    else:
        print("\n⚠️  有測試失敗，請檢查錯誤訊息")
        return 1

if __name__ == '__main__':
    sys.exit(main())
