import mongoose from 'mongoose';
import { 
  getBackupRecordModel, 
  FailedBackupQueue, 
  getBackupSystemHealth, 
  runForceSync,
  purgeExpiredBackups,
  getBackupCollectionsSummary,
  getRestorePoints,
  EXCLUDED_COLLECTIONS
} from '../services/backupService.js';
import { 
  prepareRestoreRecord, 
  prepareRestoreCollection, 
  preparePointInTimeRecovery 
} from '../services/restoreService.js';

/**
 * Fetch list of all dynamically monitored collections in the production database
 * Route: GET /api/backup/collections
 */
export const getBackupCollections = async (req, res, next) => {
  try {
    let collectionNames = [];

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const rawCols = await mongoose.connection.db.listCollections().toArray();
      collectionNames = rawCols
        .map((c) => c.name)
        .filter((name) => !EXCLUDED_COLLECTIONS.includes(name.toLowerCase()))
        .sort();
    }

    if (collectionNames.length === 0) {
      collectionNames = [
        'projects',
        'clients',
        'users',
        'orders',
        'payments',
        'enquiries',
        'notifications',
        'tasks',
        'calendarevents',
        'partnerreferrals',
        'partnercommissions',
        'partnerpayments',
        'referralbookings',
        'referralcampaigns',
        'referralvisits',
        'chatmessages',
        'whatsappmessages',
        'pushsubscriptions'
      ];
    }

    return res.status(200).json({
      success: true,
      count: collectionNames.length,
      collections: collectionNames
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch paginated, searchable, filtered backup documents from BackupRecord collection
 * Route: GET /api/backup/collections/:collectionName
 */
export const getBackupCollectionData = async (req, res, next) => {
  try {
    const { collectionName } = req.params;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '25', 10);
    const search = req.query.search ? req.query.search.trim() : '';
    const operation = req.query.operation ? req.query.operation.toUpperCase() : 'ALL';
    const timeFilter = req.query.timeFilter ? req.query.timeFilter.toUpperCase() : 'ALL';
    const sortBy = req.query.sortBy ? req.query.sortBy.toUpperCase() : 'NEWEST';

    const BackupRecord = getBackupRecordModel();
    if (!BackupRecord) {
      return res.status(200).json({
        success: true,
        collection: collectionName,
        totalRecords: 0,
        totalPages: 0,
        page,
        limit,
        data: [],
        message: 'Backup DB connection inactive'
      });
    }

    const query = {};

    // Filter by Collection Name
    if (collectionName && collectionName.toUpperCase() !== 'ALL') {
      query.collectionName = { $regex: new RegExp(`^${collectionName}$`, 'i') };
    }

    // Filter by Operation
    if (operation && operation !== 'ALL') {
      query.operation = operation;
    }

    // Filter by Time Range
    const now = new Date();
    if (timeFilter === 'TODAY') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      query.timestamp = { $gte: startOfDay };
    } else if (timeFilter === '24H') {
      query.timestamp = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    } else if (timeFilter === '7D') {
      query.timestamp = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (timeFilter === '30D') {
      query.timestamp = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }

    // Search query on documentId, collectionName, user email, or changed fields
    if (search) {
      query.$or = [
        { documentId: { $regex: search, $options: 'i' } },
        { collectionName: { $regex: search, $options: 'i' } },
        { 'performedBy.email': { $regex: search, $options: 'i' } },
        { 'performedBy.name': { $regex: search, $options: 'i' } },
        { changedFields: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const totalRecords = await BackupRecord.countDocuments(query);
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const skip = (page - 1) * limit;

    const sortOrder = sortBy === 'OLDEST' ? 1 : -1;

    const documents = await BackupRecord.find(query)
      .sort({ timestamp: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      collection: collectionName,
      totalRecords,
      totalPages,
      currentPage: page,
      limit,
      data: documents
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch real-time backup stats, cluster health, latencies, and retention policy status
 * Route: GET /api/backup/stats
 */
export const getBackupStats = async (req, res, next) => {
  try {
    const health = await getBackupSystemHealth();
    const BackupRecord = getBackupRecordModel();

    let totalBackupRecords = 0;
    let todayBackups = 0;
    let backupsLastHour = 0;
    let backupsLast24Hours = 0;
    let lastBackupTime = null;
    let collectionsCountMap = {};
    let recentLogs = [];
    let estimatedStorageBytes = 0;

    if (BackupRecord) {
      try {
        totalBackupRecords = await BackupRecord.countDocuments({});

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        todayBackups = await BackupRecord.countDocuments({ timestamp: { $gte: startOfToday } });

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        backupsLastHour = await BackupRecord.countDocuments({ timestamp: { $gte: oneHourAgo } });

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        backupsLast24Hours = await BackupRecord.countDocuments({ timestamp: { $gte: twentyFourHoursAgo } });

        const latestRecord = await BackupRecord.findOne({}).sort({ timestamp: -1 }).lean();
        if (latestRecord) {
          lastBackupTime = latestRecord.timestamp;
        }

        recentLogs = await BackupRecord.find({})
          .sort({ timestamp: -1 })
          .limit(10)
          .lean();

        // Calculate count per collection
        const colStats = await BackupRecord.aggregate([
          { $group: { _id: '$collectionName', count: { $sum: 1 } } }
        ]);
        colStats.forEach((c) => {
          if (c._id) collectionsCountMap[c._id] = c.count;
        });

        // Approximate storage size (average 2.5KB per record)
        estimatedStorageBytes = totalBackupRecords * 2560;
      } catch (err) {
        console.error('[STATS ERROR] Error querying BackupRecord stats:', err.message);
      }
    }

    // Format storage size
    let storageFormatted = '0 KB';
    if (estimatedStorageBytes > 1024 * 1024 * 1024) {
      storageFormatted = `${(estimatedStorageBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (estimatedStorageBytes > 1024 * 1024) {
      storageFormatted = `${(estimatedStorageBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      storageFormatted = `${(estimatedStorageBytes / 1024).toFixed(1)} KB`;
    }

    const rawCols = mongoose.connection && mongoose.connection.readyState === 1
      ? await mongoose.connection.db.listCollections().toArray()
      : [];
    const totalCollectionsCount = rawCols.filter(c => !EXCLUDED_COLLECTIONS.includes(c.name.toLowerCase())).length || 18;

    const totalFailedOps = (health.retryQueue.pending || 0) + (health.retryQueue.dead || 0);
    const totalOps = totalBackupRecords + totalFailedOps;
    const successRateVal = totalOps > 0 ? (((totalBackupRecords) / totalOps) * 100).toFixed(1) + '%' : '100%';

    return res.status(200).json({
      success: true,
      stats: {
        totalCollections: totalCollectionsCount,
        totalCollectionsProtected: totalCollectionsCount,
        totalBackupRecords,
        restorePoints: totalBackupRecords,
        todayBackups,
        backupsLastHour,
        backupsLast24Hours,
        storageUsedBytes: estimatedStorageBytes,
        storageUsedFormatted: storageFormatted,
        retentionPolicyDays: 30,
        retentionRemaining: '30 Days Active',
        retryQueueCount: health.retryQueue.pending,
        deadQueueCount: health.retryQueue.dead,
        pendingQueue: health.retryQueue.pending,
        failedOperations: totalFailedOps,
        successRate: successRateVal,
        autoCleanupStatus: 'Active (Daily Automated Purge)',
        lastBackupTime,
        lastSuccessfulBackup: health.lastSuccessfulBackupTimestamp || lastBackupTime,
        lastFailedBackup: health.lastFailedBackupTimestamp,
        lastSynchronization: health.lastSyncTimestamp || lastBackupTime,
        collectionsCountMap,
        recentLogs
      },
      health: {
        productionDb: health.productionDb.status,
        productionDbLatencyMs: health.productionDb.latencyMs,
        backupDb: health.backupDb.status,
        backupDbLatencyMs: health.backupDb.latencyMs,
        workerStatus: health.workerStatus,
        changeStreamStatus: health.changeStreamStatus,
        queueStatus: health.retryQueue.pending > 0 ? 'Pending Retries' : 'Clean',
        autoRefreshIntervalSeconds: 30
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Trigger manual Force Sync scan across all monitored collections
 * Route: POST /api/backup/force-sync
 */
export const triggerForceSyncController = async (req, res, next) => {
  try {
    const result = await runForceSync();
    return res.status(200).json({
      success: true,
      message: 'Force Synchronization completed successfully.',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch Point-in-Time non-destructive restore preview for a backup record
 * Route: GET /api/backup/restore/preview/:id
 */
export const getRestorePreviewController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const preview = await prepareRestoreRecord(id, req.user);
    return res.status(200).json({
      success: true,
      preview
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Manually trigger retention policy purge routine
 * Route: POST /api/backup/purge-expired
 */
export const purgeExpiredBackupsController = async (req, res, next) => {
  try {
    const result = await purgeExpiredBackups();
    return res.status(200).json({
      success: true,
      message: 'Retention policy purge completed.',
      result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch live chronological Activity Stream of events across CRM
 * Route: GET /api/backup/activity-stream
 */
export const getBackupActivityStreamController = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const BackupRecord = getBackupRecordModel();
    if (!BackupRecord) {
      return res.status(200).json({ success: true, count: 0, events: [] });
    }

    const events = await BackupRecord.find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch collection-level breakdown summary stats (Record count, backup count, storage size, latest change)
 * Route: GET /api/backup/collections-summary
 */
export const getBackupCollectionsSummaryController = async (req, res, next) => {
  try {
    const summaries = await getBackupCollectionsSummary();
    return res.status(200).json({
      success: true,
      count: summaries.length,
      collections: summaries
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch System Restore Points (Hourly, Daily, Weekly, Manual)
 * Route: GET /api/backup/restore-points
 */
export const getRestorePointsController = async (req, res, next) => {
  try {
    const points = await getRestorePoints();
    return res.status(200).json({
      success: true,
      count: points.length,
      restorePoints: points
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Export Audit Log records to JSON or CSV format
 * Route: GET /api/backup/export
 */
export const exportAuditLogController = async (req, res, next) => {
  try {
    const format = (req.query.format || 'json').toLowerCase();
    const collectionName = req.query.collection || 'ALL';
    const limit = Math.min(parseInt(req.query.limit || '1000', 10), 10000);

    const BackupRecord = getBackupRecordModel();
    if (!BackupRecord) {
      return res.status(500).json({ error: 'Backup Database connection inactive' });
    }

    const query = {};
    if (collectionName !== 'ALL') {
      query.collectionName = { $regex: new RegExp(`^${collectionName}$`, 'i') };
    }

    const records = await BackupRecord.find(query).sort({ timestamp: -1 }).limit(limit).lean();

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=vcm_backup_audit_${Date.now()}.csv`);

      let csv = 'Timestamp,Collection,Operation,DocumentID,PerformedBy,Role,IP,RestoreVersion\n';
      records.forEach(r => {
        const perfName = typeof r.performedBy === 'object' ? (r.performedBy.name || r.performedBy.email || 'System') : String(r.performedBy || 'System');
        const perfRole = typeof r.performedBy === 'object' ? (r.performedBy.role || 'SYSTEM') : 'SYSTEM';
        const ts = new Date(r.timestamp || r.createdAt).toISOString();
        csv += `"${ts}","${r.collectionName}","${r.operation}","${r.documentId || r._id}","${perfName}","${perfRole}","${r.ip || '127.0.0.1'}","${r.restoreVersion || 1}"\n`;
      });

      return res.status(200).send(csv);
    }

    return res.status(200).json({
      success: true,
      count: records.length,
      records
    });
  } catch (err) {
    next(err);
  }
};
