import React, { useState, useCallback } from 'react';

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

const typeStyles = {
  success: { bg: 'rgba(16, 185, 129, 0.95)', icon: '✓' },
  error: { bg: 'rgba(239, 68, 68, 0.95)', icon: '✕' },
  warning: { bg: 'rgba(245, 158, 11, 0.95)', icon: '!' },
  info: { bg: 'rgba(59, 130, 246, 0.95)', icon: 'i' }
};

export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '380px',
      width: 'calc(100% - 40px)'
    }}>
      {toasts.map(t => {
        const style = typeStyles[t.type] || typeStyles.success;
        return (
          <div
            key={t.id}
            style={{
              background: style.bg,
              color: '#FFF',
              padding: '14px 18px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: '600',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'slideInRight 0.3s ease',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)'
            }}
            onClick={() => onRemove(t.id)}
          >
            <span style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 'bold', flexShrink: 0
            }}>
              {style.icon}
            </span>
            <span style={{ flex: 1 }}>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
