import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/db.js';
import { config } from './config/env.js';
import { seedSuperAdmin } from './config/seed.js';
import whatsappService from './services/whatsappService.js';

process.on('unhandledRejection', (reason, promise) => {
  console.warn('Unhandled Promise Rejection (handled gracefully):', reason);
});

process.on('uncaughtException', (err) => {
  console.warn('Uncaught Exception (handled gracefully):', err.message);
});

const PORT = config.port;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Seed database Super Admin
    await seedSuperAdmin();

    const server = http.createServer(app);

    // Initialize Socket.io with CORS parameters matching Express
    const allowedOrigins = [
      config.clientUrl,
      'https://viralcraftmedia-demo.vercel.app',
      'https://viralcraftmedia-demo.onrender.com',
      'https://viralcraftmedia.com',
      'https://www.viralcraftmedia.com',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5000',
      'http://localhost:3000'
    ].filter(Boolean);
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
    app.set('socketio_dispatch', (userId, eventType, payload) => {
      const socketId = activeClients.get(userId.toString());
      if (socketId) {
        io.to(socketId).emit(eventType, payload);
        console.log(`Dispatched real-time WebSocket '${eventType}' event to user ${userId}`);
      } else {
        console.log(`User ${userId} not active. WebSocket dispatch skipped.`);
      }
    });

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
