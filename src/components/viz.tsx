"use client";

import { useId } from "react";
import type { FitResult, Opportunity, Stat } from "@/lib/types";
import type { Rank } from "@/lib/game";
import { Crown, CrownSimple, Shield, ShieldChevron, Sword, Trophy } from "@phosphor-icons/react";

/** Circular level progress with the rank letter in the middle. */
export function LevelRing({ progress, rank, level, size = 72, onDark = false }: { progress: number; rank: string; level: number; size?: number; onDark?: boolean }) {
  const id = useId();
  const stroke = Math.max(3, size * 0.06);
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={`Level ${level}, rank ${rank}`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={onDark ? "#ffcc00" : "#990000"} />
            <stop offset="55%" stopColor={onDark ? "#ffdd55" : "#c41e3a"} />
            <stop offset="100%" stopColor={onDark ? "#fff3c4" : "#ffcc00"} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill={onDark ? "rgba(0,0,0,0.12)" : "none"} stroke={onDark ? "rgba(255,255,255,0.2)" : "rgba(70,35,45,0.08)"} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0.02, progress) * c} ${c}`}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(.22,1,.36,1)", filter: onDark ? "drop-shadow(0 0 6px rgba(255,204,0,.7))" : "drop-shadow(0 0 6px rgba(153,0,0,.45))" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className={`game font-bold leading-none ${onDark ? "text-gold-bright" : "text-cardinal-deep"}`} style={{ fontSize: size * 0.36 }}>{rank}</span>
      </div>
    </div>
  );
}

const STAT_AXES: { key: Stat; label: string }[] = [
  { key: "academics", label: "Academics" },
  { key: "career", label: "Career" },
  { key: "skills", label: "Skills" },
  { key: "network", label: "Network" },
];

/** Four-axis stat chart (diamond). */
export function StatRadar({ stats, size = 240, onDark = false }: { stats: Record<Stat, number>; size?: number; onDark?: boolean }) {
  const grid = onDark ? "rgba(255,255,255,0.18)" : "rgba(70,35,45,0.08)";
  const gold = onDark ? "#ffcc00" : "#e0a800";
  const id = useId();
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.3;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / STAT_AXES.length;
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v] as const;
  };
  const poly = STAT_AXES.map((ax, i) => pt(i, Math.max(0.06, stats[ax.key] / 100)).join(",")).join(" ");
  return (
    <svg viewBox={`-34 0 ${size + 68} ${size}`} width="100%" style={{ maxWidth: size + 68 }} role="img" aria-label={STAT_AXES.map((a) => `${a.label} ${stats[a.key]}`).join(", ")}>
      <defs>
        <radialGradient id={id}>
          <stop offset="0%" stopColor="#ffcc00" stopOpacity={onDark ? 0.65 : 0.5} />
          <stop offset="100%" stopColor={onDark ? "#ffe680" : "#990000"} stopOpacity={onDark ? 0.35 : 0.3} />
        </radialGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon key={s} points={STAT_AXES.map((_, i) => pt(i, s).join(",")).join(" ")} fill="none" stroke={grid} />
      ))}
      {STAT_AXES.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={grid} />;
      })}
      <polygon points={poly} fill={`url(#${id})`} stroke={gold} strokeWidth="2" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 10px rgba(255,204,0,.45))" }} />
      {STAT_AXES.map((ax, i) => {
        const [x, y] = pt(i, Math.max(0.06, stats[ax.key] / 100));
        return <circle key={ax.key} cx={x} cy={y} r="3.5" fill={gold} />;
      })}
      {STAT_AXES.map((ax, i) => {
        const [x, y] = pt(i, 1.28);
        const anchor = "middle";
        return (
          <g key={ax.key}>
            <text x={x} y={y - 2} textAnchor={anchor} fontSize="11" fill={onDark ? "rgba(255,255,255,0.75)" : "#7d7177"}>{ax.label}</text>
            <text x={x} y={y + 13} textAnchor={anchor} fontSize="13" fontWeight="600" fill={onDark ? "#ffffff" : "#2a2024"} className="game">{stats[ax.key]}</text>
          </g>
        );
      })}
    </svg>
  );
}

const KIND_SECTORS: Record<Opportunity["kind"], [number, number]> = {
  internship: [200, 350],
  job: [200, 350],
  research: [-10, 50],
  event: [55, 105],
  club: [110, 160],
  program: [160, 195],
};

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Radar scope: distance from center = how good the fit is (closer = better). */
export function RadarScope({
  items,
  fits,
  selected,
  onSelect,
  size = 340,
  decorative = false,
}: {
  items: Opportunity[];
  fits: FitResult[];
  selected?: string | null;
  onSelect?: (id: string) => void;
  size?: number;
  decorative?: boolean;
}) {
  const c = size / 2;
  const R = c - 14;
  const byId = new Map(fits.map((f) => [f.id, f]));
  const color = (v: FitResult["verdict"]) => (v === "strong" ? "#4fd18b" : v === "stretch" ? "#f0a43a" : "#a99ea4");
  return (
    <div className="relative mx-auto aspect-square w-full" style={{ maxWidth: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full" role={decorative ? undefined : "img"} aria-hidden={decorative} aria-label={decorative ? undefined : "Opportunity radar: closer to the center means a better fit"}>
        <defs>
          <radialGradient id="scope-bg">
            <stop offset="0%" stopColor="rgba(79,209,139,0.10)" />
            <stop offset="60%" stopColor="rgba(214,47,60,0.05)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <circle cx={c} cy={c} r={R} fill="url(#scope-bg)" stroke="rgba(70,35,45,0.12)" />
        {[0.25, 0.5, 0.75].map((s) => (
          <circle key={s} cx={c} cy={c} r={R * s} fill="none" stroke="rgba(70,35,45,0.07)" strokeDasharray={s === 0.25 ? "0" : "2 4"} />
        ))}
        <line x1={c - R} y1={c} x2={c + R} y2={c} stroke="rgba(70,35,45,0.06)" />
        <line x1={c} y1={c - R} x2={c} y2={c + R} stroke="rgba(70,35,45,0.06)" />
        {!decorative && (
          <>
            <text x={c + 4} y={c - R * 0.25 + 12} fontSize="9.5" fill="#4fd18b" opacity="0.8">STRONG</text>
            <text x={c + 4} y={c - R * 0.5 + 12} fontSize="9.5" fill="#7d7177" opacity="0.7">STRETCH</text>
            <text x={c + 4} y={c - R * 0.75 + 12} fontSize="9.5" fill="#a99ea4">SKIP</text>
          </>
        )}
        {items.map((o) => {
          const f = byId.get(o.id);
          if (!f) return null;
          const [a0, a1] = KIND_SECTORS[o.kind];
          const ang = ((a0 + (hash(o.id + o.title) % 1000) / 1000 * (a1 - a0)) * Math.PI) / 180;
          const dist = R * (0.08 + ((100 - f.fit) / 100) * 0.88);
          const x = c + Math.cos(ang) * dist;
          const y = c + Math.sin(ang) * dist;
          const isSel = selected === o.id;
          const col = color(f.verdict);
          return (
            <g
              key={o.id}
              onClick={onSelect ? () => onSelect(o.id) : undefined}
              style={{ cursor: onSelect ? "pointer" : undefined }}
              tabIndex={onSelect ? 0 : undefined}
              onKeyDown={onSelect ? (e) => (e.key === "Enter" || e.key === " ") && onSelect(o.id) : undefined}
              role={onSelect ? "button" : undefined}
              aria-label={onSelect ? `${o.title}, fit ${f.fit}` : undefined}
            >
              <title>{`${o.title} · ${o.org} · fit ${f.fit}`}</title>
              {f.verdict === "strong" && <circle cx={x} cy={y} r="4" fill={col} className="ping" />}
              <circle cx={x} cy={y} r={isSel ? 7 : f.verdict === "skip" ? 3 : 4.5} fill={col} stroke={isSel ? "#fff" : "none"} strokeWidth="2" style={{ filter: `drop-shadow(0 0 6px ${col})`, transition: "r 200ms ease" }} />
              <circle cx={x} cy={y} r="12" fill="transparent" />
            </g>
          );
        })}
        <circle cx={c} cy={c} r="4" fill="#f2c230" />
      </svg>
      {/* Rotating sweep */}
      <div
        className="sweep pointer-events-none absolute rounded-full"
        style={{
          inset: `${(14 / size) * 100}%`,
          background: "conic-gradient(from 0deg, rgba(79,209,139,0.22), rgba(79,209,139,0) 70deg, transparent 360deg)",
        }}
        aria-hidden
      />
    </div>
  );
}

/* ---------------- Trojan rank badge ---------------- */

const RANK_GLYPH: Record<Rank["id"], typeof Shield> = {
  recruit: Shield,
  squire: ShieldChevron,
  warrior: Sword,
  champion: Trophy,
  hero: CrownSimple,
  legend: Crown,
};

/** Hexagonal badge for a Trojan rank. Legend gets an animated shimmer. */
export function RankBadge({ rank, size = 40, label = false, locked = false }: { rank: Rank; size?: number; label?: boolean; locked?: boolean }) {
  const id = useId();
  const Glyph = RANK_GLYPH[rank.id];
  const hex = "M50 4 L90 27 L90 73 L50 96 L10 73 L10 27 Z";
  return (
    <span className="inline-flex flex-col items-center gap-1" title={rank.name}>
      <span className="relative grid place-items-center" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden style={locked ? { filter: "grayscale(1)", opacity: 0.35 } : { filter: `drop-shadow(0 ${size * 0.06}px ${size * 0.12}px ${rank.colors[1]}66)` }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={rank.colors[0]} />
              <stop offset="100%" stopColor={rank.colors[1]} />
            </linearGradient>
          </defs>
          <path d={hex} fill={`url(#${id})`} />
          <path d="M50 12 L83 31 L83 69 L50 88 L17 69 L17 31 Z" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" />
        </svg>
        {rank.id === "legend" && !locked && <span className="rank-shimmer absolute inset-0" style={{ clipPath: "polygon(50% 4%, 90% 27%, 90% 73%, 50% 96%, 10% 73%, 10% 27%)" }} aria-hidden />}
        <Glyph size={size * 0.42} weight="fill" style={{ color: locked ? "#a2969c" : rank.ink, position: "relative" }} />
      </span>
      {label && <span className={`text-[12px] font-semibold ${locked ? "text-faint" : "text-text"}`}>{rank.name}</span>}
    </span>
  );
}
