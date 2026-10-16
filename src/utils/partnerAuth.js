// Single source of truth for referral-partner portal routing.
//
// Partner auth is isolated from the generic CRM flow:
// - Page URL:  /partner/login  (frontend route rendering PartnerLoginPage)
// - API:       POST /api/partners/login (dedicated partner endpoint)
// - Dashboard: /partner/* (PartnerProtectedRoute)
// Partners must never be sent to the generic CRM /login page.
export const PARTNER_PORTAL_PATH = '/partner';
export const PARTNER_LOGIN_PATH = '/partner/login';
export const PARTNER_API_LOGIN = '/api/partners/login';

// True for /partner and anything under it (but not lookalikes like /partnerxyz).
export const isPartnerPath = (pathname = '') =>
  pathname === PARTNER_PORTAL_PATH || pathname.startsWith(`${PARTNER_PORTAL_PATH}/`);

// True for dedicated partner API endpoints (never generic /api/auth/*).
export const isPartnerApiUrl = (url = '') => url.includes('/api/partners/');

// Absolute login link to copy/share for a partner account. Origin-aware so
// local builds produce http://localhost:5173/partner/login and production
// produces the production origin — never the generic /login.
export const getPartnerLoginUrl = (origin = '') => `${String(origin).replace(/\/+$/, '')}${PARTNER_LOGIN_PATH}`;
