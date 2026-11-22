import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'test-internal-secret-key-0123456789';
delete process.env.REDIS_URL;

const { createWhatsAppManager } = await import('../src/services/whatsappManager.js');

function tmpServiceConfig(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return {
    nodeEnv: 'test',
    port: 5001,
    serviceName: 'whatsapp-service-test',
    internalServiceKey: process.env.INTERNAL_SERVICE_KEY,
    redisUrl: '',
    whatsappClientId: 'vcm-crm-whatsapp-test-isolated',
    sessionBaseDir: path.join(root, '.wwebjs_auth'),
    clearSessionOnLogout: true,
    puppeteerCacheDir: path.join(root, '.cache', 'puppeteer'),
    // Force browser-unavailable fast failure for init attempts in tests
    puppeteerExecutablePath: path.join(root, 'missing-chrome-binary'),
  };
}

async function withTimeout(promise, ms, label = 'operation') {
  let t;
  const timeout = new Promise((_, reject) => { t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms); });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
}

class SlowQrClient {
  constructor() { this._listeners = {}; this.info = { wid: { user: '' }, pushname: '' }; }
  on(event, cb) { this._listeners[event] = cb; }
  removeAllListeners() { this._listeners = {}; }
  async initialize() {
    await new Promise((r) => setTimeout(r, 150));
    setTimeout(() => { if (this._listeners.qr) this._listeners.qr('fake-qr-payload'); }, 10);
    return;
  }
  async destroy() {}
  async logout() {}
  async getState() { return 'CONFLICT'; }
}

test('init protection: concurrent init calls join/reject duplicate active init (single flight)', async () => {
  const mgr = createWhatsAppManager({ config: tmpServiceConfig('wa-init-'), Client: SlowQrClient, qrcode: { toDataURL: async () => 'data:image/png;base64,FAKEQR' } });
  try {
    const p1 = mgr.init().catch((e) => ({ failed: true, error: e?.message }));
    const p2 = mgr.init().catch((e) => ({ failed: true, error: e?.message }));
    const statusDuring = mgr.getStatus();
    assert.equal(statusDuring.isInitializing, true, 'should report initializing during in-flight init');
    const [r1, r2] = await withTimeout(Promise.all([p1, p2]), 15000, 'init pair');
    assert.ok(r1 !== undefined && r2 !== undefined);
    const final = mgr.getStatus();
    assert.equal(final.isInitializing, false, 'isInitializing must be false after init settles');
  } finally {
    await withTimeout(mgr.shutdown(), 10000, 'shutdown');
  }
});

class ThrowingClient {
  constructor() { this._listeners = {}; }
  on(event, cb) { this._listeners[event] = cb; }
  removeAllListeners() { this._listeners = {}; }
  async initialize() { throw new Error('Browser executable not found or failed to launch'); }
  async destroy() {}
  async logout() {}
  async getState() { return null; }
}

class QrClient {
  constructor() { this._listeners = {}; this.info = { wid: { user: '' }, pushname: '' }; }
  on(event, cb) { this._listeners[event] = cb; }
  removeAllListeners() { this._listeners = {}; }
  async initialize() {
    setTimeout(() => { if (this._listeners.qr) this._listeners.qr('fake-qr-payload'); }, 10);
    return;
  }
  async destroy() {}
  async logout() {}
  async getState() { return 'CONFLICT'; }
}

test('browser unavailable behavior: init fails clearly and service remains queryable', async () => {
  const mgr = createWhatsAppManager({ config: tmpServiceConfig('wa-browser-'), Client: ThrowingClient });
  try {
    let err;
    try {
      await withTimeout(mgr.init(), 10000, 'init');
    } catch (e) {
      err = e;
    }
    assert.ok(err, 'init should fail when browser/session bootstrap fails');
    const status = mgr.getStatus();
    assert.equal(status.connectionStatus, 'DISCONNECTED');
    assert.ok(status.lastError && (status.lastError.code === 'INIT_FAILED' || status.lastError.message));
  } finally {
    await withTimeout(mgr.shutdown(), 10000, 'shutdown');
  }
});

test('QR generation behavior: generateQR triggers init and reports controlled result/status', async () => {
  const mgr = createWhatsAppManager({ config: tmpServiceConfig('wa-qr-'), Client: QrClient, qrcode: { toDataURL: async () => 'data:image/png;base64,FAKEQR' } });
  try {
    const res = await withTimeout(mgr.generateQR(), 15000, 'generateQR');
    assert.equal(res.success, true);
    // wait briefly for async qr event
    await new Promise((r) => setTimeout(r, 50));
    const status = mgr.getStatus();
    assert.ok(['QR_READY', 'DISCONNECTED', 'AUTHENTICATED', 'CONNECTED'].includes(status.connectionStatus));
    const qr = await mgr.getQr();
    assert.equal(typeof qr.qrCode, 'string');
  } finally {
    await withTimeout(mgr.shutdown(), 10000, 'shutdown');
  }
});

test('graceful shutdown: idempotent and cleans lifecycle state', async () => {
  const mgr = createWhatsAppManager({ config: tmpServiceConfig('wa-shutdown-'), Client: SlowQrClient, qrcode: { toDataURL: async () => 'data:image/png;base64,FAKEQR' } });
  const initP = mgr.init().catch(() => {});
  await withTimeout(Promise.all([initP, mgr.shutdown()]), 15000, 'init+shutdown');
  await withTimeout(mgr.shutdown(), 10000, 'shutdown-again');
  const status = mgr.getStatus();
  assert.equal(status.isShuttingDown, true);
  assert.equal(status.connectionStatus, 'DISCONNECTED');
});

test('session isolation guard: refuses production clientId in production env', async () => {
  const cfg = tmpServiceConfig('wa-guard-');
  cfg.nodeEnv = 'production';
  cfg.whatsappClientId = 'vcm-crm-whatsapp';
  const mgr = createWhatsAppManager({ config: cfg });
  await assert.rejects(() => mgr.init(), /Refusing to start WhatsApp client with production clientId/);
});
