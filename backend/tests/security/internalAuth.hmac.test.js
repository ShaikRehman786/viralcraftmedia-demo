import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-secret-key-0123456789';

const mod = await import('../../shared/security/internalAuth.js');
const {
  signInternalPayload,
  buildCanonicalMessage,
  canonicalizeRequestPath,
  canonicalizeRequestBody,
  __internal
} = mod;

test('HMAC contract: canonical path normalizes and includes query string', () => {
  assert.equal(canonicalizeRequestPath('/a/b?x=1&y=2'), '/a/b?x=1&y=2');
  assert.equal(canonicalizeRequestPath('a/b'), '/a/b');
  assert.equal(canonicalizeRequestPath('/a/../b'), '/b');
  assert.equal(canonicalizeRequestPath('/a%20b?q=hello%20world'), '/a%20b?q=hello%20world');
});

test('HMAC contract: canonical body handles empty/undefined/object/string consistently', () => {
  assert.equal(canonicalizeRequestBody(undefined, undefined), '');
  assert.equal(canonicalizeRequestBody(null, undefined), '');
  assert.equal(canonicalizeRequestBody('', undefined), '');
  assert.equal(canonicalizeRequestBody({}, undefined), '');
  assert.equal(canonicalizeRequestBody({ a: 1 }, undefined), JSON.stringify({ a: 1 }));
  assert.equal(canonicalizeRequestBody({ a: 1 }, '{"a":1}'), '{"a":1}');
  assert.equal(canonicalizeRequestBody('raw', undefined), 'raw');
  assert.equal(canonicalizeRequestBody(Buffer.from('buf'), undefined), 'buf');
});

function verifyWith(overrides = {}, base = null) {
  const baseParams = base || {
    serviceName: 'orders-service',
    method: 'POST',
    path: '/internal/sync?x=1',
    body: { id: 123, ok: true },
    timestamp: Date.now().toString(),
    nonce: crypto.randomBytes(16).toString('hex')
  };
  const params = { ...baseParams, ...overrides };
  const headers = signInternalPayload(params);
  const secret = process.env.INTERNAL_SERVICE_KEY;
  const canonicalBody = canonicalizeRequestBody(params.body, params.rawBody);
  const message = buildCanonicalMessage({
    timestamp: headers['x-internal-timestamp'],
    service: headers['x-internal-service'],
    nonce: headers['x-internal-nonce'],
    method: params.method,
    path: params.path,
    body: canonicalBody
  });
  const expected = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return { headers, expected, params, message };
}

test('HMAC contract: valid method/path/body/signature accepted (sign/verify parity)', () => {
  const { headers, expected } = verifyWith();
  assert.equal(headers['x-internal-signature'], expected);
  assert.ok(__internal.isValidNonce(headers['x-internal-nonce']));
});

test('HMAC contract: changed HTTP method rejected', () => {
  const signed = verifyWith({ method: 'POST' });
  const tampered = verifyWith({ method: 'PUT' }, signed.params);
  assert.notEqual(signed.headers['x-internal-signature'], tampered.expected);
});

test('HMAC contract: changed URL path rejected', () => {
  const signed = verifyWith({ path: '/internal/a' });
  const tampered = verifyWith({ path: '/internal/b' }, signed.params);
  assert.notEqual(signed.headers['x-internal-signature'], tampered.expected);
});

test('HMAC contract: changed query string rejected (query is part of canonical path)', () => {
  const signed = verifyWith({ path: '/internal/a?x=1' });
  const tampered = verifyWith({ path: '/internal/a?x=2' }, signed.params);
  assert.notEqual(signed.headers['x-internal-signature'], tampered.expected);
});

test('HMAC contract: changed body rejected', () => {
  const signed = verifyWith({ body: { a: 1 } });
  const tampered = verifyWith({ body: { a: 2 } }, signed.params);
  assert.notEqual(signed.headers['x-internal-signature'], tampered.expected);
});

test('HMAC contract: empty body handled correctly', () => {
  const a = verifyWith({ body: undefined, rawBody: undefined });
  const b = verifyWith({ body: {}, rawBody: undefined }, a.params);
  const c = verifyWith({ body: '', rawBody: '' }, a.params);
  // all canonicalize to empty payload
  assert.equal(a.expected, b.expected);
  assert.equal(a.expected, c.expected);
});

test('HMAC contract: canonical message is unambiguous newline-delimited', () => {
  const msg = buildCanonicalMessage({ timestamp: '1', service: 'svc', nonce: 'n', method: 'GET', path: '/p?q=1', body: '' });
  assert.equal(msg, '1\nsvc\nn\nGET\n/p?q=1\n');
});