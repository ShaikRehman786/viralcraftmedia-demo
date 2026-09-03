import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config, getFrontendBaseUrl } from '../config/env.js';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import Project from '../models/Project.js';
import { calculatePricing, ingestVerifiedOrder, generateSequentialOrderId } from '../services/orderService.js';
import { logEvent } from '../services/loggingService.js';
import Enquiry from '../models/Enquiry.js';
import Partner from '../models/Partner.js';
import ReferralCampaign from '../models/ReferralCampaign.js';
import ReferralVisit from '../models/ReferralVisit.js';
import ReferralBooking from '../models/ReferralBooking.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { generateInvoicePdf } from '../utils/pdfGenerator.js';
import { sendEmail } from '../services/emailService.js';
import { getSuggestedEmployee } from '../services/routingService.js';
import { sendEnquiryWhatsAppNotification } from '../services/whatsappService.js';
import { notifyStaff } from '../services/notificationService.js';

const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: config.razorpayKeyId,
    key_secret: config.razorpayKeySecret
  });
};

/**
 * Returns Razorpay public key ID
 * Route: GET /api/config
 */
export const getConfig = async (req, res, next) => {
  try {
    return res.status(200).json({ key: config.razorpayKeyId });
  } catch (err) {
    next(err);
  }
};

/**
 * Creates Razorpay order
 * Route: POST /api/create-order
 */
export const createOrder = async (req, res, next) => {
  try {
    const { amount, clipCount, serviceType, enquiryId } = req.body;
    const numericAmount = parseInt(amount, 10);
    let verifiedAmount;

    verifiedAmount = calculatePricing(clipCount || 1);
    
    // Prevent client tampering. Always validate pricing on backend.
    if (numericAmount !== verifiedAmount) {
      return res.status(400).json({ error: 'Tamper attempt: Price mismatch for clip quantity.' });
    }

    // Link to existing lead if provided (ONE lead per journey)
    let linkedEnquiry = null;
    if (enquiryId) {
      linkedEnquiry = await Enquiry.findOne({ enquiryId: enquiryId.trim() });
      if (!linkedEnquiry) {
        return res.status(400).json({ error: 'Invalid enquiryId - lead not found.' });
      }
      // Update timeline to reflect payment attempt without creating duplicate lead
      linkedEnquiry.timeline.push({ activity: `Payment order creation attempted for ₹${verifiedAmount}` });
      await linkedEnquiry.save().catch(() => {});
    }

    const rzp = getRazorpayInstance();
    const rzpOrder = await rzp.orders.create({
      amount: verifiedAmount * 100, // paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    });

    // Create Payment log in created status - linked to same lead
    const payment = new Payment({
      razorpayOrderId: rzpOrder.id,
      amount: verifiedAmount,
      clientName: req.body.name || 'Anonymous',
      contact: req.body.contact || 'None',
      enquiryId: linkedEnquiry ? linkedEnquiry.enquiryId : (enquiryId || undefined),
      enquiry: linkedEnquiry ? linkedEnquiry._id : undefined,
      logs: [{ message: `Razorpay checkout initialized. Amount: ₹${verifiedAmount}` + (linkedEnquiry ? ` for ${linkedEnquiry.enquiryId}` : '') }]
    });
    await payment.save();

    await logEvent({
      action: 'PAYMENT_ATTEMPT',
      details: { razorpayOrderId: rzpOrder.id, amount: verifiedAmount }
    });

    const ioDispatcher = req.app.get('socketio_dispatch');
    await notifyStaff({
      title: 'Payment Started',
      message: `${req.body.name || 'A customer'} started a payment of ₹${verifiedAmount} for ${req.body.platform || 'video editing'}.`,
      type: 'info',
      priority: 'high',
      referenceId: rzpOrder.id,
      referenceModel: 'Payment',
      dispatcher: ioDispatcher,
      metadata: { amount: verifiedAmount, customerName: req.body.name || 'Anonymous' }
    });

    return res.status(200).json({ orderId: rzpOrder.id });
  } catch (err) {
    next(err);
  }
};

/**
 * Verifies Razorpay payment signature
 * Route: POST /api/verify-payment
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
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
    } = req.body;

    // 1. Signature check
    const hmac = crypto.createHmac('sha256', config.razorpayKeySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      // Log tampering
      await logEvent({
        action: 'ERROR',
        details: { message: 'Invalid payment signature', razorpayOrderId: razorpay_order_id }
      });
      return res.status(400).json({ error: 'Signature verification failed.' });
    }

    // 2. Prevent Duplicate payments
    const existingPayment = await Payment.findOne({ razorpayPaymentId: razorpay_payment_id });
    if (existingPayment) {
      return res.status(200).json({ 
        success: true, 
        orderId: existingPayment.orderId,
        message: 'Order already captured'
      });
    }

    // 3. Update Payment record status
    let payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      payment = new Payment({
        razorpayOrderId: razorpay_order_id,
        amount,
        clientName: name,
        contact
      });
    }

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'captured';
    payment.logs.push({ message: `Payment captured successfully. ID: ${razorpay_payment_id}` });

    // 4. Ingest order to auto-create Projects/Tasks/Clients
    // Pass in Socket.io dispatcher if available, otherwise mock
    const ioDispatcher = req.app.get('socketio_dispatch');
    const projectServiceType = serviceType === 'Clip Editing' ? 'Short Form Editing' : serviceType;
    const { orderId, project, driveShareableLink } = await ingestVerifiedOrder({
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
      serviceType: projectServiceType
    }, ioDispatcher);

    payment.orderId = orderId;
    await payment.save();

    // Update existing lead with payment linkage - ONE lead per journey (no new Enquiry)
    // Find the authoritative Enquiry for this customer journey
    let linkedEnquiry = null;
    const enquiryIdFromBody = req.body.enquiryId ? String(req.body.enquiryId).trim() : '';
    const enquiryIdFromPayment = payment ? payment.enquiryId : '';
    const targetEnquiryId = enquiryIdFromBody || enquiryIdFromPayment || '';
    if (targetEnquiryId) {
      linkedEnquiry = await Enquiry.findOne({ enquiryId: targetEnquiryId });
    }
    if (!linkedEnquiry) {
      // Fallback: latest pending enquiry for this phone within 24h (same journey)
      linkedEnquiry = await Enquiry.findOne({ phone: contact, status: 'pending_review' }).sort({ createdAt: -1 });
      if (!linkedEnquiry) {
        linkedEnquiry = await Enquiry.findOne({ phone: contact }).sort({ createdAt: -1 });
      }
    }
    if (linkedEnquiry) {
      // Link Order and Payment to same Enquiry for data consistency
      const ordToLink = await Order.findOne({ orderId });
      if (ordToLink) {
        ordToLink.enquiry = linkedEnquiry._id;
        ordToLink.enquiryId = linkedEnquiry.enquiryId;
        await ordToLink.save().catch(() => {});
      }
      // Ensure payment also linked
      if (payment) {
        payment.enquiry = linkedEnquiry._id;
        payment.enquiryId = linkedEnquiry.enquiryId;
        await payment.save().catch(() => {});
      }
      // Update Enquiry timeline - single source of truth
      linkedEnquiry.timeline.push({ activity: `Payment PAID - Order ${orderId}, Payment ${razorpay_payment_id}, Amount ₹${amount}` });
      await linkedEnquiry.save().catch(() => {});

      // Handle referral ONLY if valid and Enquiry is currently organic
      // Do NOT create new Enquiry - update existing only when valid referral chain exists
      let referralAttribution = null;
      if (req.cookies && req.cookies.referral_partner_campaign) {
        try {
          referralAttribution = typeof req.cookies.referral_partner_campaign === 'string'
            ? JSON.parse(req.cookies.referral_partner_campaign)
            : req.cookies.referral_partner_campaign;
        } catch {}
      }
      if (!referralAttribution && req.body.referralDetails) {
        referralAttribution = req.body.referralDetails;
      }
      // Only process referral if Enquiry is not already a referral and attribution present
      if (!linkedEnquiry.referral.isReferral && referralAttribution && (referralAttribution.campaignId || referralAttribution.referralCode)) {
        try {
          let campaign = null;
          let partner = null;
          if (referralAttribution.campaignId) {
            campaign = await ReferralCampaign.findById(referralAttribution.campaignId);
          } else if (referralAttribution.referralCode) {
            campaign = await ReferralCampaign.findOne({ referralCode: referralAttribution.referralCode });
          }
          if (campaign) {
            const now = new Date();
            const isCampaignActive = campaign.status === 'ACTIVE';
            const isCampaignNotExpired = campaign.expiryDate && new Date(campaign.expiryDate) > now;
            if (campaign.partner) {
              partner = await Partner.findById(campaign.partner);
            }
            const isPartnerActive = partner && partner.status === 'ACTIVE';
            let visit = false;
            if (campaign && partner && referralAttribution.visitorId) {
              visit = await ReferralVisit.exists({ campaign: campaign._id, partner: partner._id, visitorId: referralAttribution.visitorId });
            }
            const referralValid = Boolean(campaign && isCampaignActive && isCampaignNotExpired && partner && isPartnerActive && visit);
            if (referralValid && campaign && partner) {
              // Update existing Enquiry's referral to valid partner attribution
              linkedEnquiry.referral = {
                isReferral: true,
                partnerId: partner._id,
                campaignId: campaign._id,
                referralCode: campaign.referralCode,
                campaignName: campaign.campaignName,
                partnerAgency: partner.agencyName,
                landingPage: campaign.landingPage || campaign.targetRoute || '/',
                visitorId: referralAttribution.visitorId || '',
                referralSource: 'referral',
                clickedAt: referralAttribution.clickedAt ? new Date(referralAttribution.clickedAt) : new Date(),
                submittedAt: new Date(),
                referralStatus: 'Pending'
              };
              await linkedEnquiry.save().catch(() => {});

              // Create ReferralBooking linked to SAME Enquiry
              await ReferralBooking.create({
                partner: partner._id,
                campaign: campaign._id,
                enquiry: linkedEnquiry._id,
                clientName: name,
                email: email || '',
                phone: contact,
                service: serviceType || 'Clip Editing',
                referralTimestamp: referralAttribution.clickedAt ? new Date(referralAttribution.clickedAt) : new Date(),
                status: 'Pending'
              }).catch(() => {});

              // Update Project referral to match SAME partner/campaign
              if (project) {
                project.referral = {
                  isReferral: true,
                  partnerId: partner._id,
                  campaignId: campaign._id,
                  enquiryId: linkedEnquiry._id,
                  partnerAgency: partner.agencyName,
                  campaignName: campaign.campaignName,
                  referralCode: campaign.referralCode
                };
                project.source = 'Partner Referral';
                await project.save().catch(() => {});
              }

              // Notify partner and admins (linked to same enquiryId)
              try {
                const admins = await User.find({ role: 'SUPER_ADMIN' });
                for (const admin of admins) {
                  const adminNotify = new Notification({
                    user: admin._id,
                    userModel: 'User',
                    title: 'New Referral Booking',
                    message: `New booking for "${serviceType || 'Clip Editing'}" by ${name} attributed to partner campaign "${campaign.campaignName}" (Lead ${linkedEnquiry.enquiryId}).`,
                    type: 'success',
                    priority: 'high',
                    icon: 'Award',
                    actionUrl: '/admin?tab=referrals'
                  });
                  await adminNotify.save().catch(() => {});
                }
                const partnerNotify = new Notification({
                  user: partner._id,
                  userModel: 'Partner',
                  title: 'New Referral Lead Attributed',
                  message: `A new referral lead for "${serviceType || 'Clip Editing'}" by ${name} has been attributed to your campaign "${campaign.campaignName}" (Lead ${linkedEnquiry.enquiryId}).`,
                  type: 'success',
                  priority: 'high',
                  icon: 'Award',
                  actionUrl: '/partner/commissions'
                });
                await partnerNotify.save().catch(() => {});
                const dispatch = req.app.get('socketio_dispatch');
                if (dispatch) dispatch(partner._id.toString(), 'commission-updated', { partnerId: partner._id });
              } catch {}
            }
          }
        } catch (refErr) {
          console.error('[Referral Integration] Failed to execute referral workflow on existing lead:', refErr.message);
        }
      } else if (linkedEnquiry.referral.isReferral && project) {
        // Existing referral Enquiry already has valid attribution - ensure Project matches SAME partner
        project.referral = {
          isReferral: true,
          partnerId: linkedEnquiry.referral.partnerId,
          campaignId: linkedEnquiry.referral.campaignId,
          enquiryId: linkedEnquiry._id,
          partnerAgency: linkedEnquiry.referral.partnerAgency || '',
          campaignName: linkedEnquiry.referral.campaignName || '',
          referralCode: linkedEnquiry.referral.referralCode || ''
        };
        project.source = 'Partner Referral';
        await project.save().catch(() => {});
      }
    }

    const payoutDispatcher = req.app.get('socketio_dispatch');
    await notifyStaff({
      title: 'Payment Received',
      message: `₹${amount} received from ${name} for ${serviceType || 'video editing'}. (Lead ${linkedEnquiry ? linkedEnquiry.enquiryId : 'N/A'})`,
      type: 'success',
      priority: 'high',
      referenceId: linkedEnquiry ? linkedEnquiry.enquiryId : orderId,
      referenceModel: linkedEnquiry ? 'Enquiry' : 'Order',
      actionUrl: '/admin?tab=payments',
      dispatcher: payoutDispatcher,
      metadata: { amount, customerName: name, paymentId: razorpay_payment_id, service: serviceType, enquiryId: linkedEnquiry ? linkedEnquiry.enquiryId : undefined, orderId }
    });

    // 5. Generate Chronological PDF Invoice base64 for client
    const invoiceNum = orderId.replace('VCM-', 'VCM-INV-');
    const formattedInvoiceDate = new Date().toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    let pdfBase64 = '';
    try {
      const pdfResult = await generateInvoicePdf({
        orderId,
        invoiceNumber: invoiceNum,
        paymentId: razorpay_payment_id,
        orderDate: formattedInvoiceDate,
        name,
        contact,
        email: email || '',
        service: 'Premium Video Clipping',
        platform,
        clipCount,
        duration: '30-40s',
        instructions,
        amount,
        razorpayOrderId: razorpay_order_id,
        language: 'English'
      });
      pdfBase64 = pdfResult.base64;

      // Save invoice base64 URL to order
      const ordObj = await Order.findOne({ orderId });
      if (ordObj) {
        ordObj.invoiceUrl = `data:application/pdf;base64,${pdfBase64}`;
        await ordObj.save();
      }
    } catch (pdfErr) {
      console.error('Invoice generation failed in verify controller:', pdfErr.message);
    }

    return res.status(200).json({
      success: true,
      orderId,
      pdfBase64
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves payment history
 * Route: GET /api/payments
 */
/**
 * Handles Razorpay webhook events (payment captured, failed, refunded)
 * Route: POST /api/razorpay-webhook
 */
export const handleRazorpayWebhook = async (req, res, next) => {
  try {
    // 1. Verify webhook signature before any business logic (timing-safe)
    const receivedSignature = req.headers['x-razorpay-signature'];
    if (!receivedSignature) {
      await logEvent({ action: 'WEBHOOK_AUTH_FAILURE', details: { reason: 'Missing signature', ip: req.ip } });
      return res.status(400).json({ error: 'Missing webhook signature' });
    }
    if (!config.razorpayWebhookSecret) {
      console.warn('[WEBHOOK] Razorpay webhook secret not configured - rejecting webhook');
      await logEvent({ action: 'WEBHOOK_CONFIG_ERROR', details: { reason: 'Webhook secret not configured' } });
      return res.status(500).json({ error: 'Webhook not configured' });
    }
    const payload = req.rawBody || JSON.stringify(req.body);
    const expectedSignature = crypto.createHmac('sha256', config.razorpayWebhookSecret).update(payload).digest('hex');
    let isValid = false;
    try {
      const a = Buffer.from(receivedSignature, 'utf8');
      const b = Buffer.from(expectedSignature, 'utf8');
      if (a.length === b.length) {
        isValid = crypto.timingSafeEqual(a, b);
      }
    } catch {
      isValid = false;
    }
    if (!isValid) {
      await logEvent({ action: 'WEBHOOK_AUTH_FAILURE', details: { reason: 'Invalid signature', ip: req.ip } });
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const webhookBody = req.body;
    const event = webhookBody.event;
    const paymentEntity = webhookBody.payload?.payment?.entity;

    if (!event || !paymentEntity) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const razorpayPaymentId = paymentEntity.id;
    const razorpayOrderId = paymentEntity.order_id;

    // Idempotent: check existing payment state to prevent duplicate processing
    const existingPayment = await Payment.findOne({ razorpayPaymentId });
    // If payment already in terminal state matching event, acknowledge without re-processing
    if (existingPayment) {
      if (event === 'payment.captured' && existingPayment.status === 'captured') {
        return res.status(200).json({ status: 'ok', message: 'Already processed' });
      }
      if (event === 'payment.refunded' && existingPayment.status === 'refunded') {
        return res.status(200).json({ status: 'ok', message: 'Already refunded' });
      }
      if (event === 'payment.failed' && existingPayment.status === 'failed') {
        return res.status(200).json({ status: 'ok', message: 'Already marked failed' });
      }
    }

    switch (event) {
      case 'payment.captured':
        // Payment already captured via verify-payment flow - ensure idempotency
        break;

      case 'payment.failed':
        // Mark payment as failed - only if not already in terminal success state
        if (!existingPayment || existingPayment.status !== 'captured') {
          await Payment.findOneAndUpdate(
            { razorpayPaymentId },
            { status: 'failed' }
          );
        }
        await logEvent({
          action: 'PAYMENT_FAILURE',
          details: { razorpayPaymentId, razorpayOrderId, error: paymentEntity.error_description }
        });
        break;

      case 'payment.refunded':
        // Mark payment as refunded - idempotent check prevents double refund
        if (!existingPayment || existingPayment.status !== 'refunded') {
          await Payment.findOneAndUpdate(
            { razorpayPaymentId },
            { status: 'refunded' }
          );

          // Also update the linked order
          const refundedPayment = await Payment.findOne({ razorpayPaymentId });
          if (refundedPayment?.orderId) {
            await Order.findOneAndUpdate(
              { orderId: refundedPayment.orderId },
              { paymentStatus: 'refunded' }
            );
          }
        }

        await logEvent({
          action: 'PAYMENT_REFUND',
          details: { razorpayPaymentId, razorpayOrderId }
        });
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    // Always return 200 to Razorpay to acknowledge receipt (after verification)
    console.error('Webhook handler error:', err.message);
    return res.status(200).json({ status: 'ok' });
  }
};

export const getPayments = async (req, res, next) => {
  try {
    let payments;
    // Only SUPER_ADMIN can see all payments. Managers and Clients see only their own.
    if (req.user.role === 'SUPER_ADMIN') {
      payments = await Payment.find().sort({ createdAt: -1 });
    } else if (req.user.role === 'MANAGER') {
      // Managers can only see payments linked to projects they manage
      const managedProjects = await Project.find({ manager: req.user._id }).select('_id');
      const managedOrderIds = (await Order.find({ project: { $in: managedProjects.map(p => p._id) } }).select('razorpayOrderId')).map(o => o.razorpayOrderId);
      payments = await Payment.find({ razorpayOrderId: { $in: managedOrderIds } }).sort({ createdAt: -1 });
    } else {
      payments = await Payment.find({ contact: req.user.phone }).sort({ createdAt: -1 });
    }
    return res.status(200).json({ success: true, data: payments });
  } catch (err) {
    next(err);
  }
};

export const createEnquiry = async (req, res, next) => {
  try {
    const { name, email, phone, serviceType, projectDescription, budget } = req.body;
    if (!name || !phone || !serviceType) {
      return res.status(400).json({ error: 'Name, phone, and service type are required.' });
    }

    // 1. Find or create CLIENT user account (auto-register if new email provided)
    let user = await User.findOne({ phone });
    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      const tempPassword = crypto.randomBytes(6).toString('hex');
      user = new User({
        name,
        email: email ? email.toLowerCase() : `client_${Date.now()}@viralcraft.media`,
        phone,
        password: tempPassword,
        role: 'CLIENT',
        status: 'active',
        mustChangePassword: true
      });
      await user.save();

      // Send greeting email with temp password (environment-aware)
      if (email) {
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
            <p>Thank you for submitting your creative project enquiry! Your client account is active so you can track status logs.</p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
            <p><strong>CRM Login:</strong></p>
            <p>• URL: <a href="${loginUrl}">${loginUrl}</a></p>
            <p>• Username/Email: ${email.toLowerCase()}</p>
            <p>• Temporary Password: <code style="background:#F3F4F6; padding:2px 6px; border-radius:4px;">${tempPassword}</code></p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
            <p>You can adjust your settings on initial sign-in.</p>
          </div>
        `;
        sendEmail({
          to: email.toLowerCase(),
          subject: 'Your ViralCraftMedia Account is Ready',
          html: emailHtml
        }).catch(console.error);
      }
    }

    // Find or create Client profile
    let client = await Client.findOne({ phone });
    if (!client) {
      client = new Client({
        userId: user._id,
        name,
        email: email || '',
        phone,
        platform: 'Multi-Service'
      });
      await client.save();
    }

    // 2. Generate Chronological Order ID
    const orderId = await generateSequentialOrderId();

    // 3. Save as Enquiry Order
    const order = new Order({
      orderId,
      clientName: name,
      email: email || '',
      phone,
      platform: 'Multi-Service',
      videoLink: 'None (Enquiry Form)',
      instructions: projectDescription || 'No details shared.',
      clipCount: 1,
      amount: budget ? Number(budget) : 0,
      paymentStatus: 'enquiry',
      serviceType,
      budget: budget ? Number(budget) : undefined,
      client: client._id,
      orderDate: new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
    });
    await order.save();

    // 4. Calculate skills routing & suggest candidate
    const suggestedId = await getSuggestedEmployee(serviceType);

    // 5. Auto-create Project
    const project = new Project({
      order: order._id,
      client: client._id,
      name: `Project for ${name} (${serviceType})`,
      description: projectDescription || 'Service Enquiry Details',
      status: 'pending',
      category: serviceType,
      suggestedEmployee: suggestedId
    });
    await project.save();

    // Link back order
    order.project = project._id;
    await order.save();

    // 6. Broadcast real-time update
    const ioDispatcher = req.app.get('socketio_dispatch');
    await notifyStaff({
      title: 'New Service Enquiry',
      message: `Client ${name} submitted an enquiry for ${serviceType}.`,
      type: 'info',
      priority: 'high',
      referenceId: orderId,
      referenceModel: 'Order',
      actionUrl: '/admin?tab=enquiries',
      dispatcher: ioDispatcher,
      metadata: { customerName: name, service: serviceType, phone }
    });

    if (ioDispatcher) {
      ioDispatcher('all', 'enquiry_submitted', { orderId, serviceType, name });
    }

    // 7. Meta WhatsApp alert to Harsha
    sendEnquiryWhatsAppNotification({
      customerName: name,
      phone,
      email,
      selectedService: serviceType,
      projectDescription,
      budget,
      orderId
    }).catch(console.error);

    await logEvent({
      action: 'ORDER_CREATION',
      details: { orderId, serviceType, customerName: name, status: 'enquiry' }
    });

    return res.status(201).json({
      success: true,
      message: 'Enquiry received. Harsha has been notified.',
      orderId
    });
  } catch (err) {
    next(err);
  }
};
