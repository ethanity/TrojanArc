import { lookup } from "node:dns/promises";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";

const MAX_BYTES = 400000;

export function isPublicAddress(address: string): boolean {
  try {
    // process() converts IPv4-mapped IPv6 before checking private ranges.
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}

export async function publicAddress(
  url: URL,
  resolve = lookup,
): Promise<{ address: string; family: number }> {
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Only public HTTP websites are supported.");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const literalFamily = isIP(hostname);
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await resolve(hostname, { all: true, verbatim: true });
  // Reject mixed public/private answers rather than letting connection fallback
  // select an internal destination.
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("Website resolves to a non-public address.");
  }
  return addresses[0];
}

export async function readWebsiteHTML(response: IncomingMessage): Promise<string> {
  const length = Number(response.headers["content-length"] ?? 0);
  if (length > MAX_BYTES) {
    response.destroy();
    throw new Error("Website response is too large.");
  }
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of response) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_BYTES) {
      response.destroy();
      throw new Error("Website response is too large.");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function fetchPublicWebsite(raw: string): Promise<string | null> {
  try {
    let url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const signal = AbortSignal.timeout(8000);
    for (let redirects = 0; redirects <= 3; redirects++) {
      const pinned = await publicAddress(url);
      signal.throwIfAborted();
      const response = await new Promise<IncomingMessage>((resolve, reject) => {
        const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
          signal,
          agent: false,
          headers: {
            "User-Agent": "trojan-arc",
            Accept: "text/html",
            "Accept-Encoding": "identity",
          },
          // Pin the verified IP for this connection, preventing DNS rebinding.
          // The URL hostname remains intact for TLS verification and Host.
          lookup: (_hostname, options, callback) => {
            if (options.all) callback(null, [pinned]);
            else callback(null, pinned.address, pinned.family);
          },
        }, resolve);
        request.on("error", reject);
        request.end();
      });
      if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
        const location = response.headers.location;
        response.destroy();
        if (!location || redirects === 3) return null;
        // Re-resolve, validate and pin every redirected destination.
        url = new URL(location, url);
        continue;
      }
      if (
        (response.statusCode ?? 500) < 200 ||
        (response.statusCode ?? 500) >= 300 ||
        !String(response.headers["content-type"] ?? "").includes("text/html") ||
        !["", "identity"].includes(String(response.headers["content-encoding"] ?? ""))
      ) {
        response.destroy();
        return null;
      }
      const html = await readWebsiteHTML(response);
      return html
        .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 15000);
    }
    return null;
  } catch {
    // As before the migration, an unavailable website is omitted from sources.
    return null;
  }
}
