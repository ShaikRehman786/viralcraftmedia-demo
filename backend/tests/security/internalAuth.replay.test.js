import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-secret-key-0123456789';

const { signInternalPayload, verifyInternalRequest } = await import('../../shared/security/internalAuth.js');

function createAtomicMemoryNonceStore() {
  const map = new Map(); // key -> expiresAt
  return {
    reserve(key, ttlSeconds) {
      const now = Date.now();
      const exp = map.get(key);
      if (exp && exp > now) return false; // replay
      if (exp && exp <= now) map.delete(key);
      // atomic in single-threaded JS event loop turn; sufficient for correctness test
      if (map.has(key) && map.get(key) > now) return false;
      map.set(key, now + ttlSeconds * 1000);
      return true;
    },
    has(key) { const exp = map.get(key); return !!exp && exp > Date.now(); },
    expireNow(key) { map.set(key, Date.now() - 1); },
    clear() { map.clear(); }
  };
}

function makeApp(store) {
  const app = express();
  app.use(express.json({
    verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); }
  }));
  if (store) app.set('internalNonceStore', store);
  app.post('/internal/action', verifyInternalRequest, (req, res) => {
    res.status(200).json({ ok: true, service: req.internalService });
  });
  return app;
}

async function withServer(app, fn) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

function signedRequest({ service = 'svc', method = 'POST', path = '/internal/action', body = { a: 1 }, nonce, timestamp } = {}) {
  const bodyStr = body === undefined ? '' : JSON.stringify(body);
  const n = nonce || crypto.randomBytes(16).toString('hex');
  const ts = timestamp || Date.now().toString();
  const headers = signInternalPayload({ serviceName: service, method, path, body: bodyStr, rawBody: bodyStr, nonce: n, timestamp: ts });
  return { headers, bodyStr, nonce: n, timestamp: ts };
}

test('Replay protection: valid request accepted once', async () => {
  const store = createAtomicMemoryNonceStore();
  const app = makeApp(store);
  await withServer(app, async (base) => {
    const { headers, bodyStr } = signedRequest();
    const res = await fetch(`${base}/internal/action`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: bodyStr });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);
  });
});

test('Replay protection: identical request rejected on second submission', async () => {
  const store = createAtomicMemoryNonceStore();
  const app = makeApp(store);
  await withServer(app, async (base) => {
    const { headers, bodyStr } = signedRequest();
    const r1 = await fetch(`${base}/internal/action`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: bodyStr });
    assert.equal(r1.status, 200);
    const r2 = await fetch(`${base}/internal/action`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: bodyStr });
    assert.equal(r2.status, 401);
    const j2 = await r2.json();
    assert.equal(j2.success, false);
    assert.match(JSON.stringify(j2), /replay|nonce/i);
  });
});

test('Replay protection: five concurrent identical requests result in only one accepted request', async () => {
  const store = createAtomicMemoryNonceStore();
  const app = makeApp(store);
  await withServer(app, async (base) => {
    const { headers, bodyStr } = signedRequest();
    const reqs = Array.from({ length: 5 }, () => fetch(`${base}/internal/action`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: bodyStr }));
    const results = await Promise.all(reqs);
    const codes = results.map(r => r.status).sort();
    const ok = codes.filter(c => c === 200).length;
    const rejected = codes.filter(c => c !== 200).length;
    assert.equal(ok, 1, `expected exactly 1 accepted, got codes ${codes.join(',')}`);
    assert.equal(rejected, 4);
  });
});

test('Replay protection: different nonce permits a new valid request', async () => {
  const store = createAtomicMemoryNonceStore();
  const app = makeApp(store);
  await withServer(app, async (base) => {
    const body = { a: 1 };
    const bodyStr = JSON.stringify(body);
    const ts = Date.now().toString();
    const r1 = await fetch(`${base}/internal/action`, { method: 'POST', headers: { ...signInternalPayload({ serviceName: 'svc', method: 'POST', path: '/internal/action', body: bodyStr, rawBody: bodyStr, nonce: crypto.randomBytes(16).toString('hex'), timestamp: ts }), 'content-type': 'application/json' }, body: bodyStr });
    const r2 = await fetch(`${base}/internal/action`, { method: 'POST', headers: { ...signInternalPayload({ serviceName: 'svc', method: 'POST', path: '/internal/action', body: bodyStr, rawBody: bodyStr, nonce: crypto.randomBytes(16).toString('hex'), timestamp: ts }), 'content-type': 'application/json' }, body: bodyStr });
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
  });
});

test('Replay protection: expired nonce is handled correctly (can be reused only after TTL expiry)', async () => {
  const store = createAtomicMemoryNonceStore();
  const app = makeApp(store);
  await withServer(app, async (base) => {
    const nonce = crypto.randomBytes(16).toString('hex');
    const s1 = signedRequest({ nonce, timestamp: Date.now().toString() });
    const r1 = await fetch(`${base}/internal/action`, { method: 'POST', headers: { ...s1.headers, 'content-type': 'application/json' }, body: s1.bodyStr });
    assert.equal(r1.status, 200);
    // force expiry of stored nonce, but request must be freshly signed with valid timestamp to be accepted
    store.expireNow(`internal:nonce:${nonce}`);
    const s2 = signedRequest({ nonce, timestamp: Date.now().toString() });
    const r2 = await fetch(`${base}/internal/action`, { method: 'POST', headers: { ...s2.headers, 'content-type': 'application/json' }, body: s2.bodyStr });
    assert.equal(r2.status, 200);
  });
});

test('Replay protection: Redis failure does not silently bypass protection (fail closed)', async () => {
  // No Redis configured/available in test env and no injected store => must reject
  const app = makeApp(null);
  await withServer(app, async (base) => {
    const { headers, bodyStr } = signedRequest();
    const res = await fetch(`${base}/internal/action`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: bodyStr });
    assert.equal(res.status, 503);
    const j = await res.json();
    assert.equal(j.success, false);
  });
});

test('HMAC middleware: missing nonce/timestamp/signature/service rejected', async () => {
  const store = createAtomicMemoryNonceStore();
  const app = makeApp(store);
  await withServer(app, async (base) => {
    const { headers, bodyStr } = signedRequest();
    for (const h of ['x-internal-nonce', 'x-internal-timestamp', 'x-internal-signature', 'x-internal-service']) {
      const bad = { ...headers, 'content-type': 'application/json' };
      delete bad[h];
      const res = await fetch(`${base}/internal/action`, { method: 'POST', headers: bad, body: bodyStr });
      assert.equal(res.status, 401, `expected 401 when missing ${h}`);
    }
  });
});

test('HMAC middleware: changed method/path/body rejected, invalid signature rejected', async () => {
  const store = createAtomicMemoryNonceStore();
  const app = makeApp(store);
  await withServer(app, async (base) => {
    const { headers, bodyStr } = signedRequest({ method: 'POST', path: '/internal/action', body: { a: 1 } });
    // changed body
    const resBody = await fetch(`${base}/internal/action`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ a: 2 }) });
    assert.equal(resBody.status, 403);
    // changed path (sign for different path but send to /internal/action)
    const alt = signedRequest({ path: '/internal/other', body: { a: 1 } });
    const resPath = await fetch(`${base}/internal/action`, { method: 'POST', headers: { ...alt.headers, 'content-type': 'application/json' }, body: alt.bodyStr });
    assert.equal(resPath.status, 403);
    // invalid signature
    const badSig = { ...headers, 'x-internal-signature': '0'.repeat(64), 'content-type': 'application/json' };
    const resSig = await fetch(`${base}/internal/action`, { method: 'POST', headers: badSig, body: bodyStr });
    assert.equal(resSig.status, 403);
  });
});

test('HMAC middleware: expired and future timestamp outside window rejected', async () => {
  const store = createAtomicMemoryNonceStore();
  const app = makeApp(store);
  await withServer(app, async (base) => {
    const old = signedRequest({ timestamp: String(Date.now() - 120000) });
    const rOld = await fetch(`${base}/internal/action`, { method: 'POST', headers: { ...old.headers, 'content-type': 'application/json' }, body: old.bodyStr });
    assert.equal(rOld.status, 401);
    const future = signedRequest({ timestamp: String(Date.now() + 120000) });
    const rFuture = await fetch(`${base}/internal/action`, { method: 'POST', headers: { ...future.headers, 'content-type': 'application/json' }, body: future.bodyStr });
    assert.equal(rFuture.status, 401);
  });
});