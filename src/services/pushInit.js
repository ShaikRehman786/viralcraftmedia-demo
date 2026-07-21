import axios from 'axios';

async function getVapidPublicKey() {
  try {
    const res = await axios.get('/api/push/vapid-public-key');
    return res.data.publicKey;
  } catch (e) {
    console.warn('Push: failed to fetch VAPID public key:', e.message);
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(ch => ch.charCodeAt(0)));
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Push: Service Worker not supported');
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch (err) {
    console.error('Push: SW registration failed:', err.message);
    return null;
  }
}

async function subscribeToPush(registration, publicKey) {
  try {
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const subJSON = subscription.toJSON();
      const res = await axios.post('/api/push/subscribe', {
        subscription: subJSON,
        deviceInfo: navigator.userAgent || ''
      });
      if (res?.data?.success) {
        return true;
      }
      await subscription.unsubscribe();
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    const subJSON = subscription.toJSON();
    await axios.post('/api/push/subscribe', {
      subscription: subJSON,
      deviceInfo: navigator.userAgent || ''
    });

    return true;
  } catch (err) {
    console.error('Push: subscribe failed:', err.message);
    return false;
  }
}

export async function initPushNotifications(registration) {
  if (!registration) {
    console.warn('Push: no SW registration provided');
    return false;
  }
  if (!('PushManager' in window)) {
    console.warn('Push: PushManager not available');
    return false;
  }

  const publicKey = await getVapidPublicKey();
  if (!publicKey) {
    console.warn('Push: VAPID key not configured on server');
    return false;
  }

  return subscribeToPush(registration, publicKey);
}
