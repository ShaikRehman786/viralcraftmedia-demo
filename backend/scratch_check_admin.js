import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const checkAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    const UserSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', UserSchema, 'users');
    
    const admins = await User.find({ role: 'SUPER_ADMIN' });
    console.log('Admins found in DB:', admins);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error running checkAdmin:', err);
  }
};

checkAdmin();
