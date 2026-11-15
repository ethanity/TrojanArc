import type { Profile } from "./types";

// Shared keyword tagging used by the live feeds and the demo scorer.
const TAG_KEYWORDS: Record<string, string[]> = {
  robotics: ["robot", "autonom", "perception", "manipulat", "controls", "mechatron", "humanoid", "drone", "slam", "motion planning", "uav"],
  ml: ["machine learning", " ml", "ml ", "ai ", " ai", "artificial intelligence", "deep learning", "computer vision", "llm", "data scien"],
  swe: ["software", "swe", "developer", "backend", "frontend", "full stack", "full-stack"],
  hardware: ["hardware", "electrical", "firmware", "embedded", "fpga", "asic", "pcb", "silicon"],
  research: ["research"],
  consulting: ["consult", "strategy"],
  finance: ["quant", "trading", "investment", "finance"],
  data: ["data ", "analytics", "data engineer"],
  product: ["product manag", "product design"],
};

export function tagsFor(text: string): string[] {
  const t = ` ${text.toLowerCase()} `;
  return Object.entries(TAG_KEYWORDS)
    .filter(([, kws]) => kws.some((k) => t.includes(k)))
    .map(([tag]) => tag);
}

/** Domain tags implied by the student's major, skills and interests (so "MS Computer Science" matches software roles). */
export function domainTags(p: Profile): string[] {
  const text = `${p.major} ${p.skills.join(" ")} ${(p.interests ?? []).join(" ")}`.toLowerCase();
  const extra: string[] = [];
  if (/computer science|computer engineering|software/.test(text)) extra.push("swe", "ml");
  if (/data science|statistic|analytics/.test(text)) extra.push("data", "ml");
  if (/electrical|hardware|embedded/.test(text)) extra.push("hardware");
  if (/mechanical|aerospace|robot/.test(text)) extra.push("robotics", "hardware");
  if (/business|economics|finance|accounting|mba/.test(text)) extra.push("finance", "consulting", "product");
  if (/biomedical|bioengineering/.test(text)) extra.push("research", "hardware");
  return Array.from(new Set([...tagsFor(text), ...extra]));
}
