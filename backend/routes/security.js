import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import SecurityIncident from '../models/SecurityIncident.js';
import User from '../models/User.js';
import { logEvent } from '../services/loggingService.js';

const router = express.Router();

// All security routes require Backup Admin or Super Admin
router.use(protect, authorize('BACKUP_ADMIN', 'SUPER_ADMIN'));

// List incidents
router.get('/incidents', async (req, res, next) => {
  try {
    const incidents = await SecurityIncident.find().sort({ createdAt: -1 }).limit(100).populate('affectedUserId', 'name email role').lean();
    return res.json({ success: true, data: incidents });
  } catch (err) { next(err); }
});

// Unblock via incident - supports account, ip, both
router.post('/unblock/:incidentId', async (req, res, next) => {
  try {
    const { incidentId } = req.params;
    const { type = 'both', reason = '' } = req.body;
    if (reason && /<[^>]*>/g.test(reason)) return res.status(400).json({ error: 'Invalid reason' });
    const incident = await SecurityIncident.findById(incidentId);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    if (incident.status === 'RESOLVED') return res.status(400).json({ error: 'Incident already resolved' });

    if (type === 'account' || type === 'both') {
      if (incident.affectedUserId) {
        const user = await User.findById(incident.affectedUserId);
        if (user) { user.lockUntil = null; user.failedLoginAttempts = 0; await user.save(); }
      }
    }
    if (type === 'ip' || type === 'both') {
      // Resolve IP block by marking incident resolved (IP block is via incident status)
    }
    incident.status = 'RESOLVED';
    incident.resolvedAt = new Date();
    incident.resolvedBy = req.user._id;
    incident.metadata = { ...incident.metadata, unblockReason: reason, unblockedType: type };
    await incident.save();

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'ACCOUNT_UNLOCKED',
      details: { incidentId, type, reason, targetUserId: incident.affectedUserId, normalizedIp: incident.normalizedIp },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.json({ success: true, message: `Unblocked ${type} successfully.` });
  } catch (err) { next(err); }
});

export default router;
