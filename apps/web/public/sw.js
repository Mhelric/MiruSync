self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'MiruSync';
  const options = {
    body: data.body || 'New update available!',
    data: { url: data.url || '/home' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/home';
  event.waitUntil(clients.openWindow(targetUrl));
});
