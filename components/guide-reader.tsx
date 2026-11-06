"use client";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { PageLink } from "@/components/page-link";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  HelpCircle,
  Info,
  Link2,
  LockKeyhole,
  MessageSquare,
  Route,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
  LoaderCircle,
  Copy,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import type { Claim, Guide } from "@/lib/schema";
import { audienceLabels, evidenceLabels } from "@/lib/product";
import { guideMarkdown, setupPack } from "@/lib/export";
import { assessGuide, agentSplit } from "@/lib/assessment";
import { ProviderIcon } from "./provider-icon";

const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("atlas-checklist", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("atlas-checklist", callback);
  };
};
function useChecklist(id: string) {
  const key = `atlas-checklist:${id}`;
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) || "[]";
      } catch {
        return "[]";
      }
    },
    () => "[]",
  );
  let done: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      done = parsed.filter((v) => typeof v === "string");
  } catch {}
  return {
    done,
    toggle: (step: string) => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify(
            done.includes(step)
              ? done.filter((v) => v !== step)
              : [...done, step],
          ),
        );
        window.dispatchEvent(new Event("atlas-checklist"));
      } catch {
        /* Optional browser progress; no shared state depends on this. */
      }
    },
  };
}
function Evidence({ claim, guide }: { claim: Claim; guide: Guide }) {
  return (
    <div className="evidence-labels">
      {claim.evidenceIds.map((id) => {
        const e = guide.evidence.find((e) => e.id === id);
        if (!e)
          return (
            <span key={id} className="evidence-badge unverified">
              Unverified
            </span>
          );
        return (
          <details key={id} className="evidence-detail">
            <summary className={`evidence-badge ${e.kind}`}>
              {e.kind === "official_docs" ? (
                <FileCheck2 size={11} />
              ) : e.kind === "estimate" ? (
                <Clock3 size={11} />
              ) : e.kind === "tested" ? (
                <CheckCircle2 size={11} />
              ) : (
                <Info size={11} />
              )}
              <span>{evidenceLabels[e.kind]}</span>
              <ChevronRight size={10} />
            </summary>
            <div className="evidence-popover">
              <strong>{evidenceLabels[e.kind]}</strong>
              <p>{e.note}</p>
              <p>
                <b>Conditions</b> {e.conditions}
              </p>
              {e.sourceIds.map((sid) => {
                const s = guide.sources.find((s) => s.id === sid);
                return (
                  s && (
                    <div className="evidence-source" key={sid}>
                      <a href={s.url} target="_blank" rel="noreferrer">
                        {s.title}
                        <ArrowUpRight size={13} />
                      </a>
                      <small>
                        Retrieved {date(s.retrievedAt)} ·{" "}
                        {s.retrieval === "page"
                          ? "Page retrieved"
                          : "Search lead only"}
                      </small>
                      <small className="source-url">{s.url}</small>
                      {s.excerpt && (
                        <blockquote className="source-excerpt">
                          {s.excerpt}
                          <small>
                            Short source excerpt — inspect the original for
                            context.
                          </small>
                        </blockquote>
                      )}
                      {s.contentHash && (
                        <small className="source-fingerprint">
                          Content fingerprint: {s.contentHash.slice(0, 16)}…
                        </small>
                      )}
                    </div>
                  )
                );
              })}
              {e.testId && (
                <p>
                  Observation:{" "}
                  {guide.attempts.find((t) => t.id === e.testId)?.observation}
                </p>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
function date(at: string) {
  return new Date(at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
function ClaimText({ value, guide }: { value: Claim; guide: Guide }) {
  return (
    <>
      <p>{value.text}</p>
      <Evidence claim={value} guide={guide} />
    </>
  );
}
function Owner({ owner }: { owner: string }) {
  return (
    <span className="owner">
      <UserRound size={12} />
      {owner}
    </span>
  );
}
function download(name: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/markdown;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const guideSections = [
  ["paths", "Test vs launch"],
  ["auth", "Authentication path"],
  ["prerequisites", "Prerequisites"],
  ["steps", "Setup steps"],
  ["permissions", "Permissions"],
  ["approvals", "Approvals"],
  ["effort", "Effort & waiting"],
  ["blockers", "Blockers"],
  ["evidence", "Evidence & sources"],
  ["pack", "Setup pack"],
] as const;

/** Table of contents that highlights the section currently being read. */
function SectionNav() {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      // A section is "current" once its top passes a reading line ~30% down the viewport.
      const line = window.innerHeight * 0.3;
      let current = "";
      for (const [id] of guideSections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      // At the very bottom, the last section can't scroll up to the line — select it anyway.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom) current = guideSections[guideSections.length - 1][0];
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav aria-label="Guide sections">
      {guideSections.map(([id, label]) => (
        <a
          href={`#${id}`}
          key={id}
          className={active === id ? "active" : undefined}
          aria-current={active === id ? "location" : undefined}
          onClick={() => setActive(id)}
        >
          {label}
          <ChevronRight size={12} />
        </a>
      ))}
    </nav>
  );
}

function AtAGlance({ guide: g }: { guide: Guide }) {
  const a = assessGuide(g);
  const split = agentSplit(g);
  return (
    <section className="ax-glance" aria-labelledby="glance-title">
      <h2 id="glance-title" className="ax-sr">
        At a glance
      </h2>
      <div className="ax-glance-top">
        <div className="ax-glance-cell">
          <span className="ax-glance-label">Difficulty for this scenario</span>
          <span className={`ax-diff ${a.level}`}>{a.label}</span>
          <ul>
            {a.why.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
        <div className="ax-glance-cell">
          <span className="ax-glance-label">Hands-on time</span>
          <strong>{a.handsOn}</strong>
          <small>Basis: {a.handsOnBasis} · to a first working test</small>
        </div>
        <div className="ax-glance-cell">
          <span className="ax-glance-label">Waiting on others</span>
          <strong>{a.waiting}</strong>
          <small>Basis: {a.waitingBasis} · reviews and admins, not your work</small>
        </div>
      </div>
      <div className="ax-glance-split">
        <div>
          <span className="ax-glance-label">
            <Sparkles size={13} aria-hidden="true" /> What the agent did
          </span>
          <ul>
            {split.did.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
        <div>
          <span className="ax-glance-label">
            <Sparkles size={13} aria-hidden="true" /> What it can do for you now
          </span>
          <ul>
            {split.can.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
        <div>
          <span className="ax-glance-label">
            <UserRound size={13} aria-hidden="true" /> Where you take over
          </span>
          {split.you.map((group) => (
            <div key={group.who} className="ax-handoff">
              <strong>{group.who}</strong>
              <ul>
                {group.items.slice(0, 4).map((i) => (
                  <li key={i}>{i}</li>
                ))}
                {group.items.length > 4 && <li>+{group.items.length - 4} more in the setup path</li>}
              </ul>
            </div>
          ))}
          {!split.you.length && <p>No human steps were established yet — see open questions.</p>}
        </div>
      </div>
    </section>
  );
}

export function GuideReader({
  guide: g,
  prepared = false,
}: {
  guide: Guide;
  prepared?: boolean;
}) {
  const [path, setPath] = useState<"test" | "launch">(g.scenario.stage);
  const [helpStep, setHelpStep] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const [packMessage, setPackMessage] = useState("");
  const { done, toggle } = useChecklist(g.id);
  const steps = g.steps.filter((s) => s.path === path || s.path === "both");
  const nextStep = steps.find((s) => !done.includes(s.id));
  async function share() {
    try {
      await navigator.clipboard.writeText(location.href);
      setShareMessage("Link copied");
    } catch {
      setShareMessage(`Copy this address: ${location.href}`);
    }
  }
  return (
    <div className="guide-page">
      <div className="guide-breadcrumb">
        <PageLink href="/">
          <ArrowLeft size={14} />
          Guide library
        </PageLink>
        <span>/</span>
        <span>{g.provider.name}</span>
      </div>
      <div className="guide-heading">
        <div className="inline">
          <ProviderIcon name={g.provider.name} large />
          <div>
            <div className="page-eyebrow">
              {g.provider.name.toUpperCase()} FIELD GUIDE
              {g.id === "tally" && (
                <span className="independent-pick">INDEPENDENT PICK</span>
              )}
            </div>
            <h1>{g.title}</h1>
          </div>
        </div>
        <div className="guide-actions">
          <button
            className="button secondary small"
            onClick={() =>
              download(
                `${g.provider.name.toLowerCase()}-guide.md`,
                guideMarkdown(g),
              )
            }
          >
            <Download size={15} />
            Export
          </button>
          <button className="button secondary small" onClick={share}>
            <Link2 size={15} />
            Share guide
          </button>
        </div>
      </div>
      <p className="guide-summary">{g.summary}</p>
      <div className="guide-meta">
        <span className="pill teal">
          <FileCheck2 size={12} />
          {g.researchMethod === "docs"
            ? "Live docs extraction · no paid API"
            : g.researchMethod === "model"
              ? "Model-assisted research"
              : "Prepared research snapshot"}
        </span>
        <span>
          <Clock3 size={13} />
          Researched {date(g.researchedAt)}
        </span>
        <span>
          <UserRound size={13} />
          {audienceLabels[g.scenario.audience]}
        </span>
        <span className="pill neutral">
          {g.researchStatus === "needs_clarification"
            ? "Needs clarification"
            : g.researchStatus === "unsupported"
              ? "OAuth path unsupported"
              : g.researchStatus === "partial"
                ? "Docs + open questions"
                : "Research complete"}
        </span>
      </div>
      {shareMessage && (
        <p role="status" className="copy-status">
          {shareMessage}
        </p>
      )}
      <AtAGlance guide={g} />
      <div className="guide-layout">
        <article className="guide-article">
          <section className="next-action">
            <span className="icon-tile">
              <ArrowRight size={20} />
            </span>
            <div>
              <span className="page-eyebrow">YOUR NEXT ACTION</span>
              <h2>{g.nextAction}</h2>
              <a href="#steps" className="text-button">
                Open the setup path
                <ArrowRight size={14} />
              </a>
            </div>
          </section>
          <details className="assumptions">
            <summary>
              <Info size={16} />
              The scenario and assumptions behind this guide
              <span>{g.assumptions.length} assumptions</span>
            </summary>
            <div>
              <p>
                <strong>Intended action:</strong>{" "}
                {g.scenario.actions ||
                  "Not specified — paths remain conditional."}
              </p>
              <p>
                <strong>OAuth preference:</strong>{" "}
                {g.scenario.ownership === "own"
                  ? "Developer-owned app"
                  : g.scenario.ownership === "managed"
                    ? "Managed OAuth acceptable"
                    : "Not specified"}
              </p>
              <ul>
                {g.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              {prepared && (
                <p>
                  This prepared example has a fixed scenario. Use live research
                  from the library to create a different scenario.
                </p>
              )}
            </div>
          </details>
          <section id="paths" className="guide-section">
            <div className="section-heading">
              <div>
                <span className="page-eyebrow">TWO DIFFERENT MILESTONES</span>
                <h2>A first test. An intended launch.</h2>
              </div>
              <Route size={23} />
            </div>
            <div className="readiness-grid">
              {(["test", "launch"] as const).map((p) => {
                const value = p === "test" ? g.testing : g.launch;
                return (
                  <div
                    key={p}
                    className={`readiness-card ${value.status === "blocked" ? "blocked" : ""}`}
                  >
                    <span className="readiness-kicker">
                      {p === "test" ? "01 / GET CONNECTED" : "02 / GO FURTHER"}
                    </span>
                    <h3>
                      {p === "test"
                        ? "Get a first connection working"
                        : "Prepare for your intended launch"}
                    </h3>
                    <span
                      className={`pill ${value.status === "blocked" ? "amber" : "teal"}`}
                    >
                      {value.status.replaceAll("_", " ")}
                    </span>
                    <ClaimText value={value.summary} guide={g} />
                    <div className="path-next">
                      <strong>Next step</strong>
                      <p>{value.nextAction}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section id="auth" className="guide-section">
            <div className="section-heading">
              <h2>Choose your authentication path</h2>
              <LockKeyhole size={20} />
            </div>
            <div className="content-card">
              <h3>Recommended approach</h3>
              <ClaimText value={g.recommendedPath} guide={g} />
              <div className="card-divider" />
              <h3>
                OAuth support{" "}
                <span className="pill neutral">
                  {g.oauthSupport.type.replaceAll("_", " ")}
                </span>
              </h3>
              <ClaimText value={g.oauthSupport.finding} guide={g} />
              <div className="card-divider" />
              <h3>
                Could managed OAuth help?{" "}
                <span className="pill neutral">{g.managedAuth.status}</span>
              </h3>
              <ClaimText value={g.managedAuth.finding} guide={g} />
              <p className="subtle-note">
                Your product, the provider’s app registration, and each user’s
                authorized connection are distinct. Managed OAuth does not
                remove consent, administrator policy, or every launch
                requirement.
              </p>
            </div>
          </section>
          <section id="prerequisites" className="guide-section">
            <h2>Before you start</h2>
            <div className="prerequisite-list">
              {g.prerequisites.length ? (
                g.prerequisites.map((p, i) => (
                  <div className="prerequisite" key={p.title}>
                    <span className="number-tag">0{i + 1}</span>
                    <div>
                      <h3>{p.title}</h3>
                      <ClaimText value={p.detail} guide={g} />
                    </div>
                    <Owner owner={p.owner} />
                  </div>
                ))
              ) : (
                <p className="content-card">
                  Prerequisites could not be established. Confirm official
                  registration access before proceeding.
                </p>
              )}
            </div>
          </section>
          <section id="steps" className="guide-section">
            <div className="section-heading">
              <div>
                <span className="page-eyebrow">MAKE PROGRESS</span>
                <h2>Your setup path</h2>
              </div>
              <span className="local-progress">
                <CheckCircle2 size={14} />
                {steps.filter((s) => done.includes(s.id)).length}/{steps.length}{" "}
                checked
              </span>
            </div>
            <div className="path-tabs" role="tablist" aria-label="Setup path">
              <button
                role="tab"
                aria-selected={path === "test"}
                onClick={() => setPath("test")}
              >
                First connection
              </button>
              <button
                role="tab"
                aria-selected={path === "launch"}
                onClick={() => setPath("launch")}
              >
                Intended launch
              </button>
            </div>
            <p className="subtle-note">
              Checklist is saved only in this browser. Checking a box records
              your progress; it does not verify a connection or approval.
            </p>
            <div className="step-list">
              {steps.length ? (
                steps.map((s, i) => (
                  <div
                    className={`setup-step ${done.includes(s.id) ? "is-done" : ""}`}
                    key={s.id}
                  >
                    <button
                      className="step-check"
                      aria-label={`${done.includes(s.id) ? "Uncheck" : "Complete"} ${s.title}`}
                      aria-pressed={done.includes(s.id)}
                      onClick={() => toggle(s.id)}
                    >
                      {done.includes(s.id) ? (
                        <Check size={17} />
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </button>
                    <div className="step-body">
                      <div className="step-title">
                        <h3>{s.title}</h3>
                        <Owner owner={s.owner} />
                      </div>
                      <ClaimText value={s.detail} guide={g} />
                      {s.sourceUrl && (
                        <a
                          className="step-source"
                          href={s.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open source instructions
                          <ArrowUpRight size={13} />
                        </a>
                      )}
                      <details className="completion-detail">
                        <summary>Completion criterion & dependencies</summary>
                        <p>{s.completion}</p>
                        <p>
                          <b>Depends on:</b>{" "}
                          {s.dependsOn
                            .map(
                              (d) =>
                                g.steps.find((s) => s.id === d)?.title || d,
                            )
                            .join("; ") || "No earlier step."}
                        </p>
                      </details>
                      <button
                        className="stuck-button"
                        onClick={() => setHelpStep(s.id)}
                      >
                        <MessageSquare size={14} />
                        I’m stuck here
                        <ArrowUpRight size={12} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="content-card">
                  <Info size={20} />
                  <p>
                    No verified {path} walkthrough is available for this result.
                    Follow the next action and unresolved questions.
                  </p>
                </div>
              )}
            </div>
          </section>
          <section id="permissions" className="guide-section">
            <h2>Permissions with a purpose</h2>
            <p>
              Map each permission to an actual feature. Broader access is not a
              shortcut.
            </p>
            <div className="permission-table">
              {g.permissions.length ? (
                g.permissions.map((p) => (
                  <div key={p.name}>
                    <code>{p.name}</code>
                    <ClaimText value={p.rationale} guide={g} />
                    <small>
                      <strong>Applies when:</strong> {p.condition}
                    </small>
                  </div>
                ))
              ) : (
                <p>
                  No permission mapping established. Do not guess scope names.
                </p>
              )}
            </div>
          </section>
          <section id="approvals" className="guide-section">
            <h2>Who needs to say yes?</h2>
            <div className="approval-list">
              {g.approvals.map((a) => (
                <div className="content-card" key={a.title}>
                  <span className="pill neutral">{a.kind}</span>
                  <div className="step-title">
                    <h3>{a.title}</h3>
                    <Owner owner={a.owner} />
                  </div>
                  <ClaimText value={a.detail} guide={g} />
                </div>
              ))}
              {!g.approvals.length && (
                <p>Approval requirements remain unknown.</p>
              )}
            </div>
          </section>
          <section id="effort" className="guide-section">
            <h2>Plan the work. Separate the waiting.</h2>
            <p>
              Estimates are conditional. Reviews can overlap; there is no
              combined approval countdown.
            </p>
            <div className="effort-list">
              {[
                {
                  title: "Active developer effort",
                  icon: Clock3,
                  items: g.activeEffort,
                },
                {
                  title: "Prerequisite work",
                  icon: FileCheck2,
                  items: g.prerequisitesEffort,
                },
                {
                  title: "External waiting",
                  icon: UserRound,
                  items: g.externalWaiting,
                },
              ].map(({ title, icon: Icon, items }) => (
                <div className="content-card" key={title}>
                  <h3>
                    <Icon size={17} />
                    {title}
                  </h3>
                  {items.length ? (
                    items.map((e) => (
                      <div className="effort-item" key={e.label}>
                        <strong>{e.value}</strong>
                        <p>{e.label}</p>
                        <small>
                          Basis: {e.basis.replaceAll("_", " ")} ·{" "}
                          {e.assumptions}
                        </small>
                        <Evidence
                          claim={{ text: e.label, evidenceIds: e.evidenceIds }}
                          guide={g}
                        />
                      </div>
                    ))
                  ) : (
                    <p>No defensible estimate established.</p>
                  )}
                </div>
              ))}
            </div>
          </section>
          <section id="blockers" className="guide-section">
            <h2>If something blocks you</h2>
            {g.blockers.map((b) => (
              <div className="blocker-card" key={b.title}>
                <AlertTriangle size={17} />
                <div>
                  <h3>{b.title}</h3>
                  <ClaimText value={b.recovery} guide={g} />
                  <Owner owner={b.owner} />
                </div>
              </div>
            ))}
            <details className="content-card">
              <summary>Useful work while waiting</summary>
              <p>
                The agent can prepare scope justifications and this setup pack.
                The developer confirms actual endpoints and data flows.
                Administrators decide organization access; providers decide
                review outcomes.
              </p>
              {g.steps
                .filter((s) => s.path === "launch")
                .map((s) => (
                  <div className="waiting-task" key={s.id}>
                    <b>{s.title}</b>
                    <Owner owner={s.owner} />
                    <p>
                      Dependencies:{" "}
                      {s.dependsOn
                        .map((d) => g.steps.find((x) => x.id === d)?.title)
                        .join("; ") || "None recorded"}
                    </p>
                    <small>Done when: {s.completion}</small>
                  </div>
                ))}
            </details>
          </section>
          <section id="evidence" className="guide-section">
            <div className="section-heading">
              <h2>Evidence & limitations</h2>
              <ShieldCheck size={20} />
            </div>
            <div className="notice">
              <Info size={18} />
              <p>
                Official documentation supports individual claims. It does not
                prove registration, connection success, or approval.{" "}
                {g.attempts.some(
                  (a) => a.kind === "connection" && a.outcome === "succeeded",
                )
                  ? "Inspect individual test records for their precise scope."
                  : "No successful OAuth connection was attempted for this guide."}
              </p>
            </div>
            <h3 className="subheading">What remains unknown</h3>
            <ul className="unknown-list">
              {g.unresolvedQuestions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            <h3 className="subheading">Actual attempts</h3>
            {g.attempts.length ? (
              g.attempts.map((a) => (
                <details className="attempt" key={a.id}>
                  <summary>
                    <span className="pill neutral">
                      {a.kind.replaceAll("_", " ")}
                    </span>
                    <span>{a.action}</span>
                  </summary>
                  <div>
                    <p>
                      <b>When:</b> {date(a.at)}
                    </p>
                    <p>
                      <b>Observed:</b> {a.observation}
                    </p>
                    <p>
                      <b>Outcome:</b> {a.outcome}
                    </p>
                    <p>
                      <b>Stopped at:</b> {a.stoppedAt}
                    </p>
                    <p>
                      <b>Human next:</b> {a.humanNext}
                    </p>
                  </div>
                </details>
              ))
            ) : (
              <p>
                No practical setup attempt recorded. This result comes from the
                research workflow only.
              </p>
            )}
            <h3 className="subheading">
              Retrieved sources{" "}
              <span className="count-badge">{g.sources.length}</span>
            </h3>
            <div className="source-list">
              {g.sources.map((s, i) => (
                <a key={s.id} href={s.url} target="_blank" rel="noreferrer">
                  <span className="source-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <strong>{s.title}</strong>
                    <small>
                      {new URL(s.url).hostname} · {date(s.retrievedAt)} ·{" "}
                      {s.retrieval === "page"
                        ? "Page retrieved"
                        : "Search lead only"}
                    </small>
                  </span>
                  <ExternalLink size={14} />
                </a>
              ))}
            </div>
          </section>
          <section id="pack" className="guide-section setup-pack">
            <div className="inline">
              <span className="icon-tile">
                <Sparkles size={19} />
              </span>
              <div>
                <span className="page-eyebrow">LET THE AGENT PREPARE</span>
                <h2>Start with a setup pack</h2>
              </div>
            </div>
            <p>
              App-description draft, scope justifications, callback checklist,
              and review preparation. Unknown facts stay as explicit
              placeholders.
            </p>
            <div className="inline">
              <button
                className="button primary"
                onClick={() =>
                  download(
                    `${g.provider.name.toLowerCase()}-setup-pack.md`,
                    setupPack(g),
                  )
                }
              >
                <Download size={15} />
                Download setup pack
              </button>
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(setupPack(g));
                    setPackMessage("Setup pack copied.");
                  } catch {
                    setPackMessage(
                      "Clipboard unavailable. Use Download setup pack.",
                    );
                  }
                }}
              >
                <Copy size={15} />
                Copy pack
              </button>
            </div>
            {packMessage && <p role="status">{packMessage}</p>}
            <p className="subtle-note">
              Nothing is submitted or sent. You own the final facts and provider
              configuration.
            </p>
          </section>
        </article>
        <aside className="guide-nav">
          <div className="guide-nav-sticky">
            <span className="page-eyebrow">IN THIS GUIDE</span>
            <SectionNav />
            <div className="nav-next">
              <Circle size={16} />
              <span>NEXT IN YOUR CHECKLIST</span>
              <p>
                {nextStep?.title ||
                  "Review the path and confirm real outcomes."}
              </p>
              <a href="#steps">
                Continue setup
                <ArrowRight size={13} />
              </a>
            </div>
            <p className="privacy-line">
              <ShieldCheck size={14} />
              Guide content is shareable. Checklist progress and help
              conversations are excluded.
            </p>
          </div>
        </aside>
      </div>
      {helpStep && (
        <HelpDialog
          guide={g}
          stepId={helpStep}
          onClose={() => setHelpStep(null)}
        />
      )}
    </div>
  );
}

type HelpAnswer = {
  hypothesis: string;
  diagnostic: string;
  action: string;
  owner: string;
  fallback: string;
  evidenceIds: string[];
  sourceUrls: string[];
  limitations: string;
};
function HelpDialog({
  guide,
  stepId,
  onClose,
}: {
  guide: Guide;
  stepId: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [problem, setProblem] = useState("");
  const [fresh, setFresh] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<HelpAnswer | null>(null);
  const step = guide.steps.find((s) => s.id === stepId)!;
  useEffect(() => {
    ref.current?.showModal();
    return () => abort.current?.abort();
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setAnswer(null);
    abort.current = new AbortController();
    try {
      const r = await fetch(`/api/guides/${guide.id}/help`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, problem, fresh }),
        signal: abort.current.signal,
      });
      const data = (await r.json().catch(() => ({
        error:
          "The help service returned an unreadable response. Please retry.",
      }))) as HelpAnswer & { error?: string };
      if (!r.ok || data.error) throw new Error(data.error);
      setAnswer(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Help could not complete.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="help-dialog"
      aria-labelledby="help-title"
    >
      <div className="dialog-top">
        <span className="icon-tile">
          <HelpCircle size={21} />
        </span>
        <button
          className="icon-button"
          aria-label="Close contextual help"
          onClick={() => ref.current?.close()}
        >
          <X size={20} />
        </button>
      </div>
      <div className="page-eyebrow">
        {guide.provider.name} · STEP-SPECIFIC HELP
      </div>
      <h2 id="help-title">Let’s work through this step.</h2>
      <p className="help-step-title">{step.title}</p>
      <details className="help-context">
        <summary>Context included with your question</summary>
        <p>
          {guide.provider.name} · {guide.scenario.actions}
        </p>
        <p>
          The selected step, guide evidence, and source links guide the
          diagnostic. Default docs mode uses evidence and diagnostic rules
          without a paid model.
        </p>
        <ClaimText value={step.detail} guide={guide} />
      </details>
      <form onSubmit={submit}>
        <label htmlFor="problem">What’s blocking you?</label>
        <textarea
          id="problem"
          autoFocus
          required
          minLength={8}
          maxLength={1600}
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          rows={4}
          placeholder="Describe what happened, what you expected, and a redacted error…"
        />
        <p className="input-warning">
          <ShieldCheck size={14} />
          Remove tokens, client secrets, passwords, and personal information
          before sharing an error.
        </p>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={fresh}
            onChange={(e) => setFresh(e.target.checked)}
          />
          Retrieve fresh official sources for this question
        </label>
        <button className="button primary" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle size={16} className="spin" />
              Checking this step
            </>
          ) : (
            <>
              Get next diagnostic
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
      {error && (
        <div className="error-box" role="alert">
          <Info size={18} />
          <div>
            <p>{error}</p>
            <a href="#evidence" onClick={() => ref.current?.close()}>
              Review guide evidence instead
            </a>
          </div>
        </div>
      )}
      {answer && (
        <div className="help-answer" aria-live="polite">
          {[
            ["Likely cause / hypothesis", answer.hypothesis],
            ["Next diagnostic check", answer.diagnostic],
            ["Recommended action", answer.action],
            ["Responsible person", answer.owner],
            ["If unresolved", answer.fallback],
          ].map(([label, value]) => (
            <div key={label}>
              <strong>{label}</strong>
              <p>{value}</p>
            </div>
          ))}
          <Evidence
            claim={{ text: "Support", evidenceIds: answer.evidenceIds }}
            guide={guide}
          />
          {answer.sourceUrls.map((u) => (
            <a href={u} key={u} target="_blank" rel="noreferrer">
              {new URL(u).hostname}
              <ArrowUpRight size={13} />
            </a>
          ))}
          <p className="subtle-note">{answer.limitations}</p>
        </div>
      )}
      <p className="privacy-line">
        <ShieldCheck size={13} />
        Conversation is not saved to the shared guide. Closing this panel clears
        it.
      </p>
    </dialog>
  );
}
