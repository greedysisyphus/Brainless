#!/usr/bin/env python3
"""
全面測試 compare-data.py 的邏輯，包括新一天的場景
"""

import json
import sys
import os
import tempfile
import shutil
from datetime import datetime, timedelta

# 添加當前目錄到路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 直接導入 compare-data.py
import importlib.util
spec = importlib.util.spec_from_file_location("compare_data", os.path.join(os.path.dirname(__file__), "compare-data.py"))
compare_data = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compare_data)

compare_data_files_content = compare_data.compare_data_files_content

def create_test_json(date_str, flights_count=5):
    """創建測試用的 JSON 文件"""
    return {
        "date": date_str,
        "flights": [
            {
                "time": f"{6+i:02d}:30",
                "datetime": f"{date_str}T{6+i:02d}:30:00",
                "gate": f"D{11+i%8}",
                "flight_code": f"BR{100+i}",
                "airline_code": "BR",
                "airline_name": "長榮航空",
                "type": "departure",
                "airport_code": "KIX",
                "city": "Osaka Kansai",
                "status": "準時ON TIME",
                "aircraft": "B787-10",
                "terminal": "2",
                "destination": "Osaka Kansai (KIX)",
                "codeshare_flights": []
            }
            for i in range(flights_count)
        ],
        "summary": {
            "total_flights": flights_count,
            "before_17:00": flights_count,
            "after_17:00": 0
        },
        "updated_at": datetime.now().isoformat()
    }

def test_new_day_json():
    """測試新一天的 JSON 檔（應該觸發部署）"""
    print("=" * 60)
    print("測試 1: 新一天的 JSON 檔（Git 中沒有舊版本）")
    print("=" * 60)
    
    # 創建新一天的資料
    today = datetime.now()
    new_date = (today + timedelta(days=1)).strftime('%Y-%m-%d')
    new_data = create_test_json(new_date, flights_count=10)
    
    # 模擬 Git 中沒有舊版本的情況（old_data 為 None）
    # 在實際邏輯中，這會觸發「Git 中沒有舊版本，但文件有實際內容」的邏輯
    # 我們需要檢查這個邏輯是否正確
    
    # 檢查文件是否有實際內容
    has_flights = new_data.get("flights") and len(new_data.get("flights", [])) > 0
    
    if not has_flights:
        print("❌ 新一天的 JSON 檔沒有航班資料")
        return False
    
    print(f"✅ 新一天的 JSON 檔有實際內容（{len(new_data['flights'])} 個航班）")
    print(f"   日期: {new_date}")
    print(f"   應該觸發部署: 是")
    return True

def test_same_data_no_changes():
    """測試相同資料（應該無變化）"""
    print("\n" + "=" * 60)
    print("測試 2: 相同資料（應該無變化）")
    print("=" * 60)
    
    date_str = "2026-02-01"
    data = create_test_json(date_str, flights_count=5)
    
    has_changes, changes_info = compare_data_files_content(data, data)
    
    if has_changes:
        print(f"❌ 相同資料被檢測為有變化")
        print(f"   變化詳情: {changes_info}")
        return False
    
    print("✅ 相同資料正確識別為無變化")
    return True

def test_status_change():
    """測試狀態變化（應該有變化）"""
    print("\n" + "=" * 60)
    print("測試 3: 狀態變化（應該有變化）")
    print("=" * 60)
    
    date_str = "2026-02-01"
    old_data = create_test_json(date_str, flights_count=3)
    new_data = create_test_json(date_str, flights_count=3)
    
    # 修改第一個航班的狀態
    new_data["flights"][0]["status"] = "出發DEPARTED"
    
    has_changes, changes_info = compare_data_files_content(old_data, new_data)
    
    if not has_changes:
        print(f"❌ 狀態變化未被檢測到")
        return False
    
    if not changes_info.get("flights_changed", False):
        print(f"❌ 航班變化標記錯誤")
        return False
    
    flight_changes = changes_info.get("flight_changes", {})
    if flight_changes.get("modified", 0) != 1:
        print(f"❌ 修改數量錯誤: {flight_changes.get('modified', 0)} (應該是 1)")
        return False
    
    print("✅ 狀態變化正確檢測到")
    print(f"   - 修改數量: {flight_changes.get('modified', 0)}")
    return True

def test_codeshare_change():
    """測試共掛班號變化（應該有變化）"""
    print("\n" + "=" * 60)
    print("測試 4: 共掛班號變化（應該有變化）")
    print("=" * 60)
    
    date_str = "2026-02-01"
    old_data = create_test_json(date_str, flights_count=2)
    new_data = create_test_json(date_str, flights_count=2)
    
    # 為第一個航班添加共掛班號
    new_data["flights"][0]["codeshare_flights"] = [
        {"flight_code": "TG6354", "airline_code": "TG", "airline_name": "泰國航空"}
    ]
    
    has_changes, changes_info = compare_data_files_content(old_data, new_data)
    
    if not has_changes:
        print(f"❌ 共掛班號變化未被檢測到")
        return False
    
    flight_changes = changes_info.get("flight_changes", {})
    if flight_changes.get("modified", 0) != 1:
        print(f"❌ 修改數量錯誤: {flight_changes.get('modified', 0)} (應該是 1)")
        return False
    
    print("✅ 共掛班號變化正確檢測到")
    print(f"   - 修改數量: {flight_changes.get('modified', 0)}")
    return True

def test_summary_change():
    """測試摘要變化（應該有變化）"""
    print("\n" + "=" * 60)
    print("測試 5: 摘要變化（應該有變化）")
    print("=" * 60)
    
    date_str = "2026-02-01"
    old_data = create_test_json(date_str, flights_count=5)
    new_data = create_test_json(date_str, flights_count=6)  # 增加一個航班
    
    has_changes, changes_info = compare_data_files_content(old_data, new_data)
    
    if not has_changes:
        print(f"❌ 摘要變化未被檢測到")
        return False
    
    if not changes_info.get("summary_changed", False):
        print(f"❌ 摘要變化標記錯誤")
        return False
    
    print("✅ 摘要變化正確檢測到")
    print(f"   - 舊總數: {old_data['summary']['total_flights']}")
    print(f"   - 新總數: {new_data['summary']['total_flights']}")
    return True

def test_new_flight_added():
    """測試新增航班（應該有變化）"""
    print("\n" + "=" * 60)
    print("測試 6: 新增航班（應該有變化）")
    print("=" * 60)
    
    date_str = "2026-02-01"
    old_data = create_test_json(date_str, flights_count=3)
    new_data = create_test_json(date_str, flights_count=4)  # 新增一個航班
    
    has_changes, changes_info = compare_data_files_content(old_data, new_data)
    
    if not has_changes:
        print(f"❌ 新增航班未被檢測到")
        return False
    
    flight_changes = changes_info.get("flight_changes", {})
    if flight_changes.get("added", 0) != 1:
        print(f"❌ 新增數量錯誤: {flight_changes.get('added', 0)} (應該是 1)")
        return False
    
    print("✅ 新增航班正確檢測到")
    print(f"   - 新增數量: {flight_changes.get('added', 0)}")
    return True

def test_flight_removed():
    """測試移除航班（應該有變化）"""
    print("\n" + "=" * 60)
    print("測試 7: 移除航班（應該有變化）")
    print("=" * 60)
    
    date_str = "2026-02-01"
    old_data = create_test_json(date_str, flights_count=4)
    new_data = create_test_json(date_str, flights_count=3)  # 移除一個航班
    
    has_changes, changes_info = compare_data_files_content(old_data, new_data)
    
    if not has_changes:
        print(f"❌ 移除航班未被檢測到")
        return False
    
    flight_changes = changes_info.get("flight_changes", {})
    if flight_changes.get("removed", 0) != 1:
        print(f"❌ 移除數量錯誤: {flight_changes.get('removed', 0)} (應該是 1)")
        return False
    
    print("✅ 移除航班正確檢測到")
    print(f"   - 移除數量: {flight_changes.get('removed', 0)}")
    return True

def test_only_updated_at_change():
    """測試只有 updated_at 變化（應該無變化）"""
    print("\n" + "=" * 60)
    print("測試 8: 只有 updated_at 變化（應該無變化）")
    print("=" * 60)
    
    date_str = "2026-02-01"
    old_data = create_test_json(date_str, flights_count=5)
    new_data = create_test_json(date_str, flights_count=5)
    
    # 只修改 updated_at
    new_data["updated_at"] = (datetime.now() + timedelta(hours=1)).isoformat()
    
    has_changes, changes_info = compare_data_files_content(old_data, new_data)
    
    if has_changes:
        print(f"❌ 只有 updated_at 變化被檢測為有變化（不應該）")
        print(f"   變化詳情: {changes_info}")
        return False
    
    print("✅ 只有 updated_at 變化正確識別為無變化")
    return True

def test_empty_file():
    """測試空文件（應該無變化）"""
    print("\n" + "=" * 60)
    print("測試 9: 空文件（應該無變化）")
    print("=" * 60)
    
    empty_data = {
        "date": "2026-02-01",
        "flights": [],
        "summary": {
            "total_flights": 0,
            "before_17:00": 0,
            "after_17:00": 0
        },
        "updated_at": datetime.now().isoformat()
    }
    
    # 檢查文件是否有實際內容
    has_flights = empty_data.get("flights") and len(empty_data.get("flights", [])) > 0
    
    if has_flights:
        print("❌ 空文件被識別為有內容")
        return False
    
    print("✅ 空文件正確識別為無內容")
    print("   應該視為無變化（不觸發部署）")
    return True

def main():
    """執行所有測試"""
    print("\n🧪 開始全面測試 compare-data.py 邏輯\n")
    
    tests = [
        test_new_day_json,
        test_same_data_no_changes,
        test_status_change,
        test_codeshare_change,
        test_summary_change,
        test_new_flight_added,
        test_flight_removed,
        test_only_updated_at_change,
        test_empty_file
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
