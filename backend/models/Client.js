import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Contact phone is required'],
    trim: true
  },
  platform: {
    type: String,
    default: 'Instagram'
  },
  businessName: {
    type: String,
    trim: true
  },
  notes: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  invoices: [{
    invoiceNumber: { type: String },
    invoiceUrl: { type: String },
    amount: { type: Number },
    date: { type: Date, default: Date.now }
  }],
  payments: [{
    paymentId: { type: String },
    amount: { type: Number },
    status: { type: String },
    date: { type: Date, default: Date.now }
  }],
  deliveryHistory: [{
    projectName: { type: String },
    driveLink: { type: String },
    date: { type: Date, default: Date.now }
  }],
  whatsappHistory: [{
    message: { type: String },
    status: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  driveLinks: [{
    name: { type: String },
    link: { type: String },
    date: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Index to search client profile by phone or email
clientSchema.index({ phone: 1, email: 1 });

const Client = mongoose.model('Client', clientSchema);
export default Client;
