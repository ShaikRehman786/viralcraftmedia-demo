import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';
import { config } from '../config/env.js';

webpush.setVapidDetails(
  config.vapidSubject,
  config.vapidPublicKey,
  config.vapidPrivateKey
);

function buildPayload(notification) {
  const baseUrl = config.appUrl || 'https://crm.viralcraftmedia.com';
  const actionUrl = notification.actionUrl
    ? (notification.actionUrl.startsWith('http') ? notification.actionUrl : `${baseUrl}${notification.actionUrl}`)
    : baseUrl;

  return JSON.stringify({
    title: `${notification.title || 'New Notification'} | ViralCraft Media`,
    body: notification.message,
    icon: `${baseUrl}/logoooooooooo.png`,
    badge: `${baseUrl}/favicon.svg`,
    image: notification.metadata?.image || `${baseUrl}/website%20header.png`,
    vibrate: [200, 100, 200],
    tag: `vcm-${notification._id || Date.now()}`,
    renotify: true,
    requireInteraction: true,
    silent: false,
    timestamp: notification.createdAt ? new Date(notification.createdAt).getTime() : Date.now(),
    data: {
      url: actionUrl,
      notificationId: notification._id || '',
      referenceId: notification.referenceId || '',
      referenceModel: notification.referenceModel || '',
      title: notification.title || '',
      message: notification.message || '',
      type: notification.type || 'info',
      priority: notification.priority || 'medium'
    },
    actions: [
      { action: 'open', title: 'View Details' },
      { action: 'close', title: 'Dismiss' }
    ]
  });
}

async function sendToSubscription(subscription, payload) {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      },
      payload,
      { 
        TTL: 86400,
        headers: {
          'Urgency': 'high'
        }
      }
    );
    return true;
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      await PushSubscription.findByIdAndUpdate(subscription._id, { active: false });
    }
    return false;
  }
}

export async function subscribe(userId, subscription, deviceInfo = '', userAgent = '') {
  try {
    const existing = await PushSubscription.findOne({ endpoint: subscription.endpoint });
    if (existing) {
      if (existing.user.toString() !== userId.toString()) {
        existing.user = userId;
      }
      existing.active = true;
      existing.keys = subscription.keys;
      existing.deviceInfo = deviceInfo || existing.deviceInfo;
      existing.userAgent = userAgent || existing.userAgent;
      await existing.save();
      return existing;
    }

    const doc = new PushSubscription({
      user: userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      deviceInfo,
      userAgent,
      active: true
    });
    await doc.save();
    return doc;
  } catch (err) {
    console.error('Push subscribe failed:', err.message);
    return null;
  }
}

export async function unsubscribe(endpoint) {
  try {
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { active: false }
    );
    return true;
  } catch (err) {
    console.error('Push unsubscribe failed:', err.message);
    return false;
  }
}

export async function sendPushToUser(userId, notification) {
  try {
    const subs = await PushSubscription.find({ user: userId, active: true });
    if (!subs.length) return [];

    const payload = buildPayload(notification);
    const results = await Promise.allSettled(
      subs.map(sub => sendToSubscription(sub, payload))
    );

    return results.map(r => r.status === 'fulfilled' && r.value);
  } catch (err) {
    console.error('sendPushToUser failed:', err.message);
    return [];
  }
}

export async function sendPushToStaff(notification) {
  try {
    const { default: User } = await import('../models/User.js');
    const staffUsers = await User.find({ role: { $in: ['SUPER_ADMIN', 'MANAGER'] } });
    const userIds = staffUsers.map(u => u._id);

    const subs = await PushSubscription.find({ user: { $in: userIds }, active: true });
    if (!subs.length) return [];

    const payload = buildPayload(notification);
    const results = await Promise.allSettled(
      subs.map(sub => sendToSubscription(sub, payload))
    );

    return results.map(r => r.status === 'fulfilled' && r.value);
  } catch (err) {
    console.error('sendPushToStaff failed:', err.message);
    return [];
  }
}

export function getVapidPublicKey() {
  return config.vapidPublicKey;
}
