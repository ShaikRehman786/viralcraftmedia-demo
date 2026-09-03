import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend-specific .env from the backend directory (with override enabled)
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

// Also load root .env (lower priority) for shared variables
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

const requiredEnv = [
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CLIENT_URL',
  'APP_URL'
];

// Validate critical integrations
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  missingEnv.push('MONGO_URI');
}

if (missingEnv.length > 0) {
  console.error('\n=================================================');
  console.error('❌ CRITICAL ERROR: SERVER CONFIGURATION VALIDATION FAILED');
  missingEnv.forEach(key => {
    console.error(`👉 ${key} is missing. Please configure ${key} inside your .env file.`);
  });
  console.error('Server boot halted due to missing required configurations.');
  console.error('=================================================\n');
  process.exit(1);
}

// Environment-aware Razorpay Safety Validation
// Production (NODE_ENV=production) requires LIVE key (rzp_live_)
// Non-production (development/test) requires TEST key (rzp_test_)
// Prevents accidental LIVE charges in test and accidental test keys in production
const _effectiveEnv = (process.env.NODE_ENV || 'development').toLowerCase();
const _isProductionEnv = _effectiveEnv === 'production';
if (process.env.RAZORPAY_KEY_ID) {
  const _key = process.env.RAZORPAY_KEY_ID.trim();
  const _isTestKey = _key.startsWith('rzp_test_');
  const _isLiveKey = _key.startsWith('rzp_live_');
  if (_isProductionEnv) {
    if (!_isLiveKey) {
      console.error('\n=================================================');
      console.error('❌ SAFETY ERROR: Production mode (NODE_ENV=production) requires a Razorpay LIVE key (rzp_live_...).');
      console.error('Current RAZORPAY_KEY_ID does not start with rzp_live_.');
      console.error('Set RAZORPAY_KEY_ID=rzp_live_... and RAZORPAY_KEY_SECRET for live payments.');
      console.error('Server halted due to invalid production payment configuration.');
      console.error('=================================================\n');
      process.exit(1);
    }
  } else {
    if (!_isTestKey) {
      console.error('\n=================================================');
      console.error('❌ SAFETY ERROR: Test/Sandbox mode requires a Razorpay TEST key (rzp_test_...).');
      console.error('Current RAZORPAY_KEY_ID does not start with rzp_test_.');
      console.error('A LIVE key (rzp_live_...) is not allowed outside production.');
      console.error('Set NODE_ENV=production to use LIVE keys, or use a TEST key for development.');
      console.error('Server halted to prevent accidental LIVE payment processing.');
      console.error('=================================================\n');
      process.exit(1);
    }
  }
}

// Backup admin password must be set explicitly - no hardcoded fallback (SEC-013)
if (!process.env.BACKUP_ADMIN_PASSWORD) {
  if (_isProductionEnv) {
    console.error('\n=================================================');
    console.error('❌ CRITICAL: BACKUP_ADMIN_PASSWORD is not set.');
    console.error('Set BACKUP_ADMIN_PASSWORD in environment variables.');
    console.error('Server halted - backup credentials must be explicitly configured in production.');
    console.error('=================================================\n');
    process.exit(1);
  } else {
    console.warn('⚠️  WARNING: BACKUP_ADMIN_PASSWORD not set - backup portal will be unavailable until configured.');
  }
}

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  emailFrom: process.env.EMAIL_FROM,
  adminEmail: process.env.ADMIN_EMAIL,
  appUrl: process.env.APP_URL,
  clientUrl: process.env.CLIENT_URL,
  
  // ##################################
  // MONGODB CONFIGURATION
  // ##################################
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI,
  
  // ##################################
  // BACKUP SYSTEM CONFIGURATION
  // ##################################
  backupMongoUri: process.env.BACKUP_MONGODB_URI,
  backupAdminEmail: process.env.BACKUP_ADMIN_EMAIL || 'backupadmin@viralcraftmedia.com',
  backupAdminPassword: process.env.BACKUP_ADMIN_PASSWORD,
  backupAdminName: process.env.BACKUP_ADMIN_NAME || 'Backup Administrator',
  backupAdminRole: process.env.BACKUP_ADMIN_ROLE || 'backup_admin',
  backupJwtSecret: process.env.BACKUP_JWT_SECRET || process.env.JWT_SECRET,
  
  // ##################################
  // JWT CONFIGURATION
  // Required: Set JWT_SECRET and JWT_REFRESH_SECRET in .env
  // ##################################
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  // Partner JWT isolation (SEC-016) - falls back to main secret for backward compatibility
  partnerJwtSecret: process.env.PARTNER_JWT_SECRET || process.env.JWT_SECRET,
  partnerJwtRefreshSecret: process.env.PARTNER_JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET,
  
  // ##################################
  // RAZORPAY CONFIGURATION
  // Required: Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env
  // ##################################
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,

  // ##################################
  // GOOGLE DRIVE CONFIGURATION
  // Replace Folder ID
  // Replace OAuth Credentials
  // Replace Service Account
  // ##################################
  googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || 'drive_folder_placeholder_id',
  googleClientEmail: process.env.GOOGLE_CLIENT_EMAIL || '',
  googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',

  // ##################################
  // WHATSAPP CONFIGURATION
  // Replace Cloud API Token
  // Replace Phone Number ID
  // Replace Business Account ID
  // ##################################
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  whatsappTemplateName: process.env.WHATSAPP_TEMPLATE_NAME || 'payment_success_viralcraftmedia',

  // ##################################
  // SMTP EMAIL CONFIGURATION
  // Nodemailer credentials details
  // ##################################
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM_EMAIL || 'support@viralcraftmedia.com',
  adminEmail: process.env.ADMIN_EMAIL || 'contact@viralcraftmedia.com',

  // ##################################
  // TEAM LOGGER CONFIGURATION
  // API Key
  // Workspace ID
  // Organization ID
  // ##################################
  teamLoggerApiKey: process.env.TEAM_LOGGER_API_KEY || '',
  teamLoggerWorkspaceId: process.env.TEAM_LOGGER_WORKSPACE_ID || '',
  teamLoggerOrgId: process.env.TEAM_LOGGER_ORG_ID || '',

  // ##################################
  // GOOGLE FORM URL
  // Replace Google Form URL Here
  // ##################################
  bulkOrdersFormUrl: process.env.BULK_ORDER_FORM_URL || 'https://docs.google.com/forms/d/e/1FAIpQLSdxUnXblTPVX5MbfuY-FuOObJORMvQlOJ7prn8nnjkNedG-jQ/viewform',

  // ##################################
  // WEB PUSH / VAPID CONFIGURATION
  // Generate keys: npx web-push generate-vapid-keys
  // ##################################
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:contact@viralcraftmedia.com',

  // ##################################
  // EMAILJS CONFIGURATION (Server-side only - Private Key never exposed to frontend)
  // Strict mode requires Private Key as accessToken
  // ##################################
  emailjsServiceId: process.env.EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || '',
  emailjsTemplateId: process.env.EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID || '',
  emailjsPublicKey: process.env.EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || '',
  emailjsPrivateKey: process.env.EMAILJS_PRIVATE_KEY || ''
};

// Helper: Environment-aware frontend base URL (single source of truth)
// Production: requires explicit https://<production-frontend> and never falls back to localhost
// Development: returns explicit config or localhost fallback
export function getFrontendBaseUrl() {
  const rawUrl = (config.appUrl || config.clientUrl || process.env.FRONTEND_URL || process.env.APP_URL || process.env.CLIENT_URL || '').trim().replace(/\/+$/, '');
  const isProduction = (process.env.NODE_ENV || config.nodeEnv || 'development').toLowerCase() === 'production';
  if (isProduction) {
    if (!rawUrl) {
      throw new Error('FRONTEND_URL / APP_URL / CLIENT_URL is not configured for production. Set APP_URL or CLIENT_URL to https://<production-frontend-domain> (e.g., https://viralcraftmedia-demo.vercel.app) in Render environment variables.');
    }
    if (!rawUrl.startsWith('https://')) {
      throw new Error(`Production frontend URL must use HTTPS: got "${rawUrl}"`);
    }
    if (rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1')) {
      throw new Error(`Production frontend URL must not be localhost: got "${rawUrl}"`);
    }
    return rawUrl;
  }
  return rawUrl || 'http://localhost:5173';
}
