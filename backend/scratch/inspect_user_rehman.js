import mongoose from 'mongoose';
import { config } from '../config/env.js';

async function main() {
  const conn = await mongoose.connect(config.mongoUri);
  const usersColl = conn.connection.db.collection('users');
  const user = await usersColl.findOne({ email: 'shaikrehman78609@gmail.com' });
  console.log('Full user record:');
  console.log(user);
  await mongoose.disconnect();
}

main().catch(console.error);
