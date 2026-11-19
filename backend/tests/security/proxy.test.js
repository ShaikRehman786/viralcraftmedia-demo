import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import rateLimit from 'express-rate-limit';

function parseTrustProxySetting(raw) {
  if (raw == null || raw === '') return undefined;
  const v = String(raw).trim();
  if (v.toLowerCase() === 'true') return true;
  if (v.toLowerCase() === 'false') return false;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (v.includes(',')) return v.split(',').map((s) => s.trim()).filter(Boolean);
  return v;
}

function resolveTrustProxySetting({ TRUST_PROXY, TRUST_PROXY_HOPS } = {}) {
  const explicit = parseTrustProxySetting(TRUST_PROXY);
  const legacy = TRUST_PROXY_HOPS != null && TRUST_PROXY_HOPS !== '' ? parseInt(TRUST_PROXY_HOPS, 10) : undefined;
  if (explicit !== undefined) return explicit;
  if (Number.isFinite(legacy)) return legacy;
  return false; // safe default: do not trust forwarded headers unless explicitly configured
}

async function withServer(app, fn) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  try {
    return await fn(port);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

async function getJson(port, path, headers = {}, socketHost = '127.0.0.1') {
  const res = await fetch(`http://${socketHost}:${port}${path}`, { headers });
  return { status: res.status, json: await res.json() };
}

test('Proxy hardening: default safe config does not trust forwarded headers (direct spoof ignored)', async () => {
  const app = express();
  app.set('trust proxy', resolveTrustProxySetting({}));
  app.get('/ip', (req, res) => res.json({ ip: req.ip }));
  await withServer(app, async (port) => {
    const r = await getJson(port, '/ip', { 'x-forwarded-for': '203.0.113.9' });
    assert.equal(r.status, 200);
    assert.notEqual(r.json.ip, '203.0.113.9');
    assert.match(String(r.json.ip), /127\.0\.0\.1|::1|::ffff:127\.0\.0\.1/);
  });
});

test('Proxy hardening: direct Render access cannot spoof arbitrary client IPs when not trusted', async () => {
  const app = express();
  app.set('trust proxy', false);
  app.get('/ip', (req, res) => res.json({ ip: req.ip }));
  await withServer(app, async (port) => {
    const a = await getJson(port, '/ip', { 'x-forwarded-for': '198.51.100.1' });
    const b = await getJson(port, '/ip', { 'x-forwarded-for': '198.51.100.2' });
    assert.equal(a.json.ip, b.json.ip, 'spoofed XFF must not change resolved IP on direct/untrusted connection');
  });
});

test('Proxy hardening: explicitly configured trusted proxy resolves correct client IP (verified-ingress scenario)', async () => {
  const app = express();
  // Simulate a verified single trusted proxy hop in front of app (e.g. known load balancer)
  // that appends the originating client IP. With trust proxy = 1 and direct peer as that hop,
  // Express resolves the client IP from the forwarded chain.
  app.set('trust proxy', 1);
  app.get('/ip', (req, res) => res.json({ ip: req.ip }));
  await withServer(app, async (port) => {
    const r = await getJson(port, '/ip', { 'x-forwarded-for': '203.0.113.50' });
    assert.equal(r.status, 200);
    assert.equal(r.json.ip, '203.0.113.50');
  });
});

test('Proxy hardening: forged forwarded headers ignored unless from trusted proxy per config', async () => {
  const app = express();
  app.set('trust proxy', '127.0.0.1'); // trust only loopback proxy; direct socket peer in this test is loopback but we simulate untrusted chain logic via config contrast
  app.get('/ip', (req, res) => res.json({ ip: req.ip }));
  // When trusted proxy setting applies to connection, left-most is used; use a stricter untrusted example instead:
  const app2 = express();
  app2.set('trust proxy', '10.0.0.0/8');
  app2.get('/ip', (req, res) => res.json({ ip: req.ip }));
  await withServer(app2, async (port) => {
    const r = await getJson(port, '/ip', { 'x-forwarded-for': '203.0.113.77' });
    assert.notEqual(r.json.ip, '203.0.113.77', 'untrusted peer must not be able to set client IP via XFF');
  });
});

test('Proxy hardening: rate limiting uses resolved client IP (untrusted spoof cannot create separate buckets)', async () => {
  const app = express();
  app.set('trust proxy', false);
  const limiter = rateLimit({ windowMs: 60_000, max: 2, standardHeaders: true, legacyHeaders: false, validate: { xForwardedForHeader: false } });
  app.use(limiter);
  app.get('/limited', (req, res) => res.json({ ip: req.ip, ok: true }));
  await withServer(app, async (port) => {
    const h1 = { 'x-forwarded-for': '198.51.100.10' };
    const h2 = { 'x-forwarded-for': '198.51.100.11' };
    const r1 = await fetch(`http://127.0.0.1:${port}/limited`, { headers: h1 });
    const r2 = await fetch(`http://127.0.0.1:${port}/limited`, { headers: h2 });
    const r3 = await fetch(`http://127.0.0.1:${port}/limited`, { headers: { 'x-forwarded-for': '198.51.100.12' } });
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(r3.status, 429, 'third request should be rate-limited by same resolved IP despite spoofed XFF values');
  });
});

test('Proxy hardening: security-incident/logging IP source is consistent (req.ip) under safe config', async () => {
  const app = express();
  app.set('trust proxy', false);
  app.get('/incident-ip', (req, res) => {
    // mirrors hardened logging behavior: use resolved req.ip, not raw forwarded headers
    const normalized = String(req.ip || req.socket?.remoteAddress || 'unknown').toLowerCase();
    res.json({ ip: req.ip, normalized });
  });
  await withServer(app, async (port) => {
    const r = await getJson(port, '/incident-ip', { 'x-forwarded-for': '203.0.113.200' });
    assert.notEqual(r.json.ip, '203.0.113.200');
    assert.equal(r.json.normalized, String(r.json.ip).toLowerCase());
  });
});