import mongoose from 'mongoose';
import { config, buildInvitationUrl, getInvitationExpiresAt } from '../config/env.js';
import User from '../models/User.js';
import crypto from 'crypto';

async function main() {
  await mongoose.connect(config.mongoUri);
  const admin = await User.findOne({ role: 'SUPER_ADMIN' });
  const email = 'browser_test_worker@viralcraftmedia.com';
  await User.deleteOne({ email });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken.toLowerCase().trim()).digest('hex');
  const user = new User({
    name: 'Browser Test Worker',
    email: email,
    password: crypto.randomBytes(16).toString('hex'),
    role: 'EMPLOYEE',
    status: 'INVITED',
    department: 'Video Production',
    invitationToken: tokenHash,
    invitationExpires: getInvitationExpiresAt(),
    invitationCreatedAt: new Date(),
    invitedBy: admin._id
  });
  await user.save();

  const url = buildInvitationUrl(rawToken);
  console.log('BROWSER_TEST_URL=' + url);
  await mongoose.disconnect();
}

main().catch(console.error);
