import Partner from '../models/Partner.js';
import PartnerReferral from '../models/PartnerReferral.js';
import PartnerCommission from '../models/PartnerCommission.js';
import { sendEmail } from '../services/emailService.js';

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
  console.log('[DEBUG CREATE PARTNER]: Controller Started');
  console.log('[DEBUG CREATE PARTNER]: req.body =', req.body);
  const { agencyName, ownerName, email, phone, password } = req.body;

  if (!agencyName || !ownerName || !email || !phone || !password) {
    console.log('[DEBUG CREATE PARTNER]: Validation Failed - Missing fields');
    return res.status(400).json({ error: 'Please fill in all partner fields' });
  }

  try {
    console.log('[DEBUG CREATE PARTNER]: Checking existing email...');
    const existing = await Partner.findOne({ email });
    if (existing) {
      console.log('[DEBUG CREATE PARTNER]: Validation Failed - Duplicate email');
      return res.status(400).json({ error: 'Email already registered for a partner' });
    }

    console.log('[DEBUG CREATE PARTNER]: Before Database Save / Partner.create()');
    const partner = await Partner.create({
      agencyName,
      ownerName,
      email,
      phone,
      password
    });

    console.log('[DEBUG CREATE PARTNER]: After Database Save');
    res.status(201).json({ success: true, data: partner });
    console.log('[DEBUG CREATE PARTNER]: Response Sent successfully');
  } catch (err) {
    console.error('[DEBUG CREATE PARTNER]: Exception caught:', err);
    console.error(err.stack);
    if (process.env.NODE_ENV === 'development') {
      res.status(500).json({
        success: false,
        message: err.message,
        stack: err.stack
      });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
};

// Edit Partner
export const updatePartner = async (req, res) => {
  const { agencyName, ownerName, email, phone, password, status } = req.body;

  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    if (agencyName) partner.agencyName = agencyName;
    if (ownerName) partner.ownerName = ownerName;
    if (email) {
      const existing = await Partner.findOne({ email, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ error: 'Email already registered for another partner' });
      }
      partner.email = email;
    }
    if (phone) partner.phone = phone;
    if (status) partner.status = status;
    if (password) partner.password = password;

    await partner.save();
    res.status(200).json({ success: true, data: partner });
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
    // Clean up referrals and commissions
    await PartnerReferral.deleteMany({ partner: req.params.id });
    await PartnerCommission.deleteMany({ partner: req.params.id });

    res.status(200).json({ success: true, message: 'Partner and associated records deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// REFERRAL LEADS
// ==========================================

// Get All Referrals with Search/Filter
export const getAdminReferrals = async (req, res) => {
  const { status, search } = req.query;
  let query = {};

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { clientName: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  try {
    const referrals = await PartnerReferral.find(query)
      .populate('partner')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: referrals.length, data: referrals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Edit Referral Status
export const updateReferralStatus = async (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const referral = await PartnerReferral.findById(req.params.id).populate('partner');
    if (!referral) {
      return res.status(404).json({ error: 'Referral lead not found' });
    }

    referral.status = status;
    await referral.save();

    res.status(200).json({ success: true, data: referral });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Approve Commission
export const approveCommission = async (req, res) => {
  const { commissionAmount } = req.body;

  if (!commissionAmount || isNaN(commissionAmount)) {
    return res.status(400).json({ error: 'Valid commission amount is required' });
  }

  try {
    const referral = await PartnerReferral.findById(req.params.id).populate('partner');
    if (!referral) {
      return res.status(404).json({ error: 'Referral lead not found' });
    }

    // Update referral status
    referral.status = 'Commission Approved';
    await referral.save();

    // Create commission entry
    const commission = await PartnerCommission.create({
      referral: referral._id,
      partner: referral.partner._id,
      commissionAmount: Number(commissionAmount),
      status: 'Approved'
    });

    // Notify Partner via Email
    try {
      await sendEmail({
        to: referral.partner.email,
        subject: 'Commission Approved - ViralCraft Media Referral Partner',
        html: `
          <h3>Commission Approved</h3>
          <p>Hello ${referral.partner.ownerName},</p>
          <p>We have approved a commission of <strong>₹${commissionAmount}</strong> for your referral of <strong>${referral.clientName} (${referral.companyName})</strong>.</p>
          <p>Log in to your Partner Portal to check payment details once processed.</p>
          <br/>
          <p>Thank you,</p>
          <p>ViralCraft Media Admin Team</p>
        `
      });
    } catch (e) {
      console.error('Email dispatch to partner failed:', e.message);
    }

    res.status(200).json({ success: true, data: commission });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reject Referral
export const rejectReferral = async (req, res) => {
  try {
    const referral = await PartnerReferral.findById(req.params.id);
    if (!referral) {
      return res.status(404).json({ error: 'Referral lead not found' });
    }

    await PartnerReferral.findByIdAndDelete(req.params.id);
    await PartnerCommission.deleteMany({ referral: req.params.id });

    res.status(200).json({ success: true, message: 'Referral lead rejected and removed' });
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
      .populate('partner')
      .populate('referral')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: commissions.length, data: commissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark Commission as Paid
export const payCommission = async (req, res) => {
  const { paymentDate, transactionReference, internalNotes } = req.body;

  if (!paymentDate) {
    return res.status(400).json({ error: 'Payment date is required' });
  }

  try {
    const commission = await PartnerCommission.findById(req.params.id)
      .populate('partner')
      .populate('referral');

    if (!commission) {
      return res.status(404).json({ error: 'Commission record not found' });
    }

    commission.status = 'Paid';
    commission.paymentDate = new Date(paymentDate);
    commission.transactionReference = transactionReference || '';
    commission.internalNotes = internalNotes || '';
    await commission.save();

    // Update referral status to paid
    if (commission.referral) {
      const referral = await PartnerReferral.findById(commission.referral._id);
      if (referral) {
        referral.status = 'Commission Paid';
        await referral.save();
      }
    }

    // Notify Partner via Email
    try {
      await sendEmail({
        to: commission.partner.email,
        subject: 'Commission Paid - ViralCraft Media Referral Partner',
        html: `
          <h3>Commission Paid</h3>
          <p>Hello ${commission.partner.ownerName},</p>
          <p>We have processed the payment of <strong>₹${commission.commissionAmount}</strong> for your referral of <strong>${commission.referral ? commission.referral.clientName : 'Client'}</strong>.</p>
          <p><strong>Payment Date</strong>: ${new Date(paymentDate).toLocaleDateString()}</p>
          ${transactionReference ? `<p><strong>Reference / Txn ID</strong>: ${transactionReference}</p>` : ''}
          <p>Thank you for partnering with us.</p>
          <br/>
          <p>Thank you,</p>
          <p>ViralCraft Media Admin Team</p>
        `
      });
    } catch (e) {
      console.error('Email dispatch to partner failed:', e.message);
    }

    res.status(200).json({ success: true, data: commission });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
