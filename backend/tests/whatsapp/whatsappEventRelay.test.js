import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'path';
import { fileURLToPath } from 'node:url';
import express from 'express';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-secret-key-0123456789';

const { signInternalPayload } = await import('../../shared/security/internalAuth.js');
const relayService = await import('../../services/whatsappEventRelayService.js');
const internalRoutes = (await import('../../routes/internalWhatsappEvents.js')).default;

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

function createInternalApp() {
  const app = express();
  app.set('internalNonceStore', createAtomicMemoryNonceStore());
  app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      const requestUrl = req.originalUrl || req.url || '';
      if (requestUrl.includes('razorpay-webhook') || requestUrl.includes('/internal/')) {
        req.rawBody = buf.toString('utf8');
      }
    },
  }));
  app.use('/internal/whatsapp/events', internalRoutes);
  const broadcasts = [];
  app.set('socketio_dispatch', (userId, event, payload) => {
    broadcasts.push({ userId, event, payload });
    return true;
  });
  return { app, broadcasts };
}

function createInternalAppWithoutDispatch() {
  const app = express();
  app.set('internalNonceStore', createAtomicMemoryNonceStore());
  app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      const requestUrl = req.originalUrl || req.url || '';
      if (requestUrl.includes('razorpay-webhook') || requestUrl.includes('/internal/')) {
        req.rawBody = buf.toString('utf8');
      }
    },
  }));
  app.use('/internal/whatsapp/events', internalRoutes);
  return app;
}

function startServer(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, base: 'http://127.0.0.1:' + port });
    });
  });
}

async function stopServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

async function postInternalEvent(base, body, headersOverride) {
  const suffix = body.event === 'whatsapp_new_message' ? 'message' : 'connection';
  const rawBody = JSON.stringify(body);
  const headers = signInternalPayload({
    serviceName: 'whatsapp-service',
    method: 'POST',
    path: '/internal/whatsapp/events/' + suffix,
    body,
    rawBody,
  });
  const finalHeaders = { ...headers, 'content-type': 'application/json; charset=utf-8' };
  if (headersOverride) {
    for (const key of Object.keys(headersOverride)) finalHeaders[key] = headersOverride[key];
  }
  const res = await fetch(base + '/internal/whatsapp/events/' + suffix, {
    method: 'POST',
    headers: finalHeaders,
    body: rawBody,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

test('relay: validates supported whatsapp realtime events', () => {
  const qr = relayService.validateWhatsAppEvent({
    event: 'whatsapp_qr',
    payload: { qrCode: 'data:image/png;base64,FAKE' },
    direction: 'in',
    eventId: 'evt-qrcode-12345678',
  });
  assert.equal(qr.ok, true);

  const badQr = relayService.validateWhatsAppEvent({
    event: 'whatsapp_qr',
    payload: { connected: true },
    direction: 'in',
    eventId: 'evt-qrcode-12345679',
  });
  assert.equal(badQr.ok, false);
  assert.equal(badQr.error.code, 'WA_EVENT_INVALID');
  assert.equal(badQr.error.retryable, false);

  const status = relayService.validateWhatsAppEvent({
    event: 'whatsapp_status',
    payload: { connected: true, statusText: 'CONNECTED' },
    direction: 'in',
    eventId: 'evt-status-1234567890',
  });
  assert.equal(status.ok, true);

  const badStatus = relayService.validateWhatsAppEvent({
    event: 'whatsapp_status',
    payload: { connected: 'yes' },
    direction: 'in',
    eventId: 'evt-status-1234567891',
  });
  assert.equal(badStatus.ok, false);

  const message = relayService.validateWhatsAppEvent({
    event: 'whatsapp_new_message',
    payload: { _id: '507f1f77bcf86cd799439011', type: 'in', body: 'hello' },
    direction: 'in',
    eventId: 'evt-message-12345678902',
  });
  assert.equal(message.ok, true);

  const badMessage = relayService.validateWhatsAppEvent({
    event: 'whatsapp_new_message',
    payload: { _id: '507f1f77bcf86cd799439012', type: 'bad', body: 'hello' },
    direction: 'in',
    eventId: 'evt-message-12345678903',
  });
  assert.equal(badMessage.ok, false);
});

test('relay: consumes whatsapp event ids with in-memory dedupe window', async () => {
  relayService.resetWhatsAppEventDedupe();
  const first = await relayService.consumeWhatsAppEventId('evt-dedupe-1234567890');
  const second = await relayService.consumeWhatsAppEventId('evt-dedupe-1234567890');
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  relayService.resetWhatsAppEventDedupe();
});

test('relay: builds whatsapp broadcast payloads per event type', () => {
  const qrPayload = relayService.buildWhatsAppBroadcastPayload({
    event: 'whatsapp_qr',
    payload: { qrCode: 'data:image/png;base64,FAKE' },
  });
  assert.deepEqual(qrPayload, { qrCode: 'data:image/png;base64,FAKE' });

  const statusPayload = relayService.buildWhatsAppBroadcastPayload({
    event: 'whatsapp_status',
    payload: { connected: true, statusText: 'CONNECTED', phoneNumber: '919999999999' },
  });
  assert.equal(statusPayload.connected, true);
  assert.equal(statusPayload.statusText, 'CONNECTED');
  assert.equal(statusPayload.phoneNumber, '919999999999');

  const messagePayload = relayService.buildWhatsAppBroadcastPayload({
    event: 'whatsapp_new_message',
    payload: { _id: '507f1f77bcf86cd799439011', type: 'in', body: 'hello', direction: 'in' },
  });
  assert.equal(messagePayload._id, '507f1f77bcf86cd799439011');
});

test('relay: handleWhatsAppEvent broadcasts via injected socket dispatch and dedupes', async () => {
  relayService.resetWhatsAppEventDedupe();
  const broadcasts = [];
  const fakeApp = {
    get: (key) => {
      if (key === 'socketio_dispatch') {
        return (userId, event, payload) => {
          broadcasts.push({ userId, event, payload });
          return true;
        };
      }
      return undefined;
    },
  };
  const first = await relayService.handleWhatsAppEvent({
    app: fakeApp,
    event: 'whatsapp_qr',
    payload: { qrCode: 'data:image/png;base64,FAKE' },
    direction: 'in',
    eventId: 'evt-broadcast-1234567890',
  });
  const second = await relayService.handleWhatsAppEvent({
    app: fakeApp,
    event: 'whatsapp_qr',
    payload: { qrCode: 'data:image/png;base64,FAKE' },
    direction: 'in',
    eventId: 'evt-broadcast-1234567890',
  });
  assert.equal(first.ok, true);
  assert.equal(first.duplicate, false);
  assert.equal(second.ok, true);
  assert.equal(second.duplicate, true);
  assert.equal(broadcasts.length, 1);
  relayService.resetWhatsAppEventDedupe();
});

test('relay: handleWhatsAppEvent reports broadcast failure as retryable', async () => {
  const fakeApp = { get: () => undefined };
  const result = await relayService.handleWhatsAppEvent({
    app: fakeApp,
    event: 'whatsapp_qr',
    payload: { qrCode: 'data:image/png;base64,FAKE' },
    direction: 'in',
    eventId: 'evt-broadcast-fail-1234567890',
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'WA_EVENT_BROADCAST_FAILED');
  assert.equal(result.error.retryable, true);
});

test('internal events route: rejects requests without internal auth headers', async () => {
  const { app } = createInternalApp();
  const { server, base } = await startServer(app);
  try {
    const res = await fetch(base + '/internal/whatsapp/events/connection', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ event: 'whatsapp_qr', payload: { qrCode: 'data:FAKE' }, direction: 'in', eventId: 'evt-route-noauth-1234567890' }),
    });
    const data = await res.json().catch(() => null);
    assert.equal(res.status, 401);
    assert.equal(data.error.code, 'INTERNAL_AUTH_HEADERS_MISSING');
  } finally {
    await stopServer(server);
  }
});

test('internal events route: relays valid whatsapp_qr event with valid hmac', async () => {
  relayService.resetWhatsAppEventDedupe();
  const { app, broadcasts } = createInternalApp();
  const { server, base } = await startServer(app);
  try {
    const { status, data } = await postInternalEvent(base, {
      event: 'whatsapp_qr',
      payload: { qrCode: 'data:image/png;base64,FAKE' },
      direction: 'in',
      eventId: 'evt-route-1234567890',
    });
    assert.equal(status, 200);
    assert.equal(data.success, true);
    assert.equal(data.relayed, true);
    assert.equal(broadcasts.length, 1);
  } finally {
    await stopServer(server);
  }
});

test('internal events route: returns duplicate result for repeated event id', async () => {
  relayService.resetWhatsAppEventDedupe();
  const { app } = createInternalApp();
  const { server, base } = await startServer(app);
  try {
    const first = await postInternalEvent(base, {
      event: 'whatsapp_qr',
      payload: { qrCode: 'data:image/png;base64,FAKE' },
      direction: 'in',
      eventId: 'evt-route-dup-1234567890',
    });
    const second = await postInternalEvent(base, {
      event: 'whatsapp_qr',
      payload: { qrCode: 'data:image/png;base64,FAKE' },
      direction: 'in',
      eventId: 'evt-route-dup-1234567890',
    });
    assert.equal(first.status, 200);
    assert.equal(first.data.relayed, true);
    assert.equal(second.status, 200);
    assert.equal(second.data.relayed, false);
    assert.equal(second.data.duplicate, true);
  } finally {
    await stopServer(server);
  }
});

test('internal events route: rejects unsupported event names', async () => {
  const { app } = createInternalApp();
  const { server, base } = await startServer(app);
  try {
    const { status, data } = await postInternalEvent(base, {
      event: 'whatsapp_unknown_event',
      payload: { foo: 'bar' },
      direction: 'in',
      eventId: 'evt-route-bad-1234567890',
    });
    assert.equal(status, 400);
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'WA_EVENT_INVALID');
  } finally {
    await stopServer(server);
  }
});

test('internal events route: maps broadcast failure to retryable error envelope', async () => {
  const app = createInternalAppWithoutDispatch();
  const { server, base } = await startServer(app);
  try {
    const { status, data } = await postInternalEvent(base, {
      event: 'whatsapp_qr',
      payload: { qrCode: 'data:image/png;base64,FAKE' },
      direction: 'in',
      eventId: 'evt-route-bcast-1234567890',
    });
    assert.equal(status, 500);
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'WA_EVENT_BROADCAST_FAILED');
    assert.equal(data.error.retryable, true);
  } finally {
    await stopServer(server);
  }
});