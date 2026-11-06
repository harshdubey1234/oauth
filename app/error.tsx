"use client";
import { PageLink } from "@/components/page-link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty-state">
      <h1>This guide could not be loaded.</h1>
      <p>Please retry. Your browser checklist is kept separately.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
      <PageLink className="button secondary" href="/">
        Guide library
      </PageLink>
    </main>
  );
}
