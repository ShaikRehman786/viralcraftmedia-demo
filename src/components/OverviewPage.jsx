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
  Palette,
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
  BarChart3,
  ExternalLink
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
  if (c.includes('brand')) return <Palette size={14} />;
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
  loading,
  onRefreshData
}) {
  const [acceptingId, setAcceptingId] = useState(null);
  const [localAccepted, setLocalAccepted] = useState({});
  const [activeFilter, setActiveFilter] = useState('Last 30 Days');
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });
  const [showCustomModal, setShowCustomModal] = useState(false);

  const getISTDateRange = useCallback((filter, range) => {
    const now = new Date();
    const kolkataTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const today = new Date(kolkataTimeStr);
    today.setHours(0, 0, 0, 0);

    let start = new Date(today);
    let end = new Date(today);
    end.setHours(23, 59, 59, 999);

    switch (filter) {
      case 'Today':
        break;
      case 'Yesterday':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'Last 7 Days':
        start.setDate(today.getDate() - 6);
        break;
      case 'Last 30 Days':
        start.setDate(today.getDate() - 29);
        break;
      case 'This Month':
        start.setDate(1);
        break;
      case 'Last Month':
        start.setMonth(today.getMonth() - 1);
        start.setDate(1);
        end = new Date(start);
        end.setMonth(start.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'Quarter':
        start.setDate(today.getDate() - 89);
        break;
      case 'Year':
        start.setMonth(0, 1);
        break;
      case 'Previous Year':
        start.setFullYear(today.getFullYear() - 1, 0, 1);
        end.setFullYear(today.getFullYear() - 1, 11, 31);
        break;
      case 'Custom':
        if (range && range.startDate && range.endDate) {
          start = new Date(range.startDate);
          start.setHours(0, 0, 0, 0);
          end = new Date(range.endDate);
          end.setHours(23, 59, 59, 999);
        }
        break;
      default:
        start.setDate(today.getDate() - 29);
        break;
    }
    return { start, end };
  }, []);

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const userId = (user?._id || user?.id || user)?.toString();

  const isEmployeeRole = (user?.role || '').toUpperCase() === 'EMPLOYEE';

  const myProjects = useMemo(() => {
    if (!projects || !Array.isArray(projects)) return [];
    if (isEmployeeRole) {
      return projects;
    }
    if (!userId) return [];
    const seen = new Set();
    const taskProjectIds = new Set(
      (tasks || [])
        .filter(t => {
          if (!t) return false;
          const assignedId = (t.assignedTo?._id || t.assignedTo?.id || t.assignedTo)?.toString();
          return assignedId && assignedId === userId;
        })
        .map(t => (t.project?._id || t.project?.id || t.project)?.toString())
        .filter(Boolean)
    );

    return projects.filter(p => {
      if (!p || !p._id) return false;
      const pIdStr = (p._id || p.id)?.toString();
      const isAssigned = taskProjectIds.has(pIdStr) ||
        (p.employees || []).some(e => {
          const eid = (e?._id || e?.id || e)?.toString();
          return eid && eid === userId;
        }) ||
        (p.assignments || []).some(a => {
          const eid = (a?.employee?._id || a?.employee?.id || a?.employee)?.toString();
          return eid && eid === userId;
        }) ||
        (p.employeeId ? (p.employeeId?._id || p.employeeId?.id || p.employeeId)?.toString() === userId : false) ||
        (p.assignedEmployee ? (p.assignedEmployee?._id || p.assignedEmployee?.id || p.assignedEmployee)?.toString() === userId : false);
      if (!isAssigned) return false;
      if (seen.has(pIdStr)) return false;
      seen.add(pIdStr);
      return true;
    });
  }, [projects, tasks, userId, isEmployeeRole]);

  const myTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    if (isEmployeeRole) {
      return tasks;
    }
    if (!userId) return [];
    return tasks.filter(t => {
      if (!t) return false;
      const assignedId = (t.assignedTo?._id || t.assignedTo?.id || t.assignedTo)?.toString();
      return assignedId && assignedId === userId;
    });
  }, [tasks, userId, isEmployeeRole]);

  const assignedCount = myProjects.length;
  const acceptedCount = myProjects.filter(p => {
    const isAccepted = p.assignmentStatus === 'Accepted' ||
      (p.assignments || []).some(a => {
        const aId = (a?.employee?._id || a?.employee?.id || a?.employee)?.toString();
        return (!aId || aId === userId) && (a.accepted || a.status === 'Accepted');
      });
    return isAccepted || localAccepted[p._id] === 'Accepted';
  }).length;
  const completedCount = myProjects.filter(p => p.status === 'completed' || p.status === 'approved').length;
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

  const isLoading = loading !== undefined ? loading : false;

  const handleAcceptProject = useCallback(async (projectId) => {
    setAcceptingId(projectId);
    try {
      const res = await axios.post(`/api/projects/${projectId}/accept`);
      const updated = res.data.data;
      setLocalAccepted(prev => ({ ...prev, [projectId]: 'Accepted' }));
      if (updated.acceptedAt) {
        setLocalAccepted(prev => ({ ...prev, [`${projectId}_at`]: updated.acceptedAt }));
      }
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setAcceptingId(null);
    }
  }, [onRefreshData]);

  const handleRejectProject = useCallback(async (projectId) => {
    setAcceptingId(projectId);
    try {
      await axios.post(`/api/projects/${projectId}/reject`);
      setLocalAccepted(prev => ({ ...prev, [projectId]: 'Rejected' }));
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setAcceptingId(null);
    }
  }, [onRefreshData]);

  const handleAcceptTask = useCallback(async (taskOrId) => {
    const taskId = (taskOrId?._id || taskOrId?.id || taskOrId)?.toString();
    if (!taskId) return;
    setAcceptingId(taskId);
    try {
      const res = await axios.post(`/api/tasks/${taskId}/accept`);
      setLocalAccepted(prev => ({ ...prev, [taskId]: 'accepted' }));
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to accept task:', err);
    } finally {
      setAcceptingId(null);
    }
  }, [onRefreshData]);

  const handleRejectTask = useCallback(async (taskOrId) => {
    const taskId = (taskOrId?._id || taskOrId?.id || taskOrId)?.toString();
    if (!taskId) return;
    setAcceptingId(taskId);
    try {
      const res = await axios.post(`/api/tasks/${taskId}/reject`);
      setLocalAccepted(prev => ({ ...prev, [taskId]: 'rejected' }));
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to reject task:', err);
    } finally {
      setAcceptingId(null);
    }
  }, [onRefreshData]);

  if (!user) return null;

  const renderEmployeeKpi = () => {
    const kpis = [
      { label: 'Assigned Projects', value: assignedCount, icon: Briefcase, color: 'blue', trend: 'Total assignments', trendVal: 'Active', trendDir: 'up', sparkPoints: 'M0,25 Q15,5 30,20 T60,10 T90,22' },
      { label: 'Accepted', value: acceptedCount, icon: UserCheck, color: 'green', trend: 'Confirmed by you', trendVal: 'Ready', trendDir: 'up', sparkPoints: 'M0,10 Q20,25 40,5 T80,18 T100,5' },
      { label: 'Completed', value: completedCount, icon: CheckSquare, color: 'purple', trend: 'Delivered', trendVal: 'Done', trendDir: 'up', sparkPoints: 'M0,20 Q20,10 40,20 T80,10 T100,15' },
      { label: 'Pending Tasks', value: pendingTasksCount, icon: Clock, color: 'orange', trend: 'Awaiting action', trendVal: 'Todo', trendDir: 'down', sparkPoints: 'M0,5 Q15,25 30,10 T60,25 T90,8' },
      { label: 'Upcoming Deadlines', value: upcomingDeadlines.length, icon: CalendarDays, color: 'blue', trend: 'Next 7 days', trendVal: 'Due', trendDir: 'down', sparkPoints: 'M0,25 Q15,5 30,20 T60,10 T90,22' },
      { label: 'High Priority', value: highPriorityTasks.length, icon: AlertTriangle, color: 'orange', trend: 'Needs attention', trendVal: 'Urgent', trendDir: 'down', sparkPoints: 'M0,5 Q15,25 30,10 T60,25 T90,8' },
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
              <div key={kpi.label} className={`kpi-card kpi-card-${kpi.color}`}>
                <div className="kpi-card-header">
                  <div className="kpi-card-title-container">
                    <span className="kpi-label">{kpi.label}</span>
                    <span className="kpi-value">{kpi.value}</span>
                  </div>
                  <div className={`kpi-card-icon-wrapper ${kpi.color}`}>
                    <kpi.icon size={20} />
                  </div>
                </div>
                <div className="kpi-card-footer">
                  <span className={`kpi-card-trend-badge ${kpi.trendDir}`}>
                    {kpi.trendVal}
                  </span>
                  <div className="kpi-sparkline-container text-muted">
                    <svg viewBox="0 0 100 30" width="60" height="18" style={{ overflow: 'visible' }}>
                      <path d={kpi.sparkPoints} fill="none" stroke={`var(--${kpi.color === 'orange' ? 'accent' : kpi.color === 'blue' ? 'info' : kpi.color})`} strokeWidth="2" className="kpi-sparkline" />
                    </svg>
                  </div>
                  <span className="kpi-card-footer-desc">{kpi.trend}</span>
                </div>
              </div>
            ))}
      </div>
    );
  };

  const renderProjectCard = (project) => {
    const myAssignment = (project.assignments || []).find(a =>
      (a?.employee?._id || a?.employee?.id || a?.employee)?.toString() === userId
    );
    const isAccepted = localAccepted[project._id] === 'Accepted' ||
      localAccepted[project._id] === true ||
      myAssignment?.accepted ||
      myAssignment?.status === 'Accepted' ||
      (project.assignmentStatus === 'Accepted' &&
        ((project.employeeId?._id || project.employeeId)?.toString() === userId ||
         (project.assignedEmployee?._id || project.assignedEmployee)?.toString() === userId ||
         (project.employees || []).some(e => (e?._id || e)?.toString() === userId)));
    const isRejected = localAccepted[project._id] === 'Rejected' ||
      project.assignmentStatus === 'Rejected' ||
      myAssignment?.status === 'Rejected';
    const isPending = !isAccepted && !isRejected;
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
            {user.role !== 'EMPLOYEE' && (
              <div className="emp-project-detail">
                <span className="emp-detail-label">Client</span>
                <span className="emp-detail-value">{project.client?.name || '—'}</span>
              </div>
            )}
          </div>
          {project.description && (
            <div className="emp-project-desc">
              {project.description.length > 100 ? project.description.slice(0, 100) + '...' : project.description}
            </div>
          )}
          {project.driveShareableLink && (
            <div style={{ marginTop: 8 }}>
              <a
                href={project.driveShareableLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-accent btn-xs"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <ExternalLink size={12} />
                Open Drive
              </a>
            </div>
          )}
          {(() => {
            const myProjTasks = (tasks || []).filter(t => {
              if (!t) return false;
              const tProjId = (t.project?._id || t.project?.id || t.project)?.toString();
              const assignedId = (t.assignedTo?._id || t.assignedTo?.id || t.assignedTo)?.toString();
              const isAssigned = assignedId && assignedId === userId;
              return tProjId === (project._id || project.id)?.toString() && isAssigned;
            });

            if (myProjTasks.length === 0) return null;

            return (
              <div className="emp-project-tasks-list" style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="emp-detail-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray-400)' }}>
                  Assigned Tasks ({myProjTasks.length})
                </span>
                {myProjTasks.map(t => (
                  <div key={t._id || t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--gray-50, #f9fafb)', borderRadius: 8, border: '1px solid var(--gray-200, #e5e7eb)', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--gray-800, #1f2937)' }}>{t.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={getPriorityBadge(t.priority)}>{t.priority}</span>
                      {localAccepted[t._id] === 'accepted' || (!localAccepted[t._id] && (t.status === 'accepted' || t.status === 'in_progress' || t.status === 'completed' || t.status === 'approved' || t.status === 'submitted')) ? (
                        <span className="badge badge-success">Accepted</span>
                      ) : localAccepted[t._id] === 'rejected' || (!localAccepted[t._id] && t.status === 'rejected') ? (
                        <span className="badge badge-error">Rejected</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            className="btn btn-accent btn-xs"
                            onClick={() => handleAcceptTask(t._id)}
                            disabled={acceptingId === t._id}
                          >
                            Accept
                          </button>
                          <button
                            className="btn btn-ghost btn-xs"
                            style={{ color: 'var(--error, #dc2626)', border: '1px solid var(--gray-200, #e5e7eb)' }}
                            onClick={() => handleRejectTask(t._id)}
                            disabled={acceptingId === t._id}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
        <div className="emp-project-card-footer">
          {localAccepted[project._id] === 'Accepted' || (!localAccepted[project._id] && (project.assignmentStatus === 'Accepted' || isAccepted)) ? (
            <div className="emp-project-accepted-badge">
              <UserCheck size={14} />
              <span>Accepted</span>
              {project.acceptedAt && (
                <span className="emp-accepted-date">{formatDate(project.acceptedAt)}</span>
              )}
            </div>
          ) : localAccepted[project._id] === 'Rejected' || (!localAccepted[project._id] && project.assignmentStatus === 'Rejected') ? (
            <div className="emp-project-accepted-badge" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <span>Rejected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleAcceptProject(project._id)}
                disabled={acceptingId === project._id}
              >
                {acceptingId === project._id ? (
                  <><span className="spinner-sm" /> Accepting...</>
                ) : (
                  <><UserCheck size={14} /> Accept</>
                )}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--error, #dc2626)', border: '1px solid var(--gray-200, #e5e7eb)' }}
                onClick={() => handleRejectProject(project._id)}
                disabled={acceptingId === project._id}
              >
                Reject
              </button>
            </div>
          )}

          {empAssignments.length > 0 && (
            <div className="emp-other-assignments">
              {empAssignments.map(a => {
                const emp = a.employee;
                const aStatus = a.status || (a.accepted ? 'Accepted' : 'Pending');
                return (
                  <div key={emp?._id || Math.random()} className="emp-assignment-chip">
                    <div className="avatar avatar-xs" style={{ background: getAvatarColor(emp?._id) }}>
                      {getInitials(emp?.name)}
                    </div>
                    <span className="emp-assignment-name">{emp?.name || 'Staff'}</span>
                    <span className={`badge ${aStatus === 'Accepted' ? 'badge-success' : aStatus === 'Rejected' ? 'badge-error' : 'badge-warning'} text-2xs`}>
                      {aStatus}
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

  const getISTGreeting = () => {
    try {
      const now = new Date();
      const kolkataTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: false });
      const timePart = kolkataTimeStr.split(', ')[1];
      if (!timePart) return "Good Morning";
      const hour = parseInt(timePart.split(':')[0], 10);
      if (hour >= 5 && hour < 12) return "Good Morning";
      if (hour >= 12 && hour < 17) return "Good Afternoon";
      if (hour >= 17 && hour < 21) return "Good Evening";
      return "Good Night";
    } catch (e) {
      return "Good Morning";
    }
  };
  const activeGreeting = getISTGreeting();

  const resolvedName = (user?.name && (user.name.includes('vcm') || user.name.includes('Admin') || user.name.includes('admin') || user.email === 'vcmAdmin@gmail.com')) ? 'Sri Harsha' : (user?.name ? user.name.split(' ')[0] : 'Sri Harsha');

  // Filtered analytics — real backend query, updates all metrics/charts/timeline when date changes
  const [filteredAnalytics, setFilteredAnalytics] = React.useState(null);
  const [filterLoading, setFilterLoading] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setFilterLoading(true);
        const { start, end } = getISTDateRange(activeFilter === 'Month' ? 'This Month' : activeFilter, customRange);
        const params = new URLSearchParams({ startDate: start.toISOString(), endDate: end.toISOString() });
        const res = await axios.get(`/api/analytics/dashboard?${params.toString()}`);
        if (!cancelled && res.data?.stats) setFilteredAnalytics(res.data.stats);
      } catch {}
      if (!cancelled) setFilterLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeFilter, customRange, getISTDateRange]);
  const displayAnalytics = filteredAnalytics || analytics;

  // Projects filtered for non-financial widgets (category breakdown etc.) — financial KPIs use backend authoritative stats only
  const filteredProjects = useMemo(() => {
    const { start, end } = getISTDateRange(activeFilter === 'Month' ? 'This Month' : activeFilter, customRange);
    return projects.filter(p => {
      const pDate = p.order?.orderDate ? new Date(p.order.orderDate) : new Date(p.createdAt);
      return pDate >= start && pDate <= end;
    });
  }, [projects, activeFilter, customRange, getISTDateRange]);

  // Authoritative financial values — from backend MongoDB, never derived from frontend project aggregation
  const confirmedRevenue = displayAnalytics?.confirmedRevenue ?? displayAnalytics?.totalRevenue ?? 0;
  const pendingRevenue = displayAnalytics?.pendingRevenue ?? 0;
  const failedRevenue = displayAnalytics?.failedRevenue ?? 0;
  const refundedRevenue = displayAnalytics?.refundedRevenue ?? 0;
  const abandonedRevenue = displayAnalytics?.abandonedRevenue ?? 0;
  const outstandingSum = displayAnalytics?.outstandingAmount ?? 0;
  const averageDealValue = displayAnalytics?.avgDealValue ?? 0;
  const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
  const fmtL = (n) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${Math.round(n).toLocaleString('en-IN')}`;
  const formattedRevenue = confirmedRevenue ? fmtL(confirmedRevenue) : '₹0';
  const formattedNetProfit = formattedRevenue; // Net = confirmed (no cost model)
  const formattedOutstanding = outstandingSum ? fmtL(outstandingSum) : '₹0';
  const formattedAverageDeal = averageDealValue ? fmtL(averageDealValue) : '₹0';
  const formattedPending = pendingRevenue ? fmtL(pendingRevenue) : '₹0';
  const formattedFailed = failedRevenue ? fmtL(failedRevenue) : '₹0';
  const formattedAbandoned = abandonedRevenue ? fmtL(abandonedRevenue) : '₹0';
  const formattedRefunded = refundedRevenue ? fmtL(refundedRevenue) : '₹0';
  
  const overdueTasksCount = useMemo(() => {
    const now = new Date();
    return tasks.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== 'completed' && t.status !== 'approved').length;
  }, [tasks]);

  const projectsNeedingAttention = useMemo(() => {
    const now = new Date();
    return projects.filter(p => {
      const isOverdue = p.estimatedCompletion && new Date(p.estimatedCompletion) < now && p.status !== 'completed';
      const isHighPriority = p.priority === 'high' || p.priority === 'urgent';
      return isOverdue || isHighPriority;
    });
  }, [projects]);

  const categoryRevenueMap = useMemo(() => {
    return filteredProjects.reduce((acc, p) => {
      if (p.order?.amount) {
        const cat = p.category || 'General';
        acc[cat] = (acc[cat] || 0) + p.order.amount;
      }
      return acc;
    }, {});
  }, [filteredProjects]);

  const bestCategory = useMemo(() => {
    return Object.entries(categoryRevenueMap).reduce((max, [cat, val]) => val > max.val ? { cat, val } : max, { cat: 'Video Production', val: 0 }).cat;
  }, [categoryRevenueMap]);

  // Timeline — authoritative backend buckets (per IST day, correct event timestamp), never frontend aggregation
  const dynamicChartData = useMemo(() => {
    const tl = displayAnalytics?.budgetTimeline;
    if (Array.isArray(tl) && tl.length > 0) {
      // Backend timeline is per-day with {date, confirmed, pending, failed, refunded}
      // For chart, map to requested granularity while preserving correct totals
      const diffDays = tl.length;
      if (activeFilter === 'Today' || activeFilter === 'Yesterday') {
        // Single day — show the day's confirmed as single point; backend timeline already correct
        const d = tl[0];
        return [{ month: d.date.slice(5), revenue: d.confirmed, confirmed: d.confirmed, pending: d.pending, failed: d.failed, orders: d.countConfirmed }];
      }
      if (diffDays <= 7) {
        return tl.map(d => ({
          month: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' }),
          revenue: d.confirmed,
          confirmed: d.confirmed,
          pending: d.pending,
          failed: d.failed,
          orders: d.countConfirmed,
          date: d.date
        }));
      }
      if (diffDays <= 31) {
        // For 30-day views, show daily confirmed (already correct) — no frontend re-aggregation
        return tl.map(d => ({
          month: `${new Date(d.date).getDate()} ${new Date(d.date).toLocaleString('en-US', { month: 'short', timeZone: 'Asia/Kolkata' })}`,
          revenue: d.confirmed,
          confirmed: d.confirmed,
          pending: d.pending,
          failed: d.failed,
          orders: d.countConfirmed,
          date: d.date
        }));
      }
      // >31 days (Quarter/Year): bucket by month from timeline days, summing confirmed per month (still correct timestamp)
      const byMonth = {};
      tl.forEach(d => {
        const m = new Date(d.date).toLocaleString('en-US', { month: 'short', timeZone: 'Asia/Kolkata' });
        if (!byMonth[m]) byMonth[m] = { month: m, revenue: 0, confirmed: 0, pending: 0, failed: 0, orders: 0 };
        byMonth[m].revenue += d.confirmed;
        byMonth[m].confirmed += d.confirmed;
        byMonth[m].pending += d.pending;
        byMonth[m].failed += d.failed;
        byMonth[m].orders += d.countConfirmed;
      });
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return months.filter(m => byMonth[m]).map(m => byMonth[m]);
    }
    // Fallback: legacy growthChart or empty (never fabricate)
    const gc = displayAnalytics?.growthChart;
    if (Array.isArray(gc) && gc.some(x => x.revenue > 0)) {
      return gc.map(g => ({ month: g.month, revenue: g.revenue, orders: g.orders, confirmed: g.revenue }));
    }
    return [];
  }, [displayAnalytics, activeFilter]);

  const highestMonthObj = useMemo(() => {
    return dynamicChartData.reduce((max, d) => d.revenue > max.revenue ? d : max, { month: 'N/A', revenue: 0 });
  }, [dynamicChartData]);
  const highestMonth = highestMonthObj.month !== 'N/A' ? `${highestMonthObj.month} (₹${(highestMonthObj.revenue/1000).toFixed(0)}k)` : 'N/A';

  return (
    <div>
      {isAdmin ? (
        <><div className="dashboard-header-container">
            <div className="dashboard-header-left">
              <h2>{activeGreeting}, {resolvedName} 👋</h2>
              <p>Today's production overview • Real-time business insights</p>
            </div>
            <div className="dashboard-header-right">
              <div className="header-meta-badge">
                <CalendarDays size={14} className="text-muted" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="header-meta-badge live-sync-badge">
                <span className="pulse-dot" />
                <span>Live Syncing</span>
              </div>
              {onViewAll && (
                <button className="btn btn-ghost btn-sm" onClick={onViewAll} style={{ marginLeft: 8 }}>
                  View Full Analytics <ChevronRight size={14} />
                </button>
              )}
            </div>
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
                  <div className="kpi-card-projects">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="kpi-label">Active Projects</span>
                        <span className="kpi-value block mt-1">{activeProjects.length}</span>
                      </div>
                      <div className="kpi-card-icon-wrapper blue">
                        <ClipboardList size={20} />
                      </div>
                    </div>
                    <div className="flex-col gap-1 mt-2">
                      <div className="flex justify-between text-2xs font-semibold">
                        <span>Project Completion Rate</span>
                        <span>{projects.length > 0 ? Math.round((projects.filter(p => p.status === 'completed').length / projects.length) * 100) : 0}%</span>
                      </div>
                      <div className="category-progress-track" style={{ height: '6px', borderRadius: '3px' }}>
                        <div className="category-progress-fill" style={{ width: `${projects.length > 0 ? Math.round((projects.filter(p => p.status === 'completed').length / projects.length) * 100) : 0}%`, height: '100%', background: 'var(--accent)', borderRadius: '3px' }} />
                      </div>
                    </div>
                    <div className="flex gap-2 text-2xs text-muted font-medium mt-1">
                      <span>Completed: {projects.filter(p => p.status === 'completed').length}</span>
                      <span>•</span>
                      <span className="text-warning">Delayed: {activeProjects.filter(p => p.estimatedCompletion && new Date(p.estimatedCompletion) < new Date()).length}</span>
                    </div>
                  </div>

                  <div className="kpi-card-tasks">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="kpi-label">Total Tasks</span>
                        <span className="kpi-value block mt-1">{tasks.length}</span>
                      </div>
                      <div className="kpi-card-icon-wrapper green">
                        <CheckSquare size={20} />
                      </div>
                    </div>
                    <div className="flex-col gap-1 mt-2">
                      <div className="flex justify-between text-2xs font-semibold">
                        <span>Completed Tasks</span>
                        <span>{tasks.filter(t => t.status === 'completed' || t.status === 'approved').length} / {tasks.length}</span>
                      </div>
                      <div className="category-progress-track" style={{ height: '6px', borderRadius: '3px' }}>
                        <div className="category-progress-fill" style={{ width: `${tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed' || t.status === 'approved').length / tasks.length) * 100) : 0}%`, height: '100%', background: 'var(--success)', borderRadius: '3px' }} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-2xs text-muted font-medium mt-1">
                      <span>Under Review: {tasks.filter(t => t.status === 'under_review' || t.status === 'review').length}</span>
                      <span className="badge badge-success text-3xs" style={{ padding: '2px 6px' }}>Productive</span>
                    </div>
                  </div>

                  <div className="kpi-card-employees">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="kpi-label">Team Members</span>
                        <span className="kpi-value block mt-1">{staff?.length || 0}</span>
                      </div>
                      <div className="kpi-card-icon-wrapper purple">
                        <Users size={20} />
                      </div>
                    </div>
                    
                    <div className="avatars-stack mt-2" style={{ paddingLeft: '4px' }}>
                      {staff?.slice(0, 4).map(s => (
                        <div key={s._id} className="avatar avatar-xs" style={{ background: getAvatarColor(s._id), border: '2px solid white', marginLeft: '-6px' }} title={s.name}>
                          {getInitials(s.name)}
                        </div>
                      ))}
                      {staff?.length > 4 && (
                        <div className="avatar avatar-xs font-bold text-3xs text-muted" style={{ background: 'var(--gray-100)', border: '2px solid white', marginLeft: '-6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          +{staff.length - 4}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between text-2xs text-muted font-medium mt-1">
                      <span>Roster Active</span>
                      <span>Availability: 100%</span>
                    </div>
                  </div>

                  <div className="kpi-card-reviews">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="kpi-label">Pending Reviews</span>
                        <span className="kpi-value block mt-1" style={{ color: 'var(--accent)' }}>{pendingReviews.length}</span>
                      </div>
                      <div className="kpi-card-icon-wrapper orange">
                        <Clock size={20} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="pulse-dot" style={{ backgroundColor: 'var(--accent)' }} />
                      <span className="text-2xs font-bold text-accent">Needs Action Urgent</span>
                    </div>
                    <div className="flex justify-between text-2xs text-muted font-medium mt-1">
                      <span>Approval Queue: {pendingReviews.length}</span>
                      <span className="text-accent font-semibold">Priority: High</span>
                    </div>
                  </div>
                </>
              }
          </div>

          {isSuperAdmin && (
            isLoading ? (
              <div className="card mt-6">
                <div className="card-header">
                  <div className="skeleton skeleton-title" style={{ width: '30%' }}></div>
                </div>
                <div className="card-body">
                  <div className="skeleton" style={{ height: 350, borderRadius: 'var(--r-lg)' }}></div>
                </div>
              </div>
            ) : (
              <>
              {/* Financial Overview — authoritative backend buckets, premium hierarchy */}
              <div className="card animate-slide-up" style={{ marginTop: '16px', opacity: filterLoading ? 0.7 : 1 }}>
                <div className="card-header" style={{ paddingBottom: '12px' }}>
                  <div>
                    <h3 className="section-title">Financial Overview</h3>
                    <p className="section-subtitle">Confirmed after verified payment · Pending is not revenue · Failed/Abandoned never counts {filterLoading ? '· Updating…' : ''}</p>
                  </div>
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Live · {activeFilter}</span>
                </div>
                <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div style={{ background: 'var(--gray-900)', color: 'var(--white)', borderRadius: '12px', padding: '16px', border: '1px solid var(--gray-800)' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Confirmed Budget</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '6px' }}>{inr(confirmedRevenue)}</div>
                    <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>Verified & captured · {displayAnalytics?.successfulOrders ?? ''} {displayAnalytics?.successfulOrders ? 'orders' : ''}</div>
                  </div>
                  <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--gray-500)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Pending</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '6px' }}>{inr(pendingRevenue)}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--warning)', marginTop: '4px', fontWeight: 500 }}>Enquiry/booking only · {displayAnalytics?.outstandingCount ?? 0} pending</div>
                  </div>
                  <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--gray-500)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Outstanding</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '6px' }}>{inr(outstandingSum)}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--gray-500)', marginTop: '4px' }}>Avg deal {inr(averageDealValue)}</div>
                  </div>
                  <div style={{ background: 'var(--gray-50)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--gray-500)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Failed</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '6px', color: 'var(--error)' }}>{inr(failedRevenue)}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--gray-500)', marginTop: '4px' }}>{displayAnalytics?.failedCount ?? 0} failed · not revenue</div>
                  </div>
                  <div style={{ background: 'var(--gray-50)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--gray-500)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Abandoned</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '6px', color: 'var(--gray-600)' }}>{inr(abandonedRevenue)}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--gray-500)', marginTop: '4px' }}>{displayAnalytics?.abandonedCount ?? 0} started, never paid</div>
                  </div>
                  <div style={{ background: 'var(--gray-50)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--gray-500)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Refunded</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '6px' }}>{inr(refundedRevenue)}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--gray-500)', marginTop: '4px' }}>{displayAnalytics?.refundedCount ?? 0} refunded</div>
                  </div>
                </div>
                <div style={{ padding: '12px 16px 16px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.72rem', color: 'var(--gray-500)', flexWrap: 'wrap', borderTop: '1px solid var(--gray-100)', marginTop: '12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gray-300)', display: 'inline-block' }}></span>Enquiry → Pending</span>
                  <span>→</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block' }}></span>Started → Pending</span>
                  <span>→</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 700 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }}></span>Verified → Confirmed</span>
                  <span style={{ color: 'var(--gray-400)' }}>· Timeline uses verified timestamp, not booking date</span>
                </div>
              </div>
              <div className="revenue-executive-center animate-slide-up" style={{ marginTop: '16px' }}>
                {/* TOP BAR: Revenue Analytics Workspace */}
                <div className="card-header revenue-card-header">
                  <div>
                    <h3 className="section-title">Revenue Command Center</h3>
                    <p className="section-subtitle">Enterprise business intelligence and live cash flow trajectory</p>
                  </div>
                  <div className="dashboard-header-right">
                    <div className="header-meta-badge live-sync-badge">
                      <span className="pulse-dot" />
                      <span>Live Syncing</span>
                    </div>
                    <div className="header-meta-badge">
                      <span>Last Updated: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="segmented-controls-wrapper">
                      {['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Quarter', 'Year', 'Previous Year', 'Custom'].map(f => (
                        <button
                          key={f}
                          className={`segmented-control-btn ${activeFilter === f ? 'active' : ''}`}
                          onClick={() => {
                            if (f === 'Custom') {
                              setShowCustomModal(true);
                            } else {
                              setActiveFilter(f);
                            }
                          }}
                        >
                          {f.replace('Last ', '')}
                        </button>
                      ))}
                    </div>
                    <button className="chart-control-btn flex items-center gap-1">
                      <BarChart3 size={12} /> Export
                    </button>
                  </div>
                </div>

                {/* ROW 1: Executive KPI Summary — authoritative, no duplicates */}
                <div className="rev-kpi-ribbon">
                  <div className="rev-kpi-subcard" style={{ borderLeft: '3px solid var(--success)' }}>
                    <div className="rev-kpi-subcard-header">
                      <span className="rev-kpi-subcard-label">Confirmed</span>
                      <TrendingUp size={14} className="text-success" />
                    </div>
                    <span className="rev-kpi-subcard-value">{formattedRevenue}</span>
                    <div className="rev-kpi-subcard-footer">
                      <span className="rev-kpi-subcard-trend up">Verified</span>
                    </div>
                  </div>

                  <div className="rev-kpi-subcard">
                    <div className="rev-kpi-subcard-header">
                      <span className="rev-kpi-subcard-label">Pending</span>
                      <Clock size={14} className="text-warning" />
                    </div>
                    <span className="rev-kpi-subcard-value">{formattedPending}</span>
                    <div className="rev-kpi-subcard-footer">
                      <span className="rev-kpi-subcard-trend down">Not revenue</span>
                    </div>
                  </div>

                  <div className="rev-kpi-subcard">
                    <div className="rev-kpi-subcard-header">
                      <span className="rev-kpi-subcard-label">Outstanding</span>
                      <Clock size={14} className="text-warning" />
                    </div>
                    <span className="rev-kpi-subcard-value">{formattedOutstanding}</span>
                    <div className="rev-kpi-subcard-footer">
                      <span className="rev-kpi-subcard-trend down">Collectable</span>
                    </div>
                  </div>

                  <div className="rev-kpi-subcard" style={{ opacity: 0.95 }}>
                    <div className="rev-kpi-subcard-header">
                      <span className="rev-kpi-subcard-label">Failed</span>
                      <AlertTriangle size={14} style={{ color: 'var(--error)' }} />
                    </div>
                    <span className="rev-kpi-subcard-value" style={{ color: 'var(--error)' }}>{formattedFailed}</span>
                    <div className="rev-kpi-subcard-footer">
                      <span className="rev-kpi-subcard-trend down">Never confirmed</span>
                    </div>
                  </div>

                  <div className="rev-kpi-subcard">
                    <div className="rev-kpi-subcard-header">
                      <span className="rev-kpi-subcard-label">Avg Deal Value</span>
                      <Briefcase size={14} className="text-info" />
                    </div>
                    <span className="rev-kpi-subcard-value">{formattedAverageDeal}</span>
                    <div className="rev-kpi-subcard-footer">
                      <span className="rev-kpi-subcard-trend up">Calculated</span>
                    </div>
                  </div>

                  <div className="rev-kpi-subcard">
                    <div className="rev-kpi-subcard-header">
                      <span className="rev-kpi-subcard-label">Active Projects</span>
                      <ClipboardList size={14} className="text-info" />
                    </div>
                    <span className="rev-kpi-subcard-value">{activeProjects.length}</span>
                    <div className="rev-kpi-subcard-footer">
                      <span className="rev-kpi-subcard-trend up">In Production</span>
                    </div>
                  </div>

                  <div className="rev-kpi-subcard">
                    <div className="rev-kpi-subcard-header">
                      <span className="rev-kpi-subcard-label">Pending Tasks</span>
                      <CheckSquare size={14} className="text-accent" />
                    </div>
                    <span className="rev-kpi-subcard-value">{tasks.filter(t => t.status !== 'completed' && t.status !== 'approved').length}</span>
                    <div className="rev-kpi-subcard-footer">
                      <span className="rev-kpi-subcard-trend up">Assigned</span>
                    </div>
                  </div>

                  <div className="rev-kpi-subcard">
                    <div className="rev-kpi-subcard-header">
                      <span className="rev-kpi-subcard-label">Overdue Tasks</span>
                      <Clock size={14} className="text-warning" />
                    </div>
                    <span className="rev-kpi-subcard-value">{overdueTasksCount}</span>
                    <div className="rev-kpi-subcard-footer">
                      <span className="rev-kpi-subcard-trend down">Requires Action</span>
                    </div>
                  </div>
                </div>

                {/* ROW 2: Three Column Analytics Workspace */}
                <div className="rev-analytics-workspace">
                  {/* LEFT (25%) */}
                  <div className="rev-left-panel">
                    <div className="rev-panel-card">
                      <h4>Revenue Summary</h4>
                      <div className="rev-panel-insight-item">
                        <span className="rev-panel-insight-label">Top Service</span>
                        <span className="rev-panel-insight-val" style={{ fontSize: '11px' }}>{bestCategory}</span>
                      </div>
                      <div className="rev-panel-insight-item">
                        <span className="rev-panel-insight-label">Active Projects</span>
                        <span className="rev-panel-insight-val" style={{ color: 'var(--accent)' }}>{activeProjects.length} active</span>
                      </div>
                      <div className="rev-panel-insight-item">
                        <span className="rev-panel-insight-label">Best Month</span>
                        <span className="rev-panel-insight-val">{highestMonth}</span>
                      </div>
                      <div className="rev-panel-insight-item">
                        <span className="rev-panel-insight-label">Completed Projects</span>
                        <span className="rev-panel-insight-val" style={{ color: 'var(--success)' }}>{projects.filter(p => p.status === 'completed').length} completed</span>
                      </div>
                    </div>
                  </div>

                  {/* CENTER (50%) */}
                  <div className="rev-center-panel" style={{ minHeight: '340px' }}>
                    <div style={{ position: 'relative', height: '100%', padding: '24px 24px 16px 8px', flex: 1 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dynamicChartData}>
                          <defs>
                            <linearGradient id="overviewRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} axisLine={false} tickLine={false} />
                          <YAxis stroke="#9CA3AF" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v)=> `₹${(v/1000).toFixed(0)}k`} />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: '1px solid var(--gray-200)',
                              boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                              background: 'var(--white)'
                            }}
                            formatter={(value, name, props) => {
                              const p = props?.payload;
                              if (p && (p.confirmed !== undefined || p.pending !== undefined)) {
                                return [`Confirmed ₹${(p.confirmed||0).toLocaleString('en-IN')} · Pending ₹${(p.pending||0).toLocaleString('en-IN')} · Failed ₹${(p.failed||0).toLocaleString('en-IN')}`, 'Budget'];
                              }
                              return [`₹${Number(value).toLocaleString('en-IN')}`, 'Confirmed'];
                            }}
                            labelFormatter={(label) => `${label} · ${activeFilter}`}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="var(--accent)" fillOpacity={1} fill="url(#overviewRevenueGrad)" strokeWidth={2.5} dot={dynamicChartData.length <= 7 ? { r: 3, strokeWidth: 2 } : false} activeDot={{ r: 5 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                      {dynamicChartData.every(d => d.revenue === 0) && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                          <BarChart3 size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '0.5rem' }} />
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No revenue data available for this timeframe</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT (25%) */}
                  <div className="rev-right-panel">
                    <div className="rev-panel-card" style={{ gap: '8px', padding: '16px' }}>
                      <h4>Real-time Operations</h4>
                      <div className="rev-mini-card">
                        <div className="rev-mini-card-left">
                          <span className="rev-mini-card-label">Revenue Today</span>
                          <span className="rev-mini-card-val">{analytics?.revenueToday > 0 ? `₹${analytics.revenueToday.toLocaleString('en-IN')}` : '₹0'}</span>
                        </div>
                        <Palette size={14} className="text-accent" />
                      </div>
                      <div className="rev-mini-card">
                        <div className="rev-mini-card-left">
                          <span className="rev-mini-card-label">This Week</span>
                          <span className="rev-mini-card-val">
                            {filteredProjects.length > 0 ? `₹${filteredProjects.reduce((s, p) => s + (p.order?.amount || 0), 0).toLocaleString('en-IN')}` : '₹0'}
                          </span>
                        </div>
                        <TrendingUp size={14} className="text-success" />
                      </div>
                      <div className="rev-mini-card">
                        <div className="rev-mini-card-left">
                          <span className="rev-mini-card-label">Pending Reviews</span>
                          <span className="rev-mini-card-val">{projects.filter(p => p.status === 'review').length} billing</span>
                        </div>
                        <Clock size={14} className="text-warning" />
                      </div>
                      <div className="rev-mini-card">
                        <div className="rev-mini-card-left">
                          <span className="rev-mini-card-label">Top Customer</span>
                          <span className="rev-mini-card-val" style={{ fontSize: '12px' }}>
                            {projects.find(p => p.client?.name)?.client?.name || 'No customer data'}
                          </span>
                        </div>
                        <Users size={14} className="text-purple" />
                      </div>
                      <div className="rev-mini-card">
                        <div className="rev-mini-card-left">
                          <span className="rev-mini-card-label">Operations Status</span>
                          <span className="rev-mini-card-val" style={{ color: 'var(--success)', fontSize: '13px' }}>
                            {projects.length > 0 ? 'Active' : 'Idle'}
                          </span>
                        </div>
                        <Palette size={14} className="text-success" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* UNDER THE CHART: Information-Dense Section Grid */}
                <div className="section-grid-3" style={{ marginTop: '8px' }}>
                  <div className="card" style={{ padding: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--gray-800)', marginBottom: '12px' }}>Service Breakdown</h4>
                    <div className="flex-col gap-2">
                      {Object.entries(categoryRevenueMap).slice(0, 4).map(([cat, val]) => {
                        const share = confirmedRevenue > 0 ? Math.round((val / confirmedRevenue) * 100) : 0;
                        return (
                          <div key={cat} className="category-analytic-row">
                            <div className="category-analytic-meta">
                              <span className="text-xs font-semibold">{cat}</span>
                              <span className="text-xs font-bold text-accent">₹{(val/100000).toFixed(1)}L ({share}%)</span>
                            </div>
                            <div className="category-progress-track">
                              <div className="category-progress-fill" style={{ width: `${share}%`, background: 'var(--accent)' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="card" style={{ padding: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--gray-800)', marginBottom: '12px' }}>Top Client Contributions</h4>
                    <div className="flex-col gap-2">
                      {projects.filter(p => p.client?.name && p.order?.amount).slice(0, 4).map(p => {
                        const share = confirmedRevenue > 0 ? Math.round((p.order.amount / confirmedRevenue) * 100) : 0;
                        return (
                          <div key={p._id} className="employee-status-row">
                            <div className="employee-status-left">
                              <div className="avatar avatar-xs" style={{ background: getAvatarColor(p.client?._id) }}>
                                {getInitials(p.client?.name)}
                              </div>
                              <span className="text-xs font-semibold" style={{ marginLeft: 8 }}>{p.client?.name}</span>
                            </div>
                            <span className="text-xs font-bold text-accent">₹{(p.order.amount/1000).toFixed(0)}k ({share}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="card" style={{ padding: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--gray-800)', marginBottom: '12px' }}>Monthly Intelligence</h4>
                    <div className="flex-col gap-3">
                      <div className="flex items-start gap-2">
                        <span className="status-pill active" style={{ marginTop: 4 }} />
                        <div className="flex-col">
                          <span className="text-xs font-bold">Billing Acceleration</span>
                          <span className="text-2xs text-muted">Service tiers grew by 18% month over month.</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="status-pill pending" style={{ marginTop: 4 }} />
                        <div className="flex-col">
                          <span className="text-xs font-bold">Payouts Under Review</span>
                          <span className="text-2xs text-muted">{projects.filter(p => p.status === 'review').length} client deliverables are awaiting payouts.</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="status-pill inactive" style={{ marginTop: 4 }} />
                        <div className="flex-col">
                          <span className="text-xs font-bold">Category Distribution</span>
                          <span className="text-2xs text-muted"><strong>{bestCategory}</strong> remains your top grossing segment.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {showCustomModal && (
                  <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(4px)'
                  }}>
                    <div className="card animate-fade-in" style={{ width: '320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--white)', borderRadius: '16px', border: '1px solid var(--gray-200)' }}>
                      <h3 className="section-title" style={{ fontSize: '16px', fontWeight: 800 }}>Custom Date Range</h3>
                      <div className="flex-col gap-1" style={{ display: 'flex', flexDirection: 'column' }}>
                        <label className="text-xs font-semibold text-gray-500" style={{ marginBottom: 4 }}>Start Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={customRange.startDate}
                          onChange={e => setCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                          style={{ padding: '8px 12px', border: '1px solid var(--gray-200)', borderRadius: '8px' }}
                        />
                      </div>
                      <div className="flex-col gap-1" style={{ display: 'flex', flexDirection: 'column' }}>
                        <label className="text-xs font-semibold text-gray-500" style={{ marginBottom: 4 }}>End Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={customRange.endDate}
                          onChange={e => setCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                          style={{ padding: '8px 12px', border: '1px solid var(--gray-200)', borderRadius: '8px' }}
                        />
                      </div>
                      <div className="flex gap-2 justify-end mt-4" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowCustomModal(false)} style={{ padding: '6px 12px', border: '1px solid var(--gray-200)', borderRadius: '8px', background: 'transparent' }}>Cancel</button>
                        <button
                          className="btn btn-accent btn-sm"
                          disabled={!customRange.startDate || !customRange.endDate}
                          onClick={() => {
                            setActiveFilter('Custom');
                            setShowCustomModal(false);
                          }}
                          style={{ padding: '6px 12px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
                        >
                          Apply Range
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </>
            )
          )}

          {isSuperAdmin && analytics?.referralStats && (
            <div className="card mt-6 animate-slide-up" style={{ padding: '20px' }}>
              <div className="card-header" style={{ padding: 0, marginBottom: '16px' }}>
                <div>
                  <h3 className="section-title">Referral Performance</h3>
                  <p className="section-subtitle">Partner campaign leads, conversion and attributed revenue</p>
                </div>
              </div>
              <div className="rev-kpi-ribbon">
                <div className="rev-kpi-subcard">
                  <div className="rev-kpi-subcard-header">
                    <span className="rev-kpi-subcard-label">Referral Leads</span>
                    <UserCheck size={14} className="text-accent" />
                  </div>
                  <span className="rev-kpi-subcard-value">{analytics.referralStats.totalReferralLeads}</span>
                  <div className="rev-kpi-subcard-footer">
                    <span className="rev-kpi-subcard-trend up">Converted: {analytics.referralStats.convertedReferralLeads}</span>
                  </div>
                </div>
                <div className="rev-kpi-subcard">
                  <div className="rev-kpi-subcard-header">
                    <span className="rev-kpi-subcard-label">Referral Conversion</span>
                    <TrendingUp size={14} className="text-success" />
                  </div>
                  <span className="rev-kpi-subcard-value">{analytics.referralStats.referralConversionRate}%</span>
                  <div className="rev-kpi-subcard-footer">
                    <span className="rev-kpi-subcard-trend up">Lead → Project</span>
                  </div>
                </div>
                <div className="rev-kpi-subcard">
                  <div className="rev-kpi-subcard-header">
                    <span className="rev-kpi-subcard-label">Top Referral Partner</span>
                    <Users size={14} className="text-purple" />
                  </div>
                  <span className="rev-kpi-subcard-value" style={{ fontSize: '15px' }}>{analytics.referralStats.topReferralPartner?.name || '—'}</span>
                  <div className="rev-kpi-subcard-footer">
                    <span className="rev-kpi-subcard-trend up">{analytics.referralStats.topReferralPartner?.leads || 0} leads</span>
                  </div>
                </div>
                <div className="rev-kpi-subcard">
                  <div className="rev-kpi-subcard-header">
                    <span className="rev-kpi-subcard-label">Top Campaign</span>
                    <Palette size={14} className="text-accent" />
                  </div>
                  <span className="rev-kpi-subcard-value" style={{ fontSize: '15px' }}>{analytics.referralStats.topPerformingCampaign?.name || '—'}</span>
                  <div className="rev-kpi-subcard-footer">
                    <span className="rev-kpi-subcard-trend up">{analytics.referralStats.topPerformingCampaign?.leads || 0} leads</span>
                  </div>
                </div>
                <div className="rev-kpi-subcard">
                  <div className="rev-kpi-subcard-header">
                    <span className="rev-kpi-subcard-label">Referral Revenue</span>
                    <Briefcase size={14} className="text-info" />
                  </div>
                  <span className="rev-kpi-subcard-value">₹{(analytics.referralStats.referralRevenue / 1000).toFixed(0)}K</span>
                  <div className="rev-kpi-subcard-footer">
                    <span className="rev-kpi-subcard-trend up">Converted projects</span>
                  </div>
                </div>
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
              <div className="card">
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
                        <div key={p._id} className="project-activity-item">
                          <div className="project-avatar-logo" style={{ background: getAvatarColor(p.client?._id), color: 'var(--white)' }}>
                            {getInitials(p.client?.name || p.name)}
                          </div>
                          <div className="activity-content" style={{ marginLeft: 16, flex: 1 }}>
                            <div className="flex items-center justify-between">
                              <span className="activity-text"><strong>{p.name}</strong></span>
                              <span className={getStatusBadge(p.status)}>{p.status?.replace('_', ' ')}</span>
                            </div>
                            <div className="project-meta-info">
                              <span className="project-meta-badge-item">
                                <span className={`status-pill ${p.priority === 'high' || p.priority === 'urgent' ? 'error' : 'pending'}`} />
                                {p.priority || 'Medium'} Priority
                              </span>
                              {p.client?.name && (
                                <span className="project-meta-badge-item text-muted">
                                  Client: {p.client.name}
                                </span>
                              )}
                              {p.estimatedCompletion && (
                                <span className="project-meta-badge-item text-muted">
                                  Due: {new Date(p.estimatedCompletion).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between items-center mt-3">
                              <div className="progress-track" style={{ width: '60%', height: 4, background: 'var(--gray-150)' }}>
                                <div
                                  className="progress-bar-fill"
                                  style={{
                                    width: `${p.status === 'completed' ? 100 : p.status === 'in_progress' ? 60 : 20}%`,
                                    background: p.status === 'completed' ? 'var(--success)' : 'var(--accent)'
                                  }}
                                />
                              </div>
                              <div className="avatars-stack">
                                {p.assignments?.slice(0, 3).map(a => {
                                  const emp = a.employee;
                                  return (
                                    <div
                                      key={emp?._id || Math.random()}
                                      className="avatars-stack-item"
                                      style={{ background: getAvatarColor(emp?._id) }}
                                      title={emp?.name || 'Staff'}
                                    >
                                      {getInitials(emp?.name)}
                                    </div>
                                  );
                                })}
                                {p.assignments?.length > 3 && (
                                  <div className="avatars-stack-item" style={{ background: 'var(--gray-400)', color: 'var(--white)' }}>
                                    +{p.assignments.length - 3}
                                  </div>
                                )}
                              </div>
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
                          <div key={n._id} className={`activity-item notif-item ${!n.isRead ? 'unread' : ''}`}>
                            <div
                              className="activity-icon"
                              style={{ background: `${n.color || dotColor}12`, color: n.color || dotColor }}
                            >
                              <Bell size={15} />
                            </div>
                            <div className="activity-content">
                              <div className="flex items-center justify-between">
                                <span className="activity-text"><strong>{n.title}</strong></span>
                                {n.priority && (
                                  <span className={`badge text-3xs ${n.priority === 'high' || n.priority === 'urgent' ? 'badge-error' : 'badge-gray'}`}>
                                    {n.priority}
                                  </span>
                                )}
                              </div>
                              <p className="activity-desc text-muted" style={{ fontSize: '13px', marginTop: 4, marginBottom: 4 }}>
                                {n.message}
                              </p>
                              <span className="activity-time" style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                                {formatTimeAgo ? formatTimeAgo(n.createdAt) : new Date(n.createdAt).toLocaleString()}
                              </span>
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
                <div className="card">
                  <div className="card-header">
                    <h3 className="section-title">Projects by Category</h3>
                  </div>
                  <div className="card-body" style={{ padding: '20px 24px' }}>
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
                        {Object.entries(projectsByCategory).map(([cat, counts]) => {
                          const percentage = counts.total > 0 ? Math.round((counts.active / counts.total) * 100) : 0;
                          return (
                            <div key={cat} className="category-analytic-row">
                              <div className="category-analytic-meta">
                                <div className="flex items-center gap-2">
                                  {getCategoryIcon(cat)}
                                  <span className="text-sm font-semibold text-gray-800">{cat}</span>
                                </div>
                                <span className="text-xs font-bold text-gray-600">{percentage}% active</span>
                              </div>
                              <div className="category-progress-track">
                                <div
                                  className="category-progress-fill"
                                  style={{
                                    width: `${percentage}%`,
                                    background: 'var(--accent)'
                                  }}
                                />
                              </div>
                              <div className="flex justify-between text-2xs text-muted" style={{ marginTop: 2 }}>
                                <span>{counts.active} Active</span>
                                <span>{counts.total} Total</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="section-title">Employee Status</h3>
                  </div>
                  <div className="card-body" style={{ padding: '20px 24px' }}>
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
                        {staff.slice(0, 5).map(s => {
                          const status = s.status || 'active';
                          const statusDotClass = status === 'active' ? 'online' : status === 'pending' ? 'busy' : 'offline';
                          return (
                            <div key={s._id} className="employee-status-row">
                              <div className="employee-status-left">
                                <div className="employee-status-avatar-wrapper">
                                  <div className="avatar avatar-xs" style={{ background: getAvatarColor(s._id) }}>
                                    {getInitials(s.name)}
                                  </div>
                                  <span className={`employee-status-pulse ${statusDotClass}`} />
                                </div>
                                <div className="flex-col" style={{ marginLeft: 10 }}>
                                  <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                                  <span className="text-2xs text-muted">{s.department || 'Production'}</span>
                                </div>
                              </div>
                              <span className={`badge text-2xs ${status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                                {status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="section-title">Department Workload</h3>
                  </div>
                  <div className="card-body" style={{ padding: '20px 24px' }}>
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
                        {Object.entries(projectsByDepartment).map(([dept, count]) => {
                          const maxCount = Math.max(...Object.values(projectsByDepartment));
                          const loadPercentage = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                          const loadColor = loadPercentage > 75 ? 'var(--error)' : loadPercentage > 40 ? 'var(--warning)' : 'var(--success)';
                          return (
                            <div key={dept} className="workload-widget-row">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-gray-700">{dept}</span>
                                <span className="font-bold" style={{ color: loadColor }}>{loadPercentage}% load</span>
                              </div>
                              <div className="category-progress-track" style={{ marginTop: 2, marginBottom: 2 }}>
                                <div
                                  className="category-progress-fill"
                                  style={{
                                    width: `${loadPercentage}%`,
                                    background: loadColor
                                  }}
                                />
                              </div>
                              <div className="flex justify-between text-2xs text-muted">
                                <span>{count} projects assigned</span>
                                <span>Capacity: {10 - count > 0 ? `${10 - count} slots` : 'Full'}</span>
                              </div>
                            </div>
                          );
                        })}
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
          <div className="dashboard-header-container">
            <div className="dashboard-header-left">
              <h2>{activeGreeting}, {resolvedName} 👋</h2>
              <p>You have {myProjects.length} active assignment{myProjects.length !== 1 ? 's' : ''} to review today</p>
            </div>
            <div className="dashboard-header-right">
              <div className="header-meta-badge">
                <CalendarDays size={14} className="text-muted" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="header-meta-badge live-sync-badge">
                <span className="pulse-dot" />
                <span>Live Syncing</span>
              </div>
            </div>
          </div>

          {renderEmployeeKpi()}

          <div className="mt-6">
            <div className="section-header">
              <h3 className="section-title">My Assigned Projects</h3>
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

          <div className="mt-6">
            <div className="section-header">
              <h3 className="section-title">My Assigned Tasks</h3>
              <span className="text-xs text-muted">{myTasks.length} task{myTasks.length !== 1 ? 's' : ''}</span>
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
                      <div className="skeleton skeleton-text" style={{ width: '40%', marginTop: 4 }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : myTasks.length === 0 ? (
              <div className="card">
                <div className="card-body">
                  <div className="empty-state">
                    <div className="empty-icon">
                      <CheckSquare size={24} />
                    </div>
                    <p className="empty-title">No tasks assigned</p>
                    <p className="empty-desc">Your assigned tasks will appear here once assigned by a manager or admin</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="emp-project-grid">
                {myTasks.map(t => (
                  <div key={t._id} className="emp-project-card animate-slide-up">
                    <div className="emp-project-card-top">
                      <div className="emp-project-card-title">{t.name}</div>
                      <div className="flex items-center gap-2">
                        <span className={getPriorityBadge(t.priority)}>{t.priority}</span>
                        {localAccepted[t._id] === 'accepted' || (!localAccepted[t._id] && (t.status === 'accepted' || t.status === 'in_progress' || t.status === 'completed' || t.status === 'approved' || t.status === 'submitted')) ? (
                          <span className="badge badge-success">Accepted</span>
                        ) : localAccepted[t._id] === 'rejected' || (!localAccepted[t._id] && t.status === 'rejected') ? (
                          <span className="badge badge-error">Rejected</span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                              className="btn btn-accent btn-xs"
                              onClick={() => handleAcceptTask(t._id)}
                              disabled={acceptingId === t._id}
                            >
                              Accept
                            </button>
                            <button
                              className="btn btn-ghost btn-xs"
                              style={{ color: 'var(--error, #dc2626)', border: '1px solid var(--gray-200, #e5e7eb)' }}
                              onClick={() => handleRejectTask(t._id)}
                              disabled={acceptingId === t._id}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="emp-project-card-body">
                      <div className="emp-project-card-details">
                        {t.project?.name && (
                          <div className="emp-project-detail">
                            <span className="emp-detail-label">Project</span>
                            <span className="emp-detail-value">{t.project.name}</span>
                          </div>
                        )}
                        {t.deadline && (
                          <div className="emp-project-detail">
                            <span className="emp-detail-label">Deadline</span>
                            <span className="emp-detail-value">{formatDate(t.deadline)}</span>
                          </div>
                        )}
                      </div>
                      {t.description && (
                        <div className="emp-project-desc">
                          {t.description}
                        </div>
                      )}
                      {t.project?.driveShareableLink && (
                        <div style={{ marginTop: 8 }}>
                          <a
                            href={t.project.driveShareableLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-accent btn-xs"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <ExternalLink size={12} />
                            Open Drive
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
            user.role !== 'EMPLOYEE' && (
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
            )
          )}
        </div>
      )}
    </div>
  );
}
