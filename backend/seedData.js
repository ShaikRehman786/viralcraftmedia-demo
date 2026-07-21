import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/User.js';
import Client from './models/Client.js';
import Order from './models/Order.js';
import Project from './models/Project.js';
import Task from './models/Task.js';
import CalendarEvent from './models/CalendarEvent.js';

dotenv.config();

const seedSampleData = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB database for seeding...');

    // Clear existing sample collections (preserve Super Admin user)
    const adminUser = await User.findOne({ role: 'SUPER_ADMIN' });
    
    await User.deleteMany({ role: { $ne: 'SUPER_ADMIN' } });
    await Client.deleteMany({});
    await Order.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await CalendarEvent.deleteMany({});

    if (!adminUser) {
      console.error('Super admin user must exist in DB before running this seed data script. Run server.js first.');
      process.exit(1);
    }

    console.log('Cleaned old records. Seeding managers and editors...');

    // 1. Managers
    const manager1 = new User({
      name: 'Siddharth Roy',
      email: 'sid.manager@viralcraft.media',
      password: 'password123',
      role: 'MANAGER',
      status: 'active',
      department: 'Post-Production Management'
    });
    const manager2 = new User({
      name: 'Karan Johar',
      email: 'karan.manager@viralcraft.media',
      password: 'password123',
      role: 'MANAGER',
      status: 'active',
      department: 'Creative Strategy'
    });
    await manager1.save();
    await manager2.save();

    // 2. Employees (Editors/Animators)
    const editor1 = new User({
      name: 'Rohit Sharma',
      email: 'rohit.editor@viralcraft.media',
      password: 'password123',
      role: 'EMPLOYEE',
      status: 'active',
      department: 'Shorts & Reels Editing',
      skills: ['Premiere Pro', 'After Effects', 'Sound Design']
    });
    const editor2 = new User({
      name: 'Deepika Padukone',
      email: 'deepika.editor@viralcraft.media',
      password: 'password123',
      role: 'EMPLOYEE',
      status: 'active',
      department: 'YouTube Video Longform',
      skills: ['DaVinci Resolve', 'Color Grading', 'Photoshop']
    });
    const editor3 = new User({
      name: 'Aman Gupta',
      email: 'aman.editor@viralcraft.media',
      password: 'password123',
      role: 'EMPLOYEE',
      status: 'active',
      department: 'VFX & Motion Graphics',
      skills: ['After Effects', 'Blender', 'Cinema 4D']
    });
    await editor1.save();
    await editor2.save();
    await editor3.save();

    // 3. Clients
    const clientUser1 = new User({
      name: 'Bhushan Kumar (T-Series)',
      email: 'bhushan.tseries@gmail.com',
      password: 'password123',
      role: 'CLIENT',
      status: 'active'
    });
    const clientUser2 = new User({
      name: 'Sony Music India',
      email: 'licensing.sony@gmail.com',
      password: 'password123',
      role: 'CLIENT',
      status: 'active'
    });
    await clientUser1.save();
    await clientUser2.save();

    const clientProfile1 = new Client({
      user: clientUser1._id,
      name: clientUser1.name,
      email: clientUser1.email,
      phone: '919876543210',
      whatsappHistory: [
        { message: 'Welcome to ViralCraft Media! Your onboarding drive folder is ready.', direction: 'outbound' }
      ]
    });
    const clientProfile2 = new Client({
      user: clientUser2._id,
      name: clientUser2.name,
      email: clientUser2.email,
      phone: '919876543211',
      whatsappHistory: [
        { message: 'Welcome to ViralCraft Media! Your onboarding drive folder is ready.', direction: 'outbound' }
      ]
    });
    await clientProfile1.save();
    await clientProfile2.save();

    console.log('Seeding active video orders & campaigns...');

    // 4. Orders
    const order1 = new Order({
      client: clientProfile1._id,
      orderId: 'ORD-2026-001',
      clientName: clientUser1.name,
      email: clientUser1.email,
      phone: '919876543210',
      platform: 'YouTube Shorts',
      videoLink: 'https://youtube.com/shorts/mock-tseries',
      instructions: 'Trim dead silences, add typography, vibrant zoom effects.',
      clipCount: 15,
      amount: 45000,
      paymentStatus: 'success',
      assignedManager: manager1._id,
      assignedEmployees: [editor1._id],
      status: 'processing',
      timeline: [
        { activity: 'Order package purchased.' },
        { activity: 'Assets folder generated automatically.' }
      ]
    });

    const order2 = new Order({
      client: clientProfile2._id,
      orderId: 'ORD-2026-002',
      clientName: clientUser2.name,
      email: clientUser2.email,
      phone: '919876543211',
      platform: 'YouTube Longform',
      videoLink: 'https://youtube.com/watch?v=mock-sony',
      instructions: 'Color grade to look cinematic, add compressor to music licensing vocals.',
      clipCount: 1,
      amount: 120000,
      paymentStatus: 'success',
      assignedManager: manager2._id,
      assignedEmployees: [editor2._id, editor3._id],
      status: 'pending',
      timeline: [
        { activity: 'Order package purchased.' }
      ]
    });
    await order1.save();
    await order2.save();

    // 5. Projects
    const project1 = new Project({
      client: clientProfile1._id,
      name: 'T-Series Reels Campaign',
      status: 'in_progress',
      priority: 'high',
      order: order1._id,
      manager: manager1._id,
      employees: [editor1._id],
      driveShareableLink: 'https://drive.google.com/drive/folders/mock-client-tseries',
      driveFolders: {
        clientFolderId: 'c1',
        projectFolderId: 'p1',
        rawFolderId: 'r1',
        editedFolderId: 'e1',
        assetsFolderId: 'a1',
        finalFolderId: 'f1'
      },
      estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    const project2 = new Project({
      client: clientProfile2._id,
      name: 'Sony Docu-Campaign',
      status: 'pending',
      priority: 'medium',
      order: order2._id,
      manager: manager2._id,
      employees: [editor2._id, editor3._id],
      driveShareableLink: 'https://drive.google.com/drive/folders/mock-client-sony',
      driveFolders: {
        clientFolderId: 'c2',
        projectFolderId: 'p2',
        rawFolderId: 'r2',
        editedFolderId: 'e2',
        assetsFolderId: 'a2',
        finalFolderId: 'f2'
      },
      estimatedCompletion: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    });
    await project1.save();
    await project2.save();

    // Link orders back to projects
    order1.project = project1._id;
    order2.project = project2._id;
    await order1.save();
    await order2.save();

    // 6. Sub-Tasks
    const task1 = new Task({
      taskId: 'VCM-001-T01',
      name: 'Initial Assembly Edit & Sync',
      description: 'Align multi-cam raw footage and match sound profiles.',
      project: project1._id,
      assignedTo: editor1._id,
      assignedManager: manager1._id,
      createdBy: adminUser._id,
      status: 'in_progress',
      priority: 'high',
      estimatedHours: 8,
      actualHours: 2.5,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      timeTracking: [
        { action: 'start', timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000) }
      ],
      comments: [
        { sender: manager1._id, senderName: manager1.name, text: 'Ensure sound synchronization matches timeline.', timestamp: new Date() }
      ]
    });

    const task2 = new Task({
      taskId: 'VCM-002-T01',
      name: 'Color Grading & Sound Profiles',
      description: 'Apply high-end cinematic color lookup tables (LUTs) and voice compressor profiles.',
      project: project2._id,
      assignedTo: editor2._id,
      assignedManager: manager2._id,
      createdBy: adminUser._id,
      status: 'assigned',
      priority: 'medium',
      estimatedHours: 12,
      actualHours: 0,
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      comments: []
    });
    await task1.save();
    await task2.save();

    // 7. Calendar Events
    const calEvent1 = new CalendarEvent({
      title: 'T-Series Assembly Delivery',
      description: 'Send assembly cut for manager review.',
      start: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      end: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      type: 'deadline',
      color: '#EF4444',
      assignedTo: editor1._id
    });

    const calEvent2 = new CalendarEvent({
      title: 'Sony Project Kickoff Sync',
      description: 'Project goals alignment meeting with directors.',
      start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
      type: 'meeting',
      color: '#3B82F6',
      assignedTo: editor2._id
    });
    await calEvent1.save();
    await calEvent2.save();

    console.log('✅ MongoDB database successfully seeded with initial production records.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database seeding failed:', err.message);
    process.exit(1);
  }
};

seedSampleData();
