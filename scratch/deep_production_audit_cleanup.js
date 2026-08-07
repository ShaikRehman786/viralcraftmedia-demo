import connectDB from '../backend/config/db.js';
import mongoose from 'mongoose';
import Project from '../backend/models/Project.js';
import Enquiry from '../backend/models/Enquiry.js';
import Notification from '../backend/models/Notification.js';
import Task from '../backend/models/Task.js';
import AuditLog from '../backend/models/AuditLog.js';
import CalendarEvent from '../backend/models/CalendarEvent.js';
import Client from '../backend/models/Client.js';
import Order from '../backend/models/Order.js';

async function deepInspectAndClean() {
  console.log('====================================================');
  console.log('🔍 DEEP PRODUCTION DATABASE INSPECTION & CLEANUP');
  console.log('====================================================\n');

  try {
    await connectDB();

    // 1. Projects
    console.log('--- 1. PROJECTS COLLECTION ---');
    const projects = await Project.find({});
    console.log(`Total Projects: ${projects.length}`);
    projects.forEach((p, idx) => {
      console.log(`[${idx + 1}] ID: ${p._id} | Title: "${p.title}" | Client: "${p.clientName || p.client}" | Desc: "${(p.description || '').substring(0, 40)}"`);
    });

    // 2. Enquiries
    console.log('\n--- 2. ENQUIRIES COLLECTION ---');
    const enquiries = await Enquiry.find({});
    console.log(`Total Enquiries: ${enquiries.length}`);
    enquiries.forEach((e, idx) => {
      console.log(`[${idx + 1}] ID: ${e._id} | Name: "${e.name}" | Email: "${e.email}" | Service: "${e.service}" | Msg: "${(e.message || '').substring(0, 40)}"`);
    });

    // 3. Notifications
    console.log('\n--- 3. NOTIFICATIONS COLLECTION ---');
    const notifications = await Notification.find({});
    console.log(`Total Notifications: ${notifications.length}`);
    notifications.slice(0, 30).forEach((n, idx) => {
      console.log(`[${idx + 1}] ID: ${n._id} | Title: "${n.title}" | Msg: "${(n.message || '').substring(0, 40)}"`);
    });
    if (notifications.length > 30) {
      console.log(`... and ${notifications.length - 30} more notifications.`);
    }

    // 4. Tasks
    console.log('\n--- 4. TASKS COLLECTION ---');
    const tasks = await Task.find({});
    console.log(`Total Tasks: ${tasks.length}`);
    tasks.slice(0, 30).forEach((t, idx) => {
      console.log(`[${idx + 1}] ID: ${t._id} | Title: "${t.title}" | Status: "${t.status}" | Desc: "${(t.description || '').substring(0, 40)}"`);
    });

    // 5. Clients
    console.log('\n--- 5. CLIENTS COLLECTION ---');
    const clients = await Client.find({});
    console.log(`Total Clients: ${clients.length}`);
    clients.forEach((c, idx) => {
      console.log(`[${idx + 1}] ID: ${c._id} | Name: "${c.name}" | Email: "${c.email}" | Company: "${c.company}"`);
    });

    // 6. Orders
    console.log('\n--- 6. ORDERS COLLECTION ---');
    const orders = await Order.find({});
    console.log(`Total Orders: ${orders.length}`);
    orders.forEach((o, idx) => {
      console.log(`[${idx + 1}] ID: ${o._id} | Service: "${o.serviceName}" | Amount: ${o.amount} | Status: "${o.status}"`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Inspection failed:', err);
    process.exit(1);
  }
}

deepInspectAndClean();
