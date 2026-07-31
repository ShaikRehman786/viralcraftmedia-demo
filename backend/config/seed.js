import User from '../models/User.js';
import dotenv from 'dotenv';
import { logEvent } from '../services/loggingService.js';
import { config } from './env.js';

dotenv.config();

export const seedSuperAdmin = async () => {
  try {
    const name = process.env.SUPER_ADMIN_NAME;
    const rawEmail = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!name || !rawEmail || !password) {
      console.warn('[WARNING] Initial Super Admin credentials not set in environment (.env). Initial seed/update skipped.');
      return;
    }

    const email = rawEmail.toLowerCase();

    // Check if a SUPER_ADMIN already exists in the system
    const existingAdmin = await User.findOne({ role: 'SUPER_ADMIN' });

    if (existingAdmin) {
      // Check whether another user already owns the configured email
      const emailOwner = await User.findOne({ email });
      if (emailOwner && emailOwner._id.toString() !== existingAdmin._id.toString()) {
        console.error(`[ERROR] Synchronization failed: Another user (ID: ${emailOwner._id}) already owns the configured email '${email}'.`);
        return;
      }

      console.log('Production Super Admin found');
      // Update credentials
      existingAdmin.name = name;
      existingAdmin.email = email;
      existingAdmin.password = password; // pre-save hook handles hashing

      await existingAdmin.save();
      console.log('✓ Credentials synchronized from .env');
      return;
    }

    // If no super admin exists, check if another user owns the configured email
    const emailOwner = await User.findOne({ email });
    if (emailOwner) {
      console.error(`[ERROR] Creation failed: Another user (ID: ${emailOwner._id}) already owns the configured email '${email}'.`);
      return;
    }

    console.log(`Seeding initial Super Admin profile: ${name} (${email})...`);

    const superAdmin = new User({
      name,
      email,
      password,
      role: 'SUPER_ADMIN',
      status: 'active',
      mustChangePassword: false
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

    console.log('✓ Production Super Admin created successfully');
  } catch (err) {
    console.error('❌ Super Admin synchronization failed:', err.message);
  }
};

export const seedBackupAdmin = async () => {
  try {
    const email = (config.backupAdminEmail || 'shaikrehman78609@gmail.com').toLowerCase();
    const password = config.backupAdminPassword || 'vcm@Backup2026';
    const name = config.backupAdminName || 'Backup Administrator';
    const role = config.backupAdminRole || 'backup_admin';

    // 1. Remove backup user from Production Database to ensure complete isolation
    await User.deleteOne({ email }).catch(() => {});

    // 2. Wait up to 10 seconds for Backup Database connection pool to be ready
    const { backupConnection, getBackupModel } = await import('../services/backupService.js');
    let retries = 50;
    while ((!backupConnection || backupConnection.readyState !== 1) && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 200));
      retries--;
    }

    if (!backupConnection || backupConnection.readyState !== 1) {
      console.error('❌ Cannot seed Backup Admin: Backup Database connection not established.');
      return;
    }

    const BackupUser = getBackupModel('User');
    if (!BackupUser) {
      console.error('❌ Cannot seed Backup Admin: User model not found on backup connection.');
      return;
    }

    const existingBackup = await BackupUser.findOne({ email });
    if (existingBackup) {
      existingBackup.password = password;
      await existingBackup.save();
      console.log('✓ Backup Admin Exists');
      return;
    }

    const backupAdmin = new BackupUser({
      name,
      email,
      password,
      role,
      status: 'active',
      mustChangePassword: false
    });

    await backupAdmin.save();

    await logEvent({
      userId: backupAdmin._id,
      userName: backupAdmin.name,
      action: 'ACCOUNT_CREATION',
      details: { 
        message: 'Backup Admin account seeded successfully in Backup DB',
        role,
        email: backupAdmin.email
      }
    }).catch(() => {});

    console.log('✓ Backup Admin Created Successfully');
  } catch (err) {
    console.error('❌ Failed to seed Backup Admin account in Backup DB:', err.message);
  }
};

export default seedSuperAdmin;
