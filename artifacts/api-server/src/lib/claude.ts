import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod/v4";

export const MODEL = "claude-opus-5-5";

/** Demo mode = no API key configured. Every route has a canned/heuristic fallback. */
export function liveAI(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) && process.env.DEMO_MODE !== "1";
}

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

export type UserContent = Anthropic.Beta.BetaContentBlockParam[];

/**
 * One structured call to Claude. Returns the parsed object validated against `schema`.
 * Server-side fallbacks ("default") re-run a declined request on a fallback model.
 */
export async function askStructured<S extends z.ZodType>(opts: {
  system: string;
  content: UserContent | string;
  schema: S;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: opts.system,
    output_config: {
      effort: opts.effort ?? "low",
      format: betaZodOutputFormat(opts.schema),
    },
    messages: [{ role: "user", content: opts.content }],
  });

  if (res.stop_reason === "refusal") {
    throw new Error("Claude declined this request.");
  }
  if (res.stop_reason === "max_tokens") {
    throw new Error("Response was cut off (max_tokens).");
  }
  if (res.parsed_output == null) {
    throw new Error("Claude returned output that did not match the schema.");
  }
  return res.parsed_output as z.infer<S>;
}

export function apiErrorMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "Invalid ANTHROPIC_API_KEY.";
  if (err instanceof Anthropic.RateLimitError) return "Rate limited by the Claude API, try again in a moment.";
  if (err instanceof Anthropic.APIError) return `Claude API error ${err.status}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return "Unknown error";
}
