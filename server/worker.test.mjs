// Runs the Worker locally (preview env, local D1 + R2) and walks the contract.
// node --test server/worker.test.mjs
// Google can't be asked for an ID token here, so a session is seeded straight
// into the local database instead; everything after sign-in is the real path.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));
const PORT = 8799, BASE = `http://127.0.0.1:${PORT}`;
const A = 'a'.repeat(64), B = 'b'.repeat(64), C = 'c'.repeat(64);
const sha = (s) => createHash('sha256').update(s).digest('hex');
const wr = (args) => execFileSync('npx', ['--no-install', 'wrangler', ...args], { cwd: dir, stdio: 'pipe' });
let dev;

const call = (path, { token = A, ...o } = {}) =>
  fetch(BASE + path, { ...o, headers: { authorization: `Bearer ${token}`, origin: 'http://localhost:5173', ...o.headers } });

before(async () => {
  const now = Date.now();
  wr(['d1', 'execute', 'flyleaf-preview', '--env', 'preview', '--local', '--file=schema.sql']);
  wr(['d1', 'execute', 'flyleaf-preview', '--env', 'preview', '--local', '--command',
    `DELETE FROM docs; DELETE FROM media; DELETE FROM sessions; DELETE FROM users; DELETE FROM unlocks;
     INSERT INTO users VALUES ('gtest', 'reader@example.com', 'Reader', ${now});
     INSERT INTO sessions VALUES ('${sha(A)}', 'gtest', 'journal', ${now - 2 * 86400000});
     INSERT INTO sessions VALUES ('${sha(B)}', 'gtest', 'press', ${now - 401 * 86400000});
     INSERT INTO users VALUES ('ggone', 'gone@example.com', 'Gone', ${now});
     INSERT INTO sessions VALUES ('${sha(C)}', 'ggone', 'reader', ${now});
     INSERT INTO unlocks (ref, user_id, app, product, store, env, at) VALUES ('ios_1', 'ggone', 'reader', 'com.feyidesigns.ereader.unlock', 'apple', 'Sandbox', ${now});`]);
  dev = spawn('npx', ['--no-install', 'wrangler', 'dev', '--env', 'preview', '--port', String(PORT), '--ip', '127.0.0.1'], { cwd: dir, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE + '/health')).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('wrangler dev never came up');
});
after(() => dev?.kill());

test('signs in only with a real Google token', async () => {
  const r = await fetch(BASE + '/auth/google', { method: 'POST', body: JSON.stringify({ credential: 'x.y.z', app: 'journal' }) });
  assert.equal(r.status, 401);
});

test('a used session holds; one unseen for 400 days is gone', async () => {
  const me = await call('/me');
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), { user: { email: 'reader@example.com', name: 'Reader' } });
  assert.equal((await call('/me', { token: B })).status, 401);
  assert.equal((await call('/me', { token: 'nope' })).status, 401);
});

test('CORS lets the local dev server in and names the sync headers', async () => {
  const r = await fetch(BASE + '/doc/journal', { method: 'OPTIONS', headers: { origin: 'http://localhost:5173' } });
  assert.equal(r.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.match(r.headers.get('access-control-expose-headers'), /x-rev/);
  const bad = await fetch(BASE + '/health', { headers: { origin: 'https://evil.example' } });
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
});

test('documents move by revision, and a stale write is refused', async () => {
  assert.equal((await call('/doc/journal')).status, 404);
  const put = (rev, body, device = 'phone') => call('/doc/journal', { method: 'PUT', body, headers: { 'x-rev': String(rev), 'x-device': device } });

  const one = await put(0, '{"v":1}');
  assert.equal(one.status, 200);
  assert.equal((await one.json()).rev, 1);
  const race = await put(0, '{"v":"other"}', 'laptop');
  assert.equal(race.status, 409);
  assert.equal((await race.json()).rev, 1);

  const got = await call('/doc/journal');
  assert.equal(got.headers.get('x-rev'), '1');
  assert.equal(got.headers.get('x-device'), 'phone');
  assert.equal(await got.text(), '{"v":1}');
  assert.equal((await call('/doc/journal', { headers: { 'x-rev': '1' } })).status, 204);
  const peek = await call('/doc/journal', { method: 'HEAD' });
  assert.equal(peek.status, 204);
  assert.equal(peek.headers.get('x-device'), 'phone');

  assert.equal((await put(1, '{"v":2}', 'laptop')).status, 200);
  assert.equal((await put(1, '{"v":"late"}')).status, 409);
  assert.equal((await put(2, '{"v":3}')).status, 200);
  const last = await call('/doc/journal', { headers: { 'x-rev': '1' } });
  assert.equal(last.headers.get('x-rev'), '3');
  assert.equal(await last.text(), '{"v":3}');

  // Apps never see each other's documents.
  assert.equal((await call('/doc/press')).status, 404);
  assert.equal((await call('/doc/nope')).status, 404);
});

test('media is stored once by hash and handed back', async () => {
  const blob = new Uint8Array([1, 2, 3, 4, 5]);
  const h = sha(blob);
  const miss = await call('/media/missing', { method: 'POST', body: JSON.stringify({ hashes: [h, 'zz'] }) });
  assert.deepEqual(await miss.json(), { missing: [h] });
  const up = await call(`/media/${h}?app=journal`, { method: 'PUT', body: blob, headers: { 'content-type': 'audio/webm' } });
  assert.equal(up.status, 200);
  assert.deepEqual(await (await call('/media/missing', { method: 'POST', body: JSON.stringify({ hashes: [h] }) })).json(), { missing: [] });
  const back = await call(`/media/${h}`);
  assert.equal(back.headers.get('content-type'), 'audio/webm');
  assert.deepEqual(new Uint8Array(await back.arrayBuffer()), blob);
});

test('deleting the journal takes its media with it', async () => {
  assert.equal((await call('/doc/journal', { method: 'DELETE' })).status, 200);
  assert.equal((await call('/doc/journal')).status, 404);
  const miss = await call('/media/missing', { method: 'POST', body: JSON.stringify({ hashes: [sha(new Uint8Array([1, 2, 3, 4, 5]))] }) });
  assert.equal((await miss.json()).missing.length, 1);
});

test('signing out ends that session only', async () => {
  assert.equal((await call('/auth/out', { method: 'POST' })).status, 200);
  assert.equal((await call('/me')).status, 401);
});

test('deleting the account removes the reader and everything they stored', async () => {
  const as = (path, o = {}) => call(path, { token: C, ...o });
  assert.equal((await as('/doc/reader', { method: 'PUT', body: '{"v":1}', headers: { 'x-rev': '0' } })).status, 200);
  const blob = new Uint8Array([9, 8, 7]);
  assert.equal((await as(`/media/${sha(blob)}?app=reader`, { method: 'PUT', body: blob })).status, 200);

  assert.equal((await as('/me', { method: 'DELETE' })).status, 200);
  assert.equal((await as('/me')).status, 401);
  const left = JSON.parse(wr(['d1', 'execute', 'flyleaf-preview', '--env', 'preview', '--local', '--json', '--command',
    `SELECT (SELECT COUNT(*) FROM users WHERE id = 'ggone') + (SELECT COUNT(*) FROM sessions WHERE user_id = 'ggone')
          + (SELECT COUNT(*) FROM docs WHERE user_id = 'ggone') + (SELECT COUNT(*) FROM media WHERE user_id = 'ggone')
          + (SELECT COUNT(*) FROM unlocks WHERE user_id = 'ggone') AS n,
     (SELECT COUNT(*) FROM users WHERE id = 'gtest') AS kept`]).toString());
  assert.equal(left[0].results[0].n, 0);
  assert.equal(left[0].results[0].kept, 1);
});
