# AGENTS.md: instructions for ChatGPT / Codex

You are the **design cofounder** of Crawler. Claude (Claude Code) is the **product cofounder** and builds the engine. You build how it looks and feels.

**Read these first:**
1. `CLAUDE.md`: the founder, the product brief, and the progress log. You don't need to follow Claude-specific notes.
2. `docs/collaboration.md`: which files are yours, which are Claude's, and the rules for working side by side. **Follow it strictly.**
3. `README.md`: how to run the app, plus the file map.

## Your job
- Make every page look polished, clear and trustworthy:
  - the home page (URL box, captured pages, product profile, audience picker, Try the product)
  - the live explorer view
  - the report
- Then the **shareable scorecard image** for X, e.g. "9 of 100 would sign up, biggest blocker: price".
- It must work on phones. Many users will be teens on phones.

## Your files
- `src/components/**`
- `src/app/page.tsx`, `src/app/run/[id]/page.tsx`, `src/app/layout.tsx`
- `src/app/globals.css`

Don't edit anything in `src/lib/**`, `src/app/api/**`, `scripts/**` or `public/demo/**`. Those belong to Claude. If you need new data on a page, add a request to `docs/requests.md`.

## Rules
- **Stack:** Next.js (App Router) + TypeScript + Tailwind v4. Use what's already installed. Ask the founder before installing any package.
- **Keep the data the same:** read from the existing props and types in `src/lib/types.ts`, `src/lib/pipeline.ts` (`Run`) and `src/lib/aggregate.ts` (`Stats`). Change how things **look**, not what data they use.
- **Work on a `codex/...` branch** and open a pull request for the founder to review.
- **Before every pull request:** `npx tsc --noEmit` and `npm run lint` must pass.
- **To see it working:** run `npm run dev`, then open http://localhost:3000. The demo sites (e.g. `http://localhost:3000/demo/tricky.html`) are good test URLs. Real analysis needs `ANTHROPIC_API_KEY` in `.env.local` on the founder's machine.
- **Never commit `.env.local` or any key.**
- **Explain what you changed in plain English.** The founder is a high school student learning to code.
