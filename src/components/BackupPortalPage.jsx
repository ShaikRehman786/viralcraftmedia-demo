import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Database, 
  Search, 
  Eye, 
  LogOut, 
  RefreshCw, 
  Table, 
  FileJson, 
  X, 
  ChevronRight, 
  Clock, 
  Layers,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Cpu,
  Server,
  CheckCircle2,
  Info,
  Calendar,
  Filter,
  ArrowUpDown,
  HardDrive
} from 'lucide-react';

export default function BackupPortalPage() {
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [operationFilter, setOperationFilter] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST'); // 'NEWEST' | 'OLDEST'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'json'
  
  // Dashboard stats & health indicators
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Auto-refresh counters
  const [secondsToRefresh, setSecondsToRefresh] = useState(30);

  // Fetch initial collections & stats on mount
  useEffect(() => {
    setLoading(true);
    const bootstrapData = async () => {
      try {
        const collectionsRes = await axios.get('/api/backup/collections');
        if (collectionsRes.data.success && collectionsRes.data.collections.length > 0) {
          setCollections(collectionsRes.data.collections);
          setSelectedCollection(collectionsRes.data.collections[0]);
        }
        await fetchStats();
      } catch (err) {
        console.error('Failed to bootstrap backup portal data:', err);
      } finally {
        setLoading(false);
      }
    };
    bootstrapData();
  }, []);

  // Fetch documents when selectedCollection changes
  useEffect(() => {
    if (!selectedCollection) return;
    fetchCollectionData();
  }, [selectedCollection]);

  // Set up auto-refresh timer (30s)
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsToRefresh((prev) => {
        if (prev <= 1) {
          fetchStats();
          if (selectedCollection) fetchCollectionData();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedCollection]);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/backup/stats');
      if (res.data.success) {
        setStats(res.data.stats);
        setHealth(res.data.health);
      }
    } catch (err) {
      console.error('Failed to fetch backup stats:', err);
    }
  };

  const fetchCollectionData = async () => {
    setRefreshing(true);
    try {
      const res = await axios.get(`/api/backup/collections/${selectedCollection}`);
      if (res.data.success) {
        setDocuments(res.data.data);
      }
    } catch (err) {
      console.error(`Failed to fetch backup data for ${selectedCollection}:`, err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchCollectionData()]);
    setSecondsToRefresh(30);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      window.location.href = '/login';
    } catch (err) {
      window.location.href = '/login';
    }
  };

  // Filter and sort documents
  const filteredAndSortedDocs = documents
    .filter(doc => {
      // 1. Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = Object.keys(doc).some(key => {
          const val = doc[key];
          if (val === null || val === undefined) return false;
          if (typeof val === 'object') {
            return JSON.stringify(val).toLowerCase().includes(query);
          }
          return String(val).toLowerCase().includes(query);
        });
        if (!matches) return false;
      }

      // 2. Operation Filter (only applicable to logs or operation metadata if present)
      if (operationFilter !== 'ALL') {
        const op = (doc.operation || '').toUpperCase();
        if (op !== operationFilter) return false;
      }

      // 3. Time Filter
      if (timeFilter !== 'ALL') {
        const docDate = new Date(doc.createdAt || doc.timestamp || doc._backupTimestamp || Date.now());
        const now = new Date();
        if (timeFilter === 'TODAY') {
          const startOfToday = new Date();
          startOfToday.setHours(0,0,0,0);
          if (docDate < startOfToday) return false;
        } else if (timeFilter === 'WEEK') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (docDate < sevenDaysAgo) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.timestamp || a._backupTimestamp || 0);
      const dateB = new Date(b.createdAt || b.timestamp || b._backupTimestamp || 0);
      return sortBy === 'NEWEST' ? dateB - dateA : dateA - dateB;
    });

  // Dynamically extract columns from documents
  const getTableColumns = () => {
    if (documents.length === 0) return [];
    
    // Ordered set of fields we prioritize in grid layouts
    const primaryFields = [
      '_id', 
      'name', 
      'email', 
      'title', 
      'amount', 
      'operation', 
      'status', 
      'createdAt', 
      '_backupTimestamp'
    ];
    
    const allKeys = new Set();
    documents.slice(0, 10).forEach(doc => {
      Object.keys(doc).forEach(key => {
        if (typeof doc[key] !== 'object' || doc[key] === null) {
          allKeys.add(key);
        }
      });
    });

    return primaryFields.filter(field => allKeys.has(field));
  };

  const columns = getTableColumns();

  // Helper to format values elegantly
  const formatTableCell = (col, val) => {
    if (val === undefined || val === null) return '-';
    if (col === '_id') {
      return (
        <span style={{ fontFamily: 'monospace', color: '#38BDF8', fontSize: '0.8rem' }}>
          {String(val).substring(Math.max(0, String(val).length - 8))}
        </span>
      );
    }
    if (col === 'createdAt' || col === '_backupTimestamp' || col === 'timestamp') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94A3B8' }}>
          <Clock size={12} />
          {new Date(val).toLocaleString()}
        </div>
      );
    }
    if (col === 'operation') {
      const op = String(val).toUpperCase();
      let bg = 'rgba(59, 130, 246, 0.15)';
      let fg = '#3B82F6';
      if (op === 'UPDATE') { bg = 'rgba(245, 158, 11, 0.15)'; fg = '#F59E0B'; }
      else if (op === 'DELETE') { bg = 'rgba(239, 68, 68, 0.15)'; fg = '#EF6868'; }
      return (
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          background: bg,
          color: fg,
          fontSize: '0.72rem',
          fontWeight: '700',
          letterSpacing: '0.05em'
        }}>{op}</span>
      );
    }
    if (col === 'status') {
      const stat = String(val).toUpperCase();
      const isSuccess = stat === 'SUCCESS' || stat === 'ACTIVE';
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          borderRadius: '4px',
          background: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: isSuccess ? '#10B981' : '#EF4444',
          fontSize: '0.72rem',
          fontWeight: '700'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isSuccess ? '#10B981' : '#EF4444'
          }} />
          {stat}
        </span>
      );
    }
    if (typeof val === 'boolean') {
      return val ? 'Yes' : 'No';
    }
    return String(val);
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#090D16', 
      color: '#E2E8F0',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      overflowX: 'hidden'
    }}>
      {/* Dynamic CSS Styling Injector */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-fade-in {
          animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-in {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
        .grid-card {
          background: #111827;
          border: 1px solid #1F2937;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s ease;
        }
        .grid-card:hover {
          border-color: #374151;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .nav-btn {
          transition: all 0.15s ease;
        }
        .nav-btn:hover {
          background: rgba(31, 41, 55, 0.6) !important;
          color: #F8FAFC !important;
        }
        .table-row {
          transition: background-color 0.15s ease;
        }
        .table-row:hover {
          background-color: #1E293B !important;
        }
        .pulse-glowing {
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulse 2.5s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>

      {/* LEFT SIDEBAR - Navigation & Profile */}
      <aside style={{
        width: '280px',
        background: '#0B0F19',
        borderRight: '1px solid #1E293B',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        {/* Branding header */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            background: 'rgba(249, 115, 22, 0.15)',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Database color="#F97316" size={22} />
          </div>
          <div>
            <h1 style={{
              fontSize: '0.95rem',
              fontWeight: '700',
              margin: 0,
              color: '#F8FAFC',
              letterSpacing: '-0.01em',
              textTransform: 'uppercase'
            }}>ViralCraft</h1>
            <span style={{
              fontSize: '0.72rem',
              color: '#F97316',
              fontWeight: '700',
              letterSpacing: '0.06em',
              textTransform: 'uppercase'
            }}>Backup Console</span>
          </div>
        </div>

        {/* Sync Status Info Block */}
        <div style={{
          margin: '16px 12px 0 12px',
          padding: '12px',
          background: 'rgba(30, 41, 59, 0.4)',
          borderRadius: '8px',
          border: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pulse-glowing" style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10B981',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: '500' }}>Live Sync Pulse</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: '600' }}>ONLINE</span>
        </div>

        {/* Collections Navigator list */}
        <nav style={{
          padding: '16px 12px',
          flexGrow: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: '700',
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            paddingLeft: '12px',
            marginBottom: '8px'
          }}>Database Collections</div>

          {loading ? (
            <div style={{ padding: '12px', color: '#64748B', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={14} className="spinner" /> Loading modules...
            </div>
          ) : (
            collections.map(col => {
              const active = selectedCollection === col;
              const countVal = stats?.collectionsCountMap?.[col] ?? 0;
              return (
                <button
                  key={col}
                  className="nav-btn"
                  onClick={() => {
                    setSelectedCollection(col);
                    setSelectedDoc(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: active ? 'rgba(249, 115, 22, 0.12)' : 'transparent',
                    color: active ? '#F97316' : '#94A3B8',
                    fontWeight: active ? '600' : '500',
                    fontSize: '0.88rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <span style={{ textTransform: 'capitalize' }}>
                    {col === 'activitylogs' ? 'Activity Logs' : col}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      background: active ? 'rgba(249, 115, 22, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                      color: active ? '#F97316' : '#64748B',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontWeight: '600'
                    }}>{countVal}</span>
                    <ChevronRight size={12} style={{ opacity: active ? 0.7 : 0, transition: 'opacity 0.2s' }} />
                  </div>
                </button>
              );
            })
          )}
        </nav>

        {/* User profile with logout action */}
        <div style={{
          padding: '20px 16px',
          borderTop: '1px solid #1E293B',
          background: '#0B0F19'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.9rem',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)'
            }}>BA</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#F1F5F9', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                Backup Auditor
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                shaikrehman78609@gmail.com
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #1E293B',
              background: 'rgba(30, 41, 59, 0.4)',
              color: '#E2E8F0',
              fontWeight: '600',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <LogOut size={14} /> Close Session
          </button>
        </div>
      </aside>

      {/* RIGHT CONTENT WORKSPACE */}
      <main style={{
        flexGrow: 1,
        padding: '24px 32px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* TOP STATUS HEADER BAR */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1E293B',
          paddingBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#64748B', fontWeight: '600' }}>
              <span>SYSTEMS</span>
              <ChevronRight size={10} />
              <span style={{ color: '#F97316' }}>REAL-TIME ARCHIVING</span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#F8FAFC', margin: '4px 0 0 0' }}>
              Management Console
            </h2>
          </div>

          {/* Sync Pulsing Counter Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(30, 41, 59, 0.5)',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #1E293B',
              fontSize: '0.8rem',
              color: '#94A3B8'
            }}>
              <RefreshCw size={12} className="spinner" color="#10B981" />
              <span>Auto-refreshing in: <b>{secondsToRefresh}s</b></span>
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: '#1E293B',
                color: '#F8FAFC',
                fontWeight: '600',
                fontSize: '0.82rem',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <RefreshCw size={14} className={refreshing ? 'spinner' : ''} /> Force Sync
            </button>
          </div>
        </div>

        {/* METRICS DASHBOARD CARDS ROW */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }} className="animate-fade-in">
          {/* Card 1: Total Sync Count */}
          <div className="grid-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: 'rgba(56, 189, 248, 0.1)',
              padding: '12px',
              borderRadius: '10px'
            }}>
              <ShieldCheck color="#38BDF8" size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Total Synced Records</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#F1F5F9', marginTop: '2px' }}>
                {stats?.totalBackupRecords ?? '-'}
              </div>
            </div>
          </div>

          {/* Card 2: Sync Fail / Retry queue */}
          <div className="grid-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: (stats?.retryQueueCount ?? 0) > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              padding: '12px',
              borderRadius: '10px'
            }}>
              <AlertTriangle color={(stats?.retryQueueCount ?? 0) > 0 ? '#F59E0B' : '#10B981'} size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Retry Queue Status</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#F1F5F9', marginTop: '2px' }}>
                {stats?.retryQueueCount ?? '0'} <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: '500' }}>pending</span>
              </div>
            </div>
          </div>

          {/* Card 3: Today's Syncs Count */}
          <div className="grid-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '12px',
              borderRadius: '10px'
            }}>
              <Activity color="#10B981" size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Synchronized Today</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#F1F5F9', marginTop: '2px' }}>
                {stats?.todayBackups ?? '-'} <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: '500' }}>records</span>
              </div>
            </div>
          </div>

          {/* Card 4: Backup Health State */}
          <div className="grid-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              padding: '12px',
              borderRadius: '10px'
            }}>
              <HardDrive color="#6366F1" size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Archiving Node Health</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#F1F5F9', marginTop: '2px' }}>
                100% <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: '500' }}>nominal</span>
              </div>
            </div>
          </div>
        </div>

        {/* HEALTH & CONNECTIONS SUB-PANEL */}
        <div style={{
          background: '#111827',
          border: '1px solid #1E293B',
          borderRadius: '12px',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px'
        }} className="animate-fade-in">
          {/* Connection Item: Prod DB */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Server size={18} color="#94A3B8" />
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Production DB Cluster</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: health?.productionDb === 'Connected' ? '#10B981' : '#EF4444' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>{health?.productionDb ?? 'Checking...'}</span>
              </div>
            </div>
          </div>

          {/* Connection Item: Backup DB */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={18} color="#94A3B8" />
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Backup DB Cluster</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: health?.backupDb === 'Connected' ? '#10B981' : '#EF4444' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>{health?.backupDb ?? 'Checking...'}</span>
              </div>
            </div>
          </div>

          {/* Connection Item: Worker state */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={18} color="#94A3B8" />
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Archive Worker thread</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>{health?.workerStatus ?? 'Active'}</span>
              </div>
            </div>
          </div>

          {/* Last Synchronized Timestamp */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={18} color="#94A3B8" />
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Last Sync Timestamp</div>
              <div style={{ fontSize: '0.82rem', fontWeight: '600', marginTop: '2px', color: '#E2E8F0' }}>
                {stats?.lastBackupTime ? new Date(stats.lastBackupTime).toLocaleString() : 'No transactions recorded'}
              </div>
            </div>
          </div>
        </div>

        {/* BROWSER GRID CONTROLS (Search & Filters) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: '#0B0F19',
          border: '1px solid #1E293B',
          borderRadius: '12px',
          padding: '16px 20px'
        }} className="animate-fade-in">
          {/* Main search and mode row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '20px',
            flexWrap: 'wrap'
          }}>
            {/* Left side title context */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#F1F5F9', textTransform: 'capitalize' }}>
                {selectedCollection ? `${selectedCollection} Dataset` : 'Target Dataset'}
              </div>
              <span style={{
                fontSize: '0.72rem',
                background: 'rgba(249, 115, 22, 0.1)',
                color: '#F97316',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: '700'
              }}>READ-ONLY DATASTORE</span>
            </div>

            {/* View Mode Toggle */}
            <div style={{
              display: 'flex',
              background: '#111827',
              border: '1px solid #1E293B',
              borderRadius: '8px',
              padding: '2px'
            }}>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'table' ? '#1E293B' : 'transparent',
                  color: viewMode === 'table' ? '#F97316' : '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Table size={12} /> Data Grid
              </button>
              <button
                onClick={() => setViewMode('json')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'json' ? '#1E293B' : 'transparent',
                  color: viewMode === 'json' ? '#F97316' : '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileJson size={12} /> JSON Stream
              </button>
            </div>
          </div>

          {/* Search, filters selectors, and sort controls row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            {/* Search Input bar */}
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              flexGrow: 1,
              maxWidth: '400px'
            }}>
              <Search size={14} color="#64748B" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="text"
                placeholder="Enterprise filter by ID, Name, Customer, Email, Date..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '10px 12px 10px 36px',
                  borderRadius: '8px',
                  border: '1px solid #1E293B',
                  background: '#111827',
                  color: '#F8FAFC',
                  fontSize: '0.85rem',
                  width: '100%',
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
              />
            </div>

            {/* Filter selectors */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {/* Operation type filter (only shown if collection supports operation metadata, e.g. logs) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={12} color="#64748B" />
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: '500' }}>Operation:</span>
                <select
                  value={operationFilter}
                  onChange={e => setOperationFilter(e.target.value)}
                  style={{
                    background: '#111827',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#F1F5F9',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="ALL">All Operations</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              {/* Time Range scope selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={12} color="#64748B" />
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: '500' }}>Timeframe:</span>
                <select
                  value={timeFilter}
                  onChange={e => setTimeFilter(e.target.value)}
                  style={{
                    background: '#111827',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#F1F5F9',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="WEEK">Last 7 Days</option>
                </select>
              </div>

              {/* Sort Order selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowUpDown size={12} color="#64748B" />
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: '500' }}>Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  style={{
                    background: '#111827',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#F1F5F9',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="NEWEST">Newest Records</option>
                  <option value="OLDEST">Oldest Records</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* DATA CONTAINER CARD VIEW */}
        <div style={{ flexGrow: 1 }} className="animate-fade-in">
          {refreshing && documents.length === 0 ? (
            /* Loading Skeleton views */
            <div style={{
              background: '#111827',
              border: '1px solid #1E293B',
              borderRadius: '12px',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '40%', height: '20px', background: '#1E293B', borderRadius: '4px' }} />
                <div style={{ width: '10%', height: '20px', background: '#1E293B', borderRadius: '4px' }} />
              </div>
              <hr style={{ borderColor: '#1E293B' }} />
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ width: '15%', height: '16px', background: '#1E293B', borderRadius: '4px' }} />
                  <div style={{ width: '35%', height: '16px', background: '#1E293B', borderRadius: '4px' }} />
                  <div style={{ width: '25%', height: '16px', background: '#1E293B', borderRadius: '4px' }} />
                  <div style={{ width: '15%', height: '16px', background: '#1E293B', borderRadius: '4px' }} />
                  <div style={{ width: '10%', height: '16px', background: '#1E293B', borderRadius: '4px', marginLeft: 'auto' }} />
                </div>
              ))}
            </div>
          ) : filteredAndSortedDocs.length === 0 ? (
            /* Empty State Container */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 24px',
              border: '1px dashed #1E293B',
              borderRadius: '12px',
              background: '#111827'
            }}>
              <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                padding: '16px',
                borderRadius: '50%',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Layers size={36} color="#64748B" />
              </div>
              <h3 style={{ color: '#F1F5F9', margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: '700' }}>Dataset is Empty</h3>
              <p style={{ color: '#64748B', margin: 0, fontSize: '0.85rem', textAlign: 'center', maxWidth: '380px', lineHeight: '1.5' }}>
                No database mutations match the filters you have configured. Try adjusting your search query or operation filter parameters.
              </p>
            </div>
          ) : viewMode === 'json' ? (
            /* Syntax code editor style raw JSON view */
            <div style={{
              background: '#0B0F19',
              border: '1px solid #1E293B',
              borderRadius: '12px',
              padding: '24px',
              maxHeight: '600px',
              overflow: 'auto',
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #1E293B', paddingBottom: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: '#10B981', fontFamily: 'monospace', fontWeight: '600' }}>RAW JSON STREAM</span>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{filteredAndSortedDocs.length} items</span>
              </div>
              <pre style={{
                margin: 0,
                fontSize: '0.82rem',
                color: '#34D399',
                fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                lineHeight: '1.6'
              }}>
                {JSON.stringify(filteredAndSortedDocs, null, 2)}
              </pre>
            </div>
          ) : (
            /* Premium Data Grid Table View */
            <div style={{
              background: '#111827',
              border: '1px solid #1E293B',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '0.85rem'
                }}>
                  <thead>
                    <tr style={{ background: '#1E293B', borderBottom: '1px solid #334155' }}>
                      {columns.map(col => (
                        <th key={col} style={{
                          padding: '16px 20px',
                          color: '#F1F5F9',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          fontSize: '0.72rem',
                          letterSpacing: '0.05em'
                        }}>
                          {col === '_id' ? 'ID' : col.replace(/([A-Z])/g, ' $1')}
                        </th>
                      ))}
                      <th style={{
                        padding: '16px 20px',
                        color: '#F1F5F9',
                        fontWeight: '600',
                        textAlign: 'right',
                        fontSize: '0.72rem',
                        letterSpacing: '0.05em'
                      }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedDocs.map((doc, idx) => (
                      <tr
                        key={doc._id || idx}
                        className="table-row"
                        style={{
                          borderBottom: '1px solid #1E293B',
                          background: idx % 2 === 0 ? '#111827' : 'rgba(30, 41, 59, 0.2)'
                        }}
                      >
                        {columns.map(col => (
                          <td key={col} style={{ padding: '14px 20px', color: '#E2E8F0', whiteSpace: 'nowrap' }}>
                            {formatTableCell(col, doc[col])}
                          </td>
                        ))}
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedDoc(doc)}
                            style={{
                              padding: '6px 12px',
                              background: '#1E293B',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              color: '#F97316',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s'
                            }}
                          >
                            <Eye size={12} /> Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* INSPECT DOCUMENT DRAWER COMPONENT */}
      {selectedDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '580px',
          background: '#0B0F19',
          borderLeft: '1px solid #1E293B',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.65)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }} className="animate-slide-in">
          {/* Drawer Header */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #1E293B',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#F8FAFC', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={16} color="#F97316" /> Document Details
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'monospace' }}>ObjectId: {selectedDoc._id}</span>
            </div>
            <button
              onClick={() => setSelectedDoc(null)}
              style={{
                background: '#1E293B',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div style={{
            padding: '24px',
            flexGrow: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Metadata Badges tag */}
            <div style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap'
            }}>
              {selectedDoc.createdAt && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid #1E293B',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  color: '#94A3B8'
                }}>
                  <Clock size={12} /> Original: {new Date(selectedDoc.createdAt).toLocaleString()}
                </div>
              )}
              {selectedDoc._backupTimestamp && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(249, 115, 22, 0.1)',
                  border: '1px solid rgba(249, 115, 22, 0.2)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  color: '#F97316'
                }}>
                  <Database size={12} /> Archiving: {new Date(selectedDoc._backupTimestamp).toLocaleString()}
                </div>
              )}
            </div>

            {/* Document Data Fields list */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Document Fields</div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #1E293B',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                {Object.keys(selectedDoc)
                  .filter(key => key !== 'refreshTokens' && key !== 'password') // strip private credential tables
                  .map((key, index) => {
                    const value = selectedDoc[key];
                    const isObj = typeof value === 'object' && value !== null;
                    return (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          borderBottom: index < Object.keys(selectedDoc).length - 1 ? '1px solid #1E293B' : 'none',
                          fontSize: '0.82rem',
                          background: index % 2 === 0 ? '#111827' : 'rgba(30, 41, 59, 0.15)'
                        }}
                      >
                        <div style={{
                          width: '180px',
                          padding: '14px 16px',
                          color: '#F97316',
                          fontWeight: '600',
                          borderRight: '1px solid #1E293B',
                          flexShrink: 0,
                          wordBreak: 'break-all',
                          fontFamily: 'monospace'
                        }}>{key}</div>
                        <div style={{
                          padding: '14px 16px',
                          color: '#E2E8F0',
                          wordBreak: 'break-all',
                          flexGrow: 1
                        }}>
                          {isObj ? (
                            <pre style={{
                              margin: 0,
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'monospace',
                              color: '#10B981',
                              fontSize: '0.8rem',
                              lineHeight: '1.5'
                            }}>
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          ) : (
                            String(value)
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
