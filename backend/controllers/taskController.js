import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Client from '../models/Client.js';
import ChatMessage from '../models/ChatMessage.js';
import ReferralBooking from '../models/ReferralBooking.js';
import Enquiry from '../models/Enquiry.js';
import { logEvent } from '../services/loggingService.js';
import whatsappService, { sendOrderCompletedWhatsApp, sendTaskNotification } from '../services/whatsappService.js';
import { sendDeliveryEmail, sendEmployeeTaskAlertEmail, sendEmail } from '../services/emailService.js';
import { uploadFileToFolder } from '../services/driveService.js';
import { config } from '../config/env.js';
import { notifyStaff, notifyUser, sendProjectAssignmentNotifications } from '../services/notificationService.js';

/**
 * Lists all projects
 * Route: GET /api/projects
 */
export const getProjects = async (req, res, next) => {
  try {
    let projects;
    
    // Clients see their own projects. Employees see projects they are assigned to.
    const userRole = (req.user.role || '').toUpperCase();
    if (userRole === 'SUPER_ADMIN' || userRole === 'MANAGER' || userRole === 'ADMIN') {
      projects = await Project.find()
        .populate('order')
        .populate('client')
        .populate('manager', 'name email')
        .populate('employees', 'name email')
        .populate('assignments.employee', 'name email')
        .populate('suggestedEmployee', 'name email role status')
        .sort({ createdAt: -1 });
    } else if (userRole === 'EMPLOYEE') {
      const empId = req.user._id;
      const empObjectId = mongoose.Types.ObjectId.isValid(empId) ? new mongoose.Types.ObjectId(empId) : null;
      const empIdStr = empId.toString();
      const idMatches = [empId, empIdStr, empObjectId].filter(Boolean);

      const assignedTasks = await Task.find({
        assignedTo: { $in: idMatches }
      }).select('project');
      const taskProjectIds = assignedTasks.map(t => t.project).filter(Boolean);

      const orConditions = [
        { _id: { $in: taskProjectIds } },
        { employees: { $in: idMatches } },
        { assignedEmployee: { $in: idMatches } },
        { employeeId: { $in: idMatches } },
        { 'assignments.employee': { $in: idMatches } },
        { suggestedEmployee: { $in: idMatches } }
      ];

      projects = await Project.find({ $or: orConditions })
        .populate('order')
        .populate('client')
        .populate('manager', 'name email')
        .populate('employees', 'name email')
        .populate('assignments.employee', 'name email')
        .populate('suggestedEmployee', 'name email role status')
        .sort({ createdAt: -1 });
    } else {
      // Role is client, match by phone
      const client = await Client.findOne({ phone: req.user.phone }).select('_id');
      if (client) {
        projects = await Project.find({ client: client._id })
          .populate('client')
          .populate('order')
          .populate('suggestedEmployee', 'name email role status')
          .sort({ createdAt: -1 });
      } else {
        projects = [];
      }
    }

    // Role-based sanitization of sensitive client & financial information
    const sanitizedProjects = projects.map(proj => {
      const p = proj.toObject ? proj.toObject() : proj;
      
      if (userRole === 'MANAGER') {
        // Managers MUST NOT see client email, client phone, notes, invoices, payments, financial info
        if (p.client) {
          p.client.email = undefined;
          p.client.phone = undefined;
          p.client.notes = undefined;
          p.client.invoices = undefined;
          p.client.payments = undefined;
        }
        if (p.order) {
          p.order.email = undefined;
          p.order.phone = undefined;
          p.order.amount = undefined;
          p.order.budget = undefined;
          p.order.razorpayOrderId = undefined;
          p.order.razorpayPaymentId = undefined;
          p.order.invoiceUrl = undefined;
        }
      } else if (userRole === 'EMPLOYEE') {
        // Employees MUST NOT see client name/email/phone, payments, invoices, notes, revenue
        if (p.client) {
          p.client.name = undefined;
          p.client.email = undefined;
          p.client.phone = undefined;
          p.client.notes = undefined;
          p.client.invoices = undefined;
          p.client.payments = undefined;
        }
        if (p.order) {
          p.order.clientName = undefined;
          p.order.email = undefined;
          p.order.phone = undefined;
          p.order.amount = undefined;
          p.order.budget = undefined;
          p.order.razorpayOrderId = undefined;
          p.order.razorpayPaymentId = undefined;
          p.order.invoiceUrl = undefined;
        }
      }
      return p;
    });

    return res.status(200).json({ success: true, data: sanitizedProjects });
  } catch (err) {
    next(err);
  }
};

/**
 * Assigns manager and editors to project
 * Route: POST /api/projects/:id/assign
 */
export const assignStaff = async (req, res, next) => {
  try {
    const { managerId, employeeIds } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    // Manager BOLA: MANAGER can only modify projects they manage
    if (req.user && (req.user.role || '').toUpperCase() === 'MANAGER') {
      const ownerId = project.manager ? project.manager.toString() : null;
      const requesterId = req.user._id.toString();
      // Allow if project has no manager yet or manager is requester
      if (ownerId && ownerId !== requesterId) {
        return res.status(403).json({ error: 'Not authorized to modify this project. You can only manage your assigned projects.' });
      }
    }

    if (managerId) project.manager = managerId;
    if (employeeIds && Array.isArray(employeeIds)) {
      project.employees = employeeIds.filter(e => e && mongoose.Types.ObjectId.isValid(e));
    }
    project.status = 'in_progress';

    // Reset single-employee acceptance if the currently assigned editor is changed
    if (employeeIds && employeeIds.length > 0) {
      if (project.employeeId && !employeeIds.some(id => id && id.toString() === project.employeeId.toString())) {
        project.assignedEmployee = project.employees[0] || null;
        project.employeeId = project.employees[0] || null;
        project.assignedEmployeeName = '';
        project.employeeName = '';
        project.assignmentStatus = 'Pending';
        project.acceptedAt = null;
        project.acceptedBy = null;
      } else if (!project.assignedEmployee && project.employees.length > 0) {
        project.assignedEmployee = project.employees[0];
        project.employeeId = project.employees[0];
      }
    } else {
      project.assignedEmployee = null;
      project.employeeId = null;
      project.assignedEmployeeName = '';
      project.employeeName = '';
      project.assignmentStatus = 'Pending';
      project.acceptedAt = null;
      project.acceptedBy = null;
    }

    // Synchronize employee assignments and retain acceptance states for current staff
    if (!project.assignments) {
      project.assignments = [];
    }
    const currentAssignments = project.assignments || [];
    const newAssignments = [];
    
    for (const empId of (employeeIds || [])) {
      if (!empId) continue;
      const empIdStr = empId.toString ? empId.toString() : String(empId);
      const existing = currentAssignments.find(a => a.employee?.toString() === empIdStr);
      if (existing) {
        newAssignments.push(existing);
      } else {
        newAssignments.push({
          employee: empId,
          accepted: false,
          status: 'Pending',
          acceptedAt: null
        });
      }
    }
    project.assignments = newAssignments;

    await project.save();

    // Alert staff users
    const ioDispatcher = req.app.get('socketio_dispatch');

    await sendProjectAssignmentNotifications(project._id, ioDispatcher);

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'TASK_ASSIGNED',
      details: { projectId: project._id, managerId, employeeIds }
    });

    return res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

/**
 * Lists tasks (filtered by user context)
 * Route: GET /api/tasks
 */
export const getTasks = async (req, res, next) => {
  try {
    let query = {};
    
    const userRole = (req.user.role || '').toUpperCase();
    if (userRole === 'EMPLOYEE') {
      const empId = req.user._id;
      const empObjectId = mongoose.Types.ObjectId.isValid(empId) ? new mongoose.Types.ObjectId(empId) : null;
      const empIdStr = empId.toString();
      const idMatches = [empId, empIdStr, empObjectId].filter(Boolean);

      const empProjectConditions = [
        { employees: { $in: idMatches } },
        { assignedEmployee: { $in: idMatches } },
        { employeeId: { $in: idMatches } },
        { 'assignments.employee': { $in: idMatches } },
        { suggestedEmployee: { $in: idMatches } }
      ];

      const empProjects = await Project.find({ $or: empProjectConditions }).select('_id');
      const empProjectIds = empProjects.map(p => p._id);

      query = {
        $or: [
          { assignedTo: { $in: idMatches } },
          { project: { $in: empProjectIds } }
        ]
      };
    } else if (userRole === 'CLIENT') {
      // Find client projects first
      const client = await Client.findOne({ phone: req.user.phone }).select('_id');
      if (client) {
        const clientProjects = await Project.find({ client: client._id }).select('_id');
        const validProjectIds = clientProjects.map(p => p._id);
        query.project = { $in: validProjectIds };
      } else {
        query.project = { $in: [] };
      }
    }

    const tasks = await Task.find(query)
      .populate('project', 'name status category priority estimatedCompletion client manager employees suggestedEmployee')
      .populate('assignedTo', 'name email')
      .sort({ deadline: 1, createdAt: -1 });

    return res.status(200).json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
};

/**
 * Assigns an individual task to an editor
 * Route: POST /api/tasks/:id/assign
 */
export const assignTask = async (req, res, next) => {
  try {
    const { assignedTo, deadline } = req.body;
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    // Manager BOLA: MANAGER can only assign tasks within projects they manage
    if (req.user && (req.user.role || '').toUpperCase() === 'MANAGER') {
      const project = task.project;
      const managerId = project ? (project.manager?._id || project.manager)?.toString() : null;
      if (managerId && managerId !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized to assign tasks for this project.' });
      }
    }

    task.assignedTo = assignedTo;
    task.status = 'assigned';
    if (deadline) task.deadline = new Date(deadline);
    await task.save();

    // Link employee to project if not already present
    if (assignedTo && task.project) {
      const projId = task.project._id || task.project;
      const proj = await Project.findById(projId);
      if (proj) {
        const empIdStr = assignedTo.toString();
        if (!proj.employees) proj.employees = [];
        if (!proj.employees.some(e => e?.toString() === empIdStr)) {
          proj.employees.push(assignedTo);
        }
        if (!proj.assignments) proj.assignments = [];
        if (!proj.assignments.some(a => a.employee?.toString() === empIdStr)) {
          proj.assignments.push({
            employee: assignedTo,
            accepted: false,
            acceptedAt: null,
            status: 'Pending'
          });
        }
        await proj.save();
      }
    }

    // Alert employee
    const employee = await User.findById(assignedTo);
    if (employee) {
      const ioDispatcher = req.app.get('socketio_dispatch');
      
      await notifyUser({
        userId: assignedTo,
        title: 'Task Assigned',
        message: 'A new task has been assigned to you. Please review the requirements and update the status as you make progress.',
        type: 'info',
        priority: 'high',
        referenceId: task._id.toString(),
        referenceModel: 'Task',
        dispatcher: ioDispatcher,
        metadata: { taskName: task.name, deadline: task.deadline, projectId: task.project?._id?.toString() }
      });

      if (req.user) {
        await notifyUser({
          userId: req.user._id,
          title: 'Task Assigned',
          message: 'A new task has been assigned successfully.',
          type: 'success',
          priority: 'medium',
          referenceId: task._id.toString(),
          referenceModel: 'Task',
          dispatcher: ioDispatcher
        });
      }

      sendEmployeeTaskAlertEmail(employee.name, employee.email, task.name, task.deadline).catch(console.error);

      if (employee.phone) {
        const priorityStr = (task.priority || 'medium').charAt(0).toUpperCase() + (task.priority || 'medium').slice(1);
        const deadlineStr = task.deadline ? new Date(task.deadline).toLocaleDateString([], { day: 'numeric', month: 'long' }) : 'N/A';
        const wsMsgText = `New Task Assigned\n\nTask:\n${task.name}\n\nPriority:\n${priorityStr}\n\nDeadline:\n${deadlineStr}\n\nPlease login to ViralCraft Media.\n\nReply with:\n\nACCEPT\n\nor\n\nDECLINE`;
        
        whatsappService.sendMessage(employee.phone, wsMsgText).catch(err => {
          console.error('Failed to send task assignment alert via WhatsApp:', err.message);
        });
      }
    }

    return res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

/**
 * Employees upload their finished edit
 * Route: POST /api/tasks/:id/submit
 */
export const submitTask = async (req, res, next) => {
  try {
    const { submissionUrl } = req.body;
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString() && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'You are not assigned to this task.' });
    }

    task.submissionUrl = submissionUrl;
    task.status = 'submitted';
    await task.save();

    // Notify Project Manager / Admin
    const managerId = task.project.manager;
    const ioDispatcher = req.app.get('socketio_dispatch');

    if (managerId) {
      await notifyUser({
        userId: managerId,
        title: 'Project Submitted',
        message: 'A team member has submitted work for review.',
        type: 'info',
        priority: 'high',
        referenceId: task.project?._id?.toString() || task.project?.toString(),
        referenceModel: 'Project',
        actionUrl: '/admin?tab=projects',
        dispatcher: ioDispatcher,
        metadata: { employeeName: req.user.name, taskName: task.name, submissionUrl }
      });
    }

    await notifyUser({
      userId: req.user._id,
      title: 'Project Submitted',
      message: 'Your work has been submitted for review.',
      type: 'info',
      priority: 'medium',
      referenceId: task.project?._id?.toString() || task.project?.toString(),
      referenceModel: 'Project',
      dispatcher: ioDispatcher
    });


    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'TASK_SUBMISSION',
      details: { taskId: task._id, submissionUrl }
    });

    return res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

/**
 * Managers review (Approve or Reject) employee submission
 * Route: POST /api/tasks/:id/review
 */
export const reviewTask = async (req, res, next) => {
  try {
    const { decision, feedback } = req.body; // decision: 'approve' or 'reject'
    const task = await Task.findById(req.params.id).populate({
      path: 'project',
      populate: { path: 'client' }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const ioDispatcher = req.app.get('socketio_dispatch');

    if (decision === 'reject') {
      task.status = 'rejected';
      task.feedback = feedback;
      await task.save();

      // Alert employee
      if (task.assignedTo) {
        await notifyUser({
          userId: task.assignedTo,
          title: 'Revision Required',
          message: 'Your submission needs a few changes. Please review the feedback and resubmit.',
          type: 'warning',
          priority: 'high',
          referenceId: task.project?._id?.toString() || task.project?.toString(),
          referenceModel: 'Project',
          dispatcher: ioDispatcher,
          metadata: { taskName: task.name, feedback }
        });
      }

      if (req.user) {
        await notifyUser({
          userId: req.user._id,
          title: 'Revision Required',
          message: 'Revision request sent to the assigned employee.',
          type: 'info',
          priority: 'medium',
          referenceId: task.project?._id?.toString() || task.project?.toString(),
          referenceModel: 'Project',
          dispatcher: ioDispatcher
        });
      }

      await logEvent({
        userId: req.user._id,
        userName: req.user.name,
        action: 'TASK_REJECTION',
        details: { taskId: task._id, feedback }
      });

      return res.status(200).json({ success: true, data: task });
    }

    if (decision === 'approve') {
      task.status = 'approved';
      await task.save();

      // Alert employee of approval
      if (task.assignedTo) {
        await notifyUser({
          userId: task.assignedTo,
          title: 'Project Approved',
          message: 'Your submission has been approved. Great work!',
          type: 'success',
          priority: 'high',
          referenceId: task.project?._id?.toString() || task.project?.toString(),
          referenceModel: 'Project',
          dispatcher: ioDispatcher,
          metadata: { taskName: task.name }
        });
      }

      if (req.user) {
        await notifyUser({
          userId: req.user._id,
          title: 'Project Approved',
          message: 'Project work approved successfully.',
          type: 'success',
          priority: 'medium',
          referenceId: task.project?._id?.toString() || task.project?.toString(),
          referenceModel: 'Project',
          dispatcher: ioDispatcher
        });
      }

      await logEvent({
        userId: req.user._id,
        userName: req.user.name,
        action: 'TASK_APPROVAL',
        details: { taskId: task._id }
      });

      // Check if ALL tasks in the project are approved.
      const allTasks = await Task.find({ project: task.project._id });
      const pendingTasksCount = allTasks.filter(t => t.status !== 'approved').length;

      if (pendingTasksCount === 0) {
        // Project is manager approved! Transition to review status for Harsha's approval.
        const project = await Project.findById(task.project._id);
        project.status = 'review';
        await project.save();

        // Notify Super Admin
        await notifyStaff({
          title: 'Project Ready for Delivery',
          message: `Project '${project.name}' has been approved by the Manager and is ready for final delivery review.`,
          type: 'success',
          priority: 'high',
          referenceId: project._id.toString(),
          referenceModel: 'Project',
          actionUrl: '/admin?tab=projects',
          dispatcher: ioDispatcher,
          metadata: { projectName: project.name }
        });

        await logEvent({
          action: 'PROJECT_PENDING_FINAL_REVIEW',
          details: { projectId: project._id, name: project.name }
        });
      }

      return res.status(200).json({ success: true, data: task });
    }

    return res.status(400).json({ error: "Invalid review decision. Specify 'approve' or 'reject'." });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch project chat comments
 * Route: GET /api/projects/:id/chat
 */
export const getProjectChat = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify department matches if employee
    if (req.user.role === 'EMPLOYEE' && project.category !== req.user.department) {
      return res.status(403).json({ error: 'You do not have access to this project chat.' });
    }

    // Verify user has access to this project's chat
    const isAdmin = req.user.role === 'SUPER_ADMIN';
    const isManager = req.user.role === 'MANAGER' && project.manager?.toString() === req.user._id.toString();
    const isAssignedEmployee = project.employees?.some(e => e && e.toString() === req.user._id.toString());
    
    if (!isAdmin && !isManager && !isAssignedEmployee) {
      return res.status(403).json({ error: 'You do not have access to this project chat.' });
    }

    const messages = await ChatMessage.find({ project: req.params.id })
      .sort({ createdAt: 1 });
    return res.status(200).json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
};

/**
 * Post project chat message
 * Route: POST /api/projects/:id/chat
 */
export const postProjectChat = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify department matches if employee
    if (req.user.role === 'EMPLOYEE' && project.category !== req.user.department) {
      return res.status(403).json({ error: 'You do not have access to this project chat.' });
    }

    // Verify user has access to this project's chat
    const isAdmin = req.user.role === 'SUPER_ADMIN';
    const isManager = req.user.role === 'MANAGER' && project.manager?.toString() === req.user._id.toString();
    const isAssignedEmployee = project.employees?.some(e => e && e.toString() === req.user._id.toString());
    
    if (!isAdmin && !isManager && !isAssignedEmployee) {
      return res.status(403).json({ error: 'You do not have access to this project chat.' });
    }

    const chatMsg = new ChatMessage({
      project: project._id,
      sender: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      message
    });
    await chatMsg.save();

    // Broadcast messages to managers & employees linked to the project
    const ioDispatcher = req.app.get('socketio_dispatch');
    if (ioDispatcher) {
      // Send to manager
      if (project.manager) {
        ioDispatcher(project.manager.toString ? project.manager.toString() : String(project.manager), 'chat_message', chatMsg);
      }
      // Send to editors
      if (project.employees && project.employees.length > 0) {
        project.employees.forEach(empId => {
          if (empId) {
            ioDispatcher(empId.toString ? empId.toString() : String(empId), 'chat_message', chatMsg);
          }
        });
      }
    }

    return res.status(201).json({ success: true, data: chatMsg });
  } catch (err) {
    next(err);
  }
};

export const updateTaskHours = async (req, res, next) => {
  try {
    const { estimatedHours, actualHours } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    // Manager BOLA: verify manager owns the parent project
    if (req.user && (req.user.role || '').toUpperCase() === 'MANAGER') {
      const project = await Project.findById(task.project).select('manager');
      if (project && project.manager && project.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized to update hours for this task.' });
      }
    }
    if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
    if (actualHours !== undefined) task.actualHours = actualHours;
    await task.save();
    return res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

export const addTaskComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify user has access to this task
    const project = await Project.findById(task.project);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const isAdmin = req.user.role === 'SUPER_ADMIN';
    const isManager = req.user.role === 'MANAGER';
    const isEmployee = req.user.role === 'EMPLOYEE' && task.assignedTo?.toString() === req.user._id.toString();
    
    let isClient = false;
    if (req.user.role === 'CLIENT') {
      const clientDoc = await Client.findOne({ phone: req.user.phone });
      if (clientDoc && project.client?.toString() === clientDoc._id.toString()) {
        isClient = true;
      }
    }

    if (!isAdmin && !isManager && !isEmployee && !isClient) {
      return res.status(403).json({ error: 'You do not have permission to comment on this task.' });
    }

    task.comments.push({
      sender: req.user._id,
      senderName: req.user.name,
      text,
      timestamp: new Date()
    });
    await task.save();
    return res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

export const trackTaskTime = async (req, res, next) => {
  try {
    const { action } = req.body; // 'start', 'pause', 'complete'
    if (!['start', 'pause', 'complete'].includes(action)) {
      return res.status(400).json({ error: 'Invalid time-tracking action.' });
    }
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify user is assigned to this task
    if (task.assignedTo?.toString() !== req.user._id.toString() && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'You are not assigned to this task.' });
    }

    // Calculate elapsed time if pausing or completing
    let elapsedMs = 0;
    if (action === 'pause' || action === 'complete') {
      const lastStart = [...task.timeTracking].reverse().find(t => t.action === 'start');
      if (lastStart) {
        elapsedMs = Date.now() - new Date(lastStart.timestamp).getTime();
        // Increment actual hours
        const elapsedHours = elapsedMs / (1000 * 60 * 60);
        task.actualHours = Number((task.actualHours + elapsedHours).toFixed(2));
      }
    }

    task.timeTracking.push({
      action,
      timestamp: new Date(),
      elapsedMs
    });

    if (action === 'complete') {
      task.status = 'submitted'; // Auto submit on completing timer!
    } else if (action === 'start') {
      task.status = 'in_progress'; // Auto set to in-progress
    }

    await task.save();

    try {
      const ioDispatcher = req.app.get('socketio_dispatch');
      const projectObj = await Project.findById(task.project);
      
      if (action === 'start') {
        if (task.assignedTo) {
          await notifyUser({
            userId: task.assignedTo,
            title: 'Project Started',
            message: 'Work has started on your assigned project.',
            type: 'info',
            priority: 'medium',
            referenceId: projectObj?._id?.toString() || task.project?.toString(),
            referenceModel: 'Project',
            dispatcher: ioDispatcher
          });
        }
        if (projectObj && projectObj.manager) {
          await notifyUser({
            userId: projectObj.manager,
            title: 'Project Started',
            message: 'Your team has started working on the project.',
            type: 'info',
            priority: 'medium',
            referenceId: projectObj._id.toString(),
            referenceModel: 'Project',
            dispatcher: ioDispatcher
          });
        }
      } else if (action === 'complete') {
        if (task.assignedTo) {
          await notifyUser({
            userId: task.assignedTo,
            title: 'Project Submitted',
            message: 'Your work has been submitted for review.',
            type: 'info',
            priority: 'medium',
            referenceId: projectObj?._id?.toString() || task.project?.toString(),
            referenceModel: 'Project',
            dispatcher: ioDispatcher
          });
        }
        if (projectObj && projectObj.manager) {
          await notifyUser({
            userId: projectObj.manager,
            title: 'Project Submitted',
            message: 'A team member has submitted work for review.',
            type: 'info',
            priority: 'high',
            referenceId: projectObj._id.toString(),
            referenceModel: 'Project',
            dispatcher: ioDispatcher
          });
        }
      }
    } catch (notifErr) {
      console.error('Time tracking notification failed:', notifErr.message);
    }

    return res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

export const addTaskDependency = async (req, res, next) => {
  try {
    const { dependencyId } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    // Manager BOLA: verify manager owns the parent project
    if (req.user && (req.user.role || '').toUpperCase() === 'MANAGER') {
      const project = await Project.findById(task.project).select('manager');
      if (project && project.manager && project.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized to modify dependencies for this task.' });
      }
    }
    if (!task.dependencies.includes(dependencyId)) {
      task.dependencies.push(dependencyId);
      await task.save();
    }
    return res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

export const finalApproveProject = async (req, res, next) => {
  try {
    const { decision, feedback } = req.body; // 'approve' or 'reject'
    const project = await Project.findById(req.params.id).populate({
      path: 'client',
      populate: { path: 'user' }
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.status !== 'review') {
      return res.status(400).json({ error: 'Project is not under final review status.' });
    }

    const ioDispatcher = req.app.get('socketio_dispatch');

    if (decision === 'reject') {
      // Revert project status back to in_progress
      project.status = 'in_progress';
      await project.save();

      // Reset all project tasks status to rejected with Harsha's review feedback
      const tasks = await Task.find({ project: project._id });
      for (const t of tasks) {
        t.status = 'rejected';
        t.feedback = feedback || 'Final review rejected by Admin.';
        await t.save();

        if (t.assignedTo) {
          await notifyUser({
            userId: t.assignedTo,
            title: 'Revision Required',
            message: 'Your submission needs a few changes. Please review the feedback and resubmit.',
            type: 'warning',
            priority: 'high',
            referenceId: project._id.toString(),
            referenceModel: 'Project',
            dispatcher: ioDispatcher
          });
        }
      }

      // Notify Project Manager
      if (project.manager) {
        await notifyUser({
          userId: project.manager,
          title: 'Revision Required',
          message: 'Revision request sent to the assigned employee.',
          type: 'warning',
          priority: 'high',
          referenceId: project._id.toString(),
          referenceModel: 'Project',
          actionUrl: '/admin?tab=projects',
          dispatcher: ioDispatcher
        });
      }

      await logEvent({
        userId: req.user._id,
        userName: req.user.name,
        action: 'TASK_REJECTION',
        details: { projectId: project._id, feedback, message: 'Harsha rejected project delivery' }
      });

      return res.status(200).json({ success: true, message: 'Project returned for revision edits.', data: project });
    }

    if (decision === 'approve') {
      project.status = 'completed';
      await project.save();

      // Referral Lead integration: when a referral project reaches the completion stage,
      // its attributed booking becomes eligible for commission (no commission is created at enquiry time).
      if (project.referral && project.referral.isReferral && project.referral.enquiryId) {
        try {
          const booking = await ReferralBooking.findOne({ enquiry: project.referral.enquiryId });
          if (booking && booking.status !== 'Completed') {
            booking.status = 'Completed';
            await booking.save();

            const referralEnquiry = await Enquiry.findById(project.referral.enquiryId);
            if (referralEnquiry && referralEnquiry.referral) {
              referralEnquiry.referral.referralStatus = 'Completed';
              await referralEnquiry.save();
            }
          }
        } catch (referralErr) {
          console.error('[Referral Eligibility] Failed to mark booking eligible at project completion:', referralErr.message);
        }
      }

      const order = await Order.findById(project.order);
      if (order) {
        order.status = 'completed';
        await order.save();
      }

      const finalLink = project.driveShareableLink || `https://drive.google.com/drive/folders/${project.driveFolderId}`;

      // Update Client delivery logs
      const clientDoc = await Client.findById(project.client._id);
      if (clientDoc) {
        clientDoc.deliveryHistory.push({
          projectName: project.name,
          driveLink: finalLink,
          date: new Date()
        });
        clientDoc.whatsappHistory.push({
          message: `Hello ${project.client.name}, Your final reels delivery is ready! Download here: ${finalLink}. Support Contact: support@viralcraft.media.`,
          status: 'sent',
          timestamp: new Date()
        });
        await clientDoc.save();
      }

      // Trigger automatic WhatsApp Cloud API message confirm
      sendOrderCompletedWhatsApp(project.client.name, project.client.phone, order?.orderId || project._id.toString(), finalLink).catch(console.error);

      // Trigger automatic Email delivery
      if (project.client.email) {
        sendDeliveryEmail(
          project.client.name,
          project.client.email,
          order?.orderId || project._id.toString(),
          finalLink,
          clientDoc ? clientDoc.userId : null,
          project._id
        ).catch(console.error);
      }

      // Notify admin of project completion
      sendEmail({
        to: config.adminEmail,
        subject: `[ADMIN ALERT] Project Completed & Delivered: ${order?.orderId || project._id.toString()}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;">
            <h3 style="color: #FF6A00;">Project Delivered</h3>
            <p><strong>Order ID:</strong> ${order?.orderId || 'N/A'}</p>
            <p><strong>Project Name:</strong> ${project.name}</p>
            <p><strong>Google Drive Deliverables:</strong> <a href="${finalLink}">${finalLink}</a></p>
          </div>
        `
      }).catch(console.error);

      // Notify Assigned Employees of Project Completion
      if (project.employees && project.employees.length > 0) {
        for (const empId of project.employees) {
          await notifyUser({
            userId: empId,
            title: 'Project Completed',
            message: 'This project has been marked as completed. Thank you for your work.',
            type: 'success',
            priority: 'high',
            referenceId: project._id.toString(),
            referenceModel: 'Project',
            dispatcher: ioDispatcher
          });
        }
      }

      // Notify Project Manager
      if (project.manager) {
        await notifyUser({
          userId: project.manager,
          title: 'Project Completed',
          message: 'The project has been completed successfully.',
          type: 'success',
          priority: 'high',
          referenceId: project._id.toString(),
          referenceModel: 'Project',
          dispatcher: ioDispatcher
        });
      }

      await notifyStaff({
        title: 'Project Delivered',
        message: `Project '${project.name}' has been completed and delivered to the client.`,
        type: 'success',
        priority: 'high',
        referenceId: project._id.toString(),
        referenceModel: 'Project',
        actionUrl: '/admin?tab=projects',
        dispatcher: ioDispatcher,
        metadata: { projectName: project.name, orderId: order?.orderId }
      });

      await logEvent({
        action: 'PROJECT_COMPLETED',
        details: { projectId: project._id, orderId: order?.orderId, deliveryLink: finalLink }
      });

      return res.status(200).json({ success: true, message: 'Project completed and delivered successfully.', data: project });
    }

    return res.status(400).json({ error: "Invalid review decision. Choose 'approve' or 'reject'." });
  } catch (err) {
    next(err);
  }
};

/**
 * Editor accepts their assigned project
 * Route: POST /api/projects/:id/accept
 */
export const acceptProjectAssignment = async (req, res, next) => {
  try {
    console.log('\n==========================');
    console.log('ACCEPT PROJECT');
    console.log('==========================');
    console.log('Accept Route Hit');

    const user = req.user;
    console.log(`JWT User: ID ${user._id} | Name: ${user.name}`);

    const project = await Project.findById(req.params.id);
    if (!project) {
      console.warn(`[ACCEPT PROJECT] ✗ Project not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Project not found' });
    }
    console.log('Project Found');

    // Verify user has access to accept this project assignment
    if (user.role !== 'EMPLOYEE' && user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only authorized employees can accept project assignments.' });
    }

    const isSuggested = project.suggestedEmployee?.toString() === user._id.toString();
    const isAssigned = (project.employees || []).some(id => (id?._id || id)?.toString() === user._id.toString()) ||
      (project.assignments || []).some(a => (a.employee?._id || a.employee)?.toString() === user._id.toString()) ||
      (project.assignedEmployee?._id || project.assignedEmployee)?.toString() === user._id.toString() ||
      (project.employeeId?._id || project.employeeId)?.toString() === user._id.toString();

    if (!isSuggested && !isAssigned && user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'You are not authorized to accept this project assignment.' });
    }

    // Prevent multiple employee acceptance
    if (project.assignmentStatus === 'Accepted' && project.employeeId && project.employeeId.toString() !== user._id.toString()) {
      return res.status(400).json({ error: `This project has already been accepted by ${project.employeeName || 'another employee'}` });
    }

    const beforeSave = {
      assignedEmployee: project.assignedEmployee,
      employeeId: project.employeeId,
      assignedEmployeeName: project.assignedEmployeeName,
      employeeName: project.employeeName,
      assignmentStatus: project.assignmentStatus,
      acceptedAt: project.acceptedAt,
      acceptedBy: project.acceptedBy
    };
    console.log(`Before Save: ${JSON.stringify(beforeSave)}`);

    // Update Project assignment fields
    project.assignedEmployee = user._id;
    project.employeeId = user._id;
    project.assignedEmployeeName = user.name;
    project.employeeName = user.name;
    project.assignmentStatus = 'Accepted';
    project.acceptedAt = new Date();
    project.acceptedBy = user._id;

    // Retain compatibility with existing subdocument arrays if any modules read them
    if (!project.assignments) {
      project.assignments = [];
    }
    const assignmentObj = project.assignments.find(a => (a.employee?._id || a.employee)?.toString() === user._id.toString());
    if (assignmentObj) {
      assignmentObj.accepted = true;
      assignmentObj.status = 'Accepted';
      assignmentObj.acceptedAt = project.acceptedAt;
      assignmentObj.acceptedBy = user._id;
    } else {
      project.assignments.push({
        employee: user._id,
        accepted: true,
        status: 'Accepted',
        acceptedAt: project.acceptedAt,
        acceptedBy: user._id
      });
    }
    project.markModified('assignments');

    const afterSave = {
      assignedEmployee: project.assignedEmployee,
      employeeId: project.employeeId,
      assignedEmployeeName: project.assignedEmployeeName,
      employeeName: project.employeeName,
      assignmentStatus: project.assignmentStatus,
      acceptedAt: project.acceptedAt,
      acceptedBy: project.acceptedBy
    };
    console.log(`After Save: ${JSON.stringify(afterSave)}`);

    await project.save();
    console.log('Mongo Saved');

    // Populate relation fields before returning the payload
    await project.populate('employees', 'name email');
    await project.populate('manager', 'name email');
    await project.populate('assignedEmployee', 'name email');

    await logEvent({
      userId: user._id,
      userName: user.name,
      action: 'TASK_STATUS_CHANGE',
      details: { projectId: project._id, employeeId: user._id, message: 'Employee accepted project assignment' }
    });

    console.log('Frontend Refreshed');

    return res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

/**
 * Editor rejects their assigned project
 * Route: POST /api/projects/:id/reject
 */
export const rejectProjectAssignment = async (req, res, next) => {
  try {
    const user = req.user;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (user.role !== 'EMPLOYEE' && user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only authorized employees can reject project assignments.' });
    }

    const isAssigned = (project.employees || []).some(id => (id?._id || id)?.toString() === user._id.toString()) ||
      (project.assignments || []).some(a => (a.employee?._id || a.employee)?.toString() === user._id.toString()) ||
      (project.assignedEmployee?._id || project.assignedEmployee)?.toString() === user._id.toString() ||
      (project.employeeId?._id || project.employeeId)?.toString() === user._id.toString() ||
      project.suggestedEmployee?.toString() === user._id.toString();

    if (!isAssigned && user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'You are not authorized to reject this project assignment.' });
    }

    project.assignmentStatus = 'Rejected';
    project.assignedEmployee = user._id;
    project.employeeId = user._id;
    project.assignedEmployeeName = user.name;
    project.employeeName = user.name;
    project.acceptedAt = null;

    if (!project.assignments) project.assignments = [];
    const assignmentObj = project.assignments.find(a => (a.employee?._id || a.employee)?.toString() === user._id.toString());
    if (assignmentObj) {
      assignmentObj.accepted = false;
      assignmentObj.status = 'Rejected';
      assignmentObj.acceptedAt = null;
    } else {
      project.assignments.push({
        employee: user._id,
        accepted: false,
        status: 'Rejected',
        acceptedAt: null
      });
    }
    project.markModified('assignments');

    await project.save();

    await project.populate('employees', 'name email');
    await project.populate('manager', 'name email');
    await project.populate('assignedEmployee', 'name email');

    const ioDispatcher = req.app.get('socketio_dispatch');
    if (ioDispatcher) {
      ioDispatcher(null, 'dashboard-update', { projectId: project._id, assignmentStatus: 'Rejected' });
    }

    return res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

/**
 * Creates a new project
 * Route: POST /api/projects
 */
export const createProject = async (req, res, next) => {
  try {
    const { name, description, client, category, priority, estimatedCompletion, manager, employees, status, source } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const projectData = {
      name: name.trim(),
      description: description ? String(description).trim() : '',
      category: category || 'Short Form Editing',
      priority: priority || 'medium',
      status: status || 'pending',
      source: source || 'Manual',
      createdBy: req.user?._id || null
    };

    if (estimatedCompletion) projectData.estimatedCompletion = new Date(estimatedCompletion);
    
    // Safely sanitize relational ID fields: filter out empty strings "", null, undefined, or invalid ObjectIds
    if (client && mongoose.Types.ObjectId.isValid(client)) {
      projectData.client = client;
    }
    if (manager && mongoose.Types.ObjectId.isValid(manager)) {
      projectData.manager = manager;
    }
    if (employees && Array.isArray(employees)) {
      const validEmps = employees.filter(e => e && mongoose.Types.ObjectId.isValid(e));
      projectData.employees = validEmps;
      if (validEmps.length > 0) {
        projectData.assignedEmployee = validEmps[0];
        projectData.employeeId = validEmps[0];
        projectData.assignments = validEmps.map(empId => ({
          employee: empId,
          accepted: false,
          status: 'Pending',
          acceptedAt: null
        }));
      }
    }

    const project = await Project.create(projectData);

    await project.populate([
      { path: 'client' },
      { path: 'manager', select: 'name email' },
      { path: 'employees', select: 'name email' },
      { path: 'assignments.employee', select: 'name email' }
    ]);

    const ioDispatcher = req.app.get('socketio_dispatch');
    if (ioDispatcher) {
      ioDispatcher(null, 'project-created', { projectId: project._id, name: project.name });
      ioDispatcher(null, 'Project Created', { projectId: project._id, name: project.name });
    }

    await logEvent({
      userId: req.user?._id || null,
      userName: req.user?.name || 'Admin',
      action: 'PROJECT_CREATE',
      details: { projectId: project._id, name: project.name }
    });

    return res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

/**
 * Updates a project
 * Route: PUT /api/projects/:id
 */
export const updateProject = async (req, res, next) => {
  try {
    const { name, description, client, category, priority, estimatedCompletion, manager, employees, status } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Manager BOLA for updateProject
    if (req.user && (req.user.role || '').toUpperCase() === 'MANAGER') {
      const ownerId = project.manager ? project.manager.toString() : null;
      if (ownerId && ownerId !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized to update this project.' });
      }
    }
    if (name !== undefined && name !== null) project.name = String(name).trim();
    if (description !== undefined) project.description = description ? String(description).trim() : '';
    if (client !== undefined) project.client = (client && mongoose.Types.ObjectId.isValid(client)) ? client : null;
    if (category !== undefined) project.category = category;
    if (priority !== undefined) project.priority = priority;
    // Approval workflow enforcement: MANAGER cannot directly complete/approve
    if (status !== undefined) {
      const userRole = (req.user?.role || '').toUpperCase();
      const restricted = ['completed', 'approved'];
      if (userRole === 'MANAGER' && restricted.includes(String(status).toLowerCase())) {
        return res.status(403).json({ error: 'Managers cannot directly set status to completed/approved.Requires SUPER_ADMIN final approval.' });
      }
      project.status = status;
    }
    if (estimatedCompletion !== undefined) project.estimatedCompletion = estimatedCompletion ? new Date(estimatedCompletion) : null;
    if (manager !== undefined) project.manager = (manager && mongoose.Types.ObjectId.isValid(manager)) ? manager : null;
    if (employees !== undefined && Array.isArray(employees)) {
      const validEmps = employees.filter(e => e && mongoose.Types.ObjectId.isValid(e));
      project.employees = validEmps;
      if (validEmps.length > 0) {
        if (!project.assignedEmployee) project.assignedEmployee = validEmps[0];
        if (!project.employeeId) project.employeeId = validEmps[0];
        if (!project.assignments) project.assignments = [];
        validEmps.forEach(empId => {
          const empIdStr = empId.toString();
          if (!project.assignments.some(a => (a.employee?._id || a.employee)?.toString() === empIdStr)) {
            project.assignments.push({
              employee: empId,
              accepted: false,
              status: 'Pending',
              acceptedAt: null
            });
          }
        });
      }
    }

    // Only SUPER_ADMIN completion triggers financial side-effects (prevent Manager bypass)
    if ((status === 'completed' || status === 'approved') && (req.user?.role || '').toUpperCase() === 'SUPER_ADMIN') {
      if (project.order) {
        await Order.findByIdAndUpdate(project.order, { status: 'completed' }).catch(() => {});
      }
      if (project.referral?.isReferral && project.referral?.enquiryId) {
        await ReferralBooking.findOneAndUpdate({ enquiry: project.referral.enquiryId }, { status: 'Completed' }).catch(() => {});
      }
    }

    await project.save();

    await project.populate([
      { path: 'client' },
      { path: 'manager', select: 'name email' },
      { path: 'employees', select: 'name email' }
    ]);

    const ioDispatcher = req.app.get('socketio_dispatch');
    if (ioDispatcher) {
      ioDispatcher(null, 'dashboard-update', { projectId: project._id, name: project.name });
    }

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'PROJECT_UPDATE',
      details: { projectId: project._id, name: project.name, status: project.status }
    });

    return res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

/**
 * Deletes a project and its tasks
 * Route: DELETE /api/projects/:id
 */
export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();

    const ioDispatcher = req.app.get('socketio_dispatch');
    if (ioDispatcher) {
      ioDispatcher(null, 'dashboard-update', { projectId: req.params.id });
    }

    return res.status(200).json({ success: true, message: 'Project and associated tasks deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * Creates a new task
 * Route: POST /api/tasks
 */
export const createTask = async (req, res, next) => {
  try {
    const { project, name, description, priority, deadline, assignedTo, assignedManager, status } = req.body;
    if (!project || !name) {
      return res.status(400).json({ error: 'Project ID and task name are required' });
    }

    const projDoc = await Project.findById(project);
    if (!projDoc) {
      return res.status(404).json({ error: 'Associated project not found' });
    }

    const taskData = {
      project,
      name,
      description: description || '',
      priority: priority || 'medium',
      status: status || (assignedTo ? 'assigned' : 'pending'),
      createdBy: req.user._id
    };

    if (deadline) taskData.deadline = new Date(deadline);
    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
      taskData.assignedTo = assignedTo;

      // Link employee to project
      const empIdStr = assignedTo.toString();
      if (!projDoc.employees) projDoc.employees = [];
      if (!projDoc.employees.some(e => e?.toString() === empIdStr)) {
        projDoc.employees.push(assignedTo);
      }
      if (!projDoc.assignments) projDoc.assignments = [];
      if (!projDoc.assignments.some(a => a.employee?.toString() === empIdStr)) {
        projDoc.assignments.push({
          employee: assignedTo,
          accepted: false,
          acceptedAt: null,
          status: 'Pending'
        });
      }
      await projDoc.save();
    }
    if (assignedManager && mongoose.Types.ObjectId.isValid(assignedManager)) {
      taskData.assignedManager = assignedManager;
    }

    const task = await Task.create(taskData);
    await task.populate([
      { path: 'project' },
      { path: 'assignedTo', select: 'name email phone' }
    ]);

    // Alert employee if assigned
    if (assignedTo) {
      const employee = await User.findById(assignedTo);
      if (employee) {
        const ioDispatcher = req.app.get('socketio_dispatch');
        await notifyUser({
          userId: assignedTo,
          title: 'Task Assigned',
          message: `You have been assigned task: "${task.name}"`,
          type: 'info',
          priority: 'high',
          referenceId: task._id.toString(),
          referenceModel: 'Task',
          dispatcher: ioDispatcher
        });

        sendEmployeeTaskAlertEmail(employee.name, employee.email, task.name, task.deadline).catch(console.error);

        if (employee.phone) {
          const priorityStr = (task.priority || 'medium').charAt(0).toUpperCase() + (task.priority || 'medium').slice(1);
          const deadlineStr = task.deadline ? new Date(task.deadline).toLocaleDateString([], { day: 'numeric', month: 'long' }) : 'N/A';
          const wsMsgText = `New Task Assigned\n\nTask:\n${task.name}\n\nPriority:\n${priorityStr}\n\nDeadline:\n${deadlineStr}\n\nPlease login to ViralCraft Media.`;
          whatsappService.sendMessage(employee.phone, wsMsgText).catch(err => {
            console.error('Failed to send task assignment alert via WhatsApp:', err.message);
          });
        }
      }
    }

    const ioDispatcher = req.app.get('socketio_dispatch');
    if (ioDispatcher) {
      ioDispatcher(null, 'task-created', { taskId: task._id, name: task.name });
      ioDispatcher(null, 'Task Created', { taskId: task._id, name: task.name });
    }

    return res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

/**
 * Updates a task
 * Route: PUT /api/tasks/:id
 */
export const updateTask = async (req, res, next) => {
  try {
    const { name, description, priority, deadline, assignedTo, assignedManager, status, submissionUrl, feedback, actualHours, estimatedHours } = req.body;
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Role check: Employees can update their assigned tasks (status, submissionUrl, comments, hours)
    if (req.user.role === 'EMPLOYEE') {
      if (!task.assignedTo || task.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'You are only authorized to update tasks assigned to you.' });
      }
      if (status !== undefined) task.status = status;
      if (submissionUrl !== undefined) task.submissionUrl = submissionUrl;
      if (actualHours !== undefined) task.actualHours = actualHours;
    } else {
      // Super Admin or Manager can update all fields
      if (name !== undefined) task.name = name;
      if (description !== undefined) task.description = description;
      if (priority !== undefined) task.priority = priority;
      if (status !== undefined) task.status = status;
      if (deadline !== undefined) task.deadline = deadline ? new Date(deadline) : null;
      if (assignedTo !== undefined) {
        task.assignedTo = (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) ? assignedTo : null;
        if (task.assignedTo && task.project) {
          const projId = task.project._id || task.project;
          const proj = await Project.findById(projId);
          if (proj) {
            const empIdStr = task.assignedTo.toString();
            if (!proj.employees) proj.employees = [];
            if (!proj.employees.some(e => e?.toString() === empIdStr)) {
              proj.employees.push(task.assignedTo);
            }
            if (!proj.assignments) proj.assignments = [];
            if (!proj.assignments.some(a => a.employee?.toString() === empIdStr)) {
              proj.assignments.push({
                employee: task.assignedTo,
                accepted: false,
                acceptedAt: null,
                status: 'Pending'
              });
            }
            await proj.save();
          }
        }
      }
      if (assignedManager !== undefined) task.assignedManager = assignedManager || null;
      if (submissionUrl !== undefined) task.submissionUrl = submissionUrl;
      if (feedback !== undefined) task.feedback = feedback;
      if (actualHours !== undefined) task.actualHours = actualHours;
      if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
    }

    if (status === 'completed' || status === 'approved') {
      task.completedAt = new Date();
    }

    await task.save();
    await task.populate([
      { path: 'project' },
      { path: 'assignedTo', select: 'name email' }
    ]);

    const ioDispatcher = req.app.get('socketio_dispatch');
    if (ioDispatcher) {
      ioDispatcher(null, 'dashboard-update', { taskId: task._id, name: task.name, status: task.status });
    }

    return res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

/**
 * Deletes a task
 * Route: DELETE /api/tasks/:id
 */
export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.deleteOne();

    const ioDispatcher = req.app.get('socketio_dispatch');
    if (ioDispatcher) {
      ioDispatcher(null, 'dashboard-update', { taskId: req.params.id });
    }

    return res.status(200).json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * Gets clients list for dropdowns
 * Route: GET /api/projects/clients
 */
export const getClients = async (req, res, next) => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    // Least-privilege: MANAGER gets only essential fields, SUPER_ADMIN gets more but still sanitized
    if (userRole === 'MANAGER') {
      const clients = await Client.find().select('name email phone platform orders createdAt').sort({ name: 1 }).lean();
      // Strip invoices/payments/deliveryHistory which are SUPER_ADMIN only
      const sanitized = clients.map(c => {
        const { invoices, payments, deliveryHistory, whatsappHistory, notes, ...safe } = c;
        return safe;
      });
      return res.status(200).json({ success: true, data: sanitized });
    }
    const clients = await Client.find().select('name email phone platform orders createdAt invoices payments').sort({ name: 1 }).lean();
    return res.status(200).json({ success: true, data: clients });
  } catch (err) {
    next(err);
  }
};

/**
 * Editor accepts an assigned task
 * Route: POST /api/tasks/:id/accept
 */
export const acceptTaskAssignment = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Role gate — same as acceptProjectAssignment
    if (user.role !== 'EMPLOYEE' && user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only authorized employees can accept task assignments.' });
    }

    const empIdStr = user._id.toString();

    // Check direct task assignment (only assignedTo exists on Task schema)
    let isAssigned = task.assignedTo?.toString() === empIdStr;

    // If not directly assigned, check parent project assignment — exact same pattern as acceptProjectAssignment
    if (!isAssigned && task.project) {
      const projId = task.project._id || task.project;
      const project = await Project.findById(projId);
      if (project) {
        const isSuggested = project.suggestedEmployee?.toString() === empIdStr;
        const isProjectStaff = (project.employees || []).some(id => (id?._id || id)?.toString() === empIdStr) ||
          (project.assignments || []).some(a => (a.employee?._id || a.employee)?.toString() === empIdStr) ||
          (project.assignedEmployee?._id || project.assignedEmployee)?.toString() === empIdStr ||
          (project.employeeId?._id || project.employeeId)?.toString() === empIdStr;

        if (isSuggested || isProjectStaff) {
          isAssigned = true;
        }
      }
    }

    if (!isAssigned && user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'You are not authorized to accept this task.' });
    }

    task.status = 'accepted';
    task.acceptedAt = new Date();
    if (!task.assignedTo) {
      task.assignedTo = user._id;
    }
    await task.save();

    await task.populate([
      { path: 'project' },
      { path: 'assignedTo', select: 'name email' }
    ]);

    const ioDispatcher = req.app.get('socketio_dispatch');
    if (ioDispatcher) {
      ioDispatcher(null, 'dashboard-update', { taskId: task._id, name: task.name, status: task.status });
    }

    return res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

/**
 * Editor rejects an assigned task
 * Route: POST /api/tasks/:id/reject
 */
export const rejectTaskAssignment = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Role gate — same as rejectProjectAssignment
    if (user.role !== 'EMPLOYEE' && user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only authorized employees can reject task assignments.' });
    }

    const empIdStr = user._id.toString();

    // Check direct task assignment (only assignedTo exists on Task schema)
    let isAssigned = task.assignedTo?.toString() === empIdStr;

    // If not directly assigned, check parent project assignment — exact same pattern as rejectProjectAssignment
    if (!isAssigned && task.project) {
      const projId = task.project._id || task.project;
      const project = await Project.findById(projId);
      if (project) {
        const isSuggested = project.suggestedEmployee?.toString() === empIdStr;
        const isProjectStaff = (project.employees || []).some(id => (id?._id || id)?.toString() === empIdStr) ||
          (project.assignments || []).some(a => (a.employee?._id || a.employee)?.toString() === empIdStr) ||
          (project.assignedEmployee?._id || project.assignedEmployee)?.toString() === empIdStr ||
          (project.employeeId?._id || project.employeeId)?.toString() === empIdStr;

        if (isSuggested || isProjectStaff) {
          isAssigned = true;
        }
      }
    }

    if (!isAssigned && user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'You are not authorized to reject this task.' });
    }

    task.status = 'rejected';
    task.acceptedAt = null;
    await task.save();

    await task.populate([
      { path: 'project' },
      { path: 'assignedTo', select: 'name email' }
    ]);

    const ioDispatcher = req.app.get('socketio_dispatch');
    if (ioDispatcher) {
      ioDispatcher(null, 'dashboard-update', { taskId: task._id, name: task.name, status: task.status });
    }

    return res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};


