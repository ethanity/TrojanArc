import type { Profile, Story } from "./types";

// Transparent, explainable similarity between a student and a Trojan who shared their path.
// Computed in code (not by the model) so the "relevance to you" score is consistent and auditable.

const STOP = new Set(["and", "of", "the", "bs", "ba", "b.s.", "engineering", "science", "sciences", "studies"]);

function majorTokens(major: string): Set<string> {
  return new Set(
    major
      .toLowerCase()
      .split(/[^a-z.]+/)
      .filter((t) => t && !STOP.has(t)),
  );
}

export interface Similarity {
  score: number; // 0-100
  shared: string[];
  different: string[];
}

export function similarity(p: Profile, s: Story): Similarity {
  const shared: string[] = [];
  const different: string[] = [];
  let score = 0;

  // Goals: the biggest factor. Advice only transfers between people chasing similar outcomes.
  const goals = new Set(p.goalTags.map((t) => t.toLowerCase()));
  const overlap = s.outcomeTags.filter((t) => goals.has(t.toLowerCase()));
  if (goals.size > 0) {
    score += Math.round(55 * Math.min(1, overlap.length / Math.min(goals.size, 3)));
  }
  if (overlap.length) shared.push(`goal: ${overlap.slice(0, 3).join(", ")}`);
  else different.push(`their path: ${s.outcomeTags.slice(0, 2).join(", ")}`);

  // Major
  const a = majorTokens(p.major);
  const b = majorTokens(s.major);
  const majorOverlap = [...a].filter((t) => b.has(t));
  if (majorOverlap.length) {
    score += Math.round(30 * Math.min(1, majorOverlap.length / Math.max(1, Math.min(a.size, b.size))));
    shared.push(`major: ${s.major}`);
  } else {
    different.push(`major: ${s.major}`);
  }

  // School
  const school = p.school.toLowerCase();
  if (school && school.includes(s.school.toLowerCase())) {
    score += 15;
    shared.push(s.school);
  } else if (school) {
    different.push(s.school);
  }

  return { score: Math.min(100, score), shared, different };
}

export function rankStories(p: Profile, stories: Story[]) {
  return stories
    .map((s) => ({ story: s, sim: similarity(p, s) }))
    .sort((x, y) => y.sim.score - x.sim.score);
}
