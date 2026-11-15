"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle, CircleNotch, Info, WarningCircle } from "@phosphor-icons/react";

/** Card with an optional cursor-following spotlight border. */
export function Card({
  children,
  className = "",
  spotlight = false,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  spotlight?: boolean;
  as?: "section" | "div" | "article" | "aside";
}) {
  const ref = useRef<HTMLElement>(null);
  const onMove = spotlight
    ? (e: React.PointerEvent) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
    : undefined;
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- polymorphic ref
    <Tag ref={ref as any} onPointerMove={onMove} className={`card relative ${spotlight ? "spotlight" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="rise mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function SectionTitle({ icon, children, right }: { icon?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]">
        {icon && <span className="text-muted">{icon}</span>}
        {children}
      </h2>
      {right}
    </div>
  );
}

const TONES = {
  neutral: "bg-surface-2 text-muted border-transparent",
  gold: "bg-butter text-[#8a5a00] border-transparent",
  red: "bg-[#ffe1e5] text-cardinal-deep border-transparent",
  green: "bg-mint text-[#16754a] border-transparent",
  warn: "bg-peach text-[#a5520a] border-transparent",
  sky: "bg-sky text-[#2259a8] border-transparent",
  lilac: "bg-lilac text-[#5b3aa8] border-transparent",
} as const;
export type Tone = keyof typeof TONES;

export function Chip({ children, tone = "neutral", icon }: { children: ReactNode; tone?: Tone; icon?: ReactNode }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-lg border px-2 text-[12px] font-medium ${TONES[tone]}`}>
      {icon}
      {children}
    </span>
  );
}

export function Bar({ value, className = "", thin = false }: { value: number; className?: string; thin?: boolean }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-ink/[0.07] ${thin ? "h-1" : "h-1.5"} ${className}`}>
      <div className="xp-fill h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

const AVATAR_HUES = [
  ["#d62f3c", "#7a0f1a"],
  ["#f2c230", "#a1660f"],
  ["#4fa3d1", "#1d4b73"],
  ["#4fd18b", "#1b6b45"],
  ["#b07cf0", "#4b2a7a"],
  ["#f08a4f", "#7a3a14"],
];
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_HUES.length;
  const [a, b] = AVATAR_HUES[h];
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center font-semibold text-white"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        fontSize: size * 0.38,
        background: `linear-gradient(140deg, ${a}, ${b})`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.25), 0 6px 18px -8px ${a}`,
      }}
    >
      {initials || "?"}
    </span>
  );
}

/** Animated count-up for headline numbers. */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{n.toLocaleString()}</>;
}

/** AI-in-progress checklist: steps tick off on a timer while the request runs. */
export function AiWorking({ steps, title = "Working on it" }: { steps: string[]; title?: string }) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDone((d) => Math.min(steps.length - 1, d + 1)), 1100);
    return () => clearInterval(id);
  }, [steps.length]);
  return (
    <div className="rise">
      <p className="mb-4 flex items-center gap-2 text-sm font-medium">
        <CircleNotch size={16} className="spin text-gold" />
        {title}
      </p>
      <ul className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={s} className={`flex items-center gap-2.5 text-[14px] transition-colors duration-300 ${i <= done ? "text-text" : "text-faint"}`}>
            {i < done ? (
              <CheckCircle size={18} weight="fill" className="check-pop shrink-0 text-good" />
            ) : i === done ? (
              <CircleNotch size={18} className="spin shrink-0 text-gold" />
            ) : (
              <span className="mx-[3px] h-3 w-3 shrink-0 rounded-full border border-hairline-2" />
            )}
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-xl ${className}`} />;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-cardinal/30 bg-cardinal/10 px-3.5 py-2.5 text-sm text-cardinal-deep">
      <WarningCircle size={18} className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function ModeNote({ mode, warning }: { mode?: string; warning?: string }) {
  if (mode !== "demo" && !warning) return null;
  return (
    <p className="flex items-center gap-1.5 text-[12px] text-faint">
      <Info size={14} />
      {warning ? `Live AI failed (${warning}), so this is demo output.` : "Demo mode: sample AI output. Add an API key for live results."}
    </p>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-hairline-2 bg-ink/[0.04] text-gold">{icon}</div>
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      <p className="mt-1.5 max-w-sm text-[14.5px] text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
