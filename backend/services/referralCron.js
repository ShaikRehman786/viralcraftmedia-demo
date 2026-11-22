import { expireCampaigns } from './referralService.js';

// Lifecycle guard: never run two scans concurrently (boot scan vs scheduled
// tick, or overlapping slow ticks). Always released via try/finally.
let scanInProgress = false;
let startupTimeout = null;
let recurringInterval = null;
let isShuttingDown = false;

export const checkCampaignExpirations = async () => {
  if (isShuttingDown) {
    console.log('[MONITOR] Shutdown in progress; ignoring referral scan request.');
    return;
  }
  if (scanInProgress) {
    console.log('[MONITOR] Referral scan already running; skipping overlapping tick.');
    return;
  }
  scanInProgress = true;
  try {
    await expireCampaigns();
  } catch (err) {
    console.error('[Referral Campaign Monitor Error]:', err.message);
  } finally {
    scanInProgress = false;
  }
};

// Expose periodic scan function
export const startReferralCampaignMonitor = () => {
  if (isShuttingDown) {
    console.log('[MONITOR] Shutdown in progress; ignoring monitor start request.');
    return;
  }
  if (startupTimeout || recurringInterval) {
    console.log('[MONITOR] Referral campaign monitor is already running.');
    return;
  }

  // Execute scan on startup after 10 seconds delay
  startupTimeout = setTimeout(() => {
    startupTimeout = null;
    console.log('[MONITOR] Running initial referral campaigns scan...');
    checkCampaignExpirations();
  }, 10000);

  // Run scan every 12 hours (12 * 60 * 60 * 1000 ms)
  recurringInterval = setInterval(() => {
    console.log('[MONITOR] Running scheduled referral campaigns scan...');
    checkCampaignExpirations();
  }, 12 * 60 * 60 * 1000);
};

export const stopReferralCampaignMonitor = () => {
  isShuttingDown = true;
  if (startupTimeout) {
    clearTimeout(startupTimeout);
    startupTimeout = null;
  }
  if (recurringInterval) {
    clearInterval(recurringInterval);
    recurringInterval = null;
  }
  console.log('[MONITOR] Referral campaign monitor stopped.');
};
