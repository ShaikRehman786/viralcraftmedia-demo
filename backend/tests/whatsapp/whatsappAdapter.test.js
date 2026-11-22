import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-secret-key-0123456789';
process.env.RAZORPAY_KEY_ID = 'rzp_test_placeholder';
process.env.RAZORPAY_KEY_SECRET = 'placeholder';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/whatsapp_adapter_test';
process.env.BACKUP_JWT_SECRET = 'test-backup-secret';
process.env.PARTNER_JWT_SECRET = 'test-partner-secret';
process.env.BACKUP_ADMIN_EMAIL = 'backup-admin@example.com';
process.env.BACKUP_ADMIN_PASSWORD = 'test-backup-password';
delete process.env.REDIS_URL;

const { verifyInternalRequest } = await import('../../shared/security/internalAuth.js');
const {
  whatsappAdapter,
  WhatsAppAdapterError,
  mapStatusToPublic,
  mapQrToPublic,
  WHATSAPP_ADAPTER_ERROR_CODES,
} = await import('../../services/whatsappAdapter.js');

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

function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

async function stopServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

function withNonceStore(app) {
  app.set('internalNonceStore', createAtomicMemoryNonceStore());
  return app;
}

function createAuthenticatedApp(handlerMap) {
  const app = express();
  app.use(express.json());
  app.use(verifyInternalRequest);
  for (const [key, handler] of Object.entries(handlerMap)) {
    const [method, path] = key.split(' ');
    app[method.toLowerCase()](path, handler);
  }
  return withNonceStore(app);
}

function ok(res, data) {
  return res.json({ success: true, ...data });
}

async function withFakeWa(handlerMap, fn) {
  const app = createAuthenticatedApp(handlerMap);
  const { server, base } = await startServer(app);
  const previous = process.env.WHATSAPP_SERVICE_URL;
  process.env.WHATSAPP_SERVICE_URL = base;
  try {
    return await fn(base);
  } finally {
    if (previous === undefined) delete process.env.WHATSAPP_SERVICE_URL;
    else process.env.WHATSAPP_SERVICE_URL = previous;
    await stopServer(server);
  }
}

const sampleStatus = {
  service: 'whatsapp-service',
  connectionStatus: 'CONNECTED',
  statusText: 'CONNECTED',
  connected: true,
  qrCode: '',
  phoneNumber: '919999999999',
  pushName: 'ViralCraft',
  lastHeartbeat: '2026-01-01T00:00:00.000Z',
  lastConnectedAt: '2026-01-01T00:00:00.000Z',
  reconnectCount: 2,
  qrGeneratedCount: 3,
  sessionRestored: true,
};

const sampleMessage = {
  _id: '650000000000000000000001',
  from: '919999999999',
  to: '918888888888',
  body: 'hello',
  type: 'out',
  timestamp: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

test('adapter: successful getStatus proxy returns the WA status object', async () => {
  await withFakeWa({
    'GET /internal/whatsapp/status': (req, res) => ok(res, { status: sampleStatus }),
  }, async () => {
    const status = await whatsappAdapter.getStatus();
    assert.equal(status.connectionStatus, 'CONNECTED');
    assert.equal(status.phoneNumber, '919999999999');
  });
});

test('adapter: successful getQr proxy returns the QR payload', async () => {
  await withFakeWa({
    'GET /internal/whatsapp/qr': (req, res) => ok(res, { qr: { qrCode: 'data:image/png;base64,ABC' } }),
  }, async () => {
    const qr = await whatsappAdapter.getQr();
    assert.equal(qr.qrCode, 'data:image/png;base64,ABC');
  });
});

test('adapter: successful sendMessage proxy returns the saved message', async () => {
  let received = null;
  await withFakeWa({
    'POST /internal/whatsapp/send': (req, res) => {
      received = req.body;
      return ok(res, { data: sampleMessage });
    },
  }, async () => {
    const saved = await whatsappAdapter.sendMessage({ phoneNumber: '918888888888', text: 'hello' });
    assert.equal(saved._id, sampleMessage._id);
    assert.equal(received.phoneNumber, '918888888888');
    assert.equal(received.text, 'hello');
    assert.equal(received.purpose, 'manual');
    assert.ok(received.idempotencyKey);
  });
});

test('adapter: getMessages signs and requests the limit query string', async () => {
  let receivedPath = null;
  await withFakeWa({
    'GET /internal/whatsapp/messages': (req, res) => {
      receivedPath = req.originalUrl;
      return ok(res, { data: [sampleMessage] });
    },
  }, async () => {
    const messages = await whatsappAdapter.getMessages({ limit: 42 });
    assert.equal(messages.length, 1);
    assert.match(receivedPath, /^\/internal\/whatsapp\/messages\?limit=42$/);
  });
});

test('adapter: clamps message limit to the 100-message contract', async () => {
  let receivedPath = null;
  await withFakeWa({
    'GET /internal/whatsapp/messages': (req, res) => {
      receivedPath = req.originalUrl;
      return ok(res, { data: [] });
    },
  }, async () => {
    await whatsappAdapter.getMessages({ limit: 5000 });
    assert.match(receivedPath, /limit=100$/);
  });
});

test('adapter: lifecycle action proxies return controlled results', async () => {
  await withFakeWa({
    'POST /internal/whatsapp/generate-qr': (req, res) => ok(res, { result: { success: true, message: 'QR generation triggered' } }),
    'POST /internal/whatsapp/reconnect': (req, res) => ok(res, { result: { success: true } }),
    'POST /internal/whatsapp/logout': (req, res) => ok(res, { result: { success: true } }),
    'POST /internal/whatsapp/clear-session': (req, res) => ok(res, { result: { success: true } }),
  }, async () => {
    assert.equal((await whatsappAdapter.generateQr()).success, true);
    assert.equal((await whatsappAdapter.reconnect()).success, true);
    assert.equal((await whatsappAdapter.logout()).success, true);
    assert.equal((await whatsappAdapter.clearSession()).success, true);
  });
});

test('adapter: authentication failure (401) is surfaced as a non-retryable adapter error', async () => {
  const app = express();
  app.use((req, res) => res.status(401).json({
    success: false,
    error: { code: 'INTERNAL_AUTH_HEADERS_MISSING', message: 'Missing required internal authentication headers.', statusCode: 401 },
  }));
  const { server, base } = await startServer(app);
  const previous = process.env.WHATSAPP_SERVICE_URL;
  process.env.WHATSAPP_SERVICE_URL = base;
  try {
    await assert.rejects(
      () => whatsappAdapter.getStatus(),
      (err) => {
        assert.ok(err instanceof WhatsAppAdapterError);
        assert.equal(err.status, 401);
        assert.equal(err.code, 'INTERNAL_AUTH_HEADERS_MISSING');
        assert.equal(err.retryable, false);
        return true;
      },
    );
  } finally {
    if (previous === undefined) delete process.env.WHATSAPP_SERVICE_URL;
    else process.env.WHATSAPP_SERVICE_URL = previous;
    await stopServer(server);
  }
});

test('adapter: invalid signature (403) is surfaced as a non-retryable adapter error', async () => {
  const app = express();
  app.use((req, res) => res.status(403).json({
    success: false,
    error: { code: 'INTERNAL_AUTH_SIGNATURE_INVALID', message: 'Invalid internal request signature.', statusCode: 403 },
  }));
  const { server, base } = await startServer(app);
  const previous = process.env.WHATSAPP_SERVICE_URL;
  process.env.WHATSAPP_SERVICE_URL = base;
  try {
    await assert.rejects(
      () => whatsappAdapter.getStatus(),
      (err) => err.status === 403 && err.code === 'INTERNAL_AUTH_SIGNATURE_INVALID',
    );
  } finally {
    if (previous === undefined) delete process.env.WHATSAPP_SERVICE_URL;
    else process.env.WHATSAPP_SERVICE_URL = previous;
    await stopServer(server);
  }
});

test('adapter: timeout is bounded and reported as WA_TIMEOUT', async () => {
  const app = express();
  app.get('/internal/whatsapp/status', async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return res.json({ success: true, status: sampleStatus });
  });
  const { server, base } = await startServer(app);
  const previousUrl = process.env.WHATSAPP_SERVICE_URL;
  const previousTimeout = process.env.WHATSAPP_ADAPTER_TIMEOUT_MS;
  const previousRetries = process.env.WHATSAPP_ADAPTER_RETRIES;
  process.env.WHATSAPP_SERVICE_URL = base;
  process.env.WHATSAPP_ADAPTER_TIMEOUT_MS = '80';
  process.env.WHATSAPP_ADAPTER_RETRIES = '0';
  const startedAt = Date.now();
  try {
    await assert.rejects(
      () => whatsappAdapter.getStatus(),
      (err) => {
        assert.equal(err.code, WHATSAPP_ADAPTER_ERROR_CODES.TIMEOUT);
        assert.equal(err.status, 504);
        return true;
      },
    );
    const elapsed = Date.now() - startedAt;
    assert.ok(elapsed < 400, `timeout should be bounded, took ${elapsed}ms`);
  } finally {
    if (previousUrl === undefined) delete process.env.WHATSAPP_SERVICE_URL;
    else process.env.WHATSAPP_SERVICE_URL = previousUrl;
    if (previousTimeout === undefined) delete process.env.WHATSAPP_ADAPTER_TIMEOUT_MS;
    else process.env.WHATSAPP_ADAPTER_TIMEOUT_MS = previousTimeout;
    if (previousRetries === undefined) delete process.env.WHATSAPP_ADAPTER_RETRIES;
    else process.env.WHATSAPP_ADAPTER_RETRIES = previousRetries;
    await stopServer(server);
  }
});

test('adapter: unavailable service is reported as WA_UNAVAILABLE', async () => {
  const previous = process.env.WHATSAPP_SERVICE_URL;
  const previousRetries = process.env.WHATSAPP_ADAPTER_RETRIES;
  process.env.WHATSAPP_SERVICE_URL = 'http://127.0.0.1:1';
  process.env.WHATSAPP_ADAPTER_RETRIES = '0';
  try {
    await assert.rejects(
      () => whatsappAdapter.getStatus(),
      (err) => {
        assert.equal(err.code, WHATSAPP_ADAPTER_ERROR_CODES.UNAVAILABLE);
        assert.equal(err.status, 503);
        return true;
      },
    );
  } finally {
    if (previous === undefined) delete process.env.WHATSAPP_SERVICE_URL;
    else process.env.WHATSAPP_SERVICE_URL = previous;
    if (previousRetries === undefined) delete process.env.WHATSAPP_ADAPTER_RETRIES;
    else process.env.WHATSAPP_ADAPTER_RETRIES = previousRetries;
  }
});

test('adapter: bounded retries recover from transient 503 on idempotent reads', async () => {
  let calls = 0;
  const app = express();
  app.get('/internal/whatsapp/status', (req, res) => {
    calls += 1;
    if (calls < 3) {
      return res.status(503).json({ success: false, error: { code: 'WA_UNAVAILABLE', message: 'temporarily unavailable', statusCode: 503 } });
    }
    return res.json({ success: true, status: sampleStatus });
  });
  const { server, base } = await startServer(app);
  const previousUrl = process.env.WHATSAPP_SERVICE_URL;
  const previousRetries = process.env.WHATSAPP_ADAPTER_RETRIES;
  process.env.WHATSAPP_SERVICE_URL = base;
  process.env.WHATSAPP_ADAPTER_RETRIES = '2';
  try {
    const status = await whatsappAdapter.getStatus();
    assert.equal(status.connectionStatus, 'CONNECTED');
    assert.equal(calls, 3);
  } finally {
    if (previousUrl === undefined) delete process.env.WHATSAPP_SERVICE_URL;
    else process.env.WHATSAPP_SERVICE_URL = previousUrl;
    if (previousRetries === undefined) delete process.env.WHATSAPP_ADAPTER_RETRIES;
    else process.env.WHATSAPP_ADAPTER_RETRIES = previousRetries;
    await stopServer(server);
  }
});

test('adapter: non-idempotent actions are not retried', async () => {
  let calls = 0;
  const app = express();
  app.post('/internal/whatsapp/send', (req, res) => {
    calls += 1;
    return res.status(503).json({ success: false, error: { code: 'WA_UNAVAILABLE', message: 'temporarily unavailable', statusCode: 503 } });
  });
  const { server, base } = await startServer(app);
  const previousUrl = process.env.WHATSAPP_SERVICE_URL;
  const previousRetries = process.env.WHATSAPP_ADAPTER_RETRIES;
  process.env.WHATSAPP_SERVICE_URL = base;
  process.env.WHATSAPP_ADAPTER_RETRIES = '2';
  try {
    await assert.rejects(() => whatsappAdapter.sendMessage({ phoneNumber: '918888888888', text: 'hello' }));
    assert.equal(calls, 1);
  } finally {
    if (previousUrl === undefined) delete process.env.WHATSAPP_SERVICE_URL;
    else process.env.WHATSAPP_SERVICE_URL = previousUrl;
    if (previousRetries === undefined) delete process.env.WHATSAPP_ADAPTER_RETRIES;
    else process.env.WHATSAPP_ADAPTER_RETRIES = previousRetries;
    await stopServer(server);
  }
});

test('adapter: mappers preserve the public status and QR contracts', () => {
  const publicStatus = mapStatusToPublic({
    connectionStatus: 'CONNECTED',
    phoneNumber: '919999999999',
    pushName: 'ViralCraft',
    lastConnectedAt: '2026-01-01T00:00:00.000Z',
    qrCode: 'qr-data',
    lastHeartbeat: '2026-01-01T00:00:00.000Z',
    reconnectCount: 1,
    qrGeneratedCount: 2,
    sessionRestored: true,
  });
  assert.deepEqual(publicStatus, {
    success: true,
    connected: true,
    phoneNumber: '919999999999',
    pushName: 'ViralCraft',
    lastConnectedAt: '2026-01-01T00:00:00.000Z',
    qrCode: 'qr-data',
    lastHeartbeat: '2026-01-01T00:00:00.000Z',
    reconnectCount: 1,
    qrGeneratedCount: 2,
    sessionRestored: true,
  });

  assert.deepEqual(mapQrToPublic({ qrCode: 'qr-data' }), { success: true, qrCode: 'qr-data' });
  assert.deepEqual(mapStatusToPublic({}), {
    success: true,
    connected: false,
    phoneNumber: '',
    pushName: '',
    lastConnectedAt: null,
    qrCode: '',
    lastHeartbeat: null,
    reconnectCount: 0,
    qrGeneratedCount: 0,
    sessionRestored: false,
  });
});

