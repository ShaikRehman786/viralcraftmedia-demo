import React, { useState, useMemo } from 'react';
import {
  Search,
  ShieldAlert,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const parseUA = (ua) => {
  if (!ua) return { browser: 'Unknown', device: 'Unknown' };
  let browser = 'Other';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('MSIE') || ua.includes('Trident')) browser = 'IE';
  
  let device = 'Desktop';
  if (ua.includes('Mobi') || ua.includes('Android') || ua.includes('iPhone')) {
    device = 'Mobile';
  } else if (ua.includes('iPad') || ua.includes('Tablet')) {
    device = 'Tablet';
  }
  return { browser, device };
};

const formatDuration = (ms) => {
  if (!ms || ms < 0) return '-';
  const totalSecs = Math.floor(ms / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export default function LogsPage({ user, logs, staff }) {
  const [timeframe, setTimeframe] = useState('all'); // all, today, yesterday, 7days, 30days
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Gather unique departments from staff roster for select dropdown
  const departments = useMemo(() => {
    const depts = new Set();
    staff?.forEach(s => { if (s.department) depts.add(s.department); });
    return Array.from(depts);
  }, [staff]);

  // Compute matched login session pairs (Login -> matching Logout)
  const loginHistory = useMemo(() => {
    // Filter to actions related to logins/logouts only
    const allLoginLogoutLogs = (logs || []).filter(l => 
      l.action === 'LOGIN_SUCCESS' || l.action === 'LOGIN_FAILURE' || l.action === 'LOGOUT'
    );

    // Group logs by user to find pairs sequentially
    const userLogsMap = {};
    allLoginLogoutLogs.forEach(l => {
      const key = l.user?._id || l.user || l.userName;
      if (!userLogsMap[key]) userLogsMap[key] = [];
      userLogsMap[key].push(l);
    });

    const sessions = [];

    // For each user, trace login logs and match with corresponding logout logs
    Object.keys(userLogsMap).forEach(key => {
      const list = userLogsMap[key].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      for (let i = 0; i < list.length; i++) {
        const current = list[i];
        
        if (current.action === 'LOGIN_SUCCESS' || current.action === 'LOGIN_FAILURE') {
          // Look for next logout by this user before their next login
          let matchedLogout = null;
          for (let j = i + 1; j < list.length; j++) {
            const next = list[j];
            if (next.action === 'LOGOUT') {
              matchedLogout = next;
              break;
            }
            if (next.action === 'LOGIN_SUCCESS' || next.action === 'LOGIN_FAILURE') {
              break; // user logged in again without a logout trace
            }
          }

          const parsed = parseUA(current.userAgent);
          const matchedStaff = staff?.find(s => s._id === (current.user?._id || current.user) || s.email === current.user?.email);

          // Duration calculation
          let durationStr = '-';
          let logoutTime = null;
          let sessionStatus = 'Success';

          if (current.action === 'LOGIN_FAILURE') {
            sessionStatus = 'Failed';
            logoutTime = 'N/A';
          } else if (matchedLogout) {
            logoutTime = new Date(matchedLogout.createdAt);
            const diff = logoutTime - new Date(current.createdAt);
            durationStr = formatDuration(diff);
          } else {
            // No matching logout log. Check if it's the latest login log for this user
            const latestLogin = list.filter(l => l.action === 'LOGIN_SUCCESS').pop();
            if (latestLogin && latestLogin._id === current._id) {
              logoutTime = 'Active Session';
            } else {
              logoutTime = 'Session Expired';
            }
          }

          sessions.push({
            id: current._id,
            user: current.user,
            userName: current.userName,
            userEmail: current.user?.email || 'N/A',
            role: current.user?.role || 'EMPLOYEE',
            department: matchedStaff?.department || 'General',
            loginTime: new Date(current.createdAt),
            logoutTime: logoutTime,
            duration: durationStr,
            ipAddress: current.ipAddress || 'Unknown',
            browser: parsed.browser,
            device: parsed.device,
            location: current.details?.location || 'Localhost',
            status: sessionStatus,
            userAgent: current.userAgent
          });
        }
      }
    });

    // Sort login sessions with most recent logins first
    return sessions.sort((a, b) => b.loginTime - a.loginTime);
  }, [logs, staff]);

  // Client-side filtering logic
  const filteredSessions = useMemo(() => {
    const now = new Date();
    
    return loginHistory.filter(s => {
      // 1. Timeframe Filter
      if (timeframe !== 'all') {
        const diffMs = now - s.loginTime;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        if (timeframe === 'today') {
          const today = new Date();
          if (s.loginTime.getDate() !== today.getDate() ||
              s.loginTime.getMonth() !== today.getMonth() ||
              s.loginTime.getFullYear() !== today.getFullYear()) {
            return false;
          }
        } else if (timeframe === 'yesterday') {
          const yesterday = new Date();
          yesterday.setDate(now.getDate() - 1);
          if (s.loginTime.getDate() !== yesterday.getDate() ||
              s.loginTime.getMonth() !== yesterday.getMonth() ||
              s.loginTime.getFullYear() !== yesterday.getFullYear()) {
            return false;
          }
        } else if (timeframe === '7days' && diffDays > 7) {
          return false;
        } else if (timeframe === '30days' && diffDays > 30) {
          return false;
        }
      }

      // 2. Role Filter
      if (selectedRole && s.role !== selectedRole) return false;

      // 3. Department Filter
      if (selectedDept && s.department !== selectedDept) return false;

      // 4. Employee Filter
      if (selectedEmployee && (s.user?._id !== selectedEmployee && s.user !== selectedEmployee)) return false;

      // 5. Search query (matching Name, Email, IP address)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = (s.userName || '').toLowerCase().includes(q);
        const matchesEmail = (s.userEmail || '').toLowerCase().includes(q);
        const matchesIP = (s.ipAddress || '').toLowerCase().includes(q);
        const matchesBrowser = (s.browser || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesIP && !matchesBrowser) return false;
      }

      return true;
    });
  }, [loginHistory, timeframe, selectedRole, selectedDept, selectedEmployee, searchQuery]);

  // Paginated sessions
  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredSessions.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredSessions, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredSessions.length / rowsPerPage);

  const getInitials = (name) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ['Employee', 'Email', 'Role', 'Department', 'Login Time', 'Logout Time', 'Duration', 'Status'];
    const rows = filteredSessions.map(s => [
      s.userName,
      s.userEmail,
      s.role,
      s.department,
      s.loginTime.toISOString(),
      typeof s.logoutTime === 'string' ? s.logoutTime : s.logoutTime?.toISOString() || '-',
      s.duration,
      s.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `employee_login_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h2 className="section-title">Security & Audit Logs</h2>
          <p className="section-subtitle">Track and filter active sessions, device configurations, and login details</p>
        </div>
        <button className="btn btn-outline flex-row gap-2" onClick={handleExportCSV}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Advanced Filters Block */}
      <div className="logs-filters-panel card p-4 mb-4">
        <div className="logs-filters-grid">
          {/* Search Query */}
          <div className="form-group">
            <label className="form-label">Search Details</label>
            <div className="header-search w-full">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search name, email, IP..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="input"
              />
            </div>
          </div>

          {/* Timeframe selector */}
          <div className="form-group">
            <label className="form-label">Timeframe</label>
            <select value={timeframe} onChange={e => { setTimeframe(e.target.value); setCurrentPage(1); }} className="select">
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          {/* Roster list filter */}
          <div className="form-group">
            <label className="form-label">Employee</label>
            <select value={selectedEmployee} onChange={e => { setSelectedEmployee(e.target.value); setCurrentPage(1); }} className="select">
              <option value="">All Employees</option>
              {staff?.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="form-group">
            <label className="form-label">Role</label>
            <select value={selectedRole} onChange={e => { setSelectedRole(e.target.value); setCurrentPage(1); }} className="select">
              <option value="">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="CLIENT">Client</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="form-group">
            <label className="form-label">Department</label>
            <select value={selectedDept} onChange={e => { setSelectedDept(e.target.value); setCurrentPage(1); }} className="select">
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="card">
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            border: '1px solid var(--border)'
          }}>
            <ShieldAlert size={48} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
              No login history recorded
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto' }}>
              Adjust your search parameters or filter configurations to locate specific audits.
            </p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Login Time</th>
                  <th>Logout Time</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSessions.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="avatar avatar-sm bg-accent font-bold" style={{ width: 28, height: 28, minWidth: 28 }}>
                          {getInitials(s.userName)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs text-gray-900 truncate max-w-120">{s.userName}</span>
                          <span className="text-muted text-xxs truncate max-w-120">{s.userEmail}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-gray text-xxs">
                        {s.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-gray-700">{s.department}</span>
                    </td>
                    <td>
                      <span className="text-xs text-gray-800">
                        {s.loginTime.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </td>
                    <td>
                      <span className={`text-xs font-medium ${
                        s.logoutTime === 'Active Session' 
                          ? 'text-success font-semibold' 
                          : s.logoutTime === 'Session Expired' 
                          ? 'text-warning'
                          : 'text-gray-800'
                      }`}>
                        {s.logoutTime instanceof Date 
                          ? s.logoutTime.toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })
                          : s.logoutTime}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-gray-600 font-semibold">{s.duration}</span>
                    </td>
                    <td>
                      <span className={`badge ${
                        s.status === 'Success' 
                          ? 'badge-success' 
                          : 'badge-error'
                      } text-xxs`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="card-footer flex items-center justify-between border-top px-4 py-3">
              <div className="text-xs text-muted">
                Showing <span className="font-semibold">{(currentPage - 1) * rowsPerPage + 1}</span> to{' '}
                <span className="font-semibold">
                  {Math.min(currentPage * rowsPerPage, filteredSessions.length)}
                </span>{' '}
                of <span className="font-semibold">{filteredSessions.length}</span> logins
              </div>
              <div className="flex gap-2 items-center">
                <button
                  className="btn btn-outline btn-sm p-1 btn-icon"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-semibold px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn btn-outline btn-sm p-1 btn-icon"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
