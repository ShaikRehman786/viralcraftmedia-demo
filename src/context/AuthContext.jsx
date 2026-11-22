import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PARTNER_LOGIN_PATH, isPartnerPath } from '../utils/partnerAuth.js';

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionEpoch, setSessionEpoch] = useState(1);

  // Clear all cached storage on session termination
  const clearSessionStorage = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('vcm_crm_session_active');
        window.sessionStorage.clear();
        window.localStorage.removeItem('partner_token');
        window.localStorage.removeItem('activeTab');
        window.localStorage.removeItem('crm_filter_cache');
        window.localStorage.removeItem('enquiry_filter_cache');
        window.localStorage.removeItem('project_filter_cache');
      }
    } catch (_) {}
  }, []);

  const markSessionActive = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('vcm_crm_session_active', '1');
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    // Login-first: a fresh application opening never restores a prior session.
    const isFreshLaunch = typeof window !== 'undefined' && window.sessionStorage.getItem('vcm_crm_session_active') !== '1';
    if (isFreshLaunch) {
      clearSessionStorage();
      setUser(null);
      setLoading(false);
      return;
    }

    const p = typeof window !== 'undefined' ? window.location.pathname : '';
    const isPublic = p === '/' ||
      p.startsWith('/services/') ||
      p === '/login' || 
      p.startsWith('/register') || 
      p.startsWith('/r/') || 
      p.startsWith(PARTNER_LOGIN_PATH) || 
      p.startsWith('/reset-password') || 
      p.startsWith('/invite') || 
      p.startsWith('/employee/invite') ||
      p.startsWith('/accept-invitation');

    if (isPublic) {
      setLoading(false);
      const idle = (typeof window !== 'undefined' && window.requestIdleCallback) || ((cb) => setTimeout(cb, 1500));
      const idleId = idle(() => {
        axios.get('/api/auth/me', { silent: true })
          .then(res => {
            if (res.data?.user) {
              setUser(res.data.user);
            }
          })
          .catch(() => {});
      }, { timeout: 3000 });

      return () => {
        if (typeof window !== 'undefined' && window.cancelIdleCallback) {
          window.cancelIdleCallback(idleId);
        } else {
          clearTimeout(idleId);
        }
      };
    }

    axios.get('/api/auth/me')
      .then(res => {
        setUser(res.data?.user || null);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback((userData) => {
    markSessionActive();
    // Increment epoch to guarantee React components unmount & re-mount afresh
    setSessionEpoch(prev => prev + 1);
    setUser(userData);
  }, [markSessionActive]);

  const logout = useCallback(async () => {
    try {
      if (isPartnerPath()) {
        await axios.post('/api/partners/auth/logout');
      } else {
        await axios.post('/api/auth/logout');
      }
    } catch (e) {
      // Backend logout attempt logged; proceed with clean frontend teardown
    } finally {
      clearSessionStorage();
      setUser(null);
      setSessionEpoch(prev => prev + 1);

      if (typeof window !== 'undefined') {
        if (isPartnerPath()) {
          window.location.href = PARTNER_LOGIN_PATH;
        } else {
          window.location.href = '/login';
        }
      }
    }
  }, [clearSessionStorage]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, sessionEpoch, clearSessionStorage }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
