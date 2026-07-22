import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import {
  createEnquiry,
  getEnquiries,
  assignEnquiryManager,
  addEnquiryNote,
  convertEnquiryToClient,
  convertEnquiryToProject,
  deleteEnquiry
} from '../controllers/enquiryController.js';

const router = express.Router();

// Public route to submit an enquiry (Rate Limited)
router.post('/', apiLimiter, createEnquiry);

// Protected routes (Admin / Manager only)
router.get('/', protect, authorize('SUPER_ADMIN', 'MANAGER'), getEnquiries);
router.put('/:id/assign', protect, authorize('SUPER_ADMIN', 'MANAGER'), assignEnquiryManager);
router.post('/:id/notes', protect, authorize('SUPER_ADMIN', 'MANAGER'), addEnquiryNote);
router.post('/:id/convert-client', protect, authorize('SUPER_ADMIN', 'MANAGER'), convertEnquiryToClient);
router.post('/:id/convert-project', protect, authorize('SUPER_ADMIN', 'MANAGER'), convertEnquiryToProject);
router.delete('/:id', protect, authorize('SUPER_ADMIN'), deleteEnquiry);

export default router;
