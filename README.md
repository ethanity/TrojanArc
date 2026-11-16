# Trojan Arc

**Your college arc, planned by Trojans who've been there.** A personal college-success and network hub for USC students, built for HackSC.

🏆 **3rd Place, AI@USC Hackathon by HackSC 2026** (90+ teams) · **Try it live:** [trojan-arc.vercel.app](https://trojan-arc.vercel.app)

Built by Ethan Don, Brandon Bui, Ashwath Saravanan and Venky Shivampet.

## The problem

1. **"What do I even need?"** Students don't know which skills, experiences or classes their goal actually requires.
2. **"Where do I start?"** Even when they know, the first step isn't obvious, and USC's resources are scattered across dozens of sites.
3. **"Whose advice do I trust?"** Everyone gives advice ("fade class, GPA doesn't matter"), but it only transfers between people on similar paths. Students find out too late.

## What it does

| Screen | What happens | AI's job |
|---|---|---|
| **One-drop onboarding** | Drop a resume, transcript/STARS report or LinkedIn PDF and add your GitHub username. The profile fills itself in; you confirm it and state your goal. | Claude reads the PDFs directly and extracts courses, grades, skills, projects and experience. It never invents data. |
| **Quest Map** | Requirements for your goal (have / partial / missing, with evidence), then a phased plan starting with "This week". Every quest has a <15-minute first step and a real USC resource. | Gap analysis grounded in a fixed catalog of USC resources and the paths of similar Trojans. |
| **Radar** | One feed of live internships (SimplifyJobs Summer 2027 list, ~1,400 listings) plus USC research, clubs and events. | Detection is cheap (keyword pass); **verification is the product**. Claude checks each candidate for eligibility and fit, flags blockers (grad-only, new-grad, citizenship) and gives a next action. |
| **Network / Advice Lens** | Ask anything. Answers come from Trojans on your path; advice from different paths is flagged "take with salt". Drafts an intro you send yourself. | Similarity is computed in code (goal, major, school) so it's transparent; Claude weighs and explains it. |
| **Leveling** | XP, levels, rank E→S, stat bars (INT/STR/DEX/CHA = academics/career/skills/network), daily quests, win log. Sharing your path earns +100 XP, which is how the network grows. | Wins and completed quests feed back into re-planning. |

**Hard boundaries:** no USC password is ever requested, and it never applies to anything or messages anyone for you.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Without an API key the app runs in **demo mode**: sample AI output, with the live internship feed and GitHub import still working. For live AI:

```bash
# .env.local  (gitignored)
ANTHROPIC_API_KEY=sk-ant-...
```

Restart `npm run dev`. The header switches from "○ demo mode" to "● live AI". To force demo mode on stage even with a key, set `DEMO_MODE=1`.

## Tests and safety

```bash
npm run typecheck && npm run lint
npm test                 # unit: AI rate limit, upload limits, public-site SSRF filter
npm run test:arc         # API + page smoke test (app must be running)
npm run test:arc:browser # full browser walkthrough (app must be running)
```

- Live-AI routes are rate limited (10 requests / 15 min per IP) with 2 MB JSON and 10 MB upload caps (`src/lib/ai-rate-limit.ts`).
- Personal-website import blocks private/internal addresses and checks redirects (`src/lib/public-website.ts`). See `threat_model.md`.

## Architecture

- **Next.js 16 (App Router) + TypeScript + Tailwind v4.** Client state lives in `localStorage` for the prototype.
- **Claude (`claude-opus-5-5`)** via `@anthropic-ai/sdk` with **structured outputs** (Zod schemas in `src/lib/schemas.ts`), so every AI response is typed JSON the UI can render. Server-side refusal fallbacks are enabled.
- `src/app/api/onboard`: PDF/image documents and GitHub repos → profile
- `src/app/api/roadmap`: profile + similar Trojans + USC resource catalog → requirements + quests
- `src/app/api/radar`: live Simplify feed → keyword prefilter → AI fit verification
- `src/app/api/advice`: question + similarity-ranked stories → weighted answer
- `src/lib/demo.ts`: deterministic fallbacks, used when there's no key or when an AI call fails, so the demo never breaks.

## Data honesty

- Internships are **live** from [SimplifyJobs/Summer2027-Internships](https://github.com/SimplifyJobs/Summer2027-Internships).
- Trojan stories (`src/lib/data/stories.ts`) and campus listings (`src/lib/data/campus.ts`) are **sample data**, labeled in the UI. In production, stories come from students who opt in after landing something.
- The USC resource catalog (`src/lib/data/resources.ts`) is the only list the AI may recommend from. Verify and extend it.

## How onboarding replaces a 30-minute questionnaire

Scan first, then ask only about the gaps.

| Source | What it gives | How |
|---|---|---|
| Resume / transcript / STARS report / screenshots | Courses, grades, GPA, units, remaining requirements, experience, projects, awards, clubs, skills | Claude reads the PDFs and images directly |
| LinkedIn data export (ZIP) | Connections by company, positions, skills, certifications, languages | Parsed **in the browser** (`src/lib/linkedin.ts`); only company counts and a text digest leave the device |
| GitHub username | Repos, languages, activity | Public GitHub API |
| Portfolio URL | Projects and writing | Fetched server-side as text (private and local addresses are blocked) |
| Google Calendar | Classes, workload, free time | Google sign-in (see below) |
| Adaptive interview | Hours/week, work authorization, priorities, interests, blockers | `/api/interview`: Claude writes 4–5 tap questions covering only what the scans missed |

The final screen shows a profile-completeness meter by section, with one-tap fixes. Connections then show up across the app: Radar marks "🤝 you know 3 here" and suggests asking for a referral first.

## Google Calendar

The **Week** tab reads your Google Calendar, finds free gaps (9am to 9pm, one quest per day), and suggests quest blocks. It adds a block or a Radar deadline to your calendar only when you click. Sign-in runs in the browser (Google Identity Services); access tokens stay in memory and are never stored or sent to our server. Without setup, "Use a sample week" loads a realistic student schedule.

One-time setup (about 5 minutes):
1. Go to https://console.cloud.google.com, create a project, then **APIs & Services → Library → Google Calendar API → Enable**.
2. **OAuth consent screen**: External, app name "Trojan Arc", and add yourself and teammates as **test users** (testing mode needs no Google review).
3. **Credentials → Create credentials → OAuth client ID → Web application**. Authorized JavaScript origins: `http://localhost:3000` (add your Vercel URL later).
4. Put the client ID in `.env.local`, then restart `npm run dev`:
   ```bash
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
   ```

Scope used: `calendar.events` (read events, create the ones you click). Gmail was left out on purpose: it's a restricted scope that needs a Google security review.

## What's next

An email digest for a daily brief, club-side recruiting tools, verified alumni stories via USC SSO, and course planning against STARS requirements.
