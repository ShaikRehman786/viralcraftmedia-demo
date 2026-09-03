import User from '../models/User.js';
import { getSignedTokenResponse, rotateRefreshToken } from '../services/authService.js';
import { logEvent } from '../services/loggingService.js';
import { sendPasswordResetEmail, sendEmail } from '../services/emailService.js';
import { notifyStaff } from '../services/notificationService.js';
import { recordLoginBackup, recordLogoutBackup } from '../services/backupService.js';
import crypto from 'crypto';
import { config, getFrontendBaseUrl } from '../config/env.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

/**
 * Login user with lockout logic (5 failed attempts = 30 min lock)
 * Route: POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Intercept backup admin account for database isolation and Backup Database validation
    const backupAdminEmail = (config.backupAdminEmail || 'backupadmin@viralcraftmedia.com').toLowerCase();
    
    // DEBUG LOG
    if (email) {
      console.log(`[DEBUG] Incoming email: ${email}`);
    }

    if (email && email.toLowerCase() === backupAdminEmail) {
      // DEBUG LOG
      console.log('[DEBUG] Backup login branch reached');

      const { backupConnection, getBackupModel } = await import('../services/backupService.js');
      if (!backupConnection || backupConnection.readyState !== 1) {
        console.log('[DEBUG] Backup DB connection state is NOT ready');
        return res.status(500).json({ error: 'Backup Database connection is not ready. Please try again.' });
      }

      // DEBUG LOG
      console.log('[DEBUG] Backup DB connected');

      const BackupUser = getBackupModel('User');
      if (!BackupUser) {
        return res.status(500).json({ error: 'User schema not compiled on backup connection.' });
      }

      // Query ONLY the Backup Database for the backup user
      const user = await BackupUser.findOne({ email: backupAdminEmail }).select('+password');
      if (!user) {
        console.log('[DEBUG] Backup Admin NOT found in Backup DB');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // DEBUG LOG
      console.log('[DEBUG] Backup Admin found');

      // Check status
      if (user.status && user.status.toUpperCase() === 'INACTIVE') {
        return res.status(401).json({ error: 'Account is inactive. Please contact administrator.' });
      }

      // Validate password against the hashed password stored in the Backup Database using bcrypt
      const isMatch = await bcrypt.compare(password, user.password);
      
      // DEBUG LOG
      console.log(`[DEBUG] Password comparison result: ${isMatch}`);

      if (!isMatch) {
        await logEvent({
          action: 'LOGIN_FAILURE',
          userName: backupAdminEmail,
          details: { message: 'Incorrect password for Backup Account' },
          ipAddress: clientIp,
          userAgent
        }).catch(() => {});
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate access and refresh tokens for mock session (maintaining the same mock session for request path isolation)
      const accessToken = jwt.sign(
        { id: 'backup_admin_mock_id_placeholder', role: 'BACKUP_ADMIN' },
        config.jwtSecret,
        { expiresIn: config.jwtAccessExpiry }
      );
      const refreshToken = jwt.sign(
        { id: 'backup_admin_mock_id_placeholder', role: 'BACKUP_ADMIN' },
        config.jwtRefreshSecret,
        { expiresIn: config.jwtRefreshExpiry }
      );

      // DEBUG LOG
      console.log('[DEBUG] JWT generated');

      const isProduction = config.nodeEnv === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax'
      };

      res.cookie('accessToken', accessToken, {
        ...cookieOptions,
        expires: new Date(Date.now() + 15 * 60 * 1000)
      });
      res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      await logEvent({
        action: 'LOGIN_SUCCESS',
        userName: 'System Backup Admin',
        details: { role: 'BACKUP_ADMIN', message: 'Backup Account logged in successfully (from Backup DB)' },
        ipAddress: clientIp,
        userAgent
      }).catch(() => {});

      // DEBUG LOG
      console.log('[DEBUG] Login success');

      return res.status(200).json({
        success: true,
        role: 'BACKUP_ADMIN',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: 'BACKUP_ADMIN'
        }
      });
    }

    // Look up user
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      await logEvent({
        action: 'LOGIN_FAILURE',
        userName: email,
        details: { message: 'User not found in system database' },
        ipAddress: clientIp,
        userAgent
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check status
    const statusUpper = (user.status || '').toUpperCase();

    if (statusUpper === 'PENDING_APPROVAL') {
      await logEvent({
        userId: user._id,
        userName: user.name,
        action: 'LOGIN_FAILURE',
        details: { message: 'Attempt to log in while pending approval' },
        ipAddress: clientIp,
        userAgent
      });
      return res.status(403).json({ error: 'Your account is awaiting administrator approval.' });
    }

    if (statusUpper === 'INVITED') {
      await logEvent({
        userId: user._id,
        userName: user.name,
        action: 'LOGIN_FAILURE',
        details: { message: 'Attempt to log in before completing registration' },
        ipAddress: clientIp,
        userAgent
      });
      return res.status(403).json({ error: 'Please complete your account registration.' });
    }

    if (statusUpper === 'REJECTED') {
      await logEvent({
        userId: user._id,
        userName: user.name,
        action: 'LOGIN_FAILURE',
        details: { message: 'Attempt to log in with a rejected account' },
        ipAddress: clientIp,
        userAgent
      });
      return res.status(403).json({ error: 'Your account has been rejected.' });
    }

    if (statusUpper === 'DISABLED' || statusUpper === 'INACTIVE') {
      await logEvent({
        userId: user._id,
        userName: user.name,
        action: 'LOGIN_FAILURE',
        details: { message: 'Attempt to log in to inactive/disabled profile' },
        ipAddress: clientIp,
        userAgent
      });
      return res.status(403).json({ error: 'Your account has been disabled.' });
    }

    if (statusUpper !== 'ACTIVE' && statusUpper !== 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
      await logEvent({
        userId: user._id,
        userName: user.name,
        action: 'LOGIN_FAILURE',
        details: { message: `Attempt to log in with invalid status: ${user.status}` },
        ipAddress: clientIp,
        userAgent
      });
      return res.status(403).json({ error: `Login not allowed. Your account status is: ${user.status}` });
    }

    // Check account lockout status
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / (1000 * 60));
      await logEvent({
        userId: user._id,
        userName: user.name,
        action: 'LOGIN_FAILURE',
        details: { message: `Blocked login attempt: Account locked for ${remainingMinutes} more minutes` },
        ipAddress: clientIp,
        userAgent
      });
      return res.status(403).json({ 
        error: `Account temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minutes.` 
      });
    }

    // Compare credentials
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      // Increment failed attempts
      user.failedLoginAttempts += 1;
      let isLockedNow = false;

      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes lockout
        user.failedLoginAttempts = 0; // reset counter after locking
        isLockedNow = true;
      }
      await user.save();

      await logEvent({
        userId: user._id,
        userName: user.name,
        action: 'LOGIN_FAILURE',
        details: { 
          message: 'Incorrect password', 
          failedAttempts: user.failedLoginAttempts,
          accountLocked: isLockedNow 
        },
        ipAddress: clientIp,
        userAgent
      });

      if (isLockedNow) {
        return res.status(403).json({ 
          error: 'Account temporarily locked due to multiple failed login attempts. Try again in 30 minutes.' 
        });
      }

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Correct login - reset security lock fields
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastActive = new Date();
    await user.save();

    await logEvent({
      userId: user._id,
      userName: user.name,
      action: 'LOGIN_SUCCESS',
      details: { role: user.role, mustChangePassword: user.mustChangePassword },
      ipAddress: clientIp,
      userAgent
    });

    recordLoginBackup({ user, ip: clientIp, userAgent }).catch(() => {});

    return getSignedTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

/**
 * Logout user
 * Route: POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      recordLogoutBackup({ user: req.user, ip: req.ip || '127.0.0.1', userAgent: req.headers['user-agent'] || 'Unknown' }).catch(() => {});
    }

    const token = req.cookies.refreshToken;
    if (token && req.user && req.user._id !== 'backup_admin_mock_id_placeholder') {
      req.user.refreshTokens = req.user.refreshTokens.filter(t => t.token !== token);
      await req.user.save();
    }

    const isProduction = config.nodeEnv === 'production';
    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax'
    };
    res.clearCookie('accessToken', clearOptions);
    res.clearCookie('refreshToken', clearOptions);

    if (req.user) {
      await logEvent({
        userId: req.user._id,
        userName: req.user.name,
        action: 'LOGOUT',
        ipAddress: req.ip || 'Unknown',
        userAgent: req.headers['user-agent'] || 'Unknown'
      });
    }

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * Refresh tokens session
 * Route: POST /api/auth/refresh
 */
export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'No refresh token provided.' });
    }
    return await rotateRefreshToken(token, res);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
};

/**
 * Fetch current login context profile
 * Route: GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        _id: req.user._id,
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        mustChangePassword: req.user.mustChangePassword
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Forgot password - securely profiles resets without email leakage
 * Route: POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const clientIp = req.ip || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const genericResponse = { success: true, message: 'If an account exists for this email, a password reset link has been sent.' };

    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Security: Never reveal whether an email exists
    if (!user) {
      await logEvent({
        action: 'PASSWORD_RESET',
        userName: email,
        details: { message: 'Forgot password trigger ignored: Email does not exist' },
        ipAddress: clientIp,
        userAgent
      });
      return res.status(200).json(genericResponse);
    }

    // Security: Restrict password resets ONLY to active Employees
    if (user.role !== 'EMPLOYEE' || (user.status || '').toUpperCase() !== 'ACTIVE') {
      await logEvent({
        action: 'PASSWORD_RESET',
        userId: user._id,
        userName: email,
        details: { message: `Forgot password trigger ignored: User is not an active Employee (role: ${user.role}, status: ${user.status})` },
        ipAddress: clientIp,
        userAgent
      });
      return res.status(200).json(genericResponse);
    }

    // Time-limited token (15 mins expiry as per security/task requirements)
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins expiry
    await user.save();

    let resetUrl;
    try {
      resetUrl = `${getFrontendBaseUrl()}/reset-password/${resetToken}`;
    } catch (urlErr) {
      console.error('[Password Reset] Frontend URL config error:', urlErr.message);
      return res.status(500).json({ error: 'Server frontend URL not configured for production. Set APP_URL/CLIENT_URL to https://<production-domain>.' });
    }
    
    await sendPasswordResetEmail(user.name, user.email, resetUrl);

    // Notify Admin
    await sendEmail({
      to: config.adminEmail,
      subject: '[ADMIN ALERT] Password Reset Action Captured',
      html: `<p>Password reset requested for ${user.name} (${user.email}).</p>`
    });

    await logEvent({
      userId: user._id,
      userName: user.name,
      action: 'PASSWORD_RESET',
      details: { message: 'Password reset link sent to email' },
      ipAddress: clientIp,
      userAgent
    });

    return res.status(200).json(genericResponse);
  } catch (err) {
    next(err);
  }
};

/**
 * Reset password via time-limited, single-use token
 * Route: POST /api/auth/reset-password/:token
 */
export const resetPassword = async (req, res, next) => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    // Security: Validate user exists, is an EMPLOYEE, and is active
    if (!user || user.role !== 'EMPLOYEE' || (user.status || '').toUpperCase() !== 'ACTIVE') {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    // Update password
    user.password = req.body.password;
    // Single-use token: invalidate on use
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    // Invalidate refresh tokens (logout from other devices)
    user.refreshTokens = [];
    user.mustChangePassword = false; // password is changed successfully
    await user.save();

    await logEvent({
      userId: user._id,
      userName: user.name,
      action: 'PASSWORD_CHANGE',
      details: { message: 'Password reset successfully via reset token' },
      ipAddress: req.ip || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown'
    });

    return res.status(200).json({ success: true, message: 'Password updated successfully. Please log in.' });
  } catch (err) {
    next(err);
  }
};

/**
 * First-login password change
 * Route: POST /api/auth/change-password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.trim() === '') {
      return res.status(400).json({ error: 'New password is required.' });
    }

    req.user.password = password;
    req.user.mustChangePassword = false;
    req.user.refreshTokens = []; // clear other sessions
    await req.user.save();

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'PASSWORD_CHANGE',
      details: { message: 'Forced password change completed' },
      ipAddress: req.ip || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown'
    });

    return res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * Invalidate all sessions
 * Route: POST /api/auth/logout-all
 */
export const logoutAllDevices = async (req, res, next) => {
  try {
    req.user.refreshTokens = [];
    await req.user.save();

    const isProduction = config.nodeEnv === 'production';
    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax'
    };
    res.clearCookie('accessToken', clearOptions);
    res.clearCookie('refreshToken', clearOptions);

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'LOGOUT',
      details: { message: 'Logged out from all active sessions' },
      ipAddress: req.ip || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown'
    });

    return res.status(200).json({ success: true, message: 'Logged out from all sessions.' });
  } catch (err) {
    next(err);
  }
};

/**
 * Employee Forgot Password using EmailJS
 * Route: POST /api/employee/forgot-password
 */
export const employeeForgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const clientIp = req.ip || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const genericResponse = { success: true, message: 'If an account exists for this email, a password reset link has been sent.' };

    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Security: Never reveal whether an email exists
    if (!user) {
      await logEvent({
        action: 'PASSWORD_RESET',
        userName: email,
        details: { message: 'Employee forgot password trigger ignored: Email does not exist' },
        ipAddress: clientIp,
        userAgent
      });
      return res.status(200).json(genericResponse);
    }

    // Security: Restrict ONLY to active Employees
    if (user.role !== 'EMPLOYEE' || (user.status || '').toUpperCase() !== 'ACTIVE') {
      await logEvent({
        action: 'PASSWORD_RESET',
        userId: user._id,
        userName: email,
        details: { message: `Employee forgot password trigger ignored: User is not an active Employee (role: ${user.role}, status: ${user.status})` },
        ipAddress: clientIp,
        userAgent
      });
      return res.status(200).json(genericResponse);
    }

    // Time-limited token (15 mins expiry)
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins expiry
    await user.save();

    const resetUrl = `${config.clientUrl || 'https://viralcraftmedia-demo.vercel.app'}/reset-password/${resetToken}`;
    
    // Send email via EmailJS template_42dehut using REST API
    const emailjsData = {
      service_id: process.env.VITE_EMAILJS_SERVICE_ID || 'service_c8opm9k',
      template_id: 'template_42dehut',
      user_id: process.env.VITE_EMAILJS_PUBLIC_KEY || 'QE8QtObuJabdm7dYF',
      template_params: {
        employee_name: user.name,
        employee_email: user.email,
        reset_link: resetUrl,
        expiry_time: '15 Minutes',
        year: new Date().getFullYear().toString()
      }
    };

    if (process.env.EMAILJS_PRIVATE_KEY) {
      emailjsData.accessToken = process.env.EMAILJS_PRIVATE_KEY;
    }

    try {
      const emailjsResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailjsData)
      });

      if (!emailjsResponse.ok) {
        const errorText = await emailjsResponse.text();
        throw new Error(errorText || 'EmailJS returned error status: ' + emailjsResponse.status);
      }

      await logEvent({
        userId: user._id,
        userName: user.name,
        action: 'PASSWORD_RESET',
        details: { message: 'Employee password reset link successfully sent via EmailJS' },
        ipAddress: clientIp,
        userAgent
      });

    } catch (emailErr) {
      console.error('[EMAILJS ERROR]: Failed to send employee password reset email:', emailErr.message);
      await logEvent({
        userId: user._id,
        userName: user.name,
        action: 'PASSWORD_RESET',
        details: { message: 'Employee password reset email failed to send', error: emailErr.message },
        ipAddress: clientIp,
        userAgent
      });
    }

    return res.status(200).json(genericResponse);
  } catch (err) {
    next(err);
  }
};

/**
 * Employee Reset Password via Token
 * Route: POST /api/employee/reset-password/:token
 */
export const employeeResetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'New password is required.' });
    }

    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    // Security: Validate user exists, is an EMPLOYEE, and is active
    if (!user || user.role !== 'EMPLOYEE' || (user.status || '').toUpperCase() !== 'ACTIVE') {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    // Update password (pre-save hook will hash it)
    user.password = password;
    
    // Invalidate reset token and expiry
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    // Invalidate active refresh sessions
    user.refreshTokens = [];
    user.mustChangePassword = false;
    await user.save();

    await logEvent({
      userId: user._id,
      userName: user.name,
      action: 'PASSWORD_CHANGE',
      details: { message: 'Employee password reset successfully via token' },
      ipAddress: req.ip || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown'
    });

    return res.status(200).json({ success: true, message: 'Password updated successfully. Please log in.' });
  } catch (err) {
    next(err);
  }
};

/**
 * Employee Validate Reset Token
 * Route: GET /api/employee/reset-password/:token
 */
export const employeeValidateResetToken = async (req, res, next) => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    // Security: Validate user exists, is an EMPLOYEE, and is active
    if (!user || user.role !== 'EMPLOYEE' || (user.status || '').toUpperCase() !== 'ACTIVE') {
      return res.status(400).json({ error: 'Invalid or expired reset token.', valid: false });
    }

    return res.status(200).json({ success: true, valid: true });
  } catch (err) {
    next(err);
  }
};

