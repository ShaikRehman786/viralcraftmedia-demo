import User from '../models/User.js';
import { getSignedTokenResponse, rotateRefreshToken } from '../services/authService.js';
import { logEvent } from '../services/loggingService.js';
import { sendPasswordResetEmail, sendEmail } from '../services/emailService.js';
import { notifyStaff } from '../services/notificationService.js';
import crypto from 'crypto';
import { config } from '../config/env.js';

/**
 * Login user with lockout logic (5 failed attempts = 30 min lock)
 * Route: POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

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

    if (['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user.role)) {
      notifyStaff({
        title: 'Login',
        message: `${user.name} (${user.role.replace('_', ' ')}) logged in.`,
        type: 'info',
        priority: 'low',
        referenceId: user._id.toString(),
        referenceModel: 'User',
        metadata: { userName: user.name, role: user.role, ip: clientIp }
      }).catch(err => console.error('notifyStaff (login) failed:', err.message));
    }

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
    const token = req.cookies.refreshToken;
    if (token && req.user) {
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

      if (['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE'].includes(req.user.role)) {
        notifyStaff({
          title: 'Logout',
          message: `${req.user.name} (${req.user.role.replace('_', ' ')}) logged out.`,
          type: 'info',
          priority: 'low',
          referenceId: req.user._id.toString(),
          referenceModel: 'User',
          metadata: { userName: req.user.name, role: req.user.role }
        }).catch(err => console.error('notifyStaff (logout) failed:', err.message));
      }
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

    // Time-limited token (30 mins as requested)
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 mins expiry
    await user.save();

    const resetUrl = `${config.appUrl || 'http://localhost:5173'}/reset-password/${resetToken}`;
    
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

    if (!user) {
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
