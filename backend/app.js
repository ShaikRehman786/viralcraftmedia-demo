import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { preventMongoInjection, sanitizeObject, validateCsrfToken } from './middleware/validate.js';
import errorHandler from './middleware/error.js';

const app = express();
// Trust Render proxy (fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR while preserving IP correctness)
// Render terminates TLS and forwards via X-Forwarded-For; trust only 1 hop prevents spoofing
app.set('trust proxy', 1);
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

// CORS Configuration - environment-aware: localhost only in non-production
const isProduction = config.nodeEnv === 'production';
const prodOrigins = [
  config.clientUrl,
  'https://viralcraftmedia-demo.vercel.app',
  'https://viralcraftmedia-demo.onrender.com',
  'https://viralcraftmedia.com',
  'https://www.viralcraftmedia.com'
].filter(Boolean);
const devOrigins = [
  ...prodOrigins,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5000',
  'http://localhost:3000'
];
const allowedOrigins = isProduction ? prodOrigins : devOrigins;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked request from disallowed origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Request body size limits & JSON parsers
// Note: CORS preflight (OPTIONS) is handled automatically by the cors() middleware above.
// Capture rawBody for Razorpay webhook HMAC verification (must be exact bytes)
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    if (req.originalUrl && req.originalUrl.includes('razorpay-webhook')) {
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

// CSRF protection via Origin/Referer header validation
app.use('/api', validateCsrfToken);

// Mount API routes under /api base path (canonical - SEC-014 intentional single surface in production)
app.use('/api', routes);

// Duplicate mount was added for proxy compatibility (404 fix) but widens WAF surface.
// Per SEC-014, expose fallback only in non-production where proxy stripping occurs;
// production keeps single /api surface.
if (!isProduction) {
  app.use(validateCsrfToken);
  app.use(routes);
}

// Centralized error responder
app.use(errorHandler);

export default app;
