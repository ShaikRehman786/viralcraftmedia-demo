import express from 'express';
import crypto from 'crypto';
import { verifyInternalRequest } from '../security/internalAuth.js';
import { whatsappManager } from '../services/whatsappManager.js';
import * as defaultMessageStore from '../services/messageStore.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.use(verifyInternalRequest);

function requestId(req) {
  return req.headers['x-request-id'] || req.headers['x-correlation-id'] || crypto.randomUUID();
}

function ok(res, data, req) {
  return res.json({ success: true, requestId: requestId(req), ...data });
}

function fail(res, req, status, message, code = 'INTERNAL_ERROR', details) {
  return res.status(status).json({ success: false, requestId: requestId(req), error: { code, message, statusCode: status, ...(details ? { details } : {}) } });
}

function managerFrom(req) {
  const injected = req.app?.get?.('whatsappManager');
  return injected || whatsappManager;
}

function storeFrom(req) {
  const injected = req.app?.get?.('waMessageStore');
  return injected || defaultMessageStore;
}

router.get('/status', async (req, res) => {
  try {
    const status = managerFrom(req).getStatus();
    return ok(res, { status }, req);
  } catch (err) {
    logger.error('status endpoint error', { error: err?.message });
    return fail(res, req, 500, 'Failed to get status');
  }
});

router.get('/qr', async (req, res) => {
  try {
    const data = await managerFrom(req).getQr();
    return ok(res, { qr: data }, req);
  } catch (err) {
    logger.error('qr endpoint error', { error: err?.message });
    return fail(res, req, 500, 'Failed to get QR');
  }
});

router.post('/generate-qr', async (req, res) => {
  try {
    const result = await managerFrom(req).generateQR();
    const status = result.success ? 200 : 409;
    return res.status(status).json({ success: !!result.success, requestId: requestId(req), result, statusSnapshot: managerFrom(req).getStatus() });
  } catch (err) {
    logger.error('generate-qr endpoint error', { error: err?.message });
    return fail(res, req, 500, 'Failed to generate QR');
  }
});

router.post('/reconnect', async (req, res) => {
  try {
    const result = await managerFrom(req).reconnect();
    const status = result.success ? 200 : 409;
    return res.status(status).json({ success: !!result.success, requestId: requestId(req), result, statusSnapshot: managerFrom(req).getStatus() });
  } catch (err) {
    logger.error('reconnect endpoint error', { error: err?.message });
    return fail(res, req, 500, 'Failed to reconnect');
  }
});

router.post('/logout', async (req, res) => {
  try {
    const result = await managerFrom(req).logout();
    const status = result.success ? 200 : 409;
    return res.status(status).json({ success: !!result.success, requestId: requestId(req), result, statusSnapshot: managerFrom(req).getStatus() });
  } catch (err) {
    logger.error('logout endpoint error', { error: err?.message });
    return fail(res, req, 500, 'Failed to logout');
  }
});

router.post('/clear-session', async (req, res) => {
  try {
    const result = await managerFrom(req).clearSession();
    const status = result.success ? 200 : 409;
    return res.status(status).json({ success: !!result.success, requestId: requestId(req), result, statusSnapshot: managerFrom(req).getStatus() });
  } catch (err) {
    logger.error('clear-session endpoint error', { error: err?.message });
    return fail(res, req, 500, 'Failed to clear session');
  }
});

router.post('/send', async (req, res) => {
  try {
    const { phoneNumber, text } = req.body || {};
    const phone = String(phoneNumber ?? '').trim();
    const messageText = String(text ?? '').trim();
    const details = [];

    if (phone.length < 10 || phone.length > 15) {
      details.push({ field: 'phoneNumber', message: 'Phone number must be 10-15 digits' });
    }
    if (messageText.length < 1 || messageText.length > 2048) {
      details.push({ field: 'text', message: 'Message text must be 1-2048 characters' });
    }
    if (details.length) {
      return fail(res, req, 400, 'Validation failed', 'VALIDATION_FAILED', details);
    }

    const sent = await managerFrom(req).sendMessage(phone, messageText);
    const saved = await storeFrom(req).recordMessage({
      from: sent.from,
      to: sent.to,
      body: sent.body,
      type: 'out',
      timestamp: sent.timestamp,
    });
    return ok(res, { data: saved }, req);
  } catch (err) {
    logger.error('send endpoint error', { error: err?.message });
    const notConnected = /not connected/i.test(String(err?.message || ''));
    return fail(
      res,
      req,
      notConnected ? 409 : 500,
      err?.message || 'Failed to send message',
      notConnected ? 'WA_NOT_CONNECTED' : 'WA_SEND_FAILED',
    );
  }
});

router.get('/messages', async (req, res) => {
  try {
    let limit = parseInt(req.query.limit, 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 100;
    limit = Math.min(limit, 100);
    const messages = await storeFrom(req).listMessages(limit);
    return ok(res, { data: messages }, req);
  } catch (err) {
    logger.error('messages endpoint error', { error: err?.message });
    return fail(res, req, 503, err?.message || 'Failed to fetch messages', 'WA_MESSAGES_FAILED');
  }
});

export default router;
