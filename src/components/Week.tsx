"use client";

import { useMemo, useState } from "react";
import { ArrowsClockwise, CalendarCheck, CalendarPlus, GoogleLogo, Lightning, LockKey, Plus, SignOut, Sparkle } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { deadlineDate, planQuests, useCalendar, type CalEvent } from "@/lib/calendar";
import { Card, Chip, EmptyState, ErrorNote, PageHeader, SectionTitle } from "./ui";

const H0 = 8, H1 = 22, ROW = 46; // grid from 8am to 10pm
const KIND_STYLE: Record<CalEvent["kind"], string> = {
  class: "bg-sky text-[#1d4f96] border-[#b9d6fb]",
  event: "bg-lilac text-[#4e2f99] border-[#d6c6fb]",
  other: "bg-surface-2 text-muted border-hairline-2",
  quest: "bg-mint text-[#13683f] border-[#a9e6c6]",
  deadline: "bg-[#ffe1e5] text-cardinal-deep border-[#ffc2cb]",
};

const fmtTime = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export function ConnectCalendar({ compact = false }: { compact?: boolean }) {
  const cal = useCalendar();
  return (
    <div className={compact ? "" : "flex flex-col items-center px-4 py-10 text-center"}>
      {!compact && (
        <>
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-sky text-[#1d4f96] shadow-[0_10px_30px_-12px_rgba(40,100,200,.5)]">
            <CalendarCheck size={30} weight="duotone" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Bring in your calendar</h2>
          <p className="mt-2 max-w-md text-[15px] text-muted">
            Trojan Arc finds the free gaps in your week and fits your quests and deadlines around your classes.
          </p>
        </>
      )}
      <div className={`flex flex-wrap gap-2.5 ${compact ? "" : "mt-6 justify-center"}`}>
        <button className="btn btn-primary h-12 px-5" onClick={cal.connect} disabled={cal.status === "connecting"}>
          <GoogleLogo size={18} weight="bold" /> {cal.status === "connecting" ? "Connecting…" : "Connect Google Calendar"}
        </button>
        <button className="btn btn-secondary h-12 px-5" onClick={cal.loadSample}>Use a sample week</button>
      </div>
      {!compact && (
        <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-faint">
          <LockKey size={14} /> Reads your events and adds only what you click. Nothing is stored on our servers.
        </p>
      )}
      {cal.error && <div className="mt-4 text-left"><ErrorNote>{cal.error}</ErrorNote></div>}
    </div>
  );
}

export default function Week() {
  const cal = useCalendar();
  const { quests, radar, toast } = useStore();
  const [adding, setAdding] = useState<string | null>(null);

  const days = useMemo(() => {
    const d0 = new Date();
    d0.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => new Date(d0.getTime() + i * 86400000));
  }, []);

  const deadlines = useMemo(() => {
    if (!radar) return [];
    return radar.items
      .filter((o) => o.deadline && radar.fits.find((f) => f.id === o.id)?.verdict !== "skip")
      .map((o) => ({ o, d: deadlineDate(o.deadline)! }))
      .filter((x) => x.d)
      .sort((a, b) => a.d.getTime() - b.d.getTime());
  }, [radar]);

  const plan = useMemo(() => {
    const scheduled = new Set(cal.events.filter((e) => e.title.startsWith("Quest: ")).map((e) => e.title.slice(7)));
    const todo = [...quests.filter((q) => q.status === "active"), ...quests.filter((q) => q.status === "open")].filter((q) => !scheduled.has(q.title)).slice(0, 5);
    return planQuests(todo, cal.events);
  }, [quests, cal.events]);

  async function addQuest(p: (typeof plan)[number]) {
    setAdding(p.quest.id);
    const ok = await cal.addEvent(
      { title: `Quest: ${p.quest.title}`, start: p.start.toISOString(), end: p.end.toISOString(), kind: "quest" },
      `First step: ${p.quest.firstStep}\n\nFrom Trojan Arc (+${p.quest.xp} XP)`,
    );
    setAdding(null);
    if (ok) toast("Added to your calendar", `${p.quest.title} · ${fmtDay(p.start)} ${fmtTime(p.start)}`);
  }
  async function addAll() {
    for (const p of plan) await addQuest(p);
  }
  async function addDeadline(o: { id: string; title: string; org: string }, d: Date) {
    const end = new Date(d.getTime() + 86400000);
    const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}T00:00:00`;
    const ok = await cal.addEvent({ title: `Deadline: ${o.title}`, start: iso(d), end: iso(end), allDay: true, kind: "deadline" }, `${o.org} · via Trojan Arc`);
    if (ok) toast("Deadline added", o.title);
  }

  const header = (
    <PageHeader
      eyebrow="Your week"
      title="Fit your arc around your actual life"
      subtitle="Your classes and plans, with quests slotted into the free gaps and deadlines where you'll see them."
      action={
        cal.status === "connected" || cal.status === "demo" ? (
          <div className="flex items-center gap-2">
            <Chip tone={cal.status === "connected" ? "green" : "neutral"} icon={cal.status === "connected" ? <GoogleLogo size={13} weight="bold" /> : undefined}>
              {cal.status === "connected" ? "Google Calendar" : "sample week"}
            </Chip>
            {cal.status === "connected" && <button className="btn btn-quiet btn-sm" onClick={cal.refresh}><ArrowsClockwise size={15} /></button>}
            <button className="btn btn-quiet btn-sm" onClick={cal.disconnect}><SignOut size={15} /> Disconnect</button>
          </div>
        ) : undefined
      }
    />
  );

  if (cal.status === "off" || cal.status === "connecting") {
    return (
      <div>
        {header}
        <Card className="rise"><ConnectCalendar /></Card>
      </div>
    );
  }

  const timed = cal.events.filter((e) => !e.allDay);
  const busyHours = (d: Date) =>
    timed.filter((e) => sameDay(new Date(e.start), d)).reduce((s, e) => s + (new Date(e.end).getTime() - new Date(e.start).getTime()) / 3600000, 0);

  return (
    <div>
      {header}
      {cal.error && <div className="mb-4"><ErrorNote>{cal.error}</ErrorNote></div>}

      <div className="grid gap-5">
        {/* Week grid */}
        <Card className="rise min-w-0 overflow-hidden p-4 sm:p-5" as="div">
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] gap-x-1.5">
                <div />
                {days.map((d, i) => {
                  const h = busyHours(d);
                  return (
                    <div key={i} className={`rounded-xl px-2 py-2 text-center ${i === 0 ? "bg-[#ffe1e5]" : ""}`}>
                      <p className={`text-[12px] font-semibold ${i === 0 ? "text-cardinal" : "text-muted"}`}>{d.toLocaleDateString(undefined, { weekday: "short" })}</p>
                      <p className="text-[20px] font-semibold leading-tight" style={{ fontFamily: "var(--font-lexend)" }}>{d.getDate()}</p>
                      <div className="mx-auto mt-1 h-1 w-10 overflow-hidden rounded-full bg-ink/[0.07]" title={`${h.toFixed(1)}h busy`}>
                        <div className={`h-full rounded-full ${h > 6 ? "bg-cardinal" : h > 3 ? "bg-warn" : "bg-good"}`} style={{ width: `${Math.min(100, (h / 9) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* All-day row: deadlines */}
              <div className="mt-1.5 grid grid-cols-[48px_repeat(7,minmax(0,1fr))] gap-x-1.5">
                <div className="pt-1 text-right text-[10.5px] text-faint">due</div>
                {days.map((d, i) => {
                  const dl = deadlines.filter((x) => sameDay(x.d, d));
                  const ad = cal.events.filter((e) => e.allDay && sameDay(new Date(e.start), d));
                  return (
                    <div key={i} className="min-h-7 space-y-1">
                      {dl.map(({ o }) => (
                        <div key={o.id} className={`truncate rounded-lg border px-1.5 py-0.5 text-[11px] font-medium ${KIND_STYLE.deadline}`} title={o.title}>⏰ {o.title}</div>
                      ))}
                      {ad.map((e) => (
                        <div key={e.id} className={`truncate rounded-lg border px-1.5 py-0.5 text-[11px] ${KIND_STYLE[e.kind]}`} title={e.title}>{e.title}</div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Timed grid */}
              <div className="relative mt-2 grid grid-cols-[48px_repeat(7,minmax(0,1fr))] gap-x-1.5" style={{ height: (H1 - H0) * ROW }}>
                <div className="relative">
                  {Array.from({ length: H1 - H0 }, (_, i) => (
                    <span key={i} className="absolute right-1 -translate-y-1/2 text-[10.5px] text-faint" style={{ top: i * ROW }}>
                      {i === 0 ? "" : new Date(2000, 0, 1, H0 + i).toLocaleTimeString(undefined, { hour: "numeric" })}
                    </span>
                  ))}
                </div>
                {days.map((d, di) => (
                  <div key={di} className="relative rounded-xl bg-surface-2/60">
                    {Array.from({ length: H1 - H0 }, (_, i) => (
                      <div key={i} className="absolute inset-x-0 border-t border-hairline" style={{ top: i * ROW }} />
                    ))}
                    {di === 0 && (() => {
                      const now = new Date();
                      const t = (now.getHours() + now.getMinutes() / 60 - H0) * ROW;
                      return t > 0 && t < (H1 - H0) * ROW ? (
                        <div className="absolute inset-x-0 z-10 flex items-center" style={{ top: t }}>
                          <span className="-ml-1 h-2 w-2 rounded-full bg-cardinal" />
                          <span className="h-[2px] flex-1 bg-cardinal" />
                        </div>
                      ) : null;
                    })()}
                    {timed
                      .filter((e) => sameDay(new Date(e.start), d))
                      .map((e) => {
                        const s = new Date(e.start), en = new Date(e.end);
                        const top = Math.max(0, (s.getHours() + s.getMinutes() / 60 - H0) * ROW);
                        const h = Math.max(20, ((en.getTime() - s.getTime()) / 3600000) * ROW - 3);
                        return (
                          <div key={e.id} className={`absolute inset-x-1 overflow-hidden rounded-lg border px-1.5 py-1 text-[11px] leading-tight ${KIND_STYLE[e.kind]}`} style={{ top, height: h }} title={`${e.title} · ${fmtTime(s)}`}>
                            <p className="truncate font-semibold">{e.kind === "quest" ? "⚔ " : ""}{e.title.replace(/^Quest: /, "")}</p>
                            {h > 34 && <p className="opacity-75">{fmtTime(s)}</p>}
                          </div>
                        );
                      })}
                    {plan
                      .filter((p) => sameDay(p.start, d))
                      .map((p) => {
                        const top = (p.start.getHours() + p.start.getMinutes() / 60 - H0) * ROW;
                        const h = Math.max(24, ((p.end.getTime() - p.start.getTime()) / 3600000) * ROW - 3);
                        return (
                          <button
                            key={p.quest.id}
                            onClick={() => addQuest(p)}
                            className="absolute inset-x-1 overflow-hidden rounded-lg border-2 border-dashed border-cardinal/50 bg-surface/90 px-1.5 py-1 text-left text-[11px] leading-tight text-cardinal-deep transition-colors hover:bg-[#fff1f3]"
                            style={{ top, height: h }}
                            title={`Suggested: ${p.quest.title}. Click to add.`}
                          >
                            <p className="flex items-center gap-1 font-semibold"><Plus size={11} weight="bold" /> Suggested</p>
                            {h > 34 && <p className="truncate">{p.quest.title}</p>}
                          </button>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted">
            {[["class", "Class"], ["event", "Event"], ["quest", "Quest block"], ["deadline", "Deadline"]].map(([k, l]) => (
              <span key={k} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded border ${KIND_STYLE[k as CalEvent["kind"]]}`} />{l}</span>
            ))}
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border-2 border-dashed border-cardinal/50" />Suggested slot</span>
          </div>
        </Card>

        {/* Side panel */}
        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2">
          <Card className="rise p-5" as="div">
            <SectionTitle icon={<Sparkle size={18} weight="fill" className="text-gold" />}>Suggested quest blocks</SectionTitle>
            {plan.length ? (
              <>
                <p className="-mt-2 mb-3 text-[13px] text-muted">Found in the free gaps of your week, one per day so it stays doable.</p>
                <ul className="space-y-2">
                  {plan.map((p) => (
                    <li key={p.quest.id} className="tile flex items-center gap-3 p-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#ffe1e5] text-center leading-none text-cardinal-deep">
                        <span className="text-[10px] font-semibold uppercase">{p.start.toLocaleDateString(undefined, { weekday: "short" })}</span>
                        <span className="text-[15px] font-bold">{p.start.getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium">{p.quest.title}</p>
                        <p className="text-[12px] text-muted">{fmtTime(p.start)}–{fmtTime(p.end)} · <span className="text-gold">+{p.quest.xp} XP</span></p>
                      </div>
                      <button className="btn btn-secondary btn-sm !px-2.5" onClick={() => addQuest(p)} disabled={adding === p.quest.id} aria-label={`Add ${p.quest.title} to calendar`}>
                        <CalendarPlus size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
                <button className="btn btn-gold mt-3 w-full" onClick={addAll}><Lightning size={16} weight="fill" /> Add all to calendar</button>
              </>
            ) : (
              <EmptyState icon={<CalendarCheck size={24} />} title="All scheduled" body="Every open quest has a block this week, or there are no open quests yet." />
            )}
          </Card>

          <Card className="rise p-5" as="div">
            <SectionTitle icon={<CalendarPlus size={18} />}>Deadlines to save</SectionTitle>
            {deadlines.length ? (
              <ul className="divide-y divide-hairline">
                {deadlines.slice(0, 6).map(({ o, d }) => {
                  const saved = cal.events.some((e) => e.title === `Deadline: ${o.title}`);
                  const left = Math.round((d.getTime() - days[0].getTime()) / 86400000);
                  return (
                    <li key={o.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium">{o.title}</p>
                        <p className="text-[12px] text-muted">{o.deadline} · <span className={left <= 14 ? "font-semibold text-cardinal" : ""}>{left}d left</span></p>
                      </div>
                      {saved ? (
                        <Chip tone="green">saved</Chip>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => addDeadline(o, d)}>Add</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[13.5px] text-muted">Run a Radar sweep to pull in deadlines.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
