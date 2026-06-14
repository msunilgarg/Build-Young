#!/usr/bin/env bash
# Render the Mermaid diagrams in BUILD-YOUNG-ARCHITECTURE.md to versioned exports (docs/architecture/).
# Run this in the SAME change whenever you edit a ```mermaid block in BUILD-YOUNG-ARCHITECTURE.md, so the
# rendered exports never drift from the source. One command:  bash scripts/render-architecture.sh
#
# Outputs, per diagram:  <name>.png (quick inline preview)  +  <name>.pdf (vector — zoom without pixelating).
# Why bother when GitHub renders Mermaid natively? The exports are readable where Mermaid ISN'T rendered
# — chat, slide decks, PDFs, the app — and the PDF is zoomable for the dense diagrams.
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

SRC="BUILD-YOUNG-ARCHITECTURE.md"
OUT="docs/architecture"
mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Puppeteer needs --no-sandbox when the renderer runs as root (CI / containers).
echo '{"args":["--no-sandbox","--disable-setuid-sandbox"]}' > "$TMP/pconf.json"

# Extract each ```mermaid fenced block into its own .mmd file, in document order.
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

# Diagrams in their order in BUILD-YOUNG-ARCHITECTURE.md: ① the loop, ② parallel fan-out, ③ the app.
names=("loop" "parallel" "app")
i=1
for f in "$TMP"/block*.mmd; do
  name="${names[$((i-1))]:-diagram$i}"
  echo "rendering $f -> $OUT/$name.{png,pdf}"
  npx -y @mermaid-js/mermaid-cli@latest -p "$TMP/pconf.json" -i "$f" -o "$OUT/$name.png" -w 1800 -b white
  npx -y @mermaid-js/mermaid-cli@latest -p "$TMP/pconf.json" -i "$f" -o "$OUT/$name.pdf" --pdfFit -b white
  i=$((i+1))
done
echo "Done. Wrote PNG + PDF to $OUT/"

# Record a hash of the Mermaid source blocks so the currency check (scripts/check-architecture-current.sh)
# can mechanically detect "edited the diagram but didn't re-render". Uses the SAME extraction as above.
python3 - "$SRC" "$OUT/.source-hash" <<'PY'
import re, sys, hashlib
blocks = re.findall(r"```mermaid\n(.*?)```", open(sys.argv[1]).read(), re.S)
open(sys.argv[2], "w").write(hashlib.sha256("\x00".join(blocks).encode()).hexdigest() + "\n")
PY
echo "Wrote source hash to $OUT/.source-hash"
