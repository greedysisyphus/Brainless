#!/bin/bash
# 測試腳本 - 驗證 GitHub Pages 方案是否可行

echo "🧪 測試 GitHub Pages 方案"
echo "================================"

# 檢查 Python 是否安裝
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安裝"
    exit 1
fi

echo "✅ Python3 已安裝: $(python3 --version)"

# 檢查依賴是否安裝
cd "$(dirname "$0")"
if [ ! -f "requirements.txt" ]; then
    echo "❌ requirements.txt 不存在"
    exit 1
fi

echo "📦 安裝依賴..."
pip3 install -q -r requirements.txt

# 執行測試
echo ""
echo "🔍 執行爬蟲測試..."
python3 test-scraper.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 所有測試通過！"
    echo ""
    echo "📝 下一步："
    echo "1. 將 .github/workflows/update-flight-data.yml 加入倉庫"
    echo "2. 將 scripts/flight-data-reader.js 和 scripts/flight-display.html 加入倉庫"
    echo "3. 在 GitHub 設定中啟用 GitHub Pages"
    echo "4. GitHub Actions 會自動執行並更新 data/ 目錄中的 JSON 檔案"
    echo "5. 前端頁面可以直接讀取這些 JSON 檔案"
else
    echo ""
    echo "❌ 測試失敗，請檢查錯誤訊息"
    exit 1
fi
