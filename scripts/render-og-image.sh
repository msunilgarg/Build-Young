#!/usr/bin/env bash
# Render scripts/og-image.html -> build-young-app/public/og-image.png (1200×630).
# The social/link-preview card. Edit scripts/og-image.html (keep copy consistent with index.html's
# OG meta + POSITIONING.md), then run this. One command:  bash scripts/render-og-image.sh
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

SRC="scripts/og-image.html"
OUT="build-young-app/public/og-image.png"

# Find a headless Chromium: a Puppeteer-cached one (used by the diagram renderer) or a system chrome.
CHROME=""
for c in \
  "$(ls -d "$HOME"/.cache/puppeteer/chrome/*/chrome-linux64/chrome 2>/dev/null | head -1)" \
  /opt/pw-browsers/chromium-*/chrome-linux/chrome \
  "$(command -v google-chrome 2>/dev/null)" \
  "$(command -v chromium 2>/dev/null)" \
  "$(command -v chromium-browser 2>/dev/null)"; do
  if [[ -n "$c" && -x "$c" ]]; then CHROME="$c"; break; fi
done
[[ -z "$CHROME" ]] && { echo "No Chromium found (expected a Puppeteer cache or system chrome)." >&2; exit 1; }
echo "Using Chromium: $CHROME"

# --virtual-time-budget lets the web fonts load before the screenshot is taken.
"$CHROME" --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --default-background-color=FFFFFFFF --virtual-time-budget=4000 \
  --screenshot="$OUT" "file://$(pwd)/$SRC" >/dev/null 2>&1

echo "Wrote $OUT"
