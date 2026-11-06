import { validateProviderInput, safePublicUrl } from "./security";
import type { DocumentFetcher, PublicDocument } from "./public-fetch";
import { findDirectoryEntry } from "./provider-directory";

export type ProviderIdentity = {
  name: string;
  /** Registrable product domain, e.g. calendly.com. */
  domain: string;
  status: "resolved" | "ambiguous" | "unverified";
  domains: string[];
  /** Hosts established as the provider's documentation (directory or identity-verified). */
  docHosts?: string[];
  starts: string[];
  /** True when the entry point came from the curated directory rather than discovery. */
  curated?: boolean;
  /** Name-derived domains to probe when identity lookup fails. Results stay "unverified". */
  guessDomains?: string[];
  question: string;
  basis: string;
  identityReceipt?: PublicDocument;
};

const TWO_LEVEL = /\.(co|com|org|net|ac|gov)\.[a-z]{2}$/;
export function registrableDomain(hostname: string) {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  const labels = host.split(".");
  return labels.slice(TWO_LEVEL.test(host) ? -3 : -2).join(".");
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const docsLike = (u: URL) =>
  u.pathname !== "/" &&
  (/^(docs?|developers?|dev|api|support)\./.test(u.hostname) ||
    /^\/(developers?|docs|documentation|guides|reference|api|en\/apps)(\/|$)/.test(u.pathname));

type WikiHit = { id: string; label: string; description?: string; aliases?: string[] };
type Entity = { entities: Record<string, { claims?: { P856?: { mainsnak?: { datavalue?: { value?: string } } }[] } }> };

async function wikidataSearch(read: DocumentFetcher, query: string): Promise<WikiHit[]> {
  const endpoint = new URL("https://www.wikidata.org/w/api.php");
  endpoint.searchParams.set("action", "wbsearchentities");
  endpoint.searchParams.set("search", query);
  endpoint.searchParams.set("language", "en");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("limit", "6");
  // Fixed public identity API; provider input is a query value, never a destination.
  const search = JSON.parse((await read(endpoint.href)).body) as { search?: WikiHit[] };
  return (search.search || []).filter(
    (x) => /^Q\d+$/.test(x.id) && /software|application|platform|company|service|tool|website|app\b|business|brand/i.test(x.description || ""),
  );
}
async function officialWebsite(read: DocumentFetcher, id: string) {
  try {
    const receipt = await read(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`);
    const entity = JSON.parse(receipt.body) as Entity;
    const website = entity.entities?.[id]?.claims?.P856?.[0]?.mainsnak?.datavalue?.value;
    if (!website || !safePublicUrl(website)) return null;
    const url = new URL(website);
    url.protocol = "https:";
    url.search = "";
    url.hash = "";
    return { url, receipt };
  } catch {
    return null;
  }
}
const fromWebsite = (name: string, url: URL, receipt: PublicDocument, basis: string, extraStarts: string[] = []): ProviderIdentity => {
  const domain = registrableDomain(url.hostname);
  return {
    name,
    domain,
    status: "resolved",
    domains: [...new Set([url.hostname, domain])],
    starts: [...extraStarts, url.href],
    identityReceipt: receipt,
    question: "",
    basis,
  };
};

export async function resolveProvider(input: string, read: DocumentFetcher): Promise<ProviderIdentity> {
  validateProviderInput(input);
  const isWebsite = /[./]|^https?:/i.test(input);
  let supplied: URL | undefined;
  if (isWebsite) {
    supplied = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    supplied.protocol = "https:";
  }

  // 1. Curated directory: name or host → official domain and documentation hosts.
  const entry = findDirectoryEntry(input, supplied?.hostname);
  if (entry) {
    const starts = [
      ...(supplied && docsLike(supplied) ? [supplied.href] : []),
      ...(entry.start ? [entry.start] : entry.docs.map((d) => `https://${d}/`)),
    ];
    return {
      name: entry.name,
      domain: entry.domain,
      status: "resolved",
      domains: [...new Set([entry.domain, ...entry.docs])],
      docHosts: entry.docs,
      starts: [...new Set(starts)],
      curated: true,
      question: "",
      basis: "Curated provider directory (name → official domain and documentation host). Policy is fetched live, not stored.",
    };
  }

  // 2. A website was supplied: verify its domain against a public identity record.
  if (supplied) {
    const root = registrableDomain(supplied.hostname);
    try {
      const byLabel = await wikidataSearch(read, root.split(".")[0]);
      const byDomain = await wikidataSearch(read, root).catch(() => []);
      const hits = [...byDomain, ...byLabel].filter((h, i, all) => all.findIndex((x) => x.id === h.id) === i);
      for (const hit of hits.slice(0, 5)) {
        const site = await officialWebsite(read, hit.id);
        if (site && registrableDomain(site.url.hostname) === root)
          return {
            ...fromWebsite(
              hit.label,
              site.url,
              site.receipt,
              `Public identity record (Wikidata ${hit.id}) lists ${site.url.hostname} as the official website, matching the supplied domain.`,
              docsLike(supplied) ? [supplied.href] : [],
            ),
            domains: [...new Set([supplied.hostname, site.url.hostname, root])],
          };
      }
    } catch {
      /* identity lookup unavailable; fall through to an unverified result */
    }
    return {
      name: supplied.hostname.replace(/^(www|docs?|developers?|dev|api)\./, ""),
      domain: root,
      status: "unverified",
      domains: [...new Set([supplied.hostname, root])],
      starts: [supplied.href],
      question: "Confirm that this is the provider’s official documentation or website.",
      basis: "Website supplied by the visitor; ownership was not independently established.",
    };
  }

  // 3. Name only: public identity lookup.
  const candidates = await wikidataSearch(read, input);
  const exact = candidates.filter(
    (x) => x.label.toLowerCase() === input.toLowerCase() || x.aliases?.some((a) => a.toLowerCase() === input.toLowerCase()),
  );
  const choices = exact.length ? exact : candidates;
  if (choices.length === 1) {
    const site = await officialWebsite(read, choices[0].id);
    if (!site)
      return {
        name: choices[0].label,
        domain: "",
        status: "unverified",
        domains: [],
        starts: [],
        question: "Provide the official website; the identity record did not establish one.",
        basis: "No usable official-website statement in the identity record.",
      };
    return fromWebsite(
      choices[0].label,
      site.url,
      site.receipt,
      "Public identity record supplied the official website. Documentation is independently retrieved; no provider policy is inferred from Wikidata.",
    );
  }
  // Several candidates: keep only those whose official website matches the requested name.
  if (choices.length > 1) {
    const sites = await Promise.all(choices.slice(0, 4).map(async (c) => ({ c, site: await officialWebsite(read, c.id) })));
    const matching = sites.filter(
      (s) => s.site && slug(registrableDomain(s.site.url.hostname).split(".")[0]) === slug(input),
    );
    const domains = new Set(matching.map((m) => registrableDomain(m.site!.url.hostname)));
    if (matching.length && domains.size === 1) {
      const m = matching[0];
      return fromWebsite(
        m.c.label,
        m.site!.url,
        m.site!.receipt,
        `Several identity records matched “${input}”; only ${[...domains][0]} is an official website named after it (Wikidata ${m.c.id}).`,
      );
    }
  }
  const nameSlug = slug(input);
  return {
    name: input.slice(0, 100),
    domain: "",
    status: "ambiguous",
    domains: [],
    starts: [],
    // Last resort for unlisted names: probe obvious domains. Anything found stays "unverified".
    guessDomains:
      /^[a-z0-9][a-z0-9 ._-]{1,40}$/i.test(input.trim()) && nameSlug.length >= 3
        ? ["com", "io", "app", "so", "ai", "dev", "co"].map((tld) => `${nameSlug}.${tld}`)
        : undefined,
    question: `Enter the official website to identify the product${
      choices.length
        ? `. Possible matches: ${choices
            .slice(0, 3)
            .map((c) => `${c.label} (${c.description || "product"})`)
            .join("; ")}`
        : ". No unique software product was established"
    }.`,
    basis: "Public identity search did not establish one unique provider.",
  };
}
