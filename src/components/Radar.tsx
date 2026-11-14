"use client";

import { useState } from "react";
import { ArrowRight, ArrowSquareOut, ArrowsClockwise, Crosshair, Funnel, Star, Warning } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { connectionsAt } from "@/lib/network";
import type { FitResult, Opportunity } from "@/lib/types";
import { AiWorking, Avatar, Card, Chip, CountUp, EmptyState, ErrorNote, ModeNote, PageHeader } from "./ui";
import { RadarScope } from "./viz";
import { DeadlineTimeline, KindMix } from "./viz2";

type Filter = "all" | "strong" | "internship" | "campus" | "saved";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "strong", label: "Strong fits" },
  { id: "internship", label: "Jobs & internships" },
  { id: "campus", label: "On campus" },
  { id: "saved", label: "Saved" },
];

export function useRadarScan() {
  const { profile, setRadar, toast } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<{ mode?: string; warning?: string; liveFeed?: boolean }>({});
  async function scan() {
    if (!profile) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setRadar({ items: data.items, fits: data.fits, scanned: data.scanned, at: new Date().toISOString() });
      setMeta({ mode: data.mode, warning: data.warning, liveFeed: data.liveFeed });
      const strong = (data.fits as FitResult[]).filter((f) => f.verdict === "strong").length;
      toast("Sweep complete", `${strong} verified strong fits for you`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return { scan, busy, error, meta };
}

const VERDICT_TONE = { strong: "green", stretch: "warn", skip: "neutral" } as const;

export function OppCard({ o, f, selected, index = 0 }: { o: Opportunity; f: FitResult; selected?: boolean; index?: number }) {
  const { saved, toggleSaved, profile } = useStore();
  const known = connectionsAt(profile?.network, o.org);
  const isSaved = saved.includes(o.id);
  const live = o.source.includes("live");
  const scoreColor = f.verdict === "strong" ? "text-good" : f.verdict === "stretch" ? "text-warn" : "text-faint";
  return (
    <article
      id={`opp-${o.id}`}
      className={`rise card spotlight scroll-mt-24 p-4 sm:p-5 transition-shadow duration-300 ${f.verdict === "skip" ? "opacity-65" : ""} ${selected ? "!border-gold/60 shadow-[0_0_0_4px_rgba(242,194,48,.12)]" : ""}`}
      style={{ ["--i" as string]: Math.min(index, 8) }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      <div className="flex items-start gap-3.5">
        <Avatar name={o.org} size={42} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold leading-snug">{o.title}</h3>
              <p className="mt-0.5 truncate text-[13px] text-muted">{o.org}{o.location ? ` · ${o.location}` : ""}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className={`game text-2xl font-bold leading-none ${scoreColor}`}>{f.fit}</p>
              <p className="mt-1 text-[11px] text-faint">fit</p>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Chip tone={VERDICT_TONE[f.verdict]}>{f.verdict}</Chip>
            <Chip>{o.kind}</Chip>
            {o.deadline && <Chip tone="red">due {o.deadline}</Chip>}
            {known > 0 && <Chip tone="lilac">🤝 you know {known} here</Chip>}
            <Chip tone={live ? "gold" : "neutral"}>{live ? `live${o.posted ? ` · ${o.posted} ago` : ""}` : "USC sample"}</Chip>
          </div>
        </div>
      </div>
      <p className="mt-3.5 text-[14px] leading-relaxed">{f.reason}</p>
      {f.blocker && (
        <p className="mt-2 flex items-start gap-1.5 text-[13.5px] text-warn"><Warning size={16} weight="fill" className="mt-0.5 shrink-0" />{f.blocker}</p>
      )}
      <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-hairline pt-3.5">
        <p className="flex min-w-0 flex-1 items-start gap-1.5 text-[13.5px]">
          <ArrowRight size={15} weight="bold" className="mt-0.5 shrink-0 text-cardinal" />
          <span>{f.nextAction}</span>
        </p>
        <div className="flex gap-1.5">
          <button className={`btn btn-sm ${isSaved ? "btn-secondary !text-gold" : "btn-quiet"}`} onClick={() => toggleSaved(o.id)} aria-pressed={isSaved}>
            <Star size={15} weight={isSaved ? "fill" : "regular"} /> {isSaved ? "Saved" : "Save"}
          </button>
          {o.url && (
            <a href={o.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Open <ArrowSquareOut size={14} /></a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Radar() {
  const { radar, saved } = useStore();
  const { scan, busy, error, meta } = useRadarScan();
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const header = (
    <PageHeader
      eyebrow="Opportunity radar"
      title="Every opportunity, checked against you"
      subtitle="Live internships plus USC research, clubs and events in one feed. Closer to the center means a better fit."
      action={radar && !busy ? <button className="btn btn-secondary" onClick={scan}><ArrowsClockwise size={16} /> Sweep again</button> : undefined}
    />
  );

  if (!radar || busy) {
    return (
      <div>
        {header}
        <Card className="overflow-hidden p-6 sm:p-8">
          <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_340px]">
            {busy ? (
              <AiWorking
                title="Sweeping"
                steps={["Pulling the live Simplify Summer 2027 list", "Pulling USC research, club and event listings", "Keyword pass: cheap detection", "Claude pass: eligibility and fit for you", "Ranking by what's worth your time"]}
              />
            ) : (
              <EmptyState
                icon={<Crosshair size={26} />}
                title="Run your first sweep"
                body="Detection is cheap; verification is the product. Nothing reaches you until it's been checked for eligibility and fit."
                action={<button className="btn btn-primary h-12 px-6" onClick={scan}><Crosshair size={18} weight="bold" /> Start sweep</button>}
              />
            )}
            <div className={busy ? "" : "opacity-60"}><RadarScope items={[]} fits={[]} size={340} decorative /></div>
          </div>
          {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
        </Card>
      </div>
    );
  }

  const pairs = radar.items
    .map((o) => ({ o, f: radar.fits.find((x) => x.id === o.id)! }))
    .filter((p) => p.f)
    .sort((a, b) => b.f.fit - a.f.fit);
  const strong = pairs.filter((p) => p.f.verdict === "strong").length;
  const shown = pairs.filter(({ o, f }) =>
    filter === "all" ? true
      : filter === "strong" ? f.verdict === "strong"
      : filter === "internship" ? o.kind === "internship" || o.kind === "job"
      : filter === "campus" ? o.kind !== "internship" && o.kind !== "job"
      : saved.includes(o.id),
  );

  const select = (id: string) => {
    setSelected(id);
    setFilter("all");
    requestAnimationFrame(() => document.getElementById(`opp-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const funnel = [
    { n: radar.scanned, l: "live listings scanned", w: 100 },
    { n: radar.items.length, l: "matched your goals", w: 62 },
    { n: strong, l: "verified strong fits", w: 34 },
  ];

  return (
    <div>
      {header}
      <Card className="rise mb-6 overflow-hidden p-5 sm:p-7">
        <div className="grid items-center gap-8 md:grid-cols-[340px_minmax(0,1fr)]">
          <RadarScope items={radar.items} fits={radar.fits} selected={selected} onSelect={select} size={340} />
          <div>
            <p className="eyebrow flex items-center gap-1.5"><Funnel size={14} /> Detection → verification</p>
            <div className="mt-4 space-y-3">
              {funnel.map((s, i) => (
                <div key={s.l} className="rise" style={{ ["--i" as string]: i + 1 }}>
                  <div
                    className={`flex items-baseline justify-between gap-3 rounded-xl px-4 py-3 ${i === 2 ? "bg-good/10 ring-1 ring-good/30" : "bg-ink/[0.04]"}`}
                    style={{ width: `${s.w}%`, minWidth: "min(100%, 230px)" }}
                  >
                    <span className={`game text-2xl font-bold ${i === 2 ? "text-good" : ""}`}><CountUp value={s.n} /></span>
                    <span className="text-right text-[12.5px] text-muted">{s.l}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <p className="mb-2 text-[12.5px] text-faint">What the sweep found</p>
              <KindMix items={radar.items} />
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-[12.5px] text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-good shadow-[0_0_6px_#4fd18b]" />Strong</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warn" />Stretch</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-faint" />Skip</span>
              <span className="text-faint">Tap a blip to jump to it</span>
            </div>
            <div className="mt-3"><ModeNote {...meta} /></div>
          </div>
        </div>
      </Card>

      {radar.items.some((o) => o.deadline) && (
        <Card className="rise mb-6 p-5 sm:p-6" as="div">
          <p className="mb-2 font-semibold">Deadlines ahead</p>
          <DeadlineTimeline items={radar.items.filter((o) => radar.fits.find((f) => f.id === o.id)?.verdict !== "skip")} />
        </Card>
      )}

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-hairline bg-ink/[0.02] p-1 sm:inline-flex" role="tablist">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
            className={`h-9 shrink-0 rounded-lg px-3.5 text-[13.5px] transition-colors ${filter === id ? "bg-ink/[0.08] font-medium text-text" : "text-muted hover:text-text"}`}
          >
            {label}
            {id === "strong" && <span className="ml-1.5 text-good">{strong}</span>}
            {id === "saved" && saved.length > 0 && <span className="ml-1.5 text-gold">{saved.length}</span>}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map(({ o, f }, i) => <OppCard key={o.id} o={o} f={f} selected={selected === o.id} index={i} />)}
      </div>
      {shown.length === 0 && (
        <Card as="div"><EmptyState icon={<Star size={26} />} title="Nothing saved yet" body="Star an opportunity to keep it here." /></Card>
      )}
    </div>
  );
}
