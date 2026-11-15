# Threat Model

## Project Overview

Trojan Arc is a personal college-success hub for USC students, ported from a Vercel/Next.js app to a Replit pnpm workspace. It is split into two artifacts:

- `artifacts/trojan-arc` — a React/Vite single-page frontend served at `/`.
- `artifacts/api-server` — an Express backend served at `/api` that wraps a set of stateless, AI-backed endpoints (Anthropic Claude).

There is **no database, no user accounts, no sessions, and no authentication by design**. All user progress (XP, quests) is stored browser-local via `localStorage`. The backend endpoints are intentionally public and stateless: each request is processed and discarded. When `ANTHROPIC_API_KEY` is absent (or `DEMO_MODE=1`), every route falls back to canned/heuristic demo responses.

## Assets

- **Anthropic API key / spend** — the only server secret of value. It authorizes paid LLM calls (Claude Opus). Compromise or abuse of the endpoints that use it translates directly into financial cost.
- **Internal network reachability** — the backend makes outbound HTTP fetches driven partly by user input (personal website, GitHub username). The internal/metadata network must not be reachable through these.
- **Uploaded documents** — resumes, transcripts, screenshots. Processed per-request only, never persisted. Low standing value but transits the server.
- **Google OAuth client ID (`VITE_GOOGLE_CLIENT_ID`)** — a public, build-time, non-secret identifier. Not a sensitive asset.

## Trust Boundaries

- **Browser → API (`/api`)** — all requests are untrusted and unauthenticated. There is no auth boundary to enforce; every endpoint is public by design, so the relevant risks are resource/cost abuse and server-side request forgery, not access control.
- **API → external services** — the server calls `api.github.com`, `raw.githubusercontent.com` (fixed Simplify feed URLs), and arbitrary user-supplied websites. This is the primary SSRF surface.
- **API → Anthropic** — user-controlled document/text content is forwarded into LLM prompts; outputs are schema-validated with Zod before returning.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/routes/trojan/*/route.ts` (onboard, interview, roadmap, radar, advice, status) mounted via `routes/trojan/index.ts`; `routes/health.ts`.
- Highest-risk code: `artifacts/api-server/src/lib/public-website.ts` (SSRF guard — DNS pinning, private-range rejection, redirect re-validation), `routes/trojan/onboard/route.ts` (user-driven outbound fetch + 50 MB multipart upload + LLM call).
- Outbound fetch sinks: `lib/public-website.ts` (user URL, guarded), `lib/internships.ts` (fixed URLs), `routes/trojan/onboard/route.ts` `fetchGithub` (fixed host, `encodeURIComponent`'d path segment).
- Public vs authenticated vs admin: everything is public; there is no authenticated or admin surface.
- Dev-only / ignore unless proven reachable: `artifacts/mockup-sandbox` (design canvas), `.migration-backup/` (retained import, excluded from publishing), `*.test.ts`.

## Threat Categories

### Information Disclosure / SSRF

The onboarding flow fetches a user-supplied website (`fetchPublicWebsite`) and a user-supplied GitHub username. `lib/public-website.ts` enforces strong controls: only `http`/`https`, no URL userinfo, DNS resolution with rejection of any non-`unicast` address, connection pinning to the validated IP (anti-rebinding), re-validation of every redirect hop, response-size caps, and content-type/encoding checks. The GitHub fetch targets a fixed host with an `encodeURIComponent`'d path segment. These controls are sound; SSRF is adequately mitigated. Future changes to these files must preserve the DNS-pinning and private-range rejection logic.

### Denial of Service / Resource & Cost Exhaustion

The expensive AI endpoints are unauthenticated and have no rate limiting. In production (with `ANTHROPIC_API_KEY` set) any internet caller can repeatedly trigger Claude Opus calls, including `/api/onboard` with up to 50 MB multipart uploads, causing unbounded API spend, memory pressure, and service degradation. This is the most relevant residual risk for this app. Guarantee: expensive/outbound-calling endpoints SHOULD be rate-limited and upload sizes bounded, especially when a paid API key is configured.

### Tampering (LLM prompt injection)

User-supplied documents, website text, and GitHub metadata are embedded into LLM prompts. Outputs are constrained by Zod schemas (`lib/schemas.ts`) before being returned, limiting downstream impact. No tool-use or code execution is wired to model output, so prompt injection cannot escalate beyond influencing the advisory text the requesting user sees.
