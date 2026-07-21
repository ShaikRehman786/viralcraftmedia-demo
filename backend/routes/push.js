import express from 'express';
import { protect } from '../middleware/auth.js';
import { subscribe, unsubscribe, getVapidPublicKey } from '../services/pushService.js';

const router = express.Router();

router.get('/vapid-public-key', (req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    return res.status(500).json({ error: 'VAPID public key not configured' });
  }
  res.status(200).json({ publicKey: key });
});

router.post('/subscribe', protect, async (req, res, next) => {
  try {
    const { subscription, deviceInfo } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }
    const result = await subscribe(
      req.user._id,
      subscription,
      deviceInfo || '',
      req.headers['user-agent'] || ''
    );
    if (!result) {
      return res.status(500).json({ error: 'Failed to save subscription' });
    }
    res.status(201).json({ success: true, message: 'Push subscription saved' });
  } catch (err) {
    next(err);
  }
});

router.post('/unsubscribe', protect, async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }
    await unsubscribe(endpoint);
    res.status(200).json({ success: true, message: 'Push subscription removed' });
  } catch (err) {
    next(err);
  }
});

export default router;
