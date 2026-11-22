import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(serviceRoot, '.env') });

const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();

function readBool(name, defaultValue = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

export const config = {
  nodeEnv,
  port: parseInt(process.env.PORT || '5001', 10),
  serviceName: process.env.SERVICE_NAME || 'whatsapp-service',
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY || '',
  redisUrl: process.env.REDIS_URL || '',
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || '',
  // IMPORTANT: default is isolated to avoid duplicate connections against production account/session.
  whatsappClientId: process.env.WHATSAPP_CLIENT_ID || 'vcm-crm-whatsapp-phase2-foundation',
  sessionBaseDir: process.env.WHATSAPP_SESSION_BASE_DIR
    ? path.resolve(serviceRoot, process.env.WHATSAPP_SESSION_BASE_DIR)
    : path.join(serviceRoot, '.wwebjs_auth'),
  clearSessionOnLogout: readBool('WHATSAPP_CLEAR_SESSION_ON_LOGOUT', true),
  waModuleReadyTimeoutMs: parseInt(process.env.WA_MODULE_READY_TIMEOUT_MS || '20000', 10),
  terminalCooldownMs: parseInt(process.env.WA_TERMINAL_COOLDOWN_MS || '60000', 10),
  initRetryBaseDelayMs: parseInt(process.env.INIT_RETRY_BASE_DELAY_MS || '1500', 10),
  puppeteerCacheDir: (process.env.PUPPETEER_CACHE_DIR || '').trim(),
  puppeteerExecutablePath: (process.env.PUPPETEER_EXECUTABLE_PATH || '').trim(),
};

export const serviceRootPath = serviceRoot;
