import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-secret-key-0123456789';
process.env.RAZORPAY_KEY_ID = 'rzp_test_placeholder';
process.env.RAZORPAY_KEY_SECRET = 'placeholder';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/whatsapp_auth_contract_test';
process.env.BACKUP_JWT_SECRET = 'test-backup-secret';
process.env.PARTNER_JWT_SECRET = 'test-partner-secret';
process.env.BACKUP_ADMIN_EMAIL = 'backup-admin@example.com';
process.env.BACKUP_ADMIN_PASSWORD = 'test-backup-password';
delete process.env.REDIS_URL;

const { authorize } = await import('../../middleware/auth.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runAuthorize(roles, user) {
  const req = { user };
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  let nextCalled = false;
  authorize(...roles)(req, res, () => { nextCalled = true; });
  return { nextCalled, res };
}

test('authorize: listed roles are allowed', () => {
  const superAdmin = runAuthorize(['SUPER_ADMIN', 'MANAGER'], { role: 'SUPER_ADMIN' });
  assert.equal(superAdmin.nextCalled, true);

  const manager = runAuthorize(['SUPER_ADMIN', 'MANAGER'], { role: 'MANAGER' });
  assert.equal(manager.nextCalled, true);
});

test('authorize: unlisted roles are rejected with 403', () => {
  const employee = runAuthorize(['SUPER_ADMIN', 'MANAGER'], { role: 'EMPLOYEE' });
  assert.equal(employee.nextCalled, false);
  assert.equal(employee.res.statusCode, 403);
  assert.match(employee.res.body.error, /not authorized/);
});

test('authorize: missing user is rejected with 401', () => {
  const anon = runAuthorize(['SUPER_ADMIN'], undefined);
  assert.equal(anon.nextCalled, false);
  assert.equal(anon.res.statusCode, 401);
});

test('mount contract: /whatsapp stays behind protect + effective SUPER_ADMIN', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../routes/index.js'), 'utf8');
  assert.match(
    source,
    /router\.use\('\/whatsapp',\s*protect,\s*authorize\('SUPER_ADMIN'\),\s*whatsappRoutes\)/,
    'the /whatsapp mount must remain protect + authorize(SUPER_ADMIN)',
  );
});

test('route contract: methods, paths and per-route roles are unchanged', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../routes/whatsapp.js'), 'utf8');

  const expected = [
    ["router.get('/status', protect, authorize('SUPER_ADMIN', 'MANAGER')", 'GET /status'],
    ["router.get('/qr', protect, authorize('SUPER_ADMIN', 'MANAGER')", 'GET /qr'],
    ["router.post('/send', protect, authorize('SUPER_ADMIN'), webhookLimiter", 'POST /send'],
    ["router.post('/logout', protect, authorize('SUPER_ADMIN')", 'POST /logout'],
    ["router.post('/generate-qr', protect, authorize('SUPER_ADMIN')", 'POST /generate-qr'],
    ["router.post('/reconnect', protect, authorize('SUPER_ADMIN')", 'POST /reconnect'],
    ["router.post('/clear-session', protect, authorize('SUPER_ADMIN')", 'POST /clear-session'],
    ["router.get('/messages', protect, authorize('SUPER_ADMIN', 'MANAGER')", 'GET /messages'],
    ["router.post('/inbound', protect, authorize('SUPER_ADMIN', 'MANAGER')", 'POST /inbound'],
  ];

  for (const [needle, label] of expected) {
    assert.ok(source.includes(needle), `${label} route declaration changed`);
  }

  assert.match(source, /body\('phoneNumber'\)\.trim\(\)\.isLength\(\{ min: 10, max: 15 \}\)/);
  assert.match(source, /body\('text'\)\.trim\(\)\.isLength\(\{ min: 1, max: 2048 \}\)/);
  assert.match(source, /body\('text'\)\.trim\(\)\.isLength\(\{ min: 1 \}\)/);
});
