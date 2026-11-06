"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { PageLink } from "@/components/page-link";
import { ArrowRight, Search, Check, LoaderCircle, X, Info, ShieldCheck, Lock, Plus, SlidersHorizontal, TriangleAlert } from "lucide-react";
import type { Scenario } from "@/lib/schema";
import type { LibraryGuide } from "@/lib/library-summary";
import { AtlasScene } from "./atlas-scene";
import { providerDirectory } from "@/lib/provider-directory";

const curatedCount = providerDirectory.filter((e) => e.guide).length;
const directoryGroups = Object.entries(
  providerDirectory.reduce<Record<string, typeof providerDirectory>>((acc, e) => {
    (acc[e.category] ||= []).push(e);
    return acc;
  }, {}),
)
  .map(([group, entries]) => [group, [...entries].sort((a, b) => Number(Boolean(b.guide)) - Number(Boolean(a.guide)) || a.name.localeCompare(b.name))] as const)
  .sort((a, b) => b[1].length - a[1].length);

type Progress = { stage: string; detail: string; at: string };
const PAGE = 8;

const audienceTabs = [
  ["all", "All guides"],
  ["organization", "Team workflows"],
  ["customers", "Customer apps"],
  ["independent", "Independent pick"],
] as const;

function audienceChip(g: LibraryGuide): { label: string; tone: string } {
  if (g.id === "tally") return { label: "Independent pick", tone: "indie" };
  switch (g.scenario.audience) {
    case "organization": return { label: "Team workflow", tone: "team" };
    case "customers": return { label: "Customer app", tone: "customer" };
    case "me": return { label: "Personal use", tone: "other" };
    default: return { label: "Any audience", tone: "other" };
  }
}

const reviewed = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const Tick = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#121915" strokeWidth="1.8" aria-hidden="true">
    <path d="m3 8.5 3 3 7-7" />
  </svg>
);

export function Library({ guides, libraryError }: { guides: LibraryGuide[]; libraryError?: string }) {
  const [query, setQuery] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [provider, setProvider] = useState("");
  const [ctaProvider, setCtaProvider] = useState("");
  const [details, setDetails] = useState(false);
  const [scenario, setScenario] = useState<Scenario>({ actions: "", audience: "unsure", stage: "test", ownership: "unsure" });
  const [mode, setMode] = useState("docs");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<Progress[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const providerRef = useRef<HTMLInputElement>(null);
  const researchRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setMode((d as { mode: string }).mode))
      .catch(() => undefined);
    return () => controller.current?.abort();
  }, []);

  const filtered = guides.filter(
    (g) =>
      (audienceFilter === "all" ||
        (audienceFilter === "independent" ? g.id === "tally" : g.scenario.audience === audienceFilter)) &&
      (category === "all" || g.category === category) &&
      (difficulty === "all" || g.assessment.level === difficulty) &&
      `${g.provider.name} ${g.title} ${g.summary} ${g.scenario.actions} ${g.permissions.map((p) => p.name).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const visibleGuides = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visibleGuides.length;
  const categoryOptions = [...new Set(guides.map((g) => g.category))].sort();
  const filtersActive = Boolean(query) || audienceFilter !== "all" || category !== "all" || difficulty !== "all";
  const resetPaging = () => setVisibleCount(PAGE);
  const clearFilters = () => { setQuery(""); setCategory("all"); setAudienceFilter("all"); setDifficulty("all"); resetPaging(); };
  const patch = (value: Partial<Scenario>) => setScenario((s) => ({ ...s, ...value }));
  const isTest = scenario.stage === "test";

  async function research(name: string) {
    if (busy || name.trim().length < 2) return;
    setBusy(true);
    setError("");
    setEvents([]);
    setResult(null);
    controller.current = new AbortController();
    const jobId = crypto.randomUUID();
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": jobId },
        body: JSON.stringify({ provider: name, scenario }),
        signal: controller.current.signal,
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({
          error: "The research service returned an unreadable response. Please retry.",
        }))) as { error?: string };
        throw new Error(data.error || "Research could not start.");
      }
      if (!response.headers.get("content-type")?.includes("text/event-stream")) {
        const data = (await response.json()) as { error?: string; url?: string };
        if (data.url) {
          setResult(data.url);
          return;
        }
        throw new Error(data.error || "Research is already running.");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("The research stream was unavailable.");
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        buffer += decoder.decode(item.value, { stream: true });
        let split;
        while ((split = buffer.indexOf("\n\n")) >= 0) {
          const packet = buffer.slice(0, split);
          buffer = buffer.slice(split + 2);
          const kind = packet.split("\n").find((l) => l.startsWith("event: "))?.slice(7);
          const raw = packet.split("\n").find((l) => l.startsWith("data: "))?.slice(6);
          if (!raw) continue;
          const data = JSON.parse(raw);
          if (kind === "progress") setEvents((v) => [...v, data]);
          if (kind === "done") {
            completed = true;
            setResult(data.url);
          }
          if (kind === "error") {
            completed = true;
            setError(data.error);
          }
        }
      }
      if (!completed) {
        const recovered = (await fetch(`/api/jobs/${jobId}`).then((r) => r.json())) as { url?: string; error?: string };
        if (recovered.url) setResult(recovered.url);
        else throw new Error(recovered.error || "The connection ended before the guide was saved. Retry with your original input.");
      }
    } catch (err) {
      setError(
        err instanceof Error && err.name === "AbortError"
          ? "Research cancelled. Your input is still here."
          : err instanceof Error
            ? err.message
            : "Research could not complete.",
      );
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void research(provider);
  }

  function submitCta(e: FormEvent) {
    e.preventDefault();
    const name = ctaProvider.trim();
    if (name.length < 2) return;
    setProvider(name);
    researchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    void research(name);
  }

  function researchName(name: string) {
    setProvider(name);
    researchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    void research(name);
  }

  function researchFromSearch() {
    setProvider(query);
    providerRef.current?.focus();
    researchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="ax-home">
      {/* ================= HERO ================= */}
      <section className="ax-hero" aria-labelledby="hero-title">
        <svg className="ax-contours" aria-hidden="true" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#121915" strokeWidth="1">
          <g opacity="0.09">
            <path d="M1080 250 C1180 250 1260 320 1250 410 C1240 500 1160 560 1070 550 C980 540 920 480 925 400 C930 320 990 250 1080 250 Z" />
            <path d="M1080 170 C1240 165 1350 290 1335 420 C1320 560 1190 640 1060 630 C920 620 830 520 840 400 C850 270 950 175 1080 170 Z" />
            <path d="M1085 90 C1300 80 1440 250 1420 430 C1400 610 1230 720 1050 710 C860 700 745 560 760 400 C775 220 900 100 1085 90 Z" />
            <path d="M1090 10 C1360 0 1520 220 1500 440 C1480 660 1270 800 1040 790 C800 780 660 600 680 400 C700 180 850 20 1090 10 Z" />
            <path d="M120 640 C200 600 300 630 310 700 C320 770 230 820 140 800 C60 780 40 680 120 640 Z" />
            <path d="M100 560 C240 520 400 590 400 700 C400 810 260 880 120 860 C-20 840 -40 600 100 560 Z" />
            <path d="M90 470 C290 430 500 540 490 700 C480 860 280 940 100 920 C-80 900 -120 510 90 470 Z" />
          </g>
        </svg>

        <div className="ax-wrap ax-hero-grid">
          <div className="ax-hero-copy">
            <div className="ax-eyebrow">
              <span className="ax-eyebrow-square" />
              The connection workspace
            </div>
            <h1 id="hero-title">
              OAuth setup, <span className="ax-underline">mapped</span> before you write a line.
            </h1>
            <p className="ax-lede">
              Name a provider. Get the shortest path to your first working token — and every approval
              you’ll need before customers can connect. Each step links back to the official docs.
            </p>

            <form id="research" ref={researchRef} className="ax-research" onSubmit={submit} aria-label="Research a provider">
              <div className="ax-research-row">
                <label htmlFor="provider" className="ax-sr">Provider name or website</label>
                <div className="ax-input-wrap">
                  <Search size={18} aria-hidden="true" />
                  <input
                    id="provider"
                    ref={providerRef}
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="Provider name or website — e.g. linear.app"
                    autoComplete="off"
                    minLength={2}
                    maxLength={160}
                    required
                    disabled={busy}
                  />
                </div>
                <button type="submit" className="ax-btn-ember" disabled={busy}>
                  {busy ? (
                    <>
                      <LoaderCircle size={17} className="ax-spin" aria-hidden="true" />
                      Researching
                    </>
                  ) : (
                    <>
                      {isTest ? "Map test path" : "Map launch path"}
                      <ArrowRight size={16} aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>

              <div className="ax-research-meta">
                <div className="ax-toggle" role="group" aria-label="Scenario">
                  <button type="button" aria-pressed={isTest} onClick={() => patch({ stage: "test" })}>
                    <span className="ax-dot blue" />Just testing
                  </button>
                  <button type="button" aria-pressed={!isTest} onClick={() => patch({ stage: "launch" })}>
                    <span className="ax-dot ember" />Shipping to customers
                  </button>
                </div>
                <div className="ax-try">
                  <span>Try</span>
                  {["Notion", "Linear", "Discord"].map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="ax-chip"
                      disabled={busy}
                      onClick={() => {
                        setProvider(name);
                        providerRef.current?.focus();
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ax-research-foot">
                <p className="ax-hint">
                  {isTest
                    ? "Shortest route to a first working token on your own account — skip what only matters at launch."
                    : "Adds every review, verification and admin approval customers will hit before they can connect."}
                </p>
                <button type="button" className="ax-textbtn" aria-expanded={details} onClick={() => setDetails(!details)}>
                  <SlidersHorizontal size={13} aria-hidden="true" />
                  {details ? "Hide details" : "Add details"}
                </button>
              </div>

              {details && (
                <div className="ax-details">
                  <div className="ax-field wide">
                    <label htmlFor="actions">What should your agent do?</label>
                    <textarea
                      id="actions"
                      maxLength={600}
                      rows={2}
                      value={scenario.actions}
                      onChange={(e) => patch({ actions: e.target.value })}
                      placeholder="e.g. Read support tickets and create a weekly summary"
                    />
                    <div className="ax-examples">
                      Examples:
                      <button type="button" className="ax-chip" onClick={() => patch({ actions: "Read issues from selected private repositories" })}>Read issues</button>
                      <button type="button" className="ax-chip" onClick={() => patch({ actions: "Post a daily digest to a workspace channel" })}>Post a digest</button>
                    </div>
                  </div>
                  <div className="ax-field">
                    <label htmlFor="audience">Who will use it?</label>
                    <select id="audience" value={scenario.audience} onChange={(e) => patch({ audience: e.target.value as Scenario["audience"] })}>
                      <option value="unsure">Not sure</option>
                      <option value="me">Just me</option>
                      <option value="organization">My organization</option>
                      <option value="customers">External customers</option>
                    </select>
                  </div>
                  <div className="ax-field">
                    <label htmlFor="ownership">OAuth app preference</label>
                    <select id="ownership" value={scenario.ownership} onChange={(e) => patch({ ownership: e.target.value as Scenario["ownership"] })}>
                      <option value="unsure">Not sure — explain my options</option>
                      <option value="managed">Managed OAuth is acceptable</option>
                      <option value="own">I need my own OAuth app</option>
                    </select>
                  </div>
                </div>
              )}

              <p className="ax-privacy">
                <Lock size={13} aria-hidden="true" style={{ flex: "0 0 auto", marginTop: 2 }} />
                Generated guides are unlisted, but anyone with the link can view them. Describe the feature generically and leave out anything confidential.
              </p>
            </form>

            {(busy || events.length > 0 || result) && (
              <div className="ax-status" aria-live="polite">
                <div className="ax-status-head">
                  <strong>{result ? "Guide saved" : "Research activity"}</strong>
                  {busy && (
                    <button type="button" className="ax-textbtn" onClick={() => controller.current?.abort()}>
                      <X size={14} aria-hidden="true" />
                      Cancel
                    </button>
                  )}
                </div>
                {events.map((event, i) => (
                  <div className="ax-event" key={`${event.at}-${i}`}>
                    {busy && i === events.length - 1 ? <LoaderCircle size={15} className="ax-spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                    <span>{event.detail}</span>
                  </div>
                ))}
                {busy && !events.length && <div className="ax-event">Connecting to the research service…</div>}
                {result && (
                  <PageLink className="ax-btn-ember" href={result} style={{ alignSelf: "flex-start" }}>
                    Open your guide
                    <ArrowRight size={16} aria-hidden="true" />
                  </PageLink>
                )}
              </div>
            )}
            {error && (
              <div className="ax-error" role="alert">
                <Info size={18} aria-hidden="true" style={{ flex: "0 0 auto", marginTop: 2 }} />
                <div>
                  <strong>Research needs attention</strong>
                  <p>{error}</p>
                  <span>Your provider and scenario have been kept for retry.</span>
                </div>
              </div>
            )}

            <div className="ax-ticks">
              <span><Tick />Official sources only</span>
              <span><Tick />Unknowns labeled, not guessed</span>
              <span><Tick />{mode === "openai" ? "Live model-assisted research" : "No credentials, no API key"}</span>
            </div>
          </div>

          <AtlasScene />
        </div>
      </section>

      {/* ================= GUIDE ANATOMY ================= */}
      <section className="ax-dark" aria-labelledby="anatomy-title">
        <div className="ax-wrap ax-dark-grid">
          <div className="ax-dark-copy">
            <div className="ax-eyebrow">Inside a field guide</div>
            <h2 id="anatomy-title" className="ax-h2">Two paths. Never blurred together.</h2>
            <p>
              Every guide splits what you can do right now from what waits on someone else — and tags
              each claim with where it came from.
            </p>
            <ul className="ax-legend">
              <li><span className="ax-tag doc">Official docs</span>Stated in the provider’s own docs — linked, with the condition it applies under.</li>
              <li><span className="ax-tag cond">Estimate</span>Our planning figure, with its assumptions spelled out.</li>
              <li><span className="ax-tag unk">Unverified</span>The docs don’t say. We flag it instead of guessing.</li>
            </ul>
          </div>

          <div className="ax-sample-wrap">
            <div className="ax-sample-shadow" aria-hidden="true" />
            <article className="ax-sample" aria-label="Sample guide: GitHub">
              <div className="ax-sample-head">
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <span className="ax-mono-tile" style={{ width: 40, height: 40, fontSize: 18 }} aria-hidden="true">G</span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <strong>GitHub · Read private repo issues</strong>
                    <span className="ax-muted-mono" style={{ fontSize: 12 }}>docs.github.com · reviewed 6 Nov 2026</span>
                  </div>
                </div>
                <span className="ax-aud team">Team workflow</span>
              </div>

              <div className="ax-lanes">
                <div className="ax-lane">
                  <div className="ax-lane-head">
                    <span className="ax-lane-label blue"><span className="ax-dot blue" />TEST PATH</span>
                    <span>You · today</span>
                  </div>
                  <ol className="ax-steps">
                    <li><span className="ax-step-num">1</span><div className="ax-step-body">Choose a GitHub App over an OAuth App<span className="ax-tag doc">Official docs</span></div></li>
                    <li><span className="ax-step-num">2</span><div className="ax-step-body">Register your GitHub App<span className="ax-tag doc">Official docs</span></div></li>
                    <li><span className="ax-step-num">3</span><div className="ax-step-body"><span>Grant <code className="ax-code">Issues: read</code> only</span><span className="ax-tag doc">Official docs</span></div></li>
                    <li><span className="ax-step-num now">4</span><div className="ax-step-body">Install on one test repo and run a read-only call<span className="ax-tag doc">Official docs</span></div></li>
                  </ol>
                </div>
                <div className="ax-lane">
                  <div className="ax-lane-head">
                    <span className="ax-lane-label ember"><span className="ax-dot ember" />LAUNCH GATES</span>
                    <span>Waiting on others</span>
                  </div>
                  <ul className="ax-gates">
                    <li>
                      <div className="ax-gate-row"><span>Org owner approves org permissions</span><span>Org admin</span></div>
                      <span className="ax-tag doc">Official docs · if org access is requested</span>
                    </li>
                    <li>
                      <div className="ax-gate-row"><span>Each user authorizes the app</span><span>User</span></div>
                      <span className="ax-tag doc">Official docs · only for user tokens</span>
                    </li>
                    <li>
                      <div className="ax-gate-row"><span>How long approval takes</span><span>Organization</span></div>
                      <span className="ax-tag unk">Unverified · organization-dependent</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="ax-watch-band">
                <TriangleAlert size={18} aria-hidden="true" style={{ flex: "0 0 auto", marginTop: 2 }} />
                <p>
                  <strong>WATCH FOR</strong>A private repository is missing — check that the installation includes that
                  repository and the installer has permission.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ================= LIBRARY ================= */}
      <section id="guides" className="ax-section" aria-labelledby="library-title">
        <div className="ax-wrap ax-library">
          <div className="ax-library-head">
            <div>
              <div className="ax-eyebrow">The field guides · {guides.length}</div>
              <h2 id="library-title" className="ax-h2">Good connections start here.</h2>
            </div>
            <p>
              Each guide is checked against public provider docs. Open one to see the test path, launch
              gates and the problem you’re most likely to hit first.
            </p>
          </div>

          <div className="ax-toolbar">
            <div className="ax-tabs" role="group" aria-label="Filter guides by audience">
              {audienceTabs.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={audienceFilter === value}
                  onClick={() => { setAudienceFilter(value); resetPaging(); }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="ax-filters">
              <label className="ax-search">
                <Search size={16} aria-hidden="true" />
                <input
                  aria-label="Search guide library"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); resetPaging(); }}
                  placeholder="Find a provider or scope"
                />
                {query && (
                  <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); resetPaging(); }}>
                    <X size={14} />
                  </button>
                )}
              </label>
              <label htmlFor="cat" className="ax-sr">Filter guides by category</label>
              <select id="cat" className="ax-select" value={category} onChange={(e) => { setCategory(e.target.value); resetPaging(); }}>
                <option value="all">All categories</option>
                {categoryOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <label htmlFor="difficulty" className="ax-sr">Filter guides by difficulty</label>
              <select id="difficulty" className="ax-select" value={difficulty} onChange={(e) => { setDifficulty(e.target.value); resetPaging(); }}>
                <option value="all">Any difficulty</option>
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="hard">Hard</option>
                <option value="unclear">Unclear</option>
              </select>
            </div>
          </div>

          <div className="ax-count">
            <span role="status">
              {visibleGuides.length} of {filtered.length} shown{filtered.length !== guides.length && ` · ${guides.length} in library`}
            </span>
            {filtersActive && (
              <button type="button" className="ax-textbtn" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>

          {libraryError && <p role="status" className="ax-note">{libraryError}</p>}

          {filtered.length > 0 ? (
            <div className="ax-grid">
              {visibleGuides.map((g) => {
                const aud = audienceChip(g);
                return (
                  <PageLink key={g.id} className="ax-card" href={`/guides/${g.id}`}>
                    <div className="ax-card-top">
                      <div className="ax-card-id">
                        <span className={`ax-mono-tile${g.id === "tally" ? " ember" : ""}`} aria-hidden="true">
                          {g.provider.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <h3>{g.provider.name}</h3>
                          <span className="ax-card-domain">{g.provider.domain}</span>
                        </div>
                      </div>
                      <span className={`ax-aud ${aud.tone}`}>{aud.label}</span>
                    </div>
                    <p className="ax-card-title">{g.title}</p>
                    <p className="ax-card-summary">{g.summary}</p>
                    <div className="ax-card-watch">
                      <span>WATCH FOR</span>
                      <span>{g.blockers[0]?.title || g.unresolvedQuestions[0] || "Confirm the scenario requirements"}</span>
                    </div>
                    <div className="ax-card-foot">
                      <span className="ax-card-meta">
                        <span className="ax-card-assess">
                          <span className={`ax-diff ${g.assessment.level}`}>{g.assessment.label}</span>
                          <span>{g.assessment.handsOn} hands-on</span>
                        </span>
                        <span>{g.category} · reviewed {reviewed(g.researchedAt)}</span>
                      </span>
                      <span className="ax-arrow-box" aria-hidden="true">
                        <ArrowRight size={16} />
                      </span>
                    </div>
                  </PageLink>
                );
              })}
            </div>
          ) : (
            <div className="ax-empty">
              <Search size={24} aria-hidden="true" />
              <h3>{query ? `No prepared guide for “${query}”` : "No guides match this filter"}</h3>
              <p>{query ? "Research it live from current official sources." : "Try another audience or category."}</p>
              <button type="button" className="ax-btn-outline" onClick={query.trim() ? researchFromSearch : clearFilters}>
                {query.trim() ? "Research this provider" : "Show all guides"}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          {remaining > 0 && (
            <div className="ax-more">
              <button type="button" className="ax-btn-outline" onClick={() => setVisibleCount((n) => n + PAGE)}>
                <Plus size={15} aria-hidden="true" />
                Show {Math.min(PAGE, remaining)} more guides
                <span className="ax-muted-mono">{remaining} left</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ================= 100-APP DIRECTORY ================= */}
      <section id="directory" className="ax-section" aria-labelledby="directory-title">
        <div className="ax-wrap ax-directory">
          <div className="ax-directory-head">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="ax-eyebrow">The directory · {providerDirectory.length} OAuth apps</div>
              <h2 id="directory-title" className="ax-h2">Every app, one click from a guide.</h2>
            </div>
            <p>
              {curatedCount} have a reviewed guide. For the other {providerDirectory.length - curatedCount}, the agent knows the
              official developer-docs host and researches a fresh, shareable guide when you click.
            </p>
          </div>
          <div className="ax-directory-legend">
            <span><span className="ax-dir-item curated" aria-hidden="true" style={{ height: 18, padding: "0 6px" }}>Aa</span>Reviewed guide</span>
            <span><span className="ax-dir-item" aria-hidden="true" style={{ height: 18, padding: "0 6px" }}>Aa</span>Research live (~5–10 s)</span>
          </div>
          <div className="ax-dir-groups">
            {directoryGroups.map(([group, entries]) => (
              <div className="ax-dir-group" key={group}>
                <h3>
                  {group}
                  <span>{entries.length}</span>
                </h3>
                <div className="ax-dir-items">
                  {entries.map((e) =>
                    e.guide ? (
                      <PageLink key={e.name} className="ax-dir-item curated" href={`/guides/${e.guide}`}>
                        {e.name}
                      </PageLink>
                    ) : (
                      <button
                        key={e.name}
                        type="button"
                        className="ax-dir-item"
                        disabled={busy}
                        onClick={() => researchName(e.name)}
                        aria-label={`Research ${e.name} live`}
                      >
                        {e.name}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PRINCIPLES ================= */}
      <section className="ax-section" aria-labelledby="principles-title">
        <div className="ax-wrap ax-principles">
          <h2 id="principles-title" className="ax-h2">
            Built for the part of an integration that happens before the first API call.
          </h2>
          <div className="ax-principle-grid">
            <div className="ax-principle">
              <div className="ax-principle-art">
                <svg width="240" height="160" viewBox="0 0 240 160" aria-hidden="true" stroke="#121915" strokeWidth="1.5" strokeLinejoin="round">
                  <path d="M80 90 L160 60" fill="none" strokeDasharray="5 5" />
                  <path d="M80 90 L165 126" fill="none" strokeDasharray="5 5" />
                  <polygon points="80,70 120,90 80,110 40,90" fill="#FFFFFF" />
                  <polygon points="40,90 80,110 80,126 40,106" fill="#DCDFD8" />
                  <polygon points="80,110 120,90 120,106 80,126" fill="#C5CAC1" />
                  <polygon points="160,44 192,60 160,76 128,60" fill="#7A92F0" />
                  <polygon points="128,60 160,76 160,104 128,88" fill="#2447D6" />
                  <polygon points="160,76 192,60 192,88 160,104" fill="#1A36A8" />
                  <polygon points="165,110 197,126 165,142 133,126" fill="#E8501A" />
                  <polygon points="133,126 165,142 165,154 133,138" fill="#B93A0B" />
                  <polygon points="165,142 197,126 197,138 165,154" fill="#8F2C07" />
                </svg>
              </div>
              <h3>Your scenario changes the path</h3>
              <p>
                A test on your own account and a launch to customers hit different gates. Guides keep them
                apart, so “it works for me” never gets mistaken for “it’s ready”.
              </p>
            </div>
            <div className="ax-principle">
              <div className="ax-principle-art">
                <svg width="240" height="170" viewBox="0 0 240 170" aria-hidden="true" stroke="#121915" strokeWidth="1.5" strokeLinejoin="round">
                  <polygon points="120,90 180,120 120,150 60,120" fill="#F2F3EF" stroke="#8A918B" />
                  <polygon points="60,120 120,150 120,158 60,128" fill="#E7E9E3" stroke="#8A918B" />
                  <polygon points="120,150 180,120 180,128 120,158" fill="#DCDFD8" stroke="#8A918B" />
                  <polygon points="120,55 180,85 120,115 60,85" fill="#FFFFFF" strokeDasharray="5 4" />
                  <polygon points="60,85 120,115 120,123 60,93" fill="#DCDFD8" />
                  <polygon points="120,115 180,85 180,93 120,123" fill="#C5CAC1" />
                  <polygon points="120,20 180,50 120,80 60,50" fill="#121915" />
                  <polygon points="60,50 120,80 120,88 60,58" fill="#3A433D" />
                  <polygon points="120,80 180,50 180,58 120,88" fill="#2A322D" />
                  <polygon points="120,38 136,46 120,54 104,46" fill="#E8501A" stroke="none" />
                </svg>
              </div>
              <h3>Every claim carries a label</h3>
              <p>
                Official docs, estimate or unverified. Inspect the source and its conditions, and see plainly
                what the docs leave unanswered.
              </p>
            </div>
            <div className="ax-principle">
              <div className="ax-principle-art">
                <svg width="240" height="160" viewBox="0 0 240 160" aria-hidden="true" stroke="#121915" strokeWidth="1.5" strokeLinejoin="round">
                  <polygon points="80,44 112,60 80,76 48,60" fill="#7A92F0" />
                  <polygon points="48,60 80,76 80,146 48,130" fill="#2447D6" />
                  <polygon points="80,76 112,60 112,130 80,146" fill="#1A36A8" />
                  <polygon points="160,74 192,90 160,106 128,90" fill="none" stroke="#B93A0B" strokeDasharray="4 4" />
                  <polygon points="128,90 160,106 160,146 128,130" fill="none" stroke="#B93A0B" strokeDasharray="4 4" />
                  <polygon points="160,106 192,90 192,130 160,146" fill="none" stroke="#B93A0B" strokeDasharray="4 4" />
                  <circle cx="160" cy="44" r="14" fill="#FFFFFF" stroke="#B93A0B" />
                  <path d="M160 36v8l5 4" fill="none" stroke="#B93A0B" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Work time ≠ waiting time</h3>
              <p>
                See what you can build today and what waits on an admin, a reviewer or the provider — so
                the slow approvals start first.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section aria-labelledby="cta-title">
        <div className="ax-wrap ax-cta-wrap">
          <div className="ax-cta">
            <div className="ax-cta-copy">
              <h2 id="cta-title" className="ax-h2">Provider not in the library?</h2>
              <p>Research it live from public docs. Free, no model key, and you leave with a next action.</p>
            </div>
            <form onSubmit={submitCta} aria-label="Research a provider not in the library">
              <div className="ax-cta-row">
                <label htmlFor="provider2" className="ax-sr">Provider name or website</label>
                <input
                  id="provider2"
                  value={ctaProvider}
                  onChange={(e) => setCtaProvider(e.target.value)}
                  placeholder="e.g. hubspot.com"
                  autoComplete="off"
                  minLength={2}
                  maxLength={160}
                  required
                  disabled={busy}
                />
                <button type="submit" className="ax-btn-ember" disabled={busy}>
                  Research a guide
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
              <p className="ax-cta-note">
                <ShieldCheck size={15} aria-hidden="true" />
                Generated guides are unlisted, but anyone with the link can view them. Describe the feature
                generically and leave out anything confidential.
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
