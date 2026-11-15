/* Speltid — minimal service worker.
   Caches the app shell so the PWA opens even when the coach's phone is
   on a bad field connection. Runtime fetches use network-first so fresh
   deployments are picked up as soon as the device is back online. */
const CACHE = "speltid-shell-v1";
const SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  /* Only handle same-origin GETs. Everything else (POST to /api/save, cross-
     origin font CDN, upstream calls) falls through to the network. */
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  /* Never cache the KV API — short links need fresh responses. */
  if (url.pathname.startsWith("/api/")) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        /* Cache successful navigations + static assets. Don't cache opaque
           or partial responses — they break Safari on next load. */
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("/index.html"))),
  );
});
