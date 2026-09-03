import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import Partner from '../models/Partner.js';

export const protectPartner = async (req, res, next) => {
  let token;

  // 1. Check cookies for partner access token
  if (req.cookies && req.cookies.partnerAccessToken) {
    token = req.cookies.partnerAccessToken;
  }
  // 2. Check Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized to access the Partner Portal. Please log in.' });
  }

  try {
    // SEC-016: Try partner-isolated secret first, fallback to main secret for backward compatibility
    let decoded;
    try {
      decoded = jwt.verify(token, config.partnerJwtSecret);
    } catch (e) {
      // Fallback to main secret for existing sessions signed before isolation
      if (config.partnerJwtSecret !== config.jwtSecret) {
        decoded = jwt.verify(token, config.jwtSecret);
      } else {
        throw e;
      }
    }

    // Verify token was generated for a partner role
    if (decoded.role !== 'PARTNER') {
      return res.status(403).json({ error: 'Access denied. Invalid role assignment.' });
    }

    const partner = await Partner.findById(decoded.id);

    if (!partner || partner.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Partner account is inactive, disabled, or no longer exists.' });
    }

    req.partner = partner;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
};
