import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-secret-key-0123456789';
delete process.env.MAIN_API_URL;

const { forwardWhatsAppEvent, buildWhatsAppEventId, resolveWhatsAppEventEndpoint, WHATSAPP_REALTIME_EVENTS } = await import('../src/services/eventRelay.js');

function startServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      handler(req, res);
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, base: 'http://127.0.0.1:' + address.port });
    });
  });
}

async function stopServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

test('eventRelay: resolves forward endpoints per whatsapp event type', () => {
  assert.equal(resolveWhatsAppEventEndpoint('whatsapp_qr'), '/internal/whatsapp/events/connection');
  assert.equal(resolveWhatsAppEventEndpoint('whatsapp_status'), '/internal/whatsapp/events/connection');
  assert.equal(resolveWhatsAppEventEndpoint('whatsapp_new_message'), '/internal/whatsapp/events/message');
});

test('eventRelay: builds whatsapp event id for new messages from payload id', () => {
  const id = buildWhatsAppEventId('whatsapp_new_message', { _id: '507f1f77bcf86cd799439011' });
  assert.equal(id, '507f1f77bcf86cd799439011');
  const fallback = buildWhatsAppEventId('whatsapp_qr', { qrCode: 'x' });
  assert.ok(typeof fallback === 'string' && fallback.length > 5);
});

test('eventRelay: forwards whatsapp event to main api internal endpoint', async () => {
  const seen = [];
  const { server, base } = await startServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      seen.push({ url: req.url, body: body });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ success: true, requestId: 'req-1', relayed: true }));
    });
  });
  try {
    process.env.MAIN_API_URL = base;
    const result = await forwardWhatsAppEvent({
      event: 'whatsapp_qr',
      payload: { qrCode: 'data:image/png;base64,FAKE' },
      direction: 'in',
      eventId: 'evt-forward-1234567890',
      baseUrl: base,
      maxRetries: 2,
      timeoutMs: 5000,
    });
    assert.equal(result.success, true);
    assert.equal(result.relayed, true);
    assert.equal(seen.length, 1);
    const parsed = JSON.parse(seen[0].body);
    assert.equal(parsed.event, 'whatsapp_qr');
    assert.equal(parsed.payload.qrCode, 'data:image/png;base64,FAKE');
  } finally {
    await stopServer(server);
  }
});

test('eventRelay: retries forward on 503 and eventually succeeds', async () => {
  let hits = 0;
  const { server, base } = await startServer((req, res) => {
    hits = hits + 1;
    if (hits < 3) {
      res.writeHead(503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: { code: 'UNAVAILABLE', message: 'unavailable' } }));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ success: true, relayed: true }));
  });
  try {
    process.env.MAIN_API_URL = base;
    const result = await forwardWhatsAppEvent({
      event: 'whatsapp_status',
      payload: { connected: true, statusText: 'CONNECTED' },
      direction: 'in',
      eventId: 'evt-forward-2-123456789',
      baseUrl: base,
      maxRetries: 3,
      timeoutMs: 5000,
    });
    assert.equal(result.success, true);
    assert.equal(hits, 3);
  } finally {
    await stopServer(server);
  }
});

test('eventRelay: does not retry forward on 4xx client error', async () => {
  let hits = 0;
  const { server, base } = await startServer((req, res) => {
    hits = hits + 1;
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: { code: 'WA_EVENT_INVALID', message: 'bad request' } }));
  });
  try {
    process.env.MAIN_API_URL = base;
    await assert.rejects(
      () => forwardWhatsAppEvent({
        event: 'whatsapp_qr',
        payload: { qrCode: 'data:FAKE' },
        direction: 'in',
        eventId: 'evt-forward-3-1234567890',
        baseUrl: base,
        maxRetries: 2,
        timeoutMs: 5000,
      }),
      /bad request/
    );
    assert.equal(hits, 1);
  } finally {
    await stopServer(server);
  }
});