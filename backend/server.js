import './config/backupInit.js';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/db.js';
import { config } from './config/env.js';
import { seedSuperAdmin, seedBackupAdmin } from './config/seed.js';
import whatsappService from './services/whatsappService.js';
import { startReferralCampaignMonitor } from './services/referralCron.js';
import { getAllowedOrigins } from './middleware/corsConfig.js';
import { closeRedis } from './config/redis.js';
import { shutdownBackupServices } from './services/backupService.js';

process.on('unhandledRejection', (reason, promise) => {
  console.warn('Unhandled Promise Rejection (handled gracefully):', reason);
});

process.on('uncaughtException', (err) => {
  console.warn('Uncaught Exception (handled gracefully):', err.message);
});

// Graceful shutdown (Render SIGTERM on deploy/scale + local Ctrl+C).
// Idempotent, safe when services never initialized, never throws.
// Each step is individually guarded so one failing cleanup cannot block the rest.
let httpServer = null;
let shuttingDown = false;
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[SHUTDOWN] Received ${signal}; cleaning up resources...`);
  // Fallback so a hanging cleanup cannot block process termination forever.
  const forceTimer = setTimeout(() => {
    console.warn('[SHUTDOWN] Cleanup timed out; forcing exit.');
    process.exit(1);
  }, 25000);
  try {
    try { await whatsappService.shutdown(); } catch (e) { console.warn('[SHUTDOWN] WhatsApp cleanup warning:', e.message); }
    try { await shutdownBackupServices(); } catch (e) { console.warn('[SHUTDOWN] Backup cleanup warning:', e.message); }
    try { await closeRedis(); } catch (e) { console.warn('[SHUTDOWN] Redis cleanup warning:', e.message); }
    if (httpServer) {
      await new Promise((resolve) => {
        try {
          httpServer.close(() => resolve());
        } catch {
          resolve();
        }
      });
    }
    // Mongoose pools close naturally on process exit; no forced disconnect
    // here so in-flight writes can settle during the grace period.
    console.log('[SHUTDOWN] Cleanup complete.');
  } finally {
    clearTimeout(forceTimer);
  }
};
process.on('SIGTERM', () => { shutdown('SIGTERM').catch(() => {}); });
process.on('SIGINT', () => { shutdown('SIGINT').catch(() => {}); });

const PORT = config.port;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Seed database Super Admin
    await seedSuperAdmin();

    // Seed dedicated Backup Admin account
    await seedBackupAdmin();

    const server = http.createServer(app);
    httpServer = server;

    // Initialize Socket.io with CORS parameters matching Express - environment-aware
    // (single source of truth in middleware/corsConfig.js)
    const allowedOrigins = getAllowedOrigins();
    const io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        credentials: true
      }
    });

    // Initialize WhatsApp Web automation service (non-blocking)
    whatsappService.init(io).catch((err) => {
      console.error('[WA-AUTOMATION] WhatsApp initial startup failed (non-fatal):', err.message);
    });

    // Start background referral campaign status monitor
    startReferralCampaignMonitor();

    // Track active connection sockets grouped by User ID
    const activeClients = new Map();

    io.on('connection', (socket) => {
      console.log(`Socket client connected: ${socket.id}`);

      // Handle custom client registration
      socket.on('register', (userId) => {
        if (userId) {
          activeClients.set(userId.toString(), socket.id);
          console.log(`Registered user socket: User ID ${userId} -> Socket ID ${socket.id}`);
        }
      });

      socket.on('disconnect', () => {
        // Clear registered connection
        for (const [userId, socketId] of activeClients.entries()) {
          if (socketId === socket.id) {
            activeClients.delete(userId);
            console.log(`Unregistered user socket: User ID ${userId}`);
            break;
          }
        }
        console.log(`Socket client disconnected: ${socket.id}`);
      });
    });

    // Expose WebSocket dispatcher helper in Express app context
    // Controllers broadcast global refresh events by passing `null` as the target
    // user. Guard against null/undefined so those broadcasts no longer throw after
    // the underlying database write has already succeeded.
    app.set('socketio_dispatch', (userId, eventType, payload) => {
      if (!userId) {
        io.emit(eventType, payload);
        console.log(`Broadcasted real-time WebSocket '${eventType}' event to all connected users`);
        return;
      }
      const socketId = activeClients.get(userId.toString());
      if (socketId) {
        io.to(socketId).emit(eventType, payload);
        console.log(`Dispatched real-time WebSocket '${eventType}' event to user ${userId}`);
      } else {
        console.log(`User ${userId} not active. WebSocket dispatch skipped.`);
      }
    });
    app.set('socketio_io', io);
    app.set('socketio_clients', activeClients);

    server.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`🚀 VIRALCRAFTMEDIA BACKEND LISTENING ON PORT ${PORT}`);
      console.log(`⚙️  Environment: ${config.nodeEnv}`);
      console.log(`=================================================`);
    });
  } catch (err) {
    console.error('Critical Server Boot Failure:', err.message);
    process.exit(1);
  }
};

startServer();
