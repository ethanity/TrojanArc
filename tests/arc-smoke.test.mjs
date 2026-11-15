import test from "node:test";
import assert from "node:assert/strict";

// Exercise the actual managed frontend/API through the shared artifact proxy.
const base = process.env.ARC_TEST_URL ?? "http://localhost:3000";
let profile;

async function post(path, data) {
  const response = await fetch(`${base}/api/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(60000),
  });
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  return response.json();
}

test("Trojan Arc migration", async (t) => {
  await t.test("serves the original page metadata", async () => {
    const response = await fetch(base);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<title>Trojan Arc<\/title>/);
    // Next.js self-hosts Lexend via next/font, so the family name lives in the linked CSS, not the HTML.
    const cssUrls = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((m) => new URL(m[1], base).href);
    const css = (await Promise.all(cssUrls.map(async (u) => (await fetch(u)).text()))).join("\n");
    assert.match(css + html, /Lexend/);
    assert.equal((await fetch(`${base}/favicon.ico`)).status, 200);
  });
  await t.test("reports API and AI status", async () => {
    assert.equal((await fetch(`${base}/api/healthz`)).status, 200);
    const status = await (await fetch(`${base}/api/status`)).json();
    assert.equal(typeof status.live, "boolean");
    assert.equal(typeof status.model, "string");
  });
  await t.test("accepts multipart onboarding, including document bytes", async () => {
    const form = new FormData();
    form.set("demo", "1");
    form.set("files", new File(["Migration test document"], "test.txt", { type: "text/plain" }));
    const response = await fetch(`${base}/api/onboard`, { method: "POST", body: form });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.mode, "demo");
    assert.ok(result.profile.name);
    assert.ok(result.profile.sources.includes("test.txt"));
    assert.ok(result.found.length);
    profile = result.profile;
  });
  await t.test("returns personalized intake questions", async () => {
    const result = await post("interview", { profile });
    assert.ok(result.questions.length > 0);
    assert.ok(result.questions[0].options.length > 0);
  });
  await t.test("returns a phased quest map", async () => {
    const result = await post("roadmap", { profile, wins: [], doneQuests: [] });
    assert.ok(result.roadmap.northStar);
    assert.ok(result.roadmap.phases.length > 0);
  });
  await t.test("returns sourced advice and rejects blank questions", async () => {
    const result = await post("advice", { profile, question: "How should I prepare for internships?" });
    assert.ok(result.advice.verdict);
    assert.ok(result.advice.sources.length);
    const invalid = await fetch(`${base}/api/advice`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile, question: "" }),
    });
    assert.equal(invalid.status, 400);
  });
  await t.test("returns opportunities with matching fit results", async () => {
    const result = await post("radar", { profile });
    assert.ok(Array.isArray(result.items));
    assert.ok(result.items.length > 0);
    assert.equal(result.items.length, result.fits.length);
    assert.equal(typeof result.scanned, "number");
  });
});
