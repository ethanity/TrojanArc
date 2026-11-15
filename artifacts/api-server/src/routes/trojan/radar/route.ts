import { askStructured, liveAI, apiErrorMessage } from "@/lib/claude";
import { FitSchema } from "@/lib/schemas";
import { demoFit } from "@/lib/demo";
import { fetchInternships, prefilter, type Feed } from "@/lib/internships";
import { CAMPUS_OPPS } from "@/lib/data/campus";
import type { FitResult, Opportunity, Profile } from "@/lib/types";
import { connectionsAt } from "@/lib/network";

export const maxDuration = 90;

const SYSTEM = `You are the verification step of Trojan Arc's opportunity radar for a USC student.
Detection is cheap; verification is the product. Each candidate was keyword-matched; you decide whether it is a REAL fit for this specific student.

For every candidate id, return:
- fit 0-100: how worth this student's time it is right now.
- verdict: "strong" (apply / go now), "stretch" (worth it with a caveat), "skip".
- reason: one specific sentence tying the listing to their profile (courses, projects, experience, goal).
- blocker: an eligibility problem you can infer from the listing (graduate-only, new-grad/full-time, citizenship or no-sponsorship vs. their work authorization, wrong field, location against their preferences), or "".
- If the student has connections at the org, the nextAction should be to ask them for a referral first.
- nextAction: one concrete next step (e.g. "Apply this week; lead with your line-following robot demo").
Be honest. Most generic listings are a stretch or a skip. Return results for every id given.`;

export async function POST(req: Request) {
  const { profile } = (await req.json()) as { profile: Profile };

  // Pick live feeds by who the student is: grads and full-time seekers get new-grad jobs too.
  const tags = new Set(profile.goalTags);
  const grad = /^(grad|master|phd|ph.d)/i.test(profile.year.trim());
  const wantsJobs = grad || tags.has("fulltime");
  const feeds: Feed[] = [];
  if (!wantsJobs || tags.has("internship") || tags.has("phd")) feeds.push("intern");
  if (wantsJobs) feeds.push("newgrad");

  let live: Opportunity[] = [];
  let scanned = 0;
  let liveFeed = true;
  for (const f of feeds) {
    try {
      const all = await fetchInternships(f);
      scanned += all.length;
      live = live.concat(prefilter(all, profile, feeds.length > 1 ? 14 : 24));
    } catch {
      liveFeed = false;
    }
  }
  const campus = CAMPUS_OPPS.filter((o) => o.tags.some((t) => tags.has(t)));
  const items = [...campus, ...live];

  let fits: FitResult[];
  let mode: "live" | "demo" = "demo";
  let warning: string | undefined;
  if (liveAI() && items.length) {
    try {
      const listing = items
        .map((o) => `[${o.id}] ${o.kind.toUpperCase()} · ${o.title} · ${o.org}${connectionsAt(profile.network, o.org) ? ` (student has ${connectionsAt(profile.network, o.org)} LinkedIn connections here)` : ""} · ${o.location}${o.deadline ? ` · due ${o.deadline}` : ""}${o.posted ? ` · posted ${o.posted} ago` : ""}${o.details ? ` · ${o.details}` : ""}`)
        .join("\n");
      const profileBrief = `${profile.year} ${profile.major} (${profile.school}), grad ${profile.gradTerm}, GPA ${profile.gpa ?? "?"}.
Goal: ${profile.goal} [${profile.goalTags.join(", ")}]. Preferences: ${profile.preferences || "none stated"}.
Skills: ${profile.skills.join(", ")}.
Projects: ${profile.projects.map((p) => p.name).join("; ")}.
Experience: ${profile.experience.map((e) => `${e.role} @ ${e.org}`).join("; ")}.
Courses: ${profile.courses.map((c) => c.code).join(", ")}.
Hours/week available: ${profile.hoursPerWeek || "?"}. Work authorization: ${profile.workAuth || "?"}. Priorities: ${(profile.priorities ?? []).join(", ") || "?"}. Interests: ${(profile.interests ?? []).join(", ") || "?"}.`;
      const out = await askStructured({
        system: SYSTEM,
        content: `STUDENT\n${profileBrief}\n\nCANDIDATES\n${listing}`,
        schema: FitSchema,
        effort: "low",
      });
      const byId = new Map(out.results.map((r) => [r.id, r]));
      fits = items.map((o) => byId.get(o.id) ?? demoFit([o], profile)[0]);
      mode = "live";
    } catch (err) {
      fits = demoFit(items, profile);
      warning = apiErrorMessage(err);
    }
  } else {
    fits = demoFit(items, profile);
  }

  return Response.json({ mode, warning, liveFeed, scanned, items, fits });
}
