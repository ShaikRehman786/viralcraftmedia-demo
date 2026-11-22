import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import fs from 'fs';
import os from 'os';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'test-internal-secret-key-0123456789';
delete process.env.REDIS_URL;

const { createWhatsAppManager } = await import('../src/services/whatsappManager.js');

function tmpConfig() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-send-'));
  return {
    nodeEnv: 'test',
    serviceName: 'whatsapp-service-test',
    whatsappClientId: 'vcm-crm-whatsapp-send-test',
    sessionBaseDir: path.join(root, '.wwebjs_auth'),
    clearSessionOnLogout: false,
    waModuleReadyTimeoutMs: 500,
    terminalCooldownMs: 60000,
    initRetryBaseDelayMs: 1,
    puppeteerExecutablePath: '',
    puppeteerCacheDir: '',
  };
}

class FakeClient {
  constructor() {
    this.listeners = {};
    this.info = { wid: { user: '919999999999' }, pushname: 'ViralCraft' };
    this.sent = [];
  }
  on(event, cb) { this.listeners[event] = cb; }
  removeAllListeners() { this.listeners = {}; }
  async initialize() {
    if (this.listeners.ready) await this.listeners.ready();
  }
  async destroy() {}
  async logout() {}
  async getState() { return 'CONNECTED'; }
  async sendMessage(jid, text) { this.sent.push({ jid, text }); }
}

test('manager sendMessage: throws when the client is not connected', async () => {
  const mgr = createWhatsAppManager({ config: tmpConfig(), Client: FakeClient });
  try {
    await assert.rejects(() => mgr.sendMessage('91888888888', 'hi'), /not connected/);
  } finally {
    await mgr.shutdown();
  }
});

test('manager sendMessage: normalizes 10-digit numbers and sends via the client', async () => {
  const mgr = createWhatsAppManager({ config: tmpConfig(), Client: FakeClient });
  try {
    await mgr.init();
    const result = await mgr.sendMessage('8888888888', 'hello');
    const client = mgr.__internal.getClient();
    assert.equal(client.sent.length, 1);
    assert.equal(client.sent[0].jid, '918888888888@c.us');
    assert.equal(client.sent[0].text, 'hello');
    assert.equal(result.to, '918888888888');
    assert.equal(result.type, 'out');
    assert.equal(result.from, '919999999999');
  } finally {
    await mgr.shutdown();
  }
});

test('manager sendMessage: keeps 12-digit numbers unchanged', async () => {
  const mgr = createWhatsAppManager({ config: tmpConfig(), Client: FakeClient });
  try {
    await mgr.init();
    await mgr.sendMessage('918888888888', 'hello');
    const client = mgr.__internal.getClient();
    assert.equal(client.sent[0].jid, '918888888888@c.us');
  } finally {
    await mgr.shutdown();
  }
});

test('manager sendMessage: rejects an empty phone number', async () => {
  const mgr = createWhatsAppManager({ config: tmpConfig(), Client: FakeClient });
  try {
    await mgr.init();
    await assert.rejects(() => mgr.sendMessage('   ', 'hello'), /Phone number is required/);
  } finally {
    await mgr.shutdown();
  }
});
