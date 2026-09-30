// Runs the real _worker.js against an in-memory stand-in for Cloudflare D1.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import assert from 'node:assert/strict';
const [src, ids] = process.argv.slice(2); const LIVE = ids.split(',');
const tmp = path.join(os.tmpdir(), `w${Date.now()}.mjs`); fs.copyFileSync(src, tmp);
const worker = (await import(tmp)).default;
let table = false; const rows = new Map();
const DB = { prepare(sql) { const st = { a: [], bind(...a) { st.a = a; return st; },
  async run() { if (/CREATE TABLE/.test(sql)) { table = true; return { meta: { changes: 0 } }; } if (!table) throw new Error('D1_ERROR: no such table: games');
    const id = st.a[0], r = rows.get(id) || { id, plays: 0, best: 0, best_at: null };
    if (/plays=plays\+1/.test(sql)) { r.plays++; rows.set(id, r); return { meta: { changes: 1 } }; }
    if (/best=excluded.best/.test(sql)) { if (!rows.has(id) || st.a[1] > r.best) { r.best = st.a[1]; r.best_at = st.a[2]; rows.set(id, r); return { meta: { changes: 1 } }; } return { meta: { changes: 0 } }; }
    throw new Error('unexpected SQL ' + sql); },
  async all() { if (!table) throw new Error('D1_ERROR: no such table: games'); return { results: [...rows.values()] }; } }; return st; } };
const cache = new Map(); globalThis.caches = { default: { async match(k) { return cache.get(k.url)?.clone(); }, async put(k, r) { cache.set(k.url, r); }, async delete(k) { cache.delete(k.url); } } };
const env = { DB, ASSETS: { fetch: async () => new Response('static') } }, ctx = { waitUntil() {} }, O = 'https://gameindubai.com';
const call = (p, m = 'GET', body, origin = O) => worker.fetch(new Request(O + p, { method: m, headers: { 'content-type': 'application/json', origin }, body: body ? JSON.stringify(body) : undefined }), env, ctx);
let r = await call('/api/stats'); assert.equal(r.status, 200); assert.deepEqual(await r.json(), {}); cache.clear();
for (const id of LIVE) { r = await call('/api/plays', 'POST', { id }); assert.equal(r.status, 200, `plays for ${id}`); }
r = await call('/api/plays', 'POST', { id: LIVE[0] }); assert.equal(r.status, 200);
assert.equal((await (await call('/api/score', 'POST', { id: LIVE[0], score: 500, dur: 60 })).json()).record, true);
assert.equal((await (await call('/api/score', 'POST', { id: LIVE[0], score: 300, dur: 60 })).json()).record, false, 'lower score must not replace the record');
assert.equal((await (await call('/api/score', 'POST', { id: LIVE[0], score: 900, dur: 60 })).json()).record, true);
assert.equal((await call('/api/score', 'POST', { id: LIVE[0], score: 999999999, dur: 5 })).status, 422, 'impossible score must be rejected');
assert.equal((await call('/api/score', 'POST', { id: 'nope', score: 5, dur: 5 })).status, 400, 'unknown game must be rejected');
assert.equal((await call('/api/plays', 'POST', { id: LIVE[0] }, 'https://evil.example')).status, 403, 'other websites must be rejected');
cache.clear(); r = await call('/api/stats'); const s = await r.json();
assert.equal(r.headers.get('cache-control'), 'public, max-age=60');
assert.equal(s[LIVE[0]].plays, 2); assert.equal(s[LIVE[0]].best, 900); for (const id of LIVE) assert.ok(s[id] && s[id].plays >= 1, `stats for ${id}`);
cache.clear(); r = await call('/api/plays'); assert.equal((await r.json())[LIVE[0]], 2);
assert.equal(await (await worker.fetch(new Request(O + '/'), env, ctx)).text(), 'static', 'non-API paths must pass through');
assert.equal((await worker.fetch(new Request(O + '/api/stats'), { ASSETS: env.ASSETS }, ctx)).status, 503, 'no DB bound -> 503');
fs.unlinkSync(tmp); console.log('worker api: all checks passed');
