import test from 'node:test';
import assert from 'node:assert/strict';

const { createRealtimeDispatcher } = await import('../../services/realtimeDispatchService.js');

test('realtime dispatch: broadcasts to all when userId is null', () => {
  const emitted = [];
  const io = { emit: (event, payload) => emitted.push({ event, payload }) };
  const { dispatch, activeClients } = createRealtimeDispatcher(io);
  const ok = dispatch(null, 'dashboard-update', { id: 1 });
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].event, 'dashboard-update');
  assert.deepEqual(emitted[0].payload, { id: 1 });
});

test('realtime dispatch: targets registered socket when userId present', () => {
  const toCalls = [];
  const io = { to: (id) => ({ emit: (event, payload) => toCalls.push({ id, event, payload }) }) };
  const { dispatch, activeClients } = createRealtimeDispatcher(io);
  activeClients.set('user-1', 'socket-1');
  dispatch('user-1', 'whatsapp_status', { connected: true });
  assert.equal(toCalls.length, 1);
  assert.equal(toCalls[0].id, 'socket-1');
  assert.equal(toCalls[0].event, 'whatsapp_status');
});

test('realtime dispatch: skips when user not connected', () => {
  const toCalls = [];
  const io = { to: (id) => ({ emit: (event, payload) => toCalls.push({ id, event, payload }) }) };
  const { dispatch } = createRealtimeDispatcher(io);
  dispatch('missing-user', 'dashboard-update', { id: 2 });
  assert.equal(toCalls.length, 0);
});