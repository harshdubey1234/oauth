# Independent app choice: Tally

Live guide: https://oauth-atlas.harsh3dubey.workers.dev/guides/tally

## Why this app

Tally is a useful choice for agent intake: turn completed team-form responses into a weekly internal digest. The small read-and-preview workflow is easy to explain and gives the guide a concrete success condition. The choice of “underrated” is editorial; this submission makes no popularity or market-share claim.

The interesting product decision is the access boundary. Tally documents an OAuth connection to its hosted MCP server, while its REST API-key documentation describes user-wide inherited access without fine-grained key permissions. Selecting one form in application code does not make that key a per-form credential. [MCP authentication](https://developers.tally.so/api-reference/mcp), [API keys](https://developers.tally.so/api-reference/api-keys).

## First test and human handoff

1. The team owner chooses one form with synthetic completed responses, a date window and an expected count.
2. The developer selects an OAuth-capable MCP client. The user follows its connect flow to `https://api.tally.so/mcp`, reviews actual consent and authorizes. Use the client-managed redirect flow; this guide does not invent a universal callback URL.
3. For a REST backend alternative, the human provisions the API key in Tally Settings and stores it securely. Record the actual API version. Do not paste credentials into the guide or diagnostic assistant.
4. Read only the selected completed responses. REST pagination uses `page`, `limit` and `hasMore`; compare all returned IDs with the fixture before summarizing.
5. Preview the agreed fields without sending a message. Strip signed response URLs and raw payloads from shared output and logs. The response schema describes `previewUrl` and `pdfUrl` as token-bearing links without expiry.

The live guide contains owners, dependencies, acceptance criteria, recovery actions and claim-level evidence. MCP and REST are alternative authorization routes; neither has been completed by this research. [Submissions reference](https://developers.tally.so/api-reference/endpoint/forms/submissions/list), [versioning](https://developers.tally.so/api-reference/versioning).

## What was actually checked

On 6 November 2026, public documentation and discovery endpoints returned HTTP 200. Seven retained official source records include timestamps, short excerpts and SHA-256 fingerprints. The public MCP resource metadata advertises the `mcp` scope. Authorization-server discovery advertises authorization-code and refresh-token grants, S256 PKCE and a registration endpoint. Only read-only GET requests were made. [MCP resource discovery](https://api.tally.so/.well-known/oauth-protected-resource/mcp), [authorization-server discovery](https://api.tally.so/.well-known/oauth-authorization-server).

Tally advertises free API access. This does not establish that every chosen client or downstream processing service is free. [API access and limits](https://tally.so/help/api).

No provider account was accessed, client registered, authorization completed or form data retrieved. Metadata does not prove custom-client eligibility, detailed scope semantics or distribution approval. Composio-managed Tally coverage remains unverified.

## Before launch

For an internal digest, agree credential ownership, allowed fields, retention and disconnection behavior. Before an external customer product, confirm registration and distribution policy with Tally and demonstrate per-customer isolation. The guide leaves these unresolved instead of inventing a review or timeline. Its 30–60 minute first-test allowance is an explicit planning estimate with existing accounts and fixtures, not an observed setup duration.

The app's Export action downloads the full sourced guide; the setup pack remains a draft with placeholders. Checklist ticks never become evidence of provider approval.
