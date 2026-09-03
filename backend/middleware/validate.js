import { body, validationResult } from 'express-validator';

// Strip HTML tags and escape input to prevent XSS
export const sanitizeInput = (val) => {
  if (typeof val !== 'string') return val;
  return val
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[<>"']/g, '') // Strip dangerous characters
    .trim();
};

// Recursively sanitize all string fields in an object (prototype-pollution safe)
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const sanitizeObject = (obj) => {
  if (typeof obj === 'string') return sanitizeInput(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    const sanitized = Object.create(null);
    for (const [key, value] of Object.entries(obj)) {
      if (DANGEROUS_KEYS.has(key)) continue;
      // Also block keys containing prototype pollution patterns or dot-notation abuse
      if (key.includes('.') && DANGEROUS_KEYS.has(key.split('.')[0])) continue;
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
};

// Check for MongoDB operator injection (keys starting with $) and prototype pollution
export const preventMongoInjection = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj instanceof Object) {
      // Use own-property iteration to avoid traversing polluted prototype
      const keys = Object.keys(obj);
      for (const k of keys) {
        if (k.startsWith('$') || DANGEROUS_KEYS.has(k)) {
          delete obj[k];
        } else if (k.includes('.') && DANGEROUS_KEYS.has(k.split('.')[0])) {
          delete obj[k];
        } else {
          const val = obj[k];
          if (val instanceof Object) {
            sanitize(val);
          }
        }
      }
      // Also clean __proto__ directly if present as own property descriptor
      try {
        if (Object.prototype.hasOwnProperty.call(obj, '__proto__')) {
          delete obj['__proto__'];
        }
      } catch {}
    }
  };
  
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next();
};

// CSRF Token validation middleware
export const validateCsrfToken = (req, res, next) => {
  // For cookie-based auth, we check the Origin/Referer header as a CSRF mitigation
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const clientUrl = process.env.CLIENT_URL;
  const prodOrigins = [
    clientUrl,
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

  // Skip CSRF check for GET/HEAD/OPTIONS requests and webhook endpoints
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (req.path && req.path.includes('razorpay-webhook')) {
    return next();
  }

  // Check origin or referer for state-changing requests
  const requestOrigin = origin || referer;
  // Fail-closed: missing Origin/Referer on state-changing requests is rejected
  // (except webhook already skipped above). Frontend browsers always send Origin
  // for cross-origin withCredentials requests, so missing header indicates
  // potential CSRF or non-browser client.
  if (!requestOrigin) {
    // Allow same-site requests without Origin if they carry Authorization header
    // (non-cookie auth is not vulnerable to CSRF) - but cookie-auth requires Origin
    const hasCookieAuth = req.cookies && (req.cookies.accessToken || req.cookies.refreshToken || req.cookies.partnerAccessToken);
    const hasBearer = req.headers.authorization && req.headers.authorization.startsWith('Bearer');
    // If cookie-auth is used, require Origin/Referer
    if (hasCookieAuth && !hasBearer) {
      return res.status(403).json({ error: 'CSRF validation failed: Missing Origin/Referer header.' });
    }
    // For Bearer-only or no-auth (e.g., public create-order), allow without Origin
    // but still continue to next middleware
    return next();
  }
  // Strict origin check - use URL parsing to prevent subdomain bypass via startsWith
  const isAllowed = allowedOrigins.some(allowed => {
    try {
      // Exact match or startsWith with '/' boundary to prevent evil-subdomain bypass
      return requestOrigin === allowed || requestOrigin.startsWith(allowed + '/') || requestOrigin.startsWith(allowed + '?') || requestOrigin === allowed;
    } catch {
      return requestOrigin.startsWith(allowed);
    }
  });
  // Also check via URL origin equality for robustness
  let originAllowed = isAllowed;
  if (!originAllowed) {
    try {
      const reqUrl = new URL(requestOrigin);
      originAllowed = allowedOrigins.some(allowed => {
        try {
          const allowedUrl = new URL(allowed);
          return reqUrl.origin === allowedUrl.origin;
        } catch {
          return false;
        }
      });
    } catch {}
  }
  if (!originAllowed) {
    return res.status(403).json({ error: 'CSRF validation failed: Invalid request origin.' });
  }

  next();
};

// General request fields validator helper
export const validateFields = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const errorMsg = errors.array().map(err => err.msg).join(', ');
    return res.status(400).json({ error: errorMsg });
  };
};

// Concrete validations definitions
export const validateLogin = validateFields([
  body('email').isEmail().withMessage('Please specify a valid email address'),
  body('password').notEmpty().withMessage('Password field cannot be empty')
]);

export const validateOrderCreation = validateFields([
  body('amount').isInt({ min: 500 }).withMessage('Minimum purchase amount is ₹500')
]);

export const validatePaymentVerification = validateFields([
  body('razorpay_order_id').notEmpty().withMessage('Razorpay Order ID is required'),
  body('razorpay_payment_id').notEmpty().withMessage('Razorpay Payment ID is required'),
  body('razorpay_signature').notEmpty().withMessage('Razorpay signature is required'),
  body('name').trim().notEmpty().withMessage('Client name is required'),
  body('contact').trim().notEmpty().withMessage('Client contact is required'),
  body('videoLink').trim().isURL().withMessage('A valid video URL is required'),
  body('instructions').trim().optional({ values: 'falsy' }).notEmpty().withMessage('Timestamps or notes are required'),
  body('clipCount').isInt({ min: 1 }).withMessage('Must request at least 1 clip'),
  body('amount').isInt({ min: 500 }).withMessage('Amount validation failed'),
  body('platform').notEmpty().withMessage('Platform selection is required')
]);
