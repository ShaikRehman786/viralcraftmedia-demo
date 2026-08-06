import mongoose from 'mongoose';

const partnerCommissionSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReferralBooking',
    required: true,
    index: true
  },
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true,
    index: true
  },
  commissionPercentage: {
    type: Number,
    required: [true, 'Commission percentage is required']
  },
  commissionAmount: {
    type: Number,
    required: [true, 'Commission amount is required']
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Paid', 'Cancelled', 'Payment Pending', 'Rejected'],
    default: 'Pending',
    index: true
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

partnerCommissionSchema.index({ createdAt: -1 });

const PartnerCommission = mongoose.model('PartnerCommission', partnerCommissionSchema);
export default PartnerCommission;
