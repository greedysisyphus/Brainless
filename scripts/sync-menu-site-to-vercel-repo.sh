#!/usr/bin/env bash
# 將 Brainless/menu-site/ 同步到 simplekaffa-menu repo 並 push（觸發 Vercel deploy）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MENU_SRC="$ROOT/menu-site"
WORK_DIR="${TMPDIR:-/tmp}/simplekaffa-menu-sync-$$"
REPO_URL="https://github.com/greedysisyphus/simplekaffa-menu.git"

echo "→ Clone $REPO_URL"
git clone --depth 1 "$REPO_URL" "$WORK_DIR"

echo "→ Rsync menu-site/（排除 node_modules、dist）"
rsync -a --delete \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.git' \
  "$MENU_SRC/" "$WORK_DIR/"

cd "$WORK_DIR"
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "✓ 無變更，略過 push"
  rm -rf "$WORK_DIR"
  exit 0
fi

echo "→ Commit & push"
git add -A
git commit -m "Sync menu-site from Brainless ($(date +%Y-%m-%d))"
git push origin main

rm -rf "$WORK_DIR"
echo "✓ 已 push。Vercel 約 1～2 分鐘內更新：https://simplekaffa-menu.vercel.app/"
