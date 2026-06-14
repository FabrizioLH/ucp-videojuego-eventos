const CACHE_NAME = 'reaccion-rapida-v4';
const ASSETS_TO_CACHE = [
  'index.html',
  'css/styles.css',
  'js/events.js',
  'js/game.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'screenshot-desktop.png',
  'screenshot-mobile.png'
];

// Evento de Instalación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Service Worker: Almacenando App Shell en caché...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Evento de Activación
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('🧹 Service Worker: Eliminando caché antigua...', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Evento Fetch: Intercepta peticiones para servir contenido offline
self.addEventListener('fetch', (event) => {
    // Omitir peticiones de WebSockets del ranking en tiempo real
    if (event.request.url.startsWith('ws://') || event.request.url.startsWith('https://gamehubmanager.azurewebsites.net') || event.request.url.startsWith('wss://')) {
      return; 
    }
  
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
  
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch(() => {
          // Truco para PWABuilder: Si falla la red al navegar o testear, devolvemos siempre el index
          return caches.match('index.html');
        });
      })
    );
  });