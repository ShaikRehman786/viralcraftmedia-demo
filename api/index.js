import app from '../backend/app.js';
import connectDB from '../backend/config/db.js';

// Pre-connect database for serverless environments
connectDB().catch(err => {
  console.error('Initial DB connection failure on Vercel boot:', err.message);
});

export default app;
