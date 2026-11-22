import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'realtime-service';
process.env.PORT = process.env.PORT || process.env.REALTIME_PORT || '5004';

const { config } = await import('../../backend/config/env.js');
const { getAllowedOrigins } = await import('../../backend/middleware/corsConfig.js');
const { createRealtimeDispatcher } = await import('../../backend/services/realtimeDispatchService.js');
const { createHealthHandler } = await import('../../backend/shared/utils/healthCheck.js');
const { verifyInternalRequest } = await import('../../backend/shared/security/internalAuth.js');
const { sendSuccess, sendError } = await import('../../backend/shared/utils/responseEnvelope.js');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

if (process.env.INTERNAL_AUTH_MEMORY_NONCE_STORE === 'true' && process.env.NODE_ENV !== 'production') {
  const nonceMap = new Map();
  app.set('internalNonceStore', {
    reserve(key, ttlSeconds) {
      const now = Date.now();
      const exp = nonceMap.get(key);
      if (exp && exp > now) return false;
      nonceMap.set(key, now + ttlSeconds * 1000);
      return true;
    }
  });
  console.warn('[realtime-service] INTERNAL_AUTH_MEMORY_NONCE_STORE enabled (non-production only).');
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: getAllowedOrigins(),
    credentials: true
  }
});

const { dispatch, activeClients } = createRealtimeDispatcher(io);

io.on('connection', (socket) => {
  console.log(`[realtime-service] socket connected: ${socket.id}`);
  socket.on('register', (userId) => {
    if (userId) {
      activeClients.set(String(userId), socket.id);
      console.log(`[realtime-service] registered user ${userId} -> ${socket.id}`);
    }
  });
  socket.on('disconnect', () => {
    for (const [userId, socketId] of activeClients.entries()) {
      if (socketId === socket.id) {
        activeClients.delete(userId);
        console.log(`[realtime-service] unregistered user ${userId}`);
        break;
      }
    }
  });
});

const healthHandler = createHealthHandler({
  serviceName: 'realtime-service',
  dependencies: async () => ({
    socketio: Boolean(io),
    activeClients: activeClients.size >= 0,
  }),
});
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

app.post('/internal/realtime/dispatch', verifyInternalRequest, (req, res) => {
  const { eventType, payload, userId } = req.body || {};
  if (!eventType || typeof eventType !== 'string') {
    return sendError(res, 'eventType is required', 400, 'INVALID_EVENT');
  }
  dispatch(userId || null, eventType, payload);
  return sendSuccess(res, { dispatched: true, eventType, userId: userId || null });
});

app.use((req, res) => sendError(res, 'Not found', 404, 'NOT_FOUND'));

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[realtime-service] Received ${signal}; shutting down.`);
  try { io.close(); } catch {}
  await new Promise((resolve) => server.close(() => resolve()));
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.listen(process.env.PORT || 5004, () => {
  console.log(`[realtime-service] listening on ${process.env.PORT || 5004}`);
});
