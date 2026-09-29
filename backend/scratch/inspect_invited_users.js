import mongoose from 'mongoose';
import { config } from '../config/env.js';
import User from '../models/User.js';

async function main() {
  await mongoose.connect(config.mongoUri);
  const invitedUsers = await User.find({ status: { $in: ['INVITED', 'invited', 'pending_approval'] } }).lean();
  console.log('Total invited/pending users found:', invitedUsers.length);
  for (const u of invitedUsers) {
    console.log({
      id: u._id,
      email: u.email,
      role: u.role,
      status: u.status,
      tokenLength: u.invitationToken ? u.invitationToken.length : 0,
      tokenPrefix: u.invitationToken ? u.invitationToken.substring(0, 10) : 'none',
      invitationExpires: u.invitationExpires,
      now: new Date(),
      isExpired: u.invitationExpires ? (new Date(u.invitationExpires) < new Date()) : 'no-expiry'
    });
  }
  await mongoose.disconnect();
}

main().catch(console.error);
