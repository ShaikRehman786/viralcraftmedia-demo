import { signInternalPayload } from '../shared/security/internalAuth.js';
import { getServiceUrl, SERVICE_NAMES } from '../shared/config/ports.js';

export function createRealtimeDispatcher(io) {
  const activeClients = new Map();

  const dispatch = (userId, eventType, payload) => {
    if (!userId) {
      io.emit(eventType, payload);
      console.log(`Broadcasted real-time WebSocket '${eventType}' event to all connected users`);
      return;
    }
    const socketId = activeClients.get(String(userId));
    if (socketId) {
      io.to(socketId).emit(eventType, payload);
      console.log(`Dispatched real-time WebSocket '${eventType}' event to user ${userId}`);
    } else {
      console.log(`User ${userId} not active. WebSocket dispatch skipped.`);
    }
  };

  return { dispatch, activeClients };
}

export async function dispatchToRemoteRealtimeService(eventType, payload, userId = null) {
  const remoteUrl = process.env.REALTIME_SERVICE_URL;
  if (!remoteUrl) return false;
  try {
    const path = '/internal/realtime/dispatch';
    const body = { eventType, payload, userId };
    const headers = signInternalPayload({
      serviceName: SERVICE_NAMES.MAIN_API,
      method: 'POST',
      path,
      body,
    });
    const res = await fetch(`${remoteUrl.replace(/\/+$/, '')}${path}`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default { createRealtimeDispatcher, dispatchToRemoteRealtimeService };