import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import { config } from '../config/env.js';

// Initialize Nodemailer transporter
let transporter = null;
if (config.smtpUser && config.smtpPass) {
  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass
    }
  });
}

/**
 * Sends a general HTML email via Nodemailer SMTP fallback or logs in development console
 */
export const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"${config.smtpFrom || 'ViralCraft Media'}" <${config.smtpUser}>`,
        to,
        subject,
        html,
        attachments
      });
      console.log(`[SMTP EMAIL SENT]: Message ID: ${info.messageId}`);
      return info;
    } catch (err) {
      console.error('[SMTP EMAIL ERROR]:', err.message);
      throw err;
    }
  } else {
    console.log(`[EMAIL DEV LOG (Transporter not configured)]:\nTo: ${to}\nSubject: ${subject}\nContent:\n${html}`);
    return { messageId: 'dev-mode-msg-' + Date.now() };
  }
};

/**
 * Sends order placement & payment success email to client
 */
export const sendOrderSuccessEmail = async (clientName, email, orderId, amount, invoicePdfBuffer, invoiceName, user = null, project = null) => {
  let attachments = [];
  if (invoicePdfBuffer) {
    attachments.push({
      filename: `${invoiceName || 'invoice'}.pdf`,
      content: invoicePdfBuffer
    });
  } else {
    try {
      const Order = mongoose.model('Order');
      const order = await Order.findOne({ orderId });
      if (order && order.invoiceUrl && order.invoiceUrl.startsWith('data:application/pdf;base64,')) {
        const base64Data = order.invoiceUrl.split(';base64,').pop();
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        attachments.push({
          filename: `${invoiceName || orderId}.pdf`,
          content: pdfBuffer
        });
      }
    } catch (err) {
      console.error('[emailService] Failed to load invoice attachment from DB:', err.message);
    }
  }

  const htmlConfirm = `
    <div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;">
      <h3 style="color: #FF6A00;">Order Confirmed</h3>
      <p>Hello ${clientName},</p>
      <p>Thank you for your order. We have registered your request.</p>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Amount Paid:</strong> INR ${amount}</p>
      <p>Our team will start working on your project shortly.</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `Order Confirmation — ${orderId}`,
    html: htmlConfirm
  });

  const htmlInvoice = `
    <div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;">
      <h3 style="color: #FF6A00;">Payment Invoice</h3>
      <p>Hello ${clientName},</p>
      <p>Please find attached the official tax invoice for your recent payment.</p>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Amount:</strong> INR ${amount}</p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: `Payment Successful — Invoice ${orderId}`,
    html: htmlInvoice,
    attachments
  });
};

/**
 * Sends delivery notification email to client
 */
export const sendDeliveryEmail = async (clientName, email, orderId, driveLink, user = null, project = null) => {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;">
      <h3 style="color: #FF6A00;">Your Videos Are Ready!</h3>
      <p>Hello ${clientName},</p>
      <p>We are excited to inform you that editing for your order <strong>${orderId}</strong> has been completed successfully.</p>
      <p>You can access and download your final video deliverables from the Google Drive link below:</p>
      <p><a href="${driveLink}" style="display: inline-block; padding: 10px 20px; background: #FF6A00; color: #FFF; text-decoration: none; border-radius: 6px; font-weight: bold;">View Deliverables</a></p>
      <p>If you need any adjustments or revisions, please respond directly inside your client dashboard portal.</p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: `Your Videos Are Ready! — Order ${orderId}`,
    html
  });
};

/**
 * Sends email alert when password reset is requested
 */
export const sendPasswordResetEmail = async (clientName, email, resetLink) => {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;">
      <h3 style="color: #FF6A00;">Password Reset Request</h3>
      <p>Hello ${clientName},</p>
      <p>You requested a password reset for your ViralCraft Media account.</p>
      <p>Please click the button below to configure a new password. This link is valid for 15 minutes.</p>
      <p><a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background: #FF6A00; color: #FFF; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a></p>
      <p>If you did not make this request, you can safely ignore this email.</p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: 'Password Reset Instructions — ViralCraftMedia',
    html
  });
};

/**
 * Sends task assignment notifications to employees
 */
export const sendEmployeeTaskAlertEmail = async (employeeName, email, taskName, deadline) => {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; color: #111827; line-height: 1.6;">
      <h3 style="color: #FF6A00;">New Task Assigned</h3>
      <p>Hello ${employeeName},</p>
      <p>A new video editing task has been assigned to you.</p>
      <p><strong>Task Title:</strong> ${taskName}</p>
      <p><strong>Deadline:</strong> ${new Date(deadline).toLocaleString('en-IN')}</p>
      <p>Please log in to your employee dashboard to review the instructions, download raw clips, and submit your finished edit.</p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: `New Task Assigned — ${taskName}`,
    html
  });
};
