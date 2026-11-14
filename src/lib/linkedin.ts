"use client";

import { strFromU8, unzipSync } from "fflate";

// Parses LinkedIn's "Get a copy of your data" ZIP entirely in the browser.
// Individual connection names never leave the device; only company counts are kept.

export interface LinkedInSummary {
  connectionsTotal: number;
  network: { company: string; count: number }[];
  skills: string[];
  certifications: string[];
  languages: string[];
  awards: string[];
  /** Plain-text digest of profile, positions, education and projects, sent to the AI for extraction. */
  digest: string;
  filesFound: string[];
}

/** Minimal RFC-4180 CSV parser (handles quotes, commas and newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

/** Rows as objects, starting at the first line that contains `headerHint` (LinkedIn prepends notes). */
function table(text: string | undefined, headerHint: string): Record<string, string>[] {
  if (!text) return [];
  const rows = parseCsv(text);
  const h = rows.findIndex((r) => r.some((c) => c.trim() === headerHint));
  if (h < 0) return [];
  const head = rows[h].map((c) => c.trim());
  return rows.slice(h + 1).map((r) => Object.fromEntries(head.map((k, i) => [k, (r[i] ?? "").trim()])));
}

export async function parseLinkedInZip(file: File): Promise<LinkedInSummary> {
  const zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const files: Record<string, string> = {};
  for (const [path, data] of Object.entries(zip)) {
    const name = path.split("/").pop()!;
    if (name.toLowerCase().endsWith(".csv")) files[name] = strFromU8(data);
  }
  const get = (n: string) => files[Object.keys(files).find((k) => k.toLowerCase() === n.toLowerCase()) ?? ""];

  const connections = table(get("Connections.csv"), "First Name");
  const byCompany = new Map<string, number>();
  for (const c of connections) {
    const co = c["Company"];
    if (co) byCompany.set(co, (byCompany.get(co) ?? 0) + 1);
  }
  const network = [...byCompany.entries()]
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 60);

  const profile = table(get("Profile.csv"), "First Name")[0];
  const positions = table(get("Positions.csv"), "Company Name");
  const education = table(get("Education.csv"), "School Name");
  const projects = table(get("Projects.csv"), "Title");
  const skills = table(get("Skills.csv"), "Name").map((r) => r["Name"]).filter(Boolean);
  const certifications = table(get("Certifications.csv"), "Name").map((r) => r["Name"]).filter(Boolean);
  const languages = table(get("Languages.csv"), "Name").map((r) => r["Name"]).filter(Boolean);
  const awards = table(get("Honors.csv"), "Title").map((r) => r["Title"]).filter(Boolean);

  const lines: string[] = [];
  if (profile) {
    lines.push(`Name: ${profile["First Name"]} ${profile["Last Name"]}`);
    if (profile["Headline"]) lines.push(`Headline: ${profile["Headline"]}`);
    if (profile["Summary"]) lines.push(`About: ${profile["Summary"]}`);
  }
  for (const p of positions) lines.push(`Position: ${p["Title"]} at ${p["Company Name"]} (${p["Started On"]}–${p["Finished On"] || "present"}). ${p["Description"] ?? ""}`);
  for (const e of education) lines.push(`Education: ${e["Degree Name"] ?? ""} ${e["School Name"]} (${e["Start Date"] ?? ""}–${e["End Date"] ?? ""}) ${e["Activities"] ?? ""}`);
  for (const p of projects) lines.push(`Project: ${p["Title"]}. ${p["Description"] ?? ""}`);
  if (skills.length) lines.push(`Skills: ${skills.join(", ")}`);
  if (certifications.length) lines.push(`Certifications: ${certifications.join(", ")}`);
  if (awards.length) lines.push(`Honors: ${awards.join(", ")}`);
  if (languages.length) lines.push(`Languages: ${languages.join(", ")}`);
  if (connections.length) lines.push(`Connections: ${connections.length}. Top companies: ${network.slice(0, 15).map((n) => `${n.company} (${n.count})`).join(", ")}`);

  return {
    connectionsTotal: connections.length,
    network,
    skills,
    certifications,
    languages,
    awards,
    digest: lines.join("\n").slice(0, 20000),
    filesFound: Object.keys(files),
  };
}

export { connectionsAt } from "./network";
