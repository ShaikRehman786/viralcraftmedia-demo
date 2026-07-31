import express from 'express';
import {
  getPartners,
  createPartner,
  updatePartner,
  deletePartner,
  getAdminReferrals,
  updateReferralStatus,
  approveCommission,
  rejectReferral,
  getAdminCommissions,
  payCommission
} from '../controllers/adminReferralController.js';

const router = express.Router();

// Partners CRUD
router.route('/partners')
  .get(getPartners)
  .post(createPartner);

router.route('/partners/:id')
  .put(updatePartner)
  .delete(deletePartner);

// Referrals
router.get('/leads', getAdminReferrals);
router.put('/leads/:id/status', updateReferralStatus);
router.post('/leads/:id/approve', approveCommission);
router.delete('/leads/:id', rejectReferral);

// Commissions & Payouts
router.get('/payouts', getAdminCommissions);
router.post('/payouts/:id/pay', payCommission);

export default router;
