/** No arbitrary destination fetches are made by the server. These checks also protect rendered links. */
export function safePublicUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password || u.port) return false;
    const h = u.hostname.toLowerCase().replace(/\.$/, '');
    // Deny all literal IPs, unusual numeric forms, single-label hosts and local suffixes.
    if (!h.includes('.') || h.includes(':') || h.includes('[') || /^[\d.]+$/.test(h) || /^(0x[0-9a-f]+|[\d]+)$/i.test(h)) return false;
    if (/(^|\.)(localhost|local|internal|lan|home|test|invalid|example|onion)$/.test(h)) return false;
    if (/(^|\.)(nip\.io|sslip\.io|localtest\.me|lvh\.me)$/.test(h)) return false;
    if (h === 'metadata.google.internal' || h === 'metadata.google' || h.endsWith('.arpa')) return false;
    return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(h);
  } catch { return false; }
}
export function validateProviderInput(provider: string) {
  if (/[\r\n<>]/.test(provider)) throw new Error('Enter an app name or a public website.');
  if (/^\w+:/.test(provider) || provider.includes('/') || provider.includes('.')) {
    const raw = /^https?:\/\//i.test(provider) ? provider : `https://${provider}`;
    if (!safePublicUrl(raw)) throw new Error('Use a public HTTP or HTTPS website without credentials, ports, or IP addresses.');
    const u = new URL(raw);
    if (u.search || u.hash) throw new Error('Remove query strings and fragments from the provider website.');
  }
}
export function containsSecret(value: string) {
  return /(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9-]{12,}|Bearer\s+[A-Za-z0-9._-]{12,}|(?:client_secret|password|access_token|refresh_token)\s*[=:]\s*[^\s\[<]{6,}|-----BEGIN .*PRIVATE KEY-----)/i.test(value);
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) throw new Error('A same-origin browser request is required.');
  if (Number(request.headers.get('content-length') ?? 0) > 9000) throw new Error('Request is too large.');
}
export async function readJson(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new Error('JSON input is required.');
  const body = request.body?.getReader();
  if (!body) throw new Error('Request body is required.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const part = await body.read(); if (part.done) break; size += part.value.byteLength; if (size > 9000) { await body.cancel(); throw new Error('Request is too large.'); } chunks.push(part.value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function digest(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
