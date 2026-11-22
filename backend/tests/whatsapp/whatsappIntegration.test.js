import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-secret-key-0123456789';
process.env.RAZORPAY_KEY_ID = 'rzp_test_placeholder';
process.env.RAZORPAY_KEY_SECRET = 'placeholder';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/whatsapp_integration_test';
process.env.BACKUP_JWT_SECRET = 'test-backup-secret';
process.env.PARTNER_JWT_SECRET = 'test-partner-secret';
process.env.BACKUP_ADMIN_EMAIL = 'backup-admin@example.com';
process.env.BACKUP_ADMIN_PASSWORD = 'test-backup-password';
delete process.env.REDIS_URL;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAppPath = path.resolve(__dirname, '../../../services/whatsapp-service/src/app.js');

const { createApp: createWaApp } = await import(pathToFileURL(serviceAppPath).href);
const { whatsappAdapter } = await import('../../services/whatsappAdapter.js');

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
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

async function stopServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

function createServiceApp({ manager, store }) {
  const app = createWaApp();
  app.set('internalNonceStore', createAtomicMemoryNonceStore());
  app.set('whatsappManager', manager);
  app.set('waMessageStore', store);
  return app;
}

const fakeManager = {
  getStatus: () => ({
    connectionStatus: 'CONNECTED',
    statusText: 'CONNECTED',
    connected: true,
    qrCode: 'service-qr',
    phoneNumber: '919999999999',
    pushName: 'ViralCraft',
    lastHeartbeat: null,
    lastConnectedAt: null,
    reconnectCount: 0,
    qrGeneratedCount: 0,
    sessionRestored: true,
  }),
  getQr: async () => ({ qrCode: 'service-qr' }),
  generateQR: async () => ({ success: true, message: 'QR generation triggered' }),
  reconnect: async () => ({ success: true }),
  logout: async () => ({ success: true }),
  clearSession: async () => ({ success: true }),
  sendMessage: async (phoneNumber, text) => ({
    from: '919999999999',
    to: phoneNumber,
    body: text,
    type: 'out',
    timestamp: new Date(),
  }),
};

const fakeStore = {
  recordMessage: async (doc) => ({ _id: 'integration-msg', ...doc }),
  listMessages: async () => [{ _id: 'integration-msg', body: 'hello' }],
};

async function withService(fn) {
  const app = createServiceApp({ manager: fakeManager, store: fakeStore });
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

test('integration: adapter -> real WA service status/qr over HMAC', async () => {
  await withService(async () => {
    const status = await whatsappAdapter.getStatus();
    assert.equal(status.connectionStatus, 'CONNECTED');
    assert.equal(status.qrCode, 'service-qr');

    const qr = await whatsappAdapter.getQr();
    assert.equal(qr.qrCode, 'service-qr');
  });
});

test('integration: adapter -> real WA service send/messages round trip', async () => {
  await withService(async () => {
    const saved = await whatsappAdapter.sendMessage({ phoneNumber: '91888888888', text: 'hello' });
    assert.equal(saved._id, 'integration-msg');
    assert.equal(saved.type, 'out');

    const messages = await whatsappAdapter.getMessages({ limit: 100 });
    assert.equal(messages.length, 1);
    assert.equal(messages[0]._id, 'integration-msg');
  });
});

test('integration: adapter -> real WA service lifecycle actions', async () => {
  await withService(async () => {
    assert.equal((await whatsappAdapter.generateQr()).success, true);
    assert.equal((await whatsappAdapter.reconnect()).success, true);
    assert.equal((await whatsappAdapter.logout()).success, true);
    assert.equal((await whatsappAdapter.clearSession()).success, true);
  });
});

