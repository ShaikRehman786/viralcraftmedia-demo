import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { EventEmitter } from 'events';
import { createRequire } from 'module';
import { createWhatsAppManager, createModuleReadyClient } from '../src/services/whatsappManager.js';

const require = createRequire(import.meta.url);
const MODULE_READY_ERROR = 'WhatsApp Web module readiness timeout: WAWebSocketModel unavailable';

function fakeConfig(overrides = {}) {
  return {
    nodeEnv: 'test',
    serviceName: 'whatsapp-service',
    whatsappClientId: 'vcm-crm-whatsapp-readiness-test',
    sessionBaseDir: path.join(process.cwd(), '.wwebjs_readiness_test'),
    clearSessionOnLogout: false,
    waModuleReadyTimeoutMs: 500,
    terminalCooldownMs: 60000,
    initRetryBaseDelayMs: 1,
    puppeteerExecutablePath: '',
    puppeteerCacheDir: '',
    ...overrides,
  };
}

function makeBasePage(waitImpl) {
  return {
    waitForFunction: waitImpl,
  };
}

class InjectBase extends EventEmitter {
  constructor() {
    super();
    this.pupPage = null;
    this.injectCalls = 0;
  }
  async inject() { this.injectCalls++; }
}

test('readiness succeeds when WAWebSocketModel becomes available', async () => {
  const seen = [];
  class Base extends InjectBase {
    constructor() { super(); this.pupPage = makeBasePage(async (fn, opts) => { seen.push({ fn, opts }); return true; }); }
  }
  const Ready = createModuleReadyClient(Base, { timeoutMs: 750 });
  const client = new Ready({});
  await client.inject();
  assert.equal(client.injectCalls, 1);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].opts.timeout, 750);
  assert.equal(seen[0].opts.polling, 250);

  const savedWindow = global.window;
  try {
    global.window = { require: (m) => (m === 'WAWebSocketModel' ? { Socket: { state: 'UNPAIRED' } } : null) };
    assert.equal(seen[0].fn(), true);
  } finally {
    if (savedWindow === undefined) delete global.window; else global.window = savedWindow;
  }
});

test('readiness predicate tolerates a throwing/partial WA module loader', async () => {
  const seen = [];
  class Base extends InjectBase {
    constructor() { super(); this.pupPage = makeBasePage(async (fn) => { seen.push(fn); return true; }); }
  }
  const client = new (createModuleReadyClient(Base, { timeoutMs: 500 }))({});
  await client.inject();
  const savedWindow = global.window;
  try {
    global.window = { require: () => { throw new Error('not loaded'); } };
    assert.equal(seen[0](), false);
    global.window = { require: () => ({}) };
    assert.equal(seen[0](), false);
    global.window = { require: () => ({ Socket: {} }) };
    assert.equal(seen[0](), false, 'socket without state is not ready');
    global.window = { require: () => ({ Socket: { state: 'OPENING' } }) };
    assert.equal(seen[0](), false, 'bootstrap socket states are not ready');
    global.window = { require: () => ({ Socket: { state: 'UNLAUNCHED' } }) };
    assert.equal(seen[0](), false);
    global.window = { require: () => ({ Socket: { state: 'PAIRING' } }) };
    assert.equal(seen[0](), false);
    global.window = {};
    assert.equal(seen[0](), false);
  } finally {
    if (savedWindow === undefined) delete global.window; else global.window = savedWindow;
  }
});

test('readiness times out when the module never becomes available', async () => {
  class Base extends InjectBase {
    constructor() { super(); this.pupPage = makeBasePage(async () => { throw new Error('Waiting failed: 500ms exceeded'); }); }
  }
  const client = new (createModuleReadyClient(Base, { timeoutMs: 500 }))({});
  await assert.rejects(() => client.inject(), (e) => e.message === MODULE_READY_ERROR);
  assert.equal(client.injectCalls, 0, 'super.inject must not run on readiness timeout');
});

test('navigation/destroyed context is delegated to navigation-safe waitForFunction', async () => {
  let seenFn = null;
  let seenOpts = null;
  class Base extends InjectBase {
    constructor() {
      super();
      this.pupPage = makeBasePage(async (fn, opts) => {
        seenFn = fn;
        seenOpts = opts;
        // Puppeteer WaitTask re-runs the predicate in a new execution context
        // after "Execution context was destroyed"; the predicate must therefore
        // be pure and re-runnable against whatever window the new context has.
        const saved = global.window;
        try {
          global.window = { require: () => null };
          assert.equal(fn(), false);
          global.window = { require: (m) => (m === 'WAWebSocketModel' ? { Socket: { state: 'UNPAIRED' } } : null) };
          assert.equal(fn(), true);
        } finally {
          if (saved === undefined) delete global.window; else global.window = saved;
        }
        return true;
      });
    }
  }
  const client = new (createModuleReadyClient(Base, { timeoutMs: 500 }))({});
  await client.inject();
  assert.equal(client.injectCalls, 1);
  assert.equal(seenOpts.timeout, 500);
  assert.equal(typeof seenFn, 'function');
});

test('re-inject after navigation waits for module readiness again', async () => {
  let waits = 0;
  class Base extends InjectBase {
    constructor() { super(); this.pupPage = makeBasePage(async () => { waits++; return true; }); }
  }
  const client = new (createModuleReadyClient(Base, { timeoutMs: 500 }))({});
  await client.inject();
  await client.inject();
  assert.equal(waits, 2, 'navigation re-inject must re-confirm module readiness');
  assert.equal(client.injectCalls, 2);
});

test('concurrent inject on the same client is single-flight', async () => {
  let waits = 0;
  class Base extends InjectBase {
    constructor() {
      super();
      this.pupPage = makeBasePage(async () => {
        waits++;
        await new Promise((r) => setTimeout(r, 25));
        return true;
      });
    }
  }
  const client = new (createModuleReadyClient(Base, { timeoutMs: 500 }))({});
  await Promise.all([client.inject(), client.inject(), client.inject()]);
  assert.equal(waits, 1);
  assert.equal(client.injectCalls, 1);
});

test('readiness timeout after a successful inject emits disconnected instead of throwing', async () => {
  let failWait = false;
  class Base extends InjectBase {
    constructor() {
      super();
      this.pupPage = makeBasePage(async () => {
        if (failWait) throw new Error('Waiting failed: 500ms exceeded');
        return true;
      });
    }
  }
  const client = new (createModuleReadyClient(Base, { timeoutMs: 500 }))({});
  const events = [];
  client.on('disconnected', (reason) => events.push(reason));
  await client.inject();
  failWait = true;
  await client.inject();
  assert.deepEqual(events, ['WA_MODULE_READINESS_TIMEOUT']);
  assert.equal(client.injectCalls, 1, 'super.inject must not run on failed re-inject');
});

test('re-inject navigation error emits disconnected instead of an unhandled rejection', async () => {
  class Base extends InjectBase {
    constructor() { super(); this.pupPage = makeBasePage(async () => true); }
    async inject() {
      this.injectCalls++;
      if (this.injectCalls > 1) throw new Error('Execution context was destroyed');
    }
  }
  const client = new (createModuleReadyClient(Base, { timeoutMs: 500 }))({});
  const events = [];
  client.on('disconnected', (reason) => events.push(reason));
  await client.inject();
  await client.inject();
  assert.deepEqual(events, ['WA_REINJECT_FAILED']);
});

test('concurrent init does not create multiple clients', async () => {
  let constructed = 0;
  class FakeClient {
    constructor() { constructed++; this.pupPage = null; this.info = { wid: { user: '' }, pushname: '' }; }
    on() {}
    removeAllListeners() {}
    async initialize() { await new Promise((r) => setTimeout(r, 40)); }
    async destroy() {}
    async logout() {}
    async getState() { return 'CONFLICT'; }
  }
  const mgr = createWhatsAppManager({
    config: fakeConfig(),
    Client: FakeClient,
    qrcode: { toDataURL: async () => 'data:image/png;base64,FAKE' },
  });
  const [a, b, c] = await Promise.all([mgr.init(), mgr.init(), mgr.init()]);
  assert.equal(constructed, 1);
  assert.ok(a.ok && b.ok && c.ok);
  await mgr.shutdown();
});

test('failed attempts clean up client/browser and clear heartbeat interval', async () => {
  let constructed = 0;
  let destroyed = 0;
  const cleared = [];
  const origSetInterval = global.setInterval;
  const origClearInterval = global.clearInterval;
  global.setInterval = (...args) => origSetInterval(...args);
  global.clearInterval = (handle) => { cleared.push(handle); return origClearInterval(handle); };

  class FailingClient {
    constructor() { constructed++; this.info = { wid: { user: '' }, pushname: '' }; }
    on() {}
    removeAllListeners() {}
    async initialize() { throw new Error('Execution context was destroyed'); }
    async destroy() { destroyed++; }
    async logout() {}
    async getState() { return null; }
  }
  try {
    const mgr = createWhatsAppManager({
      config: fakeConfig({ terminalCooldownMs: 60000 }),
      Client: FailingClient,
      qrcode: { toDataURL: async () => 'data:image/png;base64,FAKE' },
    });
    await assert.rejects(() => mgr.init(), /Execution context was destroyed/);
    assert.equal(constructed, 4, 'exactly 4 attempts');
    assert.equal(destroyed, 4, 'every failed client destroyed');
    assert.ok(cleared.length > 0, 'heartbeat interval cleared between retries');
    const s = mgr.getStatus();
    assert.equal(s.connectionStatus, 'DISCONNECTED');
    assert.equal(s.isInitializing, false);
    assert.ok(s.terminalFailureAt > 0);
    assert.ok(s.cooldownRemainingMs > 0);
    await mgr.shutdown();
  } finally {
    global.setInterval = origSetInterval;
    global.clearInterval = origClearInterval;
  }
});

test('terminal cooldown prevents repeated Chromium launches', async () => {
  let constructed = 0;
  class FailingClient {
    constructor() { constructed++; this.info = { wid: { user: '' }, pushname: '' }; }
    on() {}
    removeAllListeners() {}
    async initialize() { throw new Error("Cannot read properties of null (reading 'Socket')"); }
    async destroy() {}
    async logout() {}
    async getState() { return null; }
  }
  const mgr = createWhatsAppManager({
    config: fakeConfig({ terminalCooldownMs: 600000 }),
    Client: FailingClient,
    qrcode: { toDataURL: async () => 'data:image/png;base64,FAKE' },
  });
  await assert.rejects(() => mgr.init());
  assert.equal(constructed, 4);

  const second = await mgr.init();
  assert.equal(second.ok, false);
  assert.equal(second.reason, 'cooldown');
  assert.ok(second.retryAfterMs > 0);
  assert.equal(constructed, 4, 'no new client launched during cooldown');

  const qr = await mgr.generateQR();
  assert.equal(qr.success, false);
  assert.equal(qr.error, 'cooldown');
  assert.equal(constructed, 4, 'generateQR also blocked by cooldown');

  const re = await mgr.reconnect();
  assert.equal(re.success, false);
  assert.equal(re.error, 'cooldown');
  assert.equal(constructed, 4);

  await mgr.shutdown();
  assert.equal(constructed, 4);
});

test('graceful shutdown remains functional while cooldown is active', async () => {
  let destroyed = 0;
  class FailingClient {
    constructor() { this.info = { wid: { user: '' }, pushname: '' }; }
    on() {}
    removeAllListeners() {}
    async initialize() { throw new Error('module readiness timeout'); }
    async destroy() { destroyed++; }
    async logout() {}
    async getState() { return null; }
  }
  const mgr = createWhatsAppManager({
    config: fakeConfig({ terminalCooldownMs: 600000 }),
    Client: FailingClient,
    qrcode: { toDataURL: async () => 'data:image/png;base64,FAKE' },
  });
  await assert.rejects(() => mgr.init());
  const cooldown = await mgr.init();
  assert.equal(cooldown.reason, 'cooldown');
  await mgr.shutdown();
  const s = mgr.getStatus();
  assert.equal(s.isShuttingDown, true);
  assert.equal(s.isCleanupComplete, true);
  assert.equal(s.connectionStatus, 'DISCONNECTED');
  assert.ok(destroyed >= 4);
});
