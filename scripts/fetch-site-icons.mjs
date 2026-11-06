/**
 * For directory apps with no Simple Icons mark, downloads the icon each brand publishes on its own
 * official site (SVG icon, apple-touch-icon, or the largest declared icon) into public/logos/.
 * Run once by a maintainer; the app serves the saved files and never hotlinks provider sites.
 *
 *   node scripts/fetch-site-icons.mjs && node scripts/gen-logos.mjs   # provenance: docs/logo-sources.json
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from "node:fs";

// Product-specific hosts where the product icon differs from the parent company's homepage icon.
const hosts = {
  "Microsoft Outlook": ["outlook.live.com/owa/", "outlook.com"],
  "Microsoft Teams": ["teams.microsoft.com", "www.microsoft.com/en-us/microsoft-teams/group-chat-software"],
  OneDrive: ["onedrive.live.com/about/en-us/", "onedrive.live.com"],
  "Dropbox Sign": ["sign.dropbox.com"],
};

const directory = readFileSync("lib/provider-directory.ts", "utf8");
// Only the Simple Icons block counts; siteLogos (emitted below it) lists what this script saved.
const generated = readFileSync("lib/brand-logos.ts", "utf8").split("export const siteLogos")[0];
const entries = [...directory.matchAll(/\{ name: "([^"]+)"[^}]*?domain: "([^"]+)"/g)].map((m) => ({ name: m[1], domain: m[2] }));
const missing = entries.filter((e) => !generated.includes(`${JSON.stringify(e.name)}:`));
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 OAuthAtlasLogoFetch";
const get = (url) => fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,image/*,*/*" }, redirect: "follow", signal: AbortSignal.timeout(15000) });

function candidates(html, base) {
  const out = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = /rel=["']?([^"'>]+)/i.exec(tag)?.[1]?.toLowerCase() || "";
    if (!/icon/.test(rel) || /mask-icon/.test(rel)) continue;
    const href = /href=["']?([^"' >]+)/i.exec(tag)?.[1];
    if (!href || href.startsWith("data:")) continue;
    const sizes = /sizes=["']?([^"'>]+)/i.exec(tag)?.[1] || "";
    const size = Math.max(0, ...sizes.split(/\s+/).map((s) => Number.parseInt(s, 10) || 0));
    const type = /type=["']?([^"'>]+)/i.exec(tag)?.[1] || "";
    const url = new URL(href.replace(/&amp;/g, "&"), base).href;
    const svg = /svg/.test(type) || /\.svg(\?|$)/i.test(url);
    const score = svg ? 1000 : /apple-touch/.test(rel) ? 500 + size : size || 32;
    out.push({ url, score, svg });
  }
  out.push({ url: new URL("/favicon.ico", base).href, score: 1, svg: false });
  return out.sort((a, b) => b.score - a.score);
}

mkdirSync("public/logos", { recursive: true });
const results = {};
for (const e of missing) {
  const tries = hosts[e.name] || [`www.${e.domain}`, e.domain];
  let saved = null;
  for (const host of tries) {
    try {
      const page = await get(`https://${host}`);
      const html = page.ok ? await page.text() : "";
      for (const c of candidates(html, page.url || `https://${host}`)) {
        const res = await get(c.url).catch(() => null);
        if (!res?.ok) continue;
        const type = res.headers.get("content-type") || "";
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 100 || /text\/html/.test(type)) continue;
        const ext = /svg/.test(type) || c.svg ? "svg" : /png/.test(type) ? "png" : /webp/.test(type) ? "webp" : /jpe?g/.test(type) ? "jpg" : "ico";
        if (ext === "svg" && !/<svg/i.test(buf.toString("utf8"))) continue;
        for (const f of readdirSync("public/logos").filter((f) => f.startsWith(`${slug(e.name)}.`))) unlinkSync(`public/logos/${f}`);
        writeFileSync(`public/logos/${slug(e.name)}.${ext}`, buf);
        saved = { file: `/logos/${slug(e.name)}.${ext}`, from: c.url, bytes: buf.length };
        break;
      }
    } catch {}
    if (saved) break;
  }
  results[e.name] = saved;
  console.log(`${saved ? "OK  " : "MISS"} ${e.name.padEnd(18)} ${saved ? `${saved.file} (${saved.bytes} B) ← ${saved.from}` : ""}`);
}
writeFileSync("docs/logo-sources.json", JSON.stringify(results, null, 2));
if (existsSync("public/logos")) console.log(`\n${Object.values(results).filter(Boolean).length}/${missing.length} saved`);
