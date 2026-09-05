import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Users,
  ShieldCheck,
  UserPlus,
  MessageCircle,
  IndianRupee,
  Bell
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen, user }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen, setSidebarOpen]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);
  const getInitials = (name) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  const handleNav = (tab) => {
    // Authoritative navigation first, then close menu — same mechanism as desktop
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`app-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        <nav className="sidebar-nav">
          <div className="sidebar-group">
            <div className="sidebar-group-title">Main</div>

            {(user.role === 'SUPER_ADMIN' || user.role === 'MANAGER' || user.role === 'EMPLOYEE') && (
              <button type="button"
                className={`sidebar-link${activeTab === 'overview' ? ' active' : ''}`}
                onClick={() => handleNav('overview')}
              >
                <LayoutDashboard />
                {user.role === 'EMPLOYEE' ? 'My Dashboard' : user.role === 'MANAGER' ? 'Dashboard' : 'Overview'}
              </button>
            )}

            {(user.role === 'SUPER_ADMIN' || user.role === 'MANAGER' || user.role === 'EMPLOYEE' || user.role === 'CLIENT') && (
              <button type="button"
                className={`sidebar-link${activeTab === 'projects' ? ' active' : ''}`}
                onClick={() => handleNav('projects')}
              >
                <ClipboardList />
                {user.role === 'EMPLOYEE' ? 'My Projects' : 'Projects & Tasks'}
              </button>
            )}

            {user.role === 'SUPER_ADMIN' && (
              <button type="button"
                className={`sidebar-link${activeTab === 'calendar' ? ' active' : ''}`}
                onClick={() => handleNav('calendar')}
              >
                <CalendarDays /> Production Calendar
              </button>
            )}
          </div>

          {(user.role === 'SUPER_ADMIN' || user.role === 'MANAGER') && (
            <div className="sidebar-group">
              <div className="sidebar-group-title">Admin</div>

              <button type="button"
                className={`sidebar-link${activeTab === 'staff' ? ' active' : ''}`}
                onClick={() => handleNav('staff')}
              >
                <Users /> {user.role === 'MANAGER' ? 'Employees' : 'Role Management'}
              </button>

              {user.role === 'SUPER_ADMIN' && (
                <button type="button"
                  className={`sidebar-link${activeTab === 'logs' ? ' active' : ''}`}
                  onClick={() => handleNav('logs')}
                >
                  <ShieldCheck /> Security Logs
                </button>
              )}
            </div>
          )}

          {user.role === 'SUPER_ADMIN' && (
            <div className="sidebar-group">
              <div className="sidebar-group-title">CRM</div>

              <button type="button"
                className={`sidebar-link${activeTab === 'enquiries' ? ' active' : ''}`}
                onClick={() => handleNav('enquiries')}
              >
                <UserPlus /> Inbound Leads
              </button>

              <button type="button"
                className={`sidebar-link${activeTab === 'referrals' ? ' active' : ''}`}
                onClick={() => handleNav('referrals')}
              >
                <Users /> Referral Management
              </button>

              <button type="button"
                className={`sidebar-link${activeTab === 'whatsapp' ? ' active' : ''}`}
                onClick={() => handleNav('whatsapp')}
              >
                <MessageCircle /> WhatsApp
              </button>

              <button type="button"
                className={`sidebar-link${activeTab === 'notification-center' ? ' active' : ''}`}
                onClick={() => handleNav('notification-center')}
              >
                <Bell /> Notifications
              </button>
            </div>
          )}

          {(user.role === 'CLIENT' || user.role === 'SUPER_ADMIN') && (
            <div className="sidebar-group">
              <div className="sidebar-group-title">Finance</div>

              <button type="button"
                className={`sidebar-link${activeTab === 'payments' ? ' active' : ''}`}
                onClick={() => handleNav('payments')}
              >
                <IndianRupee /> Payments & Invoices
              </button>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {getInitials(user.name)}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.role.replace(/_/g, ' ')}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

