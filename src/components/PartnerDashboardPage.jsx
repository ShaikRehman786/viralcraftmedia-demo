import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard, Users, Send, DollarSign, LogOut, Loader2, Key, Check,
  AlertTriangle, Menu, X, ArrowUpRight, BarChart2, Star, ShieldCheck, Mail, Phone, Calendar
} from 'lucide-react';
import ToastContainer, { useToast } from './Toast.jsx';

axios.defaults.withCredentials = true;

export default function PartnerDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dashboard stats & data
  const [stats, setStats] = useState({ totalReferrals: 0, pendingReferrals: 0, approvedCommissions: 0, paidCommissions: 0 });
  const [recentReferrals, setRecentReferrals] = useState([]);
  const [commissionHistory, setCommissionHistory] = useState([]);
  
  // Tab data lists
  const [referrals, setReferrals] = useState([]);
  const [commissions, setCommissions] = useState([]);

  // Form states
  const [clientName, setClientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('Website Design & Development');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Profile Change Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Mobile menu
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { toasts, addToast, removeToast } = useToast();

  const loadMe = async () => {
    try {
      const res = await axios.get('/api/partners/me');
      setPartner(res.data.partner);
    } catch (err) {
      window.location.href = '/partner/login';
    }
  };

  const loadDashboardData = async () => {
    try {
      const res = await axios.get('/api/partners/dashboard');
      setStats(res.data.stats);
      setRecentReferrals(res.data.recentReferrals);
      setCommissionHistory(res.data.commissionHistory);
    } catch (err) {}
  };

  const loadReferrals = async () => {
    try {
      const res = await axios.get('/api/partners/referrals');
      setReferrals(res.data.data);
    } catch (err) {}
  };

  const loadCommissions = async () => {
    try {
      const res = await axios.get('/api/partners/commissions');
      setCommissions(res.data.data);
    } catch (err) {}
  };

  const initData = async () => {
    setLoading(true);
    await loadMe();
    await loadDashboardData();
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  useEffect(() => {
    if (activeTab === 'referrals') {
      loadReferrals();
    } else if (activeTab === 'commissions') {
      loadCommissions();
    } else if (activeTab === 'dashboard') {
      loadDashboardData();
    }
  }, [activeTab]);

  const handleLogout = async () => {
    try {
      await axios.post('/api/partners/logout');
      window.location.href = '/partner/login';
    } catch (err) {
      window.location.href = '/partner/login';
    }
  };

  const handleReferralSubmit = async (e) => {
    e.preventDefault();
    if (!clientName || !companyName || !phone || !email || !service) {
      addToast('Please fill in all required fields.', 'warning');
      return;
    }

    setSubmitLoading(true);
    try {
      await axios.post('/api/partners/referrals', {
        clientName,
        companyName,
        phone,
        email,
        service,
        expectedBudget: budget ? Number(budget) : 0,
        notes
      });
      addToast('Referral submitted successfully.', 'success');
      
      // Reset form
      setClientName('');
      setCompanyName('');
      setPhone('');
      setEmail('');
      setService('Website Design & Development');
      setBudget('');
      setNotes('');
      
      setActiveTab('referrals');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to submit referral.', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      addToast('Please fill in all password fields.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match.', 'error');
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

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B0B0C',
        color: '#FFF'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Loader2 className="spinner" size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent, #F97316)' }} />
          <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>Loading Partner Workspace...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div style={{
        minHeight: '100vh',
        background: '#0B0B0C',
        color: '#FFF',
        display: 'flex',
        fontFamily: 'Inter, sans-serif'
      }}>
        {/* MOBILE SIDEBAR TRIGGER */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 999,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            width: '40px',
            height: '40px',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)'
          }}
          className="mobile-sidebar-btn"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* SIDEBAR */}
        <aside style={{
          width: '260px',
          background: '#0E0E10',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 99
        }} className={`sidebar-aside ${sidebarOpen ? 'open' : ''}`}>
          {/* Logo */}
          <div style={{ marginBottom: '40px', paddingLeft: '8px' }}>
            <img src="/logoooooooooo.png" alt="ViralCraft Media" style={{ height: '32px' }} />
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', paddingLeft: '12px' }}>
              Partner Space
            </div>
            
            <button
              onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                background: activeTab === 'dashboard' ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                border: 'none',
                borderRadius: '10px',
                color: activeTab === 'dashboard' ? 'var(--accent, #F97316)' : 'rgba(255,255,255,0.6)',
                fontWeight: activeTab === 'dashboard' ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>

            <button
              onClick={() => { setActiveTab('submit'); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                background: activeTab === 'submit' ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                border: 'none',
                borderRadius: '10px',
                color: activeTab === 'submit' ? 'var(--accent, #F97316)' : 'rgba(255,255,255,0.6)',
                fontWeight: activeTab === 'submit' ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <Send size={18} /> Submit Referral
            </button>

            <button
              onClick={() => { setActiveTab('referrals'); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                background: activeTab === 'referrals' ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                border: 'none',
                borderRadius: '10px',
                color: activeTab === 'referrals' ? 'var(--accent, #F97316)' : 'rgba(255,255,255,0.6)',
                fontWeight: activeTab === 'referrals' ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <Users size={18} /> Referral History
            </button>

            <button
              onClick={() => { setActiveTab('commissions'); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                background: activeTab === 'commissions' ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                border: 'none',
                borderRadius: '10px',
                color: activeTab === 'commissions' ? 'var(--accent, #F97316)' : 'rgba(255,255,255,0.6)',
                fontWeight: activeTab === 'commissions' ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <DollarSign size={18} /> Commission History
            </button>

            <button
              onClick={() => { setActiveTab('profile'); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                background: activeTab === 'profile' ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                border: 'none',
                borderRadius: '10px',
                color: activeTab === 'profile' ? 'var(--accent, #F97316)' : 'rgba(255,255,255,0.6)',
                fontWeight: activeTab === 'profile' ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <ShieldCheck size={18} /> Profile Settings
            </button>
          </nav>

          {/* Footer User Info */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                background: 'rgba(249, 115, 22, 0.1)',
                border: '1px solid rgba(249, 115, 22, 0.2)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent, #F97316)',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}>
                {partner?.agencyName ? partner.agencyName.charAt(0).toUpperCase() : 'P'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFF', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {partner?.agencyName}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  Partner Account
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.1)',
                borderRadius: '10px',
                color: '#FCA5A5',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        </aside>

        {/* MAIN DISPLAY AREA */}
        <main style={{
          marginLeft: '260px',
          flex: 1,
          padding: '40px 48px',
          minWidth: 0
        }} className="main-viewport">
          
          {/* HEADER */}
          <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px',
            paddingTop: '8px'
          }} className="viewport-header">
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                {activeTab === 'dashboard' && 'Dashboard Overview'}
                {activeTab === 'submit' && 'Submit New Referral'}
                {activeTab === 'referrals' && 'Referral Pipeline'}
                {activeTab === 'commissions' && 'Commission Tracking'}
                {activeTab === 'profile' && 'Agency Settings'}
              </h1>
              <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>
                {activeTab === 'dashboard' && `Welcome back, ${partner?.ownerName} (${partner?.agencyName})`}
                {activeTab === 'submit' && 'Register client details below to record a lead referral.'}
                {activeTab === 'referrals' && 'Track referral status, stages, and execution logs.'}
                {activeTab === 'commissions' && 'Track approved and paid commission payouts.'}
                {activeTab === 'profile' && 'Configure agency details and secure credentials.'}
              </p>
            </div>
          </header>

          {/* TAB CONTENTS */}
          <div className="tab-contents">
            
            {/* 1. DASHBOARD VIEW */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Stats Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '24px'
                }}>
                  {[
                    { label: 'Total Referrals', val: stats.totalReferrals, desc: 'All submitted leads' },
                    { label: 'Pending Referrals', val: stats.pendingReferrals, desc: 'Contacting or receiving stages' },
                    { label: 'Approved Commissions', val: `₹${stats.approvedCommissions}`, desc: 'Payouts pending processing' },
                    { label: 'Paid Commissions', val: `₹${stats.paidCommissions}`, desc: 'Settled commission balances' }
                  ].map((card, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '16px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</span>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: '#FFF', letterSpacing: '-0.5px' }}>{card.val}</span>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>{card.desc}</span>
                    </div>
                  ))}
                </div>

                {/* Dashboard Split Sections */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 0.8fr',
                  gap: '32px'
                }} className="dashboard-grid-split">
                  {/* Left Column: Recent Referrals */}
                  <div style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    padding: '24px'
                  }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      Recent Referrals
                      <button onClick={() => setActiveTab('referrals')} style={{ background: 'none', border: 'none', color: 'var(--accent, #F97316)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        View All <ArrowUpRight size={14} />
                      </button>
                    </h3>

                    {recentReferrals.length === 0 ? (
                      <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                        No referrals submitted yet. Click "Submit Referral" to register your first lead.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Client</th>
                              <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Company</th>
                              <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Service</th>
                              <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, textAlign: 'right' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentReferrals.map((r, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '14px 8px', fontWeight: 600 }}>{r.clientName}</td>
                                <td style={{ padding: '14px 8px', color: 'rgba(255,255,255,0.6)' }}>{r.companyName}</td>
                                <td style={{ padding: '14px 8px', color: 'rgba(255,255,255,0.5)' }}>{r.service}</td>
                                <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                                  <span style={{
                                    padding: '4px 10px',
                                    borderRadius: '100px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    background: r.status === 'Commission Paid' ? 'rgba(16,185,129,0.1)' : r.status === 'Commission Approved' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                                    color: r.status === 'Commission Paid' ? '#34D399' : r.status === 'Commission Approved' ? '#60A5FA' : '#FBBF24',
                                    border: `1px solid ${r.status === 'Commission Paid' ? 'rgba(16,185,129,0.15)' : r.status === 'Commission Approved' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)'}`
                                  }}>{r.status}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Commission Log */}
                  <div style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    padding: '24px'
                  }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      Recent Payouts
                      <button onClick={() => setActiveTab('commissions')} style={{ background: 'none', border: 'none', color: 'var(--accent, #F97316)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Track <ArrowUpRight size={14} />
                      </button>
                    </h3>

                    {commissionHistory.length === 0 ? (
                      <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                        No commission history found.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {commissionHistory.map((c, i) => (
                          <div key={i} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingBottom: '14px',
                            borderBottom: i < commissionHistory.length - 1 ? '1px solid rgba(255,255,255,0.02)' : 'none'
                          }}>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.referral ? c.referral.clientName : 'Client Referral'}</div>
                              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                {c.status === 'Paid' ? `Paid: ${new Date(c.paymentDate).toLocaleDateString()}` : 'Approved (Pending Payout)'}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFF' }}>₹{c.commissionAmount}</div>
                              <div style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                color: c.status === 'Paid' ? '#34D399' : '#60A5FA',
                                marginTop: '4px'
                              }}>{c.status}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. SUBMIT REFERRAL VIEW */}
            {activeTab === 'submit' && (
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '36px',
                maxWidth: '680px'
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 24px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                  Register Client Referral
                </h3>
                <form onSubmit={handleReferralSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Agency Name - Locked */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>Referring Agency</label>
                    <input
                      type="text"
                      className="c-inp"
                      style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}
                      value={partner?.agencyName || ''}
                      readOnly
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="form-grid-2">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Client Contact Name *</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          color: '#FFF',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Company Name *</label>
                      <input
                        type="text"
                        placeholder="Acme Corporation"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          color: '#FFF',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="form-grid-2">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Client Phone *</label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          color: '#FFF',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Client Email *</label>
                      <input
                        type="email"
                        placeholder="john@acme.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          color: '#FFF',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="form-grid-2">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Interested Service *</label>
                      <select
                        value={service}
                        onChange={e => setService(e.target.value)}
                        style={{
                          background: '#0E0E10',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          color: '#FFF',
                          outline: 'none'
                        }}
                      >
                        <option value="Website Design & Development">Website Design & Development</option>
                        <option value="Podcast Editing">Podcast Editing</option>
                        <option value="Social Media Marketing">Social Media Marketing</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Expected Budget in INR (Optional)</label>
                      <input
                        type="number"
                        placeholder="e.g. 50000"
                        value={budget}
                        onChange={e => setBudget(e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          color: '#FFF',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Notes / Brief Scope</label>
                    <textarea
                      rows="4"
                      placeholder="Add brief details about the client's needs or requirements..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        color: '#FFF',
                        outline: 'none',
                        resize: 'none'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitLoading}
                    style={{
                      background: 'var(--accent, #F97316)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '14px',
                      color: '#FFF',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '10px',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={e => e.target.style.opacity = '0.9'}
                    onMouseLeave={e => e.target.style.opacity = '1'}
                  >
                    {submitLoading ? (
                      <Loader2 size={18} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      'Register Lead Referral'
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* 3. REFERRAL HISTORY VIEW */}
            {activeTab === 'referrals' && (
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '24px'
              }}>
                {referrals.length === 0 ? (
                  <div style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                    No referrals recorded. Submit a referral to start.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Client Contact</th>
                          <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Company Name</th>
                          <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Interested Service</th>
                          <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Budget (INR)</th>
                          <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Submitted Date</th>
                          <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, textAlign: 'right' }}>Stage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referrals.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '16px 8px' }}>
                              <div style={{ fontWeight: 600 }}>{r.clientName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{r.email} | {r.phone}</div>
                            </td>
                            <td style={{ padding: '16px 8px', color: 'rgba(255,255,255,0.7)' }}>{r.companyName}</td>
                            <td style={{ padding: '16px 8px', color: 'rgba(255,255,255,0.6)' }}>{r.service}</td>
                            <td style={{ padding: '16px 8px' }}>{r.expectedBudget ? `₹${r.expectedBudget}` : 'N/A'}</td>
                            <td style={{ padding: '16px 8px', color: 'rgba(255,255,255,0.4)' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                            <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '100px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: r.status === 'Commission Paid' ? 'rgba(16,185,129,0.1)' : r.status === 'Commission Approved' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                                color: r.status === 'Commission Paid' ? '#34D399' : r.status === 'Commission Approved' ? '#60A5FA' : '#FBBF24',
                                border: `1px solid ${r.status === 'Commission Paid' ? 'rgba(16,185,129,0.15)' : r.status === 'Commission Approved' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)'}`
                              }}>{r.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 4. COMMISSION HISTORY VIEW */}
            {activeTab === 'commissions' && (
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '24px'
              }}>
                {commissions.length === 0 ? (
                  <div style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                    No commissions logged or approved yet.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Client Referral</th>
                          <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Commission Amount</th>
                          <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Approved Date</th>
                          <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Payment Info</th>
                          <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissions.map((c, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '16px 8px' }}>
                              <div style={{ fontWeight: 600 }}>{c.referral ? c.referral.clientName : 'Client Referral'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{c.referral ? c.referral.companyName : ''}</div>
                            </td>
                            <td style={{ padding: '16px 8px', fontSize: '1rem', fontWeight: 800 }}>₹{c.commissionAmount}</td>
                            <td style={{ padding: '16px 8px', color: 'rgba(255,255,255,0.5)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                            <td style={{ padding: '16px 8px' }}>
                              {c.status === 'Paid' ? (
                                <div>
                                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Paid: {new Date(c.paymentDate).toLocaleDateString()}</div>
                                  {c.transactionReference && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Ref: {c.transactionReference}</div>}
                                </div>
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>Processing Payout</span>
                              )}
                            </td>
                            <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '100px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: c.status === 'Paid' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                                color: c.status === 'Paid' ? '#34D399' : '#60A5FA',
                                border: `1px solid ${c.status === 'Paid' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)'}`
                              }}>{c.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 5. PROFILE & CHANGE PASSWORD VIEW */}
            {activeTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '640px' }}>
                {/* Agency Details */}
                <div style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '16px',
                  padding: '28px 36px'
                }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    Agency Profile
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Agency Name</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{partner?.agencyName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Owner Name</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{partner?.ownerName}</div>
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Email Address</div>
                      <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)' }}>{partner?.email}</div>
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Contact Phone</div>
                      <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)' }}>{partner?.phone}</div>
                    </div>
                  </div>
                </div>

                {/* Change Password Form */}
                <div style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '16px',
                  padding: '28px 36px'
                }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    Secure Password Change
                  </h3>
                  <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Current Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          color: '#FFF',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          color: '#FFF',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          color: '#FFF',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={passwordLoading}
                      style={{
                        background: 'var(--accent, #F97316)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '12px',
                        color: '#FFF',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '8px',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={e => e.target.style.opacity = '0.9'}
                      onMouseLeave={e => e.target.style.opacity = '1'}
                    >
                      {passwordLoading ? <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> : 'Update Credentials'}
                    </button>
                  </form>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* MOBILE NAV STYLING */}
      <style>{`
        @media (max-width: 900px) {
          .sidebar-aside {
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }
          .sidebar-aside.open {
            transform: translateX(0);
          }
          .mobile-sidebar-btn {
            display: flex !important;
          }
          .main-viewport {
            margin-left: 0 !important;
            padding: 80px 24px 40px !important;
          }
          .viewport-header {
            margin-bottom: 24px !important;
          }
        }
        @media (max-width: 600px) {
          .form-grid-2, .dashboard-grid-split {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
