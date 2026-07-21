import React from 'react';
import {
  Plus,
  Users,
  Edit3,
  RefreshCw,
  Trash2,
  ToggleLeft,
  X,
  Send,
  UserPlus,
  Shield,
  Phone,
  CheckCircle
} from 'lucide-react';

const ROLE_BADGES = {
  SUPER_ADMIN: 'badge-accent',
  MANAGER: 'badge-info',
  EMPLOYEE: 'badge-gray',
  CLIENT: 'badge-purple'
};

const ROLE_COLORS = {
  SUPER_ADMIN: '#F97316',
  MANAGER: '#3B82F6',
  EMPLOYEE: '#10B981',
  CLIENT: '#8B5CF6'
};

function getStatusDot(status) {
  const s = (status || '').toUpperCase();
  if (s === 'ACTIVE') return 'online';
  if (s === 'INVITED' || s === 'PENDING_APPROVAL') return 'busy';
  return 'offline';
}

function getStatusText(status) {
  return (status || 'unknown').replace(/_/g, ' ');
}

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

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <style>{`
        .staff-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .staff-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .staff-btn:hover {
          opacity: 0.85;
        }
        .status-dot-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }
        .status-dot-indicator.online { background: #10B981; }
        .status-dot-indicator.busy { background: #F59E0B; }
        .status-dot-indicator.offline { background: #9CA3AF; }
      `}</style>
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>System Staff & Clients</h2>
          <p className="section-subtitle">Manage team members, roles, and account status</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setShowInviteModal(true)} className="btn btn-primary staff-btn" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>
            <Plus size={16} />
            Invite Member
          </button>
        )}
      </div>

      {(!staff || staff.length === 0) ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">
              <Users size={24} />
            </div>
            <p className="empty-title">No team members yet</p>
            <p className="empty-desc">Staff members and clients will appear here once they are invited or registered.</p>
          </div>
        </div>
      ) : (
        <div className="data-grid-3" style={{ gap: '1rem' }}>
          {staff.map(s => {
            const statusUpper = (s.status || '').toUpperCase();
            const roleBadge = ROLE_BADGES[s.role] || 'badge-gray';
            const avatarColor = ROLE_COLORS[s.role] || '#6B7280';

            return (
              <div key={s._id} className="data-card animate-slide-up staff-card" style={{
                padding: '1.25rem',
                borderLeft: `3px solid ${ROLE_COLORS[s.role] || '#6B7280'}`
              }}>
                <div className="flex-row gap-3 items-center">
                  <div className="avatar avatar-lg" style={{ background: avatarColor, width: 44, height: 44, minWidth: 44, fontSize: '0.85rem' }}>
                    {getInitials(s.name)}
                  </div>
                  <div className="flex-1">
                    <div className="data-card-title" style={{ fontSize: '0.95rem', fontWeight: 600, letterSpacing: '-0.01em' }}>{s.name}</div>
                    <div className="data-card-desc" style={{ fontSize: '0.8rem' }}>{s.email}</div>
                  </div>
                </div>

                <div className="flex-row gap-2 flex-wrap">
                  <span className={`badge ${roleBadge}`} style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '3px 10px', borderRadius: '6px' }}>{s.role?.replace('_', ' ')}</span>
                  {s.department && (
                    <span className="badge badge-accent" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '3px 10px', borderRadius: '6px' }}>{s.department}</span>
                  )}
                </div>

                <div className="flex-row gap-2 items-center">
                  <span className={`status-dot-indicator ${getStatusDot(s.status)}`} />
                  <span className={`text-xs font-semibold ${getStatusDot(s.status) === 'online' ? 'text-success' : getStatusDot(s.status) === 'busy' ? 'text-warning' : 'text-gray-400'}`} style={{ fontSize: '0.8rem' }}>
                    {getStatusText(s.status)}
                  </span>
                </div>

                {s.phone && (
                  <div className="flex-row gap-1 items-center text-xs text-muted" style={{ fontSize: '0.8rem' }}>
                    <Phone size={12} />
                    <span>{s.phone}</span>
                  </div>
                )}

                {s.skills && s.skills.length > 0 && (
                  <div className="flex-row gap-1 flex-wrap">
                    {(Array.isArray(s.skills) ? s.skills : s.skills.split(',').map(sk => sk.trim())).map((skill, i) => (
                      <span key={i} className="badge badge-gray text-xs" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px' }}>{skill}</span>
                    ))}
                  </div>
                )}

                <div className="border-top pt-2 mt-1">
                  {s.role === 'SUPER_ADMIN' ? (
                    <div className="flex-row gap-2 items-center text-xs text-muted" style={{ fontSize: '0.8rem' }}>
                      <Shield size={12} />
                      <span>System Owner</span>
                    </div>
                  ) : isSuperAdmin ? (
                    <div className="flex-row gap-2 flex-wrap">
                      {statusUpper === 'PENDING_APPROVAL' && (
                        <>
                          <button onClick={() => handleApproveUser(s._id)} className="btn btn-primary btn-sm staff-btn" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>
                            <CheckCircle size={12} /> Approve
                          </button>
                          <button onClick={() => handleRejectUser(s._id)} className="btn btn-danger btn-sm staff-btn" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>
                            <X size={12} /> Reject
                          </button>
                        </>
                      )}
                      {statusUpper === 'INVITED' && (
                        <>
                          <button onClick={() => handleResendInvite(s)} className="btn btn-secondary btn-sm staff-btn" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>
                            <Send size={12} /> Resend
                          </button>
                          <button onClick={() => handleCancelInvite(s._id)} className="btn btn-danger btn-sm staff-btn" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>
                            <X size={12} /> Cancel
                          </button>
                        </>
                      )}
                      {(statusUpper === 'ACTIVE') && (
                        <>
                          <button onClick={() => { setRoleUpdateUser(s); setRoleUpdateVal(s.role); }} className="btn btn-ghost btn-sm staff-btn" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>
                            <Edit3 size={12} /> Role
                          </button>
                          <button onClick={() => handleToggleStatus(s._id)} className="btn btn-danger btn-sm staff-btn" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>
                            <ToggleLeft size={12} /> Suspend
                          </button>
                          <button onClick={() => handleResetPassword(s._id)} className="btn btn-secondary btn-sm staff-btn" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>
                            <RefreshCw size={12} /> Reset
                          </button>
                        </>
                      )}
                      {(statusUpper === 'DISABLED' || statusUpper === 'INACTIVE' || statusUpper === 'REJECTED' || statusUpper === 'CANCELLED') && (
                        <>
                          <button onClick={() => handleToggleStatus(s._id)} className="btn btn-primary btn-sm staff-btn" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>
                            <CheckCircle size={12} /> Activate
                          </button>
                          <button onClick={() => handleDeleteUser(s._id)} className="btn btn-danger btn-sm staff-btn" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>
                            <Trash2 size={12} /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex-row gap-2 items-center text-xs text-muted" style={{ fontSize: '0.8rem' }}>
                      <span>Role: <strong>{s.role}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isSuperAdmin && roleUpdateUser && (
        <div className="dialog-overlay" onClick={() => setRoleUpdateUser(null)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>Update Role — {roleUpdateUser.name}</h2>
              <button onClick={() => setRoleUpdateUser(null)} className="btn btn-ghost btn-icon">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRoleUpdate}>
              <div className="dialog-body">
                <div className="form-group">
                  <label className="form-label">New System Role</label>
                  <select value={roleUpdateVal} onChange={e => setRoleUpdateVal(e.target.value)} className="select">
                    <option value="CLIENT">Client</option>
                    <option value="EMPLOYEE">Employee (Editor)</option>
                    <option value="MANAGER">Manager</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
              </div>
              <div className="dialog-footer">
                <button type="button" onClick={() => setRoleUpdateUser(null)} className="btn btn-ghost" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>Cancel</button>
                <button type="submit" className="btn btn-primary staff-btn" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>
                  <Shield size={14} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSuperAdmin && showInviteModal && (
        <div className="dialog-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>Invite Team Member</h2>
              <button onClick={() => setShowInviteModal(false)} className="btn btn-ghost btn-icon">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleInviteUserSubmit}>
              <div className="dialog-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" required value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="e.g. John Doe" className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="john@example.com" className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="text" value={invitePhone} onChange={e => setInvitePhone(e.target.value)} placeholder="e.g. 919876543210" className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="select">
                    <option value="EMPLOYEE">Employee (Editor)</option>
                    <option value="MANAGER">Manager</option>
                    <option value="CLIENT">Client</option>
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
                <button type="submit" className="btn btn-primary staff-btn" style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>
                  <UserPlus size={14} /> Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
