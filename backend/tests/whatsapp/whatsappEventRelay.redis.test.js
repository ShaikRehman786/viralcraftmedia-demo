import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-secret-key-0123456789';

let redisAvailable = true;
let redisResult = 'OK';

mock.module('../../config/redis.js', {
  exports: {
    isRedisAvailable: () => redisAvailable,
    safeSet: async () => redisResult,
  },
});

const relayService = await import('../../services/whatsappEventRelayService.js');

test('relay redis: first-seen event id returns not duplicate when SET NX returns OK', async () => {
  redisAvailable = true;
  redisResult = 'OK';
  relayService.resetWhatsAppEventDedupe();
  const result = await relayService.consumeWhatsAppEventId('evt-redis-first-1234567890');
  assert.equal(result.duplicate, false);
});

test('relay redis: duplicate event id returns duplicate when SET NX returns non-OK', async () => {
  redisAvailable = true;
  redisResult = null;
  relayService.resetWhatsAppEventDedupe();
  const result = await relayService.consumeWhatsAppEventId('evt-redis-dup-1234567890');
  assert.equal(result.duplicate, true);
});

test('relay redis: handleWhatsAppEvent suppresses broadcast on duplicate redis result', async () => {
  redisAvailable = true;
  redisResult = null;
  relayService.resetWhatsAppEventDedupe();
  const broadcasts = [];
  const fakeApp = {
    get: (key) => {
      if (key === 'socketio_dispatch') {
        return (userId, event, payload) => {
          broadcasts.push({ userId, event, payload });
          return true;
        };
      }
      return undefined;
    },
  };
  const result = await relayService.handleWhatsAppEvent({
    app: fakeApp,
    event: 'whatsapp_qr',
    payload: { qrCode: 'data:image/png;base64,FAKE' },
    direction: 'in',
    eventId: 'evt-redis-broadcast-1234567890',
  });
  assert.equal(result.ok, true);
  assert.equal(result.duplicate, true);
  assert.equal(broadcasts.length, 0);
});

test('relay fallback: bounded in-memory dedupe when Redis unavailable', async () => {
  redisAvailable = false;
  redisResult = null;
  relayService.resetWhatsAppEventDedupe();
  const first = await relayService.consumeWhatsAppEventId('evt-fallback-1234567890');
  const second = await relayService.consumeWhatsAppEventId('evt-fallback-1234567890');
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  redisAvailable = true;
});