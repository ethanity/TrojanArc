import { withAiGuard } from "@/lib/ai-rate-limit";
import { askStructured, liveAI, apiErrorMessage } from "@/lib/claude";
import { InterviewSchema } from "@/lib/schemas";
import { demoInterview } from "@/lib/demo";
import type { Profile } from "@/lib/types";

export const maxDuration = 60;

const SYSTEM = `You are Trojan Arc's intake interviewer. A USC student's profile has already been built from their documents and integrations.
Replace a 30-minute advising questionnaire with 4-5 quick tap questions that cover ONLY what the profile can't tell you.

Never ask about anything already in the profile (major, courses, GPA, skills, experience...). Focus on what changes their plan:
- constraints: hours per week available, work authorization / visa, need for paid roles, location limits, family or financial obligations
- motivation and priorities for the next role or step
- interests or directions to confirm (offer options inferred from their projects)
- what is blocking them right now

Rules:
- Each question: tappable options (3-7, short), kind "single" or "multi" (use "text" only if options can't work, with options []).
- why: one sentence that cites something specific from their profile or explains how the answer changes the plan.
- field: map to workAuth, hoursPerWeek, priorities, interests, or other.
- Friendly, plain, no jargon. Questions under 14 words.`;

async function handle(req: Request) {
  const { profile } = (await req.json()) as { profile: Profile };
  if (!liveAI()) return Response.json({ mode: "demo", questions: demoInterview(profile) });
  try {
    const brief = {
      ...profile,
      network: profile.network?.slice(0, 10),
      courses: profile.courses.map((c) => `${c.code} ${c.grade}`),
    };
    const out = await askStructured({
      system: SYSTEM,
      content: `PROFILE\n${JSON.stringify(brief, null, 1)}\n\nWrite the questions.`,
      schema: InterviewSchema,
      effort: "low",
      maxTokens: 4000,
    });
    return Response.json({ mode: "live", questions: out.questions.slice(0, 5) });
  } catch (err) {
    return Response.json({ mode: "demo", questions: demoInterview(profile), warning: apiErrorMessage(err) });
  }
}

export const POST = withAiGuard(handle);
