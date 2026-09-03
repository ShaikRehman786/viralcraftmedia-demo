import Enquiry from '../models/Enquiry.js';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Order from '../models/Order.js';
import Project from '../models/Project.js';
import Partner from '../models/Partner.js';
import ReferralCampaign from '../models/ReferralCampaign.js';
import ReferralBooking from '../models/ReferralBooking.js';
import ReferralVisit from '../models/ReferralVisit.js';
import Notification from '../models/Notification.js';
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

    // Idempotency: prevent duplicate lead for same active customer journey (double-click, refresh, retry)
    // If same phone + serviceCategory submitted within last 5 minutes and still pending, reuse existing lead
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingRecent = await Enquiry.findOne({
      phone,
      serviceCategory,
      status: 'pending_review',
      createdAt: { $gte: fiveMinutesAgo }
    }).sort({ createdAt: -1 });
    if (existingRecent) {
      // Reuse existing lead - do NOT create duplicate
      return res.status(200).json({
        success: true,
        message: 'Enquiry already submitted - reusing existing lead.',
        enquiryId: existingRecent.enquiryId,
        reused: true
      });
    }

    const count = await Enquiry.countDocuments();
    const enquiryId = `VCM-ENQ-${String(count + 1).padStart(4, '0')}`;



    // 1. Read referral attribution from cookie or body
    let referralAttribution = null;
    let cookieFound = false;

    if (req.cookies && req.cookies.referral_partner_campaign) {
      cookieFound = true;
      try {
        referralAttribution = typeof req.cookies.referral_partner_campaign === 'string'
          ? JSON.parse(req.cookies.referral_partner_campaign)
          : req.cookies.referral_partner_campaign;
      } catch (err) {
        console.error('[Enquiry Attribution] Cookie parsing failed:', err.message);
      }
    }

    if (!referralAttribution && req.body.referralDetails) {
      referralAttribution = req.body.referralDetails;
    }

    // 2. Validate referral attribution strictly against ALL requirements:
    // - Valid referral URL click occurred
    // - Campaign exists
    // - Campaign status is ACTIVE
    // - Campaign has NOT expired (expiryDate > Date.now())
    // - Partner exists and status is ACTIVE
    // - Referral tracking created a matching ReferralVisit log
    let referralValid = false;
    let campaign = null;
    let partner = null;

    if (referralAttribution && (referralAttribution.campaignId || referralAttribution.referralCode)) {
      try {
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
            visit = await ReferralVisit.exists({
              campaign: campaign._id,
              partner: partner._id,
              visitorId: referralAttribution.visitorId
            });
          }

          referralValid = Boolean(
            campaign &&
            isCampaignActive &&
            isCampaignNotExpired &&
            partner &&
            isPartnerActive &&
            visit
          );
        }
      } catch (attrErr) {
        console.error('[Enquiry Attribution] Attributing enquiry failed:', attrErr.message);
        referralValid = false;
      }
    }

    // Explicit referral metadata initialization
    let referralData = {
      isReferral: false,
      partnerId: null,
      campaignId: null,
      referralCode: '',
      campaignName: '',
      partnerAgency: '',
      landingPage: '',
      visitorId: '',
      referralSource: 'organic',
      clickedAt: null,
      submittedAt: null,
      referralStatus: 'Pending'
    };

    if (referralValid && campaign && partner) {
      const clickedAt = referralAttribution.clickedAt || referralAttribution.timestamp;
      referralData = {
        isReferral: true,
        partnerId: partner._id,
        campaignId: campaign._id,
        referralCode: campaign.referralCode,
        campaignName: campaign.campaignName,
        partnerAgency: partner.agencyName,
        landingPage: campaign.landingPage || campaign.targetRoute || '/',
        visitorId: referralAttribution.visitorId || '',
        referralSource: 'referral',
        clickedAt: clickedAt ? new Date(clickedAt) : new Date(),
        submittedAt: new Date(),
        referralStatus: 'Pending'
      };
    }

    const enquiry = new Enquiry({
      enquiryId,
      name,
      email: email ? email.toLowerCase() : '',
      phone,
      serviceCategory,
      description: description || '',
      budget: budget ? Number(budget) : 0,
      status: 'pending_review',
      timeline: [{ activity: 'Enquiry received via service page form' }],
      referral: referralData
    });

    await enquiry.save();

    // Clear attribution cookie after processing
    if (cookieFound || req.cookies?.referral_partner_campaign) {
      res.clearCookie('referral_partner_campaign', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }

    // If and ONLY IF referral is valid, create ReferralBooking & notifications
    if (referralValid && campaign && partner) {
      try {
        const clickedAt = referralAttribution.clickedAt || referralAttribution.timestamp;

        await ReferralBooking.create({
          partner: partner._id,
          campaign: campaign._id,
          enquiry: enquiry._id,
          clientName: name,
          email: email || '',
          phone,
          service: serviceCategory,
          referralTimestamp: clickedAt ? new Date(clickedAt) : new Date(),
          status: 'Pending'
        });

        // Notify admins of new booking
        const admins = await User.find({ role: 'SUPER_ADMIN' });
        for (const admin of admins) {
          const adminNotify = new Notification({
            user: admin._id,
            userModel: 'User',
            title: 'New Referral Booking',
            message: `New booking for "${serviceCategory}" by ${name} attributed to partner campaign "${campaign.campaignName}".`,
            type: 'success',
            priority: 'high',
            icon: 'Award',
            actionUrl: '/admin?tab=referrals'
          });
          await adminNotify.save();
        }

        // Notify partner of new lead attribution
        const partnerNotify = new Notification({
          user: partner._id,
          userModel: 'Partner',
          title: 'New Referral Lead Attributed',
          message: `A new referral lead for "${serviceCategory}" by ${name} has been attributed to your campaign "${campaign.campaignName}".`,
          type: 'success',
          priority: 'high',
          icon: 'Award',
          actionUrl: '/partner/commissions'
        });
        await partnerNotify.save();

        const dispatch = req.app.get('socketio_dispatch');
        if (dispatch) {
          dispatch(partner._id.toString(), 'commission-updated', { partnerId: partner._id });
        }
      } catch (attrErr) {
        console.error('[Enquiry Attribution] Booking creation failed:', attrErr.message);
      }
    }

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
    const { search, status, category, referral } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (category && category !== 'all') {
      filter.serviceCategory = category;
    }

    const andConditions = [];

    if (search) {
      const trimmedSearch = search.toString().trim();
      if (trimmedSearch.length > 100) {
        return res.status(400).json({ error: 'Search query too long (max 100 characters)' });
      }
      const escapedSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'i');
      andConditions.push({
        $or: [
          { name: regex },
          { phone: regex },
          { email: regex },
          { enquiryId: regex },
          { 'referral.referralCode': regex },
          { 'referral.campaignName': regex },
          { 'referral.partnerAgency': regex }
        ]
      });
    }

    // Referral Lead source filters (additive — existing status/category filtering is untouched)
    if (referral && referral !== 'all') {
      if (referral === 'referral' || referral === 'partner') {
        andConditions.push({ 'referral.isReferral': true });
      } else if (referral === 'organic' || referral === 'direct' || referral === 'website') {
        andConditions.push({
          $or: [
            { 'referral.isReferral': false },
            { 'referral.isReferral': { $exists: false } }
          ]
        });
      }
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
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

    // 4b. Preserve referral metadata on the converted project (used later for commission calculations)
    if (enquiry.referral && enquiry.referral.isReferral) {
      project.referral = {
        isReferral: true,
        partnerId: enquiry.referral.partnerId || null,
        campaignId: enquiry.referral.campaignId || null,
        enquiryId: enquiry._id,
        partnerAgency: enquiry.referral.partnerAgency || '',
        campaignName: enquiry.referral.campaignName || '',
        referralCode: enquiry.referral.referralCode || ''
      };
      project.source = 'Partner Referral';
      await project.save();
    }

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
