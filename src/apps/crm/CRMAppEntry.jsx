import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AppCRM.jsx';
import LoginPage from '../../components/LoginPage.jsx';

const rolePath = (role) => {
  const normalized = role ? String(role).toUpperCase() : '';
  if (normalized === 'BACKUP_ADMIN' || normalized === 'backup_admin') return '/backup';
  if (normalized === 'SUPER_ADMIN') return '/admin';
  if (normalized === 'MANAGER') return '/manager';
  if (normalized === 'EMPLOYEE') return '/employee';
  if (normalized === 'CLIENT') return '/client';
  return '/dashboard';
};

function StartupScreen() {
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg, #0B1220 0%, #0F172A 50%, #111827 100%)',
      color: '#F8FAFC',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      padding: '24px',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        animation: reduceMotion ? 'none' : 'vcmFadeUp 700ms cubic-bezier(0.16, 1, 0.3, 1) both'
      }}>
        <img
          src="/logoooooooooo.png"
          alt="ViralCraft"
          style={{
            height: '64px',
            width: 'auto',
            objectFit: 'contain',
            animation: reduceMotion ? 'none' : 'vcmLogoIn 900ms cubic-bezier(0.16, 1, 0.3, 1) both'
          }}
        />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>ViralCraft CRM</div>
          <div style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '6px' }}>Preparing your workspace</div>
        </div>
        <div style={{
          width: '160px',
          height: '4px',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: '40%',
            background: '#F97316',
            borderRadius: '999px',
            animation: reduceMotion ? 'none' : 'vcmSlide 1.2s ease-in-out infinite'
          }} />
        </div>
      </div>
      <style>{`
        @keyframes vcmFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes vcmLogoIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes vcmSlide { 0% { left: -40%; } 100% { left: 100%; } }
      `}</style>
    </div>
  );
}

export default function CRMAppEntry() {
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 700);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !ready) return <StartupScreen />;
  if (user) return <Navigate to={rolePath(user.role)} replace />;
  return <LoginPage />;
}
