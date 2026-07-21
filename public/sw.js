const CACHE_NAME = 'vcm-crm-v1';
const STATIC_ASSETS = [
  '/',
  '/logoooooooooo.png',
  '/favicon.svg',
  '/website%20header.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => cached);
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const title = data.title || 'ViralCraft Media';
    const options = {
      body: data.body || '',
      icon: data.icon || '/logoooooooooo.png',
      badge: data.badge || '/favicon.svg',
      image: data.image || '/website%20header.png',
      vibrate: data.vibrate || [200, 100, 200],
      tag: data.tag || `vcm-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      silent: false,
      data: data.data || {},
      actions: data.actions || [
        { action: 'open', title: 'View Details' },
        { action: 'close', title: 'Dismiss' }
      ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const title = 'ViralCraft Media';
    const options = {
      body: event.data.text(),
      icon: '/logoooooooooo.png',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200],
      tag: `vcm-${Date.now()}`,
      requireInteraction: true,
      data: { url: '/' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  const url = data.url || '/';

  if (action === 'close') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.host) && 'focus' in client) {
          client.focus();
          if (url && client.url !== url) {
            client.navigate(url);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        self.clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: event.oldSubscription?.endpoint || '' })
    }).catch(() => {})
  );
});
