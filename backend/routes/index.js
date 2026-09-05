import express from 'express';
import authRoutes from './auth.js';
import paymentRoutes from './orders.js'; // Includes /config, /create-order, /verify-payment
import projectRoutes from './projects.js';
import taskRoutes from './tasks.js';
import analyticsRoutes from './analytics.js';
import calendarRoutes from './calendar.js';
import logRoutes from './logs.js';
import notificationRoutes from './notifications.js';
import teamLoggerRoutes from './teamLogger.js';
import enquiryRoutes from './enquiries.js';
import whatsappRoutes from './whatsapp.js';
import pushRoutes from './push.js';
import backupRoutes from './backup.js';
import partnerRoutes from './partners.js';
import adminReferralRoutes from './adminReferrals.js';
import securityRoutes from './security.js';

import { 
  employeeForgotPassword, 
  employeeResetPassword, 
  employeeValidateResetToken 
} from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimiter.js';

import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Mount payment routes directly under /api to support existing frontend calls
router.use('/', paymentRoutes);

// Mount CRM routes
router.use('/auth', authRoutes);

// Employee routes
router.post('/employee/forgot-password', authLimiter, employeeForgotPassword);
router.get('/employee/reset-password/:token', authLimiter, employeeValidateResetToken);
router.post('/employee/reset-password/:token', authLimiter, employeeResetPassword);

router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/calendar', protect, authorize('SUPER_ADMIN'), calendarRoutes);
router.use('/logs', protect, authorize('SUPER_ADMIN'), logRoutes);
router.use('/notifications', notificationRoutes);
router.use('/teamlogger', teamLoggerRoutes);
router.use('/enquiries', enquiryRoutes);
router.use('/whatsapp', protect, authorize('SUPER_ADMIN'), whatsappRoutes);
router.use('/push', pushRoutes);
router.use('/backup', backupRoutes);

// Partner Portal routes
router.use('/partners', partnerRoutes);
router.use('/admin/referrals', protect, authorize('SUPER_ADMIN'), adminReferralRoutes);
router.use('/security', securityRoutes);

export default router;
