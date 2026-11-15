// Catalog of USC resources the AI is allowed to recommend. Grounding the model on a fixed list
// keeps it from inventing offices or programs. Extend this list as the team verifies more.

export interface Resource {
  name: string;
  what: string;
  goodFor: string[]; // tags
}

export const USC_RESOURCES: Resource[] = [
  {
    name: "USC Career Center",
    what: "Resume reviews, mock interviews, career advising and the Handshake job board for all majors.",
    goodFor: ["internship", "swe", "consulting", "finance", "resume", "interview", "career"],
  },
  {
    name: "Viterbi Career Connections",
    what: "Engineering-specific career advising, employer info sessions and the Viterbi career fairs.",
    goodFor: ["internship", "swe", "robotics", "ml", "hardware", "career"],
  },
  {
    name: "CURVE (Center for Undergraduate Research in Viterbi Engineering)",
    what: "Matches Viterbi undergrads with faculty research labs; funded research positions.",
    goodFor: ["research", "robotics", "ml", "grad-school", "hardware"],
  },
  {
    name: "Kortschak Center for Learning and Creativity",
    what: "Free academic coaching, study strategies, time management and Supplemental Instruction.",
    goodFor: ["gpa", "study", "academics", "time-management"],
  },
  {
    name: "USC Writing Center",
    what: "One-on-one help with essays, research statements, fellowship and grad-school applications.",
    goodFor: ["writing", "grad-school", "fellowship", "research"],
  },
  {
    name: "Trojan Network",
    what: "USC's alumni networking platform for finding and messaging Trojans in a target field.",
    goodFor: ["network", "alumni", "career", "mentorship"],
  },
  {
    name: "Viterbi Academic Advising",
    what: "Course planning, degree progress (STARS) questions, minors and graduation timelines.",
    goodFor: ["course-planning", "academics", "minor", "gpa"],
  },
  {
    name: "Lloyd Greif Center for Entrepreneurial Studies",
    what: "Entrepreneurship courses, venture competitions and founder mentorship.",
    goodFor: ["startup", "entrepreneurship", "product"],
  },
  {
    name: "Viterbi Startup Garage",
    what: "Accelerator for USC student-founded tech startups.",
    goodFor: ["startup", "entrepreneurship", "robotics", "ml"],
  },
  {
    name: "USC Counseling and Mental Health",
    what: "Free counseling for students; burnout and stress support.",
    goodFor: ["wellness", "burnout"],
  },
  {
    name: "Faculty office hours",
    what: "Direct line to professors; the usual path into a lab or a strong recommendation letter.",
    goodFor: ["research", "grad-school", "academics", "network", "robotics", "ml"],
  },
  {
    name: "CSCI 445L Introduction to Robotics",
    what: "Hands-on robotics course: kinematics, control, sensing, with lab work.",
    goodFor: ["robotics", "course-planning"],
  },
  {
    name: "CSCI 467 Introduction to Machine Learning",
    what: "Core ML course; signals ML fundamentals to research labs and recruiters.",
    goodFor: ["ml", "robotics", "course-planning", "research"],
  },
  {
    name: "USC School of Cinematic Arts",
    what: "Production resources, equipment, screenings, alumni network and industry events for film and media students.",
    goodFor: ["film", "arts", "network"],
  },
  {
    name: "USC Thornton School of Music",
    what: "Ensembles, performance opportunities, competitions and music industry programs.",
    goodFor: ["music", "arts"],
  },
  {
    name: "Marshall School of Business",
    what: "Business clubs, case competitions and recruiting events for finance, consulting and marketing.",
    goodFor: ["business", "finance", "consulting"],
  },
  {
    name: "USC Graduate School",
    what: "Fellowships, funding information and professional development for master's and PhD students.",
    goodFor: ["phd", "masters", "fellowship", "academia"],
  },
  {
    name: "Office of International Services (OIS)",
    what: "Visa, CPT and OPT guidance for international students before and after accepting offers.",
    goodFor: ["international", "masters", "fulltime", "internship"],
  },
  {
    name: "USC Libraries",
    what: "Subject librarians, research databases and thesis/dissertation support.",
    goodFor: ["phd", "research", "academia", "masters"],
  },
  {
    name: "HackSC",
    what: "USC's student-run hackathon; fast way to ship a portfolio project with a team.",
    goodFor: ["swe", "ml", "robotics", "portfolio", "network"],
  },
];

export function resourcesPrompt(): string {
  return USC_RESOURCES.map((r) => `- ${r.name}: ${r.what}`).join("\n");
}

// Links verified to load (Nov 2026). Resources without a verified page get no link.
export const RESOURCE_URLS: Record<string, string> = {
  "USC Career Center": "https://careers.usc.edu/",
  "Viterbi Career Connections": "https://viterbicareers.usc.edu/",
  "CURVE (Center for Undergraduate Research in Viterbi Engineering)": "https://viterbiundergrad.usc.edu/research/curve/",
  "Kortschak Center for Learning and Creativity": "https://kortschakcenter.usc.edu/",
  "Viterbi Academic Advising": "https://viterbiundergrad.usc.edu/",
  "Lloyd Greif Center for Entrepreneurial Studies": "https://www.marshall.usc.edu/departments/lloyd-greif-center-entrepreneurial-studies",
  "USC Counseling and Mental Health": "https://studenthealth.usc.edu/counseling/",
  "CSCI 445L Introduction to Robotics": "https://classes.usc.edu/",
  "CSCI 467 Introduction to Machine Learning": "https://classes.usc.edu/",
  "USC School of Cinematic Arts": "https://cinema.usc.edu/",
  "USC Thornton School of Music": "https://music.usc.edu/",
  "Marshall School of Business": "https://www.marshall.usc.edu/",
  "USC Graduate School": "https://graduateschool.usc.edu/",
  "Office of International Services (OIS)": "https://ois.usc.edu/",
  "USC Libraries": "https://libraries.usc.edu/",
  HackSC: "https://hacksc.com/",
  "USC Writing Center": "https://dornsife.usc.edu/writingcenter/",
  "Trojan Network": "https://alumni.usc.edu/", // USC Alumni Association hosts the Trojan Network
};

/** Link for a resource name, or a course code (e.g. "CSCI 467") -> USC Schedule of Classes. */
export function resourceUrl(name: string): string | undefined {
  if (!name) return undefined;
  if (RESOURCE_URLS[name]) return RESOURCE_URLS[name];
  const hit = Object.keys(RESOURCE_URLS).find((k) => k.toLowerCase().startsWith(name.toLowerCase()) || name.toLowerCase().startsWith(k.toLowerCase()));
  if (hit) return RESOURCE_URLS[hit];
  if (/^[A-Z]{2,5} ?\d{3}[A-Z]?\b/.test(name)) return "https://classes.usc.edu/";
  return undefined;
}
