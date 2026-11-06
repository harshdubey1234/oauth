import { Shell } from "@/components/shell";
import { FileSearch, ShieldCheck, Route, ArrowRight } from "lucide-react";
import { PageLink } from "@/components/page-link";
export default function About() {
  return (
    <Shell current="How it works">
      <div className="about-page">
        <span className="page-eyebrow">THE EVIDENCE STANDARD</span>
        <h1>
          A useful path.
          <br />
          An honest boundary.
        </h1>
        <p className="guide-summary">
          OAuth Atlas helps agent builders understand setup before opening
          another developer dashboard.
        </p>
        <section className="guide-section">
          <h2>From a question to a guide</h2>
          <div className="principles">
            <div>
              <FileSearch />
              <h3>Resolve and retrieve</h3>
              <p>
                The agent identifies the provider (a 100-app directory, then a
                public identity record, then the obvious domains — clearly marked
                unverified), finds its developer-docs host, and reads up to eight
                OAuth, scope, callback and review pages. It quotes concrete facts
                (endpoints, PKCE, token lifetimes, user caps) and checks the
                authorization endpoint without credentials. No model key or paid
                search API.
              </p>
            </div>
            <div>
              <Route />
              <h3>Map your scenario</h3>
              <p>
                Actions, audience, stage, and OAuth preference shape a
                structured guide. Testing and launch remain separate.
              </p>
            </div>
            <div>
              <ShieldCheck />
              <h3>Check and save</h3>
              <p>
                Deterministic extraction records supporting sources and leaves
                uncertain requirements open. Runtime validation checks
                references, test labels, and step dependencies. Generated guides
                are unlisted in durable storage.
              </p>
            </div>
          </div>
        </section>
        <section className="guide-section content-card">
          <h2>What the labels mean</h2>
          <dl className="definition-list">
            <dt>Official docs</dt>
            <dd>
              A retrieved official page supports a particular claim under stated
              conditions. It does not prove a successful setup.
            </dd>
            <dt>Tested</dt>
            <dd>
              An actual successful setup attempt produced a recorded
              observation. The prepared guides have no successful registration
              or connection tests.
            </dd>
            <dt>Estimate</dt>
            <dd>
              A conditional planning range with a basis and assumptions.
              External waiting is kept separate.
            </dd>
            <dt>Unverified</dt>
            <dd>
              The evidence does not establish this requirement. Treat it as a
              question to resolve.
            </dd>
          </dl>
          <p>
            Free mode is a bounded documentation research workflow, not an LLM.
            It can identify documented authentication methods and permission
            candidates; it cannot resolve every policy nuance. Review important
            requirements in the linked source and use the labelled unknowns.
          </p>
        </section>
        <section className="guide-section content-card" id="difficulty">
          <h2>How difficulty is rated</h2>
          <p>
            The badge is computed from a guide’s own labelled data for its
            scenario — it adds no new claim.
          </p>
          <dl className="definition-list">
            <dt>Hard</dt>
            <dd>A provider review or verification gates launch (for example Google restricted-scope verification), or launch is blocked until approval.</dd>
            <dt>Moderate</dt>
            <dd>No provider review, but an administrator approval, a distribution gate, or audience-dependent launch conditions apply.</dd>
            <dt>Easy</dt>
            <dd>Documented self-serve registration and no review or admin gate found for the scenario.</dd>
            <dt>Unclear</dt>
            <dd>The OAuth path was not established from the sources read, or the docs describe API keys instead.</dd>
          </dl>
          <p>
            Hands-on time is an estimate to a first working test; waiting time
            is shown separately because it depends on admins and providers, not
            on your work.
          </p>
        </section>
        <section className="guide-section" id="configuration">
          <h2>Free by default</h2>
          <p>
            The library, live documentation research, evidence-guided help,
            durable shared guides, Markdown exports, and setup packs work
            without API credentials. Documentation hosts may rate limit or block
            reading; those cases produce an honest partial result.
          </p>
          <p>
            Optional model-assisted research is available only when an operator
            explicitly selects <code>RESEARCH_MODE=openai</code> and configures
            a server-side key. Free mode never falls back to a paid model. Never
            paste provider credentials into this app or a shared guide.
          </p>
          <p>
            No paid model or search API is required in default mode. Ordinary
            hosting and network quotas still apply; this is not a promise of
            unlimited infrastructure. See the README for limits and deployment.
          </p>
        </section>
        <section className="guide-section">
          <h2>What is shared?</h2>
          <p>
            Generated guides have opaque, durable URLs and are excluded from the
            public library. Anyone with a link can view them subject to the
            site’s access policy. The site owner controls who can access the
            deployment.
          </p>
          <p>
            Use generic descriptions rather than confidential project details.
            Checklist progress stays in this browser. Help conversations are not
            stored by the app or attached to a shared guide. Default help stays
            within the documentation workflow; an optional model mode sends the
            supplied context to the configured model service.
          </p>
        </section>
        <section className="guide-section">
          <h2>What an agent can prepare</h2>
          <p>
            Source discovery, scope justifications, callback checklists, review
            drafts, and diagnostic suggestions. A human owns account access,
            truthful business and security facts, app registration, consent,
            administrator decisions, and provider review.
          </p>
          <p>
            OAuth Atlas does not collect provider client secrets, register apps,
            submit applications, or promise approvals.
          </p>
        </section>
        <PageLink className="button primary" href="/">
          Explore the field guides
          <ArrowRight size={16} />
        </PageLink>
      </div>
    </Shell>
  );
}
