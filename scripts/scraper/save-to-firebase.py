#!/usr/bin/env python3
"""
將航班資料存儲到 Firebase Firestore
"""

import json
import os
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

# 全局變數存儲 db 實例
_db_instance = None

def get_db():
    """獲取 Firebase 資料庫實例"""
    global _db_instance
    if _db_instance is None:
        _db_instance = init_firebase()
    return _db_instance

def save_single_date_to_firebase(date_key, data):
    """存儲單個日期的資料到 Firebase"""
    db = get_db()
    if not db:
        return False
    
    try:
        collection_name = "flightData"
        
        # 添加存儲時間戳
        data["_stored_at"] = datetime.now(timezone.utc).isoformat()
        
        # 存儲到 Firestore
        doc_ref = db.collection(collection_name).document(date_key)
        doc_ref.set(data)
        
        print(f"✅ 已存儲到 Firebase: {date_key} ({data.get('summary', {}).get('total_flights', 0)} 班)")
        return True
    except Exception as e:
        print(f"❌ Firebase 存儲失敗: {e}")
        return False

def save_to_firebase(db, data_dir, requested_files=None):
    """將指定 JSON 檔案存儲到 Firebase；未指定時才讀取全部。"""
    if not db:
        return False
    
    collection_name = "flightData"
    saved_count = 0
    skipped_count = 0
    
    # 讀取 data 目錄中的所有 JSON 檔案
    json_files = [Path(path) for path in requested_files] if requested_files else sorted(Path(data_dir).glob("flight-data-*.json"))
    
    if not json_files:
        print("⚠️  沒有找到 JSON 檔案")
        return False
    
    print(f"📁 找到 {len(json_files)} 個 JSON 檔案")
    
    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 使用日期作為文檔 ID
            date_key = data.get("date")
            if not date_key:
                # 從檔案名稱提取日期
                date_key = json_file.stem.replace("flight-data-", "")
            
            if save_single_date_to_firebase(date_key, data):
                saved_count += 1
            else:
                skipped_count += 1
            
        except Exception as e:
            print(f"❌ 存儲 {json_file.name} 失敗: {e}")
            skipped_count += 1
    
    print(f"\n✅ Firebase 存儲完成！")
    print(f"   - 成功存儲: {saved_count} 個日期")
    if skipped_count > 0:
        print(f"   - 跳過/失敗: {skipped_count} 個日期")
    return skipped_count == 0

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
