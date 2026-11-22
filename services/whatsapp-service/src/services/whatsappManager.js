import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { getServiceCacheDir, resolveBrowserExecutable, ensureDir } from './browserPath.js';
import { forwardWhatsAppEvent, WHATSAPP_REALTIME_EVENTS } from './eventRelay.js';

// Safety guard: prevent accidental duplicate connection against production account/session
const PRODUCTION_CLIENT_ID = 'vcm-crm-whatsapp';

const STATES = {
  DISCONNECTED: 'DISCONNECTED',
  QR_READY: 'QR_READY',
  AUTHENTICATED: 'AUTHENTICATED',
  CONNECTED: 'CONNECTED',
};

const INIT_MAX_ATTEMPTS = 4;
const INIT_RETRY_BASE_DELAY_MS = 1500;

const MODULE_READY_ERROR = 'WhatsApp Web module readiness timeout: WAWebSocketModel unavailable';

function isTransientInitError(err) {
  const msg = String(err?.message || err || '');
  return (
    msg.includes('module readiness timeout') ||
    msg.includes("reading 'Socket'") ||
    msg.includes('Execution context was destroyed') ||
    msg.includes('Execution context is not available') ||
    msg.includes('Cannot find context with specified id') ||
    msg.includes('DiscardedBrowsingContextError') ||
    msg.includes('Navigation failed because') ||
    msg.includes('Frame detached') ||
    msg.includes('Target closed') ||
    msg.includes('Session closed')
  );
}

function isWaWebSocketModelReady() {
  try {
    if (typeof window.require !== 'function') return false;
    const socket = window.require('WAWebSocketModel')?.Socket;
    if (!socket) return false;
    const state = socket.state;
    // whatsapp-web.js 1.34.7 accesses WAWebSocketModel.Socket immediately in
    // inject(). Wait for both module registration and a non-bootstrap state so
    // the upstream evaluate() cannot block indefinitely in-page.
    return (
      !!state &&
      state !== 'OPENING' &&
      state !== 'UNLAUNCHED' &&
      state !== 'PAIRING'
    );
  } catch {
    return false;
  }
}

async function clickUseHereIfPresent(page) {
  try {
    return await page.evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll('button, [role="button"], a, div, span')
      );
      const target = candidates.find((el) => (el.textContent || '').trim() === 'Use here');
      if (!target) return false;
      const clickable = target.closest('button, [role="button"], a') || target;
      clickable.click();
      return true;
    });
  } catch {
    return false;
  }
}

function isNavigationOrContextError(err) {
  const msg = String(err?.message || err || '');
  return (
    msg.includes('Execution context was destroyed') ||
    msg.includes('Cannot find context with specified id') ||
    msg.includes('Execution context is not available') ||
    msg.includes('Navigation failed because') ||
    msg.includes('Target closed') ||
    msg.includes('Session closed')
  );
}

export function createModuleReadyClient(BaseClient, { timeoutMs = 20000 } = {}) {
  return class ModuleReadyClient extends BaseClient {
    constructor(options) {
      super(options);
      this._waInjectedOnce = false;
      this._waInjectPromise = null;
    }

    async _injectWithReadiness() {
      const page = this.pupPage;
      if (!page || typeof page.waitForFunction !== 'function') {
        const result = await super.inject();
        this._waInjectedOnce = true;
        return result;
      }

      const startedAt = Date.now();
      let useHereAttempts = 0;
      const useHereInterval = setInterval(async () => {
        if (useHereAttempts >= 3) return;
        const clicked = await clickUseHereIfPresent(page);
        if (clicked) {
          useHereAttempts += 1;
          logger.info('WhatsApp Web "Use here" takeover clicked', {
            attempt: useHereAttempts,
          });
        }
      }, 1500);
      try {
        // Puppeteer's waitForFunction re-runs the predicate in a new execution
        // context when the page navigates ("Execution context was destroyed"),
        // so this survives WhatsApp Web redirects and is bounded by timeoutMs.
        await page.waitForFunction(isWaWebSocketModelReady, {
          timeout: timeoutMs,
          polling: 250,
        });
      } catch (err) {
        clearInterval(useHereInterval);
        let diagnostics = null;
        try {
          if (page && typeof page.evaluate === 'function') {
            diagnostics = await page.evaluate(() => ({
              href: location.href,
              title: document.title,
              readyState: document.readyState,
              hasRequire: typeof window.require === 'function',
              bodyText: (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 240),
            }));
          }
        } catch (diagErr) {
          diagnostics = { error: diagErr?.message };
        }
        logger.error('WhatsApp Web module readiness wait failed', {
          error: err?.message,
          diagnostics,
        });
        if (this._waInjectedOnce) {
          // A post-initialization re-inject (framenavigated) has no caller that
          // can catch this rejection; surface it as a lifecycle event so the
          // manager tears down the browser instead of leaving a zombie client.
          this.emit('disconnected', 'WA_MODULE_READINESS_TIMEOUT');
          return;
        }
        throw new Error(MODULE_READY_ERROR);
      }
      clearInterval(useHereInterval);

      const elapsedMs = Date.now() - startedAt;
      if (typeof page.evaluate === 'function') {
        try {
          const readiness = await page.evaluate(() => ({
            href: location.href,
            state: window.require?.('WAWebSocketModel')?.Socket?.state ?? null,
            version: window.Debug?.VERSION ?? null,
          }));
          logger.info('WhatsApp Web module readiness confirmed before inject', {
            elapsedMs,
            href: readiness?.href,
            state: readiness?.state,
            version: readiness?.version,
          });
        } catch (err) {
          logger.warn('WhatsApp Web readiness diagnostics unavailable', { error: err?.message });
        }
      } else {
        logger.info('WhatsApp Web module readiness confirmed before inject', { elapsedMs });
      }

      try {
        const result = await super.inject();
        this._waInjectedOnce = true;
        return result;
      } catch (err) {
        if (this._waInjectedOnce) {
          logger.error('WhatsApp Web re-inject failed; marking client disconnected', {
            error: err?.message,
            navigationRelated: isNavigationOrContextError(err),
          });
          this.emit('disconnected', 'WA_REINJECT_FAILED');
          return;
        }
        throw err;
      }
    }

    async inject() {
      if (this._waInjectPromise) {
        logger.info('Inject already in progress; joining existing inject');
        return this._waInjectPromise;
      }
      this._waInjectPromise = this._injectWithReadiness().finally(() => {
        this._waInjectPromise = null;
      });
      return this._waInjectPromise;
    }

    async forceAppStateSync() {
      const page = this.pupPage;
      if (!page || typeof page.evaluate !== 'function') return false;
      try {
        const state = await page.evaluate(
          () => window.require?.('WAWebSocketModel')?.Socket?.state ?? null
        );
        if (state !== 'CONNECTED') return false;
        const hasHandler = await page.evaluate(
          () => typeof window.onAppStateHasSyncedEvent === 'function'
        );
        if (!hasHandler) return false;

        logger.info('Session connected without ready event; forcing app-state sync handler');
        // 1.34.8 skips the app-state-sync callback when window.WWebJS is already
        // present. Clear it so the callback performs full client initialization
        // (info/interface/listeners) before emitting authenticated/ready.
        await page.evaluate(() => {
          try { delete window.WWebJS; } catch {}
          try { window.WWebJS = undefined; } catch {}
        });
        await page.evaluate(() => window.onAppStateHasSyncedEvent?.());
        return true;
      } catch (err) {
        logger.warn('Forced app-state sync failed', { error: err?.message });
        return false;
      }
    }
  };
}

export function createWhatsAppManager(overrides = {}) {
  const cfg = { ...config, ...(overrides.config || {}) };
  const ClientImpl = overrides.Client || createModuleReadyClient(Client, { timeoutMs: cfg.waModuleReadyTimeoutMs });
  const qrLib = overrides.qrcode || qrcode;
  const relayEvent = overrides.relayEvent || forwardWhatsAppEvent;
  let client = null;
  let io = null;
  let connectionStatus = STATES.DISCONNECTED;
  let qrCodeData = '';
  let isInitializing = false;
  let initializationPromise = null;
  let lastHeartbeat = null;
  let lastConnectedAt = null;
  let reconnectCount = 0;
  let qrGeneratedCount = 0;
  let sessionRestored = false;
  let heartbeatInterval = null;
  let lastQrGeneratedAt = null;
  let isShuttingDown = false;
  let isCleanupComplete = false;
  let hasLoggedShutdownComplete = false;
  let shutdownPromise = null;
  const pendingClients = new Set();
  const failedClients = new Set();
  const clientCleanupMap = new WeakMap();
  let lastError = null;
  let phoneNumber = '';
  let pushName = '';
  let terminalFailureAt = null;

  function emitRealtimeEvent(event, payload, direction) {
    if (io) {
      try {
        io.emit(event, payload);
        return Promise.resolve(true);
      } catch (err) {
        logger.warn('WhatsApp realtime emit failed', { event, error: err?.message });
        return Promise.resolve(false);
      }
    }
    return relayEvent({ event, payload, direction, source: 'whatsapp-service' })
      .then((result) => {
        const relayed = result?.relayed === true;
        logger.info('WhatsApp realtime event relayed to main api', { event, relayed, eventId: result?.eventId });
        return relayed;
      })
      .catch((err) => {
        logger.error('Failed to relay WhatsApp realtime event to main api', { event, error: err?.message });
        return false;
      });
  }

  function assertSafeClientId() {
    const isProd = cfg.nodeEnv === 'production';
    if (isProd && cfg.whatsappClientId === PRODUCTION_CLIENT_ID) {
      throw new Error(
        'Refusing to start WhatsApp client with production clientId in whatsapp-service foundation. Set WHATSAPP_CLIENT_ID to an isolated value.'
      );
    }
  }

  function sessionDir() {
    // whatsapp-web.js LocalAuth stores under <dataPath>/session-<clientId> when dataPath provided
    return path.join(cfg.sessionBaseDir, `session-${cfg.whatsappClientId}`);
  }

  function updateCleanupState() {
    if (
      isShuttingDown &&
      !isInitializing &&
      !initializationPromise &&
      pendingClients.size === 0 &&
      failedClients.size === 0 &&
      client === null
    ) {
      isCleanupComplete = true;
      if (!hasLoggedShutdownComplete) {
        hasLoggedShutdownComplete = true;
        logger.info('WhatsApp service shutdown complete.');
      }
    } else {
      isCleanupComplete = false;
    }
  }

  function destroyClient(targetClient) {
    if (!targetClient) return Promise.resolve();
    if (clientCleanupMap.has(targetClient)) return clientCleanupMap.get(targetClient);
    const p = (async () => {
      try {
        try { targetClient.removeAllListeners(); } catch {}
        await targetClient.destroy();
        pendingClients.delete(targetClient);
        failedClients.delete(targetClient);
      } catch (err) {
        logger.warn('Client destroy warning', { error: err?.message });
        pendingClients.delete(targetClient);
        failedClients.add(targetClient);
        clientCleanupMap.delete(targetClient);
        throw err;
      } finally {
        updateCleanupState();
      }
    })();
    clientCleanupMap.set(targetClient, p);
    return p;
  }

  async function clearSessionDir(retries = 5, delayMs = 500) {
    const dir = sessionDir();
    if (!fs.existsSync(dir)) return { cleared: false, reason: 'not_found' };
    for (let i = 0; i < retries; i++) {
      try {
        logger.info('Wiping isolated session directory', { attempt: i + 1, dir });
        fs.rmSync(dir, { recursive: true, force: true });
        return { cleared: true };
      } catch (err) {
        logger.warn('Failed to wipe session directory', { attempt: i + 1, error: err?.message });
        if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    return { cleared: false, reason: 'failed' };
  }

  function statusPayload() {
    return {
      service: cfg.serviceName || 'whatsapp-service',
      clientId: cfg.whatsappClientId,
      sessionIsolated: cfg.whatsappClientId !== PRODUCTION_CLIENT_ID,
      connectionStatus,
      statusText: connectionStatus,
      connected: connectionStatus === STATES.CONNECTED,
      qrAvailable: !!qrCodeData && connectionStatus === STATES.QR_READY,
      qrCode: qrCodeData || '',
      phoneNumber: phoneNumber || client?.info?.wid?.user || '',
      pushName: pushName || client?.info?.pushname || '',
      lastHeartbeat,
      lastConnectedAt,
      reconnectCount,
      qrGeneratedCount,
      sessionRestored,
      isInitializing,
      isShuttingDown,
      isCleanupComplete,
      lastError,
      terminalFailureAt,
      cooldownRemainingMs: terminalFailureAt
        ? Math.max(0, cfg.terminalCooldownMs - (Date.now() - terminalFailureAt))
        : 0,
      sessionPath: sessionDir(),
      timestamp: new Date().toISOString(),
    };
  }

  async function waitForInitIfNeeded() {
    if (isInitializing && initializationPromise) {
      await initializationPromise.catch(() => {});
    }
  }

  async function init(socketIo) {
    if (isShuttingDown) {
      logger.info('Shutdown in progress; ignoring init request.');
      return { ok: false, reason: 'shutting_down' };
    }
    if (terminalFailureAt && cfg.terminalCooldownMs > 0) {
      const remainingMs = cfg.terminalCooldownMs - (Date.now() - terminalFailureAt);
      if (remainingMs > 0) {
        logger.warn('Terminal init cooldown active; refusing new Chromium launch', { remainingMs });
        return { ok: false, reason: 'cooldown', retryAfterMs: remainingMs };
      }
      terminalFailureAt = null;
    }
    if (isInitializing) {
      logger.info('Initialization already in progress; joining existing init.');
      if (initializationPromise) return initializationPromise;
      return { ok: true, joined: true };
    }
    assertSafeClientId();
    isInitializing = true;
    io = socketIo ?? io;
    initializationPromise = (async () => {
      for (let attempt = 1; attempt <= INIT_MAX_ATTEMPTS; attempt++) {
        let thisClient = null;
        try {
          logger.info('Initializing WhatsApp client (standalone foundation)', {
            clientId: cfg.whatsappClientId,
            sessionBaseDir: cfg.sessionBaseDir,
            nodeEnv: cfg.nodeEnv,
          });

          if (client) {
            const oldClient = client;
            client = null;
            await destroyClient(oldClient).catch(() => {});
          }

          ensureDir(cfg.sessionBaseDir);
          ensureDir(getServiceCacheDir(cfg.puppeteerCacheDir));

          const isProdEnv = cfg.nodeEnv === 'production';
          const executablePath = resolveBrowserExecutable({
            isProduction: isProdEnv,
            configuredCacheDir: cfg.puppeteerCacheDir,
            configuredExecutablePath: cfg.puppeteerExecutablePath,
          });
          logger.info('Browser resolution', {
            production: isProdEnv,
            executablePath: executablePath || 'unresolved',
            cacheDir: getServiceCacheDir(cfg.puppeteerCacheDir),
          });
          if (isProdEnv && !executablePath) {
            logger.warn('No Chrome binary resolved in production; puppeteer default resolution may fail. Ensure setup:chrome ran and cache is persistent.');
          }

          if (isShuttingDown) return { ok: false, reason: 'shutting_down' };

          thisClient = new ClientImpl({
            authStrategy: new LocalAuth({
              clientId: cfg.whatsappClientId,
              dataPath: cfg.sessionBaseDir,
            }),
            authTimeoutMs: 60000,
            qrMaxRetries: 5,
            takeoverOnConflict: true,
            puppeteer: {
              headless: true,
              ...(executablePath ? { executablePath } : {}),
              args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-default-apps',
                '--disable-features=site-per-process',
                '--disable-web-security',
                '--disable-features=IsolateOrigins',
                '--disable-site-isolation-trials',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',
                '--disable-ipc-flooding-protection',
              ],
              timeout: 60000,
            },
          });

          pendingClients.add(thisClient);
          client = thisClient;

          thisClient.on('qr', async (qr) => {
            if (isShuttingDown) return;
            connectionStatus = STATES.QR_READY;
            lastQrGeneratedAt = Date.now();
            qrGeneratedCount++;
            sessionRestored = false;
            lastError = null;
            try {
              qrCodeData = await qrLib.toDataURL(qr);
              logger.info('QR code generated', { clientId: cfg.whatsappClientId, qrGeneratedCount });
              await emitRealtimeEvent(WHATSAPP_REALTIME_EVENTS.QR, { qrCode: qrCodeData }, 'in');
            } catch (err) {
              logger.error('QR generation failed', { error: err?.message });
              lastError = { code: 'QR_GENERATION_FAILED', message: err?.message };
            }
          });

          thisClient.on('ready', async () => {
            if (isShuttingDown) return;
            connectionStatus = STATES.CONNECTED;
            qrCodeData = '';
            lastQrGeneratedAt = null;
            lastHeartbeat = new Date();
            lastConnectedAt = new Date();
            sessionRestored = true;
            lastError = null;
            phoneNumber = thisClient?.info?.wid?.user || '';
            pushName = thisClient?.info?.pushname || '';
            logger.info('WhatsApp client ready/connected', { phone: phoneNumber ? `${phoneNumber.slice(0,4)}***` : '' });
            await emitRealtimeEvent(WHATSAPP_REALTIME_EVENTS.STATUS, { connected: true, statusText: 'CONNECTED', phoneNumber, pushName, lastConnectedAt }, 'in');
          });

          thisClient.on('authenticated', async () => {
            if (isShuttingDown) return;
            connectionStatus = STATES.AUTHENTICATED;
            lastQrGeneratedAt = null;
            sessionRestored = true;
            lastError = null;
            logger.info('WhatsApp authenticated (session restored or pairing accepted)');
          });

          thisClient.on('auth_failure', async (msg) => {
            connectionStatus = STATES.DISCONNECTED;
            sessionRestored = false;
            qrCodeData = '';
            lastError = { code: 'AUTH_FAILURE', message: String(msg || 'auth_failure') };
            logger.error('WhatsApp auth failure', { message: String(msg) });
            await emitRealtimeEvent(WHATSAPP_REALTIME_EVENTS.STATUS, { connected: false, statusText: 'DISCONNECTED', error: String(msg || 'auth_failure') }, 'in');
            const currentClient = thisClient;
            if (client === currentClient) client = null;
            if (currentClient) await destroyClient(currentClient).catch(() => {});
          });

          thisClient.on('disconnected', async (reason) => {
            connectionStatus = STATES.DISCONNECTED;
            sessionRestored = false;
            qrCodeData = '';
            lastError = { code: 'DISCONNECTED', message: String(reason || 'disconnected') };
            logger.warn('WhatsApp disconnected', { reason: String(reason) });
            await emitRealtimeEvent(WHATSAPP_REALTIME_EVENTS.STATUS, { connected: false, statusText: 'DISCONNECTED', reason: String(reason || 'disconnected') }, 'in');
            const currentClient = thisClient;
            if (client === currentClient) client = null;
            if (currentClient) await destroyClient(currentClient).catch(() => {});
          });

          if (!heartbeatInterval) {
            heartbeatInterval = setInterval(async () => {
              if (isShuttingDown) return;
              if (client && connectionStatus === STATES.CONNECTED) {
                try {
                  const state = await client.getState().catch(() => null);
                  if (state) lastHeartbeat = new Date();
                  else {
                    reconnectCount++;
                    logger.warn('Heartbeat: state null, triggering reconnect');
                    await reconnect();
                  }
                } catch (err) {
                  reconnectCount++;
                  logger.error('Heartbeat check failed', { error: err?.message });
                  await reconnect();
                }
              }
              if (connectionStatus === STATES.DISCONNECTED && lastQrGeneratedAt && (Date.now() - lastQrGeneratedAt > 3 * 60 * 1000)) {
                logger.info('QR expired window reached; re-initializing for fresh QR');
                lastQrGeneratedAt = null;
                reconnectCount++;
                await reconnect();
              }
            }, 45 * 1000);
          }

          thisClient.on('message_create', async (msg) => {
            try {
              if (isShuttingDown) return;
              if (!msg || !msg.body) return;
              if (msg.from && (msg.from.endsWith('@g.us') || msg.from.endsWith('@broadcast'))) return;
              if (msg.to && (msg.to.endsWith('@g.us') || msg.to.endsWith('@broadcast'))) return;
              if (msg.isStatus || msg.broadcast) return;
              const clientPhone = thisClient && thisClient.info && thisClient.info.wid && thisClient.info.wid.user ? String(thisClient.info.wid.user).replace(/\D/g, '') : '';
              const senderRaw = msg.from || '';
              const senderPhone = senderRaw.split('@')[0].split(':')[0];
              const recipientRaw = msg.to || '';
              const recipientPhone = recipientRaw ? recipientRaw.split('@')[0].split(':')[0] : '';
              const messageBody = String(msg.body).trim();
              if (!messageBody) return;
              const cleanSender = senderPhone.replace(/\D/g, '');
              const cleanClient = clientPhone.replace(/\D/g, '');
              const fromMe = Boolean(msg.fromMe);
              const recipientDigits = String(recipientPhone || '').replace(/\D/g, '');
              if (fromMe && cleanSender && recipientDigits && cleanSender !== recipientDigits) return;
              const messageId = (msg.id && msg.id.id) ? String(msg.id.id) : crypto.randomUUID();
              const store = (overrides && overrides.messageStore) ? overrides.messageStore : null;
              const savedMsg = store && typeof store.recordMessage === 'function'
                ? await store.recordMessage({ from: senderPhone, to: recipientPhone, body: messageBody, type: fromMe ? 'out' : 'in', timestamp: new Date() }).catch((e) => { logger.warn('inbound message persistence failed', { error: e && e.message }); return null; })
                : null;
              const relayPayload = Object.assign({}, savedMsg || {}, { _id: (savedMsg && savedMsg._id) ? savedMsg._id : messageId, from: senderPhone, to: recipientPhone, body: messageBody, type: fromMe ? 'out' : 'in' });
              await emitRealtimeEvent(WHATSAPP_REALTIME_EVENTS.NEW_MESSAGE, relayPayload, fromMe ? 'out' : 'in').catch(() => {});
              let commandForwarder = (overrides && overrides.commandForwarder) || null;
              if (!commandForwarder) {
                try { const m = await import('./eventRelay.js'); commandForwarder = m.forwardWhatsAppInboundCommand; } catch (e) { commandForwarder = null; }
              }
              const commandContext = {
                channel: 'whatsapp',
                text: messageBody,
                sender: { waId: senderRaw, senderPhone: cleanSender, clientPhone: cleanClient, fromMe: fromMe, isFromSelf: fromMe },
                messageId: messageId,
                receivedAt: new Date().toISOString(),
              };
              const result = commandForwarder
                ? await commandForwarder({ commandContext: commandContext, idempotencyKey: messageId }).catch((err) => { logger.warn('inbound command forward failed', { error: err && err.message }); return null; })
                : null;
              const replyText = result && typeof result.replyText === 'string' ? result.replyText : null;
              if (replyText) {
                const store = (overrides && overrides.messageStore) ? overrides.messageStore : null;
                let alreadySent = false;
                if (store && typeof store.hasReplySent === 'function') {
                  try { alreadySent = await store.hasReplySent(messageId); } catch (e) { alreadySent = false; }
                } else {
                  if (!global.__waRepliedIds) global.__waRepliedIds = new Set();
                  alreadySent = global.__waRepliedIds.has('reply:' + messageId);
                }
                if (!alreadySent) {
                  const targetPhone = (cleanSender === cleanClient) ? recipientPhone : senderPhone;
                  try {
                    await thisClient.sendMessage(String(targetPhone).replace(/\D/g, '') + '@c.us', replyText);
                    if (store && typeof store.markReplySent === 'function') {
                      try { await store.markReplySent(messageId, replyText); } catch (e) { logger.warn('reply dedupe persist failed', { error: e && e.message }); }
                    } else {
                      if (!global.__waRepliedIds) global.__waRepliedIds = new Set();
                      global.__waRepliedIds.add('reply:' + messageId);
                    }
                  } catch (e) { logger.warn('reply send failed', { error: e && e.message }); }
                }
              }
            } catch (err) {
              logger.error('message_create handling failed', { error: err && err.message });
            }
          });
          await thisClient.initialize();
          logger.info('WhatsApp client initialized (browser/session bootstrap started)');
          if (
            !isShuttingDown &&
            connectionStatus === STATES.DISCONNECTED &&
            typeof thisClient.forceAppStateSync === 'function'
          ) {
            const forced = await thisClient.forceAppStateSync();
            if (forced) {
              const readyDeadline = Date.now() + 15000;
              while (
                !isShuttingDown &&
                connectionStatus === STATES.DISCONNECTED &&
                Date.now() < readyDeadline
              ) {
                await new Promise((resolve) => setTimeout(resolve, 250));
              }
              logger.info('Post-restore app-state sync fallback completed', { connectionStatus });
            }
          }
          if (isShuttingDown) {
            if (client === thisClient) client = null;
            await destroyClient(thisClient).catch(() => {});
            return { ok: false, reason: 'shutting_down' };
          }
          terminalFailureAt = null;
          lastError = null;
          return { ok: true };
        } catch (err) {
          lastError = { code: 'INIT_FAILED', message: err?.message || String(err) };
          connectionStatus = STATES.DISCONNECTED;
          qrCodeData = '';
          if (client === thisClient) client = null;
          if (thisClient) await destroyClient(thisClient).catch(() => {});
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          const retryable = isTransientInitError(err) && attempt < INIT_MAX_ATTEMPTS && !isShuttingDown;
          if (retryable) {
            logger.warn('Transient WhatsApp init failure; retrying with a fresh client', {
              attempt,
              maxAttempts: INIT_MAX_ATTEMPTS,
              error: err?.message,
            });
            await new Promise((resolve) => setTimeout(resolve, (cfg.initRetryBaseDelayMs ?? INIT_RETRY_BASE_DELAY_MS) * attempt));
            continue;
          }
          terminalFailureAt = Date.now();
          logger.error('WhatsApp init failed (terminal; cooldown engaged)', {
            error: err?.message,
            cooldownMs: cfg.terminalCooldownMs,
          });
          throw err;
        }
      }
    })().finally(() => {
      isInitializing = false;
      initializationPromise = null;
      updateCleanupState();
    });
    return initializationPromise;
  }

  async function generateQR() {
    if (isShuttingDown) return { success: false, error: 'Shutdown in progress' };
    await waitForInitIfNeeded();
    try {
      if (client) {
        const old = client;
        client = null;
        await destroyClient(old).catch(() => {});
      }
      lastQrGeneratedAt = null;
      connectionStatus = STATES.DISCONNECTED;
      qrCodeData = '';
      lastError = null;
      if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
      // Controlled QR generation: start fresh isolated client/session flow as appropriate
      const result = await init(io);
      if (result && result.ok === false) {
        return { success: false, error: result.reason, retryAfterMs: result.retryAfterMs };
      }
      return { success: true, message: 'QR generation triggered' };
    } catch (err) {
      return { success: false, error: err?.message || 'Failed to generate QR' };
    }
  }

  async function reconnect() {
    if (isShuttingDown) return { success: false, error: 'Shutdown in progress' };
    await waitForInitIfNeeded();
    try {
      reconnectCount++; // intentional tracking of reconnect attempts
      connectionStatus = STATES.DISCONNECTED;
      if (client) {
        const old = client;
        client = null;
        await destroyClient(old).catch(() => {});
      }
      if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
      const result = await init(io);
      if (result && result.ok === false) {
        return { success: false, error: result.reason, retryAfterMs: result.retryAfterMs };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.message || 'Reconnect failed' };
    }
  }

  async function logout() {
    if (isShuttingDown) return { success: false, error: 'Shutdown in progress' };
    await waitForInitIfNeeded();
    try {
      if (client) {
        try { await client.logout(); } catch (e) { logger.warn('client.logout warning', { error: e?.message }); }
        const old = client;
        client = null;
        await destroyClient(old).catch(() => {});
      }
      connectionStatus = STATES.DISCONNECTED;
      qrCodeData = '';
      phoneNumber = '';
      pushName = '';
      lastError = null;
      let cleared = { cleared: false, reason: 'skipped' };
      if (cfg.clearSessionOnLogout) cleared = await clearSessionDir();
      const result = await init(io);
      if (result && result.ok === false) {
        return { success: false, error: result.reason, retryAfterMs: result.retryAfterMs, sessionCleared: cleared };
      }
      return { success: true, sessionCleared: cleared };
    } catch (err) {
      return { success: false, error: err?.message || 'Logout failed' };
    }
  }

  async function clearSession() {
    if (isShuttingDown) return { success: false, error: 'Shutdown in progress' };
    await waitForInitIfNeeded();
    try {
      if (client) {
        const old = client;
        client = null;
        await destroyClient(old).catch(() => {});
      }
      connectionStatus = STATES.DISCONNECTED;
      qrCodeData = '';
      phoneNumber = '';
      pushName = '';
      lastError = null;
      const cleared = await clearSessionDir();
      return { success: true, sessionCleared: cleared };
    } catch (err) {
      return { success: false, error: err?.message || 'Clear session failed' };
    }
  }

  async function shutdown() {
    isShuttingDown = true;
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      try {
        if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
        if (initializationPromise) {
          const timeout = new Promise((resolve) => setTimeout(resolve, 10000));
          await Promise.race([initializationPromise.catch(() => {}), timeout]);
        }
        const targets = new Set([...pendingClients]);
        if (client) targets.add(client);
        for (const c of targets) {
          try { await destroyClient(c); } catch {}
        }
        client = null;
        connectionStatus = STATES.DISCONNECTED;
      } catch (err) {
        logger.error('Shutdown error', { error: err?.message });
      } finally {
        updateCleanupState();
        // if stuck, still mark best-effort complete state logging handled by updateCleanupState when conditions met
        if (!isCleanupComplete) {
          // force completion log once if resources drained or best effort
          if (pendingClients.size === 0 && !isInitializing && !initializationPromise) {
            client = null;
            updateCleanupState();
          }
        }
      }
    })();
    return shutdownPromise;
  }

  async function getQr() {
    const s = statusPayload();
    return {
      ...s,
      qrCode: qrCodeData || '',
    };
  }

  async function sendMessage(phoneNumber, text) {
    if (connectionStatus !== STATES.CONNECTED || !client) {
      throw new Error('WhatsApp service not connected.');
    }
    const cleanPhone = String(phoneNumber || '').replace(/\D/g, '');
    if (!cleanPhone) {
      throw new Error('Phone number is required.');
    }
    const normalizedPhone = !cleanPhone.startsWith('91') && cleanPhone.length === 10
      ? `91${cleanPhone}`
      : cleanPhone;
    await client.sendMessage(`${normalizedPhone}@c.us`, text);
    const eventId = crypto.randomUUID();
    const messagePayload = {
      _id: eventId,
      from: client.info?.wid?.user || '',
      to: normalizedPhone,
      body: text,
      type: 'out',
      direction: 'out',
    };
    await emitRealtimeEvent(WHATSAPP_REALTIME_EVENTS.NEW_MESSAGE, messagePayload, 'out');
    return {
      from: client.info?.wid?.user || '',
      to: normalizedPhone,
      body: text,
      type: 'out',
      timestamp: new Date(),
    };
  }

  return {
    init,
    getStatus: () => statusPayload(),
    getQr,
    sendMessage,
    generateQR,
    reconnect,
    logout,
    clearSession,
    shutdown,
    // testing/introspection hooks (non-production API)
    __internal: {
      getClient: () => client,
      getConfig: () => ({ ...cfg }),
      STATES,
    },
  };
}

// Singleton for service runtime
export const whatsappManager = createWhatsAppManager();

