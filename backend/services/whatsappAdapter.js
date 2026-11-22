import crypto from 'crypto';
import { signInternalPayload } from '../shared/security/internalAuth.js';
import { getServiceUrl, SERVICE_NAMES } from '../shared/config/ports.js';

const DEFAULT_READ_TIMEOUT_MS = 5000;
const DEFAULT_ACTION_TIMEOUT_MS = 10000;
const DEFAULT_READ_RETRIES = 2;
const BACKOFF_BASE_MS = 200;
const MAX_RETRY_BACKOFF_MS = 2000;

export const WHATSAPP_ADAPTER_ERROR_CODES = {
  TIMEOUT: 'WA_TIMEOUT',
  UNAVAILABLE: 'WA_UNAVAILABLE',
  INVALID_RESPONSE: 'WA_INVALID_RESPONSE',
  HTTP_ERROR: 'WA_HTTP_ERROR',
};

export class WhatsAppAdapterError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'WhatsAppAdapterError';
    this.code = options.code || WHATSAPP_ADAPTER_ERROR_CODES.HTTP_ERROR;
    this.status = options.status || 502;
    this.retryable = Boolean(options.retryable);
    this.details = options.details;
  }
}

export function isWhatsAppAdapterEnabled() {
  const raw = String(process.env.WHATSAPP_ADAPTER_ENABLED || '').trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on';
}

function resolveBaseUrl() {
  return getServiceUrl(SERVICE_NAMES.WHATSAPP).replace(/\/+$/, '');
}

function parsePositiveInt(raw, fallback) {
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function resolveTimeoutMs(kind) {
  const override = parsePositiveInt(process.env.WHATSAPP_ADAPTER_TIMEOUT_MS, 0);
  if (override > 0) return override;
  return kind === 'read' ? DEFAULT_READ_TIMEOUT_MS : DEFAULT_ACTION_TIMEOUT_MS;
}

function resolveRetries(kind) {
  if (kind !== 'read') return 0;
  return parsePositiveInt(process.env.WHATSAPP_ADAPTER_RETRIES, DEFAULT_READ_RETRIES);
}

function backoffDelay(attempt) {
  const delay = Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), MAX_RETRY_BACKOFF_MS);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function toHttpPayload(body) {
  if (body === undefined || body === null) return '';
  if (typeof body === 'string') return body;
  return JSON.stringify(body);
}

function extractErrorMessage(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  return (
    data?.error?.message ||
    data?.result?.error ||
    data?.message ||
    ''
  );
}

function extractErrorCode(data, status) {
  if (data && typeof data === 'object') {
    if (data.error?.code) return data.error.code;
    if (data.result?.reason) return `WA_${String(data.result.reason).toUpperCase()}`;
  }
  return `${WHATSAPP_ADAPTER_ERROR_CODES.HTTP_ERROR}_${status}`;
}

function normalizeError(err) {
  if (err instanceof WhatsAppAdapterError) return err;
  if (err && err.name === 'AbortError') {
    return new WhatsAppAdapterError('WhatsApp service request timed out.', {
      code: WHATSAPP_ADAPTER_ERROR_CODES.TIMEOUT,
      status: 504,
      retryable: true,
    });
  }
  return new WhatsAppAdapterError('WhatsApp service is unavailable.', {
    code: WHATSAPP_ADAPTER_ERROR_CODES.UNAVAILABLE,
    status: 503,
    retryable: true,
    details: err?.message || String(err),
  });
}

async function performRequest({ method, target, path, body, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const payload = toHttpPayload(body);
    const headers = signInternalPayload({
      serviceName: SERVICE_NAMES.MAIN_API,
      method,
      path,
      body,
    });
    const res = await fetch(target, {
      method,
      headers: {
        ...headers,
        ...(payload ? { 'content-type': 'application/json; charset=utf-8' } : {}),
      },
      body: method === 'GET' || method === 'HEAD' ? undefined : (payload || undefined),
      signal: controller.signal,
    });
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!res.ok) {
      throw new WhatsAppAdapterError(extractErrorMessage(data) || `WhatsApp service responded with HTTP ${res.status}.`, {
        code: extractErrorCode(data, res.status),
        status: res.status,
        retryable: res.status >= 500 || res.status === 429,
        details: data,
      });
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function internalRequest({ method, path, body, kind = 'action' }) {
  const timeoutMs = resolveTimeoutMs(kind);
  const maxRetries = resolveRetries(kind);
  const target = `${resolveBaseUrl()}${path}`;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await performRequest({ method, target, path, body, timeoutMs });
    } catch (err) {
      lastError = normalizeError(err);
      if (attempt < maxRetries && lastError.retryable) {
        await backoffDelay(attempt);
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

function assertSuccessEnvelope(data, expectedKey) {
  if (!data || data.success !== true || !data[expectedKey]) {
    throw new WhatsAppAdapterError('WhatsApp service returned an invalid response.', {
      code: WHATSAPP_ADAPTER_ERROR_CODES.INVALID_RESPONSE,
      status: 502,
      retryable: false,
      details: data,
    });
  }
  return data[expectedKey];
}

export function mapStatusToPublic(status = {}) {
  return {
    success: true,
    connected: status.connectionStatus === 'CONNECTED',
    phoneNumber: status.phoneNumber || '',
    pushName: status.pushName || '',
    lastConnectedAt: status.lastConnectedAt || null,
    qrCode: status.qrCode || '',
    lastHeartbeat: status.lastHeartbeat || null,
    reconnectCount: status.reconnectCount || 0,
    qrGeneratedCount: status.qrGeneratedCount || 0,
    sessionRestored: status.sessionRestored || false,
  };
}

export function mapQrToPublic(qr = {}) {
  return {
    success: true,
    qrCode: qr.qrCode || '',
  };
}

export const whatsappAdapter = {
  async getStatus() {
    const data = await internalRequest({ method: 'GET', path: '/internal/whatsapp/status', kind: 'read' });
    return assertSuccessEnvelope(data, 'status');
  },

  async getQr() {
    const data = await internalRequest({ method: 'GET', path: '/internal/whatsapp/qr', kind: 'read' });
    return assertSuccessEnvelope(data, 'qr');
  },

  async generateQr() {
    const data = await internalRequest({ method: 'POST', path: '/internal/whatsapp/generate-qr', body: {}, kind: 'action' });
    const success = data?.success === true && data?.result?.success === true;
    return {
      success,
      message: 'QR generation triggered',
      error: success ? undefined : (data?.result?.error || data?.error?.message || 'Failed to generate QR code.'),
    };
  },

  async reconnect() {
    const data = await internalRequest({ method: 'POST', path: '/internal/whatsapp/reconnect', body: {}, kind: 'action' });
    const success = data?.success === true && data?.result?.success === true;
    return { success, error: success ? undefined : (data?.result?.error || data?.error?.message || 'Reconnect failed') };
  },

  async logout() {
    const data = await internalRequest({ method: 'POST', path: '/internal/whatsapp/logout', body: {}, kind: 'action' });
    const success = data?.success === true && data?.result?.success === true;
    return { success, error: success ? undefined : (data?.result?.error || data?.error?.message || 'Logout failed') };
  },

  async clearSession() {
    const data = await internalRequest({ method: 'POST', path: '/internal/whatsapp/clear-session', body: {}, kind: 'action' });
    const success = data?.success === true && data?.result?.success === true;
    return { success, error: success ? undefined : (data?.result?.error || data?.error?.message || 'Clear session failed') };
  },

  async sendMessage({ phoneNumber, text, purpose = 'manual', metadata = {} }) {
    const data = await internalRequest({
      method: 'POST',
      path: '/internal/whatsapp/send',
      body: {
        phoneNumber,
        text,
        purpose,
        idempotencyKey: crypto.randomUUID(),
        metadata: { ...metadata, source: metadata.source || 'api' },
      },
      kind: 'action',
    });
    return assertSuccessEnvelope(data, 'data');
  },

  async getMessages({ limit = 100 } = {}) {
    const parsed = parsePositiveInt(limit, 100);
    const safeLimit = Math.min(parsed, 100);
    const data = await internalRequest({
      method: 'GET',
      path: `/internal/whatsapp/messages?limit=${safeLimit}`,
      kind: 'read',
    });
    const messages = assertSuccessEnvelope(data, 'data');
    if (!Array.isArray(messages)) {
      throw new WhatsAppAdapterError('WhatsApp service returned an invalid messages response.', {
        code: WHATSAPP_ADAPTER_ERROR_CODES.INVALID_RESPONSE,
        status: 502,
        retryable: false,
        details: data,
      });
    }
    return messages;
  },
};

export default whatsappAdapter;
