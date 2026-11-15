import type { RequestHandler } from "express";

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

const AI_PATHS = new Set(["/onboard", "/interview", "/roadmap", "/radar", "/advice"]);
const AI_REQUEST_LIMIT = 10;
const AI_REQUEST_WINDOW_MS = 15 * 60 * 1000;

const limiter = createFixedWindowLimiter({
  windowMs: AI_REQUEST_WINDOW_MS,
  maxRequests: AI_REQUEST_LIMIT,
});

export function createAiRateLimitMiddleware(
  isLiveAI: () => boolean,
  requestLimiter = limiter,
): RequestHandler {
  return (req, res, next) => {
    if (req.method !== "POST" || !AI_PATHS.has(req.path) || !isLiveAI()) {
      next();
      return;
    }

    const key = req.ip || req.socket.remoteAddress || "unknown";
    const result = requestLimiter.consume(key);
    if (result.allowed) {
      next();
      return;
    }

    res.setHeader("Retry-After", String(result.retryAfterSeconds));
    if (result.capacityExceeded) {
      res.status(503).json({ error: "AI service is temporarily busy. Please try again later." });
      return;
    }

    res.status(429).json({ error: "Too many AI requests. Please try again later." });
  };
}
