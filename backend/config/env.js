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

// Strict Test Mode Safety Assertion: prevent accidental LIVE charges
if (process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_')) {
  console.error('\n=================================================');
  console.error('❌ SAFETY ERROR: Razorpay Key is not a TEST/SANDBOX key (rzp_test_...).');
  console.error('Server halted to prevent accidental LIVE payment processing.');
  console.error('=================================================\n');
  process.exit(1);
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
  backupAdminPassword: process.env.BACKUP_ADMIN_PASSWORD || 'vcm@Backup2026',
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
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:contact@viralcraftmedia.com'
};
