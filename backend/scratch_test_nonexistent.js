import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './config/backupInit.js'; // Registers global backup plugin
import User from './models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const testQuery = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const emailToFind = 'nonexistent123@gmail.com';
    console.log(`Searching for email: ${emailToFind}`);

    const user = await User.findOne({ email: emailToFind.toLowerCase() });
    console.log('User found:', user ? { _id: user._id, email: user.email, role: user.role } : 'null');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error running query:', err);
  }
};

testQuery();
