import Notification from '../models/Notification.js';
import { sendPushToUser, sendPushToStaff } from './pushService.js';

const NOTIFICATION_ICONS = {
  'New Lead': 'UserPlus',
  'New Enquiry': 'MessageSquare',
  'New Order': 'ShoppingCart',
  'Payment Started': 'CreditCard',
  'Payment Received': 'DollarSign',
  'Payment Failed': 'AlertTriangle',
  'Project Created': 'FolderOpen',
  'Project Assigned': 'ClipboardList',
  'Task Started': 'PlayCircle',
  'Task Paused': 'PauseCircle',
  'Task Resumed': 'PlayCircle',
  'Task Completed': 'CheckCircle',
  'Task Rejected': 'XCircle',
  'Task Approved': 'ThumbsUp',
  'Employee Accepted': 'UserCheck',
  'Employee Rejected': 'UserX',
  'Lead Assigned': 'UserCheck',
  'Lead Converted': 'UserCheck',
  'Invoice Generated': 'FileText',
  'Login': 'LogIn',
  'Logout': 'LogOut',
  'Staff Invited': 'Mail',
  'Staff Registered': 'UserPlus',
  'Staff Approved': 'UserCheck',
  'WhatsApp Connected': 'MessageCircle',
  'WhatsApp Disconnected': 'MessageCircle',
  'System Error': 'AlertOctagon',
  'Contact Form': 'MessageCircle',
  'Consultation': 'CalendarDays',
  'Quote Requested': 'FileText',
  'Service Booked': 'CalendarCheck',
  'File Uploaded': 'UploadCloud',
  'Message Sent': 'MessageSquare',
  'Manager Updated': 'Edit',
  'WhatsApp QR': 'MessageCircle',
  'Project Delivered': 'Package',
  'Project Ready': 'Package',
  'Task Assigned': 'ClipboardList',
  'Project Updated': 'Edit',
  'Lead Created': 'UserPlus'
};

const NOTIFICATION_COLORS = {
  info: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  critical: '#DC2626'
};

const PRIORITY_MAP = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low'
};

function getIconForTitle(title) {
  for (const [key, icon] of Object.entries(NOTIFICATION_ICONS)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return 'Bell';
}

function getPriority(type, title) {
  const lower = title.toLowerCase();
  if (lower.includes('failed') || lower.includes('error') || lower.includes('disconnected') || lower.includes('critical')) return 'critical';
  if (lower.includes('new') || lower.includes('payment') || lower.includes('assigned') || lower.includes('accepted') || lower.includes('completed') || lower.includes('created') || lower.includes('approved')) return 'high';
  if (lower.includes('started') || lower.includes('updated') || lower.includes('converted') || lower.includes('registered') || lower.includes('invited')) return 'medium';
  return 'low';
}

export async function createNotification({
  userId,
  title,
  message,
  type = 'info',
  priority,
  icon,
  color,
  referenceId = '',
  referenceModel = '',
  actionUrl = '',
  createdBy = null,
  metadata = {}
}) {
  try {
    const resolvedPriority = priority || getPriority(type, title);
    const resolvedIcon = icon || getIconForTitle(title);
    const resolvedColor = color || NOTIFICATION_COLORS[type] || '#F97316';

    const notify = new Notification({
      user: userId,
      title,
      message,
      type,
      priority: resolvedPriority,
      icon: resolvedIcon,
      color: resolvedColor,
      referenceId,
      referenceModel,
      actionUrl,
      createdBy,
      metadata
    });

    await notify.save();
    return notify;
  } catch (err) {
    console.error('Notification creation failed:', err.message);
    return null;
  }
}

export async function notifyStaff({
  title,
  message,
  type = 'info',
  priority,
  icon,
  color,
  referenceId = '',
  referenceModel = '',
  actionUrl = '',
  dispatcher = null,
  metadata = {}
}) {
  try {
    const { default: User } = await import('../models/User.js');
    const staffUsers = await User.find({ role: { $in: ['SUPER_ADMIN', 'MANAGER'] } });

    const results = [];
    for (const staff of staffUsers) {
      const notify = await createNotification({
        userId: staff._id,
        title,
        message,
        type,
        priority,
        icon,
        color,
        referenceId,
        referenceModel,
        actionUrl,
        metadata
      });

      if (notify && dispatcher) {
        dispatcher(staff._id.toString(), 'new_notification', notify);
      }

      results.push(notify);
    }

    const validNotifications = results.filter(Boolean);
    if (validNotifications.length > 0) {
      sendPushToStaff(validNotifications[0]).catch(err => {
        console.error('Push notification dispatch failed:', err.message);
      });
    }

    return validNotifications;
  } catch (err) {
    console.error('notifyStaff failed:', err.message);
    return [];
  }
}

export async function notifyUser({
  userId,
  title,
  message,
  type = 'info',
  priority,
  icon,
  color,
  referenceId = '',
  referenceModel = '',
  actionUrl = '',
  dispatcher = null,
  metadata = {}
}) {
  try {
    const notify = await createNotification({
      userId,
      title,
      message,
      type,
      priority,
      icon,
      color,
      referenceId,
      referenceModel,
      actionUrl,
      metadata
    });

    if (notify && dispatcher) {
      dispatcher(userId.toString(), 'new_notification', notify);
    }

    if (notify) {
      sendPushToUser(userId, notify).catch(err => {
        console.error('Push notification to user failed:', err.message);
      });
    }

    return notify;
  } catch (err) {
    console.error('notifyUser failed:', err.message);
    return null;
  }
}
