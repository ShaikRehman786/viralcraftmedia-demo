import mongoose from 'mongoose';

const backupRecordSchema = new mongoose.Schema({
  collectionName: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  operation: {
    type: String,
    required: true,
    enum: [
      'CREATE', 
      'UPDATE', 
      'DELETE', 
      'LOGIN', 
      'LOGOUT', 
      'UPLOAD', 
      'DOWNLOAD', 
      'STATUS_CHANGE', 
      'PAYMENT', 
      'NOTIFICATION', 
      'REFERRAL', 
      'FORCE_SYNC'
    ],
    index: true
  },
  documentId: {
    type: String,
    required: true,
    index: true
  },
  previousData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  currentData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  changedFields: {
    type: [String],
    default: []
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  performedBy: {
    userId: { type: String, default: 'System' },
    email: { type: String, default: 'system@viralcraftmedia.com' },
    name: { type: String, default: 'Automated Backup Engine' },
    role: { type: String, default: 'SYSTEM' }
  },
  ip: {
    type: String,
    default: '127.0.0.1'
  },
  metadata: {
    source: { type: String, default: 'CHANGE_STREAM', enum: ['CHANGE_STREAM', 'HOOK', 'FORCE_SYNC', 'MANUAL'] },
    resumeToken: { type: mongoose.Schema.Types.Mixed, default: null },
    checksum: { type: String, default: null },
    recordSize: { type: Number, default: 0 },
    browser: { type: String, default: 'Internal Engine' },
    os: { type: String, default: 'Server OS' },
    device: { type: String, default: 'Backend Worker' },
    location: { type: String, default: 'Cloud Datacenter' }
  },
  restoreVersion: {
    type: Number,
    required: true,
    default: 1
  }
}, {
  timestamps: true
});

// Compound indexes for high performance data grid querying
backupRecordSchema.index({ collectionName: 1, timestamp: -1 });
backupRecordSchema.index({ documentId: 1, timestamp: -1 });
backupRecordSchema.index({ operation: 1, timestamp: -1 });
backupRecordSchema.index({ 'performedBy.role': 1, timestamp: -1 });

// Automated 30-day retention index (30 days * 24 * 60 * 60 = 2592000 seconds)
backupRecordSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

export default backupRecordSchema;
