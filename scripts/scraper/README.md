# 航班資料爬蟲

CI 每小時執行，把桃園機場航班寫進 Firestore。產生在 `data/` 的檔案只存在於該次 CI，不提交到 Git。

現行腳本（不要改用 archive 裡的舊爬蟲）：

| 檔案 | 用途 |
|------|------|
| `fetch-from-txt-api.py` | 主爬蟲 |
| `save-to-firebase.py` | 寫入本次產生的 Firebase 文件，失敗時讓 CI 失敗 |
| `requirements.txt` | CI pip 依賴 |

本機：

```bash
cd scripts/scraper
pip install -r requirements.txt
python3 fetch-from-txt-api.py
```

本機不帶檔名執行 `save-to-firebase.py` 時仍會處理 `data/` 全部檔案；CI 會明確傳入本次變動的檔名。

舊版官網爬蟲、WordPress 探測、Tampermonkey 等已移到 `scripts/scraper/archive/` 與 `scripts/archive/`。
