// Reads the referral session stored by the Referral Redirect flow.
// Validates expiration and campaign presence.

export function clearReferralAttribution() {
  try {
    localStorage.removeItem('referral_partner_campaign_fallback');
  } catch (err) {}
}

export function getReferralAttribution() {
  try {
    const raw = localStorage.getItem('referral_partner_campaign_fallback');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.campaignId) {
      clearReferralAttribution();
      return undefined;
    }

    // Expiry check: if campaign has an expiryDate and it is passed, clear and ignore
    if (parsed.expiryDate && new Date(parsed.expiryDate) <= new Date()) {
      clearReferralAttribution();
      return undefined;
    }

    return parsed;
  } catch (err) {
    return undefined;
  }
}
