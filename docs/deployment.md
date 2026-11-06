# Cloudflare deployment

This application deploys directly to your Cloudflare account using Workers, static assets and D1.

## Account setup

```powershell
node node_modules/wrangler/bin/wrangler.js login --scopes account:read user:read workers_scripts:write d1:write
node node_modules/wrangler/bin/wrangler.js whoami --json
node node_modules/wrangler/bin/wrangler.js d1 create oauth-atlas
```

If the account already contains a database or Worker with this name, inspect it before reuse or choose a distinct name. Do not overwrite unrelated resources.

Create `.deployment/cloudflare.json` from `cloudflare.deployment.example.json`, using IDs returned by your account. IDs are deployment metadata; passwords and tokens do not belong in that file. It is ignored along with optional migration data.

## Publish

```powershell
npm run deploy
```

The script validates real IDs, builds the application, checks client assets, applies committed D1 migrations and publishes the Worker/assets. It imports `.deployment/import-guides.sql` when present. Imports preserve guide IDs and do not overwrite existing records.

Generated `dist/server/wrangler.json` contains the actual account binding and an absolute migration path for the current checkout. Rebuild after changing deployment settings. Do not deploy the local placeholder database ID.

## Verify

Set `ATLAS_VERIFY_URL` to the actual HTTPS origin returned by deployment, then run `node scripts/verify-research.mjs`. Test all four provider cards, generated-guide action, source disclosures, help and exports in a browser.

Cloudflare's [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) apply to your account. The Free plan documents 10 ms CPU per request, so full SSR and research suitability must be verified against actual execution. The project never upgrades an account plan. Documentation research requires no paid model/search API.

## Saved data

Migration exports are ignored account-local files. The current preparation exported five saved guides with IDs, sources and timestamps intact. Prepared guides remain part of versioned source. Synthetic test fixtures are local-only and must not be uploaded to production.

Do not remove the existing deployment until the new deployment, data migration and shared URLs have been verified. The new public Cloudflare URL and verification record are recorded below. The original deployment remains available during the migration handover.

## Verified Cloudflare publication — 6 November 2026

- Public URL: https://oauth-atlas.harsh3dubey.workers.dev
- Worker: `oauth-atlas`.
- Version: `8d43834c-fef4-4fd1-9c0b-e348b7bcef97`.
- Worker startup reported 9 ms; publication and its public endpoint completed successfully.
- Five existing saved guides were imported into the account-owned D1 database; all five IDs reopened through the new public API.
- 18/18 hosted research/help checks passed. Actual Notion documentation retrieval, evidence extraction, durable saving, duplicate handling, cookie-free reads, rendered source links, fresh callback help, library exclusion and job retrieval all passed.
- [Verified hosted Notion guide](https://oauth-atlas.harsh3dubey.workers.dev/guides/692f4232-b639-4392-ae69-6864c4b84478).
- Homepage, About and all prepared guide pages returned 200 and had no unwanted platform names in visible text or metadata.
- No paid model calls or account-plan upgrade was required by this deployment. Normal Cloudflare request, storage and CPU quotas still apply; sustained-load behavior was not tested.
- Account settings, data import files and credentials remain outside the submission archive.
