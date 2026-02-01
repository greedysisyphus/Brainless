#!/bin/bash
# 驗證構建文件是否完整
# 此腳本用於確保構建後的重要文件存在

set -e

echo "檢查構建文件..."

# 檢查 index.html
if [ ! -f docs/index.html ]; then
  echo "❌ 錯誤: docs/index.html 不存在！"
  exit 1
fi

# 檢查 assets 目錄
if [ ! -d docs/assets ]; then
  echo "❌ 錯誤: docs/assets 目錄不存在！"
  exit 1
fi

# 檢查 assets 目錄是否為空
if [ -z "$(ls -A docs/assets 2>/dev/null)" ]; then
  echo "❌ 錯誤: docs/assets 目錄為空！"
  exit 1
fi

# 檢查是否有主要的 JS 文件
if [ -z "$(ls docs/assets/*.js 2>/dev/null)" ]; then
  echo "❌ 錯誤: docs/assets 中沒有 JS 文件！"
  exit 1
fi

echo "✓ 所有構建文件檢查通過"
