import http from 'http';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { config } from '../config/env.js';
import { isRedisAvailable, safeSet, safeDel, closeRedis } from '../config/redis.js';
import { startReferralCampaignMonitor, stopReferralCampaignMonitor } from '../services/referralCron.js';
import { createHealthHandler } from '../shared/utils/healthCheck.js';

const LOCK_KEY = 'vcm:worker:referral:lock';
const LOCK_TTL_SECONDS = 120;
const PORT = process.env.WORKER_PORT || 5003;

let renewalTimer = null;
let lockAcquired = false;
let server = null;
let shuttingDown = false;

async function acquireLock() {
  if (!isRedisAvailable()) {
    // No Redis: allow single in-process worker without cross-instance guard.
    lockAcquired = true;
    return true;
  }
  const stored = await safeSet(LOCK_KEY, String(process.pid), LOCK_TTL_SECONDS, 'NX');
  if (stored === 'OK') {
    lockAcquired = true;
    renewalTimer = setInterval(async () => {
      try {
        if (isRedisAvailable()) {
          await safeSet(LOCK_KEY, String(process.pid), LOCK_TTL_SECONDS);
        }
      } catch {}
    }, Math.floor((LOCK_TTL_SECONDS * 1000) / 2));
    renewalTimer.unref?.();
    return true;
  }
  return false;
}

async function releaseLock() {
  if (renewalTimer) {
    clearInterval(renewalTimer);
    renewalTimer = null;
  }
  if (lockAcquired && isRedisAvailable()) {
    try { await safeDel(LOCK_KEY); } catch {}
  }
  lockAcquired = false;
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker] Received ${signal}; shutting down.`);
  stopReferralCampaignMonitor();
  await releaseLock();
  if (server) {
    await new Promise((resolve) => server.close(() => resolve()));
  }
  try { await closeRedis(); } catch {}
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function main() {
  await connectDB();
  const acquired = await acquireLock();
  if (!acquired) {
    console.log('[worker] Referral worker lock already held; exiting to avoid duplicate runs.');
    process.exit(0);
  }

  const healthHandler = createHealthHandler({
    serviceName: 'background-worker',
    dependencies: () => ({
      redis: isRedisAvailable(),
      mongo: mongoose.connection.readyState === 1,
    }),
  });

  server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/api/health') {
      return healthHandler(req, res);
    }
    res.statusCode = 404;
    res.end('Not found');
  });
  server.listen(PORT, () => {
    console.log(`[worker] Background worker listening on ${PORT}`);
  });

  startReferralCampaignMonitor();
  console.log('[worker] Referral campaign monitor started.');
}

main().catch((err) => {
  console.error('[worker] Fatal error:', err.message);
  process.exit(1);
});