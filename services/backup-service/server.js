import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Service identity / port defaults
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'backup-service';
process.env.PORT = process.env.PORT || process.env.BACKUP_PORT || '5002';
// Prevent db.js auto-init; this service owns backup lifecycle explicitly.
process.env.RUN_IN_PROCESS_BACKUP = 'false';

const { config } = await import('../../backend/config/env.js');
await import('../../backend/config/backupInit.js');
const { default: connectDB } = await import('../../backend/config/db.js');
const { initBackupSystem, shutdownBackupServices, getBackupSystemHealth, runForceSync, purgeExpiredBackups } = await import('../../backend/services/backupService.js');
const { createHealthHandler } = await import('../../backend/shared/utils/healthCheck.js');
const { verifyInternalRequest } = await import('../../backend/shared/security/internalAuth.js');
const { sendSuccess, sendError } = await import('../../backend/shared/utils/responseEnvelope.js');
const { closeRedis, isRedisAvailable } = await import('../../backend/config/redis.js');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

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
  console.warn('[backup-service] INTERNAL_AUTH_MEMORY_NONCE_STORE enabled (non-production only).');
}

const healthHandler = createHealthHandler({
  serviceName: 'backup-service',
  dependencies: async () => {
    const health = await getBackupSystemHealth().catch(() => null);
    return {
      mongo: mongoose.connection.readyState === 1,
      backupDb: health?.backupDb?.status === 'Connected',
      changeStream: health?.changeStreamStatus === 'Active' || health?.changeStreamStatus === 'Standby',
      redis: isRedisAvailable(),
    };
  },
});
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// HMAC-protected internal API
app.use('/internal', verifyInternalRequest);
app.get('/internal/backup/status', async (_req, res) => {
  try {
    const health = await getBackupSystemHealth();
    return sendSuccess(res, { health });
  } catch (err) {
    return sendError(res, err.message, 500, 'BACKUP_STATUS_FAILED');
  }
});
app.post('/internal/backup/force-sync', async (_req, res) => {
  try {
    const result = await runForceSync();
    return sendSuccess(res, result);
  } catch (err) {
    const status = err.statusCode || 500;
    return sendError(res, err.message, status, 'BACKUP_FORCE_SYNC_FAILED');
  }
});
app.post('/internal/backup/purge-expired', async (_req, res) => {
  try {
    const result = await purgeExpiredBackups();
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err.message, 500, 'BACKUP_PURGE_FAILED');
  }
});

app.use((req, res) => sendError(res, 'Not found', 404, 'NOT_FOUND'));

const server = http.createServer(app);
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[backup-service] Received ${signal}; shutting down.`);
  try { await shutdownBackupServices(); } catch (e) { console.warn('[backup-service] backup shutdown warning:', e.message); }
  try { await closeRedis(); } catch {}
  await new Promise((resolve) => server.close(() => resolve()));
  try { await mongoose.connection.close(); } catch {}
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function main() {
  await connectDB();
  await initBackupSystem();
  server.listen(config.port || process.env.PORT || 5002, () => {
    console.log(`[backup-service] listening on ${process.env.PORT || 5002}`);
  });
}

main().catch((err) => {
  console.error('[backup-service] fatal:', err.message);
  process.exit(1);
});
