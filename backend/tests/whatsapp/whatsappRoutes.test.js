import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mock } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-secret-key-0123456789';
process.env.RAZORPAY_KEY_ID = 'rzp_test_placeholder';
process.env.RAZORPAY_KEY_SECRET = 'placeholder';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/whatsapp_routes_test';
process.env.BACKUP_JWT_SECRET = 'test-backup-secret';
process.env.PARTNER_JWT_SECRET = 'test-partner-secret';
process.env.BACKUP_ADMIN_EMAIL = 'backup-admin@example.com';
process.env.BACKUP_ADMIN_PASSWORD = 'test-backup-password';
delete process.env.REDIS_URL;
delete process.env.WHATSAPP_ADAPTER_ENABLED;
delete process.env.WHATSAPP_SERVICE_URL;

const fakeWhatsappService = {
  getConnectionStatus: () => ({
    qrCode: 'legacy-qr',
    lastHeartbeat: null,
    reconnectCount: 0,
    qrGeneratedCount: 0,
    sessionRestored: false,
  }),
  sendMessage: async () => ({ _id: 'legacy-msg', from: 'a', to: 'b', body: 'hi', type: 'out' }),
  logout: async () => {},
  generateQR: async () => ({ success: true, message: 'QR generation triggered' }),
  reconnect: async () => {},
  handleAdminCommand: async () => {},
};

const fakeMessageModel = {
  find: () => ({
    sort: () => ({
      limit: async () => [{ _id: 'legacy-msg', body: 'hi' }],
    }),
  }),
};

const fakeSessionModel = {
  findOne: async () => ({
    connected: true,
    phoneNumber: '919999999999',
    pushName: 'ViralCraft',
    lastConnectedAt: null,
  }),
};

mock.module('../../services/whatsappService.js', {
  exports: { default: fakeWhatsappService },
});

mock.module('../../middleware/auth.js', {
  exports: {
    protect: (req, res, next) => {
      req.user = { _id: 'user-1', role: 'SUPER_ADMIN', status: 'active' };
      next();
    },
    authorize: (...roles) => (req, res, next) => {
      req.authorizedRoles = roles;
      next();
    },
  },
});

mock.module('../../middleware/rateLimiter.js', {
  exports: { webhookLimiter: (req, res, next) => next() },
});

mock.module('../../models/WhatsAppMessage.js', {
  exports: { default: fakeMessageModel },
});

mock.module('../../models/WhatsAppSession.js', {
  exports: { default: fakeSessionModel },
});

const whatsappRoutes = (await import('../../routes/whatsapp.js')).default;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/whatsapp', whatsappRoutes);
  app.use((err, req, res, _next) => {
    res.status(err.statusCode || 500).json({ error: err.message });
  });
  return app;
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

async function request(base, method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  const text = await res.text();
  if (text) {
    try { json = JSON.parse(text); } catch { json = text; }
  }
  return { status: res.status, json };
}

function setAdapterEnabled(enabled) {
  if (enabled) process.env.WHATSAPP_ADAPTER_ENABLED = 'true';
  else delete process.env.WHATSAPP_ADAPTER_ENABLED;
}

async function withFakeWa(handlerMap, fn) {
  const app = express();
  app.use(express.json());
  for (const [key, handler] of Object.entries(handlerMap)) {
    const [method, path] = key.split(' ');
    app[method.toLowerCase()](path, handler);
  }
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

const waHandlers = {
  'GET /internal/whatsapp/status': (req, res) => res.json({
    success: true,
    status: {
      connectionStatus: 'CONNECTED',
      phoneNumber: '919999999999',
      pushName: 'ViralCraft',
      lastConnectedAt: '2026-01-01T00:00:00.000Z',
      qrCode: 'wa-qr',
      lastHeartbeat: '2026-01-01T00:00:00.000Z',
      reconnectCount: 4,
      qrGeneratedCount: 5,
      sessionRestored: true,
    },
  }),
  'GET /internal/whatsapp/qr': (req, res) => res.json({ success: true, qr: { qrCode: 'wa-qr' } }),
  'POST /internal/whatsapp/generate-qr': (req, res) => res.json({ success: true, result: { success: true } }),
  'POST /internal/whatsapp/reconnect': (req, res) => res.json({ success: true, result: { success: true } }),
  'POST /internal/whatsapp/logout': (req, res) => res.json({ success: true, result: { success: true } }),
  'POST /internal/whatsapp/clear-session': (req, res) => res.json({ success: true, result: { success: true } }),
  'POST /internal/whatsapp/send': (req, res) => res.json({
    success: true,
    data: { _id: 'wa-msg', from: '919999999999', to: '918888888888', body: 'hello', type: 'out' },
  }),
  'GET /internal/whatsapp/messages': (req, res) => res.json({ success: true, data: [{ _id: 'wa-msg' }] }),
};

test('routes (adapter mode): GET /status preserves the public contract', async () => {
  setAdapterEnabled(true);
  await withFakeWa(waHandlers, async () => {
    const app = createApp();
    const { server, base } = await startServer(app);
    try {
      const res = await request(base, 'GET', '/api/whatsapp/status');
      assert.equal(res.status, 200);
      assert.deepEqual(res.json, {
        success: true,
        connected: true,
        phoneNumber: '919999999999',
        pushName: 'ViralCraft',
        lastConnectedAt: '2026-01-01T00:00:00.000Z',
        qrCode: 'wa-qr',
        lastHeartbeat: '2026-01-01T00:00:00.000Z',
        reconnectCount: 4,
        qrGeneratedCount: 5,
        sessionRestored: true,
      });
    } finally {
      await stopServer(server);
    }
  });
});

test('routes (adapter mode): GET /qr preserves {success, qrCode}', async () => {
  setAdapterEnabled(true);
  await withFakeWa(waHandlers, async () => {
    const app = createApp();
    const { server, base } = await startServer(app);
    try {
      const res = await request(base, 'GET', '/api/whatsapp/qr');
      assert.equal(res.status, 200);
      assert.deepEqual(res.json, { success: true, qrCode: 'wa-qr' });
    } finally {
      await stopServer(server);
    }
  });
});

test('routes (adapter mode): POST /send success and validation contracts', async () => {
  setAdapterEnabled(true);
  await withFakeWa(waHandlers, async () => {
    const app = createApp();
    const { server, base } = await startServer(app);
    try {
      const okRes = await request(base, 'POST', '/api/whatsapp/send', { phoneNumber: '91888888888', text: 'hello' });
      assert.equal(okRes.status, 200);
      assert.equal(okRes.json.success, true);
      assert.equal(okRes.json.message, 'Message sent successfully via WhatsApp.');
      assert.equal(okRes.json.data._id, 'wa-msg');

      const badPhone = await request(base, 'POST', '/api/whatsapp/send', { phoneNumber: '123', text: 'hello' });
      assert.equal(badPhone.status, 400);
      assert.equal(badPhone.json.error, 'Validation failed');
      assert.ok(Array.isArray(badPhone.json.details));

      const badText = await request(base, 'POST', '/api/whatsapp/send', { phoneNumber: '91888888888', text: '' });
      assert.equal(badText.status, 400);
      assert.equal(badText.json.error, 'Validation failed');
    } finally {
      await stopServer(server);
    }
  });
});

test('routes (adapter mode): lifecycle actions preserve success messages', async () => {
  setAdapterEnabled(true);
  await withFakeWa(waHandlers, async () => {
    const app = createApp();
    const { server, base } = await startServer(app);
    try {
      const logout = await request(base, 'POST', '/api/whatsapp/logout');
      assert.equal(logout.status, 200);
      assert.equal(logout.json.message, 'Logged out from WhatsApp device successfully.');

      const qr = await request(base, 'POST', '/api/whatsapp/generate-qr');
      assert.equal(qr.status, 200);
      assert.equal(qr.json.message, 'QR code generation triggered. Scan with WhatsApp to link.');

      const reconnect = await request(base, 'POST', '/api/whatsapp/reconnect');
      assert.equal(reconnect.status, 200);
      assert.equal(reconnect.json.message, 'WhatsApp reconnect triggered.');

      const clear = await request(base, 'POST', '/api/whatsapp/clear-session');
      assert.equal(clear.status, 200);
      assert.equal(clear.json.message, 'Session cleared. Generate a new QR to link WhatsApp.');
    } finally {
      await stopServer(server);
    }
  });
});

test('routes (adapter mode): generate-qr failure maps to 500 {error}', async () => {
  setAdapterEnabled(true);
  await withFakeWa({
    'POST /internal/whatsapp/generate-qr': (req, res) => res.status(409).json({
      success: false,
      result: { success: false, error: 'Shutdown in progress' },
    }),
  }, async () => {
    const app = createApp();
    const { server, base } = await startServer(app);
    try {
      const res = await request(base, 'POST', '/api/whatsapp/generate-qr');
      assert.equal(res.status, 500);
      assert.equal(res.json.error, 'Shutdown in progress');
    } finally {
      await stopServer(server);
    }
  });
});

test('routes (adapter mode): GET /messages preserves {success, data}', async () => {
  setAdapterEnabled(true);
  await withFakeWa(waHandlers, async () => {
    const app = createApp();
    const { server, base } = await startServer(app);
    try {
      const res = await request(base, 'GET', '/api/whatsapp/messages');
      assert.equal(res.status, 200);
      assert.deepEqual(res.json, { success: true, data: [{ _id: 'wa-msg' }] });
    } finally {
      await stopServer(server);
    }
  });
});

test('routes (adapter mode): unavailable WA service yields controlled 500 errors without crashing', async () => {
  setAdapterEnabled(true);
  const previous = process.env.WHATSAPP_SERVICE_URL;
  process.env.WHATSAPP_SERVICE_URL = 'http://127.0.0.1:1';
  const app = createApp();
  const { server, base } = await startServer(app);
  try {
    const status = await request(base, 'GET', '/api/whatsapp/status');
    assert.equal(status.status, 500);
    assert.ok(status.json.error);

    const send = await request(base, 'POST', '/api/whatsapp/send', { phoneNumber: '91888888888', text: 'hello' });
    assert.equal(send.status, 500);
    assert.ok(send.json.error);

    const messages = await request(base, 'GET', '/api/whatsapp/messages');
    assert.equal(messages.status, 500);
    assert.ok(messages.json.error);
  } finally {
    if (previous === undefined) delete process.env.WHATSAPP_SERVICE_URL;
    else process.env.WHATSAPP_SERVICE_URL = previous;
    await stopServer(server);
  }
});

test('routes (legacy mode): status/qr/messages/send preserve the existing contract', async () => {
  setAdapterEnabled(false);
  const app = createApp();
  const { server, base } = await startServer(app);
  try {
    const status = await request(base, 'GET', '/api/whatsapp/status');
    assert.equal(status.status, 200);
    assert.equal(status.json.success, true);
    assert.equal(status.json.connected, true);
    assert.equal(status.json.phoneNumber, '919999999999');
    assert.equal(status.json.qrCode, 'legacy-qr');

    const qr = await request(base, 'GET', '/api/whatsapp/qr');
    assert.deepEqual(qr.json, { success: true, qrCode: 'legacy-qr' });

    const messages = await request(base, 'GET', '/api/whatsapp/messages');
    assert.deepEqual(messages.json, { success: true, data: [{ _id: 'legacy-msg', body: 'hi' }] });

    const send = await request(base, 'POST', '/api/whatsapp/send', { phoneNumber: '91888888888', text: 'hello' });
    assert.equal(send.status, 200);
    assert.equal(send.json.message, 'Message sent successfully via WhatsApp.');
    assert.equal(send.json.data._id, 'legacy-msg');
  } finally {
    await stopServer(server);
  }
});

test('routes (legacy mode): generate-qr failure maps to 500 {error}', async () => {
  setAdapterEnabled(false);
  const original = fakeWhatsappService.generateQR;
  fakeWhatsappService.generateQR = async () => ({ success: false, error: 'Failed to generate QR code.' });
  const app = createApp();
  const { server, base } = await startServer(app);
  try {
    const res = await request(base, 'POST', '/api/whatsapp/generate-qr');
    assert.equal(res.status, 500);
    assert.equal(res.json.error, 'Failed to generate QR code.');
  } finally {
    fakeWhatsappService.generateQR = original;
    await stopServer(server);
  }
});

test('routes: /inbound keeps the local CRM command path and validation contract', async () => {
  setAdapterEnabled(true);
  let handled = null;
  const original = fakeWhatsappService.handleAdminCommand;
  fakeWhatsappService.handleAdminCommand = async (user, text, msg, senderPhone) => {
    handled = { user, text, senderPhone };
  };
  const app = createApp();
  const { server, base } = await startServer(app);
  try {
    const okRes = await request(base, 'POST', '/api/whatsapp/inbound', { text: 'HELP' });
    assert.equal(okRes.status, 200);
    assert.equal(okRes.json.message, 'Inbound WhatsApp command processed successfully.');
    assert.equal(handled.text, 'HELP');
    assert.equal(handled.senderPhone, '919440720814');

    const bad = await request(base, 'POST', '/api/whatsapp/inbound', { text: '' });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.error, 'Validation failed');
  } finally {
    fakeWhatsappService.handleAdminCommand = original;
    await stopServer(server);
  }
});

