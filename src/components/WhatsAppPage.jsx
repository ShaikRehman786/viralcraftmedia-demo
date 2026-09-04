import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  WifiOff,
  X
} from 'lucide-react';

axios.defaults.withCredentials = true;

const SOCKET_URL = import.meta.env.VITE_API_URL;
const getSocketUrl = () => SOCKET_URL;

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
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  
  if (diffMs < 0) return 'Just now';
  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffMin < 60) return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
  
  if (d.toDateString() === now.toDateString()) {
    return `Today at ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' at ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
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

  const statusAbortControllerRef = useRef(null);
  const messagesAbortControllerRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    if (statusAbortControllerRef.current) {
      statusAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    statusAbortControllerRef.current = controller;

    try {
      const res = await axios.get('/api/whatsapp/status', { signal: controller.signal });
      syncState(res.data);
      return res.data;
    } catch {
      return null;
    }
  }, [syncState]);

  const fetchMessages = useCallback(async () => {
    if (messagesAbortControllerRef.current) {
      messagesAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    messagesAbortControllerRef.current = controller;

    try {
      const res = await axios.get('/api/whatsapp/messages', { signal: controller.signal });
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
          if (statusAbortControllerRef.current?.signal.aborted) return;
          const retry = await fetchStatus().catch(() => null);
          if (!retry && !statusAbortControllerRef.current?.signal.aborted) {
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
      if (statusAbortControllerRef.current) statusAbortControllerRef.current.abort();
      if (messagesAbortControllerRef.current) messagesAbortControllerRef.current.abort();
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
    if (!window.confirm('Are you sure you want to disconnect your WhatsApp business session?')) return;
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
  const isConnected = state.connected;
  const statusClass = isConnected ? 'online' : (state.qrCode ? 'pending' : 'offline');

  const sentToday = useMemo(() => {
    return messages.filter(m => {
      if (m.type !== 'out') return false;
      const d = new Date(m.timestamp || m.createdAt);
      return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
    }).length;
  }, [messages]);

  const receivedToday = useMemo(() => {
    return messages.filter(m => {
      if (m.type !== 'in') return false;
      const d = new Date(m.timestamp || m.createdAt);
      return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
    }).length;
  }, [messages]);

  const connectionHealth = isConnected ? 'Optimal' : 'Offline';
  const businessAccountType = 'Linked Business Device';

  return (
    <div className="wa-page">

      {errorMsg && (
        <div className="wa-alert wa-alert-error animate-fade-in">
          <div className="wa-alert-icon">
            {errorMsg.includes('expired') ? <AlertTriangle size={16} /> : <XCircle size={16} />}
          </div>
          <span>{errorMsg}</span>
          <button className="wa-alert-close-btn" onClick={clearMessages}><X size={14} /></button>
        </div>
      )}

      {successMsg && (
        <div className="wa-alert wa-alert-success animate-fade-in">
          <div className="wa-alert-icon"><CheckCircle2 size={16} /></div>
          <span>{successMsg}</span>
          <button className="wa-alert-close-btn" onClick={clearMessages}><X size={14} /></button>
        </div>
      )}

      <div className="wa-header">
        <div className="wa-header-left">
          <h1>WhatsApp</h1>
          <p>Connect your official Admin WhatsApp number — CRM automation uses this number</p>
        </div>
        <div className="wa-header-right">
          <button className="wa-btn wa-btn-ghost wa-header-refresh-btn" onClick={fetchData} disabled={loading || !!actionLoading}>
            <RefreshCw size={14} className={loading ? 'wa-btn-spin' : ''} />
            <span className="wa-btn-text">Sync Status</span>
          </button>
        </div>
      </div>

      {/* PREMIUM STATUS BANNER */}
      <div className={`wa-status-banner ${isConnected ? 'connected' : (state.qrCode ? 'pending' : 'disconnected')}`}>
        <div className="wa-banner-main">
          <div className="wa-banner-icon-wrapper">
            {isConnected ? (
              <CheckCircle2 className="wa-banner-icon text-success" size={24} />
            ) : state.qrCode ? (
              <QrCode className="wa-banner-icon text-warning" size={24} />
            ) : (
              <WifiOff className="wa-banner-icon text-error" size={24} />
            )}
          </div>
          <div className="wa-banner-content">
            <div className="wa-banner-header-row">
              <h2>{isConnected ? (state.pushName || 'WhatsApp Business') : 'No Connected WhatsApp'}</h2>
              <span className={`wa-badge-status ${statusClass}`}>
                {isConnected ? 'Connected' : (state.qrCode ? 'Ready to Scan' : 'Disconnected')}
              </span>
            </div>
            <div className="wa-banner-meta-row">
              <span className="wa-meta-item">
                <span className="wa-meta-label">Number:</span> {isConnected && state.phoneNumber ? `+${state.phoneNumber}` : 'Not Connected'}
              </span>
              <span className="wa-meta-divider">•</span>
              <span className="wa-meta-item">
                <span className="wa-meta-label">Last Active:</span> {relativeTime(state.lastHeartbeat)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="wa-grid">

        {/* CONNECTED WHATSAPP CARD */}
        <div className="wa-card wa-card-full">
          <div className="wa-card-header">
            <div className="wa-card-title">
              <Smartphone size={16} />
              Connected WhatsApp
            </div>
            {!isConnected && !state.qrCode && (
              <button
                className="wa-btn wa-btn-primary"
                onClick={handleGenerateQR}
                disabled={actionLoading === 'generate'}
              >
                {actionLoading === 'generate' ? (
                  <><Loader2 size={14} className="wa-btn-spin" /> Requesting...</>
                ) : (
                  <><QrCode size={14} /> Link Account</>
                )}
              </button>
            )}
          </div>

          {!isConnected ? (
            <div className="wa-qr-area">
              {loading ? (
                <div className="wa-qr-placeholder">
                  <Loader2 size={32} className="wa-btn-spin" style={{ animation: 'wa-spin 1s linear infinite', opacity: 0.5 }} />
                  <p>Please wait, loading...</p>
                </div>
              ) : state.qrCode ? (
                <div className="wa-qr-layout">
                  <div className="wa-qr-frame">
                    <img src={state.qrCode} alt="WhatsApp QR Code" className="whatsapp-qr-img" />
                  </div>
                  <div className="wa-qr-instructions">
                    <h4>Link Business Account</h4>
                    <ol>
                      <li>Open <strong>WhatsApp</strong> on your phone</li>
                      <li>Tap <strong>Menu</strong> or <strong>Settings</strong></li>
                      <li>Select <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong></li>
                      <li>Point your phone camera to scan the QR code</li>
                    </ol>
                    <p className="wa-qr-warning">
                      * QR Code automatically refreshes for security. Scan promptly.
                    </p>
                    <div className="wa-qr-actions">
                      <button
                        className="wa-btn wa-btn-primary"
                        onClick={handleGenerateQR}
                        disabled={actionLoading === 'generate'}
                      >
                        {actionLoading === 'generate' ? <><Loader2 size={14} className="wa-btn-spin" /> Refreshing...</> : <><RefreshCw size={14} /> Refresh QR Code</>}
                      </button>
                      <button
                        className="wa-btn wa-btn-danger-outline"
                        onClick={handleClearSession}
                        disabled={actionLoading === 'clear'}
                      >
                        {actionLoading === 'clear' ? <><Loader2 size={14} className="wa-btn-spin" /> Clearing...</> : <><Trash2 size={14} /> Clear Credentials</>}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="wa-qr-empty-state">
                  {qrLoading ? (
                    <div className="wa-qr-placeholder">
                      <Loader2 size={32} className="wa-btn-spin" style={{ animation: 'wa-spin 1s linear infinite', opacity: 0.5 }} />
                      <p>Generating QR code connection request...</p>
                    </div>
                  ) : (
                    <div className="wa-qr-placeholder">
                      <Smartphone size={48} className="wa-qr-icon-hero" />
                      <h4>Link Your Business Phone</h4>
                      <p>Link your phone using a secure QR code to enable client notification triggers.</p>
                      <button
                        className="wa-btn wa-btn-primary mt-2"
                        onClick={handleGenerateQR}
                        disabled={actionLoading === 'generate'}
                        style={{ minHeight: '44px', padding: '10px 24px' }}
                      >
                        {actionLoading === 'generate' ? <><Loader2 size={14} className="wa-btn-spin" /> Connecting...</> : <><QrCode size={14} /> Link WhatsApp Now</>}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="wa-metric-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div className="wa-metric">
                <span className="wa-metric-value">+{state.phoneNumber || '—'}</span>
                <span className="wa-metric-label">Admin WhatsApp Number</span>
              </div>
              <div className="wa-metric">
                <span className="wa-metric-value">{state.pushName || '—'}</span>
                <span className="wa-metric-label">Business Name</span>
              </div>
              <div className="wa-metric">
                <span className="wa-metric-value">{formatTS(state.lastConnectedAt)}</span>
                <span className="wa-metric-label">Connected Since</span>
              </div>
              <div className="wa-metric">
                <span className="wa-metric-value">{connectionHealth}</span>
                <span className="wa-metric-label">Connection Health</span>
              </div>
            </div>
          )}
        </div>

        {/* CONNECTION DETAILS CARD */}
        <div className="wa-card">
          <div className="wa-card-header">
            <div className="wa-card-title">
              <History size={16} />
              Connection Details
            </div>
          </div>
          <dl className="wa-info-table">
            <dt>Connection Status</dt>
            <dd>
              <span className="wa-status-row" style={{ display: 'inline-flex' }}>
                <span className={`wa-status-dot ${statusClass}`} style={{ width: 8, height: 8 }} />
                {isConnected ? 'Connected' : (state.qrCode ? 'Scan QR Code' : 'Disconnected')}
              </span>
            </dd>
            <dt>Connection Restored</dt>
            <dd>{state.sessionRestored ? 'Yes' : 'No'}</dd>
            <dt>Last Active</dt>
            <dd>{relativeTime(state.lastHeartbeat)}</dd>
            <dt>Connection Attempts</dt>
            <dd>{state.reconnectCount}</dd>
            <dt>QR Requests</dt>
            <dd>{state.qrGeneratedCount}</dd>
          </dl>
        </div>

        {/* ACTION CENTER CARD */}
        <div className="wa-card wa-actions-card">
          <div className="wa-card-header">
            <div className="wa-card-title">
              <Activity size={16} />
              Action Center
            </div>
          </div>
          
          <div className="wa-actions-body">
            <div className="wa-action-section">
              <span className="wa-action-section-label">Management Actions</span>
              <div className="wa-action-buttons">
                <button
                  className="wa-btn wa-btn-ghost wa-action-btn"
                  onClick={fetchData}
                  disabled={loading || !!actionLoading}
                >
                  <RefreshCw size={14} className={loading ? 'wa-btn-spin' : ''} />
                  <span className="wa-btn-text">Refresh Status</span>
                </button>
                
                {isConnected && (
                  <button
                    className="wa-btn wa-btn-ghost wa-action-btn"
                    onClick={handleReconnect}
                    disabled={actionLoading === 'reconnect'}
                  >
                    {actionLoading === 'reconnect' ? (
                      <Loader2 size={14} className="wa-btn-spin" />
                    ) : (
                      <Wifi size={14} />
                    )}
                    <span className="wa-btn-text">
                      {actionLoading === 'reconnect' ? 'Reconnecting...' : 'Reconnect'}
                    </span>
                  </button>
                )}
                
                {!isConnected && (
                  <button
                    className="wa-btn wa-btn-primary wa-action-btn"
                    onClick={handleGenerateQR}
                    disabled={actionLoading === 'generate'}
                  >
                    {actionLoading === 'generate' ? (
                      <Loader2 size={14} className="wa-btn-spin" />
                    ) : (
                      <QrCode size={14} />
                    )}
                    <span className="wa-btn-text">
                      {actionLoading === 'generate' ? 'Generating...' : 'Generate QR'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            <hr className="wa-actions-divider" />

            <div className="wa-action-section destructive">
              <span className="wa-action-section-label">Connection Control</span>
              <div className="wa-action-buttons">
                {isConnected && (
                  <button
                    className="wa-btn wa-btn-danger wa-action-btn"
                    onClick={handleDisconnect}
                    disabled={actionLoading === 'disconnect'}
                  >
                    {actionLoading === 'disconnect' ? (
                      <Loader2 size={14} className="wa-btn-spin" />
                    ) : (
                      <LogOut size={14} />
                    )}
                    <span className="wa-btn-text">
                      {actionLoading === 'disconnect' ? 'Disconnecting...' : 'Disconnect'}
                    </span>
                  </button>
                )}
                
                <button
                  className="wa-btn wa-btn-danger-outline wa-action-btn"
                  onClick={handleClearSession}
                  disabled={actionLoading === 'clear'}
                >
                  {actionLoading === 'clear' ? (
                    <Loader2 size={14} className="wa-btn-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  <span className="wa-btn-text">
                    {actionLoading === 'clear' ? 'Clearing...' : 'Clear Session'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp automation is connection-only — chat history removed per product spec */}
        {/* Backend automation (message triggers, delivery) remains intact via whatsappService */}

      </div>
    </div>
  );
}
