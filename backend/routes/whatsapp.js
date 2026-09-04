import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { webhookLimiter } from '../middleware/rateLimiter.js';
import { body, validationResult } from 'express-validator';
import whatsappService from '../services/whatsappService.js';
import WhatsAppMessage from '../models/WhatsAppMessage.js';
import WhatsAppSession from '../models/WhatsAppSession.js';

const router = express.Router();

// 1. Fetch current connection status
router.get('/status', protect, authorize('SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const session = await WhatsAppSession.findOne();
    const liveStatus = whatsappService.getConnectionStatus();

    return res.status(200).json({
      success: true,
      connected: session ? session.connected : false,
      phoneNumber: session ? session.phoneNumber : '',
      pushName: session ? session.pushName : '',
      lastConnectedAt: session ? session.lastConnectedAt : null,
      qrCode: liveStatus.qrCode,
      lastHeartbeat: liveStatus.lastHeartbeat,
      reconnectCount: liveStatus.reconnectCount,
      qrGeneratedCount: liveStatus.qrGeneratedCount,
      sessionRestored: liveStatus.sessionRestored
    });
  } catch (err) {
    next(err);
  }
});

// 2. Fetch connection QR code
router.get('/qr', protect, authorize('SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const liveStatus = whatsappService.getConnectionStatus();
    return res.status(200).json({
      success: true,
      qrCode: liveStatus.qrCode
    });
  } catch (err) {
    next(err);
  }
});

// 3. Send a message manually
router.post('/send', protect, authorize('SUPER_ADMIN'), webhookLimiter, [
  body('phoneNumber').trim().isLength({ min: 10, max: 15 }).withMessage('Phone number must be 10-15 digits'),
  body('text').trim().isLength({ min: 1, max: 2048 }).withMessage('Message text must be 1-2048 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    const { phoneNumber, text } = req.body;
    const savedMsg = await whatsappService.sendMessage(phoneNumber, text);
    return res.status(200).json({
      success: true,
      message: 'Message sent successfully via WhatsApp.',
      data: savedMsg
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Logout / Reset device session
router.post('/logout', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    await whatsappService.logout();
    return res.status(200).json({
      success: true,
      message: 'Logged out from WhatsApp device successfully.'
    });
  } catch (err) {
    next(err);
  }
});

// 5. Generate fresh QR for WhatsApp linking
router.post('/generate-qr', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const result = await whatsappService.generateQR();
    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to generate QR code.' });
    }
    return res.status(200).json({
      success: true,
      message: 'QR code generation triggered. Scan with WhatsApp to link.'
    });
  } catch (err) {
    next(err);
  }
});

// 6. Reconnect WhatsApp service
router.post('/reconnect', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    await whatsappService.reconnect();
    return res.status(200).json({
      success: true,
      message: 'WhatsApp reconnect triggered.'
    });
  } catch (err) {
    next(err);
  }
});

// 7. Clear session and force fresh QR
router.post('/clear-session', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    await whatsappService.logout();
    return res.status(200).json({
      success: true,
      message: 'Session cleared. Generate a new QR to link WhatsApp.'
    });
  } catch (err) {
    next(err);
  }
});

// 8. Fetch logged WhatsApp messages
router.get('/messages', protect, authorize('SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const messages = await WhatsAppMessage.find().sort({ createdAt: -1 }).limit(100);
    return res.status(200).json({
      success: true,
      data: messages
    });
  } catch (err) {
    next(err);
  }
});

export default router;
