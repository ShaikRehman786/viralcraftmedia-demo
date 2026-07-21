import mongoose from 'mongoose';
import { config } from './env.js';

let cachedConnection = null;

export default async function connectDB() {
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    const opts = {
      bufferCommands: false,
    };

    console.log('Connecting to MongoDB Atlas...');
    const db = await mongoose.connect(config.mongoUri, opts);
    cachedConnection = db.connection;
    console.log('\n[BOOT]\nMongo Connected');
    return cachedConnection;
  } catch (error) {
    console.error('MongoDB database connection error:', error.message);
    // In local development, throw so we know. In serverless, throw so invocation fails.
    throw error;
  }
}
