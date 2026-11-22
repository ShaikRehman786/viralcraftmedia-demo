import express from 'express';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import internalWhatsappRoutes from './routes/internalWhatsapp.js';
import { whatsappManager } from './services/whatsappManager.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

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
    logger.warn('INTERNAL_AUTH_MEMORY_NONCE_STORE enabled (non-production only).');
  }

  app.get('/health', (req, res) => {
    const status = whatsappManager.getStatus();
    res.status(200).json({
      success: true,
      service: config.serviceName,
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      whatsapp: {
        connectionStatus: status.connectionStatus,
        isInitializing: status.isInitializing,
        isShuttingDown: status.isShuttingDown,
      },
    });
  });

  app.use('/internal/whatsapp', internalWhatsappRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found', statusCode: 404 } });
  });

  // Central error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    logger.error('Unhandled express error', { error: err?.message, path: req.path });
    if (res.headersSent) return;
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error', statusCode: 500 } });
  });

  return app;
}
