import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../backend/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not found in env');
    process.exit(1);
  }
  
  console.log('Connecting to:', mongoUri);
  // Disable buffering, set short timeouts
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
  console.log('Connected.');
  
  const superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
  if (!superAdmin) {
    console.log('No SUPER_ADMIN found. Seeding new one...');
    const newAdmin = new User({
      name: process.env.SUPER_ADMIN_NAME || 'ViralCraftMedia',
      email: process.env.SUPER_ADMIN_EMAIL || 'vcmAdmin@gmail.com',
      password: process.env.SUPER_ADMIN_PASSWORD || 'vcm@Admin2026',
      role: 'SUPER_ADMIN',
      status: 'active'
    });
    await newAdmin.save();
    console.log('SUPER_ADMIN created and saved.');
  } else {
    console.log('Found SUPER_ADMIN:', superAdmin.email);
    superAdmin.password = process.env.SUPER_ADMIN_PASSWORD || 'vcm@Admin2026';
    await superAdmin.save();
    console.log('SUPER_ADMIN password updated successfully.');
  }
  
  await mongoose.disconnect();
  console.log('Disconnected.');
}

run().catch(console.error);
