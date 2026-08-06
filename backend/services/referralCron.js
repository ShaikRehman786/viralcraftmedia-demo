import ReferralCampaign from '../models/ReferralCampaign.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendEmail } from './emailService.js';
import { logEvent } from './loggingService.js';

export const checkCampaignExpirations = async () => {
  const now = new Date();
  
  try {
    // 1. Process campaigns that have expired
    const expiredCampaigns = await ReferralCampaign.find({
      status: 'ACTIVE',
      expiryDate: { $lte: now }
    }).populate('partner');

    for (const campaign of expiredCampaigns) {
      campaign.status = 'EXPIRED';
      await campaign.save();

      await logEvent({
        action: 'CAMPAIGN_EXPIRED',
        details: { message: `Campaign "${campaign.campaignName}" auto-expired.`, campaignCode: campaign.referralCode }
      });

      // Notify Partner (In-App + Email)
      if (campaign.partner) {
        const partnerNotify = new Notification({
          user: campaign.partner._id,
          userModel: 'Partner',
          title: 'Referral Campaign Expired',
          message: `Your campaign link "${campaign.campaignName}" has expired.`,
          type: 'warning',
          priority: 'high',
          icon: 'AlertTriangle',
          actionUrl: '/partner/campaigns'
        });
        await partnerNotify.save();

        try {
          await sendEmail({
            to: campaign.partner.email,
            subject: `Referral Campaign Expired: ${campaign.campaignName}`,
            html: `
              <h3>Referral Link Expired</h3>
              <p>Hello ${campaign.partner.ownerName},</p>
              <p>This is to notify you that your referral campaign link <strong>${campaign.campaignName}</strong> has expired.</p>
              <p>New visitor clicks will no longer be tracked. Please request a new campaign from the ViralCraft Media admin team.</p>
            `
          });
        } catch (emailErr) {
          console.error('[Cron] Failed to send expiration email to partner:', emailErr.message);
        }
      }

      // Notify Admins
      const admins = await User.find({ role: 'SUPER_ADMIN' });
      for (const admin of admins) {
        const adminNotify = new Notification({
          user: admin._id,
          userModel: 'User',
          title: 'Referral Campaign Expired',
          message: `Campaign "${campaign.campaignName}" for partner "${campaign.partner?.agencyName || 'N/A'}" has expired.`,
          type: 'warning',
          priority: 'medium',
          icon: 'AlertTriangle',
          actionUrl: '/admin?tab=referrals'
        });
        await adminNotify.save();
      }
    }

    // 2. Process campaigns expiring soon (within 3 days)
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const expiringSoonCampaigns = await ReferralCampaign.find({
      status: 'ACTIVE',
      expiryDate: { $gt: now, $lte: threeDaysFromNow },
      expiringSoonAlertSent: false
    }).populate('partner');

    for (const campaign of expiringSoonCampaigns) {
      campaign.expiringSoonAlertSent = true;
      await campaign.save();

      // Notify Partner
      if (campaign.partner) {
        const partnerNotify = new Notification({
          user: campaign.partner._id,
          userModel: 'Partner',
          title: 'Campaign Expiring Soon',
          message: `Your campaign "${campaign.campaignName}" will expire within 3 days.`,
          type: 'warning',
          priority: 'high',
          icon: 'Clock3',
          actionUrl: '/partner/campaigns'
        });
        await partnerNotify.save();

        try {
          await sendEmail({
            to: campaign.partner.email,
            subject: `Referral Campaign Expiring Soon: ${campaign.campaignName}`,
            html: `
              <h3>Referral Link Expiring Soon</h3>
              <p>Hello ${campaign.partner.ownerName},</p>
              <p>Your referral campaign link <strong>${campaign.campaignName}</strong> is scheduled to expire on ${campaign.expiryDate.toLocaleDateString()}.</p>
              <p>Please coordinate with us if you need to extend this campaign.</p>
            `
          });
        } catch (emailErr) {}
      }
    }

  } catch (err) {
    console.error('[Referral Campaign Monitor Error]:', err.message);
  }
};

// Expose periodic scan function
export const startReferralCampaignMonitor = () => {
  // Execute scan on startup after 10 seconds delay
  setTimeout(() => {
    console.log('[MONITOR] Running initial referral campaigns scan...');
    checkCampaignExpirations();
  }, 10000);

  // Run scan every 12 hours (12 * 60 * 60 * 1000 ms)
  setInterval(() => {
    console.log('[MONITOR] Running scheduled referral campaigns scan...');
    checkCampaignExpirations();
  }, 12 * 60 * 60 * 1000);
};
