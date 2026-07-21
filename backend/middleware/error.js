import { config } from '../config/env.js';

// Set CORS headers on error responses so the browser can read the error message.
// The cors() middleware in app.js already blocks disallowed origins before they reach here,
// so we simply reflect whatever Origin header is present without re-checking.
const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
};

// Centralized error handling middleware
export default function errorHandler(err, req, res, next) {
  // Ensure CORS headers are set on error responses so the browser can read the error
  setCorsHeaders(req, res);

  let error = { ...err };
  error.message = err.message;

  // Log error details locally
  console.error('[ERROR HANDLER]:', {
    message: err.message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method
  });

  // Mongoose bad ObjectId format error
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new Error(message);
    error.statusCode = 404;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new Error(message);
    error.statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new Error(message);
    error.statusCode = 400;
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid authentication token. Please log in again.';
    error = new Error(message);
    error.statusCode = 401;
  }

  // JWT Expired error
  if (err.name === 'TokenExpiredError') {
    const message = 'Authentication token expired. Please log in again.';
    error = new Error(message);
    error.statusCode = 401;
  }

  res.status(error.statusCode || 500).json({
    error: error.message || 'Internal Server Error'
  });
}
