import jwt from 'jsonwebtoken';
import Partner from '../models/Partner.js';
import PartnerReferral from '../models/PartnerReferral.js';
import PartnerCommission from '../models/PartnerCommission.js';
import { config } from '../config/env.js';
import { notifyStaff } from '../services/notificationService.js';

// Generate Token & Set Cookie
const sendTokenResponse = (partner, statusCode, res) => {
  const token = jwt.sign({ id: partner._id }, config.jwtSecret, {
    expiresIn: '24h'
  });

  const cookieOptions = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
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
        phone: partner.phone
      }
    });
};

// @desc    Partner Login
// @route   POST /api/partners/login
// @access  Public
export const loginPartner = async (req, res) => {
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
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    sendTokenResponse(partner, 200, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Partner Logout
// @route   POST /api/partners/logout
// @access  Private (Partner)
export const logoutPartner = async (req, res) => {
  res.cookie('partnerAccessToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// @desc    Get Current Partner
// @route   GET /api/partners/me
// @access  Private (Partner)
export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    partner: {
      _id: req.partner._id,
      agencyName: req.partner.agencyName,
      ownerName: req.partner.ownerName,
      email: req.partner.email,
      phone: req.partner.phone
    }
  });
};

// @desc    Change Password
// @route   POST /api/partners/me/change-password
// @access  Private (Partner)
export const changePassword = async (req, res) => {
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

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Submit Referral Lead
// @route   POST /api/partners/referrals
// @access  Private (Partner)
export const submitReferral = async (req, res) => {
  const { clientName, companyName, phone, email, service, expectedBudget, notes } = req.body;

  if (!clientName || !companyName || !phone || !email || !service) {
    return res.status(400).json({ error: 'Please fill in all required fields' });
  }

  try {
    const referral = await PartnerReferral.create({
      partner: req.partner._id,
      clientName,
      companyName,
      phone,
      email,
      service,
      expectedBudget: expectedBudget ? Number(expectedBudget) : 0,
      notes
    });

    // Notify Super Admin(s)
    await notifyStaff({
      title: 'New Referral Submitted',
      message: `Agency "${req.partner.agencyName}" referred client: ${clientName} (${companyName})`,
      type: 'info',
      priority: 'high',
      referenceId: referral._id.toString(),
      referenceModel: 'PartnerReferral',
      actionUrl: '/admin/referrals'
    });

    res.status(201).json({ success: true, data: referral });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get Partner's Referrals
// @route   GET /api/partners/referrals
// @access  Private (Partner)
export const getReferrals = async (req, res) => {
  try {
    const referrals = await PartnerReferral.find({ partner: req.partner._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: referrals.length, data: referrals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get Partner's Commissions
// @route   GET /api/partners/commissions
// @access  Private (Partner)
export const getCommissions = async (req, res) => {
  try {
    const commissions = await PartnerCommission.find({ partner: req.partner._id })
      .populate('referral')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: commissions.length, data: commissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get Partner Dashboard Stats
// @route   GET /api/partners/dashboard
// @access  Private (Partner)
export const getDashboardStats = async (req, res) => {
  try {
    const partnerId = req.partner._id;

    const referrals = await PartnerReferral.find({ partner: partnerId });
    const commissions = await PartnerCommission.find({ partner: partnerId });

    const totalReferrals = referrals.length;
    const pendingReferrals = referrals.filter(r => r.status === 'Received' || r.status === 'Contacted').length;

    const approvedCommissionSum = commissions
      .filter(c => c.status === 'Approved')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    const paidCommissionSum = commissions
      .filter(c => c.status === 'Paid')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    const recentReferrals = await PartnerReferral.find({ partner: partnerId })
      .sort({ createdAt: -1 })
      .limit(5);

    const commissionHistory = await PartnerCommission.find({ partner: partnerId })
      .populate('referral')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      stats: {
        totalReferrals,
        pendingReferrals,
        approvedCommissions: approvedCommissionSum,
        paidCommissions: paidCommissionSum
      },
      recentReferrals,
      commissionHistory
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
