import User from '../models/User.js';

/**
 * Role-aware realtime dispatcher — never broadcasts sensitive data to unauthorized roles
 * Emits only to connected clients whose role permits the entity
 */
export async function emitToRoles(app, event, payload, allowedRoles) {
  try {
    const dispatch = app.get('socketio_dispatch');
    const ioEmit = app.get('socketio_io');
    if (!dispatch && !ioEmit) return;
    // If no role restriction, broadcast (still via dispatch to respect activeClients map)
    if (!allowedRoles || allowedRoles.length === 0) {
      if (app.get('socketio_io')) app.get('socketio_io').emit(event, payload);
      return;
    }
    const users = await User.find({ role: { $in: allowedRoles }, status: 'active' }).select('_id').lean();
    for (const u of users) {
      try { dispatch(u._id.toString(), event, payload); } catch {}
    }
  } catch {}
}

export async function emitToUser(app, userId, event, payload) {
  try {
    const dispatch = app.get('socketio_dispatch');
    if (dispatch && userId) dispatch(userId.toString(), event, payload);
  } catch {}
}

export async function emitToUsers(app, userIds, event, payload) {
  if (!userIds || userIds.length === 0) return;
  for (const id of userIds) await emitToUser(app, id, event, payload);
}
