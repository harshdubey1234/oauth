/**
 * Confirms candidate OAuth entry pages for directory apps with the same public fetcher the agent
 * uses. A candidate is accepted only if it loads and its text describes OAuth. Prints JSON.
 */
import { readFileSync } from "node:fs";
import { createPublicFetcher } from "../lib/public-fetch";
import { parseDocument } from "../lib/docs-parser";

/** argv[2]: path to a JSON file of { "App name": ["candidate url", ...] }. */
const candidates: Record<string, string[]> = JSON.parse(readFileSync(process.argv[2], "utf8"));
const oauth = /oauth\s*2|oauth2|authorization.code|\/oauth2?\/(?:v\d\/)?authorize|oauth 1\.0|oauth1/i;
const result: Record<string, { url: string; title: string } | null> = {};
await Promise.all(
  Object.entries(candidates).map(async ([name, urls]) => {
    for (const url of urls) {
      try {
        const page = parseDocument(await createPublicFetcher()(url));
        if (page.text.length > 300 && oauth.test(page.text)) {
          result[name] = { url: page.url, title: page.title.slice(0, 80) };
          return;
        }
      } catch {
        /* try the next candidate */
      }
    }
    result[name] = null;
  }),
);
console.log(JSON.stringify(result, null, 1));
