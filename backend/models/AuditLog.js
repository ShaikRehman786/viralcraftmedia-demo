import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Null represents guest or unauthenticated user (e.g. login failures)
  },
  userName: {
    type: String,
    default: 'Guest'
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILURE',
      'LOGOUT',
      'PAYMENT_ATTEMPT',
      'PAYMENT_SUCCESS',
      'PROJECT_CREATED',
      'TASK_CREATED',
      'TASK_ASSIGNED',
      'TASK_STATUS_CHANGE',
      'TASK_SUBMISSION',
      'TASK_APPROVAL',
      'TASK_REJECTION',
      'PROJECT_COMPLETED',
      'ROLE_CHANGE',
      'SYSTEM_SETTING_CHANGE',
      'PASSWORD_CHANGE',
      'PASSWORD_RESET',
      'ACCOUNT_CREATION',
      'ACCOUNT_DISABLE',
      'ACCOUNT_ACTIVATION',
      'INVITATION_CREATED',
      'EMAIL_SENT',
      'EMAIL_FAILED',
      'INVITATION_RESENT',
      'EMPLOYEE_REGISTERED',
      'ACCOUNT_APPROVED',
      'ACCOUNT_REJECTED',
      'WHATSAPP_MESSAGE_SENT',
      'WHATSAPP_MESSAGE_RECEIVED',
      'WHATSAPP_ACTION',
      'PARTNER_CREATED',
      'PARTNER_EDITED',
      'PARTNER_STATUS_CHANGE',
      'CAMPAIGN_CREATED',
      'CAMPAIGN_EDITED',
      'CAMPAIGN_EXPIRED',
      'COMMISSION_APPROVED',
      'COMMISSION_PAID',
      'PAYMENT_RECORDED',
      'ERROR'
    ]
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
