---
description: Build, test, guard, commit, PR, squash-merge, and sync main — the full Build Young ship-cycle in one step.
---

Ship the current working-tree changes through Build Young's standard flow. Take the commit
message / PR title from `$ARGUMENTS` (ask if it's empty).

Run these steps in order, stopping and reporting if any step fails:

1. **Verify base.** Make sure the working branch is the designated dev branch off the latest
   `origin/main` (fetch `origin/main` first; if the local tree is stale or on the wrong branch,
   `git checkout -f -B <dev-branch> origin/main` and re-apply the intended edits). Never build on a
   stale mirror — confirm `git log -1 origin/main` matches the expected SHA.
2. **Build + test in `build-young-app/`.** `npm run build` (must pass, incl. the postbuild
   prerender) then `npm test` (all tests must pass — note the count; it should not drop).
3. **Guards (all must be zero):**
   - No reintroduced finance/money-sim markers (the codebase is pure entrepreneurship now).
   - No literal `\uXXXX` escapes in the diff — write real characters in heredocs:
     `git diff --cached | grep -c '\\u[0-9a-fA-F]\{4\}'` → must be 0.
4. **Commit.** Author `Claude <noreply@anthropic.com>`. Use `git commit -F -` with a heredoc so
   apostrophes don't break the shell. NEVER put the model id or any internal identifier in the
   commit message, PR title/body, or code.
5. **Push** with `git push -u origin <dev-branch>` (retry up to 4× with exponential backoff on
   network errors only).
6. **PR + merge.** Open a PR to `main` via the GitHub MCP tools (repo `msunilgarg/builtyoung`),
   then **squash-merge** it. End the PR body with the session link footer.
7. **Sync main.** Fetch `origin/main` (retry until the merge SHA is present), then
   `git checkout main && git reset --hard <merge-sha>`; confirm `git log --oneline -1`.

Report the final merged SHA and the test count. Keep replies terse — the PR diff is the record.
