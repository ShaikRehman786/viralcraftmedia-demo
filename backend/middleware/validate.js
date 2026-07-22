import { body, validationResult } from 'express-validator';

// Strip HTML tags and escape input to prevent XSS
export const sanitizeInput = (val) => {
  if (typeof val !== 'string') return val;
  return val
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[<>"'&]/g, '') // Strip dangerous characters
    .trim();
};

// Recursively sanitize all string fields in an object
export const sanitizeObject = (obj) => {
  if (typeof obj === 'string') return sanitizeInput(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
};

// Check for MongoDB operator injection (keys starting with $)
export const preventMongoInjection = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj instanceof Object) {
      for (const k in obj) {
        if (k.startsWith('$')) {
          delete obj[k];
        } else {
          sanitize(obj[k]);
        }
      }
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
  const clientUrl = process.env.CLIENT_URL;
  const allowedOrigins = [
    clientUrl,
    'https://viralcraftmedia.com',
    'https://www.viralcraftmedia.com'
  ].filter(Boolean);
  if (nodeEnv === 'development') {
    allowedOrigins.push('http://localhost:5173', 'http://localhost:5000');
  }

  // Skip CSRF check for GET/HEAD/OPTIONS requests and webhook endpoints
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (req.path && req.path.includes('razorpay-webhook')) {
    return next();
  }

  // Check origin or referer for state-changing requests
  const requestOrigin = origin || referer;
  if (requestOrigin) {
    const isAllowed = allowedOrigins.some(allowed => requestOrigin.startsWith(allowed));
    if (!isAllowed) {
      return res.status(403).json({ error: 'CSRF validation failed: Invalid request origin.' });
    }
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
