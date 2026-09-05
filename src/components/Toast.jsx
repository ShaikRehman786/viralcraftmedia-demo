import React, { useState, useCallback, useRef, createContext, useContext } from 'react';
import { Check, AlertCircle, TriangleAlert, Info, X } from 'lucide-react';

let toastIdCounter = 0;

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const lastToastRef = useRef({ message: '', time: 0 });

  const addToast = useCallback((message, type = 'info', duration) => {
    const safeMsg = typeof message === 'string' ? message : String(message || '');
    const clean = safeMsg.replace(/AxiosError[^:]*:\s*/i, '').replace(/Request failed[^:]*:\s*/i, '').trim() || safeMsg;
    const now = Date.now();
    if (lastToastRef.current.message === clean && now - lastToastRef.current.time < 1800) return;
    lastToastRef.current = { message: clean, time: now };
    const id = ++toastIdCounter;
    const ms = duration ?? (type === 'error' ? 5000 : type === 'warning' ? 4500 : 3500);
    setToasts(prev => {
      const next = [...prev, { id, message: clean, type }];
      return next.length > 3 ? next.slice(next.length - 3) : next;
    });
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ms);
  }, []);

  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainerGlobal toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  // Fallback for callers outside provider (should not happen after App wrap) — local isolated
  const [toasts, setToasts] = useState([]);
  const lastToastRef = useRef({ message: '', time: 0 });
  const addToast = useCallback((message, type = 'info', duration) => {
    const safeMsg = typeof message === 'string' ? message : String(message || '');
    const clean = safeMsg.replace(/AxiosError[^:]*:\s*/i, '').trim() || safeMsg;
    const now = Date.now();
    if (lastToastRef.current.message === clean && now - lastToastRef.current.time < 1800) return;
    lastToastRef.current = { message: clean, time: now };
    const id = ++toastIdCounter;
    const ms = duration ?? (type === 'error' ? 5000 : 3500);
    setToasts(prev => [...prev, { id, message: clean, type }].slice(-3));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ms);
  }, []);
  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return { toasts, addToast, removeToast };
}

const iconMap = { success: Check, error: AlertCircle, warning: TriangleAlert, info: Info };
const accentMap = { success: '#10B981', error: '#EF4444', warning: '#F59E0B', info: '#3B82F6' };

function ToastContainerGlobal({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div className="vcm-toast-stack" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map(t => {
        const Icon = iconMap[t.type] || Info;
        const accent = accentMap[t.type] || '#6B7280';
        return (
          <div key={t.id} className={`vcm-toast vcm-toast--${t.type}`} role={t.type === 'error' ? 'alert' : 'status'} style={{ '--toast-accent': accent }}>
            <span className="vcm-toast-icon" aria-hidden="true"><Icon size={15} strokeWidth={2.2} /></span>
            <span className="vcm-toast-msg">{t.message}</span>
            <button type="button" className="vcm-toast-close" onClick={() => onRemove(t.id)} aria-label="Dismiss notification"><X size={13} strokeWidth={2.2} /></button>
          </div>
        );
      })}
    </div>
  );
}

// Legacy per-page container — kept for backward compat, now no-op (global handles). Wrapped to avoid duplicate stacks.
export default function ToastContainer({ toasts, onRemove }) {
  // If global provider exists, this per-page container should not render duplicate to avoid double stacks.
  // We detect via context — if provider exists, suppress local render.
  const ctx = useContext(ToastContext);
  if (ctx) return null;
  if (!toasts || toasts.length === 0) return null;
  return <ToastContainerGlobal toasts={toasts} onRemove={onRemove} />;
}
