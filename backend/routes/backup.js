import express from 'express';
import { 
  getBackupCollections, 
  getBackupCollectionData, 
  getBackupStats,
  triggerForceSyncController,
  getRestorePreviewController,
  purgeExpiredBackupsController,
  getBackupActivityStreamController,
  getBackupCollectionsSummaryController,
  getRestorePointsController,
  exportAuditLogController
} from '../controllers/backupController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Secure backup endpoints - accessible to SUPER_ADMIN, ADMIN, and BACKUP_ADMIN roles
const backupAuth = [protect, authorize('SUPER_ADMIN', 'ADMIN', 'BACKUP_ADMIN', 'backup_admin')];

router.get('/stats', ...backupAuth, getBackupStats);
router.get('/collections', ...backupAuth, getBackupCollections);
router.get('/collections-summary', ...backupAuth, getBackupCollectionsSummaryController);
router.get('/activity-stream', ...backupAuth, getBackupActivityStreamController);
router.get('/restore-points', ...backupAuth, getRestorePointsController);
router.get('/export', ...backupAuth, exportAuditLogController);
router.get('/collections/:collectionName', ...backupAuth, getBackupCollectionData);
router.post('/force-sync', ...backupAuth, triggerForceSyncController);
router.get('/restore/preview/:id', ...backupAuth, getRestorePreviewController);
router.post('/purge-expired', ...backupAuth, purgeExpiredBackupsController);

export default router;
