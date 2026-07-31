import express from 'express';
import { 
  loginPartner, 
  logoutPartner, 
  getMe, 
  changePassword, 
  submitReferral, 
  getReferrals, 
  getCommissions, 
  getDashboardStats 
} from '../controllers/partnerController.js';
import { protectPartner } from '../middleware/partnerAuth.js';

const router = express.Router();

// Public routes
router.post('/login', loginPartner);
router.post('/logout', logoutPartner);

// Protected routes (Partner Auth)
router.get('/me', protectPartner, getMe);
router.post('/me/change-password', protectPartner, changePassword);
router.get('/dashboard', protectPartner, getDashboardStats);
router.post('/referrals', protectPartner, submitReferral);
router.get('/referrals', protectPartner, getReferrals);
router.get('/commissions', protectPartner, getCommissions);

export default router;
