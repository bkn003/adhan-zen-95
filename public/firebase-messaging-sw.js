/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging service worker (web push).
 *
 * This is a MESSAGING worker only — it never caches the app shell and is
 * completely separate from /sw.js. It receives prayer-time change alerts and
 * adhan / pre-prayer reminders while the PWA is closed or in the background.
 *
 * The Firebase web config is passed in the registration URL query string so the
 * keys stay in one place (the app's env vars).
 */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;
const config = {
  apiKey: params.get('apiKey') || '',
  authDomain: params.get('authDomain') || '',
  projectId: params.get('projectId') || '',
  messagingSenderId: params.get('messagingSenderId') || '',
  appId: params.get('appId') || '',
};

if (config.projectId && config.messagingSenderId) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const n = payload.notification || {};
    const data = payload.data || {};
    const title = n.title || data.title || 'Prayer reminder';
    self.registration.showNotification(title, {
      body: n.body || data.body || '',
      icon: '/app-icon-192.png',
      badge: '/app-icon-192.png',
      tag: data.type ? `${data.type}-${data.location_id || ''}` : undefined,
      data,
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow('/');
    })(),
  );
});
