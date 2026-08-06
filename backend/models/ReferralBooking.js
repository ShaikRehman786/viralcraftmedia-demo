import mongoose from 'mongoose';

const referralBookingSchema = new mongoose.Schema({
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true,
    index: true
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReferralCampaign',
    required: true,
    index: true
  },
  enquiry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enquiry',
    required: true,
    index: true
  },
  clientName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    lowercase: true,
    default: ''
  },
  phone: {
    type: String,
    required: true
  },
  service: {
    type: String,
    required: true
  },
  referralTimestamp: {
    type: Date,
    required: true
  },
  bookingValue: {
    type: Number,
    default: 0
  },
  commissionPercentage: {
    type: Number,
    default: 0
  },
  commissionAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Cancelled'],
    default: 'Pending',
    index: true
  }
}, {
  timestamps: true
});

referralBookingSchema.index({ createdAt: -1 });

const ReferralBooking = mongoose.model('ReferralBooking', referralBookingSchema);
export default ReferralBooking;
