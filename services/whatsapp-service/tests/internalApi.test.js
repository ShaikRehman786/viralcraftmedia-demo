import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'crypto';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'test-internal-secret-key-0123456789';
delete process.env.REDIS_URL;
delete process.env.MONGO_URI;
delete process.env.MONGODB_URI;

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

async function stopServer(server) {
  await new Promise((r) => server.close(r));
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
  return { status: res.status, json };
}

function signHeaders({ method, path: p, body }) {
  const payload = body == null ? '' : (typeof body === 'string' ? body : JSON.stringify(body));
  return internalAuth.signInternalPayload({
    serviceName: 'main-api',
    method,
    path: p,
    body: payload,
    rawBody: payload,
    timestamp: String(Date.now()),
    nonce: crypto.randomBytes(16).toString('hex'),
  });
}

function createAtomicMemoryNonceStore() {
  const map = new Map();
  return {
    reserve(key, ttlSeconds) {
      const now = Date.now();
      const exp = map.get(key);
      if (exp && exp > now) return false;
      if (exp && exp <= now) map.delete(key);
      map.set(key, now + ttlSeconds * 1000);
      return true;
    },
  };
}

function makeApp({ manager, store }) {
  const app = createApp();
  app.set('internalNonceStore', createAtomicMemoryNonceStore());
  if (manager) app.set('whatsappManager', manager);
  if (store) app.set('waMessageStore', store);
  return app;
}

function fakeManager(overrides = {}) {
  return {
    getStatus: () => ({ connectionStatus: 'DISCONNECTED' }),
    sendMessage: async () => ({ from: '919999999999', to: '918888888888', body: 'hello', type: 'out', timestamp: new Date() }),
    ...overrides,
  };
}

function fakeStore(overrides = {}) {
  return {
    recordMessage: async (doc) => ({ _id: 'saved-1', ...doc }),
    listMessages: async () => [{ _id: 'saved-1' }],
    ...overrides,
  };
}

test('internal /send: validation failures return 400 VALIDATION_FAILED', async () => {
  const app = makeApp({ manager: fakeManager(), store: fakeStore() });
  const { server, base } = await startServer(app);
  try {
    const res = await requestJson(base, 'POST', '/internal/whatsapp/send', { phoneNumber: '123', text: '' }, signHeaders({ method: 'POST', path: '/internal/whatsapp/send', body: { phoneNumber: '123', text: '' } }));
    assert.equal(res.status, 400);
    assert.equal(res.json.success, false);
    assert.equal(res.json.error.code, 'VALIDATION_FAILED');
    assert.ok(Array.isArray(res.json.error.details));
  } finally {
    await stopServer(server);
  }
});

test('internal /send: success persists through the injected store and returns the saved message', async () => {
  let recorded = null;
  const store = fakeStore({
    recordMessage: async (doc) => { recorded = doc; return { _id: 'saved-1', ...doc }; },
  });
  const app = makeApp({ manager: fakeManager(), store });
  const constBody = { phoneNumber: '91888888888', text: 'hello' };
  const { server, base } = await startServer(app);
  try {
    const res = await requestJson(base, 'POST', '/internal/whatsapp/send', constBody, signHeaders({ method: 'POST', path: '/internal/whatsapp/send', body: constBody }));
    assert.equal(res.status, 200);
    assert.equal(res.json.success, true);
    assert.equal(res.json.data._id, 'saved-1');
    assert.equal(recorded.to, '918888888888');
    assert.equal(recorded.type, 'out');
  } finally {
    await stopServer(server);
  }
});

test('internal /send: not-connected manager returns 409 WA_NOT_CONNECTED', async () => {
  const manager = fakeManager({
    sendMessage: async () => { throw new Error('WhatsApp service not connected.'); },
  });
  const app = makeApp({ manager, store: fakeStore() });
  const body = { phoneNumber: '91888888888', text: 'hello' };
  const { server, base } = await startServer(app);
  try {
    const res = await requestJson(base, 'POST', '/internal/whatsapp/send', body, signHeaders({ method: 'POST', path: '/internal/whatsapp/send', body }));
    assert.equal(res.status, 409);
    assert.equal(res.json.error.code, 'WA_NOT_CONNECTED');
  } finally {
    await stopServer(server);
  }
});

test('internal /send: persistence failure returns 500 WA_SEND_FAILED', async () => {
  const store = fakeStore({
    recordMessage: async () => { throw new Error('mongo down'); },
  });
  const app = makeApp({ manager: fakeManager(), store });
  const body = { phoneNumber: '91888888888', text: 'hello' };
  const { server, base } = await startServer(app);
  try {
    const res = await requestJson(base, 'POST', '/internal/whatsapp/send', body, signHeaders({ method: 'POST', path: '/internal/whatsapp/send', body }));
    assert.equal(res.status, 500);
    assert.equal(res.json.error.code, 'WA_SEND_FAILED');
  } finally {
    await stopServer(server);
  }
});

test('internal /messages: returns the store data with the public success envelope', async () => {
  const app = makeApp({ manager: fakeManager(), store: fakeStore() });
  const { server, base } = await startServer(app);
  try {
    const res = await requestJson(base, 'GET', '/internal/whatsapp/messages?limit=25', null, signHeaders({ method: 'GET', path: '/internal/whatsapp/messages?limit=25' }));
    assert.equal(res.status, 200);
    assert.equal(res.json.success, true);
    assert.deepEqual(res.json.data, [{ _id: 'saved-1' }]);
  } finally {
    await stopServer(server);
  }
});

test('internal /messages: limit is clamped to 100', async () => {
  let receivedLimit = null;
  const store = fakeStore({
    listMessages: async (limit) => { receivedLimit = limit; return []; },
  });
  const app = makeApp({ manager: fakeManager(), store });
  const { server, base } = await startServer(app);
  try {
    const res = await requestJson(base, 'GET', '/internal/whatsapp/messages?limit=5000', null, signHeaders({ method: 'GET', path: '/internal/whatsapp/messages?limit=5000' }));
    assert.equal(res.status, 200);
    assert.equal(receivedLimit, 100);
  } finally {
    await stopServer(server);
  }
});

test('internal /messages: store failure returns 503 WA_MESSAGES_FAILED', async () => {
  const store = fakeStore({
    listMessages: async () => { throw new Error('mongo down'); },
  });
  const app = makeApp({ manager: fakeManager(), store });
  const { server, base } = await startServer(app);
  try {
    const res = await requestJson(base, 'GET', '/internal/whatsapp/messages', null, signHeaders({ method: 'GET', path: '/internal/whatsapp/messages' }));
    assert.equal(res.status, 503);
    assert.equal(res.json.error.code, 'WA_MESSAGES_FAILED');
  } finally {
    await stopServer(server);
  }
});

test('internal /send and /messages still require HMAC authentication', async () => {
  const app = makeApp({ manager: fakeManager(), store: fakeStore() });
  const { server, base } = await startServer(app);
  try {
    const send = await requestJson(base, 'POST', '/internal/whatsapp/send', { phoneNumber: '91888888888', text: 'hello' });
    assert.equal(send.status, 401);
    assert.equal(send.json.error.code, 'INTERNAL_AUTH_HEADERS_MISSING');

    const messages = await requestJson(base, 'GET', '/internal/whatsapp/messages');
    assert.equal(messages.status, 401);
    assert.equal(messages.json.error.code, 'INTERNAL_AUTH_HEADERS_MISSING');
  } finally {
    await stopServer(server);
  }
});

test('messageStore: refuses persistence when MONGO_URI is not configured', async () => {
  const { recordMessage } = await import('../src/services/messageStore.js');
  await assert.rejects(() => recordMessage({ from: 'a', to: 'b', body: 'c', type: 'out' }), /MONGO_URI is not configured/);
});
