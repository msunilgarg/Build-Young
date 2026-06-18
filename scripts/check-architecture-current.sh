#!/usr/bin/env bash
# Mechanically verify the architecture diagram is CURRENT — i.e. the rendered exports were regenerated
# after the last edit to a ```mermaid block in BUILD-YOUNG-ARCHITECTURE.md. This removes the reliance on
# remembering to run the renderer: a stale diagram fails the check (and the commit guard + CI that call it).
#
# How: hash BOTH diagram sources — the ```mermaid block(s) in BUILD-YOUNG-ARCHITECTURE.md AND the
# interactive docs/architecture/loop.html (the single source) — and compare to docs/architecture/.source-hash,
# which the renderer (scripts/render-architecture.sh) writes every time it renders. Deterministic + environment-
# independent (just hashes text — no Chromium, no cross-machine byte differences). If they differ, a
# source was edited without re-rendering. One command:  bash scripts/check-architecture-current.sh
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

SRC="BUILD-YOUNG-ARCHITECTURE.md"
HTML="docs/architecture/loop.html"
HASHFILE="docs/architecture/.source-hash"

cur=$(python3 - "$SRC" "$HTML" <<'PY'
import re, sys, hashlib
blocks = re.findall(r"```mermaid\n(.*?)```", open(sys.argv[1]).read(), re.S)
html = open(sys.argv[2]).read()
print(hashlib.sha256(("\x00".join(blocks) + "\x00HTML\x00" + html).encode()).hexdigest())
PY
)

have=""
[ -f "$HASHFILE" ] && have="$(tr -d '[:space:]' < "$HASHFILE")"

if [ "$cur" != "$have" ]; then
  echo "✗ ARCHITECTURE DIAGRAM OUT OF SYNC" >&2
  echo "  A diagram source ($SRC mermaid block or $HTML) changed but the exports weren't regenerated." >&2
  echo "  Fix:  bash scripts/render-architecture.sh   (then commit docs/architecture/)" >&2
  exit 1
fi

echo "✓ Architecture diagram exports are in sync with $SRC."
