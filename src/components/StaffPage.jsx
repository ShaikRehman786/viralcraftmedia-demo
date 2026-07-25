import React, { useState, useMemo } from 'react';
import {
  Plus,
  Users,
  Edit3,
  RefreshCw,
  Trash2,
  X,
  Send,
  UserPlus,
  Shield,
  Phone,
  CheckCircle,
  Search,
  MoreHorizontal,
  Eye,
  Key,
  Activity,
  Briefcase,
  Mail,
  Building,
  UserX,
  Clock
} from 'lucide-react';

const ROLE_META = {
  SUPER_ADMIN: { label: 'Super Admin', badge: 'sp-role-admin', color: '#F97316', permLabel: 'Full Access' },
  MANAGER: { label: 'Manager', badge: 'sp-role-manager', color: '#3B82F6', permLabel: 'Team Lead' },
  EMPLOYEE: { label: 'Employee', badge: 'sp-role-employee', color: '#10B981', permLabel: 'Standard' }
};

const STATUS_META = {
  ACTIVE: { label: 'Online', dot: 'sp-dot-online', pill: 'sp-pill-online' },
  INVITED: { label: 'Invited', dot: 'sp-dot-invited', pill: 'sp-pill-invited' },
  PENDING_APPROVAL: { label: 'Pending', dot: 'sp-dot-pending', pill: 'sp-pill-pending' },
  DISABLED: { label: 'Suspended', dot: 'sp-dot-offline', pill: 'sp-pill-suspended' },
  INACTIVE: { label: 'Inactive', dot: 'sp-dot-offline', pill: 'sp-pill-inactive' },
  REJECTED: { label: 'Rejected', dot: 'sp-dot-offline', pill: 'sp-pill-inactive' },
  CANCELLED: { label: 'Cancelled', dot: 'sp-dot-offline', pill: 'sp-pill-inactive' }
};

const PERM_CHIPS = {
  SUPER_ADMIN: ['Projects', 'Tasks', 'Calendar', 'Payments', 'Reports', 'Employees', 'CRM', 'Settings'],
  MANAGER: ['Projects', 'Tasks', 'Calendar', 'Reports', 'Employees'],
  EMPLOYEE: ['Projects', 'Tasks', 'Calendar']
};

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function StaffPage({
  user, staff,
  roleUpdateUser, setRoleUpdateUser,
  roleUpdateVal, setRoleUpdateVal,
  showInviteModal, setShowInviteModal,
  inviteName, setInviteName,
  inviteEmail, setInviteEmail,
  invitePhone, setInvitePhone,
  inviteRole, setInviteRole,
  inviteDept, setInviteDept,
  inviteSkills, setInviteSkills,
  handleRoleUpdate,
  handleInviteUserSubmit,
  handleResendInvite,
  handleCancelInvite,
  handleApproveUser,
  handleRejectUser,
  handleToggleStatus,
  handleResetPassword,
  handleDeleteUser,
  addToast,
  formatTimeAgo
}) {
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [activeMenu, setActiveMenu] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const activeFiltersCount = useMemo(() => {
    return (roleFilter !== 'ALL' ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0) + (deptFilter !== 'ALL' ? 1 : 0);
  }, [roleFilter, statusFilter, deptFilter]);

  const departments = useMemo(() => {
    if (!staff) return [];
    const depts = [...new Set(staff.map(s => s.department).filter(Boolean))];
    return depts.sort();
  }, [staff]);

  const stats = useMemo(() => {
    if (!staff) return { total: 0, online: 0, managers: 0, employees: 0, pending: 0, admins: 0, departments: 0 };
    return {
      total: staff.length,
      online: staff.filter(s => (s.status || '').toUpperCase() === 'ACTIVE').length,
      admins: staff.filter(s => s.role === 'SUPER_ADMIN').length,
      managers: staff.filter(s => s.role === 'MANAGER').length,
      employees: staff.filter(s => s.role === 'EMPLOYEE').length,
      pending: staff.filter(s => {
        const st = (s.status || '').toUpperCase();
        return st === 'PENDING_APPROVAL' || st === 'INVITED';
      }).length,
      departments: new Set(staff.map(s => s.department).filter(Boolean)).size
    };
  }, [staff]);

  const filteredStaff = useMemo(() => {
    if (!staff) return [];
    return staff.filter(s => {
      const matchesSearch = !search ||
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.department?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || (s.status || '').toUpperCase() === statusFilter;
      const matchesDept = deptFilter === 'ALL' || s.department === deptFilter;
      return matchesSearch && matchesRole && matchesStatus && matchesDept;
    });
  }, [staff, search, roleFilter, statusFilter, deptFilter]);

  const getStatus = (status) => STATUS_META[(status || '').toUpperCase()] || { label: status || 'Unknown', dot: 'sp-dot-offline', pill: 'sp-pill-inactive' };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return null; }
  };

  return (
    <div className="animate-fade-in sp-root">
      <style>{`
        .sp-root { padding: 1.25rem 1.5rem; }

        /* ── STAT CARDS ── */
        .sp-stats {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }
        .sp-stat-card {
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: var(--r-lg);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s ease;
        }
        .sp-stat-card:hover { border-color: var(--gray-300); box-shadow: var(--shadow-sm); }
        .sp-stat-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--r-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sp-stat-val { font-size: 1.15rem; font-weight: 800; line-height: 1; letter-spacing: -0.03em; }
        .sp-stat-lbl { font-size: 0.68rem; font-weight: 600; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 1px; }

        /* ── TOOLBAR ── */
        .sp-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .sp-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: var(--r-md);
          padding: 7px 12px;
          flex: 0 0 260px;
          transition: all 0.15s;
        }
        .sp-search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(249,115,22,0.08); }
        .sp-search input {
          border: none; outline: none; font-size: 0.8rem; font-family: var(--font);
          color: var(--gray-800); background: transparent; width: 100%;
        }
        .sp-search input::placeholder { color: var(--gray-400); }
        .sp-search-x {
          background: none; border: none; cursor: pointer; padding: 0; display: flex;
          color: var(--gray-400); transition: color 0.15s;
        }
        .sp-search-x:hover { color: var(--gray-600); }

        .sp-filter-group {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }
        .sp-sep { width: 1px; height: 20px; background: var(--gray-200); flex-shrink: 0; }
        .sp-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          font-size: 0.7rem;
          font-weight: 600;
          border-radius: var(--r-sm);
          border: 1px solid var(--gray-200);
          background: var(--white);
          color: var(--gray-600);
          cursor: pointer;
          font-family: var(--font);
          transition: all 0.15s;
          white-space: nowrap;
          line-height: 1;
        }
        .sp-chip:hover { border-color: var(--gray-300); background: var(--gray-50); }
        .sp-chip.active { border-color: var(--accent); color: var(--accent); background: var(--accent-50); }
        .sp-chip select {
          border: none; background: transparent; font-size: 0.7rem; font-weight: 600;
          font-family: var(--font); color: inherit; cursor: pointer; outline: none;
          padding-right: 2px; -webkit-appearance: none; appearance: none;
        }
        .sp-chip select option { font-weight: 500; }

        /* ── MEMBER GRID ── */
        .sp-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .sp-card {
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: var(--r-lg);
          overflow: hidden;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .sp-card:hover {
          border-color: var(--gray-300);
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          transform: translateY(-2px);
        }
        .sp-card-accent {
          position: absolute; top: 0; left: 0; width: 3px; height: 100%;
          border-radius: 3px 0 0 3px;
        }
        .sp-card-top {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 14px 10px 16px;
        }
        .sp-card-avatar {
          position: relative;
          flex-shrink: 0;
        }
        .sp-card-avatar-img {
          width: 40px; height: 40px; border-radius: var(--r-md);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8rem; font-weight: 700; color: var(--white);
        }
        .sp-dot {
          width: 10px; height: 10px; border-radius: 50%;
          position: absolute; bottom: -2px; right: -2px;
          border: 2px solid var(--white);
        }
        .sp-dot-online { background: #10B981; animation: sp-dot-pulse 2.5s ease-in-out infinite; }
        .sp-dot-invited { background: #F59E0B; }
        .sp-dot-pending { background: #F97316; animation: sp-dot-pulse 2s ease-in-out infinite; }
        .sp-dot-offline { background: #D1D5DB; }
        @keyframes sp-dot-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.3); }
          50% { box-shadow: 0 0 0 4px rgba(16,185,129,0); }
        }
        .sp-card-identity { flex: 1; min-width: 0; }
        .sp-card-name {
          font-size: 0.875rem; font-weight: 700; color: var(--gray-900);
          letter-spacing: -0.01em; line-height: 1.3;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sp-card-email {
          font-size: 0.72rem; color: var(--gray-500); margin-top: 1px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sp-card-role {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.625rem; font-weight: 700; padding: 2px 7px;
          border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;
          margin-top: 5px; line-height: 1.3;
        }
        .sp-role-admin { background: #FFF7ED; color: #C2410C; }
        .sp-role-manager { background: #EFF6FF; color: #1D4ED8; }
        .sp-role-employee { background: #ECFDF5; color: #047857; }

        .sp-card-details-toggle {
          display: none;
        }
        .sp-card-pill-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 16px 10px 68px;
          flex-wrap: wrap;
        }
        .sp-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.625rem;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: var(--r-full);
          line-height: 1.3;
        }
        .sp-pill-online { background: #ECFDF5; color: #047857; }
        .sp-pill-invited { background: #FFFBEB; color: #B45309; }
        .sp-pill-pending { background: #FFF7ED; color: #C2410C; }
        .sp-pill-suspended { background: #FEF2F2; color: #B91C1C; }
        .sp-pill-inactive { background: var(--gray-100); color: var(--gray-500); }
        .sp-pill-dot {
          width: 5px; height: 5px; border-radius: 50%;
        }

        .sp-card-details {
          padding: 0 16px 10px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px 12px;
        }
        .sp-detail {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.7rem;
          color: var(--gray-500);
          line-height: 1.3;
        }
        .sp-detail svg { flex-shrink: 0; color: var(--gray-400); }
        .sp-detail-val {
          color: var(--gray-700);
          font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .sp-card-perms {
          padding: 0 16px 10px;
          display: flex;
          gap: 3px;
          flex-wrap: wrap;
        }
        .sp-perm {
          display: inline-flex;
          align-items: center;
          font-size: 0.6rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 3px;
          background: var(--gray-50);
          color: var(--gray-600);
          border: 1px solid var(--gray-100);
          letter-spacing: 0.01em;
        }

        .sp-card-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 14px;
          border-top: 1px solid var(--gray-100);
          background: var(--gray-50);
          flex-wrap: wrap;
        }
        .sp-abtn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.68rem;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: var(--r-sm);
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: var(--font);
          white-space: nowrap;
          line-height: 1;
        }
        .sp-abtn-p { background: var(--accent); color: var(--white); }
        .sp-abtn-p:hover { background: var(--accent-600); }
        .sp-abtn-s { background: var(--white); color: var(--gray-600); border: 1px solid var(--gray-200); }
        .sp-abtn-s:hover { background: var(--gray-50); border-color: var(--gray-300); }
        .sp-abtn-d { background: #FEF2F2; color: #B91C1C; }
        .sp-abtn-d:hover { background: #FEE2E2; }
        .sp-abtn-g { background: transparent; color: var(--gray-500); padding: 4px; }
        .sp-abtn-g:hover { background: var(--gray-200); color: var(--gray-700); }
        .sp-actions-spacer { flex: 1; }

        .sp-overflow-wrap { position: relative; }
        .sp-dropdown {
          position: absolute; right: 0; bottom: calc(100% + 4px);
          background: var(--white); border: 1px solid var(--gray-200);
          border-radius: var(--r-md); box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          min-width: 170px; z-index: 60; overflow: hidden;
        }
        .sp-dd-item {
          display: flex; align-items: center; gap: 8px; width: 100%;
          padding: 8px 12px; font-size: 0.75rem; font-weight: 500;
          color: var(--gray-700); border: none; background: none;
          cursor: pointer; font-family: var(--font); text-align: left;
          transition: background 0.1s;
        }
        .sp-dd-item:hover { background: var(--gray-50); }
        .sp-dd-item.danger { color: #B91C1C; }
        .sp-dd-item.danger:hover { background: #FEF2F2; }
        .sp-dd-div { height: 1px; background: var(--gray-100); margin: 2px 0; }
        .sp-dd-overlay { position: fixed; inset: 0; z-index: 50; }

        .sp-owner-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.68rem; font-weight: 700; color: var(--accent);
          padding: 4px 10px; background: var(--accent-50);
          border-radius: var(--r-sm); letter-spacing: 0.01em;
        }

        /* ── RESPONSIVE ── */
        .sp-lbl-mobile { display: none; }
        .sp-lbl-desktop { display: inline; }
        .sp-mobile-filter-btn { display: none; }
        .sp-mobile-only { display: none; }

        @media (max-width: 1200px) {
          .sp-grid { grid-template-columns: repeat(2, 1fr); }
          .sp-stats { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 768px) {
          .sp-root { padding: 1rem; }
          .sp-grid { grid-template-columns: 1fr; gap: 8px; }
          .sp-stats { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .sp-stat-card { padding: 10px 12px; gap: 8px; }
          .sp-stat-icon { width: 30px; height: 30px; }
          .sp-lbl-mobile { display: inline; }
          .sp-lbl-desktop { display: none; }
          
          .sp-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; }
          .sp-search { flex: 1; min-width: 0; }
          .sp-sep { display: none !important; }
          .sp-desktop-only { display: none !important; }
          
          .sp-mobile-filter-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 14px;
            font-size: 0.8rem;
            font-weight: 600;
            border-radius: var(--r-md);
            border: 1px solid var(--gray-200);
            background: var(--white);
            color: var(--gray-700);
            cursor: pointer;
            font-family: var(--font);
            transition: all 0.15s;
            min-height: 38px;
            white-space: nowrap;
          }
          .sp-mobile-filter-btn:hover {
            border-color: var(--gray-300);
            background: var(--gray-50);
          }
          .sp-filter-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: var(--accent);
            color: var(--white);
            font-size: 9px;
            font-weight: 800;
            border-radius: 50%;
            width: 15px;
            height: 15px;
            margin-left: 2px;
          }

          .sp-mobile-only { display: inline-flex; }

          .sp-card-pill-row { padding-left: 16px; }
          .sp-card-details { grid-template-columns: 1fr; max-height: 0; overflow: hidden; padding-top: 0; padding-bottom: 0; opacity: 0; transition: max-height 0.3s ease, opacity 0.2s ease, padding 0.3s ease; }
          .sp-card-details.sp-expanded { max-height: 250px; opacity: 1; padding-bottom: 10px; }
          .sp-card-perms { max-height: 0; overflow: hidden; padding-top: 0; padding-bottom: 0; opacity: 0; transition: max-height 0.3s ease, opacity 0.2s ease, padding 0.3s ease; }
          .sp-card-perms.sp-expanded { max-height: 150px; opacity: 1; padding-bottom: 10px; }
          .sp-card-details-toggle { display: inline-flex; align-items: center; gap: 3px; margin-left: auto; font-size: 0.65rem; font-weight: 600; color: var(--accent); background: var(--accent-50); border: 1px solid var(--accent-200, rgba(249,115,22,0.2)); border-radius: 4px; padding: 3px 8px; cursor: pointer; font-family: var(--font); transition: all 0.15s; min-height: 28px; }
          .sp-card-details-toggle:hover { background: var(--accent-100, rgba(249,115,22,0.1)); }
          
          .sp-card-email { display: none; }
          .sp-card-actions { justify-content: flex-start; gap: 8px; }
          .sp-card:hover { transform: none; }
          .sp-card-top { padding: 12px 12px 8px; gap: 10px; }
          .sp-card-pill-row { padding: 0 12px 8px 58px; }
          .sp-abtn { min-height: 36px; padding: 6px 12px; font-size: 0.75rem; }

          /* Collapsible actions details */
          .sp-abtn-secondary { display: none !important; }
          .sp-card-expanded .sp-abtn-secondary { display: inline-flex !important; }

          /* Mobile filter drawer styles */
          .sp-drawer-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            z-index: 200;
            display: flex;
            align-items: flex-end;
            justify-content: center;
          }
          .sp-drawer {
            width: 100%;
            max-width: 500px;
            background: var(--white);
            border-radius: 20px 20px 0 0;
            box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
            display: flex;
            flex-direction: column;
            padding-bottom: env(safe-area-inset-bottom, 20px);
            max-height: 85vh;
            animation: spSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .sp-drawer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid var(--gray-100);
          }
          .sp-drawer-header h3 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 800;
            color: var(--gray-900);
          }
          .sp-drawer-header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .sp-drawer-clear-btn {
            background: none;
            border: none;
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--accent);
            cursor: pointer;
          }
          .sp-drawer-close {
            background: none;
            border: none;
            color: var(--gray-400);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
            border-radius: 50%;
          }
          .sp-drawer-close:hover {
            background: var(--gray-100);
          }
          .sp-drawer-body {
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .sp-drawer-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .sp-drawer-label {
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--gray-500);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .sp-drawer-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .sp-drawer-chips .sp-chip {
            min-height: 38px;
            font-size: 0.8rem;
            padding: 8px 14px;
          }
          .sp-drawer-select-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            background: var(--gray-50);
            border: 1px solid var(--gray-200);
            border-radius: var(--r-md);
            padding: 10px 14px;
            min-height: 44px;
          }
          .sp-select-icon {
            color: var(--gray-400);
            margin-right: 8px;
            flex-shrink: 0;
          }
          .sp-drawer-select {
            border: none;
            background: transparent;
            width: 100%;
            outline: none;
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--gray-800);
            font-family: var(--font);
            cursor: pointer;
          }
          .sp-drawer-footer {
            padding: 16px 20px;
            border-top: 1px solid var(--gray-100);
          }
        }
        @media (max-width: 480px) {
          .sp-root { padding: 0.75rem; }
          .sp-stats { grid-template-columns: repeat(2, 1fr) !important; gap: 6px !important; }
          .sp-stat-card { padding: 8px 10px; gap: 6px; }
          .sp-stat-icon { width: 26px; height: 26px; }
          .sp-stat-val { font-size: 0.95rem; }
          .sp-stat-lbl { font-size: 0.6rem; }
          .sp-card-avatar-img { width: 34px; height: 34px; font-size: 0.7rem; }
          .sp-card-name { font-size: 0.82rem; }
          .sp-card-role { font-size: 0.58rem; padding: 2px 5px; }
          .sp-pill { font-size: 0.58rem; padding: 2px 6px; }
          .sp-card-actions { padding: 6px 8px; gap: 3px; }
          .sp-abtn { font-size: 0.68rem; padding: 4px 8px; min-height: 36px; }
          .sp-dd-item { padding: 10px 12px; min-height: 44px; }
        }
        
        @keyframes spSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {/* ═══════ HEADER ═══════ */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '-0.03em', marginBottom: '2px' }}>
              Staff Management
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', margin: 0 }}>
              Manage internal team members, roles, and permissions
            </p>
          </div>
          {isSuperAdmin && (
            <button onClick={() => setShowInviteModal(true)} className="btn btn-primary" style={{ gap: '6px', fontSize: '0.78rem', padding: '7px 14px', borderRadius: 'var(--r-md)', fontWeight: 600, boxShadow: '0 2px 8px rgba(249,115,22,0.2)' }}>
              <Plus size={14} />
              Invite Employee
            </button>
          )}
        </div>

        {/* ═══════ STAT CARDS ═══════ */}
        <div className="sp-stats">
          {[
            { label: 'Total Staff', mobileLabel: 'Total', value: stats.total, bg: 'var(--gray-50)', icon: <Users size={16} style={{ color: 'var(--gray-600)' }} /> },
            { label: 'Online', mobileLabel: 'Online', value: stats.online, bg: '#ECFDF5', icon: <Activity size={16} style={{ color: '#10B981' }} /> },
            { label: 'Admins', mobileLabel: 'Admins', value: stats.admins, bg: '#FFF7ED', icon: <Shield size={16} style={{ color: '#F97316' }} /> },
            { label: 'Managers', mobileLabel: 'Managers', value: stats.managers, bg: '#EFF6FF', icon: <Briefcase size={16} style={{ color: '#3B82F6' }} /> },
            { label: 'Departments', mobileLabel: 'Depts', value: stats.departments, bg: '#F5F3FF', icon: <Building size={16} style={{ color: '#8B5CF6' }} /> },
            { label: 'Pending', mobileLabel: 'Pending', value: stats.pending, bg: '#FFFBEB', icon: <Clock size={16} style={{ color: '#F59E0B' }} /> }
          ].map(s => (
            <div key={s.label} className="sp-stat-card">
              <div className="sp-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
              <div>
                <div className="sp-stat-val">{s.value}</div>
                <div className="sp-stat-lbl">
                  <span className="sp-lbl-desktop">{s.label}</span>
                  <span className="sp-lbl-mobile">{s.mobileLabel}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ═══════ TOOLBAR ═══════ */}
        <div className="sp-toolbar">
          <div className="sp-search">
            <Search size={14} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
            <input placeholder="Search by name, email, or department..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button className="sp-search-x" onClick={() => setSearch('')}>
                <X size={13} />
              </button>
            )}
          </div>
          <button className="sp-mobile-filter-btn" onClick={() => setShowMobileFilters(true)}>
            <Search size={14} />
            Filters
            {activeFiltersCount > 0 && <span className="sp-filter-badge">{activeFiltersCount}</span>}
          </button>
          <div className="sp-sep sp-desktop-only" />
          <div className="sp-filter-group sp-desktop-only">
            <span className={`sp-chip${roleFilter === 'ALL' ? ' active' : ''}`} onClick={() => setRoleFilter('ALL')}>All Roles</span>
            <span className={`sp-chip${roleFilter === 'SUPER_ADMIN' ? ' active' : ''}`} onClick={() => setRoleFilter('SUPER_ADMIN')}>Admin</span>
            <span className={`sp-chip${roleFilter === 'MANAGER' ? ' active' : ''}`} onClick={() => setRoleFilter('MANAGER')}>Manager</span>
            <span className={`sp-chip${roleFilter === 'EMPLOYEE' ? ' active' : ''}`} onClick={() => setRoleFilter('EMPLOYEE')}>Employee</span>
          </div>
          <div className="sp-sep sp-desktop-only" />
          <div className="sp-filter-group sp-desktop-only">
            <span className={`sp-chip${statusFilter === 'ALL' ? ' active' : ''}`} onClick={() => setStatusFilter('ALL')}>All Status</span>
            <span className={`sp-chip${statusFilter === 'ACTIVE' ? ' active' : ''}`} onClick={() => setStatusFilter('ACTIVE')}>Online</span>
            <span className={`sp-chip${statusFilter === 'INVITED' ? ' active' : ''}`} onClick={() => setStatusFilter('INVITED')}>Invited</span>
            <span className={`sp-chip${statusFilter === 'PENDING_APPROVAL' ? ' active' : ''}`} onClick={() => setStatusFilter('PENDING_APPROVAL')}>Pending</span>
          </div>
          {departments.length > 0 && (
            <>
              <div className="sp-sep sp-desktop-only" />
              <div className="sp-filter-group sp-desktop-only">
                <div className={`sp-chip${deptFilter !== 'ALL' ? ' active' : ''}`} style={{ padding: '0' }}>
                  <Building size={11} style={{ marginLeft: '8px' }} />
                  <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                    <option value="ALL">All Depts</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══════ STAFF GRID ═══════ */}
      {(!staff || staff.length === 0) ? (
        <div style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: 'var(--r-lg)' }}>
          <div className="empty-state">
            <div className="empty-icon"><Users size={24} /></div>
            <p className="empty-title">No team members yet</p>
            <p className="empty-desc">Invite employees to get started with your internal team.</p>
          </div>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: 'var(--r-lg)' }}>
          <div className="empty-state">
            <div className="empty-icon"><Search size={24} /></div>
            <p className="empty-title">No matching members</p>
            <p className="empty-desc">Try adjusting your search or filter criteria.</p>
          </div>
        </div>
      ) : (
        <div className="sp-grid">
          {filteredStaff.map((member, idx) => {
            const st = getStatus(member.status);
            const roleMeta = ROLE_META[member.role] || ROLE_META.EMPLOYEE;
            const perms = PERM_CHIPS[member.role] || [];
            const statusUpper = (member.status || '').toUpperCase();
            const joined = formatDate(member.createdAt || member.joinedAt);
            const lastActive = member.lastActive ? (formatTimeAgo ? formatTimeAgo(member.lastActive) : null) : null;

            return (
              <div key={member._id} className={`sp-card animate-slide-up ${expandedCard === member._id ? 'sp-card-expanded' : ''}`} style={{ animationDelay: `${idx * 0.03}s` }}>
                <div className="sp-card-accent" style={{ background: roleMeta.color }} />

                {/* TOP: Avatar + Identity + Role */}
                <div className="sp-card-top">
                  <div className="sp-card-avatar">
                    <div className="sp-card-avatar-img" style={{ background: roleMeta.color }}>
                      {getInitials(member.name)}
                    </div>
                    <span className={`sp-dot ${st.dot}`} />
                  </div>
                  <div className="sp-card-identity">
                    <div className="sp-card-name" title={member.name}>{member.name}</div>
                    <div className="sp-card-email" title={member.email}>
                      <Mail size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3, marginTop: -1 }} />
                      {member.email}
                    </div>
                    <div className={`sp-card-role ${roleMeta.badge}`}>
                      {roleMeta.label}
                    </div>
                  </div>
                </div>

                {/* STATUS + DEPARTMENT PILLS */}
                <div className="sp-card-pill-row">
                  <span className={`sp-pill ${st.pill}`}>
                    <span className="sp-pill-dot" style={{ background: statusUpper === 'ACTIVE' ? '#10B981' : statusUpper === 'INVITED' || statusUpper === 'PENDING_APPROVAL' ? '#F59E0B' : '#D1D5DB' }} />
                    {st.label}
                  </span>
                  {member.department && (
                    <span className="sp-pill" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}>
                      {member.department}
                    </span>
                  )}
                  <button
                    className="sp-card-details-toggle"
                    onClick={(e) => { e.stopPropagation(); setExpandedCard(expandedCard === member._id ? null : member._id); }}
                  >
                    {expandedCard === member._id ? 'Less' : 'Details'}
                  </button>
                </div>

                {/* DETAILS GRID — collapsible on mobile */}
                <div className={`sp-card-details${expandedCard === member._id ? ' sp-expanded' : ''}`}>
                  <div className="sp-detail sp-mobile-only" title={member.email}>
                    <Mail size={10} />
                    <span className="sp-detail-val">{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="sp-detail" title={member.phone}>
                      <Phone size={10} />
                      <span className="sp-detail-val">{member.phone}</span>
                    </div>
                  )}
                  {joined && (
                    <div className="sp-detail" title={`Joined ${joined}`}>
                      <UserPlus size={10} />
                      <span className="sp-detail-val">{joined}</span>
                    </div>
                  )}
                  {lastActive && (
                    <div className="sp-detail">
                      <Activity size={10} />
                      <span className="sp-detail-val">{lastActive}</span>
                    </div>
                  )}
                  {member.skills && (Array.isArray(member.skills) ? member.skills.length > 0 : true) && (
                    <div className="sp-detail" title={Array.isArray(member.skills) ? member.skills.join(', ') : member.skills}>
                      <Briefcase size={10} />
                      <span className="sp-detail-val">
                        {(Array.isArray(member.skills) ? member.skills : member.skills.split(',').map(sk => sk.trim())).slice(0, 2).join(', ')}
                        {(Array.isArray(member.skills) ? member.skills : member.skills.split(',')).length > 2 && '...'}
                      </span>
                    </div>
                  )}
                </div>

                {/* PERMISSION CHIPS */}
                {isSuperAdmin && perms.length > 0 && (
                  <div className={`sp-card-perms${expandedCard === member._id ? ' sp-expanded' : ''}`}>
                    {perms.map(p => (
                      <span key={p} className="sp-perm">{p}</span>
                    ))}
                  </div>
                )}

                {/* ACTION BAR */}
                <div className="sp-card-actions">
                  {member.role === 'SUPER_ADMIN' ? (
                    <>
                      <span className="sp-owner-badge">
                        <Shield size={11} /> System Owner
                      </span>
                      <div className="sp-actions-spacer" />
                    </>
                  ) : isSuperAdmin ? (
                    <>
                      {/* PRIMARY ACTIONS */}
                      {statusUpper === 'PENDING_APPROVAL' && (
                        <>
                          <button onClick={() => handleApproveUser(member._id)} className="sp-abtn sp-abtn-p">
                            <CheckCircle size={10} /> Approve
                          </button>
                          <button onClick={() => handleRejectUser(member._id)} className="sp-abtn sp-abtn-d sp-abtn-secondary">
                            <X size={10} /> Reject
                          </button>
                        </>
                      )}
                      {statusUpper === 'INVITED' && (
                        <>
                          <button onClick={() => handleResendInvite(member)} className="sp-abtn sp-abtn-s">
                            <Send size={10} /> Resend
                          </button>
                          <button onClick={() => handleCancelInvite(member._id)} className="sp-abtn sp-abtn-d sp-abtn-secondary">
                            <X size={10} /> Cancel
                          </button>
                        </>
                      )}
                      {statusUpper === 'ACTIVE' && (
                        <>
                          <button onClick={() => { setRoleUpdateUser(member); setRoleUpdateVal(member.role); }} className="sp-abtn sp-abtn-s">
                            <Edit3 size={10} /> Role
                          </button>
                          <button onClick={() => handleResetPassword(member._id)} className="sp-abtn sp-abtn-s sp-abtn-secondary">
                            <Key size={10} /> Reset Pwd
                          </button>
                          <button onClick={() => handleToggleStatus(member._id)} className="sp-abtn sp-abtn-d sp-abtn-secondary">
                            <UserX size={10} /> Suspend
                          </button>
                          <div className="sp-actions-spacer" />
                          <div className="sp-overflow-wrap">
                            <button onClick={() => setActiveMenu(activeMenu === member._id ? null : member._id)} className="sp-abtn sp-abtn-g">
                              <MoreHorizontal size={14} />
                            </button>
                            {activeMenu === member._id && (
                              <>
                                <div className="sp-dd-overlay" onClick={() => setActiveMenu(null)} />
                                <div className="sp-dropdown">
                                  <button className="sp-dd-item" onClick={() => { setActiveMenu(null); setRoleUpdateUser(member); setRoleUpdateVal(member.role); }}>
                                    <Edit3 size={12} /> Edit Role
                                  </button>
                                  <button className="sp-dd-item" onClick={() => { setActiveMenu(null); handleResetPassword(member._id); }}>
                                    <RefreshCw size={12} /> Reset Password
                                  </button>
                                  <div className="sp-dd-div" />
                                  <button className="sp-dd-item danger" onClick={() => { setActiveMenu(null); handleToggleStatus(member._id); }}>
                                    <UserX size={12} /> Suspend
                                  </button>
                                  <button className="sp-dd-item danger" onClick={() => { setActiveMenu(null); handleDeleteUser(member._id); }}>
                                    <Trash2 size={12} /> Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      )}
                      {['DISABLED', 'INACTIVE', 'REJECTED', 'CANCELLED'].includes(statusUpper) && (
                        <>
                          <button onClick={() => handleToggleStatus(member._id)} className="sp-abtn sp-abtn-p">
                            <CheckCircle size={10} /> Activate
                          </button>
                          <button onClick={() => handleDeleteUser(member._id)} className="sp-abtn sp-abtn-d sp-abtn-secondary">
                            <Trash2 size={10} /> Delete
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>
                      Role: <strong>{member.role?.replace('_', ' ')}</strong>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════ ROLE UPDATE MODAL ═══════ */}
      {isSuperAdmin && roleUpdateUser && (
        <div className="dialog-overlay" onClick={() => setRoleUpdateUser(null)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>Update Role — {roleUpdateUser.name}</h2>
              <button onClick={() => setRoleUpdateUser(null)} className="btn btn-ghost btn-icon"><X size={16} /></button>
            </div>
            <form onSubmit={handleRoleUpdate}>
              <div className="dialog-body">
                <div className="form-group">
                  <label className="form-label">New System Role</label>
                  <select value={roleUpdateVal} onChange={e => setRoleUpdateVal(e.target.value)} className="select">
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
              </div>
              <div className="dialog-footer">
                <button type="button" onClick={() => setRoleUpdateUser(null)} className="btn btn-ghost" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 600 }}>
                  <Shield size={14} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ INVITE MODAL ═══════ */}
      {isSuperAdmin && showInviteModal && (
        <div className="dialog-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>Invite Employee</h2>
              <button onClick={() => setShowInviteModal(false)} className="btn btn-ghost btn-icon"><X size={16} /></button>
            </div>
            <form onSubmit={handleInviteUserSubmit}>
              <div className="dialog-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" required value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="e.g. John Doe" className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="john@company.com" className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="text" value={invitePhone} onChange={e => setInvitePhone(e.target.value)} placeholder="e.g. 919876543210" className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="select">
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input type="text" value={inviteDept} onChange={e => setInviteDept(e.target.value)} placeholder="e.g. Post-Production" className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Skills (comma separated)</label>
                  <textarea value={inviteSkills} onChange={e => setInviteSkills(e.target.value)} placeholder="e.g. Premiere Pro, After Effects, Color Grading" className="textarea" rows={3} />
                </div>
              </div>
              <div className="dialog-footer">
                <button type="button" onClick={() => setShowInviteModal(false)} className="btn btn-ghost" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 600 }}>
                  <UserPlus size={14} /> Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ MOBILE FILTER DRAWER ═══════ */}
      {showMobileFilters && (
        <div className="sp-drawer-overlay" onClick={() => setShowMobileFilters(false)}>
          <div className="sp-drawer" onClick={e => e.stopPropagation()}>
            <div className="sp-drawer-header">
              <h3>Filters</h3>
              <div className="sp-drawer-header-actions">
                {activeFiltersCount > 0 && (
                  <button className="sp-drawer-clear-btn" onClick={() => { setRoleFilter('ALL'); setStatusFilter('ALL'); setDeptFilter('ALL'); }}>
                    Clear All
                  </button>
                )}
                <button onClick={() => setShowMobileFilters(false)} className="sp-drawer-close"><X size={16} /></button>
              </div>
            </div>
            
            <div className="sp-drawer-body">
              <div className="sp-drawer-section">
                <label className="sp-drawer-label">Role</label>
                <div className="sp-drawer-chips">
                  <span className={`sp-chip${roleFilter === 'ALL' ? ' active' : ''}`} onClick={() => setRoleFilter('ALL')}>All Roles</span>
                  <span className={`sp-chip${roleFilter === 'SUPER_ADMIN' ? ' active' : ''}`} onClick={() => setRoleFilter('SUPER_ADMIN')}>Admin</span>
                  <span className={`sp-chip${roleFilter === 'MANAGER' ? ' active' : ''}`} onClick={() => setRoleFilter('MANAGER')}>Manager</span>
                  <span className={`sp-chip${roleFilter === 'EMPLOYEE' ? ' active' : ''}`} onClick={() => setRoleFilter('EMPLOYEE')}>Employee</span>
                </div>
              </div>
              
              <div className="sp-drawer-section">
                <label className="sp-drawer-label">Status</label>
                <div className="sp-drawer-chips">
                  <span className={`sp-chip${statusFilter === 'ALL' ? ' active' : ''}`} onClick={() => setStatusFilter('ALL')}>All Status</span>
                  <span className={`sp-chip${statusFilter === 'ACTIVE' ? ' active' : ''}`} onClick={() => setStatusFilter('ACTIVE')}>Online</span>
                  <span className={`sp-chip${statusFilter === 'INVITED' ? ' active' : ''}`} onClick={() => setStatusFilter('INVITED')}>Invited</span>
                  <span className={`sp-chip${statusFilter === 'PENDING_APPROVAL' ? ' active' : ''}`} onClick={() => setStatusFilter('PENDING_APPROVAL')}>Pending</span>
                </div>
              </div>

              {departments.length > 0 && (
                <div className="sp-drawer-section">
                  <label className="sp-drawer-label">Department</label>
                  <div className="sp-drawer-select-wrapper">
                    <Building size={14} className="sp-select-icon" />
                    <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="sp-drawer-select">
                      <option value="ALL">All Departments</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
            
            <div className="sp-drawer-footer">
              <button className="btn btn-primary w-full" onClick={() => setShowMobileFilters(false)} style={{ width: '100%', minHeight: '44px', fontWeight: 600 }}>
                Apply Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
