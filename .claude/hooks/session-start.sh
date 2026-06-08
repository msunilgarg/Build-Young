#!/usr/bin/env bash
# SessionStart hook for Build Young.
# 1. Make sure deps are installed in build-young-app (the web env clones fresh each session).
# 2. Surface git HEAD vs origin/main so a STALE MIRROR is obvious immediately — the recurring
#    trap where the working tree is on an old SHA/branch and tests/build look wrong.
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="$ROOT/build-young-app"

[ -d "$APP/node_modules" ] || ( cd "$APP" && npm install --silent >/dev/null 2>&1 ) || true
git -C "$ROOT" fetch origin main --quiet 2>/dev/null || true

head=$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null)
branch=$(git -C "$ROOT" branch --show-current 2>/dev/null)
omain=$(git -C "$ROOT" rev-parse --short origin/main 2>/dev/null)
echo "[build-young] HEAD ${head:-?} on ${branch:-?} | origin/main ${omain:-?}. If these differ unexpectedly, resync to origin/main before building."
exit 0
