import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema({
  enquiryId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  serviceCategory: {
    type: String,
    enum: ['Clip Editing', 'Podcast Editing', 'Social Media Marketing', 'Website Design & Development', 'Branding', 'Real Estate Editing'],
    required: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  budget: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending_review', 'assigned', 'converted_client', 'converted_project', 'archived'],
    default: 'pending_review'
  },
  assignedManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: [{
    text: { type: String, required: true },
    author: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  timeline: [{
    activity: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  // Referral Lead attribution (optional — only set when the visitor arrived via a Partner Referral Campaign)
  referral: {
    isReferral: { type: Boolean, default: false },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralCampaign', default: null },
    referralCode: { type: String, trim: true, default: '' },
    campaignName: { type: String, trim: true, default: '' },
    partnerAgency: { type: String, trim: true, default: '' },
    landingPage: { type: String, trim: true, default: '' },
    visitorId: { type: String, trim: true, default: '' },
    referralSource: { type: String, trim: true, default: '' },
    clickedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    referralStatus: { type: String, enum: ['Pending', 'Completed', 'Cancelled'], default: 'Pending' }
  }
}, {
  timestamps: true
});

// Index for the referral lead filter used by the CRM Enquiries page
enquirySchema.index({ 'referral.isReferral': 1, createdAt: -1 });
enquirySchema.index({ assignedManager: 1 });
enquirySchema.index({ status: 1 });

const Enquiry = mongoose.model('Enquiry', enquirySchema);
export default Enquiry;
