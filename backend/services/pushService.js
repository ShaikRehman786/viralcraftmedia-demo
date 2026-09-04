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

  const rawTitle = notification.title || '';
  const rawMessage = notification.message || '';
  const lowerTitle = rawTitle.toLowerCase();

  let formattedTitle = rawTitle || 'New Notification';
  let formattedBody = rawMessage;
  let tag = 'vcm-general';

  // 1. Authentication
  if (lowerTitle.includes('login') || lowerTitle.includes('sign in')) {
    formattedTitle = `🟢 Super Admin Login`;
    const emailMatch = rawMessage.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
    if (emailMatch) {
      formattedBody = `Super Admin "${emailMatch[1]}" signed in successfully.`;
    } else {
      formattedBody = `Super Admin signed in successfully.`;
    }
    tag = 'vcm-auth';
  } else if (lowerTitle.includes('logout') || lowerTitle.includes('sign out')) {
    formattedTitle = `🔴 Super Admin Logout`;
    tag = 'vcm-auth';
  }
  // 2. Enquiries / Leads
  else if (lowerTitle.includes('enquiry') || lowerTitle.includes('lead')) {
    formattedTitle = `📩 New Service Enquiry`;
    const match = rawMessage.match(/New enquiry for (.+?) from (.+?) \((.+?)\)/);
    const clientMatch = rawMessage.match(/Client (.+?) submitted an enquiry for (.+?)\./);
    if (match) {
      formattedBody = `A new ${match[1]} enquiry has been submitted by ${match[2]}.`;
    } else if (clientMatch) {
      formattedBody = `A new ${clientMatch[2]} enquiry has been submitted by ${clientMatch[1]}.`;
    } else {
      formattedBody = rawMessage;
    }
    tag = 'vcm-enquiry';
  }
  // 3. Payments
  else if (lowerTitle.includes('payment')) {
    if (lowerTitle.includes('received') || lowerTitle.includes('success')) {
      formattedTitle = `💳 Payment Received`;
      const match = rawMessage.match(/₹([\d,]+) received from (.+?) for (.+?)\./);
      const match2 = rawMessage.match(/₹([\d,]+) received from (.+?)(?: for (.+?))?$/);
      if (match) {
        formattedBody = `Advance payment of ₹${match[1]} received from ${match[2]}.`;
      } else if (match2) {
        formattedBody = `Advance payment of ₹${match2[1]} received from ${match2[2]}.`;
      } else {
        formattedBody = rawMessage;
      }
    } else if (lowerTitle.includes('failed')) {
      formattedTitle = `⚠️ Payment Failed`;
      tag = 'vcm-payment';
    } else {
      formattedTitle = `⏳ Payment Pending`;
    }
    tag = 'vcm-payment';
  }
  // 4. Projects / Orders
  else if (lowerTitle.includes('project') || lowerTitle.includes('order')) {
    if (lowerTitle.includes('created') || lowerTitle.includes('received')) {
      formattedTitle = `🚀 New Project Created`;
      const projMatch = rawMessage.match(/Project (.+?) has been auto-created/);
      if (projMatch) {
        formattedBody = `Project "${projMatch[1]}" has been created successfully.`;
      } else {
        formattedBody = rawMessage;
      }
    } else if (lowerTitle.includes('delivered') || lowerTitle.includes('ready')) {
      formattedTitle = `📦 Project Delivered`;
    } else if (lowerTitle.includes('assigned')) {
      formattedTitle = `🤝 Project Assigned`;
    } else {
      formattedTitle = `📁 Project Update`;
    }
    tag = 'vcm-project';
  }
  // 5. Tasks
  else if (lowerTitle.includes('task')) {
    if (lowerTitle.includes('assigned')) {
      formattedTitle = `📋 Task Assigned`;
    } else if (lowerTitle.includes('completed') || lowerTitle.includes('submit')) {
      formattedTitle = `✅ Task Completed`;
    } else if (lowerTitle.includes('rejected')) {
      formattedTitle = `❌ Task Rejected`;
    } else if (lowerTitle.includes('approved')) {
      formattedTitle = `👍 Task Approved`;
    } else {
      formattedTitle = `📝 Task Update`;
    }
    tag = 'vcm-task';
  }
  // 6. Staff / User approvals
  else if (lowerTitle.includes('staff') || lowerTitle.includes('employee') || lowerTitle.includes('invite')) {
    formattedTitle = `👥 Staff Management`;
    tag = 'vcm-staff';
  }
  // 7. System / Whatsapp
  else if (lowerTitle.includes('system') || lowerTitle.includes('whatsapp') || lowerTitle.includes('error')) {
    formattedTitle = `⚙️ System Alert`;
    tag = 'vcm-system';
  }

  return JSON.stringify({
    title: formattedTitle,
    body: formattedBody,
    icon: `${baseUrl}/logoooooooooo.png`,
    badge: `${baseUrl}/logoooooooooo.png`,
    image: notification.metadata?.image || `${baseUrl}/logoooooooooo.png`,
    vibrate: [200, 100, 200],
    tag: tag,
    renotify: true,
    requireInteraction: true,
    silent: false,
    timestamp: notification.createdAt ? new Date(notification.createdAt).getTime() : Date.now(),
    data: {
      url: actionUrl,
      notificationId: notification._id || '',
      referenceId: notification.referenceId || '',
      referenceModel: notification.referenceModel || '',
      title: formattedTitle,
      message: formattedBody,
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
      { active: false },
      { returnDocument: 'after' }
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
