#!/usr/bin/env bash
# Build Young commit-message guard — installed into .git/hooks/commit-msg by session-start.sh.
# Blocks a commit whose MESSAGE contains an internal/undercover model identifier in its bracketed
# form (a claude model id followed by [Nm]). Public model ids (e.g. claude-haiku-4-5) are allowed —
# only the bracketed internal form is rejected, since it must never appear in a pushed artifact.
set -u
msg_file="${1:-}"
[ -n "$msg_file" ] && [ -f "$msg_file" ] || exit 0
if grep -qiP 'claude-[a-z]+-[0-9]+(-[0-9]+)?\[[0-9]+m\]' "$msg_file"; then
  echo "COMMIT BLOCKED: the commit message contains an internal (bracketed) model identifier. Remove it." >&2
  exit 1
fi
exit 0
