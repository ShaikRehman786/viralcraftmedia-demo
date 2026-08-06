import mongoose from 'mongoose';

const partnerPaymentSchema = new mongoose.Schema({
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true,
    index: true
  },
  commission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PartnerCommission',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentDate: {
    type: Date,
    required: true
  },
  referenceNumber: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Paid', 'Rejected'],
    default: 'Paid'
  },
  internalNotes: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

partnerPaymentSchema.index({ createdAt: -1 });

const PartnerPayment = mongoose.model('PartnerPayment', partnerPaymentSchema);
export default PartnerPayment;
