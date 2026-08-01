// =============================================
//   sw.js — Service Worker para Inventario PWA
//   Cacheo offline + sync en background
//   =============================================

const CACHE_NAME = 'inventario-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/estilos.css',
  '/app.js',
  '/manifest.json'
];

// Instalación: cachear assets estáticos
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activación: limpiar caches viejas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: estrategia stale-while-revalidate para assets, network-first para API
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Assets estáticos: cache primero, luego red
  if (STATIC_ASSETS.includes(url.pathname) || url.pathname.match(/\.(css|js|png|jpg|svg|woff2?)$/)) {
    e.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
          }
          return networkResponse;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // API/Supabase: red primero, fallback a cache
  e.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Sync en background: cuando vuelve la conexión, sincronizar datos pendientes
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-ventas') {
    e.waitUntil(syncVentasPendientes());
  }
});

// Push notifications (para alertas de stock bajo)
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Inventario', {
      body: data.body || 'Tienes productos con stock bajo',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: data.tag || 'stock-bajo',
      requireInteraction: true,
      actions: [
        { action: 'ver', title: 'Ver ahora' },
        { action: 'cerrar', title: 'Cerrar' }
      ]
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.action === 'ver' || !e.action) {
    e.waitUntil(
      clients.openWindow('/index.html?action=stock-bajo')
    );
  }
});

async function syncVentasPendientes() {
  // Aquí iría la lógica de sync con Supabase
  // Por ahora solo notificamos que se intentó
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_COMPLETE' });
  });
}