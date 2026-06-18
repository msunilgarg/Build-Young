#!/usr/bin/env bash
# Render the architecture diagrams in BUILD-YOUNG-ARCHITECTURE.md to versioned exports (docs/architecture/).
# Two diagrams, two sources:
#   • the LOOP  — the INTERACTIVE, CLICKABLE docs/architecture/loop.html (the single source). This script
#                 screenshots it: loop.png = the collapsed overview (embedded inline in the doc),
#                 loop.pdf = the fully-expanded walkthrough (handout). Edit the HTML, then re-run this.
#   • the APP   — a ```mermaid block in BUILD-YOUNG-ARCHITECTURE.md, rendered with the Mermaid CLI.
# Run this in the SAME change whenever you edit the ```mermaid block OR loop.html, so the exports never
# drift from source. One command:  bash scripts/render-architecture.sh
#
# Outputs per diagram: <name>.png (preview) + <name>.pdf (zoomable vector — what we hand to humans).
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

SRC="BUILD-YOUNG-ARCHITECTURE.md"
OUT="docs/architecture"
mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Puppeteer needs --no-sandbox when the renderer runs as root (CI / containers).
echo '{"args":["--no-sandbox","--disable-setuid-sandbox"]}' > "$TMP/pconf.json"

# ── 1. APP diagram — render each ```mermaid block (currently just the app) ──────────────────────────
python3 - "$SRC" "$TMP" <<'PY'
import re, sys
src, tmp = sys.argv[1], sys.argv[2]
blocks = re.findall(r"```mermaid\n(.*?)```", open(src).read(), re.S)
if not blocks:
    sys.exit("no ```mermaid blocks found in " + src)
for i, b in enumerate(blocks, 1):
    open(f"{tmp}/block{i}.mmd", "w").write(b)
print(len(blocks))
PY
names=("app")   # ```mermaid blocks in document order (the loop is a hand-authored SVG, not a block)
i=1
for f in "$TMP"/block*.mmd; do
  name="${names[$((i-1))]:-diagram$i}"
  echo "rendering mermaid $f -> $OUT/$name.{png,pdf}"
  npx -y @mermaid-js/mermaid-cli@latest -p "$TMP/pconf.json" -i "$f" -o "$OUT/$name.png" -w 1800 -b white
  npx -y @mermaid-js/mermaid-cli@latest -p "$TMP/pconf.json" -i "$f" -o "$OUT/$name.pdf" --pdfFit -b white
  i=$((i+1))
done

# ── 2. LOOP diagram — render the canonical interactive HTML to PNG (overview) + PDF (handout) ─────────
# loop.html is the SINGLE SOURCE (clickable). Screenshot it via the Chrome the Mermaid step provisioned
# (puppeteer cache); puppeteer-core into a throwaway prefix so this doesn't touch the repo's deps.
echo "rendering $OUT/loop.html -> $OUT/loop.{png,pdf}"
npm i --prefix "$TMP/pp" puppeteer-core@latest >/dev/null 2>&1
CHROME="${PUPPETEER_EXECUTABLE_PATH:-$(ls -d "$HOME"/.cache/puppeteer/chrome/*/chrome-linux64/chrome 2>/dev/null | head -1)}"
NODE_PATH="$TMP/pp/node_modules" PUPPETEER_EXECUTABLE_PATH="$CHROME" node scripts/html-to-exports.cjs "$OUT/loop.html" "$OUT/loop"
echo "Done. Wrote PNG + PDF to $OUT/"

# ── 3. Currency hash — covers BOTH sources (mermaid blocks + loop.html) so the check (commit guard + CI)
#       blocks a commit/merge that edited a diagram source without regenerating the exports. ────────────
python3 - "$SRC" "$OUT/loop.html" "$OUT/.source-hash" <<'PY'
import re, sys, hashlib
blocks = re.findall(r"```mermaid\n(.*?)```", open(sys.argv[1]).read(), re.S)
html = open(sys.argv[2]).read()
h = hashlib.sha256(("\x00".join(blocks) + "\x00HTML\x00" + html).encode()).hexdigest()
open(sys.argv[3], "w").write(h + "\n")
PY
echo "Wrote source hash to $OUT/.source-hash"
