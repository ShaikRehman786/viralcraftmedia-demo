import Order from '../models/Order.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { logEvent } from './loggingService.js';
import { createFolder, generateShareableLink } from './driveService.js';
import { sendOrderConfirmationWhatsApp } from './whatsappService.js';
import { notifyStaff } from './notificationService.js';
import crypto from 'crypto';
import { sendOrderSuccessEmail, sendEmail } from './emailService.js';
import { getSuggestedEmployee } from './routingService.js';
import { config, getFrontendBaseUrl } from '../config/env.js';

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
  // High-performance non-blocking ID: timestamp + random entropy (no sync FS on event loop)
  // Preserves chronology, avoids fs.existsSync/readFileSync/writeFileSync blocking
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  const rnd = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `VCM-${y}${m}${day}-${h}${min}${s}${ms}-${rnd}`;
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
        
        // Send email with credentials (environment-aware frontend URL)
        let loginUrl;
        try {
          loginUrl = `${getFrontendBaseUrl()}/login`;
        } catch {
          loginUrl = 'https://viralcraftmedia.com/login';
        }
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

  // 4. Drive folders — deferred to background (never block payment verification)
  // Placeholder links ensure immediate response; real Drive API runs after customer sees success
  const placeholderDriveLink = `https://drive.google.com/drive/folders/pending-${orderId}`;
  const placeholderFolderId = `pending_${orderId}`;

  // 5. Create Project record (with placeholders, updated in background when Drive completes)
  const suggestedId = await getSuggestedEmployee(serviceType || 'Short Form Editing');

  const project = new Project({
    order: order._id,
    client: client._id,
    name: `Project for ${name} (${orderId})`,
    description: `Raw Link: ${videoLink}\n\nInstructions: ${instructions}`,
    status: 'pending',
    driveFolderId: placeholderFolderId,
    driveShareableLink: placeholderDriveLink,
    driveFolders: {
      clientFolderId: placeholderFolderId,
      projectFolderId: placeholderFolderId,
      rawFolderId: placeholderFolderId,
      editedFolderId: placeholderFolderId,
      assetsFolderId: placeholderFolderId,
      finalFolderId: placeholderFolderId
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
  order.driveFolderId = placeholderFolderId;
  order.deliveryLink = placeholderDriveLink;
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
    link: placeholderDriveLink,
    date: new Date()
  });
  await client.save();

  // 6. Auto-generate Tasks — bulk insert (single DB round-trip instead of N sequential saves)
  const taskCount = Math.max(1, Math.min(100, parseInt(clipCount, 10) || 1));
  const deadline = new Date(Date.now() + 36 * 60 * 60 * 1000);
  const tasksToInsert = [];
  for (let i = 1; i <= taskCount; i++) {
    tasksToInsert.push({
      project: project._id,
      name: `Edit Clip ${String(i).padStart(2, '0')} - ${orderId}`,
      description: `Edit video clip #${i} based on timestamps / reference notes. Link: ${videoLink}`,
      priority: project.priority,
      status: 'pending',
      taskId: `${orderId}-T${String(i).padStart(2, '0')}`,
      deadline
    });
  }
  let tasksCreated = [];
  try {
    const inserted = await Task.insertMany(tasksToInsert, { ordered: false });
    tasksCreated = inserted.map(t => t._id);
  } catch (e) {
    // Fallback sequential if bulk fails (duplicate key etc.)
    for (const doc of tasksToInsert) {
      try { const t = await new Task(doc).save(); tasksCreated.push(t._id); } catch {}
    }
  }
  console.log(`Auto-generated ${taskCount} tasks for Project ${project.name}`);

  const driveShareableLink = placeholderDriveLink;

  // Background: Google Drive folder creation (6 network calls) — never block customer
  setImmediate(async () => {
    try {
      const clientFolderName = `Client - ${name}`;
      const clientFolderId = await createFolder(clientFolderName);
      const projectFolderName = `Project - ${orderId}`;
      const projectFolderId = await createFolder(projectFolderName, clientFolderId);
      const rawFolderId = await createFolder('Raw Videos', projectFolderId);
      const editedFolderId = await createFolder('Edited Videos', projectFolderId);
      const assetsFolderId = await createFolder('Assets', projectFolderId);
      const finalFolderId = await createFolder('Final Delivery', projectFolderId);
      const realLink = await generateShareableLink(finalFolderId);
      // Update Project/Order/Client with real Drive links
      try {
        const proj = await Project.findById(project._id);
        if (proj) {
          proj.driveFolderId = projectFolderId;
          proj.driveShareableLink = realLink;
          proj.driveFolders = { clientFolderId, projectFolderId, rawFolderId, editedFolderId, assetsFolderId, finalFolderId };
          await proj.save().catch(() => {});
        }
        const ord = await Order.findById(order._id);
        if (ord) {
          ord.driveFolderId = projectFolderId;
          ord.deliveryLink = realLink;
          await ord.save().catch(() => {});
        }
        const cli = await Client.findById(client._id);
        if (cli) {
          const dl = cli.driveLinks.find(d => d.name === `Project Delivery - ${orderId}`);
          if (dl) dl.link = realLink;
          await cli.save().catch(() => {});
        }
      } catch {}
    } catch (e) {
      console.error('[Drive bg] Folder creation failed:', e.message);
    }
  });

  // 7. Create internal alerts — background (never block payment response)
  setImmediate(() => {
    notifyStaff({
      title: 'New Order Received',
      message: `Project ${orderId} has been auto-created. Please assign editors.`,
      type: 'info',
      priority: 'high',
      referenceId: orderId,
      referenceModel: 'Order',
      actionUrl: '/admin?tab=projects',
      dispatcher: socketDispatcher,
      metadata: { orderId, customerName: name, amount }
    }).catch(() => {});
  });

  // 8. Trigger Email & WhatsApp automation in background (already fire-and-forget)
  setImmediate(() => {
    sendOrderConfirmationWhatsApp(name, contact, orderId, clipCount, amount).catch(() => {});
    if (email) {
      sendOrderSuccessEmail(name, email, orderId, amount, null, orderId.replace('VCM-', 'VCM-INV-'), client.userId, project._id).catch(() => {});
      sendEmail({
        to: email,
        subject: `Project Started — Order ${orderId}`,
        html: `<div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;"><h3 style="color: #FF6A00;">Project Started</h3><p>Hello ${name},</p><p>We are glad to inform you that work on your project <strong>${project.name}</strong> has started.</p><p><strong>Order ID:</strong> ${orderId}</p><p>You can track the progress inside your client dashboard:</p><p><a href="${(() => { try { return getFrontendBaseUrl(); } catch { return 'https://viralcraftmedia.com'; } })()}/login" style="display: inline-block; padding: 10px 20px; background: #FF6A00; color: #FFF; text-decoration: none; border-radius: 6px; font-weight: bold;">Log In to Portal</a></p></div>`
      }).catch(() => {});
    }
    sendEmail({
      to: config.adminEmail,
      subject: `[ADMIN ALERT] New Client Order Placed: ${orderId}`,
      html: `<div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;"><h3 style="color: #FF6A00;">New Order Placed</h3><p><strong>Order ID:</strong> ${orderId}</p><p><strong>Client:</strong> ${name}</p><p><strong>Platform:</strong> ${platform}</p><p><strong>Service Type:</strong> ${serviceType || 'Premium Video Clipping'}</p></div>`
    }).catch(() => {});
    sendEmail({
      to: config.adminEmail,
      subject: `[ADMIN ALERT] Payment Logged Successfully: ${orderId}`,
      html: `<div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;"><h3 style="color: #FF6A00;">Payment Logged</h3><p><strong>Order ID:</strong> ${orderId}</p><p><strong>Client:</strong> ${name}</p><p><strong>Payment ID:</strong> ${razorpay_payment_id || 'N/A'}</p><p><strong>Amount:</strong> INR ${amount}</p></div>`
    }).catch(() => {});
    logEvent({
      userId: client.userId || null,
      userName: name,
      action: 'PAYMENT_SUCCESS',
      details: { orderId, amount, clipCount, platform }
    }).catch(() => {});
  });

  return { orderId, project, driveShareableLink };
};
