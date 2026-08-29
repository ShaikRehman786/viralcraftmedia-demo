import React, { useState, useMemo, useCallback, useEffect } from 'react';
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

const CATEGORY_TABS = ['All', 'Short Form Editing', 'Podcast Editing', 'Marketing', 'Website Development'];

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

export const safeIdString = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (val._id) {
      return typeof val._id === 'string' ? val._id : (typeof val._id.toString === 'function' ? val._id.toString() : String(val._id));
    }
    if (val.id) {
      return typeof val.id === 'string' ? val.id : (typeof val.id.toString === 'function' ? val.id.toString() : String(val.id));
    }
    if (typeof val.toString === 'function') {
      const str = val.toString();
      return str === '[object Object]' ? '' : str;
    }
  }
  return String(val);
};

export default function ProjectsPage({
  user, projects, tasks, staff, onRefreshData,
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

  // Clients list for project assignment dropdown
  const [clients, setClients] = useState([]);

  // Project Modal State
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectForm, setProjectForm] = useState({
    name: '',
    client: '',
    category: 'Short Form Editing',
    priority: 'medium',
    status: 'pending',
    description: '',
    estimatedCompletion: '',
    manager: '',
    employees: [],
    source: 'Manual'
  });

  // Task Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    project: '',
    name: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    deadline: '',
    assignedTo: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER' || user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';
  const userId = safeIdString(user);

  useEffect(() => {
    if (isAdmin) {
      axios.get('/api/projects/clients')
        .then(res => {
          if (res.data.success) {
            setClients(res.data.data);
          }
        })
        .catch(err => console.error('Error fetching clients:', err));
    }
  }, [isAdmin]);

  const activeTabs = useMemo(() => {
    if (user?.role === 'EMPLOYEE' && user?.department) {
      return [user.department];
    }
    return CATEGORY_TABS;
  }, [user, user?.department]);

  const deduplicatedProjects = useMemo(() => {
    const seen = new Set();
    return (projects || []).filter((p, index) => {
      if (!p) return false;
      const key = safeIdString(p) || p._id || p.id || p.name || `proj-${index}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [projects]);

  const normalizeCategory = (cat) => {
    if (!cat) return '';
    const c = cat.toLowerCase().trim();
    if (c.includes('short') || c.includes('clip') || c.includes('reel') || c.includes('video')) return 'Short Form Editing';
    if (c.includes('podcast') || c.includes('audio')) return 'Podcast Editing';
    if (c.includes('market') || c.includes('social') || c.includes('brand')) return 'Marketing';
    if (c.includes('web') || c.includes('dev') || c.includes('site')) return 'Website Development';
    return cat;
  };

  const filteredProjects = useMemo(() => deduplicatedProjects.filter(p => {
    if (!p) return false;
    const cat = p.category || '';
    const isAllCategory = !selectedCategoryFilter || selectedCategoryFilter.toLowerCase() === 'all';
    const matchesCategory = isEmployee || isAllCategory ||
      (cat || 'Short Form Editing') === selectedCategoryFilter ||
      cat === selectedCategoryFilter ||
      normalizeCategory(cat) === selectedCategoryFilter;
    const term = (projectSearch || '').toLowerCase().trim();
    const matchesSearch = !term ||
      (p.name || '').toLowerCase().includes(term) ||
      (p.client?.name || '').toLowerCase().includes(term) ||
      (typeof p.client === 'string' && p.client.toLowerCase().includes(term)) ||
      (p.category || '').toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term);
    const statusFilter = (projectStatusFilter || 'all').toLowerCase();
    const projStatus = (p.status || 'pending').toLowerCase();
    const matchesStatus = statusFilter === 'all' || projStatus === statusFilter ||
      (statusFilter === 'in_progress' && (projStatus === 'ongoing' || projStatus === 'assigned' || projStatus === 'accepted')) ||
      (statusFilter === 'under_review' && (projStatus === 'review' || projStatus === 'submitted')) ||
      (statusFilter === 'new' && (projStatus === 'pending' || projStatus === 'to_do' || projStatus === 'todo')) ||
      (statusFilter === 'completed' && projStatus === 'approved');
    const priorityFilter = (projectPriorityFilter || 'all').toLowerCase();
    const projPriority = (p.priority || 'medium').toLowerCase();
    const matchesPriority = priorityFilter === 'all' || projPriority === priorityFilter;
    return matchesCategory && matchesSearch && matchesStatus && matchesPriority;
  }), [deduplicatedProjects, selectedCategoryFilter, projectSearch, projectStatusFilter, projectPriorityFilter]);

  const tasksByProject = useMemo(() => {
    const map = {};
    deduplicatedProjects.forEach(p => {
      if (!p) return;
      const pIdStr = safeIdString(p) || p._id || p.id;
      if (!pIdStr) return;
      const matched = (tasks || []).filter(t => {
        if (!t) return false;
        const tProjId = safeIdString(t.project) || t.project?._id || t.project;
        return tProjId && String(tProjId) === String(pIdStr);
      });
      if (p._id) map[p._id] = matched;
      map[pIdStr] = matched;
    });
    return map;
  }, [deduplicatedProjects, tasks]);

  const kanbanTodo = useMemo(() => filteredProjects.filter(p => {
    if (!p) return false;
    const s = (p.status || 'pending').toLowerCase();
    if (s === 'new' || s === 'pending' || s === 'to_do' || s === 'todo' || s === 'created') return true;
    if (s === 'in_progress' || s === 'ongoing' || s === 'review' || s === 'under_review' || s === 'assigned' || s === 'accepted' || s === 'submitted' || s === 'processing' || s === 'completed' || s === 'approved' || s === 'done' || s === 'on_hold' || s === 'cancelled') return false;
    return true;
  }), [filteredProjects]);

  const kanbanInProgress = useMemo(() => filteredProjects.filter(p => {
    if (!p) return false;
    const s = (p.status || '').toLowerCase();
    return s === 'in_progress' || s === 'ongoing' || s === 'review' || s === 'under_review' || s === 'assigned' || s === 'accepted' || s === 'submitted' || s === 'processing';
  }), [filteredProjects]);

  const kanbanCompleted = useMemo(() => filteredProjects.filter(p => {
    if (!p) return false;
    const s = (p.status || '').toLowerCase();
    return s === 'completed' || s === 'approved' || s === 'done';
  }), [filteredProjects]);

  const openNewProjectModal = () => {
    setActiveTaskDetails(null);
    setEditingProject(null);
    setProjectForm({
      name: '',
      client: clients[0]?._id ? safeIdString(clients[0]) : '',
      category: selectedCategoryFilter !== 'All' ? selectedCategoryFilter : 'Short Form Editing',
      priority: 'medium',
      status: 'pending',
      description: '',
      estimatedCompletion: '',
      manager: '',
      employees: [],
      source: 'Manual'
    });
    setShowProjectModal(true);
  };

  const openEditProjectModal = (proj) => {
    setActiveTaskDetails(null);
    setEditingProject(proj);
    setProjectForm({
      name: proj.name || '',
      client: safeIdString(proj.client?._id || proj.client),
      category: proj.category || 'Short Form Editing',
      priority: proj.priority || 'medium',
      status: proj.status || 'pending',
      description: proj.description || '',
      estimatedCompletion: proj.estimatedCompletion ? new Date(proj.estimatedCompletion).toISOString().slice(0, 10) : '',
      manager: safeIdString(proj.manager?._id || proj.manager),
      employees: (proj.employees || []).map(e => safeIdString(e)).filter(Boolean),
      source: proj.source || 'Manual'
    });
    setShowProjectModal(true);
  };

  const handleSaveProjectSubmit = async (e) => {
    e.preventDefault();
    if (!projectForm.name.trim()) {
      addToast('Project name is required', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: projectForm.name.trim(),
        description: projectForm.description || '',
        category: projectForm.category || 'Short Form Editing',
        priority: projectForm.priority || 'medium',
        status: projectForm.status || 'pending',
        estimatedCompletion: projectForm.estimatedCompletion || null,
        client: safeIdString(projectForm.client) || null,
        manager: safeIdString(projectForm.manager) || null,
        employees: (projectForm.employees || []).map(safeIdString).filter(Boolean),
        source: projectForm.source || 'Manual'
      };

      let resultProject = null;
      if (editingProject) {
        const res = await axios.put(`/api/projects/${safeIdString(editingProject)}`, payload);
        resultProject = res.data?.data || null;
        addToast('Project updated successfully!', 'success');
      } else {
        const res = await axios.post('/api/projects', payload);
        resultProject = res.data?.data || null;
        addToast('Project created successfully!', 'success');
      }
      setShowProjectModal(false);
      setEditingProject(null);
      // Immediately update the Details modal if it's showing this project
      if (resultProject && activeTaskDetails && safeIdString(activeTaskDetails) === safeIdString(resultProject)) {
        setActiveTaskDetails(resultProject);
      }
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      addToast(err.response?.data?.error || 'Unable to save project. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProjectDirect = async (projId) => {
    const idStr = safeIdString(projId);
    if (!idStr) return;
    if (!window.confirm('Delete Project?\n\nAre you sure you want to delete this project and all associated tasks?\nThis action cannot be undone.')) return;
    
    setIsSaving(true);
    try {
      // 1. Immediately close details modal if open
      if (activeTaskDetails && safeIdString(activeTaskDetails) === idStr) {
        setActiveTaskDetails(null);
      }

      // 2. Perform real deletion on backend
      const res = await axios.delete(`/api/projects/${idStr}`);
      if (res.data?.success) {
        addToast('Project deleted successfully', 'success');
        
        // 3. Immediately re-fetch and synchronize full database state
        if (onRefreshData) {
          await onRefreshData();
        }
      } else {
        addToast(res.data?.error || 'Unable to delete project. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Delete project failed:', err);
      addToast(err.response?.data?.error || 'Unable to delete project. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const openNewTaskModal = (preselectedProjId = '') => {
    setActiveTaskDetails(null);
    setEditingTask(null);
    setTaskForm({
      project: preselectedProjId || (deduplicatedProjects[0] ? safeIdString(deduplicatedProjects[0]) : ''),
      name: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      deadline: '',
      assignedTo: ''
    });
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task) => {
    setActiveTaskDetails(null);
    setEditingTask(task);
    setTaskForm({
      project: safeIdString(task.project),
      name: task.name || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : '',
      assignedTo: safeIdString(task.assignedTo)
    });
    setShowTaskModal(true);
  };

  const handleSaveTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.name.trim()) {
      addToast('Task name is required', 'error');
      return;
    }
    const targetProjId = safeIdString(taskForm.project);
    if (!targetProjId) {
      addToast('Please select a target project', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        project: targetProjId,
        name: taskForm.name.trim(),
        description: taskForm.description || '',
        priority: taskForm.priority || 'medium',
        status: taskForm.status || 'pending',
        deadline: taskForm.deadline || null,
        assignedTo: safeIdString(taskForm.assignedTo) || null
      };

      if (editingTask) {
        await axios.put(`/api/tasks/${safeIdString(editingTask)}`, payload);
        addToast('Task updated successfully!', 'success');
      } else {
        await axios.post('/api/tasks', payload);
        addToast('Task created successfully!', 'success');
      }
      setShowTaskModal(false);
      setEditingTask(null);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      addToast(err.response?.data?.error || 'Unable to save task. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTaskDirect = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await axios.delete(`/api/tasks/${taskId}`);
      addToast('Task deleted successfully', 'success');
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete task', 'error');
    }
  };

  const handleUpdateTaskStatusDirect = async (taskId, newStatus) => {
    try {
      await axios.put(`/api/tasks/${taskId}`, { status: newStatus });
      addToast(`Task status updated to ${newStatus.replace(/_/g, ' ')}`, 'success');
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update task status', 'error');
    }
  };

  const handleUpdateProjectStatusDirect = async (projectId, newStatus) => {
    try {
      const res = await axios.put(`/api/projects/${projectId}`, { status: newStatus });
      addToast(`Project status updated to ${newStatus.replace(/_/g, ' ')}`, 'success');
      // Update the Details modal if it's showing this project
      if (res.data?.data && activeTaskDetails && safeIdString(activeTaskDetails) === safeIdString(res.data.data)) {
        setActiveTaskDetails(res.data.data);
      }
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update project status', 'error');
    }
  };

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
          {project.referral?.isReferral && (
            <span className="badge badge-warning" title={`${project.referral.partnerAgency || 'Partner'} — ${project.referral.referralCode || ''}`}>🔗 Referral</span>
          )}
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

    const myAssignment = (project.assignments || []).find(a =>
      safeIdString(a?.employee) === userId
    );
    const isAcceptedByMe = localAccepted[project._id] ||
      (project.assignmentStatus === 'Accepted' && (safeIdString(project.employeeId) === userId || safeIdString(project.assignedEmployee) === userId)) ||
      myAssignment?.accepted;
    const isPendingForMe = !isAcceptedByMe && (employees || []).some(e => safeIdString(e) === userId);

    const otherAssignments = (project.assignments || []).filter(a =>
      safeIdString(a?.employee) !== userId
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
            {project.referral?.isReferral && (
              <span className="badge badge-warning">🔗 Referral Project</span>
            )}
          </div>
        </div>
        <div className="data-card-body">
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
            {!isEmployee && project.referral?.isReferral && (
              <>
                <span className="text-xs text-muted flex items-center gap-1">
                  <UserCheck size={12} /> {project.referral.partnerAgency || 'Referral Partner'}
                </span>
                <span className="text-xs text-muted flex items-center gap-1">
                  <FolderOpen size={11} /> {project.referral.campaignName || 'Campaign'}
                </span>
                <span className="text-xs font-mono text-accent">{project.referral.referralCode}</span>
              </>
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
            <div className="mt-2" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {projectTasks.map(t => (
                <div key={t._id || t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.78rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{t.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {t.assignedTo?.name && (
                      <span className="text-2xs text-muted">
                        {t.assignedTo.name}
                      </span>
                    )}
                    <span className={getPriorityBadge(t.priority)}>{t.priority}</span>
                    <span className={getStatusBadge(t.status)}>{t.status?.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              ))}
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
              ) : isRejectedByMe ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge badge-error">
                    Rejected
                  </span>
                </div>
              ) : isPendingForMe ? (
                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAccept(project._id)}
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
                    onClick={async () => {
                      try {
                        await axios.post(`/api/projects/${project._id}/reject`);
                        addToast('Project assignment rejected', 'info');
                        if (onRefreshData) onRefreshData();
                      } catch (err) {
                        addToast('Failed to reject project', 'error');
                      }
                    }}
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {!isEmployee && employees.length > 0 && (
            <div className="emp-assignments-section">
              {(project.assignments && project.assignments.length > 0 ? project.assignments : employees.map(e => ({
                employee: e,
                accepted: project.assignmentStatus === 'Accepted' && (safeIdString(project.employeeId) === safeIdString(e)),
                status: project.assignmentStatus === 'Accepted' && (safeIdString(project.employeeId) === safeIdString(e)) ? 'Accepted' : project.assignmentStatus === 'Rejected' && (safeIdString(project.employeeId) === safeIdString(e)) ? 'Rejected' : 'Pending'
              }))).filter((a, idx, self) => {
                const eid = safeIdString(a?.employee);
                return eid && self.findIndex(s => safeIdString(s?.employee) === eid) === idx;
              }).map(a => {
                const emp = a.employee;
                const eid = safeIdString(emp);
                const aStatus = a.status || (a.accepted ? 'Accepted' : 'Pending');
                return (
                  <div key={eid || Math.random()} className="emp-assignment-chip">
                    <div className="avatar avatar-xs" style={{ background: getAvatarColor(eid) }}>
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

        <div className="data-card-footer flex items-center justify-between gap-2 flex-wrap pt-2">
          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setActiveTaskDetails(project)}
            >
              <ExternalLink size={14} /> Details
            </button>
            {isAdmin && (
              <select
                className="select select-xs"
                style={{ fontSize: '0.75rem', height: '26px' }}
                value={project.status}
                onChange={e => handleUpdateProjectStatusDirect(project._id, e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
              </select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-gray text-2xs">Source: {project.source || 'Web'}</span>
          </div>
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
            {activeTabs.map(tab => (
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
            <div className="flex gap-2 w-full mt-2">
              <button className="btn btn-primary btn-sm flex-1" onClick={openNewProjectModal}>
                <Plus size={14} /> Project
              </button>
              <button className="btn btn-accent btn-sm flex-1" onClick={() => openNewTaskModal()}>
                <Plus size={14} /> Task
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
                <Download size={14} />
              </button>
            </div>
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
            {activeTabs.map(tab => (
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
              <>
                <button className="btn btn-primary btn-sm" onClick={openNewProjectModal}>
                  <Plus size={14} /> New Project
                </button>
                <button className="btn btn-accent btn-sm" onClick={() => openNewTaskModal()}>
                  <Plus size={14} /> New Task
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
                  <Download size={14} /> Export
                </button>
              </>
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

      {/* ─── Create / Edit Project Modal ─── */}
      {showProjectModal && (
        <div className="dialog-overlay" onClick={() => setShowProjectModal(false)}>
          <div className="dialog animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div className="dialog-header">
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>{editingProject ? 'Edit Project' : 'Create New Project'}</h2>
              <button type="button" className="dialog-close-btn" onClick={() => setShowProjectModal(false)} aria-label="Close modal"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveProjectSubmit} className="dialog-form">
              <div className="dialog-body">
                <div>
                  <label className="form-label">Project Title *</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="e.g. Podcast Video Editing & Graphics"
                    value={projectForm.name}
                    onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Client</label>
                    <select
                      className="select w-full"
                      value={projectForm.client}
                      onChange={e => setProjectForm({ ...projectForm, client: e.target.value })}
                    >
                      <option value="">Select Client</option>
                      {clients.map(c => (
                        <option key={c._id} value={c._id}>{c.name} ({c.phone || c.email || 'Client'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Service Category</label>
                    <select
                      className="select w-full"
                      value={projectForm.category}
                      onChange={e => setProjectForm({ ...projectForm, category: e.target.value })}
                    >
                      <option value="Short Form Editing">Short Form Editing</option>
                      <option value="Podcast Editing">Podcast Editing</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Website Development">Website Development</option>
                      <option value="Branding">Branding</option>
                      <option value="Consultation">Consultation</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="form-label">Priority</label>
                    <select
                      className="select w-full"
                      value={projectForm.priority}
                      onChange={e => setProjectForm({ ...projectForm, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select
                      className="select w-full"
                      value={projectForm.status}
                      onChange={e => setProjectForm({ ...projectForm, status: e.target.value })}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="approved">Approved</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Deadline</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={projectForm.estimatedCompletion}
                      onChange={e => setProjectForm({ ...projectForm, estimatedCompletion: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Manager</label>
                    <select
                      className="select w-full"
                      value={projectForm.manager}
                      onChange={e => setProjectForm({ ...projectForm, manager: e.target.value })}
                    >
                      <option value="">Select Manager</option>
                      {(staff || []).filter(s => s.role === 'MANAGER' || s.role === 'SUPER_ADMIN').map(s => (
                        <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Assigned Employee</label>
                    <select
                      className="select w-full"
                      value={projectForm.employees[0] || ''}
                      onChange={e => setProjectForm({ ...projectForm, employees: e.target.value ? [e.target.value] : [] })}
                    >
                      <option value="">Select Employee</option>
                      {(staff || []).filter(s => s.role === 'EMPLOYEE').map(s => (
                        <option key={s._id} value={s._id}>{s.name} ({s.department || 'Editor'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Description / Work Notes</label>
                  <textarea
                    className="input w-full"
                    rows="3"
                    placeholder="Add instructions, asset links, or key requirements..."
                    value={projectForm.description}
                    onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="dialog-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowProjectModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Create / Edit Task Modal ─── */}
      {showTaskModal && (
        <div className="dialog-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="dialog animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="dialog-header">
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
              <button type="button" className="dialog-close-btn" onClick={() => setShowTaskModal(false)} aria-label="Close modal"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveTaskSubmit} className="dialog-form">
              <div className="dialog-body">
                <div>
                  <label className="form-label">Select Project *</label>
                  <select
                    className="select w-full"
                    value={taskForm.project}
                    onChange={e => setTaskForm({ ...taskForm, project: e.target.value })}
                    required
                  >
                    <option value="">Select Target Project</option>
                    {deduplicatedProjects.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Task Name *</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="e.g. Audio noise reduction & color grade"
                    value={taskForm.name}
                    onChange={e => setTaskForm({ ...taskForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="form-label">Priority</label>
                    <select
                      className="select w-full"
                      value={taskForm.priority}
                      onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select
                      className="select w-full"
                      value={taskForm.status}
                      onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}
                    >
                      <option value="pending">Pending</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="submitted">Submitted</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Due Date</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={taskForm.deadline}
                      onChange={e => setTaskForm({ ...taskForm, deadline: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Assigned Employee</label>
                  <select
                    className="select w-full"
                    value={taskForm.assignedTo}
                    onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {(staff || []).filter(s => s.role === 'EMPLOYEE' || s.role === 'MANAGER').map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Description / Instructions</label>
                  <textarea
                    className="input w-full"
                    rows="3"
                    placeholder="Task instructions or deliverables detail..."
                    value={taskForm.description}
                    onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="dialog-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Detailed Project Workspace Drawer (Zoho/HubSpot CRM Style) ─── */}
      {activeTaskDetails && (
        <div className="dialog-overlay" onClick={() => setActiveTaskDetails(null)}>
          <div className="dialog animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 780, width: '92%' }}>
            {/* Header */}
            <div className="dialog-header flex justify-between items-start border-b pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={getStatusBadge(activeTaskDetails.status)}>
                    {activeTaskDetails.status?.replace(/_/g, ' ')}
                  </span>
                  <span className={getPriorityBadge(activeTaskDetails.priority)}>
                    {activeTaskDetails.priority}
                  </span>
                  <span className="badge badge-gray">
                    {activeTaskDetails.category || 'General'}
                  </span>
                  <span className="badge badge-accent">
                    Source: {activeTaskDetails.source || 'Web'}
                  </span>
                  {activeTaskDetails.referral?.isReferral && (
                    <span className="badge badge-warning">🔗 Partner Referral</span>
                  )}
                </div>
                <h3 className="modal-title text-xl font-bold text-gray-900 dark:text-white" style={{ margin: 0, lineHeight: 1.3 }}>
                  {activeTaskDetails.name}
                </h3>
              </div>
              <button
                type="button"
                className="dialog-close-btn"
                onClick={() => setActiveTaskDetails(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="dialog-body space-y-5 py-4 overflow-y-auto" style={{ maxHeight: 'calc(75vh - 120px)' }}>
              {/* Project Information Responsive Grid */}
              <div>
                <h4 className="text-2xs font-bold text-muted uppercase tracking-wider mb-2">Project Overview</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-secondary rounded-xl border border-gray-200 dark:border-gray-800">
                  <div>
                    <span className="text-2xs text-muted block uppercase font-semibold">Client</span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block mt-0.5 truncate">
                      {activeTaskDetails.client?.name || 'General Client'}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xs text-muted block uppercase font-semibold">Service Category</span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block mt-0.5">
                      {activeTaskDetails.category || 'Short Form Editing'}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xs text-muted block uppercase font-semibold">Manager</span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block mt-0.5 truncate">
                      {activeTaskDetails.manager?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xs text-muted block uppercase font-semibold">Assigned Employee</span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block mt-0.5 truncate">
                      {activeTaskDetails.employees?.[0]?.name || activeTaskDetails.assignedEmployeeName || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xs text-muted block uppercase font-semibold">Created Date</span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block mt-0.5">
                      {formatDate(activeTaskDetails.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xs text-muted block uppercase font-semibold">Deadline</span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block mt-0.5">
                      {formatDate(activeTaskDetails.estimatedCompletion)}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xs text-muted block uppercase font-semibold">Created By</span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block mt-0.5">
                      {activeTaskDetails.createdBy?.name || 'Admin'}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xs text-muted block uppercase font-semibold">Last Updated</span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block mt-0.5">
                      {formatDate(activeTaskDetails.updatedAt || activeTaskDetails.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Referral Details if applicable */}
              {activeTaskDetails.referral?.isReferral && (
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <h4 className="text-2xs font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">Referral Partner Details</h4>
                  <div className="flex items-center gap-4 text-xs flex-wrap">
                    <span><strong>Partner:</strong> {activeTaskDetails.referral.partnerAgency || 'Partner'}</span>
                    <span><strong>Campaign:</strong> {activeTaskDetails.referral.campaignName || 'General'}</span>
                    <span><strong>Code:</strong> <code className="font-mono text-accent">{activeTaskDetails.referral.referralCode}</code></span>
                  </div>
                </div>
              )}

              {/* Description / Work Notes Section */}
              {activeTaskDetails.description && (
                <div>
                  <h4 className="text-2xs font-bold text-muted uppercase tracking-wider mb-1.5">Description & Work Notes</h4>
                  <div className="text-xs bg-secondary p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                    {activeTaskDetails.description}
                  </div>
                </div>
              )}

              {/* Project Quick Action Bar for Admin */}
              {isAdmin && (
                <div>
                  <h4 className="text-2xs font-bold text-muted uppercase tracking-wider mb-1.5">Management Actions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-secondary rounded-xl border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[90px]">Project Status:</span>
                      <select
                        className="select select-sm flex-1"
                        value={activeTaskDetails.status}
                        onChange={e => handleUpdateProjectStatusDirect(activeTaskDetails._id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="approved">Approved</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[90px]">Assign Staff:</span>
                      <select
                        className="select select-sm flex-1"
                        value={safeIdString(activeTaskDetails.employees?.[0]) || ''}
                        onChange={async (e) => {
                          const empId = e.target.value;
                          try {
                            const res = await axios.put(`/api/projects/${activeTaskDetails._id}`, { employees: empId ? [empId] : [] });
                            addToast('Assigned employee updated successfully!', 'success');
                            if (res.data?.data) setActiveTaskDetails(res.data.data);
                            if (onRefreshData) await onRefreshData();
                          } catch (err) {
                            addToast('Failed to reassign employee', 'error');
                          }
                        }}
                      >
                        <option value="">Unassigned</option>
                        {(staff || []).filter(s => s.role === 'EMPLOYEE' || s.role === 'MANAGER').map(s => (
                          <option key={s._id} value={s._id}>{s.name} ({s.department || s.role})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks Progress & Management */}
              {(() => {
                const projTasks = tasksByProject[activeTaskDetails._id] || [];
                const completedTasks = projTasks.filter(t => t.status === 'completed' || t.status === 'approved').length;
                const progressPct = projTasks.length > 0 ? Math.round((completedTasks / projTasks.length) * 100) : (activeTaskDetails.status === 'completed' ? 100 : 0);

                return (
                  <div>
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                      <h4 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-primary" />
                        Project Tasks ({projTasks.length})
                      </h4>
                      {isAdmin && (
                        <button
                          className="btn btn-accent btn-xs"
                          onClick={() => openNewTaskModal(activeTaskDetails._id)}
                        >
                          <Plus size={12} /> Add Task
                        </button>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-2xs font-semibold mb-1 text-muted">
                        <span>Task Completion</span>
                        <span>{completedTasks} / {projTasks.length} ({progressPct}%)</span>
                      </div>
                      <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border">
                        <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>

                    {projTasks.length === 0 ? (
                      <div className="text-center p-4 bg-secondary rounded-xl border text-muted text-xs">
                        No tasks created under this project yet. {isAdmin && 'Click "+ Add Task" to assign work.'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {projTasks.map(t => (
                          <div key={t._id} className="p-3 bg-secondary rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-semibold text-xs">{t.name}</span>
                                <span className={getPriorityBadge(t.priority)}>{t.priority}</span>
                                <span className={getStatusBadge(t.status)}>{t.status?.replace(/_/g, ' ')}</span>
                              </div>
                              {t.description && <p className="text-2xs text-muted mt-0.5">{t.description}</p>}
                              <div className="flex items-center gap-3 text-2xs text-muted mt-1">
                                <span>Assigned: {t.assignedTo?.name || 'Unassigned'}</span>
                                {t.deadline && <span>Due: {formatDate(t.deadline)}</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Employee Status Change */}
                              {isEmployee && (t.assignedTo?._id === userId || t.assignedTo === userId) && (
                                <select
                                  className="select select-xs"
                                  value={t.status}
                                  onChange={e => handleUpdateTaskStatusDirect(t._id, e.target.value)}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="submitted">Submitted</option>
                                  <option value="completed">Completed</option>
                                </select>
                              )}

                              {isAdmin && (
                                <>
                                  <select
                                    className="select select-xs"
                                    value={t.status}
                                    onChange={e => handleUpdateTaskStatusDirect(t._id, e.target.value)}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="assigned">Assigned</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="submitted">Submitted</option>
                                    <option value="completed">Completed</option>
                                  </select>
                                  <button className="btn btn-ghost btn-xs" onClick={() => openEditTaskModal(t)}>Edit</button>
                                  <button className="btn btn-error btn-xs" onClick={() => handleDeleteTaskDirect(t._id)}>Del</button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Sticky Action Footer */}
            <div className="dialog-footer border-t pt-3 flex justify-between items-center gap-3">
              <div className="flex gap-2">
                {isAdmin && (
                  <>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEditProjectModal(activeTaskDetails)}
                    >
                      Edit Project
                    </button>
                    <button
                      className="btn btn-error btn-sm"
                      onClick={() => handleDeleteProjectDirect(activeTaskDetails._id)}
                    >
                      Delete Project
                    </button>
                  </>
                )}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setActiveTaskDetails(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

