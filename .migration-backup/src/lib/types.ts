// Shared shapes used by the client and the API routes.

export type Stat = "academics" | "career" | "skills" | "network";

export interface Course {
  code: string;
  title: string;
  grade: string; // "" when unknown
  term: string; // "" when unknown
}

export interface Profile {
  name: string;
  major: string;
  minor: string;
  school: string; // e.g. "Viterbi School of Engineering"
  year: string; // Freshman | Sophomore | Junior | Senior | Grad
  gradTerm: string; // e.g. "May 2029"
  gpa: number | null;
  goal: string; // free text, the student's own words
  goalTags: string[]; // normalized: robotics, ml, swe, research, consulting, finance, premed, ...
  timeline: string; // e.g. "Summer 2027 internship"
  preferences: string; // location, research vs industry, etc.
  courses: Course[];
  skills: string[];
  projects: { name: string; summary: string }[];
  experience: { role: string; org: string; summary: string }[];
  clubs: string[];
  github: string;
  // ---- Deeper profile (optional; filled by scans, integrations and the AI interview) ----
  interests?: string[];
  awards?: string[];
  certifications?: string[];
  languages?: string[]; // spoken languages
  links?: string[];
  remainingRequirements?: string[]; // from a STARS degree progress report
  unitsCompleted?: number | null;
  workAuth?: string;
  hoursPerWeek?: string;
  priorities?: string[];
  answers?: { q: string; a: string }[];
  network?: { company: string; count: number }[]; // aggregated from LinkedIn connections
  connectionsTotal?: number;
  githubStats?: { repos: number; topLanguages: string[]; lastPush: string };
  sources?: string[];
}

export interface InterviewQuestion {
  id: string;
  question: string;
  why: string;
  kind: "single" | "multi" | "text";
  options: string[];
  field: "workAuth" | "hoursPerWeek" | "priorities" | "interests" | "other";
}

export interface Quest {
  id: string;
  title: string;
  why: string;
  firstStep: string;
  resource: string;
  stat: Stat;
  xp: number;
  effort: string;
  phase: string;
  status: "open" | "active" | "done";
}

export interface Requirement {
  name: string;
  category: "skill" | "experience" | "academic" | "network" | "credential";
  status: "have" | "partial" | "missing";
  evidence: string;
  whyItMatters: string;
}

export interface Roadmap {
  northStar: string;
  requirements: Requirement[];
  phases: {
    title: string;
    focus: string;
    quests: Omit<Quest, "id" | "phase" | "status">[];
  }[];
  watchOuts: string[];
}

export interface Opportunity {
  id: string;
  kind: "internship" | "job" | "research" | "event" | "club" | "program";
  title: string;
  org: string;
  location: string;
  url: string;
  deadline: string; // "" when rolling/unknown
  posted: string; // e.g. "2d"
  tags: string[];
  source: string; // "Simplify 2027 list (live)" | "USC sample"
  details: string;
}

export interface FitResult {
  id: string;
  fit: number; // 0-100
  verdict: "strong" | "stretch" | "skip";
  reason: string;
  blocker: string; // "" when none
  nextAction: string;
}

export interface Story {
  id: string;
  name: string;
  major: string;
  school: string;
  classOf: number;
  outcome: string;
  outcomeTags: string[];
  gpaBand: string;
  timeline: { when: string; what: string }[];
  advice: string[];
  regret: string;
  openToChat: boolean;
}

export interface AdviceSource {
  storyId: string;
  similarity: number; // computed in code, 0-100
  howItApplies: string;
  takeWithSalt: boolean;
}

export interface AdviceAnswer {
  verdict: string;
  answer: string;
  forYou: string;
  sources: AdviceSource[];
  talkTo: { storyId: string; why: string; askThem: string }[];
}

export interface Win {
  id: string;
  text: string;
  date: string;
  xp: number;
}

export interface OnboardResult {
  profile: Profile;
  found: string[]; // human-readable list of what was extracted
  missing: string[]; // what we could not determine and need to ask
}
