#!/bin/bash
# mono-repo 동기화 스크립트
# kanban-board → kosa-vibecoding-2026-3rd/src/exercise/sye0ni/day03/kanban

set -e

SRC="$(cd "$(dirname "$0")" && pwd)"
DST="/home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/sye0ni/day03/kanban"

echo "동기화 시작: $SRC → $DST"

rsync -av --exclude='config.js' "$SRC/frontend/" "$DST/frontend/"
rsync -av "$SRC/backend/" "$DST/backend/"
rsync -av "$SRC/config/" "$DST/config/"

echo ""
echo "동기화 완료!"
echo "mono-repo 커밋/푸시는 직접 해주세요:"
echo "  cd $DST && git add -p && git commit -m '...' && git push"
