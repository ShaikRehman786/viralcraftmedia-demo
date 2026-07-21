import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema({
  recipient: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  templateName: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    default: 'Resend'
  },
  messageId: {
    type: String
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  retryCount: {
    type: Number,
    default: 0
  },
  errorMessage: {
    type: String
  },
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  }
}, {
  timestamps: true,
  collection: 'EmailLogs'
});

const EmailLog = mongoose.model('EmailLog', emailLogSchema);
export default EmailLog;
