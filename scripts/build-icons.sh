#!/usr/bin/env bash
# assets/icon.svg から src/icons/ の PNG を作り直す。
# rsvg-convert や ImageMagick は使わない。macOS 標準の qlmanage (SVG の
# レンダリング) と sips (縮小) だけで完結させ、環境構築を不要にするため。
set -euo pipefail

cd "$(dirname "$0")/.."

SRC="assets/icon.svg"
OUT="src/icons"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 一度 512px でレンダリングしてから縮小する。各サイズを個別にレンダリングするより
# 輪郭が安定する
qlmanage -t -s 512 -o "$TMP" "$SRC" >/dev/null 2>&1
BASE="$TMP/$(basename "$SRC").png"
[ -f "$BASE" ] || { echo "qlmanage が PNG を生成できませんでした: $SRC" >&2; exit 1; }

mkdir -p "$OUT"
for size in 16 32 48 128; do
  sips -z "$size" "$size" "$BASE" --out "$OUT/icon$size.png" >/dev/null
  echo "$OUT/icon$size.png"
done
