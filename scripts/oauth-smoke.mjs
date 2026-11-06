/**
 * Real end-to-end OAuth smoke test against GitHub, run by a human with their own OAuth App.
 * Records only non-secret observations (timestamps, HTTP statuses, granted scopes, login) to
 * outputs/oauth-smoke-github.json. The client secret and access token are never printed or saved.
 *
 * 1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
 *    Homepage URL: http://127.0.0.1:8976   Authorization callback URL: http://127.0.0.1:8976/callback
 * 2. PowerShell:  $env:GITHUB_CLIENT_ID="..."; $env:GITHUB_CLIENT_SECRET="..."; node scripts/oauth-smoke.mjs
 * 3. Open the printed URL, approve, and wait for "Recorded".
 */
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

const id = process.env.GITHUB_CLIENT_ID;
const secret = process.env.GITHUB_CLIENT_SECRET;
if (!id || !secret) {
  console.error("Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in this shell first (never paste them into code or chat).");
  process.exit(1);
}
const port = 8976;
const redirect = `http://127.0.0.1:${port}/callback`;
const state = randomBytes(16).toString("hex");
const scope = "read:user";
const authorize = `https://github.com/login/oauth/authorize?${new URLSearchParams({ client_id: id, redirect_uri: redirect, scope, state })}`;
const result = { provider: "github", flow: "OAuth App, authorization code", startedAt: new Date().toISOString(), requestedScope: scope };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (url.pathname !== "/callback") return res.writeHead(404).end();
  try {
    if (url.searchParams.get("state") !== state) throw new Error("State mismatch — request rejected.");
    if (url.searchParams.get("error")) throw new Error(`Provider returned error: ${url.searchParams.get("error")}`);
    result.authorization = { at: new Date().toISOString(), codeReceived: Boolean(url.searchParams.get("code")) };
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: id, client_secret: secret, code: url.searchParams.get("code"), redirect_uri: redirect }),
    });
    const token = await tokenRes.json();
    result.tokenExchange = { at: new Date().toISOString(), status: tokenRes.status, tokenType: token.token_type, grantedScope: token.scope, error: token.error };
    if (!token.access_token) throw new Error(`Token exchange failed: ${token.error || tokenRes.status}`);
    const api = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/vnd.github+json", "User-Agent": "oauth-atlas-smoke" },
    });
    const user = await api.json();
    result.apiCall = { at: new Date().toISOString(), endpoint: "GET /user", status: api.status, oauthScopesHeader: api.headers.get("x-oauth-scopes"), loginReturned: Boolean(user.login) };
    result.outcome = api.ok ? "succeeded" : "failed";
    res.writeHead(200, { "Content-Type": "text/plain" }).end("Recorded. You can close this tab.");
  } catch (e) {
    result.outcome = "failed";
    result.error = e.message;
    res.writeHead(400, { "Content-Type": "text/plain" }).end(`Failed: ${e.message}`);
  } finally {
    result.finishedAt = new Date().toISOString();
    mkdirSync("outputs", { recursive: true });
    writeFileSync("outputs/oauth-smoke-github.json", JSON.stringify(result, null, 2));
    console.log("\nRecorded (no secrets):\n" + JSON.stringify(result, null, 2));
    server.close();
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Open this URL and approve:\n${authorize}\n`));
