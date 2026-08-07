import express from 'express';
import { 
  loginPartner, 
  logoutPartner, 
  getMe, 
  changePassword, 
  updateMyProfile,
  
  getDashboardStats,
  getPartnerCampaigns,
  getPartnerAnalytics,
  getPartnerCommissions,
  trackCampaignClick
} from '../controllers/partnerController.js';
import { protectPartner } from '../middleware/partnerAuth.js';

const router = express.Router();

// Public routes
router.post('/login', loginPartner);
router.post('/logout', logoutPartner);
router.post('/campaigns/track/:referralCode', trackCampaignClick);

// Protected routes (Partner Auth Only)
router.get('/me', protectPartner, getMe);
router.put('/me', protectPartner, updateMyProfile);
router.post('/me/change-password', protectPartner, changePassword);
router.get('/dashboard', protectPartner, getDashboardStats);
router.get('/campaigns', protectPartner, getPartnerCampaigns);
router.get('/analytics', protectPartner, getPartnerAnalytics);
router.get('/commissions', protectPartner, getPartnerCommissions);

export default router;
