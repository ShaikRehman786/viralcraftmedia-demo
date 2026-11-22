const CACHE_NAME = 'vcm-crm-static-v4';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    } catch (e) {}
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!request || request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  // Only handle same-origin requests; let the browser handle external ones.
  if (url.origin !== self.location.origin) return;

  // Never intercept or cache authenticated API responses.
  if (url.pathname.startsWith('/api/')) return;

  // Do not intercept development-server / HMR requests.
  if (
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/@id/') ||
    url.search.includes('t=') ||
    url.pathname.endsWith('.map')
  ) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      if (request.mode === 'navigate') {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            cache.put(request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch (err) {
          const cached = await cache.match(request);
          if (cached) return cached;
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
      }

      const cached = await cache.match(request);
      if (cached) return cached;

      const networkResponse = await fetch(request);
      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        cache.put(request, networkResponse.clone()).catch(() => {});
      }
      return networkResponse;
    } catch (err) {
      const cached = await cache.match(request);
      if (cached) return cached;
      return new Response('Network error', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
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
      renotify: data.renotify !== undefined ? data.renotify : true,
      requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : true,
      silent: data.silent !== undefined ? data.silent : false,
      timestamp: data.timestamp || Date.now(),
      data: data.data || {},
      actions: data.actions || [
        { action: 'open', title: 'View Details' },
        { action: 'close', title: 'Dismiss' }
      ]
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (_err) {
    const title = 'ViralCraft Media';
    const options = {
      body: event.data.text(),
      icon: '/logoooooooooo.png',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200],
      tag: `vcm-${Date.now()}`,
      requireInteraction: true,
      timestamp: Date.now(),
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
          if (url && client.url !== url) client.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) self.clients.openWindow(url);
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