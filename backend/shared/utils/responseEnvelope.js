/**
 * Standard response envelope helper for all 5 services
 */

export function sendSuccess(res, data = {}, meta = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  });
}

export function sendError(res, message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
  const payload = {
    success: false,
    error: {
      code,
      message,
      statusCode
    }
  };
  if (details) {
    payload.error.details = details;
  }
  return res.status(statusCode).json(payload);
}
