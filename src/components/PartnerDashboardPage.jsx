import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  LayoutDashboard, Layers, User, Key, Loader2, Menu, X, LogOut, Copy,
  Wallet, UserPlus, Clock, CheckCircle2, Award, Mail, Phone, Lock, Eye, AlertTriangle
} from 'lucide-react';
import ToastContainer, { useToast } from './Toast.jsx';

export default function PartnerDashboardPage() {
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Dashboard state variables
  const [stats, setStats] = useState({
    totalClicks: 0,
    uniqueVisitors: 0,
    totalBookings: 0,
    conversionRate: 0,
    completedProjects: 0,
    pendingProjects: 0,
    totalRevenue: 0,
    commissionEarned: 0,
    paidCommission: 0,
    pendingCommission: 0,
    topCampaign: 'N/A'
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentCommissions, setRecentCommissions] = useState([]);
  const [commissionsList, setCommissionsList] = useState([]);

  // Tab data lists
  const [campaigns, setCampaigns] = useState([]);
  const [commissions, setCommissions] = useState([]);

  // Profile Edit fields
  const [agencyName, setAgencyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Change Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Responsive sidebar toggler state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { toasts, addToast, removeToast } = useToast();

  const tabsContainerRef = React.useRef(null);

  // Auto-scroll mobile active tabs into view
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeTabEl = tabsContainerRef.current.querySelector('.tab.active');
      if (activeTabEl) {
        activeTabEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [activeTab]);

  // Fetch partner profile details
  const loadProfile = async () => {
    try {
      const res = await axios.get('/api/partners/me');
      setPartner(res.data.partner);
      setAgencyName(res.data.partner.agencyName || '');
      setOwnerName(res.data.partner.ownerName || '');
      setPartnerEmail(res.data.partner.email || '');
      setPartnerPhone(res.data.partner.phone || '');
      return res.data.partner;
    } catch (err) {
      window.location.href = '/partner/login';
      return null;
    }
  };

  // Fetch dashboard summary stats & commissions list
  const loadDashboardData = async () => {
    try {
      const res = await axios.get('/api/partners/dashboard');
      setStats(res.data.stats || {
        totalClicks: 0,
        uniqueVisitors: 0,
        totalBookings: 0,
        conversionRate: 0,
        completedProjects: 0,
        pendingProjects: 0,
        totalRevenue: 0,
        commissionEarned: 0,
        paidCommission: 0,
        pendingCommission: 0,
        topCampaign: 'N/A'
      });
      setRecentBookings(res.data.recentBookings || []);
      setRecentCommissions(res.data.recentCommissions || []);

      // Load all commissions to calculate pending, approved, paid sums dynamically
      const commsRes = await axios.get('/api/partners/commissions');
      setCommissionsList(commsRes.data.data || []);
    } catch (err) {}
  };

  // Load referral campaigns list
  const loadCampaigns = async () => {
    try {
      const res = await axios.get('/api/partners/campaigns');
      setCampaigns(res.data.data || []);
    } catch (err) {}
  };

  // Load commission payouts ledger
  const loadCommissions = async () => {
    try {
      const res = await axios.get('/api/partners/commissions');
      setCommissions(res.data.data || []);
      setCommissionsList(res.data.data || []);
    } catch (err) {}
  };

  // Log out of the workspace
  const handleLogout = async () => {
    try {
      await axios.post('/api/partners/logout');
      window.location.href = '/partner/login';
    } catch (err) {
      window.location.href = '/partner/login';
    }
  };

  // Save profile updates
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!agencyName || !ownerName || !partnerEmail || !partnerPhone) {
      addToast('Please fill in all profile fields.', 'warning');
      return;
    }

    setProfileSaving(true);
    try {
      const res = await axios.put('/api/partners/me', {
        agencyName,
        ownerName,
        email: partnerEmail,
        phone: partnerPhone
      });
      setPartner(res.data.partner);
      addToast('Profile details updated successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update profile.', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  // Update change password submit
  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      addToast('Please fill in all password fields.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match.', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      await axios.post('/api/partners/me/change-password', {
        currentPassword,
        newPassword
      });
      addToast('Password updated successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update password.', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Copy referral campaign redirect link
  const copyRefLink = (code) => {
    const link = `${window.location.origin}/r/${code}`;
    navigator.clipboard.writeText(link);
    addToast('Referral link copied to clipboard!', 'success');
  };

  // Initialize workspace view
  const initDashboard = async () => {
    setLoading(true);
    await loadProfile();
    setLoading(false);
  };

  useEffect(() => {
    initDashboard();
  }, []);

  // Fetch list data on active tab changes (avoiding duplicate fetch on initial mount)
  useEffect(() => {
    if (!partner) return;
    if (activeTab === 'campaigns') loadCampaigns();
    else if (activeTab === 'commissions') loadCommissions();
    else if (activeTab === 'dashboard') loadDashboardData();
  }, [activeTab, partner]);

  // Connect socket.io client to listen for real-time changes
  useEffect(() => {
    if (!partner?._id) return;

    const socketUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
    const socket = io(socketUrl, {
      withCredentials: true
    });

    socket.emit('register', partner._id);

    socket.on('commission-updated', () => {
      loadDashboardData();
      if (activeTab === 'commissions') loadCommissions();
    });

    return () => {
      socket.disconnect();
    };
  }, [partner?._id, activeTab]);

  // Dynamically calculate requested commission metrics
  const pendingCommSum = commissionsList
    .filter(c => c.status === 'Pending' || c.status === 'Payment Pending')
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  const approvedCommSum = commissionsList
    .filter(c => c.status === 'Approved')
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  const paidCommSum = commissionsList
    .filter(c => c.status === 'Paid')
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  const totalEarningsSum = pendingCommSum + approvedCommSum + paidCommSum;

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', background: 'var(--gray-50)', flexDirection: 'column', gap: '16px' }}>
        <Loader2 className="spinner" size={32} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 600 }}>Loading Partner Workspace...</span>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="app">
        
        {/* Responsive Overlay */}
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Unified Light-Theme CRM Sidebar */}
        <aside className={`app-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
          <div>
            <div className="sidebar-logo">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 850, margin: 0, color: '#FFF', letterSpacing: '-0.5px' }}>
                ViralCraft<span style={{ color: 'var(--accent)' }}>Partner</span>
              </h2>
            </div>

            <nav className="sidebar-nav">
              <div className="sidebar-group">
                <div className="sidebar-group-title">Hub Workspace</div>
                
                <button
                  className={`sidebar-link${activeTab === 'dashboard' ? ' active' : ''}`}
                  onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
                >
                  <LayoutDashboard size={18} />
                  Dashboard
                </button>

                <button
                  className={`sidebar-link${activeTab === 'campaigns' ? ' active' : ''}`}
                  onClick={() => { setActiveTab('campaigns'); setSidebarOpen(false); }}
                >
                  <Layers size={18} />
                  Campaign Links
                </button>

                <button
                  className={`sidebar-link${activeTab === 'commissions' ? ' active' : ''}`}
                  onClick={() => { setActiveTab('commissions'); setSidebarOpen(false); }}
                >
                  <Wallet size={18} />
                  Commission History
                </button>

                <button
                  className={`sidebar-link${activeTab === 'profile' ? ' active' : ''}`}
                  onClick={() => { setActiveTab('profile'); setSidebarOpen(false); }}
                >
                  <User size={18} />
                  Profile Settings
                </button>
              </div>
            </nav>
          </div>

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">
                {(partner?.ownerName || 'P').charAt(0).toUpperCase()}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{partner?.agencyName}</div>
                <div className="sidebar-user-role">{partner?.ownerName}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-icon"
              style={{ color: 'var(--error)' }}
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        {/* Unified Light-Theme Main Section */}
        <div className="app-main">
          
          {/* Sticky Header TopBar */}
          <header className="app-header">
            <div className="header-left">
              <button
                className="header-btn menu-toggle-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle menu"
              >
                <Menu size={18} />
              </button>
              <div className="header-breadcrumb">
                <span>Partner Portal</span>
                <span className="breadcrumb-separator">/</span>
                <span className="active">
                  {activeTab === 'dashboard' && 'Overview'}
                  {activeTab === 'campaigns' && 'Campaigns'}
                  {activeTab === 'commissions' && 'Ledger'}
                  {activeTab === 'profile' && 'Profile Settings'}
                </span>
              </div>
            </div>
            <div className="header-right">
              <div className="badge badge-success">Active Partner</div>
            </div>
          </header>

          {/* Mobile Swipeable Scrollable Header Tab bar (Issue 1) */}
          <div className="scrollable-tabs-bar mobile-header-tabbar" ref={tabsContainerRef}>
            {[
              { id: 'dashboard', name: 'Overview', icon: LayoutDashboard },
              { id: 'campaigns', name: 'Campaigns', icon: Layers },
              { id: 'commissions', name: 'Ledger', icon: Wallet },
              { id: 'profile', name: 'Profile', icon: User }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab ${active ? 'active' : ''}`}
                >
                  <Icon size={14} />
                  {tab.name}
                </button>
              );
            })}
          </div>

          <div className="app-content" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 1. DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="section-header" style={{ marginBottom: '0' }}>
                  <div>
                    <h1 className="section-title">Welcome back, {partner?.ownerName}</h1>
                    <p className="section-subtitle">Real-time performance details for {partner?.agencyName}</p>
                  </div>
                </div>

                {/* 7 Premium Light-Theme KPI Cards - No click/visitor stats (Issue 3 & 5) */}
                <div className="kpi-grid" style={{ gap: '12px' }}>
                  
                  <div className="kpi-card" style={{ padding: '16px' }}>
                    <div className="kpi-card-header">
                      <span className="kpi-title">Pending Commission</span>
                      <div className="kpi-icon kpi-icon-blue">
                        <Clock size={16} />
                      </div>
                    </div>
                    <div className="kpi-value">₹{pendingCommSum.toLocaleString()}</div>
                    <div className="kpi-subtitle">Unapproved ledger balance</div>
                  </div>

                  <div className="kpi-card" style={{ padding: '16px' }}>
                    <div className="kpi-card-header">
                      <span className="kpi-title">Approved Commission</span>
                      <div className="kpi-icon kpi-icon-orange">
                        <CheckCircle2 size={16} />
                      </div>
                    </div>
                    <div className="kpi-value">₹{approvedCommSum.toLocaleString()}</div>
                    <div className="kpi-subtitle">Approved waiting settlement</div>
                  </div>

                  <div className="kpi-card" style={{ padding: '16px' }}>
                    <div className="kpi-card-header">
                      <span className="kpi-title">Paid Commission</span>
                      <div className="kpi-icon kpi-icon-green">
                        <Wallet size={16} />
                      </div>
                    </div>
                    <div className="kpi-value">₹{paidCommSum.toLocaleString()}</div>
                    <div className="kpi-subtitle">Total paid commissions</div>
                  </div>

                  <div className="kpi-card" style={{ padding: '16px' }}>
                    <div className="kpi-card-header">
                      <span className="kpi-title">Total Earnings</span>
                      <div className="kpi-icon kpi-icon-purple">
                        <Award size={16} />
                      </div>
                    </div>
                    <div className="kpi-value">₹{totalEarningsSum.toLocaleString()}</div>
                    <div className="kpi-subtitle">Accumulated overall earnings</div>
                  </div>

                  <div className="kpi-card" style={{ padding: '16px' }}>
                    <div className="kpi-card-header">
                      <span className="kpi-title">Total Referral Leads</span>
                      <div className="kpi-icon kpi-icon-blue">
                        <UserPlus size={16} />
                      </div>
                    </div>
                    <div className="kpi-value">{stats?.totalBookings || 0}</div>
                    <div className="kpi-subtitle">Attributed bookings count</div>
                  </div>

                  <div className="kpi-card" style={{ padding: '16px' }}>
                    <div className="kpi-card-header">
                      <span className="kpi-title">Completed Projects</span>
                      <div className="kpi-icon kpi-icon-green">
                        <CheckCircle2 size={16} />
                      </div>
                    </div>
                    <div className="kpi-value">{stats?.completedProjects || 0}</div>
                    <div className="kpi-subtitle">Finalized customer projects</div>
                  </div>

                  <div className="kpi-card" style={{ padding: '16px' }}>
                    <div className="kpi-card-header">
                      <span className="kpi-title">Pending Projects</span>
                      <div className="kpi-icon kpi-icon-orange">
                        <Clock size={16} />
                      </div>
                    </div>
                    <div className="kpi-value">{stats?.pendingProjects || 0}</div>
                    <div className="kpi-subtitle">Active customer projects</div>
                  </div>

                </div>

                {/* Dashboard Lists Section */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  
                  {/* Recent Bookings List */}
                  <div className="card" style={{ padding: '16px' }}>
                    <div className="card-header" style={{ marginBottom: '12px' }}>
                      <h3 className="card-title">Recent Referral Bookings</h3>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                      {recentBookings.length === 0 ? (
                        <p style={{ color: 'var(--gray-400)', fontSize: '0.8125rem', textAlign: 'center', margin: '20px 0' }}>No bookings attributed yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {recentBookings.map(b => (
                            <div key={b._id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '10px 12px', border: '1px solid var(--gray-200)',
                              borderRadius: '8px', background: 'var(--gray-50)'
                            }}>
                              <div>
                                <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: 0, color: 'var(--gray-800)' }}>{b.service}</h4>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                  <span>{b.clientName}</span>
                                  <span>•</span>
                                  <span>{b.campaignName}</span>
                                </div>
                              </div>
                              <span className={`status-pill ${b.status === 'Completed' ? 'active' : b.status === 'Cancelled' ? 'error' : 'inactive'}`}>
                                {b.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Commission Updates & Settlements */}
                  <div className="card" style={{ padding: '16px' }}>
                    <div className="card-header" style={{ marginBottom: '12px' }}>
                      <h3 className="card-title">Recent Settlements & Updates</h3>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                      {recentCommissions.length === 0 ? (
                        <p style={{ color: 'var(--gray-400)', fontSize: '0.8125rem', textAlign: 'center', margin: '20px 0' }}>No commission records found.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {recentCommissions.map(c => (
                            <div key={c._id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '10px 12px', border: '1px solid var(--gray-200)',
                              borderRadius: '8px', background: 'var(--gray-50)'
                            }}>
                              <div>
                                <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: 0, color: 'var(--gray-800)' }}>{c.service}</h4>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--success)' }}>
                                  ₹{(c.commissionAmount || 0).toLocaleString()}
                                </div>
                                <span className={`badge ${
                                  c.status === 'Paid' ? 'badge-success' : c.status === 'Approved' ? 'badge-warning' : c.status === 'Rejected' || c.status === 'Cancelled' ? 'badge-error' : 'badge-gray'
                                }`} style={{ fontSize: '0.625rem', marginTop: '4px', display: 'inline-block' }}>
                                  {c.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* 2. CAMPAIGNS TAB */}
            {activeTab === 'campaigns' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="section-header" style={{ marginBottom: '0' }}>
                  <div>
                    <h1 className="section-title">Campaign referral Links</h1>
                    <p className="section-subtitle">Use your referral links below to attribute visitors and collect commissions.</p>
                  </div>
                </div>

                {/* Desktop View Table */}
                <div className="card desktop-only-table" style={{ padding: '16px' }}>
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Campaign Name</th>
                          <th>Referral Code</th>
                          <th>Target Landing Page</th>
                          <th>Valid / Expiry Date</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-400)' }}>No campaigns assigned yet.</td>
                          </tr>
                        ) : (
                          campaigns.map(c => {
                            const expired = c.expiryDate ? new Date(c.expiryDate) < new Date() : false;
                            return (
                              <tr key={c._id}>
                                <td><strong>{c.campaignName}</strong></td>
                                <td style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>{c.referralCode}</td>
                                <td>{c.landingPage}</td>
                                <td>
                                  <span style={{ color: expired ? 'var(--error)' : 'inherit' }}>
                                    {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : '—'}
                                  </span>
                                </td>
                                <td>
                                  <span className={`status-pill ${expired || c.status === 'EXPIRED' ? 'error' : c.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                                    {expired ? 'EXPIRED' : c.status}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {!expired && c.status === 'ACTIVE' && (
                                    <button
                                      onClick={() => copyRefLink(c.referralCode)}
                                      className="btn btn-primary"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8rem' }}
                                    >
                                      <Copy size={13} /> Copy Link
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Responsive Fallback Cards */}
                <div className="mobile-only-cards flex-col" style={{ gap: '12px' }}>
                  {campaigns.length === 0 ? (
                    <div className="card flex-center" style={{ padding: '30px', color: 'var(--gray-400)' }}>No campaigns assigned yet.</div>
                  ) : (
                    campaigns.map(c => {
                      const expired = c.expiryDate ? new Date(c.expiryDate) < new Date() : false;
                      return (
                        <div key={c._id} className="card" style={{ padding: '16px' }}>
                          <div className="flex-col" style={{ gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>{c.campaignName}</h4>
                                <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>Path: {c.landingPage}</span>
                              </div>
                              <span className={`status-pill ${expired || c.status === 'EXPIRED' ? 'error' : c.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                                {expired ? 'EXPIRED' : c.status}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--gray-50)', padding: '10px', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                              <div>
                                <div style={{ fontSize: '0.625rem', color: 'var(--gray-400)', fontWeight: 600 }}>REFERRAL CODE</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700 }}>{c.referralCode}</div>
                              </div>
                              {!expired && c.status === 'ACTIVE' && (
                                <button
                                  onClick={() => copyRefLink(c.referralCode)}
                                  className="btn btn-outline"
                                  style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Copy size={12} /> Copy
                                </button>
                              )}
                            </div>

                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>Validity Expiry:</span>
                              <strong style={{ color: expired ? 'var(--error)' : 'var(--gray-800)' }}>
                                {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : '—'}
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 3. COMMISSION HISTORY TAB */}
            {activeTab === 'commissions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="section-header" style={{ marginBottom: '0' }}>
                  <div>
                    <h1 className="section-title">Commissions & Payout History</h1>
                    <p className="section-subtitle">Track status updates, payment values, bank transaction reference tags and notes.</p>
                  </div>
                </div>

                {/* Desktop View Table */}
                <div className="card desktop-only-table" style={{ padding: '16px' }}>
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Service Category</th>
                          <th>Origin Campaign</th>
                          <th>Commission Amount</th>
                          <th>Status</th>
                          <th>Settlement Date</th>
                          <th>Admin Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissions.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-400)' }}>No commission logs found.</td>
                          </tr>
                        ) : (
                          commissions.map(c => (
                            <tr key={c._id}>
                              <td><strong>{c.service}</strong></td>
                              <td>{c.campaignName}</td>
                              <td style={{ color: 'var(--success)', fontWeight: 700 }}>
                                ₹{(c.commissionAmount || 0).toLocaleString()}
                              </td>
                              <td>
                                <span className={`badge ${
                                  c.status === 'Paid' ? 'badge-success' : c.status === 'Approved' ? 'badge-warning' : c.status === 'Rejected' || c.status === 'Cancelled' ? 'badge-error' : 'badge-gray'
                                }`}>
                                  {c.status}
                                </span>
                              </td>
                              <td>{c.paymentDate ? new Date(c.paymentDate).toLocaleDateString() : '—'}</td>
                              <td style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>{c.adminNotes || '—'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Responsive Fallback Cards */}
                <div className="mobile-only-cards flex-col" style={{ gap: '12px' }}>
                  {commissions.length === 0 ? (
                    <div className="card flex-center" style={{ padding: '30px', color: 'var(--gray-400)' }}>No commission logs found.</div>
                  ) : (
                    commissions.map(c => (
                      <div key={c._id} className="card" style={{ padding: '16px' }}>
                        <div className="flex-col" style={{ gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>{c.service}</h4>
                              <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>Campaign: {c.campaignName}</span>
                            </div>
                            <span className={`badge ${
                              c.status === 'Paid' ? 'badge-success' : c.status === 'Approved' ? 'badge-warning' : c.status === 'Rejected' || c.status === 'Cancelled' ? 'badge-error' : 'badge-gray'
                            }`}>
                              {c.status}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', background: 'var(--gray-50)', padding: '8px', borderRadius: '8px', fontSize: '0.8rem' }}>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ display: 'block', fontSize: '0.625rem', color: 'var(--gray-400)' }}>COMMISSION</span>
                              <strong style={{ color: 'var(--success)' }}>₹{(c.commissionAmount || 0).toLocaleString()}</strong>
                            </div>
                          </div>

                          {c.status === 'Paid' && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', borderTop: '1px solid var(--gray-100)', paddingTop: '8px' }} className="flex-col">
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Paid Date:</span>
                                <strong>{new Date(c.paymentDate).toLocaleDateString()}</strong>
                              </div>

                            </div>
                          )}

                          {c.adminNotes && (
                            <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', padding: '8px', borderRadius: '6px', fontSize: '0.75rem', color: '#92400E' }}>
                              <strong>Note:</strong> {c.adminNotes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 4. PROFILE TAB */}
            {activeTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="section-header" style={{ marginBottom: '0' }}>
                  <div>
                    <h1 className="section-title">Profile & Portal Settings</h1>
                    <p className="section-subtitle">Change agency details, contact information, and security portal credentials.</p>
                  </div>
                </div>

                <div className="profile-grid" style={{ gap: '20px' }}>
                  
                  {/* Agency Information & Contact Details */}
                  <div className="card" style={{ padding: '16px' }}>
                    <div className="card-header" style={{ marginBottom: '12px' }}>
                      <h3 className="card-title">Agency & Contact Information</h3>
                    </div>
                    <form onSubmit={handleProfileSubmit}>
                      <div className="flex-col" style={{ gap: '12px' }}>
                        <div className="form-group">
                          <label className="form-label">Agency Name *</label>
                          <input
                            type="text" required
                            value={agencyName} onChange={e => setAgencyName(e.target.value)}
                            className="input"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Owner Name *</label>
                          <input
                            type="text" required
                            value={ownerName} onChange={e => setOwnerName(e.target.value)}
                            className="input"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Contact Email Address *</label>
                          <input
                            type="email" required
                            value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)}
                            className="input"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">WhatsApp Number *</label>
                          <input
                            type="text" required
                            value={partnerPhone} onChange={e => setPartnerPhone(e.target.value)}
                            className="input"
                          />
                        </div>
                      </div>
                      
                      <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)', padding: '12px 16px', margin: '16px -16px -16px -16px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                        <button
                          type="submit" disabled={profileSaving}
                          className="btn btn-primary"
                        >
                          {profileSaving ? <Loader2 size={14} className="spinner" /> : 'Save Profile Changes'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Change Password Form */}
                  <div className="card" style={{ padding: '16px' }}>
                    <div className="card-header" style={{ marginBottom: '12px' }}>
                      <h3 className="card-title">Change Portal Password</h3>
                    </div>
                    <form onSubmit={handlePasswordChangeSubmit}>
                      <div className="flex-col" style={{ gap: '12px' }}>
                        <div className="form-group">
                          <label className="form-label">Current password *</label>
                          <input
                            type="password" required placeholder="Enter current password"
                            value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                            className="input"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">New Password *</label>
                          <input
                            type="password" required placeholder="Enter new password"
                            value={newPassword} onChange={e => setNewPassword(e.target.value)}
                            className="input"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Confirm New Password *</label>
                          <input
                            type="password" required placeholder="Confirm new password"
                            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                            className="input"
                          />
                        </div>
                      </div>

                      <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)', padding: '12px 16px', margin: '16px -16px -16px -16px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                        <button
                          type="submit" disabled={passwordLoading}
                          className="btn btn-primary"
                        >
                          {passwordLoading ? <Loader2 size={14} className="spinner" /> : 'Update Password'}
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Styled Overrides for light-theme Partner Portal integration */}
      <style>{`
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .flex-center { display: flex; align-items: center; justify-content: center; }
        .flex-col { display: flex; flex-direction: column; }
        
        .profile-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        /* Scrollable Tabs Bar CSS */
        .scrollable-tabs-bar {
          display: flex;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          background: var(--white);
          border-bottom: 1px solid var(--gray-200);
          gap: 8px;
          padding: 4px 16px;
        }
        .scrollable-tabs-bar::-webkit-scrollbar {
          display: none;
        }
        .scrollable-tabs-bar .tab {
          flex: 0 0 auto;
          scroll-snap-align: start;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--gray-500);
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .scrollable-tabs-bar .tab.active {
          color: var(--accent);
          border-bottom-color: var(--accent);
          font-weight: 600;
        }

        .mobile-header-tabbar {
          display: none;
        }

        /* Desktop Only & Mobile Only Responsive Helpers */
        @media (min-width: 768px) {
          .mobile-only-cards { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-only-table { display: none !important; }
          .profile-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 1024px) {
          .mobile-header-tabbar {
            display: flex !important;
            margin-top: 60px; /* offset for mobile-header */
          }
          .app-main {
            margin-left: 0 !important;
          }
          .app-content {
            padding-top: 10px !important;
          }
        }
      `}</style>
    </>
  );
}
