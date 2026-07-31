import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import Partner from '../models/Partner.js';

export const protectPartner = async (req, res, next) => {
  let token;

  // Check cookies for partner access token
  if (req.cookies && req.cookies.partnerAccessToken) {
    token = req.cookies.partnerAccessToken;
  }
  // Check Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized to access the Partner Portal. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const partner = await Partner.findById(decoded.id);

    if (!partner || partner.status === 'INACTIVE') {
      return res.status(401).json({ error: 'Partner account is inactive or no longer exists.' });
    }

    req.partner = partner;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
};
