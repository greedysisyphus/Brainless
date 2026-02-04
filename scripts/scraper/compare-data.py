#!/usr/bin/env python3
"""
比較新舊航班資料，檢測是否有實質變化
用於智能觸發部署：只有當資料真正改變時才觸發部署
"""

import json
import os
import sys
from typing import Dict, List, Tuple

def normalize_flight(flight: Dict) -> Dict:
    """
    標準化航班資料，移除會影響比較的欄位（如 updated_at）
    只保留核心資料欄位，確保比較的準確性
    """
    # 處理 codeshare_flights，確保順序一致（按 flight_code 排序）
    codeshare_flights = flight.get("codeshare_flights", [])
    if isinstance(codeshare_flights, list):
        # 排序共掛班號，確保順序不影響比較
        codeshare_flights_sorted = sorted(
            codeshare_flights,
            key=lambda x: x.get("flight_code", "") if isinstance(x, dict) else str(x)
        )
    else:
        codeshare_flights_sorted = []
    
    return {
        "time": str(flight.get("time", "")).strip(),
        "gate": str(flight.get("gate", "")).strip(),
        "flight_code": str(flight.get("flight_code", "")).strip(),
        "airline_name": str(flight.get("airline_name", "")).strip(),
        "airline_code": str(flight.get("airline_code", "")).strip(),
        "destination": str(flight.get("destination", "")).strip(),
        "status": str(flight.get("status", "")).strip(),
        "aircraft": str(flight.get("aircraft", flight.get("aircraft_type", ""))).strip(),  # 支援兩種欄位名稱
        "codeshare_flights": codeshare_flights_sorted  # 包含共掛班號資訊
    }

def compare_flights(old_flights: List[Dict], new_flights: List[Dict]) -> Tuple[bool, Dict]:
    """
    比較兩個航班列表，返回是否有變化和變化詳情
    
    Returns:
        (has_changes: bool, changes: Dict)
    """
    # 標準化航班資料
    # 使用 time + gate 作為唯一識別（每個航班條目已包含所有共掛班號資訊）
    old_normalized = {}
    for f in old_flights:
        try:
            # 使用 time + gate 作為 key（每個航班條目已包含所有共掛班號）
            key = f"{str(f.get('time', '')).strip()}_{str(f.get('gate', '')).strip()}"
            # 如果已經存在（理論上不應該發生，因為每個航班條目已包含所有共掛班號）
            # 但為了安全起見，如果發生重複，使用第一個（並記錄警告）
            if key in old_normalized:
                print(f"⚠️  警告: 發現重複的 time+gate 組合: {key}，使用第一個條目")
            else:
                old_normalized[key] = normalize_flight(f)
        except Exception as e:
            print(f"⚠️  處理舊航班資料時出錯: {e}")
            continue
    
    new_normalized = {}
    for f in new_flights:
        try:
            # 使用 time + gate 作為 key
            key = f"{str(f.get('time', '')).strip()}_{str(f.get('gate', '')).strip()}"
            # 如果已經存在（理論上不應該發生）
            if key in new_normalized:
                print(f"⚠️  警告: 發現重複的 time+gate 組合: {key}，使用第一個條目")
            else:
                new_normalized[key] = normalize_flight(f)
        except Exception as e:
            print(f"⚠️  處理新航班資料時出錯: {e}")
            continue
    
    # 找出新增、移除和修改的航班
    added = []
    removed = []
    modified = []
    
    # 檢查新增和修改
    for key, new_flight in new_normalized.items():
        if key not in old_normalized:
            added.append(new_flight)
        else:
            old_flight = old_normalized[key]
            if old_flight != new_flight:
                modified.append({
                    "old": old_flight,
                    "new": new_flight
                })
    
    # 檢查移除
    for key, old_flight in old_normalized.items():
        if key not in new_normalized:
            removed.append(old_flight)
    
    has_changes = len(added) > 0 or len(removed) > 0 or len(modified) > 0
    
    changes = {
        "added": len(added),
        "removed": len(removed),
        "modified": len(modified),
        "details": {
            "added": added[:5],  # 只保留前5個作為示例
            "removed": removed[:5],
            "modified": modified[:5]
        }
    }
    
    return has_changes, changes

def compare_summary(old_summary: Dict, new_summary: Dict) -> bool:
    """
    比較摘要資訊是否有變化
    """
    return (
        old_summary.get("total_flights", 0) != new_summary.get("total_flights", 0) or
        old_summary.get("before_17:00", 0) != new_summary.get("before_17:00", 0) or
        old_summary.get("after_17:00", 0) != new_summary.get("after_17:00", 0)
    )

def compare_data_files(old_file: str, new_file: str) -> Tuple[bool, Dict]:
    """
    比較兩個 JSON 資料文件
    
    Returns:
        (has_changes: bool, changes_info: Dict)
    """
    try:
        with open(old_file, 'r', encoding='utf-8') as f:
            old_data = json.load(f)
    except FileNotFoundError:
        # 如果舊文件不存在，視為有新資料
        return True, {"reason": "舊文件不存在，視為有新資料"}
    except Exception as e:
        print(f"❌ 讀取舊文件失敗: {e}")
        return True, {"reason": f"讀取舊文件失敗: {e}"}
    
    try:
        with open(new_file, 'r', encoding='utf-8') as f:
            new_data = json.load(f)
    except Exception as e:
        print(f"❌ 讀取新文件失敗: {e}")
        return False, {"reason": f"讀取新文件失敗: {e}"}
    
    # 比較摘要資訊
    summary_changed = compare_summary(
        old_data.get("summary", {}),
        new_data.get("summary", {})
    )
    
    # 比較航班列表
    flights_changed, flight_changes = compare_flights(
        old_data.get("flights", []),
        new_data.get("flights", [])
    )
    
    has_changes = summary_changed or flights_changed
    
    changes_info = {
        "summary_changed": summary_changed,
        "flights_changed": flights_changed,
        "flight_changes": flight_changes
    }
    
    return has_changes, changes_info

def main():
    """
    主函數：比較所有日期的資料文件
    """
    import subprocess
    
    # 獲取資料目錄
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.join(script_dir, '../..')
    data_dir = os.path.join(repo_root, 'data')
    
    if not os.path.exists(data_dir):
        print(f"❌ 資料目錄不存在: {data_dir}")
        sys.exit(1)
    
    # 找出所有新的 JSON 文件
    json_files = [f for f in os.listdir(data_dir) if f.startswith('flight-data-') and f.endswith('.json')]
    
    if not json_files:
        print("⚠️  沒有找到資料文件")
        # 沒有文件，視為無變化
        output_file = os.environ.get('GITHUB_OUTPUT', '/dev/stdout')
        with open(output_file, 'a') as f:
            f.write(f"has_changes=false\n")
            f.write(f"changed_count=0\n")
        sys.exit(1)
    
    # 比較每個文件
    total_changes = 0
    changed_files = []
    
    for json_file in sorted(json_files):
        file_path = os.path.join(data_dir, json_file)
        
        # 讀取新文件（剛生成的）
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                new_data = json.load(f)
        except Exception as e:
            print(f"⚠️  無法讀取 {json_file}: {e}")
            continue
        
        # 檢查是否有實質變化（與 Git 中的版本比較）
        has_changes = False
        changes_info = {}
        
        try:
            # 嘗試從 Git 獲取舊版本
            result = subprocess.run(
                ['git', 'show', f'HEAD:data/{json_file}'],
                capture_output=True,
                text=True,
                cwd=repo_root,
                timeout=10
            )
            
            if result.returncode == 0 and result.stdout.strip():
                # 成功獲取舊版本，進行比較
                try:
                    old_data = json.loads(result.stdout)
                    has_changes, changes_info = compare_data_files_content(old_data, new_data)
                except json.JSONDecodeError as e:
                    print(f"⚠️  {json_file}: Git 中的舊版本格式錯誤: {e}")
                    has_changes = True  # 格式錯誤，視為有變化
                    changes_info = {"reason": "Git 中的舊版本格式錯誤"}
            else:
                # Git 中沒有舊版本，可能是新文件
                # 檢查文件是否真的存在且不為空
                if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
                    # 檢查文件是否有實際內容（不只是空結構）
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            test_data = json.load(f)
                            # 如果有航班資料，視為新文件（需要部署）
                            if test_data.get("flights") and len(test_data.get("flights", [])) > 0:
                                print(f"✅ {json_file}: Git 中沒有舊版本，但文件有實際內容，視為新文件（需要部署）")
                                has_changes = True
                                changes_info = {"reason": "Git 中沒有舊版本，但文件有實際內容，視為新文件"}
                            else:
                                print(f"ℹ️  {json_file}: Git 中沒有舊版本，但文件為空，視為無變化")
                                has_changes = False
                                changes_info = {"reason": "Git 中沒有舊版本，但文件為空，視為無變化"}
                    except Exception as e:
                        print(f"⚠️  {json_file}: 無法讀取文件內容: {e}，視為無變化")
                        has_changes = False
                        changes_info = {"reason": f"無法讀取文件內容: {e}，視為無變化"}
                else:
                    print(f"ℹ️  {json_file}: Git 中沒有舊版本，且文件不存在或為空，視為無變化")
                    has_changes = False
                    changes_info = {"reason": "Git 中沒有舊版本，且文件不存在或為空，視為無變化"}
        except subprocess.TimeoutExpired:
            print(f"⚠️  {json_file}: 從 Git 獲取舊版本超時，視為無變化（避免不必要的部署）")
            has_changes = False
            changes_info = {"reason": "從 Git 獲取舊版本超時，視為無變化"}
        except Exception as e:
            # 如果無法從 Git 獲取，無法比較，視為無變化（避免不必要的部署）
            print(f"ℹ️  {json_file}: 無法從 Git 獲取舊版本: {e}，視為無變化（避免不必要的部署）")
            has_changes = False
            changes_info = {"reason": "無法從 Git 獲取舊版本，無法比較，視為無變化"}
        
        if has_changes:
            total_changes += 1
            changed_files.append({
                "file": json_file,
                "changes": changes_info
            })
            print(f"✅ {json_file}: 有變化")
            if "flight_changes" in changes_info:
                fc = changes_info["flight_changes"]
                print(f"   - 新增: {fc.get('added', 0)} 班")
                print(f"   - 移除: {fc.get('removed', 0)} 班")
                print(f"   - 修改: {fc.get('modified', 0)} 班")
            if "summary_changed" in changes_info and changes_info["summary_changed"]:
                print(f"   - 摘要資訊有變化")
        else:
            print(f"⏭️  {json_file}: 無變化")
    
    # 輸出結果（用於 GitHub Actions）
    output_file = os.environ.get('GITHUB_OUTPUT', '/dev/stdout')
    
    if total_changes > 0:
        print(f"\n📊 總計: {total_changes} 個文件有變化")
        with open(output_file, 'a') as f:
            f.write(f"has_changes=true\n")
            f.write(f"changed_count={total_changes}\n")
        sys.exit(0)  # 有變化，應該觸發部署
    else:
        print("\n✅ 所有文件都沒有實質變化")
        with open(output_file, 'a') as f:
            f.write(f"has_changes=false\n")
            f.write(f"changed_count=0\n")
        sys.exit(1)  # 無變化，不觸發部署

def compare_data_files_content(old_data: Dict, new_data: Dict) -> Tuple[bool, Dict]:
    """
    直接比較兩個資料字典
    """
    # 比較摘要資訊
    summary_changed = compare_summary(
        old_data.get("summary", {}),
        new_data.get("summary", {})
    )
    
    # 比較航班列表
    flights_changed, flight_changes = compare_flights(
        old_data.get("flights", []),
        new_data.get("flights", [])
    )
    
    has_changes = summary_changed or flights_changed
    
    changes_info = {
        "summary_changed": summary_changed,
        "flights_changed": flights_changed,
        "flight_changes": flight_changes
    }
    
    return has_changes, changes_info

if __name__ == '__main__':
    main()
