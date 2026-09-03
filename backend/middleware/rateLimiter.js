import rateLimit from 'express-rate-limit';

// Standard rate limiter for generic API requests
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

// Stricter rate limiter for authentication routes (login, register, forgot-password)
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // limit each IP to 15 login/auth attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts, please try again in an hour'
  }
});

// Webhook rate limiter - strict to prevent flooding and replay abuse
export const webhookLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // limit each IP to 30 webhook calls per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many webhook requests, please try again later'
  }
});
