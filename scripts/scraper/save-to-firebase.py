#!/usr/bin/env python3
"""
將航班資料存儲到 Firebase Firestore
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# 添加父目錄到路徑
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ 請先安裝 firebase-admin: pip install firebase-admin")
    sys.exit(1)

def init_firebase():
    """初始化 Firebase Admin SDK"""
    try:
        # 檢查是否已經初始化
        firebase_admin.get_app()
        print("✅ Firebase 已經初始化")
    except ValueError:
        service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        if not service_account_json:
            print("❌ 未設置 FIREBASE_SERVICE_ACCOUNT_JSON")
            return None

        try:
            service_account = json.loads(service_account_json)
            if service_account.get("project_id") != "brainless-schedule":
                raise ValueError("憑證不屬於 brainless-schedule 專案")
            cred = credentials.Certificate(service_account)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase 初始化成功")
        except Exception as e:
            print(f"❌ Firebase 初始化失敗: {e}")
            return None
    
    return firestore.client()

def save_to_firebase(db, data_dir, requested_files=None):
    """驗證全部 JSON 後原子寫入 Firebase；任一筆失敗就不改動既有資料。"""
    if not db:
        return False

    json_files = [Path(path) for path in requested_files] if requested_files else sorted(Path(data_dir).glob("flight-data-*.json"))
    if not json_files:
        print("❌ 沒有找到 JSON 檔案")
        return False

    print(f"📁 找到 {len(json_files)} 個 JSON 檔案")
    records = []
    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            date_key = data.get("date")
            expected_date = json_file.stem.replace("flight-data-", "")
            flights = data.get("flights")
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_key or "") or date_key != expected_date:
                raise ValueError("檔名與 date 不一致")
            if not isinstance(flights, list) or not flights:
                raise ValueError("flights 必須是非空陣列")
            if data.get("summary", {}).get("total_flights") != len(flights):
                raise ValueError("summary.total_flights 與 flights 數量不一致")
            if any(not re.fullmatch(r"D\d{1,2}[LR]?", flight.get("gate", "")) or flight.get("type") != "departure" for flight in flights):
                raise ValueError("包含非 D 區離境航班")
            records.append((date_key, data))
        except Exception as e:
            print(f"❌ 驗證 {json_file.name} 失敗: {e}")
            return False

    try:
        batch = db.batch()
        stored_at = datetime.now(timezone.utc).isoformat()
        for date_key, data in records:
            batch.set(db.collection("flightData").document(date_key), {**data, "_stored_at": stored_at})
        batch.commit()
        for date_key, data in records:
            print(f"✅ 已存儲到 Firebase: {date_key} ({len(data['flights'])} 班)")
        print(f"\n✅ Firebase 存儲完成！\n   - 成功存儲: {len(records)} 個日期")
        return True
    except Exception as e:
        print(f"❌ Firebase 原子寫入失敗: {e}")
        return False

def main():
    """主函數"""
    # 獲取 data 目錄路徑
    script_dir = Path(__file__).parent.parent.parent
    data_dir = script_dir / "data"
    
    if not data_dir.exists():
        print(f"❌ 資料目錄不存在: {data_dir}")
        sys.exit(1)
    
    # 初始化 Firebase
    db = init_firebase()
    
    # 存儲到 Firebase
    if db:
        if not save_to_firebase(db, data_dir, sys.argv[1:]):
            sys.exit(1)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
