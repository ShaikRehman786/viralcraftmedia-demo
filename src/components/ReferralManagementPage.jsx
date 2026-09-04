import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, UserPlus, Send, DollarSign, Wallet, Edit3, Trash2, Search, Filter, 
  Check, X, Eye, ShieldAlert, Loader2, Award, Calendar, CheckCircle2,
  Copy, Layers, BarChart2, Briefcase, CreditCard, FileText, AlertTriangle, RefreshCw,
  Mail, Phone, ExternalLink, Lock, ShieldX, Key, EyeOff, Pause, Play
} from 'lucide-react';

function ReferralEmptyState({ message, subMessage }) {
  return (
    <div style={{
      textAlign: 'center', padding: '40px 20px',
      background: 'var(--gray-50)', border: '1px dashed var(--gray-300)',
      borderRadius: '12px', color: 'var(--gray-400)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
      margin: '16px'
    }}>
      <AlertTriangle size={32} style={{ color: 'var(--gray-300)' }} />
      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }}>{message}</p>
      {subMessage && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-400)' }}>{subMessage}</p>}
    </div>
  );
}

export default function ReferralManagementPage({ user, addToast }) {
  const [activeSubTab, setActiveSubTab] = useState('partners');
  const [loading, setLoading] = useState(false);

  const tabsContainerRef = React.useRef(null);

  React.useEffect(() => {
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
  }, [activeSubTab]);

  React.useEffect(() => {
    const handleWindowClick = () => setActiveDropdownCampaignId(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // 1. Partners State
  const [partners, setPartners] = useState([]);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editPartner, setEditPartner] = useState(null);
  const [agencyName, setAgencyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerPassword, setPartnerPassword] = useState('');
  const [partnerStatus, setPartnerStatus] = useState('ACTIVE');
  const [partnerNotes, setPartnerNotes] = useState('');
  const [partnerActionLoading, setPartnerActionLoading] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedPartnerForReset, setSelectedPartnerForReset] = useState(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  // 2. Campaigns State
  const [campaigns, setCampaigns] = useState([]);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);
  const [campaignName, setCampaignName] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('clip-editing');
  const [validityDays, setValidityDays] = useState(30);
  const [customExpiryDate, setCustomExpiryDate] = useState('');
  const [landingPage, setLandingPage] = useState('/');
  const [minPercentage, setMinPercentage] = useState(5);
  const [maxPercentage, setMaxPercentage] = useState(20);
  const [campaignStatus, setCampaignStatus] = useState('ACTIVE');
  const [campaignNotes, setCampaignNotes] = useState('');
  const [campaignActionLoading, setCampaignActionLoading] = useState(false);
  const [activeDropdownCampaignId, setActiveDropdownCampaignId] = useState(null);

  // 3. Analytics State
  const [analyticsData, setAnalyticsData] = useState(null);

  // 4. Bookings State
  const [bookings, setBookings] = useState([]);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingRevenue, setBookingRevenue] = useState('');
  const [selectedCommissionPercentage, setSelectedCommissionPercentage] = useState('');
  const [commissionStatus, setCommissionStatus] = useState('Commission Not Generated');
  const [commissionLoading, setCommissionLoading] = useState(false);

  // 5. Commissions State
  const [commissions, setCommissions] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [txnRef, setTxnRef] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // 6. Payments State
  const [payments, setPayments] = useState([]);

  // 7. Reports State
  const [reportsData, setReportsData] = useState([]);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch functions
  const fetchPartners = async () => {
    try {
      const res = await axios.get('/api/admin/referrals/partners');
      setPartners(res.data?.data || []);
    } catch (e) {
      addToast('Failed to load partners.', 'error');
      setPartners([]);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await axios.get('/api/admin/referrals/campaigns');
      setCampaigns(res.data?.data || []);
    } catch (e) {
      addToast('Failed to load campaigns.', 'error');
      setCampaigns([]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get('/api/admin/referrals/analytics');
      setAnalyticsData(res.data?.data || null);
    } catch (e) {
      addToast('Failed to load analytics.', 'error');
      setAnalyticsData(null);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get('/api/admin/referrals/bookings');
      setBookings(res.data?.data || []);
    } catch (e) {
      addToast('Failed to load bookings.', 'error');
      setBookings([]);
    }
  };

  const fetchCommissions = async () => {
    try {
      const res = await axios.get('/api/admin/referrals/commissions');
      setCommissions(res.data?.data || []);
    } catch (e) {
      addToast('Failed to load commissions.', 'error');
      setCommissions([]);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await axios.get('/api/admin/referrals/payments');
      setPayments(res.data?.data || []);
    } catch (e) {
      addToast('Failed to load payments.', 'error');
      setPayments([]);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await axios.get('/api/admin/referrals/reports');
      setReportsData(res.data?.data || []);
    } catch (e) {
      addToast('Failed to load reports.', 'error');
      setReportsData([]);
    }
  };

  // Reload data based on active tab
  const refreshActiveData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'partners') {
        await fetchPartners();
      } else if (activeSubTab === 'campaigns') {
        await Promise.all([fetchCampaigns(), fetchPartners()]);
      } else if (activeSubTab === 'analytics') {
        await fetchAnalytics();
      } else if (activeSubTab === 'bookings') {
        await Promise.all([fetchBookings(), fetchCommissions()]);
      } else if (activeSubTab === 'commissions') {
        await fetchCommissions();
      } else if (activeSubTab === 'payments') {
        await fetchPayments();
      } else if (activeSubTab === 'reports') {
        await fetchReports();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshActiveData();
  }, [activeSubTab]);

  // Partners CRUD operations
  const openCreatePartner = () => {
    setEditPartner(null);
    setAgencyName('');
    setOwnerName('');
    setPartnerEmail('');
    setPartnerPhone('');
    setPartnerPassword('');
    setPartnerStatus('ACTIVE');
    setPartnerNotes('');
    setShowPartnerModal(true);
  };

  const openEditPartner = (p) => {
    setEditPartner(p);
    setAgencyName(p.agencyName);
    setOwnerName(p.ownerName);
    setPartnerEmail(p.email);
    setPartnerPhone(p.phone);
    setPartnerPassword('');
    setPartnerStatus(p.status || 'ACTIVE');
    setPartnerNotes(p.notes || '');
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
          notes: partnerNotes,
          password: partnerPassword || undefined
        });
        addToast('Partner updated successfully.', 'success');
      } else {
        await axios.post('/api/admin/referrals/partners', {
          agencyName,
          ownerName,
          email: partnerEmail,
          phone: partnerPhone,
          password: partnerPassword,
          notes: partnerNotes
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

  // Toggle active/inactive status
  const handleTogglePartnerStatus = async (p) => {
    const newStatus = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setPartnerActionLoading(true);
    try {
      await axios.put(`/api/admin/referrals/partners/${p._id}`, {
        agencyName: p.agencyName,
        ownerName: p.ownerName,
        email: p.email,
        phone: p.phone,
        status: newStatus,
        notes: p.notes
      });
      addToast(`Partner status updated to ${newStatus}.`, 'success');
      fetchPartners();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to toggle status.', 'error');
    } finally {
      setPartnerActionLoading(false);
    }
  };

  const handleDeletePartner = async (id) => {
    if (!confirm('Are you sure you want to delete this partner? All associated campaigns, clicks, bookings and commission logs will be deleted!')) return;
    try {
      await axios.delete(`/api/admin/referrals/partners/${id}`);
      addToast('Partner and associated records deleted.', 'success');
      fetchPartners();
    } catch (e) {
      addToast('Failed to delete partner.', 'error');
    }
  };

  const openResetPasswordModal = (partnerObj) => {
    setSelectedPartnerForReset(partnerObj);
    setNewResetPassword('');
    setShowResetPasswordModal(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newResetPassword) {
      addToast('Please enter a new password.', 'warning');
      return;
    }
    setResetPasswordLoading(true);
    try {
      await axios.post(`/api/admin/referrals/partners/${selectedPartnerForReset._id}/reset-password`, {
        password: newResetPassword
      });
      addToast(`Password reset successfully for ${selectedPartnerForReset.agencyName}.`, 'success');
      setShowResetPasswordModal(false);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to reset password.', 'error');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  // Copy Login credentials to clipboard
  const handleCopyLogin = (p) => {
    const loginLink = `${window.location.origin}/partner/login`;
    navigator.clipboard.writeText(loginLink);
    addToast(`Partner login template copied to clipboard!`, 'success');
  };

  // Generate Link placeholder
  const handleGenerateLinkPlaceholder = () => {
    addToast('To generate referral campaign links, please use the Campaigns tab.', 'info');
  };

  // Campaigns CRUD operations
  const PRODUCTION_SERVICES = [
    { id: 'clip-editing', name: 'Clip Editing', landingPage: '/#pricing', slug: 'clip-editing' },
    { id: 'podcast-editing', name: 'Podcast Editing', landingPage: '/services/podcast-editing', slug: 'podcast-editing' },
    { id: 'website-development', name: 'Website Design & Development', landingPage: '/services/web-design-development', slug: 'web-design-development' },
    { id: 'social-media-marketing', name: 'Social Media Marketing', landingPage: '/services/social-media-marketing', slug: 'social-media-marketing' },
    { id: 'branding', name: 'Branding', landingPage: '/services/branding', slug: 'branding' },
    { id: 'real-estate-editing', name: 'Real Estate Editing', landingPage: '/services/real-estate-editing', slug: 'real-estate-editing' }
  ];

  const openCreateCampaign = () => {
    setEditCampaign(null);
    setCampaignName('');
    setSelectedPartnerId('');
    setSelectedServiceId('clip-editing');
    setValidityDays(30);
    setCustomExpiryDate('');
    setLandingPage('/#pricing');
    setMinPercentage(5);
    setMaxPercentage(20);
    setCampaignStatus('ACTIVE');
    setCampaignNotes('');
    setShowCampaignModal(true);
  };

  const openEditCampaign = (c) => {
    setEditCampaign(c);
    setCampaignName(c.campaignName);
    setSelectedPartnerId(c.partner?._id || c.partner || '');
    
    const matchedService = PRODUCTION_SERVICES.find(s => s.id === c.serviceId || s.name === c.serviceName || s.name === c.service);
    setSelectedServiceId(matchedService ? matchedService.id : 'clip-editing');

    setValidityDays(c.validityDays);
    setCustomExpiryDate(c.customExpiryDate ? c.customExpiryDate.split('T')[0] : '');
    setLandingPage(c.landingPage);
    setMinPercentage(c.minCommissionPercentage);
    setMaxPercentage(c.maxCommissionPercentage);
    setCampaignStatus(c.status);
    setCampaignNotes(c.notes || '');
    setShowCampaignModal(true);
  };

  const handleCampaignSubmit = async (e) => {
    e.preventDefault();
    if (!campaignName || !selectedPartnerId || minPercentage === undefined || maxPercentage === undefined) {
      addToast('Please fill in all campaign fields.', 'warning');
      return;
    }

    setCampaignActionLoading(true);
    try {
      const activeService = PRODUCTION_SERVICES.find(s => s.id === selectedServiceId) || PRODUCTION_SERVICES[0];
      const payload = {
        campaignName,
        partner: selectedPartnerId,
        validityDays: Number(validityDays),
        customExpiryDate: Number(validityDays) === 0 ? customExpiryDate : undefined,
        landingPage: activeService.landingPage,
        serviceId: activeService.id,
        serviceSlug: activeService.slug,
        serviceName: activeService.name,
        service: activeService.name,
        targetRoute: activeService.landingPage,
        minCommissionPercentage: Number(minPercentage),
        maxCommissionPercentage: Number(maxPercentage),
        notes: campaignNotes,
        status: campaignStatus
      };

      if (editCampaign) {
        await axios.put(`/api/admin/referrals/campaigns/${editCampaign._id}`, payload);
        addToast('Referral campaign updated.', 'success');
      } else {
        await axios.post('/api/admin/referrals/campaigns', payload);
        addToast('Referral campaign generated.', 'success');
      }
      setShowCampaignModal(false);
      fetchCampaigns();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save campaign.', 'error');
    } finally {
      setCampaignActionLoading(false);
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!confirm('Are you sure you want to delete this campaign? All visitor click stats and conversions will be deleted!')) return;
    try {
      await axios.delete(`/api/admin/referrals/campaigns/${id}`);
      addToast('Campaign deleted successfully.', 'success');
      fetchCampaigns();
    } catch (e) {
      addToast('Failed to delete campaign.', 'error');
    }
  };

  const handleDuplicateCampaign = async (id) => {
    try {
      await axios.post(`/api/admin/referrals/campaigns/${id}/duplicate`);
      addToast('Campaign duplicated successfully.', 'success');
      fetchCampaigns();
    } catch (e) {
      addToast('Failed to duplicate campaign.', 'error');
    }
  };

  const copyCampaignLink = (code) => {
    const link = `${window.location.origin}/r/${code}`;
    navigator.clipboard.writeText(link);
    addToast('Referral link copied to clipboard!', 'success');
  };

  const handleToggleCampaignStatus = async (c) => {
    const newStatus = c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await axios.put(`/api/admin/referrals/campaigns/${c._id}`, {
        campaignName: c.campaignName,
        partner: c.partner?._id || c.partner || '',
        status: newStatus
      });
      addToast(`Campaign set to ${newStatus}.`, 'success');
      fetchCampaigns();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update campaign status.', 'error');
    }
  };

  // Booking Commission details and status management
  const openCalculateCommission = (bookingObj) => {
    setSelectedBooking(bookingObj);
    setBookingRevenue(bookingObj.bookingValue || '');
    setSelectedCommissionPercentage(bookingObj.commissionPercentage || bookingObj.campaign?.minCommissionPercentage || 10);
    
    // Find matching commission in loaded list
    const matchedComm = commissions.find(c => c.booking?._id === bookingObj._id || c.booking === bookingObj._id);
    if (matchedComm) {
      setCommissionStatus(matchedComm.status);
      setPaymentDate(matchedComm.paymentDate ? matchedComm.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0]);
      setInternalNotes(matchedComm.internalNotes || '');
    } else {
      setCommissionStatus('Commission Not Generated');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setInternalNotes('');
    }
    
    setShowCommissionModal(true);
  };

  const handleUpdateCommissionDetails = async (e, forcedStatus = null) => {
    if (e) e.preventDefault();
    const targetStatus = forcedStatus || commissionStatus;
    
    // Validations
    if (targetStatus !== 'Commission Not Generated') {
      if (!bookingRevenue || isNaN(bookingRevenue)) {
        addToast('Please enter a valid project value.', 'warning');
        return;
      }
      if (selectedCommissionPercentage === undefined || isNaN(selectedCommissionPercentage)) {
        addToast('Please enter a valid commission percentage.', 'warning');
        return;
      }
    }

    if (targetStatus === 'Paid') {
      if (!paymentDate) {
        addToast('Please select payment date for Paid status.', 'warning');
        setCommissionStatus('Paid');
        return;
      }
    }

    setCommissionLoading(true);
    try {
      await axios.post(`/api/admin/referrals/bookings/${selectedBooking._id}/commission`, {
        bookingValue: Number(bookingRevenue || 0),
        commissionPercentage: Number(selectedCommissionPercentage || 0),
        status: targetStatus,
        paymentDate,
        transactionReference: 'N/A',
        internalNotes
      });

      addToast(`Commission details updated successfully.`, 'success');
      setShowCommissionModal(false);
      fetchBookings();
      fetchCommissions();
      fetchPayments();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save commission details.', 'error');
    } finally {
      setCommissionLoading(false);
    }
  };

  // Commission status approve/reject
  const handleCommissionStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`/api/admin/referrals/commissions/${id}/status`, { status: newStatus });
      addToast(`Commission set to ${newStatus}.`, 'success');
      fetchCommissions();
    } catch (e) {
      addToast('Failed to update commission status.', 'error');
    }
  };

  // Mark Commission as Paid (Payout modal)
  const openPayoutModal = (commissionObj) => {
    setSelectedCommission(commissionObj);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setInternalNotes('');
    setShowPaymentModal(true);
  };

  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
    if (!paymentDate) {
      addToast('Please fill in payout date.', 'warning');
      return;
    }

    setPaymentLoading(true);
    try {
      await axios.post(`/api/admin/referrals/commissions/${selectedCommission._id}/pay`, {
        paymentDate,
        transactionReference: 'N/A',
        internalNotes
      });
      addToast('Payout recorded successfully.', 'success');
      setShowPaymentModal(false);
      fetchCommissions();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to process payment settlement.', 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Filter lists based on search
  const filterList = (list, fields) => {
    if (!searchQuery) return list;
    return list.filter(item => {
      return fields.some(field => {
        const value = field.split('.').reduce((acc, part) => acc && acc[part], item);
        return value && value.toString().toLowerCase().includes(searchQuery.toLowerCase());
      });
    });
  };

  return (
    <div className="animate-fade-in">
      
      {/* Title */}
      <div className="section-header">
        <div>
          <h2 className="section-title">Referral Partner Hub</h2>
          <p className="section-subtitle">
            Manage external partner agencies, unique links, cookie attributions, commissions, and payout records.
          </p>
        </div>
        <button 
          onClick={refreshActiveData}
          disabled={loading}
          className="btn btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading ? "spinner" : ""} /> Refresh Data
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="scrollable-tabs-bar mb-5" ref={tabsContainerRef}>
        {[
          { id: 'partners', name: 'Partners', icon: Users },
          { id: 'campaigns', name: 'Campaigns', icon: Layers },
          { id: 'analytics', name: 'Analytics', icon: BarChart2 },
          { id: 'bookings', name: 'Bookings', icon: Briefcase },
          { id: 'commissions', name: 'Commissions', icon: Wallet },
          { id: 'payments', name: 'Payments', icon: CreditCard },
          { id: 'reports', name: 'Reports', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id);
                setSearchQuery('');
              }}
              className={`tab ${active ? 'active' : ''}`}
            >
              <Icon size={14} />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Action buttons row (Search Bar Removed) */}
      {['partners', 'campaigns'].includes(activeSubTab) && (
        <div className="flex justify-end gap-2 mb-4">
          {activeSubTab === 'partners' && (
            <button onClick={openCreatePartner} className="btn btn-primary">
              <UserPlus size={16} /> Add Partner
            </button>
          )}
          {activeSubTab === 'campaigns' && (
            <button onClick={openCreateCampaign} className="btn btn-primary">
              <Layers size={16} /> New Campaign
            </button>
          )}
        </div>
      )}

      {/* Main Tab Rendering Block */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="spinner" size={32} style={{ color: 'var(--accent)' }} />
        </div>
      ) : (
        <>
          {/* 1. Partners Cards Grid (V2 SaaS style) */}
          {activeSubTab === 'partners' && (
            <div className="partner-grid">
               {(!partners || filterList(partners, ['agencyName', 'ownerName', 'email', 'phone']).length === 0) ? (
                 <div style={{ gridColumn: '1 / -1', width: '100%' }}>
                    <ReferralEmptyState message="No partner agencies registered yet." subMessage="Click 'Add Partner' to onboard a new referral agency." />
                 </div>
              ) : (
                filterList(partners, ['agencyName', 'ownerName', 'email', 'phone']).map(p => (
                  <div key={p?._id} className="partner-card">
                    
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>{p.agencyName}</h3>
                      <span className={`status-pill ${p.status === 'ACTIVE' ? 'active' : p.status === 'INACTIVE' ? 'inactive' : 'error'}`}>
                        {p.status || 'ACTIVE'}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="flex flex-col gap-2" style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-muted" style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: 600 }}>{p.ownerName}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-muted" style={{ flexShrink: 0 }} />
                        <a href={`mailto:${p.email}`} className="truncate" style={{ color: 'var(--gray-500)' }}>{p.email}</a>
                      </div>

                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-muted" style={{ flexShrink: 0 }} />
                        <a href={`tel:${p.phone}`} style={{ color: 'var(--gray-500)' }}>{p.phone}</a>
                      </div>

                      <div className="flex items-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '4px' }}>
                        <Calendar size={12} style={{ flexShrink: 0 }} />
                        <span>Registered {new Date(p.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>

                      {p.notes && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--gray-500)',
                          background: 'var(--gray-50)',
                          borderLeft: '2px solid var(--accent)',
                          padding: '6px 10px',
                          borderRadius: '0 6px 6px 0',
                          marginTop: '6px',
                          lineHeight: '1.4'
                        }}>
                          {p.notes}
                        </div>
                      )}
                    </div>

                    {/* Actions — single primary + contextual menu (no dense grid) */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', borderTop: '1px solid var(--gray-100)', paddingTop: '12px' }}>
                      <button onClick={() => openEditPartner(p)} className="btn btn-primary btn-sm flex-1">Manage</button>
                      <div style={{ position: 'relative' }}>
                        <button onClick={(e) => { e.stopPropagation(); setActiveDropdownCampaignId(activeDropdownCampaignId === `p-${p._id}` ? null : `p-${p._id}`); }} className="btn btn-secondary btn-sm" style={{ minWidth: '44px' }}>⋯</button>
                        {activeDropdownCampaignId === `p-${p._id}` && (
                          <div onClick={e=>e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '36px', background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: '10px', boxShadow: 'var(--shadow-lg)', padding: '6px', minWidth: '180px', zIndex: 20, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <button onClick={() => { handleCopyLogin(p); setActiveDropdownCampaignId(null); }} className="btn btn-ghost btn-sm justify-start">Copy Login</button>
                            <button onClick={() => { openResetPasswordModal(p); setActiveDropdownCampaignId(null); }} className="btn btn-ghost btn-sm justify-start">Reset Password</button>
                            <button onClick={() => { handleTogglePartnerStatus(p); setActiveDropdownCampaignId(null); }} className="btn btn-ghost btn-sm justify-start" style={{ color: p.status==='ACTIVE'?'var(--warning)':'var(--success)' }}>{p.status==='ACTIVE'?'Deactivate':'Reactivate'}</button>
                            <hr style={{ border: 'none', borderTop: '1px solid var(--gray-100)', margin: '2px 0' }} />
                            <button onClick={() => { handleDeletePartner(p._id); setActiveDropdownCampaignId(null); }} className="btn btn-ghost btn-sm justify-start" style={{ color: 'var(--error)' }}>Delete Partner</button>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>
          )}

          {/* 2. Campaigns Table */}
          {activeSubTab === 'campaigns' && (
            <div className="card">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Campaign Name</th>
                      <th>Partner</th>
                      <th>Commission Range</th>
                      <th>Referral Link</th>
                      <th>Expiry Date</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!campaigns || filterList(campaigns, ['campaignName', 'partner.agencyName', 'referralCode']).length === 0) ? (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted">
                          <ReferralEmptyState message="No campaigns yet." subMessage="No referral campaigns configured." />
                        </td>
                      </tr>
                    ) : (
                      filterList(campaigns, ['campaignName', 'partner.agencyName', 'referralCode']).map(c => {
                        const expired = c?.expiryDate ? new Date(c.expiryDate) < new Date() : false;
                        return (
                          <tr key={c?._id} className="hover-row">
                            <td className="font-semibold">
                              <div>{c?.campaignName}</div>
                              <span className="badge badge-gray text-xxs mt-1" style={{ fontSize: '0.65rem', padding: '2px 6px', display: 'inline-block' }}>
                                🛠 {c?.serviceName || c?.service || 'N/A'}
                              </span>
                            </td>
                            <td>{c?.partner?.agencyName || 'N/A'}</td>
                            <td>{c?.minCommissionPercentage || 0}% — {c?.maxCommissionPercentage || 0}%</td>
                            <td>
                               <div className="flex items-center gap-2" style={{ whiteSpace: 'nowrap' }}>
                                 <span className="font-mono text-xs text-accent" style={{ fontWeight: 700 }}>{c?.referralCode}</span>
                                 <button 
                                   onClick={() => copyCampaignLink(c?.referralCode)}
                                   className="btn btn-outline btn-sm flex items-center gap-1"
                                   style={{ padding: '4px 8px', fontSize: '0.72rem', height: '30px', borderRadius: '6px' }}
                                 >
                                   <Copy size={12} /> Copy
                                 </button>
                               </div>
                             </td>
                             <td>
                               <span style={{ color: expired ? 'var(--error)' : 'var(--gray-600)' }}>
                                 {c?.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : '—'}
                               </span>
                             </td>
                             <td>
                               <span className={`badge ${expired || c?.status === 'EXPIRED' ? 'badge-error' : c?.status === 'INACTIVE' ? 'badge-gray' : 'badge-success'}`}>
                                 {expired ? 'EXPIRED' : c?.status}
                               </span>
                             </td>
                             <td className="text-right">
                               {/* Desktop actions: inline, equal height, never wrap on desktop */}
                               <div className="desktop-only-actions flex items-center justify-end gap-2" style={{ display: 'flex', flexDirection: 'row', whiteSpace: 'nowrap' }}>
                                 <button 
                                   onClick={() => openEditCampaign(c)}
                                   className="btn btn-secondary btn-sm flex items-center gap-1"
                                   style={{ padding: '6px 12px', fontSize: '0.8rem', height: '36px', borderRadius: '10px', fontWeight: 500 }}
                                 >
                                   <Edit3 size={13} /> Edit
                                 </button>
                                 <button 
                                   onClick={() => handleToggleCampaignStatus(c)}
                                   className="btn btn-outline btn-sm flex items-center gap-1"
                                   style={{ padding: '6px 12px', fontSize: '0.8rem', height: '36px', borderRadius: '10px', fontWeight: 500 }}
                                 >
                                   {c?.status === 'ACTIVE' ? (
                                     <>
                                       <Pause size={13} /> Pause
                                     </>
                                   ) : (
                                     <>
                                       <Play size={13} /> Activate
                                     </>
                                   )}
                                 </button>
                                 <button 
                                   onClick={() => handleDeleteCampaign(c?._id)}
                                   className="btn btn-outline btn-sm flex items-center gap-1"
                                   style={{ color: 'var(--error)', borderColor: 'var(--error)', padding: '6px 12px', fontSize: '0.8rem', height: '36px', borderRadius: '10px', fontWeight: 500 }}
                                 >
                                   <Trash2 size={13} /> Delete
                                 </button>
                               </div>

                               {/* Mobile actions: Single "More" dropdown trigger button */}
                               <div className="mobile-only-actions" style={{ display: 'none', position: 'relative', textAlign: 'right' }}>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setActiveDropdownCampaignId(activeDropdownCampaignId === c._id ? null : c._id);
                                   }}
                                   className="btn btn-secondary btn-sm"
                                   style={{ padding: '6px 10px', height: '36px', borderRadius: '10px', fontSize: '0.8rem' }}
                                 >
                                   ⋮ More
                                 </button>
                                 
                                 {activeDropdownCampaignId === c._id && (
                                   <div 
                                     onClick={e => e.stopPropagation()}
                                     style={{
                                       position: 'absolute', right: 0, top: '40px', background: 'var(--white)',
                                       border: '1px solid var(--gray-200)', borderRadius: '8px', zIndex: 1000,
                                       boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '6px', minWidth: '160px',
                                       display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left'
                                     }}
                                   >
                                     <button 
                                       onClick={() => {
                                         copyCampaignLink(c?.referralCode);
                                         setActiveDropdownCampaignId(null);
                                       }}
                                       className="btn btn-ghost btn-sm flex items-center gap-2 justify-start"
                                       style={{ width: '100%', fontSize: '0.8rem', padding: '6px 10px', fontWeight: 500 }}
                                     >
                                       <Copy size={13} /> Copy Link
                                     </button>
                                     <button 
                                       onClick={() => {
                                         openEditCampaign(c);
                                         setActiveDropdownCampaignId(null);
                                       }}
                                       className="btn btn-ghost btn-sm flex items-center gap-2 justify-start"
                                       style={{ width: '100%', fontSize: '0.8rem', padding: '6px 10px', fontWeight: 500 }}
                                     >
                                       <Edit3 size={13} /> Edit
                                     </button>
                                     <button 
                                       onClick={() => {
                                         handleToggleCampaignStatus(c);
                                         setActiveDropdownCampaignId(null);
                                       }}
                                       className="btn btn-ghost btn-sm flex items-center gap-2 justify-start"
                                       style={{ width: '100%', fontSize: '0.8rem', padding: '6px 10px', fontWeight: 500 }}
                                     >
                                       {c?.status === 'ACTIVE' ? (
                                         <>
                                           <Pause size={13} /> Pause
                                         </>
                                       ) : (
                                         <>
                                           <Play size={13} /> Activate
                                         </>
                                       )}
                                     </button>
                                     <button 
                                       onClick={() => {
                                         handleDeleteCampaign(c?._id);
                                         setActiveDropdownCampaignId(null);
                                       }}
                                       className="btn btn-ghost btn-sm flex items-center gap-2 justify-start"
                                       style={{ width: '100%', fontSize: '0.8rem', padding: '6px 10px', color: 'var(--error)', fontWeight: 500 }}
                                     >
                                       <Trash2 size={13} /> Delete
                                     </button>
                                   </div>
                                 )}
                               </div>
                             </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Analytics View */}
          {activeSubTab === 'analytics' && (
            <div>
              {/* Analytics summary panels */}
              <div className="kpi-grid mb-6">
                {[
                  { name: 'Total Opens', val: analyticsData?.totalClicks || 0, icon: ExternalLink, colorClass: 'kpi-icon-blue', text: 'Clicks across all links' },
                  { name: 'Unique Visitors', val: analyticsData?.uniqueVisitors || 0, icon: Users, colorClass: 'kpi-icon-orange', text: 'Non-duplicate browser IPs' },
                  { name: 'Attributed Bookings', val: analyticsData?.totalBookings || 0, icon: Briefcase, colorClass: 'kpi-icon-green', text: 'Form submissions logged' },
                  { name: 'Avg. Conversion Rate', val: `${analyticsData?.conversionRate || 0}%`, icon: Award, colorClass: 'kpi-icon-purple', text: 'Unique visitor conversions' }
                ].map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div key={idx} className="kpi-card">
                      <div className={`kpi-icon ${card.colorClass}`}>
                        <Icon size={20} />
                      </div>
                      <div className="kpi-content">
                        <div className="kpi-label">{card.name}</div>
                        <div className="kpi-value">{card.val}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '4px' }}>{card.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Aggregated campaigns performance list */}
              <h3 className="section-title mb-3">Campaign-level Metrics</h3>
              {!analyticsData || !analyticsData.partnerMetrics || analyticsData.partnerMetrics.length === 0 ? (
                <ReferralEmptyState message="No analytics available." subMessage="No clicks or referral bookings recorded yet." />
              ) : (
                <div className="card">
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Partner Agency</th>
                          <th>Total Opens</th>
                          <th>Unique Visitors</th>
                          <th>Attributed Bookings</th>
                          <th>Booking Value Generated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.partnerMetrics.map((pm, i) => (
                          <tr key={i} className="hover-row">
                            <td>
                              <div className="font-semibold">{pm?.agencyName}</div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Owner: {pm?.ownerName}</span>
                            </td>
                            <td>-</td>
                            <td>-</td>
                            <td style={{ color: 'var(--success)', fontWeight: 600 }}>{pm?.bookingsCount || 0}</td>
                            <td className="font-semibold">₹{pm?.bookingValueSum ? pm.bookingValueSum.toLocaleString() : '0'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Bookings Table */}
          {activeSubTab === 'bookings' && (
            <div className="card">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Service Category</th>
                      <th>Attributed Partner</th>
                      <th>Campaign</th>
                      <th>Revenue (INR)</th>
                      <th>Earned Commission</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!bookings || filterList(bookings, ['clientName', 'service', 'partner.agencyName', 'campaign.campaignName']).length === 0) ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4 text-muted">
                          <ReferralEmptyState message="No referral bookings." subMessage="No attributed referral bookings found." />
                        </td>
                      </tr>
                    ) : (
                      filterList(bookings, ['clientName', 'service', 'partner.agencyName', 'campaign.campaignName']).map(b => (
                        <tr key={b?._id} className="hover-row">
                          <td>
                            <div className="font-semibold">{b?.clientName}</div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{b?.phone} | {b?.email}</span>
                          </td>
                          <td>{b?.service}</td>
                          <td>{b?.partner?.agencyName || 'N/A'}</td>
                          <td>{b?.campaign?.campaignName || 'N/A'}</td>
                          <td className="font-semibold">
                            {b?.bookingValue ? `₹${(b.bookingValue || 0).toLocaleString()}` : '—'}
                          </td>
                          <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                            {b?.commissionAmount ? `₹${(b.commissionAmount || 0).toLocaleString()} (${b.commissionPercentage || 0}%)` : '—'}
                          </td>
                          <td>
                            <span className={`badge ${b?.status === 'Completed' ? 'badge-success' : b?.status === 'Cancelled' ? 'badge-error' : 'badge-warning'}`}>
                              {b?.status}
                            </span>
                          </td>
                          <td className="text-right">
                            <button
                              onClick={() => openCalculateCommission(b)}
                              className="btn btn-secondary btn-sm"
                            >
                              Manage Commission
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. Commissions Table */}
          {activeSubTab === 'commissions' && (
            <div className="card">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Service Category</th>
                      <th>Partner Agency</th>
                      <th>Commission Amount</th>
                      <th>Status</th>
                      <th>Settled Date</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!commissions || filterList(commissions, ['booking.service', 'partner.agencyName', 'status']).length === 0) ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">
                          <ReferralEmptyState message="No commission records." subMessage="No commission logs found." />
                        </td>
                      </tr>
                    ) : (
                      filterList(commissions, ['booking.service', 'partner.agencyName', 'status']).map(c => (
                        <tr key={c?._id} className="hover-row">
                          <td>
                            <div className="font-semibold">{c?.booking?.service || 'N/A'}</div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                              Campaign: {c?.booking?.campaign?.campaignName || 'General'}
                            </span>
                          </td>
                          <td>{c?.partner?.agencyName || 'N/A'}</td>
                          <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                            ₹{(c?.commissionAmount || 0).toLocaleString()} ({c?.commissionPercentage || 0}%)
                          </td>
                          <td>
                            <span className={`badge ${c?.status === 'Paid' ? 'badge-success' : c?.status === 'Approved' ? 'badge-info' : c?.status === 'Cancelled' ? 'badge-error' : 'badge-warning'}`}>
                              {c?.status}
                            </span>
                          </td>
                          <td style={{ color: 'var(--gray-600)' }}>
                            {c?.paymentDate && !isNaN(new Date(c.paymentDate).getTime()) ? new Date(c.paymentDate).toLocaleDateString() : '—'}
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {c?.status === 'Pending' && (
                                <>
                                  <button 
                                    onClick={() => handleCommissionStatusChange(c?._id, 'Approved')}
                                    title="Approve Commission"
                                    className="btn btn-ghost btn-icon btn-sm"
                                    style={{ color: 'var(--success)' }}
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleCommissionStatusChange(c?._id, 'Cancelled')}
                                    title="Reject Commission"
                                    className="btn btn-ghost btn-icon btn-sm"
                                    style={{ color: 'var(--error)' }}
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              )}
                              {c?.status === 'Approved' && (
                                <button
                                  onClick={() => openPayoutModal(c)}
                                  className="btn btn-secondary btn-sm"
                                >
                                  Mark Paid
                                </button>
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
          )}

          {/* 6. Payments Table */}
          {activeSubTab === 'payments' && (
            <div className="card">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Payout Partner</th>
                      <th>Service Category</th>
                      <th>Paid Amount</th>
                      <th>Settled Date</th>
                      <th>Settlement Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!payments || filterList(payments, ['partner.agencyName', 'internalNotes']).length === 0) ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          <ReferralEmptyState message="No payment history." subMessage="No payout logs registered yet." />
                        </td>
                      </tr>
                    ) : (
                      filterList(payments, ['partner.agencyName', 'internalNotes']).map(p => (
                        <tr key={p?._id} className="hover-row">
                          <td className="font-semibold">{p?.partner?.agencyName || 'N/A'}</td>
                          <td>{p?.commission?.booking?.service || 'N/A'}</td>
                          <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{(p?.amount || 0).toLocaleString()}</td>
                          <td>
                            {p?.paymentDate && !isNaN(new Date(p.paymentDate).getTime()) ? new Date(p.paymentDate).toLocaleDateString() : '—'}
                          </td>
                          <td style={{ color: 'var(--gray-50)' }}>{p?.internalNotes || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. Reports View */}
          {activeSubTab === 'reports' && (
            <div className="card">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Partner Agency</th>
                      <th>Owner</th>
                      <th>Commissions Settle-Approved (INR)</th>
                      <th>Commissions Paid (INR)</th>
                      <th>Total Cumulative Earnings (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!reportsData || reportsData.length === 0) ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          <ReferralEmptyState message="No reports generated." subMessage="No reports data generated." />
                        </td>
                      </tr>
                    ) : (
                      reportsData.map((r, i) => (
                        <tr key={i} className="hover-row">
                          <td className="font-semibold">{r?.agencyName}</td>
                          <td>{r?.ownerName} ({r?.email})</td>
                          <td style={{ color: 'var(--info)', fontWeight: 600 }}>₹{(r?.totalApproved || 0).toLocaleString()}</td>
                          <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{(r?.totalPaid || 0).toLocaleString()}</td>
                          <td className="font-bold">₹{(r?.totalCommissions || 0).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* MODALS SECTION */}
      {/* ============================================================== */}

      {/* A. Partner Creation / Editing Modal */}
      {showPartnerModal && (
        <div className="dialog-overlay" onClick={() => setShowPartnerModal(false)}>
          <div className="dialog" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>{editPartner ? 'Edit Referral Partner' : 'Register New Partner'}</h2>
              <button 
                type="button"
                onClick={() => setShowPartnerModal(false)}
                className="dialog-close-btn"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePartnerSubmit} className="dialog-form">
              <div className="dialog-body">
                <div className="modal-form-grid">
                  <div className="form-group">
                    <label htmlFor="agencyName" className="form-label">Agency Name *</label>
                    <input
                      id="agencyName"
                      type="text" required placeholder="e.g. ABC Digital Marketing"
                      value={agencyName} onChange={e => setAgencyName(e.target.value)}
                      className="input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="ownerName" className="form-label">Owner Name *</label>
                    <input
                      id="ownerName"
                      type="text" required placeholder="e.g. John Doe"
                      value={ownerName} onChange={e => setOwnerName(e.target.value)}
                      className="input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="partnerEmail" className="form-label">Email Address *</label>
                    <input
                      id="partnerEmail"
                      type="email" required placeholder="partner@agency.com"
                      value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)}
                      className="input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="partnerPhone" className="form-label">Phone *</label>
                    <input
                      id="partnerPhone"
                      type="text" required placeholder="+91 98765 43210"
                      value={partnerPhone} onChange={e => setPartnerPhone(e.target.value)}
                      className="input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="partnerPassword" className="form-label">
                      {editPartner ? 'New Password (Optional)' : 'Password *'}
                    </label>
                    <input
                      id="partnerPassword"
                      type="password" required={!editPartner} placeholder="••••••••"
                      value={partnerPassword} onChange={e => setPartnerPassword(e.target.value)}
                      className="input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="partnerStatus" className="form-label">Status</label>
                    <select
                      id="partnerStatus"
                      value={partnerStatus} onChange={e => setPartnerStatus(e.target.value)}
                      className="select"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>

                  <div className="form-group grid-col-span-2">
                    <label htmlFor="partnerNotes" className="form-label">Partner Notes (CRM Only)</label>
                    <textarea
                      id="partnerNotes"
                      rows="3" placeholder="Describe the partner agency, payment details, tier, contract details etc."
                      value={partnerNotes} onChange={e => setPartnerNotes(e.target.value)}
                      className="textarea"
                      style={{ resize: 'none', minHeight: '80px' }}
                    />
                  </div>
                </div>
              </div>

              <div className="dialog-footer">
                <button
                  type="button"
                  onClick={() => setShowPartnerModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={partnerActionLoading}
                  className="btn btn-primary"
                >
                  {partnerActionLoading ? <Loader2 size={14} className="spinner" /> : editPartner ? 'Save Changes' : 'Register Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. Reset Partner Password Modal */}
      {showResetPasswordModal && (
        <div className="dialog-overlay" onClick={() => setShowResetPasswordModal(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>Reset Partner Password</h2>
              <button 
                type="button"
                onClick={() => setShowResetPasswordModal(false)} 
                className="dialog-close-btn"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleResetPasswordSubmit} className="dialog-form">
              <div className="dialog-body">
                <p style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', margin: 0, lineHeight: 1.5 }}>
                  Specify a new password for <strong>{selectedPartnerForReset?.agencyName}</strong>. They will receive an email notification alerting them of the credentials reset.
                </p>
                
                <div className="form-group mt-3">
                  <label htmlFor="newResetPassword" className="form-label">New Password *</label>
                  <input
                    id="newResetPassword"
                    type="password" required placeholder="Enter new password"
                    value={newResetPassword} onChange={e => setNewResetPassword(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
              
              <div className="dialog-footer">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={resetPasswordLoading}
                  className="btn btn-primary"
                >
                  {resetPasswordLoading ? <Loader2 size={14} className="spinner" /> : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. Campaign Creation / Editing Modal */}
      {showCampaignModal && (
        <div className="dialog-overlay" onClick={() => setShowCampaignModal(false)}>
          <div className="dialog" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>{editCampaign ? 'Edit Referral Campaign' : 'Generate Referral Link Campaign'}</h2>
              <button 
                type="button"
                onClick={() => setShowCampaignModal(false)}
                className="dialog-close-btn"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCampaignSubmit} className="dialog-form">
              <div className="dialog-body">
                <div className="form-group">
                  <label className="form-label">Campaign Name *</label>
                  <input
                    type="text" required placeholder="e.g. Website Engineering August"
                    value={campaignName} onChange={e => setCampaignName(e.target.value)}
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Referral Partner *</label>
                  <select
                    required value={selectedPartnerId} onChange={e => setSelectedPartnerId(e.target.value)}
                    className="select"
                  >
                    <option value="">Select Partner Agency</option>
                    {partners.filter(p => p.status === 'ACTIVE').map(p => (
                      <option key={p._id} value={p._id}>{p.agencyName} ({p.ownerName})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Referral Target Service *</label>
                  <select
                    required
                    value={selectedServiceId}
                    onChange={e => setSelectedServiceId(e.target.value)}
                    className="select"
                  >
                    {PRODUCTION_SERVICES.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid-cols-2 gap-3" style={{ display: 'grid' }}>
                  <div className="form-group">
                    <label className="form-label">Min Commission %</label>
                    <input
                      type="number" min="0" max="100" placeholder="e.g. 5"
                      value={minPercentage} onChange={e => setMinPercentage(e.target.value)}
                      className="input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Max Commission %</label>
                    <input
                      type="number" min="0" max="100" placeholder="e.g. 15"
                      value={maxPercentage} onChange={e => setMaxPercentage(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>
              </div>

              <div className="dialog-footer">
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={campaignActionLoading}
                  className="btn btn-primary"
                >
                  {campaignActionLoading ? <Loader2 size={14} className="spinner" /> : editCampaign ? 'Save Campaign' : 'Generate Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* D. Calculate Commission Modal */}
      {showCommissionModal && (
        <div className="dialog-overlay" onClick={() => setShowCommissionModal(false)}>
          <div className="dialog" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>Referral Booking Details & Commission</h2>
              <button type="button" onClick={() => setShowCommissionModal(false)} className="dialog-close-btn" aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateCommissionDetails} className="dialog-form">
              <div className="dialog-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                
                {/* 1. Client & Partner Metadata Details */}
                <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '10px', padding: '12px', fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '8px' }} className="mb-3">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    <div>
                      <span style={{ color: 'var(--gray-400)', fontWeight: 600, display: 'block', fontSize: '0.7rem' }}>CUSTOMER</span>
                      <strong>{selectedBooking?.clientName}</strong>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--gray-500)' }}>{selectedBooking?.email || 'No Email'} • {selectedBooking?.phone}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--gray-400)', fontWeight: 600, display: 'block', fontSize: '0.7rem' }}>PARTNER</span>
                      <strong>{selectedBooking?.partner?.agencyName}</strong>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--gray-500)' }}>Owner: {selectedBooking?.partner?.ownerName}</span>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '6px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    <div>
                      <span style={{ color: 'var(--gray-400)', fontWeight: 600, display: 'block', fontSize: '0.7rem' }}>CAMPAIGN</span>
                      <span>{selectedBooking?.campaign?.campaignName}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--gray-400)', fontWeight: 600, display: 'block', fontSize: '0.7rem' }}>SERVICE</span>
                      <span>{selectedBooking?.service}</span>
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'var(--accent-50)', border: '1px solid var(--accent-200)',
                  borderRadius: '8px', padding: '12px', fontSize: '0.8125rem', color: 'var(--accent-700)'
                }} className="mb-3">
                  <strong>Suggested Campaign Commission:</strong> {selectedBooking?.campaign?.minCommissionPercentage}% — {selectedBooking?.campaign?.maxCommissionPercentage}%
                </div>

                {/* 2. Project Value (Project Value / Revenue) */}
                <div className="form-group">
                  <label className="form-label">Project Value / Revenue (INR) *</label>
                  <input
                    type="number" required placeholder="e.g. 40000"
                    value={bookingRevenue} onChange={e => setBookingRevenue(e.target.value)}
                    className="input"
                  />
                </div>

                {/* 3. Commission Slider & Input */}
                <div className="form-group mt-3">
                  <label className="form-label">Commission Percentage: {selectedCommissionPercentage}%</label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={selectedCommissionPercentage}
                    onChange={e => setSelectedCommissionPercentage(Number(e.target.value))}
                    style={{ width: '100%', height: '6px', background: 'var(--gray-200)', borderRadius: '4px', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '4px' }}>
                    <span>0%</span>
                    <span>10%</span>
                    <span>20%</span>
                    <span>30%</span>
                  </div>
                </div>

                <div className="form-group mt-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Or enter manual percentage"
                    value={selectedCommissionPercentage}
                    onChange={e => setSelectedCommissionPercentage(e.target.value)}
                    className="input"
                  />
                </div>

                {/* 4. Live Preview Box */}
                <div style={{
                  background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
                  borderRadius: '8px', padding: '12px', fontSize: '0.8125rem', margin: '16px 0'
                }} className="flex-col gap-2">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--gray-500)' }}>Project Value:</span>
                    <strong>₹{Number(bookingRevenue || 0).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ color: 'var(--gray-500)' }}>Commission:</span>
                    <strong>{selectedCommissionPercentage || 0}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--gray-200)', paddingTop: '6px', marginTop: '6px' }}>
                    <span>Commission Amount:</span>
                    <strong style={{ color: 'var(--success)' }}>
                      ₹{Number(Number(bookingRevenue || 0) * (Number(selectedCommissionPercentage || 0) / 100)).toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* 5. Payment Status Selector */}
                <div className="form-group mt-3">
                  <label className="form-label">Payment & Payout Status</label>
                  <select
                    value={commissionStatus}
                    onChange={e => setCommissionStatus(e.target.value)}
                    className="select"
                  >
                    <option value="Commission Not Generated">Commission Not Generated</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="Payment Pending">Payment Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* 6. Settlement Details (Conditional for 'Paid' status) */}
                {commissionStatus === 'Paid' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px dashed var(--gray-200)', marginTop: '16px', paddingTop: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Payment Settlement Date *</label>
                      <input
                        type="date" required
                        value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                        className="input"
                      />
                    </div>
                  </div>
                )}

                {/* 7. Internal notes */}
                <div className="form-group mt-3">
                  <label className="form-label">Settlement / Internal Notes</label>
                  <textarea
                    rows="2"
                    placeholder="Notes (Bank transfer details, internal check notes, etc.)"
                    value={internalNotes} onChange={e => setInternalNotes(e.target.value)}
                    className="textarea"
                    style={{ resize: 'none' }}
                  />
                </div>

              </div>

              <div className="dialog-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => setShowCommissionModal(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleUpdateCommissionDetails(e, commissionStatus)}
                    disabled={commissionLoading}
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                  >
                    {commissionLoading ? <Loader2 size={14} className="spinner" /> : 'Save Changes'}
                  </button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', width: '100%', borderTop: '1px solid var(--gray-200)', paddingTop: '10px' }}>
                  <button
                    type="button"
                    onClick={(e) => handleUpdateCommissionDetails(e, 'Approved')}
                    disabled={commissionLoading}
                    className="btn btn-outline"
                    style={{ color: 'var(--info)', fontSize: '0.75rem', padding: '6px 4px' }}
                  >
                    Approve Commission
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleUpdateCommissionDetails(e, 'Rejected')}
                    disabled={commissionLoading}
                    className="btn btn-outline"
                    style={{ color: 'var(--error)', fontSize: '0.75rem', padding: '6px 4px' }}
                  >
                    Reject Commission
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleUpdateCommissionDetails(e, 'Payment Pending')}
                    disabled={commissionLoading}
                    className="btn btn-outline"
                    style={{ color: 'var(--warning-dark)', fontSize: '0.75rem', padding: '6px 4px' }}
                  >
                    Mark Payment Pending
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      if (commissionStatus !== 'Paid') {
                        setCommissionStatus('Paid');
                        addToast('Please enter transaction reference and date below, then click Mark Paid again.', 'info');
                      } else {
                        handleUpdateCommissionDetails(e, 'Paid');
                      }
                    }}
                    disabled={commissionLoading}
                    className="btn btn-outline"
                    style={{ color: 'var(--success)', fontSize: '0.75rem', padding: '6px 4px' }}
                  >
                    Mark Payment Paid
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* E. Payout Mark Paid Modal */}
      {showPaymentModal && (
        <div className="dialog-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>Mark Payout as Settled</h2>
              <button type="button" onClick={() => setShowPaymentModal(false)} className="dialog-close-btn" aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePayoutSubmit} className="dialog-form">
              <div className="dialog-body">
                <div className="form-group">
                  <label className="form-label">Payment Date *</label>
                  <input
                    type="date" required
                    value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                    className="input"
                  />
                </div>


                <div className="form-group mt-3">
                  <label className="form-label">Internal Settlement Notes</label>
                  <textarea
                    rows="3" placeholder="Notes (Bank transfer details, attachments reference etc.)"
                    value={internalNotes} onChange={e => setInternalNotes(e.target.value)}
                    className="textarea"
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>

              <div className="dialog-footer">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={paymentLoading}
                  className="btn btn-primary"
                  style={{ background: 'var(--success)' }}
                >
                  {paymentLoading ? <Loader2 size={14} className="spinner" /> : 'Mark as Settled'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled Premium Components CSS */}
      <style>{`
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .hover-row:hover { background: var(--gray-50) !important; }

        /* Scrollable Tabs Bar CSS */
        .scrollable-tabs-bar {
          display: flex;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--gray-200);
          background: var(--white);
          gap: 8px;
          padding: 4px 16px;
          margin-left: -16px;
          margin-right: -16px;
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
          gap: 8px;
          padding: 10px 16px;
          font-size: 0.875rem;
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

        /* Premium SaaS Card Grid */
        .partner-grid {
          display: grid;
          gap: 16px;
          margin-top: 10px;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        }

        .modal-form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .grid-col-span-2 {
          grid-column: span 2;
        }
        @media (min-width: 768px) {
          .mobile-only-actions { display: none !important; }
          .desktop-only-actions { display: flex !important; }
        }
        @media (max-width: 767px) {
          .desktop-only-actions { display: none !important; }
          .mobile-only-actions { display: inline-block !important; }
          .modal-form-grid {
            grid-template-columns: 1fr;
          }
          .grid-col-span-2 {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}
