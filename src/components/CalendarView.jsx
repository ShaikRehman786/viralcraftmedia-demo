import React, { useState } from 'react';

const monthsNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const views = ['month', 'week', 'day', 'agenda'];

export default function CalendarView({ events, onEditEvent }) {
  const today = new Date();
  const [cMon, setCMon] = useState(today.getMonth());
  const [cYr, setCYr] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('month');

  const daysInMonth = new Date(cYr, cMon + 1, 0).getDate();
  const firstDayIndex = new Date(cYr, cMon, 1).getDay();

  const handlePrevMonth = () => {
    if (cMon === 0) { setCMon(11); setCYr(prev => prev - 1); }
    else { setCMon(prev => prev - 1); }
  };

  const handleNextMonth = () => {
    if (cMon === 11) { setCMon(0); setCYr(prev => prev + 1); }
    else { setCMon(prev => prev + 1); }
  };

  const handleDayClick = (dayNum) => {
    const date = new Date(cYr, cMon, dayNum);
    setSelectedDate(date);
  };

  const getEventsForDay = (dayNum) => {
    return (events || []).filter(e => {
      const d = new Date(e.start);
      return d.getDate() === dayNum && d.getMonth() === cMon && d.getFullYear() === cYr;
    });
  };

  const getEventBadge = (e) => {
    const color = e.color || 'var(--accent)';
    return (
      <div
        key={e._id}
        onClick={(ev) => {
          ev.stopPropagation();
          if (onEditEvent) onEditEvent(e);
        }}
        className="cal-event-badge"
        style={{ background: color, color: '#FFF' }}
        title={e.title}
      >
        {e.title}
      </div>
    );
  };

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate.getDate()) : [];

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleToday = () => {
    const now = new Date();
    setCMon(now.getMonth());
    setCYr(now.getFullYear());
    setSelectedDate(now);
  };

  const getTodayEvents = () => {
    return (events || []).filter(e => {
      if (!e.start) return false;
      const d = new Date(e.start);
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });
  };

  const getUpcomingDeadlines = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return (events || [])
      .filter(e => e.start && new Date(e.start) >= now)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 5);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  const getWeekStart = () => {
    const base = selectedDate || today;
    const d = new Date(base);
    d.setDate(d.getDate() - d.getDay());
    return d;
  };

  const renderWeekView = () => {
    const weekStart = getWeekStart();
    const hours = Array.from({ length: 12 }, (_, i) => i + 7);
    return (
      <div className="week-container animate-fade-in">
        <div className="week-header">
          <div className="week-header-cell" />
          {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
            return (
              <div key={i} className={`week-header-cell${isToday ? ' text-accent' : ''}`}>
                {dayNames[i]}<br /><span className="font-extrabold text-lg">{d.getDate()}</span>
              </div>
            );
          })}
        </div>
        <div className="week-body">
          {hours.map(h => (
            <div key={h} className="week-row">
              <div className="week-time-label">{h.toString().padStart(2, '0')}:00</div>
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date(weekStart);
                d.setDate(weekStart.getDate() + i);
                const dayEvents = (events || []).filter(e => {
                  if (!e.start) return false;
                  const ed = new Date(e.start);
                  return ed.getDate() === d.getDate() && ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
                });
                return (
                  <div key={i} className="week-cell">
                    {dayEvents.filter(e => new Date(e.start).getHours() === h).map(getEventBadge)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const day = selectedDate || today;
    const dayEvents = (events || []).filter(e => {
      if (!e.start) return false;
      const d = new Date(e.start);
      return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
    });
    const hours = Array.from({ length: 14 }, (_, i) => i + 6);
    return (
      <div className="day-container animate-fade-in">
        {hours.map(h => {
          const hourEvents = dayEvents.filter(e => new Date(e.start).getHours() === h);
          return (
            <div key={h} className="day-row">
              <div className="day-time">{h.toString().padStart(2, '0')}:00</div>
              <div className="day-content">
                {hourEvents.map(getEventBadge)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAgendaView = () => {
    const allEvents = [...(events || [])]
      .filter(e => e.start)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
    const grouped = {};
    allEvents.forEach(e => {
      const key = new Date(e.start).toDateString();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    });
    return (
      <div className="agenda-view animate-fade-in">
        {Object.keys(grouped).length === 0 ? (
          <div className="dash-card">
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div className="empty-title">No events found</div>
              <div className="empty-desc">Events will appear here once scheduled.</div>
            </div>
          </div>
        ) : (
          Object.keys(grouped).map(dateKey => {
            const dateObj = new Date(dateKey);
            const isToday = dateObj.getDate() === today.getDate() && dateObj.getMonth() === today.getMonth() && dateObj.getFullYear() === today.getFullYear();
            return (
              <div key={dateKey} className="agenda-date-group">
                <div className="agenda-date-header">
                  {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  {isToday && <span className="agenda-date-badge">Today</span>}
                </div>
                <div className="flex-col gap-1">
                  {grouped[dateKey].map(e => (
                    <div
                      key={`ag-${e._id}`}
                      className="agenda-item"
                      style={{ borderLeftColor: e.color || 'var(--accent)' }}
                      onClick={() => { if (onEditEvent) onEditEvent(e); }}
                    >
                      <div className="agenda-item-title">{e.title}</div>
                      {e.description && <div className="agenda-item-desc">{e.description}</div>}
                      <div className="agenda-item-meta">
                        <span>{formatTime(e.start)} - {formatTime(e.end)}</span>
                        <span>Type: {(e.type || 'custom').toUpperCase()}</span>
                      </div>
                      {e.assignedTo && <div className="agenda-item-assignee">Assigned: {e.assignedTo.name || 'Staff'}</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="cal-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Schedules & Deadlines</h2>
          <p className="cal-subtitle">Production calendar events overview</p>
        </div>
        <div className="page-actions">
          <div className="tabs">
            {views.map(v => (
              <button
                key={v}
                className={`tab ${viewMode === v ? 'active' : ''}`}
                onClick={() => setViewMode(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`cal-layout${viewMode === 'agenda' ? ' agenda-only' : ''}`}>
        {/* LEFT SIDEBAR */}
        <div className="cal-sidebar">
          {/* Mini Calendar */}
          <div className="dash-card mini-cal">
            <div className="mini-cal-header">
              <span className="mini-cal-title">{monthsNames[cMon]} {cYr}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="cal-nav-btn" onClick={handlePrevMonth}>&lsaquo;</button>
                <button className="cal-nav-btn" onClick={handleNextMonth}>&rsaquo;</button>
              </div>
            </div>
            <div className="mini-grid">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                <div key={d} className="mini-wday">{d}</div>
              ))}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`me-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const isActive = selectedDate && selectedDate.getDate() === dayNum && selectedDate.getMonth() === cMon && selectedDate.getFullYear() === cYr;
                const isToday = dayNum === today.getDate() && cMon === today.getMonth() && cYr === today.getFullYear();
                const hasEvent = (events || []).some(e => {
                  if (!e.start) return false;
                  const d = new Date(e.start);
                  return d.getDate() === dayNum && d.getMonth() === cMon && d.getFullYear() === cYr;
                });
                return (
                  <div
                    key={dayNum}
                    className={`mini-day${isActive ? ' active' : ''}${isToday ? ' today' : ''}${hasEvent ? ' has-event' : ''}`}
                    onClick={() => setSelectedDate(new Date(cYr, cMon, dayNum))}
                  >
                    {dayNum}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's Agenda */}
          <div className="dash-card p-4">
            <div className="sidebar-section-title">Today's Agenda</div>
            {getTodayEvents().length === 0 ? (
              <div className="sidebar-empty">No events today</div>
            ) : (
              <div className="flex-col">
                {getTodayEvents().slice(0, 4).map(e => (
                  <div
                    key={`td-${e._id}`}
                    className={`today-item${onEditEvent ? ' cursor-pointer' : ''}`}
                    onClick={() => { if (onEditEvent) onEditEvent(e); }}
                  >
                    <div className="today-item-dot" style={{ background: e.color || 'var(--accent)' }} />
                    <div className="today-item-info">
                      <div className="today-item-title">{e.title}</div>
                      <div className="today-item-time">{formatTime(e.start)} - {formatTime(e.end)}</div>
                    </div>
                  </div>
                ))}
                {getTodayEvents().length > 4 && (
                  <div className="cal-event-more text-center pt-1">+{getTodayEvents().length - 4} more</div>
                )}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines */}
          <div className="dash-card p-4">
            <div className="sidebar-section-title">Upcoming Deadlines</div>
            {getUpcomingDeadlines().length === 0 ? (
              <div className="sidebar-empty">No upcoming deadlines</div>
            ) : (
              <div className="flex-col gap-0">
                {getUpcomingDeadlines().map(e => {
                  const daysLeft = getDaysUntil(e.start);
                  const isUrgent = daysLeft === 'Today' || daysLeft === 'Tomorrow';
                  return (
                    <div
                      key={`dl-${e._id}`}
                      className={`deadline-item${onEditEvent ? ' cursor-pointer' : ''}`}
                      onClick={() => { if (onEditEvent) onEditEvent(e); }}
                    >
                      <div className="deadline-dot" style={{ background: e.color || 'var(--accent)' }} />
                      <div className="deadline-info">
                        <div className="deadline-title">{e.title}</div>
                        <div className="deadline-date">{formatDate(e.start)}</div>
                      </div>
                      <span className={`badge ${isUrgent ? 'badge-error' : 'badge-warning'}`}>{daysLeft}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="cal-main">
          {viewMode === 'month' && (
            <div className="dash-card p-0 overflow-hidden">
              <div className="flex-row items-center justify-between p-5">
                <div className="cal-nav">
                  <button className="btn btn-ghost btn-sm" onClick={handleToday}>Today</button>
                  <button className="cal-nav-btn" onClick={handlePrevMonth}>&lsaquo;</button>
                  <button className="cal-nav-btn" onClick={handleNextMonth}>&rsaquo;</button>
                  <span className="cal-nav-title">{monthsNames[cMon]} {cYr}</span>
                </div>
              </div>
              <div className="p-4 px-5">
                <div className="cal-grid-header">
                  {dayNames.map(d => (
                    <div key={d} className="cal-grid-header-cell">{d}</div>
                  ))}
                </div>
                <div className="cal-grid">
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} className="cal-day empty" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dayEvents = getEventsForDay(dayNum);
                    const isSelected = selectedDate && selectedDate.getDate() === dayNum && selectedDate.getMonth() === cMon && selectedDate.getFullYear() === cYr;
                    const isToday = dayNum === today.getDate() && cMon === today.getMonth() && cYr === today.getFullYear();
                    return (
                      <div
                        key={`day-${dayNum}`}
                        onClick={() => handleDayClick(dayNum)}
                        className={`cal-day${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}`}
                      >
                        <span className={`cal-day-num${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}>{dayNum}</span>
                        <div className="cal-day-events">
                          {dayEvents.slice(0, 3).map(getEventBadge)}
                          {dayEvents.length > 3 && (
                            <div className="cal-event-more">+{dayEvents.length - 3} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
          {viewMode === 'agenda' && renderAgendaView()}
        </div>

        {/* RIGHT PANEL — Agenda Details */}
        {viewMode !== 'agenda' && (
          <div className="cal-panel">
            <div className="dash-card">
              <div className="mb-4">
                <h3 className="dash-card-title text-base mb-1">Agenda Details</h3>
                <span className="text-sm text-muted">
                  {selectedDate ? selectedDate.toDateString() : 'Select a date to inspect schedule'}
                </span>
              </div>
              <div className="flex-col gap-3 flex-1">
                <div className="agenda-section-label">SCHEDULED EVENTS ({selectedDayEvents.length})</div>
                {selectedDayEvents.length === 0 ? (
                  <div className="sidebar-empty">
                    {selectedDate ? 'No events scheduled for this date.' : 'Select a date to view events.'}
                  </div>
                ) : (
                  <div className="flex-col gap-2">
                    {selectedDayEvents.map(e => (
                      <div
                        key={`agenda-${e._id}`}
                        className="agenda-item"
                        style={{ borderLeftColor: e.color || 'var(--accent)' }}
                        onClick={() => { if (onEditEvent) onEditEvent(e); }}
                      >
                        <div className="agenda-item-title">{e.title}</div>
                        {e.description && <div className="agenda-item-desc">{e.description}</div>}
                        <div className="agenda-item-meta">
                          <span>{formatTime(e.start)} - {formatTime(e.end)}</span>
                          <span>Type: {(e.type || 'custom').toUpperCase()}</span>
                        </div>
                        {e.assignedTo && (
                          <div className="agenda-item-assignee">Assigned: {e.assignedTo.name || 'Staff'}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
