import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Download,
  Clock,
  CheckCircle2,
  Circle,
  MessageCircle,
  Send,
  Play,
  Pause,
  StopCircle,
  Plus,
  X,
  Briefcase,
  UserCheck,
  ExternalLink,
  CalendarDays,
  User,
  AlertTriangle,
  FileText,
  FolderOpen,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';

function getStatusBadge(status) {
  switch (status) {
    case 'completed': case 'approved': return 'badge badge-success';
    case 'in_progress': case 'assigned': return 'badge badge-info';
    case 'under_review': case 'submitted': case 'review': return 'badge badge-warning';
    case 'new': case 'pending': return 'badge badge-accent';
    case 'on_hold': return 'badge badge-purple';
    case 'cancelled': return 'badge badge-error';
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

const CATEGORY_TABS = ['Short Form Editing', 'Podcast Editing', 'Marketing', 'Website Development', 'All'];

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

export default function ProjectsPage({
  user, projects, tasks, staff,
  selectedCategoryFilter, setSelectedCategoryFilter,
  projectSearch, setProjectSearch,
  projectStatusFilter, setProjectStatusFilter,
  projectPriorityFilter, setProjectPriorityFilter,
  selectedTask, setSelectedTask,
  reviewDecision, setReviewDecision,
  feedback, setFeedback,
  subUrl, setSubUrl,
  assigneeId, setAssigneeId,
  activeTaskDetails, setActiveTaskDetails,
  taskCommentText, setTaskCommentText,
  taskEstHours, setTaskEstHours,
  taskActHours, setTaskActHours,
  taskDepId, setTaskDepId,
  selectedFinalReviewProject, setSelectedFinalReviewProject,
  finalReviewDecision, setFinalReviewDecision,
  finalReviewFeedback, setFinalReviewFeedback,
  activeChatProj, setActiveChatProj,
  chatMessages, chatInput, setChatInput,
  chatEndRef,
  handleTaskAssignment,
  handleTaskSubmission,
  handleTaskReview,
  handleConfirmSuggestion,
  handleAcceptProject,
  handleTimeTracking,
  handleAddTaskComment,
  handleAddDependency,
  handleSaveHours,
  handleFinalReviewSubmit,
  handleExportCSV,
  handlePostChat,
  addToast,
  formatTimeAgo
}) {
  const [acceptingId, setAcceptingId] = useState(null);
  const [localAccepted, setLocalAccepted] = useState({});

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';
  const isEmployee = user?.role === 'EMPLOYEE';
  const userId = user?._id?.toString();

  const deduplicatedProjects = useMemo(() => {
    const seen = new Set();
    return projects.filter(p => {
      const key = p._id?.toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [projects]);

  const filteredProjects = useMemo(() => deduplicatedProjects.filter(p => {
    const matchesCategory = selectedCategoryFilter === 'All' || (p.category || 'Short Form Editing') === selectedCategoryFilter;
    const matchesSearch = p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.client?.name || '').toLowerCase().includes(projectSearch.toLowerCase());
    const matchesStatus = projectStatusFilter === 'all' || p.status === projectStatusFilter;
    const matchesPriority = projectPriorityFilter === 'all' || p.priority === projectPriorityFilter;
    return matchesCategory && matchesSearch && matchesStatus && matchesPriority;
  }), [deduplicatedProjects, selectedCategoryFilter, projectSearch, projectStatusFilter, projectPriorityFilter]);

  const tasksByProject = useMemo(() => {
    const map = {};
    deduplicatedProjects.forEach(p => {
      map[p._id] = tasks.filter(t => t.project?._id === p._id || t.project === p._id);
    });
    return map;
  }, [deduplicatedProjects, tasks]);

  const kanbanTodo = filteredProjects.filter(p => p.status === 'new' || p.status === 'pending');
  const kanbanInProgress = filteredProjects.filter(p => p.status === 'in_progress');
  const kanbanCompleted = filteredProjects.filter(p => p.status === 'completed' || p.status === 'approved');

  const handleAccept = useCallback(async (projectId) => {
    setAcceptingId(projectId);
    try {
      await axios.post(`/api/projects/${projectId}/accept`);
      setLocalAccepted(prev => ({ ...prev, [projectId]: true }));
      addToast('Project accepted successfully!', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to accept.', 'error');
    } finally {
      setAcceptingId(null);
    }
  }, [addToast]);

  const kanbanCard = (project) => {
    const projectTasks = tasksByProject[project._id] || [];
    const employees = project.employees || project.editors || [];
    const emp = employees[0];
    const initials = emp ? getInitials(emp.name) : null;
    const empColor = emp ? getAvatarColor(emp._id) : null;

    return (
      <div
        key={project._id}
        className="kanban-card"
        onClick={() => setActiveTaskDetails(project)}
      >
        <div className="kanban-card-title">{project.name}</div>
        {project.description && (
          <div className="kanban-card-desc">
            {project.description.length > 80 ? project.description.slice(0, 80) + '...' : project.description}
          </div>
        )}
        <div className="kanban-card-meta">
          <span className={getPriorityBadge(project.priority)}>
            {project.priority || 'medium'}
          </span>
          <span className={getStatusBadge(project.status)}>
            {project.status?.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="kanban-card-footer">
          <span className="text-xs text-muted flex items-center gap-1">
            <CalendarDays size={11} />
            {formatDate(project.estimatedCompletion)}
          </span>
          {project.manager?.name && (
            <span className="text-2xs text-muted" title={project.manager.name}>
              {getInitials(project.manager.name)}
            </span>
          )}
        </div>
        {projectTasks.length > 0 && (
          <div className="mt-1">
            <div className="kanban-progress">
              <div
                className="kanban-progress-fill"
                style={{ width: `${Math.round((projectTasks.filter(t => t.status === 'completed' || t.status === 'approved').length / projectTasks.length) * 100)}%` }}
              />
            </div>
            <span className="text-2xs text-muted mt-1">
              {projectTasks.filter(t => t.status === 'completed' || t.status === 'approved').length}/{projectTasks.length} tasks
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderKanbanColumn = (title, projectsList, icon, color) => (
    <div className="kanban-col">
      <div className="kanban-col-header">
        <div className="flex items-center gap-2">
          {icon}
          <span className="kanban-col-title" style={color ? { color } : undefined}>{title}</span>
        </div>
        <span className="kanban-col-count">{projectsList.length}</span>
      </div>
      {projectsList.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '2rem 1rem',
          background: 'var(--bg-secondary)',
          borderRadius: 12,
          border: '1px solid var(--border)'
        }}>
          <Briefcase size={48} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
            No projects
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 300, margin: '0 auto' }}>
            Projects will appear here when assigned to this stage.
          </p>
        </div>
      ) : (
        projectsList.map(kanbanCard)
      )}
    </div>
  );

  const renderDataCard = (project) => {
    const employees = project.employees || project.editors || [];
    const projectTasks = tasksByProject[project._id] || [];
    const isCancelledOrHold = project.status === 'cancelled' || project.status === 'on_hold';

    const myAssignment = project.assignments?.find(a =>
      (a.employee?._id || a.employee)?.toString() === userId
    );
    const isAcceptedByMe = localAccepted[project._id] ||
      (project.assignmentStatus === 'Accepted' && (project.employeeId?.toString() === userId || project.assignedEmployee?.toString() === userId)) ||
      myAssignment?.accepted;
    const isPendingForMe = !isAcceptedByMe && employees.some(e => (e._id || e)?.toString() === userId);

    const otherAssignments = (project.assignments || []).filter(a =>
      (a.employee?._id || a.employee)?.toString() !== userId
    );

    const progressPercent = projectTasks.length > 0
      ? Math.round((projectTasks.filter(t => t.status === 'completed' || t.status === 'approved').length / projectTasks.length) * 100)
      : 0;

    return (
      <div key={project._id} className="data-card">
        <div className="data-card-header">
          <div className="data-card-title">{project.name}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={getStatusBadge(project.status)}>{project.status?.replace(/_/g, ' ')}</span>
            <span className={getPriorityBadge(project.priority)}>{project.priority}</span>
          </div>
        </div>
        {project.description && (
          <div className="data-card-desc">
            {project.description.length > 100 ? project.description.slice(0, 100) + '...' : project.description}
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          {!isEmployee && project.client?.name && (
            <span className="text-xs text-muted flex items-center gap-1">
              <Briefcase size={12} /> {project.client.name}
            </span>
          )}
          {project.manager?.name && (
            <span className="text-xs text-muted flex items-center gap-1">
              <User size={12} /> {project.manager.name}
            </span>
          )}
          <span className="text-xs text-muted flex items-center gap-1">
            <CalendarDays size={11} />
            {formatDate(project.estimatedCompletion)}
          </span>
          {project.category && (
            <span className="text-xs text-muted flex items-center gap-1">
              <FolderOpen size={11} /> {project.category}
            </span>
          )}
          {project.department && (
            <span className="text-xs text-muted">{project.department}</span>
          )}
        </div>

        {projectTasks.length > 0 && (
          <div className="emp-progress-section">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted">Progress</span>
              <span className="text-xs font-semibold">{progressPercent}%</span>
            </div>
            <div className="kanban-progress">
              <div className="kanban-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}

        <div className="border-top pt-2 mt-2">
          {isEmployee ? (
            <>
              {isAcceptedByMe ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge badge-success">
                    <UserCheck size={11} /> Accepted
                  </span>
                  {project.acceptedAt && (
                    <span className="text-2xs text-muted">on {formatDate(project.acceptedAt)}</span>
                  )}
                  {project.employeeName && (
                    <span className="text-xs text-muted">Assigned to: {project.employeeName}</span>
                  )}
                </div>
              ) : isPendingForMe ? (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleAccept(project._id)}
                  disabled={acceptingId === project._id}
                >
                  {acceptingId === project._id ? (
                    <><span className="spinner-sm" /> Accepting...</>
                  ) : (
                    <><UserCheck size={14} /> Accept Project</>
                  )}
                </button>
              ) : null}
            </>
          ) : null}

          {!isEmployee && employees.length > 0 && (
            <div className="emp-assignments-section">
              {(project.assignments && project.assignments.length > 0 ? project.assignments : employees.map(e => ({
                employee: e,
                accepted: project.assignmentStatus === 'Accepted' && (project.employeeId?.toString() === (e._id || e)?.toString()),
                status: project.assignmentStatus === 'Accepted' && (project.employeeId?.toString() === (e._id || e)?.toString()) ? 'Accepted' : 'Pending'
              }))).filter((a, idx, self) => {
                const eid = (a.employee?._id || a.employee)?.toString();
                return eid && self.findIndex(s => (s.employee?._id || s.employee)?.toString() === eid) === idx;
              }).map(a => {
                const emp = a.employee;
                const eid = (emp?._id || emp)?.toString();
                const isAccepted = a.accepted || a.status === 'Accepted';
                return (
                  <div key={eid || Math.random()} className="emp-assignment-chip">
                    <div className="avatar avatar-xs" style={{ background: getAvatarColor(eid) }}>
                      {getInitials(emp?.name)}
                    </div>
                    <span className="emp-assignment-name">{emp?.name || 'Staff'}</span>
                    <span className={`badge ${isAccepted ? 'badge-success' : 'badge-warning'} text-2xs`}>
                      {isAccepted ? 'Accepted' : 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="data-card-footer">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setActiveTaskDetails(project)}
          >
            <ExternalLink size={14} /> Details
          </button>
          {project.source && (
            <span className="text-2xs text-muted">{project.source}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* ─── Mobile Layout (<768px) ─── */}
      <div className="mobile-only">
        <div className="mobile-filters">
          <div className="tabs mobile-tabs">
            {CATEGORY_TABS.map(tab => (
              <button
                key={tab}
                className={`tab ${selectedCategoryFilter === tab ? 'active' : ''}`}
                onClick={() => setSelectedCategoryFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="search-wrap mobile-search">
            <Search size={16} />
            <input
              className="input input-sm"
              placeholder="Search projects..."
              value={projectSearch}
              onChange={e => setProjectSearch(e.target.value)}
            />
          </div>
          <select
            className="select select-sm mobile-select"
            value={projectStatusFilter}
            onChange={e => setProjectStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="under_review">Under Review</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            className="select select-sm mobile-select"
            value={projectPriorityFilter}
            onChange={e => setProjectPriorityFilter(e.target.value)}
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          {isAdmin && (
            <button className="btn btn-secondary btn-sm mobile-btn" onClick={handleExportCSV}>
              <Download size={14} /> Export
            </button>
          )}
        </div>

        <div className="mb-6">
          <div className="mobile-section">
            <div className="mobile-section-header">
              <div className="mobile-section-header-left">
                <Circle size={16} className="icon-gray" />
                <span className="mobile-section-title">To Do</span>
              </div>
              <span className="mobile-section-count">{kanbanTodo.length}</span>
            </div>
            {kanbanTodo.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <Circle size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No projects in this stage</p>
              </div>
            ) : (
              kanbanTodo.map(kanbanCard)
            )}
          </div>
          <div className="mobile-section">
            <div className="mobile-section-header">
              <div className="mobile-section-header-left">
                <Clock size={16} className="icon-blue" />
                <span className="mobile-section-title">In Progress</span>
              </div>
              <span className="mobile-section-count">{kanbanInProgress.length}</span>
            </div>
            {kanbanInProgress.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <Clock size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No projects in progress</p>
              </div>
            ) : (
              kanbanInProgress.map(kanbanCard)
            )}
          </div>
          <div className="mobile-section">
            <div className="mobile-section-header">
              <div className="mobile-section-header-left">
                <CheckCircle2 size={16} className="icon-green" />
                <span className="mobile-section-title">Completed</span>
              </div>
              <span className="mobile-section-count">{kanbanCompleted.length}</span>
            </div>
            {kanbanCompleted.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <CheckCircle2 size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No completed projects yet</p>
              </div>
            ) : (
              kanbanCompleted.map(kanbanCard)
            )}
          </div>
        </div>

        <div className="section-header">
          <div>
            <h2 className="section-title">All Projects</h2>
            <p className="section-subtitle">{filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found</p>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="card">
            <div style={{
              textAlign: 'center',
              padding: '3rem 1.5rem',
              background: 'var(--bg-secondary)',
              borderRadius: 12,
              border: '1px solid var(--border)'
            }}>
              <Briefcase size={48} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
                No projects found
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto' }}>
                Try adjusting your filters or search to find what you're looking for.
              </p>
            </div>
          </div>
        ) : (
          <div className="mobile-data-list">
            {filteredProjects.map(renderDataCard)}
          </div>
        )}
      </div>

      {/* ─── Desktop Layout (≥768px) — pixel-perfect original ─── */}
      <div className="desktop-only">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="tabs">
            {CATEGORY_TABS.map(tab => (
              <button
                key={tab}
                className={`tab ${selectedCategoryFilter === tab ? 'active' : ''}`}
                onClick={() => setSelectedCategoryFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="search-wrap">
              <Search size={16} />
              <input
                className="input input-sm"
                style={{ width: 180 }}
                placeholder="Search projects..."
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
              />
            </div>
            <select
              className="select select-sm"
              style={{ width: 120 }}
              value={projectStatusFilter}
              onChange={e => setProjectStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="under_review">Under Review</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              className="select select-sm"
              style={{ width: 110 }}
              value={projectPriorityFilter}
              onChange={e => setProjectPriorityFilter(e.target.value)}
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            {isAdmin && (
              <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
                <Download size={14} /> Export
              </button>
            )}
          </div>
        </div>

        <div className="kanban-grid mb-6">
          {renderKanbanColumn('To Do', kanbanTodo, <Circle size={14} className="icon-gray" />)}
          {renderKanbanColumn('In Progress', kanbanInProgress, <Clock size={14} className="icon-blue" />)}
          {renderKanbanColumn('Completed', kanbanCompleted, <CheckCircle2 size={14} className="icon-green" />)}
        </div>

        <div className="section-header">
          <div>
            <h2 className="section-title">All Projects</h2>
            <p className="section-subtitle">{filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found</p>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="card">
            <div style={{
              textAlign: 'center',
              padding: '3rem 1.5rem',
              background: 'var(--bg-secondary)',
              borderRadius: 12,
              border: '1px solid var(--border)'
            }}>
              <Briefcase size={48} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
                No projects found
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto' }}>
                Try adjusting your filters or search to find what you're looking for.
              </p>
            </div>
          </div>
        ) : (
          <div className="data-grid data-grid-2">
            {filteredProjects.map(renderDataCard)}
          </div>
        )}
      </div>
    </div>
  );
}
