/* Flyleaf API: accounts and sync for Journal, Press and eReader.

   Naija Farm's model, owner's words: "i don't need to sync once i login, and i
   am never logged out". Google signs a reader in ONCE per device; this Worker
   hands back its own session, which slides forward every day it is used, so
   nothing short of "Sign out" (or the device wiping its storage) ends it.

   Each app keeps its own local-first data and its own merge. All this stores is
   one document per reader per app, with an optimistic revision number, plus
   content-addressed media. It never reads either: the merge happens on the
   devices. See docs/plans/2026-10-22-flyleaf-cloud-sync.md for the contract. */

const APPS = new Set(['journal', 'press', 'reader']);
const DOC_MAX = 8 * 1024 * 1024;
const MEDIA_MAX = 25 * 1024 * 1024;
/** One heavy reader must not fill the free 10 GB for everyone. */
const USER_MEDIA_MAX = 1024 * 1024 * 1024;
const DAY = 86400000;
/** A session dies 400 days after it was last SEEN, not after it was made. */
const LIFE = 400 * DAY;

const enc = (s) => new TextEncoder().encode(s);
const dec = (b) => new TextDecoder().decode(b);
function unb64u(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha = async (s) => hex(await crypto.subtle.digest('SHA-256', enc(s)));
const nonce = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));

function cors(req, env) {
  const o = req.headers.get('Origin') || '';
  const ok = env.SITES.split(',').includes(o) || (env.LOCAL === '1' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(o));
  return ok
    ? {
        'Access-Control-Allow-Origin': o,
        'Access-Control-Allow-Headers': 'authorization, content-type, x-rev, x-device',
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Expose-Headers': 'x-rev, x-at, x-device',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      }
    : {};
}
const json = (v, status) => new Response(JSON.stringify(v), { status: status || 200, headers: { 'content-type': 'application/json' } });

/* ---------- Google ID tokens (as Naija Farm, any of the three apps' clients) ---------- */
let gkeys = null, gkeysAt = 0;
async function googleKeys(force) {
  if (!force && gkeys && Date.now() - gkeysAt < 3600000) return gkeys;
  const r = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  gkeys = (await r.json()).keys;
  gkeysAt = Date.now();
  return gkeys;
}
async function verifyGoogle(env, idt) {
  const k = String(idt || '').split('.');
  if (k.length !== 3) return null;
  let head, pay;
  try {
    head = JSON.parse(dec(unb64u(k[0])));
    pay = JSON.parse(dec(unb64u(k[1])));
  } catch {
    return null;
  }
  let jwk = (await googleKeys(false)).find((x) => x.kid === head.kid);
  if (!jwk) jwk = (await googleKeys(true)).find((x) => x.kid === head.kid);
  if (!jwk || head.alg !== 'RS256') return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, unb64u(k[2]), enc(k[0] + '.' + k[1])))) return null;
  if (!env.GOOGLE_CLIENT_IDS.split(',').includes(pay.aud)) return null;
  if (pay.iss !== 'accounts.google.com' && pay.iss !== 'https://accounts.google.com') return null;
  if (pay.exp * 1000 < Date.now() || !pay.sub || !pay.email || pay.email_verified === false) return null;
  return pay;
}

/* ---------- sessions ---------- */
const bearer = (req) => (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
async function session(env, req) {
  const tok = bearer(req);
  if (!tok) return null;
  const hash = await sha(tok);
  const s = await env.DB.prepare('SELECT user_id, seen FROM sessions WHERE hash = ?').bind(hash).first();
  if (!s) return null;
  const now = Date.now();
  if (now - s.seen > LIFE) {
    await env.DB.prepare('DELETE FROM sessions WHERE hash = ?').bind(hash).run();
    return null;
  }
  // Once a day is enough to keep it sliding, and keeps D1 writes off every poll.
  if (now - s.seen > DAY) await env.DB.prepare('UPDATE sessions SET seen = ? WHERE hash = ?').bind(now, hash).run();
  return { uid: s.user_id, hash };
}

/* ---------- routes ---------- */
async function signIn(env, req) {
  const body = await req.json().catch(() => ({}));
  const app = APPS.has(body.app) ? body.app : 'journal';
  const g = await verifyGoogle(env, body.credential);
  if (!g) return json({ error: 'google' }, 401);
  const uid = 'g' + g.sub, now = Date.now(), token = nonce(32);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO users (id, email, name, created) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name')
      .bind(uid, g.email, g.name || null, now),
    env.DB.prepare('INSERT INTO sessions (hash, user_id, app, seen) VALUES (?, ?, ?, ?)').bind(await sha(token), uid, app, now),
  ]);
  return json({ token, user: { email: g.email, name: g.name || '' } });
}

async function getDoc(env, req, s, app) {
  const row = await env.DB.prepare('SELECT rev, at, device, obj FROM docs WHERE user_id = ? AND app = ?').bind(s.uid, app).first();
  if (!row) return json({ error: 'none' }, 404);
  const meta = { 'x-rev': String(row.rev), 'x-at': String(row.at), 'x-device': row.device || '' };
  // Nothing new since this device last looked: one D1 read, no R2 read.
  if (req.method === 'HEAD' || req.headers.get('x-rev') === String(row.rev)) return new Response(null, { status: 204, headers: meta });
  const obj = await env.BUCKET.get(row.obj);
  if (!obj) return json({ error: 'lost' }, 500);
  return new Response(obj.body, { headers: Object.assign({ 'content-type': 'application/json' }, meta) });
}

async function putDoc(env, req, s, app) {
  const base = Number(req.headers.get('x-rev')) || 0;
  const device = (req.headers.get('x-device') || '').slice(0, 80);
  const row = await env.DB.prepare('SELECT rev, prev FROM docs WHERE user_id = ? AND app = ?').bind(s.uid, app).first();
  if ((row ? row.rev : 0) !== base) return json({ rev: row ? row.rev : 0 }, 409);

  const body = await req.arrayBuffer();
  if (body.byteLength > DOC_MAX) return json({ error: 'big' }, 413);
  const rev = base + 1, at = Date.now();
  /* A key no other writer can share. Two devices racing for the same rev each
     write their own object; D1 below lets exactly one of them claim it. */
  const key = `d/${s.uid}/${app}/${rev}-${nonce(6)}`;
  await env.BUCKET.put(key, body, { httpMetadata: { contentType: 'application/json' } });

  const claim = base === 0
    ? env.DB.prepare('INSERT INTO docs (user_id, app, rev, at, device, size, obj) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING')
        .bind(s.uid, app, rev, at, device, body.byteLength, key)
    : env.DB.prepare('UPDATE docs SET rev = ?, at = ?, device = ?, size = ?, prev = obj, obj = ? WHERE user_id = ? AND app = ? AND rev = ?')
        .bind(rev, at, device, body.byteLength, key, s.uid, app, base);
  const done = await claim.run();
  if (!done.meta.changes) {
    await env.BUCKET.delete(key);
    const now = await env.DB.prepare('SELECT rev FROM docs WHERE user_id = ? AND app = ?').bind(s.uid, app).first();
    return json({ rev: now ? now.rev : 0 }, 409);
  }
  // The previous revision stays as a one-step undo; the one before it goes.
  if (row && row.prev) await env.BUCKET.delete(row.prev);
  return json({ rev, at });
}

async function dropDoc(env, s, app) {
  const row = await env.DB.prepare('SELECT obj, prev FROM docs WHERE user_id = ? AND app = ?').bind(s.uid, app).first();
  const media = await env.DB.prepare('SELECT hash FROM media WHERE user_id = ? AND app = ?').bind(s.uid, app).all();
  const keys = media.results.map((m) => `m/${s.uid}/${m.hash}`);
  if (row) keys.push(row.obj, ...(row.prev ? [row.prev] : []));
  for (let i = 0; i < keys.length; i += 1000) await env.BUCKET.delete(keys.slice(i, i + 1000));
  await env.DB.batch([
    env.DB.prepare('DELETE FROM docs WHERE user_id = ? AND app = ?').bind(s.uid, app),
    env.DB.prepare('DELETE FROM media WHERE user_id = ? AND app = ?').bind(s.uid, app),
  ]);
  return json({ removed: keys.length });
}

const isHash = (h) => /^[0-9a-f]{64}$/.test(h);

async function missing(env, req, s) {
  const body = await req.json().catch(() => ({}));
  const hashes = (Array.isArray(body.hashes) ? body.hashes : []).filter(isHash).slice(0, 2000);
  // json_each, because D1 caps a query at 100 bound parameters.
  const have = await env.DB.prepare('SELECT hash FROM media WHERE user_id = ? AND hash IN (SELECT value FROM json_each(?))')
    .bind(s.uid, JSON.stringify(hashes)).all();
  const got = new Set(have.results.map((r) => r.hash));
  return json({ missing: hashes.filter((h) => !got.has(h)) });
}

/* The hash is the client's word. Checking it here would mean hashing up to
   25 MB inside the free plan's 10 ms of CPU, and a client that lies only
   misfiles its own blob under its own account. */
async function putMedia(env, req, s, hash, url) {
  const app = APPS.has(url.searchParams.get('app')) ? url.searchParams.get('app') : 'journal';
  const size = Number(req.headers.get('content-length')) || 0;
  if (size > MEDIA_MAX) return json({ error: 'big' }, 413);
  const has = await env.DB.prepare('SELECT 1 FROM media WHERE user_id = ? AND hash = ?').bind(s.uid, hash).first();
  if (has) return json({ ok: true });
  const used = await env.DB.prepare('SELECT COALESCE(SUM(size), 0) AS n FROM media WHERE user_id = ?').bind(s.uid).first();
  if (used.n + size > USER_MEDIA_MAX) return json({ error: 'full' }, 413);
  const body = await req.arrayBuffer();
  if (body.byteLength > MEDIA_MAX) return json({ error: 'big' }, 413);
  const type = (req.headers.get('content-type') || 'application/octet-stream').slice(0, 100);
  await env.BUCKET.put(`m/${s.uid}/${hash}`, body, { httpMetadata: { contentType: type } });
  await env.DB.prepare('INSERT INTO media (user_id, hash, app, type, size, at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING')
    .bind(s.uid, hash, app, type, body.byteLength, Date.now()).run();
  return json({ ok: true });
}

async function getMedia(env, s, hash) {
  const obj = await env.BUCKET.get(`m/${s.uid}/${hash}`);
  if (!obj) return json({ error: 'none' }, 404);
  return new Response(obj.body, {
    headers: { 'content-type': obj.httpMetadata?.contentType || 'application/octet-stream', 'cache-control': 'private, max-age=31536000, immutable' },
  });
}

async function route(env, req, url) {
  const [, a, b] = url.pathname.split('/');
  const m = req.method;
  if (a === 'health') return json({ ok: true });
  if (a === 'auth' && b === 'google' && m === 'POST') return signIn(env, req);

  const s = await session(env, req);
  if (!s) return json({ error: 'session' }, 401);

  if (a === 'me' && m === 'GET') {
    const u = await env.DB.prepare('SELECT email, name FROM users WHERE id = ?').bind(s.uid).first();
    return u ? json({ user: { email: u.email, name: u.name || '' } }) : json({ error: 'session' }, 401);
  }
  if (a === 'auth' && b === 'out' && m === 'POST') {
    await env.DB.prepare('DELETE FROM sessions WHERE hash = ?').bind(s.hash).run();
    return json({ ok: true });
  }
  if (a === 'doc' && APPS.has(b)) {
    if (m === 'GET' || m === 'HEAD') return getDoc(env, req, s, b);
    if (m === 'PUT') return putDoc(env, req, s, b);
    if (m === 'DELETE') return dropDoc(env, s, b);
  }
  if (a === 'media' && b === 'missing' && m === 'POST') return missing(env, req, s);
  if (a === 'media' && isHash(b)) {
    if (m === 'PUT') return putMedia(env, req, s, b, url);
    if (m === 'GET') return getMedia(env, s, b);
  }
  return json({ error: 'route' }, 404);
}

export default {
  async fetch(req, env) {
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    let res;
    try {
      res = await route(env, req, new URL(req.url));
    } catch (e) {
      console.error(e);
      res = json({ error: 'server' }, 500);
    }
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(h)) out.headers.set(k, v);
    if (!out.headers.has('cache-control')) out.headers.set('cache-control', 'no-store');
    return out;
  },
};
