import express from 'express';
import { 
  login, 
  logout, 
  refresh, 
  getMe, 
  forgotPassword, 
  resetPassword, 
  changePassword,
  logoutAllDevices 
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateLogin } from '../middleware/validate.js';
import { authLimiter, apiLimiter } from '../middleware/rateLimiter.js';
import { logEvent } from '../services/loggingService.js';
import { notifyStaff } from '../services/notificationService.js';
import User from '../models/User.js';
import crypto from 'crypto';
import { sendEmail } from '../services/emailService.js';
import { config, getFrontendBaseUrl } from '../config/env.js';

// Helper: Send EmailJS invitation securely from backend (private key never exposed to browser)
// Uses server-side EmailJS REST API with accessToken for strict mode
async function sendInvitationEmailSecure({ toName, toEmail, adminName, role, department, registrationLink }) {
  const serviceId = config.emailjsServiceId;
  const templateId = config.emailjsTemplateId;
  const publicKey = config.emailjsPublicKey;
  const privateKey = config.emailjsPrivateKey;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('EmailJS not configured (service/template/public key missing)');
  }
  if (!privateKey) {
    throw new Error('EmailJS Private Key not configured for strict mode');
  }

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    accessToken: privateKey,
    template_params: {
      employee_name: toName,
      employee_email: toEmail,
      admin_name: adminName,
      role,
      department: department || 'N/A',
      registration_link: registrationLink
    }
  };

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `EmailJS error ${res.status}`);
  }
}

const router = express.Router();

// Public auth routes
router.post('/login', authLimiter, validateLogin, login);
router.post('/refresh', authLimiter, refresh);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);

// Verify invitation token public route
router.get('/verify-invitation/:token', apiLimiter, async (req, res, next) => {
  try {
    const invitationTokenRaw = req.params.token;
    const tokenHash = crypto.createHash('sha256').update(invitationTokenRaw).digest('hex');

    const user = await User.findOne({
      invitationToken: tokenHash,
      invitationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'The invitation link is invalid or has expired.' });
    }

    const statusUpper = (user.status || '').toUpperCase();
    if (statusUpper !== 'INVITED') {
      return res.status(400).json({ error: 'This invitation has already been completed or cancelled.' });
    }

    return res.status(200).json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (err) {
    next(err);
  }
});

// Accept invitation public route (Profile complete)
router.post('/accept-invitation/:token', authLimiter, async (req, res, next) => {
  try {
    const { name, password, department, skills } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required to complete registration.' });
    }

    const invitationTokenRaw = req.params.token;
    const tokenHash = crypto.createHash('sha256').update(invitationTokenRaw).digest('hex');

    const user = await User.findOne({
      invitationToken: tokenHash,
      invitationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'The invitation link is invalid or has expired.' });
    }

    const statusUpper = (user.status || '').toUpperCase();
    if (statusUpper !== 'INVITED') {
      return res.status(400).json({ error: 'This invitation has already been completed or cancelled.' });
    }

    // Set password (hashes in hook) and set user name
    if (name) user.name = name;
    user.password = password;
    user.status = 'PENDING_APPROVAL';
    user.invitationToken = undefined;
    user.invitationExpires = undefined;
    user.mustChangePassword = false;

    if (department) user.department = department;
    if (skills) {
      user.skills = Array.isArray(skills) 
        ? skills 
        : skills.split(',').map(s => s.trim()).filter(Boolean);
    }

    await user.save();

    await logEvent({
      userId: user._id,
      userName: user.name,
      action: 'EMPLOYEE_REGISTERED',
      details: { message: 'User accepted invitation and configured password. Awaiting admin approval.' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    await notifyStaff({
      title: 'Staff Registered',
      message: `${user.name} accepted their invitation and is awaiting approval.`,
      type: 'info',
      priority: 'medium',
      referenceId: user._id.toString(),
      referenceModel: 'User',
      actionUrl: '/admin?tab=staff',
      dispatcher: req.app.get('socketio_dispatch'),
      metadata: { userName: user.name, email: user.email, role: user.role }
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Profile completed successfully! Your account is now pending Administrator approval.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// Protected auth routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);
router.post('/logout-all', protect, logoutAllDevices);

// ==========================================
// SUPER ADMIN STAFF MANAGEMENT ENDPOINTS
// ==========================================

// 1. Fetch all users directory (Admin/Manager Only)
router.get('/staff', protect, authorize('SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const staff = await User.find({ role: { $in: ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE', 'CLIENT'] } })
      .select('name email role status mustChangePassword lastActive department skills phone invitationExpires');
    return res.status(200).json({ success: true, data: staff });
  } catch (err) {
    next(err);
  }
});

// 2. Invite a new Manager / Employee (Super Admin Only)
router.post('/staff', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { name, email, role, phone, department, skills } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Name, email, and role are required fields.' });
    }

    const targetRole = role.toUpperCase();
    if (!['MANAGER', 'EMPLOYEE', 'CLIENT'].includes(targetRole)) {
      return res.status(400).json({ error: 'Invalid role assignment. Must be MANAGER, EMPLOYEE, or CLIENT.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(409).json({ error: 'A user with this email address already exists.' });
    }

    // Generate secure invitation token and hash before storing
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationTokenHash = crypto.createHash('sha256').update(invitationToken).digest('hex');
    const invitationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours expiration

    // Create User document
    const user = new User({
      name,
      email: normalizedEmail,
      phone: phone || '',
      password: crypto.randomBytes(16).toString('hex'), // temp key
      role: targetRole,
      status: 'INVITED',
      department: department || '',
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []),
      invitationToken: invitationTokenHash,
      invitationExpires,
      invitedBy: req.user._id,
      emailSent: false,
      mustChangePassword: true
    });

    await user.save();

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'INVITATION_CREATED',
      details: { createdUserId: user._id, createdUserEmail: user.email, role: user.role, status: 'INVITED' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    await notifyStaff({
      title: 'Staff Invited',
      message: `${req.user.name} invited ${name} as ${targetRole}.`,
      type: 'info',
      priority: 'medium',
      referenceId: user._id.toString(),
      referenceModel: 'User',
      dispatcher: req.app.get('socketio_dispatch'),
      metadata: { invitedBy: req.user.name, invitedUser: name, role: targetRole }
    });

    // Attempt to send invitation email securely from backend (private key stays server-side, strict mode remains enabled)
    let registrationLink;
    try {
      registrationLink = `${getFrontendBaseUrl()}/register?token=${invitationToken}`;
    } catch (urlErr) {
      console.error('[EmailJS] Frontend URL config error:', urlErr.message);
      // Do not create invitation with invalid URL in production - fail fast
      // Remove the just-created user to avoid orphaned invitation with localhost link
      await User.findByIdAndDelete(user._id).catch(() => {});
      return res.status(500).json({ error: 'Server frontend URL not configured for production. Set APP_URL/CLIENT_URL to https://<production-domain>.' });
    }
    try {
      await sendInvitationEmailSecure({
        toName: name,
        toEmail: normalizedEmail,
        adminName: req.user?.name || 'Administrator',
        role: targetRole,
        department: department || 'N/A',
        registrationLink
      });
      user.emailSent = true;
      await user.save();
      await logEvent({
        userId: req.user._id,
        userName: req.user.name,
        action: 'EMAIL_SENT',
        details: { recipientId: user._id, email: user.email, message: 'Invitation email sent via EmailJS (server-side, strict mode)' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(201).json({ 
        success: true, 
        message: 'Invitation sent successfully.',
        user
      });
    } catch (emailErr) {
      console.error('[EmailJS] Invitation send failed:', emailErr.message);
      // Keep invitation record - do not delete user; frontend will show safe error and allow Resend
      await logEvent({
        userId: req.user._id,
        userName: req.user.name,
        action: 'EMAIL_FAILED',
        details: { recipientId: user._id, email: user.email, error: emailErr.message },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(201).json({ 
        success: true, 
        message: 'Invitation created, but email could not be sent. Please try Resend.',
        user,
        warning: 'Email delivery failed - use Resend to retry'
      });
    }
  } catch (err) {
    next(err);
  }
});

// Confirmation: Email successfully sent via EmailJS
router.post('/staff/:id/email-sent', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.emailSent = true;
    await user.save();

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'EMAIL_SENT',
      details: { recipientId: user._id, email: user.email, message: 'Invitation email successfully sent via EmailJS' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({ success: true, message: 'Invitation email logged as sent successfully.' });
  } catch (err) {
    next(err);
  }
});

// Logging: Email failed to send via EmailJS
router.post('/staff/:id/email-failed', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { errorDetails } = req.body;

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'EMAIL_FAILED',
      details: { recipientId: user._id, email: user.email, error: errorDetails || 'EmailJS browser SDK failure' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({ success: true, message: 'Email failure logged.' });
  } catch (err) {
    next(err);
  }
});

// Inbound leads resend invitation
router.post('/staff/:staffId/resend', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.staffId);
    if (!user) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const statusUpper = (user.status || '').toUpperCase();
    if (statusUpper === 'ACTIVE' || statusUpper === 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Invitation has already been accepted.' });
    }

    if (statusUpper === 'CANCELLED') {
      return res.status(400).json({ error: 'This invitation has been cancelled.' });
    }

    if (statusUpper === 'REJECTED') {
      return res.status(400).json({ error: 'This employee registration request was rejected.' });
    }

    // Handle Duplicate resend request: throttle if requested within 10 seconds
    const lastUpdated = user.updatedAt ? new Date(user.updatedAt).getTime() : 0;
    if (Date.now() - lastUpdated < 10000) {
      return res.status(400).json({ error: 'Duplicate resend request. Please wait before retrying.' });
    }

    // Generate fresh registration token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationTokenHash = crypto.createHash('sha256').update(invitationToken).digest('hex');
    const invitationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours expiration

    user.invitationToken = invitationTokenHash;
    user.invitationExpires = invitationExpires;
    user.status = 'INVITED';
    user.emailSent = false;
    
    await user.save();

    // Build registration URL (environment-aware, fail-fast in production)
    let registration_link;
    try {
      registration_link = `${getFrontendBaseUrl()}/register?token=${invitationToken}`;
    } catch (urlErr) {
      console.error('[EmailJS] Frontend URL config error (resend):', urlErr.message);
      return res.status(500).json({ error: 'Server frontend URL not configured for production. Set APP_URL/CLIENT_URL to https://<production-domain>.' });
    }

    // Send invitation email using EmailJS REST API (server-side, strict mode with private key)
    try {
      await sendInvitationEmailSecure({
        toName: user.name,
        toEmail: user.email,
        adminName: req.user?.name || 'Administrator',
        role: user.role,
        department: user.department || 'N/A',
        registrationLink: registration_link
      });

      // Mark email as successfully sent
      user.emailSent = true;
      await user.save();

      await logEvent({
        userId: req.user._id,
        userName: req.user.name,
        action: 'INVITATION_RESENT',
        details: { targetUserId: user._id, targetUserEmail: user.email, role: user.role },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      await logEvent({
        userId: req.user._id,
        userName: req.user.name,
        action: 'EMAIL_SENT',
        details: { recipientId: user._id, email: user.email, message: 'Invitation email successfully resent via EmailJS' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: 'Invitation resent successfully.'
      });
    } catch (emailErr) {
      await logEvent({
        userId: req.user._id,
        userName: req.user.name,
        action: 'EMAIL_FAILED',
        details: { recipientId: user._id, email: user.email, error: emailErr.message || 'EmailJS delivery failure during resend' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(500).json({
        error: `EmailJS failed to deliver the email: ${emailErr.message}`
      });
    }
  } catch (err) {
    next(err);
  }
});

// Cancel User account invitation (Super Admin Only)
router.post('/staff/:id/cancel', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.status = 'CANCELLED';
    user.invitationToken = undefined;
    user.invitationExpires = undefined;
    await user.save();

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'SYSTEM_SETTING_CHANGE',
      details: { targetUserId: user._id, targetUserEmail: user.email, message: 'Invitation cancelled by administrator' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({ success: true, message: `Invitation for ${user.name} cancelled successfully.` });
  } catch (err) {
    next(err);
  }
});

// 3. Approve User account (Super Admin Only)
router.put('/staff/:id/approve', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const statusUpper = (user.status || '').toUpperCase();
    if (statusUpper !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'User is not in pending approval status.' });
    }

    user.status = 'ACTIVE';
    await user.save();

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'ACCOUNT_APPROVED',
      details: { targetUserId: user._id, targetUserEmail: user.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    await notifyStaff({
      title: 'Staff Approved',
      message: `${user.name} has been approved as ${user.role.replace('_', ' ')} by ${req.user.name}.`,
      type: 'success',
      priority: 'medium',
      referenceId: user._id.toString(),
      referenceModel: 'User',
      actionUrl: '/admin?tab=staff',
      dispatcher: req.app.get('socketio_dispatch'),
      metadata: { approvedBy: req.user.name, approvedUser: user.name, role: user.role }
    });

    return res.status(200).json({ 
      success: true, 
      message: `Account for ${user.name} approved and activated.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (err) {
    next(err);
  }
});

// 4. Reject User account invitation (Super Admin Only)
router.put('/staff/:id/reject', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.status = 'REJECTED';
    await user.save();

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'ACCOUNT_REJECTED',
      details: { targetUserId: user._id, targetUserEmail: user.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({ 
      success: true, 
      message: `Account for ${user.name} has been rejected.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// 5. Toggle active / inactive status (Super Admin Only)
router.put('/staff/:id/status', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot deactivate your own active session account.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'The Super Admin account cannot be suspended.' });
    }

    const statusUpper = (user.status || '').toUpperCase();
    user.status = statusUpper === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    await user.save();

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: user.status === 'ACTIVE' ? 'ACCOUNT_APPROVED' : 'SYSTEM_SETTING_CHANGE', // log change
      details: { targetUserId: user._id, targetUserEmail: user.email, message: `Status updated to ${user.status}` },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({ success: true, message: `User status updated to ${user.status}.` });
  } catch (err) {
    next(err);
  }
});

// 6. Reset password trigger (Super Admin Only)
router.post('/staff/:id/reset-password', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot reset Super Admin password.' });
    }

    const tempPassword = crypto.randomBytes(6).toString('hex');
    user.password = tempPassword;
    user.mustChangePassword = true;
    user.refreshTokens = [];
    await user.save();

    const resetUrl = `${req.protocol}://${req.get('host')}/login`;
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;">
        <h3 style="color: #FF6A00;">Your Password Has Been Reset</h3>
        <p>Hello ${user.name},</p>
        <p>Your password for the ViralCraftMedia portal has been reset by the Administrator.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p><strong>New Credentials:</strong></p>
        <p>• URL: <a href="${resetUrl}">${resetUrl}</a></p>
        <p>• Temporary Password: <code style="background:#F3F4F6; padding:2px 6px; border-radius:4px;">${tempPassword}</code></p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p>Note: You will be forced to change this temporary password on your next login.</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Password Reset — ViralCraftMedia Portal',
      html: emailHtml
    });

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'PASSWORD_RESET',
      details: { targetUserId: user._id, targetUserEmail: user.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({ success: true, message: `Password reset successfully. Credentials emailed.` });
  } catch (err) {
    next(err);
  }
});

// 7. Update user role (Super Admin Only)
router.put('/staff/:id/role', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { role } = req.body;
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'The Super Admin account cannot be modified.' });
    }

    const oldRole = user.role;
    if (role) {
      if (!['MANAGER', 'EMPLOYEE', 'CLIENT'].includes(role.toUpperCase())) {
        return res.status(400).json({ error: 'Invalid role selection.' });
      }
      user.role = role.toUpperCase();
    }

    await user.save();

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'ROLE_CHANGE',
      details: { targetUserId: user._id, targetUserEmail: user.email, oldRole, newRole: role },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// 8. Unlock account after lockout (Backup Administrator + Super Admin)
router.post('/unlock/:userId', protect, authorize('BACKUP_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ error: 'User not found' });
    target.lockUntil = null;
    target.failedLoginAttempts = 0;
    await target.save();
    // Also resolve active security incidents for this user (IP block)
    try {
      const SecurityIncident = (await import('../models/SecurityIncident.js')).default;
      await SecurityIncident.updateMany({ affectedUserId: target._id, status: 'ACTIVE' }, { status: 'RESOLVED', resolvedAt: new Date(), resolvedBy: req.user._id });
    } catch {}
    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'ACCOUNT_UNLOCKED',
      details: { targetUserId: target._id, targetEmail: target.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    return res.json({ success: true, message: 'Account unlocked successfully.' });
  } catch (err) { next(err); }
});

// 9. Delete user (Super Admin Only)
router.delete('/staff/:id', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'The Super Admin account cannot be deleted.' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own account while logged in.' });
    }

    await User.findByIdAndDelete(req.params.id);

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'SYSTEM_SETTING_CHANGE',
      details: { deletedUserId: user._id, deletedUserEmail: user.email, message: 'User deleted from database' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
