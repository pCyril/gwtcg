<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Changelog

Before committing any player-facing change, add a bullet to `src/lib/changelog.ts`:

- Add it to both the `fr` and `en` arrays of the entry for today's date (`YYYY-MM-DD`), or create a new entry at the top of `CHANGELOG` (newest first) if today doesn't have one yet.
- Write it in plain, player-facing language — describe what changed for a user of the app, not the implementation, and not the raw commit message.
- Skip purely internal changes (CI/CD, refactors, dependency bumps, infra, bug fixes with no visible behavior change) that a player wouldn't notice.
