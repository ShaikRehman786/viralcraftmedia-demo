// Reads the referral session stored by the Referral Redirect flow.
// The server prefers the httpOnly-readable `referral_partner_campaign` cookie,
// but this localStorage fallback covers browsers where the cookie could not be
// set or was cleared. It is attached to enquiry submissions as `referralDetails`
// so the visitor is never asked to enter referral information manually.
export function getReferralAttribution() {
  try {
    const raw = localStorage.getItem('referral_partner_campaign_fallback');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed && parsed.campaignId ? parsed : undefined;
  } catch (err) {
    return undefined;
  }
}
