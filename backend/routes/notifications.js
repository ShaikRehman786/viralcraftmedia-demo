import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  bulkMarkAsRead,
  bulkDelete,
  clearRead,
  deleteNotification
} from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.put('/read-all', protect, markAllAsRead);
router.put('/bulk-read', protect, bulkMarkAsRead);
router.delete('/bulk-delete', protect, bulkDelete);
router.delete('/clear-read', protect, clearRead);
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);

export default router;
