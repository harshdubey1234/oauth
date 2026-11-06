import { PageLink } from "@/components/page-link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PRODUCT } from "@/lib/product";

export function AtlasMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <polygon points="17,3 31,10 17,17 3,10" fill="var(--ax-ember)" stroke="#121915" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="3,10 17,17 17,31 3,24" fill="#121915" />
      <polygon points="17,17 31,10 31,24 17,31" fill="#3A433D" />
    </svg>
  );
}

export function Shell({
  children,
  current = "Library",
}: {
  children: React.ReactNode;
  current?: string;
}) {
  return (
    <div className={`app-frame${current === "Library" ? " library-frame" : ""}`}>
      <a href="#main" className="ax-skip">
        Skip to content
      </a>
      <header className="ax-header">
        <div className="ax-wrap ax-header-inner">
          <PageLink href="/" className="ax-brand" aria-label={`${PRODUCT.name} home`}>
            <AtlasMark />
            <span className="ax-brand-text">
              <span className="ax-brand-name">{PRODUCT.name}</span>
              <span className="ax-brand-tag">FIELD NOTES</span>
            </span>
          </PageLink>
          <nav className="ax-nav" aria-label="Primary">
            <PageLink href="/#guides" aria-current={current === "Library" ? "page" : undefined}>
              Guide library
            </PageLink>
            <PageLink href="/about" aria-current={current === "How it works" ? "page" : undefined}>
              How evidence works
            </PageLink>
            <a href="https://docs.composio.dev/toolkits/managed-auth" target="_blank" rel="noreferrer">
              Composio docs
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          </nav>
          <PageLink href="/#research" className="ax-pill-dark">
            <span>
              Research<span className="ax-pill-long"> a provider</span>
            </span>
            <ArrowRight size={14} aria-hidden="true" />
          </PageLink>
        </div>
      </header>
      <div className="workspace workspace-wide">
        <main id="main">{children}</main>
        <footer className="ax-footer">
          <div className="ax-wrap ax-footer-inner">
            <span>
              <strong>{PRODUCT.name}</strong> · An independent project. Not affiliated with Composio or any provider shown;
              logos are trademarks of their owners, used only to identify each app.
            </span>
            <nav aria-label="Footer">
              <PageLink href="/#guides">Guide library</PageLink>
              <PageLink href="/about">Built on evidence</PageLink>
              <a href="https://docs.composio.dev/toolkits/managed-auth" target="_blank" rel="noreferrer">
                Composio managed auth
              </a>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
