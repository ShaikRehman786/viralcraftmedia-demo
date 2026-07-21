import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema({
  enquiryId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  serviceCategory: {
    type: String,
    enum: ['Clip Editing', 'Podcast Editing', 'Social Media Marketing', 'Website Design & Development', 'Real Estate Video Editing'],
    required: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  budget: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending_review', 'assigned', 'converted_client', 'converted_project', 'archived'],
    default: 'pending_review'
  },
  assignedManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: [{
    text: { type: String, required: true },
    author: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  timeline: [{
    activity: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

const Enquiry = mongoose.model('Enquiry', enquirySchema);
export default Enquiry;
