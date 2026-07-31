import express from 'express';
import { getBackupCollections, getBackupCollectionData, getBackupStats } from '../controllers/backupController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Secure backup endpoints - strictly restricted to BACKUP_ADMIN role
router.get('/stats', protect, authorize('BACKUP_ADMIN'), getBackupStats);
router.get('/collections', protect, authorize('BACKUP_ADMIN'), getBackupCollections);
router.get('/collections/:collectionName', protect, authorize('BACKUP_ADMIN'), getBackupCollectionData);

export default router;
