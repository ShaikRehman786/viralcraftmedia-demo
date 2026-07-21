import express from 'express';
import { getDashboardStats } from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', protect, authorize('SUPER_ADMIN', 'MANAGER'), getDashboardStats);

export default router;
