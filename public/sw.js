const CACHE = "locapix-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const cacheFirst = url.pathname.startsWith("/_next/static") || url.pathname.endsWith(".wasm") || url.pathname.startsWith("/wasm");
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (cacheFirst) {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      }
      try {
        const response = await fetch(request);
        if (response.ok && (url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || request.mode === "navigate")) {
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw new Error("offline");
      }
    })(),
  );
});
