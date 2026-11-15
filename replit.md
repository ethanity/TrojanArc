# Trojan Arc

A personal college-success and network hub for USC students, ported from the imported Vercel app without redesigning it.

## Run and verify

- Use **Run** or the managed workflows `artifacts/trojan-arc: web` and `artifacts/api-server: API Server`.
- Web frontend: `artifacts/trojan-arc`, served at `/`.
- Express backend: `artifacts/api-server`, served at `/api`.
- `pnpm --filter @workspace/scripts test:arc` checks the running frontend and all six migrated API routes through the shared proxy.
- `pnpm --filter @workspace/scripts test:arc:browser` exercises demo onboarding, all six tabs, advice, quest completion and persisted XP, and a mobile sample calendar. Uses Playwright's installed Chromium, or `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Screenshots go to the ignored `generated-artifacts/arc-tests/` directory.
- `pnpm --filter @workspace/scripts test:arc:security` checks public-site address filtering, DNS answers, redirected destinations, and streamed download limits.
- `pnpm --filter @workspace/trojan-arc typecheck` and `pnpm --filter @workspace/api-server typecheck` check the migrated packages.
- `pnpm --filter @workspace/api-spec codegen` updates generated API clients.

## Configuration

- `ANTHROPIC_API_KEY` (server secret, optional): enables the original Claude AI integration. Without it the original clearly labeled demo responses remain available.
- `DEMO_MODE=1` (optional): forces demo AI behavior.
- `VITE_GOOGLE_CLIENT_ID` (public build-time setting, optional): the original Google Calendar browser OAuth client, renamed from `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Configure allowed JavaScript origins for the domain used to access the app. Without it, sample-calendar mode remains available.
- No database is required by the imported app. The scaffold's database packages are retained but not used.

## Preservation boundaries

- Preserve the original screens, fonts, colors, tab navigation, demo content, and API response envelopes.
- Keep the existing browser-storage keys and shapes: progress is device/browser-local, not an account or shared database. Progress on the old Vercel origin does not automatically appear on a new Replit origin.
- Documents sent during onboarding are processed for that request, not stored permanently.
- The import is retained in `.migration-backup/` for reference and excluded from publishing.
- Next.js rendering and route wrappers were replaced with React/Vite and Express; app-specific Claude logic and public opportunity-feed behavior remain unchanged.

## Key source locations

- `artifacts/trojan-arc/src/pages/home.tsx`: original six-tab app shell.
- `artifacts/trojan-arc/src/components/`: original screens and onboarding.
- `artifacts/trojan-arc/src/index.css`: original theme, animations, and typography.
- `artifacts/api-server/src/routes/trojan/`: standard Request/Response handlers mounted in Express, including multipart onboarding.
- `lib/api-spec/openapi.yaml`: API inventory; detailed imported domain validation remains in the backend's `lib/schemas.ts`.
