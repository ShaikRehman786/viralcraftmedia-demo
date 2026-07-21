import React, { useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import {
  Search,
  Plus,
  Filter,
  Calendar,
  Users,
  Briefcase,
  Clock,
  AlertCircle,
  Tag,
  FolderOpen
} from 'lucide-react';

export default function CalendarTab({ events, staff, projects, tasks, onEditEvent, onAddEvent }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  
  // Selected date details view
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Unique departments gathered dynamically from staff list and projects
  const departments = useMemo(() => {
    const depts = new Set();
    staff?.forEach(s => { if (s.department) depts.add(s.department); });
    projects?.forEach(p => { if (p.department) depts.add(p.department); });
    return Array.from(depts);
  }, [staff, projects]);

  // Client-side filtering logic
  const filteredEvents = useMemo(() => {
    return (events || []).filter(e => {
      // 1. Search Query
      const matchesSearch = !searchQuery || 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.description || '').toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Type Filter
      const matchesType = !filterType || e.type === filterType;

      // 3. Employee Filter
      const matchesEmployee = !filterEmployee || 
        e.assignedTo?._id === filterEmployee || 
        e.assignedTo === filterEmployee;

      // Associated task or project
      const matchedProj = projects?.find(p => p._id === e.project?._id || p._id === e.project);
      const matchedTask = tasks?.find(t => t._id === e.task?._id || t._id === e.task);

      // 4. Department Filter
      const dept = matchedProj?.department || matchedTask?.project?.department || matchedTask?.department;
      const matchesDept = !filterDept || dept === filterDept;

      // 5. Priority Filter
      const priority = matchedProj?.priority || matchedTask?.priority;
      const matchesPriority = !filterPriority || priority === filterPriority;

      return matchesSearch && matchesType && matchesEmployee && matchesDept && matchesPriority;
    });
  }, [events, searchQuery, filterType, filterEmployee, filterDept, filterPriority, projects, tasks]);

  // Format events to FullCalendar specification
  const fcEvents = useMemo(() => {
    return filteredEvents.map(e => ({
      id: e._id,
      title: e.title,
      start: e.start,
      end: e.end,
      allDay: e.allDay || false,
      backgroundColor: e.color || 'var(--accent)',
      borderColor: e.color || 'var(--accent)',
      textColor: '#FFFFFF',
      extendedProps: {
        description: e.description,
        assignedTo: e.assignedTo,
        type: e.type,
        project: e.project,
        task: e.task,
        rawEvent: e
      }
    }));
  }, [filteredEvents]);

  // Click on a calendar event to edit/inspect details
  const handleEventClick = (info) => {
    const raw = info.event.extendedProps.rawEvent;
    if (onEditEvent && raw) {
      onEditEvent(raw);
    }
  };

  // Drag selection on date grid to quick create new event
  const handleDateSelect = (selectInfo) => {
    if (onAddEvent) {
      const startStr = selectInfo.startStr.includes('T') ? selectInfo.startStr.slice(0, 16) : `${selectInfo.startStr}T10:00`;
      const endStr = selectInfo.endStr.includes('T') ? selectInfo.endStr.slice(0, 16) : `${selectInfo.startStr}T11:00`;
      onAddEvent({ start: startStr, end: endStr });
    }
  };

  const getUpcomingDeadlines = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return (events || [])
      .filter(e => e.start && new Date(e.start) >= now && (e.type === 'deadline' || e.title.toLowerCase().includes('deadline')))
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 5);
  };

  const getTodaySchedule = () => {
    const today = new Date();
    return (events || []).filter(e => {
      if (!e.start) return false;
      const d = new Date(e.start);
      return d.getDate() === today.getDate() && 
             d.getMonth() === today.getMonth() && 
             d.getFullYear() === today.getFullYear();
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getDaysUntil = (dateStr) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((d - now) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `${diff}d left`;
  };

  const handleQuickAdd = () => {
    if (!onAddEvent) return;
    const now = new Date();
    const fd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T10:00`;
    const fed = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T11:00`;
    onAddEvent({ start: fd, end: fed });
  };

  return (
    <div className="calendar-tab-container animate-fade-in">
      <div className="section-header cal-sticky-header">
        <div>
          <h2 className="page-title">Production Calendar</h2>
          <p className="page-subtitle">Manage schedules, shoots, reviews, and editorial deadlines</p>
        </div>
        <button className="btn btn-primary" onClick={handleQuickAdd}>
          <Plus size={16} /> New Event
        </button>
      </div>

      {/* Dynamic Filters Bar */}
      <div className="calendar-filters-bar mb-4">
        <div className="filter-item">
          <Search size={14} className="filter-icon" />
          <input
            type="text"
            placeholder="Search event title/desc..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-item">
          <Filter size={14} className="filter-icon" />
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="filter-select">
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <Users size={14} className="filter-icon" />
          <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="filter-select">
            <option value="">All Employees</option>
            {staff?.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <AlertCircle size={14} className="filter-icon" />
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="filter-select">
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="filter-item">
          <Tag size={14} className="filter-icon" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="filter-select">
            <option value="">All Types</option>
            <option value="deadline">Deadline</option>
            <option value="meeting">Meeting</option>
            <option value="shoot">Shoot</option>
            <option value="edit">Edit</option>
            <option value="review">Review</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      <div className="calendar-grid-layout">
        {/* Main FullCalendar Component */}
        <div className="card calendar-card-wrapper">
          <div className="calendar-canvas-inner">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
              }}
              events={fcEvents}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={3}
              eventClick={handleEventClick}
              select={handleDateSelect}
              height="auto"
              dateClick={(info) => setSelectedDate(new Date(info.dateStr))}
            />
          </div>
        </div>

        {/* Side Panel Widgets */}
        <div className="calendar-sidebar-widgets">
          {/* Today's Schedule */}
          <div className="card sidebar-widget-card">
            <div className="card-header border-bottom">
              <h3 className="section-title flex items-center gap-2">
                <Clock size={16} className="text-accent" />
                Today's Schedule
              </h3>
            </div>
            <div className="card-body p-0 max-h-240 overflow-y-auto">
              {getTodaySchedule().length === 0 ? (
                <div className="empty-state p-4 text-center">
                  <p className="text-xs text-muted">No events scheduled for today.</p>
                </div>
              ) : (
                <div className="sidebar-activity-list">
                  {getTodaySchedule().map(e => (
                    <div
                      key={e._id}
                      onClick={() => onEditEvent?.(e)}
                      className="sidebar-activity-item cursor-pointer"
                    >
                      <div className="activity-status-dot" style={{ backgroundColor: e.color || 'var(--accent)' }} />
                      <div className="flex-1">
                        <div className="activity-title text-sm font-semibold">{e.title}</div>
                        <div className="activity-meta text-xs text-muted">
                          {formatTime(e.start)} - {formatTime(e.end)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="card sidebar-widget-card mt-4">
            <div className="card-header border-bottom">
              <h3 className="section-title flex items-center gap-2">
                <AlertCircle size={16} className="text-error" />
                Upcoming Deadlines
              </h3>
            </div>
            <div className="card-body p-0 max-h-240 overflow-y-auto">
              {getUpcomingDeadlines().length === 0 ? (
                <div className="empty-state p-4 text-center">
                  <p className="text-xs text-muted">No upcoming deadlines.</p>
                </div>
              ) : (
                <div className="sidebar-activity-list">
                  {getUpcomingDeadlines().map(e => {
                    const diff = getDaysUntil(e.start);
                    const isUrgent = diff === 'Today' || diff === 'Tomorrow';
                    return (
                      <div
                        key={e._id}
                        onClick={() => onEditEvent?.(e)}
                        className="sidebar-activity-item cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div className="activity-status-dot" style={{ backgroundColor: e.color || '#EF4444' }} />
                          <div>
                            <div className="activity-title text-sm font-semibold truncate max-w-140">{e.title}</div>
                            <div className="activity-meta text-xs text-muted">
                              {new Date(e.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                        <span className={`badge ${isUrgent ? 'badge-error' : 'badge-warning'}`}>
                          {diff}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Staff Roster Overview */}
          <div className="card sidebar-widget-card mt-4">
            <div className="card-header border-bottom">
              <h3 className="section-title flex items-center gap-2">
                <Users size={16} className="text-primary" />
                Roster Availability
              </h3>
            </div>
            <div className="card-body py-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Total Active Roster:</span>
                  <span className="font-semibold">{(staff || []).length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Editors Online:</span>
                  <span className="font-semibold text-success">
                    {(staff || []).filter(s => s.role === 'EMPLOYEE' && s.status?.toLowerCase() === 'active').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
