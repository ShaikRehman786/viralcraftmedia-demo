import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Client from '../models/Client.js';
import ChatMessage from '../models/ChatMessage.js';
import { logEvent } from '../services/loggingService.js';
import whatsappService, { sendOrderCompletedWhatsApp, sendTaskNotification } from '../services/whatsappService.js';
import { sendDeliveryEmail, sendEmployeeTaskAlertEmail, sendEmail } from '../services/emailService.js';
import { uploadFileToFolder } from '../services/driveService.js';
import { config } from '../config/env.js';
import { notifyStaff, notifyUser } from '../services/notificationService.js';

/**
 * Lists all projects
 * Route: GET /api/projects
 */
export const getProjects = async (req, res, next) => {
  try {
    let projects;
    
    // Clients see their own projects. Employees see projects they are assigned to.
    // Managers and Admins see all projects.
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'MANAGER') {
      projects = await Project.find()
        .populate('order')
        .populate('client')
        .populate('manager', 'name email')
        .populate('employees', 'name email')
        .populate('assignments.employee', 'name email')
        .populate('suggestedEmployee', 'name email role status')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'EMPLOYEE') {
      projects = await Project.find({ employees: req.user._id })
        .populate('order')
        .populate('client')
        .populate('manager', 'name email')
        .populate('assignments.employee', 'name email')
        .populate('suggestedEmployee', 'name email role status')
        .sort({ createdAt: -1 });
    } else {
      // Role is client, match by phone
      projects = await Project.find()
        .populate({
          path: 'client',
          match: { phone: req.user.phone }
        })
        .populate('order')
        .populate('suggestedEmployee', 'name email role status')
        .sort({ createdAt: -1 });

      // Filter out projects that did not match client criteria
      projects = projects.filter(p => p.client !== null);
    }

    return res.status(200).json({ success: true, data: projects });
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

    if (managerId) project.manager = managerId;
    if (employeeIds) project.employees = employeeIds;
    project.status = 'in_progress';

    // Reset single-employee acceptance if the currently assigned editor is changed
    if (employeeIds && employeeIds.length > 0) {
      if (project.employeeId && !employeeIds.some(id => id.toString() === project.employeeId.toString())) {
        project.assignedEmployee = null;
        project.employeeId = null;
        project.assignedEmployeeName = '';
        project.employeeName = '';
        project.assignmentStatus = 'Pending';
        project.acceptedAt = null;
        project.acceptedBy = null;
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
      const existing = currentAssignments.find(a => a.employee?.toString() === empId.toString());
      if (existing) {
        newAssignments.push(existing);
      } else {
        newAssignments.push({
          employee: empId,
          accepted: false,
          acceptedAt: null
        });
      }
    }
    project.assignments = newAssignments;

    await project.save();

    // Alert staff users
    const ioDispatcher = req.app.get('socketio_dispatch');

    if (managerId) {
      await notifyUser({
        userId: managerId,
        title: 'Project Assigned',
        message: `You are now managing project: ${project.name}`,
        type: 'info',
        priority: 'high',
        referenceId: project._id.toString(),
        referenceModel: 'Project',
        actionUrl: '/admin?tab=projects',
        dispatcher: ioDispatcher
      });
    }

    if (employeeIds && employeeIds.length > 0) {
      for (const empId of employeeIds) {
        const emp = await User.findById(empId);
        if (emp) {
          await notifyUser({
            userId: empId,
            title: 'Project Assigned',
            message: `You are assigned to work on project: ${project.name}`,
            type: 'info',
            priority: 'high',
            referenceId: project._id.toString(),
            referenceModel: 'Project',
            actionUrl: '/employee',
            dispatcher: ioDispatcher,
            metadata: { projectName: project.name }
          });

          await notifyStaff({
            title: 'Project Assigned',
            message: `${emp.name} was assigned to project: ${project.name}`,
            type: 'info',
            priority: 'high',
            referenceId: project._id.toString(),
            referenceModel: 'Project',
            dispatcher: ioDispatcher,
            metadata: { employeeName: emp.name, projectName: project.name }
          });
          
          sendEmployeeTaskAlertEmail(emp.name, emp.email, project.name, project.estimatedCompletion).catch(console.error);
        }
      }
    }

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'TASK_ASSIGNED',
      details: { projectId: project._id, managerId, employeeIds }
    });

    // Send WhatsApp work notifications asynchronously
    sendTaskNotification(project._id, employeeIds).catch(err => {
      console.error('[WA-NOTIFICATION] Failed to send WhatsApp notifications:', err.message);
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
    
    if (req.user.role === 'EMPLOYEE') {
      query.assignedTo = req.user._id;
    } else if (req.user.role === 'CLIENT') {
      // Find client projects first
      const clientProjects = await Project.find()
        .populate({
          path: 'client',
          match: { phone: req.user.phone }
        });
      
      const validProjectIds = clientProjects.filter(p => p.client !== null).map(p => p._id);
      query.project = { $in: validProjectIds };
    }

    const tasks = await Task.find(query)
      .populate('project')
      .populate('assignedTo', 'name email')
      .sort({ deadline: 1 });

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

    task.assignedTo = assignedTo;
    task.status = 'assigned';
    if (deadline) task.deadline = new Date(deadline);
    await task.save();

    // Alert employee
    const employee = await User.findById(assignedTo);
    if (employee) {
      const ioDispatcher = req.app.get('socketio_dispatch');
      
      await notifyUser({
        userId: assignedTo,
        title: 'Task Assigned',
        message: `New task assigned: ${task.name}. Due: ${new Date(task.deadline).toLocaleDateString()}`,
        type: 'info',
        priority: 'high',
        referenceId: task._id.toString(),
        referenceModel: 'Task',
        dispatcher: ioDispatcher,
        metadata: { taskName: task.name, deadline: task.deadline, projectId: task.project?._id?.toString() }
      });

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

    if (task.assignedTo.toString() !== req.user._id.toString() && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'You are not assigned to this task.' });
    }

    task.submissionUrl = submissionUrl;
    task.status = 'submitted';
    await task.save();

    // Notify Project Manager / Admin
    const managerId = task.project.manager;
    if (managerId) {
      const ioDispatcher = req.app.get('socketio_dispatch');
      await notifyUser({
        userId: managerId,
        title: 'Task Completed',
        message: `Employee ${req.user.name} submitted work for: ${task.name}`,
        type: 'success',
        priority: 'high',
        referenceId: task._id.toString(),
        referenceModel: 'Task',
        actionUrl: '/admin?tab=projects',
        dispatcher: ioDispatcher,
        metadata: { employeeName: req.user.name, taskName: task.name, submissionUrl }
      });
    }

    await notifyStaff({
      title: 'Task Completed',
      message: `${req.user.name} completed task: ${task.name}`,
      type: 'success',
      priority: 'high',
      referenceId: task._id.toString(),
      referenceModel: 'Task',
      dispatcher: req.app.get('socketio_dispatch'),
      metadata: { employeeName: req.user.name, taskName: task.name }
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
          title: 'Task Rejected',
          message: `Feedback on task '${task.name}': ${feedback}`,
          type: 'warning',
          priority: 'high',
          referenceId: task._id.toString(),
          referenceModel: 'Task',
          dispatcher: ioDispatcher,
          metadata: { taskName: task.name, feedback }
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
          title: 'Task Approved',
          message: `Great job! Your submission for '${task.name}' has been approved.`,
          type: 'success',
          priority: 'high',
          referenceId: task._id.toString(),
          referenceModel: 'Task',
          dispatcher: ioDispatcher,
          metadata: { taskName: task.name }
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

    // Verify user has access to this project's chat
    const isAdmin = req.user.role === 'SUPER_ADMIN';
    const isManager = req.user.role === 'MANAGER' && project.manager?.toString() === req.user._id.toString();
    const isAssignedEmployee = project.employees?.some(e => e.toString() === req.user._id.toString());
    
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

    // Verify user has access to this project's chat
    const isAdmin = req.user.role === 'SUPER_ADMIN';
    const isManager = req.user.role === 'MANAGER' && project.manager?.toString() === req.user._id.toString();
    const isAssignedEmployee = project.employees?.some(e => e.toString() === req.user._id.toString());
    
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
        ioDispatcher(project.manager.toString(), 'chat_message', chatMsg);
      }
      // Send to editors
      if (project.employees && project.employees.length > 0) {
        project.employees.forEach(empId => {
          ioDispatcher(empId.toString(), 'chat_message', chatMsg);
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
            title: 'Task Rejected',
            message: `Final delivery review rejected for revision: ${feedback}`,
            type: 'warning',
            priority: 'high',
            referenceId: t._id.toString(),
            referenceModel: 'Task',
            dispatcher: ioDispatcher,
            metadata: { taskName: t.name, feedback }
          });
        }
      }

      // Notify Project Manager
      if (project.manager) {
        await notifyUser({
          userId: project.manager,
          title: 'Project Rework Required',
          message: `Project '${project.name}' final delivery was rejected. Feedback: ${feedback}`,
          type: 'warning',
          priority: 'critical',
          referenceId: project._id.toString(),
          referenceModel: 'Project',
          actionUrl: '/admin?tab=projects',
          dispatcher: ioDispatcher,
          metadata: { projectName: project.name, feedback }
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

