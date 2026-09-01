#!/usr/bin/env bash
# 把班表的純邏輯模組複製進 functions/，讓 Cloud Function 跟網站算出同一個答案。
#
# 部署只會上傳 functions/ 底下的檔案，所以不能直接 import ../src。複製而不是重寫，
# 是因為兩份實作一定會分岔——我們才因為發車時間寫兩份而顯示過錯的時間。
set -euo pipefail
cd "$(dirname "$0")/.."
DEST=functions/lib/shifts
rm -rf "$DEST" && mkdir -p "$DEST"
for f in src/pages/shifts/*.js; do
  # shiftFirestore 綁瀏覽器版 SDK，伺服器端用 firebase-admin，不複製
  [ "$(basename "$f")" = shiftFirestore.js ] && continue
  cp "$f" "$DEST/"
done
# 這些是 ES module，但 functions/ 根目錄是 CommonJS。放一個只作用於這層的
# package.json，Node 才不用「先當 CJS 解析失敗再改當 ESM」。
printf '{ "type": "module" }\n' > "$DEST/package.json"

echo "已同步 $(ls "$DEST" | wc -l | tr -d ' ') 個班表模組到 $DEST"
