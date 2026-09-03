import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  razorpayPaymentId: {
    type: String,
    unique: true,
    sparse: true, // Allow null/undefined for orders that haven't been completed yet
    trim: true
  },
  razorpaySignature: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['created', 'captured', 'failed', 'refunded'],
    default: 'created'
  },
  clientName: {
    type: String,
    required: true
  },
  contact: {
    type: String,
    required: true
  },
  orderId: {
    type: String // Sequential ID VCM-XXXX if captured
  },
  enquiryId: {
    type: String,
    trim: true
  },
  enquiry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enquiry',
    default: null
  },
  logs: [
    {
      message: String,
      timestamp: { type: Date, default: Date.now }
    }
  ]
}, {
  timestamps: true
});

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
