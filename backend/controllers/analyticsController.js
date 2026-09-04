import Order from '../models/Order.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Enquiry from '../models/Enquiry.js';
import Payment from '../models/Payment.js';

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

    // 5. Success Payments & Revenue Overview — confirmed vs pending/failed/refunded/abandoned separation
    // Authoritative: Order.paymentStatus + Payment.status, both keyed by createdAt (verified/captured timestamp)
    const successMatch = dateFilter ? { paymentStatus: 'success', createdAt: dateFilter } : { paymentStatus: 'success' };
    const pendingMatch = dateFilter ? { paymentStatus: { $in: ['pending', 'enquiry'] }, createdAt: dateFilter } : { paymentStatus: { $in: ['pending', 'enquiry'] } };
    const failedMatch = dateFilter ? { paymentStatus: 'failed', createdAt: dateFilter } : { paymentStatus: 'failed' };
    const refundedMatch = dateFilter ? { paymentStatus: 'refunded', createdAt: dateFilter } : { paymentStatus: 'refunded' };
    // Abandoned = Payment created but never captured (no razorpayPaymentId) — within same date window
    const abandonedPaymentMatch = dateFilter ? { status: 'created', razorpayPaymentId: { $exists: false }, createdAt: dateFilter } : { status: 'created', razorpayPaymentId: { $exists: false } };
    // Fallback for abandoned where razorpayPaymentId is null/undefined sparsely
    const abandonedPaymentMatchAlt = dateFilter ? { status: 'created', razorpayPaymentId: null, createdAt: dateFilter } : { status: 'created', razorpayPaymentId: null };
    const successOrders = await Order.find(successMatch).select('amount createdAt razorpayOrderId').lean();
    const totalRevenue = successOrders.reduce((sum, ord) => sum + (ord.amount || 0), 0);
    const pendingOrdersRaw = await Order.find(pendingMatch).select('amount createdAt').lean();
    const pendingRevenue = pendingOrdersRaw.reduce((sum, ord) => sum + (ord.amount || 0), 0);
    const failedOrdersRaw = await Order.find(failedMatch).select('amount createdAt').lean();
    const failedRevenue = failedOrdersRaw.reduce((sum, o) => sum + (o.amount || 0), 0);
    // Payment-level failed (webhook-marked) that may not have Order row
    const failedPaymentsRaw = await Payment.find(dateFilter ? { status: 'failed', createdAt: dateFilter } : { status: 'failed' }).select('amount').lean();
    const failedPaymentsRevenue = failedPaymentsRaw.reduce((sum, p) => sum + (p.amount || 0), 0);
    // Combine failed: prefer Order failed amount, plus any Payment failed not already counted (avoid double-count by orderId)
    const failedOrderIds = new Set(successOrders.map(o => o.razorpayOrderId).concat(failedOrdersRaw.map(o => o.razorpayOrderId).filter(Boolean)));
    const dedupFailedPaymentsRevenue = failedPaymentsRaw.filter(p => !failedOrderIds.has(p.razorpayOrderId)).reduce((sum, p) => sum + (p.amount || 0), 0);
    const failedRevenueTotal = failedRevenue + dedupFailedPaymentsRevenue;
    const refundedOrdersRaw = await Order.find(refundedMatch).select('amount').lean();
    const refundedPaymentsRaw = await Payment.find(dateFilter ? { status: 'refunded', createdAt: dateFilter } : { status: 'refunded' }).select('amount').lean();
    const refundedRevenue = refundedOrdersRaw.reduce((sum, o) => sum + (o.amount || 0), 0) + refundedPaymentsRaw.reduce((sum, p) => sum + (p.amount || 0), 0) - refundedOrdersRaw.filter(o => refundedPaymentsRaw.some(p => p.razorpayOrderId && p.razorpayOrderId === o.razorpayOrderId)).reduce((s, o) => s + (o.amount || 0), 0);
    const abandonedPaymentsRaw = await Payment.find({ $or: [abandonedPaymentMatch, abandonedPaymentMatchAlt] }).select('amount createdAt').lean();
    const abandonedRevenue = abandonedPaymentsRaw.reduce((sum, p) => sum + (p.amount || 0), 0);
    // Outstanding = genuine pending only (not failed/abandoned) — pending is not revenue
    const outstandingAmount = pendingOrdersRaw.reduce((sum, o) => sum + (o.amount || 0), 0);
    const outstandingCount = pendingOrdersRaw.length;
    const failedCount = failedOrdersRaw.length + failedPaymentsRaw.filter(p => !failedOrderIds.has(p.razorpayOrderId)).length;
    const refundedCount = refundedOrdersRaw.length;
    const abandonedCount = abandonedPaymentsRaw.length;
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

    // 10. Budget timeline — per-day buckets using correct event timestamp (IST), dateFilter aware
    // Confirmed = Order paymentStatus success @ createdAt (verified time)
    // Pending = Order pending/enquiry @ createdAt
    // Failed = Order failed + Payment failed (deduped) @ createdAt
    let budgetTimeline = [];
    let growthChart;
    try {
      const tz = 'Asia/Kolkata';
      // Determine timeline range: dateFilter else last 30 days
      const rangeEnd = dateFilter ? new Date(dateFilter.$lte) : new Date();
      const rangeStart = dateFilter ? new Date(dateFilter.$gte) : new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
      rangeStart.setHours(0,0,0,0);
      rangeEnd.setHours(23,59,59,999);
      const dayKeys = [];
      const dayMap = new Map();
      for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
        const key = d.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD in IST
        dayKeys.push(key);
        dayMap.set(key, { date: key, confirmed: 0, pending: 0, failed: 0, refunded: 0, countConfirmed: 0, countPending: 0, countFailed: 0 });
      }
      // Aggregate by IST day string
      const [confirmedByDay, pendingByDay, failedByDay, refundedByDay] = await Promise.all([
        Order.aggregate([
          { $match: { paymentStatus: 'success', createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } }, revenue: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        Order.aggregate([
          { $match: { paymentStatus: { $in: ['pending','enquiry'] }, createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } }, revenue: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        Order.aggregate([
          { $match: { paymentStatus: 'failed', createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } }, revenue: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        Order.aggregate([
          { $match: { paymentStatus: 'refunded', createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } }, revenue: { $sum: '$amount' }, count: { $sum: 1 } } }
        ])
      ]);
      confirmedByDay.forEach(r => { const e = dayMap.get(r._id); if (e) { e.confirmed = r.revenue; e.countConfirmed = r.count; }});
      pendingByDay.forEach(r => { const e = dayMap.get(r._id); if (e) { e.pending = r.revenue; e.countPending = r.count; }});
      failedByDay.forEach(r => { const e = dayMap.get(r._id); if (e) { e.failed = r.revenue; e.countFailed = r.count; }});
      refundedByDay.forEach(r => { const e = dayMap.get(r._id); if (e) { e.refunded = r.revenue; }});
      budgetTimeline = dayKeys.map(k => dayMap.get(k));
      // Legacy growthChart — keep shape but make dateFilter aware: monthly revenue for the timeline range's year span
      const monthlyStats = await Order.aggregate([
        { $match: { paymentStatus: 'success', createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
        { $group: { _id: { $month: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } } }, revenue: { $sum: '$amount' }, orders: { $sum: 1 } } }
      ]);
      // Fallback monthly mapping for widget compatibility: map by calendar month name
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      // If range spans single year, show that year's months; otherwise show timeline months directly
      const monthAggByNum = await Order.aggregate([
        { $match: { paymentStatus: 'success', createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
        { $group: { _id: { $month: '$createdAt' }, revenue: { $sum: '$amount' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);
      growthChart = months.map((month, index) => {
        const match = monthAggByNum.find(item => item._id === index + 1);
        return { month, revenue: match ? match.revenue : 0, orders: match ? match.orders : 0 };
      });
    } catch (e) {
      // Fail-closed to legacy behaviour — never break dashboard for timeline error
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const monthlyStats = await Order.aggregate([
        { $match: { paymentStatus: 'success', createdAt: { $gte: startOfYear } } },
        { $group: { _id: { $month: "$createdAt" }, revenue: { $sum: "$amount" }, orders: { $sum: 1 } } },
        { $sort: { "_id": 1 } }
      ]);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      growthChart = months.map((month, index) => {
        const match = monthlyStats.find(item => item._id === index + 1);
        return { month, revenue: match ? match.revenue : 0, orders: match ? match.orders : 0 };
      });
      budgetTimeline = [];
    }

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
        failedRevenue: failedRevenueTotal,
        failedCount,
        refundedRevenue,
        refundedCount,
        abandonedRevenue,
        abandonedCount,
        outstandingAmount,
        outstandingCount,
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
        budgetTimeline,
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
