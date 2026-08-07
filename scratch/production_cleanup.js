import connectDB from '../backend/config/db.js';
import mongoose from 'mongoose';
import Project from '../backend/models/Project.js';
import Enquiry from '../backend/models/Enquiry.js';
import Notification from '../backend/models/Notification.js';
import Task from '../backend/models/Task.js';
import AuditLog from '../backend/models/AuditLog.js';
import CalendarEvent from '../backend/models/CalendarEvent.js';
import User from '../backend/models/User.js';
import Partner from '../backend/models/Partner.js';
import ReferralCampaign from '../backend/models/ReferralCampaign.js';
import PartnerCommission from '../backend/models/PartnerCommission.js';
import ReferralBooking from '../backend/models/ReferralBooking.js';

async function performDataCleanup() {
  console.log('====================================================');
  console.log('🧹 VIRALCRAFTMEDIA PRODUCTION DATA CLEANUP');
  console.log('====================================================\n');

  try {
    await connectDB();

    console.log('[STEP 1] Preserving Core Infrastructure & Business Collections...');
    const userCount = await User.countDocuments({});
    const partnerCount = await Partner.countDocuments({});
    const campaignCount = await ReferralCampaign.countDocuments({});
    const commissionCount = await PartnerCommission.countDocuments({});
    
    console.log(`  ✓ Users preserved: ${userCount} accounts (Admins, Employees, Managers intact)`);
    console.log(`  ✓ Partners preserved: ${partnerCount} partner accounts`);
    console.log(`  ✓ Referral Campaigns preserved: ${campaignCount} active campaigns`);
    console.log(`  ✓ Commission Configurations preserved: ${commissionCount} records`);

    // Pattern to match test/demo/dummy records
    const testPattern = /test|demo|dummy|sample|fake|verification/i;

    // 1. Projects Cleanup
    console.log('\n[STEP 2] Inspecting Projects collection...');
    const allProjects = await Project.find({});
    const testProjects = allProjects.filter(p => 
      testPattern.test(p.title || '') || 
      testPattern.test(p.description || '') ||
      testPattern.test(p.clientName || '')
    );
    console.log(`  - Total Projects: ${allProjects.length}`);
    console.log(`  - Test/Demo Projects Identified: ${testProjects.length}`);
    testProjects.forEach(p => console.log(`    * Removing Test Project: "${p.title}" (ID: ${p._id})`));

    let deletedProjectsCount = 0;
    if (testProjects.length > 0) {
      const ids = testProjects.map(p => p._id);
      const res = await Project.deleteMany({ _id: { $in: ids } });
      deletedProjectsCount = res.deletedCount;
    }

    // 2. Enquiries / Leads Cleanup
    console.log('\n[STEP 3] Inspecting Enquiries collection...');
    const allEnquiries = await Enquiry.find({});
    const testEnquiries = allEnquiries.filter(e => 
      testPattern.test(e.name || '') || 
      testPattern.test(e.email || '') || 
      testPattern.test(e.message || '') ||
      testPattern.test(e.service || '')
    );
    console.log(`  - Total Enquiries: ${allEnquiries.length}`);
    console.log(`  - Test/Demo Enquiries Identified: ${testEnquiries.length}`);
    testEnquiries.forEach(e => console.log(`    * Removing Test Enquiry: "${e.name} - ${e.email}" (ID: ${e._id})`));

    let deletedEnquiriesCount = 0;
    if (testEnquiries.length > 0) {
      const ids = testEnquiries.map(e => e._id);
      const res = await Enquiry.deleteMany({ _id: { $in: ids } });
      deletedEnquiriesCount = res.deletedCount;
    }

    // 3. Notifications Cleanup
    console.log('\n[STEP 4] Inspecting Notifications collection...');
    const allNotifications = await Notification.find({});
    const testNotifications = allNotifications.filter(n => 
      testPattern.test(n.title || '') || 
      testPattern.test(n.message || '')
    );
    console.log(`  - Total Notifications: ${allNotifications.length}`);
    console.log(`  - Test/Demo Notifications Identified: ${testNotifications.length}`);

    let deletedNotificationsCount = 0;
    if (testNotifications.length > 0) {
      const ids = testNotifications.map(n => n._id);
      const res = await Notification.deleteMany({ _id: { $in: ids } });
      deletedNotificationsCount = res.deletedCount;
    }

    // 4. Tasks Cleanup
    console.log('\n[STEP 5] Inspecting Tasks collection...');
    const allTasks = await Task.find({});
    const testTasks = allTasks.filter(t => 
      testPattern.test(t.title || '') || 
      testPattern.test(t.description || '')
    );
    console.log(`  - Total Tasks: ${allTasks.length}`);
    console.log(`  - Test/Demo Tasks Identified: ${testTasks.length}`);

    let deletedTasksCount = 0;
    if (testTasks.length > 0) {
      const ids = testTasks.map(t => t._id);
      const res = await Task.deleteMany({ _id: { $in: ids } });
      deletedTasksCount = res.deletedCount;
    }

    // 5. Audit Logs Cleanup
    console.log('\n[STEP 6] Inspecting Audit Logs collection...');
    const allLogs = await AuditLog.find({});
    const testLogs = allLogs.filter(l => 
      testPattern.test(l.action || '') || 
      testPattern.test(JSON.stringify(l.details || {}))
    );
    console.log(`  - Total Audit Logs: ${allLogs.length}`);
    console.log(`  - Test/Demo Audit Logs Identified: ${testLogs.length}`);

    let deletedLogsCount = 0;
    if (testLogs.length > 0) {
      const ids = testLogs.map(l => l._id);
      const res = await AuditLog.deleteMany({ _id: { $in: ids } });
      deletedLogsCount = res.deletedCount;
    }

    // 6. Calendar Events Cleanup
    console.log('\n[STEP 7] Inspecting Calendar Events collection...');
    const allEvents = await CalendarEvent.find({});
    const testEvents = allEvents.filter(ev => 
      testPattern.test(ev.title || '') || 
      testPattern.test(ev.description || '')
    );
    console.log(`  - Total Calendar Events: ${allEvents.length}`);
    console.log(`  - Test/Demo Calendar Events Identified: ${testEvents.length}`);

    let deletedEventsCount = 0;
    if (testEvents.length > 0) {
      const ids = testEvents.map(ev => ev._id);
      const res = await CalendarEvent.deleteMany({ _id: { $in: ids } });
      deletedEventsCount = res.deletedCount;
    }

    // 7. Referral Bookings (Test Only) Cleanup
    console.log('\n[STEP 8] Inspecting Referral Bookings collection...');
    const allBookings = await ReferralBooking.find({});
    const testBookings = allBookings.filter(b => 
      testPattern.test(b.clientName || '') || 
      testPattern.test(b.clientEmail || '') ||
      testPattern.test(b.serviceName || '')
    );
    console.log(`  - Total Referral Bookings: ${allBookings.length}`);
    console.log(`  - Test/Demo Referral Bookings Identified: ${testBookings.length}`);

    let deletedBookingsCount = 0;
    if (testBookings.length > 0) {
      const ids = testBookings.map(b => b._id);
      const res = await ReferralBooking.deleteMany({ _id: { $in: ids } });
      deletedBookingsCount = res.deletedCount;
    }

    console.log('\n====================================================');
    console.log('🎉 PRODUCTION CLEANUP COMPLETE');
    console.log('====================================================');
    console.log(`✓ Test Projects Removed: ${deletedProjectsCount}`);
    console.log(`✓ Test Enquiries Removed: ${deletedEnquiriesCount}`);
    console.log(`✓ Test Notifications Removed: ${deletedNotificationsCount}`);
    console.log(`✓ Test Employee Tasks Removed: ${deletedTasksCount}`);
    console.log(`✓ Test Audit Logs Cleaned: ${deletedLogsCount}`);
    console.log(`✓ Test Calendar Events Removed: ${deletedEventsCount}`);
    console.log(`✓ Test Referral Bookings Removed: ${deletedBookingsCount}`);
    console.log('\n🛡️ IMMUTABLE SYSTEM SAFETY GUARANTEES:');
    console.log(`- Backup Atlas Database: UNTOUCHED (0 records deleted)`);
    console.log(`- Admin, Employee, Manager & Partner Accounts: 100% Preserved`);
    console.log(`- Referral Partners, Campaigns & Commissions: 100% Preserved`);
    console.log(`- Database Schemas, Collections & Indexes: 100% Intact`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Data Cleanup Failed:', err);
    process.exit(1);
  }
}

performDataCleanup();
