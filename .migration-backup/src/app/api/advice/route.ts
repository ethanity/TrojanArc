import { NextResponse } from "next/server";
import { askStructured, liveAI, apiErrorMessage } from "@/lib/claude";
import { AdviceSchema } from "@/lib/schemas";
import { demoAdvice } from "@/lib/demo";
import { STORIES } from "@/lib/data/stories";
import { rankStories } from "@/lib/similarity";
import type { AdviceAnswer, Profile } from "@/lib/types";

export const maxDuration = 60;

const SYSTEM = `You are Trojan Arc's Advice Lens. Students get advice from everyone (friends, upperclassmen, TikTok) and can't tell whose advice applies to them.
You answer a student's question using real paths from Trojans who shared their story, each with a similarity score computed against this student (goal, major, school).

Rules:
- Weight advice by similarity. High-similarity Trojans are evidence; low-similarity Trojans are context.
- When a low-similarity Trojan's advice conflicts with what similar Trojans did, say so explicitly and explain WHY it doesn't transfer (different goal, different gatekeepers).
- verdict: a direct one-line answer. answer: 3-5 sentences, plain and specific, mentioning Trojans by first name. forYou: one sentence on why this applies to this student specifically.
- sources: 2-4 stories you relied on or are warning about (storyId exactly as given), with howItApplies (one sentence) and takeWithSalt=true for advice that doesn't transfer.
- talkTo: 1-2 storyIds of people marked openToChat who'd be most useful, with why and a specific first question to ask them.
- If the question involves health, safety or a crisis, point them to USC Counseling and Mental Health first.`;

export async function POST(req: Request) {
  const { profile, question } = (await req.json()) as { profile: Profile; question: string };
  if (!question?.trim()) return NextResponse.json({ error: "Ask a question." }, { status: 400 });

  const ranked = rankStories(profile, STORIES);
  const simById = new Map(ranked.map((r) => [r.story.id, r.sim.score]));

  if (!liveAI()) return NextResponse.json({ mode: "demo", advice: demoAdvice(question, profile, STORIES) });

  const storyText = ranked
    .map(
      ({ story: s, sim }) =>
        `[${s.id}] ${s.name}: ${s.major} (${s.school} '${String(s.classOf).slice(2)}), GPA ${s.gpaBand} → ${s.outcome}. SIMILARITY ${sim.score}% (shared: ${sim.shared.join("; ") || "none"}; different: ${sim.different.join("; ") || "none"}). openToChat=${s.openToChat}
  Timeline: ${s.timeline.map((t) => `${t.when}: ${t.what}`).join(" | ")}
  Advice: ${s.advice.join(" ")}
  Regret: ${s.regret}`,
    )
    .join("\n");

  const content = `STUDENT: ${profile.name}, ${profile.year} ${profile.major} (${profile.school}), GPA ${profile.gpa ?? "?"}. Goal: ${profile.goal} [${profile.goalTags.join(", ")}].

TROJAN PATHS
${storyText}

QUESTION: ${question}`;

  try {
    const out = await askStructured({ system: SYSTEM, content, schema: AdviceSchema, effort: "low" });
    const advice: AdviceAnswer = {
      ...out,
      sources: out.sources
        .filter((s) => simById.has(s.storyId))
        .map((s) => ({ ...s, similarity: simById.get(s.storyId)! })),
      talkTo: out.talkTo.filter((t) => simById.has(t.storyId)),
    };
    return NextResponse.json({ mode: "live", advice });
  } catch (err) {
    return NextResponse.json({ mode: "demo", advice: demoAdvice(question, profile, STORIES), warning: apiErrorMessage(err) });
  }
}
