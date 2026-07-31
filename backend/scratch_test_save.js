import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './config/backupInit.js'; // Registers global Mongoose plugin
import User from './models/User.js';
import crypto from 'crypto';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const testSave = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const email = `test_save_${Date.now()}@example.com`;
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationTokenHash = crypto.createHash('sha256').update(invitationToken).digest('hex');
    const invitationExpires = Date.now() + 24 * 60 * 60 * 1000;

    const user = new User({
      name: 'Test Worker',
      email: email,
      phone: '',
      password: crypto.randomBytes(16).toString('hex'),
      role: 'EMPLOYEE',
      status: 'INVITED',
      department: 'Testing',
      skills: [],
      invitationToken: invitationTokenHash,
      invitationExpires,
      invitedBy: new mongoose.Types.ObjectId(),
      emailSent: false,
      mustChangePassword: true
    });

    console.log('Saving user...');
    await user.save();
    console.log('User saved successfully!');

    // Clean up
    await User.deleteOne({ email });
    console.log('Deleted temporary test user.');

    await mongoose.disconnect();
  } catch (err) {
    console.error('CRITICAL: Error occurred while saving user:');
    console.error('Error name:', err.name);
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('Error details:', JSON.stringify(err));
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
};

testSave();
