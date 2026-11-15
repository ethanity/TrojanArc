import { liveAI, MODEL } from "@/lib/claude";

export async function GET() {
  return Response.json({ live: liveAI(), model: MODEL });
}
