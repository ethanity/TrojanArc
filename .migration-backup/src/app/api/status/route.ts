import { NextResponse, connection } from "next/server";
import { liveAI, MODEL } from "@/lib/claude";

export async function GET() {
  await connection(); // evaluate per request (env can change between deploys)
  return NextResponse.json({ live: liveAI(), model: MODEL });
}
