import mongoose from 'mongoose';

const referralCampaignSchema = new mongoose.Schema({
  campaignName: {
    type: String,
    required: [true, 'Campaign name is required'],
    trim: true
  },
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: [true, 'Partner reference is required'],
    index: true
  },
  validityDays: {
    type: Number,
    required: [true, 'Validity duration is required'],
    enum: [30, 60, 90, 120, 0] // 0 represents custom expiry date
  },
  customExpiryDate: {
    type: Date,
    default: null
  },
  expiryDate: {
    type: Date,
    required: true,
    index: true
  },
  referralCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  landingPage: {
    type: String,
    default: '/'
  },
  service: {
    type: String,
    default: ''
  },
  serviceId: {
    type: String,
    default: ''
  },
  serviceSlug: {
    type: String,
    default: ''
  },
  serviceName: {
    type: String,
    default: ''
  },
  targetRoute: {
    type: String,
    default: ''
  },
  campaignType: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'EXPIRED'],
    default: 'ACTIVE',
    index: true
  },
  minCommissionPercentage: {
    type: Number,
    required: [true, 'Minimum commission range is required'],
    min: 0,
    max: 100
  },
  maxCommissionPercentage: {
    type: Number,
    required: [true, 'Maximum commission range is required'],
    min: 0,
    max: 100
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  expiringSoonAlertSent: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for performance and sorting
referralCampaignSchema.index({ createdAt: -1 });

const ReferralCampaign = mongoose.model('ReferralCampaign', referralCampaignSchema);
export default ReferralCampaign;
