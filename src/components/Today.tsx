"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Clock, MapPin, Plus, PushPin } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { resourceUrl } from "@/lib/data/resources";
import { useCalendar } from "@/lib/calendar";
import { levelFromXp, rankFor } from "@/lib/game";
import { RankBadge } from "./viz";
import { STORIES } from "@/lib/data/stories";
import { rankStories } from "@/lib/similarity";
import type { Quest } from "@/lib/types";
import { Avatar, Chip } from "./ui";

const daysUntil = (s: string, from: Date) => {
  if (!s) return null;
  const d = new Date(`${s} ${from.getFullYear()}`);
  if (isNaN(d.getTime())) return null;
  if (d.getTime() < from.getTime() - 86400000) d.setFullYear(d.getFullYear() + 1);
  return Math.ceil((d.getTime() - from.getTime()) / 86400000);
};

function QuestRow({ q }: { q: Quest }) {
  const { setQuestStatus } = useStore();
  const done = q.status === "done";
  return (
    <li className="group flex items-center gap-3.5 py-3.5">
      <button
        onClick={() => setQuestStatus(q.id, done ? "open" : "done")}
        aria-label={done ? `Mark "${q.title}" not done` : `Complete "${q.title}"`}
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all duration-200 ${done ? "check-pop border-good bg-good text-white" : "border-hairline-2 text-transparent hover:border-good hover:text-good/60"}`}
      >
        <Check size={13} weight="bold" />
      </button>
      <span className={`min-w-0 flex-1 truncate text-[15px] ${done ? "text-faint line-through" : ""}`}>{q.title}</span>
      <span className="hidden shrink-0 text-[12.5px] text-faint sm:inline">{q.effort}</span>
      <span className="game w-14 shrink-0 text-right text-[13px] font-semibold text-gold">+{q.xp}</span>
    </li>
  );
}

export default function Today({ go }: { go: (tab: string) => void }) {
  const { profile, quests, wins, logWin, radar, xp, setQuestStatus } = useStore();
  const cal = useCalendar();
  const [win, setWin] = useState("");
  const lv = levelFromXp(xp);
  const first = profile?.name.split(" ")[0] || "Trojan";

  const now = useMemo(() => new Date(), []);
  const hour = now.getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const date = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const open = useMemo(() => [...quests.filter((q) => q.status === "active"), ...quests.filter((q) => q.status === "open")], [quests]);
  const next = open[0];
  const rest = open.slice(1, 4);
  const doneCount = quests.filter((q) => q.status === "done").length;

  const worth = useMemo(() => {
    if (!radar) return [];
    return radar.items
      .map((o) => ({ o, f: radar.fits.find((f) => f.id === o.id)!, days: daysUntil(o.deadline, now) }))
      .filter((x) => x.f && x.f.verdict === "strong")
      .sort((a, b) => (a.days ?? 999) - (b.days ?? 999) || b.f.fit - a.f.fit)
      .slice(0, 3);
  }, [radar, now]);

  const mentor = profile ? rankStories(profile, STORIES).find((r) => r.story.openToChat) : undefined;

  const todayEvents = cal.events
    .filter((e) => !e.allDay && new Date(e.start).toDateString() === now.toDateString())
    .sort((a, b) => a.start.localeCompare(b.start));

  const soonest = worth.find((w) => w.days !== null && w.days <= 14);
  const nToday = Math.min(open.length, 4);
  const summary = [
    nToday ? `${nToday} quest${nToday > 1 ? "s" : ""} today` : null,
    soonest ? `1 deadline in ${soonest.days} days` : null,
    todayEvents.length ? `${todayEvents.length} thing${todayEvents.length > 1 ? "s" : ""} on your calendar` : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-[720px] pb-6">
      {/* Greeting */}
      <header className="rise pt-2">
        <p className="text-[13.5px] font-medium text-muted">{date}</p>
        <h1 className="mt-2 text-[40px] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[52px]">
          {greet}, {first}.
        </h1>
        <p className="mt-3 text-[16px] text-muted">{summary.length ? summary.join(" · ") : "Let's set up your plan."}</p>
      </header>

      {/* Up next */}
      <section className="mt-10">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-faint">Up next</h2>
        {next ? (
          <div className="rise card relative overflow-hidden p-6 sm:p-7" style={{ ["--i" as string]: 1 }}>
            <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cardinal to-gold-bright" aria-hidden />
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-[22px] font-semibold leading-snug tracking-[-0.02em] sm:text-[24px]">{next.title}</h3>
              <span className="game shrink-0 rounded-full bg-butter px-2.5 py-1 text-[13px] font-semibold text-[#8a5a00]">+{next.xp} XP</span>
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{next.why}</p>
            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-[14.5px] leading-relaxed">
              <MapPin size={17} weight="fill" className="mt-0.5 shrink-0 text-cardinal" />
              <span><span className="font-semibold">Start here: </span>{next.firstStep}</span>
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button className="btn btn-primary" onClick={() => setQuestStatus(next.id, "done")}>
                <Check size={16} weight="bold" /> Mark done
              </button>
              {next.status !== "active" && (
                <button className="btn btn-quiet" onClick={() => setQuestStatus(next.id, "active")}>
                  <PushPin size={15} /> Pin
                </button>
              )}
              <span className="ml-auto flex items-center gap-3 text-[13px] text-faint">
                <span className="flex items-center gap-1"><Clock size={14} />{next.effort}</span>
                {next.resource && (resourceUrl(next.resource) ? (
                  <a href={resourceUrl(next.resource)} target="_blank" rel="noreferrer" className="hidden truncate font-medium text-cardinal hover:underline sm:inline">{next.resource} ↗</a>
                ) : (
                  <span className="hidden truncate sm:inline">{next.resource}</span>
                ))}
              </span>
            </div>
          </div>
        ) : (
          <div className="rise card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[17px] font-semibold">{quests.length ? "All caught up." : "No plan yet."}</p>
              <p className="mt-1 text-[14.5px] text-muted">{quests.length ? "Nice. Re-plan to get your next set of quests." : "I'll turn your goal into small steps, starting this week."}</p>
            </div>
            <button className="btn btn-primary shrink-0" onClick={() => go("quests")}>
              {quests.length ? "Re-plan" : "Build my plan"} <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        )}
      </section>

      {/* Also today */}
      {rest.length > 0 && (
        <section className="rise mt-10" style={{ ["--i" as string]: 2 }}>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-faint">Also today</h2>
            <button className="text-[13px] font-medium text-muted hover:text-text" onClick={() => go("quests")}>All quests →</button>
          </div>
          <ul className="divide-y divide-hairline">{rest.map((q) => <QuestRow key={q.id} q={q} />)}</ul>
        </section>
      )}

      {/* Worth your time */}
      <section className="rise mt-10" style={{ ["--i" as string]: 3 }}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-faint">Worth your time</h2>
          {radar && <button className="text-[13px] font-medium text-muted hover:text-text" onClick={() => go("radar")}>Radar →</button>}
        </div>
        <ul className="divide-y divide-hairline">
          {worth.map(({ o, f, days }) => (
            <li key={o.id}>
              <button onClick={() => go("radar")} className="flex w-full items-center gap-3.5 py-3.5 text-left">
                <Avatar name={o.org} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{o.title}</span>
                  <span className="block truncate text-[13px] text-muted">{o.org}</span>
                </span>
                {days !== null ? (
                  <Chip tone={days <= 14 ? "red" : "neutral"}>{days <= 0 ? "due today" : `${days}d left`}</Chip>
                ) : (
                  <span className="game text-[15px] font-bold text-good">{f.fit}</span>
                )}
              </button>
            </li>
          ))}
          {!radar && (
            <li>
              <button onClick={() => go("radar")} className="flex w-full items-center gap-3.5 py-3.5 text-left">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-cardinal"><Plus size={18} weight="bold" /></span>
                <span className="flex-1 text-[15px] text-muted">Find internships, research and events that fit you</span>
                <ArrowRight size={16} className="text-faint" />
              </button>
            </li>
          )}
          {mentor && (
            <li>
              <button onClick={() => go("network")} className="flex w-full items-center gap-3.5 py-3.5 text-left">
                <Avatar name={mentor.story.name} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">Talk to {mentor.story.name}</span>
                  <span className="block truncate text-[13px] text-muted">{mentor.story.outcome}</span>
                </span>
                <span className="shrink-0 text-[13px] font-semibold text-good">{mentor.sim.score}% like you</span>
              </button>
            </li>
          )}
        </ul>
      </section>

      {/* Your day */}
      {todayEvents.length > 0 && (
        <section className="rise mt-10" style={{ ["--i" as string]: 4 }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-faint">Your day</h2>
            <button className="text-[13px] font-medium text-muted hover:text-text" onClick={() => go("week")}>Week →</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {todayEvents.map((e) => {
              const past = new Date(e.end) < now;
              const quest = e.kind === "quest";
              return (
                <div key={e.id} className={`shrink-0 rounded-2xl border px-3.5 py-2.5 ${quest ? "border-good/40 bg-mint/50" : "border-hairline bg-surface"} ${past ? "opacity-45" : ""}`}>
                  <p className="text-[12px] font-medium text-faint">{new Date(e.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</p>
                  <p className="max-w-[180px] truncate text-[14px] font-medium">{e.title.replace(/^Quest: /, "⚔ ")}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Progress + log a win */}
      <footer className="rise mt-12 border-t border-hairline pt-6" style={{ ["--i" as string]: 5 }}>
        <div className="flex items-center gap-4">
          <span className="flex shrink-0 items-center gap-1.5 text-[14px] font-semibold"><RankBadge rank={rankFor(lv.level)} size={24} />{rankFor(lv.level).name} <span className="game text-cardinal">LV {lv.level}</span></span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.07]">
            <div className="xp-fill h-full rounded-full" style={{ width: `${Math.max(3, lv.progress * 100)}%` }} />
          </div>
          <span className="shrink-0 text-[13px] text-muted">{lv.toNext} XP to level {lv.level + 1} · {doneCount} cleared</span>
        </div>
        <form
          className="mt-5 flex items-center gap-2 rounded-2xl border border-hairline-2 bg-surface p-1.5 pl-4 focus-within:border-cardinal/40"
          onSubmit={(e) => { e.preventDefault(); if (win.trim()) { logWin(win.trim()); setWin(""); } }}
        >
          <input
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint focus-visible:outline-none"
            placeholder="Log a win: aced a midterm, emailed a professor…"
            value={win}
            onChange={(e) => setWin(e.target.value)}
            aria-label="Log a win"
          />
          <button className="btn btn-primary btn-sm shrink-0" disabled={!win.trim()}>+50 XP</button>
        </form>
        {wins[0] && <p className="mt-2 px-1 text-[12.5px] text-faint">Last win: {wins[0].text}</p>}
      </footer>
    </div>
  );
}
