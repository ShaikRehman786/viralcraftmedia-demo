import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import ClientModel from '../models/Client.js';
import OrderModel from '../models/Order.js';
import WhatsAppSession from '../models/WhatsAppSession.js';
import WhatsAppMessage from '../models/WhatsAppMessage.js';
import AuditLog from '../models/AuditLog.js';
import { notifyStaff } from './notificationService.js';
import { logEvent } from './loggingService.js';
import { config } from '../config/env.js';

let client = null;
let io = null;

const socketDispatcher = (userId, event, data) => {
  if (io) io.to(userId).emit(event, data);
};
let connectionStatus = 'DISCONNECTED';
let qrCodeData = '';
let isInitializing = false;

// Handle raw unhandled rejections inside chromium processes once at module level
process.on('unhandledRejection', (reason, p) => {
  if (reason && reason.message && reason.message.includes('Navigating frame was detached')) {
    console.warn('[WA-AUTOMATION] Recovered from detached chromium browser frame initialization warning.');
  }
});

// Health monitoring metrics
let lastHeartbeat = null;
let reconnectCount = 0;
let qrGeneratedCount = 0;
let sessionRestored = false;
let heartbeatInterval = null;
let lastQrGeneratedAt = null;

const clearSessionDir = async (retries = 5, delay = 500) => {
  const sessionPath = path.join(process.cwd(), '.wwebjs_auth', 'session-vcm-crm-whatsapp');
  if (!fs.existsSync(sessionPath)) return;

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[WA-AUTOMATION] Wiping session credentials directory (attempt ${i + 1}): ${sessionPath}`);
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log(`[WA-AUTOMATION] Wiped session credentials directory successfully.`);
      return;
    } catch (err) {
      console.warn(`[WA-AUTOMATION] Failed to wipe session credentials directory on attempt ${i + 1}: ${err.message}`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('[WA-AUTOMATION] Final attempt to clear session directory failed:', err.message);
      }
    }
  }
};

// Local in-memory cache for CRM-authorized numbers
const cache = {
  adminPhone: null,
  employeePhones: new Set(),
  ignoredPhones: new Set(),
  lastUpdated: 0
};

const formatCleanDigits = (phone) => {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 10 && !clean.startsWith('91')) {
    clean = '91' + clean;
  }
  return clean;
};

const refreshCache = async () => {
  try {
    const users = await User.find({ status: { $regex: /^active$/i } });
    const employees = new Set();
    let adminPhone = null;

    for (const u of users) {
      if (!u.phone) continue;
      const clean = formatCleanDigits(u.phone);
      if (!clean) continue;

      if (u.role === 'SUPER_ADMIN') {
        adminPhone = clean;
      } else if (u.role === 'EMPLOYEE') {
        employees.add(clean);
      }
    }

    if (client && client.info && client.info.wid) {
      const clientClean = formatCleanDigits(client.info.wid.user);
      if (clientClean) {
        adminPhone = clientClean;
      }
    }

    cache.adminPhone = adminPhone;
    cache.employeePhones = employees;
    cache.ignoredPhones.clear();
    cache.lastUpdated = Date.now();
    console.log(`[CRM] [CACHE] Loaded Admin: ${cache.adminPhone || 'N/A'}, Registered Employees: ${cache.employeePhones.size}`);
  } catch (err) {
    console.error('Error refreshing whatsapp cache:', err.message);
  }
};

const logStep = (stepName, details) => {
  console.log(`[WA-AUTOMATION] [${new Date().toISOString()}] [${stepName.toUpperCase()}]`, details || '');
};

const logWhatsAppAudit = async (user, senderPhone, command, action, projectId, taskId, result) => {
  try {
    const log = new AuditLog({
      user: user ? user._id : null,
      userName: user ? user.name : 'Unknown',
      action: 'WHATSAPP_ACTION',
      details: {
        timestamp: new Date(),
        whatsappNumber: senderPhone,
        sender: user ? user.name : 'Unknown',
        command,
        action,
        projectId: projectId ? projectId.toString() : null,
        taskId: taskId ? taskId.toString() : null,
        result
      },
      ipAddress: '127.0.0.1',
      userAgent: 'WhatsApp Automation Engine'
    });
    await log.save();
    logStep('Database Saved', `Audit log saved for action: ${action}`);
  } catch (err) {
    console.error('Failed to save whatsapp audit log:', err.message);
  }
};

const mapCategory = (projectName, department) => {
  const allowedCategories = ['Short Form Editing', 'Podcast Editing', 'Marketing', 'Website Development', 'Branding', 'Consultation'];
  const pName = (projectName || '').toLowerCase();
  const dept = (department || '').toLowerCase();

  for (const cat of allowedCategories) {
    const catLower = cat.toLowerCase();
    if (pName.includes(catLower) || catLower.includes(pName) || dept.includes(catLower) || catLower.includes(dept)) {
      return cat;
    }
  }

  // Fallbacks based on common terms
  if (pName.includes('podcast') || dept.includes('podcast')) return 'Podcast Editing';
  if (pName.includes('video') || dept.includes('video') || pName.includes('short') || dept.includes('short') || pName.includes('reel') || dept.includes('reel')) {
    return 'Short Form Editing';
  }
  if (pName.includes('website') || dept.includes('website') || pName.includes('dev') || dept.includes('dev') || pName.includes('web') || dept.includes('web')) {
    return 'Website Development';
  }

  return 'Short Form Editing';
};

const parseNewProjectMessage = (text) => {
  const lines = text.split('\n').map(l => l.trim());
  const result = {
    client: '',
    projectName: '',
    department: '',
    priority: '',
    deadline: '',
    editors: 1,
    drive: '',
    notes: ''
  };
  
  let currentKey = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const lower = line.toLowerCase();
    
    if (lower.startsWith('client:')) {
      currentKey = 'client';
      result.client = line.substring(7).trim();
    } else if (lower.startsWith('project:')) {
      currentKey = 'projectName';
      result.projectName = line.substring(8).trim();
    } else if (lower.startsWith('department:')) {
      currentKey = 'department';
      result.department = line.substring(11).trim();
    } else if (lower.startsWith('priority:')) {
      currentKey = 'priority';
      result.priority = line.substring(9).trim();
    } else if (lower.startsWith('deadline:')) {
      currentKey = 'deadline';
      result.deadline = line.substring(9).trim();
    } else if (lower.startsWith('editors:')) {
      currentKey = 'editors';
      const val = line.substring(8).trim();
      result.editors = parseInt(val, 10) || 1;
    } else if (lower.startsWith('drive:')) {
      currentKey = 'drive';
      result.drive = line.substring(6).trim();
    } else if (lower.startsWith('notes:')) {
      currentKey = 'notes';
      result.notes = line.substring(6).trim();
    } else {
      if (currentKey === 'notes') {
        result.notes = (result.notes + '\n' + line).trim();
      } else if (currentKey === 'client') {
        result.client = (result.client + ' ' + line).trim();
      } else if (currentKey === 'projectName') {
        result.projectName = (result.projectName + ' ' + line).trim();
      } else if (currentKey === 'department') {
        result.department = (result.department + ' ' + line).trim();
      } else if (currentKey === 'priority') {
        result.priority = (result.priority + ' ' + line).trim();
      } else if (currentKey === 'deadline') {
        result.deadline = (result.deadline + ' ' + line).trim();
      } else if (currentKey === 'drive') {
        result.drive = (result.drive + ' ' + line).trim();
      }
    }
  }
  return result;
};

const parseDateString = (str) => {
  if (!str) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const currentYear = new Date().getFullYear();
  let candidate = str;
  if (!/\d{4}/.test(str)) {
    candidate = `${str} ${currentYear}`;
  }
  const timestamp = Date.parse(candidate);
  if (!isNaN(timestamp)) {
    return new Date(timestamp);
  }
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};

const handleAdminCommand = async (adminUser, text, msg, senderPhone) => {
  const textUpper = text.toUpperCase();
  logStep('Parser Started', { command: textUpper.split('\n')[0], sender: adminUser.name });

  if (textUpper === 'HELP') {
    const helpMsg = `*ViralCraft Media Automation Menu*\n\nAvailable commands:\n- *NEW PROJECT*: Create project (reply with details template)\n- *STATUS*: Get live platform stats\n- *PROJECTS*: View current active projects\n- *TASKS*: View current task board`;
    await msg.reply(helpMsg);
    logStep('Parser Success', 'HELP command processed');
    await logWhatsAppAudit(adminUser, senderPhone, 'HELP', 'Menu sent', null, null, 'Success');
    return;
  }

  if (textUpper === 'STATUS') {
    const projectCount = await Project.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: { $in: ['pending', 'assigned', 'accepted', 'in_progress', 'submitted', 'rejected'] } });
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const onlineEmployees = await User.countDocuments({ role: 'EMPLOYEE', status: { $regex: /^active$/i } });

    const statusMsg = `*ViralCraft Live Status Report*\n\nProjects: ${projectCount}\nPending Tasks: ${pendingTasks}\nCompleted Tasks: ${completedTasks}\nEmployees Online: ${onlineEmployees}`;
    await msg.reply(statusMsg);
    logStep('Parser Success', 'STATUS command processed');
    await logWhatsAppAudit(adminUser, senderPhone, 'STATUS', 'Status report sent', null, null, 'Success');
    return;
  }

  if (textUpper === 'PROJECTS') {
    const activeProjects = await Project.find().limit(10);
    if (activeProjects.length === 0) {
      await msg.reply('No active projects found in the system.');
      return;
    }
    let listStr = `*Active Projects (${activeProjects.length})*\n\n`;
    activeProjects.forEach((p, idx) => {
      listStr += `${idx + 1}. *${p.name}* [Department: ${p.department || p.category || 'N/A'} | Status: ${p.status}]\n`;
    });
    await msg.reply(listStr);
    logStep('Parser Success', 'PROJECTS command processed');
    await logWhatsAppAudit(adminUser, senderPhone, 'PROJECTS', 'Active projects list sent', null, null, 'Success');
    return;
  }

  if (textUpper === 'TASKS') {
    const activeTasks = await Task.find({ status: { $ne: 'completed' } }).limit(10);
    if (activeTasks.length === 0) {
      await msg.reply('No active tasks found.');
      return;
    }
    let listStr = `*Active Tasks Board*\n\n`;
    activeTasks.forEach((t, idx) => {
      listStr += `${idx + 1}. [${t.taskId || 'TASK'}] *${t.name}* - status: ${t.status}\n`;
    });
    await msg.reply(listStr);
    logStep('Parser Success', 'TASKS command processed');
    await logWhatsAppAudit(adminUser, senderPhone, 'TASKS', 'Active tasks board sent', null, null, 'Success');
    return;
  }

  if (textUpper.startsWith('NEW PROJECT')) {
    try {
      const parsed = parseNewProjectMessage(text);
      
      // Provide robust fallback defaults for optional parameters to prevent parsing failure
      if (!parsed.client) parsed.client = 'General Client';
      if (!parsed.priority) parsed.priority = 'medium';
      if (!parsed.deadline) {
        // Default deadline to 7 days from now
        const defaultDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        parsed.deadline = defaultDeadline.toLocaleDateString();
      }

      const requiredFields = ['projectName', 'department'];
      const missingFields = requiredFields.filter(f => !parsed[f]);

      if (missingFields.length > 0) {
        logStep('Errors', `NEW PROJECT validation failed. Missing strictly required fields: ${missingFields.join(', ')}`);
        await msg.reply(`Failed to create project. Please specify both "Project: <name>" and "Department: <department>".`);
        await logWhatsAppAudit(adminUser, senderPhone, 'NEW PROJECT', 'Validation Failed', null, null, `Missing: ${missingFields.join(', ')}`);
        return;
      }

      logStep('Parser Success', 'NEW PROJECT input parsed successfully');

      // Find or create Client
      let clientObj = await ClientModel.findOne({ name: new RegExp('^' + parsed.client + '$', 'i') });
      if (!clientObj) {
        clientObj = new ClientModel({
          name: parsed.client,
          phone: '0000000000',
          notes: 'Auto-created via WhatsApp command'
        });
        await clientObj.save();
        logStep('Database Saved', `New Client created: ${clientObj.name}`);
      }

      // Generate order fallback to maintain database integration health
      const orderIdHash = crypto.randomBytes(4).toString('hex').toUpperCase();
      const orderObj = new OrderModel({
        orderId: `WAP-${orderIdHash}`,
        clientName: clientObj.name,
        phone: clientObj.phone,
        amount: 0,
        paymentStatus: 'success',
        client: clientObj._id,
        status: 'processing',
        orderDate: new Date().toLocaleDateString()
      });
      await orderObj.save();
      logStep('Database Saved', `Fallback Order created: ${orderObj.orderId}`);

      // Create new Project in MongoDB
      const projectObj = new Project({
        order: orderObj._id,
        client: clientObj._id,
        name: parsed.projectName,
        category: mapCategory(parsed.projectName, parsed.department),
        department: parsed.department,
        priority: ['low', 'medium', 'high'].includes(parsed.priority.toLowerCase()) ? parsed.priority.toLowerCase() : 'medium',
        description: parsed.notes,
        estimatedCompletion: parseDateString(parsed.deadline),
        status: 'pending',
        createdBy: adminUser._id,
        source: 'WhatsApp',
        editors: parsed.editors,
        driveShareableLink: parsed.drive || ''
      });
      await projectObj.save();
      logStep('Project Created', `Project saved to MongoDB: ${projectObj.name} (${projectObj._id})`);

      // Automatically link project reference in order
      orderObj.project = projectObj._id;
      await orderObj.save();

      // Automatically generate the 8 required standard tasks
      const taskNames = [
        'Raw Footage',
        'Assembly Edit',
        'Color Grading',
        'Audio Cleanup',
        'Motion Graphics',
        'Thumbnail',
        'Quality Check',
        'Final Delivery'
      ];

      const createdTasks = [];
      for (let j = 0; j < taskNames.length; j++) {
        const t = new Task({
          project: projectObj._id,
          name: taskNames[j],
          taskId: `${orderObj.orderId}-T${String(j + 1).padStart(2, '0')}`,
          priority: projectObj.priority,
          deadline: projectObj.estimatedCompletion,
          status: 'pending'
        });
        await t.save();
        createdTasks.push(t);
      }
      logStep('Tasks Created', `8 default tasks generated for project: ${projectObj.name}`);

      // Locate active employees matching the project's department
      const allActiveEmployees = await User.find({
        role: 'EMPLOYEE',
        status: { $regex: /^active$/i }
      });

      const matchingEmployees = allActiveEmployees.filter(e => {
        if (!e.department || !projectObj.department) return false;
        const ed = e.department.toLowerCase().trim();
        const pd = projectObj.department.toLowerCase().trim();
        if (ed === pd) return true;
        if (pd.includes(ed) || ed.includes(pd)) return true;
        if (ed.includes('edit') && pd.includes('edit')) return true;
        if (ed.includes('design') && pd.includes('design')) return true;
        if (ed.includes('market') && pd.includes('market')) return true;
        return false;
      });

      if (matchingEmployees && matchingEmployees.length > 0) {
        const assignedEmployees = [...matchingEmployees];
        const assignedEmployeeIds = assignedEmployees.map(e => e._id);

        // Link employees to the project
        projectObj.employees = assignedEmployeeIds;

        // Synchronize assignments subdocuments
        if (!projectObj.assignments) {
          projectObj.assignments = [];
        }
        const currentAssignments = projectObj.assignments || [];
        const newAssignments = [];
        for (const empId of assignedEmployeeIds) {
          const existing = currentAssignments.find(a => a.employee?.toString() === empId.toString());
          if (existing) {
            newAssignments.push(existing);
          } else {
            newAssignments.push({
              employee: empId,
              accepted: false,
              acceptedAt: null,
              status: 'Pending'
            });
          }
        }
        projectObj.assignments = newAssignments;
        projectObj.status = 'in_progress';
        await projectObj.save();

        // Assign default tasks
        for (let k = 0; k < assignedEmployees.length; k++) {
          const employee = assignedEmployees[k];
          if (createdTasks[k]) {
            const taskToAssign = createdTasks[k];
            taskToAssign.assignedTo = employee._id;
            taskToAssign.status = 'assigned';
            await taskToAssign.save();
          }
        }

        sendTaskNotification(projectObj._id, assignedEmployeeIds).catch(err => {
          console.error('[WA-NOTIFICATION] Failed to send WhatsApp notifications:', err.message);
        });
      }

      const assignedCount = projectObj.employees ? projectObj.employees.length : 0;
      const successReply = `🚀 *Project Auto-Created successfully!*\n\n• Name: ${projectObj.name}\n• Client: ${clientObj.name}\n• Department: ${projectObj.department}\n• Priority: ${projectObj.priority.toUpperCase()}\n• Deadline: ${projectObj.estimatedCompletion.toDateString()}\n• Employees Assigned: ${assignedCount}\n• Sub-tasks Generated: 8\n\nWhatsApp notifications are being sent to all assigned employees.`;
      await msg.reply(successReply);

      // Emit socket updates
      if (io) {
        io.emit('Project Created', projectObj);
        io.emit('project-created', projectObj);
        for (const tk of createdTasks) {
          io.emit('Task Created', tk);
          io.emit('task-created', tk);
        }
        io.emit('Dashboard Updated', { projectId: projectObj._id });
        io.emit('dashboard-update', { projectId: projectObj._id });
        logStep('Socket Emitted', `Socket updates dispatched for project: ${projectObj.name}`);
      }

      await logWhatsAppAudit(adminUser, senderPhone, 'NEW PROJECT', 'PROJECT_CREATED', projectObj._id, null, 'Success');

    } catch (err) {
      logStep('Errors', `NEW PROJECT database operation failed: ${err.message}`);
      console.error(`[WA-NOTIFICATION] NEW PROJECT failed:`, err.message);
      try {
        await msg.reply(`❌ Project creation failed: ${err.message}`);
      } catch (replyErr) {
        console.error('[WA-NOTIFICATION] Failed to send error reply:', replyErr.message);
      }
    }
  }
};

const handleEmployeeCommand = async (employeeUser, text, msg, senderPhone) => {
  const textUpper = text.toUpperCase();
  logStep('Parser Started', { command: textUpper.split('\n')[0], sender: employeeUser.name });
  let task = null;

  const parts = textUpper.split(' ');
  const commandWord = parts[0].trim();
  const taskIdArg = parts.length > 1 ? parts[1].trim() : null;

  if (taskIdArg) {
    task = await Task.findOne({ 
      assignedTo: employeeUser._id, 
      $or: [
        { taskId: taskIdArg },
        { taskId: new RegExp(taskIdArg + '$', 'i') }
      ]
    });
  }

  if (commandWord === 'ACCEPT') {
    if (!task) {
      task = await Task.findOne({ assignedTo: employeeUser._id, status: 'assigned' }).sort({ updatedAt: -1 });
    }

    if (task) {
      task.status = 'accepted';
      task.acceptedAt = new Date();
      task.comments.push({
        sender: employeeUser._id,
        senderName: employeeUser.name,
        text: `Task accepted via WhatsApp at ${new Date().toLocaleString()}`
      });
      await task.save();
      logStep('Task Accepted', `Task ${task.taskId} marked as accepted`);

      await whatsappService.sendAdminNotification(`Employee ${employeeUser.name} has ACCEPTED the task "${task.name}" (${task.taskId || 'N/A'}).`);
      logStep('Employee Notified', `Admin notified of ACCEPT for task: ${task.name}`);

      notifyStaff({
        title: 'Task Accepted',
        message: `Employee ${employeeUser.name} has accepted the task "${task.name}".`,
        type: 'success',
        dispatcher: socketDispatcher
      });

      if (io) {
        io.emit('Dashboard Updated', { taskId: task._id, employeeId: employeeUser._id });
        io.emit('dashboard-update', { taskId: task._id, employeeId: employeeUser._id });
        logStep('Socket Emitted', `Dashboard update event sent for ACCEPT task ${task.taskId}`);
      }

      await msg.reply(`Success! You have ACCEPTED the task: "${task.name}". Please log in to your dashboard to complete the tasks.`);
      await logWhatsAppAudit(employeeUser, senderPhone, 'ACCEPT', 'TASK_ACCEPTED', task.project, task._id, 'Success');
    } else {
      logStep('Errors', `ACCEPT failed: No matching assigned task found for employee ${employeeUser.name}`);
      await msg.reply('No pending task assignment found to ACCEPT.');
    }
    return;
  }

  if (commandWord === 'DECLINE') {
    if (!task) {
      task = await Task.findOne({ assignedTo: employeeUser._id, status: 'assigned' }).sort({ updatedAt: -1 });
    }

    if (task) {
      const originalName = task.name;
      const originalProj = task.project;
      const originalId = task._id;
      
      task.status = 'pending';
      task.assignedTo = null;
      task.comments.push({
        sender: employeeUser._id,
        senderName: employeeUser.name,
        text: `Task declined via WhatsApp at ${new Date().toLocaleString()}`
      });
      await task.save();
      logStep('Task Declined', `Task ${task.taskId} marked as declined and unassigned`);

      await whatsappService.sendAdminNotification(`⚠️ Employee ${employeeUser.name} has DECLINED the task "${originalName}" (${task.taskId || 'N/A'}).`);
      logStep('Employee Notified', `Admin notified of DECLINE for task: ${originalName}`);

      notifyStaff({
        title: 'Task Declined',
        message: `Employee ${employeeUser.name} has declined the task "${originalName}".`,
        type: 'warning',
        dispatcher: socketDispatcher
      });

      if (io) {
        io.emit('Dashboard Updated', { taskId: originalId });
        io.emit('dashboard-update', { taskId: originalId });
        logStep('Socket Emitted', `Dashboard update event sent for DECLINE task ${task.taskId}`);
      }

      await msg.reply(`You have DECLINED the task "${originalName}". The admin has been notified.`);
      await logWhatsAppAudit(employeeUser, senderPhone, 'DECLINE', 'TASK_DECLINED', originalProj, originalId, 'Success');
    } else {
      logStep('Errors', `DECLINE failed: No matching assigned task found for employee ${employeeUser.name}`);
      await msg.reply('No pending task assignment found to DECLINE.');
    }
    return;
  }

  if (commandWord === 'START' || commandWord === 'RESUME') {
    if (!task) {
      task = await Task.findOne({
        assignedTo: employeeUser._id,
        status: { $in: ['accepted', 'assigned'] }
      }).sort({ updatedAt: -1 });
    }

    if (task) {
      task.status = 'in_progress';
      task.timeTracking.push({
        action: 'start',
        timestamp: new Date()
      });
      task.comments.push({
        sender: employeeUser._id,
        senderName: employeeUser.name,
        text: `Task ${commandWord.toLowerCase()}ed via WhatsApp at ${new Date().toLocaleString()}`
      });
      await task.save();
      logStep(`Task ${commandWord}`, `Task ${task.taskId} marked as in_progress`);

      await whatsappService.sendAdminNotification(`Employee ${employeeUser.name} has ${commandWord}ED the task "${task.name}" (${task.taskId || 'N/A'}).`);
      logStep('Employee Notified', `Admin notified of ${commandWord} for task: ${task.name}`);

      notifyStaff({
        title: `Task ${commandWord === 'START' ? 'Started' : 'Resumed'}`,
        message: `Employee ${employeeUser.name} has ${commandWord.toLowerCase()}ed the task "${task.name}".`,
        type: 'success',
        dispatcher: socketDispatcher
      });

      if (io) {
        io.emit('Dashboard Updated', { taskId: task._id, employeeId: employeeUser._id });
        io.emit('dashboard-update', { taskId: task._id, employeeId: employeeUser._id });
        logStep('Socket Emitted', `Dashboard update event sent for ${commandWord} task ${task.taskId}`);
      }

      await msg.reply(`Success! You have ${commandWord === 'START' ? 'STARTED' : 'RESUMED'} the task: "${task.name}".`);
      await logWhatsAppAudit(employeeUser, senderPhone, commandWord, `TASK_${commandWord === 'START' ? 'STARTED' : 'RESUMED'}`, task.project, task._id, 'Success');
    } else {
      logStep('Errors', `${commandWord} failed: No matching pending or accepted task found for employee ${employeeUser.name}`);
      await msg.reply(`No matching task found to ${commandWord}.`);
    }
    return;
  }

  if (commandWord === 'PAUSE') {
    if (!task) {
      task = await Task.findOne({
        assignedTo: employeeUser._id,
        status: 'in_progress'
      }).sort({ updatedAt: -1 });
    }

    if (task) {
      let elapsedMs = 0;
      const lastStart = [...task.timeTracking].reverse().find(t => t.action === 'start');
      if (lastStart) {
        elapsedMs = Date.now() - new Date(lastStart.timestamp).getTime();
        const elapsedHours = elapsedMs / (1000 * 60 * 60);
        task.actualHours = Number((task.actualHours + elapsedHours).toFixed(2));
      }

      task.status = 'accepted';
      task.timeTracking.push({
        action: 'pause',
        timestamp: new Date(),
        elapsedMs
      });
      task.comments.push({
        sender: employeeUser._id,
        senderName: employeeUser.name,
        text: `Task paused via WhatsApp at ${new Date().toLocaleString()}`
      });
      await task.save();
      logStep('Task Paused', `Task ${task.taskId} marked as accepted (paused)`);

      await whatsappService.sendAdminNotification(`Employee ${employeeUser.name} has PAUSED the task "${task.name}" (${task.taskId || 'N/A'}).`);
      logStep('Employee Notified', `Admin notified of PAUSE for task: ${task.name}`);

      notifyStaff({
        title: 'Task Paused',
        message: `Employee ${employeeUser.name} has paused the task "${task.name}".`,
        type: 'warning',
        dispatcher: socketDispatcher
      });

      if (io) {
        io.emit('Dashboard Updated', { taskId: task._id, employeeId: employeeUser._id });
        io.emit('dashboard-update', { taskId: task._id, employeeId: employeeUser._id });
        logStep('Socket Emitted', `Dashboard update event sent for PAUSE task ${task.taskId}`);
      }

      await msg.reply(`Success! You have PAUSED the task: "${task.name}".`);
      await logWhatsAppAudit(employeeUser, senderPhone, 'PAUSE', 'TASK_PAUSED', task.project, task._id, 'Success');
    } else {
      logStep('Errors', 'PAUSE failed: No active running task found to pause.');
      await msg.reply('No active in-progress task found to PAUSE.');
    }
    return;
  }

  if (commandWord === 'DONE') {
    if (!task) {
      task = await Task.findOne({ 
        assignedTo: employeeUser._id, 
        status: { $in: ['accepted', 'in_progress', 'assigned'] } 
      }).sort({ updatedAt: -1 });
    }

    if (task) {
      let elapsedMs = 0;
      const lastStart = [...task.timeTracking].reverse().find(t => t.action === 'start');
      if (lastStart) {
        elapsedMs = Date.now() - new Date(lastStart.timestamp).getTime();
        const elapsedHours = elapsedMs / (1000 * 60 * 60);
        task.actualHours = Number((task.actualHours + elapsedHours).toFixed(2));
      }

      task.status = 'completed';
      task.completedAt = new Date();
      task.timeTracking.push({
        action: 'complete',
        timestamp: new Date(),
        elapsedMs
      });
      task.comments.push({
        sender: employeeUser._id,
        senderName: employeeUser.name,
        text: `Task marked DONE via WhatsApp at ${new Date().toLocaleString()}`
      });
      await task.save();
      logStep('Task Completed', `Task ${task.taskId} marked as completed`);

      await whatsappService.sendAdminNotification(`✅ Employee ${employeeUser.name} has marked task "${task.name}" (${task.taskId || 'N/A'}) as DONE.`);
      logStep('Employee Notified', `Admin notified of DONE for task: ${task.name}`);

      notifyStaff({
        title: 'Task Marked Done',
        message: `Employee ${employeeUser.name} has marked task "${task.name}" as completed.`,
        type: 'success',
        dispatcher: socketDispatcher
      });

      if (io) {
        io.emit('Dashboard Updated', { taskId: task._id, employeeId: employeeUser._id });
        io.emit('dashboard-update', { taskId: task._id, employeeId: employeeUser._id });
        logStep('Socket Emitted', `Dashboard update event sent for DONE task ${task.taskId}`);
      }

      // Duration calculation
      const durationMs = task.completedAt.getTime() - (task.acceptedAt ? task.acceptedAt.getTime() : task.createdAt.getTime());
      const durationMinutes = Math.round(durationMs / (1000 * 60));

      await msg.reply(`Awesome! Task "${task.name}" (${task.taskId || 'N/A'}) has been marked as DONE and submitted. Admin has been notified.`);
      await logWhatsAppAudit(employeeUser, senderPhone, 'DONE', 'TASK_COMPLETED', task.project, task._id, 'Success');
    } else {
      logStep('Errors', `DONE failed: No matching active task found for employee ${employeeUser.name}`);
      await msg.reply('No active task found to mark as DONE.');
    }
    return;
  }

  logStep('Errors', `Unsupported employee command: ${textUpper.split('\n')[0]}`);
  await msg.reply('Commands available for Employees: ACCEPT, DECLINE, START, PAUSE, RESUME, DONE.');
};

const whatsappService = {
  client: null,

  init: async (socketIo) => {
    if (isInitializing) {
      console.log('[WA-AUTOMATION] WhatsApp initialization already in progress. Skipping duplicate call.');
      return;
    }
    isInitializing = true;
    try {
      io = socketIo;
      console.log('[WA-AUTOMATION] Initializing WhatsApp client...');

      // Load caches on startup
      await refreshCache();
      // Periodically refresh cache (every 5 minutes)
      if (!whatsappService.cacheInterval) {
        whatsappService.cacheInterval = setInterval(refreshCache, 5 * 60 * 1000);
      }

      // 1. Production-grade duplicate client instance check & cleanup
      if (client) {
        console.log('[WA-AUTOMATION] Cleaning up existing WhatsApp client instance to prevent duplicate handlers and memory leaks...');
        try {
          client.removeAllListeners();
          await client.destroy().catch(() => {});
        } catch (err) {
          console.warn('[WA-AUTOMATION] Old client cleanup warning:', err.message);
        }
        client = null;
        whatsappService.client = null;
      }

      // 2. Production background health monitoring heartbeat
      if (!heartbeatInterval) {
        heartbeatInterval = setInterval(async () => {
          // Active connection check
          if (client && connectionStatus === 'CONNECTED') {
            try {
              const state = await client.getState().catch(() => null);
              if (state) {
                lastHeartbeat = new Date();
              } else {
                console.warn('[WA-AUTOMATION] Heartbeat: Client state returned null. Reconnecting...');
                reconnectCount++;
                await whatsappService.reconnect();
              }
            } catch (err) {
              console.error('[WA-AUTOMATION] Heartbeat check failed:', err.message);
              reconnectCount++;
              await whatsappService.reconnect();
            }
          }
          
          // QR code expiration fallback (3 minutes timeout)
          if (connectionStatus === 'DISCONNECTED' && lastQrGeneratedAt && (Date.now() - lastQrGeneratedAt > 3 * 60 * 1000)) {
            console.log('[WA-AUTOMATION] Heartbeat: QR code has expired (3 minutes timeout). Re-initializing client to generate new QR...');
            lastQrGeneratedAt = null;
            reconnectCount++;
            await whatsappService.reconnect();
          }
        }, 45 * 1000);
      }

        let sessionRecord = await WhatsAppSession.findOne();
        if (!sessionRecord) {
          sessionRecord = new WhatsAppSession();
          await sessionRecord.save();
        }

        client = new Client({
          authStrategy: new LocalAuth({
            clientId: 'vcm-crm-whatsapp'
          }),
          authTimeoutMs: 60000,
          qrMaxRetries: 5,
          takeoverOnConflict: true,
          puppeteer: {
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--disable-gpu',
              '--disable-extensions',
              '--disable-default-apps',
              '--disable-features=site-per-process',
              '--disable-web-security',
              '--single-process',
              '--disable-features=IsolateOrigins',
              '--disable-site-isolation-trials',
              '--disable-renderer-backgrounding',
              '--disable-backgrounding-occluded-windows',
              '--disable-ipc-flooding-protection'
            ],
            timeout: 60000
          }
        });

        whatsappService.client = client;

      client.on('qr', async (qr) => {
        connectionStatus = 'DISCONNECTED';
        lastQrGeneratedAt = Date.now();
        qrGeneratedCount++;
        sessionRestored = false;

        try {
          const qrDataUrl = await qrcode.toDataURL(qr);
          qrCodeData = qrDataUrl;
          
          sessionRecord.connected = false;
          sessionRecord.qrCode = qrDataUrl;
          await sessionRecord.save();

          if (io) {
            io.emit('whatsapp_qr', { qrCode: qrDataUrl });
            io.emit('whatsapp_status', { connected: false, statusText: 'DISCONNECTED' });
          }
        } catch (err) {
          console.error('QR code generation failed:', err);
        }
      });

      client.on('ready', async () => {
        connectionStatus = 'CONNECTED';
        qrCodeData = '';
        lastHeartbeat = new Date();
        sessionRestored = true;
        
        try {
          sessionRecord.connected = true;
          sessionRecord.qrCode = '';
          sessionRecord.phoneNumber = client.info.wid.user;
          sessionRecord.pushName = client.info.pushname || '';
          sessionRecord.lastConnectedAt = new Date();
          await sessionRecord.save();

          if (io) {
            io.emit('whatsapp_status', { 
              connected: true, 
              statusText: 'CONNECTED',
              phoneNumber: client.info.wid.user,
              pushName: client.info.pushname,
              lastConnectedAt: sessionRecord.lastConnectedAt
            });
          }
        } catch (err) {
          console.error('Ready callback DB update failed:', err);
        }
        console.log('\n[CONNECTED]\nBusiness Account Connected');
      });

      client.on('authenticated', async () => {
        console.log('WhatsApp authenticated successfully.');
        console.log('\n[SESSION]\nLocalAuth Restored');
        sessionRestored = true;
      });

      client.on('auth_failure', async (msg) => {
        connectionStatus = 'DISCONNECTED';
        sessionRestored = false;
        console.error('WhatsApp authentication failure:', msg);
        try {
          sessionRecord.connected = false;
          sessionRecord.qrCode = '';
          await sessionRecord.save();

          if (io) {
            io.emit('whatsapp_status', { connected: false, statusText: 'DISCONNECTED', error: msg });
          }

          // Wipe invalid credentials to force fresh QR setup
          await client.destroy().catch(() => {});
          await clearSessionDir();
          await whatsappService.init(io);
        } catch (err) {
          console.error('Auth failure handler failed:', err.message);
        }
      });

      client.on('disconnected', async (reason) => {
        connectionStatus = 'DISCONNECTED';
        sessionRestored = false;
        console.log('WhatsApp client was disconnected:', reason);
        try {
          sessionRecord.connected = false;
          sessionRecord.qrCode = '';
          await sessionRecord.save();

          if (io) {
            io.emit('whatsapp_status', { connected: false, statusText: 'DISCONNECTED' });
          }

          // Clear credentials folder and trigger fresh QR code generation
          await client.destroy().catch(() => {});
          await clearSessionDir();
          await whatsappService.init(io);
        } catch (err) {
          console.error('Disconnect callback DB update failed:', err);
        }
      });

      client.on('message_create', async (msg) => {
        try {
          if (!client || !client.info || !client.info.wid) return;

          // 1. Filter out Groups, Broadcasts, and Status updates instantly
          if (
            msg.from.endsWith('@g.us') || 
            msg.to.endsWith('@g.us') || 
            msg.from.endsWith('@broadcast') || 
            msg.to.endsWith('@broadcast') || 
            msg.from === 'status@broadcast' || 
            msg.to === 'status@broadcast' ||
            msg.isStatus || 
            msg.broadcast
          ) {
            return;
          }

          console.log('[WHATSAPP] Message received');

          const clientPhone = client.info.wid.user;
          const senderRaw = msg.from;
          const senderPhone = senderRaw.split('@')[0];
          const recipientRaw = msg.to;
          const recipientPhone = recipientRaw.split('@')[0];
          const messageBody = msg.body ? msg.body.trim() : '';

          if (!messageBody) return;

          // 2. Validate sender using our cached numbers
          const cleanSender = formatCleanDigits(senderPhone);
          const cleanClient = formatCleanDigits(clientPhone);

          // Skip spam instantly if in negative cache
          if (cache.ignoredPhones.has(cleanSender)) {
            return;
          }

          let isAdmin = (cleanSender === cache.adminPhone || cleanSender === cleanClient);
          let isEmployee = cache.employeePhones.has(cleanSender);
          let matchedUser = null;

          // If it is the Admin, load the SUPER_ADMIN user
          if (isAdmin) {
            matchedUser = await User.findOne({ role: 'SUPER_ADMIN', status: 'active' });
            if (matchedUser) {
              const cleanDbPhone = formatCleanDigits(matchedUser.phone);
              if (cleanDbPhone !== cleanSender) {
                matchedUser.phone = senderPhone;
                await matchedUser.save();
                console.log(`[CRM] [CACHE] Synced Admin phone in database: ${senderPhone}`);
              }
              cache.adminPhone = cleanSender;
            }
          }

          // Perform DB lookup if not in positive cache
          if (!isAdmin && !isEmployee) {
            const userObj = await User.findOne({
              status: { $regex: /^active$/i },
              $or: [
                { phone: senderPhone },
                { phone: new RegExp(senderPhone.replace(/\D/g, '') + '$') }
              ]
            });

            if (userObj) {
              const cleanDbPhone = formatCleanDigits(userObj.phone);
              matchedUser = userObj;

              if (userObj.role === 'SUPER_ADMIN') {
                cache.adminPhone = cleanDbPhone;
                isAdmin = true;
              } else if (userObj.role === 'EMPLOYEE') {
                cache.employeePhones.add(cleanDbPhone);
                isEmployee = true;
              }
            } else {
              // Ignore spam completely, store in negative cache to avoid future queries
              cache.ignoredPhones.add(cleanSender);
              return;
            }
          }

          // If we didn't fetch matchedUser but isEmployee is cached, load it from DB
          if (!matchedUser && isEmployee) {
            matchedUser = await User.findOne({
              role: 'EMPLOYEE',
              status: { $regex: /^active$/i },
              $or: [
                { phone: senderPhone },
                { phone: new RegExp(senderPhone.replace(/\D/g, '') + '$') }
              ]
            });
          }

          if (!matchedUser) {
            return;
          }

          const isFromSelf = (senderPhone && clientPhone && recipientPhone && senderPhone === clientPhone && recipientPhone === clientPhone) || (msg.fromMe && recipientPhone && recipientPhone === clientPhone);

          // 3. Authenticated CRM Message -> Proceed to Log & Process
          const savedMsg = new WhatsAppMessage({
            from: senderPhone,
            to: recipientPhone,
            body: messageBody,
            type: msg.fromMe ? 'out' : 'in',
            timestamp: new Date()
          });
          await savedMsg.save();

          if (io) {
            io.emit('whatsapp_new_message', savedMsg);
          }

          if (isFromSelf || matchedUser.role === 'SUPER_ADMIN') {
            await handleAdminCommand(matchedUser, messageBody, msg, senderPhone);
          } else if (matchedUser.role === 'EMPLOYEE') {
            await handleEmployeeCommand(matchedUser, messageBody, msg, senderPhone);
          }
        } catch (err) {
          console.error('Error handling whatsapp message:', err.message);
        }
      });

      client.initialize().catch(err => {
        console.error('WhatsApp Web client initialization crash:', err.message);
      });
    } catch (err) {
      console.error('WhatsApp Service init failed:', err.message);
    } finally {
      isInitializing = false;
    }
  },

  getConnectionStatus: () => {
    return {
      statusText: connectionStatus,
      qrCode: qrCodeData,
      phoneNumber: client?.info?.wid?.user || '',
      pushName: client?.info?.pushname || '',
      lastHeartbeat: lastHeartbeat,
      reconnectCount: reconnectCount,
      qrGeneratedCount: qrGeneratedCount,
      sessionRestored: sessionRestored
    };
  },

  sendMessage: async (phoneNumber, text) => {
    if (connectionStatus !== 'CONNECTED' || !client) {
      throw new Error('WhatsApp service not connected.');
    }
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }
    const jid = `${cleanPhone}@c.us`;
    await client.sendMessage(jid, text);

    const savedMsg = new WhatsAppMessage({
      from: client.info.wid.user,
      to: cleanPhone,
      body: text,
      type: 'out',
      timestamp: new Date()
    });
    await savedMsg.save();

    if (io) {
      io.emit('whatsapp_new_message', savedMsg);
    }
    return savedMsg;
  },

  logout: async () => {
    if (!client) return;
    try {
      await client.logout().catch(() => {});
      connectionStatus = 'DISCONNECTED';
      qrCodeData = '';
      
      const sessionRecord = await WhatsAppSession.findOne();
      if (sessionRecord) {
        sessionRecord.connected = false;
        sessionRecord.qrCode = '';
        await sessionRecord.save();
      }

      if (io) {
        io.emit('whatsapp_status', { connected: false, statusText: 'DISCONNECTED' });
      }

      // Completely destroy, wipe session directory, and reinitialize to auto-generate a fresh QR
      console.log('[WA-AUTOMATION] Logging out and destroying client...');
      await client.destroy().catch(() => {});
      await clearSessionDir();
      await whatsappService.init(io);
      console.log('[WA-AUTOMATION] Client destroyed and session wiped.');
    } catch (err) {
      console.error('WhatsApp client logout crash:', err.message);
    }
  },

  reconnect: async () => {
    try {
      connectionStatus = 'DISCONNECTED';
      if (client) {
        try {
          client.removeAllListeners();
          await client.destroy().catch(() => {});
        } catch (e) {
          // Ignore destroy errors if client is already dead
        }
        client = null;
        whatsappService.client = null;
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      await whatsappService.init(io);
    } catch (err) {
      console.error('WhatsApp client reconnect fail:', err.message);
    }
  },

  generateQR: async () => {
    try {
      if (client) {
        try {
          client.removeAllListeners();
          await client.destroy().catch(() => {});
        } catch (e) {
          // Ignore destroy errors
        }
        client = null;
        whatsappService.client = null;
      }
      lastQrGeneratedAt = null;
      connectionStatus = 'DISCONNECTED';
      qrCodeData = '';
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      await clearSessionDir(); // Wipe credentials to force fresh QR immediately!
      await whatsappService.init(io);
      return { success: true, message: 'QR generation triggered' };
    } catch (err) {
      console.error('WhatsApp generateQR fail:', err.message);
      return { success: false, error: err.message };
    }
  },

  sendAdminNotification: async (message) => {
    try {
      const admins = await User.find({ role: 'SUPER_ADMIN' });
      let sentCount = 0;

      for (const admin of admins) {
        if (!admin.phone) continue;
        let cleanPhone = admin.phone.replace(/\D/g, '');
        if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
          cleanPhone = '91' + cleanPhone;
        }
        const jid = `${cleanPhone}@c.us`;
        await client.sendMessage(jid, message);
        sentCount++;

        const savedMsg = new WhatsAppMessage({
          from: client.info.wid.user,
          to: cleanPhone,
          body: message,
          type: 'out'
        });
        await savedMsg.save();
        
        if (io) {
          io.emit('whatsapp_new_message', savedMsg);
        }
      }

      if (sentCount === 0 && process.env.ADMIN_WHATSAPP_NUMBER) {
        let cleanPhone = process.env.ADMIN_WHATSAPP_NUMBER.replace(/\D/g, '');
        if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
          cleanPhone = '91' + cleanPhone;
        }
        const jid = `${cleanPhone}@c.us`;
        await client.sendMessage(jid, message);

        const savedMsg = new WhatsAppMessage({
          from: client.info.wid.user,
          to: cleanPhone,
          body: message,
          type: 'out'
        });
        await savedMsg.save();

        if (io) {
          io.emit('whatsapp_new_message', savedMsg);
        }
      }
    } catch (err) {
      console.error('Failed to notify admin via WhatsApp:', err.message);
    }
  }
};

export const sendEnquiryWhatsAppNotification = async ({ customerName, phone, email, selectedService, projectDescription, budget, orderId }) => {
  try {
    const text = `Hello Harsha,\n\nNew Inbound Enquiry Received!\n\n• Customer: ${customerName}\n• Phone: ${phone}\n• Email: ${email}\n• Service: ${selectedService}\n• Description: ${projectDescription || 'N/A'}\n• Budget: ₹${budget || 0}\n• Order ID: ${orderId}`;
    return whatsappService.sendAdminNotification(text);
  } catch (err) {
    console.error('Failed to send enquiry WhatsApp notification:', err.message);
  }
};

export const sendOrderConfirmationWhatsApp = async (clientName, clientPhone, orderId, clipCount, amount) => {
  try {
    const text = `Hello ${clientName},\n\nYour order #${orderId} for ${clipCount} clips has been confirmed!\n\nAmount paid: ₹${amount}\n\nThank you for choosing ViralCraft Media.`;
    return whatsappService.sendMessage(clientPhone, text);
  } catch (err) {
    console.error('Failed to send order confirmation WhatsApp alert:', err.message);
  }
};

export const sendOrderCompletedWhatsApp = async (clientName, clientPhone, orderId, deliveryLink) => {
  try {
    const text = `Hello ${clientName},\n\nYour order #${orderId} is now completed!\n\nDelivery Link:\n${deliveryLink}\n\nThank you for choosing ViralCraft Media.`;
    return whatsappService.sendMessage(clientPhone, text);
  } catch (err) {
    console.error('Failed to send order completion WhatsApp alert:', err.message);
  }
};

export const sendTaskNotification = async (projectId, employeeIds) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      console.error(`[WA-NOTIFICATION] Project not found for ID: ${projectId}`);
      return;
    }

    const idsToNotify = employeeIds || project.employees || [];
    let sentCount = 0;
    let failedCount = 0;

    for (const empId of idsToNotify) {
      const employee = await User.findById(empId);
      if (!employee) {
        failedCount++;
        continue;
      }
      
      if (!employee.phone) {
        failedCount++;
        continue;
      }

      if (employee.status && employee.status.toLowerCase() !== 'active') {
        failedCount++;
        continue;
      }

      let cleanPhone = employee.phone.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.slice(1);
      }
      if (cleanPhone.length === 10 && !cleanPhone.startsWith('91')) {
        cleanPhone = '91' + cleanPhone;
      }

      if (cleanPhone.length !== 12) {
        failedCount++;
        continue;
      }

      const jid = `${cleanPhone}@c.us`;
      const matchedTask = await Task.findOne({ project: projectId, assignedTo: empId });
      const assignedTaskName = matchedTask ? matchedTask.name : `${project.category} Production`;
      
      const priorityStr = (project.priority || 'medium').charAt(0).toUpperCase() + (project.priority || 'medium').slice(1);
      const deadlineStr = project.estimatedCompletion 
        ? new Date(project.estimatedCompletion).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'No deadline';

      const driveLink = project.driveShareableLink || '';
      
      let text = `🔔 NEW PROJECT ASSIGNED

Hello ${employee.name},

You have been assigned a new project.

Project
${project.name}

Department
${project.department || 'General'}

Your Assigned Task
${assignedTaskName}

Priority
${priorityStr}

Deadline
${deadlineStr}`;

      if (driveLink) {
        text += `

Project Files
${driveLink}`;
      }

      text += `

CRM Login
https://crm.viralcraftmedia.com/login

Please login to the CRM and click
Accept Project
before starting work.

Thank you,
ViralCraft Media`;

      try {
        if (!client) {
          throw new Error('WhatsApp client is not initialized');
        }
        if (connectionStatus !== 'CONNECTED') {
          throw new Error(`WhatsApp not connected (status: ${connectionStatus})`);
        }

        await client.sendMessage(jid, text);

        const savedMsg = new WhatsAppMessage({
          from: client.info.wid.user,
          to: cleanPhone,
          body: text,
          type: 'out',
          timestamp: new Date()
        });
        await savedMsg.save();

        if (io) {
          io.emit('whatsapp_new_message', savedMsg);
        }

        sentCount++;
      } catch (sendErr) {
        console.error(`[WA-NOTIFICATION] FAILED: ${employee.name} — ${sendErr.message}`);
        failedCount++;
      }
    }

    console.log(`[WA-NOTIFICATION] Project ${project.name}: Sent ${sentCount}/${idsToNotify.length}, Failed ${failedCount}`);
  } catch (err) {
    console.error('[WA-NOTIFICATION] FATAL:', err.message);
  }
};

whatsappService.sendTaskNotification = sendTaskNotification;

export default whatsappService;

