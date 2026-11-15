import "server-only";
import type { Opportunity, Profile } from "./types";
import { domainTags, tagsFor } from "./tags";
export { domainTags, tagsFor };

// Live feeds: SimplifyJobs' community-maintained lists on GitHub.
const FEEDS = {
  intern: { url: "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/README.md", kind: "internship" as const, label: "Simplify 2027 internships (live)", prefix: "i" },
  newgrad: { url: "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md", kind: "job" as const, label: "Simplify new-grad jobs (live)", prefix: "n" },
};
export type Feed = keyof typeof FEEDS;

const strip = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, ", ")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const cache: Partial<Record<Feed, { at: number; items: Opportunity[] }>> = {};

export async function fetchInternships(feed: Feed = "intern"): Promise<Opportunity[]> {
  const hit = cache[feed];
  if (hit && Date.now() - hit.at < 60 * 60 * 1000) return hit.items;
  const F = FEEDS[feed];
  const res = await fetch(F.url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Simplify list returned ${res.status}`);
  const md = await res.text();

  const items: Opportunity[] = [];
  let lastCompany = "";
  const seen = new Set<string>();
  const rows = md.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
  for (const row of rows) {
    const cells = row.match(/<td>([\s\S]*?)<\/td>/g)?.map((c) => c.replace(/^<td>|<\/td>$/g, ""));
    if (!cells || cells.length < 5) continue;
    if (cells[3].includes("🔒")) continue; // closed
    let company = strip(cells[0]).replace(/🔥/g, "").trim();
    if (company.includes("↳")) company = lastCompany;
    else lastCompany = company;
    const rawTitle = strip(cells[1]);
    // Simplify legend flags → plain-language eligibility notes the verifier can reason about.
    const flags: string[] = [];
    if (rawTitle.includes("🎓")) flags.push("Advanced degree required (Master's, PhD, MBA).");
    if (rawTitle.includes("🛂")) flags.push("Does NOT offer visa sponsorship.");
    if (rawTitle.includes("🇺🇸")) flags.push("Requires U.S. citizenship.");
    const title = rawTitle.replace(/🎓|🛂|🇺🇸|🔥/g, "").replace(/\s+/g, " ").trim();
    const location = strip(cells[2]).replace(/\d+ locations?/i, "Multiple locations");
    const key = `${company}|${title}|${location}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const url = cells[3].match(/href="([^"]+)"/)?.[1] ?? "";
    const posted = strip(cells[4]);
    items.push({
      id: `${F.prefix}-${items.length}`,
      kind: F.kind,
      title,
      org: company,
      location,
      url,
      deadline: "",
      posted,
      tags: tagsFor(`${title} ${company}`),
      source: F.label,
      details: flags.join(" "),
    });
  }
  cache[feed] = { at: Date.now(), items };
  return items;
}

/** Cheap detection step: keyword prefilter before the AI verification step. */
export function prefilter(items: Opportunity[], p: Profile, limit = 24): Opportunity[] {
  const goals = new Set([...p.goalTags, ...domainTags(p)].map((t) => t.toLowerCase()));
  const undergrad = !/^(grad|master|phd|ph.d)/i.test(p.year.trim());
  const ageDays = (s: string) => (s.endsWith("d") ? parseInt(s) : s.endsWith("mo") ? parseInt(s) * 30 : 999);
  return items
    .map((o) => {
      const match = o.tags.filter((t) => goals.has(t)).length;
      // Demote listings the student is clearly ineligible for, but keep a few so the verifier can flag them.
      const penalty = undergrad && (o.details.includes("Advanced degree") || /new grad/i.test(o.title)) ? 1.5 : 0;
      return { o, score: match > 0 ? match - penalty : 0 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || ageDays(a.o.posted) - ageDays(b.o.posted))
    .slice(0, limit)
    .map((x) => x.o);
}
