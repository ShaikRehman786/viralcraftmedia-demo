import React, { useState, useEffect, createContext, useContext, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import ErrorBoundary from '../../components/ErrorBoundary.jsx';
import CRMGlobalLoader from '../../components/shared/CRMGlobalLoader.jsx';
import { LoadingProvider } from '../../context/LoadingContext.jsx';
import { ToastProvider } from '../../components/Toast.jsx';
import { PARTNER_LOGIN_PATH, isPartnerPath, isPartnerApiUrl } from '../../utils/partnerAuth.js';

const LoginPage = lazy(() => import('../../components/LoginPage.jsx'));
const DashboardPage = lazy(() => import('../../components/DashboardPage.jsx'));
const AcceptInvitationPage = lazy(() => import('../../components/AcceptInvitationPage.jsx'));
const ResetPasswordPage = lazy(() => import('../../components/ResetPasswordPage.jsx'));
const PartnerLoginPage = lazy(() => import('../../components/PartnerLoginPage.jsx'));
const PartnerDashboardPage = lazy(() => import('../../components/PartnerDashboardPage.jsx'));
const BackupPortalPage = lazy(() => import('../../components/BackupPortalPage.jsx'));
const CRMLandingPortal = lazy(() => import('./CRMLandingPortal.jsx'));

import { AuthContext, AuthProvider, useAuth } from '../../context/AuthContext.jsx';
export { AuthContext, AuthProvider, useAuth };

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, sessionEpoch } = useAuth();

  if (loading) {
    return <CRMGlobalLoader fullScreen message="Authenticating session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role ? user.role.toUpperCase() : '';
  const isSuperAdmin = role === 'SUPER_ADMIN';

  if (allowedRoles) {
    const upperAllowed = allowedRoles.map(r => r.toUpperCase());
    if (!upperAllowed.includes(role) && !isSuperAdmin) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#fff', background: '#0e0e10', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2>Access Denied</h2>
          <p style={{ color: '#94a3b8', marginTop: '8px' }}>Your current role ({role}) does not have permission to view this CRM portal.</p>
          <a href="/login" style={{ marginTop: '20px', color: '#F97316' }}>Return to Login</a>
        </div>
      );
    }
  }

  return (
    <div key={`${user?._id || 'guest'}_${sessionEpoch || 1}`} style={{ minHeight: '100%', width: '100%' }}>
      {children}
    </div>
  );
}

export default function AppCRM() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LoadingProvider>
          <ToastProvider>
            <Router>
              <Suspense fallback={<CRMGlobalLoader fullScreen message="Loading CRM Module..." />}>
                <Routes>
                  {/* Root: Enterprise CRM Application Landing & Portal Gateway */}
                  <Route path="/" element={<CRMLandingPortal />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<LoginPage />} />
                  <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
                  <Route path="/invite" element={<AcceptInvitationPage />} />
                  <Route path="/employee/invite/:token" element={<AcceptInvitationPage />} />
                  <Route path="/employee/invite" element={<AcceptInvitationPage />} />
                  <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

                  {/* Partner Portal Routes */}
                  <Route path={PARTNER_LOGIN_PATH} element={<PartnerLoginPage />} />
                  <Route path="/partner" element={<Navigate to="/partner/dashboard" replace />} />
                  <Route path="/partner/dashboard" element={<PartnerDashboardPage />} />
                  <Route path="/partner/campaigns" element={<PartnerDashboardPage />} />
                  <Route path="/partner/payouts" element={<PartnerDashboardPage />} />
                  <Route path="/partner/materials" element={<PartnerDashboardPage />} />
                  <Route path="/partner/profile" element={<PartnerDashboardPage />} />
                  <Route path="/partner/settings" element={<PartnerDashboardPage />} />

                  {/* Backup Portal */}
                  <Route 
                    path="/backup/*" 
                    element={
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'BACKUP_ADMIN', 'backup_admin']}>
                        <BackupPortalPage />
                      </ProtectedRoute>
                    } 
                  />

                  {/* Operational Dashboards */}
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

                  {/* Fallback to Dashboard */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </Router>
          </ToastProvider>
        </LoadingProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
