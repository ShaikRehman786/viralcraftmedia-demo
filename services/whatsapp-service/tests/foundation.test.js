import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

// Ensure service env defaults don't pull a real redis in tests
process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'test-internal-secret-key-0123456789';
delete process.env.REDIS_URL; // force replay store unavailable unless custom store provided

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy imports after env set
const { createApp } = await import('../src/app.js');
const internalAuth = await import('../src/security/internalAuth.js');

function startServer(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port, base: `http://127.0.0.1:${port}` });
    });
  });
}

async function requestJson(base, method, reqPath, body, headers = {}) {
  const url = new URL(reqPath, base);
  const payload = body == null ? '' : (typeof body === 'string' ? body : JSON.stringify(body));
  const res = await fetch(url, {
    method,
    headers: {
      ...(payload ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: ['GET', 'HEAD'].includes(method) ? undefined : payload,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, json, text, headers: res.headers };
}

function signHeaders({ service = 'crm-main', method = 'GET', path: p = '/internal/whatsapp/status', body = '', timestamp, nonce }) {
  return internalAuth.signInternalPayload({
    serviceName: service,
    method,
    path: p,
    body,
    rawBody: typeof body === 'string' ? body : JSON.stringify(body || {}),
    timestamp: timestamp != null ? String(timestamp) : String(Date.now()),
    nonce: nonce || crypto.randomBytes(16).toString('hex'),
  });
}

function makeAppWithNonceStore() {
  const app = createApp();
  const nonces = new Map();
  app.set('internalNonceStore', {
    reserve: async (key) => {
      if (nonces.has(key)) return false;
      nonces.set(key, Date.now());
      return true;
    },
  });
  return app;
}

test('startup: createApp returns express app and serves requests', async () => {
  const app = createApp();
  const { server, base } = await startServer(app);
  try {
    const res = await requestJson(base, 'GET', '/health');
    assert.equal(res.status, 200);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('health endpoint: unauthenticated GET /health returns 200 with service status', async () => {
  const app = createApp();
  const { server, base } = await startServer(app);
  try {
    const res = await requestJson(base, 'GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.json.success, true);
    assert.equal(res.json.service, 'whatsapp-service');
    assert.ok(res.json.whatsapp && typeof res.json.whatsapp.connectionStatus === 'string');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('internal auth: missing HMAC headers rejected', async () => {
  const app = createApp();
  const { server, base } = await startServer(app);
  try {
    const res = await requestJson(base, 'GET', '/internal/whatsapp/status');
    assert.equal(res.status, 401);
    assert.equal(res.json.success, false);
    assert.equal(res.json.error.code, 'INTERNAL_AUTH_HEADERS_MISSING');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('internal auth: invalid signature rejected', async () => {
  const app = makeAppWithNonceStore();
  const { server, base } = await startServer(app);
  try {
    const headers = signHeaders({ path: '/internal/whatsapp/status' });
    headers['x-internal-signature'] = '0'.repeat(64);
    const res = await requestJson(base, 'GET', '/internal/whatsapp/status', null, headers);
    assert.equal(res.status, 403);
    assert.equal(res.json.error.code, 'INTERNAL_AUTH_SIGNATURE_INVALID');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('internal auth: expired timestamp rejected', async () => {
  const app = makeAppWithNonceStore();
  const { server, base } = await startServer(app);
  try {
    const oldTs = String(Date.now() - 5 * 60 * 1000);
    const headers = signHeaders({ path: '/internal/whatsapp/status', timestamp: oldTs });
    const res = await requestJson(base, 'GET', '/internal/whatsapp/status', null, headers);
    assert.equal(res.status, 401);
    assert.equal(res.json.error.code, 'INTERNAL_AUTH_TIMESTAMP_INVALID');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('internal auth: replay protection rejects reused nonce when store available', async () => {
  const app = makeAppWithNonceStore();
  const { server, base } = await startServer(app);
  try {
    const nonce = crypto.randomBytes(16).toString('hex');
    const headers = signHeaders({ path: '/internal/whatsapp/status', nonce, timestamp: String(Date.now()) });
    const first = await requestJson(base, 'GET', '/internal/whatsapp/status', null, headers);
    assert.equal(first.status, 200);
    const second = await requestJson(base, 'GET', '/internal/whatsapp/status', null, headers);
    assert.equal(second.status, 401);
    assert.equal(second.json.error.code, 'INTERNAL_AUTH_REPLAY_DETECTED');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('internal auth: Redis/replay-store unavailable fails closed (503)', async () => {
  const app = createApp(); // no custom store, REDIS_URL unset => service redis unavailable
  const { server, base } = await startServer(app);
  try {
    const headers = signHeaders({ path: '/internal/whatsapp/status' });
    const res = await requestJson(base, 'GET', '/internal/whatsapp/status', null, headers);
    assert.equal(res.status, 503);
    assert.equal(res.json.error.code, 'INTERNAL_AUTH_REPLAY_PROTECTION_UNAVAILABLE');
  } finally {
    await new Promise((r) => server.close(r));
  }
});
