import mongoose from 'mongoose';

const partnerCommissionSchema = new mongoose.Schema({
  referral: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PartnerReferral',
    required: true
  },
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true
  },
  commissionAmount: {
    type: Number,
    required: [true, 'Commission amount is required']
  },
  status: {
    type: String,
    enum: ['Approved', 'Paid'],
    default: 'Approved'
  },
  paymentDate: {
    type: Date,
    default: null
  },
  transactionReference: {
    type: String,
    trim: true,
    default: ''
  },
  internalNotes: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

const PartnerCommission = mongoose.model('PartnerCommission', partnerCommissionSchema);
export default PartnerCommission;
