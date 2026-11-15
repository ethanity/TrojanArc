import { z } from "zod/v4";

const stat = z.enum(["academics", "career", "skills", "network"]);

export const ProfileSchema = z.object({
  name: z.string(),
  major: z.string(),
  minor: z.string(),
  school: z.string(),
  year: z.string(),
  gradTerm: z.string(),
  gpa: z.number().nullable(),
  goal: z.string(),
  goalTags: z.array(z.string()),
  timeline: z.string(),
  preferences: z.string(),
  courses: z.array(
    z.object({ code: z.string(), title: z.string(), grade: z.string(), term: z.string() }),
  ),
  skills: z.array(z.string()),
  projects: z.array(z.object({ name: z.string(), summary: z.string() })),
  experience: z.array(z.object({ role: z.string(), org: z.string(), summary: z.string() })),
  clubs: z.array(z.string()),
  github: z.string(),
  interests: z.array(z.string()),
  awards: z.array(z.string()),
  certifications: z.array(z.string()),
  languages: z.array(z.string()),
  links: z.array(z.string()),
  remainingRequirements: z.array(z.string()),
  unitsCompleted: z.number().nullable(),
});

export const InterviewSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      why: z.string(),
      kind: z.enum(["single", "multi", "text"]),
      options: z.array(z.string()),
      field: z.enum(["workAuth", "hoursPerWeek", "priorities", "interests", "other"]),
    }),
  ),
});

export const OnboardSchema = z.object({
  profile: ProfileSchema,
  found: z.array(z.string()),
  missing: z.array(z.string()),
});

export const RoadmapSchema = z.object({
  northStar: z.string(),
  requirements: z.array(
    z.object({
      name: z.string(),
      category: z.enum(["skill", "experience", "academic", "network", "credential"]),
      status: z.enum(["have", "partial", "missing"]),
      evidence: z.string(),
      whyItMatters: z.string(),
    }),
  ),
  phases: z.array(
    z.object({
      title: z.string(),
      focus: z.string(),
      quests: z.array(
        z.object({
          title: z.string(),
          why: z.string(),
          firstStep: z.string(),
          resource: z.string(),
          stat,
          xp: z.number(),
          effort: z.string(),
        }),
      ),
    }),
  ),
  watchOuts: z.array(z.string()),
});

export const FitSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      fit: z.number(),
      verdict: z.enum(["strong", "stretch", "skip"]),
      reason: z.string(),
      blocker: z.string(),
      nextAction: z.string(),
    }),
  ),
});

export const AdviceSchema = z.object({
  verdict: z.string(),
  answer: z.string(),
  forYou: z.string(),
  sources: z.array(
    z.object({
      storyId: z.string(),
      howItApplies: z.string(),
      takeWithSalt: z.boolean(),
    }),
  ),
  talkTo: z.array(z.object({ storyId: z.string(), why: z.string(), askThem: z.string() })),
});
