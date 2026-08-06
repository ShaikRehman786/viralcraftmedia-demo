import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'review', 'approved', 'completed'],
    default: 'pending'
  },
  driveFolderId: {
    type: String
  },
  driveShareableLink: {
    type: String
  },
  driveFolders: {
    clientFolderId: { type: String, default: null },
    projectFolderId: { type: String, default: null },
    rawFolderId: { type: String, default: null },
    editedFolderId: { type: String, default: null },
    assetsFolderId: { type: String, default: null },
    finalFolderId: { type: String, default: null }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  employees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  assignments: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    accepted: {
      type: Boolean,
      default: false
    },
    acceptedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected', 'Waiting'],
      default: 'Pending'
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  }],
  estimatedCompletion: {
    type: Date
  },
  category: {
    type: String,
    enum: ['Short Form Editing', 'Podcast Editing', 'Marketing', 'Website Development', 'Branding', 'Consultation'],
    default: 'Short Form Editing'
  },
  suggestedEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  source: {
    type: String,
    default: 'Web'
  },
  editors: {
    type: Number,
    default: 1
  },
  department: {
    type: String,
    default: ''
  },
  assignedEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedEmployeeName: {
    type: String,
    default: ''
  },
  employeeName: {
    type: String,
    default: ''
  },
  assignmentStatus: {
    type: String,
    default: 'Pending'
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Referral Lead attribution (optional — preserved when the project is converted from a referral enquiry)
  referral: {
    isReferral: { type: Boolean, default: false },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralCampaign', default: null },
    enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry', default: null },
    partnerAgency: { type: String, default: '' },
    campaignName: { type: String, default: '' },
    referralCode: { type: String, default: '' }
  }
}, {
  timestamps: true
});

const Project = mongoose.model('Project', projectSchema);
export default Project;
