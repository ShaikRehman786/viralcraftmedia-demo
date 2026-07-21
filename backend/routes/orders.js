import express from 'express';
import { 
  getConfig, 
  createOrder, 
  verifyPayment, 
  getPayments,
  handleRazorpayWebhook
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';
import { validateOrderCreation, validatePaymentVerification } from '../middleware/validate.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/config', getConfig);
router.post('/create-order', apiLimiter, validateOrderCreation, createOrder);
router.post('/verify-payment', apiLimiter, validatePaymentVerification, verifyPayment);
router.get('/payments', protect, getPayments);
router.post('/razorpay-webhook', handleRazorpayWebhook);

export default router;
