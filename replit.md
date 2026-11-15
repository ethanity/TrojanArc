# Trojan Arc

A personal college-success and network hub for USC students. One Next.js 16 app (React UI + API routes in the same project), run with plain **npm** (no pnpm workspace).

## Run and verify

- Use **Run** (workflow `Project`): `npm run dev -- -H 0.0.0.0 -p 3000`. UI at `/`, API at `/api/*`.
- After pulling, Replit runs `scripts/post-merge.sh` (`npm install`).
- `npm run typecheck` and `npm run lint` check the code.
- `npm test` runs unit tests: AI rate limit + upload limits (`tests/ai-rate-limit.test.mjs`) and public-site SSRF filtering (`tests/public-website.test.ts`).
- `npm run test:arc` (needs the app running) checks the page and all API routes. Set `ARC_TEST_URL` to test another address.
- `npm run test:arc:browser` (needs the app running) exercises demo onboarding, all six tabs, advice, quest completion and persisted XP, and a mobile sample calendar. Uses Playwright's Chromium or `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Screenshots go to the ignored `generated-artifacts/arc-tests/`.
- Deploy: `npm run build` then `npm run start -- -H 0.0.0.0` (configured in `.replit`). The main public deployment is Vercel, which redeploys automatically on every push to `main`.

## Configuration

- `ANTHROPIC_API_KEY` (server secret, optional): enables live Claude. Without it, clearly labeled demo responses are used.
- `DEMO_MODE=1` (optional): forces demo AI behavior.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (public build-time setting, optional): Google Calendar browser OAuth client. Add the app's domain to the allowed JavaScript origins. Without it, sample-calendar mode remains available.
- Never commit keys. Put them in Replit Secrets, Vercel environment variables, or an untracked `.env.local`.
- No database. Progress lives in browser localStorage (`trojan-arc:v1`, `trojan-arc:cal`).

## Protections

- AI routes are wrapped with `withAiGuard` (`src/lib/ai-rate-limit.ts`): 10 live-AI requests per 15 minutes per IP (demo mode is not limited), 2 MB JSON / 10 MB multipart body limits.
- Public website fetching (`src/lib/public-website.ts`) blocks private/internal addresses, checks DNS answers and redirects, and caps download size.
- See `threat_model.md`.

## Preservation boundaries

- Preserve screens, fonts, colors, tab navigation, demo content, and API response shapes.
- Keep browser-storage keys and shapes unchanged.
- Documents sent during onboarding are processed for that request, not stored.
- The previous Vite + Express version is kept in git history under the tag `vite-version`.

## Key source locations

- `src/app/page.tsx`: six-tab app shell.
- `src/components/`: screens, onboarding, `RescanDocuments.tsx` pop-up.
- `src/app/globals.css`: theme, animations, typography.
- `src/app/api/*/route.ts`: API routes (onboard, interview, roadmap, advice, radar, status, healthz).
- `src/lib/`: Claude helper, demo data, schemas, rate limit, public-site fetch, data (resources, USC majors).
- `docs/openapi.yaml`: API inventory.
