// Single source of truth for CORS / cross-origin policy.
//
// Previously the origin whitelist was duplicated in app.js, middleware/validate.js
// (CSRF check), middleware/error.js (error-path headers) and server.js (Socket.IO),
// which could drift out of sync. Every consumer must import from here.
//
// Production explicitly allows the Vercel frontend. No wildcard origin is used,
// and credentialed (httpOnly-cookie) requests are preserved via credentials: true.
import { config } from '../config/env.js';

const CANONICAL_PROD_ORIGINS = [
  'https://viralcraftmedia-demo.vercel.app',
  'https://viralcraftmedia-demo.onrender.com',
  'https://viralcraftmedia.com',
  'https://www.viralcraftmedia.com'
];

const DEV_ONLY_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5000',
  'http://localhost:3000'
];

export const isProductionCors = () => (config.nodeEnv || 'development') === 'production';

// Environment-aware whitelist. Production: configured client URL + canonical
// production origins only. Non-production: additionally allows localhost.
export const getAllowedOrigins = () => {
  const origins = [config.clientUrl, ...CANONICAL_PROD_ORIGINS].filter(Boolean);
  if (!isProductionCors()) {
    origins.push(...DEV_ONLY_ORIGINS);
  }
  return [...new Set(origins)];
};

export const isOriginAllowed = (origin) => {
  if (!origin) return false;
  return getAllowedOrigins().includes(origin);
};

// Shared `cors` package options for Express (used before all routes so
// preflight OPTIONS and error responses carry CORS headers).
export const corsOptions = {
  origin: (origin, callback) => {
    // Non-browser / same-origin requests carry no Origin header: allow.
    if (!origin) {
      return callback(null, true);
    }
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked request from disallowed origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 204
};

// Re-apply CORS headers on responses generated outside the `cors` middleware
// path (central error handler). Only for explicitly whitelisted origins —
// never a wildcard — so credentialed responses stay secure.
export const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
};
