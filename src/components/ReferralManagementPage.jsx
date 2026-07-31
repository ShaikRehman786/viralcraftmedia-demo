import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, UserPlus, Send, DollarSign, Edit3, Trash2, Search, Filter, 
  Check, X, Eye, ShieldAlert, Loader2, Award, Calendar, CheckCircle2 
} from 'lucide-react';

export default function ReferralManagementPage({ user, addToast }) {
  const [activeSubTab, setActiveSubTab] = useState('partners');
  const [loading, setLoading] = useState(false);

  // Partners Data
  const [partners, setPartners] = useState([]);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editPartner, setEditPartner] = useState(null);
  const [agencyName, setAgencyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerPassword, setPartnerPassword] = useState('');
  const [partnerStatus, setPartnerStatus] = useState('ACTIVE');
  const [partnerActionLoading, setPartnerActionLoading] = useState(false);

  // Referrals Data
  const [referrals, setReferrals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [commissionAmount, setCommissionAmount] = useState('');
  const [commissionLoading, setCommissionLoading] = useState(false);

  // Payouts Data
  const [commissions, setCommissions] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [txnRef, setTxnRef] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Fetch functions
  const fetchPartners = async () => {
    try {
      const res = await axios.get('/api/admin/referrals/partners');
      setPartners(res.data.data);
    } catch (e) {
      addToast('Failed to load partners.', 'error');
    }
  };

  const fetchReferrals = async () => {
    try {
      const res = await axios.get('/api/admin/referrals/leads', {
        params: { status: statusFilter, search: searchQuery }
      });
      setReferrals(res.data.data);
    } catch (e) {
      addToast('Failed to load referrals.', 'error');
    }
  };

  const fetchCommissions = async () => {
    try {
      const res = await axios.get('/api/admin/referrals/payouts');
      setCommissions(res.data.data);
    } catch (e) {
      addToast('Failed to load commissions.', 'error');
    }
  };

  useEffect(() => {
    if (activeSubTab === 'partners') {
      fetchPartners();
    } else if (activeSubTab === 'leads') {
      fetchReferrals();
    } else if (activeSubTab === 'payouts') {
      fetchCommissions();
    }
  }, [activeSubTab, statusFilter, searchQuery]);

  // Partner Handlers
  const openCreatePartner = () => {
    setEditPartner(null);
    setAgencyName('');
    setOwnerName('');
    setPartnerEmail('');
    setPartnerPhone('');
    setPartnerPassword('');
    setPartnerStatus('ACTIVE');
    setShowPartnerModal(true);
  };

  const openEditPartner = (p) => {
    setEditPartner(p);
    setAgencyName(p.agencyName);
    setOwnerName(p.ownerName);
    setPartnerEmail(p.email);
    setPartnerPhone(p.phone);
    setPartnerPassword('');
    setPartnerStatus(p.status);
    setShowPartnerModal(true);
  };

  const handlePartnerSubmit = async (e) => {
    e.preventDefault();
    if (!agencyName || !ownerName || !partnerEmail || !partnerPhone || (!editPartner && !partnerPassword)) {
      addToast('Please fill in all required partner fields.', 'warning');
      return;
    }

    setPartnerActionLoading(true);
    try {
      if (editPartner) {
        await axios.put(`/api/admin/referrals/partners/${editPartner._id}`, {
          agencyName,
          ownerName,
          email: partnerEmail,
          phone: partnerPhone,
          status: partnerStatus,
          password: partnerPassword || undefined
        });
        addToast('Partner updated successfully.', 'success');
      } else {
        await axios.post('/api/admin/referrals/partners', {
          agencyName,
          ownerName,
          email: partnerEmail,
          phone: partnerPhone,
          password: partnerPassword
        });
        addToast('Partner registered successfully.', 'success');
      }
      setShowPartnerModal(false);
      fetchPartners();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save partner.', 'error');
    } finally {
      setPartnerActionLoading(false);
    }
  };

  const handleDeletePartner = async (id) => {
    if (!confirm('Are you sure you want to delete this partner agency? All associated referrals and commission history will be deleted immediately.')) return;
    try {
      await axios.delete(`/api/admin/referrals/partners/${id}`);
      addToast('Partner deleted successfully.', 'success');
      fetchPartners();
    } catch (e) {
      addToast('Failed to delete partner.', 'error');
    }
  };

  // Referral status updates
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await axios.put(`/api/admin/referrals/leads/${id}/status`, { status: newStatus });
      addToast(`Status updated to ${newStatus}.`, 'success');
      fetchReferrals();
    } catch (e) {
      addToast('Failed to update status.', 'error');
    }
  };

  const handleRejectReferral = async (id) => {
    if (!confirm('Are you sure you want to reject and remove this lead?')) return;
    try {
      await axios.delete(`/api/admin/referrals/leads/${id}`);
      addToast('Referral lead rejected.', 'success');
      fetchReferrals();
    } catch (e) {
      addToast('Failed to reject lead.', 'error');
    }
  };

  // Commission Approve Handlers
  const openApproveCommission = (ref) => {
    setSelectedReferral(ref);
    setCommissionAmount('');
    setShowCommissionModal(true);
  };

  const handleApproveCommission = async (e) => {
    e.preventDefault();
    if (!commissionAmount || isNaN(commissionAmount)) {
      addToast('Please enter a valid commission amount.', 'warning');
      return;
    }

    setCommissionLoading(true);
    try {
      await axios.post(`/api/admin/referrals/leads/${selectedReferral._id}/approve`, {
        commissionAmount: Number(commissionAmount)
      });
      addToast('Commission approved successfully.', 'success');
      setShowCommissionModal(false);
      fetchReferrals();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to approve commission.', 'error');
    } finally {
      setCommissionLoading(false);
    }
  };

  // Payment Handlers
  const openMarkPaid = (comm) => {
    setSelectedCommission(comm);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setTxnRef('');
    setInternalNotes('');
    setShowPaymentModal(true);
  };

  const handleMarkPaid = async (e) => {
    e.preventDefault();
    if (!paymentDate) {
      addToast('Please select a payment date.', 'warning');
      return;
    }

    setPaymentLoading(true);
    try {
      await axios.post(`/api/admin/referrals/payouts/${selectedCommission._id}/pay`, {
        paymentDate,
        transactionReference: txnRef,
        internalNotes
      });
      addToast('Commission marked as paid.', 'success');
      setShowPaymentModal(false);
      fetchCommissions();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to mark payout.', 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div style={{ padding: '0px 0px 40px 0px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Sub tabs nav bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        gap: '24px',
        paddingBottom: '8px'
      }}>
        {[
          { id: 'partners', label: 'Partners', icon: Users },
          { id: 'leads', label: 'Referral Leads', icon: Send },
          { id: 'payouts', label: 'Commissions & Payments', icon: DollarSign }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 4px',
                color: activeSubTab === tab.id ? 'var(--accent, #F97316)' : 'rgba(255,255,255,0.5)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: activeSubTab === tab.id ? '2px solid var(--accent, #F97316)' : '2px solid transparent',
                marginBottom: '-10px',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SUBTAB CONTENTS */}

      {/* 1. PARTNERS LIST TAB */}
      {activeSubTab === 'partners' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
              Manage registered partner agencies and freelancers.
            </div>
            <button onClick={openCreatePartner} style={{
              background: 'var(--accent, #F97316)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              color: '#FFF',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <UserPlus size={16} /> Register Partner
            </button>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '16px',
            overflow: 'hidden'
          }}>
            {partners.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                No partners registered yet. Click "Register Partner" to create one.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                      <th style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Agency details</th>
                      <th style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Owner details</th>
                      <th style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Email Address</th>
                      <th style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Status</th>
                      <th style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 600 }}>{p.agencyName}</td>
                        <td style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.7)' }}>{p.ownerName}</td>
                        <td style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.6)' }}>
                          <div>{p.email}</div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{p.phone}</div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '100px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: p.status === 'ACTIVE' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            color: p.status === 'ACTIVE' ? '#34D399' : '#FCA5A5',
                            border: `1px solid ${p.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`
                          }}>{p.status}</span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <span style={{ display: 'inline-flex', gap: '12px' }}>
                            <button onClick={() => openEditPartner(p)} style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', padding: 0 }} title="Edit Partner"><Edit3 size={16} /></button>
                            <button onClick={() => handleDeletePartner(p._id)} style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', padding: 0 }} title="Delete Partner"><Trash2 size={16} /></button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. REFERRAL LEADS LIST */}
      {activeSubTab === 'leads' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Filters Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }} className="filters-row">
            <div style={{ display: 'flex', gap: '16px', flex: 1, maxWidth: '500px' }} className="filters-left">
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type="text"
                  placeholder="Search lead by name, email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    color: '#FFF',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  background: '#0E0E10',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#FFF',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              >
                <option value="">All Statuses</option>
                <option value="Received">Received</option>
                <option value="Contacted">Contacted</option>
                <option value="Commission Approved">Commission Approved</option>
                <option value="Commission Paid">Commission Paid</option>
              </select>
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '16px',
            overflow: 'hidden'
          }}>
            {referrals.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                No referrals matches the current query search parameters.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                      <th style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Client Contact</th>
                      <th style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Service / Budget</th>
                      <th style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Referred By</th>
                      <th style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Stage</th>
                      <th style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 600 }}>{r.clientName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{r.companyName} | {r.email} | {r.phone}</div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>{r.service}</div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Budget: {r.expectedBudget ? `₹${r.expectedBudget}` : 'N/A'}</div>
                        </td>
                        <td style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.6)' }}>
                          <div style={{ fontWeight: 600 }}>{r.partner ? r.partner.agencyName : 'Unknown Partner'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Date: {new Date(r.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '100px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: r.status === 'Commission Paid' ? 'rgba(16,185,129,0.1)' : r.status === 'Commission Approved' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                            color: r.status === 'Commission Paid' ? '#34D399' : r.status === 'Commission Approved' ? '#60A5FA' : '#FBBF24',
                            border: `1px solid ${r.status === 'Commission Paid' ? 'rgba(16,185,129,0.15)' : r.status === 'Commission Approved' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)'}`
                          }}>{r.status}</span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                            {r.status === 'Received' && (
                              <button onClick={() => handleUpdateStatus(r._id, 'Contacted')} style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                color: '#FFF',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}>Contact Client</button>
                            )}
                            {(r.status === 'Received' || r.status === 'Contacted') && (
                              <>
                                <button onClick={() => openApproveCommission(r)} style={{
                                  background: 'rgba(249, 115, 22, 0.1)',
                                  border: '1px solid rgba(249, 115, 22, 0.2)',
                                  borderRadius: '6px',
                                  padding: '4px 10px',
                                  color: 'var(--accent, #F97316)',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}>Approve Commission</button>
                                <button onClick={() => handleRejectReferral(r._id)} style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#F87171',
                                  cursor: 'pointer',
                                  padding: 0
                                }} title="Reject Lead"><X size={16} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. COMMISSIONS & PAYMENTS TAB */}
      {activeSubTab === 'payouts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
            Track and settle approved commission balances for registered partners.
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '16px',
            overflow: 'hidden'
          }}>
            {commissions.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                No commission entries logged.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                      <th style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Client / Agency</th>
                      <th style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Commission Amount</th>
                      <th style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Log Date</th>
                      <th style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Settlement Details</th>
                      <th style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 600 }}>{c.referral ? c.referral.clientName : 'Client Lead'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Agency: {c.partner ? c.partner.agencyName : 'N/A'}</div>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '1rem', fontWeight: 800 }}>₹{c.commissionAmount}</td>
                        <td style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.5)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '16px 20px' }}>
                          {c.status === 'Paid' ? (
                            <div>
                              <div style={{ fontSize: '0.85rem', color: '#34D399', fontWeight: 600 }}>Paid: {new Date(c.paymentDate).toLocaleDateString()}</div>
                              {c.transactionReference && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Ref: {c.transactionReference}</div>}
                            </div>
                          ) : (
                            <span style={{ color: '#60A5FA', fontSize: '0.8rem', fontWeight: 500 }}>Pending Settlement</span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          {c.status === 'Approved' && (
                            <button onClick={() => openMarkPaid(c)} style={{
                              background: 'rgba(16,185,129,0.1)',
                              border: '1px solid rgba(16,185,129,0.2)',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              color: '#34D399',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}>Mark as Paid</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* MODALS SECTION */}
      {/* ======================================= */}

      {/* 1. REGISTER/EDIT PARTNER MODAL */}
      {showPartnerModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '20px'
        }}>
          <div style={{
            background: '#0E0E10',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '32px',
            width: '100%',
            maxWidth: '480px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                {editPartner ? 'Edit Partner details' : 'Register Partner Agency'}
              </h3>
              <button onClick={() => setShowPartnerModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handlePartnerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Agency Name *</label>
                <input
                  type="text"
                  placeholder="Agency / Freelancer trading name"
                  value={agencyName}
                  onChange={e => setAgencyName(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#FFF',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Owner Name *</label>
                <input
                  type="text"
                  placeholder="Primary contact full name"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#FFF',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Email Address *</label>
                  <input
                    type="email"
                    placeholder="name@agency.com"
                    value={partnerEmail}
                    onChange={e => setPartnerEmail(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#FFF',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Phone *</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={partnerPhone}
                    onChange={e => setPartnerPhone(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#FFF',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                  Password {editPartner && '(Leave blank to keep unchanged)'} *
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={partnerPassword}
                  onChange={e => setPartnerPassword(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#FFF',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              {editPartner && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Account Status</label>
                  <select
                    value={partnerStatus}
                    onChange={e => setPartnerStatus(e.target.value)}
                    style={{
                      background: '#0E0E10',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#FFF',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={partnerActionLoading}
                style={{
                  background: 'var(--accent, #F97316)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#FFF',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '10px',
                  transition: 'opacity 0.2s'
                }}
              >
                {partnerActionLoading ? <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> : 'Save Partner Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. APPROVE COMMISSION MODAL */}
      {showCommissionModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '20px'
        }}>
          <div style={{
            background: '#0E0E10',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '32px',
            width: '100%',
            maxWidth: '420px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Approve Commission Payout</h3>
              <button onClick={() => setShowCommissionModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
              Register the manually approved flat commission amount for <strong>{selectedReferral?.clientName} ({selectedReferral?.companyName})</strong>.
            </div>

            <form onSubmit={handleApproveCommission} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Commission Amount (INR) *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>₹</span>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={commissionAmount}
                    onChange={e => setCommissionAmount(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '10px 12px 10px 24px',
                      color: '#FFF',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={commissionLoading}
                style={{
                  background: 'var(--accent, #F97316)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#FFF',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '6px'
                }}
              >
                {commissionLoading ? <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> : 'Approve Commission Payout'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. MARK COMMISSION AS PAID MODAL */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '20px'
        }}>
          <div style={{
            background: '#0E0E10',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '32px',
            width: '100%',
            maxWidth: '440px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Mark Payout as Settled</h3>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
              Record settlement info for the approved payout of <strong>₹{selectedCommission?.commissionAmount}</strong> to partner <strong>{selectedCommission?.partner?.agencyName}</strong>.
            </div>

            <form onSubmit={handleMarkPaid} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Payment Date *</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#FFF',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Transaction ID / Ref (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TXN987654321"
                  value={txnRef}
                  onChange={e => setTxnRef(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#FFF',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Internal Settlement Notes (CRM Only)</label>
                <textarea
                  rows="3"
                  placeholder="Settle notes (e.g. Paid via Bank Transfer, transaction receipts, etc)"
                  value={internalNotes}
                  onChange={e => setInternalNotes(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#FFF',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={paymentLoading}
                style={{
                  background: '#10B981',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#FFF',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '6px'
                }}
              >
                {paymentLoading ? <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> : 'Mark Payout as Settled'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .filters-row {
            flex-direction: column !important;
          }
          .filters-left {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
