/**
 * Re-fetches every source cited by the prepared guides with the agent's public fetcher and records
 * whether it still loads. Writes outputs/source-recheck.json. Used to stamp truthful retrieval times.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { preparedGuides } from "../lib/guides";
import { createPublicFetcher } from "../lib/public-fetch";
import { digest } from "../lib/security";

const only = new Set(process.argv.slice(2));
const rows: { guide: string; id: string; url: string; ok: boolean; finalUrl?: string; at: string; hash?: string; error?: string }[] = [];
for (const g of preparedGuides) {
  if (only.size && !only.has(g.id)) continue;
  const read = createPublicFetcher(undefined, fetch, 200);
  await Promise.all(
    g.sources.map(async (s) => {
      const at = new Date().toISOString();
      try {
        const doc = await read(s.url);
        rows.push({ guide: g.id, id: s.id, url: s.url, ok: true, finalUrl: doc.url, at: doc.retrievedAt, hash: await digest(doc.body) });
      } catch (e) {
        rows.push({ guide: g.id, id: s.id, url: s.url, ok: false, at, error: (e as Error).message });
      }
    }),
  );
  const mine = rows.filter((r) => r.guide === g.id);
  console.log(`${g.id.padEnd(18)} ${mine.filter((r) => r.ok).length}/${mine.length} load${mine.some((r) => !r.ok) ? "  ✗ " + mine.filter((r) => !r.ok).map((r) => `${r.id} (${r.error})`).join("; ") : ""}`);
}
mkdirSync("outputs", { recursive: true });
writeFileSync("outputs/source-recheck.json", JSON.stringify(rows, null, 2));
