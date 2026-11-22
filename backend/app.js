import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import crypto from 'crypto';
import { config } from './config/env.js';
import routes from './routes/index.js';
import internalWhatsappEventsRoutes from './routes/internalWhatsappEvents.js';
import internalWhatsappCommandsRoutes from './routes/internalWhatsappCommands.js';
import { preventMongoInjection, sanitizeObject, validateCsrfToken } from './middleware/validate.js';
import errorHandler from './middleware/error.js';
import { corsOptions } from './middleware/corsConfig.js';
import { createHealthHandler } from './shared/utils/healthCheck.js';
import mongoose from 'mongoose';
import { isRedisAvailable } from './config/redis.js';

const app = express();

if (process.env.INTERNAL_AUTH_MEMORY_NONCE_STORE === 'true' && process.env.NODE_ENV !== 'production') {
  const nonceMap = new Map();
  app.set('internalNonceStore', {
    reserve(key, ttlSeconds) {
      const now = Date.now();
      const exp = nonceMap.get(key);
      if (exp && exp > now) return false;
      nonceMap.set(key, now + ttlSeconds * 1000);
      return true;
    }
  });
  console.warn('[main-api] INTERNAL_AUTH_MEMORY_NONCE_STORE enabled (non-production only).');
}

function parseTrustProxySetting(raw) {
  if (raw == null || raw === '') return undefined;
  const v = String(raw).trim();
  if (v.toLowerCase() === 'true') return true;
  if (v.toLowerCase() === 'false') return false;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (v.includes(',')) return v.split(',').map((s) => s.trim()).filter(Boolean);
  return v;
}

// Reverse-proxy trust must be explicitly configured for the verified infrastructure.
// Supported env vars:
// - TRUST_PROXY: Express trust proxy value (true|false|number|subnet/name|comma-separated list)
// - TRUST_PROXY_HOPS (legacy): numeric hop count
// - TRUSTED_INGRESS_SECRET: optional shared secret expected from trusted ingress
// - REQUIRE_TRUSTED_INGRESS: when "true" and secret is set, reject direct/bypassing requests
// Safe default: if no explicit trust proxy config is provided, do not trust forwarded headers
// (prevents client IP spoofing on direct access). Configure TRUST_PROXY for verified proxies
// so req.ip/rate limiting/incident logging resolve the real client IP.
const explicitTrustProxy = parseTrustProxySetting(process.env.TRUST_PROXY);
const legacyTrustHops = process.env.TRUST_PROXY_HOPS != null && process.env.TRUST_PROXY_HOPS !== ''
  ? parseInt(process.env.TRUST_PROXY_HOPS, 10)
  : undefined;
let trustProxySetting;
if (explicitTrustProxy !== undefined) {
  trustProxySetting = explicitTrustProxy;
} else if (Number.isFinite(legacyTrustHops)) {
  trustProxySetting = legacyTrustHops;
} else {
  trustProxySetting = false;
}
app.set('trust proxy', trustProxySetting);

const trustedIngressSecret = process.env.TRUSTED_INGRESS_SECRET || '';
const requireTrustedIngress = String(process.env.REQUIRE_TRUSTED_INGRESS || '').toLowerCase() === 'true';
if (trustedIngressSecret && requireTrustedIngress) {
  app.use((req, res, next) => {
    if (req.path === '/health' || req.path === '/api/health') return next();
    const provided = req.headers['x-trusted-ingress-secret'];
    const providedBuf = Buffer.from(typeof provided === 'string' ? provided : '', 'utf8');
    const expectedBuf = Buffer.from(trustedIngressSecret, 'utf8');
    const ok = providedBuf.length === expectedBuf.length && providedBuf.length > 0 && crypto.timingSafeEqual(providedBuf, expectedBuf);
    if (!ok) {
      return res.status(403).json({
        success: false,
        error: { code: 'UNTRUSTED_INGRESS', message: 'Request did not arrive through trusted ingress.', statusCode: 403 }
      });
    }
    return next();
  });
}
app.use(compression());

// Security Headers via Helmet - enterprise hardening (CSP must allow Razorpay checkout)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://checkout.razorpay.com", "https://fonts.googleapis.com", "https://api.emailjs.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://viralcraftmedia-demo.onrender.com", "https://viralcraftmedia-demo.vercel.app", "https://viralcraftmedia.com", "https://www.viralcraftmedia.com", "https://api.razorpay.com", "https://api.emailjs.com", "https://docs.google.com", "wss://viralcraftmedia-demo.onrender.com", "https://api.teamlogger.com"],
      frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'", "https://docs.google.com", "https://api.emailjs.com"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: false, // Razorpay iframe requires false
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: false // CSP handles XSS, deprecated X-XSS-Protection
}));

// CORS — single source of truth in middleware/corsConfig.js (never origin '*').
// Mounted before body parsers, CSRF check and all routes so preflight OPTIONS
// (handled automatically here) and every API response carry CORS headers.
app.use(cors(corsOptions));

// Request body size limits & JSON parsers
// Note: CORS preflight (OPTIONS) is handled automatically by the cors() middleware above.
// Capture rawBody for Razorpay webhook HMAC verification (must be exact bytes)
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    const requestUrl = req.originalUrl || req.url || '';
    if (requestUrl.includes('razorpay-webhook') || requestUrl.includes('/internal/')) {
      req.rawBody = buf.toString('utf8');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser for secure HTTP-only cookies
app.use(cookieParser());

// Custom Database Query Injection Protection
app.use(preventMongoInjection);

// Request sanitization middleware
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
});

// Health check probe endpoint (accessible to Render/uptime probes without CSRF/auth)
const healthHandler = createHealthHandler({
  serviceName: 'main-api',
  dependencies: () => ({
    redis: isRedisAvailable(),
    mongo: mongoose.connection.readyState === 1,
  }),
});
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// CSRF protection via Origin/Referer header validation
app.use('/api', validateCsrfToken);

// Mount API routes under /api base path (canonical - SEC-014 intentional single surface in production)
app.use('/api', routes);

// Duplicate mount was added for proxy compatibility (404 fix) but widens WAF surface.
// Per SEC-014, expose fallback only in non-production where proxy stripping occurs;
// production keeps single /api surface.
const isProduction = config.nodeEnv === 'production';
if (!isProduction) {
  app.use(validateCsrfToken);
  app.use(routes);
}

app.use('/internal/whatsapp/events', internalWhatsappEventsRoutes);
app.use('/internal/whatsapp', internalWhatsappCommandsRoutes);

// Centralized error responder
app.use(errorHandler);

export default app;
