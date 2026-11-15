import type { Profile, Quest, Stat } from "./types";

// Leveling math: level n needs 50 * (n-1)^2 total XP. Fast early levels, slower later.
export function levelFromXp(xp: number) {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
  const floor = 50 * (level - 1) ** 2;
  const next = 50 * level ** 2;
  return { level, progress: (xp - floor) / (next - floor), toNext: next - xp, next };
}

// Trojan warrior ranks. Each tier has its own badge; ranking up gets its own ceremony.
export interface Rank {
  id: "recruit" | "squire" | "warrior" | "champion" | "hero" | "legend";
  name: string;
  minLevel: number;
  colors: [string, string]; // badge gradient
  ink: string; // glyph color on the badge
  line: string; // shown on the rank-up screen
}

export const RANKS: Rank[] = [
  { id: "recruit", name: "Recruit", minLevel: 1, colors: ["#d9a27a", "#9a5b2e"], ink: "#fff6ec", line: "Every legend starts here." },
  { id: "squire", name: "Squire", minLevel: 3, colors: ["#eef1f4", "#9aa5b1"], ink: "#3d4651", line: "You're learning the ropes." },
  { id: "warrior", name: "Warrior", minLevel: 6, colors: ["#ffe27a", "#d49a00"], ink: "#5c3d00", line: "You're in the fight now." },
  { id: "champion", name: "Champion", minLevel: 10, colors: ["#d4232b", "#7a0000"], ink: "#ffcc00", line: "Other Trojans look to you." },
  { id: "hero", name: "Hero", minLevel: 15, colors: ["#990000", "#ffcc00"], ink: "#ffffff", line: "Your path is one others will follow." },
  { id: "legend", name: "Legend", minLevel: 21, colors: ["#ffcc00", "#990000"], ink: "#ffffff", line: "Fight on, forever." },
];

export function rankFor(level: number): Rank {
  return [...RANKS].reverse().find((r) => level >= r.minLevel) ?? RANKS[0];
}

export function nextRank(level: number): Rank | null {
  return RANKS.find((r) => r.minLevel > level) ?? null;
}

export function computeStats(p: Profile | null, quests: Quest[], storiesShared: number): Record<Stat, number> {
  const done = (s: Stat) => quests.filter((q) => q.status === "done" && q.stat === s).length;
  if (!p) return { academics: 0, career: 0, skills: 0, network: 0 };
  const cap = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  return {
    academics: cap((p.gpa ? (p.gpa / 4) * 55 : 25) + p.courses.length * 2 + done("academics") * 8),
    career: cap(12 + p.experience.length * 14 + done("career") * 9),
    skills: cap(8 + p.skills.length * 3 + p.projects.length * 9 + done("skills") * 8),
    network: cap(8 + p.clubs.length * 9 + done("network") * 10 + storiesShared * 15),
  };
}

export const STAT_LABEL: Record<Stat, string> = {
  academics: "INT · Academics",
  career: "STR · Career",
  skills: "DEX · Skills",
  network: "CHA · Network",
};
