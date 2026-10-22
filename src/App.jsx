import React, { useState, useEffect, createContext, useContext, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import CRMGlobalLoader from './components/shared/CRMGlobalLoader.jsx';
import { LoadingProvider } from './context/LoadingContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { PARTNER_LOGIN_PATH, isPartnerPath, isPartnerApiUrl } from './utils/partnerAuth.js';

const LandingPage = lazy(() => import('./components/LandingPage.jsx'));
const LoginPage = lazy(() => import('./components/LoginPage.jsx'));
const DashboardPage = lazy(() => import('./components/DashboardPage.jsx'));
const AcceptInvitationPage = lazy(() => import('./components/AcceptInvitationPage.jsx'));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage.jsx'));
const PartnerLoginPage = lazy(() => import('./components/PartnerLoginPage.jsx'));
const PartnerDashboardPage = lazy(() => import('./components/PartnerDashboardPage.jsx'));
const ReferralRedirect = lazy(() => import('./components/ReferralRedirect.jsx'));
const BackupPortalPage = lazy(() => import('./components/BackupPortalPage.jsx'));
const ClipEditingPage = lazy(() => import('./components/ClipEditingPage.jsx'));
const PodcastEditingPage = lazy(() => import('./components/PodcastEditingPage.jsx'));
const MarketingPage = lazy(() => import('./components/MarketingPage.jsx'));
const WebDevelopmentPage = lazy(() => import('./components/WebDevelopmentPage.jsx'));

import { AuthContext, useAuth, AuthProvider } from './context/AuthContext.jsx';
export { AuthContext, useAuth, AuthProvider };

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0E0E10', color: '#FFF' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span className="spinner" style={{ border: '3px solid rgba(255,106,0,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', width: '24px', height: '24px', animation: 'spin 1s linear infinite' }}></span>
          <p style={{ fontFamily: 'var(--font)', fontSize: '0.85rem', color: '#A1A1AA' }}>Validating session credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.role ? user.role.toUpperCase() : '';
  const allowed = allowedRoles ? allowedRoles.map(r => r.toUpperCase()) : [];

  if (allowed.length > 0 && !allowed.includes(userRole)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', color: '#111827', fontFamily: 'var(--font)' }}>
        <h2 style={{ fontWeight: '800', fontSize: '2rem', color: '#EF4444' }}>403 Forbidden</h2>
        <p style={{ marginTop: '8px', color: '#6B7280' }}>You do not have permission to access this resource.</p>
        <a href="/" style={{ marginTop: '16px', color: 'var(--accent)', textDecoration: 'underline', fontWeight: 'bold' }}>Back to Home</a>
      </div>
    );
  }

  return children;
}

export const PartnerAuthContext = createContext(null);

export function usePartnerAuth() {
  return useContext(PartnerAuthContext);
}

export function PartnerAuthProvider({ children }) {
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only invoke partner auth endpoint if the current route is within the partner portal
    if (!window.location.pathname.startsWith('/partner')) {
      setLoading(false);
      return;
    }
    axios.get('/api/partners/me', { silent: true })
      .then(res => {
        setPartner(res.data.partner);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <PartnerAuthContext.Provider value={{ partner, setPartner, loading }}>
      {children}
    </PartnerAuthContext.Provider>
  );
}

function PartnerProtectedRoute({ children }) {
  const { partner, loading } = usePartnerAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0B0C', color: '#FFF' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span className="spinner" style={{ border: '3px solid rgba(255,106,0,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', width: '24px', height: '24px', animation: 'spin 1s linear infinite' }}></span>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: '#A1A1AA' }}>Validating partner credentials...</p>
        </div>
      </div>
    );
  }

  if (!partner) {
    return <Navigate to={PARTNER_LOGIN_PATH} replace />;
  }

  return children;
}

function PublicFallback() {
  return <div style={{ minHeight: '100vh', background: '#FFFFFF' }} aria-hidden="true" />;
}

let sessionExpiredHandled = false;

function setupSessionInterceptor() {
  if (setupSessionInterceptor.done) return;
  setupSessionInterceptor.done = true;
  axios.interceptors.response.use(
    res => res,
    err => {
      const status = err.response?.status;
      const msg = (err.response?.data?.error || err.message || '').toLowerCase();
      const isSessionExpiry = status === 401 && (msg.includes('session') || msg.includes('expired') || msg.includes('please log in') || msg.includes('token expired') || msg.includes('re-authenticate'));
      const isAuthEndpoint = (err.config?.url || '').includes('/api/auth/');
      // Ignore auth endpoint 401s (login failures) and silent background checks
      if (isSessionExpiry && !isAuthEndpoint && err.config?.silent !== true && !sessionExpiredHandled) {
        // Partner-portal contexts must return to the dedicated partner login,
        // never the generic CRM /login (a partner session 401 previously
        // bounced partners into the wrong flow, including every fresh visit
        // to /partner/login via the background session check).
        const url = err.config?.url || '';
        const target = (isPartnerApiUrl(url) || isPartnerPath(window.location.pathname))
          ? PARTNER_LOGIN_PATH
          : '/login';
        // Never redirect a page that is already correct (prevents reload loops).
        if (window.location.pathname !== target) {
          sessionExpiredHandled = true;
          try { sessionStorage.setItem('sessionExpired', '1'); } catch {}
          // Clear any cached protected state is handled by AuthProvider on next load
          setTimeout(() => { window.location.href = target; }, 80);
        }
      }
      return Promise.reject(err);
    }
  );
}

export default function App() {
  useEffect(() => { setupSessionInterceptor(); }, []);
  return (
    <ErrorBoundary>
    <ToastProvider>
    <AuthProvider>
    <PartnerAuthProvider>
    <LoadingProvider>
    <Router>
      <Suspense fallback={<PublicFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path={PARTNER_LOGIN_PATH} element={<PartnerLoginPage />} />
          <Route path="/r/:referralCode" element={<ReferralRedirect />} />
          <Route 
            path="/partner/*" 
            element={
              <PartnerProtectedRoute>
                <PartnerDashboardPage />
              </PartnerProtectedRoute>
            } 
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<AcceptInvitationPage />} />
          <Route path="/accept-invitation/:token" element={<AcceptInvitationPage />} />
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
          <Route path="/invite/:token" element={<AcceptInvitationPage />} />
          <Route path="/invite" element={<AcceptInvitationPage />} />
          <Route path="/employee/invite/:token" element={<AcceptInvitationPage />} />
          <Route path="/employee/invite" element={<AcceptInvitationPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/services/clip-editing" element={
            <Suspense fallback={<CRMGlobalLoader fullScreen message="Loading Clip Editing..." />}>
              <ClipEditingPage />
            </Suspense>
          } />
          <Route path="/services/podcast-editing" element={
            <Suspense fallback={<CRMGlobalLoader fullScreen message="Loading Podcast Editing..." />}>
              <PodcastEditingPage />
            </Suspense>
          } />
          <Route path="/services/social-media-marketing" element={
            <Suspense fallback={<CRMGlobalLoader fullScreen message="Loading Marketing..." />}>
              <MarketingPage />
            </Suspense>
          } />
          <Route path="/services/web-design-development" element={
            <Suspense fallback={<CRMGlobalLoader fullScreen message="Loading Web Engineering..." />}>
              <WebDevelopmentPage />
            </Suspense>
          } />
          <Route path="/services/web-development" element={<Navigate to="/services/web-design-development" replace />} />
          <Route path="/services/branding" element={<Navigate to="/" replace />} />
          <Route path="/services/real-estate-editing" element={<Navigate to="/" replace />} />
          <Route 
            path="/backup/*" 
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'BACKUP_ADMIN', 'backup_admin']}>
                <BackupPortalPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/*" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/manager/*" 
            element={
              <ProtectedRoute allowedRoles={['MANAGER']}>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employee/*" 
            element={
              <ProtectedRoute allowedRoles={['EMPLOYEE']}>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/client/*" 
            element={
              <ProtectedRoute allowedRoles={['CLIENT']}>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Suspense>
    </Router>
    </LoadingProvider>
    </PartnerAuthProvider>
    </AuthProvider>
    </ToastProvider>
    </ErrorBoundary>
  );
}
