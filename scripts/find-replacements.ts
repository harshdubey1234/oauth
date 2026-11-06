/**
 * For dead guide citations: tries candidate replacement URLs and accepts one only if it loads and
 * its text contains every required term for the claim it must support. Prints JSON.
 * argv[2]: JSON file of { key: { urls: string[], terms: string[] } }.
 */
import { readFileSync } from "node:fs";
import { createPublicFetcher } from "../lib/public-fetch";
import { parseDocument } from "../lib/docs-parser";

const spec: Record<string, { urls: string[]; terms: string[] }> = JSON.parse(readFileSync(process.argv[2], "utf8"));
const out: Record<string, { url: string; title: string; missing: string[] } | null> = {};
await Promise.all(
  Object.entries(spec).map(async ([key, { urls, terms }]) => {
    let best: { url: string; title: string; missing: string[] } | null = null;
    for (const url of urls) {
      try {
        const page = parseDocument(await createPublicFetcher()(url));
        const text = `${page.title}\n${page.text}`.toLowerCase();
        const missing = terms.filter((t) => !text.includes(t.toLowerCase()));
        const hit = { url: page.url, title: page.title.slice(0, 90), missing };
        if (!best || missing.length < best.missing.length) best = hit;
        if (!missing.length) break;
      } catch {
        /* next candidate */
      }
    }
    out[key] = best;
  }),
);
console.log(JSON.stringify(out, null, 1));
