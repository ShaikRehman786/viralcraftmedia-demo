import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search, Menu, Command, LayoutDashboard, ClipboardList,
  CalendarDays, Users, ShieldCheck, UserPlus,
  MessageCircle, Receipt, Bell, Plus, Download, ArrowRight
} from 'lucide-react';
import NotificationBell from './NotificationBell.jsx';

const PAGES = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects & Tasks', icon: ClipboardList },
  { id: 'calendar', label: 'Production Calendar', icon: CalendarDays },
  { id: 'staff', label: 'Role Management', icon: Users },
  { id: 'logs', label: 'Security Logs', icon: ShieldCheck },
  { id: 'enquiries', label: 'Inbound Leads', icon: UserPlus },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'payments', label: 'Payments & Invoices', icon: Receipt },
  { id: 'notification-center', label: 'Notification Center', icon: Bell },
];

const COMMANDS = [
  { id: 'new-project', label: 'Create New Project', icon: Plus },
  { id: 'invite-user', label: 'Invite Team Member', icon: UserPlus },
  { id: 'export-csv', label: 'Export Projects CSV', icon: Download },
];

const ROLE_ACCESS = {
  overview: ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE', 'CLIENT'],
  projects: ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE', 'CLIENT'],
  calendar: ['SUPER_ADMIN', 'MANAGER'],
  staff: ['SUPER_ADMIN'],
  logs: ['SUPER_ADMIN'],
  enquiries: ['SUPER_ADMIN', 'MANAGER'],
  whatsapp: ['SUPER_ADMIN', 'MANAGER'],
  payments: ['CLIENT', 'SUPER_ADMIN'],
  'notification-center': ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE'],
};

const TAB_LABELS = {
  overview: 'Overview',
  projects: 'Projects & Tasks',
  calendar: 'Production Calendar',
  staff: 'Role Management',
  logs: 'Security Logs',
  enquiries: 'Inbound Leads',
  whatsapp: 'WhatsApp',
  payments: 'Payments & Invoices',
  'notification-center': 'Notification Center'
};

function canAccess(pageId, role) {
  const allowed = ROLE_ACCESS[pageId];
  if (!allowed) return false;
  return allowed.includes(role);
}

export default function TopBar({ user, unreadCount, notifications, sidebarOpen, setSidebarOpen, activeTab, onNavigate, onMarkRead, onMarkAllRead }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const accessiblePages = useMemo(
    () => PAGES.filter(p => canAccess(p.id, user?.role)),
    [user?.role]
  );

  const filteredPages = useMemo(() => {
    if (!query) return accessiblePages;
    const q = query.toLowerCase();
    return accessiblePages.filter(p => p.label.toLowerCase().includes(q));
  }, [accessiblePages, query]);

  const filteredCommands = useMemo(() => {
    if (!query) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter(c => c.label.toLowerCase().includes(q));
  }, [query]);

  const allItems = useMemo(() => {
    const items = [];
    filteredPages.forEach(p => items.push({ type: 'page', ...p }));
    filteredCommands.forEach(c => items.push({ type: 'command', ...c }));
    return items;
  }, [filteredPages, filteredCommands]);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  const selectItem = useCallback((item) => {
    if (item.type === 'page') {
      onNavigate?.(item.id);
    } else {
      if (item.id === 'new-project') return;
      else if (item.id === 'invite-user') return;
      else if (item.id === 'export-csv') return;
    }
    close();
  }, [onNavigate, close]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handlePaletteKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === 'Enter' && allItems[selectedIndex]) {
      e.preventDefault();
      selectItem(allItems[selectedIndex]);
      return;
    }
  };

  const getInitials = (name) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <button
            className="header-btn menu-toggle-btn"
            onClick={() => setSidebarOpen(prev => !prev)}
            aria-label="Toggle menu"
          >
            <Menu size={18} />
          </button>
          <div className="header-breadcrumb">
            <span>{TAB_LABELS[activeTab] || activeTab}</span>
          </div>
        </div>

        <div className="header-right">
          <div className="header-search" onClick={open}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search anything..."
              readOnly
              onFocus={open}
            />
            <kbd className="search-shortcut">
              <Command size={12} />K
            </kbd>
          </div>

          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={onMarkRead}
            onMarkAllRead={onMarkAllRead}
            onNavigateToCenter={() => onNavigate?.('notification-center')}
          />

          <div className="avatar avatar-sm">
            {getInitials(user?.name || 'U')}
          </div>
        </div>
      </header>

      {isOpen && (
        <div className="dialog-overlay" onClick={close}>
          <div
            className="dialog command-palette"
            onClick={e => e.stopPropagation()}
            onKeyDown={handlePaletteKeyDown}
          >
            <div className="command-search-wrap">
              <Search className="command-search-icon" size={16} />
              <input
                ref={inputRef}
                className="input"
                type="text"
                placeholder="Search pages and commands..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>

            <div className="command-body">
              {filteredPages.length > 0 && (
                <div className="command-group">
                  <div className="command-group-title">Pages</div>
                  {filteredPages.map((page, i) => {
                    const flatIndex = i;
                    const Icon = page.icon;
                    return (
                      <div
                        key={page.id}
                        className={`command-item${selectedIndex === flatIndex ? ' highlighted' : ''}`}
                        onClick={() => selectItem({ type: 'page', ...page })}
                        onMouseEnter={() => setSelectedIndex(flatIndex)}
                      >
                        <div className="command-item-icon">
                          <Icon size={14} />
                        </div>
                        <span className="command-item-label">{page.label}</span>
                        <span className="command-item-hint">
                          <ArrowRight size={10} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredCommands.length > 0 && (
                <div className="command-group">
                  <div className="command-group-title">Commands</div>
                  {filteredCommands.map((cmd, j) => {
                    const flatIndex = filteredPages.length + j;
                    const Icon = cmd.icon;
                    return (
                      <div
                        key={cmd.id}
                        className={`command-item${selectedIndex === flatIndex ? ' highlighted' : ''}`}
                        onClick={() => selectItem({ type: 'command', ...cmd })}
                        onMouseEnter={() => setSelectedIndex(flatIndex)}
                      >
                        <div className="command-item-icon">
                          <Icon size={14} />
                        </div>
                        <span className="command-item-label">{cmd.label}</span>
                        <span className="command-item-hint">↵</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredPages.length === 0 && filteredCommands.length === 0 && (
                <div className="command-empty">
                  No results found for "<strong>{query}</strong>"
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
