#!/usr/bin/env python3
"""
測試 compare-data.py 的邏輯
"""

import json
import sys
import os

# 添加當前目錄到路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 直接導入 compare-data.py（需要處理連字符）
import importlib.util
spec = importlib.util.spec_from_file_location("compare_data", os.path.join(os.path.dirname(__file__), "compare-data.py"))
compare_data = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compare_data)

normalize_flight = compare_data.normalize_flight
compare_flights = compare_data.compare_flights
compare_summary = compare_data.compare_summary
compare_data_files_content = compare_data.compare_data_files_content

def test_normalize_flight():
    """測試 normalize_flight 函數"""
    print("=" * 60)
    print("測試 1: normalize_flight")
    print("=" * 60)
    
    test_flight = {
        'time': '06:30',
        'gate': 'D16',
        'flight_code': 'BR178',
        'airline_name': '長榮航空',
        'airline_code': 'BR',
        'destination': 'Osaka Kansai (KIX)',
        'status': '出發DEPARTED',
        'aircraft': 'B787-10',
        'codeshare_flights': [
            {'flight_code': 'TG6354', 'airline_code': 'TG', 'airline_name': '泰國航空'},
            {'flight_code': 'NZ4928', 'airline_code': 'NZ', 'airline_name': '紐西蘭航空'},
            {'flight_code': 'NH5834', 'airline_code': 'NH', 'airline_name': '全日本空輸'}
        ]
    }
    
    normalized = normalize_flight(test_flight)
    
    # 檢查必要欄位
    required_fields = ['time', 'gate', 'flight_code', 'airline_name', 'airline_code', 
                      'destination', 'status', 'aircraft', 'codeshare_flights']
    missing = [f for f in required_fields if f not in normalized]
    
    if missing:
        print(f"❌ 缺少欄位: {missing}")
        return False
    
    # 檢查 codeshare_flights 是否排序
    codeshare = normalized.get('codeshare_flights', [])
    if len(codeshare) != 3:
        print(f"❌ codeshare_flights 數量錯誤: {len(codeshare)} (應該是 3)")
        return False
    
    # 檢查是否按 flight_code 排序
    flight_codes = [cf.get('flight_code', '') for cf in codeshare]
    if flight_codes != sorted(flight_codes):
        print(f"❌ codeshare_flights 未排序: {flight_codes}")
        return False
    
    print("✅ normalize_flight 測試通過")
    print(f"   - 欄位完整: {len(required_fields)} 個欄位")
    print(f"   - codeshare_flights 數量: {len(codeshare)}")
    print(f"   - codeshare_flights 已排序: {flight_codes}")
    return True

def test_compare_flights_same():
    """測試比較相同航班列表"""
    print("\n" + "=" * 60)
    print("測試 2: 比較相同航班列表（應該無變化）")
    print("=" * 60)
    
    flights = [
        {
            'time': '06:30',
            'gate': 'D16',
            'flight_code': 'BR178',
            'airline_name': '長榮航空',
            'airline_code': 'BR',
            'destination': 'Osaka Kansai (KIX)',
            'status': '出發DEPARTED',
            'aircraft': 'B787-10',
            'codeshare_flights': [
                {'flight_code': 'TG6354', 'airline_code': 'TG', 'airline_name': '泰國航空'},
                {'flight_code': 'NZ4928', 'airline_code': 'NZ', 'airline_name': '紐西蘭航空'}
            ]
        },
        {
            'time': '06:50',
            'gate': 'D11',
            'flight_code': 'JX761',
            'airline_name': '星宇航空',
            'airline_code': 'JX',
            'destination': 'Jakarta (CGK)',
            'status': '出發DEPARTED',
            'aircraft': 'A321-252',
            'codeshare_flights': []
        }
    ]
    
    has_changes, changes = compare_flights(flights, flights)
    
    if has_changes:
        print(f"❌ 相同航班列表被檢測為有變化")
        print(f"   變化詳情: {changes}")
        return False
    
    print("✅ 相同航班列表正確識別為無變化")
    return True

def test_compare_flights_status_change():
    """測試狀態變化"""
    print("\n" + "=" * 60)
    print("測試 3: 狀態變化（應該有變化）")
    print("=" * 60)
    
    old_flights = [
        {
            'time': '06:30',
            'gate': 'D16',
            'flight_code': 'BR178',
            'airline_name': '長榮航空',
            'airline_code': 'BR',
            'destination': 'Osaka Kansai (KIX)',
            'status': '準時ON TIME',
            'aircraft': 'B787-10',
            'codeshare_flights': []
        }
    ]
    
    new_flights = [
        {
            'time': '06:30',
            'gate': 'D16',
            'flight_code': 'BR178',
            'airline_name': '長榮航空',
            'airline_code': 'BR',
            'destination': 'Osaka Kansai (KIX)',
            'status': '出發DEPARTED',  # 狀態改變
            'aircraft': 'B787-10',
            'codeshare_flights': []
        }
    ]
    
    has_changes, changes = compare_flights(old_flights, new_flights)
    
    if not has_changes:
        print(f"❌ 狀態變化未被檢測到")
        return False
    
    if changes.get('modified', 0) != 1:
        print(f"❌ 修改數量錯誤: {changes.get('modified', 0)} (應該是 1)")
        return False
    
    print("✅ 狀態變化正確檢測到")
    print(f"   - 修改數量: {changes.get('modified', 0)}")
    return True

def test_compare_flights_codeshare_change():
    """測試共掛班號變化"""
    print("\n" + "=" * 60)
    print("測試 4: 共掛班號變化（應該有變化）")
    print("=" * 60)
    
    old_flights = [
        {
            'time': '06:30',
            'gate': 'D16',
            'flight_code': 'BR178',
            'airline_name': '長榮航空',
            'airline_code': 'BR',
            'destination': 'Osaka Kansai (KIX)',
            'status': '出發DEPARTED',
            'aircraft': 'B787-10',
            'codeshare_flights': [
                {'flight_code': 'TG6354', 'airline_code': 'TG', 'airline_name': '泰國航空'}
            ]
        }
    ]
    
    new_flights = [
        {
            'time': '06:30',
            'gate': 'D16',
            'flight_code': 'BR178',
            'airline_name': '長榮航空',
            'airline_code': 'BR',
            'destination': 'Osaka Kansai (KIX)',
            'status': '出發DEPARTED',
            'aircraft': 'B787-10',
            'codeshare_flights': [
                {'flight_code': 'TG6354', 'airline_code': 'TG', 'airline_name': '泰國航空'},
                {'flight_code': 'NZ4928', 'airline_code': 'NZ', 'airline_name': '紐西蘭航空'}  # 新增共掛班號
            ]
        }
    ]
    
    has_changes, changes = compare_flights(old_flights, new_flights)
    
    if not has_changes:
        print(f"❌ 共掛班號變化未被檢測到")
        return False
    
    if changes.get('modified', 0) != 1:
        print(f"❌ 修改數量錯誤: {changes.get('modified', 0)} (應該是 1)")
        return False
    
    print("✅ 共掛班號變化正確檢測到")
    print(f"   - 修改數量: {changes.get('modified', 0)}")
    return True

def test_compare_summary():
    """測試摘要比較"""
    print("\n" + "=" * 60)
    print("測試 5: 摘要比較")
    print("=" * 60)
    
    old_summary = {
        'total_flights': 100,
        'before_17:00': 60,
        'after_17:00': 40
    }
    
    new_summary_same = {
        'total_flights': 100,
        'before_17:00': 60,
        'after_17:00': 40
    }
    
    new_summary_changed = {
        'total_flights': 101,  # 改變
        'before_17:00': 60,
        'after_17:00': 41  # 改變
    }
    
    # 測試相同摘要
    if compare_summary(old_summary, new_summary_same):
        print("❌ 相同摘要被檢測為有變化")
        return False
    
    # 測試不同摘要
    if not compare_summary(old_summary, new_summary_changed):
        print("❌ 不同摘要未被檢測到")
        return False
    
    print("✅ 摘要比較正確")
    return True

def test_real_data():
    """測試真實資料"""
    print("\n" + "=" * 60)
    print("測試 6: 真實資料比較")
    print("=" * 60)
    
    data_file = os.path.join(os.path.dirname(__file__), '../../data/flight-data-2026-02-01.json')
    
    if not os.path.exists(data_file):
        print(f"⚠️  測試資料文件不存在: {data_file}")
        return True  # 跳過測試
    
    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        flights = data.get('flights', [])
        if not flights:
            print("⚠️  測試資料文件為空")
            return True
        
        # 比較相同資料
        has_changes, changes = compare_flights(flights, flights)
        
        if has_changes:
            print(f"❌ 真實資料自己比較自己時被檢測為有變化")
            print(f"   變化詳情: {changes}")
            return False
        
        print("✅ 真實資料比較正確")
        print(f"   - 航班數量: {len(flights)}")
        return True
        
    except Exception as e:
        print(f"❌ 讀取真實資料失敗: {e}")
        return False

def main():
    """執行所有測試"""
    print("\n🧪 開始測試 compare-data.py 邏輯\n")
    
    tests = [
        test_normalize_flight,
        test_compare_flights_same,
        test_compare_flights_status_change,
        test_compare_flights_codeshare_change,
        test_compare_summary,
        test_real_data
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ 測試執行失敗: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print("\n" + "=" * 60)
    print("測試結果")
    print("=" * 60)
    print(f"✅ 通過: {passed}")
    print(f"❌ 失敗: {failed}")
    print(f"📊 總計: {passed + failed}")
    
    if failed == 0:
        print("\n🎉 所有測試通過！")
        return 0
    else:
        print(f"\n⚠️  有 {failed} 個測試失敗")
        return 1

if __name__ == '__main__':
    sys.exit(main())
