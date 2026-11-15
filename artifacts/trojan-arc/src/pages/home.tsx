"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarBlank, Crosshair, SignOut, House, IdentificationCard, MapTrifold, Sparkle, UsersThree } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { useCalendar } from "@/lib/calendar";
import { levelFromXp, rankFor } from "@/lib/game";
import Onboarding from "@/components/Onboarding";
import Today from "@/components/Today";
import QuestMap from "@/components/QuestMap";
import Radar from "@/components/Radar";
import Week from "@/components/Week";
import Network from "@/components/Network";
import Character from "@/components/Character";
import { LevelRing, RankBadge } from "@/components/viz";

const TABS = [
  { id: "today", label: "Today", Icon: House },
  { id: "quests", label: "Quest map", Icon: MapTrifold },
  { id: "week", label: "Week", Icon: CalendarBlank },
  { id: "radar", label: "Radar", Icon: Crosshair },
  { id: "network", label: "Network", Icon: UsersThree },
  { id: "character", label: "Character", Icon: IdentificationCard },
] as const;

function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor={light ? "#ffffff" : "#990000"} />
            <stop offset="60%" stopColor={light ? "#ffe680" : "#c41e3a"} />
            <stop offset="100%" stopColor="#ffcc00" />
          </linearGradient>
        </defs>
        <path d="M4 26 C 8 10, 22 4, 28 6" fill="none" stroke="url(#lg)" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="28" cy="6" r="3" fill="#ffcc00" />
        <circle cx="4" cy="26" r="2.4" fill={light ? "#ffffff" : "#990000"} />
      </svg>
      <span className={`text-[17px] font-bold tracking-[-0.02em] ${light ? "text-white" : "text-cardinal-deep"}`} style={{ fontFamily: "var(--font-lexend)" }}>
        Trojan <span className={light ? "text-gold-bright" : "text-gold"}>Arc</span>
      </span>
    </span>
  );
}

export default function Home() {
  const { ready, profile, xp, toasts, reset } = useStore();
  const cal = useCalendar();
  const [confirmOut, setConfirmOut] = useState(false);
  const signOut = () => {
    if (cal.status !== "off") cal.disconnect();
    reset();
    setConfirmOut(false);
    setTab("today");
  };
  const [tab, setTab] = useState<string>("today");
  const [live, setLive] = useState<boolean | null>(null);
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null);

  const lv = levelFromXp(xp);
  const rank = rankFor(lv.level);
  const prevLevel = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((d) => setLive(d.live)).catch(() => setLive(false));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (prevLevel.current !== null && lv.level > prevLevel.current) {
      setLevelUp({ from: prevLevel.current, to: lv.level });
      const t = setTimeout(() => setLevelUp(null), 2600);
      prevLevel.current = lv.level;
      return () => clearTimeout(t);
    }
    prevLevel.current = lv.level;
  }, [lv.level, ready]);

  const go = (t: string) => {
    setTab(t);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!ready) return null;

  const overlays = (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.slice(-2).map((t) => (
          <div key={t.id} className="toast card flex w-full max-w-sm items-start gap-3 px-4 py-3">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cardinal-deep text-gold-bright">
              <Sparkle size={16} weight="fill" />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold">{t.title}</p>
              {t.body && <p className="truncate text-[13px] text-muted">{t.body}</p>}
            </div>
          </div>
        ))}
      </div>
      {levelUp && (
        <button
          className="lu-bg fixed inset-0 z-[60] grid place-items-center backdrop-blur-sm" style={{ background: "radial-gradient(circle at 50% 45%, rgba(153,0,0,.92), rgba(80,0,0,.94) 70%)" }}
          onClick={() => setLevelUp(null)}
          aria-label="Dismiss level up"
        >
          <div className="relative grid place-items-center">
            <div className="lu-burst absolute h-[420px] w-[420px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,204,0,.6), rgba(255,204,0,.15) 45%, transparent 70%)" }} />
            <div className="relative text-center">
              {rankFor(levelUp.to).id !== rankFor(levelUp.from).id ? (
                <>
                  <div className="rise mx-auto w-fit"><RankBadge rank={rankFor(levelUp.to)} size={132} /></div>
                  <p className="rise mt-5 text-[13px] font-semibold tracking-[0.3em] text-gold-bright/80" style={{ animationDelay: "120ms" }}>RANK UP</p>
                  <p className="rise mt-2 text-4xl font-bold text-white sm:text-6xl" style={{ animationDelay: "200ms" }}>
                    You&apos;re now a <span className="text-gold-bright">{rankFor(levelUp.to).name}</span>
                  </p>
                  <p className="rise mt-3 text-lg text-white/80" style={{ animationDelay: "280ms" }}>{rankFor(levelUp.to).line} ⚔️</p>
                </>
              ) : (
                <>
                  <p className="lu-text text-[13px] font-semibold tracking-[0.3em] text-gold-bright/80">FIGHT ON ✌️</p>
                  <p className="lu-text game mt-2 text-5xl font-bold text-gold-bright sm:text-7xl" style={{ textShadow: "0 0 40px rgba(255,204,0,.55)" }}>LEVEL UP</p>
                  <p className="lu-text mt-4 text-lg text-white" style={{ animationDelay: "180ms" }}>
                    Level {levelUp.from} <span className="text-white/50">→</span> <span className="game font-bold text-gold-bright">{levelUp.to}</span>
                    <span className="text-white/70"> · {rankFor(levelUp.to).name}</span>
                  </p>
                </>
              )}
            </div>
          </div>
        </button>
      )}
    </>
  );

  if (!profile) {
    return (
      <main className="relative z-10">
        {overlays}
        <Onboarding onDone={() => go("quests")} />
      </main>
    );
  }

  const first = profile.name.split(" ")[0] || "Trojan";

  return (
    <div className="relative z-10 min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      {overlays}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-surface-3 focus:px-3 focus:py-2">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-hidden px-4 py-5 text-white lg:flex" style={{ background: "linear-gradient(170deg, #a50a0a 0%, #990000 45%, #700000 100%)" }}>
        <div className="pointer-events-none absolute -right-16 top-24 h-56 w-56 rounded-full bg-gold-bright/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[3px] bg-gradient-to-b from-gold-bright via-gold-bright/60 to-gold-bright/0" aria-hidden />
        <button onClick={() => go("today")} className="relative px-2"><Logo light /></button>

        <button onClick={() => go("character")} className="relative mt-6 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 text-left transition-colors hover:bg-white/15">
          <LevelRing progress={lv.progress} rank={String(lv.level)} level={lv.level} size={56} onDark />
          <div className="min-w-0">
            <p className="truncate font-semibold">{first}</p>
            <p className="truncate text-[12.5px] text-white/70">{profile.major || "Undeclared"}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-white/70"><RankBadge rank={rank} size={16} /><span className="font-semibold text-gold-bright">{rank.name}</span> · Lv {lv.level}</p>
          </div>
        </button>

        <nav className="relative mt-6 space-y-1" aria-label="Main">
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[14.5px] transition-colors ${active ? "bg-white/15 font-semibold text-white" : "text-white/75 hover:bg-white/[0.08] hover:text-white"}`}
              >
                {active && <span className="absolute left-0 top-2.5 h-6 w-[3px] rounded-r bg-gold-bright" />}
                <Icon size={20} weight={active ? "fill" : "regular"} className={active ? "text-gold-bright" : ""} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="relative mt-auto space-y-3 px-1">
          <p className="text-[13px] font-semibold text-gold-bright">Fight On ✌️</p>
          <div className="flex items-center gap-2 text-[12px] text-white/70">
            <span className={`h-2 w-2 rounded-full ${live ? "bg-[#7dffb0] shadow-[0_0_8px_#7dffb0]" : "bg-white/40"}`} />
            {live === null ? "Connecting" : live ? "Live AI · Claude" : "Demo mode"}
          </div>
          {!confirmOut ? (
            <button onClick={() => setConfirmOut(true)} className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2 text-[14px] text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white">
              <SignOut size={18} /> Sign out
            </button>
          ) : (
            <div className="rounded-xl bg-black/20 p-3 text-[12.5px]">
              <p className="text-white/85">Sign out and clear your progress on this device?</p>
              <div className="mt-2 flex gap-2">
                <button onClick={signOut} className="h-8 rounded-lg bg-gold-bright px-3 font-semibold text-cardinal-deep">Sign out</button>
                <button onClick={() => setConfirmOut(false)} className="h-8 rounded-lg px-3 text-white/80 hover:bg-white/10">Cancel</button>
              </div>
            </div>
          )}
          <p className="text-[11.5px] leading-relaxed text-white/55">For Trojans, by Trojans. Never applies or messages anyone for you.</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b-[3px] border-gold-bright px-4 py-2.5 text-white lg:hidden" style={{ background: "linear-gradient(120deg, #a50a0a, #8a0000)" }}>
        <button onClick={() => go("today")}><Logo light /></button>
        <button onClick={() => go("character")} className="flex items-center gap-2" aria-label={`Level ${lv.level}, ${rank.name}`}>
          <RankBadge rank={rank} size={22} />
          <LevelRing progress={lv.progress} rank={String(lv.level)} level={lv.level} size={36} onDark />
        </button>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1120px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-14 lg:pt-10">
        {tab === "today" && <Today go={go} />}
        {tab === "quests" && <QuestMap />}
        {tab === "week" && <Week />}
        {tab === "radar" && <Radar />}
        {tab === "network" && <Network />}
        {tab === "character" && <Character />}
      </main>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-hairline bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Main">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => go(id)} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${active ? "font-semibold text-cardinal-deep" : "text-muted"}`}>
              <Icon size={22} weight={active ? "fill" : "regular"} />
              {label.split(" ")[0]}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
