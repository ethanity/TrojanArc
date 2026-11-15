"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowSquareOut,
  ArrowsClockwise,
  Books,
  Briefcase,
  Check,
  CheckCircle,
  CircleHalf,
  Clock,
  Code,
  Flag,
  Handshake,
  LockSimple,
  MapPin,
  PushPin,
  Warning,
} from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { resourceUrl } from "@/lib/data/resources";
import type { Quest, Requirement, Stat } from "@/lib/types";
import { AiWorking, Card, Chip, ErrorNote, ModeNote, PageHeader, SectionTitle, Skeleton } from "./ui";
import { LevelRing } from "./viz";
import { JourneyArc, SkillWeb } from "./viz2";

const STAT_ICON: Record<Stat, typeof Books> = { academics: Books, career: Briefcase, skills: Code, network: Handshake };
const STAT_TONE = { academics: "sky", career: "warn", skills: "green", network: "lilac" } as const;

export function useRoadmapGen() {
  const { profile, wins, quests, setRoadmap, toast } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<{ mode?: string; warning?: string }>({});
  const generate = useCallback(async () => {
    if (!profile) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, wins, doneQuests: quests.filter((q) => q.status === "done").map((q) => q.title) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Planning failed");
      setRoadmap(data.roadmap);
      setMeta({ mode: data.mode, warning: data.warning });
      toast("Quest map ready", "Start with this week's quests.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [profile, wins, quests, setRoadmap, toast]);
  return { generate, busy, error, meta };
}

export function QuestCard({ q, compact = false, index = 0 }: { q: Quest; compact?: boolean; index?: number }) {
  const { setQuestStatus } = useStore();
  const done = q.status === "done";
  const active = q.status === "active";
  const Icon = STAT_ICON[q.stat] ?? Code;
  return (
    <div
      className={`rise tile group relative flex gap-3.5 p-4 ${done ? "!bg-good/[0.04]" : active ? "!border-gold/40 !bg-gold/[0.04]" : "tile-hover"}`}
      style={{ ["--i" as string]: index }}
    >
      <button
        onClick={() => setQuestStatus(q.id, done ? "open" : "done")}
        aria-label={done ? `Mark "${q.title}" not done` : `Complete "${q.title}"`}
        className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-all duration-200 ${done ? "check-pop border-good bg-good text-white" : "border-hairline-2 text-transparent hover:border-good hover:text-good/70"}`}
      >
        <Check size={15} weight="bold" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-[15px] font-medium leading-snug ${done ? "text-muted line-through decoration-good/50" : ""}`}>{q.title}</p>
          <span className={`game shrink-0 text-[13px] font-semibold ${done ? "text-good" : "text-gold"}`}>+{q.xp} XP</span>
        </div>
        {!compact && !done && <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{q.why}</p>}
        {!done && (
          <p className="mt-2.5 flex items-start gap-1.5 text-[13.5px] leading-relaxed">
            <MapPin size={15} weight="fill" className="mt-0.5 shrink-0 text-cardinal" />
            <span><span className="text-muted">Start: </span>{q.firstStep}</span>
          </p>
        )}
        {!done && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Chip tone={STAT_TONE[q.stat]} icon={<Icon size={13} weight="bold" />}>{q.stat}</Chip>
            <Chip icon={<Clock size={13} />}>{q.effort}</Chip>
            {q.resource && (resourceUrl(q.resource) ? (
              <a href={resourceUrl(q.resource)} target="_blank" rel="noreferrer" className="transition-opacity hover:opacity-80" title={`Open ${q.resource}`}>
                <Chip tone="gold" icon={<ArrowSquareOut size={12} weight="bold" />}>{q.resource}</Chip>
              </a>
            ) : <Chip tone="gold">{q.resource}</Chip>)}
            {!active ? (
              <button className="btn btn-quiet btn-sm ml-auto !min-h-7 !px-2 text-[12.5px]" onClick={() => setQuestStatus(q.id, "active")}>
                <PushPin size={14} /> Pin to today
              </button>
            ) : (
              <span className="ml-auto flex items-center gap-1 text-[12.5px] text-gold"><PushPin size={14} weight="fill" /> Pinned</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const REQ: Record<Requirement["status"], { Icon: typeof CheckCircle; color: string; label: string }> = {
  have: { Icon: CheckCircle, color: "text-good", label: "Unlocked" },
  partial: { Icon: CircleHalf, color: "text-warn", label: "In progress" },
  missing: { Icon: LockSimple, color: "text-faint", label: "Locked" },
};

export default function QuestMap() {
  const { roadmap, quests, profile } = useStore();
  const { generate, busy, error, meta } = useRoadmapGen();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // React dev mode runs effects twice; plan only once
    started.current = true;
    if (!roadmap && profile) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- generate once on first visit
  }, []);

  if (!roadmap || busy) {
    return (
      <div>
        <PageHeader eyebrow="Quest map" title="Mapping your path" subtitle={profile?.goal} />
        <div className="grid gap-5 md:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="p-6" as="div">
            <AiWorking
              title="Planning with Claude"
              steps={["Breaking your goal into requirements", "Checking your profile for evidence", "Learning from Trojans on similar paths", "Matching USC resources", "Sequencing quests from this week on"]}
            />
            {error && <div className="mt-4"><ErrorNote>{error} <button className="underline" onClick={generate}>Try again</button></ErrorNote></div>}
          </Card>
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <div className="grid grid-cols-2 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    );
  }

  const have = roadmap.requirements.filter((r) => r.status === "have").length;
  const partial = roadmap.requirements.filter((r) => r.status === "partial").length;
  const reqProgress = (have + partial * 0.5) / Math.max(1, roadmap.requirements.length);
  const phaseQuests = (title: string) => quests.filter((q) => q.phase === title);
  const mapQuests = quests.filter((q) => roadmap.phases.some((ph) => ph.title === q.phase));
  const journey = mapQuests.length ? mapQuests.filter((q) => q.status === "done").length / mapQuests.length : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Quest map"
        title={profile?.goal ?? "Your quest map"}
        action={<button className="btn btn-secondary" onClick={generate}><ArrowsClockwise size={16} /> Re-plan with my progress</button>}
      />

      {/* North star */}
      <Card className="rise mb-5 overflow-hidden p-6 sm:p-7">
        <div className="pointer-events-none absolute -left-20 -top-28 h-64 w-64 rounded-full bg-[#bfe0ff]/50 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="eyebrow flex items-center gap-1.5"><Flag size={14} weight="fill" className="text-gold" /> North star</p>
            <p className="mt-3 text-[20px] font-medium leading-snug tracking-[-0.015em] sm:text-[23px]">{roadmap.northStar}</p>
            <div className="mt-3"><ModeNote {...meta} /></div>
          </div>
          <div className="flex items-center gap-4 sm:flex-col sm:gap-2 sm:text-center">
            <LevelRing progress={reqProgress} rank={`${have}/${roadmap.requirements.length}`} level={0} size={92} />
            <p className="text-[13px] text-muted">requirements<br className="hidden sm:block" /> unlocked</p>
          </div>
        </div>
        <div className="relative mt-6 rounded-2xl border border-hairline bg-ink/[0.025] px-3 pb-2 pt-10 sm:px-6">
          <JourneyArc
            phases={roadmap.phases.map((ph) => {
              const qs = phaseQuests(ph.title);
              return { title: ph.title, done: qs.filter((q) => q.status === "done").length, total: qs.length };
            })}
            progress={journey}
            goalLabel={profile?.timeline || "Goal"}
          />
        </div>
      </Card>

      {/* Requirements as a skill tree */}
      <Card className="rise mb-8 p-5 sm:p-6" as="div">
        <SectionTitle right={
          <div className="hidden gap-3 text-[12px] text-muted sm:flex">
            {(["have", "partial", "missing"] as const).map((s) => {
              const { Icon, color, label } = REQ[s];
              return <span key={s} className="flex items-center gap-1"><Icon size={14} weight="fill" className={color} />{label}</span>;
            })}
          </div>
        }>
          What you need
        </SectionTitle>
        <div className="grid items-center gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        <div className="px-6 py-2 sm:px-10"><SkillWeb requirements={roadmap.requirements} /></div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {roadmap.requirements.map((r, i) => {
            const { Icon, color } = REQ[r.status];
            return (
              <div key={r.name} className={`rise tile p-4 ${r.status === "missing" ? "opacity-80" : ""}`} style={{ ["--i" as string]: i }}>
                <div className="flex items-start gap-2.5">
                  <Icon size={20} weight="fill" className={`mt-px shrink-0 ${color}`} />
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-medium leading-snug">{r.name}</p>
                    <p className="mt-1 text-[13px] text-muted">{r.evidence}</p>
                  </div>
                </div>
                <p className="mt-3 border-t border-hairline pt-2.5 text-[12.5px] leading-relaxed text-faint">{r.whyItMatters}</p>
              </div>
            );
          })}
        </div>
        </div>
      </Card>

      {/* The arc: phases along a path */}
      <ol className="relative space-y-8">
        <span className="absolute bottom-6 left-[19px] top-6 w-[2px] rounded-full bg-gradient-to-b from-cardinal via-cardinal/40 to-gold/30" aria-hidden />
        {roadmap.phases.map((ph, i) => {
          const qs = phaseQuests(ph.title);
          const d = qs.filter((q) => q.status === "done").length;
          const complete = qs.length > 0 && d === qs.length;
          return (
            <li key={ph.title} className="relative pl-14">
              <span
                className={`absolute left-0 top-0 grid h-10 w-10 place-items-center rounded-full border-2 text-[14px] font-semibold ${
                  complete ? "border-good bg-good text-white" : i === 0 ? "border-cardinal bg-cardinal/20 text-text shadow-[0_0_20px_rgba(214,47,60,.6)]" : "border-hairline-2 bg-surface text-muted"
                }`}
              >
                {complete ? <Check size={18} weight="bold" /> : <span className="game">{i + 1}</span>}
              </span>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 pt-1.5">
                <div>
                  <h3 className="text-[18px] font-semibold tracking-[-0.015em]">{ph.title}</h3>
                  <p className="text-[14px] text-muted">{ph.focus}</p>
                </div>
                <span className="text-[12.5px] text-faint"><span className="game text-[14px] font-semibold text-text">{d}/{qs.length}</span> done</span>
              </div>
              <div className="grid gap-2.5 xl:grid-cols-2">
                {qs.map((q, j) => <QuestCard key={q.id} q={q} index={j} />)}
              </div>
            </li>
          );
        })}
      </ol>

      <Card className="rise mt-8 p-5 sm:p-6" as="div">
        <SectionTitle icon={<Warning size={18} weight="fill" className="text-warn" />}>Watch out for</SectionTitle>
        <ul className="grid gap-3 md:grid-cols-3">
          {roadmap.watchOuts.map((w) => (
            <li key={w} className="tile p-4 text-[14px] leading-relaxed text-muted">{w}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
