// ======================================================================
// PROCESO: ServiceWorkerPizarron
// Habilita instalación (PWA) y uso sin conexión del pizarrón.
// Estrategia: "cache primero, red como respaldo" para el shell de la app.
// ======================================================================
const CACHE_NAME = 'pizarron-jb-v1';

const ARCHIVOS_APP_SHELL = [
  './',
  './index.html',
  './pizarron2.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(
        claves
          .filter((clave) => clave !== CACHE_NAME)
          .map((clave) => caches.delete(clave))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo interceptamos peticiones GET del propio origen (evita romper CDNs externos raros)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((respuestaCache) => {
      const peticionRed = fetch(event.request)
        .then((respuestaRed) => {
          if (respuestaRed && respuestaRed.status === 200) {
            const copia = respuestaRed.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          }
          return respuestaRed;
        })
        .catch(() => respuestaCache);

      // Si hay copia en caché, la servimos de inmediato (rápido);
      // si no, esperamos la red.
      return respuestaCache || peticionRed;
    })
  );
});
