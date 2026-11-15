"use client";

import { useId, type ReactNode } from "react";
import { CheckCircle, CircleHalf, Flag, LockSimple, MapPin } from "@phosphor-icons/react";
import type { Opportunity, Requirement, Story } from "@/lib/types";
import { Avatar } from "./ui";
import { RankBadge } from "./viz";
import { RANKS } from "@/lib/game";

/* ---------------- Journey arc: Now → phases → goal flag ---------------- */

const P0 = [40, 250], P1 = [300, 250], P2 = [470, 50], P3 = [760, 50];
function bez(t: number) {
  const u = 1 - t;
  const f = (i: 0 | 1) => u * u * u * P0[i] + 3 * u * u * t * P1[i] + 3 * u * t * t * P2[i] + t * t * t * P3[i];
  return [f(0), f(1)] as const;
}

export function JourneyArc({
  phases,
  progress,
  goalLabel,
}: {
  phases: { title: string; done: number; total: number }[];
  progress: number; // 0-1 overall
  goalLabel: string;
}) {
  const id = useId();
  const W = 800, H = 300;
  const d = `M ${P0} C ${P1} ${P2} ${P3}`;
  const nodeT = phases.map((_, i) => 0.14 + (i / Math.max(1, phases.length - 1 || 1)) * 0.7);
  if (phases.length === 1) nodeT[0] = 0.5;
  const [yx, yy] = bez(Math.max(0, Math.min(1, progress)));
  const pct = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });

  return (
    <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`${id}g`} x1="0" x2="1">
            <stop offset="0%" stopColor="#990000" />
            <stop offset="60%" stopColor="#d62f3c" />
            <stop offset="100%" stopColor="#f2c230" />
          </linearGradient>
          <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(214,47,60,0.18)" />
            <stop offset="100%" stopColor="rgba(214,47,60,0)" />
          </linearGradient>
        </defs>
        {/* horizon grid */}
        {[90, 170, 250].map((y) => <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="rgba(70,35,45,0.05)" strokeDasharray="3 6" />)}
        <path d={`${d} L 760 290 L 40 290 Z`} fill={`url(#${id}f)`} />
        <path d={d} fill="none" stroke="rgba(70,35,45,0.14)" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
        <path
          d={d}
          fill="none"
          stroke={`url(#${id}g)`}
          strokeWidth="5"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${Math.max(0.01, progress)} 1`}
          style={{ transition: "stroke-dasharray 1s cubic-bezier(.22,1,.36,1)", filter: "drop-shadow(0 0 8px rgba(214,47,60,.7))" }}
        />
      </svg>

      {/* Start */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={pct(...bez(0))}>
        <span className="block h-3.5 w-3.5 rounded-full border-2 border-cardinal bg-bg" />
        <span className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap text-[11px] text-faint sm:text-[12px]">Now</span>
      </div>

      {/* Phase milestones */}
      {phases.map((ph, i) => {
        const [x, y] = bez(nodeT[i]);
        const complete = ph.total > 0 && ph.done === ph.total;
        const reached = progress >= nodeT[i] - 0.02;
        return (
          <div key={ph.title} className="absolute -translate-x-1/2 -translate-y-1/2" style={pct(x, y)}>
            <span
              className={`grid h-7 w-7 place-items-center rounded-full border-2 text-[12px] font-semibold sm:h-9 sm:w-9 ${
                complete ? "border-good bg-good text-bg" : reached ? "border-cardinal bg-cardinal/25 text-text" : "border-hairline-2 bg-surface text-muted"
              }`}
            >
              <span className="game">{complete ? "✓" : i + 1}</span>
            </span>
            <span className={`absolute left-1/2 hidden w-28 -translate-x-1/2 text-center sm:block ${i % 2 ? "bottom-11" : "top-11"}`}>
              <span className="block truncate text-[12.5px] font-medium">{ph.title}</span>
              <span className="game text-[11.5px] text-faint">{ph.done}/{ph.total} quests</span>
            </span>
          </div>
        );
      })}

      {/* You marker */}
      <div className="absolute -translate-x-1/2 -translate-y-full" style={{ ...pct(yx, yy), transition: "left 1s cubic-bezier(.22,1,.36,1), top 1s cubic-bezier(.22,1,.36,1)" }}>
        <div className="flex flex-col items-center">
          <span className="rounded-md bg-gold px-1.5 py-0.5 text-[10.5px] font-bold text-[#1a1408] shadow-[0_0_16px_rgba(242,194,48,.6)]">YOU</span>
          <MapPin size={22} weight="fill" className="-mt-0.5 text-gold drop-shadow-[0_0_8px_rgba(242,194,48,.8)]" />
        </div>
      </div>

      {/* Goal flag */}
      <div className="absolute -translate-x-1/2 -translate-y-full" style={pct(...bez(1))}>
        <div className="flex flex-col items-center">
          <span className="mb-1 hidden max-w-[150px] truncate rounded-lg border border-gold/30 bg-gold/10 px-2 py-0.5 text-[11.5px] font-medium text-gold sm:block">{goalLabel}</span>
          <Flag size={28} weight="fill" className="text-gold drop-shadow-[0_0_10px_rgba(242,194,48,.7)]" />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Skill web: goal in the middle, requirements around ---------------- */

const STATUS = {
  have: { Icon: CheckCircle, ring: "border-good/60 bg-good/15 text-good", stroke: "#4fd18b", dash: "0", op: 0.8 },
  partial: { Icon: CircleHalf, ring: "border-warn/60 bg-warn/15 text-warn", stroke: "#f0a43a", dash: "6 5", op: 0.65 },
  missing: { Icon: LockSimple, ring: "border-hairline-2 bg-surface-2 text-faint", stroke: "#a99ea4", dash: "2 6", op: 0.6 },
} as const;

export function SkillWeb({ requirements }: { requirements: Requirement[] }) {
  const S = 420, c = S / 2, R = S * 0.36;
  const pts = requirements.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / requirements.length;
    return [c + Math.cos(a) * R, c + Math.sin(a) * R] as const;
  });
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      <svg viewBox={`0 0 ${S} ${S}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <circle cx={c} cy={c} r={R} fill="none" stroke="rgba(70,35,45,0.06)" />
        <circle cx={c} cy={c} r={R * 0.55} fill="none" stroke="rgba(70,35,45,0.04)" />
        {requirements.map((r, i) => {
          const st = STATUS[r.status];
          return (
            <line key={r.name} x1={c} y1={c} x2={pts[i][0]} y2={pts[i][1]} stroke={st.stroke} strokeOpacity={st.op} strokeWidth={r.status === "have" ? 2.5 : 1.5} strokeDasharray={st.dash}
              style={r.status === "have" ? { filter: "drop-shadow(0 0 6px rgba(79,209,139,.7))" } : undefined} />
          );
        })}
      </svg>
      <div className="absolute left-1/2 top-1/2 grid h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl bg-gradient-to-br from-cardinal to-cardinal-deep shadow-[0_0_40px_-4px_rgba(214,47,60,.8)]">
        <Flag size={30} weight="fill" className="text-gold" />
      </div>
      {requirements.map((r, i) => {
        const st = STATUS[r.status];
        const [x, y] = pts[i];
        return (
          <div key={r.name} className="absolute flex w-[104px] -translate-x-1/2 -translate-y-[18px] flex-col items-center text-center" style={{ left: `${(x / S) * 100}%`, top: `${(y / S) * 100}%` }} title={`${r.name}: ${r.evidence}`}>
            <span className={`grid h-9 w-9 place-items-center rounded-full border-2 bg-bg ${st.ring}`}><st.Icon size={18} weight="fill" /></span>
            <span className="mt-1 line-clamp-2 text-[11px] leading-tight text-muted sm:text-[11.5px]">{r.name}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Trojan constellation ---------------- */

export function Constellation({
  you,
  people,
  onSelect,
}: {
  you: string;
  people: { story: Story; score: number }[];
  onSelect?: (id: string) => void;
}) {
  const S = 520, c = S / 2;
  const placed = people.map((p, i) => {
    const a = -Math.PI / 2 + 0.4 + (i * 2 * Math.PI) / people.length;
    const r = S * (0.19 + (1 - p.score / 100) * 0.26);
    return { ...p, x: c + Math.cos(a) * r, y: c + Math.sin(a) * r };
  });
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      <svg viewBox={`0 0 ${S} ${S}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="const-bg">
            <stop offset="0%" stopColor="rgba(242,194,48,0.10)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <circle cx={c} cy={c} r={S * 0.45} fill="url(#const-bg)" />
        {[0.19 + 0.26 * 0.4, 0.19 + 0.26 * 0.7, 0.465].map((f, i) => (
          <g key={f}>
            <circle cx={c} cy={c} r={S * f} fill="none" stroke="rgba(70,35,45,0.07)" strokeDasharray={i === 2 ? "0" : "3 6"} />
            <text x={c} y={c - S * f - 5} textAnchor="middle" fontSize="10" fill="#a99ea4">{["very like you", "somewhat like you", "different path"][i]}</text>
          </g>
        ))}
        {placed.map((p) => {
          const col = p.score >= 60 ? "#4fd18b" : p.score >= 40 ? "#f0a43a" : "#d62f3c";
          return <line key={p.story.id} x1={c} y1={c} x2={p.x} y2={p.y} stroke={col} strokeOpacity={0.15 + (p.score / 100) * 0.6} strokeWidth={1 + (p.score / 100) * 2} />;
        })}
      </svg>
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <span className="rounded-[20px] p-[3px] shadow-[0_0_30px_rgba(242,194,48,.5)]" style={{ background: "linear-gradient(140deg,#f2c230,#d62f3c)" }}>
          <Avatar name={you} size={56} />
        </span>
        <span className="mt-1.5 rounded-md bg-gold px-1.5 text-[11px] font-bold text-[#1a1408]">YOU</span>
      </div>
      {placed.map((p) => {
        const size = 34 + (p.score / 100) * 14;
        const Tag = onSelect ? "button" : "div";
        return (
          <Tag
            key={p.story.id}
            onClick={onSelect ? () => onSelect(p.story.id) : undefined}
            className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${(p.x / S) * 100}%`, top: `${(p.y / S) * 100}%` }}
            aria-label={onSelect ? `${p.story.name}, ${p.score}% similar` : undefined}
          >
            <span className={`rounded-[14px] transition-transform duration-200 group-hover:scale-110 ${p.score < 40 ? "opacity-70 grayscale-[40%]" : ""}`}>
              <Avatar name={p.story.name} size={size} />
            </span>
            <span className="mt-1 whitespace-nowrap rounded-md bg-bg/80 px-1.5 text-[11.5px] font-medium">
              {p.story.name} <span className={`game ${p.score >= 60 ? "text-good" : p.score >= 40 ? "text-warn" : "text-cardinal"}`}>{p.score}%</span>
            </span>
          </Tag>
        );
      })}
    </div>
  );
}

/* ---------------- Rank ladder ---------------- */

export function RankLadder({ level, levelProgress }: { level: number; levelProgress: number }) {
  const idx = RANKS.reduce((a, x, i) => (level >= x.minLevel ? i : a), 0);
  const cur = RANKS[idx], next = RANKS[idx + 1];
  const within = next ? (level - cur.minLevel + levelProgress) / (next.minLevel - cur.minLevel) : 1;
  const pos = ((idx + Math.min(1, within)) / (RANKS.length - 1)) * 100;
  return (
    <div>
      <div className="relative mx-5 h-[86px]">
        <div className="absolute inset-x-0 top-[22px] h-1.5 rounded-full bg-ink/[0.07]" />
        <div className="xp-fill absolute left-0 top-[22px] h-1.5 rounded-full" style={{ width: `${pos}%` }} />
        {RANKS.map((r, i) => (
          <div key={r.id} className="absolute top-0 -translate-x-1/2" style={{ left: `${(i / (RANKS.length - 1)) * 100}%` }}>
            <div className={i === idx ? "scale-110" : ""}>
              <RankBadge rank={r} size={i === idx ? 46 : 38} label locked={i > idx} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[13px] text-muted">
        {next ? <>You&apos;re a <span className="font-semibold text-text">{cur.name}</span> · reach level {next.minLevel} to become a <span className="font-semibold text-cardinal">{next.name}</span></> : "Legend. Fight on, forever."}
      </p>
    </div>
  );
}

/* ---------------- Deadline timeline ---------------- */

function parseDeadline(s: string, now: Date) {
  const d = new Date(`${s} ${now.getFullYear()}`);
  if (isNaN(d.getTime())) return null;
  if (d.getTime() < now.getTime() - 86400000) d.setFullYear(d.getFullYear() + 1);
  return d;
}

export function DeadlineTimeline({ items, right }: { items: Opportunity[]; right?: ReactNode }) {
  const now = new Date();
  const pts = items
    .map((o) => ({ o, d: o.deadline ? parseDeadline(o.deadline, now) : null }))
    .filter((x): x is { o: Opportunity; d: Date } => !!x.d)
    .sort((a, b) => a.d.getTime() - b.d.getTime())
    .slice(0, 6);
  if (!pts.length) return null;
  const end = new Date(Math.max(pts[pts.length - 1].d.getTime(), now.getTime() + 30 * 86400000) + 7 * 86400000);
  const span = end.getTime() - now.getTime();
  const x = (d: Date) => ((d.getTime() - now.getTime()) / span) * 100;
  const months: Date[] = [];
  for (let m = new Date(now.getFullYear(), now.getMonth() + 1, 1); m < end; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) months.push(m);

  return (
    <div>
      {right}
      <div className="relative mx-2 h-[72px]">
        <div className="absolute inset-x-0 top-1/2 h-px bg-hairline-2" />
        <div className="absolute left-0 top-1/2 h-px w-full bg-gradient-to-r from-cardinal via-cardinal/40 to-transparent" />
        {months.map((m) => (
          <div key={m.toISOString()} className="absolute top-1/2 -translate-x-1/2" style={{ left: `${x(m)}%` }}>
            <span className="block h-2 w-px -translate-y-1 bg-hairline-2" />
            <span className="absolute left-1/2 top-2 -translate-x-1/2 text-[10.5px] uppercase tracking-wider text-faint">{m.toLocaleString(undefined, { month: "short" })}</span>
          </div>
        ))}
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="block h-3 w-3 rounded-full bg-gold shadow-[0_0_10px_#f2c230]" />
        </div>
        {pts.map(({ o, d }) => {
          const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
          const urgent = days <= 14;
          return (
            <span
              key={o.id}
              aria-label={`${o.title}, due ${o.deadline}`}
              title={`${o.title} · ${o.deadline}`}
              className={`absolute top-1/2 block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-bg ${urgent ? "bg-cardinal shadow-[0_0_8px_#d62f3c]" : "bg-muted"}`}
              style={{ left: `${Math.min(97, Math.max(3, x(d)))}%` }}
            />
          );
        })}
      </div>
      <div data-testid="deadline-list" className="grid gap-2 sm:grid-cols-2">
        {pts.map(({ o, d }) => {
          const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
          const urgent = days <= 14;
          return (
            <article
              key={o.id}
              data-testid="deadline-item"
              className="flex min-w-0 items-start gap-3 rounded-xl border border-hairline bg-surface-2/60 p-3"
            >
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-center ${urgent ? "bg-[#ffe1e5] text-cardinal-deep" : "bg-surface-3 text-muted"}`}>
                <span>
                  <span className="block text-[9px] font-semibold uppercase leading-none">{d.toLocaleString(undefined, { month: "short" })}</span>
                  <span className="game block text-[18px] font-bold leading-tight">{d.getDate()}</span>
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <h3 className="break-words text-[13px] font-semibold leading-snug">{o.title}</h3>
                  <span className={`shrink-0 text-[11px] font-semibold ${urgent ? "text-cardinal" : "text-muted"}`}>
                    {days <= 0 ? "Due today" : `${days} days left`}
                  </span>
                </div>
                <p className="mt-1 break-words text-[12px] leading-relaxed text-muted">{o.details || o.org}</p>
                <p className="mt-1 text-[10.5px] font-medium text-faint">{o.org} · {o.deadline}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Opportunity mix ---------------- */

const KIND_COLOR: Record<Opportunity["kind"], string> = {
  internship: "#d62f3c",
  job: "#990000",
  research: "#4fd18b",
  event: "#f2c230",
  club: "#4fa3d1",
  program: "#b07cf0",
};

export function KindMix({ items }: { items: Opportunity[] }) {
  const counts = (Object.keys(KIND_COLOR) as Opportunity["kind"][])
    .map((k) => ({ k, n: items.filter((o) => o.kind === k).length }))
    .filter((x) => x.n > 0);
  const total = items.length || 1;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full">
        {counts.map(({ k, n }) => (
          <div key={k} style={{ width: `${(n / total) * 100}%`, background: KIND_COLOR[k] }} className="first:rounded-l-full last:rounded-r-full" title={`${n} ${k}`} />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        {counts.map(({ k, n }) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: KIND_COLOR[k] }} />
            <span className="game text-text">{n}</span> {k}
          </span>
        ))}
      </div>
    </div>
  );
}
