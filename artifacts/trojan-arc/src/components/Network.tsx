"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CaretDown, ChatCircleDots, Copy, HandHeart, Lightbulb, Quotes, Sparkle, Warning } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { STORIES } from "@/lib/data/stories";
import { rankStories } from "@/lib/similarity";
import type { AdviceAnswer, Story } from "@/lib/types";
import { AiWorking, Avatar, Bar, Card, Chip, ErrorNote, ModeNote, PageHeader, SectionTitle } from "./ui";
import { Constellation } from "./viz2";

const EXAMPLES = [
  "My friend said to fade class because GPA doesn't matter. Should I?",
  "Should I do research or a club project this spring?",
  "How early should I start applying for summer internships?",
];

const byId = new Map(STORIES.map((s) => [s.id, s]));

function SimilarityBadge({ score }: { score: number }) {
  const color = score >= 60 ? "text-good" : score >= 40 ? "text-warn" : "text-cardinal";
  return (
    <div className="w-[88px] shrink-0 text-right">
      <p className={`game text-xl font-bold leading-none ${color}`}>{score}%</p>
      <Bar value={score} thin className="mt-1.5" />
      <p className="mt-1 text-[11px] text-faint">like you</p>
    </div>
  );
}

function StoryCard({ s, score, shared, index }: { s: Story; score: number; shared: string[]; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div id={`story-${s.id}`} className="rise tile tile-hover scroll-mt-24 p-4" style={{ ["--i" as string]: index }}>
      <div className="flex items-start gap-3">
        <Avatar name={s.name} size={42} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{s.name}</p>
          <p className="text-[12.5px] text-muted">{s.major} · {s.school} &apos;{String(s.classOf).slice(2)}</p>
        </div>
        <SimilarityBadge score={score} />
      </div>
      <p className="mt-3 text-[14px] font-medium leading-snug text-gold/90">{s.outcome}</p>
      {shared.length > 0 && <p className="mt-1.5 text-[12.5px] text-faint">Shared with you: {shared.join(" · ")}</p>}
      <button className="mt-3 flex items-center gap-1 text-[13px] font-medium text-muted hover:text-text" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Hide their path" : "See their path"}
        <CaretDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="rise mt-4 space-y-4">
          <ol className="relative space-y-3 pl-5">
            <span className="absolute bottom-1 left-[5px] top-1 w-px bg-gradient-to-b from-cardinal to-gold/40" aria-hidden />
            {s.timeline.map((t) => (
              <li key={t.when} className="relative text-[13.5px]">
                <span className="absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-cardinal bg-bg" />
                <span className="text-[12px] font-medium text-faint">{t.when}</span>
                <p className="leading-relaxed">{t.what}</p>
              </li>
            ))}
          </ol>
          <ul className="space-y-2">
            {s.advice.map((a) => (
              <li key={a} className="flex gap-2 text-[13.5px] leading-relaxed text-muted"><Quotes size={15} weight="fill" className="mt-0.5 shrink-0 text-faint" />{a}</li>
            ))}
          </ul>
          <p className="flex gap-2 text-[13px] text-muted"><Lightbulb size={16} className="shrink-0 text-gold" />Regret: {s.regret}</p>
        </div>
      )}
    </div>
  );
}

export default function Network() {
  const { profile, shareStory, toast } = useStore();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ans, setAns] = useState<(AdviceAnswer & { mode?: string; warning?: string }) | null>(null);
  const [story, setStory] = useState("");
  const [intro, setIntro] = useState<{ id: string; text: string } | null>(null);

  const ranked = useMemo(() => (profile ? rankStories(profile, STORIES) : []), [profile]);

  async function ask(question: string) {
    if (!profile || !question.trim()) return;
    setQ(question);
    setBusy(true);
    setError("");
    setAns(null);
    setIntro(null);
    try {
      const res = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setAns({ ...data.advice, mode: data.mode, warning: data.warning });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Trojan network"
        title="Advice, weighted by who it's from"
        subtitle="Everyone has advice. Ask anything and get answers from Trojans who took your path, with advice from different paths flagged."
      />

      {/* Advice lens */}
      <Card className="rise mb-8 overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#ffb4c0]/30 blur-3xl" aria-hidden />
        <form className="relative" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
          <label className="sr-only" htmlFor="ask">Ask the Trojan network</label>
          <Sparkle size={20} weight="fill" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gold" />
          <input id="ask" className="field !h-14 !rounded-2xl !pl-12 !pr-28 !text-[16px]" placeholder="Ask the Trojan network anything…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-primary absolute right-2 top-1/2 -translate-y-1/2" disabled={busy || !q.trim()}>Ask <ArrowRight size={16} weight="bold" /></button>
        </form>
        <div className="relative mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button key={e} className="rounded-xl border border-hairline-2 bg-ink/[0.03] px-3 py-1.5 text-left text-[13px] text-muted transition-colors hover:border-gold/40 hover:text-text" onClick={() => ask(e)}>{e}</button>
          ))}
        </div>

        {busy && <div className="relative mt-6"><AiWorking title="Asking Trojans like you" steps={["Scoring every Trojan path for similarity to you", "Weighing advice by who it came from", "Checking where advice conflicts", "Finding who you should talk to"]} /></div>}
        {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}

        {ans && (
          <div className="relative mt-7 space-y-6">
            <div className="rise rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/[0.08] to-transparent p-5 sm:p-6">
              <p className="text-[22px] font-semibold leading-snug tracking-[-0.02em] sm:text-[26px]">{ans.verdict}</p>
              <p className="mt-3 max-w-3xl text-[15.5px] leading-relaxed">{ans.answer}</p>
              <p className="mt-3 text-[13.5px] text-muted">{ans.forYou}</p>
            </div>

            <div>
              <p className="mb-3 text-[14px] font-semibold">Where this comes from</p>
              <div className="grid gap-2.5 md:grid-cols-2">
                {ans.sources.map((src, i) => {
                  const s = byId.get(src.storyId);
                  if (!s) return null;
                  return (
                    <div key={src.storyId} className={`rise tile p-4 ${src.takeWithSalt ? "!border-cardinal/35 !bg-cardinal/[0.06]" : ""}`} style={{ ["--i" as string]: i }}>
                      <div className="flex items-start gap-3">
                        <Avatar name={s.name} size={38} />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{s.name}</p>
                          <p className="truncate text-[12.5px] text-muted">{s.major}</p>
                        </div>
                        <SimilarityBadge score={src.similarity} />
                      </div>
                      <div className="mt-3">
                        {src.takeWithSalt
                          ? <Chip tone="red" icon={<Warning size={13} weight="fill" />}>Take with salt</Chip>
                          : <Chip tone="green">Applies to you</Chip>}
                      </div>
                      <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{src.howItApplies}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {ans.talkTo.length > 0 && (
              <div>
                <p className="mb-3 text-[14px] font-semibold">Who to talk to</p>
                <div className="grid gap-2.5 md:grid-cols-2">
                  {ans.talkTo.map((t) => {
                    const s = byId.get(t.storyId);
                    if (!s) return null;
                    const open = intro?.id === t.storyId;
                    return (
                      <div key={t.storyId} className="tile p-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} size={38} />
                          <div className="min-w-0">
                            <p className="font-semibold">{s.name}</p>
                            <p className="text-[12.5px] text-muted">{t.why}</p>
                          </div>
                        </div>
                        <p className="mt-3 flex gap-2 text-[14px] leading-relaxed"><ChatCircleDots size={18} className="mt-0.5 shrink-0 text-gold" />{t.askThem}</p>
                        {!open ? (
                          <button
                            className="btn btn-secondary btn-sm mt-3"
                            onClick={() =>
                              setIntro({
                                id: t.storyId,
                                text: `Hi ${s.name.split(" ")[0]}! I'm ${profile?.name.split(" ")[0]}, a ${profile?.year.toLowerCase()} in ${profile?.major}. I saw your path to ${s.outcome.toLowerCase()} on Trojan Arc. ${t.askThem} Would you be open to a 15-minute chat? Fight on!`,
                              })
                            }
                          >
                            Draft an intro
                          </button>
                        ) : (
                          <div className="rise mt-3">
                            <textarea className="field min-h-28 !text-[14px]" value={intro.text} onChange={(e) => setIntro({ ...intro, text: e.target.value })} />
                            <button
                              className="btn btn-primary btn-sm mt-2"
                              onClick={() => { navigator.clipboard?.writeText(intro.text).catch(() => {}); toast("Intro copied", "You send it. Trojan Arc never messages anyone for you."); }}
                            >
                              <Copy size={14} /> Copy message
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <ModeNote mode={ans.mode} warning={ans.warning} />
          </div>
        )}
      </Card>

      <Card className="rise mb-5 overflow-hidden p-5 sm:p-7">
        <SectionTitle right={<Chip>sample stories</Chip>}>Your Trojan constellation</SectionTitle>
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <Constellation
            you={profile?.name || "You"}
            people={ranked.map(({ story, sim }) => ({ story, score: sim.score }))}
            onSelect={(id) => document.getElementById(`story-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
          />
          <div className="space-y-4 text-[14px] leading-relaxed text-muted">
            <p>Closer means their path looks more like yours: same goal, major and school.</p>
            <p>Advice from the inner ring is evidence. Advice from the outer ring is context.</p>
            <div className="space-y-1.5 text-[13px]">
              <p className="flex items-center gap-2"><span className="h-0.5 w-6 rounded bg-good" />very like you</p>
              <p className="flex items-center gap-2"><span className="h-0.5 w-6 rounded bg-warn" />somewhat like you</p>
              <p className="flex items-center gap-2"><span className="h-0.5 w-6 rounded bg-cardinal" />different path</p>
            </div>
            <p className="text-faint">Tap anyone to see their path.</p>
          </div>
        </div>
      </Card>

      <SectionTitle>Trojans on paths like yours</SectionTitle>
      <div className="mb-8 grid gap-3 md:grid-cols-2">
        {ranked.map(({ story, sim }, i) => <StoryCard key={story.id} s={story} score={sim.score} shared={sim.shared} index={i} />)}
      </div>

      <Card className="rise overflow-hidden p-5 sm:p-7">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-center">
          <div>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gold/15 text-gold"><HandHeart size={22} weight="fill" /></span>
            <h2 className="mt-4 text-xl font-semibold tracking-[-0.02em]">Pay it forward</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">Landed something? Share what actually worked. It shows as first name + initial, and it&apos;s worth <span className="game font-semibold text-gold">+100 XP</span>.</p>
          </div>
          <div>
            <textarea className="field min-h-28" placeholder="What you landed, and the 3 things that got you there…" value={story} onChange={(e) => setStory(e.target.value)} />
            <button className="btn btn-primary mt-3" disabled={!story.trim()} onClick={() => { shareStory(); setStory(""); }}>Share my path</button>
          </div>
        </div>
      </Card>
    </div>
  );
}
