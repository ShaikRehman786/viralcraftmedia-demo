import mongoose from 'mongoose';

const referralVisitSchema = new mongoose.Schema({
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReferralCampaign',
    required: true,
    index: true
  },
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true,
    index: true
  },
  visitorId: {
    type: String,
    required: true,
    index: true
  },
  isUnique: {
    type: Boolean,
    default: true
  },
  isReturning: {
    type: Boolean,
    default: false
  },
  landingPage: {
    type: String,
    default: ''
  },
  referrer: {
    type: String,
    default: ''
  },
  utmSource: { type: String, default: '' },
  utmMedium: { type: String, default: '' },
  utmCampaign: { type: String, default: '' },
  utmTerm: { type: String, default: '' },
  utmContent: { type: String, default: '' },
  browser: { type: String, default: '' },
  device: { type: String, default: '' },
  os: { type: String, default: '' },
  country: { type: String, default: '' },
  city: { type: String, default: '' },
  ipHash: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

referralVisitSchema.index({ createdAt: -1 });

const ReferralVisit = mongoose.model('ReferralVisit', referralVisitSchema);
export default ReferralVisit;
