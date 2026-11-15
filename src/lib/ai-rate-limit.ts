import "server-only";
import { liveAI } from "./claude";

// Ported from the Express middleware (artifacts/api-server/src/middlewares/ai-rate-limit.ts):
// the limiter itself is unchanged; the guard wraps Next.js route handlers instead of Express.

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; retryAfterSeconds: number; capacityExceeded?: true };

export function createFixedWindowLimiter(options: {
  windowMs: number;
  maxRequests: number;
  maxEntries?: number;
  now?: () => number;
}) {
  const { windowMs, maxRequests, now = Date.now } = options;
  const maxEntries = options.maxEntries ?? 10_000;
  const buckets = new Map<string, Bucket>();

  return {
    consume(key: string): RateLimitResult {
      const currentTime = now();
      let bucket = buckets.get(key);

      if (!bucket || bucket.resetAt <= currentTime) {
        if (!bucket && buckets.size >= maxEntries) {
          for (const [entryKey, entry] of buckets) {
            if (entry.resetAt <= currentTime) buckets.delete(entryKey);
          }
          if (buckets.size >= maxEntries) {
            return {
              allowed: false,
              retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
              capacityExceeded: true,
            };
          }
        }
        bucket = { count: 0, resetAt: currentTime + windowMs };
      }

      if (bucket.count >= maxRequests) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000)),
        };
      }

      bucket.count += 1;
      buckets.set(key, bucket);
      return { allowed: true, remaining: maxRequests - bucket.count, resetAt: bucket.resetAt };
    },
  };
}

const AI_REQUEST_LIMIT = 10;
const AI_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const JSON_BODY_LIMIT = 2 * 1024 * 1024; // matches express.json({ limit: "2mb" })
const MULTIPART_BODY_LIMIT = 10 * 1024 * 1024; // matches raw({ type: "multipart/form-data", limit: "10mb" })

const limiter = createFixedWindowLimiter({ windowMs: AI_REQUEST_WINDOW_MS, maxRequests: AI_REQUEST_LIMIT });

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Returns a response that blocks the request, or null when it may proceed. */
export function guardAiRequest(req: Request, options: { isLiveAI?: () => boolean; requestLimiter?: ReturnType<typeof createFixedWindowLimiter> } = {}): Response | null {
  const isMultipart = (req.headers.get("content-type") ?? "").includes("multipart/form-data");
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > (isMultipart ? MULTIPART_BODY_LIMIT : JSON_BODY_LIMIT)) {
    return Response.json({ error: "Request body too large. Reduce the request size and try again." }, { status: 413 });
  }

  const isLive = options.isLiveAI ?? liveAI;
  if (req.method !== "POST" || !isLive()) return null; // paid-AI quota applies only to live AI

  const result = (options.requestLimiter ?? limiter).consume(clientIp(req));
  if (result.allowed) return null;

  const headers = { "Retry-After": String(result.retryAfterSeconds) };
  if (result.capacityExceeded) {
    return Response.json({ error: "AI service is temporarily busy. Please try again later." }, { status: 503, headers });
  }
  return Response.json({ error: "Too many AI requests. Please try again later." }, { status: 429, headers });
}

/** Wrap an AI route handler with the rate limit, body-size limit and a safe error response. */
export function withAiGuard(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const blocked = guardAiRequest(req);
    if (blocked) return blocked;
    try {
      return await handler(req);
    } catch (err) {
      console.error("Trojan Arc request failed", err);
      return Response.json({ error: "Unable to process the request. Check your input and try again." }, { status: 400 });
    }
  };
}
