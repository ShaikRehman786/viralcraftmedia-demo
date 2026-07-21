import Order from '../models/Order.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { logEvent } from './loggingService.js';
import { createFolder, generateShareableLink } from './driveService.js';
import { sendOrderConfirmationWhatsApp } from './whatsappService.js';
import { notifyStaff } from './notificationService.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sendOrderSuccessEmail, sendEmail } from './emailService.js';
import { getSuggestedEmployee } from './routingService.js';
import { config } from '../config/env.js';

/**
 * Calculates correct price for given number of clips
 */
export const calculatePricing = (clipCount) => {
  const count = parseInt(clipCount, 10);
  if (isNaN(count) || count <= 0) return 0;

  if (count === 1) return 1099;
  if (count >= 2 && count <= 4) return count * 899;
  if (count === 5) return 3995; // ₹799 per video
  return count * 699; // 6+ clips
};

/**
 * Validates frontend payment request amount
 */
export const validatePrice = (clipCount, clientPrice) => {
  const actualPrice = calculatePricing(clipCount);
  return actualPrice === parseInt(clientPrice, 10);
};

/**
 * Generates sequential VCM order IDs
 * Uses timestamp-based IDs for serverless compatibility
 */
export const generateSequentialOrderId = async () => {
  const dateObj = new Date();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');

  // Try file-based counter for local development
  // Fallback to timestamp-based ID for serverless (Vercel)
  let orderNumber = 1;

  try {
    const counterPath = path.resolve(process.cwd(), 'order-counter.json');
    if (fs.existsSync(counterPath)) {
      const data = fs.readFileSync(counterPath, 'utf8');
      const parsed = JSON.parse(data);
      orderNumber = (parsed.count || 0) + 1;
      fs.writeFileSync(counterPath, JSON.stringify({ count: orderNumber }), 'utf8');
    } else {
      // Use timestamp-based for high concurrency safety
      return `VCM-${year}${month}${day}-${hours}${minutes}${seconds}`;
    }
  } catch (e) {
    // Fail-safe: use timestamp-based
    return `VCM-${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  return `VCM-${String(orderNumber).padStart(4, '0')}`;
};

/**
 * Handles payment success by creating Client, Order, Project, and Tasks
 */
export const ingestVerifiedOrder = async (orderDetails, socketDispatcher = null) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    name,
    contact,
    email,
    videoLink,
    instructions,
    clipCount,
    amount,
    platform,
    serviceType
  } = orderDetails;

  // 1. Generate Order ID
  const orderId = await generateSequentialOrderId();
  const orderDate = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  // 2. Create Order in Database
  const order = new Order({
    orderId,
    clientName: name,
    email: email || '',
    phone: contact,
    platform,
    videoLink,
    instructions,
    clipCount,
    amount,
    paymentStatus: 'success',
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    orderDate,
    serviceType: serviceType || 'Short Form Editing'
  });
  await order.save();

  // 3. Find or Create Client profile
  let client = await Client.findOne({ phone: contact });
  if (!client) {
    // Check if client email already exists as a User, or link it
    let userId = null;
    if (email) {
      let existingUser = await User.findOne({ email: email.toLowerCase() });
      if (!existingUser) {
        // Automatically create a CLIENT user account for the customer!
        const tempPassword = crypto.randomBytes(6).toString('hex');
        existingUser = new User({
          name,
          email: email.toLowerCase(),
          phone: contact,
          password: tempPassword,
          role: 'CLIENT',
          status: 'active',
          mustChangePassword: true
        });
        await existingUser.save();
        
        // Send email with credentials
        const loginUrl = `${process.env.APP_URL || 'http://localhost:5173'}/login`;
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;">
            <h3 style="color: #FF6A00;">Welcome to ViralCraftMedia</h3>
            <p>Hello ${name},</p>
            <p>Thank you for your order! Your customer account has been created so you can track progress and access deliverables.</p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
            <p><strong>Login Details:</strong></p>
            <p>• Link: <a href="${loginUrl}">${loginUrl}</a></p>
            <p>• Email: ${email.toLowerCase()}</p>
            <p>• Temporary Password: <code style="background:#F3F4F6; padding:2px 6px; border-radius:4px;">${tempPassword}</code></p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
            <p>You can change this password at any time in your dashboard settings.</p>
          </div>
        `;
        
        sendEmail({
          to: email.toLowerCase(),
          subject: 'Your ViralCraftMedia Account is Ready',
          html: emailHtml
        }).catch(console.error);
      }
      
      if (existingUser.role === 'CLIENT') {
        userId = existingUser._id;
      }
    }

    client = new Client({
      userId,
      name,
      email: email || '',
      phone: contact,
      platform
    });
    await client.save();
  }

  // 4. Create Drive Project Folders asynchronously (or virtually)
  const clientFolderName = `Client - ${name}`;
  const clientFolderId = await createFolder(clientFolderName);

  const projectFolderName = `Project - ${orderId}`;
  const projectFolderId = await createFolder(projectFolderName, clientFolderId);

  // Generate CRM subfolders
  const rawFolderId = await createFolder('Raw Videos', projectFolderId);
  const editedFolderId = await createFolder('Edited Videos', projectFolderId);
  const assetsFolderId = await createFolder('Assets', projectFolderId);
  const finalFolderId = await createFolder('Final Delivery', projectFolderId);
  
  const driveShareableLink = await generateShareableLink(finalFolderId); // final delivery link is the shareable link!

  // 5. Create Project record
  const suggestedId = await getSuggestedEmployee(serviceType || 'Short Form Editing');

  const project = new Project({
    order: order._id,
    client: client._id,
    name: `Project for ${name} (${orderId})`,
    description: `Raw Link: ${videoLink}\n\nInstructions: ${instructions}`,
    status: 'pending',
    driveFolderId: projectFolderId,
    driveShareableLink,
    driveFolders: {
      clientFolderId,
      projectFolderId,
      rawFolderId,
      editedFolderId,
      assetsFolderId,
      finalFolderId
    },
    category: serviceType || 'Short Form Editing',
    suggestedEmployee: suggestedId,
    priority: clipCount >= 5 ? 'high' : 'medium',
    estimatedCompletion: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 Hours TAT
  });
  await project.save();

  // Link client and project inside Order
  order.client = client._id;
  order.project = project._id;
  order.driveFolderId = projectFolderId;
  order.deliveryLink = driveShareableLink;
  await order.save();

  // Add order to Client tracking logs
  client.orders.push(order._id);
  client.payments.push({
    paymentId: razorpay_payment_id || `pay_mock_${Date.now()}`,
    amount,
    status: 'success',
    date: new Date()
  });
  client.driveLinks.push({
    name: `Project Delivery - ${orderId}`,
    link: driveShareableLink,
    date: new Date()
  });
  await client.save();

  // 6. Auto-generate Tasks (1 task per video clip)
  const taskCount = parseInt(clipCount, 10);
  const tasksCreated = [];
  for (let i = 1; i <= taskCount; i++) {
    const task = new Task({
      project: project._id,
      name: `Edit Clip ${String(i).padStart(2, '0')} - ${orderId}`,
      description: `Edit video clip #${i} based on timestamps / reference notes. Link: ${videoLink}`,
      priority: project.priority,
      status: 'pending',
      taskId: `${orderId}-T${String(i).padStart(2, '0')}`,
      deadline: new Date(Date.now() + 36 * 60 * 60 * 1000) // 36 hours deadline for editor review
    });
    await task.save();
    tasksCreated.push(task._id);
  }

  // Bind tasks references to project
  // In our model we reference project in Task, but we can also log this
  console.log(`Auto-generated ${taskCount} tasks for Project ${project.name}`);

  // 7. Create internal alerts for all Admin & Manager users
  await notifyStaff({
    title: 'New Order Received',
    message: `Project ${orderId} has been auto-created. Please assign editors.`,
    type: 'info',
    priority: 'high',
    referenceId: orderId,
    referenceModel: 'Order',
    actionUrl: '/admin?tab=projects',
    dispatcher: socketDispatcher,
    metadata: { orderId, customerName: name, amount }
  });

  // 8. Trigger Email & WhatsApp automation in background
  sendOrderConfirmationWhatsApp(name, contact, orderId, clipCount, amount).catch(console.error);
  
  if (email) {
    sendOrderSuccessEmail(name, email, orderId, amount, null, orderId.replace('VCM-', 'VCM-INV-'), client.userId, project._id).catch(console.error);
    
    sendEmail({
      to: email,
      subject: `Project Started — Order ${orderId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;">
          <h3 style="color: #FF6A00;">Project Started</h3>
          <p>Hello ${name},</p>
          <p>We are glad to inform you that work on your project <strong>${project.name}</strong> has started.</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p>You can track the progress inside your client dashboard:</p>
          <p><a href="${config.appUrl || 'http://localhost:5173'}/login" style="display: inline-block; padding: 10px 20px; background: #FF6A00; color: #FFF; text-decoration: none; border-radius: 6px; font-weight: bold;">Log In to Portal</a></p>
        </div>
      `
    }).catch(console.error);
  }

  // Notify admin of new order & payment
  sendEmail({
    to: config.adminEmail,
    subject: `[ADMIN ALERT] New Client Order Placed: ${orderId}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;">
        <h3 style="color: #FF6A00;">New Order Placed</h3>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Client:</strong> ${name}</p>
        <p><strong>Platform:</strong> ${platform}</p>
        <p><strong>Service Type:</strong> ${serviceType || 'Premium Video Clipping'}</p>
      </div>
    `
  }).catch(console.error);

  sendEmail({
    to: config.adminEmail,
    subject: `[ADMIN ALERT] Payment Logged Successfully: ${orderId}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;">
        <h3 style="color: #FF6A00;">Payment Logged</h3>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Client:</strong> ${name}</p>
        <p><strong>Payment ID:</strong> ${razorpay_payment_id || 'N/A'}</p>
        <p><strong>Amount:</strong> INR ${amount}</p>
      </div>
    `
  }).catch(console.error);

  // 9. Write Audit Log
  await logEvent({
    userId: client.userId || null,
    userName: name,
    action: 'PAYMENT_SUCCESS',
    details: { orderId, amount, clipCount, platform }
  });

  return { orderId, project, driveShareableLink };
};
