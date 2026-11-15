// Demo-mode fallbacks so the app works end-to-end without an API key (and never dies on stage).
import type { AdviceAnswer, FitResult, InterviewQuestion, OnboardResult, Opportunity, Profile, Roadmap, Story } from "./types";

export function demoInterview(p: Profile): InterviewQuestion[] {
  const research = p.goalTags.includes("research") || p.goalTags.includes("grad-school");
  return [
    {
      id: "hours", field: "hoursPerWeek", kind: "single",
      question: "Realistically, how many hours a week can you put toward this?",
      why: "Classes already take a big chunk of your week. This sets how many quests I schedule.",
      options: ["2–4 hrs", "5–8 hrs", "9–12 hrs", "13+ hrs"],
    },
    {
      id: "auth", field: "workAuth", kind: "single",
      question: "Work authorization for US internships?",
      why: "Some listings require citizenship or don't sponsor visas. I'll filter those out for you.",
      options: ["US citizen / permanent resident", "International (F-1, will need CPT/OPT)", "Prefer not to say"],
    },
    {
      id: "pull", field: "priorities", kind: "multi",
      question: "What matters most in your next role?",
      why: "Your documents show what you've done, not what you want next.",
      options: ["Learning fast", "Pay", "Brand name", "Research & publications", "Shipping real products", "Mentorship", "Location"],
    },
    {
      id: "spark", field: "interests", kind: "multi",
      question: research ? "Which research directions excite you most?" : "Which areas excite you most?",
      why: "I guessed these from your projects. Pick what's actually true so I find the right labs and teams.",
      options: p.goalTags.includes("film")
        ? ["Directing", "Editing", "Cinematography", "Producing", "Screenwriting", "Animation", "Documentary"]
        : p.goalTags.includes("music")
          ? ["Performance", "Composition", "Production / engineering", "Music business", "Film scoring", "Teaching"]
          : p.goalTags.some((t) => ["finance", "consulting", "business"].includes(t))
            ? ["Investment banking", "Consulting", "Product / tech", "Startups", "Marketing", "Real estate"]
            : /^phd/i.test(p.year) || p.goalTags.includes("phd")
              ? ["Faculty career", "Industry research", "Startups", "Policy", "Not sure yet"]
              : p.goalTags.includes("robotics")
                ? ["Robot manipulation", "Autonomous vehicles", "Humanoids", "Drones", "ML systems", "Computer vision", "Embedded / hardware"]
                : ["AI / ML", "Web & product", "Data", "Finance", "Health", "Climate", "Policy"],
    },
    {
      id: "worry", field: "other", kind: "single",
      question: "What's the biggest thing holding you back right now?",
      why: "Nothing in your documents tells me this, and it changes where to start.",
      options: ["Don't know where to start", "Not enough experience", "No time", "Imposter syndrome", "Don't know anyone in the field"],
    },
  ];
}
import { rankStories } from "./similarity";
import { connectionsAt } from "./network";
import { domainTags } from "./tags";

export const DEMO_PROFILE: Profile = {
  name: "Alex Rivera",
  major: "Electrical and Computer Engineering",
  minor: "",
  school: "Viterbi School of Engineering",
  year: "Sophomore",
  gradTerm: "May 2029",
  gpa: 3.52,
  goal: "Land a robotics / physical-AI internship for Summer 2027 and keep research or grad school open.",
  goalTags: ["robotics", "ml", "internship", "research"],
  timeline: "Summer 2027 internship",
  preferences: "Bay Area or LA; would take research over a generic SWE role",
  courses: [
    { code: "EE 109", title: "Introduction to Embedded Systems", grade: "A-", term: "Fall 2025" },
    { code: "CSCI 103", title: "Introduction to Programming", grade: "B+", term: "Fall 2025" },
    { code: "MATH 226", title: "Calculus III", grade: "B", term: "Spring 2026" },
    { code: "PHYS 151", title: "Fundamentals of Physics I", grade: "B+", term: "Spring 2026" },
    { code: "CSCI 104", title: "Data Structures and Object Oriented Design", grade: "", term: "Fall 2026" },
  ],
  skills: ["Python", "C++", "Arduino", "MATLAB", "Linux", "Git"],
  projects: [
    { name: "Line-following robot", summary: "EE 109 final project: PID control on an Arduino car." },
    { name: "Internship radar bot", summary: "GitHub Actions scraper that filters robotics internships hourly." },
  ],
  experience: [
    {
      role: "Undergraduate Researcher",
      org: "Robot learning lab, USC Viterbi",
      summary: "Benchmarked vision-language-action model latency on laptop GPUs.",
    },
  ],
  clubs: ["Model UN"],
  github: "",
  interests: ["robot learning", "embedded systems", "manipulation", "ML systems"],
  awards: ["Viterbi Dean's List (Fall 2025)"],
  certifications: [],
  languages: ["English", "Spanish"],
  links: [],
  remainingRequirements: ["EE 250 Distributed Systems for IoT", "EE 364 or MATH 407 (probability)", "GE-C: Social Analysis", "Technical electives: 12 units"],
  unitsCompleted: 48,
  network: [
    { company: "Toyota Research Institute", count: 2 },
    { company: "Skydio", count: 1 },
    { company: "General Motors", count: 3 },
    { company: "Qualcomm", count: 2 },
    { company: "Persona AI", count: 1 },
    { company: "Google", count: 6 },
    { company: "USC", count: 41 },
  ],
  connectionsTotal: 187,
};

export function demoOnboard(github: string, repos: { name: string; summary: string }[], langs: string[]): OnboardResult {
  const profile: Profile = {
    ...DEMO_PROFILE,
    github,
    projects: repos.length ? [...DEMO_PROFILE.projects, ...repos.slice(0, 3)] : DEMO_PROFILE.projects,
    skills: Array.from(new Set([...DEMO_PROFILE.skills, ...langs])),
  };
  return {
    profile,
    found: [
      "Major, school and year from your resume header",
      "5 courses + 4 remaining requirements from your STARS report",
      "GPA 3.52 · 48 units completed",
      "187 LinkedIn connections across 60+ companies",
      `${profile.projects.length} projects${repos.length ? ` (${repos.length} from GitHub)` : ""}`,
      "Research position in a robot learning lab",
      `${profile.skills.length} skills`,
    ],
    missing: ["Your goal in your own words", "Location / role preferences"],
  };
}

function roboticsRoadmap(p: Profile): Roadmap {
  return {
    northStar: `${lead(p.timeline || "next summer")}: one robot demo on video, ROS on your resume, 3 Trojan referrals, and 25 targeted applications sent by the end of February.`,
    requirements: [
      { name: "Python + ML fundamentals", category: "skill", status: "partial", evidence: "Python on resume; no ML course yet", whyItMatters: "Robot-learning teams screen for ML basics in the first interview." },
      { name: "ROS / robotics software stack", category: "skill", status: "missing", evidence: "Not found on resume or GitHub", whyItMatters: "Nearly every robotics software internship lists ROS or ROS 2." },
      { name: "A robot demo you can show", category: "experience", status: "partial", evidence: "Line-following robot exists, no video or write-up", whyItMatters: "Trojans who landed robotics roles say a demo video beat the resume." },
      { name: "Research experience", category: "experience", status: "have", evidence: "Undergraduate Researcher, robot learning lab", whyItMatters: "Counts as real experience for robotics teams and keeps grad school open." },
      { name: "Core EE/CS GPA ≥ 3.5", category: "academic", status: "have", evidence: "3.52 overall; B in MATH 226", whyItMatters: "Research labs and some companies filter on it. Protect it, don't fade classes." },
      { name: "Referrals inside robotics companies", category: "network", status: "missing", evidence: "No robotics contacts found", whyItMatters: "Referrals drove most interviews in stories from similar Trojans." },
      { name: "Robotics-tuned resume", category: "credential", status: "partial", evidence: "Research bullet is strong; projects aren't framed for robotics", whyItMatters: "Recruiters skim for robotics keywords in under 10 seconds." },
    ],
    phases: [
      {
        title: "This week",
        focus: "Small, concrete moves that unblock everything else.",
        quests: [
          { title: "Film a 30-second demo of your line-following robot", why: "Your fastest path to a 'show, don't tell' portfolio piece.", firstStep: "Charge the car, film one clean lap on your phone, upload it unlisted.", resource: "", stat: "skills", xp: 60, effort: "45 min" },
          { title: "Book a resume review at Viterbi Career Connections", why: "Reframe your projects around robotics keywords before application season.", firstStep: "Open Handshake → Appointments → Viterbi resume review.", resource: "Viterbi Career Connections", stat: "career", xp: 40, effort: "15 min" },
          { title: "Message Maya C. (ECE '26, robotics intern)", why: "91% similar path. She went from club rover to lab to robotics internship.", firstStep: "Ask her one question: which ROS project mattered most in interviews?", resource: "Trojan Network", stat: "network", xp: 50, effort: "10 min" },
        ],
      },
      {
        title: "Winter break",
        focus: "Close the ROS gap with something you can show.",
        quests: [
          { title: "Finish the ROS 2 beginner tutorials and simulate a TurtleBot", why: "Turns 'missing' into 'partial' on the #1 requirement.", firstStep: "Install ROS 2 in WSL and run the turtlesim tutorial.", resource: "", stat: "skills", xp: 120, effort: "~10 hrs" },
          { title: "Write up your lab benchmarking work as a one-page project post", why: "Research results are interview stories. Make yours readable.", firstStep: "Draft 3 bullets: problem, what you measured, what you found.", resource: "", stat: "career", xp: 80, effort: "2 hrs" },
        ],
      },
      {
        title: "Spring 2027",
        focus: "Applications plus the course that signals ML.",
        quests: [
          { title: "Register for CSCI 467 (Intro to ML) or plan it for fall", why: "Closes the ML fundamentals gap on your transcript.", firstStep: "Check prerequisites with Viterbi Academic Advising.", resource: "CSCI 467 Introduction to Machine Learning", stat: "academics", xp: 70, effort: "30 min" },
          { title: "Join a robotics build team's software sub-team", why: "Real robots, teammates, and a second demo.", firstStep: "Show up to spring recruiting with your demo video.", resource: "", stat: "network", xp: 90, effort: "3 hrs/week" },
          { title: "Send 25 targeted robotics applications by Feb 28", why: "Similar Trojans who got offers applied early and in volume.", firstStep: "Start from your Radar's strong-fit list.", resource: "Viterbi Career Connections", stat: "career", xp: 150, effort: "8 hrs total" },
          { title: "Do a technical mock interview", why: "Practice the robotics/C++ questions before the real ones.", firstStep: "Book a slot through the USC Career Center.", resource: "USC Career Center", stat: "career", xp: 60, effort: "1 hr" },
        ],
      },
      {
        title: "Summer 2027",
        focus: "Turn the internship into the next step.",
        quests: [
          { title: "Ask your manager what a return offer requires in week 1", why: "Know the bar before you're measured on it.", firstStep: "Add it to your first 1:1 agenda.", resource: "", stat: "career", xp: 80, effort: "10 min" },
          { title: "Share your path on Trojan Arc", why: "Pay it forward. The next ECE sophomore needs your timeline.", firstStep: "Log your outcome and three things that worked.", resource: "Trojan Network", stat: "network", xp: 100, effort: "15 min" },
        ],
      },
    ],
    watchOuts: [
      "'GPA doesn't matter' is advice from paths unlike yours. With research or grad school in play, it does.",
      "Big robotics programs fill early. Don't wait for the spring career fair to apply.",
      "Don't stack CSCI 104 crunch and 25 applications in the same two weeks. Front-load applications in January.",
    ],
  };
}

export function demoFit(items: Opportunity[], p: Profile): FitResult[] {
  const goals = new Set([...p.goalTags, ...domainTags(p)]);
  return items.map((o) => {
    const matched = o.tags.filter((t) => goals.has(t));
    const t = o.title.toLowerCase();
    const isGradStudent = /^(grad|master|phd|ph\.d)/i.test(p.year.trim());
    const gradOnly = /phd|ph\.d|master|graduate student|mba/.test(t) || o.details.includes("Advanced degree");
    const grad = gradOnly && !isGradStudent;
    const senior = !isGradStudent && !p.goalTags.includes("fulltime") && (o.kind === "job" || /new grad|full[- ]time|senior/.test(t));
    // Earlier goal tags matter more (the student's primary goal is listed first).
    const weight = matched.reduce((s, t) => s + (p.goalTags.includes(t) ? Math.max(8, 26 - 7 * p.goalTags.indexOf(t)) : 14), 0);
    let fit = Math.min(96, 38 + weight + (o.kind !== "internship" && o.kind !== "job" ? 4 : 0) + (o.title.length % 5) + (gradOnly && isGradStudent ? 8 : 0));
    let blocker = "";
    if (grad) { fit = 18; blocker = "Listing targets graduate students; you're an undergrad."; }
    else if (senior) { fit = 22; blocker = "Looks like a full-time / new-grad role, not an internship."; }
    const known = connectionsAt(p.network, o.org);
    if (known && !blocker) fit = Math.min(98, fit + 6);
    const verdict = fit >= 75 ? "strong" : fit >= 50 ? "stretch" : "skip";
    const reason = matched.length
      ? `Matches your ${matched.join(" + ")} goals${gradOnly && isGradStudent ? ", and it's aimed at graduate students like you" : p.experience.length ? `, and your ${p.experience[0].role.toLowerCase()} experience counts here` : ""}.`
      : "Only a loose match with your goals.";
    const isRole = o.kind === "internship" || o.kind === "job";
    const nextAction = known && verdict !== "skip" && isRole
      ? `Ask your ${known} connection${known > 1 ? "s" : ""} at ${o.org} for a referral, then apply this week.`
      : verdict === "skip"
      ? "Skip. Not worth an application right now."
      : isRole
        ? `Apply this week; lead your resume with ${p.projects[0]?.name ?? "your strongest project"}.`
        : o.kind === "club"
          ? "Show up to the next meeting and introduce yourself to the lead."
          : "Add it to your calendar and RSVP.";
    return { id: o.id, fit, verdict, reason, blocker, nextAction };
  });
}

export function demoAdvice(question: string, p: Profile, stories: Story[]): AdviceAnswer {
  const ranked = rankStories(p, stories);
  const gpaQ = /gpa|grade|fade|skip class|class|drop|withdraw/i.test(question);
  const top = ranked.slice(0, 3);
  const contrarian = ranked.find((r) => r.story.advice.some((a) => /gpa/i.test(a)) && r.sim.score < 40);
  const sources = [...top, ...(contrarian && !top.includes(contrarian) ? [contrarian] : [])].map((r) => ({
    storyId: r.story.id,
    similarity: r.sim.score,
    howItApplies:
      r.sim.score >= 60
        ? `Same kind of path as yours: "${r.story.advice[0]}"`
        : `Different path (${r.story.outcome.toLowerCase()}). Their advice fit their goal, not necessarily yours.`,
    takeWithSalt: r.sim.score < 40,
  }));
  return {
    verdict: gpaQ ? "Don't fade it. On your path, GPA is a door, not a detail." : "Here's what Trojans on your path actually did.",
    answer: gpaQ
      ? "The Trojans most like you (ECE/CS, robotics, research) all say grades in core classes mattered: research labs check them, and grad school is still on your table. The 'GPA doesn't matter' advice comes from a consulting path where networking dominates. That's true for them and wrong for you. If a class is truly sinking you, go to office hours or the Kortschak Center first, and talk to an advisor before taking a W rather than quietly fading."
      : `The closest Trojans to you mostly did three things: ${top.map((r) => r.story.timeline[0]?.what.toLowerCase()).join("; ")}.`,
    forYou: `You're a ${p.year.toLowerCase()} in ${p.major} aiming at ${p.goalTags.slice(0, 2).join(" and ")}. Advice is weighted toward people who took that path.`,
    sources,
    talkTo: top
      .filter((r) => r.story.openToChat)
      .slice(0, 2)
      .map((r) => ({
        storyId: r.story.id,
        why: `${r.sim.score}% similar; ${r.sim.shared.join(", ")}.`,
        askThem: gpaQ ? "Did a bad semester ever cost you an opportunity, and how did you recover?" : "What would you do differently as a sophomore?",
      })),
  };
}

/* ---------- Demo plans for other paths (live AI writes these for any goal) ---------- */

/** "Summer 2027" -> "By Summer 2027"; "Within a year" stays as is. */
const lead = (t: string) => (/^(before|within|this|by|after)\s/i.test(t) ? t : `By ${t}`);

type Q = Roadmap["phases"][number]["quests"][number];
const q = (title: string, why: string, firstStep: string, stat: Q["stat"], xp: number, effort: string, resource = ""): Q => ({ title, why, firstStep, resource, stat, xp, effort });
type Req = Roadmap["requirements"][number];
const r = (name: string, category: Req["category"], status: Req["status"], evidence: string, whyItMatters: string): Req => ({ name, category, status, evidence, whyItMatters });

function filmRoadmap(p: Profile): Roadmap {
  const t = p.timeline || "next year";
  return {
    northStar: `${lead(t)}: a finished short on the festival circuit, a reel under 2 minutes, and 3 industry contacts who would vouch for you.`,
    requirements: [
      r("A reel under 2 minutes", "experience", "missing", "No reel or portfolio link found", "Every post-production and production job asks for one first."),
      r("Set experience", "experience", p.experience.length ? "partial" : "missing", p.experience[0]?.role ?? "No crew credits found", "Crews hire people they've already worked with."),
      r("Pro editing tools (Avid / DaVinci)", "skill", p.skills.some((s) => /avid|davinci|premiere/i.test(s)) ? "partial" : "missing", p.skills.slice(0, 3).join(", ") || "No editing tools listed", "Studios cut on Avid; it's a hard filter for assistant editors."),
      r("Industry contacts", "network", "missing", "No industry connections found", "Ava M. (Film '25) got her job through someone she crewed with."),
      r("Festival track record", "credential", "missing", "No festival selections listed", "Selections are how unknown filmmakers get noticed."),
    ],
    phases: [
      { title: "This week", focus: "Start building the things people will ask to see.", quests: [
        q("Cut a 60-second reel from footage you already have", "A reel is the first thing anyone asks for.", "Pick your 5 best shots and drop them on a timeline tonight.", "skills", 60, "2 hrs"),
        q("Sign up to crew on one student production", "Crews hire people they've already worked with.", "Answer one crew call this week, any role.", "network", 50, "1 weekend", "USC School of Cinematic Arts"),
        q("Message Ava M. (Film '25, assistant editor)", "Same path, two years ahead of you.", "Ask: what got you your first paid post job?", "network", 40, "10 min", "Trojan Network"),
      ] },
      { title: "Next semester", focus: "Finish one film and put it out in the world.", quests: [
        q("Learn Avid or DaVinci to a professional level", "Closes the tools gap recruiters screen for.", "Start the free official beginner course.", "skills", 90, "~12 hrs"),
        q("Submit your short to 5 festivals on a budget", "Selections get you noticed and give you something to talk about.", "Set a $150 festival budget and list 5 student-friendly festivals.", "career", 100, "3 hrs"),
      ] },
      { title: "Summer", focus: "Turn contacts into paid work.", quests: [
        q("Land a post-production or PA internship through SCA alumni", "This is how Ava got her job.", "Email 10 alumni from productions you admire.", "career", 150, "ongoing", "USC School of Cinematic Arts"),
      ] },
    ],
    watchOuts: [
      "Advice from engineering friends about GPA doesn't transfer here. Your reel and network matter more, but don't fail required classes.",
      "Festival fees add up fast. Budget before you submit.",
    ],
  };
}

function musicRoadmap(p: Profile): Roadmap {
  const t = p.timeline || "next year";
  return {
    northStar: `${lead(t)}: a clean 3-song recording, 10 paid gigs on your record, and one juried competition performance.`,
    requirements: [
      r("A clean 3-song recording", "experience", "missing", "No recordings or links found", "Marcus O. (Jazz '26) says a demo gets more calls than any resume."),
      r("Live performance reps", "experience", p.clubs.length ? "partial" : "missing", p.clubs[0] ?? "No ensembles or gigs listed", "People hire players they've heard live."),
      r("Network of working musicians", "network", "missing", "No music contacts found", "Sub calls and sideman work come from other musicians."),
      r("Online presence", "credential", "missing", "No website or channel found", "Bookers check before they call."),
      r("Theory and degree requirements", "academic", p.gpa && p.gpa >= 3 ? "have" : "partial", p.gpa ? `GPA ${p.gpa}` : "GPA not found", "They gate your degree even if GPA rarely matters for gigs."),
    ],
    phases: [
      { title: "This week", focus: "Get heard.", quests: [
        q("Book a 2-hour recording session for 3 songs", "A demo is your calling card.", "Ask the music building front desk about student studio time.", "skills", 80, "2 hrs", "USC Thornton School of Music"),
        q("Go to one jam session and swap numbers with 3 players", "Gigs come from people who've heard you.", "Find this week's jam session and go.", "network", 50, "1 evening"),
        q("Message Marcus O. (Jazz '26)", "Same path, one year ahead.", "Ask: how did you get your first paid sub call?", "network", 40, "10 min", "Trojan Network"),
      ] },
      { title: "Next semester", focus: "Build a track record.", quests: [
        q("Enter the concerto and solo competition", "Juried wins open doors and look great on a bio.", "Pick your piece and book a coaching session.", "career", 120, "~20 hrs", "USC Thornton School of Music"),
        q("Post one performance clip a week for 6 weeks", "Bookers and fans check online first.", "Film your next practice run in good light.", "network", 70, "1 hr/week"),
      ] },
      { title: "Summer", focus: "Get paid to play.", quests: [q("Line up 10 paid gigs", "Paid gigs build your reputation and your rate.", "Post on the campus gig board and tell 5 working players you're available.", "career", 150, "ongoing")] },
    ],
    watchOuts: ["'GPA doesn't matter' is mostly true for gigs but not for your degree requirements.", "Don't wait to record until you feel ready. Record now and re-record later."],
  };
}

function businessRoadmap(p: Profile): Roadmap {
  const t = p.timeline || "next summer";
  const gpaOk = (p.gpa ?? 0) >= 3.7;
  return {
    northStar: `${lead(t)}: a 3.7+ GPA, 60 networking calls logged, and a summer analyst offer.`,
    requirements: [
      r("GPA 3.7+", "academic", gpaOk ? "have" : p.gpa ? "partial" : "missing", p.gpa ? `GPA ${p.gpa}` : "GPA not found", "Banks and top firms screen on it. Nina K. (Marshall '26) says protect it."),
      r("Technical prep (accounting & valuation)", "skill", "missing", "No finance coursework or certifications found", "First-round interviews test it directly."),
      r("Networking calls", "network", "missing", "No finance contacts found", "Most offers trace back to someone who flagged your resume."),
      r("One-page resume in banking format", "credential", "partial", "Resume found, not in banking format", "Recruiters skim it in 30 seconds."),
      r("Club leadership", "experience", p.clubs.length ? "partial" : "missing", p.clubs.join(", ") || "No clubs found", "Shows initiative when you don't have work experience yet."),
    ],
    phases: [
      { title: "This week", focus: "Get on the timeline. It starts earlier than you think.", quests: [
        q("Rewrite your resume in banking format", "Recruiters expect a specific one-page format.", "Grab a template from the Career Center and move your bullets over.", "career", 50, "1 hr", "USC Career Center"),
        q("Go to the banking recruiting timeline session", "Recruiting starts sophomore spring.", "RSVP and bring 3 questions.", "career", 40, "1 hr", "Marshall School of Business"),
        q("Schedule 3 alumni calls through Trojan Network", "Calls are how you get flagged for interviews.", "Message 5 alumni in your target group today.", "network", 60, "30 min", "Trojan Network"),
      ] },
      { title: "Next semester", focus: "Technicals and reps.", quests: [
        q("Work through 400 technical interview questions", "Closes the biggest gap before first rounds.", "Do 20 accounting questions tonight.", "skills", 100, "~25 hrs"),
        q("Enter the Marshall case competition", "Real reps and judges from firms.", "Find 3 teammates this week.", "career", 90, "2 weekends", "Marshall School of Business"),
      ] },
      { title: "Recruiting season", focus: "Apply the week postings open.", quests: [q("Submit applications the week postings open", "Spots fill on a rolling basis.", "Set alerts for your 20 target firms.", "career", 150, "8 hrs")] },
    ],
    watchOuts: ["'GPA doesn't matter' came from a consulting path. For banking it does.", "Don't start networking calls before you can answer basic technical questions."],
  };
}

function mastersRoadmap(p: Profile): Roadmap {
  const t = p.timeline || "graduation";
  const intl = /international|f-1|cpt|opt/i.test(p.workAuth ?? "") || (p.goalTags.includes("international"));
  return {
    northStar: `${lead(t)}: 150 targeted applications, 10 interviews and a full-time offer${intl ? " with visa sponsorship" : ""}.`,
    requirements: [
      r("Start recruiting in semester 1", "experience", "missing", "No applications tracked yet", "Master's programs are short. Raj P. (MS CS '26) recruited from his first September."),
      r("Portfolio project tied to your target role", "experience", p.projects.length ? "partial" : "missing", p.projects[0]?.name ?? "No projects found", "It's what you talk about in interviews."),
      r("Interview reps", "skill", "missing", "No mock interviews logged", "Most offers are won or lost in the technical round."),
      r("Work authorization plan", "credential", intl ? "missing" : "have", intl ? "International student: CPT/OPT plan needed" : "No sponsorship needed", "One paperwork mistake can cost an offer."),
      r("Referrals", "network", (p.network?.length ?? 0) > 0 ? "partial" : "missing", (p.network?.length ?? 0) > 0 ? `${p.connectionsTotal} LinkedIn connections` : "No network data", "Referrals roughly triple your interview rate."),
    ],
    phases: [
      { title: "This week", focus: "Get on the clock. Your program moves fast.", quests: [
        q(`List 40 target companies${intl ? " that sponsor visas" : ""}`, "Focus beats volume.", "Start a spreadsheet with company, role, deadline and contact.", "career", 60, "1 hr"),
        ...(intl ? [q("Book an OPT/CPT session with OIS", "Get the paperwork right before you have an offer.", "RSVP to this month's session.", "career", 40, "1 hr", "Office of International Services (OIS)")] : []),
        q("Message Raj P. (MS CS '26)", "Same program type, one year ahead.", "Ask: what would you do in your first month again?", "network", 40, "10 min", "Trojan Network"),
      ] },
      { title: "This semester", focus: "Reps and proof.", quests: [
        q("Do 2 mock interviews a week for 4 weeks", "Turns interviews into offers.", "Book your first slot with the Career Center.", "skills", 100, "2 hrs/week", "USC Career Center"),
        q("Ship one portfolio project tied to your target role", "Gives you a story for every interview.", "Pick a project you can finish in 3 weekends.", "skills", 120, "3 weekends"),
      ] },
      { title: "Before graduation", focus: "Convert.", quests: [q("Turn a summer internship into a return offer", "The fastest path to full-time.", "Ask your manager in week 1 what a return offer requires.", "career", 150, "ongoing")] },
    ],
    watchOuts: ["Don't take a heavy course load in semester 1. It's your best recruiting window.", ...(intl ? ["Filter out roles that don't sponsor before you apply, not after you interview."] : [])],
  };
}

function phdRoadmap(p: Profile): Roadmap {
  const t = p.timeline || "this year";
  return {
    northStar: `${lead(t)}: a first-author paper submitted, one external fellowship application in, and a clear academia-vs-industry plan.`,
    requirements: [
      r("First-author publication", "experience", p.experience.some((e) => /research/i.test(e.role)) ? "partial" : "missing", p.experience[0]?.role ?? "No publications found", "Elena V. (PhD '25): get one out by year 3 or your timeline slips."),
      r("External fellowship", "credential", (p.awards ?? []).some((a) => /fellow/i.test(a)) ? "have" : "missing", (p.awards ?? []).join(", ") || "No fellowships found", "Funding buys freedom to choose your projects."),
      r("Advisor relationship", "network", "partial", "Not enough information", "How your advisor mentors matters more than the topic."),
      r("Teaching experience", "experience", "missing", "No TA roles found", "Faculty applications expect it."),
      r("Industry contacts", "network", (p.network?.length ?? 0) > 0 ? "partial" : "missing", (p.network?.length ?? 0) > 0 ? `${p.connectionsTotal} connections` : "No network data", "Keeps the industry option open."),
    ],
    phases: [
      { title: "This week", focus: "Small moves on funding and writing.", quests: [
        q("Draft a one-page research statement", "Every fellowship and job asks for one.", "Write 3 sentences: problem, approach, why it matters.", "academics", 60, "2 hrs", "USC Writing Center"),
        q("Sign up for the fellowship application workshop", "Year 1 is the time to apply.", "RSVP and bring your draft.", "career", 50, "1 hr", "USC Graduate School"),
        q("Message Elena V. (PhD BME '25)", "She went through the academia-vs-industry decision.", "Ask: what made you choose academia?", "network", 40, "10 min", "Trojan Network"),
      ] },
      { title: "This semester", focus: "Publish and teach.", quests: [
        q("Submit to one workshop or conference", "Workshop papers count and build momentum.", "Pick the venue and note its deadline today.", "academics", 150, "~30 hrs", "USC Libraries"),
        q("Apply for a TA position", "Teaching experience plus funding.", "Email your department's TA coordinator.", "career", 60, "30 min"),
      ] },
      { title: "Summer", focus: "Test the other path.", quests: [q("Do a summer research internship in industry", "Compare paths before you have to choose.", "List 5 industry labs in your area.", "career", 120, "ongoing")] },
    ],
    watchOuts: ["Don't wait for a 'perfect' paper. Workshop submissions build momentum.", "Decide academia vs. industry with data from both, not just your advisor's view."],
  };
}

function genericRoadmap(p: Profile): Roadmap {
  const t = p.timeline || "next year";
  return {
    northStar: `${lead(t)}: a clear map of what "${p.goal}" really takes, 3 Trojans on that path in your corner, and your first 5 steps done.`,
    requirements: [
      r("Know the real requirements", "credential", "missing", "Not mapped yet", "Most students guess. Trojans who got there didn't."),
      r("Relevant experience", "experience", p.experience.length ? "partial" : "missing", p.experience[0]?.role ?? "None found", "Shows you've tested the path."),
      r("People on the path", "network", "missing", "No contacts found", "Advice from similar paths beats general advice."),
      r("Academic standing", "academic", p.gpa && p.gpa >= 3.3 ? "have" : "partial", p.gpa ? `GPA ${p.gpa}` : "GPA not found", "Keeps doors open while you decide."),
    ],
    phases: [
      { title: "This week", focus: "Learn the path from people on it.", quests: [
        q("Message 3 Trojans already on this path", "They know the unwritten rules.", "Search Trojan Network for your goal and send 3 short notes.", "network", 60, "30 min", "Trojan Network"),
        q("Book a session with an advisor", "Turns a goal into a course and activity plan.", "Book through your school's advising office.", "academics", 40, "15 min", "USC Career Center"),
      ] },
      { title: "This semester", focus: "Test it for real.", quests: [q("Do one real thing in this field", "A small real project beats months of research.", "Pick one club, project or shadowing day.", "skills", 100, "4 hrs")] },
    ],
    watchOuts: ["Advice from people on different paths may not transfer. Check who it's from."],
  };
}

export function demoRoadmap(p: Profile): Roadmap {
  const g = new Set(p.goalTags);
  const lvl = p.year.toLowerCase();
  if (g.has("film")) return filmRoadmap(p);
  if (g.has("music")) return musicRoadmap(p);
  if (lvl.startsWith("phd") || g.has("phd") || g.has("academia")) return phdRoadmap(p);
  if (lvl.startsWith("master") || g.has("masters") || g.has("fulltime")) return mastersRoadmap(p);
  if (g.has("finance") || g.has("consulting") || g.has("business")) return businessRoadmap(p);
  if (g.has("robotics") || g.has("ml") || g.has("swe") || g.has("hardware")) return roboticsRoadmap(p);
  return genericRoadmap(p);
}
