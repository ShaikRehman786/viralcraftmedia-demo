import mongoose from 'mongoose';
import { getBackupRecordModel, getIsBackupConnected } from './backupService.js';

/**
 * Service providing Point-in-Time Recovery and Document Restore architecture.
 * Note: Per security requirements, destructive operations are disabled.
 * These methods generate point-in-time rollback previews, document diffs, and audit logs.
 */

/**
 * Audit log a restore inquiry or preview request
 */
export const auditRestoreAction = async ({ action, target, user, details }) => {
  console.log(`[RESTORE AUDIT] User ${user?.email || 'Unknown'} initiated ${action} on ${target}:`, details);
  try {
    const AuditLog = mongoose.models.AuditLog;
    if (AuditLog) {
      await AuditLog.create({
        user: user?._id || user?.id,
        action: `RESTORE_PREVIEW_${action}`,
        details: JSON.stringify({ target, details }),
        timestamp: new Date()
      });
    }
  } catch (err) {
    console.error('[RESTORE AUDIT] Failed to save audit log entry:', err.message);
  }
};

/**
 * Prepare dry-run restore preview for a single BackupRecord ID
 */
export const prepareRestoreRecord = async (recordId, user = null) => {
  if (!getIsBackupConnected()) {
    throw new Error('Backup database connection is not active.');
  }

  const BackupRecord = getBackupRecordModel();
  if (!BackupRecord) {
    throw new Error('BackupRecord model unavailable.');
  }

  const record = await BackupRecord.findById(recordId).lean();
  if (!record) {
    throw new Error(`Backup record with ID ${recordId} not found.`);
  }

  // Fetch current live production version for comparison
  let liveDocument = null;
  try {
    const prodModelName = Object.keys(mongoose.models).find(
      (m) => m.toLowerCase() === record.collectionName.toLowerCase() || m === record.collectionName
    );
    if (prodModelName) {
      const ProdModel = mongoose.models[prodModelName];
      liveDocument = await ProdModel.findById(record.documentId).lean();
    }
  } catch (err) {
    console.warn(`[RESTORE] Could not fetch live document for ${record.collectionName}:${record.documentId}`);
  }

  await auditRestoreAction({
    action: 'SINGLE_RECORD_PREVIEW',
    target: `${record.collectionName}:${record.documentId}`,
    user,
    details: { recordId, version: record.restoreVersion }
  });

  return {
    success: true,
    dryRun: true,
    recordId: record._id,
    collectionName: record.collectionName,
    documentId: record.documentId,
    restoreVersion: record.restoreVersion,
    timestamp: record.timestamp,
    operation: record.operation,
    targetState: record.currentData || record.previousData,
    liveState: liveDocument,
    changedFields: record.changedFields,
    performedBy: record.performedBy,
    status: 'READY_FOR_RESTORE_APPROVAL',
    message: 'Restore preview generated successfully. Destructive write requires explicit administrator approval.'
  };
};

/**
 * Prepare Point-in-Time recovery snapshot plan for a specific collection
 */
export const prepareRestoreCollection = async (collectionName, targetTime, user = null) => {
  if (!getIsBackupConnected()) {
    throw new Error('Backup database connection is not active.');
  }

  const BackupRecord = getBackupRecordModel();
  const targetDate = new Date(targetTime);

  // Find latest backup state for each document in collection prior to targetDate
  const records = await BackupRecord.aggregate([
    { $match: { collectionName, timestamp: { $lte: targetDate } } },
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: '$documentId',
        latestRecordId: { $first: '$_id' },
        operation: { $first: '$operation' },
        currentData: { $first: '$currentData' },
        timestamp: { $first: '$timestamp' },
        restoreVersion: { $first: '$restoreVersion' }
      }
    }
  ]);

  await auditRestoreAction({
    action: 'COLLECTION_PREVIEW',
    target: collectionName,
    user,
    details: { targetTime, count: records.length }
  });

  return {
    success: true,
    dryRun: true,
    collectionName,
    targetTimestamp: targetDate,
    totalDocumentsToRecover: records.length,
    documentsToRestore: records.filter((r) => r.operation !== 'DELETE').length,
    documentsToDelete: records.filter((r) => r.operation === 'DELETE').length,
    snapshotSummary: records.slice(0, 50),
    status: 'READY_FOR_RESTORE_APPROVAL'
  };
};

/**
 * Prepare global Point-in-Time recovery snapshot plan across all monitored collections
 */
export const preparePointInTimeRecovery = async (targetTime, user = null) => {
  if (!getIsBackupConnected()) {
    throw new Error('Backup database connection is not active.');
  }

  const BackupRecord = getBackupRecordModel();
  const targetDate = new Date(targetTime);

  const collections = await BackupRecord.distinct('collectionName', { timestamp: { $lte: targetDate } });

  const collectionSummaries = await Promise.all(
    collections.map(async (col) => {
      const plan = await prepareRestoreCollection(col, targetDate, user);
      return {
        collectionName: col,
        documentsToRestore: plan.documentsToRestore,
        documentsToDelete: plan.documentsToDelete
      };
    })
  );

  await auditRestoreAction({
    action: 'GLOBAL_PITR_PREVIEW',
    target: 'ALL_COLLECTIONS',
    user,
    details: { targetTime, collectionCount: collections.length }
  });

  return {
    success: true,
    dryRun: true,
    targetTimestamp: targetDate,
    totalMonitoredCollections: collections.length,
    collectionSummaries,
    status: 'READY_FOR_RESTORE_APPROVAL'
  };
};
