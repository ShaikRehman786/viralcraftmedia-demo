import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'accepted', 'in_progress', 'submitted', 'rejected', 'completed', 'approved'],
    default: 'pending'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  acceptedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  assignedManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  taskId: {
    type: String,
    trim: true
  },
  estimatedHours: {
    type: Number,
    default: 0
  },
  actualHours: {
    type: Number,
    default: 0
  },
  attachments: [{
    type: String
  }],
  comments: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  revisionHistory: [{
    title: { type: String },
    description: { type: String },
    submissionUrl: { type: String },
    feedback: { type: String },
    date: { type: Date, default: Date.now }
  }],
  timeTracking: [{
    action: { type: String, enum: ['start', 'pause', 'complete'] },
    timestamp: { type: Date, default: Date.now },
    elapsedMs: { type: Number, default: 0 }
  }],
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  submissionUrl: {
    type: String,
    trim: true
  },
  feedback: {
    type: String
  },
  deadline: {
    type: Date
  }
}, {
  timestamps: true
});

const Task = mongoose.model('Task', taskSchema);
export default Task;
