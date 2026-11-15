import { NextResponse } from "next/server";
import { askStructured, liveAI, apiErrorMessage, type UserContent } from "@/lib/claude";
import { OnboardSchema } from "@/lib/schemas";
import { demoOnboard } from "@/lib/demo";

export const maxDuration = 90;

const GOAL_TAGS =
  "robotics, ml, swe, hardware, research, grad-school, internship, consulting, finance, data, product, startup, premed, law, design, policy";

const SYSTEM = `You build a student's profile for Trojan Arc, a college-success hub for USC students.
You receive any mix of: resume, transcript, STARS degree progress report, LinkedIn PDF, screenshots (e.g. a class schedule or job-application tracker), a LinkedIn data-export digest, public GitHub repos, and text from their personal website.

First identify what each document is, then extract everything useful. Rules:
- Extract only what the sources support. Never invent courses, grades, employers, awards or GPA. Use "" / null / [] when unknown.
- courses: every course you can see, with code (e.g. "CSCI 104"), title, letter grade and term. Courses in progress get grade "".
- remainingRequirements: from a STARS / degree progress report, the unmet requirements in short form (e.g. "GE-C: Social Analysis", "EE 364 or MATH 407"). [] if no such report.
- unitsCompleted: total completed units if shown, else null.
- skills: concrete tools, languages and techniques (e.g. "Python", "ROS 2", "SolidWorks"), deduplicated.
- projects: notable projects from the resume, website and GitHub (skip forks, empty or class-template repos), each with a one-line summary.
- experience: jobs, research positions and leadership roles. clubs: student organizations.
- awards (honors, scholarships, hackathon wins), certifications, languages (spoken), links (personal site, portfolio, GitHub, LinkedIn URLs).
- interests: 3-8 topics they clearly care about, inferred from projects, coursework and writing.
- year: Freshman, Sophomore, Junior, Senior or Grad; infer from graduation term relative to today if needed.
- goal: only fill if a source states an objective; otherwise "". goalTags: choose from [${GOAL_TAGS}] based on evidence.
- found: 5-8 short, specific bullets naming the source (e.g. "14 courses + 6 remaining requirements from your STARS report", "212 LinkedIn connections across 140 companies").
- missing: what you could not determine that matters for planning (always include the goal if empty).`;

interface Repo {
  name: string;
  description: string | null;
  language: string | null;
  fork: boolean;
  stargazers_count: number;
  topics?: string[];
  pushed_at?: string;
}

async function fetchGithub(user: string): Promise<Repo[] | null> {
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(user)}/repos?sort=updated&per_page=40`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "trojan-arc-hackathon" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const repos = (await res.json()) as Repo[];
  // Skip forks and the profile-README repo (named after the user).
  return repos.filter((r) => !r.fork && r.name.toLowerCase() !== user.toLowerCase());
}

function githubStats(repos: Repo[]) {
  const counts = new Map<string, number>();
  for (const r of repos) if (r.language) counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
  return {
    repos: repos.length,
    topLanguages: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l),
    lastPush: repos.map((r) => r.pushed_at ?? "").sort().at(-1) ?? "",
  };
}

/** Fetch readable text from a public personal site. Blocks local/private addresses. */
async function fetchSite(raw: string): Promise<string | null> {
  try {
    const url = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(url.protocol)) return null;
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1)/.test(url.hostname)) return null;
    const res = await fetch(url, { headers: { "User-Agent": "trojan-arc-hackathon" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) return null;
    const html = (await res.text()).slice(0, 400000);
    return html
      .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const form = await req.formData();
  const github = String(form.get("github") ?? "").trim().replace(/^@/, "").replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
  const website = String(form.get("website") ?? "").trim();
  const pasted = String(form.get("text") ?? "").trim();
  const linkedin = String(form.get("linkedin") ?? "").trim(); // digest parsed client-side from the LinkedIn export
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  const [repos, siteText] = await Promise.all([github ? fetchGithub(github) : null, website ? fetchSite(website) : null]);
  const stats = repos ? githubStats(repos) : undefined;
  const sources = [
    ...files.map((f) => f.name),
    ...(linkedin ? ["LinkedIn export"] : []),
    ...(repos ? ["GitHub"] : []),
    ...(siteText ? ["Personal site"] : []),
  ];

  if (!liveAI() || form.get("demo") === "1") {
    const langs = stats?.topLanguages ?? [];
    const projects = (repos ?? []).slice(0, 3).map((r) => ({ name: r.name, summary: r.description ?? "GitHub project" }));
    const demo = demoOnboard(github, projects, langs);
    return NextResponse.json({
      mode: "demo",
      ...demo,
      profile: { ...demo.profile, githubStats: stats, links: [...(demo.profile.links ?? []), ...(website ? [website] : [])], sources: sources.length ? sources : ["Demo student"] },
      found: [...demo.found, ...(siteText ? ["Read your personal site"] : [])],
    });
  }

  const content: UserContent = [];
  for (const f of files) {
    const data = Buffer.from(await f.arrayBuffer()).toString("base64");
    if (f.type === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data }, title: f.name });
    } else if (f.type === "image/png" || f.type === "image/jpeg" || f.type === "image/webp") {
      content.push({ type: "text", text: `Screenshot ${f.name}:` });
      content.push({ type: "image", source: { type: "base64", media_type: f.type, data } });
    } else {
      content.push({ type: "text", text: `File ${f.name}:\n${Buffer.from(data, "base64").toString("utf8").slice(0, 60000)}` });
    }
  }
  if (linkedin) content.push({ type: "text", text: `LinkedIn data export (digest):\n${linkedin}` });
  if (siteText) content.push({ type: "text", text: `Personal website ${website}:\n${siteText}` });
  if (pasted) content.push({ type: "text", text: `Pasted by the student:\n${pasted}` });
  if (github) {
    const repoLines = (repos ?? []).map(
      (r) => `- ${r.name} [${r.language ?? "?"}]${r.stargazers_count ? ` ★${r.stargazers_count}` : ""}: ${r.description ?? "(no description)"}${r.topics?.length ? ` (topics: ${r.topics.join(", ")})` : ""}`,
    );
    content.push({ type: "text", text: repos ? `GitHub user ${github} public repos:\n${repoLines.join("\n") || "(none)"}` : `GitHub user ${github} could not be fetched.` });
  }
  if (content.length === 0) {
    return NextResponse.json({ error: "Add at least one document, export, link or GitHub username." }, { status: 400 });
  }
  content.push({ type: "text", text: `Today is ${new Date().toDateString()}. Build the profile. Set github to "${github}".` });

  try {
    const result = await askStructured({ system: SYSTEM, content, schema: OnboardSchema, effort: "low" });
    return NextResponse.json({ mode: "live", ...result, profile: { ...result.profile, githubStats: stats, sources } });
  } catch (err) {
    return NextResponse.json({ error: apiErrorMessage(err) }, { status: 502 });
  }
}
