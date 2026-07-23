import User from '../models/User.js';
import dotenv from 'dotenv';
import { logEvent } from '../services/loggingService.js';

dotenv.config();

export const seedSuperAdmin = async () => {
  try {
    // Retrieve seed details from environment
    const name = process.env.SUPER_ADMIN_NAME;
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!name || !email || !password) {
      console.warn('[WARNING] Initial Super Admin credentials not set in environment (.env). Initial seed/update skipped.');
      return;
    }

    // Check if a SUPER_ADMIN already exists in the system
    const existingAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
    if (existingAdmin) {
      console.log('Super Admin account already exists. Syncing/updating password to environment-configured value...');
      existingAdmin.password = password; // mongoose schema pre-save hook will hash this securely
      await existingAdmin.save();
      console.log('✅ Super Admin account password successfully updated.');
      return;
    }

    console.log(`Seeding initial Super Admin profile: ${name} (${email})...`);

    const superAdmin = new User({
      name,
      email,
      password,
      role: 'SUPER_ADMIN',
      status: 'active',
      mustChangePassword: false // Already explicitly set via env
    });

    await superAdmin.save();

    await logEvent({
      userId: superAdmin._id,
      userName: superAdmin.name,
      action: 'ACCOUNT_CREATION',
      details: { 
        message: 'Initial Super Admin account seeded successfully',
        role: 'SUPER_ADMIN',
        email: superAdmin.email
      }
    });

    console.log('✅ Super Admin account seeded successfully.');
  } catch (err) {
    console.error('❌ Failed to seed Super Admin account:', err.message);
  }
};
export default seedSuperAdmin;
