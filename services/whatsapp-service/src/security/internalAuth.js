import crypto from 'crypto';
import { safeSet, isRedisAvailable } from '../config/redis.js';

const SKEW_TOLERANCE_MS = 30 * 1000; // 30 seconds
const NONCE_TTL_SECONDS = 60; // covers accepted request window with margin
const NONCE_KEY_PREFIX = 'internal:nonce:';

/**
 * Get internal service secret from environment.
 * In production, this must be set. In development, a fallback is provided with a warning.
 */
export function getInternalServiceKey() {
  const key = process.env.INTERNAL_SERVICE_KEY;
  if (!key) {
    if ((process.env.NODE_ENV || 'development') === 'production') {
      throw new Error('[SECURITY] INTERNAL_SERVICE_KEY is required in production.');
    }
    return 'dev-internal-secret-key-change-in-production';
  }
  return key;
}

function ensureObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  return {};
}

function normalizeMethod(method) {
  return String(method || 'GET').toUpperCase();
}

/**
 * Canonical request path for signing/verification.
 * Contract: full request target path + query string from req.originalUrl (or provided path),
 * normalized via URL parsing to ensure consistent encoding/formatting. Query parameters are
 * included as part of the canonical path string (sorted? no - preserved as normalized by URL).
 * Fragments are not part of HTTP requests and are ignored.
 */
export function canonicalizeRequestPath(inputPath) {
  const raw = typeof inputPath === 'string' && inputPath.length ? inputPath : '/';
  // Ensure we have an absolute-path style value
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  try {
    const u = new URL(withSlash, 'http://internal.local');
    // pathname is decoded+re-encoded by URL; search preserved (normalized). No hash in HTTP target.
    return `${u.pathname}${u.search}`;
  } catch {
    return withSlash;
  }
}

/**
 * Canonical body representation for signing/verification.
 * Contract: raw request body string when available (e.g. req.rawBody / captured string),
 * otherwise for Buffer use utf8 string, otherwise JSON.stringify(body||{}). Empty/undefined/null
 * bodies normalize to empty string "" to distinguish "no body" consistently for methods like GET.
 */
export function canonicalizeRequestBody(body, rawBody) {
  if (typeof rawBody === 'string') return rawBody;
  if (Buffer.isBuffer(rawBody)) return rawBody.toString('utf8');
  if (body === undefined || body === null || body === '') return '';
  if (typeof body === 'string') return body;
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  // Express may populate req.body as {} for empty JSON bodies; treat empty object as empty payload
  if (typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 0) return '';
  return JSON.stringify(body);
}

export function buildCanonicalMessage({ timestamp, service, nonce, method, path, body }) {
  const ts = String(timestamp);
  const svc = String(service);
  const n = String(nonce);
  const m = normalizeMethod(method);
  const p = canonicalizeRequestPath(path);
  const b = body == null ? '' : String(body);
  // Newline-delimited fields avoid ambiguous concatenation with attacker-controlled values.
  return `${ts}\n${svc}\n${n}\n${m}\n${p}\n${b}`;
}

function computeSignature(secret, canonicalMessage) {
  return crypto.createHmac('sha256', secret).update(canonicalMessage).digest('hex');
}

function isValidNonce(nonce) {
  return typeof nonce === 'string' && /^[A-Za-z0-9._:-]{16,256}$/.test(nonce);
}

function sendInternalAuthError(res, status, code, message) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      statusCode: status
    }
  });
}

/**
 * Generate HMAC headers for an internal service request.
 * New contract signs: timestamp, service identity, nonce, HTTP method, canonical path, body.
 */
export function signInternalPayload(params = {}, legacyBody = '', legacyOptions = {}) {
  let serviceName;
  let method;
  let path;
  let body;
  let rawBody;
  let timestamp;
  let nonce;

  if (typeof params === 'string') {
    // Legacy shape: (serviceName, body)
    serviceName = params;
    method = (legacyOptions && legacyOptions.method) || 'POST';
    path = (legacyOptions && legacyOptions.path) || '/';
    body = legacyBody;
    rawBody = legacyOptions && legacyOptions.rawBody;
    timestamp = legacyOptions && legacyOptions.timestamp;
    nonce = legacyOptions && legacyOptions.nonce;
  } else {
    const p = ensureObject(params);
    serviceName = p.serviceName || p.service;
    method = p.method || 'POST';
    path = p.path || p.url || '/';
    body = p.body;
    rawBody = p.rawBody;
    timestamp = p.timestamp;
    nonce = p.nonce;
  }

  if (!serviceName) {
    throw new Error('signInternalPayload requires serviceName');
  }

  const ts = timestamp != null ? String(timestamp) : Date.now().toString();
  const n = nonce != null ? String(nonce) : crypto.randomBytes(16).toString('hex');
  if (!isValidNonce(n)) {
    throw new Error('signInternalPayload produced invalid nonce');
  }
  const canonicalBody = canonicalizeRequestBody(body, rawBody);
  const canonicalPath = canonicalizeRequestPath(path);
  const canonicalMethod = normalizeMethod(method);
  const message = buildCanonicalMessage({
    timestamp: ts,
    service: serviceName,
    nonce: n,
    method: canonicalMethod,
    path: canonicalPath,
    body: canonicalBody
  });
  const secret = getInternalServiceKey();
  const signature = computeSignature(secret, message);

  return {
    'x-internal-service': String(serviceName),
    'x-internal-timestamp': ts,
    'x-internal-nonce': n,
    'x-internal-signature': signature
  };
}

async function reserveNonce(nonce, req) {
  const key = `${NONCE_KEY_PREFIX}${nonce}`;
  const customStore = req && req.app && typeof req.app.get === 'function'
    ? req.app.get('internalNonceStore')
    : null;

  // Prefer Redis atomic SET NX+EX when available.
  try {
    if (isRedisAvailable()) {
      const stored = await safeSet(key, '1', NONCE_TTL_SECONDS, 'NX');
      if (stored === 'OK') return { ok: true };
      // NX not satisfied => replay (atomic reject), even if a custom store is also present.
      return { ok: false, reason: 'replay' };
    }
  } catch {
    // Fall through to explicit store/fail-closed handling below.
  }

  // Redis unavailable: only an explicitly injected atomic store may be used (controlled/test harness).
  // Default behavior is fail-closed.
  if (customStore && typeof customStore.reserve === 'function') {
    try {
      const reserved = await customStore.reserve(key, NONCE_TTL_SECONDS);
      if (reserved === true) return { ok: true };
      if (reserved === false) return { ok: false, reason: 'replay' };
    } catch {
      return { ok: false, reason: 'redis_unavailable' };
    }
  }
  return { ok: false, reason: 'redis_unavailable' };
}

/**
 * Express middleware to verify internal service HMAC requests with nonce replay protection.
 * Replay protection fails closed if Redis is unavailable (unless an explicit atomic store is injected).
 */
export function verifyInternalRequest(req, res, next) {
  // Allow health checks and probe requests without internal token
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  const service = req.headers['x-internal-service'];
  const timestamp = req.headers['x-internal-timestamp'];
  const clientSignature = req.headers['x-internal-signature'];
  const nonce = req.headers['x-internal-nonce'];

  if (!service || !timestamp || !clientSignature || !nonce) {
    return sendInternalAuthError(res, 401, 'INTERNAL_AUTH_HEADERS_MISSING', 'Missing required internal authentication headers.');
  }

  if (typeof service !== 'string' || service.length === 0 || service.length > 128) {
    return sendInternalAuthError(res, 401, 'INTERNAL_AUTH_SERVICE_INVALID', 'Invalid internal service identity.');
  }
  if (!isValidNonce(typeof nonce === 'string' ? nonce : String(nonce))) {
    return sendInternalAuthError(res, 401, 'INTERNAL_AUTH_NONCE_INVALID', 'Missing, malformed, or invalid nonce.');
  }

  // Prevent replay attacks by checking timestamp drift (validate before accepting request)
  const requestTime = parseInt(String(timestamp), 10);
  if (!Number.isFinite(requestTime) || Math.abs(Date.now() - requestTime) > SKEW_TOLERANCE_MS) {
    return sendInternalAuthError(res, 401, 'INTERNAL_AUTH_TIMESTAMP_INVALID', 'Internal request signature timestamp expired or outside allowed window.');
  }

  let secret;
  try {
    secret = getInternalServiceKey();
  } catch (err) {
    return sendInternalAuthError(res, 500, 'INTERNAL_AUTH_CONFIG_ERROR', 'Internal authentication is not configured.');
  }

  try {
    const canonicalBody = canonicalizeRequestBody(req.body, req.rawBody);
    const pathForSignature = req.originalUrl || req.url || req.path || '/';
    const message = buildCanonicalMessage({
      timestamp,
      service,
      nonce,
      method: req.method,
      path: pathForSignature,
      body: canonicalBody
    });
    const expectedSignature = computeSignature(secret, message);

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const clientBuffer = Buffer.from(String(clientSignature), 'utf8');

    if (expectedBuffer.length !== clientBuffer.length || !crypto.timingSafeEqual(expectedBuffer, clientBuffer)) {
      return sendInternalAuthError(res, 403, 'INTERNAL_AUTH_SIGNATURE_INVALID', 'Invalid internal request signature.');
    }

    // Signature valid - enforce single-use nonce (fail closed if Redis unavailable)
    Promise.resolve(reserveNonce(String(nonce), req))
      .then((result) => {
        if (!result.ok) {
          if (result.reason === 'replay') {
            return sendInternalAuthError(res, 401, 'INTERNAL_AUTH_REPLAY_DETECTED', 'Replay detected: nonce has already been used.');
          }
          return sendInternalAuthError(res, 503, 'INTERNAL_AUTH_REPLAY_PROTECTION_UNAVAILABLE', 'Replay protection unavailable. Request rejected.');
        }
        req.internalService = String(service);
        req.internalAuth = { nonce: String(nonce), timestamp: requestTime };
        return next();
      })
      .catch(() => sendInternalAuthError(res, 503, 'INTERNAL_AUTH_REPLAY_PROTECTION_UNAVAILABLE', 'Replay protection unavailable. Request rejected.'));
  } catch {
    return sendInternalAuthError(res, 500, 'INTERNAL_AUTH_VERIFICATION_ERROR', 'Internal authentication verification failed.');
  }
}

export const __internal = {
  SKEW_TOLERANCE_MS,
  NONCE_TTL_SECONDS,
  NONCE_KEY_PREFIX,
  buildCanonicalMessage,
  canonicalizeRequestPath,
  canonicalizeRequestBody,
  isValidNonce
};
