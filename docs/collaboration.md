# Two AIs, one product

Crawler is built by two AI assistants working side by side, coordinated by the founder.

| | Claude (Claude Code) | ChatGPT (Codex) |
|---|---|---|
| **Job** | Product: the engine | Design: how it looks and feels |
| **Branches** | `claude/...` | `codex/...` |
| **Instructions file** | `CLAUDE.md` | `AGENTS.md` |

## Who owns which files

**Claude owns (product):**
- `src/lib/**`: crawler, explorer, personas, AI calls, math
- `src/app/api/**`: server routes
- `scripts/**`, `tsconfig.bench.json`: accuracy benches
- `public/demo/**`: practice sites for the benches
- `docs/persona-research.md`

**ChatGPT owns (design):**
- `src/components/**`: AudiencePicker, ProfileEditor, ExplorePanel, JourneyView, Report
- `src/app/page.tsx`, `src/app/run/[id]/page.tsx`, `src/app/layout.tsx`: the pages
- `src/app/globals.css`: colors, fonts, theme
- `public/` images and icons (not `public/demo/`)

**Shared (change carefully, and say so in the pull request):**
- `src/lib/types.ts` holds the **data shapes** both sides depend on. It's the contract between the engine and the screens.
  - Only Claude changes it.
  - If design needs new data (say, a new number on the report), ChatGPT writes the request in `docs/requests.md` and Claude adds it.
- `package.json`. Neither AI installs anything without the founder's OK.

## The rules
1. **Stay in your own files.** If you need a change in the other side's files, write it in `docs/requests.md` instead of editing.
2. **One branch per task, then a pull request.** The founder reviews and merges. Never push straight to the other AI's branch.
3. **Before you open a pull request:**
   - run `npx tsc --noEmit` and `npm run lint`, and both must pass
   - if you touched the crawler or explorer, `npm run bench` must not go down
4. **Never commit `.env.local` or any API key.**
5. **Explain changes in plain English.** The founder is in high school and wants to understand everything.

## How a typical round works
1. The founder gives each AI a task: for example, Claude adds "re-run on the same personas", and ChatGPT redesigns the report page.
2. Each one works on its own branch and opens a pull request.
3. The founder merges one, then tells the other AI to pull the latest code before continuing. This avoids clashes.
