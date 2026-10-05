/**
 * Single shared resolver: notification -> CRM destination tab.
 *
 * Uses only data already stored on the notification document
 * (referenceModel / referenceId / actionUrl / metadata / title) and the
 * application's existing tab-based routing (DashboardPage tabs). No new
 * routes are created; navigation targets are existing tabs only.
 *
 * Frontend role gating here mirrors the existing ROLE_ACCESS maps in
 * DashboardPage/TopBar and is NOT a security boundary — backend
 * authorization is untouched and still enforced by the APIs.
 */

const TAB_ACCESS = {
  overview: ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE'],
  projects: ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE', 'CLIENT'],
  calendar: ['SUPER_ADMIN'],
  staff: ['SUPER_ADMIN', 'MANAGER'],
  logs: ['SUPER_ADMIN'],
  backup: ['SUPER_ADMIN', 'BACKUP_ADMIN'],
  enquiries: ['SUPER_ADMIN', 'MANAGER'],
  whatsapp: ['SUPER_ADMIN', 'MANAGER'],
  payments: ['CLIENT', 'SUPER_ADMIN'],
  'notification-center': ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE'],
  referrals: ['SUPER_ADMIN'],
};

const KNOWN_TABS = new Set(Object.keys(TAB_ACCESS));

function roleCanAccess(tab, role) {
  const allowed = TAB_ACCESS[tab];
  if (!allowed) return false;
  return allowed.includes((role || '').toUpperCase());
}

// Stored actionUrls predate path-segment routing (e.g. "/admin?tab=projects",
// "/employee", "/partner/commissions"). Translate them to existing tabs.
function parseLegacyActionUrl(actionUrl) {
  if (!actionUrl || typeof actionUrl !== 'string') return null;
  const u = actionUrl.trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return { external: u };
  const tabIdx = u.indexOf('tab=');
  if (u.startsWith('/admin') && tabIdx !== -1) {
    const tab = u.slice(tabIdx + 4).split('&')[0].trim();
    if (KNOWN_TABS.has(tab)) return { tab };
    return null;
  }
  if (u === '/employee' || u.startsWith('/employee/')) return { tab: 'projects' };
  if (u.startsWith('/partner')) return { tab: 'referrals' };
  return null;
}

// Existing notification reference models -> existing CRM tabs.
function tabForReferenceModel(referenceModel) {
  switch ((referenceModel || '').trim()) {
    case 'Task':
    case 'Project':
      return 'projects';
    case 'Enquiry':
      return 'enquiries';
    case 'Order':
    case 'Payment':
      return 'payments';
    case 'User':
      return 'staff';
    case 'SecurityIncident':
      return 'logs';
    case 'Referral':
    case 'Partner':
    case 'Commission':
    case 'Campaign':
      return 'referrals';
    default:
      return null;
  }
}

// Fallback when a notification carries no usable reference/actionUrl.
// Ordered so security & financial types win over generic keywords.
function tabForTitle(title) {
  const t = (title || '').toLowerCase();
  if (!t) return null;
  if (/secur|suspicious|locked|breach|blocked/.test(t)) return 'logs';
  if (/payment|invoice|commission|payout|refund|revenue/.test(t)) return 'payments';
  if (/enquir|lead/.test(t)) return 'enquiries';
  if (/referral/.test(t)) return 'referrals';
  if (/staff|invit|employee|register|role/.test(t)) return 'staff';
  if (/task|project|revision|submi|deliver|approv|comment|note|feedback/.test(t)) return 'projects';
  if (/whatsapp|message/.test(t)) return 'whatsapp';
  return null;
}

function focusIdFor(notification) {
  if (notification?.referenceId) return String(notification.referenceId);
  const m = notification?.metadata || {};
  return (
    m.taskId || m.projectId || m.enquiryId || m.leadId ||
    m.orderId || m.paymentId || m.userId || ''
  );
}

/**
 * Resolve where a notification click should navigate.
 * Returns one of:
 *  { tab, focusId }  -> navigate to existing CRM tab (focusId is a hint only)
 *  { external }      -> absolute URL, open in a new tab
 *  { error: 'unauthorized' } -> role may not view the target
 *  { error: 'unavailable' }  -> no usable destination stored
 */
export function resolveNotificationTarget(notification, role) {
  if (!notification) return { error: 'unavailable' };

  const parsed = parseLegacyActionUrl(notification.actionUrl);
  if (parsed?.external) return { external: parsed.external };

  const tab =
    tabForReferenceModel(notification.referenceModel) ||
    (parsed?.tab ?? null) ||
    (notification?.metadata?.projectId || notification?.metadata?.taskId ? 'projects' : null) ||
    (notification?.metadata?.enquiryId || notification?.metadata?.leadId ? 'enquiries' : null) ||
    (notification?.metadata?.orderId || notification?.metadata?.paymentId ? 'payments' : null) ||
    tabForTitle(notification.title);

  if (!tab || !KNOWN_TABS.has(tab)) return { error: 'unavailable' };
  if (!roleCanAccess(tab, role)) return { error: 'unauthorized' };
  return { tab, focusId: focusIdFor(notification) };
}

export const NOTIFICATION_TAB_ACCESS = TAB_ACCESS;
