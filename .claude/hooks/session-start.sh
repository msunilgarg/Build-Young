#!/usr/bin/env bash
# SessionStart hook for Build Young.
#
# The web env clones fresh each session and has repeatedly come up on a STALE branch/SHA, so every
# task used to start with a manual "fetch origin main + hard checkout" dance. This hook removes that:
#   1. Ensure deps are installed in build-young-app.
#   2. Fetch origin/main.
#   3. If — and ONLY if — the workspace is CLEAN and carries no local commits that aren't already in
#      origin/main, resync it to origin/main automatically. A dirty tree or unpushed local commits
#      are left untouched (we only warn), so this can never clobber real work.
#   4. Install the repo's commit guards into .git/hooks (git runs them at the real commit moment).
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="$ROOT/build-young-app"

[ -d "$APP/node_modules" ] || ( cd "$APP" && npm install --silent >/dev/null 2>&1 ) || true
git -C "$ROOT" fetch origin main --quiet 2>/dev/null || true

head=$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null)
branch=$(git -C "$ROOT" branch --show-current 2>/dev/null)
omain=$(git -C "$ROOT" rev-parse --short origin/main 2>/dev/null)
dirty=$(git -C "$ROOT" status --porcelain 2>/dev/null)
# Commits on HEAD that origin/main doesn't already contain. "0" = HEAD is at/behind main (safe to
# advance). Anything else (or "?" on error) means there's unique local work — don't touch it.
unique=$(git -C "$ROOT" rev-list --count HEAD ^origin/main 2>/dev/null || echo "?")

if [ -n "$omain" ] && [ -z "$dirty" ] && [ "$unique" = "0" ] && [ "$head" != "$omain" ]; then
  git -C "$ROOT" checkout -q -B main origin/main 2>/dev/null && git -C "$ROOT" reset -q --hard origin/main 2>/dev/null
  echo "[build-young] Clean workspace was stale — resynced to origin/main ($omain)."
elif [ -n "$omain" ] && [ "$head" != "$omain" ]; then
  echo "[build-young] HEAD ${head:-?} on ${branch:-?} differs from origin/main ${omain} (uncommitted changes or unpushed local commits) — left as-is; resync manually if that's unexpected."
else
  echo "[build-young] Workspace is on origin/main (${omain:-?})."
fi

# Wire the commit guards into git's native hooks so they run on EVERY commit, however it's invoked.
hooks_dir=$(git -C "$ROOT" rev-parse --git-path hooks 2>/dev/null)
if [ -n "$hooks_dir" ]; then
  mkdir -p "$hooks_dir"
  for h in pre-commit commit-msg; do
    src="$ROOT/.claude/hooks/git-$h.sh"
    [ -f "$src" ] && cp "$src" "$hooks_dir/$h" 2>/dev/null && chmod +x "$hooks_dir/$h" 2>/dev/null
  done
fi
exit 0
