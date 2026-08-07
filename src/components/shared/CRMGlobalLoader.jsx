import React, { useState, useEffect } from 'react';

const LOADING_TEXTS = [
  'Loading ViralCraftMedia...',
  'Preparing your workspace...',
  'Fetching secure data...',
  'Almost ready...',
  'Synchronizing...',
  'Please wait...'
];

export default function CRMGlobalLoader({
  fullScreen = true,
  message = null,
  subMessage = null,
  size = 'md'
}) {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    if (message) return; // Use custom fixed message if provided
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % LOADING_TEXTS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [message]);

  const currentMessage = message || LOADING_TEXTS[textIndex];

  const logoWidth = size === 'sm' ? '36px' : size === 'lg' ? '72px' : '52px';
  const spinnerSize = size === 'sm' ? '60px' : size === 'lg' ? '110px' : '84px';

  const loaderContent = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    }}>
      {/* Animated Logo Container with Pulsing Ring */}
      <div style={{
        position: 'relative',
        width: spinnerSize,
        height: spinnerSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        {/* Outer Rotating Glowing Ring */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: 'var(--accent, #F97316)',
          borderRightColor: 'rgba(249, 115, 22, 0.4)',
          borderBottomColor: 'transparent',
          animation: 'crmLoaderSpin 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite'
        }} />

        {/* Inner Pulsing Ring */}
        <div style={{
          position: 'absolute',
          top: '6px',
          left: '6px',
          right: '6px',
          bottom: '6px',
          borderRadius: '50%',
          border: '2px solid rgba(249, 115, 22, 0.15)',
          animation: 'crmLoaderPulse 2s ease-in-out infinite'
        }} />

        {/* ViralCraftMedia Logo */}
        <img
          src="/logoooooooooo.png"
          alt="ViralCraftMedia Loading"
          style={{
            width: logoWidth,
            height: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 8px rgba(249, 115, 22, 0.3))',
            animation: 'crmLogoFloat 3s ease-in-out infinite'
          }}
        />
      </div>

      {/* Rotating Status Message */}
      <div style={{
        fontSize: size === 'sm' ? '0.85rem' : '0.98rem',
        fontWeight: '600',
        color: 'var(--gray-900, #111827)',
        marginBottom: '4px',
        transition: 'all 0.3s ease'
      }}>
        {currentMessage}
      </div>

      {/* Sub-Message */}
      <div style={{
        fontSize: '0.78rem',
        color: 'var(--gray-500, #6B7280)',
        maxWidth: '280px'
      }}>
        {subMessage || 'ViralCraftMedia Enterprise Protection System'}
      </div>

      {/* Keyframe Animation Styles */}
      <style>{`
        @keyframes crmLoaderSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes crmLoaderPulse {
          0%, 100% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes crmLogoFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}
