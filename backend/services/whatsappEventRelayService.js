import crypto from 'crypto';
import { isRedisAvailable, safeSet } from '../config/redis.js';

export const WHATSAPP_REALTIME_EVENTS = Object.freeze({
  QR: 'whatsapp_qr',
  STATUS: 'whatsapp_status',
  NEW_MESSAGE: 'whatsapp_new_message',
});

export const WHATSAPP_EVENT_ERROR_CODES = Object.freeze({
  INVALID_EVENT: 'WA_EVENT_INVALID',
  BROADCAST_FAILED: 'WA_EVENT_BROADCAST_FAILED',
});

const DEFAULT_DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TRACKED_EVENT_IDS = 5000;

const seenEventIds = new Map();

function pruneSeenEventIds(now) {
  if (seenEventIds.size <= MAX_TRACKED_EVENT_IDS) return;
  for (const [key, expiresAt] of seenEventIds.entries()) {
    if (expiresAt <= now) seenEventIds.delete(key);
  }
}

export function buildWhatsAppEventId() {
  return crypto.randomUUID();
}

export function isValidWhatsAppEventName(event) {
  return Object.values(WHATSAPP_REALTIME_EVENTS).includes(event);
}

export function isValidWhatsAppEventId(eventId) {
  if (typeof eventId !== 'string') return false;
  const trimmed = eventId.trim();
  if (trimmed.length < 8 || trimmed.length > 128) return false;
  return /^[A-Za-z0-9._:-]+$/.test(trimmed);
}

function invalidEventError(message) {
  return {
    ok: false,
    error: {
      code: WHATSAPP_EVENT_ERROR_CODES.INVALID_EVENT,
      message,
      statusCode: 400,
      retryable: false,
    },
  };
}

export function validateWhatsAppEvent({ event, payload, direction, eventId } = {}) {
  if (!isValidWhatsAppEventName(event)) {
    return invalidEventError('Unsupported WhatsApp realtime event.');
  }
  const resolvedEventId = typeof eventId === 'string' ? eventId.trim() : '';
  if (!isValidWhatsAppEventId(resolvedEventId)) {
    return invalidEventError('A valid unique WhatsApp eventId is required.');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return invalidEventError('WhatsApp event payload must be an object.');
  }
  if (event === WHATSAPP_REALTIME_EVENTS.QR) {
    if (typeof payload.qrCode !== 'string' || !payload.qrCode) {
      return invalidEventError('WhatsApp QR event payload requires a qrCode.');
    }
  }
  if (event === WHATSAPP_REALTIME_EVENTS.STATUS) {
    if (typeof payload.connected !== 'boolean') {
      return invalidEventError('WhatsApp status event payload requires a boolean connected flag.');
    }
  }
  if (event === WHATSAPP_REALTIME_EVENTS.NEW_MESSAGE) {
    const msgType = typeof payload.type === 'string' ? payload.type : '';
    if (msgType !== 'in' && msgType !== 'out') {
      return invalidEventError('WhatsApp message event payload requires a valid message type.');
    }
    if (typeof payload.body !== 'string') {
      return invalidEventError('WhatsApp message event payload requires a string body.');
    }
    if (direction && direction !== 'in' && direction !== 'out') {
      return invalidEventError('WhatsApp message direction must be "in" or "out".');
    }
  }
  return { ok: true, event, payload, direction, eventId: resolvedEventId };
}

export async function consumeWhatsAppEventId(eventId) {
  const ttlMs = parseInt(process.env.WHATSAPP_EVENT_DEDUPE_TTL_MS, 10);
  const ttl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_DEDUPE_TTL_MS;
  const now = Date.now();

  if (isRedisAvailable()) {
    const key = `whatsapp:event:${eventId}`;
    const ttlSeconds = Math.max(1, Math.ceil(ttl / 1000));
    const stored = await safeSet(key, '1', ttlSeconds, 'NX');
    if (stored === 'OK') {
      seenEventIds.set(eventId, now + ttl);
      return { duplicate: false };
    }
    // Redis is ready; a non-OK result means the key already existed (duplicate).
    // safeSet returns null on transport errors, which we treat as duplicate to
    // avoid rebroadcasting the same event under partial failures.
    return { duplicate: true };
  }

  const existing = seenEventIds.get(eventId);
  if (existing && existing > now) {
    return { duplicate: true };
  }
  if (seenEventIds.size > MAX_TRACKED_EVENT_IDS) {
    for (const [key, expiresAt] of seenEventIds.entries()) {
      if (expiresAt <= now) seenEventIds.delete(key);
    }
  }
  seenEventIds.set(eventId, now + ttl);
  return { duplicate: false };
}

export function resetWhatsAppEventDedupe() {
  seenEventIds.clear();
}

function buildStatusPayload(payload = {}) {
  const connected = payload.connected === true;
  const statusText = payload.statusText || (connected ? 'CONNECTED' : 'DISCONNECTED');
  const broadcast = { ...payload };
  broadcast.connected = connected;
  broadcast.statusText = statusText;
  return broadcast;
}

export function buildWhatsAppBroadcastPayload({ event, payload }) {
  if (event === WHATSAPP_REALTIME_EVENTS.QR) {
    return { qrCode: String(payload?.qrCode || '') };
  }
  if (event === WHATSAPP_REALTIME_EVENTS.STATUS) {
    return buildStatusPayload(payload || {});
  }
  if (event === WHATSAPP_REALTIME_EVENTS.NEW_MESSAGE) {
    return { ...(payload || {}) };
  }
  return { ...(payload || {}) };
}

export function broadcastWhatsAppEvent(app, event, payload) {
  try {
    const dispatch = typeof app?.get === 'function' ? app.get('socketio_dispatch') : null;
    if (typeof dispatch === 'function') {
      dispatch(null, event, payload);
      return true;
    }
    const ioEmit = typeof app?.get === 'function' ? app.get('socketio_io') : null;
    if (ioEmit && typeof ioEmit.emit === 'function') {
      ioEmit.emit(event, payload);
      return true;
    }
  } catch (err) {
    return false;
  }
  return false;
}

export async function handleWhatsAppEvent({ app, event, payload, direction, eventId } = {}) {
  const validated = validateWhatsAppEvent({ event, payload, direction, eventId });
  if (!validated.ok) {
    return validated;
  }

  const consumed = await consumeWhatsAppEventId(validated.eventId);
  if (consumed.duplicate) {
    return { ok: true, relayed: false, duplicate: true, eventId: validated.eventId };
  }

  const broadcastPayload = buildWhatsAppBroadcastPayload({ event: validated.event, payload: validated.payload });
  const broadcasted = broadcastWhatsAppEvent(app, validated.event, broadcastPayload);
  if (!broadcasted) {
    return {
      ok: false,
      error: {
        code: WHATSAPP_EVENT_ERROR_CODES.BROADCAST_FAILED,
        message: 'Failed to broadcast WhatsApp realtime event to connected clients.',
        statusCode: 500,
        retryable: true,
      },
      eventId: validated.eventId,
    };
  }

  return { ok: true, relayed: true, duplicate: false, eventId: validated.eventId };
}

export default {
  WHATSAPP_REALTIME_EVENTS,
  WHATSAPP_EVENT_ERROR_CODES,
  buildWhatsAppEventId,
  isValidWhatsAppEventName,
  isValidWhatsAppEventId,
  validateWhatsAppEvent,
  consumeWhatsAppEventId,
  resetWhatsAppEventDedupe,
  buildWhatsAppBroadcastPayload,
  broadcastWhatsAppEvent,
  handleWhatsAppEvent,
};