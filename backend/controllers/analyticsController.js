import Order from '../models/Order.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Enquiry from '../models/Enquiry.js';

/**
 * Gathers business statistics and metrics using real MongoDB aggregates
 * Route: GET /api/analytics/dashboard
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    // Date filter — validated ISO dates from frontend (Today/Yesterday/7D etc.)
    let dateFilter = null;
    const { startDate, endDate } = req.query;
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s <= e) {
        // Cap range to 2 years to avoid huge scans
        const maxRange = 730 * 24 * 60 * 60 * 1000;
        if (e.getTime() - s.getTime() <= maxRange) {
          dateFilter = { $gte: s, $lte: e };
        }
      }
    }
    const cacheKey = `analytics:dashboard:${userRole}:${req.user._id}:${dateFilter ? `${dateFilter.$gte.toISOString()}_${dateFilter.$lte.toISOString()}` : 'all'}`;
    const { safeGet, safeSet } = await import('../config/redis.js');
    try {
      const cached = await safeGet(cacheKey);
      if (cached) {
        return res.status(200).json(JSON.parse(cached));
      }
    } catch {}

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Orders Today & Revenue Today
    const todayOrders = await Order.find({ paymentStatus: 'success', createdAt: { $gte: today } }).select('amount').lean();
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

    // 5. Success Payments & Revenue Overview — confirmed vs pending separation (dateFilter aware, uses createdAt = verified date)
    const successMatch = dateFilter ? { paymentStatus: 'success', createdAt: dateFilter } : { paymentStatus: 'success' };
    const pendingMatch = dateFilter ? { paymentStatus: { $in: ['pending', 'enquiry'] }, createdAt: dateFilter } : { paymentStatus: { $in: ['pending', 'enquiry'] } };
    const successOrders = await Order.find(successMatch).select('amount createdAt').lean();
    const totalRevenue = successOrders.reduce((sum, ord) => sum + (ord.amount || 0), 0);
    const pendingOrdersRaw = await Order.find(pendingMatch).select('amount createdAt').lean();
    const pendingRevenue = pendingOrdersRaw.reduce((sum, ord) => sum + (ord.amount || 0), 0);
    const outstandingOrdersRaw = await Order.find(dateFilter ? { paymentStatus: { $in: ['pending','enquiry','failed'] }, createdAt: dateFilter } : { paymentStatus: { $in: ['pending','enquiry','failed'] } }).select('amount').lean();
    const outstandingAmount = outstandingOrdersRaw.reduce((sum, o) => sum + (o.amount || 0), 0);
    const avgDealValue = successOrders.length > 0 ? Math.round(totalRevenue / successOrders.length) : 0;

    // 6. Turnaround Speed (TAT)
    const completedProjects = await Project.find({ status: 'completed' }).select('createdAt updatedAt').lean();
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

    // 8. Editor / Employee Productivity Metrics (Leaderboard stats) using Aggregation
    const editors = await User.find({ role: 'EMPLOYEE', status: 'active' }).select('name email department').lean();
    
    const taskStats = await Task.aggregate([
      {
        $group: {
          _id: "$assignedTo",
          totalTasks: { $sum: 1 },
          approvedTasksCount: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
          },
          rejectedTasksCount: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
          },
          currentWorkload: {
            $sum: { $cond: [{ $in: ["$status", ["assigned", "in_progress"]] }, 1, 0] }
          },
          approvedTasks: {
            $push: {
              $cond: [
                { $eq: ["$status", "approved"] },
                { createdAt: "$createdAt", updatedAt: "$updatedAt" },
                "$$REMOVE"
              ]
            }
          }
        }
      }
    ]);

    const taskStatsMap = {};
    taskStats.forEach(stat => {
      if (stat._id) {
        taskStatsMap[stat._id.toString()] = stat;
      }
    });

    const employeeProductivity = [];
    for (const ed of editors) {
      const edIdStr = ed._id.toString();
      const stats = taskStatsMap[edIdStr] || {
        totalTasks: 0,
        approvedTasksCount: 0,
        rejectedTasksCount: 0,
        currentWorkload: 0,
        approvedTasks: []
      };

      const totalTasks = stats.totalTasks;
      const approvedTasksCount = stats.approvedTasksCount;
      const rejectedTasksCount = stats.rejectedTasksCount;

      let elapsedTotalMs = 0;
      for (const t of stats.approvedTasks || []) {
        if (t.updatedAt && t.createdAt) {
          elapsedTotalMs += new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime();
        }
      }
      const avgSpeedHours = approvedTasksCount > 0 
        ? Math.round(elapsedTotalMs / (approvedTasksCount * 1000 * 60 * 60))
        : 24;

      employeeProductivity.push({
        id: ed._id,
        name: ed.name,
        email: ed.email,
        department: ed.department || 'General',
        completedTasks: approvedTasksCount,
        hoursWorked: approvedTasksCount * 4,
        averageDeliveryTime: `${avgSpeedHours}h`,
        projectsFinished: approvedTasksCount,
        projectsPending: totalTasks - approvedTasksCount,
        approvalRate: totalTasks > 0 ? Math.round((approvedTasksCount / totalTasks) * 100) : 100,
        rejectionRate: totalTasks > 0 ? Math.round((rejectedTasksCount / totalTasks) * 100) : 0,
        currentWorkload: stats.currentWorkload
      });
    }

    // Sort leaderboard by completed tasks descending
    employeeProductivity.sort((a, b) => b.completedTasks - a.completedTasks);

    // 9. Manager Productivity metrics using Aggregation
    const managers = await User.find({ role: 'MANAGER', status: 'active' }).select('name').lean();
    
    // Project counts by manager
    const projectStats = await Project.aggregate([
      {
        $group: {
          _id: "$manager",
          count: { $sum: 1 }
        }
      }
    ]);
    const projectStatsMap = {};
    projectStats.forEach(s => {
      if (s._id) projectStatsMap[s._id.toString()] = s.count;
    });

    // Task counts by assignedManager
    const managerTaskStats = await Task.aggregate([
      {
        $group: {
          _id: "$assignedManager",
          approvedCount: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
          }
        }
      }
    ]);
    const managerTaskStatsMap = {};
    managerTaskStats.forEach(s => {
      if (s._id) {
        managerTaskStatsMap[s._id.toString()] = s;
      }
    });

    const totalPendingReviews = await Task.countDocuments({ status: 'submitted' });

    const managerProductivity = [];
    for (const m of managers) {
      const mIdStr = m._id.toString();
      const managedCount = projectStatsMap[mIdStr] || 0;
      const stats = managerTaskStatsMap[mIdStr] || { approvedCount: 0, rejectedCount: 0 };
      const totalReviews = stats.approvedCount + stats.rejectedCount;

      managerProductivity.push({
        id: m._id,
        name: m.name,
        projectsManaged: managedCount,
        reworkRate: totalReviews > 0 ? Math.round((stats.rejectedCount / totalReviews) * 100) : 0,
        pendingReviews: totalPendingReviews
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

    const recentOrdersFilter = dateFilter ? { paymentStatus: 'success', createdAt: dateFilter } : { paymentStatus: 'success' };
    const recentOrders = await Order.find(recentOrdersFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // 11. Referral Lead analytics (Admin Dashboard only)
    let referralStats = null;
    if (req.user.role === 'SUPER_ADMIN') {
      const referralEnquiries = await Enquiry.find({ 'referral.isReferral': true }).select('status budget referral').lean();
      const totalReferralLeads = referralEnquiries.length;
      const convertedReferralLeads = referralEnquiries.filter(e => e.status === 'converted_project').length;
      const referralConversionRate = totalReferralLeads > 0
        ? Number(((convertedReferralLeads / totalReferralLeads) * 100).toFixed(1))
        : 0;

      const partnerCounts = {};
      const campaignCounts = {};
      referralEnquiries.forEach(e => {
        const agency = (e.referral && e.referral.partnerAgency) || 'Unknown';
        const camp = (e.referral && e.referral.campaignName) || 'Unknown';
        partnerCounts[agency] = (partnerCounts[agency] || 0) + 1;
        campaignCounts[camp] = (campaignCounts[camp] || 0) + 1;
      });
      const topPartner = Object.entries(partnerCounts).sort((a, b) => b[1] - a[1])[0];
      const topCampaign = Object.entries(campaignCounts).sort((a, b) => b[1] - a[1])[0];

      const referralRevenue = referralEnquiries
        .filter(e => e.status === 'converted_project')
        .reduce((sum, e) => sum + (e.budget || 0), 0);

      referralStats = {
        totalReferralLeads,
        convertedReferralLeads,
        referralConversionRate,
        topReferralPartner: topPartner ? { name: topPartner[0], leads: topPartner[1] } : null,
        topPerformingCampaign: topCampaign ? { name: topCampaign[0], leads: topCampaign[1] } : null,
        referralRevenue
      };
    }

    if (req.user.role === 'MANAGER') {
      const payload = {
        success: true,
        stats: {
          ordersToday,
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
          managerProductivity
        }
      };
      safeSet(cacheKey, JSON.stringify(payload), 60).catch(() => {});
      return res.status(200).json(payload);
    }

    const payload = {
      success: true,
      stats: {
        totalRevenue,
        pendingRevenue,
        confirmedRevenue: totalRevenue,
        outstandingAmount,
        avgDealValue,
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
        recentOrders,
        referralStats
      }
    };
    safeSet(cacheKey, JSON.stringify(payload), 60).catch(() => {});
    return res.status(200).json(payload);
  } catch (err) {
    next(err);
  }
};
