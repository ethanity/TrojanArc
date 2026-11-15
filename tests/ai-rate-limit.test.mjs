import assert from "node:assert/strict";
import test from "node:test";
import { createFixedWindowLimiter, guardAiRequest } from "../src/lib/ai-rate-limit.ts";

// Ported from the Express version: limiter tests are unchanged; the middleware tests now
// exercise the Next.js route guard directly with standard Request objects.

test("allows up to the configured request count, then blocks until the window resets", () => {
  let now = 1_000;
  const limiter = createFixedWindowLimiter({
    windowMs: 60_000,
    maxRequests: 2,
    now: () => now,
  });

  assert.equal(limiter.consume("198.51.100.1").allowed, true);
  assert.equal(limiter.consume("198.51.100.1").allowed, true);
  assert.deepEqual(limiter.consume("198.51.100.1"), {
    allowed: false,
    retryAfterSeconds: 60,
  });

  now += 60_000;
  assert.equal(limiter.consume("198.51.100.1").allowed, true);
});

test("tracks separate client IPs independently", () => {
  const limiter = createFixedWindowLimiter({ windowMs: 60_000, maxRequests: 1 });

  assert.equal(limiter.consume("198.51.100.1").allowed, true);
  assert.equal(limiter.consume("198.51.100.2").allowed, true);
});

test("keeps the bucket table bounded and reuses expired entries", () => {
  let now = 0;
  const limiter = createFixedWindowLimiter({
    windowMs: 1_000,
    maxRequests: 1,
    maxEntries: 1,
    now: () => now,
  });

  assert.equal(limiter.consume("198.51.100.1").allowed, true);
  assert.deepEqual(limiter.consume("198.51.100.2"), {
    allowed: false,
    retryAfterSeconds: 1,
    capacityExceeded: true,
  });

  now = 1_000;
  assert.equal(limiter.consume("198.51.100.2").allowed, true);
});

const req = (method = "POST", headers = {}) =>
  new Request("http://localhost/api/roadmap", { method, headers: { "x-forwarded-for": "198.51.100.9", ...headers } });

test("only applies the quota to live AI POST requests", () => {
  const requestLimiter = createFixedWindowLimiter({ windowMs: 60_000, maxRequests: 1 });
  const opts = { isLiveAI: () => true, requestLimiter };

  assert.equal(guardAiRequest(req("GET"), opts), null);
  assert.equal(guardAiRequest(req("POST"), opts), null);
  const limited = guardAiRequest(req("POST"), opts);
  assert.ok(limited);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
});

test("does not apply paid-AI quotas in demo mode", () => {
  const requestLimiter = createFixedWindowLimiter({ windowMs: 60_000, maxRequests: 1 });
  const opts = { isLiveAI: () => false, requestLimiter };

  assert.equal(guardAiRequest(req("POST"), opts), null);
  assert.equal(guardAiRequest(req("POST"), opts), null);
});

test("rejects oversized bodies (2 MB JSON, 10 MB multipart)", () => {
  const opts = { isLiveAI: () => false };
  assert.equal(guardAiRequest(req("POST", { "content-length": String(3 * 1024 * 1024) }), opts)?.status, 413);
  assert.equal(guardAiRequest(req("POST", { "content-type": "multipart/form-data; boundary=x", "content-length": String(3 * 1024 * 1024) }), opts), null);
  assert.equal(guardAiRequest(req("POST", { "content-type": "multipart/form-data; boundary=x", "content-length": String(11 * 1024 * 1024) }), opts)?.status, 413);
});
