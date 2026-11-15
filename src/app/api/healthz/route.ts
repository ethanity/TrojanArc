// Health check (ported from the Express /api/healthz route).
export function GET() {
  return Response.json({ status: "ok" });
}
