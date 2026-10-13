// Reemplaza al service worker de la versión anterior (una sola app en /Rastreo/):
// se desinstala y recarga las pestañas para que carguen la portada y las dos apps nuevas.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) client.navigate(client.url);
    })(),
  );
});
