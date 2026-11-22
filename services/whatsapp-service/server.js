import http from 'http';
import { createApp } from './src/app.js';
import { config } from './src/config/env.js';
import { logger } from './src/utils/logger.js';
import { whatsappManager } from './src/services/whatsappManager.js';

const app = createApp();
const server = http.createServer(app);

let shuttingDown = false;

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal}; starting graceful shutdown`);
  try {
    await whatsappManager.shutdown();
  } catch (e) {
    logger.error('Error during WhatsApp shutdown', { error: e?.message });
  }
  await new Promise((resolve) => {
    server.close(() => resolve());
    // force resolve if server not listening
    setTimeout(resolve, 5000).unref?.();
  });
  // best-effort close of the service-local Redis singleton; do not require it hard
  try {
    const redisMod = await import('./src/config/redis.js');
    if (redisMod?.closeRedis) await redisMod.closeRedis();
  } catch {}
  try {
    const { closeMessageStore } = await import('./src/services/messageStore.js');
    await closeMessageStore();
  } catch {}
  logger.info('HTTP server closed. Exiting.');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { error: reason?.message || String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err?.message, stack: err?.stack });
});

server.listen(config.port, async () => {
  logger.info(`WhatsApp service listening on port ${config.port}`, {
    env: config.nodeEnv,
    clientId: config.whatsappClientId,
    isolated: config.whatsappClientId !== 'vcm-crm-whatsapp',
  });
  // Start WhatsApp lifecycle bootstrap in background but log failures clearly.
  // Controlled QR/auth flow: init will emit/hold QR state; generation endpoint can retrigger.
  if (String(process.env.WHATSAPP_SKIP_INIT || 'false').toLowerCase() === 'true') {
    logger.warn('WHATSAPP_SKIP_INIT=true; skipping WhatsApp client initialization (health/internal endpoints remain available).');
  } else {
    try {
      await whatsappManager.init();
    } catch (err) {
      logger.error('Initial WhatsApp init failed (service remains up for /health and internal ops)', { error: err?.message });
    }
  }
});

export { app, server };
