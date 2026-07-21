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

    // Get user from database, excluding password
    const user = await User.findById(decoded.id);
    if (!user || user.status === 'inactive') {
      return res.status(401).json({ error: 'User is inactive or no longer exists.' });
    }

    // Lockout check: if account is locked out, prevent access
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(403).json({ error: 'Account is locked. Please contact administrator.' });
    }

    // Force password change guard
    if (user.mustChangePassword) {
      // Allow only change-password and logout routes
      const allowedPaths = ['/change-password', '/logout', '/me'];
      const currentPath = req.path.toLowerCase();
      
      const isAllowed = allowedPaths.some(path => currentPath.endsWith(path));
      if (!isAllowed) {
        return res.status(403).json({ 
          error: 'ForcePasswordReset', 
          message: 'You must change your temporary password before you can proceed.' 
        });
      }
    }

    req.user = user;
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
