/* EARTHQUAKE ALERT service worker
 * Place at the site root. The current static dashboard must register this file
 * with navigator.serviceWorker.register('./sw.js') before these capabilities activate.
 * Push delivery additionally requires a trusted server and VAPID configuration.
 */
'use strict';
const CACHE_NAME = 'earthquake-alert-shell-v1';
const APP_SHELL = ['./'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Network-first for the app document; do not cache earthquake API responses.
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode !== 'navigate') return;
  event.respondWith(
    fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => undefined);
      }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('./')) || Response.error())
  );
});

// Only display push messages actually delivered by an authorized push service.
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() || '' }; }
  const title = typeof payload.title === 'string' ? payload.title.slice(0, 100) : 'Earthquake Alert';
  const body = typeof payload.body === 'string' ? payload.body.slice(0, 240) : 'มีข้อความแจ้งเตือนใหม่';
  const options = {
    body,
    tag: typeof payload.eventId === 'string' ? `earthquake-${payload.eventId.slice(0, 100)}` : 'earthquake-alert',
    renotify: false,
    icon: './',
    badge: './',
    data: { url: typeof payload.url === 'string' && payload.url.startsWith('/') ? payload.url : './' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const existing = clients.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) return existing.navigate(target).then(client => client?.focus());
    return self.clients.openWindow(target);
  }));
});
