import React, { useState, useCallback, useRef } from 'react';
import { Check, AlertCircle, TriangleAlert, Info, X } from 'lucide-react';

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const lastToastRef = useRef({ message: '', time: 0 });

  const addToast = useCallback((message, type = 'info', duration) => {
    const safeMsg = typeof message === 'string' ? message : String(message || '');
    const clean = safeMsg.replace(/AxiosError.*/i, '').replace(/Request failed.*/i, '').trim() || safeMsg;
    // Deduplicate: same message within 1.8s
    const now = Date.now();
    if (lastToastRef.current.message === clean && now - lastToastRef.current.time < 1800) return;
    lastToastRef.current = { message: clean, time: now };

    const id = ++toastIdCounter;
    // sensible duration per type if not provided
    const ms = duration ?? (type === 'error' ? 5000 : type === 'warning' ? 4500 : 3500);
    setToasts(prev => {
      // prevent stacking more than 3
      const next = [...prev, { id, message: clean, type }];
      return next.length > 3 ? next.slice(next.length - 3) : next;
    });
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, ms);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

const iconMap = {
  success: Check,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
};

const accentMap = {
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="vcm-toast-stack" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map(t => {
        const Icon = iconMap[t.type] || Info;
        const accent = accentMap[t.type] || '#6B7280';
        return (
          <div
            key={t.id}
            className={`vcm-toast vcm-toast--${t.type}`}
            role={t.type === 'error' ? 'alert' : 'status'}
            style={{ '--toast-accent': accent }}
          >
            <span className="vcm-toast-icon" aria-hidden="true"><Icon size={15} strokeWidth={2.2} /></span>
            <span className="vcm-toast-msg">{t.message}</span>
            <button type="button" className="vcm-toast-close" onClick={() => onRemove(t.id)} aria-label="Dismiss notification">
              <X size={13} strokeWidth={2.2} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
