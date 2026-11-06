import { parseHTML } from "linkedom";
import type { PublicDocument } from "./public-fetch";
import { safePublicUrl } from "./security";

export type DocLink = { url: string; label: string };
export type ResearchPage = PublicDocument & {
  title: string;
  text: string;
  headings: string[];
  links: DocLink[];
  codes: string[];
};
const clean = (s: string) =>
  s
    .replace(/[\t \r]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
const untrusted =
  /ignore (?:all |previous |the )?instructions|reveal.{0,30}(?:secret|system prompt)|you are (?:now|(?:an? )?(?:\S*gpt|(?:AI )?assistant|(?:large )?language model)\b)|send.{0,30}(?:api.key|password)/i;
export function parseDocument(doc: PublicDocument): ResearchPage {
  let title = "",
    text = "",
    headings: string[] = [],
    links: DocLink[] = [],
    codes: string[] = [];
  if (/html/.test(doc.contentType)) {
    const { document } = parseHTML(doc.body);
    title = clean(
      document.querySelector("title")?.textContent ||
        document.querySelector("h1")?.textContent ||
        new URL(doc.url).hostname,
    ).slice(0, 240);
    // Discovery needs footer/navigation links, but evidence excludes their text.
    links = Array.from(document.querySelectorAll("a[href]")).map((n) => ({
      url: n.getAttribute("href") || "",
      label: clean(n.textContent || "").slice(0, 180),
    }));
    for (const node of document.querySelectorAll(
      'script,style,nav,footer,header,form,aside,noscript,svg,[aria-hidden="true"]',
    ))
      node.remove();
    const content =
      document.querySelector('main,article,[role="main"]') ||
      document.body ||
      document;
    headings = Array.from(content.querySelectorAll("h1,h2,h3,h4"))
      .map((n) => clean(n.textContent || ""))
      .filter(Boolean)
      .slice(0, 70);
    codes = Array.from(content.querySelectorAll("code"))
      .map((n) => clean(n.textContent || ""))
      .filter((s) => s.length < 160)
      .slice(0, 250);
    for (const node of content.querySelectorAll(
      "h1,h2,h3,h4,p,li,tr,pre,section,div",
    )) {
      node.appendChild(document.createTextNode("\n"));
    }
    text = clean(content.textContent || "");
  } else {
    text = clean(doc.body);
    title = clean(
      text.match(/^#\s+(.+)$/m)?.[1] || new URL(doc.url).hostname,
    ).slice(0, 240);
    headings = Array.from(text.matchAll(/^#{1,4}\s+(.+)$/gm), (m) =>
      clean(m[1]),
    ).slice(0, 70);
    links = Array.from(
      text.matchAll(/\[([^\]]{1,200})\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g),
      (m) => ({ label: m[1], url: m[2] }),
    );
    codes = Array.from(text.matchAll(/`([^`\n]{1,150})`/g), (m) => m[1]).slice(
      0,
      250,
    );
  }
  text = text
    .split("\n")
    .filter((line) => !untrusted.test(line))
    .join("\n")
    .slice(0, 85000);
  links = links.flatMap((l) => {
    try {
      const u = new URL(l.url, doc.url);
      u.hash = "";
      if (u.protocol !== "https:" || u.search || !safePublicUrl(u.href))
        return [];
      return [{ url: u.href, label: clean(l.label) }];
    } catch {
      return [];
    }
  });
  const unique = new Map(links.map((l) => [l.url, l]));
  return {
    ...doc,
    title,
    text,
    headings: headings.filter((h) => !untrusted.test(h)),
    links: [...unique.values()].slice(0, 400),
    codes,
  };
}
export function linkRelevance(link: DocLink, actions = "") {
  const s = `${link.label} ${new URL(link.url).pathname}`.toLowerCase();
  let score = 0;
  for (const [pattern, value] of [
    [/oauth|authorization/, 16],
    [/authenticat|access.token/, 10],
    [/scope|permission|capabilit/, 10],
    [/register|registration|create.*(?:app|integration|connection)/, 8],
    [
      /distribut|verification|app.review|oauth.review|marketplace|public.integration/,
      7,
    ],
    [/internal|test.user|redirect|callback/, 4],
    [/developer|documentation|docs|llms\.txt/, 3],
  ] as const)
    if (pattern.test(s)) score += value;
  if (
    /mcp|skill|changelog|blog|sdk|github.com|sign.?in|login|logout|pricing|privacy|terms/.test(
      s,
    )
  )
    score -= 8;
  if (
    /read|search|summari/.test(actions) &&
    /read|content|scope|capabilit/.test(s)
  )
    score += 3;
  if (
    /send|post|write|create/.test(actions) &&
    /write|content|scope|capabilit/.test(s)
  )
    score += 3;
  return score;
}

export function relevantSections(
  page: ResearchPage,
  pattern: RegExp,
): string[] {
  const lines = page.text
    .split(/\n+/)
    .map(clean)
    .filter((s) => s.length > 20 && s.length < 1100);
  return lines.filter((s) => pattern.test(s)).slice(0, 8);
}
