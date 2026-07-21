import React, { useMemo, useCallback, useState } from 'react';
import {
  ClipboardList,
  CheckSquare,
  Users,
  Clock,
  Bell,
  TrendingUp,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  FolderOpen,
  UserPlus,
  Building,
  Film,
  Globe,
  MessageCircle,
  UserCheck,
  Briefcase,
  CalendarDays,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import axios from 'axios';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

function getStatusBadge(status) {
  switch (status) {
    case 'completed': case 'approved': return 'badge badge-success';
    case 'in_progress': case 'assigned': return 'badge badge-info';
    case 'review': case 'submitted': return 'badge badge-warning';
    case 'pending': return 'badge badge-accent';
    case 'rejected': return 'badge badge-error';
    case 'new': return 'badge badge-accent';
    default: return 'badge badge-gray';
  }
}

function getPriorityBadge(priority) {
  switch (priority) {
    case 'urgent': return 'badge badge-error';
    case 'high': return 'badge badge-warning';
    case 'medium': return 'badge badge-info';
    case 'low': return 'badge badge-gray';
    default: return 'badge badge-gray';
  }
}

function getStatusPill(status) {
  switch (status) {
    case 'completed': return 'status-pill active';
    case 'in_progress': return 'status-pill pending';
    case 'pending': return 'status-pill pending';
    case 'review': return 'status-pill pending';
    case 'rejected': return 'status-pill error';
    default: return 'status-pill inactive';
  }
}

function getCategoryIcon(category) {
  if (!category) return <FolderOpen size={14} />;
  const c = category.toLowerCase();
  if (c.includes('edit')) return <Film size={14} />;
  if (c.includes('market')) return <TrendingUp size={14} />;
  if (c.includes('brand')) return <Sparkles size={14} />;
  if (c.includes('web')) return <Globe size={14} />;
  if (c.includes('consult')) return <MessageCircle size={14} />;
  return <FolderOpen size={14} />;
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function getAvatarColor(id) {
  const colors = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#EF4444', '#14B8A6', '#F59E0B'];
  let hash = 0;
  if (id) for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const formatDate = (date) => {
  if (!date) return 'No deadline';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const revenueData = [
  { month: 'Jan', revenue: 0 },
  { month: 'Feb', revenue: 0 },
  { month: 'Mar', revenue: 0 },
  { month: 'Apr', revenue: 0 },
  { month: 'May', revenue: 0 },
  { month: 'Jun', revenue: 0 },
  { month: 'Jul', revenue: 0 },
  { month: 'Aug', revenue: 0 },
  { month: 'Sep', revenue: 0 },
  { month: 'Oct', revenue: 0 },
  { month: 'Nov', revenue: 0 },
  { month: 'Dec', revenue: 0 }
];

export default function OverviewPage({
  user,
  analytics,
  projects,
  tasks,
  notifications,
  staff,
  teamActivity,
  formatTimeAgo,
  onViewAll,
  loading
}) {
  const [acceptingId, setAcceptingId] = useState(null);
  const [localAccepted, setLocalAccepted] = useState({});

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const userId = user?._id?.toString();

  const myProjects = useMemo(() => {
    if (!userId) return [];
    const seen = new Set();
    return projects.filter(p => {
      const isAssigned = p.employees?.some(e => (e._id || e)?.toString() === userId) ||
        p.assignments?.some(a => (a.employee?._id || a.employee)?.toString() === userId) ||
        p.employeeId?.toString() === userId ||
        p.assignedEmployee?.toString() === userId;
      if (!isAssigned) return false;
      if (seen.has(p._id?.toString())) return false;
      seen.add(p._id?.toString());
      return true;
    });
  }, [projects, userId]);

  const myTasks = useMemo(() => {
    if (!userId) return [];
    return tasks.filter(t => t.assignedTo?._id?.toString() === userId || t.assignedTo?.toString() === userId);
  }, [tasks, userId]);

  const assignedCount = myProjects.length;
  const acceptedCount = myProjects.filter(p =>
    p.assignmentStatus === 'Accepted' &&
    (p.employeeId?.toString() === userId || p.assignedEmployee?.toString() === userId)
  ).length;
  const completedCount = myProjects.filter(p => p.status === 'completed').length;
  const pendingTasksCount = myTasks.filter(t =>
    !['completed', 'approved'].includes(t.status)
  ).length;

  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return myProjects.filter(p =>
      p.estimatedCompletion &&
      new Date(p.estimatedCompletion) >= now &&
      new Date(p.estimatedCompletion) <= nextWeek &&
      p.status !== 'completed'
    );
  }, [myProjects]);

  const highPriorityTasks = useMemo(() => {
    return myTasks.filter(t => t.priority === 'high' || t.priority === 'urgent');
  }, [myTasks]);

  const activeProjects = projects.filter(p => p.status !== 'completed');
  const pendingReviews = tasks.filter(t => t.status === 'under_review' || t.status === 'review' || t.status === 'submitted');

  const chartData = revenueData.map((d, i) => {
    const matched = analytics?.growthChart?.find(g => g.month === d.month);
    return matched ? { ...d, revenue: matched.revenue || 0, orders: matched.orders || 0 } : d;
  });

  const computedRevenueData = chartData.some(d => d.revenue > 0)
    ? chartData
    : projects
        .filter(p => p.order?.amount)
        .reduce((acc, p) => {
          const date = p.order?.orderDate ? new Date(p.order.orderDate) : null;
          if (date) {
            const month = date.toLocaleString('default', { month: 'short' });
            const existing = acc.find(d => d.month === month);
            if (existing) {
              existing.revenue += p.order.amount;
              existing.orders = (existing.orders || 0) + 1;
            }
          }
          return acc;
        }, JSON.parse(JSON.stringify(revenueData)));

  const projectsByCategory = projects.reduce((acc, p) => {
    const cat = p.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = { total: 0, active: 0 };
    acc[cat].total++;
    if (p.status !== 'completed') acc[cat].active++;
    return acc;
  }, {});

  const staffByStatus = (staff || []).reduce((acc, s) => {
    const st = (s.status || 'active').toLowerCase();
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});

  const projectsByDepartment = projects.reduce((acc, p) => {
    const dept = p.department || 'General';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const recentProjects = [...projects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const recentNotifications = [...(notifications || [])].slice(0, 5);

  const isLoading = loading !== undefined ? loading : (!projects || projects.length === 0);

  const handleAcceptProject = useCallback(async (projectId) => {
    setAcceptingId(projectId);
    try {
      const res = await axios.post(`/api/projects/${projectId}/accept`);
      const updated = res.data.data;
      setLocalAccepted(prev => ({ ...prev, [projectId]: true }));
      if (updated.acceptedAt) {
        setLocalAccepted(prev => ({ ...prev, [`${projectId}_at`]: updated.acceptedAt }));
      }
    } catch (err) {
      // Accept failed — UI state reverts via finally block
    } finally {
      setAcceptingId(null);
    }
  }, []);

  if (!user) return null;

  const renderEmployeeKpi = () => {
    const kpis = [
      { label: 'Assigned Projects', value: assignedCount, icon: Briefcase, color: 'kpi-icon-blue', trend: 'Total assignments' },
      { label: 'Accepted', value: acceptedCount, icon: UserCheck, color: 'kpi-icon-green', trend: 'Confirmed by you' },
      { label: 'Completed', value: completedCount, icon: CheckSquare, color: 'kpi-icon-purple', trend: 'Delivered' },
      { label: 'Pending Tasks', value: pendingTasksCount, icon: Clock, color: 'kpi-icon-orange', trend: 'Awaiting action' },
      { label: 'Upcoming Deadlines', value: upcomingDeadlines.length, icon: CalendarDays, color: 'kpi-icon-blue', trend: 'Next 7 days' },
      { label: 'High Priority', value: highPriorityTasks.length, icon: AlertTriangle, color: 'kpi-icon-orange', trend: 'Needs attention' },
    ];

    return (
      <div className="kpi-grid">
        {isLoading
          ? [1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="kpi-card">
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)' }}></div>
                <div style={{ flex: 1 }}>
                  <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
                  <div className="skeleton skeleton-title" style={{ width: '40%', height: 28, marginTop: 8 }}></div>
                </div>
              </div>
            ))
          : kpis.map(kpi => (
              <div key={kpi.label} className="kpi-card">
                <div className={`kpi-icon ${kpi.color}`}>
                  <kpi.icon size={20} />
                </div>
                <div className="kpi-content">
                  <div className="kpi-label">{kpi.label}</div>
                  <div className="kpi-value">{kpi.value}</div>
                  <div className="kpi-trend">
                    <TrendingUp size={12} />
                    <span>{kpi.trend}</span>
                  </div>
                </div>
              </div>
            ))}
      </div>
    );
  };

  const renderProjectCard = (project) => {
    const isAccepted = localAccepted[project._id] ||
      (project.assignmentStatus === 'Accepted' &&
        (project.employeeId?.toString() === userId || project.assignedEmployee?.toString() === userId));
    const isPending = !isAccepted && !localAccepted[project._id];
    const empAssignments = project.assignments?.filter(a =>
      (a.employee?._id || a.employee)?.toString() !== userId
    ) || [];

    return (
      <div key={project._id} className="emp-project-card animate-slide-up">
        <div className="emp-project-card-top">
          <div className="emp-project-card-title">{project.name}</div>
          <div className="flex items-center gap-2">
            <span className={getStatusBadge(project.status)}>{project.status?.replace(/_/g, ' ')}</span>
            <span className={getPriorityBadge(project.priority)}>{project.priority}</span>
          </div>
        </div>
        <div className="emp-project-card-body">
          <div className="emp-project-card-details">
            {project.category && (
              <div className="emp-project-detail">
                <span className="emp-detail-label">Type</span>
                <span className="emp-detail-value">{project.category}</span>
              </div>
            )}
            {project.department && (
              <div className="emp-project-detail">
                <span className="emp-detail-label">Department</span>
                <span className="emp-detail-value">{project.department}</span>
              </div>
            )}
            {project.manager?.name && (
              <div className="emp-project-detail">
                <span className="emp-detail-label">Assigned By</span>
                <span className="emp-detail-value">{project.manager.name}</span>
              </div>
            )}
            <div className="emp-project-detail">
              <span className="emp-detail-label">Deadline</span>
              <span className="emp-detail-value">{formatDate(project.estimatedCompletion)}</span>
            </div>
            <div className="emp-project-detail">
              <span className="emp-detail-label">Client</span>
              <span className="emp-detail-value">{project.client?.name || '—'}</span>
            </div>
          </div>
          {project.description && (
            <div className="emp-project-desc">
              {project.description.length > 100 ? project.description.slice(0, 100) + '...' : project.description}
            </div>
          )}
        </div>
        <div className="emp-project-card-footer">
          {isAccepted || localAccepted[project._id] ? (
            <div className="emp-project-accepted-badge">
              <UserCheck size={14} />
              <span>Accepted</span>
              {project.acceptedAt && (
                <span className="emp-accepted-date">{formatDate(project.acceptedAt)}</span>
              )}
            </div>
          ) : isPending ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleAcceptProject(project._id)}
              disabled={acceptingId === project._id}
            >
              {acceptingId === project._id ? (
                <><span className="spinner-sm" /> Accepting...</>
              ) : (
                <><UserCheck size={14} /> Accept Project</>
              )}
            </button>
          ) : null}

          {empAssignments.length > 0 && (
            <div className="emp-other-assignments">
              {empAssignments.map(a => {
                const emp = a.employee;
                return (
                  <div key={emp?._id || Math.random()} className="emp-assignment-chip">
                    <div className="avatar avatar-xs" style={{ background: getAvatarColor(emp?._id) }}>
                      {getInitials(emp?.name)}
                    </div>
                    <span className="emp-assignment-name">{emp?.name || 'Staff'}</span>
                    <span className={`badge ${a.accepted ? 'badge-success' : 'badge-warning'} text-2xs`}>
                      {a.accepted ? 'Accepted' : 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };
  return (
    <div>
      {isAdmin ? (
        <><div className="section-header">
            <div>
              <h2 className="section-title">Executive Dashboard</h2>
              <p className="section-subtitle">Real-time overview of your video production pipeline</p>
            </div>
            {onViewAll && (
              <button className="btn btn-ghost btn-sm" onClick={onViewAll}>
                View Full Analytics <ChevronRight size={14} />
              </button>
            )}
          </div>

          <div className="kpi-grid">
            {isLoading
              ? [1, 2, 3, 4].map(i => (
                  <div key={i} className="kpi-card">
                    <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)' }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
                      <div className="skeleton skeleton-title" style={{ width: '40%', height: 28, marginTop: 8 }}></div>
                    </div>
                  </div>
                ))
              : <>
                  <div className="kpi-card">
                    <div className="kpi-icon kpi-icon-blue">
                      <ClipboardList size={20} />
                    </div>
                    <div className="kpi-content">
                      <div className="kpi-label">Active Projects</div>
                      <div className="kpi-value">{activeProjects.length}</div>
                      <div className="kpi-trend">
                        <TrendingUp size={12} />
                        <span>{projects.length} total campaigns</span>
                      </div>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-icon kpi-icon-green">
                      <CheckSquare size={20} />
                    </div>
                    <div className="kpi-content">
                      <div className="kpi-label">Total Tasks</div>
                      <div className="kpi-value">{tasks.length}</div>
                      <div className="kpi-trend">
                        <ArrowUpRight size={12} />
                        <span>Across all projects</span>
                      </div>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-icon kpi-icon-purple">
                      <Users size={20} />
                    </div>
                    <div className="kpi-content">
                      <div className="kpi-label">Team Members</div>
                      <div className="kpi-value">{staff?.length || 0}</div>
                      <div className="kpi-trend">
                        <UserPlus size={12} />
                        <span>Active roster</span>
                      </div>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-icon kpi-icon-orange">
                      <Clock size={20} />
                    </div>
                    <div className="kpi-content">
                      <div className="kpi-label">Pending Reviews</div>
                      <div className="kpi-value">{pendingReviews.length}</div>
                      <div className="kpi-trend">
                        <Clock size={12} />
                        <span>Awaiting approval</span>
                      </div>
                    </div>
                  </div>
                </>}
          </div>


          {isLoading ? (
            <div className="card mt-6">
              <div className="card-header">
                <div className="skeleton skeleton-title" style={{ width: '30%' }}></div>
              </div>
              <div className="card-body">
                <div className="skeleton" style={{ height: 300, borderRadius: 'var(--r-lg)' }}></div>
              </div>
            </div>
          ) : (
            <div className="card mt-6">
              <div className="card-header">
                <div>
                  <h3 className="section-title">Revenue Overview</h3>
                  <p className="section-subtitle">Monthly revenue trajectory</p>
                </div>
              </div>
                <div className="card-body h-300" style={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={computedRevenueData}>
                    <defs>
                      <linearGradient id="overviewRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid var(--gray-200)',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                        background: 'var(--white)'
                      }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="var(--accent)" fillOpacity={1} fill="url(#overviewRevenueGrad)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
                {computedRevenueData.every(d => d.revenue === 0) && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <BarChart3 size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No revenue data available</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="section-grid mt-6">
              <div className="card">
                <div className="card-header">
                  <div className="skeleton skeleton-title" style={{ width: '40%' }}></div>
                </div>
                <div className="card-body p-0">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="activity-item">
                      <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 'var(--r-lg)' }}></div>
                      <div style={{ flex: 1 }}>
                        <div className="skeleton skeleton-text" style={{ width: '70%' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '40%', marginTop: 4 }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <div className="skeleton skeleton-title" style={{ width: '50%' }}></div>
                </div>
                <div className="card-body p-0">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="activity-item">
                      <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 'var(--r-lg)' }}></div>
                      <div style={{ flex: 1 }}>
                        <div className="skeleton skeleton-text" style={{ width: '65%' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '35%', marginTop: 4 }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="section-grid mt-6">
              <div className="card card-interactive-wrapper">
                <div className="card-header">
                  <h3 className="section-title">Recent Projects</h3>
                  <span className="badge badge-info">{recentProjects.length} latest</span>
                </div>
                <div className="card-body p-0">
                  {recentProjects.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1.5rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 12,
                      border: '1px solid var(--border)'
                    }}>
                      <ClipboardList size={48} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '1rem' }} />
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
                        No projects yet
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto' }}>
                        Projects will appear here once they are created and assigned.
                      </p>
                    </div>
                  ) : (
                    <div className="activity-feed project-feed">
                      {recentProjects.map((p, i) => (
                        <div key={p._id} className="activity-item project-activity-item">
                          <div
                            className={`activity-icon ${
                              p.status === 'completed'
                                ? 'activity-icon-success'
                                : p.status === 'in_progress'
                                ? 'activity-icon-info'
                                : 'activity-icon-warning'
                            }`}
                          >
                            <ClipboardList
                              size={16}
                              className={`${
                                p.status === 'completed'
                                  ? 'icon-success'
                                  : p.status === 'in_progress'
                                  ? 'icon-blue'
                                  : 'icon-accent'
                              }`}
                            />
                          </div>
                          <div className="activity-content">
                            <div className="activity-text">
                              <strong>{p.name}</strong>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={getStatusBadge(p.status)}>{p.status?.replace('_', ' ')}</span>
                              {p.client?.name && (
                                <span className="text-muted text-xs">{p.client.name}</span>
                              )}
                            </div>
                            <div className="activity-time">
                              {p.estimatedCompletion
                                ? new Date(p.estimatedCompletion).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })
                                : 'No deadline'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="section-title">Notifications & Activity</h3>
                  <span className="badge badge-accent">{recentNotifications.length} recent</span>
                </div>
                <div className="card-body p-0">
                  {recentNotifications.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1.5rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 12,
                      border: '1px solid var(--border)'
                    }}>
                      <Bell size={48} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '1rem' }} />
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
                        All caught up
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto' }}>
                        No new notifications at this time.
                      </p>
                    </div>
                  ) : (
                    <div className="activity-feed scrollable-feed">
                      {recentNotifications.map((n) => {
                        const typeColors = { info: '#3B82F6', success: '#10B981', warning: '#F59E0B', error: '#EF4444', critical: '#DC2626' };
                        const dotColor = typeColors[n.type] || '#F97316';
                        return (
                          <div key={n._id} className={`activity-item notification-item ${!n.isRead ? 'unread' : ''}`}>
                            <div
                              className="activity-icon"
                              style={{ background: `${n.color || dotColor}18`, color: n.color || dotColor }}
                            >
                              <Bell size={16} />
                            </div>
                            <div className="activity-content">
                              <div className="activity-text">
                                <strong>{n.title}</strong>
                                <span className="text-muted" style={{ marginLeft: 6, fontSize: '0.75rem' }}>
                                  {n.priority && (
                                    <span className={`notif-priority notif-priority-${n.priority}`}>
                                      {n.priority.charAt(0).toUpperCase() + n.priority.slice(1)}
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="activity-text text-muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>
                                {n.message}
                              </div>
                              <div className="activity-time flex items-center justify-between mt-1">
                                <span>{formatTimeAgo ? formatTimeAgo(n.createdAt) : new Date(n.createdAt).toLocaleString()}</span>
                                <div className="flex items-center gap-2">
                                  {!n.isRead && <span className="unread-dot" style={{ background: dotColor }} />}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {(isSuperAdmin || user?.role === 'MANAGER') && (
            isLoading ? (
              <div className="section-grid-3 mt-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="card card-interactive">
                    <div className="card-header">
                      <div className="skeleton skeleton-title" style={{ width: '50%' }}></div>
                    </div>
                    <div className="card-body">
                      {[1, 2, 3, 4].map(j => (
                        <div key={j} className="flex items-center justify-between mb-3">
                          <div className="skeleton skeleton-text" style={{ width: '35%' }}></div>
                          <div className="skeleton skeleton-text" style={{ width: '20%' }}></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="section-grid-3 mt-6">
                <div className="card card-interactive">
                  <div className="card-header">
                    <h3 className="section-title">Projects by Category</h3>
                  </div>
                  <div className="card-body">
                    {Object.keys(projectsByCategory).length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '2rem 1rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: 10,
                        border: '1px solid var(--border)'
                      }}>
                        <FolderOpen size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '0.5rem' }} />
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No categories yet</p>
                      </div>
                    ) : (
                      <div className="flex-col gap-2">
                        {Object.entries(projectsByCategory).map(([cat, counts]) => (
                          <div key={cat} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(cat)}
                              <span className="text-sm font-medium">{cat}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="badge badge-accent">{counts.active} active</span>
                              <span className="text-xs text-muted">{counts.total} total</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="card card-interactive">
                  <div className="card-header">
                    <h3 className="section-title">Employee Status</h3>
                  </div>
                  <div className="card-body">
                    {(!staff || staff.length === 0) ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '2rem 1rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: 10,
                        border: '1px solid var(--border)'
                      }}>
                        <Users size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '0.5rem' }} />
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No staff data available</p>
                      </div>
                    ) : (
                      <div className="flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="status-dot online" />
                            <span className="text-sm font-medium">Active</span>
                          </div>
                          <span className="text-sm font-bold">{staffByStatus['active'] || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="status-dot busy" />
                            <span className="text-sm font-medium">Pending</span>
                          </div>
                          <span className="text-sm font-bold">
                            {(staffByStatus['pending'] || 0) + (staffByStatus['pending_approval'] || 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="status-dot offline" />
                            <span className="text-sm font-medium">Invited</span>
                          </div>
                          <span className="text-sm font-bold">{staffByStatus['invited'] || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="status-dot error" />
                            <span className="text-sm font-medium">Inactive</span>
                          </div>
                          <span className="text-sm font-bold">
                            {(staffByStatus['disabled'] || 0) + (staffByStatus['inactive'] || 0) + (staffByStatus['rejected'] || 0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card card-interactive">
                  <div className="card-header">
                    <h3 className="section-title">Department Workload</h3>
                  </div>
                  <div className="card-body">
                    {Object.keys(projectsByDepartment).length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '2rem 1rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: 10,
                        border: '1px solid var(--border)'
                      }}>
                        <Building size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '0.5rem' }} />
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No departments yet</p>
                      </div>
                    ) : (
                      <div className="flex-col gap-2">
                        {Object.entries(projectsByDepartment).map(([dept, count]) => (
                          <div key={dept} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building size={14} className="text-muted" />
                              <span className="text-sm font-medium">{dept}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="progress-track">
                                <div
                                  className="progress-bar-fill"
                                  style={{
                                    width: `${Math.min(100, (count / Math.max(...Object.values(projectsByDepartment))) * 100)}%`
                                  }}
                                />
                              </div>
                              <span className="text-sm font-bold text-accent">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </>
        ) : (
        <div className="animate-fade-in">
          <div className="section-header">
            <div>
              <h2 className="section-title">My Dashboard</h2>
              <p className="section-subtitle">Welcome back, {user.name} &mdash; {myProjects.length} active assignment{myProjects.length !== 1 ? 's' : ''}</p>
            </div>
            <span className="badge badge-accent badge-lg">{user.role?.replace('_', ' ')}</span>
          </div>

          {renderEmployeeKpi()}

          <div className="mt-6">
            <div className="section-header">
              <h3 className="section-title">My Projects</h3>
              <span className="text-xs text-muted">{myProjects.length} project{myProjects.length !== 1 ? 's' : ''}</span>
            </div>
            {isLoading ? (
              <div className="emp-project-grid">
                {[1, 2, 3].map(i => (
                  <div key={i} className="emp-project-card">
                    <div className="emp-project-card-top">
                      <div className="skeleton skeleton-title" style={{ width: '60%', height: 18 }}></div>
                    </div>
                    <div className="emp-project-card-body">
                      <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
                      <div className="skeleton skeleton-text" style={{ width: '60%', marginTop: 4 }}></div>
                    </div>
                    <div className="emp-project-card-footer">
                      <div className="skeleton" style={{ width: 120, height: 28, borderRadius: 'var(--r-sm)' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : myProjects.length === 0 ? (
              <div className="card">
                <div className="card-body">
                  <div className="empty-state">
                    <div className="empty-icon">
                      <Briefcase size={24} />
                    </div>
                    <p className="empty-title">No projects assigned</p>
                    <p className="empty-desc">Your projects will appear here once you are assigned by a manager</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="emp-project-grid">
                {myProjects.map(renderProjectCard)}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="card mt-6">
              <div className="card-header">
                <div className="skeleton skeleton-title" style={{ width: '35%' }}></div>
              </div>
              <div className="card-body p-0">
                {[1, 2, 3].map(i => (
                  <div key={i} className="activity-item">
                    <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 'var(--r-lg)' }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="skeleton skeleton-text" style={{ width: '70%' }}></div>
                      <div className="skeleton skeleton-text" style={{ width: '40%', marginTop: 4 }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card mt-6">
              <div className="card-header">
                <h3 className="section-title">Recent Updates</h3>
                <span className="badge badge-accent">{recentNotifications.length}</span>
              </div>
              <div className="card-body p-0">
                {recentNotifications.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <Bell size={24} />
                    </div>
                    <p className="empty-title">All caught up</p>
                    <p className="empty-desc">No new notifications</p>
                  </div>
                ) : (
                  <div className="activity-feed">
                    {recentNotifications.map((n) => {
                      const typeColors = { info: '#3B82F6', success: '#10B981', warning: '#F59E0B', error: '#EF4444', critical: '#DC2626' };
                      const dotColor = typeColors[n.type] || '#F97316';
                      return (
                        <div key={n._id} className="activity-item">
                          <div className="activity-icon" style={{ background: `${n.color || dotColor}18`, color: n.color || dotColor }}>
                            <Bell size={16} />
                          </div>
                          <div className="activity-content">
                            <div className="activity-text"><strong>{n.title}</strong></div>
                            <div className="activity-text text-muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>{n.message}</div>
                            <div className="activity-time">
                              {formatTimeAgo ? formatTimeAgo(n.createdAt) : new Date(n.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
