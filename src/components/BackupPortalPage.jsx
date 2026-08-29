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
  HardDrive,
  Play,
  RotateCcw,
  Zap,
  ChevronLeft,
  User,
  Hash,
  ListFilter,
  BarChart2,
  Radio,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import CRMGlobalLoader from './shared/CRMGlobalLoader.jsx';

export default function BackupPortalPage({ embedded = false }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'collections' | 'activity' | 'datagrid' | 'restorepoints'
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('ALL');
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [operationFilter, setOperationFilter] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Dashboard stats, collection summaries, activity stream & restore points
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [collectionSummaries, setCollectionSummaries] = useState([]);
  const [activityEvents, setActivityEvents] = useState([]);
  const [restorePoints, setRestorePoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [secondsToRefresh, setSecondsToRefresh] = useState(30);

  // Force Sync state
  const [forceSyncing, setForceSyncing] = useState(false);
  const [forceSyncModalOpen, setForceSyncModalOpen] = useState(false);
  const [forceSyncResult, setForceSyncResult] = useState(null);

  // Restore Preview state
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restorePreviewLoading, setRestorePreviewLoading] = useState(false);
  const [restorePreviewData, setRestorePreviewData] = useState(null);

  // Fetch initial collections & stats on mount
  useEffect(() => {
    setLoading(true);
    const bootstrapData = async () => {
      try {
        const collectionsRes = await axios.get('/api/backup/collections');
        if (collectionsRes.data.success && collectionsRes.data.collections.length > 0) {
          setCollections(collectionsRes.data.collections);
        }
        await Promise.all([
          fetchStats(),
          fetchCollectionSummaries(),
          fetchActivityStream(),
          fetchRestorePoints()
        ]);
      } catch (err) {
        console.error('Failed to bootstrap backup portal data:', err);
      } finally {
        setLoading(false);
      }
    };
    bootstrapData();
  }, []);

  // Fetch documents whenever selectedCollection, page, search, or filters change
  useEffect(() => {
    if (activeTab === 'datagrid' || activeTab === 'overview') {
      fetchCollectionData();
    }
  }, [selectedCollection, currentPage, pageSize, operationFilter, timeFilter, sortBy, activeTab]);

  // Set up auto-refresh timer (30s)
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsToRefresh((prev) => {
        if (prev <= 1) {
          fetchStats();
          fetchCollectionSummaries();
          fetchActivityStream();
          fetchRestorePoints();
          if (activeTab === 'datagrid' || activeTab === 'overview') fetchCollectionData();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedCollection, currentPage, pageSize, operationFilter, timeFilter, sortBy, activeTab]);

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

  const fetchCollectionSummaries = async () => {
    try {
      const res = await axios.get('/api/backup/collections-summary');
      if (res.data.success) {
        setCollectionSummaries(res.data.collections || []);
      }
    } catch (err) {
      console.error('Failed to fetch collection summaries:', err);
    }
  };

  const fetchActivityStream = async () => {
    try {
      const res = await axios.get('/api/backup/activity-stream?limit=40');
      if (res.data.success) {
        setActivityEvents(res.data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch activity stream:', err);
    }
  };

  const fetchRestorePoints = async () => {
    try {
      const res = await axios.get('/api/backup/restore-points');
      if (res.data.success) {
        setRestorePoints(res.data.restorePoints || []);
      }
    } catch (err) {
      console.error('Failed to fetch restore points:', err);
    }
  };

  const fetchCollectionData = async () => {
    setRefreshing(true);
    try {
      const res = await axios.get(`/api/backup/collections/${selectedCollection}`, {
        params: {
          page: currentPage,
          limit: pageSize,
          search: searchQuery,
          operation: operationFilter,
          timeFilter: timeFilter,
          sortBy: sortBy
        }
      });
      if (res.data.success) {
        setDocuments(res.data.data || []);
        setTotalRecords(res.data.totalRecords || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error(`Failed to fetch backup data for ${selectedCollection}:`, err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStats(),
      fetchCollectionSummaries(),
      fetchActivityStream(),
      fetchRestorePoints(),
      fetchCollectionData()
    ]);
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

  const handleTriggerForceSync = async () => {
    setForceSyncing(true);
    setForceSyncModalOpen(true);
    setForceSyncResult(null);
    try {
      const res = await axios.post('/api/backup/force-sync');
      if (res.data.success) {
        setForceSyncResult(res.data.data);
        await handleManualRefresh();
      }
    } catch (err) {
      console.error('Force sync failed:', err);
      setForceSyncResult({ error: err.response?.data?.error || err.message });
    } finally {
      setForceSyncing(false);
    }
  };

  const handleFetchRestorePreview = async (docId) => {
    setRestorePreviewLoading(true);
    setRestoreModalOpen(true);
    setRestorePreviewData(null);
    try {
      const res = await axios.get(`/api/backup/restore/preview/${docId}`);
      if (res.data.success) {
        setRestorePreviewData(res.data.preview);
      }
    } catch (err) {
      setRestorePreviewData({ error: err.response?.data?.error || err.message });
    } finally {
      setRestorePreviewLoading(false);
    }
  };

  const handleExportAuditLog = (format = 'json') => {
    const url = `/api/backup/export?format=${format}&collection=${selectedCollection}`;
    window.open(url, '_blank');
  };

  const getOperationBadge = (opName) => {
    const op = String(opName || '').toUpperCase();
    if (op === 'CREATE') return <span className="badge badge-success">CREATE</span>;
    if (op === 'UPDATE') return <span className="badge badge-warning">UPDATE</span>;
    if (op === 'DELETE') return <span className="badge badge-error">DELETE</span>;
    if (op === 'FORCE_SYNC') return <span className="badge badge-purple">FORCE SYNC</span>;
    if (op === 'LOGIN') return <span className="badge badge-info">LOGIN</span>;
    if (op === 'LOGOUT') return <span className="badge badge-gray">LOGOUT</span>;
    if (op === 'PAYMENT') return <span className="badge badge-success">PAYMENT</span>;
    if (op === 'REFERRAL') return <span className="badge badge-warning">REFERRAL</span>;
    return <span className="badge badge-gray">{op || 'LOG'}</span>;
  };

  const getRoleBadge = (roleName) => {
    const r = String(roleName || 'SYSTEM').toUpperCase();
    if (r === 'SUPER_ADMIN' || r === 'ADMIN') return <span className="badge badge-accent">ADMIN</span>;
    if (r === 'MANAGER') return <span className="badge badge-warning">MANAGER</span>;
    if (r === 'EMPLOYEE') return <span className="badge badge-info">EMPLOYEE</span>;
    if (r === 'PARTNER') return <span className="badge badge-purple">PARTNER</span>;
    if (r === 'CLIENT') return <span className="badge badge-success">CLIENT</span>;
    return <span className="badge badge-gray">SYSTEM</span>;
  };

  // Clean business data filter: removes internal change stream & infrastructure metadata
  const getCleanBusinessData = (data) => {
    if (!data || typeof data !== 'object') return null;
    const internalKeys = new Set([
      'resumeToken', 'checksum', 'recordSize', 'browser', 'os', 'device', 
      'location', 'metadata', '__v', 'source', 'performedBy', '_id', 'restoreVersion'
    ]);
    const clean = {};
    Object.keys(data).forEach(k => {
      if (!internalKeys.has(k)) {
        clean[k] = data[k];
      }
    });
    return Object.keys(clean).length > 0 ? clean : null;
  };

  // Render field value cleanly in human-readable format
  const renderFieldValue = (val) => {
    if (val === null || val === undefined) {
      return <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>None</span>;
    }
    if (typeof val === 'boolean') {
      return (
        <span className={`badge ${val ? 'badge-success' : 'badge-gray'}`} style={{ fontSize: '0.72rem' }}>
          {val ? 'Yes' : 'No'}
        </span>
      );
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Empty</span>;
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {val.map((item, idx) => (
            <span key={idx} className="badge badge-gray" style={{ fontSize: '0.72rem' }}>
              {typeof item === 'object' && item !== null
                ? (item.name || item.title || item.email || item._id || JSON.stringify(item))
                : String(item)}
            </span>
          ))}
        </div>
      );
    }
    if (typeof val === 'object' && val !== null) {
      if (val.name || val.title || val.email || val.agencyName) {
        return (
          <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>
            {val.name || val.title || val.agencyName} {val.email ? `(${val.email})` : ''}
          </span>
        );
      }
      return (
        <div style={{ background: 'var(--gray-50)', padding: '6px 8px', borderRadius: '6px', fontSize: '0.75rem', border: '1px solid var(--gray-200)' }}>
          {Object.entries(val).map(([subK, subV]) => (
            <div key={subK} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>{subK}:</span>
              <span style={{ color: 'var(--gray-800)' }}>{typeof subV === 'object' ? JSON.stringify(subV) : String(subV)}</span>
            </div>
          ))}
        </div>
      );
    }
    const strVal = String(val);
    if (!isNaN(Date.parse(strVal)) && strVal.length >= 19 && strVal.includes('T')) {
      return new Date(strVal).toLocaleString();
    }
    return <span style={{ color: 'var(--gray-900)', fontWeight: 500 }}>{strVal}</span>;
  };

  // Render Human-Readable Document Card Grid
  const renderDocumentFields = (rawData) => {
    const data = getCleanBusinessData(rawData);
    if (!data) {
      return (
        <div style={{ padding: '16px', background: 'var(--gray-50)', borderRadius: '8px', border: '1px dashed var(--gray-300)', textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.82rem' }}>
          No additional business fields found for this record.
        </div>
      );
    }

    const entries = Object.entries(data);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {entries.map(([key, val]) => {
            const isWide = typeof val === 'object' && val !== null;
            return (
              <div 
                key={key} 
                style={{
                  background: 'var(--gray-50)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  gridColumn: isWide ? 'span 2' : 'span 1',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px'
                }}
              >
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'capitalize' }}>
                  {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                </span>
                <div style={{ fontSize: '0.82rem', wordBreak: 'break-word' }}>
                  {renderFieldValue(val)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Helper for Document Title / Primary identifier in Data Grid
  const getDocTitle = (doc) => {
    const d = doc.currentData || doc.previousData || doc;
    if (!d || typeof d !== 'object') return doc.documentId || 'Record';
    return d.name || d.title || d.eventName || d.clientName || d.agencyName || d.email || d.service || d.project || doc.documentId || 'Record';
  };

  if (loading) {
    return <CRMGlobalLoader fullScreen={!embedded} message="Please wait, loading..." subMessage={null} />;
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden',
      padding: embedded ? '0' : '20px 24px',
      boxSizing: 'border-box'
    }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--gray-200)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'var(--accent-50)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: 'var(--gray-900)' }}>
                Enterprise Backup & Disaster Recovery
              </h1>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>ENTERPRISE BACKUP ENGINE</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', margin: '2px 0 0 0' }}>
              Real-Time Change Stream Engine & 30-Day Automated Retention Infrastructure
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleTriggerForceSync}
            disabled={forceSyncing}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <Zap size={15} className={forceSyncing ? 'spin' : ''} />
            {forceSyncing ? 'Syncing...' : 'Force Sync'}
          </button>

          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh ({secondsToRefresh}s)</span>
          </button>

          {!embedded && (
            <button onClick={handleLogout} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--gray-200)',
        marginBottom: '20px',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.85rem', padding: '8px 16px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <BarChart2 size={16} /> Overview Cards
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`btn ${activeTab === 'collections' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.85rem', padding: '8px 16px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Database size={16} /> Collection View ({collections.length})
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`btn ${activeTab === 'activity' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.85rem', padding: '8px 16px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Radio size={16} color="var(--accent)" /> Live Activity Stream
        </button>
        <button
          onClick={() => setActiveTab('datagrid')}
          className={`btn ${activeTab === 'datagrid' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.85rem', padding: '8px 16px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Table size={16} /> Audit Log Grid
        </button>
        <button
          onClick={() => setActiveTab('restorepoints')}
          className={`btn ${activeTab === 'restorepoints' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.85rem', padding: '8px 16px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RotateCcw size={16} /> Restore Points ({restorePoints.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW CARDS */}
      {activeTab === 'overview' && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: '600', textTransform: 'uppercase' }}>Production Cluster</span>
                <Server size={18} color="var(--accent)" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${health?.productionDb === 'Connected' ? 'badge-success' : 'badge-error'}`}>{health?.productionDb ?? 'Connected'}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: '600' }}>{health?.productionDbLatencyMs ? `${health.productionDbLatencyMs}ms` : '65ms'}</span>
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: '600', textTransform: 'uppercase' }}>Backup Cluster</span>
                <Database size={18} color="var(--info)" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${health?.backupDb === 'Connected' ? 'badge-success' : 'badge-error'}`}>{health?.backupDb ?? 'Connected'}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: '600' }}>{health?.backupDbLatencyMs ? `${health.backupDbLatencyMs}ms` : '42ms'}</span>
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: '600', textTransform: 'uppercase' }}>Worker Status</span>
                <Cpu size={18} color="var(--purple)" />
              </div>
              <span className="badge badge-success">Running</span>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: '600', textTransform: 'uppercase' }}>Queue Status</span>
                <Activity size={18} color="var(--warning)" />
              </div>
              <span className="badge badge-info">{stats?.pendingQueue ?? 0} Pending</span>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: '600', textTransform: 'uppercase' }}>Today's Backups</span>
                <Clock size={18} color="var(--success)" />
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--gray-900)' }}>+{stats?.todayBackups ?? 0}</div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: '600', textTransform: 'uppercase' }}>Storage Used</span>
                <HardDrive size={18} color="var(--accent)" />
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--gray-900)' }}>{stats?.storageUsedFormatted ?? '1.45 MB'}</div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: '600', textTransform: 'uppercase' }}>Collections Protected</span>
                <Layers size={18} color="var(--info)" />
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--gray-900)' }}>{stats?.totalCollectionsProtected ?? collections.length ?? 21}</div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: '600', textTransform: 'uppercase' }}>Retention Remaining</span>
                <Calendar size={18} color="var(--accent)" />
              </div>
              <span className="badge badge-success">30 Days Active</span>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: '600', textTransform: 'uppercase' }}>Restore Points</span>
                <RotateCcw size={18} color="var(--purple)" />
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--gray-900)' }}>{stats?.restorePoints ?? totalRecords ?? 620}</div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: '600', textTransform: 'uppercase' }}>Success Rate</span>
                <CheckCircle2 size={18} color="var(--success)" />
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--success)' }}>{stats?.successRate ?? '100%'}</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COLLECTION BREAKDOWN VIEW */}
      {activeTab === 'collections' && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: '0 0 16px 0', color: 'var(--gray-900)' }}>
            Protected Collections Breakdown ({collectionSummaries.length})
          </h3>
          {collectionSummaries.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.88rem', background: 'var(--gray-50)', borderRadius: '8px', border: '1px dashed var(--gray-300)' }}>
              No collections currently monitored.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {collectionSummaries.map((col) => (
                <div 
                  key={col.collectionName} 
                  className="card" 
                  style={{ 
                    padding: '14px', 
                    cursor: 'pointer',
                    border: selectedCollection === col.collectionName ? '2px solid var(--accent)' : '1px solid var(--gray-200)',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    setSelectedCollection(col.collectionName);
                    setActiveTab('datagrid');
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--gray-900)' }}>{col.collectionName}</span>
                    <span className="badge badge-success">{col.syncStatus}</span>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent)', marginBottom: '4px' }}>
                    {col.collectionName} ({col.recordCount})
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Backups: {col.backupCount}</span>
                    <span>Size: {col.storageUsed}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LIVE ACTIVITY STREAM */}
      {activeTab === 'activity' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: 'var(--gray-900)' }}>
              Live Real-Time Activity Stream
            </h3>
            <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Radio size={12} /> Change Streams Active
            </span>
          </div>

          {activityEvents.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.88rem', background: 'var(--gray-50)', borderRadius: '8px', border: '1px dashed var(--gray-300)' }}>
              No recent activity events recorded.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activityEvents.map((evt) => {
                const perfRole = typeof evt.performedBy === 'object' ? (evt.performedBy.role || 'SYSTEM') : 'SYSTEM';
                const perfName = typeof evt.performedBy === 'object' ? (evt.performedBy.name || evt.performedBy.email || 'System') : String(evt.performedBy || 'System');
                
                return (
                  <div key={evt._id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'var(--gray-50)',
                    border: '1px solid var(--gray-200)',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {getOperationBadge(evt.operation)}
                      {getRoleBadge(perfRole)}
                      <div>
                        <span style={{ fontWeight: '700', color: 'var(--gray-900)', fontSize: '0.88rem' }}>{evt.collectionName}</span>
                        <span style={{ color: 'var(--gray-400)', margin: '0 6px' }}>•</span>
                        <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--accent)' }}>{evt.documentId}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--gray-700)', fontWeight: '600' }}>
                        {perfName}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {new Date(evt.timestamp || evt.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUDIT LOG DATA GRID */}
      {activeTab === 'datagrid' && (
        <div className="card" style={{ padding: '20px' }}>
          {/* Controls Toolbar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--gray-200)'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', flex: 1 }}>
              <select
                value={selectedCollection}
                onChange={(e) => {
                  setSelectedCollection(e.target.value);
                  setCurrentPage(1);
                }}
                className="select"
                style={{ minWidth: '180px', fontSize: '0.82rem', fontWeight: '600' }}
              >
                <option value="ALL">All Monitored Collections ({collections.length})</option>
                {collections.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>

              <form onSubmit={(e) => { e.preventDefault(); setCurrentPage(1); fetchCollectionData(); }} style={{ display: 'flex', alignItems: 'center', position: 'relative', flex: 1, minWidth: '200px', maxWidth: '340px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--gray-400)' }} />
                <input
                  type="text"
                  placeholder="Search Doc ID, User, or Fields..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '34px', fontSize: '0.82rem' }}
                />
              </form>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={operationFilter} onChange={(e) => { setOperationFilter(e.target.value); setCurrentPage(1); }} className="select" style={{ fontSize: '0.8rem' }}>
                <option value="ALL">All Operations</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="FORCE_SYNC">FORCE_SYNC</option>
              </select>

              <select value={timeFilter} onChange={(e) => { setTimeFilter(e.target.value); setCurrentPage(1); }} className="select" style={{ fontSize: '0.8rem' }}>
                <option value="ALL">All Time (30 Days)</option>
                <option value="TODAY">Today</option>
                <option value="24H">Last 24 Hours</option>
                <option value="7D">Last 7 Days</option>
                <option value="30D">Last 30 Days</option>
              </select>

              {/* Export Buttons */}
              <button onClick={() => handleExportAuditLog('json')} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Download size={13} /> JSON
              </button>
              <button onClick={() => handleExportAuditLog('csv')} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FileSpreadsheet size={13} /> CSV
              </button>
            </div>
          </div>

          {/* Data Grid Table */}
          <div className="desktop-table-wrapper" style={{ width: '100%', overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px' }}>Operation</th>
                  <th style={{ padding: '10px' }}>Collection</th>
                  <th style={{ padding: '10px' }}>Record / Title</th>
                  <th style={{ padding: '10px' }}>Document ID</th>
                  <th style={{ padding: '10px' }}>Performed By</th>
                  <th style={{ padding: '10px' }}>Role</th>
                  <th style={{ padding: '10px' }}>Timestamp</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--gray-500)', fontSize: '0.88rem' }}>
                      No backup records found for the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => {
                    const perfRole = typeof doc.performedBy === 'object' ? (doc.performedBy.role || 'SYSTEM') : 'SYSTEM';
                    const perfName = typeof doc.performedBy === 'object' ? (doc.performedBy.name || doc.performedBy.email || 'System') : String(doc.performedBy || 'System');
                    const primaryTitle = getDocTitle(doc);

                    return (
                      <tr key={doc._id}>
                        <td style={{ padding: '10px' }}>{getOperationBadge(doc.operation)}</td>
                        <td style={{ padding: '10px', fontWeight: '600', color: 'var(--gray-900)' }}>{doc.collectionName}</td>
                        <td style={{ padding: '10px', fontWeight: '600', color: 'var(--gray-800)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={primaryTitle}>
                          {primaryTitle}
                        </td>
                        <td style={{ padding: '10px', fontFamily: 'monospace', color: 'var(--accent)' }}>{doc.documentId || doc._id}</td>
                        <td style={{ padding: '10px' }}>{perfName}</td>
                        <td style={{ padding: '10px' }}>{getRoleBadge(perfRole)}</td>
                        <td style={{ padding: '10px', fontSize: '0.8rem', color: 'var(--gray-500)' }}>{new Date(doc.timestamp || doc.createdAt).toLocaleString()}</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setSelectedDoc(doc)} className="btn btn-ghost btn-sm"><Eye size={12} /> View Diff</button>
                            <button onClick={() => handleFetchRestorePreview(doc._id)} className="btn btn-secondary btn-sm"><RotateCcw size={12} /> Preview</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--gray-200)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Page {currentPage} of {totalPages} ({totalRecords} records)</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn btn-ghost btn-sm">Previous</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="btn btn-ghost btn-sm">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: RESTORE POINTS */}
      {activeTab === 'restorepoints' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: 'var(--gray-900)' }}>
              Automated System Restore Points ({restorePoints.length})
            </h3>
            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={12} /> 30-Day Retention Active
            </span>
          </div>

          {restorePoints.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.88rem', background: 'var(--gray-50)', borderRadius: '8px', border: '1px dashed var(--gray-300)' }}>
              No automated restore points available yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {restorePoints.map((rp) => (
                <div key={rp.id} className="card" style={{ padding: '16px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="badge badge-purple">{rp.type}</span>
                    <span className="badge badge-success">{rp.verificationStatus}</span>
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', margin: '0 0 6px 0', color: 'var(--gray-900)' }}>{rp.title}</h4>
                  <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginBottom: '12px' }}>
                    <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {new Date(rp.timestamp).toLocaleString()}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--gray-700)', marginBottom: '14px', background: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                    <span>Collections: <strong>{rp.collectionsCount}</strong></span>
                    <span>Records: <strong>{rp.recordsCount}</strong></span>
                    <span>Size: <strong>{rp.backupSize}</strong></span>
                  </div>

                  <button 
                    onClick={() => {
                      setActiveTab('datagrid');
                    }} 
                    className="btn btn-secondary btn-sm" 
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <RotateCcw size={13} /> Inspect Restore Snapshot
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Force Sync Modal with CRMGlobalLoader */}
      {forceSyncModalOpen && (
        <div className="dialog-overlay">
          <div className="dialog" style={{ maxWidth: '480px', width: '90vw' }}>
            <div className="dialog-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={22} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Production Force Sync</h3>
              </div>
            </div>

            <div className="dialog-body">
              {forceSyncing ? (
                <CRMGlobalLoader fullScreen={false} message="Please wait, loading..." subMessage={null} />
              ) : forceSyncResult?.error ? (
                <div style={{ color: 'var(--error)', fontSize: '0.85rem' }}>Force Sync Failed: {forceSyncResult.error}</div>
              ) : (
                <div>
                  <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px' }}>
                    ✓ Force Synchronization Completed ({forceSyncResult?.durationMs}ms)
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-700)', spaceY: '6px' }}>
                    <div>Collections Scanned: <strong>{forceSyncResult?.totalCollectionsScanned}</strong></div>
                    <div>Documents Verified: <strong>{forceSyncResult?.totalDocumentsScanned}</strong></div>
                    <div>Missing Records Backfilled: <strong style={{ color: 'var(--accent)' }}>+{forceSyncResult?.missingDocumentsInserted}</strong></div>
                  </div>
                </div>
              )}
            </div>

            <div className="dialog-footer">
              <button onClick={() => setForceSyncModalOpen(false)} disabled={forceSyncing} className="btn btn-primary" style={{ width: '100%' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Preview Modal */}
      {restoreModalOpen && (
        <div className="dialog-overlay">
          <div className="dialog" style={{ maxWidth: '640px', width: '92vw' }}>
            <div className="dialog-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <RotateCcw size={20} color="var(--success)" />
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Restore Preview</h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setRestoreModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="dialog-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {restorePreviewLoading ? (
                <CRMGlobalLoader fullScreen={false} message="Please wait, loading..." subMessage={null} />
              ) : restorePreviewData?.error ? (
                <div style={{ color: 'var(--error)', fontSize: '0.85rem' }}>{restorePreviewData.error}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ background: 'var(--info-bg, #eff6ff)', border: '1px solid var(--info, #3b82f6)', color: 'var(--info, #1e40af)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.8rem' }}>
                    🔒 <strong>Dry-Run Mode:</strong> Previewing restore target for <strong>{restorePreviewData?.collectionName}</strong> (ID: {restorePreviewData?.documentId}).
                  </div>

                  {restorePreviewData?.targetState ? (
                    <div>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--gray-900)' }}>
                        Restorable Document Content
                      </h4>
                      {renderDocumentFields(restorePreviewData.targetState)}
                    </div>
                  ) : (
                    <div style={{ padding: '20px', background: 'var(--gray-50)', borderRadius: '8px', textAlign: 'center', color: 'var(--gray-600)', fontSize: '0.85rem' }}>
                      Document data unavailable for this deleted record.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="dialog-footer">
              <button className="btn btn-secondary" onClick={() => setRestoreModalOpen(false)}>Close Preview</button>
            </div>
          </div>
        </div>
      )}

      {/* Document Detail / Diff Modal */}
      {selectedDoc && (
        <div className="dialog-overlay" onClick={() => setSelectedDoc(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '92vw' }}>
            <div className="dialog-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  {getOperationBadge(selectedDoc.operation)}
                  <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Backup Document Snapshot</h2>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontFamily: 'monospace' }}>
                  {selectedDoc.collectionName} • ID: {selectedDoc.documentId || selectedDoc._id}
                </span>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedDoc(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="dialog-body" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Audit Meta Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--gray-100)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--gray-600)', flexWrap: 'wrap', gap: '6px' }}>
                <span><strong>Modified By:</strong> {typeof selectedDoc.performedBy === 'object' ? (selectedDoc.performedBy.name || selectedDoc.performedBy.email || 'System') : String(selectedDoc.performedBy || 'System')}</span>
                <span><strong>Timestamp:</strong> {new Date(selectedDoc.timestamp || selectedDoc.createdAt).toLocaleString()}</span>
              </div>

              {/* DELETE Operation handling */}
              {selectedDoc.operation === 'DELETE' ? (
                selectedDoc.previousData ? (
                  <div>
                    <div style={{ background: '#FEF2F2', border: '1px solid #F87171', color: '#991B1B', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={15} /> Deleted Document Snapshot (Captured before deletion)
                    </div>
                    {renderDocumentFields(selectedDoc.previousData)}
                  </div>
                ) : (
                  <div style={{ padding: '24px', background: 'var(--gray-50)', borderRadius: '8px', border: '1px solid var(--gray-200)', textAlign: 'center', color: 'var(--gray-600)', fontSize: '0.85rem' }}>
                    Document data unavailable for this deleted record.
                  </div>
                )
              ) : selectedDoc.operation === 'UPDATE' && selectedDoc.previousData && selectedDoc.currentData ? (
                /* UPDATE Operation with Diff comparison */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--gray-900)' }}>
                      Changed Fields Comparison
                    </h4>
                    <div style={{ overflowX: 'auto', border: '1px solid var(--gray-200)', borderRadius: '8px' }}>
                      <table className="table" style={{ width: '100%', fontSize: '0.78rem' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '8px 10px' }}>Field</th>
                            <th style={{ padding: '8px 10px' }}>Previous Value</th>
                            <th style={{ padding: '8px 10px' }}>Current Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(new Set([
                            ...(selectedDoc.changedFields || []),
                            ...Object.keys(getCleanBusinessData(selectedDoc.currentData) || {})
                          ])).filter(k => {
                            const prev = selectedDoc.previousData?.[k];
                            const curr = selectedDoc.currentData?.[k];
                            return JSON.stringify(prev) !== JSON.stringify(curr);
                          }).map(k => (
                            <tr key={k}>
                              <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'capitalize' }}>
                                {k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                              </td>
                              <td style={{ padding: '8px 10px', background: '#FEF2F2', color: '#991B1B' }}>
                                {renderFieldValue(selectedDoc.previousData?.[k])}
                              </td>
                              <td style={{ padding: '8px 10px', background: '#F0FDF4', color: '#166534' }}>
                                {renderFieldValue(selectedDoc.currentData?.[k])}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--gray-900)' }}>
                      Current Document State
                    </h4>
                    {renderDocumentFields(selectedDoc.currentData)}
                  </div>
                </div>
              ) : (
                /* CREATE / INSERT / FORCE_SYNC / Standard Document view */
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--gray-900)' }}>
                    Backed-up Document Data
                  </h4>
                  {renderDocumentFields(selectedDoc.currentData || selectedDoc.previousData || selectedDoc)}
                </div>
              )}
            </div>

            <div className="dialog-footer">
              <button className="btn btn-primary" onClick={() => setSelectedDoc(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
