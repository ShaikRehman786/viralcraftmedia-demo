import mongoose from 'mongoose';

const securityIncidentSchema = new mongoose.Schema({
  affectedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  attemptedEmail: { type: String, trim: true, lowercase: true },
  normalizedIp: { type: String, required: true, trim: true },
  failedAttempts: { type: Number, default: 0 },
  firstFailedAt: { type: Date, default: Date.now },
  lastFailedAt: { type: Date, default: Date.now },
  lockedAt: { type: Date, default: null },
  ipBlockedAt: { type: Date, default: null },
  status: { type: String, enum: ['ACTIVE', 'RESOLVED'], default: 'ACTIVE' },
  resolvedAt: { type: Date, default: null },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userAgent: { type: String, default: '' },
  metadata: { type: Object, default: {} }
}, { timestamps: true });

securityIncidentSchema.index({ normalizedIp: 1, status: 1 });
securityIncidentSchema.index({ affectedUserId: 1, status: 1 });
securityIncidentSchema.index({ status: 1, createdAt: -1 });
securityIncidentSchema.index({ attemptedEmail: 1, status: 1 });

const SecurityIncident = mongoose.model('SecurityIncident', securityIncidentSchema);
export default SecurityIncident;
