#!/usr/bin/env bash
# PostToolUse(Write|Edit) hook for Build Young.
# Warn if the just-written file contains a literal \uXXXX escape — heredoc/written content
# should carry the real character (—, ·, etc.), never the escape sequence. Advisory only
# (never blocks). App.jsx currently has zero such escapes, so this is quiet in practice.
set -u
f=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty' 2>/dev/null)
[ -n "$f" ] && [ -f "$f" ] || exit 0
if grep -qP '\\u[0-9a-fA-F]{4}' "$f"; then
  echo "GUARD: literal \\uXXXX escape found in $f — write the real character, not the escape sequence."
fi
exit 0
