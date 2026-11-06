import { env } from 'cloudflare:workers';
import { guideSchema, type Guide } from './schema';
import { preparedGuides } from './guides';

function db() { if (!env.DB) throw new Error('Persistent database is not configured.'); return env.DB; }
export async function getGuide(id: string): Promise<Guide | null> {
  const prepared = preparedGuides.find(g => g.id === id);
  if (prepared) return prepared;
  const row = await db().prepare('SELECT content FROM guides WHERE id = ?').bind(id).first<{content: string}>();
  return row ? guideSchema.parse(JSON.parse(row.content)) : null;
}
export async function getLibrary(): Promise<Guide[]> {
  const rows = await db().prepare("SELECT content FROM guides WHERE visibility = 'public' ORDER BY created_at DESC LIMIT 100").all<{content: string}>();
  return [...preparedGuides, ...rows.results.map(r => guideSchema.parse(JSON.parse(r.content)))];
}
export async function saveGuide(guide: Guide) {
  const valid = guideSchema.parse(guide);
  await db().prepare("INSERT INTO guides (id, content, visibility, created_at) VALUES (?, ?, 'unlisted', ?)").bind(valid.id, JSON.stringify(valid), new Date().toISOString()).run();
}
export type ProgressEvent = { stage: string; detail: string; at: string };
export type Job = { id: string; input_hash: string; status: string; events: string; guide_id: string | null; error: string | null; updated_at: string };
export async function startJob(id: string, inputHash: string): Promise<boolean> {
  const result = await db().prepare("INSERT INTO research_jobs (id, input_hash, status, events, updated_at) VALUES (?, ?, 'running', '[]', ?) ON CONFLICT(id) DO NOTHING").bind(id, inputHash, new Date().toISOString()).run();
  return result.meta.changes === 1;
}
export async function getJob(id: string) { return db().prepare('SELECT * FROM research_jobs WHERE id = ?').bind(id).first<Job>(); }
export async function updateJob(id: string, events: ProgressEvent[], status: string, guideId: string | null = null, error: string | null = null) {
  await db().prepare('UPDATE research_jobs SET events = ?, status = ?, guide_id = ?, error = ?, updated_at = ? WHERE id = ?').bind(JSON.stringify(events), status, guideId, error, new Date().toISOString(), id).run();
}
/** Atomic per-hour limit; hashed caller identity, no raw addresses stored. */
export async function consumeQuota(caller: string, limit: number) {
  const window = Math.floor(Date.now() / 3600000);
  const result = await db().prepare('INSERT INTO request_quotas (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < ? RETURNING count').bind(`${caller}:${window}`, (window + 1) * 3600000, limit).first();
  return !!result;
}
