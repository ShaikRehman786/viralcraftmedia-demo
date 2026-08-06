import express from 'express';
import {
  getPartners,
  createPartner,
  updatePartner,
  deletePartner,
  resetPartnerPassword,
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  duplicateCampaign,
  getAdminAnalytics,
  getBookings,
  createBookingCommission,
  getAdminCommissions,
  updateCommissionStatus,
  payCommission,
  getPayments,
  getReports
} from '../controllers/adminReferralController.js';

const router = express.Router();

// Partners Management
router.route('/partners')
  .get(getPartners)
  .post(createPartner);

router.route('/partners/:id')
  .put(updatePartner)
  .delete(deletePartner);

router.post('/partners/:id/reset-password', resetPartnerPassword);

// Campaigns Management
router.route('/campaigns')
  .get(getCampaigns)
  .post(createCampaign);

router.route('/campaigns/:id')
  .put(updateCampaign)
  .delete(deleteCampaign);

router.post('/campaigns/:id/duplicate', duplicateCampaign);

// Analytics, Bookings, & Payouts
router.get('/analytics', getAdminAnalytics);
router.get('/bookings', getBookings);
router.post('/bookings/:id/commission', createBookingCommission);

router.get('/commissions', getAdminCommissions);
router.put('/commissions/:id/status', updateCommissionStatus);
router.post('/commissions/:id/pay', payCommission);

router.get('/payments', getPayments);
router.get('/reports', getReports);

export default router;
