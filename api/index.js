import app from '../backend/app.js';
import connectDB from '../backend/config/db.js';

// Pre-connect database for serverless environments
connectDB().catch(err => {
  console.error('Initial DB connection failure on boot:', err.message);
});

// When deployed as a Render Web Service with root directory "." and
// start command `node api/index.js`, this file becomes the entry point.
// Vercel sets process.env.VERCEL, Render sets process.env.RENDER.
// Only start a standalone HTTP server when NOT running on Vercel
// (where the platform provides the server) and when executed directly.
if (!process.env.VERCEL) {
  const isDirectRun = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('api/index.js');
  if (isDirectRun || process.env.RENDER || process.env.RENDER_SERVICE_NAME) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`API server listening on port ${PORT} (via api/index.js)`);
    });
  }
}

export default app;
