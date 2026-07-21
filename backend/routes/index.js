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

const router = express.Router();

// Mount payment routes directly under /api to support existing frontend calls
router.use('/', paymentRoutes);

// Mount CRM routes
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/calendar', calendarRoutes);
router.use('/logs', logRoutes);
router.use('/notifications', notificationRoutes);
router.use('/teamlogger', teamLoggerRoutes);
router.use('/enquiries', enquiryRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/push', pushRoutes);

export default router;
