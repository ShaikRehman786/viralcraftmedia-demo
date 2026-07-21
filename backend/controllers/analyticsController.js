import Order from '../models/Order.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

/**
 * Gathers business statistics and metrics using real MongoDB aggregates
 * Route: GET /api/analytics/dashboard
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Orders Today & Revenue Today
    const todayOrders = await Order.find({ paymentStatus: 'success', createdAt: { $gte: today } });
    const ordersToday = todayOrders.length;
    const revenueToday = todayOrders.reduce((sum, ord) => sum + ord.amount, 0);

    // 2. Pending & Completed Project Counts
    const pendingOrders = await Project.countDocuments({ status: { $in: ['pending', 'in_progress', 'review'] } });
    const completedOrders = await Project.countDocuments({ status: 'completed' });
    const inProgress = await Project.countDocuments({ status: 'in_progress' });

    // 3. Online/Active Roles Counts
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const employeesOnline = await User.countDocuments({ role: 'EMPLOYEE', status: 'active', lastActive: { $gte: tenMinutesAgo } });
    const managersOnline = await User.countDocuments({ role: 'MANAGER', status: 'active', lastActive: { $gte: tenMinutesAgo } });

    // 4. Projects Due Today / Delayed
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const projectsDueToday = await Project.countDocuments({ estimatedCompletion: { $gte: today, $lte: endOfToday } });
    const projectsDelayed = await Project.countDocuments({ estimatedCompletion: { $lt: today }, status: { $ne: 'completed' } });

    // 5. Success Payments & Revenue Overview
    const successOrders = await Order.find({ paymentStatus: 'success' });
    const totalRevenue = successOrders.reduce((sum, ord) => sum + ord.amount, 0);

    // 6. Turnaround Speed (TAT)
    const completedProjects = await Project.find({ status: 'completed' });
    let totalDeliveryHours = 0;
    let completedCount = 0;
    for (const proj of completedProjects) {
      if (proj.updatedAt && proj.createdAt) {
        const diffMs = proj.updatedAt.getTime() - proj.createdAt.getTime();
        totalDeliveryHours += diffMs / (1000 * 60 * 60);
        completedCount++;
      }
    }
    const averageDeliveryTime = completedCount > 0 ? Math.round(totalDeliveryHours / completedCount) : 48; // default 48 hrs

    // 7. Simulated CSAT (based on task rejection rate mapping)
    // Formula: 5.0 - (totalRejections / totalApproved * 0.5), range bounded [3.5, 5.0]
    const approvedTasks = await Task.countDocuments({ status: 'approved' });
    const rejectedTasks = await Task.countDocuments({ status: 'rejected' });
    const rawCsat = approvedTasks > 0 ? 5.0 - ((rejectedTasks / approvedTasks) * 0.5) : 4.8;
    const customerSatisfaction = Math.max(3.8, Math.min(5.0, rawCsat)).toFixed(1);

    // 8. Editor / Employee Productivity Metrics (Leaderboard stats)
    const editors = await User.find({ role: 'EMPLOYEE', status: 'active' });
    const employeeProductivity = [];
    for (const ed of editors) {
      const totalTasks = await Task.countDocuments({ assignedTo: ed._id });
      const approvedTasksCount = await Task.countDocuments({ assignedTo: ed._id, status: 'approved' });
      const rejectedTasksCount = await Task.countDocuments({ assignedTo: ed._id, status: 'rejected' });
      
      // Calculate average approval speed
      const userApprovedTasks = await Task.find({ assignedTo: ed._id, status: 'approved' });
      let elapsedTotalMs = 0;
      for (const t of userApprovedTasks) {
        if (t.updatedAt && t.createdAt) {
          elapsedTotalMs += t.updatedAt.getTime() - t.createdAt.getTime();
        }
      }
      const avgSpeedHours = userApprovedTasks.length > 0 
        ? Math.round(elapsedTotalMs / (userApprovedTasks.length * 1000 * 60 * 60))
        : 24;

      employeeProductivity.push({
        id: ed._id,
        name: ed.name,
        email: ed.email,
        department: ed.department || 'General',
        completedTasks: approvedTasksCount,
        hoursWorked: approvedTasksCount * 4, // estimate 4h per approved reel
        averageDeliveryTime: `${avgSpeedHours}h`,
        projectsFinished: approvedTasksCount,
        projectsPending: totalTasks - approvedTasksCount,
        approvalRate: totalTasks > 0 ? Math.round((approvedTasksCount / totalTasks) * 100) : 100,
        rejectionRate: totalTasks > 0 ? Math.round((rejectedTasksCount / totalTasks) * 100) : 0,
        currentWorkload: await Task.countDocuments({ assignedTo: ed._id, status: { $in: ['assigned', 'in_progress'] } })
      });
    }

    // Sort leaderboard by completed tasks descending
    employeeProductivity.sort((a, b) => b.completedTasks - a.completedTasks);

    // 9. Manager Productivity metrics
    const managers = await User.find({ role: 'MANAGER', status: 'active' });
    const managerProductivity = [];
    for (const m of managers) {
      const managedCount = await Project.countDocuments({ manager: m._id });
      const approvedTasksCount = await Task.countDocuments({ assignedManager: m._id, status: 'approved' });
      const rejectedTasksCount = await Task.countDocuments({ assignedManager: m._id, status: 'rejected' });
      const totalReviews = approvedTasksCount + rejectedTasksCount;

      managerProductivity.push({
        id: m._id,
        name: m.name,
        projectsManaged: managedCount,
        reworkRate: totalReviews > 0 ? Math.round((rejectedTasksCount / totalReviews) * 100) : 0,
        pendingReviews: await Task.countDocuments({ status: 'submitted' })
      });
    }

    // 10. Monthly growth charts aggregates
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const monthlyStats = await Order.aggregate([
      { 
        $match: { 
          paymentStatus: 'success', 
          createdAt: { $gte: startOfYear } 
        } 
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$amount" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const growthChart = months.map((month, index) => {
      const match = monthlyStats.find(item => item._id === index + 1);
      return {
        month,
        revenue: match ? match.revenue : 0,
        orders: match ? match.orders : 0
      };
    });

    const recentOrders = await Order.find({ paymentStatus: 'success' })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      stats: {
        totalRevenue,
        ordersToday,
        revenueToday,
        pendingOrders,
        completedOrders,
        completedProjects: completedOrders,
        pendingProjects: pendingOrders,
        inProgress,
        employeesOnline,
        managersOnline,
        projectsDueToday,
        projectsDelayed,
        averageDeliveryTime,
        avgDeliveryHours: averageDeliveryTime,
        customerSatisfaction,
        employeeProductivity,
        managerProductivity,
        growthChart,
        recentOrders
      }
    });
  } catch (err) {
    next(err);
  }
};
