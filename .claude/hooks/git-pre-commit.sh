#!/usr/bin/env bash
# Build Young commit content guard — installed into .git/hooks/pre-commit by session-start.sh, so it
# runs on EVERY commit regardless of how it's invoked. Inspects the STAGED diff (added lines only).
#
#   HARD BLOCK: an internal/undercover model identifier in its bracketed form (e.g. a claude model id
#               followed by [Nm]). This must never land in a committed artifact. The PUBLIC model ids
#               used in app config (e.g. claude-haiku-4-5, no bracket) are intentionally NOT matched.
#   ADVISORY:   a literal \uXXXX escape (write the real character), or a resurrected money-simulation
#               marker (the program is pure entrepreneurship now). Warned, never blocked.
set -u
diff=$(git diff --cached -U0 2>/dev/null)

if printf '%s' "$diff" | grep -qiP '^\+.*claude-[a-z]+-[0-9]+(-[0-9]+)?\[[0-9]+m\]'; then
  echo "COMMIT BLOCKED: the staged diff contains an internal (bracketed) model identifier. Remove it before committing." >&2
  exit 1
fi

# HARD BLOCK: a stale architecture diagram. If this commit touches the architecture doc or its exports,
# the rendered exports must match the current Mermaid source (enforced by a hash, so you can't "edit the
# diagram and forget to re-render"). Mechanical, not vigilance. See scripts/check-architecture-current.sh.
if git diff --cached --name-only 2>/dev/null | grep -qE '^(BUILD-YOUNG-ARCHITECTURE\.md|docs/architecture/)'; then
  if [ -x scripts/check-architecture-current.sh ] && ! scripts/check-architecture-current.sh >/dev/null 2>&1; then
    echo "COMMIT BLOCKED: the architecture diagram is out of sync with BUILD-YOUNG-ARCHITECTURE.md." >&2
    echo "  Run:  bash scripts/render-architecture.sh   then stage docs/architecture/ and re-commit." >&2
    exit 1
  fi
fi

warn=""
printf '%s' "$diff" | grep -qP '^\+.*\\u[0-9a-fA-F]{4}' && warn="${warn}
  - a literal \\uXXXX escape — write the real character (—, ·, …) instead"
printf '%s' "$diff" | grep -qiE '^\+.*(netWorth|holdingsTotal|RISK_PRESETS|PortfolioPanel|marketSchedule|incomeFor)' && warn="${warn}
  - a removed money-simulation marker — the program is pure entrepreneurship now (ignore if this is a doc/comment note)"
[ -n "$warn" ] && printf 'GUARD (advisory — commit allowed): the staged diff adds:%s\n' "$warn" >&2
exit 0
