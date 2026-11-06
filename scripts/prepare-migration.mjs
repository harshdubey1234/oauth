import { readFileSync, writeFileSync } from "node:fs";

const inventory = JSON.parse(
  readFileSync(".deployment/guide-inventory.json", "utf8"),
);
const origin = new URL(inventory.origin);
if (
  origin.protocol !== "https:" ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash
)
  throw new Error("Migration source must be the selected public HTTPS origin.");
const literal = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const queries = [];
for (const record of inventory.guides) {
  if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(record.id))
    throw new Error("Invalid guide identity.");
  const response = await fetch(new URL(`/api/guides/${record.id}`, origin), {
    signal: AbortSignal.timeout(30000),
    redirect: "error",
  });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/json")
  )
    throw new Error("A saved guide could not be exported.");
  const guide = await response.json();
  if (
    guide.id !== record.id ||
    guide.schemaVersion !== 1 ||
    !Array.isArray(guide.sources)
  )
    throw new Error("Invalid source guide.");
  const visibility = record.visibility === "public" ? "public" : "unlisted";
  queries.push(
    `INSERT INTO guides (id,content,visibility,created_at) VALUES (${literal(record.id)},${literal(JSON.stringify(guide))},${literal(visibility)},${literal(record.created_at)}) ON CONFLICT(id) DO NOTHING;`,
  );
}
writeFileSync(".deployment/import-guides.sql", queries.join("\n") + "\n");
console.log(
  `Prepared ${queries.length} saved guides for migration; existing IDs and evidence were preserved.`,
);
