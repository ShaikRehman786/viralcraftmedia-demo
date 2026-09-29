import User from '../models/User.js';
import Task from '../models/Task.js';
import { createNotification } from './notificationService.js';
import { sendEmployeeProjectAlertEmail } from './emailService.js';

export const SERVICE_ROLE_MAP = {
  'Short Form Editing': {
    role: 'Video Editor',
    departments: ['Editor', 'Video Editing', 'Post-Production', 'Editing'],
    skills: ['Video Editor', 'Short Form Editing', 'Premiere Pro', 'Premium Pro', 'CapCut', 'Capcut', 'Photoshop', 'After Effects']
  },
  'Clip Editing': {
    role: 'Video Editor',
    departments: ['Editor', 'Video Editing', 'Post-Production', 'Editing'],
    skills: ['Video Editor', 'Short Form Editing', 'Clip Editing', 'Premiere Pro', 'Premium Pro', 'CapCut', 'Capcut', 'Photoshop', 'After Effects']
  },
  'Real Estate Editing': {
    role: 'Video Editor',
    departments: ['Editor', 'Video Editing', 'Post-Production', 'Editing'],
    skills: ['Video Editor', 'Short Form Editing', 'Real Estate Editing', 'Premiere Pro', 'Photoshop']
  },
  'Podcast Editing': {
    role: 'Podcast Editor',
    departments: ['Podcast', 'Audio', 'Post-Production', 'Editor'],
    skills: ['Podcast Editor', 'Audio Editing', 'Audition', 'Sound Design', 'Podcast']
  },
  'Marketing': {
    role: 'Marketing Specialist',
    departments: ['Marketing', 'Social Media', 'Growth', 'Content'],
    skills: ['Marketing Specialist', 'Marketing', 'Social Media', 'Content Strategy', 'SEO']
  },
  'Social Media Marketing': {
    role: 'Marketing Specialist',
    departments: ['Marketing', 'Social Media', 'Growth', 'Content'],
    skills: ['Marketing Specialist', 'Marketing', 'Social Media', 'Social Media Marketing', 'Content Strategy', 'SEO']
  },
  'Website Development': {
    role: 'Web Developer',
    departments: ['Development', 'Web Development', 'Engineering', 'Tech'],
    skills: ['Web Developer', 'Website Development', 'Frontend', 'React', 'Full Stack', 'Developer']
  },
  'Website Design & Development': {
    role: 'Web Developer',
    departments: ['Development', 'Web Development', 'Engineering', 'Tech', 'Design'],
    skills: ['Web Developer', 'Website Development', 'Website Design & Development', 'Frontend', 'React', 'Full Stack', 'Developer']
  },
  'Branding': {
    role: 'Graphic Designer',
    departments: ['Design', 'Branding', 'Creative', 'Art'],
    skills: ['Graphic Designer', 'Branding', 'Photoshop', 'Illustrator', 'Design']
  },
  'Consultation': {
    role: 'Project Coordinator',
    departments: ['Consultation', 'Management', 'Operations'],
    skills: ['Project Coordinator', 'Consultant', 'Coordination']
  }
};

/**
 * Resolves role-matched staff (employees and manager) based on project category/service
 */
export const getRoleMatchedStaff = async (category) => {
  const normCategory = (category || 'Short Form Editing').trim();
  const config = SERVICE_ROLE_MAP[normCategory] || SERVICE_ROLE_MAP['Short Form Editing'];

  try {
    // 1. Find all active employees matching either department or skills (case-insensitive)
    const deptRegexes = config.departments.map(d => new RegExp(`^${d}$`, 'i'));
    const skillRegexes = config.skills.map(s => new RegExp(s, 'i'));

    // Try finding active employees with matching department or skills
    let matchingEmployees = await User.find({
      role: 'EMPLOYEE',
      status: { $in: ['active', 'ACTIVE'] },
      $or: [
        { department: { $in: deptRegexes } },
        { skills: { $in: skillRegexes } }
      ]
    });

    // Fallback 1: If no specific skill/dept match, get any active employees
    if (!matchingEmployees || matchingEmployees.length === 0) {
      matchingEmployees = await User.find({
        role: 'EMPLOYEE',
        status: { $in: ['active', 'ACTIVE'] }
      });
    }

    // Fallback 2: If no active employee in DB (e.g. testing or staging), fallback to any employee
    if (!matchingEmployees || matchingEmployees.length === 0) {
      matchingEmployees = await User.find({
        role: 'EMPLOYEE'
      }).limit(5);
    }

    // 2. Find assigned or suitable active Manager
    let manager = await User.findOne({
      role: 'MANAGER',
      status: { $in: ['active', 'ACTIVE'] }
    });

    if (!manager) {
      manager = await User.findOne({ role: 'MANAGER' });
    }

    // 3. Workload-based suggested employee calculation (lowest active tasks)
    let bestCandidate = null;
    let minActiveTasks = Infinity;

    if (matchingEmployees && matchingEmployees.length > 0) {
      for (const candidate of matchingEmployees) {
        const activeTasksCount = await Task.countDocuments({
          assignedTo: candidate._id,
          status: { $in: ['assigned', 'in_progress', 'Pending', 'In Progress'] }
        });

        if (activeTasksCount < minActiveTasks) {
          minActiveTasks = activeTasksCount;
          bestCandidate = candidate;
        }
      }
    }

    return {
      requiredRole: config.role,
      matchingEmployees: matchingEmployees || [],
      manager: manager || null,
      suggestedEmployee: bestCandidate || (matchingEmployees && matchingEmployees[0]) || null
    };
  } catch (err) {
    console.error('[Routing] Role-matched staff resolution failed:', err.message);
    return {
      requiredRole: config.role,
      matchingEmployees: [],
      manager: null,
      suggestedEmployee: null
    };
  }
};

/**
 * Automatically routes and suggests the best employee based on skills and current active workload.
 */
export const getSuggestedEmployee = async (category) => {
  const result = await getRoleMatchedStaff(category);
  return result.suggestedEmployee ? result.suggestedEmployee._id : null;
};

/**
 * Assigns project staff (manager and role-matched employees) and dispatches role-based notifications
 */
export const assignProjectStaffAndNotify = async ({ project, ioDispatcher = null, createdBy = null }) => {
  if (!project) return null;

  try {
    const category = project.category || 'Short Form Editing';
    const { requiredRole, matchingEmployees, manager, suggestedEmployee } = await getRoleMatchedStaff(category);

    const empIds = matchingEmployees.map(e => e._id);
    const primaryEmployee = suggestedEmployee || matchingEmployees[0] || null;

    // Assign manager if not already set
    if (!project.manager && manager) {
      project.manager = manager._id;
    }

    // Assign employees if currently empty
    if (!project.employees || project.employees.length === 0) {
      project.employees = empIds;
    }

    if (!project.assignedEmployee && primaryEmployee) {
      project.assignedEmployee = primaryEmployee._id;
      project.employeeId = primaryEmployee._id;
      project.assignedEmployeeName = primaryEmployee.name;
      project.employeeName = primaryEmployee.name;
    }

    if (!project.suggestedEmployee && primaryEmployee) {
      project.suggestedEmployee = primaryEmployee._id;
    }

    if (!project.assignments || project.assignments.length === 0) {
      project.assignments = empIds.map(id => ({
        employee: id,
        accepted: false,
        status: 'Pending',
        acceptedAt: null
      }));
    }

    if (!project.department && matchingEmployees[0]?.department) {
      project.department = matchingEmployees[0].department;
    }

    if (createdBy && !project.createdBy) {
      project.createdBy = createdBy;
    }

    await project.save();

    // Safe structured logging for production auditing (PART 15)
    console.log(`[PROJECT_CREATED] projectId=${project._id} service=${project.category} requiredRole=${requiredRole} matchedEmployees=${empIds.length}`);

    // Create notifications for matched employees
    let notifCount = 0;
    let emailJobCount = 0;

    for (const emp of matchingEmployees) {
      try {
        const notif = await createNotification({
          userId: emp._id,
          title: 'New Project Assignment',
          message: `New project "${project.name}" has been created and assigned for ${project.category}.`,
          type: 'info',
          priority: 'high',
          referenceId: project._id.toString(),
          referenceModel: 'Project',
          actionUrl: '/employee',
          createdBy: createdBy || null,
          metadata: {
            projectId: project._id.toString(),
            projectName: project.name,
            category: project.category,
            role: requiredRole
          }
        });

        if (notif) notifCount++;

        if (ioDispatcher) {
          ioDispatcher(emp._id.toString(), 'new_notification', notif);
        }

        // Email notification to role-matched employee (fail-safe)
        if (emp.email) {
          emailJobCount++;
          sendEmployeeProjectAlertEmail(
            emp.name,
            emp.email,
            project.name,
            project.category,
            project.estimatedCompletion
          ).catch(emailErr => {
            console.error(`[PROJECT-NOTIFICATION] Email dispatch failed for ${emp.email}:`, emailErr.message);
          });
        }
      } catch (empNotifErr) {
        console.error(`[PROJECT-NOTIFICATION] Failed to notify employee ${emp._id}:`, empNotifErr.message);
      }
    }

    // Create notification for Manager if assigned
    if (manager) {
      try {
        const mgrNotif = await createNotification({
          userId: manager._id,
          title: 'New Project Assigned',
          message: `You have been assigned as Manager for project "${project.name}".`,
          type: 'info',
          priority: 'high',
          referenceId: project._id.toString(),
          referenceModel: 'Project',
          actionUrl: '/admin?tab=projects',
          createdBy: createdBy || null,
          metadata: {
            projectId: project._id.toString(),
            projectName: project.name,
            category: project.category
          }
        });

        if (mgrNotif) notifCount++;

        if (ioDispatcher) {
          ioDispatcher(manager._id.toString(), 'new_notification', mgrNotif);
        }
      } catch (mgrNotifErr) {
        console.error(`[PROJECT-NOTIFICATION] Failed to notify manager ${manager._id}:`, mgrNotifErr.message);
      }
    }

    console.log(`[NOTIFICATION_CREATED] projectId=${project._id} recipientCount=${notifCount}`);
    console.log(`[EMAIL_JOB_CREATED] projectId=${project._id} recipientCount=${emailJobCount}`);

    // Real-time broadcast to all client dashboards (Super Admin, Manager, Employees)
    if (ioDispatcher) {
      ioDispatcher(null, 'project-created', { projectId: project._id, name: project.name, category: project.category });
      ioDispatcher(null, 'Project Created', { projectId: project._id, name: project.name });
    }

    try {
      const { emitToRoles } = await import('./socketService.js');
      emitToRoles(null, 'project.created', { projectId: project._id }, ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE']).catch(() => {});
    } catch {}

    return { project, manager, matchingEmployees, suggestedEmployee };
  } catch (err) {
    console.error('[Routing] assignProjectStaffAndNotify failed:', err.message);
    return { project, manager: null, matchingEmployees: [], suggestedEmployee: null };
  }
};
