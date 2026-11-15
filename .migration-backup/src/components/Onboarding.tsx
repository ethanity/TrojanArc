"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowsLeftRight,
  BookOpen,
  Buildings,
  ChalkboardTeacher,
  ChartLineUp,
  FilmSlate,
  GraduationCap,
  Medal,
  MusicNotes,
  Scales,
  Briefcase,
  CalendarBlank,
  CalendarCheck,
  Crosshair,
  MapTrifold,
  Target,
  UsersThree,
  CaretDown,
  CheckCircle,
  CircleNotch,
  Code,
  FilePdf,
  FileZip,
  Flask,
  GithubLogo,
  Globe,
  LinkedinLogo,
  PencilSimple,
  Robot,
  Stethoscope,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import type { InterviewQuestion, OnboardResult, Profile } from "@/lib/types";
import { useCalendar } from "@/lib/calendar";
import { parseLinkedInZip, type LinkedInSummary } from "@/lib/linkedin";
import { completeness } from "@/lib/completeness";
import { AiWorking, Avatar, Bar, Card, Chip, ErrorNote } from "./ui";
import { LevelRing, RadarScope, RankBadge } from "./viz";
import { RANKS } from "@/lib/game";
import type { FitResult, Opportunity } from "@/lib/types";

/* ---------------- Data ---------------- */

type Level = "Undergrad" | "Master's" | "PhD";
const LEVELS: Level[] = ["Undergrad", "Master's", "PhD"];
const U: Level[] = ["Undergrad"], M: Level[] = ["Master's"], D: Level[] = ["PhD"], ALL: Level[] = ["Undergrad", "Master's", "PhD"];

const GOALS = [
  { label: "Robotics / AI internship", goal: "Robotics / physical AI internship", tags: ["robotics", "ml", "internship"], Icon: Robot, levels: U },
  { label: "SWE internship at big tech", goal: "Land a SWE internship at a big tech company", tags: ["swe", "internship"], Icon: Code, levels: U },
  { label: "Get into a research lab", goal: "Get into a research lab", tags: ["research", "grad-school"], Icon: Flask, levels: U },
  { label: "Banking or consulting", goal: "Land a banking or consulting internship", tags: ["finance", "consulting", "business", "internship"], Icon: ChartLineUp, levels: U },
  { label: "Film & TV career", goal: "Break into film and TV", tags: ["film", "arts"], Icon: FilmSlate, levels: ALL },
  { label: "Music career", goal: "Build a career in music", tags: ["music", "arts"], Icon: MusicNotes, levels: ALL },
  { label: "Medical school", goal: "Get into medical school", tags: ["premed", "research"], Icon: Stethoscope, levels: U },
  { label: "Law school", goal: "Get into law school", tags: ["law"], Icon: Scales, levels: U },
  { label: "Full-time job after graduation", goal: "Land a full-time job before graduation", tags: ["fulltime", "masters"], Icon: Buildings, levels: M },
  { label: "Switch careers", goal: "Use my master's to switch careers", tags: ["fulltime", "masters"], Icon: ArrowsLeftRight, levels: M },
  { label: "Internship during my program", goal: "Get a summer internship during my master's", tags: ["internship", "masters"], Icon: Code, levels: M },
  { label: "Get into a PhD program", goal: "Get into a PhD program", tags: ["research", "grad-school"], Icon: GraduationCap, levels: M },
  { label: "Publish & finish my dissertation", goal: "Publish and finish my dissertation on time", tags: ["phd", "research", "academia"], Icon: BookOpen, levels: D },
  { label: "Faculty job", goal: "Land a faculty position", tags: ["phd", "academia"], Icon: ChalkboardTeacher, levels: D },
  { label: "Industry research role", goal: "Move into an industry research role", tags: ["phd", "research", "fulltime"], Icon: Flask, levels: D },
  { label: "Win a fellowship", goal: "Win an external fellowship", tags: ["phd", "fellowship"], Icon: Medal, levels: D },
  { label: "Start a company", goal: "Start a company", tags: ["startup", "product"], Icon: Briefcase, levels: ALL },
];

const WHEN = [
  { label: "This semester", value: "This semester", emoji: "📚" },
  { label: "Summer 2027", value: "Summer 2027", emoji: "☀️" },
  { label: "Within a year", value: "Within a year", emoji: "🗓️" },
  { label: "Before I graduate", value: "Before I graduate", emoji: "🎓" },
];

const PREFS = ["Bay Area", "Los Angeles", "Remote is fine", "Research over industry", "Paid roles only", "Startups", "Big companies", "Stay near USC"];

const MAJORS = [
  "Computer Science", "Computer Engineering and Computer Science", "Electrical and Computer Engineering", "Mechanical Engineering",
  "Aerospace Engineering", "Biomedical Engineering", "Chemical Engineering", "Civil Engineering", "Industrial and Systems Engineering",
  "Data Science", "Applied and Computational Mathematics", "Business Administration", "Economics", "Psychology", "Biological Sciences",
  "Neuroscience", "Human Biology", "Communication", "Journalism", "Cinema and Media Studies", "Political Science",
  "International Relations", "Architecture", "Music", "Film and Television Production", "Jazz Studies", "Music Production",
  "Accounting", "Public Policy", "MS Computer Science", "MS Data Science", "MS Electrical and Computer Engineering", "MBA",
];
const YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Master's", "PhD"];

function schoolFor(major: string): string {
  const m = major.toLowerCase();
  if (/engineer|computer|data science|aerospace|biomedical/.test(m)) return "Viterbi School of Engineering";
  if (/business|accounting/.test(m)) return "Marshall School of Business";
  if (/communication|journalism|public relations/.test(m)) return "Annenberg School";
  if (/cinema|film|media/.test(m)) return "School of Cinematic Arts";
  if (/architecture/.test(m)) return "School of Architecture";
  if (/music|jazz|composition/.test(m)) return "Thornton School of Music";
  if (/^mba$|accounting/.test(m)) return "Marshall School of Business";
  if (/public policy/.test(m)) return "Price School of Public Policy";
  return m ? "Dornsife College" : "";
}

function tagsFromText(t: string): string[] {
  const s = t.toLowerCase();
  const map: [RegExp, string][] = [
    [/robot|physical ai|autonom|drone/, "robotics"],
    [/\bml\b|machine learning|\bai\b|data/, "ml"],
    [/software|swe|developer|coding/, "swe"],
    [/research|lab|phd/, "research"],
    [/grad school|phd|master/, "grad-school"],
    [/intern/, "internship"],
    [/med|doctor|premed/, "premed"],
    [/consult/, "consulting"],
    [/finance|bank|quant|trading/, "finance"],
    [/startup|company|found/, "startup"],
    [/product|\bpm\b/, "product"],
    [/hardware|electrical|chip|embedded/, "hardware"],
    [/film|movie|tv\b|television|director|editor|cinemat/, "film"],
    [/music|band|perform|compos|producer/, "music"],
    [/business|marketing|bank/, "business"],
    [/law school|lawyer|legal/, "law"],
    [/full[- ]time|new grad|job after/, "fulltime"],
    [/fellowship|grant/, "fellowship"],
    [/faculty|professor|academi/, "academia"],
  ];
  return Array.from(new Set(map.filter(([re]) => re.test(s)).map(([, tag]) => tag)));
}

const EMPTY_PROFILE: Profile = {
  name: "", major: "", minor: "", school: "", year: "", gradTerm: "", gpa: null, goal: "", goalTags: [], timeline: "", preferences: "",
  courses: [], skills: [], projects: [], experience: [], clubs: [], github: "",
};

type Step = "welcome" | "goal" | "docs" | "when" | "questions" | "confirm";
const FLOW: Step[] = ["goal", "docs", "when", "questions", "confirm"];
type Scan = { state: "idle" | "scanning" | "done" | "error"; result?: OnboardResult & { mode?: string }; error?: string };

/* ---------------- Small pieces ---------------- */

function Question({ eyebrow, title, sub, children }: { eyebrow: string; title: ReactNode; sub?: string; children: ReactNode }) {
  return (
    <div className="rise">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[40px]">{title}</h1>
      {sub && <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-muted">{sub}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

function ScanPill({ scan, files }: { scan: Scan; files: number }) {
  if (scan.state === "idle") return null;
  return (
    <div className="toast inline-flex h-9 items-center gap-2 rounded-full border border-hairline-2 bg-surface px-3.5 text-[13px] shadow-sm">
      {scan.state === "scanning" && <><CircleNotch size={15} className="spin text-cardinal" /> Reading your {files > 1 ? "documents" : files ? "resume" : "GitHub"} in the background…</>}
      {scan.state === "done" && <><CheckCircle size={16} weight="fill" className="text-good" /> Profile built from your docs</>}
      {scan.state === "error" && <><X size={15} className="text-cardinal" /> Couldn&apos;t read that. You can fill it in at the end.</>}
    </div>
  );
}

/* ---------------- Graduation picker ---------------- */

const GRAD_TERMS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_PATTERNS = [
  /\bjan(uary)?\b/, /\bfeb(ruary)?\b/, /\bmar(ch)?\b/, /\bapr(il)?\b/, /\bmay\b/, /\bjune?\b/,
  /\bjuly?\b/, /\baug(ust)?\b/, /\bsep(t|tember)?\b/, /\boct(ober)?\b/, /\bnov(ember)?\b/, /\bdec(ember)?\b/,
];
const THIS_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 8 }, (_, i) => String(THIS_YEAR + i));

/** Turn whatever a document said ("Spring '29", "Dec 2028", "Class of 2029") into "May 2029". */
export function normalizeGrad(raw: string): string {
  const s = (raw ?? "").toLowerCase();
  const four = s.match(/20\d{2}/)?.[0];
  const two = s.match(/['\u2019](\d{2})\b/)?.[1];
  const year = four ?? (two ? `20${two}` : "");
  if (!year) return "";
  // Whole month names or standard abbreviations only, so "Junior" isn't read as June.
  const month = GRAD_TERMS.find((m, k) => MONTH_PATTERNS[k].test(s));
  const term = month ?? (/fall|winter/.test(s) ? "December" : /summer/.test(s) ? "August" : "May");
  return `${term} ${year}`;
}

function GradPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [term = "", year = ""] = value ? value.split(" ") : [];
  const set = (t: string, y: string) => onChange(t && y ? `${t} ${y}` : t || y ? `${t}${t && y ? " " : ""}${y}` : "");
  const sel = "h-10 w-full appearance-none rounded-xl border border-hairline-2 bg-surface pl-3 pr-8 text-[15px] font-medium outline-none transition-colors hover:border-cardinal/40 focus:border-cardinal/60";
  return (
    <div>
      <span className="text-[12px] font-medium text-faint">Graduating</span>
      <div className="mt-1 grid grid-cols-[1.45fr_1fr] gap-2">
        {[
          { label: "Term", v: term, opts: GRAD_TERMS, on: (x: string) => set(x, year || String(THIS_YEAR + 2)) },
          { label: "Year", v: year, opts: GRAD_YEARS, on: (x: string) => set(term || "May", x) },
        ].map((d) => (
          <label key={d.label} className="relative block">
            <span className="sr-only">Graduation {d.label.toLowerCase()}</span>
            <select className={`${sel} ${d.v ? "" : "text-faint"}`} value={d.v} onChange={(e) => d.on(e.target.value)}>
              <option value="" disabled>{d.label}</option>
              {d.opts.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <CaretDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint" />
          </label>
        ))}
      </div>
    </div>
  );
}

function InlineField({ label, value, onChange, placeholder, list, big = false }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; list?: string; big?: boolean }) {
  return (
    <label className="group block">
      <span className="text-[12px] font-medium text-faint">{label}</span>
      <span className="relative mt-0.5 block">
        <input
          className={`w-full border-b-2 border-transparent bg-transparent pb-1 pr-6 outline-none transition-colors placeholder:text-faint hover:border-hairline-2 focus:border-cardinal ${big ? "text-[28px] font-semibold tracking-[-0.02em]" : "text-[16px] font-medium"}`}
          style={big ? { fontFamily: "var(--font-lexend)" } : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          list={list}
        />
        <PencilSimple size={big ? 18 : 14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
    </label>
  );
}

/* ---------------- Landing (before sign-in) ---------------- */

const SCOPE_ITEMS: Opportunity[] = Array.from({ length: 14 }, (_, i) => ({
  id: `d${i}`, kind: (["internship", "research", "event", "club", "program", "job"] as const)[i % 6], title: "",
  org: "", location: "", url: "", deadline: "", posted: "", tags: [], source: "", details: "",
}));
const SCOPE_FITS: FitResult[] = SCOPE_ITEMS.map((o, i) => {
  const fit = [94, 88, 81, 76, 70, 64, 58, 52, 47, 90, 35, 84, 61, 72][i];
  return { id: o.id, fit, verdict: fit >= 75 ? "strong" : fit >= 50 ? "stretch" : "skip", reason: "", blocker: "", nextAction: "" };
});

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden>
        <path d="M4 26 C 8 10, 22 4, 28 6" fill="none" stroke="#990000" strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="28" cy="6" r="3.2" fill="#ffcc00" />
      </svg>
      <span className="text-[17px] font-bold tracking-[-0.02em] text-cardinal-deep">Trojan <span className="text-gold">Arc</span></span>
    </span>
  );
}

const ROTATING = ["internship", "research lab", "film gig", "PhD spot", "med school seat", "fellowship", "first job"];

// A long reel of repeated words so every spin can travel several slots before landing.
const REEL = Array.from({ length: 42 }, (_, k) => ROTATING[k % ROTATING.length]);
const STEP = 3; // slots per spin (3 and 7 are coprime, so every goal gets its turn)

/** Slot-machine headline word: spins through several goals, then eases to a stop. */
function RotatingWord() {
  const [pos, setPos] = useState(0);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const id = setInterval(() => { setAnimate(true); setPos((p) => p + STEP); }, 2800);
    return () => clearInterval(id);
  }, []);
  // Near the end of the reel, silently jump back to the same word earlier in the reel.
  useEffect(() => {
    if (pos < REEL.length - STEP * 2) return;
    const t = setTimeout(() => { setAnimate(false); setPos(pos % ROTATING.length); }, 1150);
    return () => clearTimeout(t);
  }, [pos]);

  const H = 1.5; // em: tall slot so descenders sit clear of the fade and neighbours never peek in
  const fade = "linear-gradient(to bottom, transparent 0%, #000 13%, #000 87%, transparent 100%)";
  return (
    <>
      <span className="sr-only">{REEL[pos]}</span>
      <span aria-hidden className="relative block overflow-hidden text-cardinal" style={{ height: `${H}em`, margin: "-0.22em 0", maskImage: fade, WebkitMaskImage: fade }}>
        <span
          className="flex flex-col items-center"
          style={{ transform: `translateY(-${pos * H}em)`, transition: animate ? "transform 1100ms cubic-bezier(.16,1,.3,1)" : "none", willChange: "transform" }}
        >
          {REEL.map((w, k) => (
            <span key={k} className="block whitespace-nowrap" style={{ height: `${H}em`, lineHeight: `${H}em` }}>{w}</span>
          ))}
        </span>
      </span>
    </>
  );
}

function StepCard({ n, Icon, label, children, i }: { n: number; Icon: typeof Target; label: string; children: ReactNode; i: number }) {
  return (
    <div className="rise card flex flex-col p-5 text-left" style={{ ["--i" as string]: i }}>
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-cardinal text-gold-bright"><Icon size={19} weight="fill" /></span>
        <span className="text-[12px] font-semibold text-faint">0{n}</span>
        <span className="text-[16px] font-semibold">{label}</span>
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </div>
  );
}

function Landing({ onStart, onDemo, onCancel }: { onStart: () => void; onDemo: () => void; onCancel?: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-1">
          {onCancel && <button className="btn btn-quiet btn-sm" onClick={onCancel}>Cancel</button>}
          <button className="btn btn-secondary btn-sm" onClick={onDemo}>Try the demo</button>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-5 pb-20 pt-8 text-center sm:px-8 sm:pt-14">
        {/* Hero: the value proposition in one line */}
        <span className="rise inline-flex h-8 items-center gap-1.5 rounded-full bg-cardinal px-3.5 text-[13px] font-semibold text-gold-bright shadow-[0_6px_18px_-8px_rgba(153,0,0,.7)]">
          Free AI career planner for USC students ✌️
        </span>
        <h1 className="rise mt-6 w-full max-w-4xl text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[66px]" style={{ ["--i" as string]: 1 }}>
          <span className="block">Land the</span>
          <RotatingWord />
          <span className="block">you want.</span>
        </h1>
        <p className="rise mt-5 max-w-2xl text-[17px] leading-relaxed text-muted sm:text-[19px]" style={{ ["--i" as string]: 2 }}>
          Whatever you&apos;re going for: drop your resume and get a week-by-week plan, openings you qualify for, and advice from Trojans who got there.
        </p>
        <div className="rise mt-8 flex flex-col items-center gap-3" style={{ ["--i" as string]: 3 }}>
          <button className="btn btn-primary h-14 px-8 text-[16px]" onClick={onStart}>
            Get started <ArrowRight size={18} weight="bold" />
          </button>
          <p className="text-[13px] text-faint">60 seconds · no USC password</p>
        </div>

        {/* How it works, as pictures: goal -> plan -> people */}
        <div className="relative mt-16 grid w-full max-w-5xl gap-4 md:grid-cols-3">
          <div className="pointer-events-none absolute -inset-x-8 -bottom-8 top-8 rounded-[48px] bg-gradient-to-b from-[#ffcc00]/15 via-cardinal/5 to-transparent blur-2xl" aria-hidden />

          <StepCard n={1} Icon={Target} label="Pick your goal" i={3}>
            <div className="space-y-2">
              {[
                ["🤖", "Robotics internship"],
                ["🎬", "Break into film"],
                ["🎓", "Get into a PhD"],
              ].map(([e, t], k) => (
                <div key={t} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[14px] font-medium ${k === 0 ? "border-cardinal bg-[#fff1f3] text-cardinal-deep" : "border-hairline bg-surface-2 text-muted"}`}>
                  <span className="text-[17px]">{e}</span>{t}
                  {k === 0 && <CheckCircle size={17} weight="fill" className="ml-auto text-cardinal" />}
                </div>
              ))}
            </div>
          </StepCard>

          <StepCard n={2} Icon={MapTrifold} label="Get your plan" i={4}>
            <svg viewBox="0 0 260 70" className="w-full" aria-hidden>
              <path d="M8 62 C 80 62, 120 12, 252 10" fill="none" stroke="#efe8e1" strokeWidth="5" strokeLinecap="round" />
              <path d="M8 62 C 80 62, 120 12, 252 10" fill="none" stroke="url(#lp)" strokeWidth="5" strokeLinecap="round" pathLength={1} strokeDasharray="0.55 1" />
              <defs><linearGradient id="lp"><stop offset="0" stopColor="#990000" /><stop offset="1" stopColor="#ffcc00" /></linearGradient></defs>
              <circle cx="8" cy="62" r="5" fill="#990000" /><circle cx="140.6" cy="25.9" r="6" fill="#ffcc00" stroke="#fff" strokeWidth="2" /><circle cx="252" cy="10" r="5" fill="#e8dfd6" />
            </svg>
            <ul className="mt-3 space-y-2 text-[13.5px]">
              {[["Film a robot demo", true], ["Email a research lab", true], ["Apply to 25 roles", false]].map(([t, d]) => (
                <li key={t as string} className="flex items-center gap-2">
                  <span className={`grid h-5 w-5 place-items-center rounded-full ${d ? "bg-good text-white" : "border-2 border-hairline-2"}`}>{d && <CheckCircle size={20} weight="fill" />}</span>
                  <span className={d ? "text-faint line-through" : "font-medium"}>{t as string}</span>
                  {!d && <span className="game ml-auto text-[12.5px] text-gold">+150</span>}
                </li>
              ))}
            </ul>
          </StepCard>

          <StepCard n={3} Icon={UsersThree} label="Learn from Trojans like you" i={5}>
            <div className="space-y-2.5">
              {[["Maya C.", "Robotics intern", 91, "good"], ["Leo T.", "Robot-learning PhD", 88, "good"], ["Jordan P.", "Consulting", 18, "bad"]].map(([n, o, sc, t]) => (
                <div key={n as string} className="flex items-center gap-2.5">
                  <Avatar name={n as string} size={32} />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-[13.5px] font-medium leading-tight">{n as string}</span>
                    <span className="block truncate text-[12px] text-muted">{o as string}</span>
                  </span>
                  <span className={`game text-[13px] ${t === "good" ? "text-good" : "text-cardinal"}`}>{sc as number}%</span>
                </div>
              ))}
            </div>
          </StepCard>
        </div>

        {/* Four things it does, shown not told */}
        <div className="mt-20 grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rise card overflow-hidden p-5 text-left" style={{ ["--i" as string]: 6 }}>
            <div className="-mx-2 -mt-2"><RadarScope items={SCOPE_ITEMS} fits={SCOPE_FITS} size={220} decorative /></div>
            <p className="mt-3 flex items-center gap-2 text-[15px] font-semibold"><Crosshair size={17} className="text-cardinal" /> Radar</p>
            <p className="text-[13px] text-muted">Every opportunity, ranked for you</p>
          </div>
          <div className="rise card flex flex-col p-5 text-left" style={{ ["--i" as string]: 7 }}>
            <div className="flex flex-1 flex-col justify-center gap-2.5 rounded-2xl bg-surface-2 p-4">
              <p className="text-[13px] italic text-muted">“GPA doesn&apos;t matter.”</p>
              <span className="w-fit rounded-lg bg-[#ffe1e5] px-2 py-0.5 text-[12px] font-semibold text-cardinal-deep">take with salt · 18%</span>
              <p className="mt-1 text-[13px] italic text-muted">“Labs check your grades.”</p>
              <span className="w-fit rounded-lg bg-mint px-2 py-0.5 text-[12px] font-semibold text-[#16754a]">applies to you · 91%</span>
            </div>
            <p className="mt-4 flex items-center gap-2 text-[15px] font-semibold"><UsersThree size={17} className="text-cardinal" /> Advice lens</p>
            <p className="text-[13px] text-muted">Know whose advice to trust</p>
          </div>
          <div className="rise card flex flex-col p-5 text-left" style={{ ["--i" as string]: 8 }}>
            <div className="flex flex-1 items-center justify-center rounded-2xl bg-surface-2 p-4">
              <div className="flex items-end gap-2"><RankBadge rank={RANKS[0]} size={40} /><RankBadge rank={RANKS[1]} size={52} /><RankBadge rank={RANKS[2]} size={72} /></div>
            </div>
            <p className="mt-4 flex items-center gap-2 text-[15px] font-semibold"><MapTrifold size={17} className="text-cardinal" /> Quests &amp; XP</p>
            <p className="text-[13px] text-muted">Recruit → Squire → Warrior → Legend</p>
          </div>
          <div className="rise card flex flex-col p-5 text-left" style={{ ["--i" as string]: 9 }}>
            <div className="grid flex-1 grid-cols-5 gap-1.5 rounded-2xl bg-surface-2 p-3">
              {Array.from({ length: 5 }, (_, d) => (
                <div key={d} className="flex flex-col gap-1.5">
                  <span className="text-center text-[10px] font-semibold text-faint">{"MTWTF"[d]}</span>
                  <span className="h-6 rounded-md bg-sky" />
                  {d % 2 === 0 ? <span className="h-4 rounded-md border-2 border-dashed border-cardinal/50" /> : <span className="h-4 rounded-md bg-lilac" />}
                  <span className={`h-5 rounded-md ${d === 1 || d === 3 ? "bg-mint" : "bg-sky"}`} />
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-[15px] font-semibold"><CalendarBlank size={17} className="text-cardinal" /> Your week</p>
            <p className="text-[13px] text-muted">Quests fit around your classes</p>
          </div>
        </div>

        {/* Numbers */}
        <div className="mt-20 grid w-full max-w-4xl grid-cols-3 gap-4">
          {[["1,300+", "live openings, checked hourly"], ["Every", "major, master's & PhD"], ["60s", "from resume to plan"]].map(([n, l], k) => (
            <div key={l} className="rise" style={{ ["--i" as string]: 10 + k }}>
              <p className="text-[34px] font-semibold tracking-[-0.03em] text-cardinal sm:text-[48px]">{n}</p>
              <p className="mt-1 text-[13px] text-muted sm:text-[14px]">{l}</p>
            </div>
          ))}
        </div>

        {/* Closing CTA */}
        <div className="hero-cardinal card relative mt-20 w-full max-w-5xl overflow-hidden px-6 py-12 text-center sm:py-14">
          <p className="text-[32px] font-semibold tracking-[-0.03em] sm:text-[44px]">Fight on. Start your arc.</p>
          <button className="btn btn-gold mt-6 h-14 px-8 text-[16px]" onClick={onStart}>Get started <ArrowRight size={18} weight="bold" /></button>
        </div>
      </main>

      <footer className="border-t border-hairline px-5 py-6 text-center text-[12.5px] text-faint">
        No USC password · You confirm everything · Never applies or messages anyone for you
      </footer>
    </div>
  );
}

/* ---------------- Main ---------------- */

export default function Onboarding({ onDone, onCancel, existing }: { onDone: () => void; onCancel?: () => void; existing?: Profile | null }) {
  const { setProfile, toast } = useStore();
  // Re-scanning an existing profile skips the landing page and keeps everything already known.
  const [step, setStep] = useState<Step>(existing ? "docs" : "welcome");
  const [goal, setGoal] = useState(existing?.goal ?? "");
  const [level, setLevel] = useState<Level>(/^master/i.test(existing?.year ?? "") ? "Master's" : /^phd/i.test(existing?.year ?? "") ? "PhD" : "Undergrad");
  const [tags, setTags] = useState<string[]>(existing?.goalTags ?? []);
  const [customGoal, setCustomGoal] = useState(Boolean(existing?.goal && !GOALS.some((g) => g.goal === existing.goal)));
  const [timeline, setTimeline] = useState(existing?.timeline ?? "");
  const [prefs, setPrefs] = useState<string[]>(existing?.preferences ? existing.preferences.split(", ").filter(Boolean) : []);
  const [files, setFiles] = useState<File[]>([]);
  const [github, setGithub] = useState(existing?.github ?? "");
  const [website, setWebsite] = useState(existing?.links?.find((l) => !/github\.com|linkedin\.com/i.test(l)) ?? "");
  const [linkedin, setLinkedin] = useState<LinkedInSummary | null>(null);
  const [liBusy, setLiBusy] = useState(false);
  const [questions, setQuestions] = useState<InterviewQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  // On a re-scan, the sources already in the profile count as scanned: only new documents trigger a new read.
  const scannedKey = useRef(existing ? `|${(existing.github ?? "").trim()}|${(existing.links?.find((l) => !/github\.com|linkedin\.com/i.test(l)) ?? "").trim()}|` : "");
  const [ranScan, setRanScan] = useState(false);
  const liInput = useRef<HTMLInputElement>(null);
  const cal = useCalendar();
  const [drag, setDrag] = useState(false);
  // An existing profile acts as the starting scan, so nothing is lost if no new documents are added.
  const [scan, setScan] = useState<Scan>(existing ? { state: "done", result: { profile: existing, found: [], missing: [] } } : { state: "idle" });
  const [basics, setBasics] = useState({ name: existing?.name ?? "", major: existing?.major ?? "", year: existing?.year ?? "", gradTerm: existing?.gradTerm ?? "" });
  const [showFound, setShowFound] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const idx = FLOW.indexOf(step);
  const go = (s: Step) => {
    setError("");
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => go(FLOW[Math.min(FLOW.length - 1, idx + 1)]);
  const back = () => {
    if (existing && idx <= FLOW.indexOf("docs")) return onCancel?.(); // re-scan: back means "return to my profile"
    return idx <= 0 ? go("welcome") : go(FLOW[idx - 1]);
  };

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  // Fill the basics from the scan as soon as it lands (only fields the student hasn't typed).
  useEffect(() => {
    if (scan.state !== "done" || !scan.result) return;
    const p = scan.result.profile;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- merge async scan result into the form
    setBasics((b) => ({ name: b.name || p.name, major: b.major || p.major, year: b.year || p.year, gradTerm: b.gradTerm || normalizeGrad(p.gradTerm) }));
  }, [scan]);

  const sourceKey = (list: File[], li: LinkedInSummary | null) => `${list.map((f) => f.name + f.size).join()}|${github.trim()}|${website.trim()}|${li?.connectionsTotal ?? ""}`;

  async function runScan(opts: { demo?: boolean; fileList?: File[]; li?: LinkedInSummary | null } = {}) {
    const list = opts.fileList ?? files;
    const li = opts.li === undefined ? linkedin : opts.li;
    if (!opts.demo && !list.length && !github.trim() && !website.trim() && !li) return;
    scannedKey.current = opts.demo ? "demo" : sourceKey(list, li);
    setRanScan(true);
    setScan({ state: "scanning" });
    try {
      const fd = new FormData();
      if (opts.demo) fd.append("demo", "1");
      else {
        list.forEach((f) => fd.append("files", f));
        fd.append("github", github);
        fd.append("website", website);
        if (li) fd.append("linkedin", li.digest);
      }
      const res = await fetch("/api/onboard", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setScan({ state: "done", result: data });
      return data as OnboardResult;
    } catch (e) {
      setScan({ state: "error", error: e instanceof Error ? e.message : String(e) });
    }
  }

  function autoAdvance(to: Step, ms = 380) {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => go(to), ms);
  }

  async function importLinkedIn(f: File) {
    setLiBusy(true);
    setError("");
    try {
      const sum = await parseLinkedInZip(f);
      if (!sum.connectionsTotal && !sum.digest) throw new Error("That ZIP doesn't look like a LinkedIn data export.");
      setLinkedin(sum);
      return sum;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that ZIP.");
      return linkedin;
    } finally {
      setLiBusy(false);
    }
  }

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const all = Array.from(list);
    const zip = all.find((f) => /\.zip$/i.test(f.name));
    const docs = all.filter((f) => !/\.zip$/i.test(f.name));
    const li = zip ? await importLinkedIn(zip) : linkedin;
    const merged = [...files, ...docs].slice(0, 6);
    setFiles(merged);
    runScan({ fileList: merged, li }); // start reading right away, in the background
  }

  function continueFromDocs() {
    const any = files.length || github.trim() || website.trim() || linkedin;
    if (any && sourceKey(files, linkedin) !== scannedKey.current) runScan();
    next();
  }

  async function loadQuestions(p: Profile) {
    try {
      const res = await fetch("/api/interview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile: p }) });
      const data = await res.json();
      const qs = (data.questions ?? []) as InterviewQuestion[];
      setQuestions(qs);
      return qs;
    } catch {
      setQuestions([]);
      return [];
    }
  }

  // Generate the adaptive interview once the background scan has landed.
  useEffect(() => {
    if (step !== "questions" || questions || scan.state === "scanning") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; state is set when the response arrives
    loadQuestions(buildProfile());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when entering the step or when the scan finishes
  }, [step, scan.state]);

  async function tryDemo() {
    setStep("confirm");
    const r = await runScan({ demo: true });
    if (r) {
      setGoal(r.profile.goal);
      setTags(r.profile.goalTags);
      setTimeline(r.profile.timeline);
      setPrefs(["Bay Area", "Research over industry"]);
      const qs = await loadQuestions(r.profile);
      const pick: Record<string, string[]> = {};
      for (const q of qs) pick[q.id] = q.kind === "multi" ? q.options.slice(0, 2) : q.options.slice(0, 1);
      setAnswers(pick);
    }
  }

  function buildProfile(): Profile {
    const base = scan.result?.profile ?? EMPTY_PROFILE;
    const major = basics.major.trim();
    const qa = (questions ?? []).filter((q) => answers[q.id]?.length);
    const byField = (f: InterviewQuestion["field"]) => qa.filter((q) => q.field === f).flatMap((q) => answers[q.id]);
    const uniq = (...xs: (string[] | undefined)[]) => Array.from(new Set(xs.flatMap((x) => x ?? [])));
    return {
      ...base,
      name: basics.name.trim() || "Trojan",
      major,
      school: base.school || schoolFor(major),
      year: basics.year || base.year,
      gradTerm: basics.gradTerm || normalizeGrad(base.gradTerm) || base.gradTerm,
      goal: goal.trim(),
      goalTags: uniq(tags, tagsFromText(goal), goal === base.goal ? base.goalTags : [], level === "Master's" ? ["masters"] : level === "PhD" ? ["phd"] : []),
      timeline: timeline || base.timeline,
      preferences: prefs.join(", ") || base.preferences,
      github: base.github || github.replace(/^@/, ""),
      skills: uniq(base.skills, linkedin?.skills).slice(0, 40),
      certifications: uniq(base.certifications, linkedin?.certifications),
      languages: uniq(base.languages, linkedin?.languages),
      awards: uniq(base.awards, linkedin?.awards),
      // A new scan never drops what an earlier one learned: fall back to the existing profile.
      network: linkedin?.network ?? existing?.network ?? base.network,
      connectionsTotal: linkedin?.connectionsTotal ?? existing?.connectionsTotal ?? base.connectionsTotal,
      links: uniq(base.links, website.trim() ? [website.trim()] : []),
      hoursPerWeek: byField("hoursPerWeek")[0] ?? base.hoursPerWeek,
      workAuth: byField("workAuth")[0] ?? base.workAuth,
      priorities: byField("priorities").length ? byField("priorities") : base.priorities,
      interests: uniq(byField("interests"), base.interests),
      answers: qa.map((q) => ({ q: q.question, a: answers[q.id].join(", ") })),
      sources: uniq(base.sources, linkedin ? ["LinkedIn export"] : [], cal.status === "connected" ? ["Google Calendar"] : []),
    };
  }

  function finish() {
    const profile = buildProfile();
    const name = profile.name;
    if (!profile.goal) {
      setError("Pick a goal first. It's the one thing only you can tell me.");
      go("goal");
      return;
    }
    setProfile(profile);
    toast(`Welcome, ${name.split(" ")[0]} ✌️`, "Building your quest map now.");
    onDone();
  }

  const onEnter = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fn();
    }
  };

  /* ---------- Welcome ---------- */
  if (step === "welcome") {
    return <Landing onStart={() => go("goal")} onDemo={tryDemo} onCancel={onCancel} />;
  }

  /* ---------- Focused steps ---------- */
  const progress = ((idx + 1) / FLOW.length) * 100;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pb-16 pt-6 sm:px-6">
      {/* Top bar: back, progress, background-scan status */}
      <div className="sticky top-0 z-10 pb-3 pt-2 before:pointer-events-none before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:border-b before:border-hairline before:bg-bg/90 before:backdrop-blur-md before:content-['']">
        <div className="flex items-center gap-3">
          <button className="grid h-10 w-10 place-items-center rounded-xl text-muted transition-colors hover:bg-ink/5 hover:text-text" onClick={back} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.07]" role="progressbar" aria-valuenow={idx + 1} aria-valuemin={1} aria-valuemax={FLOW.length}>
            <div className="xp-fill h-full rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <span className="w-10 text-right text-[12.5px] font-medium text-faint">{idx + 1}/{FLOW.length}</span>
        </div>
        {step !== "docs" && step !== "confirm" && <div className="mt-3 flex justify-center">{ranScan && <ScanPill scan={scan} files={files.length} />}</div>}
      </div>

      <div className="flex flex-1 flex-col justify-center py-8" key={step}>
        {step === "goal" && (
          <Question eyebrow="Step 1 · Your main quest" title="What are you going for?" sub="Pick the closest one. You can change it any time.">
            <div className="mb-5 inline-flex rounded-2xl border border-hairline-2 bg-surface p-1" role="radiogroup" aria-label="I'm a">
              <span className="self-center px-3 text-[13px] font-medium text-muted">I&apos;m a</span>
              {LEVELS.map((l) => (
                <button
                  key={l}
                  role="radio"
                  aria-checked={level === l}
                  onClick={() => {
                    setLevel(l);
                    setGoal("");
                    setTags([]);
                    setBasics((b) => ({ ...b, year: l === "Undergrad" ? (/^(master|phd)/i.test(b.year) ? "" : b.year) : l }));
                  }}
                  className={`h-10 rounded-xl px-4 text-[14px] font-semibold transition-colors ${level === l ? "bg-cardinal text-white shadow-[0_6px_16px_-8px_rgba(153,0,0,.7)]" : "text-muted hover:text-text"}`}
                >
                  {l === "Master's" ? "Master's student" : l === "PhD" ? "PhD student" : "Undergrad"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {GOALS.filter((x) => x.levels.includes(level)).sort((a, b) => a.levels.length - b.levels.length).map(({ label, goal: g, tags: t, Icon }, i) => {
                const on = goal === g && !customGoal;
                return (
                  <button
                    key={label}
                    onClick={() => { setGoal(g); setTags(t); setCustomGoal(false); autoAdvance("docs"); }}
                    className={`rise card group flex items-center gap-3.5 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cardinal/40 ${on ? "!border-cardinal ring-4 ring-cardinal/10" : ""}`}
                    style={{ ["--i" as string]: i }}
                  >
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-colors ${on ? "bg-cardinal text-gold-bright" : "bg-surface-2 text-cardinal group-hover:bg-[#ffe1e5]"}`}>
                      <Icon size={22} weight={on ? "fill" : "duotone"} />
                    </span>
                    <span className="text-[15px] font-semibold leading-snug">{label}</span>
                  </button>
                );
              })}
            </div>
            {!customGoal ? (
              <button className="mt-4 text-[14px] font-medium text-cardinal hover:underline" onClick={() => { setCustomGoal(true); setGoal(""); setTags([]); }}>
                Something else? Type it
              </button>
            ) : (
              <div className="rise mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  className="field"
                  autoFocus
                  placeholder="e.g. Get a product design internship"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={onEnter(() => goal.trim() && next())}
                />
                <button className="btn btn-primary shrink-0" disabled={!goal.trim()} onClick={next}>Continue <ArrowRight size={16} weight="bold" /></button>
              </div>
            )}
            {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
          </Question>
        )}

        {step === "docs" && (
          <Question
            eyebrow="Step 2 · Skip the forms"
            title="Bring your stuff. I'll do the rest."
            sub="Each source replaces questions I'd otherwise ask. I read everything in the background while you keep going."
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => input.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
              className={`group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-9 text-center transition-all duration-200 ${drag ? "scale-[1.01] border-cardinal bg-[#fff1f3]" : files.length ? "border-good/50 bg-mint/40" : "border-hairline-2 bg-surface hover:border-cardinal/50 hover:bg-[#fffafa]"}`}
            >
              {files.length ? (
                <>
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-good"><CheckCircle size={26} weight="fill" /></span>
                  <p className="mt-3 text-[16px] font-semibold">{files.length} file{files.length > 1 ? "s" : ""} added{scan.state === "scanning" ? ", reading now…" : scan.state === "done" ? ", read ✓" : ""}</p>
                  <p className="mt-1 text-[13px] text-muted">Drop more anytime: transcript, STARS report, screenshots</p>
                </>
              ) : (
                <>
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#b5121b] to-cardinal-deep text-gold-bright shadow-[0_12px_30px_-10px_rgba(153,0,0,.7)] transition-transform duration-200 group-hover:-translate-y-1">
                    <UploadSimple size={26} weight="bold" />
                  </span>
                  <p className="mt-4 text-[17px] font-semibold">Drop your resume, transcript or STARS report</p>
                  <p className="mt-1 text-[13px] text-faint">PDFs or screenshots · your LinkedIn export ZIP works here too</p>
                </>
              )}
              <input ref={input} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.zip" className="hidden" onChange={(e) => addFiles(e.target.files)} />
            </div>

            {files.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <li key={i} className="flex h-9 items-center gap-2 rounded-xl border border-hairline-2 bg-surface pl-2.5 pr-3 text-[13px]">
                    <FilePdf size={16} className="text-cardinal" />
                    <span className="max-w-[200px] truncate">{f.name}</span>
                  </li>
                ))}
              </ul>
            )}

            <p className="mb-2.5 mt-6 text-[13px] font-semibold text-muted">Connect more for a sharper plan</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className={`card p-4 ${linkedin ? "!border-good/50" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky text-[#0a66c2]"><LinkedinLogo size={22} weight="fill" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold">LinkedIn export</p>
                    <p className="truncate text-[12.5px] text-muted">{linkedin ? `${linkedin.connectionsTotal} connections · ${linkedin.network.length} companies` : "Your network, history and skills"}</p>
                  </div>
                  {linkedin ? <CheckCircle size={22} weight="fill" className="shrink-0 text-good" /> : (
                    <button className="btn btn-secondary btn-sm shrink-0" onClick={() => liInput.current?.click()} disabled={liBusy}>
                      {liBusy ? <CircleNotch size={14} className="spin" /> : <FileZip size={15} />} ZIP
                    </button>
                  )}
                  <input ref={liInput} type="file" accept=".zip" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const li = await importLinkedIn(f); runScan({ li }); } }} />
                </div>
                {linkedin ? (
                  <p className="mt-2 text-[12px] text-faint">Read on your device. Connection names never leave it.</p>
                ) : (
                  <details className="mt-2 text-[12.5px] text-muted">
                    <summary className="cursor-pointer font-medium text-cardinal">How do I get it?</summary>
                    <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
                      <li>LinkedIn → Me → Settings &amp; Privacy → Data privacy</li>
                      <li>Get a copy of your data → pick Connections, Profile, Positions, Education, Skills</li>
                      <li>Request archive. The ZIP arrives by email in ~10 minutes</li>
                    </ol>
                  </details>
                )}
              </div>

              <div className={`card p-4 ${github.trim() && scan.state === "done" ? "!border-good/50" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-text"><GithubLogo size={22} weight="fill" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold">GitHub</p>
                    <input className="w-full bg-transparent text-[13px] text-muted outline-none placeholder:text-faint focus-visible:outline-none" placeholder="username" value={github} onChange={(e) => setGithub(e.target.value)} onKeyDown={onEnter(continueFromDocs)} />
                  </div>
                </div>
              </div>

              <div className={`card p-4 ${website.trim() && scan.state === "done" ? "!border-good/50" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lilac text-[#5b3aa8]"><Globe size={22} weight="fill" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold">Portfolio or website</p>
                    <input className="w-full bg-transparent text-[13px] text-muted outline-none placeholder:text-faint focus-visible:outline-none" placeholder="yourname.dev" value={website} onChange={(e) => setWebsite(e.target.value)} onKeyDown={onEnter(continueFromDocs)} />
                  </div>
                </div>
              </div>

              <div className={`card p-4 ${cal.status === "connected" || cal.status === "demo" ? "!border-good/50" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-butter text-[#8a5a00]"><CalendarCheck size={22} weight="fill" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold">Google Calendar</p>
                    <p className="truncate text-[12.5px] text-muted">{cal.status === "connected" ? "Connected" : cal.status === "demo" ? "Sample week loaded" : "Your classes and free time"}</p>
                  </div>
                  {cal.status === "connected" || cal.status === "demo" ? <CheckCircle size={22} weight="fill" className="shrink-0 text-good" /> : (
                    <button className="btn btn-secondary btn-sm shrink-0" onClick={cal.connect} disabled={cal.status === "connecting"}>Connect</button>
                  )}
                </div>
              </div>
            </div>

            {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button className="btn btn-primary h-12 px-6" onClick={continueFromDocs}>
                {files.length || github.trim() || website.trim() || linkedin ? "Continue" : "Skip for now"} <ArrowRight size={16} weight="bold" />
              </button>
              <span className="text-[13px] text-faint">
                {[files.length > 0, !!linkedin, !!github.trim(), !!website.trim(), cal.status === "connected" || cal.status === "demo"].filter(Boolean).length} of 5 sources added
              </span>
            </div>
          </Question>
        )}

        {step === "when" && (
          <Question eyebrow="Step 3 · Timeline" title="By when?" sub="So I know how hard to push this week.">
            <div className="grid grid-cols-2 gap-2.5">
              {WHEN.map((w, i) => {
                const on = timeline === w.value;
                return (
                  <button
                    key={w.value}
                    onClick={() => { setTimeline(w.value); autoAdvance("questions"); }}
                    className={`rise card flex flex-col items-start gap-3 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cardinal/40 ${on ? "!border-cardinal ring-4 ring-cardinal/10" : ""}`}
                    style={{ ["--i" as string]: i }}
                  >
                    <span className="text-[26px] leading-none">{w.emoji}</span>
                    <span className="text-[15px] font-semibold">{w.label}</span>
                  </button>
                );
              })}
            </div>
          </Question>
        )}

        {step === "questions" && (
          <Question eyebrow="Step 4 · Quick questions" title="A few things documents can't tell me" sub="Tap your answers and skip any you like. This replaces the long questionnaire.">
            {!questions ? (
              <Card className="p-6" as="div">
                <AiWorking title="Tailoring questions to what I found" steps={["Reviewing what your sources covered", "Finding the gaps that change your plan", "Writing your questions"]} />
              </Card>
            ) : (
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={q.id} className="rise card p-5" style={{ ["--i" as string]: i }}>
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${answers[q.id]?.length ? "bg-good text-white" : "bg-surface-2 text-muted"}`}>
                        {answers[q.id]?.length ? "✓" : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[16px] font-semibold leading-snug">{q.question}</p>
                        <p className="mt-1 text-[13px] text-muted">{q.why}</p>
                        {q.kind === "text" || !q.options.length ? (
                          <input className="field mt-3" value={answers[q.id]?.[0] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value ? [e.target.value] : [] }))} />
                        ) : (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {q.options.map((o) => {
                              const on = answers[q.id]?.includes(o) ?? false;
                              return (
                                <button
                                  key={o}
                                  aria-pressed={on}
                                  onClick={() => setAnswers((a) => {
                                    const cur = a[q.id] ?? [];
                                    return { ...a, [q.id]: q.kind === "multi" ? (on ? cur.filter((x) => x !== o) : [...cur, o]) : on ? [] : [o] };
                                  })}
                                  className={`h-10 rounded-xl border px-3.5 text-[14px] font-medium transition-all duration-150 ${on ? "border-cardinal bg-cardinal text-white shadow-[0_6px_16px_-8px_rgba(153,0,0,.7)]" : "border-hairline-2 bg-surface hover:border-cardinal/40"}`}
                                >
                                  {on && "✓ "}{o}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {q.kind === "multi" && <p className="mt-2 text-[12px] text-faint">Pick any</p>}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rise card p-5" style={{ ["--i" as string]: questions.length }}>
                  <p className="text-[16px] font-semibold">Anything else that matters?</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {PREFS.map((p) => {
                      const on = prefs.includes(p);
                      return (
                        <button key={p} aria-pressed={on} onClick={() => setPrefs((x) => (on ? x.filter((y) => y !== p) : [...x, p]))}
                          className={`h-10 rounded-xl border px-3.5 text-[14px] font-medium transition-all duration-150 ${on ? "border-cardinal bg-cardinal text-white" : "border-hairline-2 bg-surface hover:border-cardinal/40"}`}>
                          {on && "✓ "}{p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button className="btn btn-primary h-12 px-6" onClick={next} disabled={!questions}>Continue <ArrowRight size={16} weight="bold" /></button>
              {questions && <span className="text-[13px] text-faint">{questions.filter((q) => answers[q.id]?.length).length} of {questions.length} answered</span>}
            </div>
          </Question>
        )}

        {step === "confirm" && (
          <div className="rise">
            <p className="eyebrow">Last step · Meet your character</p>
            <h1 className="mt-2 text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[40px]">
              {scan.state === "scanning" ? "Almost there…" : "Here's you. Look right?"}
            </h1>
            <p className="mt-2 text-[15px] text-muted">Tap anything to fix it.</p>

            <Card className="mt-6 overflow-hidden p-0" as="div">
              <div className="hero-cardinal relative flex items-center gap-4 rounded-none px-5 py-5 sm:px-6">
                <Avatar name={basics.name || "Trojan"} size={60} />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-gold-bright">MAIN QUEST</p>
                  <p className="truncate text-[17px] font-semibold">{goal || "No goal yet"}</p>
                  <p className="text-[13px] text-white/75">{timeline || "No date"}{prefs.length ? ` · ${prefs.slice(0, 2).join(", ")}${prefs.length > 2 ? "…" : ""}` : ""}</p>
                </div>
                <button className="ml-auto shrink-0 rounded-lg px-2 py-1 text-[13px] font-medium text-gold-bright hover:bg-white/10" onClick={() => go("goal")}>Edit</button>
              </div>

              <div className="p-5 sm:p-6">
                {scan.state === "scanning" ? (
                  <div className="mb-4 flex items-center gap-3 rounded-2xl bg-surface-2 p-4 text-[14px]">
                    <CircleNotch size={20} className="spin text-cardinal" /> Finishing reading your documents. Your details will fill in automatically.
                  </div>
                ) : null}

                <div className="space-y-5">
                  <InlineField label="Name" big value={basics.name} onChange={(v) => setBasics((b) => ({ ...b, name: v }))} placeholder="Your name" />
                  <div className="grid gap-5 sm:grid-cols-[1.25fr_1fr]">
                    <InlineField label="Major" value={basics.major} onChange={(v) => setBasics((b) => ({ ...b, major: v }))} placeholder="Start typing your major" list="usc-majors" />
                    <GradPicker value={basics.gradTerm} onChange={(v) => setBasics((b) => ({ ...b, gradTerm: v }))} />
                  </div>
                  <datalist id="usc-majors">{MAJORS.map((m) => <option key={m} value={m} />)}</datalist>
                  <div>
                    <span className="text-[12px] font-medium text-faint">Year</span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {YEARS.map((y) => (
                        <button
                          key={y}
                          onClick={() => setBasics((b) => ({ ...b, year: y }))}
                          aria-pressed={basics.year === y}
                          className={`h-9 rounded-xl border px-3.5 text-[13.5px] font-medium transition-colors ${basics.year === y ? "border-cardinal bg-cardinal text-white" : "border-hairline-2 hover:border-cardinal/40"}`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                  {basics.major && (
                    <p className="text-[13px] text-muted">School: <span className="font-medium text-text">{scan.result?.profile.school || schoolFor(basics.major)}</span></p>
                  )}
                </div>

                {scan.state === "done" && scan.result && (
                  <div className="mt-6 rounded-2xl bg-surface-2 p-4">
                    <div className="flex flex-wrap gap-1.5">
                      <Chip tone="sky">{scan.result.profile.courses.length} courses</Chip>
                      <Chip tone="green">{buildProfile().skills.length} skills</Chip>
                      {linkedin && <Chip tone="lilac">{linkedin.connectionsTotal} connections</Chip>}
                      <Chip tone="warn">{scan.result.profile.projects.length} projects</Chip>
                      <Chip tone="lilac">{scan.result.profile.experience.length} roles</Chip>
                      {scan.result.profile.gpa ? <Chip tone="gold">GPA {scan.result.profile.gpa.toFixed(2)}</Chip> : null}
                    </div>
                    <button className="mt-3 flex items-center gap-1 text-[13px] font-medium text-muted hover:text-text" onClick={() => setShowFound((s) => !s)} aria-expanded={showFound}>
                      What I pulled from your docs <CaretDown size={13} className={`transition-transform ${showFound ? "rotate-180" : ""}`} />
                    </button>
                    {showFound && (
                      <ul className="rise mt-2 space-y-1.5">
                        {scan.result.found.map((f) => (
                          <li key={f} className="flex gap-2 text-[13.5px]"><CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-good" />{f}</li>
                        ))}
                      </ul>
                    )}
                    {scan.result.mode === "demo" && <p className="mt-2 text-[12px] text-faint">Demo mode: sample profile.</p>}
                  </div>
                )}
                {scan.state === "error" && <div className="mt-4"><ErrorNote>{scan.error} Fill in the basics above and keep going.</ErrorNote></div>}
                {scan.state === "idle" && (
                  <p className="mt-6 text-[13px] text-muted">
                    No documents yet. <button className="font-medium text-cardinal hover:underline" onClick={() => go("docs")}>Add your resume</button> for a sharper plan, or keep going.
                  </p>
                )}
              </div>
            </Card>

            {(() => {
              const c = completeness(buildProfile(), cal.status !== "off");
              return (
                <Card className="mt-4 p-5 sm:p-6" as="div">
                  <div className="flex items-center gap-4">
                    <LevelRing progress={c.overall / 100} rank={`${c.overall}`} level={0} size={64} />
                    <div>
                      <p className="text-[16px] font-semibold">Profile {c.overall}% complete</p>
                      <p className="text-[13px] text-muted">The more I know, the sharper your plan. You can add more any time.</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
                    {c.sections.map((sec) => (
                      <div key={sec.key}>
                        <div className="flex justify-between text-[13px]"><span className="font-medium">{sec.label}</span><span className="game text-muted">{sec.pct}%</span></div>
                        <Bar value={sec.pct} thin className="mt-1" />
                        {sec.pct < 60 && (
                          <button className="mt-1 text-left text-[12px] font-medium text-cardinal hover:underline" onClick={() => go(sec.key === "direction" || sec.key === "constraints" ? "questions" : "docs")}>
                            + {sec.hint}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })()}

            {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
            <button className="btn btn-gold mt-6 h-14 w-full text-[16px]" onClick={finish} disabled={scan.state === "scanning"}>
              {scan.state === "scanning" ? <><CircleNotch size={18} className="spin" /> Reading your docs…</> : <>Start my arc <ArrowRight size={18} weight="bold" /></>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
