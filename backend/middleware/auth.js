import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import User from '../models/User.js';

// Protect routes - checks for JWT token in Authorization header or HTTP-only cookies
export const protect = async (req, res, next) => {
  let token;

  // 1. Check cookies for access token
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  // 2. Check Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized to access this resource. Please log in.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);

    let user;
    if (decoded.role === 'BACKUP_ADMIN') {
      // Backup admin must authenticate via real Backup DB lookup — no mock bypass.
      const { backupConnection, getBackupModel } = await import('../services/backupService.js');
      if (!backupConnection || backupConnection.readyState !== 1) {
        return res.status(401).json({ error: 'Backup database unavailable. Please try again.' });
      }
      const BackupUser = getBackupModel('User');
      if (!BackupUser) {
        return res.status(401).json({ error: 'User is inactive or no longer exists.' });
      }
      user = await BackupUser.findById(decoded.id);
      if (user) {
        // Normalize to the shape downstream code expects without inventing fields.
        user = {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: 'BACKUP_ADMIN',
          status: user.status,
          lockUntil: user.lockUntil,
          mustChangePassword: user.mustChangePassword
        };
      }
    } else {
      // Get user from database, excluding password
      user = await User.findById(decoded.id);
    }

    if (!user || user.status === 'inactive') {
      return res.status(401).json({ error: 'User is inactive or no longer exists.' });
    }

    // Lockout check: if account is locked out, prevent access
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(403).json({ error: 'Account is locked. Please contact administrator.' });
    }

    // Force password change guard
    if (user.mustChangePassword) {
      // Allow only change-password, logout, profile, and read-only employee data routes
      const allowedPaths = ['/change-password', '/logout', '/me', '/notifications', '/projects', '/tasks'];
      // Use originalUrl + path so the check works even when router strips the prefix
      const currentPath = (req.originalUrl || req.path).toLowerCase();
      
      const isAllowed = allowedPaths.some(path => currentPath.includes(path));
      if (!isAllowed) {
        return res.status(403).json({ 
          error: 'ForcePasswordReset', 
          message: 'You must change your temporary password before you can proceed.' 
        });
      }
    }

    req.user = user;

    // Intercept backup admin account for database isolation and read-only lockdown
    // No hardcoded fallback: BACKUP_ADMIN_EMAIL is required at boot (config/env.js).
    if (!config.backupAdminEmail) {
      next();
      return;
    }
    const backupAdminEmail = config.backupAdminEmail.toLowerCase();
    if (user.email.toLowerCase() === backupAdminEmail) {
      const isBackupRoute = (req.originalUrl && req.originalUrl.includes('/api/backup')) || (req.baseUrl && req.baseUrl.includes('/backup')) || req.path.toLowerCase().startsWith('/backup');
      
      if (!isBackupRoute && req.method !== 'GET' && !req.path.toLowerCase().endsWith('/logout')) {
        return res.status(403).json({ 
          error: 'Access Denied', 
          message: 'Read-only access. Write operations are disabled for the backup account.' 
        });
      }

      // Dynamic import to prevent circular dependencies on bootstrap
      const { runInBackupContext } = await import('../services/backupService.js');
      return runInBackupContext(() => {
        next();
      });
    }

    next();
  } catch (err) {
    console.warn('Access token verification failed:', err.message);
    return res.status(401).json({ error: 'Token expired or invalid. Please re-authenticate.' });
  }
};

// Grant access to specific roles (uppercase roles enforced)
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Normalizing role checks to uppercase for robustness
    const userRole = req.user.role.toUpperCase();
    const allowedRoles = roles.map(r => r.toUpperCase());

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: `Role '${req.user.role}' is not authorized to access this route.` 
      });
    }
    next();
  };
};
