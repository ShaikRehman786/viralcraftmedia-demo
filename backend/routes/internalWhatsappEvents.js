import express from 'express';
import crypto from 'crypto';
import { verifyInternalRequest } from '../shared/security/internalAuth.js';
import { handleWhatsAppEvent, WHATSAPP_EVENT_ERROR_CODES } from '../services/whatsappEventRelayService.js';

const router = express.Router();

router.use(verifyInternalRequest);

function requestId(req) {
  const fromHeaders = req.headers['x-internal-request-id'] || req.headers['x-request-id'] || req.headers['x-correlation-id'];
  return fromHeaders || crypto.randomUUID();
}

function sendError(req, res, status, code, message, extra) {
  const error = { code: code, message: message, statusCode: status };
  if (extra && extra.retryable !== undefined) error.retryable = extra.retryable;
  if (extra && extra.details !== undefined) error.details = extra.details;
  return res.status(status).json({
    success: false,
    requestId: requestId(req),
    error: error,
  });
}

function parseEventBody(req) {
  if (typeof req.rawBody === 'string' && req.rawBody.length > 0) {
    try {
      const parsed = JSON.parse(req.rawBody);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      // fall through to parsed body
    }
  }
  const body = req.body;
  if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  return {};
}

async function processEvent(req, res) {
  const body = parseEventBody(req);
  const result = await handleWhatsAppEvent({
    app: req.app,
    event: body.event,
    payload: body.payload,
    direction: body.direction,
    eventId: body.eventId,
  });
  const rid = requestId(req);
  if (!result.ok) {
    const err = result.error || {};
    const status = err.statusCode || 500;
    const code = err.code || WHATSAPP_EVENT_ERROR_CODES.BROADCAST_FAILED;
    const message = err.message || 'Failed to process WhatsApp event.';
    const retryable = err.retryable;
    return sendError(req, res, status, code, message, { retryable: retryable });
  }
  if (result.duplicate) {
    return res.json({ success: true, requestId: rid, relayed: false, duplicate: true });
  }
  return res.json({ success: true, requestId: rid, relayed: true });
}

router.post('/connection', async (req, res) => {
  try {
    await processEvent(req, res);
  } catch (err) {
    return sendError(req, res, 500, 'WA_EVENT_PROCESSING_FAILED', err.message || 'Failed to process WhatsApp connection event.', { retryable: true });
  }
});

router.post('/message', async (req, res) => {
  try {
    await processEvent(req, res);
  } catch (err) {
    return sendError(req, res, 500, 'WA_EVENT_PROCESSING_FAILED', err.message || 'Failed to process WhatsApp message event.', { retryable: true });
  }
});

export default router;