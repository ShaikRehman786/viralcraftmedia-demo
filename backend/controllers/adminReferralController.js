import crypto from 'crypto';
import mongoose from 'mongoose';
import Partner from '../models/Partner.js';
import ReferralCampaign from '../models/ReferralCampaign.js';
import ReferralVisit from '../models/ReferralVisit.js';
import ReferralBooking from '../models/ReferralBooking.js';
import Enquiry from '../models/Enquiry.js';
import PartnerCommission from '../models/PartnerCommission.js';
import PartnerPayment from '../models/PartnerPayment.js';
import Notification from '../models/Notification.js';
import { sendEmail } from '../services/emailService.js';
import { logEvent } from '../services/loggingService.js';

// Helper to generate a collision-safe, cryptographically secure referral code
const generateReferralCode = async () => {
  let unique = false;
  let code = '';
  while (!unique) {
    code = 'VCM' + crypto.randomBytes(4).toString('hex').toUpperCase(); // Example: VCMF4A8D93E
    const existing = await ReferralCampaign.findOne({ referralCode: code });
    if (!existing) {
      unique = true;
    }
  }
  return code;
};

// Helper for partner notifications
const createPartnerNotification = async (partnerId, title, message, actionUrl = '', referenceId = '', referenceModel = '') => {
  try {
    const notify = new Notification({
      user: partnerId,
      userModel: 'Partner',
      title,
      message,
      type: 'info',
      priority: 'high',
      icon: 'Bell',
      actionUrl,
      referenceId,
      referenceModel
    });
    await notify.save();
  } catch (err) {
    console.error('[Notification Service] Partner notification save failed:', err.message);
  }
};

// ==========================================
// PARTNER CRUD
// ==========================================

// Get All Partners
export const getPartners = async (req, res) => {
  try {
    const partners = await Partner.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: partners.length, data: partners });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create Partner
export const createPartner = async (req, res) => {
  const { agencyName, ownerName, email, phone, password, notes, profileImage } = req.body;

  if (!agencyName || !ownerName || !email || !phone || !password) {
    return res.status(400).json({ error: 'Please fill in all required partner fields' });
  }

  try {
    const existing = await Partner.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered for a partner' });
    }

    const partner = await Partner.create({
      agencyName,
      ownerName,
      email,
      phone,
      password,
      notes: notes || '',
      profileImage: profileImage || ''
    });

    // Send credentials email
    try {
      await sendEmail({
        to: email,
        subject: 'Welcome to ViralCraft Media Partner Portal',
        html: `
          <h3>Welcome Partner!</h3>
          <p>Hello ${ownerName},</p>
          <p>Your agency <strong>${agencyName}</strong> has been registered on the ViralCraft Media Partner Portal.</p>
          <p>You can now log in and manage your referral links, tracking metrics, and payouts.</p>
          <p><strong>Login URL:</strong> <a href="${process.env.CLIENT_URL || 'https://viralcraftmedia.com'}/partner/login">Portal Login</a></p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
          <br/>
          <p>Please change your password immediately after logging in for security.</p>
          <p>Best Regards,</p>
          <p>ViralCraft Media Admin Team</p>
        `
      });
    } catch (e) {
      console.error('Credentials email failed:', e.message);
    }

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'PARTNER_CREATED',
      details: { message: `Partner created: ${agencyName} (${email})` },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({ success: true, data: partner });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Edit Partner
export const updatePartner = async (req, res) => {
  const { agencyName, ownerName, email, phone, password, status, notes, profileImage } = req.body;

  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    if (email) {
      const existing = await Partner.findOne({ email, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ error: 'Email already registered for another partner' });
      }
      partner.email = email;
    }

    if (agencyName) partner.agencyName = agencyName;
    if (ownerName) partner.ownerName = ownerName;
    if (phone) partner.phone = phone;
    
    // Status change triggers logging
    if (status && status !== partner.status) {
      partner.status = status;
      await logEvent({
        userId: req.user._id,
        userName: req.user.name,
        action: 'PARTNER_STATUS_CHANGE',
        details: { message: `Partner status changed to ${status} for ${partner.agencyName}` },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    if (notes !== undefined) partner.notes = notes;
    if (profileImage !== undefined) partner.profileImage = profileImage;
    if (password) partner.password = password;

    await partner.save();

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'PARTNER_EDITED',
      details: { message: `Partner details updated: ${partner.agencyName}` },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({ success: true, data: partner });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reset Partner Password
export const resetPartnerPassword = async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'New password is required' });
  }

  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    partner.password = password;
    await partner.save();

    // Notify Partner
    try {
      await sendEmail({
        to: partner.email,
        subject: 'Partner Portal Password Reset Alert',
        html: `
          <h3>Password Reset Successful</h3>
          <p>Hello ${partner.ownerName},</p>
          <p>Your password for the ViralCraft Media Partner Portal has been reset by the system administrator.</p>
          <p>Your temporary login credentials are:</p>
          <p><strong>Email:</strong> ${partner.email}</p>
          <p><strong>Password:</strong> ${password}</p>
          <br/>
          <p>Please log in and update your password immediately.</p>
        `
      });
    } catch (e) {
      console.error('Password reset email failed:', e.message);
    }

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'PASSWORD_RESET',
      details: { message: `Reset password for Partner: ${partner.agencyName}` },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({ success: true, message: 'Partner password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Partner
export const deletePartner = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndDelete(req.params.id);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Cascade delete associated records
    await ReferralCampaign.deleteMany({ partner: req.params.id });
    await ReferralVisit.deleteMany({ partner: req.params.id });
    await ReferralBooking.deleteMany({ partner: req.params.id });
    await PartnerCommission.deleteMany({ partner: req.params.id });
    await PartnerPayment.deleteMany({ partner: req.params.id });

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'ACCOUNT_DISABLE',
      details: { message: `Partner deleted with cascade cleanups: ${partner.agencyName}` },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({ success: true, message: 'Partner and associated records deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// REFERRAL CAMPAIGNS CRUD
// ==========================================

// Get All Campaigns
export const getCampaigns = async (req, res) => {
  try {
    const campaigns = await ReferralCampaign.find()
      .populate('partner', 'agencyName ownerName email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: campaigns.length, data: campaigns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createCampaign = async (req, res) => {
  const { campaignName, partner, validityDays, customExpiryDate, landingPage, minCommissionPercentage, maxCommissionPercentage, notes, service, targetRoute, campaignType, serviceId, serviceSlug, serviceName } = req.body;

  // Log incoming request body safely
  console.log('[Referral Campaign creation request payload]:', {
    campaignName,
    partner,
    validityDays,
    customExpiryDate,
    landingPage,
    minCommissionPercentage,
    maxCommissionPercentage,
    service,
    targetRoute,
    campaignType,
    serviceId,
    serviceSlug,
    serviceName
  });

  if (!campaignName || !partner || validityDays === undefined || minCommissionPercentage === undefined || maxCommissionPercentage === undefined) {
    return res.status(400).json({ error: 'Please provide all required campaign parameters: campaignName, partner, validityDays, minCommissionPercentage, maxCommissionPercentage' });
  }

  // 1. Verify partner format and existence
  if (!mongoose.Types.ObjectId.isValid(partner)) {
    return res.status(400).json({ error: 'Invalid partner reference ID format' });
  }

  try {
    const targetPartner = await Partner.findById(partner);
    if (!targetPartner) {
      return res.status(404).json({ error: 'Referral partner not found. Please select a valid partner.' });
    }

    // 2. Range validation
    if (Number(minCommissionPercentage) < 0 || Number(minCommissionPercentage) > 100) {
      return res.status(400).json({ error: 'Minimum commission percentage must be between 0 and 100' });
    }
    if (Number(maxCommissionPercentage) < 0 || Number(maxCommissionPercentage) > 100) {
      return res.status(400).json({ error: 'Maximum commission percentage must be between 0 and 100' });
    }
    if (Number(minCommissionPercentage) > Number(maxCommissionPercentage)) {
      return res.status(400).json({ error: 'Minimum commission range cannot exceed maximum commission range' });
    }

    // 3. Enum validation
    const allowedValidity = [30, 60, 90, 120, 0];
    if (!allowedValidity.includes(Number(validityDays))) {
      return res.status(400).json({ error: 'Validity duration choice is invalid. Allowed: 30, 60, 90, 120, 0 (custom).' });
    }

    // 4. Calculate expiry date
    let expiryDate;
    if (Number(validityDays) === 0) {
      if (!customExpiryDate) {
        return res.status(400).json({ error: 'Custom expiry date is required when custom validity is selected' });
      }
      expiryDate = new Date(customExpiryDate);
      if (isNaN(expiryDate.getTime())) {
        return res.status(400).json({ error: 'Custom expiry date value is invalid' });
      }
      if (expiryDate <= new Date()) {
        return res.status(400).json({ error: 'Custom expiry date must be in the future' });
      }
    } else {
      expiryDate = new Date(Date.now() + Number(validityDays) * 24 * 60 * 60 * 1000);
    }

    // 5. Landing path check
    if (landingPage && !landingPage.startsWith('/')) {
      return res.status(400).json({ error: 'Destination target path must start with a forward slash (/)' });
    }

    // 6. Creator check
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Administrator session not found. Please log in.' });
    }

    const referralCode = await generateReferralCode();

    const campaign = await ReferralCampaign.create({
      campaignName,
      partner,
      validityDays: Number(validityDays),
      customExpiryDate: Number(validityDays) === 0 ? customExpiryDate : null,
      expiryDate,
      referralCode,
      landingPage: landingPage || '/',
      minCommissionPercentage: Number(minCommissionPercentage),
      maxCommissionPercentage: Number(maxCommissionPercentage),
      notes: notes || '',
      createdBy: req.user._id,
      service: serviceName || service || '',
      serviceId: serviceId || '',
      serviceSlug: serviceSlug || '',
      serviceName: serviceName || '',
      targetRoute: targetRoute || landingPage || '',
      campaignType: campaignType || ''
    });

    // Notify Partner
    await createPartnerNotification(
      partner,
      'New Referral Campaign Created',
      `Campaign "${campaignName}" is active with link code ${referralCode}.`,
      '/partner/campaigns',
      campaign._id.toString(),
      'ReferralCampaign'
    );

    // Send email alert
    try {
      await sendEmail({
        to: targetPartner.email,
        subject: `New Campaign: ${campaignName} — ViralCraft Media`,
        html: `
          <h3>New Referral Campaign Assigned</h3>
          <p>Hello ${targetPartner.ownerName},</p>
          <p>A new referral campaign has been created for your agency.</p>
          <p><strong>Campaign Name:</strong> ${campaignName}</p>
          <p><strong>Referral Link:</strong> <a href="${process.env.CLIENT_URL || 'https://viralcraftmedia.com'}/r/${referralCode}">Link</a></p>
          <p><strong>Expiry:</strong> ${expiryDate.toLocaleDateString()}</p>
          <p><strong>Commission Range:</strong> ${minCommissionPercentage}% - ${maxCommissionPercentage}%</p>
        `
      });
    } catch (e) {}

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'CAMPAIGN_CREATED',
      details: { message: `Campaign "${campaignName}" created with code ${referralCode}` },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    console.error('=== REFERRAL CAMPAIGN CREATION ERROR ===');
    console.error('Request Body:', JSON.stringify(req.body, null, 2));
    console.error('Partner ID:', partner);
    console.error('Stack Trace:', err.stack);
    if (err.name === 'ValidationError') {
      console.error('Mongo Validation Errors:', JSON.stringify(err.errors, null, 2));
    }
    console.error('=======================================');

    let errorMsg = err.message;
    if (err.name === 'ValidationError') {
      errorMsg = Object.values(err.errors).map(val => val.message).join(', ');
    } else if (err.code === 11000) {
      errorMsg = 'A campaign with this unique referral code already exists.';
    }
    res.status(400).json({ error: errorMsg });
  }
};

// Edit Campaign
export const updateCampaign = async (req, res) => {
  const { campaignName, status, minCommissionPercentage, maxCommissionPercentage, notes, landingPage, service, targetRoute, campaignType, serviceId, serviceSlug, serviceName } = req.body;

  try {
    const campaign = await ReferralCampaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (minCommissionPercentage !== undefined) {
      const minVal = Number(minCommissionPercentage);
      if (minVal < 0 || minVal > 100) {
        return res.status(400).json({ error: 'Minimum commission percentage must be between 0 and 100' });
      }
      campaign.minCommissionPercentage = minVal;
    }
    if (maxCommissionPercentage !== undefined) {
      const maxVal = Number(maxCommissionPercentage);
      if (maxVal < 0 || maxVal > 100) {
        return res.status(400).json({ error: 'Maximum commission percentage must be between 0 and 100' });
      }
      campaign.maxCommissionPercentage = maxVal;
    }
    if (campaign.minCommissionPercentage > campaign.maxCommissionPercentage) {
      return res.status(400).json({ error: 'Minimum commission range cannot exceed maximum commission range' });
    }

    if (landingPage) {
      if (!landingPage.startsWith('/')) {
        return res.status(400).json({ error: 'Destination target path must start with a forward slash (/)' });
      }
      campaign.landingPage = landingPage;
    }

    if (campaignName) campaign.campaignName = campaignName;
    if (status) campaign.status = status;
    if (notes !== undefined) campaign.notes = notes;
    if (serviceName !== undefined) {
      campaign.serviceName = serviceName;
      campaign.service = serviceName;
    } else if (service !== undefined) {
      campaign.service = service;
    }
    if (serviceId !== undefined) campaign.serviceId = serviceId;
    if (serviceSlug !== undefined) campaign.serviceSlug = serviceSlug;
    if (targetRoute !== undefined) campaign.targetRoute = targetRoute;
    if (landingPage !== undefined) campaign.targetRoute = landingPage;
    if (campaignType !== undefined) campaign.campaignType = campaignType;

    await campaign.save();

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'CAMPAIGN_EDITED',
      details: { message: `Campaign "${campaign.campaignName}" edited` },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({ success: true, data: campaign });
  } catch (err) {
    console.error('=== REFERRAL CAMPAIGN UPDATE ERROR ===');
    console.error('Request Body:', JSON.stringify(req.body, null, 2));
    console.error('Campaign ID:', req.params.id);
    console.error('Stack Trace:', err.stack);
    if (err.name === 'ValidationError') {
      console.error('Mongo Validation Errors:', JSON.stringify(err.errors, null, 2));
    }
    console.error('=====================================');

    let errorMsg = err.message;
    if (err.name === 'ValidationError') {
      errorMsg = Object.values(err.errors).map(val => val.message).join(', ');
    }
    res.status(400).json({ error: errorMsg });
  }
};

// Delete Campaign
export const deleteCampaign = async (req, res) => {
  try {
    const campaign = await ReferralCampaign.findByIdAndDelete(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Cascade cleans
    await ReferralVisit.deleteMany({ campaign: req.params.id });
    await ReferralBooking.deleteMany({ campaign: req.params.id });

    res.status(200).json({ success: true, message: 'Campaign and associated logs deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Duplicate Campaign
export const duplicateCampaign = async (req, res) => {
  try {
    const source = await ReferralCampaign.findById(req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Source campaign not found' });
    }

    const referralCode = await generateReferralCode();
    
    // Duplicate with fresh expiry offset from now if validity was fixed
    let expiryDate;
    if (source.validityDays === 0) {
      expiryDate = source.expiryDate;
    } else {
      expiryDate = new Date(Date.now() + source.validityDays * 24 * 60 * 60 * 1000);
    }

    const duplicate = await ReferralCampaign.create({
      campaignName: `${source.campaignName} (Copy)`,
      partner: source.partner,
      validityDays: source.validityDays,
      customExpiryDate: source.customExpiryDate,
      expiryDate,
      referralCode,
      landingPage: source.landingPage,
      minCommissionPercentage: source.minCommissionPercentage,
      maxCommissionPercentage: source.maxCommissionPercentage,
      notes: source.notes,
      createdBy: req.user._id,
      service: source.service || '',
      targetRoute: source.targetRoute || '',
      campaignType: source.campaignType || ''
    });

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'CAMPAIGN_CREATED',
      details: { message: `Campaign "${source.campaignName}" duplicated to code ${referralCode}` },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({ success: true, data: duplicate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// REFERRAL ANALYTICS & BOOKINGS
// ==========================================

// Get Aggregated Admin Analytics
export const getAdminAnalytics = async (req, res) => {
  try {
    const totalClicks = await ReferralVisit.countDocuments();
    
    const visits = await ReferralVisit.find();
    const uniqueVisitors = new Set(visits.map(v => v.visitorId)).size;
    
    const totalBookings = await ReferralBooking.countDocuments();
    
    const conversionRate = uniqueVisitors > 0 
      ? Number(((totalBookings / uniqueVisitors) * 100).toFixed(2)) 
      : 0;

    const commissions = await PartnerCommission.find();
    
    const pendingCommissionSum = commissions
      .filter(c => c.status === 'Pending' || c.status === 'Approved')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    const paidCommissionSum = commissions
      .filter(c => c.status === 'Paid')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    // Group metrics by partner
    const partnersMetrics = await ReferralBooking.aggregate([
      {
        $group: {
          _id: '$partner',
          bookingsCount: { $sum: 1 },
          bookingValueSum: { $sum: '$bookingValue' }
        }
      }
    ]);

    const populatedMetrics = await Partner.populate(partnersMetrics, { path: '_id', select: 'agencyName ownerName' });

    res.status(200).json({
      success: true,
      data: {
        totalClicks,
        uniqueVisitors,
        totalBookings,
        conversionRate,
        pendingCommissionSum,
        paidCommissionSum,
        partnerMetrics: populatedMetrics.map(p => ({
          partnerId: p._id?._id,
          agencyName: p._id?.agencyName || 'N/A',
          ownerName: p._id?.ownerName || 'N/A',
          bookingsCount: p.bookingsCount,
          bookingValueSum: p.bookingValueSum
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get All Bookings
export const getBookings = async (req, res) => {
  try {
    const bookings = await ReferralBooking.find()
      .populate('partner', 'agencyName ownerName')
      .populate('campaign', 'campaignName minCommissionPercentage maxCommissionPercentage')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Complete booking and calculate Commission
export const createBookingCommission = async (req, res) => {
  const { 
    bookingValue, 
    commissionPercentage, 
    status,
    paymentDate,
    transactionReference,
    internalNotes
  } = req.body;

  try {
    const booking = await ReferralBooking.findById(req.params.id).populate('campaign').populate('partner');
    if (!booking) {
      return res.status(404).json({ error: 'Attributed booking not found' });
    }

    // 1. If status is 'Commission Not Generated', reset the commission
    if (status === 'Commission Not Generated') {
      const commission = await PartnerCommission.findOne({ booking: booking._id });
      if (commission) {
        await PartnerPayment.deleteMany({ commission: commission._id });
        await PartnerCommission.deleteOne({ _id: commission._id });
      }
      booking.bookingValue = 0;
      booking.commissionPercentage = 0;
      booking.commissionAmount = 0;
      booking.status = 'Pending';
      await booking.save();

      // Sync linked enquiry referral status
      if (booking.enquiry) {
        try {
          const linkedEnquiry = await Enquiry.findById(booking.enquiry);
          if (linkedEnquiry && linkedEnquiry.referral) {
            linkedEnquiry.referral.referralStatus = 'Pending';
            await linkedEnquiry.save();
          }
        } catch (err) {}
      }

      // Realtime update socket emit
      const dispatch = req.app.get('socketio_dispatch');
      if (dispatch && booking.partner) {
        dispatch(booking.partner._id.toString(), 'commission-updated', { partnerId: booking.partner._id });
      }

      return res.status(200).json({ success: true, message: 'Commission reset successfully' });
    }

    const val = bookingValue !== undefined ? Number(bookingValue) : booking.bookingValue;
    const pct = commissionPercentage !== undefined ? Number(commissionPercentage) : booking.commissionPercentage;
    const commissionAmount = val * (pct / 100);

    // 2. Otherwise update booking commission details
    booking.bookingValue = val;
    booking.commissionPercentage = pct;
    booking.commissionAmount = commissionAmount;
    booking.status = 'Completed';
    await booking.save();

    // Sync linked enquiry referral status to Completed
    if (booking.enquiry) {
      try {
        const linkedEnquiry = await Enquiry.findById(booking.enquiry);
        if (linkedEnquiry && linkedEnquiry.referral) {
          linkedEnquiry.referral.referralStatus = 'Completed';
          await linkedEnquiry.save();
        }
      } catch (err) {}
    }

    // 3. Find or create PartnerCommission record
    let commission = await PartnerCommission.findOne({ booking: booking._id });
    if (!commission) {
      commission = new PartnerCommission({
        booking: booking._id,
        partner: booking.partner._id,
        commissionPercentage: pct,
        commissionAmount: commissionAmount
      });
    } else {
      commission.commissionPercentage = pct;
      commission.commissionAmount = commissionAmount;
    }

    // Map status
    let mappedStatus = 'Pending';
    if (status === 'Approved') mappedStatus = 'Approved';
    else if (status === 'Payment Pending') mappedStatus = 'Payment Pending';
    else if (status === 'Paid') mappedStatus = 'Paid';
    else if (status === 'Rejected') mappedStatus = 'Rejected';
    else if (status === 'Cancelled') mappedStatus = 'Cancelled';
    else if (status === 'Pending Approval') mappedStatus = 'Pending';
    else if (status) mappedStatus = status; // support raw string matching

    commission.status = mappedStatus;

    // Handle payout parameters for 'Paid' status
    if (mappedStatus === 'Paid') {
      commission.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
      commission.transactionReference = transactionReference || 'N/A';
      commission.internalNotes = internalNotes || '';

      // Manage PartnerPayment record
      let payment = await PartnerPayment.findOne({ commission: commission._id });
      if (!payment) {
        payment = new PartnerPayment({
          partner: booking.partner._id,
          commission: commission._id
        });
      }
      payment.amount = commissionAmount;
      payment.paymentDate = commission.paymentDate;
      payment.referenceNumber = commission.transactionReference;
      payment.status = 'Paid';
      payment.internalNotes = commission.internalNotes;
      await payment.save();
    } else {
      // Remove any leftover payments if changing from Paid to a different status
      await PartnerPayment.deleteMany({ commission: commission._id });
      commission.paymentDate = null;
      commission.transactionReference = '';
      if (internalNotes !== undefined) {
        commission.internalNotes = internalNotes;
      }
    }

    await commission.save();

    // Log the event and send alerts
    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: `COMMISSION_${mappedStatus.toUpperCase()}`,
      details: { message: `Commission of ₹${commissionAmount} status set to ${mappedStatus} for booking ${booking._id}` },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Notify Partner
    await createPartnerNotification(
      booking.partner._id,
      `Commission ${mappedStatus}`,
      `Your commission of ₹${commissionAmount.toFixed(2)} is now ${mappedStatus}.`,
      '/partner/commissions',
      commission._id.toString(),
      'PartnerCommission'
    );

    // Email alert
    try {
      await sendEmail({
        to: booking.partner.email,
        subject: `Commission Status Update: ${mappedStatus} — ViralCraft Media Partner Portal`,
        html: `
          <h3>Commission Status Updated</h3>
          <p>Hello ${booking.partner.ownerName},</p>
          <p>Your referral commission has been updated to <strong>${mappedStatus}</strong>.</p>
          <ul>
            <li><strong>Service:</strong> ${booking.service}</li>
            <li><strong>Project Value:</strong> ₹${val}</li>
            <li><strong>Commission Amount:</strong> ₹${commissionAmount} (${pct}%)</li>
            ${mappedStatus === 'Paid' ? `<li><strong>Txn Reference:</strong> ${transactionReference}</li>` : ''}
          </ul>
          <p>Check details on your partner workspace portal dashboard.</p>
        `
      });
    } catch (e) {}

    // Real-time synchronization socket dispatch
    const dispatch = req.app.get('socketio_dispatch');
    if (dispatch && booking.partner) {
      dispatch(booking.partner._id.toString(), 'commission-updated', { partnerId: booking.partner._id });
    }

    res.status(200).json({ success: true, data: commission });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// COMMISSIONS & PAYMENTS
// ==========================================

// Get All Commissions
export const getAdminCommissions = async (req, res) => {
  try {
    const commissions = await PartnerCommission.find()
      .populate('partner', 'agencyName ownerName email')
      .populate({
        path: 'booking',
        populate: { path: 'campaign', select: 'campaignName' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: commissions.length, data: commissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Approve/Reject Commission
export const updateCommissionStatus = async (req, res) => {
  const { status } = req.body;

  if (!status || !['Approved', 'Cancelled', 'Pending'].includes(status)) {
    return res.status(400).json({ error: 'A valid status is required (Approved, Cancelled)' });
  }

  try {
    const commission = await PartnerCommission.findById(req.params.id).populate('partner').populate('booking');
    if (!commission) {
      return res.status(404).json({ error: 'Commission record not found' });
    }

    commission.status = status;
    await commission.save();

    if (status === 'Approved') {
      await createPartnerNotification(
        commission.partner._id,
        'Commission Approved',
        `Your commission of ₹${commission.commissionAmount.toFixed(2)} was approved.`,
        '/partner/commissions',
        commission._id.toString(),
        'PartnerCommission'
      );

      // Send email alert to partner
      try {
        await sendEmail({
          to: commission.partner.email,
          subject: 'Commission Approved — ViralCraft Media Partner Portal',
          html: `
            <h3>Commission Approved</h3>
            <p>Hello ${commission.partner.ownerName},</p>
            <p>Your referral commission of <strong>₹${commission.commissionAmount}</strong> has been approved for <strong>${commission.booking?.service || 'Service Booking'}</strong>.</p>
            <p>We will initiate the transfer shortly. You can track this in your dashboard.</p>
          `
        });
      } catch (e) {}

      await logEvent({
        userId: req.user._id,
        userName: req.user.name,
        action: 'COMMISSION_APPROVED',
        details: { message: `Commission of ₹${commission.commissionAmount} approved for ${commission.partner.agencyName}` },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    res.status(200).json({ success: true, data: commission });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Payout Commission
export const payCommission = async (req, res) => {
  const { paymentDate, transactionReference, internalNotes } = req.body;

  if (!paymentDate || !transactionReference) {
    return res.status(400).json({ error: 'Payment date and transaction reference code are required' });
  }

  try {
    const commission = await PartnerCommission.findById(req.params.id).populate('partner').populate('booking');
    if (!commission) {
      return res.status(404).json({ error: 'Commission record not found' });
    }

    commission.status = 'Paid';
    commission.paymentDate = new Date(paymentDate);
    commission.transactionReference = transactionReference;
    commission.internalNotes = internalNotes || '';
    await commission.save();

    // Create PartnerPayment transaction audit record
    const payment = await PartnerPayment.create({
      partner: commission.partner._id,
      commission: commission._id,
      amount: commission.commissionAmount,
      paymentDate: new Date(paymentDate),
      referenceNumber: transactionReference,
      status: 'Paid',
      internalNotes: internalNotes || ''
    });

    // Notify Partner
    await createPartnerNotification(
      commission.partner._id,
      'Commission Paid Out',
      `Payout of ₹${commission.commissionAmount.toFixed(2)} completed. Txn ID: ${transactionReference}`,
      '/partner/commissions',
      payment._id.toString(),
      'PartnerPayment'
    );

    // Send email alert to partner
    try {
      await sendEmail({
        to: commission.partner.email,
        subject: 'Commission Paid Out — ViralCraft Media Partner Portal',
        html: `
          <h3>Commission Payout Settled</h3>
          <p>Hello ${commission.partner.ownerName},</p>
          <p>We are pleased to inform you that we have paid your commission of <strong>₹${commission.commissionAmount}</strong>.</p>
          <p><strong>Transaction Details:</strong></p>
          <ul>
            <li><strong>Service category:</strong> ${commission.booking?.service || 'N/A'}</li>
            <li><strong>Payment Date:</strong> ${new Date(paymentDate).toLocaleDateString()}</li>
            <li><strong>Txn Reference Code:</strong> ${transactionReference}</li>
          </ul>
        `
      });
    } catch (e) {}

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'COMMISSION_PAID',
      details: { message: `Commission of ₹${commission.commissionAmount} marked as Paid for ${commission.partner.agencyName}` },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({ success: true, data: commission });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get All Payments
export const getPayments = async (req, res) => {
  try {
    const payments = await PartnerPayment.find()
      .populate('partner', 'agencyName ownerName')
      .populate({
        path: 'commission',
        populate: { path: 'booking', select: 'service' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Executive grouping Reports
export const getReports = async (req, res) => {
  try {
    const partnerReport = await PartnerCommission.aggregate([
      {
        $group: {
          _id: '$partner',
          totalApproved: {
            $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, '$commissionAmount', 0] }
          },
          totalPaid: {
            $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$commissionAmount', 0] }
          },
          totalCommissions: { $sum: '$commissionAmount' }
        }
      }
    ]);

    const populated = await Partner.populate(partnerReport, { path: '_id', select: 'agencyName ownerName email' });

    res.status(200).json({
      success: true,
      data: populated.map(p => ({
        partnerId: p._id?._id,
        agencyName: p._id?.agencyName || 'Deleted Partner',
        ownerName: p._id?.ownerName || 'N/A',
        email: p._id?.email || 'N/A',
        totalApproved: p.totalApproved,
        totalPaid: p.totalPaid,
        totalCommissions: p.totalCommissions
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
