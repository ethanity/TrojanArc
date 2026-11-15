import type { Profile } from "./types";

// How complete is the student's profile, section by section? Drives the completeness meter.
export interface Section {
  key: string;
  label: string;
  pct: number;
  hint: string; // what would complete it
}

const has = (x: unknown) => (Array.isArray(x) ? x.length > 0 : x !== null && x !== undefined && x !== "");
const score = (checks: boolean[]) => Math.round((checks.filter(Boolean).length / checks.length) * 100);

export function completeness(p: Profile, calendarConnected: boolean): { overall: number; sections: Section[] } {
  const sections: Section[] = [
    {
      key: "academics",
      label: "Academics",
      pct: score([has(p.major), has(p.year), has(p.gradTerm), p.courses.length >= 3, p.gpa !== null, has(p.remainingRequirements)]),
      hint: "Add your STARS report for courses and remaining requirements",
    },
    {
      key: "experience",
      label: "Experience",
      pct: score([p.experience.length > 0, p.projects.length > 0, p.projects.length > 2, has(p.awards)]),
      hint: "Add your resume or GitHub",
    },
    {
      key: "skills",
      label: "Skills",
      pct: score([p.skills.length >= 3, p.skills.length >= 8, has(p.githubStats), has(p.certifications) || has(p.languages)]),
      hint: "Connect GitHub",
    },
    {
      key: "network",
      label: "Network",
      pct: score([has(p.network), p.clubs.length > 0, (p.connectionsTotal ?? 0) >= 50]),
      hint: "Import your LinkedIn data export",
    },
    {
      key: "direction",
      label: "Goals & priorities",
      pct: score([has(p.goal), has(p.timeline), has(p.priorities), has(p.interests)]),
      hint: "Answer the quick questions",
    },
    {
      key: "constraints",
      label: "Constraints",
      pct: score([has(p.hoursPerWeek), has(p.workAuth), has(p.preferences)]),
      hint: "Answer the quick questions",
    },
    {
      key: "schedule",
      label: "Schedule",
      pct: calendarConnected ? 100 : 0,
      hint: "Connect Google Calendar",
    },
  ];
  const overall = Math.round(sections.reduce((s, x) => s + x.pct, 0) / sections.length);
  return { overall, sections };
}
