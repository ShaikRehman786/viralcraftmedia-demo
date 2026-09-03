import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import Partner from '../models/Partner.js';
import ReferralCampaign from '../models/ReferralCampaign.js';
import ReferralVisit from '../models/ReferralVisit.js';
import ReferralBooking from '../models/ReferralBooking.js';
import PartnerCommission from '../models/PartnerCommission.js';
import { config } from '../config/env.js';
import { logEvent } from '../services/loggingService.js';

// Helper to generate JWT token with Partner role and set HTTP-only cookie (SEC-016 isolated secret)
const sendTokenResponse = (partner, statusCode, res) => {
  const token = jwt.sign(
    { id: partner._id, role: 'PARTNER' },
    config.partnerJwtSecret,
    { expiresIn: '24h' }
  );

  const isProduction = config.nodeEnv === 'production';
  const cookieOptions = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  };

  res
    .status(statusCode)
    .cookie('partnerAccessToken', token, cookieOptions)
    .json({
      success: true,
      token,
      partner: {
        _id: partner._id,
        agencyName: partner.agencyName,
        ownerName: partner.ownerName,
        email: partner.email,
        phone: partner.phone,
        profileImage: partner.profileImage || ''
      }
    });
};

// @desc    Partner Login
// @route   POST /api/partners/login
// @access  Public
export const loginPartner = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide an email and password' });
  }

  try {
    const partner = await Partner.findOne({ email }).select('+password');

    if (!partner || partner.status === 'INACTIVE') {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    const isMatch = await partner.matchPassword(password);

    if (!isMatch) {
      // Log login failure
      await logEvent({
        action: 'LOGIN_FAILURE',
        userName: email,
        details: { message: 'Partner login attempt with incorrect password' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Log login success
    await logEvent({
      userId: partner._id,
      userName: partner.ownerName,
      action: 'LOGIN_SUCCESS',
      details: { message: `Partner logged in: ${partner.agencyName}` },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    sendTokenResponse(partner, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Partner Logout
// @route   POST /api/partners/logout
// @access  Public
export const logoutPartner = async (req, res, next) => {
  const isProduction = config.nodeEnv === 'production';
  res.cookie('partnerAccessToken', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// @desc    Get Current Partner Profile
// @route   GET /api/partners/me
// @access  Private (Partner)
export const getMe = async (req, res, next) => {
  res.status(200).json({
    success: true,
    partner: {
      _id: req.partner._id,
      agencyName: req.partner.agencyName,
      ownerName: req.partner.ownerName,
      email: req.partner.email,
      phone: req.partner.phone,
      profileImage: req.partner.profileImage || '',
      notes: req.partner.notes || '',
      createdAt: req.partner.createdAt
    }
  });
};

// @desc    Change Password
// @route   POST /api/partners/me/change-password
// @access  Private (Partner)
export const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Please specify current and new password' });
  }

  try {
    const partner = await Partner.findById(req.partner._id).select('+password');
    const isMatch = await partner.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    partner.password = newPassword;
    await partner.save();

    await logEvent({
      userId: partner._id,
      userName: partner.ownerName,
      action: 'PASSWORD_CHANGE',
      details: { message: 'Partner password changed' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Update Current Partner Profile
// @route   PUT /api/partners/me
// @access  Private (Partner)
export const updateMyProfile = async (req, res, next) => {
  const { agencyName, ownerName, email, phone } = req.body;

  try {
    const partner = await Partner.findById(req.partner._id);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    if (email && email !== partner.email) {
      const existing = await Partner.findOne({ email });
      if (existing) {
        return res.status(400).json({ error: 'Email already registered by another partner' });
      }
      partner.email = email;
    }

    if (agencyName) partner.agencyName = agencyName;
    if (ownerName) partner.ownerName = ownerName;
    if (phone) partner.phone = phone;

    await partner.save();

    await logEvent({
      userId: partner._id,
      userName: partner.ownerName,
      action: 'PARTNER_PROFILE_UPDATE',
      details: { message: `Partner profile updated: ${partner.agencyName}` },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      partner: {
        _id: partner._id,
        agencyName: partner.agencyName,
        ownerName: partner.ownerName,
        email: partner.email,
        phone: partner.phone,
        profileImage: partner.profileImage || '',
        createdAt: partner.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Partner Dashboard Stats
// @route   GET /api/partners/dashboard
// @access  Private (Partner)
export const getDashboardStats = async (req, res, next) => {
  try {
    const partnerId = req.partner._id;

    // Fetch visits logs for partner
    const visits = await ReferralVisit.find({ partner: partnerId });
    const totalClicks = visits.length;
    
    // Find unique visitors (unique visitorId count)
    const uniqueVisitorsSet = new Set(visits.map(v => v.visitorId));
    const uniqueVisitors = uniqueVisitorsSet.size;

    // Fetch bookings logs for partner (Referral Leads)
    const bookings = await ReferralBooking.find({ partner: partnerId });
    const totalBookings = bookings.length;

    // Calculate Conversion Rate
    const conversionRate = uniqueVisitors > 0 
      ? Number(((totalBookings / uniqueVisitors) * 100).toFixed(2)) 
      : 0;

    // Calculate project statuses
    const completedProjects = bookings.filter(b => b.status === 'Completed').length;
    const pendingProjects = bookings.filter(b => b.status === 'Pending').length;

    // Total revenue from completed projects
    const totalRevenue = bookings
      .filter(b => b.status === 'Completed')
      .reduce((sum, b) => sum + (b.bookingValue || 0), 0);

    // Fetch commission summaries (scoping to partner)
    const commissions = await PartnerCommission.find({ partner: partnerId });
    
    const paidCommission = commissions
      .filter(c => c.status === 'Paid')
      .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

    const pendingCommission = commissions
      .filter(c => c.status === 'Pending' || c.status === 'Approved' || c.status === 'Payment Pending')
      .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

    const commissionEarned = paidCommission + pendingCommission;

    // Top Campaign computation
    const campaignStats = {};
    for (const b of bookings) {
      if (b.campaign) {
        const cId = b.campaign.toString();
        campaignStats[cId] = (campaignStats[cId] || 0) + 1;
      }
    }
    let topCampaignId = null;
    let maxBookings = 0;
    for (const [cId, count] of Object.entries(campaignStats)) {
      if (count > maxBookings) {
        maxBookings = count;
        topCampaignId = cId;
      }
    }

    if (!topCampaignId) {
      const visitStats = {};
      for (const v of visits) {
        if (v.campaign) {
          const cId = v.campaign.toString();
          visitStats[cId] = (visitStats[cId] || 0) + 1;
        }
      }
      let maxClicks = 0;
      for (const [cId, count] of Object.entries(visitStats)) {
        if (count > maxClicks) {
          maxClicks = count;
          topCampaignId = cId;
        }
      }
    }

    let topCampaignName = 'N/A';
    if (topCampaignId) {
      const topCamp = await ReferralCampaign.findById(topCampaignId);
      if (topCamp) {
        topCampaignName = topCamp.campaignName;
      }
    }

    // Fetch 5 recent bookings (include clientName/customer)
    const rawRecentBookings = await ReferralBooking.find({ partner: partnerId })
      .populate('campaign', 'campaignName')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentBookings = rawRecentBookings.map(b => ({
      _id: b._id,
      clientName: b.clientName || 'N/A',
      campaignName: b.campaign?.campaignName || 'General',
      service: b.service,
      status: b.status,
      createdAt: b.createdAt
    }));

    // Fetch 5 recent payouts
    const rawCommissions = await PartnerCommission.find({ partner: partnerId })
      .populate({
        path: 'booking',
        populate: { path: 'campaign', select: 'campaignName' }
      })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentCommissions = rawCommissions.map(c => ({
      _id: c._id,
      campaignName: c.booking?.campaign?.campaignName || 'General',
      service: c.booking?.service || 'N/A',
      bookingValue: c.booking?.bookingValue || 0,
      commissionPercentage: c.commissionPercentage,
      commissionAmount: c.commissionAmount,
      status: c.status,
      paymentDate: c.paymentDate,
      transactionReference: c.transactionReference || '',
      internalNotes: c.internalNotes || '',
      createdAt: c.createdAt
    }));

    res.status(200).json({
      success: true,
      stats: {
        totalClicks,
        uniqueVisitors,
        totalBookings,
        conversionRate,
        completedProjects,
        pendingProjects,
        totalRevenue,
        commissionEarned,
        paidCommission,
        pendingCommission,
        topCampaign: topCampaignName
      },
      recentBookings,
      recentCommissions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Partner's Campaigns
// @route   GET /api/partners/campaigns
// @access  Private (Partner)
export const getPartnerCampaigns = async (req, res, next) => {
  try {
    const campaigns = await ReferralCampaign.find({ partner: req.partner._id })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: campaigns.length, data: campaigns });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Partner's Anonymized Analytics
// @route   GET /api/partners/analytics
// @access  Private (Partner)
export const getPartnerAnalytics = async (req, res, next) => {
  try {
    const partnerId = req.partner._id;

    // Get all campaigns for partner
    const campaigns = await ReferralCampaign.find({ partner: partnerId });

    const analyticsData = [];

    for (const campaign of campaigns) {
      const visits = await ReferralVisit.find({ campaign: campaign._id });
      const uniqueVisitors = new Set(visits.map(v => v.visitorId)).size;
      const bookingsCount = await ReferralBooking.countDocuments({ campaign: campaign._id });

      analyticsData.push({
        campaignId: campaign._id,
        campaignName: campaign.campaignName,
        status: campaign.status,
        referralCode: campaign.referralCode,
        landingPage: campaign.landingPage,
        expiryDate: campaign.expiryDate,
        clicks: visits.length,
        uniqueVisitors,
        bookings: bookingsCount,
        conversionRate: uniqueVisitors > 0 
          ? Number(((bookingsCount / uniqueVisitors) * 100).toFixed(2)) 
          : 0
      });
    }

    res.status(200).json({ success: true, data: analyticsData });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Partner's Commissions
// @route   GET /api/partners/commissions
// @access  Private (Partner)
export const getPartnerCommissions = async (req, res, next) => {
  try {
    const rawCommissions = await PartnerCommission.find({ partner: req.partner._id })
      .populate({
        path: 'booking',
        populate: { path: 'campaign', select: 'campaignName' }
      })
      .sort({ createdAt: -1 });

    const commissions = rawCommissions.map(c => ({
      _id: c._id,
      campaignName: c.booking?.campaign?.campaignName || 'General',
      service: c.booking?.service || 'N/A',
      bookingValue: c.booking?.bookingValue || 0,
      bookingStatus: c.booking?.status || 'Pending',
      commissionPercentage: c.commissionPercentage,
      commissionAmount: c.commissionAmount,
      status: c.status,
      paymentDate: c.paymentDate,
      transactionReference: c.transactionReference || '',
      adminNotes: c.internalNotes || ''
    }));

    res.status(200).json({ success: true, count: commissions.length, data: commissions });
  } catch (err) {
    next(err);
  }
};

// @desc    Track Referral Campaign Link Opens
// @route   POST /api/partners/campaigns/track/:referralCode
// @access  Public
export const trackCampaignClick = async (req, res, next) => {
  const { referralCode } = req.params;
  const { visitorId, landingPage, referrer, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, browser, device, os, country, city } = req.body;

  try {
    const campaign = await ReferralCampaign.findOne({ referralCode }).populate('partner');

    if (!campaign) {
      return res.status(404).json({ error: 'Referral link not recognized.' });
    }

    const now = new Date();
    if (campaign.status !== 'ACTIVE' || campaign.expiryDate < now) {
      if (campaign.status === 'ACTIVE') {
        campaign.status = 'EXPIRED';
        await campaign.save();

        await logEvent({
          action: 'CAMPAIGN_EXPIRED',
          details: { message: `Campaign "${campaign.campaignName}" auto-expired on click` }
        });
      }
      return res.status(410).json({ 
        expired: true, 
        message: 'This referral campaign has expired. Please contact ViralCraftMedia.' 
      });
    }

    // GDPR compliant IP Hash
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    // Create visit record
    const visit = await ReferralVisit.create({
      campaign: campaign._id,
      partner: campaign.partner._id,
      visitorId: visitorId || 'anonymous_guest',
      landingPage: landingPage || campaign.landingPage || '/',
      referrer: referrer || '',
      utmSource: utmSource || '',
      utmMedium: utmMedium || '',
      utmCampaign: utmCampaign || '',
      utmTerm: utmTerm || '',
      utmContent: utmContent || '',
      browser: browser || '',
      device: device || '',
      os: os || '',
      country: country || '',
      city: city || '',
      ipHash
    });

    // Set secure cookie
    const cookieAgeMs = Math.max(0, campaign.expiryDate.getTime() - now.getTime());
    
    const attributionData = {
      partnerId: campaign.partner._id.toString(),
      campaignId: campaign._id.toString(),
      referralCode: campaign.referralCode,
      campaignName: campaign.campaignName,
      partnerAgency: campaign.partner?.agencyName || '',
      landingPage: campaign.targetRoute || campaign.landingPage || '/',
      visitorId: visitorId || 'anonymous_guest',
      referralSource: 'referral',
      clickedAt: now.toISOString(),
      timestamp: now.toISOString()
    };

    res.cookie('referral_partner_campaign', JSON.stringify(attributionData), {
      maxAge: cookieAgeMs,
      httpOnly: false, // Client accessible fallback
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.status(200).json({
      success: true,
      landingPage: campaign.targetRoute || campaign.landingPage || '/',
      campaignId: campaign._id,
      partnerId: campaign.partner._id,
      attribution: attributionData
    });
  } catch (err) {
    console.error(err.stack);
    console.error(err.message);
    console.error(req.params);
    console.error(req.body);
    console.error('=== REFERRAL ATTRIBUTION ERROR ===');
    console.error('File: backend/controllers/partnerController.js');
    console.error('Line: ~357 (IP Hashing / Attribution logic)');
    console.error('Campaign ID:', typeof campaign !== 'undefined' ? campaign?._id : 'Not resolved');
    console.error('Referral Code:', referralCode);
    console.error('Stack trace:', err.stack);
    console.error('Import type: ESM (import crypto from "node:crypto")');
    console.error('Runtime: Backend (Express)');
    console.error('==================================');
    res.status(500).json({ 
      error: `Referral attribution failed. Details: ${err.message}`
    });
  }
};
