import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL;
const getSocketUrl = () => SOCKET_URL;
import {
  Bell, CheckCheck, Trash2, X, Search, Filter, ChevronDown,
  Clock, ArrowUpDown, Loader2, Inbox
} from 'lucide-react';

function formatTimeAgo(date) {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTypeDot(type) {
  const colors = {
    info: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    critical: '#DC2626'
  };
  return colors[type] || '#6B7280';
}

function getPriorityLabel(p) {
  const labels = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
  return labels[p] || 'Info';
}

function getIconComponent(iconName) {
  const icons = {
    Bell, CheckCheck, Trash2, X, Clock, Inbox,
    AlertTriangle: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    CheckCircle: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    XCircle: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
    DollarSign: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    UserPlus: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
    UserCheck: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>,
    MessageCircle: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
    FolderOpen: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
    FileText: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    CreditCard: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    LogIn: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
    LogOut: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    Mail: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    AlertOctagon: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    ClipboardList: (props) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>,
  };
  return icons[iconName] || Bell;
}

export default function NotificationCenterPage({ user, formatTimeAgo: externalFormatTimeAgo }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [readFilter, setReadFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const scrollRef = useRef(null);
  const searchTimeout = useRef(null);

  const abortControllerRef = useRef(null);

  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const params = { page: pageNum, limit: 20 };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (readFilter) params.read = readFilter;

      const res = await axios.get('/api/notifications', { params, signal: controller.signal });
      const { data, unreadCount: unc, pagination } = res.data;

      if (append) {
        setNotifications(prev => [...prev, ...data]);
      } else {
        setNotifications(data);
      }
      setUnreadCount(unc);
      setTotal(pagination.total);
      setHasMore(pagination.hasMore);
      setPage(pageNum);
    } catch (err) {
      if (axios.isCancel(err)) {
        return;
      }
      // silent
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [search, typeFilter, priorityFilter, readFilter]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchNotifications(1);
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [search, typeFilter, priorityFilter, readFilter]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    await fetchNotifications(page + 1, true);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current || !hasMore || loadingMore) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadMore();
      }
    };
    const el = scrollRef.current;
    if (el) el.addEventListener('scroll', handleScroll);
    return () => { if (el) el.removeEventListener('scroll', handleScroll); };
  }, [hasMore, loadingMore, page]);

  useEffect(() => {
    if (!user?._id) return;
    const socket = io(getSocketUrl(), { withCredentials: true });
    socket.emit('register', user._id);
    socket.on('new_notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      setTotal(prev => prev + 1);
    });
    return () => socket.disconnect();
  }, [user?._id]);

  const handleMarkRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (e) {}
  };

  const handleBulkMarkRead = async () => {
    if (selectedIds.size === 0) return;
    try {
      await axios.put('/api/notifications/bulk-read', { ids: Array.from(selectedIds) });
      setNotifications(prev => prev.map(n => selectedIds.has(n._id) ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - selectedIds.size));
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (e) {}
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      await axios.delete('/api/notifications/bulk-delete', { data: { ids: Array.from(selectedIds) } });
      setNotifications(prev => prev.filter(n => !selectedIds.has(n._id)));
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (e) {}
  };

  const handleClearRead = async () => {
    try {
      await axios.delete('/api/notifications/clear-read');
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch (e) {}
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (e) {}
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const timeAgo = externalFormatTimeAgo || formatTimeAgo;

  return (
    <div className="notif-center">
      <div className="notif-center-header">
        <div className="notif-center-title-row">
          <h2 className="section-title">
            <Bell size={20} />
            Notification Center
          </h2>
          <div className="notif-center-stats">
            <span className="badge badge-accent">{unreadCount} unread</span>
            <span className="text-muted text-xs">{total} total</span>
          </div>
        </div>

        <div className="notif-center-toolbar">
          <div className="notif-center-search">
            <Search size={16} />
            <input
              type="text"
              className="input"
              placeholder="Search notifications..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="notif-clear-search" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="notif-center-actions">
            <button
              className={`btn btn-ghost btn-sm${showFilters ? ' btn-active' : ''}`}
              onClick={() => setShowFilters(prev => !prev)}
            >
              <Filter size={14} />
              Filters
              {(typeFilter || priorityFilter || readFilter) && <span className="badge-dot" />}
            </button>

            <button
              className={`btn btn-ghost btn-sm${selectMode ? ' btn-active' : ''}`}
              onClick={() => { setSelectMode(prev => !prev); setSelectedIds(new Set()); }}
            >
              <CheckCheck size={14} />
              Select
            </button>

            {selectMode && selectedIds.size > 0 && (
              <>
                <button className="btn btn-primary btn-sm" onClick={handleBulkMarkRead}>
                  <CheckCheck size={14} /> Mark Read ({selectedIds.size})
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                  <Trash2 size={14} /> Delete ({selectedIds.size})
                </button>
              </>
            )}

            {unreadCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}

            <button className="btn btn-ghost btn-sm" onClick={handleClearRead}>
              <Trash2 size={14} />
              Clear read
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="notif-center-filters">
            <div className="notif-filter-group">
              <label className="notif-filter-label">Type</label>
              <select className="select notif-filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="">All Types</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="notif-filter-group">
              <label className="notif-filter-label">Priority</label>
              <select className="select notif-filter-select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="notif-filter-group">
              <label className="notif-filter-label">Status</label>
              <select className="select notif-filter-select" value={readFilter} onChange={e => setReadFilter(e.target.value)}>
                <option value="">All</option>
                <option value="false">Unread</option>
                <option value="true">Read</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="notif-center-body" ref={scrollRef}>
        {loading && notifications.length === 0 ? (
          <div className="notif-center-loading">
            <Loader2 size={32} className="spinner" />
            <p>Please wait, loading...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-center-empty">
            <div className="notif-empty-icon">
              <Inbox size={48} />
            </div>
            <h3>No notifications found</h3>
            <p>
              {search || typeFilter || priorityFilter || readFilter
                ? 'Try adjusting your search or filters.'
                : 'You are all caught up! New notifications will appear here.'}
            </p>
          </div>
        ) : (
          <div className="notif-center-list">
            {notifications.map(n => {
              const IconComp = getIconComponent(n.icon || 'Bell');
              const dotColor = getTypeDot(n.type);
              return (
                <div
                  key={n._id}
                  className={`notif-center-item${!n.isRead ? ' notif-center-item-unread' : ''}${selectMode ? ' notif-center-item-selectable' : ''}`}
                  onClick={() => {
                    if (selectMode) { toggleSelect(n._id); return; }
                    if (!n.isRead) handleMarkRead(n._id);
                  }}
                >
                  {selectMode && (
                    <div className="notif-center-item-check">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selectedIds.has(n._id)}
                        onChange={() => toggleSelect(n._id)}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  )}
                  <div className="notif-center-item-icon" style={{ background: `${n.color || dotColor}18`, color: n.color || dotColor }}>
                    <IconComp size={18} />
                  </div>
                  <div className="notif-center-item-main">
                    <div className="notif-center-item-top">
                      <span className="notif-center-item-title">{n.title}</span>
                      <div className="notif-center-item-meta">
                        <span className={`notif-priority notif-priority-${n.priority || 'medium'}`}>
                          {getPriorityLabel(n.priority)}
                        </span>
                        <span className="notif-center-item-time">{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                    <div className="notif-center-item-message">{n.message}</div>
                    <div className="notif-center-item-bottom">
                      <div className="notif-center-item-ref">
                        {n.referenceId && (
                          <span className="notif-ref-badge" style={{ borderColor: dotColor, color: dotColor }}>
                            {n.referenceModel} #{n.referenceId.replace(/^.{20}/, m => m.slice(0, 12) + '...')}
                          </span>
                        )}
                        {n.actionUrl && (
                          <span className="notif-action-link">Open related page →</span>
                        )}
                      </div>
                      <div className="notif-center-item-actions">
                        {!n.isRead && (
                          <button className="notif-center-action-btn" onClick={e => { e.stopPropagation(); handleMarkRead(n._id); }} title="Mark as read">
                            <CheckCheck size={14} />
                          </button>
                        )}
                        {!selectMode && (
                          <button className="notif-center-action-btn" onClick={e => { e.stopPropagation(); handleDelete(n._id); }} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {!n.isRead && !selectMode && (
                    <span className="notif-center-item-dot" style={{ background: dotColor }} />
                  )}
                </div>
              );
            })}

            {loadingMore && (
              <div className="notif-center-loading-more">
                <Loader2 size={20} className="spinner" />
                <span>Loading more...</span>
              </div>
            )}

            {!hasMore && notifications.length > 0 && (
              <div className="notif-center-end">
                <span>You've reached the end</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
