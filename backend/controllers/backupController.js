import mongoose from 'mongoose';
import { backupConnection, FailedBackupQueue } from '../services/backupService.js';

// Map database collection identifiers to Mongoose model names
const BACKUP_COLLECTION_MAP = {
  projects: 'Project',
  orders: 'Order',
  payments: 'Payment',
  enquiries: 'Enquiry',
  users: 'User',
  clients: 'Client',
  notifications: 'Notification',
  tasks: 'Task',
  calendar: 'CalendarEvent',
  logs: 'BackupLog',
  chats: 'ChatMessage',
  whatsapp: 'WhatsAppMessage',
  emails: 'EmailLog',
  activitylogs: 'AuditLog'
};

/**
 * Fetch list of all collections available in the backup database
 * Route: GET /api/backup/collections
 */
export const getBackupCollections = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      collections: Object.keys(BACKUP_COLLECTION_MAP)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch read-only documents from a specific collection in the backup database
 * Route: GET /api/backup/collections/:collectionName
 */
export const getBackupCollectionData = async (req, res, next) => {
  try {
    const { collectionName } = req.params;
    const modelName = BACKUP_COLLECTION_MAP[collectionName.toLowerCase()];

    if (!modelName) {
      return res.status(400).json({ error: 'Collection not supported or found in backup' });
    }

    const Model = mongoose.model(modelName);

    // Mongoose Proxy and AsyncLocalStorage will automatically route this query to the backup connection pool
    const documents = await Model.find({})
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    return res.status(200).json({
      success: true,
      collection: collectionName,
      count: documents.length,
      data: documents
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch real-time backup metrics, logs, queue status, and database health
 * Route: GET /api/backup/stats
 */
export const getBackupStats = async (req, res, next) => {
  try {
    // 1. Calculate record counts across all mapped schemas in Backup Connection Context
    const counts = await Promise.all(
      Object.keys(BACKUP_COLLECTION_MAP).map(async (key) => {
        const modelName = BACKUP_COLLECTION_MAP[key];
        try {
          let Model;
          if (modelName === 'BackupLog') {
            if (backupConnection && backupConnection.readyState === 1) {
              Model = backupConnection.model('BackupLog');
            } else {
              return { key, count: 0 };
            }
          } else {
            Model = mongoose.model(modelName);
          }
          const count = await Model.countDocuments({});
          return { key, count };
        } catch (e) {
          return { key, count: 0 };
        }
      })
    );

    const totalBackupRecords = counts.reduce((acc, curr) => acc + curr.count, 0);
    const collectionsCountMap = counts.reduce((acc, curr) => {
      acc[curr.key] = curr.count;
      return acc;
    }, {});

    // 2. Fetch log summaries from BackupLog in Backup DB
    let todayBackups = 0;
    let successfulSyncs = 0;
    let failedSyncs = 0;
    let lastBackupTime = null;
    let recentBackupLogs = [];

    if (backupConnection && backupConnection.readyState === 1) {
      try {
        const BackupLog = backupConnection.model('BackupLog');
        successfulSyncs = await BackupLog.countDocuments({ status: 'SUCCESS' });
        failedSyncs = await BackupLog.countDocuments({ status: 'FAILED' });

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        todayBackups = await BackupLog.countDocuments({ timestamp: { $gte: startOfToday } });

        const latestLog = await BackupLog.findOne({}).sort({ timestamp: -1 }).lean();
        lastBackupTime = latestLog ? latestLog.timestamp : null;

        recentBackupLogs = await BackupLog.find({})
          .sort({ timestamp: -1 })
          .limit(10)
          .lean();
      } catch (e) {
        console.error('[STATS] Error reading backup logs:', e.message);
      }
    }

    // 3. Fetch retry queue sizes from Production DB
    const retryQueueCount = await FailedBackupQueue.countDocuments({ status: 'FAILED' });
    const deadQueueCount = await FailedBackupQueue.countDocuments({ status: 'DEAD' });

    // 4. Return complete stats block
    return res.status(200).json({
      success: true,
      stats: {
        totalCollections: Object.keys(BACKUP_COLLECTION_MAP).length,
        totalBackupRecords,
        todayBackups,
        successfulSyncs,
        failedSyncs,
        retryQueueCount,
        deadQueueCount,
        lastBackupTime,
        collectionsCountMap,
        recentLogs: recentBackupLogs
      },
      health: {
        backupDb: backupConnection && backupConnection.readyState === 1 ? 'Connected' : 'Disconnected',
        productionDb: mongoose.connection && mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        workerStatus: 'Active',
        queueStatus: retryQueueCount > 0 ? 'Pending Retries' : 'Clean',
        autoRefreshIntervalSeconds: 30
      }
    });
  } catch (err) {
    next(err);
  }
};
