import AuditLog from '../models/AuditLog.js';

/**
 * Creates a system audit log record in database
 */
export const logEvent = async ({ userId, userName, action, details, ipAddress, userAgent }) => {
  try {
    const log = new AuditLog({
      user: userId || null,
      userName: userName || 'Guest',
      action,
      details,
      ipAddress: ipAddress || 'Unknown',
      userAgent: userAgent || 'Unknown'
    });
    await log.save();
    console.log(`[AUDIT LOG] ${action} logged for ${userName}`);
  } catch (err) {
    console.error('Failed to create audit log:', err.message);
  }
};
