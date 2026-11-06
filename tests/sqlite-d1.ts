// D1 interface test double backed by a real, persistent SQLite file (not hosted D1).
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
let connection: DatabaseSync = new DatabaseSync(
  ".runtime/tests/atlas.sqlite",
);
export function reopen() {
  connection?.close();
  connection = new DatabaseSync(".runtime/tests/atlas.sqlite");
}
connection.exec(
  "DROP TABLE IF EXISTS guides; DROP TABLE IF EXISTS research_jobs; DROP TABLE IF EXISTS request_quotas;",
);
connection.exec(readFileSync("drizzle/0000_slow_iceman.sql", "utf8"));
class Statement {
  private values: (string | number | null)[] = [];
  constructor(private sql: string) {}
  bind(...values: (string | number | null)[]) {
    this.values = values;
    return this;
  }
  async first<T>() {
    return (
      (connection.prepare(this.sql).get(...this.values) as T | undefined) ??
      null
    );
  }
  async all<T>() {
    return { results: connection.prepare(this.sql).all(...this.values) as T[] };
  }
  async run() {
    const result = connection.prepare(this.sql).run(...this.values);
    return { meta: { changes: Number(result.changes) } };
  }
}
export const env: {
  DB: { prepare: (sql: string) => Statement };
  RESEARCH_MODE?: string;
  RESEARCH_MAX_PAGES?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  RESEARCH_TIMEOUT_MS?: string;
  RESEARCH_MAX_SEARCH_CALLS?: string;
  RESEARCH_MAX_SOURCES?: string;
  RESEARCH_MAX_OUTPUT_TOKENS?: string;
} = {
  DB: { prepare: (sql: string) => new Statement(sql) },
  RESEARCH_MODE: "openai",
};
