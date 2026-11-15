import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import test from "node:test";
import { createAiRateLimitMiddleware, createFixedWindowLimiter } from "./ai-rate-limit.ts";

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

test("only applies the quota to live AI POST endpoints", async (t) => {
  const app = express();
  app.use(
    "/api",
    createAiRateLimitMiddleware(
      () => true,
      createFixedWindowLimiter({ windowMs: 60_000, maxRequests: 1 }),
    ),
  );
  app.use("/api", (_req, res) => res.sendStatus(204));

  const server = app.listen(0);
  await once(server, "listening");
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  assert.equal((await fetch(`${baseUrl}/api/status`, { method: "POST" })).status, 204);
  assert.equal((await fetch(`${baseUrl}/api/roadmap`)).status, 204);
  assert.equal((await fetch(`${baseUrl}/api/roadmap`, { method: "POST" })).status, 204);
  const limited = await fetch(`${baseUrl}/api/roadmap`, { method: "POST" });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
});

test("does not apply paid-AI quotas in demo mode", async (t) => {
  const app = express();
  app.use(
    "/api",
    createAiRateLimitMiddleware(
      () => false,
      createFixedWindowLimiter({ windowMs: 60_000, maxRequests: 1 }),
    ),
  );
  app.use("/api", (_req, res) => res.sendStatus(204));

  const server = app.listen(0);
  await once(server, "listening");
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/api/roadmap`;

  assert.equal((await fetch(url, { method: "POST" })).status, 204);
  assert.equal((await fetch(url, { method: "POST" })).status, 204);
});
