import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { isPublicAddress, publicAddress, readWebsiteHTML, fetchPublicWebsite } from "../src/lib/public-website";

test("rejects internal, metadata, reserved and mapped addresses", () => {
  for (const address of [
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1",
    "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1",
    "::1", "fe80::1", "fc00::1", "::ffff:127.0.0.1", "::ffff:169.254.169.254",
  ]) assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress("93.184.216.34"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
});

test("checks resolved DNS answers, including mixed private/public answers", async () => {
  const privateResolver = async () => [{ address: "169.254.169.254", family: 4 }];
  const mixedResolver = async () => [
    { address: "93.184.216.34", family: 4 }, { address: "127.0.0.1", family: 4 },
  ];
  await assert.rejects(publicAddress(new URL("https://example.com"), privateResolver as never));
  await assert.rejects(publicAddress(new URL("https://example.com"), mixedResolver as never));
  for (const url of ["http://2130706433", "http://0x7f000001", "http://[::1]", "file:///etc/passwd"]) {
    await assert.rejects(publicAddress(new URL(url)));
  }
});

test("redirect destinations are subject to the same public address policy", async () => {
  const target = new URL("http://169.254.169.254/latest/meta-data", "https://example.com");
  await assert.rejects(publicAddress(target));
  assert.equal(await fetchPublicWebsite("http://127.0.0.1:8080"), null);
});

test("bounds streamed bodies even without a Content-Length header", async () => {
  const response = Readable.from([Buffer.alloc(200000), Buffer.alloc(200001)]) as IncomingMessage;
  response.headers = {};
  await assert.rejects(readWebsiteHTML(response), /too large/);
  const small = Readable.from([Buffer.from("<html>Public page</html>")]) as IncomingMessage;
  small.headers = {};
  assert.match(await readWebsiteHTML(small), /Public page/);
});
