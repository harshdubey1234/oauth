import {
  guideSchema,
  helpSchema,
  type Guide,
  type Scenario,
  type Claim,
  type Source,
} from "./schema";
import { createPublicFetcher, type DocumentFetcher } from "./public-fetch";
import {
  parseDocument,
  linkRelevance,
  relevantSections,
  type ResearchPage,
  type DocLink,
} from "./docs-parser";
import { resolveProvider, registrableDomain, type ProviderIdentity } from "./provider-identity";
import { digest, containsSecret, safePublicUrl } from "./security";
import type { Emit } from "./research";

type Input = { provider: string; scenario: Scenario };
type Limits = { maxSources: number; maxPages: number };
const claim = (text: string, ...evidenceIds: string[]): Claim => ({
  text,
  evidenceIds,
});
const belongs = (url: string, domains: string[]) =>
  domains.some(
    (d) =>
      new URL(url).hostname === d || new URL(url).hostname.endsWith(`.${d}`),
  );
const indexPage = (p: { url: string }) => /\/(?:llms(?:-full)?|_llms\/[\w.-]+)\.txt$/.test(p.url);
const canonical = (url: string) => url.replace(/\.md$/, "").replace(/\/$/, "");
function officialDocument(page: ResearchPage, identity: ProviderIdentity) {
  const url = new URL(page.url);
  if (url.hostname === "docs.composio.dev") return true;
  if (identity.status !== "resolved" || !belongs(page.url, identity.domains))
    return false;
  if (identity.docHosts?.some((h) => url.hostname === h)) return true;
  return (
    /^(docs?|developers?|api|support)\./.test(url.hostname) ||
    /^\/(developers|docs|documentation|guides|reference|oauth|llms\.txt)(\/|\.|$)/.test(
      url.pathname,
    )
  );
}
const topics = {
  oauth:
    /oauth\s*2(?:\.0)?|oauth2|authorization.code (?:flow|grant)|grant_type\s*[:=]\s*["']?authorization_code|https:\/\/\S+\/oauth\/(?:v\d\/)?authorize\b/i,
  oauth1: /oauth\s*1\.0|oauth1/i,
  static:
    /personal access token|internal (?:connection|integration).*token|api[- ]key authentication|authenticate.{0,40}api[- ]key|api token/i,
  registration:
    /creat(?:e|ing).{0,45}(?:app|integration|connection)|register(?:ing|ation)?.{0,35}(?:app|client|integration)|developer portal/i,
  callback:
    /redirect[_ -]uri|redirect url|callback url|authorization callback/i,
  permissions: /\bscopes?\b|\bcapabilit(?:y|ies)\b|permission/i,
  review:
    /marketplace|verification|app review|distribution|public integration|publish(?:ing)? your (?:app|integration)/i,
  partner:
    /oauth.{0,60}(?:only available to|restricted to).{0,35}(?:approved )?partner|only approved partners.{0,40}oauth/i,
  apiOnly:
    /only (?:supported |available )?(?:authentication|auth) (?:method|mechanism) is (?:an? )?api[- ]keys?|oauth(?: 2\.0)? (?:is|authentication is) not supported|does not support oauth/i,
};
type Topic = keyof typeof topics;
function role(
  link: DocLink,
): "auth" | "permissions" | "registration" | "launch" | "other" {
  const s = `${new URL(link.url).pathname} ${link.label}`;
  if (/scope|capabilit|permission/i.test(s)) return "permissions";
  if (/marketplace|distribut|review|verif|public.integration/i.test(s))
    return "launch";
  if (/register|create.*(?:app|integration|connection)/i.test(s))
    return "registration";
  if (/oauth|authoriz|authenticat/i.test(s)) return "auth";
  return "other";
}
function cleanScenario(s: Scenario): Scenario {
  return {
    ...s,
    actions: s.actions
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email omitted]")
      .slice(0, 600),
  };
}

export async function researchDocuments(
  input: Input,
  emit: Emit,
  limits: Limits,
  read: DocumentFetcher = createPublicFetcher(),
): Promise<Guide> {
  await emit(
    "identity",
    "Resolving the provider and its public documentation entry point.",
  );
  let identity: ProviderIdentity;
  try {
    identity = await resolveProvider(input.provider, read);
  } catch {
    identity = {
      name: input.provider.slice(0, 100),
      domain: "",
      status: "unverified",
      domains: [],
      starts: [],
      question:
        "Enter the provider’s official HTTPS website. Public identity lookup was unavailable.",
      basis: "Provider identity could not be established.",
    };
  }
  const pages: ResearchPage[] = identity.identityReceipt
    ? [
        {
          ...parseDocument(identity.identityReceipt),
          title: "Wikidata · provider identity record",
        },
      ]
    : [];
  const failures: string[] = [];
  const queue: DocLink[] = identity.starts.map((url) => ({
    url,
    label: "Documentation entry point",
  }));
  const seen = new Set<string>();
  const covered: Record<string, number> = {};
  const indexedHosts = new Set<string>();
  let reads = 0;
  if (identity.domain && identity.starts.every((u) => !u.endsWith("/llms.txt")))
    queue.push({
      url: `https://${identity.domain}/llms.txt`,
      label: "Documentation index",
    });
  await emit(
    "documentation",
    identity.domain
      ? `Retrieving public documentation for ${identity.name}; up to ${limits.maxPages} pages.`
      : "Provider needs clarification; preparing an honest result without invented instructions.",
  );
  /** Enqueue relevant provider links from a page (and an explicitly linked docs host). */
  const followLinks = (page: ResearchPage) => {
    for (const link of page.links) {
      // Nested documentation indexes (e.g. "API reference (437 pages)" → /_llms/api.txt) are
      // the cheapest way to reach the OAuth pages of a large docs site.
      const nestedIndex =
        /\/llms(?:-full)?\.txt$/.test(page.url) &&
        /\/_llms\/[\w.-]+\.txt$/.test(new URL(link.url).pathname) &&
        /auth|reference/i.test(link.label);
      const docsIndex = /^\/(?:(?:docs|developers?|api)\/)?llms\.txt$/.test(new URL(link.url).pathname);
      if (
        seen.has(canonical(link.url)) ||
        queue.some((q) => canonical(q.url) === canonical(link.url)) ||
        (!nestedIndex &&
          linkRelevance(link, input.scenario.actions) < 6 &&
          !/^(developers?|documentation|api(?: reference| documentation)?|docs)$/i.test(link.label) &&
          !docsIndex)
      )
        continue;
      if (/\/reference\/(?!capabilities|scopes|oauth|auth|permission)/.test(new URL(link.url).pathname))
        continue;
      const host = new URL(link.url).hostname;
      const trusted = belongs(link.url, identity.domains);
      if (
        !trusted &&
        /\b(?:developer|documentation|docs|api reference)\b/i.test(link.label) &&
        !/(github\.com|youtube\.com|twitter\.com|x\.com)$/.test(host)
      )
        identity.domains.push(host);
      if (belongs(link.url, identity.domains)) queue.push(link);
    }
  };
  const probe = async (urls: string[]) =>
    (await Promise.allSettled(urls.map((u) => read(u).then(parseDocument))))
      .flatMap((r) => (r.status === "fulfilled" ? [r.value] : []))
      .filter((p) => p.text.length >= 200 && /api|oauth|authenticat|developer|integration/i.test(p.text));
  // Unlisted name with no unique identity record: try the obvious domains, accept one only if its
  // homepage names the product, and keep the identity explicitly unverified.
  if (identity.status === "ambiguous" && identity.guessDomains?.length) {
    const guesses = identity.guessDomains.slice(0, 4);
    await emit("discovery", `No unique identity record for “${input.provider}”. Checking ${guesses.join(", ")} for a site that names it.`);
    const wanted = input.provider.trim().toLowerCase();
    const homes = (await Promise.allSettled(guesses.map((d) => read(`https://${d}/`).then(parseDocument))))
      .flatMap((r) => (r.status === "fulfilled" ? [r.value] : []))
      .filter((p) => /html/.test(p.contentType) && p.text.length >= 200)
      .filter((p) => `${p.title} ${p.text.slice(0, 3000)}`.toLowerCase().includes(wanted))
      // Several sites can share a name (raindrop.com vs raindrop.io): prefer the one that links
      // to developer docs or an API, since that is the product a developer means.
      .map((p) => ({
        p,
        score: p.links.some(
          (l) =>
            /^(api|apis|developers?|developer docs|docs|documentation|api docs|api reference)$/i.test(l.label) ||
            /^(developers?|docs|api)\./.test(new URL(l.url).hostname),
        )
          ? 1
          : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p);
    if (homes.length) {
      const home = homes[0];
      seen.add(canonical(home.url));
      const root = registrableDomain(new URL(home.url).hostname);
      Object.assign(identity, {
        status: "unverified",
        domain: root,
        domains: [...new Set([new URL(home.url).hostname, root])],
        starts: [],
        question: `Research inferred ${root} from the name “${input.provider}”. Confirm it is the product you meant, or enter its official website.`,
        basis: `No unique public identity record. ${root} names “${input.provider}” on its homepage, so research used it — treat the identity as unverified.`,
      });
      await emit("identity", `Using ${root} (inferred from the name; identity not verified).`);
      // The homepage is not evidence, but its "Developers"/"Docs" links are good leads.
      followLinks(home);
    }
  }
  // Discovery: providers usually keep OAuth docs on a developer host, not the marketing site.
  // Probe conventional hosts in two cheap stages; a failed probe is not evidence of anything.
  if (identity.domain && !identity.curated && identity.status !== "ambiguous") {
    const root = identity.domain;
    const fresh = (urls: string[]) => urls.filter((u) => !identity.starts.some((s) => canonical(s) === canonical(u)));
    await emit("discovery", `Looking for ${identity.name}’s developer documentation (developers.${root}, docs.${root}, …).`);
    let found = await probe(fresh(["developers", "docs", "developer"].map((h) => `https://${h}.${root}/llms.txt`)));
    if (!found.length)
      found = await probe(
        fresh([
          ...["developers", "docs", "developer"].map((h) => `https://${h}.${root}/`),
          `https://${root}/docs`,
          `https://${root}/developers`,
        ]),
      );
    const hits = found
      .filter((p, i, all) => all.findIndex((q) => canonical(q.url) === canonical(p.url)) === i)
      .sort((a, b) => Number(indexPage(b)) - Number(indexPage(a)))
      .slice(0, 3);
    if (hits.length) {
      // The marketing homepage rarely documents OAuth; keep the read budget for docs pages.
      for (let i = queue.length - 1; i >= 0; i--) {
        const u = new URL(queue[i].url);
        if (u.pathname === "/" && (u.hostname === root || u.hostname === `www.${root}`)) queue.splice(i, 1);
      }
    }
    for (const page of hits) {
      seen.add(canonical(page.url));
      pages.push(page);
      const host = new URL(page.url).hostname;
      if (!identity.domains.includes(host)) identity.domains.push(host);
      indexedHosts.add(host);
      followLinks(page);
      await emit("retrieved", `Found developer documentation: ${page.title.slice(0, 80)} (${host}).`);
    }
    if (!hits.length)
      await emit("discovery", "No conventional developer-documentation host responded; continuing from the official website.");
  }
  while (
    queue.length &&
    reads < limits.maxPages &&
    pages.length < limits.maxSources
  ) {
    // Index files first (they map the whole docs site cheaply), then the most relevant page for
    // a topic not yet covered.
    const indexBonus = (l: DocLink) => {
      const path = new URL(l.url).pathname;
      if (/^\/(?:(?:docs|developers?|api)\/)?llms\.txt$/.test(path)) return 12;
      if (/\/_llms\/[\w.-]+\.txt$/.test(path) && /auth|reference/i.test(l.label)) return 10;
      return 0;
    };
    const priority = (l: DocLink) =>
      linkRelevance(l, input.scenario.actions) + indexBonus(l) - (covered[role(l)] || 0) * 14;
    queue.sort((a, b) => priority(b) - priority(a));
    const next = queue.shift()!;
    if (seen.has(canonical(next.url))) continue;
    seen.add(canonical(next.url));
    reads++;
    try {
      const document = await read(next.url);
      const page = parseDocument(document);
      if (page.text.length < 60)
        throw new Error("No readable documentation content.");
      if (pages.some((p) => canonical(p.url) === canonical(page.url))) continue;
      pages.push(page);
      if (!indexPage(page))
        covered[role({ url: page.url, label: page.title })] =
          (covered[role({ url: page.url, label: page.title })] || 0) + 1;
      await emit(
        "retrieved",
        `Read ${page.title.slice(0, 100)} (${new URL(page.url).hostname}).`,
      );
      // Follow provider links, including an explicitly linked documentation host.
      followLinks(page);
      // Public doc sites commonly publish discovery indexes. A failed probe is not evidence.
      if (
        !indexedHosts.has(new URL(page.url).hostname) &&
        !next.url.endsWith("/llms.txt")
      ) {
        indexedHosts.add(new URL(page.url).hostname);
        const u = new URL("/llms.txt", page.url).href;
        if (
          !seen.has(canonical(u)) &&
          !queue.some((q) => canonical(q.url) === canonical(u))
        )
          queue.push({ url: u, label: "Documentation index" });
      }
    } catch (error) {
      const message =
        error instanceof Error &&
        /^(The documentation|Public DNS|The provider|Research accepts|This documentation|A redirect|The document|No readable)/.test(
          error.message,
        )
          ? error.message
          : "Public document retrieval did not complete.";
      failures.push(`${new URL(next.url).hostname}: ${message}`);
      await emit(
        "unavailable",
        `Could not read one documentation candidate from ${new URL(next.url).hostname}; continuing within the retrieval budget.`,
      );
    }
  }
  // General managed-auth guidance is useful but never establishes toolkit-specific availability.
  if (pages.length && pages.length < limits.maxSources) {
    try {
      const doc = await read("https://docs.composio.dev/toolkits/managed-auth");
      pages.push(parseDocument(doc));
    } catch {
      failures.push(
        "General Composio managed-auth page could not be retrieved.",
      );
    }
  }
  await emit(
    "requirements",
    "Extracting authentication, registration, permission, callback, and distribution findings from retrieved text.",
  );
  const guide = await buildDocumentGuide(input, identity, pages, failures);
  // A real, unauthenticated check of the documented authorization endpoint: does it exist and
  // what does it do without a registered client? Never sends credentials or a client id.
  const authorize = guide.attempts.find((a) => a.id === "authorize-probe");
  if (authorize) {
    const target = authorize.action.match(/https:\/\/\S+/)?.[0];
    if (target) {
      await emit("attempt", `Checking the documented authorization endpoint without credentials (${new URL(target).hostname}).`);
      try {
        const res = await read(target);
        const page = parseDocument(res);
        authorize.observation = `GET without a client returned a readable page (“${page.title.slice(0, 80)}”) — the endpoint exists; an actual authorization needs a registered client id and redirect URI.`;
        authorize.outcome = "observed";
      } catch (error) {
        const msg = error instanceof Error ? error.message : "";
        const code = msg.match(/HTTP (\d{3})/)?.[1];
        authorize.observation = code
          ? `GET without a client returned HTTP ${code}. That is expected for an authorization endpoint missing client_id/redirect_uri; it confirms the endpoint answers but not that a registration would succeed.`
          : /requires access|blocks automated/.test(msg)
            ? "The endpoint refused an anonymous automated request (401/403). A signed-in human with a registered client must continue."
            : /^Research accepts|redirect/i.test(msg)
              ? "The endpoint answered with a redirect (typically to a sign-in page carrying query parameters). The research fetcher stops there by design: signing in and consenting is a human step."
              : "The endpoint could not be reached by the research fetcher; this is not evidence that it is wrong.";
        authorize.outcome = code || /requires access|^Research accepts|redirect/i.test(msg) ? "observed" : "blocked";
      }
    }
  }
  await emit(
    "evidence",
    `Validated ${guide.sources.length} retrieved sources and ${guide.evidence.length} evidence entries. Unestablished requirements remain unknown.`,
  );
  return guideSchema.parse(guide);
}

export async function buildDocumentGuide(
  input: Input,
  identity: ProviderIdentity,
  pages: ResearchPage[],
  failures: string[],
): Promise<Guide> {
  const providerPages = pages.filter(
    (p) =>
      !indexPage(p) &&
      new URL(p.url).hostname !== "docs.composio.dev" &&
      (identity.status !== "resolved" || officialDocument(p, identity)),
  );
  // Prefer the page whose own title/URL is about the topic (e.g. "Creating an OAuth app" for
  // registration) over the first page that merely mentions it.
  const topicPage: Partial<Record<Topic, RegExp>> = {
    registration: /^(?!.*(subscription|webhook|push|event|role|member|scope|permission)).*(creat\w*|regist\w*|new|your|build\w*)\b.{0,20}\b(oauth|app|client|application|integration)\b|getting.started/i,
    permissions: /scope|permission|capabilit/i,
    callback: /redirect|callback|oauth|authoriz/i,
    review: /review|marketplace|distribut|publish|verif|listing/i,
    oauth: /oauth|authoriz|authenticat/i,
  };
  const findings = new Map<Topic, ResearchPage>();
  for (const [key, pattern] of Object.entries(topics) as [Topic, RegExp][]) {
    const matching = providerPages.filter((page) => pattern.test(page.text));
    const preferred = topicPage[key];
    const about = (p: ResearchPage, re: RegExp) => re.test(`${p.title} ${new URL(p.url).pathname}`);
    const best =
      (preferred && matching.find((p) => about(p, preferred))) ||
      matching.find((p) => about(p, /oauth|authoriz|authenticat/i)) ||
      matching[0];
    if (best) findings.set(key, best);
  }
  const sources: Source[] = await Promise.all(
    pages.map(async (p, i) => ({
      id: `doc${i + 1}`,
      title: p.title,
      url: p.url,
      retrievedAt: p.retrievedAt,
      retrieval: "page" as const,
      official: officialDocument(p, identity),
      contentHash: await digest(p.body),
      excerpt: (() => {
        const passage =
          relevantSections(
            p,
            /oauth|authorization|redirect|callback|permission|scope|capabilit|verification|distribut/i,
          )[0] || "";
        return containsSecret(passage)
          ? ""
          : passage.split(/\s+/).slice(0, 22).join(" ").slice(0, 370) +
              (passage.split(/\s+/).length > 22 ? "…" : "");
      })(),
    })),
  );
  const evidence: Guide["evidence"] = [
    {
      id: "unknown",
      kind: "unverified",
      sourceIds: [],
      note: "This requirement was not established by the bounded documentation review. Missing evidence is not proof that a requirement does not exist.",
      conditions:
        "Confirm with the provider’s current official documentation or an authorized project owner.",
      testId: null,
    },
    {
      id: "plan",
      kind: "unverified",
      sourceIds: [],
      note: "A practical planning action based on the supplied scenario; it is not a provider policy, completed setup, or approval.",
      conditions:
        "The developer must check actual endpoint behavior, account access, and project configuration.",
      testId: null,
    },
  ];
  const idFor = (page: ResearchPage) =>
    sources.find((s) => s.url === page.url)!.id;
  function supported(
    id: string,
    page: ResearchPage,
    note: string,
    conditions: string,
  ) {
    if (evidence.some((e) => e.id === id)) return id;
    const source = sources.find((s) => s.id === idFor(page))!;
    evidence.push({
      id,
      kind: source.official ? "official_docs" : "unverified",
      sourceIds: [source.id],
      note,
      conditions,
      testId: null,
    });
    return id;
  }
  const fact = (
    key: Topic,
    note: string,
    conditions = "Applies only to what the retrieved document establishes; this is not an account-specific approval.",
  ) => {
    const p = findings.get(key);
    return p ? supported(key, p, note, conditions) : "unknown";
  };
  const oauth = fact(
    "oauth",
    "The retrieved text explicitly describes OAuth 2.0 or its authorization-code flow. This identifies an authentication method, not every supported API action.",
  );
  const staticAuth = fact(
    "static",
    "The retrieved text documents static API credentials or internal/personal tokens alongside its authentication guidance.",
  );
  const registration = fact(
    "registration",
    "The retrieved text includes app, client, integration, or connection creation / registration guidance. The source is the authority for exact fields.",
  );
  const callback = fact(
    "callback",
    "The retrieved text discusses redirect URIs or callback URLs. Consult that section for exact matching and configuration rules.",
  );
  const permissions = fact(
    "permissions",
    "The retrieved text discusses scopes, capabilities, or permissions. Scope existence alone does not establish the minimum access for an unspecified endpoint.",
  );
  const review = fact(
    "review",
    "The retrieved text discusses distribution, review, verification, or Marketplace publication. This is evidence that the topic is documented, not that every app must complete that review.",
  );
  const partner = fact(
    "partner",
    "The retrieved text explicitly restricts OAuth access to partners. Eligibility still requires confirmation for the selected product.",
  );
  const oauth1 = fact(
    "oauth1",
    "The retrieved text explicitly identifies OAuth 1.0. Do not configure an OAuth 2.0 client from this finding.",
  );
  const apiOnly = fact(
    "apiOnly",
    "The retrieved document explicitly says OAuth is unsupported or API keys are its only authentication method. Confirm the API/product and version to which that statement applies.",
  );
  // Provider-specific details, quoted from the page that states them.
  const sentences = (p: ResearchPage) =>
    p.text
      .split(/\n+|(?<=[.!?])\s+(?=[A-Z`"“(])/)
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter((s) => s.length > 25 && s.length < 600 && !containsSecret(s));
  const quote = (s: string, words = 32) => {
    const w = s.split(" ");
    return `“${w.slice(0, words).join(" ")}${w.length > words ? "…" : ""}”`;
  };
  const detailPatterns: [string, string, RegExp][] = [
    ["fact-pkce", "PKCE", /\bPKCE\b|code_challenge/i],
    [
      "fact-lifetime",
      "Token lifetime",
      /(access|refresh)[ _-]?tokens?\b[^.]{0,90}?\b(expire|expires|expiry|valid|lifetime|lasts?)\b[^.]{0,60}?\b\d+\s*(seconds?|minutes?|hours?|days?|weeks?)\b/i,
    ],
    [
      "fact-redirect",
      "Redirect rules",
      /redirect[_ ]?(uri|url)s?\b[^.]{0,140}\b(https|exact(ly)?|must match|localhost|register(ed)?)\b/i,
    ],
    [
      "fact-cap",
      "User limit",
      /\b(up to|limited to|maximum of|no more than|at most|only)\s+\d[\d,]*\s+(?:[a-z-]+\s+){0,3}(users|accounts|installs?|installations|workspaces|athletes|organi[sz]ations|guilds|servers|stores|testers)\b/i,
    ],
    [
      "fact-review-time",
      "Published review time",
      /\b(review|verification|approval)\b[^.]{0,120}?\b\d+\s*(?:-|–|to)?\s*\d*\s*(business\s+)?(days?|weeks?)\b|\b\d+\s*(?:-|–|to)?\s*\d*\s*(business\s+)?(days?|weeks?)\b[^.]{0,80}?\b(review|verification|approval)\b/i,
    ],
    [
      "fact-refresh",
      "Refresh tokens",
      /refresh[_ ]tokens?\b[^.]{0,120}\b(offline_access|rotat|invalidat|single[- ]use|new refresh)/i,
    ],
  ];
  const details = new Map<string, { text: string; page: ResearchPage; id: string }>();
  for (const [key, label, pattern] of detailPatterns)
    for (const page of providerPages) {
      const s = sentences(page).find((x) => pattern.test(x));
      if (!s) continue;
      details.set(key, {
        text: s,
        page,
        id: supported(
          key,
          page,
          `${label} — the retrieved page states ${quote(s, 44)}`,
          "Quoted from the cited page. Confirm it applies to your app type, plan, and API version.",
        ),
      });
      break;
    }
  const endpoint = (kind: "authorize" | "token") => {
    for (const page of providerPages) {
      const hay = `${page.text}\n${page.codes.join("\n")}`;
      for (const m of hay.matchAll(
        /https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:\/[\w.~%-]+)*?\/(?:oauth2?|o|auth)(?:\/v\d+(?:\.\d+)?)?\/(authorize|token)\b/gi,
      )) {
        if (m[1].toLowerCase() !== kind) continue;
        try {
          if (!safePublicUrl(m[0]) || !belongs(m[0], identity.domains.length ? identity.domains : [new URL(page.url).hostname]))
            continue;
          // A link to a documentation page about the endpoint is not the endpoint itself.
          const host = new URL(m[0]).hostname;
          if (/^(docs?|developers?|dev|help|support|learn)\./.test(host) || identity.docHosts?.includes(host)) continue;
          if (pages.some((p) => canonical(p.url) === canonical(m[0]))) continue;
        } catch {
          continue;
        }
        return { url: m[0], page };
      }
    }
    return null;
  };
  const authorizeUrl = endpoint("authorize");
  const tokenUrl = endpoint("token");
  const endpointsId =
    authorizeUrl || tokenUrl
      ? supported(
          "fact-endpoints",
          (authorizeUrl || tokenUrl)!.page,
          `The retrieved page documents ${[authorizeUrl && `the authorization endpoint ${authorizeUrl.url}`, tokenUrl && `the token endpoint ${tokenUrl.url}`].filter(Boolean).join(" and ")}.`,
          "Endpoint URLs as published on the cited page; confirm region, API version, and any tenant-specific host.",
        )
      : null;
  const conflict =
    findings.has("apiOnly") &&
    (findings.has("oauth") || findings.has("oauth1"));
  const type: Guide["oauthSupport"]["type"] = conflict
    ? "unknown"
    : findings.has("partner")
      ? "partner_only"
      : findings.has("oauth")
        ? "oauth2"
        : findings.has("oauth1")
          ? "oauth1"
          : findings.has("apiOnly")
            ? "api_key"
            : "unknown";
  const scenario = cleanScenario(input.scenario);
  const external = scenario.audience === "customers";
  const supportedOauth = type === "oauth2" || type === "oauth1";
  const firstDoc = providerPages[0];
  const authFinding = conflict
    ? claim(
        "Retrieved authentication statements conflict: OAuth guidance and an explicit no-OAuth / API-key-only statement were both found. Resolve their product and version conditions before configuring a client.",
        oauth,
        apiOnly,
        "unknown",
      )
    : type === "api_key"
      ? claim(
          "The retrieved documentation explicitly rules out OAuth or identifies API keys as its only authentication method. No OAuth registration walkthrough is generated.",
          apiOnly,
        )
      : type === "partner_only"
        ? claim(
            "The retrieved documentation indicates partner-restricted OAuth access. Confirm eligibility before planning registration.",
            partner,
          )
        : supportedOauth
          ? claim(
              `The retrieved documentation describes ${type === "oauth2" ? "OAuth 2.0" : "OAuth 1.0"}${findings.has("static") ? " and also describes static/internal credentials" : ""}. Choose the method that matches the intended API access.`,
              type === "oauth2" ? oauth : oauth1,
              ...(findings.has("static") ? [staticAuth] : []),
            )
          : claim(
              findings.has("static")
                ? "Static credentials were found. Public OAuth registration was not established; this is not a conclusion that OAuth is unsupported."
                : "The retrieved documents did not establish a usable OAuth method. Provide an official authentication URL or ask the provider to clarify access.",
              "unknown",
              ...(findings.has("static") ? [staticAuth] : []),
            );
  const knownDocs = identity.docHosts?.[0];
  let nextAction =
    identity.question ||
    (!providerPages.length || (knownDocs && !supportedOauth && type === "unknown")
      ? knownDocs
        ? `Open https://${knownDocs}/ in a browser and find its OAuth / authentication guide — its pages could not be read automatically (they may need JavaScript or block automated readers).`
        : "Provide the provider’s official authentication documentation URL."
      : type === "api_key"
        ? "Review the documented API-key route for this API and confirm whether it fits your integration."
        : type === "partner_only"
          ? "Confirm partner eligibility with the provider through your authorized account."
          : findings.has("registration")
            ? "Open the registration instructions, choose the app owner, and record the exact required fields."
            : supportedOauth
              ? "Read the retrieved authorization instructions and confirm the registration entry point for your account."
              : "Confirm whether a developer-owned OAuth client is available for the API actions you need.");
  if (scenario.stage === "launch" && findings.has("review"))
    nextAction =
      "Open the distribution / review instructions and establish which conditions apply to your intended audience.";
  if (scenario.ownership === "managed")
    nextAction =
      "Check this toolkit’s managed auth method and scope coverage before registering your own provider app.";
  // Planning estimate: derived from how much of the flow the docs establish. Labelled as an estimate.
  const effortValue =
    supportedOauth && findings.has("registration") && (findings.has("callback") || authorizeUrl || tokenUrl)
      ? "1–3 hours"
      : supportedOauth
        ? "2–6 hours (docs incomplete)"
        : null;
  if (effortValue)
    evidence.push({
      id: "effort",
      kind: "estimate",
      sourceIds: [],
      note: "Planning estimate derived from what the retrieved docs establish (documented OAuth flow, app registration and callback guidance). It is not an observed setup duration.",
      conditions:
        "Experienced developer with a working backend, a test account and access to the provider console. Covers registration, configuration and one test call; excludes approvals, reviews and production hardening.",
      testId: null,
    });
  const reviewTime = details.get("fact-review-time");
  const waiting: Guide["externalWaiting"] = reviewTime
    ? [
        {
          label: "Provider review (published figure)",
          value: (reviewTime.text.match(/\d+\s*(?:-|–|to)?\s*\d*\s*(?:business\s+)?(?:days?|weeks?)/i)?.[0] || "See the cited source").trim(),
          basis: "provider_published",
          assumptions: `As stated: ${quote(reviewTime.text, 30)} Applies only if your app needs that review.`,
          evidenceIds: [reviewTime.id],
        },
      ]
    : findings.has("review")
      ? [
          {
            label: "Provider review / distribution, if it applies",
            value: "Duration not published in the retrieved docs",
            basis: "unknown",
            assumptions: "A review or distribution process is documented; whether it applies depends on your audience and requested permissions.",
            evidenceIds: [review, "unknown"],
          },
        ]
      : [
          {
            label: "Administrator / provider decisions, if applicable",
            value: external ? "No provider review found in the retrieved docs" : "None identified for this audience",
            basis: "unknown",
            assumptions: "Not finding a review process is not proof that none applies. Organization administrators may still need to approve access.",
            evidenceIds: ["unknown"],
          },
        ];
  const g: Guide = {
    id: crypto.randomUUID(),
    schemaVersion: 1,
    researchMethod: "docs",
    provider: {
      name: identity.name,
      domain: identity.domain,
      identityStatus: identity.status,
    },
    scenario,
    title:
      identity.status === "ambiguous"
        ? "Which provider did you mean?"
        : `${identity.name}: ${scenario.stage === "launch" ? "launch preparation" : "first connection"} path`,
    summary: providerPages.length
      ? `Live documentation review for ${scenario.actions || "an API integration"}. ${supportedOauth ? "OAuth guidance was retrieved." : "Authentication access needs clarification."} ${external ? "External launch requirements remain conditional on your audience, permissions, and data flow." : "Start with a controlled account and confirm organization access before wider use."}`
      : "The bounded research could not retrieve enough provider documentation. No registration walkthrough or scope list has been invented.",
    assumptions: [
      `Research method: deterministic live documentation discovery and extraction; no LLM or paid API was used.`,
      identity.basis,
      ...(!scenario.actions
        ? [
            "Intended actions were omitted; no scope is presented as the minimum necessary access.",
          ]
        : []),
      ...(scenario.audience === "unsure"
        ? [
            "Audience was not specified. Personal, organization, and external launch paths can differ.",
          ]
        : []),
      "No authenticated provider console, registration, connection, or review was performed.",
    ],
    researchStatus:
      identity.status === "ambiguous"
        ? "needs_clarification"
        : type === "partner_only" || type === "api_key"
          ? "unsupported"
          : "partial",
    oauthSupport: { type, finding: authFinding },
    managedAuth: {
      status: "unverified",
      finding: claim(
        "Toolkit-specific managed OAuth availability and the requested scope coverage were not established. General managed-auth documentation cannot answer those scenario-specific questions.",
        "unknown",
      ),
    },
    recommendedPath: supportedOauth
      ? claim(
          scenario.ownership === "managed"
            ? "Check managed OAuth coverage first; use the documented developer-owned path if it does not cover your requirements."
            : !external && findings.has("static")
              ? "Compare the documented internal/static credential path with OAuth. Use per-user authorization when your integration needs independent user connections."
              : "Use the documented OAuth path as a candidate for independent user connections. Confirm the exact permissions and audience policy before treating it as launch-ready.",
          type === "oauth2" ? oauth : oauth1,
          "plan",
        )
      : claim(
          "Resolve authentication and registration access before implementing a provider-specific OAuth flow.",
          "unknown",
        ),
    testing: {
      status: supportedOauth ? "action_needed" : "unknown",
      summary: supportedOauth
        ? claim(
            "An OAuth path is documented. Prepare a controlled test account, the documented app configuration, and an endpoint-level smoke test; no connection success is established.",
            type === "oauth2" ? oauth : oauth1,
            "plan",
          )
        : claim(
            "Test readiness cannot be established until the authentication and registration path is clear.",
            "unknown",
          ),
      nextAction,
    },
    launch: {
      status: external ? "conditional" : "unknown",
      summary: findings.has("review")
        ? claim(
            "Distribution or review guidance was retrieved. Establish which conditions apply to your audience and exact data access; neither a test nor registration is a launch approval.",
            review,
            "plan",
          )
        : claim(
            "The bounded review did not establish all launch or distribution requirements. Missing review evidence is not permission to launch.",
            "unknown",
          ),
      nextAction: external
        ? "Check distribution, requested permissions, administrator policy, and actual data flows before onboarding customers."
        : "Confirm the organization’s access policy and revisit the launch path if the audience expands.",
    },
    prerequisites: [
      {
        title: "An authorized provider account and app owner",
        owner: "developer",
        detail: claim(
          "Confirm who is allowed to register or configure the app and who can authorize the test account. Do not create organization resources without authority.",
          "plan",
        ),
      },
      {
        title: "A precise feature and API endpoint list",
        owner: "developer",
        detail: claim(
          "Write down the actual actions and endpoints. Use that list to justify permissions and choose the authentication method.",
          "plan",
        ),
      },
    ],
    permissions: [],
    steps: [],
    approvals: [],
    activeEffort: [
      effortValue
        ? {
            label: "App registration, configuration and first test call",
            value: effortValue,
            basis: "estimated",
            assumptions:
              "Experienced developer with a working backend and test account. Excludes approvals, reviews and production hardening.",
            evidenceIds: ["effort"],
          }
        : {
            label: "Configuration and first smoke test",
            value: "Not estimated from current evidence",
            basis: "unknown",
            assumptions:
              "Existing accounts, implementation, and permission requirements have not been tested.",
            evidenceIds: ["unknown"],
          },
    ],
    prerequisitesEffort: [
      {
        label: "Account, callback, and owner preparation",
        value: "Depends on the current project",
        basis: "unknown",
        assumptions:
          "No project infrastructure or account access was inspected.",
        evidenceIds: ["unknown"],
      },
    ],
    externalWaiting: waiting,
    blockers: [],
    nextAction,
    sources,
    evidence,
    attempts: [],
    unresolvedQuestions: [],
    researchedAt: new Date().toISOString(),
  };
  const permissionNames = new Map<string, ResearchPage>();
  for (const page of providerPages) {
    if (
      !topics.permissions.test(page.text) ||
      !(
        /scope|permission|capabilit/i.test(`${page.title} ${page.url}`) ||
        page.headings.some((h) => /scope|permission|capabilit/i.test(h))
      )
    )
      continue;
    const terms = [
      ...page.codes,
      ...Array.from(
        page.text.matchAll(
          /\b(Read content|Insert content|Update content|Read comments|Insert comments)\b/g,
        ),
        (m) => m[1],
      ),
    ];
    for (const term of terms) {
      const name = term.trim();
      if (containsSecret(name)) continue;
      if (
        /^(?:https:\/\/www\.googleapis\.com\/auth\/[\w.-]+|[a-z][\w.-]*:[a-z][\w.:-]*|[a-z][\w.]*(?:\.read|\.write|\.readonly|\.all|\.manage)|read|write|admin|offline_access|(?:read|insert|update)_content|Read content|Insert content|Update content|Read comments|Insert comments)$/.test(
          name,
        ) &&
        !permissionNames.has(name)
      )
        permissionNames.set(name, page);
    }
  }
  const wantsWrite = /send|post|creat|write|updat|edit|delet/i.test(
    scenario.actions,
  );
  let pool = [...permissionNames];
  const actionPattern = wantsWrite
    ? /write|insert|update|post|send|modify/i
    : /read|readonly/i;
  if (scenario.actions && pool.some(([name]) => actionPattern.test(name)))
    pool = pool.filter(([name]) => actionPattern.test(name));
  const contentFeature = /page|document|content/i.test(scenario.actions);
  if (
    contentFeature &&
    pool.some(([name]) => /content|page|document/i.test(name))
  )
    pool = pool.filter(([name]) => /content|page|document/i.test(name));
  const candidates = pool
    .sort(
      (a, b) =>
        Number(actionPattern.test(b[0])) - Number(actionPattern.test(a[0])),
    )
    .slice(0, 6);
  for (const [name, page] of candidates) {
    const ref = supported(
      `permission${g.permissions.length + 1}`,
      page,
      "This permission or capability identifier appears in retrieved provider documentation. Its applicability must be checked against the actual API endpoint.",
      "Candidate mapping only; presence in a document does not imply that it is required for this feature.",
    );
    g.permissions.push({
      name,
      rationale: claim(
        "Documented permission candidate. Confirm that the intended endpoint needs this access and exclude unused capabilities.",
        ref,
        "plan",
      ),
      condition:
        "Use only after checking the endpoint’s permission requirement; this is not an asserted minimum-scope set.",
    });
  }
  const addStep = (
    id: string,
    title: string,
    detail: Claim,
    path: "test" | "launch" | "both",
    completion: string,
    dependsOn: string[],
    page?: ResearchPage,
  ) =>
    g.steps.push({
      id,
      title,
      detail,
      owner: "developer",
      path,
      completion,
      dependsOn,
      ...(page ? { sourceUrl: page.url } : {}),
    });
  if (providerPages.length && identity.status !== "ambiguous") {
    addStep(
      "auth-choice",
      "Choose the documented authentication method",
      authFinding,
      "both",
      "The selected method fits the intended audience and endpoints; unknown access has been resolved.",
      [],
      findings.get("oauth") || findings.get("static") || firstDoc,
    );
    const regPage = findings.get("registration");
    const regSentence = regPage && sentences(regPage).find((x) => topics.registration.test(x));
    if (findings.has("registration"))
      addStep(
        "registration",
        `Register your app — follow “${regPage!.title.replace(/\s+[|·–-]\s+[^|·–-]*$/, "").slice(0, 70)}”`,
        claim(
          `Open the cited page and register the app under an authorized owner account.${regSentence ? ` It says ${quote(regSentence, 36)}` : ""} Record the exact required fields (name, redirect URI, scopes) before creating anything.`,
          registration,
          "plan",
        ),
        "test",
        "An authorized owner has prepared the provider-documented registration fields.",
        ["auth-choice"],
        findings.get("registration"),
      );
    if (findings.has("permissions"))
      addStep(
        "permissions",
        "Map each feature to documented permissions",
        claim(
          "Compare your endpoint list with the cited scope/capability reference. Remove permissions that your feature does not use.",
          permissions,
          "plan",
        ),
        "test",
        "Every requested permission has an endpoint and feature justification.",
        ["auth-choice"],
        findings.get("permissions"),
      );
    if (findings.has("callback"))
      addStep(
        "callback",
        "Confirm the exact redirect / callback configuration",
        claim(
          `Register the exact callback your backend (or custom auth config) uses and compare both sides before authorizing.${details.has("fact-redirect") ? ` The docs say ${quote(details.get("fact-redirect")!.text, 34)}` : ""}`,
          callback,
          ...(details.has("fact-redirect") ? [details.get("fact-redirect")!.id] : []),
          "plan",
        ),
        "test",
        "The actual callback is recorded and checked against the provider’s documented rules.",
        ["auth-choice"],
        findings.get("callback"),
      );
    if (supportedOauth && endpointsId) {
      const extra = (["fact-pkce", "fact-lifetime", "fact-refresh"] as const).filter((k) => details.has(k));
      addStep(
        "endpoints",
        "Wire the authorization-code exchange",
        claim(
          [
            `Send users to ${authorizeUrl ? authorizeUrl.url : "the documented authorization endpoint"} and exchange the returned code at ${tokenUrl ? tokenUrl.url : "the documented token endpoint"} from your backend only.`,
            details.has("fact-pkce") ? `PKCE: ${quote(details.get("fact-pkce")!.text, 24)}` : "",
            details.has("fact-lifetime") ? `Token lifetime: ${quote(details.get("fact-lifetime")!.text, 24)}` : "",
            details.has("fact-refresh") ? `Refresh: ${quote(details.get("fact-refresh")!.text, 24)}` : "",
          ]
            .filter(Boolean)
            .join(" "),
          endpointsId,
          ...extra.map((k) => details.get(k)!.id),
        ),
        "test",
        "Authorization redirects to the documented endpoint and the backend receives tokens; secrets and tokens never reach the browser.",
        ["auth-choice", ...(findings.has("callback") ? ["callback"] : [])],
        (authorizeUrl || tokenUrl)!.page,
      );
    }
    if (supportedOauth)
      addStep(
        "smoke-test",
        "Run one controlled authorization and API test",
        claim(
          "After completing the documented configuration, authorize a test account and call one necessary endpoint. Record the actual response without saving tokens or personal data here.",
          "plan",
        ),
        "test",
        "A real result is recorded by the developer; failures are diagnosed against the current documentation.",
        g.steps
          .filter((s) => s.path === "test")
          .map((s) => s.id)
          .concat("auth-choice"),
        findings.get("oauth"),
      );
    addStep(
      "launch-review",
      "Establish the requirements for your intended launch",
      g.launch.summary,
      "launch",
      "The owner confirms applicable consent, administrator, provider, and distribution requirements.",
      ["auth-choice"],
      findings.get("review") || firstDoc,
    );
    addStep(
      "data-flow",
      "Prepare a truthful data-flow and permission explanation",
      claim(
        "Describe which systems receive provider data, why each permission is needed, and what is actually stored. Use placeholders for facts not yet established.",
        "plan",
      ),
      "launch",
      "The developer has reviewed the real data flow and can substantiate each statement.",
      ["launch-review"],
    );
  }
  if (findings.has("review"))
    g.approvals.push({
      title: "Distribution / review applicability",
      kind: "distribution",
      owner: "developer",
      detail: claim(
        "A distribution or review document was found. Determine whether its stated conditions apply; no provider approval is asserted.",
        review,
        "plan",
      ),
    });
  g.approvals.push({
    title: "Account consent and organization policy",
    kind: "administrator",
    owner: "administrator",
    detail: claim(
      "Confirm who can authorize or approve access in the actual organization. Administrator approval and end-user consent are separate decisions.",
      "plan",
    ),
  });
  // Specific, sourced blockers first: the library card shows the first one.
  const cap = details.get("fact-cap");
  if (cap) {
    g.launch.summary = claim(
      `${g.launch.summary.text} The docs state a limit that matters before wider launch: ${quote(cap.text, 30)}`,
      ...g.launch.summary.evidenceIds,
      cap.id,
    );
    g.blockers.push({
      title: "New users stop connecting at the documented limit",
      owner: "developer",
      recovery: claim(
        `The provider documents a cap: ${quote(cap.text, 36)} Start the production / review request before you approach it.`,
        cap.id,
      ),
    });
  }
  if (findings.has("callback") && supportedOauth)
    g.blockers.push({
      title: "redirect_uri mismatch when authorizing",
      owner: "developer",
      recovery: claim(
        `The redirect URI in the authorization request must match the registered one (scheme, host, port, path, trailing slash).${details.has("fact-redirect") ? ` Provider rule: ${quote(details.get("fact-redirect")!.text, 30)}` : ""}`,
        callback,
        ...(details.has("fact-redirect") ? [details.get("fact-redirect")!.id] : []),
      ),
    });
  if (details.has("fact-lifetime"))
    g.blockers.push({
      title: "Calls start failing after the access token expires",
      owner: "developer",
      recovery: claim(
        `Token lifetime per the docs: ${quote(details.get("fact-lifetime")!.text, 30)} Store refresh tokens server-side and refresh before expiry.`,
        details.get("fact-lifetime")!.id,
        ...(details.has("fact-refresh") ? [details.get("fact-refresh")!.id] : []),
      ),
    });
  if (authorizeUrl)
    g.attempts.push({
      id: "authorize-probe",
      kind: "entry_point_check",
      at: new Date().toISOString(),
      action: `GET ${authorizeUrl.url} without credentials, client id or redirect URI.`,
      observation: "The check did not run.",
      outcome: "blocked",
      stoppedAt: "Before any sign-in, client registration or consent.",
      humanNext: "Register a client, then authorize one test account with the documented scopes.",
    });
  g.blockers.push({
    title: !providerPages.length
      ? "Provider documentation could not be established"
      : !g.permissions.length
        ? "Exact permission mapping is still unknown"
        : "Audience-specific launch requirements need confirmation",
    owner: "developer",
    recovery: claim(
      !providerPages.length
        ? "Retry with an official HTTPS authentication documentation URL. Login-gated documentation needs an authorized human to inspect it."
        : "Use the linked provider reference to check the exact endpoint, account type, and audience. If access or policy remains unclear, prepare a question for the provider or administrator.",
      "unknown",
    ),
  });
  if (firstDoc)
    g.attempts.push({
      id: "docs-review",
      kind: "documentation_review",
      at: g.researchedAt,
      action: `Retrieve and inspect ${providerPages.length} provider documentation pages.`,
      observation: `Public pages returned readable content. Authentication and configuration topics were extracted using explicit rules. No authenticated dashboard or API connection was attempted.`,
      outcome: "observed",
      stoppedAt: "Public documentation review only.",
      humanNext: g.nextAction,
    });
  if (providerPages.length) {
    const found = [
      supportedOauth && (type === "oauth2" ? "OAuth 2.0" : "OAuth 1.0"),
      findings.has("registration") && "app registration steps",
      g.permissions.length && `${g.permissions.length} scope candidates`,
      (authorizeUrl || tokenUrl) && "authorize/token endpoints",
      details.has("fact-pkce") && "PKCE",
      details.has("fact-lifetime") && "token lifetimes",
      findings.has("review") && "review / distribution rules",
      cap && "a user cap",
    ].filter(Boolean);
    g.summary = `Live research of ${providerPages.length} official page${providerPages.length === 1 ? "" : "s"}${found.length ? ` found ${found.join(", ")}` : ""}. ${
      external
        ? "External launch requirements stay conditional on your audience, permissions and data flow."
        : "Start with a controlled account and confirm organization access before wider use."
    }`.slice(0, 1800);
  }
  g.unresolvedQuestions = [
    ...(conflict
      ? [
          "Resolve conflicting authentication statements against the exact API, product version, and audience.",
        ]
      : []),
    ...(!supportedOauth
      ? [
          "Which authentication method and public registration path cover the intended API actions?",
        ]
      : []),
    ...(!g.permissions.length
      ? ["Which exact documented permissions are required by your endpoints?"]
      : []),
    "Does Composio provide a managed OAuth method with the exact required scope coverage?",
    external
      ? "Which external distribution / verification conditions apply to this product and data flow?"
      : "Which administrator policies apply to the actual organization?",
    ...(identity.status === "unverified" ? [identity.question] : []),
    ...failures.slice(0, 3),
    "This rule-based research cannot resolve every policy nuance or conflict. Review consequential requirements in the original sources.",
  ]
    .filter(Boolean)
    .slice(0, 16);
  return guideSchema.parse(g);
}

/** Evidence-grounded diagnostics work without a model or saved conversation. */
export async function documentHelp(
  g: Guide,
  stepId: string,
  problem: string,
  fresh: boolean,
  read: DocumentFetcher = createPublicFetcher(),
) {
  const step = g.steps.find((s) => s.id === stepId);
  if (!step) throw new Error("Unknown guide step.");
  const refs = step.detail.evidenceIds.filter((id) =>
    g.evidence.some((e) => e.id === id),
  );
  const sourceIds = new Set(
    g.evidence.filter((e) => refs.includes(e.id)).flatMap((e) => e.sourceIds),
  );
  const sources = g.sources.filter((s) => sourceIds.has(s.id));
  let freshNote = "";
  let livePage: ResearchPage | undefined;
  if (fresh && sources.length) {
    try {
      livePage = parseDocument(await read(sources[0].url));
      freshNote = `The selected source was retrieved again at ${livePage.retrievedAt}.`;
    } catch {
      freshNote =
        "Fresh source retrieval did not complete. Existing guide evidence is shown; it was not silently refreshed.";
    }
  }
  const normalized = problem.toLowerCase();
  let hypothesis =
    "Hypothesis: the observed setup does not yet match one of this step’s documented prerequisites. The error meaning has not been established.";
  let diagnostic = `Compare the current result with this completion criterion: ${step.completion}`;
  let action = `Use the selected step’s source and check the first unmet dependency: ${
    step.dependsOn
      .map((id) => g.steps.find((s) => s.id === id)?.title)
      .filter(Boolean)
      .join("; ") ||
    "the account owner, intended authentication method, and endpoint requirements"
  }.`;
  if (/redirect|callback|uri.mismatch/.test(normalized)) {
    hypothesis =
      "Hypothesis: the callback used in the authorization request differs from the app configuration, or violates a documented redirect rule.";
    diagnostic =
      "Compare the complete scheme, host, port, path, and trailing slash in the actual authorization request and provider configuration. Confirm which callback your auth backend uses.";
    action =
      "Open the cited callback instructions and correct only the value shown to differ. Re-run one test authorization; do not assume it succeeded.";
  } else if (
    /permission|scope|forbidden|403|denied|not.allowed|approval|not.authorized|repository.*missing|not.found/.test(
      normalized,
    )
  ) {
    hypothesis =
      "Hypothesis: a requested resource, permission, or installation is not available to this account, or organization policy requires approval. The reported error does not identify which condition by itself.";
    diagnostic =
      "Check the token’s intended account/workspace, the authorized resources, the exact endpoint permissions, and whether an administrator has approved that access.";
    action =
      "Ask the resource owner or administrator to confirm access using the permission justification in this guide. Request only the access needed for the selected endpoint.";
  } else if (
    /expired|refresh|invalid.token|401|invalid.grant/.test(normalized)
  ) {
    hypothesis =
      "Hypothesis: authorization has expired, been revoked, or belongs to a different app/account. The provider-specific error meaning still needs confirmation.";
    diagnostic =
      "Check the actual authorization time, project/app identity, publishing/test status, and the provider’s token-lifetime documentation. Never paste the token here.";
    action =
      "Follow the provider’s documented reauthorization or refresh procedure for this exact client. Record the next API result; do not treat a retry as proof of a fix.";
  }
  const terms = normalized.split(/\W+/).filter((w) => w.length > 3);
  const supported = g.evidence
    .filter(
      (e) =>
        e.kind === "official_docs" &&
        (refs.includes(e.id) ||
          terms.some((t) =>
            `${e.note} ${e.conditions}`.toLowerCase().includes(t),
          )),
    )
    .slice(0, 4);
  const answerRefs = [...new Set([...refs, ...supported.map((e) => e.id)])];
  const ids = new Set(
    g.evidence
      .filter((e) => answerRefs.includes(e.id))
      .flatMap((e) => e.sourceIds),
  );
  let additional = "";
  if (livePage) {
    const matches = relevantSections(
      livePage,
      /redirect|callback|scope|permission|token|authorization/,
    );
    if (matches.length)
      additional =
        " Fresh documentation includes relevant authorization / permission sections; use the original source to check exact conditions.";
  }
  return helpSchema.parse({
    hypothesis,
    diagnostic,
    action,
    owner: /approval|403|permission|forbidden|denied/.test(normalized)
      ? "administrator"
      : "developer",
    fallback:
      "If the diagnostic does not establish a cause, prepare a redacted reproduction with the app/account type, intended endpoint, and observed status. Ask the authorized owner or use the provider’s official support route; no support address is invented.",
    evidenceIds: answerRefs,
    sourceUrls: g.sources
      .filter((s) => ids.has(s.id))
      .map((s) => s.url)
      .slice(0, 6),
    limitations: `Deterministic evidence-guided diagnostic, not an LLM answer or a verified fix. ${freshNote}${additional} No credentials, conversation, or successful connection are stored.`,
  });
}
