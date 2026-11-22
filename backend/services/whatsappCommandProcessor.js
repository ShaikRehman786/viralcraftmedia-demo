import crypto from 'crypto';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import ClientModel from '../models/Client.js';
import OrderModel from '../models/Order.js';
import AuditLog from '../models/AuditLog.js';
import { notifyStaff } from './notificationService.js';

let io = null;
export function setWhatsAppCommandIo(value) { io = value; }

const socketDispatcher = (userId, event, data) => {
  if (io) io.to(userId).emit(event, data);
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

  // Strip carriage returns and prepare for tokenization
  const cleanedText = (text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Split by newlines first
  const rawLines = cleanedText.split('\n');
  const tokens = [];

  for (const line of rawLines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // If the line contains pipes '|', split into multiple tokens
    // Protect Drive URLs from accidental pipe splits if ever present
    if (trimmedLine.includes('|')) {
      const parts = trimmedLine.split('|');
      for (const p of parts) {
        if (p.trim()) tokens.push(p.trim());
      }
    } else {
      tokens.push(trimmedLine);
    }
  }

  let currentKey = '';

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].trim();
    if (!token) continue;

    // Check key prefixes (supporting optional WhatsApp markdown like *Client:*)
    const clientMatch = token.match(/^\*?\s*client\s*\*?\s*:\s*(.*)/i);
    const projectMatch = token.match(/^\*?\s*(?:project(?:\s*name)?)\s*\*?\s*:\s*(.*)/i);
    const deptMatch = token.match(/^\*?\s*(?:department|dept)\s*\*?\s*:\s*(.*)/i);
    const deadlineMatch = token.match(/^\*?\s*(?:deadline|due(?:\s*date)?)\s*\*?\s*:\s*(.*)/i);
    const driveMatch = token.match(/^\*?\s*(?:drive(?:\s*(?:url|link|folder))?|link|url)\s*\*?\s*:\s*(.*)/i);
    const priorityMatch = token.match(/^\*?\s*priority\s*\*?\s*:\s*(.*)/i);
    const editorsMatch = token.match(/^\*?\s*editors\s*\*?\s*:\s*(.*)/i);
    const notesMatch = token.match(/^\*?\s*(?:notes|description)\s*\*?\s*:\s*(.*)/i);

    if (clientMatch) {
      currentKey = 'client';
      result.client = clientMatch[1].trim();
    } else if (projectMatch) {
      currentKey = 'projectName';
      result.projectName = projectMatch[1].trim();
    } else if (deptMatch) {
      currentKey = 'department';
      result.department = deptMatch[1].trim();
    } else if (deadlineMatch) {
      currentKey = 'deadline';
      result.deadline = deadlineMatch[1].trim();
    } else if (driveMatch) {
      currentKey = 'drive';
      result.drive = driveMatch[1].trim();
    } else if (priorityMatch) {
      currentKey = 'priority';
      result.priority = priorityMatch[1].trim();
    } else if (editorsMatch) {
      currentKey = 'editors';
      const val = parseInt(editorsMatch[1].trim(), 10);
      result.editors = isNaN(val) ? 1 : val;
    } else if (notesMatch) {
      currentKey = 'notes';
      result.notes = notesMatch[1].trim();
    } else {
      // Continuation of previous key (multiline notes, client names, etc.)
      if (currentKey === 'notes') {
        result.notes = (result.notes + '\n' + token).trim();
      } else if (currentKey === 'client') {
        result.client = (result.client + ' ' + token).trim();
      } else if (currentKey === 'projectName') {
        result.projectName = (result.projectName + ' ' + token).trim();
      } else if (currentKey === 'department') {
        result.department = (result.department + ' ' + token).trim();
      } else if (currentKey === 'drive') {
        result.drive = (result.drive + ' ' + token).trim();
      } else if (currentKey === 'deadline') {
        result.deadline = (result.deadline + ' ' + token).trim();
      }
    }
  }

  // Strip WhatsApp markdown formatting like *Editor* or *September Stories* from values
  ['client', 'projectName', 'department', 'priority', 'deadline', 'drive', 'notes'].forEach(k => {
    if (typeof result[k] === 'string') {
      result[k] = result[k].replace(/^[*_~]+|[*_~]+$/g, '').trim();
    }
  });

  return result;
};

const parseDateString = (str) => {
  if (!str) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const trimmed = str.trim();

  // Support DD-MM-YYYY or DD/MM/YYYY (e.g. 30-09-2026)
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 18, 29, 59));
    if (!isNaN(d.getTime())) return d;
  }

  // Support YYYY-MM-DD or YYYY/MM/DD
  const yyyymmdd = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 18, 29, 59));
    if (!isNaN(d.getTime())) return d;
  }

  const currentYear = new Date().getFullYear();
  let candidate = trimmed;
  if (!/\d{4}/.test(trimmed)) {
    candidate = `${trimmed} ${currentYear}`;
  }
  const timestamp = Date.parse(candidate);
  if (!isNaN(timestamp)) {
    return new Date(timestamp);
  }
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};

const handleAdminCommand = async (adminUser, text, msg, senderPhone) => {
  const cleanCmd = (text || '').replace(/[*_~]/g, '').trim();
  const textUpper = cleanCmd.toUpperCase();
  logStep('Parser Started', { command: textUpper.split('\n')[0], sender: adminUser.name });

  if (textUpper === 'HELP') {
    const helpMsg = `*ViralCraft Media Automation Menu*

Available commands:
- *NEW PROJECT*: Create project (reply with details template)
- *STATUS*: Get live platform stats
- *PROJECTS*: View current active projects
- *TASKS*: View current task board`;
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

    const statusMsg = `*ViralCraft Live Status Report*

Projects: ${projectCount}
Pending Tasks: ${pendingTasks}
Completed Tasks: ${completedTasks}
Employees Online: ${onlineEmployees}`;
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
    let listStr = `*Active Projects (${activeProjects.length})*

`;
    activeProjects.forEach((p, idx) => {
      listStr += `${idx + 1}. *${p.name}* [Department: ${p.department || p.category || 'N/A'} | Status: ${p.status}]
`;
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
    let listStr = `*Active Tasks Board*

`;
    activeTasks.forEach((t, idx) => {
      listStr += `${idx + 1}. [${t.taskId || 'TASK'}] *${t.name}* - status: ${t.status}
`;
    });
    await msg.reply(listStr);
    logStep('Parser Success', 'TASKS command processed');
    await logWhatsAppAudit(adminUser, senderPhone, 'TASKS', 'Active tasks board sent', null, null, 'Success');
    return;
  }

  if (textUpper.startsWith('NEW PROJECT')) {
    try {
      console.info('[WHATSAPP][PROJECT] NEW PROJECT detected');
      const parsed = parseNewProjectMessage(text);
      console.info(`[WHATSAPP][PROJECT] client="${parsed.client}" project="${parsed.projectName}" department="${parsed.department}" deadline="${parsed.deadline}" driveUrlPresent=${!!parsed.drive}`);

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
        if (msg && typeof msg.reply === 'function') {
          try {
            await msg.reply(`Failed to create project. Please specify both "Project: <name>" and "Department: <department>".`);
          } catch (rErr) {}
        }
        await logWhatsAppAudit(adminUser, senderPhone, 'NEW PROJECT', 'Validation Failed', null, null, `Missing: ${missingFields.join(', ')}`);
        return;
      }

      // Idempotency check: prevent duplicate project creation if received multiple times within 60s
      const escapedProjectName = parsed.projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
      const duplicateProject = await Project.findOne({
        name: new RegExp('^' + escapedProjectName + '$', 'i'),
        createdAt: { $gte: new Date(Date.now() - 60 * 1000) }
      });
      if (duplicateProject) {
        console.info(`[WHATSAPP][IDEMPOTENCY] Duplicate project request detected for "${parsed.projectName}" (${duplicateProject._id}). Skipping duplicate creation.`);
        if (msg && typeof msg.reply === 'function') {
          try {
            await msg.reply(`âš ï¸ Project "${duplicateProject.name}" was already created recently. Skipping duplicate request.`);
          } catch (rErr) {}
        }
        return;
      }

      logStep('Parser Success', 'NEW PROJECT input parsed successfully');

      // Find or create Client
      const escapedClient = parsed.client.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
      let clientObj = await ClientModel.findOne({ name: new RegExp('^' + escapedClient + '$', 'i') });
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
      console.info(`[PROJECT][CREATED] projectId=${projectObj._id} department=${projectObj.department}`);
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

      console.info(`[PROJECT][ASSIGNMENT] department=${projectObj.department} matchingEmployees=${matchingEmployees.length}`);
      for (const emp of matchingEmployees) {
        console.info(`[PROJECT][ASSIGNMENT] employee=${emp._id} whatsappConfigured=${!!emp.phone}`);
      }

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

      }

      console.info(`[PROJECT][NOTIFICATION] projectId=${projectObj._id} targetEmployees=${matchingEmployees.length}`);

      sendTaskNotification(projectObj._id, []).catch(err => {
        console.error('[WA-NOTIFICATION] Failed to send WhatsApp notifications:', err.message);
      });

      const assignedCount = projectObj.employees ? projectObj.employees.length : 0;
      const successReply = `ðŸš€ *Project Auto-Created successfully!*

â€¢ Name: ${projectObj.name}
â€¢ Client: ${clientObj.name}
â€¢ Department: ${projectObj.department}
â€¢ Priority: ${projectObj.priority.toUpperCase()}
â€¢ Deadline: ${projectObj.estimatedCompletion.toDateString()}
â€¢ Employees Assigned: ${assignedCount}
â€¢ Sub-tasks Generated: 8

WhatsApp notifications are being sent to all assigned employees.`;
      if (msg && typeof msg.reply === 'function') {
        try {
          await msg.reply(successReply);
        } catch (repErr) {
          console.warn('[WA-AUTOMATION] Could not send reply to WhatsApp sender:', repErr.message);
        }
      }

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
        await msg.reply(`âŒ Project creation failed: ${err.message}`);
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
    const escapedTaskId = taskIdArg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
    task = await Task.findOne({ 
      assignedTo: employeeUser._id, 
      $or: [
        { taskId: taskIdArg },
        { taskId: new RegExp(escapedTaskId + '$', 'i') }
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

      await sendAdminNotification(`Employee ${employeeUser.name} has ACCEPTED the task "${task.name}" (${task.taskId || 'N/A'}).`);
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

      await sendAdminNotification(`âš ï¸ Employee ${employeeUser.name} has DECLINED the task "${originalName}" (${task.taskId || 'N/A'}).`);
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

      await sendAdminNotification(`Employee ${employeeUser.name} has ${commandWord}ED the task "${task.name}" (${task.taskId || 'N/A'}).`);
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

      await sendAdminNotification(`Employee ${employeeUser.name} has PAUSED the task "${task.name}" (${task.taskId || 'N/A'}).`);
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

      await sendAdminNotification(`âœ… Employee ${employeeUser.name} has marked task "${task.name}" (${task.taskId || 'N/A'}) as DONE.`);
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


const sendAdminNotification = async (message) => {
  try {
    console.info('[WA-NOTIFICATION] Admin WhatsApp notification skipped in Main CRM command processor (transport isolated).');
  } catch (err) {
    console.error('[WA-NOTIFICATION] sendAdminNotification failed:', err.message);
  }
};
export const sendTaskNotification = async (projectId, employeeIds) => {
  try {
    const { sendProjectAssignmentNotifications } = await import('./notificationService.js');
    await sendProjectAssignmentNotifications(projectId);
  } catch (err) {
    console.error('[WA-NOTIFICATION] sendTaskNotification failed:', err.message);
  }
};



export { handleAdminCommand, handleEmployeeCommand, mapCategory, parseNewProjectMessage, parseDateString, logWhatsAppAudit };
export default { handleAdminCommand, handleEmployeeCommand, mapCategory, parseNewProjectMessage, parseDateString, logWhatsAppAudit, sendTaskNotification, setWhatsAppCommandIo };

