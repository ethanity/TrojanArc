import { withAiGuard } from "@/lib/ai-rate-limit";
import { askStructured, liveAI, apiErrorMessage } from "@/lib/claude";
import { RoadmapSchema } from "@/lib/schemas";
import { demoRoadmap } from "@/lib/demo";
import { resourcesPrompt } from "@/lib/data/resources";
import { STORIES } from "@/lib/data/stories";
import { rankStories } from "@/lib/similarity";
import type { Profile, Win } from "@/lib/types";

export const maxDuration = 90;

const SYSTEM = `You are the planning engine of Trojan Arc, a college-success hub for USC students ("Trojans").
A student tells you their goal. Your job is to answer the two questions students can't answer alone:
1) What do I actually need to get there? (requirements, with an honest have / partial / missing status backed by evidence from their profile)
2) Where do I start? (a phased plan of small, concrete quests; the first phase is always "This week")

Rules:
- Ground every requirement's status in the profile. Quote the evidence ("B+ in CSCI 103", "no ROS on resume").
- Recommend USC resources ONLY from this catalog (use the exact name in "resource", or "" if none fits):
${resourcesPrompt()}
- Learn from the Trojans who already reached similar goals (provided with a similarity score). Weight high-similarity paths; ignore advice from very different paths.
- Each quest: a verb-first title, one-sentence why tied to their gap, a firstStep they can do in under 15 minutes, a realistic effort estimate, stat (academics/career/skills/network), and xp between 20 and 150 proportional to effort and impact.
- 4 phases max (This week, then the next 2-3 terms or breaks before their target date), 2-4 quests each.
- northStar: one sentence describing measurable success by their target date.
- watchOuts: 2-4 traps specific to this student (e.g. bad advice from different paths, deadline timing, course-load collisions).
- Respect constraints: size the weekly load to hoursPerWeek, filter by workAuth, and lean toward their priorities and interests.
- If remainingRequirements are present, plan courses against them (name real course codes from the list).
- If network shows connections at relevant companies, include a quest to reach out to them for advice or referrals.
- Use the student's own interview answers (answers[]), especially what they said is blocking them, to decide where to start.
- Write plainly, like a sharp upperclassman mentor. No hype.`;

async function handle(req: Request) {
  const { profile, wins = [], doneQuests = [] } = (await req.json()) as {
    profile: Profile;
    wins?: Win[];
    doneQuests?: string[];
  };

  if (!liveAI()) return Response.json({ mode: "demo", roadmap: demoRoadmap(profile) });

  const similar = rankStories(profile, STORIES)
    .slice(0, 4)
    .map(
      ({ story: s, sim }) =>
        `- ${s.name} (${s.major}, ${s.school} '${String(s.classOf).slice(2)}) → ${s.outcome}. Similarity ${sim.score}%.\n  Timeline: ${s.timeline.map((t) => `${t.when}: ${t.what}`).join(" | ")}\n  Advice: ${s.advice.join(" ")} Regret: ${s.regret}`,
    )
    .join("\n");

  const content = `Today: ${new Date().toDateString()}

STUDENT PROFILE
${JSON.stringify(profile, null, 2)}

RECENT WINS: ${wins.map((w) => w.text).join("; ") || "none yet"}
QUESTS ALREADY COMPLETED (don't repeat): ${doneQuests.join("; ") || "none"}

TROJANS WHO REACHED SIMILAR GOALS
${similar}

Build the roadmap.`;

  try {
    const roadmap = await askStructured({ system: SYSTEM, content, schema: RoadmapSchema, effort: "medium" });
    return Response.json({ mode: "live", roadmap });
  } catch (err) {
    return Response.json({ mode: "demo", roadmap: demoRoadmap(profile), warning: apiErrorMessage(err) });
  }
}

export const POST = withAiGuard(handle);
