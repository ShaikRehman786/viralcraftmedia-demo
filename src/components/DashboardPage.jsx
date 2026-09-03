import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { Clock, X } from 'lucide-react';
import ToastContainer, { useToast } from './Toast.jsx';
import { io } from 'socket.io-client';
import { initPushNotifications } from '../services/pushInit.js';
import { requestNotificationPermission, getNotificationPermission, showBrowserNotification } from '../services/browserNotify.js';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import CRMGlobalLoader from './shared/CRMGlobalLoader.jsx';

const OverviewPage = lazy(() => import('./OverviewPage.jsx'));
const ProjectsPage = lazy(() => import('./ProjectsPage.jsx'));
const CalendarTab = lazy(() => import('./CalendarTab.jsx'));
const StaffPage = lazy(() => import('./StaffPage.jsx'));
const LogsPage = lazy(() => import('./LogsPage.jsx'));
const EnquiriesPage = lazy(() => import('./EnquiriesPage.jsx'));
const WhatsAppPage = lazy(() => import('./WhatsAppPage.jsx'));
const PaymentsPage = lazy(() => import('./PaymentsPage.jsx'));
const NotificationCenterPage = lazy(() => import('./NotificationCenterPage.jsx'));
const ReferralManagementPage = lazy(() => import('./ReferralManagementPage.jsx'));
const BackupPortalPage = lazy(() => import('./BackupPortalPage.jsx'));

axios.defaults.withCredentials = true;

const SOCKET_URL = import.meta.env.VITE_API_URL;
const getSocketUrl = () => SOCKET_URL;

const ROLE_ACCESS = {
  overview: ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE'],
  projects: ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE', 'CLIENT'],
  calendar: ['SUPER_ADMIN'],
  staff: ['SUPER_ADMIN', 'MANAGER'],
  logs: ['SUPER_ADMIN'],
  backup: ['SUPER_ADMIN', 'BACKUP_ADMIN'],
  enquiries: ['SUPER_ADMIN'],
  whatsapp: ['SUPER_ADMIN'],
  payments: ['CLIENT', 'SUPER_ADMIN'],
  'notification-center': ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE'],
  referrals: ['SUPER_ADMIN'],
};

export default function DashboardPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getTabFromPath = (pathname) => {
    const parts = pathname.split('/').filter(Boolean);
    return parts[1] || 'overview';
  };

  const activeTab = getTabFromPath(location.pathname);
  const setActiveTab = useCallback((tabId) => {
    const parts = location.pathname.split('/').filter(Boolean);
    const basePath = parts[0] || 'dashboard';
    if (tabId === 'overview') {
      navigate(`/${basePath}`, { replace: false });
    } else {
      navigate(`/${basePath}/${tabId}`, { replace: false });
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    if (!user) return;
    const allowedRoles = ROLE_ACCESS[activeTab];
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      let fallback = 'overview';
      if (user.role === 'CLIENT') {
        fallback = 'projects';
      }
      setActiveTab(fallback);
    }
  }, [activeTab, user, setActiveTab]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [analytics, setAnalytics] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  
  // Realtime / Chat States
  const [activeChatProj, setActiveChatProj] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  
  // Modals & Action States
  const [selectedTask, setSelectedTask] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('');
  const [feedback, setFeedback] = useState('');
  const [subUrl, setSubUrl] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [roleUpdateUser, setRoleUpdateUser] = useState(null);
  const [roleUpdateVal, setRoleUpdateVal] = useState('CLIENT');

  // Category Filtering, Search & Export States
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');
  const [projectPriorityFilter, setProjectPriorityFilter] = useState('all');

  // Task Details Drawer States
  const [activeTaskDetails, setActiveTaskDetails] = useState(null);
  const [taskCommentText, setTaskCommentText] = useState('');
  const [taskEstHours, setTaskEstHours] = useState(0);
  const [taskActHours, setTaskActHours] = useState(0);
  const [taskDepId, setTaskDepId] = useState('');

  // Final Review Dialog States
  const [selectedFinalReviewProject, setSelectedFinalReviewProject] = useState(null);
  const [finalReviewDecision, setFinalReviewDecision] = useState('');
  const [finalReviewFeedback, setFinalReviewFeedback] = useState('');

  // Enquiries / Leads States
  const [enquiries, setEnquiries] = useState([]);
  const [enqSearch, setEnqSearch] = useState('');
  const [enqStatusFilter, setEnqStatusFilter] = useState('all');
  const [enqCategoryFilter, setEnqCategoryFilter] = useState('all');
  const [enqReferralFilter, setEnqReferralFilter] = useState('all');
  const [noteText, setNoteText] = useState('');
  const [activeEnquiryForNote, setActiveEnquiryForNote] = useState(null);
  
  // Notification Permission Banner
  const [notifBanner, setNotifBanner] = useState(null);

  const handleEnableNotifications = async () => {
    setNotifBanner('prompt');
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      setNotifBanner('subscribing');
      try {
        const reg = await navigator.serviceWorker.ready;
        const ok = await initPushNotifications(reg);
        setNotifBanner(ok ? 'subscribed' : 'prompt');
        if (ok) setTimeout(() => setNotifBanner(null), 4000);
      } catch (e) {
        console.error('Push init after enable failed:', e.message);
        setNotifBanner('prompt');
      }
    } else if (perm === 'denied') {
      setNotifBanner('denied');
    }
  };

  const dismissNotifBanner = () => setNotifBanner(null);

  // Invitation Form States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState('EMPLOYEE');
  const [inviteDept, setInviteDept] = useState('');
  const [inviteSkills, setInviteSkills] = useState('');

  // Calendar Event Dialog States
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calEventId, setCalEventId] = useState(null);
  const [calTitle, setCalTitle] = useState('');
  const [calDesc, setCalDesc] = useState('');
  const [calStart, setCalStart] = useState('');
  const [calEnd, setCalEnd] = useState('');
  const [calAllDay, setCalAllDay] = useState(false);
  const [calAssignedTo, setCalAssignedTo] = useState('');
  const [calType, setCalType] = useState('custom');
  const [calColor, setCalColor] = useState('var(--accent)');
  const [calRecurrence, setCalRecurrence] = useState('none');
  const [calRecurrenceEnd, setCalRecurrenceEnd] = useState('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  
  // TeamLogger States
  const [teamActivity, setTeamActivity] = useState(null);
  const [teamScreenshots, setTeamScreenshots] = useState([]);

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!showCalendarModal) return;
    const handleEsc = (e) => { if (e.key === 'Escape') setShowCalendarModal(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showCalendarModal]);

  // Initialize category filter
  useEffect(() => {
    setSelectedCategoryFilter('All');
  }, [user]);

  const refreshAllData = useCallback(async () => {
    if (!user) return;

    // 1. Prepare independent parallel API requests
    const promiseEntries = [
      ['notifications', axios.get('/api/notifications')],
      ['projects', axios.get('/api/projects')],
      ['tasks', axios.get('/api/tasks')]
    ];

    const userRole = (user.role || '').toUpperCase();
    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'MANAGER';
    if (isAdmin) {
      promiseEntries.push(['analytics', axios.get('/api/analytics/dashboard')]);
      promiseEntries.push(['staff', axios.get('/api/auth/staff')]);
    }

    try {
      // 2. Fetch all CRM module datasets in parallel safely with allSettled
      const results = await Promise.allSettled(promiseEntries.map(e => e[1]));
      
      const dataMap = {};
      promiseEntries.forEach(([key], idx) => {
        if (results[idx].status === 'fulfilled' && results[idx].value?.data) {
          dataMap[key] = results[idx].value.data;
        }
      });

      if (dataMap.notifications) {
        setNotifications(dataMap.notifications.data || []);
        setUnreadCount(dataMap.notifications.unreadCount || 0);
      }

      if (dataMap.projects) {
        const rawProjects = Array.isArray(dataMap.projects?.data)
          ? dataMap.projects.data
          : (Array.isArray(dataMap.projects) ? dataMap.projects : (Array.isArray(dataMap.projects?.projects) ? dataMap.projects.projects : []));
        setProjects(rawProjects);
      }

      if (dataMap.tasks) {
        const rawTasks = Array.isArray(dataMap.tasks?.data)
          ? dataMap.tasks.data
          : (Array.isArray(dataMap.tasks) ? dataMap.tasks : []);
        setTasks(rawTasks);
      }

      if (dataMap.analytics) {
        setAnalytics(dataMap.analytics.stats);
      }

      if (dataMap.staff) {
        setStaff(dataMap.staff.data || []);
      }
    } catch (err) {
      console.error('Error refreshing CRM dashboard data in parallel:', err);
    } finally {
      setDataLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Dynamic tab fetches: fetch logs and calendar events only when specific tabs are active
  useEffect(() => {
    if (!user) return;
    if (activeTab === 'logs' && user.role === 'SUPER_ADMIN') {
      axios.get('/api/logs?limit=1000')
        .then(res => setLogs(res.data.data))
        .catch(console.error);
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'calendar' && (user.role === 'SUPER_ADMIN' || user.role === 'MANAGER')) {
      axios.get('/api/calendar')
        .then(res => setCalendarEvents(res.data.data))
        .catch(console.error);
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (!user) return;

    // Establish WebSocket listener
    const socket = io(getSocketUrl(), {
      withCredentials: true
    });

    // Register user
    socket.emit('register', user._id);

    // Listen to real-time events
    socket.on('Project Created', () => {
      refreshAllData();
    });

    socket.on('project-created', () => {
      refreshAllData();
    });

    socket.on('Task Created', () => {
      refreshAllData();
    });

    socket.on('task-created', () => {
      refreshAllData();
    });

    socket.on('Dashboard Updated', () => {
      refreshAllData();
    });

    socket.on('dashboard-update', () => {
      refreshAllData();
    });

    socket.on('new_notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      if (user?.role === 'SUPER_ADMIN') {
        showBrowserNotification(
          notification.title || 'New Notification',
          notification.message || '',
          notification.actionUrl || '/admin?tab=enquiries'
        );
      }
    });

    if (user?.role === 'SUPER_ADMIN') {
      const perm = getNotificationPermission();
      if (perm === 'granted') {
        (async () => {
          try {
            const reg = await navigator.serviceWorker.ready;
            const ok = await initPushNotifications(reg);
            if (ok) {
              setNotifBanner('subscribed');
              setTimeout(() => setNotifBanner(null), 4000);
            }
          } catch (e) {
            console.error('Push init after grant failed:', e.message);
          }
        })();
      } else if (perm === 'default') {
        setNotifBanner('prompt');
      } else if (perm === 'denied') {
        setNotifBanner('denied');
      } else {
        setNotifBanner('unsupported');
      }
    }
    
    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Load chat messages when active project chat drawer opens
  useEffect(() => {
    if (!activeChatProj) return;

    const fetchChat = async () => {
      try {
        const res = await axios.get(`/api/projects/${activeChatProj._id}/chat`);
        setChatMessages(res.data.data);
      } catch (err) {
        // Silent fail — chat polling recovers on next interval
      }
    };
    fetchChat();
    const interval = setInterval(fetchChat, 3000); // Poll chat messages every 3s
    return () => clearInterval(interval);
  }, [activeChatProj]);

  // Scroll to bottom of chat messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Authorization check (redirect if trying to access unauthorized tab)
  useEffect(() => {
    if (!user) return;

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
      referrals: ['SUPER_ADMIN'],
    };

    const canAccessTab = (tabId, role) => {
      const allowed = ROLE_ACCESS[tabId];
      if (!allowed) return false;
      return allowed.includes(role);
    };

    const tab = getTabFromPath(location.pathname);
    if (!canAccessTab(tab, user.role)) {
      const parts = location.pathname.split('/').filter(Boolean);
      const basePath = parts[0] || 'dashboard';
      navigate(`/${basePath}`, { replace: true });
    }
  }, [user, location.pathname, navigate]);

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      window.location.href = '/';
    } catch (err) {
      window.location.href = '/';
    }
  };

  const handlePostChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChatProj) return;
    try {
      const res = await axios.post(`/api/projects/${activeChatProj._id}/chat`, { message: chatInput });
      setChatMessages(prev => [...prev, res.data.data]);
      setChatInput('');
    } catch (err) {
      // Failed to post comment — UI remains unchanged
    }
  };

  const handleTaskAssignment = async (taskId) => {
    if (!assigneeId) return;
    try {
      await axios.post(`/api/tasks/${taskId}/assign`, { assignedTo: assigneeId });
      // Reload lists
      const res = await axios.get('/api/tasks');
      setTasks(res.data.data);
      setAssigneeId('');
      addToast('Task assigned successfully.', 'success');
    } catch (err) {
      addToast('Assignment failed.', 'error');
    }
  };

  const handleTaskSubmission = async (e) => {
    e.preventDefault();
    if (!subUrl || !selectedTask) return;
    try {
      await axios.post(`/api/tasks/${selectedTask._id}/submit`, { submissionUrl: subUrl });
      const res = await axios.get('/api/tasks');
      setTasks(res.data.data);
      setSelectedTask(null);
      setSubUrl('');
      addToast('Task submitted successfully for review.', 'success');
    } catch (err) {
      addToast('Submission failed.', 'error');
    }
  };

  const handleTaskReview = async (e) => {
    e.preventDefault();
    if (!reviewDecision || !selectedTask) return;
    try {
      await axios.post(`/api/tasks/${selectedTask._id}/review`, { 
        decision: reviewDecision, 
        feedback: reviewDecision === 'reject' ? feedback : 'Approved' 
      });
      const res = await axios.get('/api/tasks');
      setTasks(res.data.data);
      setSelectedTask(null);
      setReviewDecision('');
      setFeedback('');
      addToast('Review completed successfully.', 'success');
    } catch (err) {
      addToast('Review failed.', 'error');
    }
  };

  const handleRoleUpdate = async (e) => {
    e.preventDefault();
    if (!roleUpdateUser) return;
    try {
      await axios.put(`/api/auth/staff/${roleUpdateUser._id}/role`, { role: roleUpdateVal });
      const staffRes = await axios.get('/api/auth/staff');
      setStaff(staffRes.data.data);
      setRoleUpdateUser(null);
      addToast('User role updated successfully.', 'success');
    } catch (err) {
      addToast('Failed to update role.', 'error');
    }
  };

  const handleInviteUserSubmit = async (e) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) {
      addToast('Name and Email are required.', 'warning');
      return;
    }
    try {
      // 1. Create invitation on the backend
      const res = await axios.post('/api/auth/staff', {
        name: inviteName,
        email: inviteEmail,
        phone: invitePhone,
        role: inviteRole,
        department: inviteDept,
        skills: inviteSkills
      });

      const { user: createdUser, invitationToken } = res.data;

      // Reset
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      setInviteDept('');
      setInviteSkills('');
      setShowInviteModal(false);

      // 2. Dispatch EmailJS browser notification from client
      const registration_link = `${window.location.origin}/register?token=${invitationToken}`;
      const templateParams = {
        employee_name: createdUser.name,
        employee_email: createdUser.email,
        admin_name: user?.name || 'Administrator',
        role: createdUser.role,
        department: createdUser.department || 'N/A',
        registration_link
      };

      try {
        await sendEmailJS(templateParams);
        // 3. Confirm success
        await axios.post(`/api/auth/staff/${createdUser._id}/email-sent`);
        addToast('Invitation sent successfully.', 'success');
      } catch (emailErr) {
        // 4. Log failure
        await axios.post(`/api/auth/staff/${createdUser._id}/email-failed`, {
          errorDetails: emailErr.message || 'EmailJS failed to deliver'
        });
        addToast(`Invitation created, but email dispatch failed: ${emailErr.message}`, 'error');
      }

      // Reload staff
      const staffRes = await axios.get('/api/auth/staff');
      setStaff(staffRes.data.data);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to send invitation.', 'error');
    }
  };

  const handleResendInvite = async (staffMember) => {
    try {
      const res = await axios.post(`/api/auth/staff/${staffMember._id}/resend`);
      addToast(res.data.message || 'Invitation email resent successfully.', 'success');
      
      const staffRes = await axios.get('/api/auth/staff');
      setStaff(staffRes.data.data);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to resend invitation.', 'error');
    }
  };

  const handleCancelInvite = async (id) => {
    if (!confirm('Are you sure you want to cancel this invitation? The registration link will become invalid immediately.')) return;
    try {
      await axios.post(`/api/auth/staff/${id}/cancel`);
      const staffRes = await axios.get('/api/auth/staff');
      setStaff(staffRes.data.data);
      addToast('Invitation cancelled successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to cancel invitation.', 'error');
    }
  };

  const handleApproveUser = async (id) => {
    if (!confirm('Are you sure you want to approve this user profile?')) return;
    try {
      const res = await axios.put(`/api/auth/staff/${id}/approve`);
      const approvedUser = res.data.user;

      try {
        await sendEmailJS({
          employee_name: approvedUser.name,
          employee_email: approvedUser.email,
          admin_name: user?.name || 'Administrator',
          role: approvedUser.role,
          department: approvedUser.department || 'N/A',
          registration_link: `${window.location.origin}/login`
        });
      } catch (emailErr) {
        // Email notification failed — user was still approved
      }

      const staffRes = await axios.get('/api/auth/staff');
      setStaff(staffRes.data.data);
      addToast('User approved successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to approve user.', 'error');
    }
  };

  const handleRejectUser = async (id) => {
    if (!confirm('Are you sure you want to reject this employee account?')) return;
    try {
      const res = await axios.put(`/api/auth/staff/${id}/reject`);
      const rejectedUser = res.data.user;

      if (confirm('Would you like to send a rejection notification email to this user?')) {
        try {
          await sendEmailJS({
            employee_name: rejectedUser.name,
            employee_email: rejectedUser.email,
            admin_name: user?.name || 'Administrator',
            role: rejectedUser.role,
            department: 'N/A',
            registration_link: 'REJECTED'
          });
          addToast('Rejection notification sent successfully.', 'success');
        } catch (emailErr) {
          // Rejection email failed — user was still rejected
        }
      }

      const staffRes = await axios.get('/api/auth/staff');
      setStaff(staffRes.data.data);
      addToast('Employee registration rejected.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to reject user.', 'error');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await axios.put(`/api/auth/staff/${id}/status`);
      const staffRes = await axios.get('/api/auth/staff');
      setStaff(staffRes.data.data);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to toggle status.');
    }
  };

  const handleResetPassword = async (id) => {
    if (!confirm('Are you sure you want to reset this user\'s password? A temporary key will be generated and emailed.')) return;
    try {
      await axios.post(`/api/auth/staff/${id}/reset-password`);
      addToast('Temporary password has been generated and emailed to the user.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to reset password.');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user permanently? This cannot be undone.')) return;
    try {
      await axios.delete(`/api/auth/staff/${id}`);
      const staffRes = await axios.get('/api/auth/staff');
      setStaff(staffRes.data.data);
      addToast('User deleted successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete user.');
    }
  };

  const handleCalendarEventSubmit = async (e) => {
    e.preventDefault();
    if (!calTitle || !calStart || !calEnd) {
      addToast('Title, Start, and End times are required.', 'warning');
      return;
    }

    const payload = {
      title: calTitle,
      description: calDesc,
      start: calStart,
      end: calEnd,
      allDay: calAllDay,
      assignedTo: calAssignedTo || null,
      type: calType,
      color: calColor,
      recurrence: calRecurrence,
      recurrenceEnd: calRecurrenceEnd || null
    };

    try {
      if (calEventId) {
        await axios.put(`/api/calendar/${calEventId}`, payload);
      } else {
        await axios.post('/api/calendar', payload);
      }
      const calRes = await axios.get('/api/calendar');
      setCalendarEvents(calRes.data.data);
      setShowCalendarModal(false);
      // Reset
      setCalEventId(null);
      setCalTitle('');
      setCalDesc('');
      setCalStart('');
      setCalEnd('');
      setCalAllDay(false);
      setCalAssignedTo('');
      setCalType('custom');
      setCalColor('var(--accent)');
      setCalRecurrence('none');
      setCalRecurrenceEnd('');
    } catch (err) {
      addToast('Failed to save calendar event.', 'error');
    }
  };

  const handleCalendarEventDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this calendar event?')) return;
    try {
      await axios.delete(`/api/calendar/${id}`);
      const calRes = await axios.get('/api/calendar');
      setCalendarEvents(calRes.data.data);
      setShowCalendarModal(false);
    } catch (err) {
      addToast('Failed to delete event.', 'error');
    }
  };

  const handleTimeTracking = async (action) => {
    if (!activeTaskDetails) return;
    try {
      const res = await axios.post(`/api/tasks/${activeTaskDetails._id}/time-tracking`, { action });
      setActiveTaskDetails(res.data.data);
      // Reload tasks queue
      const tasksRes = await axios.get('/api/tasks');
      setTasks(tasksRes.data.data);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update time tracking.');
    }
  };

  const handleAddTaskComment = async (e) => {
    e.preventDefault();
    if (!activeTaskDetails || !taskCommentText.trim()) return;
    try {
      const res = await axios.post(`/api/tasks/${activeTaskDetails._id}/comments`, { text: taskCommentText });
      setActiveTaskDetails(res.data.data);
      setTaskCommentText('');
      // Reload tasks queue
      const tasksRes = await axios.get('/api/tasks');
      setTasks(tasksRes.data.data);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to add comment.');
    }
  };

  const handleAddDependency = async (e) => {
    e.preventDefault();
    if (!activeTaskDetails || !taskDepId) return;
    try {
      const res = await axios.post(`/api/tasks/${activeTaskDetails._id}/dependency`, { dependencyId: taskDepId });
      setActiveTaskDetails(res.data.data);
      setTaskDepId('');
      // Reload tasks queue
      const tasksRes = await axios.get('/api/tasks');
      setTasks(tasksRes.data.data);
      addToast('Dependency mapped successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to map dependency.');
    }
  };

  const handleSaveHours = async (e) => {
    e.preventDefault();
    if (!activeTaskDetails) return;
    try {
      const res = await axios.put(`/api/tasks/${activeTaskDetails._id}/hours`, { estimatedHours: taskEstHours, actualHours: taskActHours });
      setActiveTaskDetails(res.data.data);
      // Reload tasks queue
      const tasksRes = await axios.get('/api/tasks');
      setTasks(tasksRes.data.data);
      addToast('Hours updated successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update task hours.');
    }
  };

  const handleFinalReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFinalReviewProject || !finalReviewDecision) return;
    try {
      const res = await axios.post(`/api/projects/${selectedFinalReviewProject._id}/final-approval`, {
        decision: finalReviewDecision,
        feedback: finalReviewFeedback
      });
      addToast(res.data.message || 'Final approval submitted.', 'success');
      
      // Reload projects & tasks
      const projRes = await axios.get('/api/projects');
      setProjects(projRes.data.data);
      const tasksRes = await axios.get('/api/tasks');
      setTasks(tasksRes.data.data);

      setSelectedFinalReviewProject(null);
      setFinalReviewDecision('');
      setFinalReviewFeedback('');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to submit final review.');
    }
  };

  const handleExportCSV = () => {
    const isAllCat = !selectedCategoryFilter || selectedCategoryFilter.toLowerCase() === 'all';
    const filtered = projects.filter(p => {
      if (!p) return false;
      const matchesCategory = isAllCat || (p.category || 'Short Form Editing') === selectedCategoryFilter || p.category === selectedCategoryFilter;
      const matchesSearch = !projectSearch || (p.name || '').toLowerCase().includes(projectSearch.toLowerCase()) || 
                            (p.client?.name || '').toLowerCase().includes(projectSearch.toLowerCase());
      const matchesStatus = !projectStatusFilter || projectStatusFilter === 'all' || p.status === projectStatusFilter;
      const matchesPriority = !projectPriorityFilter || projectPriorityFilter === 'all' || p.priority === projectPriorityFilter;
      return matchesCategory && matchesSearch && matchesStatus && matchesPriority;
    });
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Project Name,Client,Category,Status,Priority,Deadline,Manager,Assigned Employees\n";
    
    filtered.forEach(p => {
      const row = [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${(p.client?.name || 'Unknown').replace(/"/g, '""')}"`,
        `"${p.category || 'Short Form Editing'}"`,
        `"${p.status}"`,
        `"${p.priority}"`,
        `"${p.estimatedCompletion ? new Date(p.estimatedCompletion).toLocaleDateString() : 'N/A'}"`,
        `"${(p.manager?.name || 'None').replace(/"/g, '""')}"`,
        `"${p.employees?.map(e => e.name).join(', ') || 'None'}"`
      ].join(",");
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `viralcraft_projects_${selectedCategoryFilter.toLowerCase().replace(/ /g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmSuggestion = async (projectId, suggestedEmpId) => {
    try {
      await axios.post(`/api/projects/${projectId}/assign`, { employeeIds: [suggestedEmpId] });
      const res = await axios.get('/api/projects');
      setProjects(res.data.data);
      addToast('Workload-suggested employee assigned to project successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to assign suggested employee.');
    }
  };

  const handleAcceptProject = async (projectId) => {
    try {
      await axios.post(`/api/projects/${projectId}/accept`);
      const res = await axios.get('/api/projects');
      setProjects(res.data.data);
      addToast('Project assignment accepted successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to accept project assignment.');
    }
  };

  const [debouncedEnqSearch, setDebouncedEnqSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEnqSearch(enqSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [enqSearch]);

  const loadEnquiries = useCallback(async () => {
    try {
      const res = await axios.get(`/api/enquiries?search=${debouncedEnqSearch}&status=${enqStatusFilter}&category=${enqCategoryFilter}&referral=${enqReferralFilter}`);
      setEnquiries(res.data.data);
    } catch (err) {
      // enquiry load failed silently
    }
  }, [debouncedEnqSearch, enqStatusFilter, enqCategoryFilter, enqReferralFilter]);

  useEffect(() => {
    if (user && (user.role === 'SUPER_ADMIN' || user.role === 'MANAGER')) {
      loadEnquiries();
    }
  }, [user, loadEnquiries]);

  const handleAssignManager = async (enquiryId, managerId) => {
    try {
      await axios.put(`/api/enquiries/${enquiryId}/assign`, { managerId });
      loadEnquiries();
      addToast('Manager assigned successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to assign manager.');
    }
  };

  const handleConvertClient = async (enquiryId) => {
    try {
      await axios.post(`/api/enquiries/${enquiryId}/convert-client`);
      loadEnquiries();
      addToast('Lead successfully converted to client profile.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to convert client.');
    }
  };

  const handleConvertProject = async (enquiryId) => {
    try {
      await axios.post(`/api/enquiries/${enquiryId}/convert-project`);
      const projRes = await axios.get('/api/projects');
      setProjects(projRes.data.data);
      loadEnquiries();
      addToast('Lead successfully converted to an active Project!', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to convert project.');
    }
  };

  const handleArchiveEnquiry = async (enquiryId) => {
    if (!confirm('Are you sure you want to archive this lead?')) return;
    try {
      await axios.delete(`/api/enquiries/${enquiryId}`);
      loadEnquiries();
      addToast('Lead archived successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to archive lead.');
    }
  };

  const handleAddEnquiryNote = async (enquiryId) => {
    if (!noteText.trim()) return;
    try {
      await axios.post(`/api/enquiries/${enquiryId}/notes`, { text: noteText });
      setNoteText('');
      setActiveEnquiryForNote(null);
      loadEnquiries();
      addToast('Note added successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to add note.');
    }
  };

  const markNotifRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const handleMarkAllNotifRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {}
  };

  const triggerDownload = (invoiceUrl, orderId) => {
    if (!invoiceUrl) return;
    const a = document.createElement('a');
    a.href = invoiceUrl;
    a.download = `invoice_${orderId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <Clock className="spinner" size={24} color="var(--accent)" />
          <p className="loading-text">Please wait, loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="app">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} user={user} />
        <div className="app-main">
          <TopBar user={user} unreadCount={unreadCount} notifications={notifications} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} activeTab={activeTab} onNavigate={setActiveTab} onMarkRead={markNotifRead} onMarkAllRead={handleMarkAllNotifRead} />
          {notifBanner && (
            <div style={{
              padding: '10px 20px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              background: notifBanner === 'denied' ? 'rgba(239,68,68,0.1)' : notifBanner === 'subscribed' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
              borderBottom: '1px solid ' + (notifBanner === 'denied' ? 'rgba(239,68,68,0.2)' : notifBanner === 'subscribed' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)'),
              color: notifBanner === 'denied' ? '#FCA5A5' : notifBanner === 'subscribed' ? '#6EE7B7' : '#93C5FD'
            }}>
              <span>
                {notifBanner === 'prompt' && <>Get instant browser notifications when new leads arrive.</>}
                {notifBanner === 'denied' && <>Notifications blocked. Enable from browser site settings.</>}
                {notifBanner === 'subscribing' && <>Setting up notifications...</>}
                {notifBanner === 'subscribed' && <>Notifications active.</>}
                {notifBanner === 'unsupported' && <>Browser notifications not supported.</>}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {notifBanner === 'prompt' && (
                  <button
                    onClick={handleEnableNotifications}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#3B82F6',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >Enable</button>
                )}
                {notifBanner !== 'subscribing' && notifBanner !== 'subscribed' && (
                  <button
                    onClick={dismissNotifBanner}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      lineHeight: 1,
                      opacity: 0.6
                    }}
                  >&times;</button>
                )}
              </span>
            </div>
          )}
          <div className="app-content">
            <Suspense fallback={<CRMGlobalLoader message="Loading tab..." />}>
              {(activeTab === 'overview' || !activeTab) && (
                <OverviewPage user={user} analytics={analytics} projects={projects} tasks={tasks} notifications={notifications} staff={staff} teamActivity={teamActivity} formatTimeAgo={formatTimeAgo} loading={!dataLoaded} onRefreshData={refreshAllData} />
              )}
              {activeTab === 'projects' && (
                <ProjectsPage
                  user={user}
                  projects={projects}
                  tasks={tasks}
                  staff={staff}
                  onRefreshData={refreshAllData}
                  selectedCategoryFilter={selectedCategoryFilter}
                  setSelectedCategoryFilter={setSelectedCategoryFilter}
                  projectSearch={projectSearch}
                  setProjectSearch={setProjectSearch}
                  projectStatusFilter={projectStatusFilter}
                  setProjectStatusFilter={setProjectStatusFilter}
                  projectPriorityFilter={projectPriorityFilter}
                  setProjectPriorityFilter={setProjectPriorityFilter}
                  selectedTask={selectedTask}
                  setSelectedTask={setSelectedTask}
                  reviewDecision={reviewDecision}
                  setReviewDecision={setReviewDecision}
                  feedback={feedback}
                  setFeedback={setFeedback}
                  subUrl={subUrl}
                  setSubUrl={setSubUrl}
                  assigneeId={assigneeId}
                  setAssigneeId={setAssigneeId}
                  activeTaskDetails={activeTaskDetails}
                  setActiveTaskDetails={setActiveTaskDetails}
                  taskCommentText={taskCommentText}
                  setTaskCommentText={setTaskCommentText}
                  taskEstHours={taskEstHours}
                  setTaskEstHours={setTaskEstHours}
                  taskActHours={taskActHours}
                  setTaskActHours={setTaskActHours}
                  taskDepId={taskDepId}
                  setTaskDepId={setTaskDepId}
                  selectedFinalReviewProject={selectedFinalReviewProject}
                  setSelectedFinalReviewProject={setSelectedFinalReviewProject}
                  finalReviewDecision={finalReviewDecision}
                  setFinalReviewDecision={setFinalReviewDecision}
                  finalReviewFeedback={finalReviewFeedback}
                  setFinalReviewFeedback={setFinalReviewFeedback}
                  activeChatProj={activeChatProj}
                  setActiveChatProj={setActiveChatProj}
                  chatMessages={chatMessages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  chatEndRef={chatEndRef}
                  handleTaskAssignment={handleTaskAssignment}
                  handleTaskSubmission={handleTaskSubmission}
                  handleTaskReview={handleTaskReview}
                  handleConfirmSuggestion={handleConfirmSuggestion}
                  handleAcceptProject={handleAcceptProject}
                  handleTimeTracking={handleTimeTracking}
                  handleAddTaskComment={handleAddTaskComment}
                  handleAddDependency={handleAddDependency}
                  handleSaveHours={handleSaveHours}
                  handleFinalReviewSubmit={handleFinalReviewSubmit}
                  handleExportCSV={handleExportCSV}
                  handlePostChat={handlePostChat}
                  addToast={addToast}
                  formatTimeAgo={formatTimeAgo}
                />
              )}
              {activeTab === 'calendar' && (
                <CalendarTab
                  events={calendarEvents}
                  staff={staff}
                  projects={projects}
                  tasks={tasks}
                  onEditEvent={(e) => {
                    setCalEventId(e._id.split('_')[0]);
                    setCalTitle(e.title);
                    setCalDesc(e.description || '');
                    setCalStart(new Date(e.start).toISOString().slice(0, 16));
                    setCalEnd(new Date(e.end).toISOString().slice(0, 16));
                    setCalAllDay(e.allDay || false);
                    setCalAssignedTo(e.assignedTo?._id || '');
                    setCalType(e.type || 'custom');
                    setCalColor(e.color || 'var(--accent)');
                    setCalRecurrence(e.recurrence || 'none');
                    setCalRecurrenceEnd(e.recurrenceEnd ? new Date(e.recurrenceEnd).toISOString().slice(0, 10) : '');
                    setShowCalendarModal(true);
                  }}
                  onAddEvent={(defaults) => {
                    setCalStart(defaults.start);
                    setCalEnd(defaults.end);
                    setCalEventId(null);
                    setCalTitle('');
                    setCalDesc('');
                    setShowCalendarModal(true);
                  }}
                />
              )}
              {activeTab === 'staff' && (
                <StaffPage
                  user={user}
                  staff={staff}
                  roleUpdateUser={roleUpdateUser}
                  setRoleUpdateUser={setRoleUpdateUser}
                  roleUpdateVal={roleUpdateVal}
                  setRoleUpdateVal={setRoleUpdateVal}
                  showInviteModal={showInviteModal}
                  setShowInviteModal={setShowInviteModal}
                  inviteName={inviteName}
                  setInviteName={setInviteName}
                  inviteEmail={inviteEmail}
                  setInviteEmail={setInviteEmail}
                  invitePhone={invitePhone}
                  setInvitePhone={setInvitePhone}
                  inviteRole={inviteRole}
                  setInviteRole={setInviteRole}
                  inviteDept={inviteDept}
                  setInviteDept={setInviteDept}
                  inviteSkills={inviteSkills}
                  setInviteSkills={setInviteSkills}
                  handleRoleUpdate={handleRoleUpdate}
                  handleInviteUserSubmit={handleInviteUserSubmit}
                  handleResendInvite={handleResendInvite}
                  handleCancelInvite={handleCancelInvite}
                  handleApproveUser={handleApproveUser}
                  handleRejectUser={handleRejectUser}
                  handleToggleStatus={handleToggleStatus}
                  handleResetPassword={handleResetPassword}
                  handleDeleteUser={handleDeleteUser}
                  addToast={addToast}
                  formatTimeAgo={formatTimeAgo}
                />
              )}
              {activeTab === 'logs' && (
                <LogsPage user={user} logs={logs} staff={staff} />
              )}
              {activeTab === 'enquiries' && (
                <EnquiriesPage
                  enquiries={enquiries}
                  user={user}
                  staff={staff}
                  enqSearch={enqSearch}
                  setEnqSearch={setEnqSearch}
                  enqStatusFilter={enqStatusFilter}
                  setEnqStatusFilter={setEnqStatusFilter}
                  enqCategoryFilter={enqCategoryFilter}
                  setEnqCategoryFilter={setEnqCategoryFilter}
                  enqReferralFilter={enqReferralFilter}
                  setEnqReferralFilter={setEnqReferralFilter}
                  noteText={noteText}
                  setNoteText={setNoteText}
                  activeEnquiryForNote={activeEnquiryForNote}
                  setActiveEnquiryForNote={setActiveEnquiryForNote}
                  handleAssignManager={handleAssignManager}
                  handleConvertClient={handleConvertClient}
                  handleConvertProject={handleConvertProject}
                  handleArchiveEnquiry={handleArchiveEnquiry}
                  handleAddEnquiryNote={handleAddEnquiryNote}
                  addToast={addToast}
                />
              )}
              {activeTab === 'whatsapp' && (
                <WhatsAppPage />
              )}
              {activeTab === 'payments' && (
                <PaymentsPage user={user} projects={projects} triggerDownload={triggerDownload} />
              )}
              {activeTab === 'notification-center' && (
                <NotificationCenterPage user={user} formatTimeAgo={formatTimeAgo} />
              )}
              {activeTab === 'referrals' && (
                <ReferralManagementPage user={user} addToast={addToast} />
              )}
              {activeTab === 'backup' && (
                <BackupPortalPage embedded={true} />
              )}
            </Suspense>
          </div>
        </div>
      </div>

      {/* Calendar Event Modal */}
      {showCalendarModal && (
        <div className="dialog-overlay" onClick={() => setShowCalendarModal(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>{calEventId ? 'Edit Event' : 'New Event'}</h2>
              <button type="button" className="dialog-close-btn" onClick={() => setShowCalendarModal(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCalendarEventSubmit} className="dialog-form">
              <div className="dialog-body">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="input" value={calTitle} onChange={e => setCalTitle(e.target.value)} placeholder="Event title" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="textarea" value={calDesc} onChange={e => setCalDesc(e.target.value)} placeholder="Add description..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start *</label>
                    <input type="datetime-local" className="input" value={calStart} onChange={e => setCalStart(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End *</label>
                    <input type="datetime-local" className="input" value={calEnd} onChange={e => setCalEnd(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" className="checkbox" checked={calAllDay} onChange={e => setCalAllDay(e.target.checked)} />
                    All day event
                  </label>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Assigned To</label>
                    <select className="select" value={calAssignedTo} onChange={e => setCalAssignedTo(e.target.value)}>
                      <option value="">Unassigned</option>
                      {staff.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="select" value={calType} onChange={e => setCalType(e.target.value)}>
                      <option value="custom">Custom</option>
                      <option value="meeting">Meeting</option>
                      <option value="deadline">Deadline</option>
                      <option value="review">Review</option>
                      <option value="shoot">Shoot</option>
                      <option value="edit">Edit</option>
                      <option value="upload">Upload</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Color</label>
                    <input type="color" className="input" value={calColor} onChange={e => setCalColor(e.target.value)} style={{ padding: '4px', height: '40px' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Recurrence</label>
                    <select className="select" value={calRecurrence} onChange={e => setCalRecurrence(e.target.value)}>
                      <option value="none">None</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
                {calRecurrence !== 'none' && (
                  <div className="form-group">
                    <label className="form-label">Recurrence End Date</label>
                    <input type="date" className="input" value={calRecurrenceEnd} onChange={e => setCalRecurrenceEnd(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="dialog-footer">
                {calEventId && (
                  <button type="button" className="btn btn-danger" onClick={() => handleCalendarEventDelete(calEventId)}>Delete</button>
                )}
                <button type="button" className="btn btn-ghost" onClick={() => setShowCalendarModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
