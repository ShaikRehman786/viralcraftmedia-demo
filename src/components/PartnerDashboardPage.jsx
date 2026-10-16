import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  LayoutDashboard, Layers, User, Key, Loader2, Menu, X, LogOut, Copy,
  Wallet, UserPlus, Clock, CheckCircle2, Award, Mail, Phone, Lock, Eye, EyeOff,
  Check, Search, ShieldCheck, Briefcase, ChevronRight, Sparkles, Building
} from 'lucide-react';
import ToastContainer, { useToast } from './Toast.jsx';
import { PARTNER_LOGIN_PATH } from '../utils/partnerAuth.js';

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

  // Client-side search and filter UI states
  const [copiedCode, setCopiedCode] = useState(null);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [commissionSearch, setCommissionSearch] = useState('');
  const [commissionStatusFilter, setCommissionStatusFilter] = useState('all');

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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Responsive sidebar toggler state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on Escape and lock body scroll — parity with CRM Sidebar
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  useEffect(() => {
    if (sidebarOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [sidebarOpen]);

  const handlePartnerNav = (tabId) => {
    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  const { toasts, addToast, removeToast } = useToast();
  const tabsContainerRef = useRef(null);

  // Auto-scroll mobile active tabs into view
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeTabEl = tabsContainerRef.current.querySelector('.pp-tab-btn.active');
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
      window.location.href = PARTNER_LOGIN_PATH;
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
      window.location.href = PARTNER_LOGIN_PATH;
    } catch (err) {
      window.location.href = PARTNER_LOGIN_PATH;
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
    if (newPassword.length < 6) {
      addToast('New password should be at least 6 characters long.', 'warning');
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
    setCopiedCode(code);
    addToast('Referral link copied to clipboard!', 'success');
    setTimeout(() => {
      setCopiedCode(prev => prev === code ? null : prev);
    }, 2500);
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

  // Fetch list data on active tab changes
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
  const pendingCommSum = useMemo(() => {
    return commissionsList
      .filter(c => c.status === 'Pending' || c.status === 'Payment Pending')
      .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  }, [commissionsList]);

  const approvedCommSum = useMemo(() => {
    return commissionsList
      .filter(c => c.status === 'Approved')
      .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  }, [commissionsList]);

  const paidCommSum = useMemo(() => {
    return commissionsList
      .filter(c => c.status === 'Paid')
      .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  }, [commissionsList]);

  const totalEarningsSum = pendingCommSum + approvedCommSum + paidCommSum;

  // Filtered campaigns list for UI
  const filteredCampaigns = useMemo(() => {
    if (!campaignSearch.trim()) return campaigns;
    const query = campaignSearch.toLowerCase();
    return campaigns.filter(c => 
      (c.campaignName && c.campaignName.toLowerCase().includes(query)) ||
      (c.referralCode && c.referralCode.toLowerCase().includes(query)) ||
      (c.landingPage && c.landingPage.toLowerCase().includes(query))
    );
  }, [campaigns, campaignSearch]);

  // Filtered commissions list for UI
  const filteredCommissions = useMemo(() => {
    let list = commissions;
    if (commissionStatusFilter !== 'all') {
      if (commissionStatusFilter === 'Pending') {
        list = list.filter(c => c.status === 'Pending' || c.status === 'Payment Pending');
      } else {
        list = list.filter(c => c.status === commissionStatusFilter);
      }
    }
    if (commissionSearch.trim()) {
      const query = commissionSearch.toLowerCase();
      list = list.filter(c => 
        (c.service && c.service.toLowerCase().includes(query)) ||
        (c.campaignName && c.campaignName.toLowerCase().includes(query)) ||
        (c.adminNotes && c.adminNotes.toLowerCase().includes(query))
      );
    }
    return list;
  }, [commissions, commissionStatusFilter, commissionSearch]);

  const primaryCampaign = campaigns && campaigns.length > 0 ? campaigns[0] : null;

  if (loading) {
    return (
      <div className="pp-loader-screen">
        <div className="pp-loader-card">
          <Loader2 className="pp-spinner" size={36} />
          <div className="pp-loader-text">
            <h4>Loading Partner Portal</h4>
            <p>Authenticating credentials and fetching workspace details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="app pp-portal-root">
        
        {/* Responsive Mobile Drawer Overlay */}
        {sidebarOpen && (
          <div 
            className="sidebar-overlay pp-sidebar-overlay active" 
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Unified Partner Sidebar */}
        <aside className={`app-sidebar pp-sidebar${sidebarOpen ? ' sidebar-open' : ''}`} aria-label="Partner Navigation">
          <div className="pp-sidebar-header">
            <a href="/" className="pp-sidebar-brand" aria-label="ViralCraftMedia">
              <img src="/logoooooooooo.png" alt="ViralCraft Media" className="pp-sidebar-logo" />
            </a>
            <button 
              type="button" 
              className="pp-sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation menu"
            >
              <X size={18} />
            </button>
          </div>

          <div className="pp-sidebar-badge-wrap">
            <span className="pp-portal-badge">
              <Sparkles size={13} />
              Partner Workspace
            </span>
          </div>

          <nav className="sidebar-nav pp-sidebar-nav">
            <div className="sidebar-group">
              <div className="sidebar-group-title pp-nav-title">Navigation Hub</div>
              
              <button 
                type="button"
                className={`sidebar-link pp-nav-link${activeTab === 'dashboard' ? ' active' : ''}`}
                onClick={() => handlePartnerNav('dashboard')}
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </button>

              <button 
                type="button"
                className={`sidebar-link pp-nav-link${activeTab === 'campaigns' ? ' active' : ''}`}
                onClick={() => handlePartnerNav('campaigns')}
              >
                <Layers size={18} />
                <span>Campaign Links</span>
                {campaigns.length > 0 && (
                  <span className="pp-nav-count">{campaigns.length}</span>
                )}
              </button>

              <button 
                type="button"
                className={`sidebar-link pp-nav-link${activeTab === 'commissions' ? ' active' : ''}`}
                onClick={() => handlePartnerNav('commissions')}
              >
                <Wallet size={18} />
                <span>Commission History</span>
                {commissionsList.length > 0 && (
                  <span className="pp-nav-count">{commissionsList.length}</span>
                )}
              </button>

              <button 
                type="button"
                className={`sidebar-link pp-nav-link${activeTab === 'profile' ? ' active' : ''}`}
                onClick={() => handlePartnerNav('profile')}
              >
                <User size={18} />
                <span>Profile Settings</span>
              </button>
            </div>
          </nav>

          <div className="sidebar-footer pp-sidebar-footer">
            <div className="sidebar-user pp-sidebar-user">
              <div className="sidebar-avatar pp-sidebar-avatar">
                {(partner?.agencyName || partner?.ownerName || 'P').charAt(0).toUpperCase()}
              </div>
              <div className="sidebar-user-info pp-sidebar-user-info">
                <div className="sidebar-user-name pp-user-agency">{partner?.agencyName || 'Partner'}</div>
                <div className="sidebar-user-role pp-user-owner">{partner?.ownerName || 'Agency Owner'}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="pp-sidebar-logout-btn"
              type="button"
              title="Sign out of Partner Portal"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="app-main pp-main">
          
          {/* Header Bar */}
          <header className="app-header pp-header">
            <div className="header-left pp-header-left">
              <button 
                type="button"
                className="header-btn pp-menu-toggle-btn"
                onClick={() => setSidebarOpen(prev => !prev)}
                aria-label="Toggle navigation menu"
                aria-expanded={sidebarOpen}
              >
                <Menu size={20} />
              </button>

              <a href="/" className="header-brand pp-header-brand" aria-label="ViralCraftMedia home">
                <img src="/logoooooooooo.png" alt="ViralCraft Media" className="topbar-logo pp-topbar-logo" />
              </a>

              <div className="header-breadcrumb pp-breadcrumb">
                <span className="pp-breadcrumb-root">Partner Portal</span>
                <span className="breadcrumb-separator">/</span>
                <span className="active pp-breadcrumb-active">
                  {activeTab === 'dashboard' && 'Dashboard Overview'}
                  {activeTab === 'campaigns' && 'Campaign Links'}
                  {activeTab === 'commissions' && 'Commission Ledger'}
                  {activeTab === 'profile' && 'Profile Settings'}
                </span>
              </div>
            </div>

            <div className="header-right pp-header-right">
              <div className="pp-partner-status-chip">
                <span className="pp-status-dot" />
                <span className="pp-status-label">Active Partner</span>
              </div>

              <button
                onClick={handleLogout}
                className="btn btn-ghost btn-sm pp-header-logout-btn"
                title="Logout of portal"
                type="button"
              >
                <LogOut size={15} />
                <span className="pp-logout-text">Logout</span>
              </button>
            </div>
          </header>

          {/* Mobile Horizontal Navigation Tabs */}
          <div className="pp-mobile-tabbar-container">
            <div className="scrollable-tabs-bar pp-mobile-tabbar" ref={tabsContainerRef}>
              {[
                { id: 'dashboard', name: 'Overview', icon: LayoutDashboard },
                { id: 'campaigns', name: 'Campaigns', icon: Layers, count: campaigns.length },
                { id: 'commissions', name: 'Ledger', icon: Wallet, count: commissionsList.length },
                { id: 'profile', name: 'Profile', icon: User }
              ].map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pp-tab-btn ${active ? 'active' : ''}`}
                    type="button"
                  >
                    <Icon size={15} />
                    <span>{tab.name}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="pp-tab-chip">{tab.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="app-content pp-content">
            
            {/* ========================================================================= */}
            {/* 1. DASHBOARD OVERVIEW TAB                                                */}
            {/* ========================================================================= */}
            {activeTab === 'dashboard' && (
              <div className="pp-tab-pane">
                
                {/* Welcome & Agency Hero Banner */}
                <div className="pp-welcome-banner">
                  <div className="pp-welcome-content">
                    <div className="pp-welcome-tag">
                      <ShieldCheck size={14} className="pp-verified-icon" />
                      <span>Verified Agency Partner</span>
                    </div>
                    <h1 className="pp-welcome-heading">Welcome back, {partner?.ownerName || 'Partner'}</h1>
                    <p className="pp-welcome-sub">
                      Tracking real-time performance, referral leads, and commission disbursements for <strong className="pp-strong">{partner?.agencyName}</strong>.
                    </p>
                  </div>
                  
                  {primaryCampaign && (
                    <div className="pp-banner-quicklink">
                      <div className="pp-quicklink-label">PRIMARY REFERRAL CODE</div>
                      <div className="pp-quicklink-box">
                        <span className="pp-code-mono">{primaryCampaign.referralCode}</span>
                        <button
                          type="button"
                          onClick={() => copyRefLink(primaryCampaign.referralCode)}
                          className="pp-btn-copy-chip"
                          title="Copy referral link"
                        >
                          {copiedCode === primaryCampaign.referralCode ? (
                            <>
                              <Check size={13} className="pp-text-success" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section: Earnings & Commission Metrics */}
                <div className="pp-section-group">
                  <div className="pp-group-header">
                    <div>
                      <h2 className="pp-group-title">Financial Summary & Payouts</h2>
                      <p className="pp-group-sub">Real-time ledger totals calculated across all attributed bookings</p>
                    </div>
                    <button 
                      type="button"
                      className="pp-inline-link"
                      onClick={() => setActiveTab('commissions')}
                    >
                      <span>View Full Ledger</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>

                  <div className="pp-kpi-grid pp-financial-grid">
                    
                    {/* Hero Card: Total Earnings */}
                    <div className="pp-kpi-card pp-kpi-hero">
                      <div className="pp-kpi-top">
                        <span className="pp-kpi-title">Total Lifetime Earnings</span>
                        <div className="pp-kpi-icon-wrap pp-icon-accent">
                          <Award size={18} />
                        </div>
                      </div>
                      <div className="pp-kpi-number">₹{totalEarningsSum.toLocaleString()}</div>
                      <div className="pp-kpi-footer-note">
                        <span className="pp-badge-pill pp-pill-accent">Accumulated</span>
                        <span>All approved & paid commissions</span>
                      </div>
                    </div>

                    {/* Paid Commission */}
                    <div className="pp-kpi-card">
                      <div className="pp-kpi-top">
                        <span className="pp-kpi-title">Paid Out Commissions</span>
                        <div className="pp-kpi-icon-wrap pp-icon-green">
                          <Wallet size={18} />
                        </div>
                      </div>
                      <div className="pp-kpi-number pp-number-success">₹{paidCommSum.toLocaleString()}</div>
                      <div className="pp-kpi-footer-note">
                        <span className="pp-badge-pill pp-pill-green">Settled</span>
                        <span>Disbursed to bank account</span>
                      </div>
                    </div>

                    {/* Approved Commission */}
                    <div className="pp-kpi-card">
                      <div className="pp-kpi-top">
                        <span className="pp-kpi-title">Approved Commission</span>
                        <div className="pp-kpi-icon-wrap pp-icon-orange">
                          <CheckCircle2 size={18} />
                        </div>
                      </div>
                      <div className="pp-kpi-number">₹{approvedCommSum.toLocaleString()}</div>
                      <div className="pp-kpi-footer-note">
                        <span className="pp-badge-pill pp-pill-amber">Ready</span>
                        <span>Queued for upcoming payout</span>
                      </div>
                    </div>

                    {/* Pending Commission */}
                    <div className="pp-kpi-card">
                      <div className="pp-kpi-top">
                        <span className="pp-kpi-title">Pending Verification</span>
                        <div className="pp-kpi-icon-wrap pp-icon-blue">
                          <Clock size={18} />
                        </div>
                      </div>
                      <div className="pp-kpi-number">₹{pendingCommSum.toLocaleString()}</div>
                      <div className="pp-kpi-footer-note">
                        <span className="pp-badge-pill pp-pill-blue">In Review</span>
                        <span>Project in active progress</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Section: Project & Attribution Performance */}
                <div className="pp-section-group">
                  <div className="pp-group-header">
                    <div>
                      <h2 className="pp-group-title">Attribution & Referral Pipeline</h2>
                      <p className="pp-group-sub">Customer bookings and delivery milestones attributed to your agency</p>
                    </div>
                  </div>

                  <div className="pp-kpi-grid pp-pipeline-grid">
                    
                    <div className="pp-kpi-card pp-stat-simple">
                      <div className="pp-kpi-top">
                        <span className="pp-kpi-title">Total Referral Leads</span>
                        <div className="pp-kpi-icon-wrap pp-icon-blue">
                          <UserPlus size={18} />
                        </div>
                      </div>
                      <div className="pp-kpi-number">{stats?.totalBookings || 0}</div>
                      <div className="pp-kpi-footer-note">
                        <span>Total attributed customer inquiries & bookings</span>
                      </div>
                    </div>

                    <div className="pp-kpi-card pp-stat-simple">
                      <div className="pp-kpi-top">
                        <span className="pp-kpi-title">Active / Pending Deliveries</span>
                        <div className="pp-kpi-icon-wrap pp-icon-orange">
                          <Clock size={18} />
                        </div>
                      </div>
                      <div className="pp-kpi-number">{stats?.pendingProjects || 0}</div>
                      <div className="pp-kpi-footer-note">
                        <span>Client projects currently in production</span>
                      </div>
                    </div>

                    <div className="pp-kpi-card pp-stat-simple">
                      <div className="pp-kpi-top">
                        <span className="pp-kpi-title">Completed Projects</span>
                        <div className="pp-kpi-icon-wrap pp-icon-green">
                          <CheckCircle2 size={18} />
                        </div>
                      </div>
                      <div className="pp-kpi-number">{stats?.completedProjects || 0}</div>
                      <div className="pp-kpi-footer-note">
                        <span>Successfully finalized & handed-over projects</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Dashboard Split: Recent Activity */}
                <div className="pp-dashboard-split">
                  
                  {/* Recent Bookings Box */}
                  <div className="pp-card pp-activity-box">
                    <div className="pp-card-header">
                      <div className="pp-card-title-wrap">
                        <Briefcase size={17} className="pp-card-title-icon" />
                        <div>
                          <h3 className="pp-card-title">Recent Attributed Bookings</h3>
                          <span className="pp-card-meta">{recentBookings.length} latest entries</span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setActiveTab('campaigns')}
                        className="pp-card-link-btn"
                      >
                        Campaigns
                      </button>
                    </div>

                    <div className="pp-card-body">
                      {recentBookings.length === 0 ? (
                        <div className="pp-empty-state-mini">
                          <UserPlus size={32} className="pp-empty-icon" />
                          <h4 className="pp-empty-title">No bookings attributed yet</h4>
                          <p className="pp-empty-text">
                            When potential clients click your referral links and book a service, their booking details will appear here in real time.
                          </p>
                        </div>
                      ) : (
                        <div className="pp-activity-list">
                          {recentBookings.map((b, idx) => (
                            <div key={b._id || idx} className="pp-activity-item">
                              <div className="pp-activity-main">
                                <div className="pp-activity-service">{b.service || 'Creative Service'}</div>
                                <div className="pp-activity-meta">
                                  <span className="pp-meta-client">{b.clientName || 'Private Client'}</span>
                                  <span className="pp-meta-sep">•</span>
                                  <span className="pp-meta-campaign">{b.campaignName || 'General Campaign'}</span>
                                </div>
                              </div>
                              <span className={`pp-status-badge ${
                                b.status === 'Completed' ? 'status-completed' :
                                b.status === 'Cancelled' ? 'status-cancelled' : 'status-pending'
                              }`}>
                                {b.status || 'Active'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Commissions Box */}
                  <div className="pp-card pp-activity-box">
                    <div className="pp-card-header">
                      <div className="pp-card-title-wrap">
                        <Wallet size={17} className="pp-card-title-icon" />
                        <div>
                          <h3 className="pp-card-title">Recent Settlements & Updates</h3>
                          <span className="pp-card-meta">{recentCommissions.length} latest logs</span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setActiveTab('commissions')}
                        className="pp-card-link-btn"
                      >
                        Ledger
                      </button>
                    </div>

                    <div className="pp-card-body">
                      {recentCommissions.length === 0 ? (
                        <div className="pp-empty-state-mini">
                          <Wallet size={32} className="pp-empty-icon" />
                          <h4 className="pp-empty-title">No commission logs recorded</h4>
                          <p className="pp-empty-text">
                            Completed milestones and approved commission payouts will be documented here with settlement logs.
                          </p>
                        </div>
                      ) : (
                        <div className="pp-activity-list">
                          {recentCommissions.map((c, idx) => (
                            <div key={c._id || idx} className="pp-activity-item">
                              <div className="pp-activity-main">
                                <div className="pp-activity-service">{c.service || 'Service Commission'}</div>
                                <div className="pp-activity-meta">
                                  <span className="pp-meta-campaign">{c.campaignName || 'Attributed Referral'}</span>
                                </div>
                              </div>
                              <div className="pp-activity-right">
                                <div className="pp-amount-badge">
                                  ₹{(c.commissionAmount || 0).toLocaleString()}
                                </div>
                                <span className={`pp-status-badge ${
                                  c.status === 'Paid' ? 'status-completed' :
                                  c.status === 'Approved' ? 'status-approved' :
                                  c.status === 'Rejected' || c.status === 'Cancelled' ? 'status-cancelled' : 'status-pending'
                                }`}>
                                  {c.status || 'Pending'}
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

            {/* ========================================================================= */}
            {/* 2. CAMPAIGNS TAB                                                         */}
            {/* ========================================================================= */}
            {activeTab === 'campaigns' && (
              <div className="pp-tab-pane">
                
                {/* Header with Title & Action */}
                <div className="pp-pane-header">
                  <div>
                    <h1 className="pp-pane-title">Campaign Referral Links</h1>
                    <p className="pp-pane-subtitle">
                      Share your custom referral URLs. Inquiries and bookings originating from these links are securely attributed to your partner account.
                    </p>
                  </div>
                </div>

                {/* Guidance Banner */}
                <div className="pp-guidance-card">
                  <div className="pp-guidance-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="pp-guidance-text">
                    <strong>How Link Tracking Works:</strong> When someone opens your link, our system cookies their browser session. When they submit an inquiry or place an order for video editing, social media marketing, or web development, your commission is automatically logged in your ledger.
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="pp-filter-bar">
                  <div className="pp-search-wrap">
                    <Search size={16} className="pp-search-icon" />
                    <input
                      type="text"
                      value={campaignSearch}
                      onChange={e => setCampaignSearch(e.target.value)}
                      placeholder="Search campaigns by name, code, or target URL..."
                      className="pp-search-input"
                    />
                    {campaignSearch && (
                      <button 
                        type="button" 
                        onClick={() => setCampaignSearch('')}
                        className="pp-clear-search-btn"
                        aria-label="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="pp-filter-summary">
                    <span>Showing <strong>{filteredCampaigns.length}</strong> of {campaigns.length} campaigns</span>
                  </div>
                </div>

                {/* Desktop View Table */}
                <div className="pp-card pp-desktop-only-table">
                  <div className="pp-table-container">
                    <table className="pp-table">
                      <thead>
                        <tr>
                          <th style={{ width: '25%' }}>Campaign Name</th>
                          <th style={{ width: '30%' }}>Referral Code & Direct URL</th>
                          <th style={{ width: '15%' }}>Target Destination</th>
                          <th style={{ width: '12%' }}>Validity Expiry</th>
                          <th style={{ width: '10%' }}>Status</th>
                          <th style={{ width: '8%', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCampaigns.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="pp-td-empty">
                              <div className="pp-table-empty">
                                <Layers size={32} className="pp-empty-icon" />
                                <h4>No campaigns found</h4>
                                <p>{campaignSearch ? 'Try adjusting your search query.' : 'No referral campaigns assigned to your account yet.'}</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredCampaigns.map(c => {
                            const expired = c.expiryDate ? new Date(c.expiryDate) < new Date() : false;
                            const fullUrl = `${window.location.origin}/r/${c.referralCode}`;
                            const isCopied = copiedCode === c.referralCode;

                            return (
                              <tr key={c._id} className="pp-table-row">
                                <td>
                                  <div className="pp-campaign-name-cell">
                                    <strong className="pp-campaign-title">{c.campaignName}</strong>
                                    {c.description && (
                                      <span className="pp-campaign-subdesc">{c.description}</span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <div className="pp-url-cell-wrap">
                                    <div className="pp-code-badge">{c.referralCode}</div>
                                    <div className="pp-full-url-preview" title={fullUrl}>
                                      {fullUrl}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="pp-path-chip" title={c.landingPage}>
                                    {c.landingPage || '/'}
                                  </span>
                                </td>
                                <td>
                                  <div className="pp-expiry-cell">
                                    {c.expiryDate ? (
                                      <span className={expired ? 'pp-text-danger font-semibold' : 'pp-text-muted'}>
                                        {new Date(c.expiryDate).toLocaleDateString(undefined, {
                                          year: 'numeric', month: 'short', day: 'numeric'
                                        })}
                                      </span>
                                    ) : (
                                      <span className="pp-text-muted">Permanent / Never</span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span className={`pp-status-badge ${
                                    expired || c.status === 'EXPIRED' ? 'status-cancelled' :
                                    c.status === 'ACTIVE' ? 'status-completed' : 'status-pending'
                                  }`}>
                                    {expired ? 'EXPIRED' : c.status || 'ACTIVE'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {!expired && c.status === 'ACTIVE' ? (
                                    <button
                                      type="button"
                                      onClick={() => copyRefLink(c.referralCode)}
                                      className={`btn btn-sm ${isCopied ? 'btn-success' : 'btn-primary'} pp-btn-action-copy`}
                                      title="Copy referral link to clipboard"
                                    >
                                      {isCopied ? (
                                        <>
                                          <Check size={13} />
                                          <span>Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy size={13} />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <span className="pp-text-muted pp-text-sm">—</span>
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

                {/* Mobile Responsive Cards */}
                <div className="pp-mobile-only-cards">
                  {filteredCampaigns.length === 0 ? (
                    <div className="pp-card pp-empty-state-card">
                      <Layers size={32} className="pp-empty-icon" />
                      <h4>No campaigns found</h4>
                      <p>{campaignSearch ? 'Try a different search term.' : 'No referral campaigns assigned yet.'}</p>
                    </div>
                  ) : (
                    filteredCampaigns.map(c => {
                      const expired = c.expiryDate ? new Date(c.expiryDate) < new Date() : false;
                      const fullUrl = `${window.location.origin}/r/${c.referralCode}`;
                      const isCopied = copiedCode === c.referralCode;

                      return (
                        <div key={c._id} className="pp-card pp-mobile-card">
                          <div className="pp-mobile-card-header">
                            <div>
                              <h3 className="pp-mobile-card-title">{c.campaignName}</h3>
                              <span className="pp-mobile-card-path">Target: {c.landingPage || '/'}</span>
                            </div>
                            <span className={`pp-status-badge ${
                              expired || c.status === 'EXPIRED' ? 'status-cancelled' :
                              c.status === 'ACTIVE' ? 'status-completed' : 'status-pending'
                            }`}>
                              {expired ? 'EXPIRED' : c.status || 'ACTIVE'}
                            </span>
                          </div>

                          <div className="pp-mobile-code-box">
                            <div className="pp-mobile-code-info">
                              <span className="pp-mobile-code-label">REFERRAL URL</span>
                              <div className="pp-mobile-code-link" title={fullUrl}>{fullUrl}</div>
                            </div>
                            {!expired && c.status === 'ACTIVE' && (
                              <button
                                type="button"
                                onClick={() => copyRefLink(c.referralCode)}
                                className={`pp-mobile-copy-btn ${isCopied ? 'copied' : ''}`}
                                aria-label="Copy referral link"
                              >
                                {isCopied ? <Check size={16} /> : <Copy size={16} />}
                                <span>{isCopied ? 'Copied' : 'Copy'}</span>
                              </button>
                            )}
                          </div>

                          <div className="pp-mobile-card-footer">
                            <span className="pp-mobile-footer-label">Validity Expiry:</span>
                            <span className={expired ? 'pp-text-danger font-semibold' : 'pp-text-muted'}>
                              {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'Permanent'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. COMMISSION HISTORY TAB                                                */}
            {/* ========================================================================= */}
            {activeTab === 'commissions' && (
              <div className="pp-tab-pane">
                
                {/* Header */}
                <div className="pp-pane-header">
                  <div>
                    <h1 className="pp-pane-title">Commissions & Payout History</h1>
                    <p className="pp-pane-subtitle">
                      Review detailed financial ledgers, verification statuses, payment disbursement records, and admin settlement tags.
                    </p>
                  </div>
                </div>

                {/* Summary Strip */}
                <div className="pp-ledger-summary-strip">
                  <div className="pp-summary-item">
                    <span className="pp-summary-label">Total Commission Records</span>
                    <strong className="pp-summary-val">{commissionsList.length} Entries</strong>
                  </div>
                  <div className="pp-summary-divider" />
                  <div className="pp-summary-item">
                    <span className="pp-summary-label">Total Paid to Date</span>
                    <strong className="pp-summary-val pp-text-success">₹{paidCommSum.toLocaleString()}</strong>
                  </div>
                  <div className="pp-summary-divider" />
                  <div className="pp-summary-item">
                    <span className="pp-summary-label">Pending / Approved Balance</span>
                    <strong className="pp-summary-val pp-text-accent">₹{(approvedCommSum + pendingCommSum).toLocaleString()}</strong>
                  </div>
                </div>

                {/* Status Filter Tabs & Search Bar */}
                <div className="pp-ledger-controls">
                  
                  {/* Status Pills */}
                  <div className="pp-status-filter-pills">
                    {[
                      { id: 'all', label: 'All Commissions', count: commissions.length },
                      { id: 'Paid', label: 'Paid', count: commissions.filter(c => c.status === 'Paid').length },
                      { id: 'Approved', label: 'Approved', count: commissions.filter(c => c.status === 'Approved').length },
                      { id: 'Pending', label: 'Pending', count: commissions.filter(c => c.status === 'Pending' || c.status === 'Payment Pending').length }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setCommissionStatusFilter(f.id)}
                        className={`pp-filter-pill ${commissionStatusFilter === f.id ? 'active' : ''}`}
                      >
                        <span>{f.label}</span>
                        <span className="pp-pill-count">{f.count}</span>
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="pp-search-wrap pp-search-ledger">
                    <Search size={16} className="pp-search-icon" />
                    <input
                      type="text"
                      value={commissionSearch}
                      onChange={e => setCommissionSearch(e.target.value)}
                      placeholder="Search by service, campaign, or note..."
                      className="pp-search-input"
                    />
                    {commissionSearch && (
                      <button 
                        type="button" 
                        onClick={() => setCommissionSearch('')}
                        className="pp-clear-search-btn"
                        aria-label="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                </div>

                {/* Desktop View Table */}
                <div className="pp-card pp-desktop-only-table">
                  <div className="pp-table-container">
                    <table className="pp-table">
                      <thead>
                        <tr>
                          <th style={{ width: '22%' }}>Service Category</th>
                          <th style={{ width: '18%' }}>Origin Campaign</th>
                          <th style={{ width: '18%' }}>Commission Amount</th>
                          <th style={{ width: '14%' }}>Status</th>
                          <th style={{ width: '14%' }}>Settlement Date</th>
                          <th style={{ width: '14%' }}>Admin Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCommissions.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="pp-td-empty">
                              <div className="pp-table-empty">
                                <Wallet size={32} className="pp-empty-icon" />
                                <h4>No commission entries found</h4>
                                <p>{commissionSearch || commissionStatusFilter !== 'all' ? 'Try clearing your filters.' : 'Commissions will appear here when client orders are finalized.'}</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredCommissions.map(c => (
                            <tr key={c._id} className="pp-table-row">
                              <td>
                                <div className="pp-service-cell">
                                  <Briefcase size={14} className="pp-service-icon" />
                                  <strong className="pp-service-title">{c.service || 'Creative Work'}</strong>
                                </div>
                              </td>
                              <td>
                                <span className="pp-campaign-chip">
                                  {c.campaignName || 'General Attribution'}
                                </span>
                              </td>
                              <td>
                                <div className="pp-amount-cell">
                                  <span className="pp-amount-text">₹{(c.commissionAmount || 0).toLocaleString()}</span>
                                  {c.commissionPercentage ? (
                                    <span className="pp-percentage-chip">({c.commissionPercentage}%)</span>
                                  ) : null}
                                </div>
                              </td>
                              <td>
                                <span className={`pp-status-badge ${
                                  c.status === 'Paid' ? 'status-completed' :
                                  c.status === 'Approved' ? 'status-approved' :
                                  c.status === 'Rejected' || c.status === 'Cancelled' ? 'status-cancelled' : 'status-pending'
                                }`}>
                                  {c.status || 'Pending'}
                                </span>
                              </td>
                              <td>
                                <div className="pp-date-cell">
                                  {c.paymentDate ? (
                                    <span>
                                      {new Date(c.paymentDate).toLocaleDateString(undefined, {
                                        year: 'numeric', month: 'short', day: 'numeric'
                                      })}
                                    </span>
                                  ) : (
                                    <span className="pp-text-muted">Awaiting Settlement</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="pp-notes-cell" title={c.adminNotes || ''}>
                                  {c.adminNotes ? (
                                    <span className="pp-note-tag">{c.adminNotes}</span>
                                  ) : (
                                    <span className="pp-text-muted">—</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Responsive Cards */}
                <div className="pp-mobile-only-cards">
                  {filteredCommissions.length === 0 ? (
                    <div className="pp-card pp-empty-state-card">
                      <Wallet size={32} className="pp-empty-icon" />
                      <h4>No commission logs found</h4>
                      <p>{commissionSearch || commissionStatusFilter !== 'all' ? 'Try clearing your filters.' : 'No commission records exist yet.'}</p>
                    </div>
                  ) : (
                    filteredCommissions.map(c => (
                      <div key={c._id} className="pp-card pp-mobile-card">
                        <div className="pp-mobile-card-header">
                          <div>
                            <h3 className="pp-mobile-card-title">{c.service || 'Service Commission'}</h3>
                            <span className="pp-mobile-card-path">Campaign: {c.campaignName || 'N/A'}</span>
                          </div>
                          <span className={`pp-status-badge ${
                            c.status === 'Paid' ? 'status-completed' :
                            c.status === 'Approved' ? 'status-approved' :
                            c.status === 'Rejected' || c.status === 'Cancelled' ? 'status-cancelled' : 'status-pending'
                          }`}>
                            {c.status || 'Pending'}
                          </span>
                        </div>

                        <div className="pp-mobile-amount-box">
                          <div className="pp-mobile-amount-label">COMMISSION PAYOUT</div>
                          <div className="pp-mobile-amount-val">
                            ₹{(c.commissionAmount || 0).toLocaleString()}
                            {c.commissionPercentage ? (
                              <span className="pp-percentage-chip" style={{ marginLeft: '8px' }}>
                                ({c.commissionPercentage}%)
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="pp-mobile-ledger-meta">
                          <div className="pp-mobile-meta-row">
                            <span>Settlement Date:</span>
                            <strong>{c.paymentDate ? new Date(c.paymentDate).toLocaleDateString() : 'Awaiting payout'}</strong>
                          </div>

                          {c.adminNotes && (
                            <div className="pp-mobile-admin-note">
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

            {/* ========================================================================= */}
            {/* 4. PROFILE TAB                                                           */}
            {/* ========================================================================= */}
            {activeTab === 'profile' && (
              <div className="pp-tab-pane">
                
                {/* Header */}
                <div className="pp-pane-header">
                  <div>
                    <h1 className="pp-pane-title">Profile & Portal Settings</h1>
                    <p className="pp-pane-subtitle">
                      Manage agency branding, official contact details, and partner security access credentials.
                    </p>
                  </div>
                </div>

                {/* Identity Summary Card */}
                <div className="pp-card pp-profile-identity-card">
                  <div className="pp-identity-avatar">
                    {(agencyName || ownerName || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div className="pp-identity-info">
                    <div className="pp-identity-header-row">
                      <h2 className="pp-identity-agency">{agencyName || 'Agency Name'}</h2>
                      <span className="pp-badge-pill pp-pill-green">Verified Partner</span>
                    </div>
                    <div className="pp-identity-meta-row">
                      <span><strong>Contact Person:</strong> {ownerName || 'Not Set'}</span>
                      <span className="pp-meta-sep">•</span>
                      <span><strong>Email:</strong> {partnerEmail || 'Not Set'}</span>
                      <span className="pp-meta-sep">•</span>
                      <span><strong>WhatsApp:</strong> {partnerPhone || 'Not Set'}</span>
                    </div>
                  </div>
                </div>

                <div className="pp-profile-grid">
                  
                  {/* Card 1: Agency & Contact Information */}
                  <div className="pp-card pp-form-card">
                    <div className="pp-card-header">
                      <div className="pp-card-title-wrap">
                        <Building size={18} className="pp-card-title-icon" />
                        <div>
                          <h3 className="pp-card-title">Agency & Contact Details</h3>
                          <span className="pp-card-meta">Official contact details for partner communications & invoicing</span>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleProfileSubmit} className="pp-form">
                      <div className="pp-form-body">
                        
                        <div className="pp-form-group">
                          <label className="pp-form-label">
                            <span>Agency Name</span>
                            <span className="pp-required-star">*</span>
                          </label>
                          <div className="pp-input-wrap">
                            <Building size={16} className="pp-input-icon" />
                            <input
                              type="text" 
                              required
                              value={agencyName} 
                              onChange={e => setAgencyName(e.target.value)}
                              placeholder="e.g. Apex Media Agency"
                              className="pp-input"
                            />
                          </div>
                          <span className="pp-form-hint">Official registered name of your agency or venture</span>
                        </div>

                        <div className="pp-form-group">
                          <label className="pp-form-label">
                            <span>Owner / Lead Partner Name</span>
                            <span className="pp-required-star">*</span>
                          </label>
                          <div className="pp-input-wrap">
                            <User size={16} className="pp-input-icon" />
                            <input
                              type="text" 
                              required
                              value={ownerName} 
                              onChange={e => setOwnerName(e.target.value)}
                              placeholder="e.g. John Doe"
                              className="pp-input"
                            />
                          </div>
                          <span className="pp-form-hint">Primary contact person responsible for this partnership</span>
                        </div>

                        <div className="pp-form-group">
                          <label className="pp-form-label">
                            <span>Official Contact Email</span>
                            <span className="pp-required-star">*</span>
                          </label>
                          <div className="pp-input-wrap">
                            <Mail size={16} className="pp-input-icon" />
                            <input
                              type="email" 
                              required
                              value={partnerEmail} 
                              onChange={e => setPartnerEmail(e.target.value)}
                              placeholder="agency@example.com"
                              className="pp-input"
                            />
                          </div>
                          <span className="pp-form-hint">Used for receiving monthly statements and payout alerts</span>
                        </div>

                        <div className="pp-form-group">
                          <label className="pp-form-label">
                            <span>WhatsApp / Contact Phone</span>
                            <span className="pp-required-star">*</span>
                          </label>
                          <div className="pp-input-wrap">
                            <Phone size={16} className="pp-input-icon" />
                            <input
                              type="tel" 
                              required
                              value={partnerPhone} 
                              onChange={e => setPartnerPhone(e.target.value)}
                              placeholder="+91 9876543210"
                              className="pp-input"
                            />
                          </div>
                          <span className="pp-form-hint">Direct line used by our partner manager for priority coordination</span>
                        </div>

                      </div>

                      <div className="pp-form-footer">
                        <button
                          type="submit" 
                          disabled={profileSaving}
                          className="btn btn-primary pp-btn-submit"
                        >
                          {profileSaving ? (
                            <>
                              <Loader2 size={15} className="pp-spinner" />
                              <span>Saving Details...</span>
                            </>
                          ) : (
                            <>
                              <Check size={15} />
                              <span>Save Profile Changes</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Card 2: Portal Password Change */}
                  <div className="pp-card pp-form-card">
                    <div className="pp-card-header">
                      <div className="pp-card-title-wrap">
                        <Lock size={18} className="pp-card-title-icon" />
                        <div>
                          <h3 className="pp-card-title">Portal Security & Password</h3>
                          <span className="pp-card-meta">Update the authentication password used to sign into this portal</span>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handlePasswordChangeSubmit} className="pp-form">
                      <div className="pp-form-body">
                        
                        <div className="pp-form-group">
                          <label className="pp-form-label">
                            <span>Current Password</span>
                            <span className="pp-required-star">*</span>
                          </label>
                          <div className="pp-input-wrap">
                            <Lock size={16} className="pp-input-icon" />
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              required 
                              placeholder="Enter your existing password"
                              value={currentPassword} 
                              onChange={e => setCurrentPassword(e.target.value)}
                              className="pp-input"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(prev => !prev)}
                              className="pp-password-toggle-btn"
                              aria-label="Toggle password visibility"
                            >
                              {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div className="pp-form-group">
                          <label className="pp-form-label">
                            <span>New Password</span>
                            <span className="pp-required-star">*</span>
                          </label>
                          <div className="pp-input-wrap">
                            <Key size={16} className="pp-input-icon" />
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              required 
                              placeholder="Enter a secure new password (min. 6 chars)"
                              value={newPassword} 
                              onChange={e => setNewPassword(e.target.value)}
                              className="pp-input"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(prev => !prev)}
                              className="pp-password-toggle-btn"
                              aria-label="Toggle password visibility"
                            >
                              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div className="pp-form-group">
                          <label className="pp-form-label">
                            <span>Confirm New Password</span>
                            <span className="pp-required-star">*</span>
                          </label>
                          <div className="pp-input-wrap">
                            <Key size={16} className="pp-input-icon" />
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              required 
                              placeholder="Re-type your new password to verify"
                              value={confirmPassword} 
                              onChange={e => setConfirmPassword(e.target.value)}
                              className="pp-input"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(prev => !prev)}
                              className="pp-password-toggle-btn"
                              aria-label="Toggle password visibility"
                            >
                              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          {newPassword && confirmPassword && newPassword !== confirmPassword && (
                            <span className="pp-form-hint pp-text-danger">Passwords do not match</span>
                          )}
                        </div>

                      </div>

                      <div className="pp-form-footer">
                        <button
                          type="submit" 
                          disabled={passwordLoading}
                          className="btn btn-primary pp-btn-submit"
                        >
                          {passwordLoading ? (
                            <>
                              <Loader2 size={15} className="pp-spinner" />
                              <span>Updating Password...</span>
                            </>
                          ) : (
                            <>
                              <Key size={15} />
                              <span>Update Portal Password</span>
                            </>
                          )}
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

      {/* Scoped CSS for Partner Portal Enhancements */}
      <style>{`
        /* ------------------------------------------------------------- */
        /* BASE & ANIMATIONS                                             */
        /* ------------------------------------------------------------- */
        .pp-spinner { animation: pp-spin 1s linear infinite; }
        @keyframes pp-spin { to { transform: rotate(360deg); } }

        .pp-portal-root {
          background-color: #F8FAFC;
          color: #0F172A;
          min-height: 100vh;
        }

        /* ------------------------------------------------------------- */
        /* FULLSCREEN LOADER                                             */
        /* ------------------------------------------------------------- */
        .pp-loader-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F8FAFC;
          padding: 24px;
        }
        .pp-loader-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 36px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-align: center;
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
          max-width: 380px;
          width: 100%;
        }
        .pp-loader-card .pp-spinner {
          color: #FF6A00;
        }
        .pp-loader-text h4 {
          font-size: 1rem;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 4px;
        }
        .pp-loader-text p {
          font-size: 0.8125rem;
          color: #64748B;
          margin: 0;
          line-height: 1.5;
        }

        /* ------------------------------------------------------------- */
        /* SIDEBAR STYLES                                                */
        /* ------------------------------------------------------------- */
        .pp-sidebar {
          background: #0B0F1A !important;
          border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
          z-index: 50;
        }
        .pp-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 16px 12px;
        }
        .pp-sidebar-brand {
          display: inline-flex;
          align-items: center;
        }
        .pp-sidebar-logo {
          height: 34px;
          width: auto;
          object-fit: contain;
        }
        .pp-sidebar-close-btn {
          display: none;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          padding: 6px;
          border-radius: 8px;
          cursor: pointer;
        }
        .pp-sidebar-close-btn:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.1);
        }
        .pp-sidebar-badge-wrap {
          padding: 0 16px 12px;
        }
        .pp-portal-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255, 106, 0, 0.12);
          color: #FF8A3D;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          border: 1px solid rgba(255, 106, 0, 0.25);
        }
        .pp-sidebar-nav {
          padding: 12px 12px 0 !important;
        }
        .pp-nav-title {
          font-size: 0.6875rem !important;
          letter-spacing: 0.08em !important;
          color: rgba(255, 255, 255, 0.45) !important;
          margin-bottom: 6px !important;
          padding: 8px 12px 4px !important;
        }
        .pp-nav-link {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          padding: 10px 14px !important;
          border-radius: 10px !important;
          color: rgba(255, 255, 255, 0.75) !important;
          font-size: 0.85rem !important;
          font-weight: 500 !important;
          margin-bottom: 4px !important;
          transition: all 180ms ease !important;
          position: relative;
        }
        .pp-nav-link:hover {
          background: rgba(255, 255, 255, 0.06) !important;
          color: #FFFFFF !important;
        }
        .pp-nav-link.active {
          background: rgba(255, 106, 0, 0.14) !important;
          color: #FF8A3D !important;
          font-weight: 600 !important;
        }
        .pp-nav-link.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 22px;
          background: #FF6A00;
          border-radius: 0 4px 4px 0;
        }
        .pp-nav-count {
          margin-left: auto;
          font-size: 0.7rem;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.85);
          padding: 2px 7px;
          border-radius: 999px;
        }
        .pp-nav-link.active .pp-nav-count {
          background: rgba(255, 106, 0, 0.25);
          color: #FF8A3D;
        }
        .pp-sidebar-footer {
          margin-top: auto;
          padding: 16px 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pp-sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .pp-sidebar-avatar {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, #FF6A00 0%, #EA580C 100%);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          flex-shrink: 0;
        }
        .pp-sidebar-user-info {
          min-width: 0;
          flex: 1;
        }
        .pp-user-agency {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #FFFFFF;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pp-user-owner {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.5);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pp-sidebar-logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #F87171;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 180ms ease;
        }
        .pp-sidebar-logout-btn:hover {
          background: rgba(239, 68, 68, 0.12);
          border-color: #EF4444;
          color: #EF4444;
        }

        /* ------------------------------------------------------------- */
        /* HEADER BAR                                                    */
        /* ------------------------------------------------------------- */
        .pp-header {
          background: #FFFFFF !important;
          border-bottom: 1px solid #E2E8F0 !important;
          height: 60px !important;
          padding: 0 24px !important;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 30;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02);
        }
        .pp-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .pp-menu-toggle-btn {
          display: none;
          background: transparent;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 6px;
          cursor: pointer;
          color: #475569;
        }
        .pp-menu-toggle-btn:hover {
          background: #F1F5F9;
          color: #0F172A;
        }
        .pp-header-brand {
          display: none;
        }
        .pp-topbar-logo {
          height: 32px;
          width: auto;
        }
        .pp-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
        }
        .pp-breadcrumb-root {
          color: #64748B;
          font-weight: 500;
        }
        .pp-breadcrumb-active {
          color: #0F172A;
          font-weight: 700;
        }
        .pp-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pp-partner-status-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 4px 10px;
          border-radius: 999px;
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
        }
        .pp-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10B981;
        }
        .pp-status-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #047857;
        }
        .pp-header-logout-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          color: #DC2626 !important;
          border: 1px solid #FEE2E2;
          background: #FEF2F2;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 180ms ease;
        }
        .pp-header-logout-btn:hover {
          background: #FEE2E2;
          border-color: #FCA5A5;
        }

        /* ------------------------------------------------------------- */
        /* MOBILE HORIZONTAL TABS                                        */
        /* ------------------------------------------------------------- */
        .pp-mobile-tabbar-container {
          display: none;
          background: #FFFFFF;
          border-bottom: 1px solid #E2E8F0;
          padding: 6px 16px;
          position: sticky;
          top: 60px;
          z-index: 20;
        }
        .pp-mobile-tabbar {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .pp-mobile-tabbar::-webkit-scrollbar {
          display: none;
        }
        .pp-tab-btn {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: #64748B;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          min-height: 40px;
          white-space: nowrap;
          transition: all 180ms ease;
        }
        .pp-tab-btn:hover {
          background: #F1F5F9;
          color: #0F172A;
        }
        .pp-tab-btn.active {
          background: #FFF7ED;
          border-color: #FFD8B3;
          color: #EA580C;
        }
        .pp-tab-chip {
          background: #E2E8F0;
          color: #475569;
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 999px;
          font-weight: 700;
        }
        .pp-tab-btn.active .pp-tab-chip {
          background: rgba(255, 106, 0, 0.2);
          color: #C2410C;
        }

        /* ------------------------------------------------------------- */
        /* CONTENT CONTAINER & TABS                                      */
        /* ------------------------------------------------------------- */
        .pp-content {
          padding: 28px 32px !important;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }
        .pp-tab-pane {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* ------------------------------------------------------------- */
        /* PANE HEADER                                                   */
        /* ------------------------------------------------------------- */
        .pp-pane-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .pp-pane-title {
          font-size: 1.375rem;
          font-weight: 800;
          color: #0F172A;
          letter-spacing: -0.025em;
          margin: 0 0 4px;
        }
        .pp-pane-subtitle {
          font-size: 0.85rem;
          color: #64748B;
          margin: 0;
          line-height: 1.5;
          max-width: 780px;
        }

        /* ------------------------------------------------------------- */
        /* WELCOME BANNER                                                */
        /* ------------------------------------------------------------- */
        .pp-welcome-banner {
          background: linear-gradient(135deg, #FFFFFF 0%, #FFF7ED 100%);
          border: 1px solid #FED7AA;
          border-radius: 16px;
          padding: 24px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          box-shadow: 0 2px 8px -2px rgba(255, 106, 0, 0.06);
        }
        .pp-welcome-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #EA580C;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }
        .pp-verified-icon {
          color: #EA580C;
        }
        .pp-welcome-heading {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0F172A;
          letter-spacing: -0.02em;
          margin: 0 0 4px;
        }
        .pp-welcome-sub {
          font-size: 0.85rem;
          color: #475569;
          margin: 0;
          line-height: 1.5;
        }
        .pp-strong {
          color: #0F172A;
          font-weight: 700;
        }
        .pp-banner-quicklink {
          background: #FFFFFF;
          border: 1px solid #FDBA74;
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-shrink: 0;
          min-width: 240px;
        }
        .pp-quicklink-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: #9A3412;
          letter-spacing: 0.05em;
        }
        .pp-quicklink-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .pp-code-mono {
          font-family: var(--font-mono, monospace);
          font-weight: 700;
          color: #FF6A00;
          font-size: 0.95rem;
        }
        .pp-btn-copy-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 6px;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          color: #0F172A;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 160ms ease;
        }
        .pp-btn-copy-chip:hover {
          background: #FF6A00;
          border-color: #FF6A00;
          color: #FFFFFF;
        }

        /* ------------------------------------------------------------- */
        /* SECTION GROUPS & KPI CARDS                                    */
        /* ------------------------------------------------------------- */
        .pp-section-group {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .pp-group-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
        }
        .pp-group-title {
          font-size: 1rem;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.01em;
          margin: 0;
        }
        .pp-group-sub {
          font-size: 0.78rem;
          color: #64748B;
          margin: 2px 0 0;
        }
        .pp-inline-link {
          background: transparent;
          border: none;
          color: #FF6A00;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 6px;
          border-radius: 6px;
          transition: all 150ms ease;
        }
        .pp-inline-link:hover {
          background: #FFF7ED;
          color: #C2410C;
        }

        .pp-kpi-grid {
          display: grid;
          gap: 16px;
        }
        .pp-financial-grid {
          grid-template-columns: repeat(4, 1fr);
        }
        .pp-pipeline-grid {
          grid-template-columns: repeat(3, 1fr);
        }

        .pp-kpi-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.03);
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        }
        .pp-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px -2px rgba(15, 23, 42, 0.06);
          border-color: #CBD5E1;
        }
        .pp-kpi-hero {
          background: linear-gradient(180deg, #FFFFFF 0%, #FFFDF9 100%);
          border-color: #FDBA74;
          box-shadow: 0 2px 6px -1px rgba(255, 106, 0, 0.08);
        }
        .pp-kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .pp-kpi-title {
          font-size: 0.78rem;
          font-weight: 600;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .pp-kpi-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .pp-icon-accent {
          background: #FFF7ED;
          color: #FF6A00;
        }
        .pp-icon-green {
          background: #ECFDF5;
          color: #10B981;
        }
        .pp-icon-orange {
          background: #FFFBEB;
          color: #F59E0B;
        }
        .pp-icon-blue {
          background: #EFF6FF;
          color: #3B82F6;
        }

        .pp-kpi-number {
          font-size: 1.65rem;
          font-weight: 800;
          color: #0F172A;
          letter-spacing: -0.03em;
          line-height: 1.1;
        }
        .pp-number-success {
          color: #059669;
        }
        .pp-kpi-footer-note {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          color: #64748B;
          margin-top: auto;
        }
        .pp-badge-pill {
          display: inline-flex;
          align-items: center;
          padding: 2px 7px;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 700;
        }
        .pp-pill-accent {
          background: #FFF7ED;
          color: #C2410C;
          border: 1px solid #FFEDD5;
        }
        .pp-pill-green {
          background: #ECFDF5;
          color: #047857;
          border: 1px solid #D1FAE5;
        }
        .pp-pill-amber {
          background: #FFFBEB;
          color: #B45309;
          border: 1px solid #FEF3C7;
        }
        .pp-pill-blue {
          background: #EFF6FF;
          color: #1D4ED8;
          border: 1px solid #DBEAFE;
        }

        /* ------------------------------------------------------------- */
        /* DASHBOARD SPLIT (RECENT ACTIVITY)                             */
        /* ------------------------------------------------------------- */
        .pp-dashboard-split {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        .pp-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02);
          overflow: hidden;
        }
        .pp-card-header {
          padding: 16px 20px;
          border-bottom: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FAFAFA;
        }
        .pp-card-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pp-card-title-icon {
          color: #FF6A00;
        }
        .pp-card-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
        }
        .pp-card-meta {
          font-size: 0.72rem;
          color: #64748B;
          display: block;
        }
        .pp-card-link-btn {
          background: transparent;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 150ms ease;
        }
        .pp-card-link-btn:hover {
          background: #FFFFFF;
          border-color: #CBD5E1;
          color: #0F172A;
        }
        .pp-card-body {
          padding: 16px 20px;
        }
        .pp-activity-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pp-activity-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          transition: all 150ms ease;
        }
        .pp-activity-item:hover {
          background: #FFFFFF;
          border-color: #CBD5E1;
          box-shadow: 0 2px 6px 0 rgba(15, 23, 42, 0.03);
        }
        .pp-activity-main {
          min-width: 0;
          flex: 1;
        }
        .pp-activity-service {
          font-size: 0.85rem;
          font-weight: 700;
          color: #0F172A;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pp-activity-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: #64748B;
          margin-top: 3px;
        }
        .pp-meta-client {
          font-weight: 600;
          color: #475569;
        }
        .pp-meta-sep {
          color: #CBD5E1;
        }
        .pp-meta-campaign {
          color: #64748B;
        }
        .pp-activity-right {
          text-align: right;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }
        .pp-amount-badge {
          font-size: 0.92rem;
          font-weight: 800;
          color: #059669;
        }

        /* ------------------------------------------------------------- */
        /* STATUS BADGES                                                 */
        /* ------------------------------------------------------------- */
        .pp-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .status-completed {
          background: #ECFDF5;
          color: #047857;
          border: 1px solid #A7F3D0;
        }
        .status-approved {
          background: #FFFBEB;
          color: #B45309;
          border: 1px solid #FDE68A;
        }
        .status-pending {
          background: #EFF6FF;
          color: #1D4ED8;
          border: 1px solid #BFDBFE;
        }
        .status-cancelled {
          background: #FEF2F2;
          color: #B91C1C;
          border: 1px solid #FECACA;
        }

        /* ------------------------------------------------------------- */
        /* GUIDANCE / TIP CARD                                           */
        /* ------------------------------------------------------------- */
        .pp-guidance-card {
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }
        .pp-guidance-icon {
          color: #16A34A;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .pp-guidance-text {
          font-size: 0.8125rem;
          color: #166534;
          line-height: 1.55;
        }
        .pp-guidance-text strong {
          color: #14532D;
        }

        /* ------------------------------------------------------------- */
        /* FILTER & SEARCH BARS                                          */
        /* ------------------------------------------------------------- */
        .pp-filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .pp-search-wrap {
          position: relative;
          width: 380px;
          max-width: 100%;
        }
        .pp-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
          pointer-events: none;
        }
        .pp-search-input {
          width: 100%;
          height: 42px;
          border-radius: 10px;
          border: 1px solid #CBD5E1;
          background: #FFFFFF;
          padding: 8px 36px 8px 38px;
          font-size: 0.85rem;
          color: #0F172A;
          outline: none;
          transition: all 180ms ease;
        }
        .pp-search-input:focus {
          border-color: #FF6A00;
          box-shadow: 0 0 0 3px rgba(255, 106, 0, 0.12);
        }
        .pp-clear-search-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          padding: 4px;
        }
        .pp-filter-summary {
          font-size: 0.8125rem;
          color: #64748B;
        }

        /* ------------------------------------------------------------- */
        /* TABLE STYLES                                                  */
        /* ------------------------------------------------------------- */
        .pp-table-container {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .pp-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.85rem;
        }
        .pp-table thead th {
          background: #F8FAFC;
          color: #475569;
          font-weight: 700;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 14px 18px;
          border-bottom: 1px solid #E2E8F0;
        }
        .pp-table tbody td {
          padding: 16px 18px;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
          color: #334155;
        }
        .pp-table-row:hover td {
          background: #FAFAFA;
        }
        .pp-table-row:last-child td {
          border-bottom: none;
        }
        .pp-campaign-name-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pp-campaign-title {
          color: #0F172A;
          font-size: 0.88rem;
          font-weight: 700;
        }
        .pp-campaign-subdesc {
          font-size: 0.75rem;
          color: #64748B;
        }
        .pp-url-cell-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 320px;
        }
        .pp-code-badge {
          display: inline-block;
          font-family: var(--font-mono, monospace);
          font-size: 0.78rem;
          font-weight: 700;
          color: #EA580C;
          background: #FFF7ED;
          padding: 2px 7px;
          border-radius: 6px;
          border: 1px solid #FFEDD5;
          align-self: flex-start;
        }
        .pp-full-url-preview {
          font-size: 0.75rem;
          color: #64748B;
          font-family: var(--font-mono, monospace);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pp-path-chip {
          display: inline-block;
          padding: 3px 8px;
          background: #F1F5F9;
          border-radius: 6px;
          font-size: 0.75rem;
          color: #475569;
          font-family: var(--font-mono, monospace);
          max-width: 140px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pp-btn-action-copy {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 160ms ease;
        }
        .pp-table-empty {
          padding: 48px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .pp-empty-icon {
          color: #CBD5E1;
        }
        .pp-table-empty h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
        }
        .pp-table-empty p {
          font-size: 0.8125rem;
          color: #64748B;
          margin: 0;
        }

        /* ------------------------------------------------------------- */
        /* LEDGER METRICS & CONTROLS                                     */
        /* ------------------------------------------------------------- */
        .pp-ledger-summary-strip {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 24px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02);
        }
        .pp-summary-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pp-summary-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .pp-summary-val {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0F172A;
        }
        .pp-summary-divider {
          width: 1px;
          height: 32px;
          background: #E2E8F0;
        }
        .pp-ledger-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .pp-status-filter-pills {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .pp-status-filter-pills::-webkit-scrollbar {
          display: none;
        }
        .pp-filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          color: #64748B;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 160ms ease;
          white-space: nowrap;
        }
        .pp-filter-pill:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
          color: #0F172A;
        }
        .pp-filter-pill.active {
          background: #0F172A;
          border-color: #0F172A;
          color: #FFFFFF;
        }
        .pp-pill-count {
          background: rgba(0, 0, 0, 0.06);
          padding: 1px 6px;
          border-radius: 999px;
          font-size: 0.6875rem;
          font-weight: 700;
        }
        .pp-filter-pill.active .pp-pill-count {
          background: rgba(255, 255, 255, 0.2);
          color: #FFFFFF;
        }
        .pp-service-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pp-service-icon {
          color: #FF6A00;
          flex-shrink: 0;
        }
        .pp-service-title {
          font-weight: 700;
          color: #0F172A;
        }
        .pp-campaign-chip {
          display: inline-block;
          font-size: 0.78rem;
          color: #475569;
          font-weight: 500;
        }
        .pp-amount-cell {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .pp-amount-text {
          font-weight: 800;
          color: #059669;
          font-size: 0.95rem;
        }
        .pp-percentage-chip {
          font-size: 0.72rem;
          color: #64748B;
          font-weight: 600;
        }
        .pp-notes-cell {
          max-width: 180px;
        }
        .pp-note-tag {
          font-size: 0.75rem;
          color: #92400E;
          background: #FEF3C7;
          border: 1px solid #FDE68A;
          padding: 3px 8px;
          border-radius: 6px;
          display: inline-block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        /* ------------------------------------------------------------- */
        /* PROFILE GRID & IDENTITY CARD                                  */
        /* ------------------------------------------------------------- */
        .pp-profile-identity-card {
          padding: 24px 28px;
          display: flex;
          align-items: center;
          gap: 20px;
          background: linear-gradient(135deg, #FFFFFF 0%, #FAFAFA 100%);
        }
        .pp-identity-avatar {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: linear-gradient(135deg, #FF6A00 0%, #EA580C 100%);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 800;
          box-shadow: 0 4px 12px rgba(255, 106, 0, 0.25);
          flex-shrink: 0;
        }
        .pp-identity-info {
          flex: 1;
          min-width: 0;
        }
        .pp-identity-header-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .pp-identity-agency {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
        }
        .pp-identity-meta-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.8125rem;
          color: #64748B;
          margin-top: 6px;
          flex-wrap: wrap;
        }

        .pp-profile-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        .pp-form-card {
          display: flex;
          flex-direction: column;
        }
        .pp-form {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .pp-form-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          flex: 1;
        }
        .pp-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .pp-form-label {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #1E293B;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .pp-required-star {
          color: #EF4444;
        }
        .pp-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .pp-input-icon {
          position: absolute;
          left: 14px;
          color: #94A3B8;
          pointer-events: none;
        }
        .pp-input {
          width: 100%;
          height: 44px;
          border-radius: 10px;
          border: 1px solid #CBD5E1;
          background: #FFFFFF;
          padding: 8px 14px 8px 40px;
          font-size: 0.875rem;
          color: #0F172A;
          outline: none;
          transition: all 180ms ease;
        }
        .pp-input:focus {
          border-color: #FF6A00;
          box-shadow: 0 0 0 3px rgba(255, 106, 0, 0.12);
        }
        .pp-password-toggle-btn {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pp-password-toggle-btn:hover {
          color: #0F172A;
        }
        .pp-form-hint {
          font-size: 0.72rem;
          color: #64748B;
        }
        .pp-form-footer {
          padding: 16px 24px;
          background: #F8FAFC;
          border-top: 1px solid #E2E8F0;
          display: flex;
          justify-content: flex-end;
        }
        .pp-btn-submit {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
        }

        /* ------------------------------------------------------------- */
        /* MOBILE FALLBACK CARDS                                         */
        /* ------------------------------------------------------------- */
        .pp-mobile-only-cards {
          display: none;
          flex-direction: column;
          gap: 12px;
        }
        .pp-mobile-card {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .pp-mobile-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .pp-mobile-card-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0F172A;
          margin: 0 0 2px;
        }
        .pp-mobile-card-path {
          font-size: 0.75rem;
          color: #64748B;
          font-family: var(--font-mono, monospace);
        }
        .pp-mobile-code-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .pp-mobile-code-info {
          min-width: 0;
          flex: 1;
        }
        .pp-mobile-code-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
        }
        .pp-mobile-code-link {
          font-size: 0.8rem;
          font-family: var(--font-mono, monospace);
          color: #EA580C;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pp-mobile-copy-btn {
          min-height: 40px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          color: #0F172A;
          font-size: 0.78rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .pp-mobile-copy-btn.copied {
          background: #10B981;
          border-color: #10B981;
          color: #FFFFFF;
        }
        .pp-mobile-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.78rem;
          border-top: 1px solid #F1F5F9;
          padding-top: 10px;
        }
        .pp-mobile-footer-label {
          color: #64748B;
        }
        .pp-mobile-amount-box {
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          border-radius: 10px;
          padding: 12px;
        }
        .pp-mobile-amount-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: #047857;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .pp-mobile-amount-val {
          font-size: 1.15rem;
          font-weight: 800;
          color: #065F46;
          margin-top: 2px;
        }
        .pp-mobile-ledger-meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.78rem;
        }
        .pp-mobile-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #475569;
        }
        .pp-mobile-admin-note {
          background: #FEF3C7;
          border: 1px solid #FDE68A;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          color: #92400E;
          line-height: 1.4;
        }
        .pp-empty-state-mini {
          text-align: center;
          padding: 32px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .pp-empty-state-mini .pp-empty-icon {
          color: #CBD5E1;
        }
        .pp-empty-state-mini .pp-empty-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: #1E293B;
          margin: 0;
        }
        .pp-empty-state-mini .pp-empty-text {
          font-size: 0.78rem;
          color: #64748B;
          margin: 0;
          max-width: 320px;
          line-height: 1.5;
        }
        .pp-empty-state-card {
          padding: 40px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        /* ------------------------------------------------------------- */
        /* UTILITY CLASSES                                               */
        /* ------------------------------------------------------------- */
        .pp-text-success { color: #10B981 !important; }
        .pp-text-danger { color: #EF4444 !important; }
        .pp-text-accent { color: #FF6A00 !important; }
        .pp-text-muted { color: #94A3B8 !important; }
        .pp-text-sm { font-size: 0.75rem !important; }

        /* ------------------------------------------------------------- */
        /* RESPONSIVE BREAKPOINTS                                        */
        /* ------------------------------------------------------------- */

        /* Tablets & Desktops below 1200px */
        @media (max-width: 1200px) {
          .pp-financial-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .pp-pipeline-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        /* Mobile & Tablet boundary (1024px) */
        @media (max-width: 1024px) {
          .pp-main {
            margin-left: 0 !important;
          }
          .pp-menu-toggle-btn {
            display: inline-flex !important;
          }
          .pp-sidebar-close-btn {
            display: inline-flex !important;
          }
          .pp-header-brand {
            display: inline-flex !important;
          }
          .pp-breadcrumb-root {
            display: none !important;
          }
          .breadcrumb-separator {
            display: none !important;
          }
          .pp-mobile-tabbar-container {
            display: block !important;
          }
          .pp-content {
            padding: 20px 16px !important;
          }
          .pp-welcome-banner {
            flex-direction: column;
            align-items: flex-start;
          }
          .pp-banner-quicklink {
            width: 100%;
          }
          .pp-profile-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Tablets (768px - 1023px) */
        @media (max-width: 1023px) and (min-width: 768px) {
          .pp-pipeline-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        /* Mobile Phones (< 768px) */
        @media (max-width: 767px) {
          .pp-header {
            padding: 0 14px !important;
          }
          .pp-partner-status-chip {
            display: none !important;
          }
          .pp-logout-text {
            display: none;
          }
          .pp-header-logout-btn {
            padding: 6px 8px;
          }
          .pp-desktop-only-table {
            display: none !important;
          }
          .pp-mobile-only-cards {
            display: flex !important;
          }
          .pp-financial-grid {
            grid-template-columns: 1fr;
          }
          .pp-pipeline-grid {
            grid-template-columns: 1fr;
          }
          .pp-dashboard-split {
            grid-template-columns: 1fr;
          }
          .pp-search-wrap {
            width: 100%;
          }
          .pp-filter-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .pp-ledger-controls {
            flex-direction: column;
            align-items: stretch;
          }
          .pp-search-ledger {
            width: 100%;
          }
          .pp-ledger-summary-strip {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .pp-summary-divider {
            width: 100%;
            height: 1px;
          }
          .pp-profile-identity-card {
            flex-direction: column;
            align-items: flex-start;
            padding: 20px 16px;
          }
          .pp-identity-meta-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
          .pp-identity-meta-row .pp-meta-sep {
            display: none;
          }
          .pp-form-body {
            padding: 16px;
          }
          .pp-form-footer {
            padding: 14px 16px;
          }
          .pp-btn-submit {
            width: 100%;
            justify-content: center;
          }
        }

        /* Small Phones (320px - 375px) */
        @media (max-width: 375px) {
          .pp-content {
            padding: 14px 10px !important;
          }
          .pp-welcome-banner {
            padding: 16px 14px;
          }
          .pp-welcome-heading {
            font-size: 1.15rem;
          }
          .pp-kpi-card {
            padding: 14px;
          }
          .pp-kpi-number {
            font-size: 1.4rem;
          }
          .pp-mobile-code-box {
            flex-direction: column;
            align-items: stretch;
          }
          .pp-mobile-copy-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
}
