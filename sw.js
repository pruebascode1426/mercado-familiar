const CACHE_VERSION = "v2";
const CACHE_NAME = `mercado-familiar-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `mercado-familiar-dynamic-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);
    })()
  );
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME && k !== DYNAMIC_CACHE).map((k) => caches.delete(k))
      );
    })()
  );
});

// Intercepción de peticiones (Fetch)

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(event.request);
        // Solo guardamos en caché respuestas válidas de nuestro propio origen (o que sean seguras)
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const cache = await caches.open(DYNAMIC_CACHE);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        // Fallback offline genérico
        if (event.request.mode === "navigate") {
          return new Response(
            `<html lang="es">
              <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Sin Conexión</title></head>
              <body style="font-family: sans-serif; text-align: center; padding: 2rem;">
                <h2>Estás sin conexión 📡</h2>
                <p>Parece que no tienes internet y esta página no se ha guardado en el caché aún.</p>
                <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px;">Reintentar</button>
              </body>
            </html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }
        throw error;
      }
    })()
  );
});