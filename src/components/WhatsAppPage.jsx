import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Smartphone,
  RefreshCw,
  LogOut,
  QrCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MessageCircle,
  UserCheck,
  Activity,
  Loader2,
  Trash2,
  History,
  Wifi,
  WifiOff
} from 'lucide-react';

axios.defaults.withCredentials = true;

const getSocketUrl = () => {
  const origin = window.location.origin;
  if (origin.includes('localhost:5173') || origin.includes('localhost:5174')) {
    return 'http://localhost:5000';
  }
  return origin;
};

function formatTS(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function relativeTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return formatTS(date);
}

export default function WhatsAppPage() {
  const [state, setState] = useState({
    connected: false,
    statusText: 'DISCONNECTED',
    phoneNumber: '',
    pushName: '',
    lastConnectedAt: null,
    qrCode: '',
    lastHeartbeat: null,
    reconnectCount: 0,
    qrGeneratedCount: 0,
    sessionRestored: false
  });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const socketRef = useRef(null);
  const pollingRef = useRef(null);

  const syncState = useCallback((data) => {
    setState(prev => ({
      ...prev,
      connected: data.connected || false,
      statusText: data.connected ? 'CONNECTED' : (data.statusText || 'DISCONNECTED'),
      phoneNumber: data.phoneNumber || '',
      pushName: data.pushName || '',
      lastConnectedAt: data.lastConnectedAt || null,
      qrCode: data.qrCode || '',
      lastHeartbeat: data.lastHeartbeat || null,
      reconnectCount: data.reconnectCount || 0,
      qrGeneratedCount: data.qrGeneratedCount || 0,
      sessionRestored: data.sessionRestored || false
    }));
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await axios.get('/api/whatsapp/status');
      syncState(res.data);
      return res.data;
    } catch {
      return null;
    }
  }, [syncState]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await axios.get('/api/whatsapp/messages');
      setMessages(res.data.data || []);
    } catch {
      // silent
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [statusData] = await Promise.all([
        fetchStatus().catch(() => null),
        fetchMessages().catch(() => null)
      ]);
      if (!statusData) {
        // Try once more after a brief delay
        setTimeout(async () => {
          const retry = await fetchStatus().catch(() => null);
          if (!retry) {
            setErrorMsg('Unable to load WhatsApp status. Your session may have expired. Please refresh the page.');
          }
        }, 500);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchStatus, fetchMessages]);

  useEffect(() => {
    fetchData();
    const socket = io(getSocketUrl(), { withCredentials: true });
    socketRef.current = socket;

    socket.on('whatsapp_qr', (data) => {
      setQrLoading(false);
      if (data.qrCode) {
        setState(prev => ({ ...prev, qrCode: data.qrCode, connected: false, statusText: 'DISCONNECTED' }));
        setSuccessMsg('');
        setErrorMsg('');
      }
    });

    socket.on('whatsapp_status', (data) => {
      setQrLoading(false);
      if (data.connected) {
        setState(prev => ({
          ...prev,
          connected: true,
          statusText: 'CONNECTED',
          qrCode: '',
          phoneNumber: data.phoneNumber || prev.phoneNumber,
          pushName: data.pushName || prev.pushName,
          lastConnectedAt: data.lastConnectedAt || prev.lastConnectedAt
        }));
        setSuccessMsg('WhatsApp is now connected.');
        setErrorMsg('');
        fetchMessages();
      } else {
        setState(prev => ({ ...prev, connected: false, statusText: data.statusText || 'DISCONNECTED' }));
      }
    });

    socket.on('whatsapp_new_message', () => {
      fetchMessages();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (state.connected) {
      const interval = setInterval(fetchStatus, 30000);
      pollingRef.current = interval;
      return () => clearInterval(interval);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [state.connected, fetchStatus]);

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleGenerateQR = async () => {
    clearMessages();
    setActionLoading('generate');
    setQrLoading(true);
    try {
      const res = await axios.post('/api/whatsapp/generate-qr');
      setSuccessMsg(res.data.message || 'QR generation triggered.');
      setTimeout(fetchStatus, 500);
    } catch (err) {
      setQrLoading(false);
      const msg = err.response?.data?.error || err.message || 'Failed to generate QR.';
      if (err.response?.status === 401 || err.response?.status === 403) {
        setErrorMsg('Session expired. Please refresh the page and log in again.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setActionLoading('');
    }
  };

  const handleReconnect = async () => {
    clearMessages();
    setActionLoading('reconnect');
    try {
      const res = await axios.post('/api/whatsapp/reconnect');
      setSuccessMsg(res.data.message || 'Reconnect triggered.');
      setTimeout(fetchStatus, 1500);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to reconnect.';
      if (err.response?.status === 401 || err.response?.status === 403) {
        setErrorMsg('Session expired. Please refresh the page and log in again.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setActionLoading('');
    }
  };

  const handleDisconnect = async () => {
    clearMessages();
    setActionLoading('disconnect');
    try {
      const res = await axios.post('/api/whatsapp/logout');
      setSuccessMsg(res.data.message || 'Disconnected successfully.');
      setState({
        connected: false, statusText: 'DISCONNECTED', phoneNumber: '', pushName: '',
        lastConnectedAt: null, qrCode: '', lastHeartbeat: null,
        reconnectCount: 0, qrGeneratedCount: 0, sessionRestored: false
      });
      setMessages([]);
      setTimeout(fetchStatus, 1000);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to disconnect.';
      if (err.response?.status === 401 || err.response?.status === 403) {
        setErrorMsg('Session expired. Please refresh the page and log in again.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setActionLoading('');
    }
  };

  const handleClearSession = async () => {
    clearMessages();
    if (!window.confirm('Clear session and wipe all saved credentials? You will need to scan a new QR code.')) return;
    setActionLoading('clear');
    try {
      const res = await axios.post('/api/whatsapp/clear-session');
      setSuccessMsg(res.data.message || 'Session cleared.');
      setState(prev => ({
        ...prev, connected: false, statusText: 'DISCONNECTED',
        qrCode: '', phoneNumber: '', pushName: '', lastConnectedAt: null
      }));
      setTimeout(fetchStatus, 2000);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to clear session.';
      setErrorMsg(msg);
    } finally {
      setActionLoading('');
    }
  };

  const recentMsgs = messages.slice(0, 15);

  if (loading && !state.connected) {
    return (
      <div className="wa-spinner">
        <Loader2 />
      </div>
    );
  }

  const isConnected = state.connected;
  const statusClass = isConnected ? 'online' : (state.qrCode ? 'pending' : 'offline');

  return (
    <div className="wa-page">

      {errorMsg && (
        <div className="wa-alert wa-alert-error">
          <div className="wa-alert-icon">
            {errorMsg.includes('expired') ? <AlertTriangle size={16} /> : <XCircle size={16} />}
          </div>
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="wa-alert wa-alert-success">
          <div className="wa-alert-icon"><CheckCircle2 size={16} /></div>
          <span>{successMsg}</span>
        </div>
      )}

      <div className="wa-header">
        <div className="wa-header-left">
          <h1>WhatsApp Automation</h1>
          <p>Manage your business WhatsApp connection and monitor messaging activity</p>
        </div>
        <div className="wa-header-right">
          <div className="wa-status-row">
            <span className={`wa-status-dot ${statusClass}`} />
            <span className="wa-status-label" style={{ color: isConnected ? '#22C55E' : (state.qrCode ? '#F59E0B' : '#EF4444') }}>
              {isConnected ? 'Connected' : (state.qrCode ? 'Scan QR' : 'Disconnected')}
            </span>
          </div>
          <button className="wa-btn wa-btn-ghost" onClick={fetchData} disabled={loading || !!actionLoading}>
            <RefreshCw size={14} className={loading ? 'wa-btn-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {isConnected && (
        <div className="wa-connected-banner">
          <CheckCircle2 />
          <div className="wa-connected-banner-content">
            <h3>WhatsApp Connected</h3>
            <p>{state.pushName ? `${state.pushName} · ` : ''}+{state.phoneNumber} · Last heartbeat: {relativeTime(state.lastHeartbeat)}</p>
          </div>
        </div>
      )}

      <div className="wa-grid">

        <div className="wa-card wa-card-full">
          <div className="wa-card-header">
            <div className="wa-card-title">
              <QrCode size={16} />
              Device Connection
            </div>
            {!isConnected && (
              <button
                className="wa-btn wa-btn-primary"
                onClick={handleGenerateQR}
                disabled={actionLoading === 'generate'}
              >
                {actionLoading === 'generate' ? (
                  <><Loader2 size={14} className="wa-btn-spin" /> Generating...</>
                ) : (
                  <><QrCode size={14} /> Generate QR</>
                )}
              </button>
            )}
          </div>

          {!isConnected ? (
            <div className="wa-qr-area">
              {state.qrCode ? (
                <>
                  <div className="wa-qr-frame">
                    <img src={state.qrCode} alt="WhatsApp QR Code" className="whatsapp-qr-img" />
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--fg-muted)', margin: 0, textAlign: 'center' }}>
                    Open WhatsApp on your phone → Menu → Linked Devices → Link a Device
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#F59E0B', margin: 0 }}>
                    QR auto-refreshes. Scan before it expires.
                  </p>
                  <div className="wa-qr-actions">
                    <button
                      className="wa-btn wa-btn-primary"
                      onClick={handleGenerateQR}
                      disabled={actionLoading === 'generate'}
                    >
                      {actionLoading === 'generate' ? <><Loader2 size={14} className="wa-btn-spin" /> Refreshing...</> : <><RefreshCw size={14} /> Regenerate QR</>}
                    </button>
                    <button
                      className="wa-btn wa-btn-danger"
                      onClick={handleClearSession}
                      disabled={actionLoading === 'clear'}
                    >
                      {actionLoading === 'clear' ? <><Loader2 size={14} className="wa-btn-spin" /> Clearing...</> : <><Trash2 size={14} /> Clear Session</>}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className={`wa-qr-frame${qrLoading ? ' loading' : ''}`}>
                    {qrLoading ? (
                      <div className="wa-qr-placeholder">
                        <Loader2 size={32} style={{ animation: 'wa-spin 1s linear infinite', opacity: 0.5 }} />
                        <p>Generating QR code...</p>
                      </div>
                    ) : (
                      <div className="wa-qr-placeholder">
                        <Smartphone size={48} style={{ opacity: 0.2 }} />
                        <p>Click "Generate QR" to link your business WhatsApp</p>
                      </div>
                    )}
                  </div>
                  {!qrLoading && (
                    <div className="wa-qr-actions">
                      <button
                        className="wa-btn wa-btn-ghost"
                        onClick={handleReconnect}
                        disabled={actionLoading === 'reconnect'}
                      >
                        {actionLoading === 'reconnect' ? <><Loader2 size={14} className="wa-btn-spin" /> Reconnecting...</> : <><RefreshCw size={14} /> Try Reconnect</>}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="wa-metric-grid">
              <div className="wa-metric">
                <span className="wa-metric-value">{state.pushName || '—'}</span>
                <span className="wa-metric-label">Profile Name</span>
              </div>
              <div className="wa-metric">
                <span className="wa-metric-value">+{state.phoneNumber || '—'}</span>
                <span className="wa-metric-label">Phone Number</span>
              </div>
              <div className="wa-metric">
                <span className="wa-metric-value">{state.sessionRestored ? 'Yes' : 'No'}</span>
                <span className="wa-metric-label">Session Restored</span>
              </div>
              <div className="wa-metric">
                <span className="wa-metric-value">{relativeTime(state.lastHeartbeat)}</span>
                <span className="wa-metric-label">Last Heartbeat</span>
              </div>
              <div className="wa-metric">
                <span className="wa-metric-value">{formatTS(state.lastConnectedAt)}</span>
                <span className="wa-metric-label">Connected Since</span>
              </div>
              <div className="wa-metric">
                <span className="wa-metric-value">{state.reconnectCount}</span>
                <span className="wa-metric-label">Reconnects</span>
              </div>
              <div className="wa-metric">
                <span className="wa-metric-value">{state.qrGeneratedCount}</span>
                <span className="wa-metric-label">QR Generated</span>
              </div>
              <div className="wa-metric">
                <span className="wa-metric-value">{messages.length}</span>
                <span className="wa-metric-label">Messages Logged</span>
              </div>
            </div>
          )}
        </div>

        <div className="wa-card">
          <div className="wa-card-header">
            <div className="wa-card-title">
              <Activity size={16} />
              Actions
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {isConnected && (
              <button
                className="wa-btn wa-btn-primary"
                onClick={handleReconnect}
                disabled={actionLoading === 'reconnect'}
              >
                {actionLoading === 'reconnect' ? <><Loader2 size={14} className="wa-btn-spin" /> Reconnecting...</> : <><RefreshCw size={14} /> Reconnect</>}
              </button>
            )}
            {isConnected && (
              <button
                className="wa-btn wa-btn-danger"
                onClick={handleDisconnect}
                disabled={actionLoading === 'disconnect'}
              >
                {actionLoading === 'disconnect' ? <><Loader2 size={14} className="wa-btn-spin" /> Disconnecting...</> : <><LogOut size={14} /> Disconnect</>}
              </button>
            )}
            <button
              className="wa-btn wa-btn-ghost"
              onClick={handleClearSession}
              disabled={actionLoading === 'clear'}
            >
              {actionLoading === 'clear' ? <><Loader2 size={14} className="wa-btn-spin" /> Clearing...</> : <><Trash2 size={14} /> Clear Session &amp; Wipe Credentials</>}
            </button>
          </div>
        </div>

        <div className="wa-card">
          <div className="wa-card-header">
            <div className="wa-card-title">
              <History size={16} />
              Session Info
            </div>
          </div>
          <dl className="wa-info-table">
            <dt>Status</dt>
            <dd>
              <span className="wa-status-row" style={{ display: 'inline-flex' }}>
                <span className={`wa-status-dot ${statusClass}`} style={{ width: 8, height: 8 }} />
                {state.statusText}
              </span>
            </dd>
            <dt>Connection</dt>
            <dd>{isConnected ? 'Active' : 'Inactive'}</dd>
            <dt>Session Restored</dt>
            <dd>{state.sessionRestored ? 'Yes (from disk)' : 'No (fresh auth needed)'}</dd>
            <dt>Last Heartbeat</dt>
            <dd>{formatTS(state.lastHeartbeat)}</dd>
            <dt>Reconnect Count</dt>
            <dd>{state.reconnectCount}</dd>
            <dt>QR Generated</dt>
            <dd>{state.qrGeneratedCount} times</dd>
          </dl>
        </div>

        <div className="wa-card wa-card-full">
          <div className="wa-card-header">
            <div className="wa-card-title">
              <MessageCircle size={16} />
              Recent Activity
            </div>
          </div>
          {recentMsgs.length === 0 ? (
            <div className="wa-empty">
              <MessageCircle size={32} />
              <p>No WhatsApp messages logged yet. Messages will appear here as they are sent and received.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
              {recentMsgs.map((msg, i) => (
                <div key={msg._id || i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 10px', borderRadius: 'var(--r-sm)',
                  background: msg.type === 'out' ? 'var(--bg)' : 'var(--bg-hover)',
                  fontSize: '0.8125rem'
                }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '10px', fontSize: '0.6875rem',
                    fontWeight: 600, textTransform: 'uppercase',
                    background: msg.type === 'out' ? '#DBEAFE' : '#F3E8FF',
                    color: msg.type === 'out' ? '#1D4ED8' : '#7C3AED'
                  }}>
                    {msg.type === 'out' ? 'OUT' : 'IN'}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--fg-muted)' }}>
                    {msg.body || '—'}
                  </span>
                  <span className="wa-timestamp">
                    <Clock size={10} />
                    {relativeTime(msg.timestamp || msg.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
