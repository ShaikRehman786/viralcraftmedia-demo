import mongoose from 'mongoose';

const partnerReferralSchema = new mongoose.Schema({
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true
  },
  clientName: {
    type: String,
    required: [true, 'Client Name is required'],
    trim: true
  },
  companyName: {
    type: String,
    required: [true, 'Company Name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  service: {
    type: String,
    required: [true, 'Interested Service is required'],
    trim: true
  },
  expectedBudget: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Received', 'Contacted', 'Commission Approved', 'Commission Paid'],
    default: 'Received'
  }
}, {
  timestamps: true
});

const PartnerReferral = mongoose.model('PartnerReferral', partnerReferralSchema);
export default PartnerReferral;
