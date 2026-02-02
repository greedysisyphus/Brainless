#!/bin/bash
# 同步資料文件到 public/data/ 供本地開發使用

echo "同步資料文件到 public/data/..."

# 確保目錄存在
mkdir -p public/data

# 複製資料文件
if [ -d "data" ] && [ "$(ls -A data/*.json 2>/dev/null)" ]; then
  cp data/*.json public/data/ 2>/dev/null
  echo "✅ 資料文件已同步到 public/data/"
  echo "   檔案數量: $(ls -1 public/data/*.json 2>/dev/null | wc -l)"
else
  echo "⚠️  警告: data/ 目錄不存在或沒有 JSON 檔案"
fi
