import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { preventMongoInjection, sanitizeObject, validateCsrfToken } from './middleware/validate.js';
import errorHandler from './middleware/error.js';

const app = express();

// Security Headers via Helmet
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for dashboard flexibility
}));

// CORS Configuration
const allowedOrigins = [
  config.clientUrl,
  'https://viralcraftmedia.com',
  'https://www.viralcraftmedia.com'
].filter(Boolean);

// Allow localhost origins only in development
if (config.nodeEnv === 'development') {
  allowedOrigins.push(
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5000'
  );
}

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Request body size limits & JSON parsers
// Note: CORS preflight (OPTIONS) is handled automatically by the cors() middleware above.
app.use(express.json({ limit: '10mb' }));
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

// Mount API routes under /api base path
app.use('/api', routes);

// Centralized error responder
app.use(errorHandler);

export default app;
