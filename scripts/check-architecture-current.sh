#!/usr/bin/env bash
# Mechanically verify the architecture diagram is CURRENT — i.e. the rendered exports were regenerated
# after the last edit to a ```mermaid block in BUILD-YOUNG-ARCHITECTURE.md. This removes the reliance on
# remembering to run the renderer: a stale diagram fails the check (and the commit guard + CI that call it).
#
# How: hash the Mermaid source blocks and compare to docs/architecture/.source-hash, which the renderer
# (scripts/render-architecture.sh) writes every time it renders. Deterministic + environment-independent
# (just hashes text — no Chromium, no cross-machine PNG-byte differences). If they differ, the source was
# edited without re-rendering. One command:  bash scripts/check-architecture-current.sh
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

SRC="BUILD-YOUNG-ARCHITECTURE.md"
HASHFILE="docs/architecture/.source-hash"

cur=$(python3 - "$SRC" <<'PY'
import re, sys, hashlib
blocks = re.findall(r"```mermaid\n(.*?)```", open(sys.argv[1]).read(), re.S)
print(hashlib.sha256("\x00".join(blocks).encode()).hexdigest())
PY
)

have=""
[ -f "$HASHFILE" ] && have="$(tr -d '[:space:]' < "$HASHFILE")"

if [ "$cur" != "$have" ]; then
  echo "✗ ARCHITECTURE DIAGRAM OUT OF SYNC" >&2
  echo "  The Mermaid source in $SRC changed but the rendered exports weren't regenerated." >&2
  echo "  Fix:  bash scripts/render-architecture.sh   (then commit docs/architecture/)" >&2
  exit 1
fi

echo "✓ Architecture diagram exports are in sync with $SRC."
