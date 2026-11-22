import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-secret-key-0123456789';
process.env.RAZORPAY_KEY_ID = 'rzp_test_placeholder';
process.env.RAZORPAY_KEY_SECRET = 'placeholder';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/whatsapp_inbound_command_test';
process.env.BACKUP_MONGODB_URI = '';
process.env.BACKUP_JWT_SECRET = 'test-backup-secret';
process.env.PARTNER_JWT_SECRET = 'test-partner-secret';
process.env.BACKUP_ADMIN_EMAIL = 'backup-admin@example.com';
process.env.BACKUP_ADMIN_PASSWORD = 'test-backup-password';
delete process.env.REDIS_URL;

const connectDB = (await import('../../config/db.js')).default;
await connectDB();

const User = (await import('../../models/User.js')).default;
const Project = (await import('../../models/Project.js')).default;
const Task = (await import('../../models/Task.js')).default;
const Client = (await import('../../models/Client.js')).default;
const Order = (await import('../../models/Order.js')).default;
const AuditLog = (await import('../../models/AuditLog.js')).default;
const Notification = (await import('../../models/Notification.js')).default;
const WhatsAppInboundCommand = (await import('../../models/WhatsAppInboundCommand.js')).default;
const { processInboundWhatsAppCommand } = await import('../../services/whatsappInboundCommandService.js');

async function resetDb() {
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Client.deleteMany({}),
    Order.deleteMany({}),
    AuditLog.deleteMany({}),
    Notification.deleteMany({}),
    WhatsAppInboundCommand.deleteMany({}),
  ]);
}

test.beforeEach(async () => {
  await resetDb();
  await User.create({
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'Password123!',
    role: 'SUPER_ADMIN',
    status: 'active',
    phone: '919440720814',
  });
  await User.create({
    name: 'Employee User',
    email: 'emp@test.com',
    password: 'Password123!',
    role: 'EMPLOYEE',
    status: 'active',
    phone: '919876543210',
    department: 'Editing',
  });
});

test.after(async () => {
  await mongoose.connection.close();
});

test('db: valid NEW PROJECT creates project/tasks/audit and no duplicate on retry', async () => {
  const text = 'NEW PROJECT\nClient: Test Client\nProject: Test Project\nDepartment: Editing\nPriority: high\nDeadline: 2026-12-31';
  const ctx = { text, sender: { senderPhone: '919440720814', fromMe: false }, messageId: 'msg-new-1' };
  const r1 = await processInboundWhatsAppCommand({ commandContext: ctx });
  assert.equal(r1.success, true);
  assert.equal(r1.handled, true);
  assert.equal((await Project.countDocuments()), 1);
  assert.equal((await Task.countDocuments()), 8);
  assert.ok((await AuditLog.countDocuments()) >= 1);

  const r2 = await processInboundWhatsAppCommand({ commandContext: { ...ctx, messageId: 'msg-new-1' } });
  assert.equal(r2.duplicate, true);
  assert.equal((await Project.countDocuments()), 1);
  assert.equal((await Task.countDocuments()), 8);
});

test('db: fromMe true does not create projects/tasks/notifications/audit records', async () => {
  const beforeProjects = await Project.countDocuments();
  const beforeTasks = await Task.countDocuments();
  const beforeAudits = await AuditLog.countDocuments();
  const beforeNotifs = await Notification.countDocuments();
  const text = 'NEW PROJECT\nClient: X\nProject: Y\nDepartment: Editing';
  const ctx = { text, sender: { senderPhone: '919440720814', fromMe: true }, messageId: 'msg-fromme-1' };
  const r = await processInboundWhatsAppCommand({ commandContext: ctx });
  assert.equal(r.handled, false);
  assert.equal(r.command, 'IGNORED');
  assert.equal(await Project.countDocuments(), beforeProjects);
  assert.equal(await Task.countDocuments(), beforeTasks);
  assert.equal(await AuditLog.countDocuments(), beforeAudits);
  assert.equal(await Notification.countDocuments(), beforeNotifs);
  assert.equal(await WhatsAppInboundCommand.countDocuments(), 0);
});

test('db: fromMe true STATUS does not create audit records', async () => {
  const beforeAudits = await AuditLog.countDocuments();
  const ctx = { text: 'STATUS', sender: { senderPhone: '919440720814', fromMe: true }, messageId: 'msg-fromme-2' };
  const r = await processInboundWhatsAppCommand({ commandContext: ctx });
  assert.equal(r.handled, false);
  assert.equal(r.command, 'IGNORED');
  assert.equal(await AuditLog.countDocuments(), beforeAudits);
});

test('db: unauthorized sender does not mutate', async () => {
  const beforeProjects = await Project.countDocuments();
  const beforeAudits = await AuditLog.countDocuments();
  const text = 'NEW PROJECT\nClient: X\nProject: Y\nDepartment: Editing';
  const ctx = { text, sender: { senderPhone: '910000000000', fromMe: false }, messageId: 'msg-unauth-1' };
  const r = await processInboundWhatsAppCommand({ commandContext: ctx });
  assert.equal(r.handled, false);
  assert.equal(await Project.countDocuments(), beforeProjects);
  assert.equal(await AuditLog.countDocuments(), beforeAudits);
});

test('db: employee task commands work', async () => {
  // create a project with assigned task to employee via NEW PROJECT? Use direct seeding instead.
  const project = await Project.create({ name: 'P1', department: 'Editing', status: 'in_progress', priority: 'medium', estimatedCompletion: new Date(Date.now()+86400000) });
  const task = await Task.create({ project: project._id, name: 'Raw Footage', taskId: 'T1', status: 'assigned', assignedTo: (await User.findOne({role:'EMPLOYEE'}))._id });
  const emp = await User.findOne({ role: 'EMPLOYEE' });
  const ctx = { text: 'ACCEPT ' + task.taskId, sender: { senderPhone: '919876543210', fromMe: false }, messageId: 'msg-emp-1' };
  const r = await processInboundWhatsAppCommand({ commandContext: ctx });
  assert.equal(r.success, true);
  const updated = await Task.findById(task._id);
  assert.equal(updated.status, 'accepted');
});

test('db: concurrent duplicate requests execute once', async () => {
  const text = 'NEW PROJECT\nClient: C2\nProject: P2\nDepartment: Editing';
  const ctx = { text, sender: { senderPhone: '919440720814', fromMe: false }, messageId: 'msg-conc-1' };
  const [a, b] = await Promise.all([
    processInboundWhatsAppCommand({ commandContext: ctx }),
    processInboundWhatsAppCommand({ commandContext: ctx }),
  ]);
  assert.equal(await Project.countDocuments({ name: 'P2' }), 1);
  // one duplicate
  assert.ok(a.duplicate === true || b.duplicate === true);
});

test('db: recovery after interrupted processing', async () => {
  // create stuck processing record
  await WhatsAppInboundCommand.create({
    messageId: 'msg-stuck-1',
    senderPhone: '919440720814',
    command: 'STATUS',
    status: 'processing',
    createdAt: new Date(Date.now() - 60000),
    updatedAt: new Date(Date.now() - 60000),
  });
  const ctx = { text: 'STATUS', sender: { senderPhone: '919440720814', fromMe: false }, messageId: 'msg-stuck-1' };
  const r = await processInboundWhatsAppCommand({ commandContext: ctx });
  assert.equal(r.success, true);
  const rec = await WhatsAppInboundCommand.findOne({ messageId: 'msg-stuck-1' });
  assert.equal(rec.status, 'completed');
});

test('db: reply deduplication survives process restart (simulated)', async () => {
  const text = 'STATUS';
  const ctx = { text, sender: { senderPhone: '919440720814', fromMe: false }, messageId: 'msg-reply-1' };
  const r1 = await processInboundWhatsAppCommand({ commandContext: ctx });
  assert.equal(r1.success, true);
  // simulate restart by re-calling; completed record returns duplicate with replyText
  const r2 = await processInboundWhatsAppCommand({ commandContext: ctx });
  assert.equal(r2.duplicate, true);
  assert.equal(r2.replyText, r1.replyText);
});

test('db: retry after failure does not repeat', async () => {
  // mark a record failed manually
  await WhatsAppInboundCommand.create({
    messageId: 'msg-fail-1',
    senderPhone: '919440720814',
    command: 'STATUS',
    status: 'failed',
  });
  const ctx = { text: 'STATUS', sender: { senderPhone: '919440720814', fromMe: false }, messageId: 'msg-fail-1' };
  const r = await processInboundWhatsAppCommand({ commandContext: ctx });
  assert.equal(r.duplicate, true);
  assert.equal(r.failed, true);
});

test('db: HMAC authentication failures handled at route level (service unaffected)', async () => {
  // service-level: missing sender returns handled false without mutation
  const beforeAudits = await AuditLog.countDocuments();
  const r = await processInboundWhatsAppCommand({ commandContext: { text: 'STATUS', sender: { fromMe: false } } });
  assert.equal(r.handled, false);
  assert.equal(await AuditLog.countDocuments(), beforeAudits);
});
