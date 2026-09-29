import mongoose from 'mongoose';
import { config } from '../config/env.js';

async function main() {
  const conn = await mongoose.connect(config.mongoUri);
  const logsColl = conn.connection.db.collection('auditlogs');
  const logs = await logsColl.find({
    $or: [
      { 'details.createdUserEmail': 'shaikrehman78609@gmail.com' },
      { 'details.recipientId': new mongoose.Types.ObjectId('6abbbb26ef33db4a3b84e8c6') },
      { action: { $regex: 'INVIT', $options: 'i' } }
    ]
  }).sort({ timestamp: -1 }).limit(10).toArray();

  console.log('Audit logs:');
  console.log(logs);

  await mongoose.disconnect();
}

main().catch(console.error);
