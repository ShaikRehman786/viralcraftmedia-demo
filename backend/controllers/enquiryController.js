import Enquiry from '../models/Enquiry.js';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Order from '../models/Order.js';
import Project from '../models/Project.js';
import { logEvent } from '../services/loggingService.js';
import { generateSequentialOrderId } from '../services/orderService.js';
import { getSuggestedEmployee } from '../services/routingService.js';
import { sendEmail } from '../services/emailService.js';
import { notifyStaff, notifyUser } from '../services/notificationService.js';
import crypto from 'crypto';
import { config } from '../config/env.js';

/**
 * Creates a new Lead / Enquiry from public service pages
 * Route: POST /api/enquiries
 */
export const createEnquiry = async (req, res, next) => {
  try {
    const { name, email, phone, serviceCategory, description, budget } = req.body;
    
    if (!name || !phone || !serviceCategory) {
      return res.status(400).json({ error: 'Name, phone number, and service category are required.' });
    }

    const count = await Enquiry.countDocuments();
    const enquiryId = `VCM-ENQ-${String(count + 1).padStart(4, '0')}`;

    const enquiry = new Enquiry({
      enquiryId,
      name,
      email: email ? email.toLowerCase() : '',
      phone,
      serviceCategory,
      description: description || '',
      budget: budget ? Number(budget) : 0,
      status: 'pending_review',
      timeline: [{ activity: 'Enquiry received via service page form' }]
    });

    await enquiry.save();

    // 1. Send confirmation and admin emails using Resend
    if (email) {
      sendEmail({
        to: email,
        subject: 'We have received your enquiry — ViralCraft Media',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;">
            <h3 style="color: #FF6A00;">Enquiry Received</h3>
            <p>Hello ${name},</p>
            <p>Thank you for reaching out to ViralCraft Media. We have received your project enquiry.</p>
            <p><strong>Enquiry ID:</strong> ${enquiryId}</p>
            <p><strong>Service Category:</strong> ${serviceCategory}</p>
            <p>A member of our creative production team will connect with you via email or WhatsApp within the next 24 hours.</p>
          </div>
        `
      }).catch(console.error);
    }

    sendEmail({
      to: config.adminEmail,
      subject: `[ADMIN ALERT] New Lead Enquiry Received: ${enquiryId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;">
          <h3 style="color: #FF6A00;">New Enquiry Received</h3>
          <p><strong>Enquiry ID:</strong> ${enquiryId}</p>
          <p><strong>Client Name:</strong> ${name}</p>
          <p><strong>Service:</strong> ${serviceCategory}</p>
          <p><strong>Description:</strong> ${description || 'No description provided.'}</p>
        </div>
      `
    }).catch(console.error);

    // 2. Log event
    await logEvent({
      action: 'ORDER_CREATION',
      details: { message: 'New lead enquiry submitted', enquiryId, serviceCategory, customerName: name }
    });

    // 2. Notify Super Admins and Managers
    const ioDispatcher = req.app.get('socketio_dispatch');

    await notifyStaff({
      title: 'New Service Lead',
      message: `${name} enquired about ${serviceCategory}.`,
      type: 'info',
      priority: 'high',
      referenceId: enquiryId,
      referenceModel: 'Enquiry',
      actionUrl: '/admin?tab=enquiries',
      dispatcher: ioDispatcher,
      metadata: { customerName: name, service: serviceCategory, phone }
    });

    if (ioDispatcher) {
      ioDispatcher('all', 'enquiry_submitted', { enquiryId, serviceCategory, name });
    }

    return res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully. We will contact you shortly.',
      enquiryId
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves all leads/enquiries (Admin/Manager Only)
 * Route: GET /api/enquiries
 */
export const getEnquiries = async (req, res, next) => {
  try {
    const { search, status, category } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (category && category !== 'all') {
      filter.serviceCategory = category;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { name: regex },
        { phone: regex },
        { email: regex },
        { enquiryId: regex }
      ];
    }

    const enquiries = await Enquiry.find(filter)
      .populate('assignedManager', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: enquiries });
  } catch (err) {
    next(err);
  }
};

/**
 * Assigns a manager to the lead
 * Route: PUT /api/enquiries/:id/assign
 */
export const assignEnquiryManager = async (req, res, next) => {
  try {
    const { managerId } = req.body;
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry record not found.' });
    }

    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'MANAGER') {
      return res.status(400).json({ error: 'Selected user is not a valid Manager.' });
    }

    enquiry.assignedManager = manager._id;
    enquiry.status = 'assigned';
    enquiry.timeline.push({ activity: `Assigned manager ${manager.name}` });
    await enquiry.save();

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'SYSTEM_SETTING_CHANGE',
      details: { message: `Assigned lead ${enquiry.enquiryId} to manager ${manager.name}` }
    });

    return res.status(200).json({ success: true, message: 'Manager assigned successfully.', data: enquiry });
  } catch (err) {
    next(err);
  }
};

/**
 * Appends review notes to lead timeline
 * Route: POST /api/enquiries/:id/notes
 */
export const addEnquiryNote = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Note text is required.' });
    }

    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry record not found.' });
    }

    enquiry.notes.push({
      text,
      author: req.user.name
    });
    enquiry.timeline.push({ activity: `Note added by ${req.user.name}` });
    await enquiry.save();

    return res.status(200).json({ success: true, data: enquiry });
  } catch (err) {
    next(err);
  }
};

/**
 * Helper to ensure user & client accounts exist for lead details
 */
const ensureClientProfile = async (enquiry) => {
  let client = await Client.findOne({ phone: enquiry.phone });
  if (!client) {
    let user = await User.findOne({ email: enquiry.email ? enquiry.email.toLowerCase() : '' });
    if (!user) {
      const tempPassword = crypto.randomBytes(6).toString('hex');
      user = new User({
        name: enquiry.name,
        email: enquiry.email ? enquiry.email.toLowerCase() : `client_${Date.now()}@viralcraft.media`,
        phone: enquiry.phone,
        password: tempPassword,
        role: 'CLIENT',
        status: 'active',
        mustChangePassword: true
      });
      await user.save();

      if (enquiry.email) {
        const loginUrl = `${process.env.APP_URL || 'http://localhost:5173'}/login`;
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;">
            <h3 style="color: #FF6A00;">Welcome to ViralCraftMedia</h3>
            <p>Hello ${enquiry.name},</p>
            <p>Your client portal account is active so you can track your service project progress!</p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
            <p><strong>CRM Login:</strong></p>
            <p>• URL: <a href="${loginUrl}">${loginUrl}</a></p>
            <p>• Email: ${enquiry.email.toLowerCase()}</p>
            <p>• Temporary Password: <code style="background:#F3F4F6; padding:2px 6px; border-radius:4px;">${tempPassword}</code></p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
          </div>
        `;
        sendEmail({
          to: enquiry.email.toLowerCase(),
          subject: 'Your ViralCraftMedia Account is Ready',
          html: emailHtml
        }).catch(console.error);
      }
    }

    client = new Client({
      userId: user._id,
      name: enquiry.name,
      email: enquiry.email || '',
      phone: enquiry.phone,
      platform: 'Multi-Service'
    });
    await client.save();
  }
  return client;
};

/**
 * Converts lead to active Client status
 * Route: POST /api/enquiries/:id/convert-client
 */
export const convertEnquiryToClient = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry record not found.' });
    }

    const client = await ensureClientProfile(enquiry);

    enquiry.status = 'converted_client';
    enquiry.timeline.push({ activity: `Converted to Client Profile ${client.name}` });
    await enquiry.save();

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'SYSTEM_SETTING_CHANGE',
      details: { message: `Converted lead ${enquiry.enquiryId} to active Client` }
    });

    return res.status(200).json({ success: true, message: 'Converted to client successfully.', data: enquiry });
  } catch (err) {
    next(err);
  }
};

/**
 * Converts lead to full active Project workflow
 * Route: POST /api/enquiries/:id/convert-project
 */
export const convertEnquiryToProject = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry record not found.' });
    }

    // 1. Ensure Client profile exists
    const client = await ensureClientProfile(enquiry);

    // 2. Generate sequential unpaid enquiry order
    const orderId = await generateSequentialOrderId();
    const order = new Order({
      orderId,
      clientName: enquiry.name,
      email: enquiry.email || '',
      phone: enquiry.phone,
      platform: 'Service Inbound Lead',
      videoLink: 'N/A',
      instructions: enquiry.description || 'No notes provided',
      clipCount: 1,
      amount: enquiry.budget || 0,
      paymentStatus: 'enquiry',
      serviceType: enquiry.serviceCategory,
      client: client._id,
      orderDate: new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
    });
    await order.save();

    // 3. Resolve suggested employee skills auto-routing
    const suggestedId = await getSuggestedEmployee(enquiry.serviceCategory);

    // 4. Create active Project
    const project = new Project({
      order: order._id,
      client: client._id,
      name: `Project for ${enquiry.name} (${enquiry.serviceCategory})`,
      description: enquiry.description || 'Inbound service conversion',
      status: 'pending',
      category: enquiry.serviceCategory,
      suggestedEmployee: suggestedId
    });
    await project.save();

    order.project = project._id;
    await order.save();

    client.orders.push(order._id);
    await client.save();

    // 5. Update enquiry status
    enquiry.status = 'converted_project';
    enquiry.timeline.push({ activity: `Converted to Active Project ${project.name}` });
    await enquiry.save();

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'SYSTEM_SETTING_CHANGE',
      details: { message: `Converted lead ${enquiry.enquiryId} to active project ${project.name}` }
    });

    return res.status(200).json({ success: true, message: 'Converted to project successfully.', data: enquiry });
  } catch (err) {
    next(err);
  }
};

/**
 * Deletes or archives the lead record
 * Route: DELETE /api/enquiries/:id
 */
export const deleteEnquiry = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry record not found.' });
    }

    enquiry.status = 'archived';
    enquiry.timeline.push({ activity: 'Enquiry archived' });
    await enquiry.save();

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'SYSTEM_SETTING_CHANGE',
      details: { message: `Archived lead enquiry ${enquiry.enquiryId}` }
    });

    return res.status(200).json({ success: true, message: 'Enquiry archived successfully.' });
  } catch (err) {
    next(err);
  }
};
