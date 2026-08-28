# 航班資料爬蟲

CI 每小時執行，把桃園機場航班寫進倉庫根目錄的 `data/`。

現行腳本（不要改用 archive 裡的舊爬蟲）：

| 檔案 | 用途 |
|------|------|
| `fetch-from-txt-api.py` | 主爬蟲 |
| `compare-data.py` | 判斷是否有實質變化，決定要不要部署 |
| `save-to-firebase.py` | 寫入 Firebase（失敗不阻擋主流程） |
| `requirements.txt` | CI pip 依賴 |

本機：

```bash
cd scripts/scraper
pip install -r requirements.txt
python3 fetch-from-txt-api.py
```

舊版官網爬蟲、WordPress 探測、Tampermonkey 等已移到 `scripts/scraper/archive/` 與 `scripts/archive/`。
