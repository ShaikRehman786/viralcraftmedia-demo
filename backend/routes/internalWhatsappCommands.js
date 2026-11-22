import express from 'express';
import crypto from 'crypto';
import { verifyInternalRequest } from '../shared/security/internalAuth.js';
import { processInboundWhatsAppCommand } from '../services/whatsappInboundCommandService.js';

const router = express.Router();
router.use(verifyInternalRequest);

function requestId(req) {
  const fromHeaders = req.headers['x-internal-request-id'] || req.headers['x-request-id'] || req.headers['x-correlation-id'];
  return fromHeaders || crypto.randomUUID();
}

function parseBody(req) {
  if (typeof req.rawBody === 'string' && req.rawBody.length > 0) {
    try {
      const parsed = JSON.parse(req.rawBody);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      // fall through
    }
  }
  const body = req.body;
  if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  return {};
}

router.post('/commands/inbound', async (req, res) => {
  const rid = requestId(req);
  try {
    const body = parseBody(req);
    const result = await processInboundWhatsAppCommand(body);
    const status = result && result.success === false ? 400 : 200;
    return res.status(status).json({ ...result, requestId: rid });
  } catch (err) {
    return res.status(500).json({
      success: false,
      requestId: rid,
      error: {
        code: 'WA_COMMAND_FAILED',
        message: err?.message || 'Failed to process inbound WhatsApp command.',
        statusCode: 500,
        retryable: true,
      },
    });
  }
});

export default router;
