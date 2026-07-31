import mongoose from 'mongoose';
import { AsyncLocalStorage } from 'async_hooks';
import { config } from '../config/env.js';

// Excluded collections to prevent infinite loops and internal tracking leakage
export const EXCLUDED_MODELS = ['FailedBackupQueue', 'BackupLog'];

// Initialize AsyncLocalStorage for tracking requests executed by the backup account
const backupContextStore = new AsyncLocalStorage();

export let backupConnection = null;
let isBackupConnected = false;
let workerIntervalId = null;
const backupModels = {};

// Helper to run a callback inside the backup context
export const runInBackupContext = (callback) => {
  return backupContextStore.run({ useBackup: true }, callback);
};

// Check if currently running inside the backup user context
export const isCurrentContextBackup = () => {
  const store = backupContextStore.getStore();
  return !!(store && store.useBackup);
};

// Create a Mongoose Model Proxy to swap target database connections on the fly
const proxyCache = new Map();

export const createModelProxy = (name, productionModel) => {
  if (proxyCache.has(name)) {
    return proxyCache.get(name);
  }

  const modelProxy = new Proxy(productionModel, {
    get(target, prop, receiver) {
      // Direct connection switching if in backup context
      if (isCurrentContextBackup() && !EXCLUDED_MODELS.includes(name)) {
        const backupModel = getBackupModel(name);
        if (backupModel) {
          const val = Reflect.get(backupModel, prop, receiver);
          if (typeof val === 'function') {
            return val.bind(backupModel);
          }
          return val;
        }
      }

      // Default production database connection
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return val.bind(target);
      }
      return val;
    },
    // Support construction (new Model())
    construct(target, argumentsList, newTarget) {
      if (isCurrentContextBackup() && !EXCLUDED_MODELS.includes(name)) {
        const backupModel = getBackupModel(name);
        if (backupModel) {
          return Reflect.construct(backupModel, argumentsList, newTarget);
        }
      }
      return Reflect.construct(target, argumentsList, newTarget);
    }
  });

  proxyCache.set(name, modelProxy);
  return modelProxy;
};

// Override Mongoose model compilation and retrieval early
const originalModel = mongoose.model.bind(mongoose);
mongoose.model = function (name, schema, collection) {
  if (schema) {
    if (mongoose.models[name]) {
      return createModelProxy(name, mongoose.models[name]);
    }
    try {
      const prodModel = originalModel(name, schema, collection);
      return createModelProxy(name, prodModel);
    } catch (err) {
      if (err.message.includes('overwrite')) {
        return createModelProxy(name, originalModel(name));
      }
      throw err;
    }
  }
  const prodModel = originalModel(name);
  return createModelProxy(name, prodModel);
};

// Override mongoose.models lookup as well to ensure total proxy coverage
mongoose.models = new Proxy(mongoose.models, {
  get(target, prop, receiver) {
    const origModel = Reflect.get(target, prop, receiver);
    if (origModel && typeof prop === 'string') {
      return createModelProxy(prop, origModel);
    }
    return origModel;
  }
});

// Definition of FailedBackupQueue schema (stored in Production DB)
const failedBackupSchema = new mongoose.Schema({
  collectionName: { type: String, required: true },
  documentId: { type: String, required: true },
  operation: { type: String, required: true, enum: ['CREATE', 'UPDATE', 'DELETE'] },
  documentData: { type: mongoose.Schema.Types.Mixed },
  retryCount: { type: Number, default: 0 },
  lastError: { type: String },
  nextRetryAt: { type: Date, default: Date.now },
  status: { type: String, default: 'FAILED', enum: ['FAILED', 'DEAD'] }
}, {
  timestamps: true
});

failedBackupSchema.index({ status: 1, nextRetryAt: 1 });
failedBackupSchema.index({ collectionName: 1, documentId: 1 });

export const FailedBackupQueue = originalModel('FailedBackupQueue', failedBackupSchema);

// Definition of BackupLog schema (stored in Backup DB)
const backupLogSchema = new mongoose.Schema({
  collectionName: { type: String, required: true },
  documentId: { type: String, required: true },
  operation: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, required: true },
  retryCount: { type: Number, default: 0 },
  lastError: { type: String },
  executionTime: { type: Number }
});

// Configure 90-day retention index (automatically expires docs in Backup DB after 90 days)
backupLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Resolve or lazily compile model on the backup connection
export const getBackupModel = (name) => {
  if (!backupConnection) return null;
  if (backupModels[name]) return backupModels[name];

  try {
    if (backupConnection.models[name]) {
      backupModels[name] = backupConnection.models[name];
      return backupModels[name];
    }

    const origModel = originalModel(name);
    const schemaClone = origModel.schema.clone();

    // Inject 90-day TTL expiration field on the backup schema clone
    schemaClone.add({
      _backupTimestamp: {
        type: Date,
        default: Date.now,
        index: { expires: '90d' }
      }
    });

    backupModels[name] = backupConnection.model(name, schemaClone);
    return backupModels[name];
  } catch (err) {
    console.error(`[BACKUP] Error compiling backup model for ${name}:`, err.message);
    return null;
  }
};

// Initialize the second database connection
export const initBackupSystem = async () => {
  if (!config.backupMongoUri) {
    console.warn('[BACKUP] BACKUP_MONGODB_URI not provided. Real-time backup is disabled.');
    return;
  }

  try {
    // Clear old compiled models cache so they get compiled on the new connection pool
    for (const key in backupModels) {
      delete backupModels[key];
    }

    console.log('[BACKUP] Creating connection pool for Backup Atlas DB...');
    backupConnection = mongoose.createConnection(config.backupMongoUri, {
      bufferCommands: false
    });

    backupConnection.on('connected', () => {
      console.log('✓ Backup Database Connected');
      isBackupConnected = true;
      
      // Seed/compile log schema on backup DB
      try {
        backupConnection.model('BackupLog', backupLogSchema);
      } catch (e) {}

      // Start processing retry queue
      startBackupWorker();
    });

    backupConnection.on('error', (err) => {
      console.error('❌ [BACKUP] Connection failure:', err.message);
      isBackupConnected = false;
    });

    backupConnection.on('disconnected', () => {
      console.warn('[BACKUP] Disconnected from Backup Database.');
      isBackupConnected = false;
    });
  } catch (err) {
    console.error('[BACKUP] Bootstrap connection error:', err.message);
  }
};

// Log backup events to the Backup Database
export const logBackupEvent = async ({ collectionName, documentId, operation, status, retryCount, lastError, executionTime }) => {
  if (!backupConnection || !isBackupConnected) return;

  try {
    const BackupLog = backupConnection.model('BackupLog');
    const log = new BackupLog({
      collectionName,
      documentId,
      operation,
      status,
      retryCount,
      lastError: lastError || null,
      executionTime
    });
    await log.save();
  } catch (err) {
    console.error('[BACKUP LOG] Failed to write event log:', err.message);
  }
};

// Add a failed backup event to the Production DB retry queue
export const queueFailedBackup = async (collectionName, documentId, operation, docData, lastError) => {
  if (!collectionName || collectionName === 'undefined' || collectionName === 'null') return;
  try {
    // Upsert the failed document queue item so we only store the latest state for retrying
    await FailedBackupQueue.updateOne(
      { collectionName, documentId: documentId.toString() },
      {
        $set: {
          operation,
          documentData: docData,
          lastError,
          status: 'FAILED',
          nextRetryAt: new Date(Date.now() + 5000) // retry in 5s initially
        }
      },
      { upsert: true }
    );
  } catch (err) {
    console.error('[BACKUP CRITICAL] Failed to queue retry in Production DB:', err.message);
  }
};

// Execute replication operation directly on the Backup Database
export const executeBackup = async (collectionName, documentId, operation, docData) => {
  const startTime = Date.now();

  if (!isBackupConnected || !backupConnection) {
    await queueFailedBackup(collectionName, documentId, operation, docData, 'Backup connection not active');
    return;
  }

  try {
    const backupModel = getBackupModel(collectionName);
    if (!backupModel) {
      throw new Error(`Model ${collectionName} not found on backup connection`);
    }

    if (operation === 'CREATE' || operation === 'UPDATE') {
      // Use upsert to handle retries gracefully without duplicate key errors
      await backupModel.updateOne(
        { _id: documentId },
        { ...docData, _backupTimestamp: new Date() },
        { upsert: true, runValidators: false }
      );
    } else if (operation === 'DELETE') {
      await backupModel.deleteOne({ _id: documentId });
    }

    const executionTime = Date.now() - startTime;
    await logBackupEvent({
      collectionName: collectionName,
      documentId: documentId.toString(),
      operation,
      status: 'SUCCESS',
      retryCount: 0,
      executionTime
    });
  } catch (err) {
    const executionTime = Date.now() - startTime;
    console.warn(`[BACKUP] Operation failed for ${collectionName} (${documentId}):`, err.message);

    // Save event log on backup connection if possible
    await logBackupEvent({
      collectionName: collectionName,
      documentId: documentId.toString(),
      operation,
      status: 'FAILED',
      retryCount: 0,
      lastError: err.message,
      executionTime
    }).catch(() => {});

    // Save to Production DB failed queue
    await queueFailedBackup(collectionName, documentId, operation, docData, err.message);
  }
};

// Dispatch the backup task asynchronously to keep production requests fast
export const triggerBackup = (collectionName, documentId, operation, docData) => {
  setImmediate(() => {
    executeBackup(collectionName, documentId, operation, docData).catch((err) => {
      console.error('[BACKUP] Trigger execution error:', err.message);
    });
  });
};

// Global Mongoose plugin registered on all production schemas
export const backupPlugin = (schema) => {
  // 1. Capture document-based saves (CREATE and UPDATE)
  schema.pre('save', function () {
    this._wasNew = this.isNew;
  });
 
  schema.post('save', async function (doc) {
    const modelName = this.constructor.modelName;
    if (!modelName || modelName === 'undefined' || modelName === 'null' || EXCLUDED_MODELS.includes(modelName)) return;
    if (this.db && this.db !== mongoose.connection) return; // Skip if run on backup DB connection
 
    const operation = this._wasNew ? 'CREATE' : 'UPDATE';
    const docData = doc.toObject ? doc.toObject() : doc;
    triggerBackup(modelName, doc._id, operation, docData);
  });

  // 2. Capture document-based deletions
  schema.post(/^remove|deleteOne$/, { document: true, query: false }, async function (doc) {
    const modelName = this.constructor.modelName;
    if (!modelName || modelName === 'undefined' || modelName === 'null' || EXCLUDED_MODELS.includes(modelName)) return;
    if (this.db && this.db !== mongoose.connection) return;

    triggerBackup(modelName, doc._id, 'DELETE', null);
  });

  // 3. Capture query-based bulk creations
  schema.post('insertMany', async function (docs) {
    const modelName = this.modelName;
    if (!modelName || modelName === 'undefined' || modelName === 'null' || EXCLUDED_MODELS.includes(modelName)) return;
    if (this.model && this.model.db && this.model.db !== mongoose.connection) return;

    for (const doc of docs) {
      const docData = doc.toObject ? doc.toObject() : doc;
      triggerBackup(modelName, doc._id, 'CREATE', docData);
    }
  });

  // 4. Capture query-based updates (pre-fetch affected IDs to update them post-query)
  schema.pre(/^update|findOneAndUpdate/, async function () {
    const modelName = this.model.modelName;
    if (!modelName || modelName === 'undefined' || modelName === 'null' || EXCLUDED_MODELS.includes(modelName)) return;
    if (this.model.db && this.model.db !== mongoose.connection) return;

    try {
      const filter = this.getFilter();
      const docs = await this.model.find(filter).select('_id').lean();
      this._updatedDocIds = docs.map((d) => d._id);
    } catch (err) {
      console.error('[BACKUP] Update pre-hook fetch error:', err.message);
    }
  });

  schema.post(/^update|findOneAndUpdate/, async function () {
    const modelName = this.model.modelName;
    if (!modelName || modelName === 'undefined' || modelName === 'null' || EXCLUDED_MODELS.includes(modelName)) return;
    if (this.model.db && this.model.db !== mongoose.connection) return;

    try {
      const docIds = this._updatedDocIds;
      if (docIds && docIds.length > 0) {
        const updatedDocs = await this.model.find({ _id: { $in: docIds } }).lean();
        for (const doc of updatedDocs) {
          triggerBackup(modelName, doc._id, 'UPDATE', doc);
        }
      }
    } catch (err) {
      console.error('[BACKUP] Update post-hook fetch error:', err.message);
    }
  });

  // 5. Capture query-based deletions (pre-fetch affected IDs to delete them post-query)
  schema.pre(/^delete|findOneAndDelete/, async function () {
    const modelName = this.model.modelName;
    if (!modelName || modelName === 'undefined' || modelName === 'null' || EXCLUDED_MODELS.includes(modelName)) return;
    if (this.model.db && this.model.db !== mongoose.connection) return;

    try {
      const filter = this.getFilter();
      const docs = await this.model.find(filter).select('_id').lean();
      this._deletedDocIds = docs.map((d) => d._id);
    } catch (err) {
      console.error('[BACKUP] Delete pre-hook fetch error:', err.message);
    }
  });

  schema.post(/^delete|findOneAndDelete/, async function () {
    const modelName = this.model.modelName;
    if (!modelName || modelName === 'undefined' || modelName === 'null' || EXCLUDED_MODELS.includes(modelName)) return;
    if (this.model.db && this.model.db !== mongoose.connection) return;

    try {
      const docIds = this._deletedDocIds;
      if (docIds && docIds.length > 0) {
        for (const docId of docIds) {
          triggerBackup(modelName, docId, 'DELETE', null);
        }
      }
    } catch (err) {
      console.error('[BACKUP] Delete post-hook trigger error:', err.message);
    }
  });
};

// Start the background retry queue processing worker
export const startBackupWorker = () => {
  if (workerIntervalId) return;

  const retryInterval = 15000; // 15 seconds
  workerIntervalId = setInterval(async () => {
    try {
      await processRetryQueue();
    } catch (err) {
      console.error('[BACKUP WORKER] Processing exception:', err.message);
    }
  }, retryInterval);
};

// Process items in the failed backup queue
export const processRetryQueue = async () => {
  if (!isBackupConnected || !backupConnection) return;

  const now = new Date();
  const tasks = await FailedBackupQueue.find({
    status: 'FAILED',
    nextRetryAt: { $lte: now }
  }).limit(15); // process in small manageable batches

  const maxRetryCount = parseInt(process.env.BACKUP_MAX_RETRIES || '10', 10);

  for (const task of tasks) {
    const startTime = Date.now();
    try {
      // Purge invalid/corrupted tasks immediately to avoid endless worker validation errors
      if (!task.collectionName || task.collectionName === 'undefined' || task.collectionName === 'null') {
        await FailedBackupQueue.deleteOne({ _id: task._id });
        continue;
      }

      const backupModel = getBackupModel(task.collectionName);
      if (!backupModel) {
        throw new Error(`Model ${task.collectionName} not registered`);
      }

      if (task.operation === 'CREATE' || task.operation === 'UPDATE') {
        await backupModel.updateOne(
          { _id: task.documentId },
          { ...task.documentData, _backupTimestamp: new Date() },
          { upsert: true, runValidators: false }
        );
      } else if (task.operation === 'DELETE') {
        await backupModel.deleteOne({ _id: task.documentId });
      }

      // Success: Remove task from queue database
      await FailedBackupQueue.deleteOne({ _id: task._id });

      // Log successful retry
      const executionTime = Date.now() - startTime;
      await logBackupEvent({
        collectionName: task.collectionName,
        documentId: task.documentId,
        operation: task.operation,
        status: 'SUCCESS',
        retryCount: task.retryCount + 1,
        executionTime
      });
    } catch (err) {
      const executionTime = Date.now() - startTime;
      const nextRetryCount = task.retryCount + 1;

      // Exponential Backoff: base 5s * 2^retryCount, capped at 5 minutes
      const backoffSec = 5 * Math.pow(2, Math.min(nextRetryCount, 6)); 
      task.retryCount = nextRetryCount;
      task.lastError = err.message;
      task.nextRetryAt = new Date(Date.now() + backoffSec * 1000);

      if (nextRetryCount >= maxRetryCount) {
        task.status = 'DEAD'; // stop retrying
        console.error(`[BACKUP WORKER] Task ${task._id} for ${task.collectionName} exceeded max retries. Marked as DEAD.`);
      }

      await task.save();

      // Log failed retry attempt
      await logBackupEvent({
        collectionName: task.collectionName,
        documentId: task.documentId,
        operation: task.operation,
        status: 'FAILED',
        retryCount: nextRetryCount,
        lastError: err.message,
        executionTime
      }).catch(() => {});
    }
  }
};
