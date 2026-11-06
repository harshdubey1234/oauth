import ipaddr from "ipaddr.js";
import { safePublicUrl } from "./security";

export type PublicDocument = {
  url: string;
  contentType: string;
  body: string;
  retrievedAt: string;
};
export type DocumentFetcher = (url: string) => Promise<PublicDocument>;

export function publicAddress(value: string): boolean {
  try {
    const address = ipaddr.process(value);
    return address.range() === "unicast";
  } catch {
    return false;
  }
}
/** Reads at most `maxBytes`. With `truncate`, oversized documents keep their first `maxBytes`
 * (titles, navigation and early sections) instead of failing; otherwise they are rejected. */
export async function boundedBody(
  response: Response,
  maxBytes: number,
  truncate = false,
): Promise<string> {
  if (!truncate && Number(response.headers.get("content-length") || 0) > maxBytes) {
    await response.body?.cancel();
    throw new Error("The document exceeds the research size limit.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The document has no readable body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    if (size + part.value.length > maxBytes) {
      await reader.cancel();
      if (!truncate) throw new Error("The document exceeds the research size limit.");
      chunks.push(part.value.subarray(0, maxBytes - size));
      size = maxBytes;
      break;
    }
    size += part.value.length;
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}

/** HTTPS only, credential-free requests, public A/AAAA answers and manual per-hop checks.
 * TLS verification remains enabled. No proxy, cookie, custom port, or HTTP downgrade.
 * Workers isolates have no access to this developer machine's local network.
 */
export function createPublicFetcher(
  signal?: AbortSignal,
  rawNetwork: typeof fetch = fetch,
  /** Cloudflare Workers cap outbound subrequests per invocation (50 on the free plan). */
  maxRequests = 45,
): DocumentFetcher {
  let used = 0;
  const network: typeof fetch = (input, init) => {
    if (++used > maxRequests)
      return Promise.reject(new Error("The research request budget for this run is used up."));
    return rawNetwork(input, init);
  };
  const dns = new Map<string, Promise<void>>();
  async function validateHost(hostname: string) {
    let pending = dns.get(hostname);
    if (!pending) {
      pending = (async () => {
        const answers = await Promise.all(
          ["A", "AAAA"].map(async (type) => {
            const endpoint = new URL("https://cloudflare-dns.com/dns-query");
            endpoint.searchParams.set("name", hostname);
            endpoint.searchParams.set("type", type);
            const r = await network(endpoint, {
              redirect: "manual",
              headers: { Accept: "application/dns-json" },
              signal: AbortSignal.any([
                AbortSignal.timeout(6000),
                ...(signal ? [signal] : []),
              ]),
            });
            if (!r.ok) {
              await r.body?.cancel();
              throw new Error("Public DNS validation is unavailable.");
            }
            const data = JSON.parse(await boundedBody(r, 32000)) as {
              Status?: number;
              Answer?: { type: number; data: string }[];
            };
            if (data.Status !== 0)
              throw new Error("The provider hostname could not be resolved.");
            return (data.Answer || [])
              .filter((a) => a.type === 1 || a.type === 28)
              .map((a) => a.data);
          }),
        );
        const ips = answers.flat();
        if (!ips.length || ips.some((ip) => !publicAddress(ip)))
          throw new Error(
            "The provider hostname resolves to a private or reserved address.",
          );
      })();
      dns.set(hostname, pending);
    }
    await pending;
  }
  return async function read(raw: string): Promise<PublicDocument> {
    let url = raw;
    for (let hop = 0; hop < 4; hop++) {
      const parsed = new URL(url);
      const identityQuery =
        parsed.hostname === "www.wikidata.org" &&
        parsed.pathname === "/w/api.php" &&
        parsed.searchParams.get("action") === "wbsearchentities" &&
        [...parsed.searchParams.keys()].every((k) =>
          ["action", "search", "language", "format", "limit"].includes(k),
        ) &&
        parsed.searchParams.get("format") === "json";
      if (
        !safePublicUrl(url) ||
        parsed.protocol !== "https:" ||
        (parsed.search && !identityQuery) ||
        parsed.hash
      )
        throw new Error(
          "Research accepts public HTTPS documentation URLs without credentials or query strings.",
        );
      await validateHost(new URL(url).hostname);
      const response = await network(url, {
        method: "GET",
        redirect: "manual",
        headers: {
          Accept:
            "text/markdown, text/plain, text/html, application/xhtml+xml, application/json;q=0.8",
          "User-Agent":
            "OAuthAtlas/0.2 (+documentation research; bounded public GET)",
        },
        signal: AbortSignal.any([
          AbortSignal.timeout(12000),
          ...(signal ? [signal] : []),
        ]),
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const target = response.headers.get("location");
        await response.body?.cancel();
        if (!target)
          throw new Error("A redirect did not provide a destination.");
        url = new URL(target, url).href;
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(
          response.status === 401 || response.status === 403
            ? "The documentation requires access or blocks automated reading."
            : response.status === 429
              ? "The documentation host is rate limiting requests."
              : `The documentation returned HTTP ${response.status}.`,
        );
      }
      const contentType = (
        response.headers.get("content-type") || ""
      ).toLowerCase();
      if (
        !/text\/(html|plain|markdown)|application\/(xhtml\+xml|json)/.test(
          contentType,
        )
      ) {
        await response.body?.cancel();
        throw new Error("This documentation format is not supported.");
      }
      return {
        url,
        contentType,
        body: await boundedBody(response, 700000, true),
        retrievedAt: new Date().toISOString(),
      };
    }
    throw new Error("The documentation redirected too many times.");
  };
}
