import mongoose from 'mongoose';
import { config } from '../config/env.js';

async function main() {
  console.log('Connecting to:', config.mongoUri.replace(/:([^:@]+)@/, ':****@'));
  const conn = await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected to DB name:', conn.connection.name);
  const collections = await conn.connection.db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));
  
  const usersColl = conn.connection.db.collection('users');
  const count = await usersColl.countDocuments();
  console.log('Total documents in users collection:', count);

  const sampleUsers = await usersColl.find({}).project({ name: 1, email: 1, role: 1, status: 1, invitationExpires: 1, invitationCreatedAt: 1, createdAt: 1 }).toArray();
  console.log('Users sample:');
  console.log(sampleUsers);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
