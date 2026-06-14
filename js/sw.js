const CACHE_NAME = 'reaccion-rapida-v3';
const ASSETS_TO_CACHE = [
  'index.html',
  'css/styles.css',
  'js/events.js',
  'js/game.js',
  'manifest.json',
  'icon.svg',
  'icon-maskable.svg',
  'screenshot-desktop.svg',
  'screenshot-mobile.svg'
];

// Evento de Instalación: Se descargan los componentes estáticos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Service Worker: Almacenando App Shell en caché...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Evento de Activación: Limpieza de versiones obsoletas de caché
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
  // CRÍTICO: Ignorar peticiones de WebSockets (wss://) o APIs externas para no romper el ranking RT de la UCP
  if (event.request.url.startsWith('ws://') || event.request.url.startsWith('https://gamehubmanager.azurewebsites.net') || event.request.url.startsWith('wss://')) {
    return; 
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Retorna desde la caché si existe
      }

      // De lo contrario, busca en la red
      return fetch(event.request).then((networkResponse) => {
        // Validamos que sea una respuesta correcta antes de guardarla dinámicamente
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Si falla la red y no está en caché (ej. una subpágina o recurso nuevo estando offline)
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});