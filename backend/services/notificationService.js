import Notification from '../models/Notification.js';
import { sendPushToUser, sendPushToStaff } from './pushService.js';
import { recordNotificationBackup } from './backupService.js';

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
    recordNotificationBackup({ notification: notify, receiver: { _id: userId } }).catch(() => {});
    // Invalidate unread count cache for recipient (Redis failure is non-blocking)
    import('../config/redis.js').then(({ safeDel }) => safeDel(`notifications:unread:${userId}`).catch(()=>{})).catch(()=>{});
    return notify;
  } catch (err) {
    console.error('Notification creation failed:', err.message);
    return null;
  }
}

const MANAGER_EXCLUDED_TITLES = /(Payment|Invoice|Commission|Payout|Refund|Revenue|Lead|Enquiry|Referral Booking|New Referral)/i;

export async function notifyAdminsOnly(args) {
  // Payment/financial notifications: SUPER_ADMIN only, never MANAGER
  const { default: User } = await import('../models/User.js');
  const admins = await User.find({ role: 'SUPER_ADMIN' });
  const results = [];
  for (const admin of admins) {
    const notify = await createNotification({ userId: admin._id, ...args });
    if (notify && args.dispatcher) args.dispatcher(admin._id.toString(), 'new_notification', notify);
    results.push(notify);
  }
  if (results.filter(Boolean).length > 0) {
    sendPushToStaff(results[0]).catch(()=>{});
  }
  return results.filter(Boolean);
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
    // Manager privacy: financial/customer-acquisition notifications must not go to MANAGER
    const isFinancial = MANAGER_EXCLUDED_TITLES.test(title);
    const roles = isFinancial ? ['SUPER_ADMIN'] : ['SUPER_ADMIN', 'MANAGER'];
    const staffUsers = await User.find({ role: { $in: roles } });

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

export async function sendProjectAssignmentNotifications(projectId, ioDispatcher = null) {
  try {
    const { default: Project } = await import('../models/Project.js');
    const { default: User } = await import('../models/User.js');
    
    const project = await Project.findById(projectId)
      .populate('client')
      .populate('manager')
      .populate('employees');
      
    if (!project) {
      console.error(`[PROJECT-NOTIFICATION] Project not found for ID: ${projectId}`);
      return;
    }

    const rawDepts = project.department
      ? project.department.split(',').map(d => d.trim()).filter(Boolean)
      : [];
    const depts = rawDepts.map(d => d.split('|')[0].trim()).filter(Boolean);
      
    if (depts.length === 0 && project.category) {
      depts.push(project.category);
    }

    const recipients = new Map();
    
    const managersFound = [];
    const employeesFound = [];

    for (const dept of depts) {
      if (dept.toLowerCase() === 'manager') {
        const managerUsers = await User.find({
          $or: [
            { role: 'MANAGER' },
            { department: { $regex: new RegExp('^' + dept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }
          ]
        });
        for (const mgr of managerUsers) {
          managersFound.push(mgr);
          if (mgr && mgr._id && !recipients.has(mgr._id.toString())) {
            recipients.set(mgr._id.toString(), { user: mgr, isManager: true });
          }
        }
        if (project.manager && project.manager._id && !recipients.has(project.manager._id.toString())) {
          managersFound.push(project.manager);
          recipients.set(project.manager._id.toString(), { user: project.manager, isManager: true });
        }
      } else {
        const matchingEmployees = (project.employees || []).filter(emp => 
          emp && emp.department && emp.department.toLowerCase() === dept.toLowerCase()
        );
        for (const emp of matchingEmployees) {
          if (!emp || !emp._id) continue;
          employeesFound.push(emp);
          if (!recipients.has(emp._id.toString())) {
            recipients.set(emp._id.toString(), { user: emp, isManager: false });
          }
        }
      }
    }

    console.log('\n===== PROJECT ASSIGNMENT NOTIFICATION DEBUG =====');
    console.log(`Project: ${project.name}`);
    console.log(`Selected Departments:`, depts);
    console.log(`Assigned Manager IDs:`, (project.manager && project.manager._id) ? [project.manager._id.toString()] : []);
    console.log(`Assigned Employee IDs:`, (project.employees || []).filter(e => e && e._id).map(e => e._id.toString()));
    console.log(`Database query used: findById(projectId).populate('client').populate('manager').populate('employees')`);
    console.log(`Number of Managers found:`, managersFound.length);
    managersFound.forEach(m => console.log(`  Manager: ${m.name}, role=${m.role}, department=${m.department}, phone=${m.phone}, _id=${m._id}`));
    console.log(`Number of Employees found:`, employeesFound.length);
    employeesFound.forEach(e => console.log(`  Employee: ${e.name}, role=${e.role}, department=${e.department}, phone=${e.phone}, _id=${e._id}`));
    console.log(`Final recipient list:`, Array.from(recipients.keys()));

    const whatsappQueue = [];
    const results = [];

    const { default: whatsappService } = await import('./whatsappService.js');

    const getManagerMessage = (projectName, clientName, driveLink) => {
      return `New Project Assigned\n\nProject: ${projectName}\nClient: ${clientName}\n\nYou have been assigned as the Project Manager for this project.\n\nPlease review the project requirements, assign tasks to your team, monitor progress, and ensure the project is delivered on schedule.\n\nProject Resources:\n${driveLink || 'No link provided'}`;
    };

    const getEmployeeMessage = (employeeName, projectName, clientName, department, priority, deadline, driveLink) => {
      let msg = `🚀 NEW PROJECT\n\nHello ${employeeName},\n\nA new project has been assigned to you.\n\nProject Details\n\n• Client: ${clientName}\n• Project: ${projectName}\n• Department: ${department}\n• Priority: ${priority}\n• Deadline: ${deadline}`;
      if (driveLink) {
        msg += `\n\nProject Resources\n\n${driveLink}`;
      }
      msg += `\n\nLogin:\nhttps://viralcraftmedia.com/login\n\nPlease log in to the ViralCraftMedia website using your registered account to review the project details, access your assigned responsibilities, and begin work according to the project timeline.\n\nThank you,\nViralCraftMedia Team`;
      return msg;
    };

    console.log(`Recipient details before notification loop:`);
    for (const [uid, { user: ru, isManager: rm }] of recipients.entries()) {
      console.log(`  Recipient: ${ru.name}, role=${ru.role}, department=${ru.department}, phone=${ru.phone}, isManager=${rm}`);
    }

    for (const [userIdStr, { user, isManager }] of recipients.entries()) {
      const driveLink = project.driveShareableLink || '';
      const clientName = project.client?.name || 'General Client';
      const deadline = project.estimatedCompletion ? new Date(project.estimatedCompletion).toDateString() : 'Not specified';
      const department = project.department || 'General';
      const priority = project.priority ? project.priority.charAt(0).toUpperCase() + project.priority.slice(1) : 'Medium';
      
      const title = isManager ? 'New Project Assigned' : 'New Project Assignment';
      const message = isManager 
        ? getManagerMessage(project.name, clientName, driveLink)
        : getEmployeeMessage(user.name, project.name, clientName, department, priority, deadline, driveLink);

      try {
        const notify = await notifyUser({
          userId: user._id,
          title,
          message,
          type: 'info',
          priority: 'high',
          referenceId: project._id.toString(),
          referenceModel: 'Project',
          actionUrl: isManager ? '/admin?tab=projects' : '/employee',
          dispatcher: ioDispatcher
        });
        results.push({ user: user.name, type: 'In-App', success: !!notify });
        
        if (!isManager) {
          try {
            const { sendEmployeeTaskAlertEmail } = await import('./emailService.js');
            sendEmployeeTaskAlertEmail(user.name, user.email, project.name, project.estimatedCompletion).catch(console.error);
          } catch (emailErr) {
            console.error('[PROJECT-NOTIFICATION] Failed to send email alert:', emailErr.message);
          }
        }
      } catch (inAppErr) {
        console.error(`[PROJECT-NOTIFICATION] In-App Notification failed for ${user.name}:`, inAppErr.message);
        results.push({ user: user.name, type: 'In-App', success: false, error: inAppErr.message });
      }

      if (user.phone && !isManager) {
        whatsappQueue.push(user.name);
        try {
          let cleanPhone = user.phone.replace(/\D/g, '');
          if (cleanPhone.startsWith('0')) {
            cleanPhone = cleanPhone.slice(1);
          }
          if (cleanPhone.length === 10 && !cleanPhone.startsWith('91')) {
            cleanPhone = '91' + cleanPhone;
          }

          if (cleanPhone.length === 12) {
            await whatsappService.sendMessage(cleanPhone, message);
            
            const { default: WhatsAppMessage } = await import('../models/WhatsAppMessage.js');
            const savedMsg = new WhatsAppMessage({
              from: whatsappService.client?.info?.wid?.user || 'system',
              to: cleanPhone,
              body: message,
              type: 'out',
              timestamp: new Date()
            });
            await savedMsg.save();
            results.push({ user: user.name, type: 'WhatsApp', success: true });
          } else {
            console.warn(`[PROJECT-NOTIFICATION] Invalid phone length for ${user.name}: ${user.phone}`);
            results.push({ user: user.name, type: 'WhatsApp', success: false, error: 'Invalid phone length' });
          }
        } catch (waErr) {
          console.error(`[PROJECT-NOTIFICATION] WhatsApp failed for ${user.name}:`, waErr.message);
          results.push({ user: user.name, type: 'WhatsApp', success: false, error: waErr.message });
        }
      }
    }

    console.log("PROJECT DEPARTMENT:", project.department);
    console.log("PARSED DEPARTMENTS:", depts);
    console.log("HAS MANAGER:", depts.some(d => d.trim().toLowerCase() === "manager"));
    if (depts.some(d => d.toLowerCase() === 'manager')) {
      const managerQuery = { role: 'MANAGER', status: { $regex: /^active$/i } };
      console.log("MANAGER QUERY:", JSON.stringify(managerQuery));
      const managerUsersForWA = await User.find(managerQuery);
      console.log("MANAGERS FOUND:", managerUsersForWA.length);
      for (const mgr of managerUsersForWA) {
        console.log("Manager:", mgr.name, "Role:", mgr.role, "Department:", mgr.department, "Phone:", mgr.phone, "Status:", mgr.status);
      }
      if (managerUsersForWA.length === 0) {
        console.log("STOP: managerUsersForWA.length === 0 — no managers found in database");
      }
      for (const mgr of managerUsersForWA) {
        if (mgr.phone) {
          console.log("Sending WhatsApp to", mgr.name, mgr.phone);
          let cleanPhone = mgr.phone.replace(/\D/g, '');
          if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
          if (cleanPhone.length === 10 && !cleanPhone.startsWith('91')) cleanPhone = '91' + cleanPhone;
          if (cleanPhone.length === 12) {
            const clientName = project.client?.name || 'General Client';
            const deadline = project.estimatedCompletion ? new Date(project.estimatedCompletion).toDateString() : 'Not specified';
            const driveLink = project.driveShareableLink || '';
            const priority = project.priority ? project.priority.charAt(0).toUpperCase() + project.priority.slice(1) : 'Medium';
            const department = project.department || 'General';
            let waMessage = `🚀 NEW PROJECT\n\nHello ${mgr.name},\n\nA new project has been created and requires your attention.\n\nProject Details\n\n• Client: ${clientName}\n• Project: ${project.name}\n• Department: ${department}\n• Priority: ${priority}\n• Deadline: ${deadline}`;
            if (driveLink) {
              waMessage += `\n\nProject Resources\n\n${driveLink}`;
            }
            waMessage += `\n\nLogin:\nhttps://viralcraftmedia.com/login\n\nPlease log in to the ViralCraftMedia website using your registered account to review the project details, coordinate the workflow, assign responsibilities where required, monitor project progress, and ensure timely delivery.\n\nThank you,\nViralCraftMedia Team`;
            try {
              await whatsappService.sendMessage(cleanPhone, waMessage);
              console.log("WhatsApp Success");
              const { default: WhatsAppMessage } = await import('../models/WhatsAppMessage.js');
              const savedMsg = new WhatsAppMessage({
                from: whatsappService.client?.info?.wid?.user || 'system',
                to: cleanPhone,
                body: waMessage,
                type: 'out',
                timestamp: new Date()
              });
              await savedMsg.save();
              results.push({ user: mgr.name, type: 'Manager-WA', success: true });
            } catch (waErr) {
              console.log("WhatsApp Error:", waErr.message);
              console.log("Exception:", waErr);
              results.push({ user: mgr.name, type: 'Manager-WA', success: false, error: waErr.message });
            }
          } else {
            console.log("Skipping — invalid phone length:", cleanPhone.length, "for", mgr.name, mgr.phone);
          }
        } else {
          console.log("Skipping — no phone for manager:", mgr.name);
        }
      }
    }

    console.log(`WhatsApp recipient list:`, whatsappQueue);
    console.log(`Success/Failure reason:`, results);
    console.log('==================================================\n');
  } catch (err) {
    console.error('sendProjectAssignmentNotifications failed:', err.message);
  }
}
