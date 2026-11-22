import crypto from 'crypto';
import { signInternalPayload } from '../security/internalAuth.js';
import { logger } from '../utils/logger.js';

export const WHATSAPP_REALTIME_EVENTS = Object.freeze({
  QR: 'whatsapp_qr',
  STATUS: 'whatsapp_status',
  NEW_MESSAGE: 'whatsapp_new_message',
});

const DEFAULT_MAIN_API_URL = 'http://localhost:5000';
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 10000;
const BACKOFF_BASE_MS = 200;
const MAX_RETRY_BACKOFF_MS = 2000;

function resolveBaseUrl(explicitBaseUrl) {
  const raw = explicitBaseUrl || process.env.MAIN_API_URL || DEFAULT_MAIN_API_URL;
  return String(raw).replace(/\/+$/, '');
}

function parsePositiveInt(raw, fallback) {
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toHttpPayload(body) {
  if (body === undefined || body === null) return '';
  if (typeof body === 'string') return body;
  return JSON.stringify(body);
}

export function buildWhatsAppEventId(event, payload) {
  if (event === WHATSAPP_REALTIME_EVENTS.NEW_MESSAGE) {
    const id = payload && typeof payload === 'object' ? (payload._id ?? payload.messageId ?? payload.id) : null;
    if (id !== null && id !== undefined && id !== '') return String(id);
  }
  return crypto.randomUUID();
}

export function resolveWhatsAppEventEndpoint(event) {
  if (event === WHATSAPP_REALTIME_EVENTS.QR || event === WHATSAPP_REALTIME_EVENTS.STATUS) {
    return '/internal/whatsapp/events/connection';
  }
  if (event === WHATSAPP_REALTIME_EVENTS.NEW_MESSAGE) {
    return '/internal/whatsapp/events/message';
  }
  return null;
}

async function forwardOnce({ event, payload, direction, eventId, method, path, timeoutMs }) {
  const body = { event, payload: payload || {}, direction: direction || 'in', eventId };
  const rawBody = JSON.stringify(body);
  const headers = signInternalPayload({
    serviceName: 'main-api',
    method,
    path,
    body,
    rawBody,
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${resolveBaseUrl()}${path}`, {
      method,
      headers: { ...headers, 'content-type': 'application/json; charset=utf-8' },
      body: rawBody,
      signal: controller.signal,
    });
    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }
    if (!res.ok) {
      const error = new Error((data && data.error && data.error.message) ? data.error.message : `Main API responded with HTTP ${res.status}.`);
      error.status = res.status;
      error.retryable = res.status >= 500 || res.status === 429;
      error.code = (data && data.error && data.error.code) || 'WA_EVENT_FORWARD_FAILED';
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function forwardWhatsAppEvent({
  event,
  payload,
  direction,
  eventId,
  baseUrl,
  method = 'POST',
  maxRetries = parsePositiveInt(process.env.WHATSAPP_EVENT_RETRIES, DEFAULT_MAX_RETRIES),
  timeoutMs = parsePositiveInt(process.env.WHATSAPP_EVENT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
} = {}) {
  const endpoint = resolveWhatsAppEventEndpoint(event);
  if (!endpoint) {
    throw Object.assign(new Error('Unsupported WhatsApp realtime event for relay.'), { status: 400, retryable: false });
  }
  const resolvedEventId = eventId || buildWhatsAppEventId(event, payload);
  const body = { event, payload: payload || {}, direction: direction || 'in', eventId: resolvedEventId };

  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const data = await forwardOnce({
        event,
        payload,
        direction,
        eventId: resolvedEventId,
        method,
        path: endpoint,
        timeoutMs,
      });
      const relayed = data && typeof data === 'object' ? data.relayed : true;
      return { success: true, relayed: relayed === true, duplicate: relayed === false, eventId: resolvedEventId };
    } catch (err) {
      lastError = err;
      const retryable = err && err.retryable;
      if (attempt < maxRetries && retryable) {
        const delay = Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), MAX_RETRY_BACKOFF_MS);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export default {
  WHATSAPP_REALTIME_EVENTS,
  forwardWhatsAppEvent,
  buildWhatsAppEventId,
  resolveWhatsAppEventEndpoint,
  resolveWhatsAppCommandEndpoint,
  forwardWhatsAppInboundCommand,
};
export function resolveWhatsAppCommandEndpoint() {
  return '/internal/whatsapp/commands/inbound';
}

export async function forwardWhatsAppInboundCommand({
  commandContext,
  idempotencyKey,
  baseUrl,
  method = 'POST',
  maxRetries = parsePositiveInt(process.env.WHATSAPP_COMMAND_RETRIES, DEFAULT_MAX_RETRIES),
  timeoutMs = parsePositiveInt(process.env.WHATSAPP_COMMAND_TIMEOUT_MS, 15000),
} = {}) {
  const path = resolveWhatsAppCommandEndpoint();
  const body = { commandContext: commandContext || {}, idempotencyKey: idempotencyKey || (commandContext && commandContext.messageId) || null };
  const rawBody = JSON.stringify(body);
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const headers = signInternalPayload({
        serviceName: 'whatsapp-service',
        method,
        path,
        body,
        rawBody,
      });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res;
      try {
        res = await fetch(`${resolveBaseUrl(baseUrl)}${path}`, {
          method,
          headers: { ...headers, 'content-type': 'application/json; charset=utf-8' },
          body: rawBody,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      const text = await res.text();
      let data = null;
      if (text) {
        try { data = JSON.parse(text); } catch { data = text; }
      }
      if (!res.ok) {
        const error = new Error((data && data.error && data.error.message) ? data.error.message : `Main API responded with HTTP ${res.status}.`);
        error.status = res.status;
        error.retryable = res.status >= 500 || res.status === 429;
        error.code = (data && data.error && data.error.code) || 'WA_COMMAND_FORWARD_FAILED';
        throw error;
      }
      return data;
    } catch (err) {
      lastError = err;
      const retryable = err && err.retryable;
      if (attempt < maxRetries && retryable) {
        const delay = Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), MAX_RETRY_BACKOFF_MS);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}


