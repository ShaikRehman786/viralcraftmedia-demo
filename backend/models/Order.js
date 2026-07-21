import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  platform: {
    type: String,
    required: false
  },
  videoLink: {
    type: String,
    required: false,
    trim: true
  },
  instructions: {
    type: String,
    required: false
  },
  clipCount: {
    type: Number,
    required: false
  },
  amount: {
    type: Number,
    required: true
  },
  serviceType: {
    type: String,
    trim: true
  },
  budget: {
    type: Number
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'success', 'failed', 'enquiry', 'refunded'],
    default: 'pending'
  },
  razorpayOrderId: {
    type: String,
    trim: true
  },
  razorpayPaymentId: {
    type: String,
    trim: true
  },
  invoiceUrl: {
    type: String
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    default: null
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  assignedManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedEmployees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed'],
    default: 'pending'
  },
  timeline: [{
    activity: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  files: [{
    name: { type: String },
    url: { type: String }
  }],
  driveFolderId: {
    type: String,
    default: null
  },
  deliveryLink: {
    type: String,
    default: null
  },
  orderDate: {
    type: String
  }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
