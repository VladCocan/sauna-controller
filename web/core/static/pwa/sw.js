// Cache name is derived from the ?v= query param injected into the SW
// registration URL by the Django template at deploy time.
// When a new build is deployed, the ?v= token changes → the browser detects
// a new SW script URL → installs a fresh worker → activate() deletes all
// old caches automatically. No manual version bumping ever needed.
const BUILD = new URLSearchParams(self.location.search).get("v") || "dev";
const CACHE_NAME = `sauna-pwa-${BUILD}`;

// Only genuinely static, content-addressed assets are pre-cached.
// HTML pages are intentionally excluded — they are always fetched fresh.
const PRECACHE_ASSETS = [
  "/static/pwa/icon-192.png",
  "/static/pwa/icon-512.png",
  "/static/pwa/maskable-icon-192x192.png",
  "/static/pwa/maskable-icon-512x512.png",
  "/static/pwa/apple-touch-icon.png",
  "/static/pwa/favicon.ico",
  "/static/pwa/favicon-32x32.png",
  "/static/pwa/favicon-16x16.png",
  "/static/core/dashboard.js",
];

// ── Install: pre-cache static assets, then skip the waiting phase immediately.
// skipWaiting() ensures the new SW activates as soon as it finishes installing,
// without waiting for existing clients to close.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: purge every cache that isn't the current one, then immediately
// take control of all open clients so they benefit from the new SW at once.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch routing ────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Ignore non-GET and cross-origin requests; let them pass through untouched.
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 1. API / live data endpoints — network ONLY, never cached, never served
  //    from cache. Real-time sauna telemetry and control must always be live.
  //    If the network is unavailable, let the request fail naturally so the
  //    UI can show the correct offline/error state.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/v1/") ||
    url.pathname.startsWith("/action/") ||
    url.pathname.startsWith("/sse/")
  ) {
    return; // do not call event.respondWith() — browser handles it directly
  }

  // 2. Static assets (CSS, JS, icons) — cache-first with background refresh.
  //    WhiteNoise fingerprints these file names, so stale-while-revalidate is
  //    safe: the cached copy is always valid for its URL. The cache is updated
  //    in the background so the next request gets the latest copy immediately.
  if (url.pathname.startsWith("/static/")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        });
        // Serve cached copy instantly; refresh it in background.
        // If nothing is cached yet, wait for the network.
        return cached || networkFetch;
      })
    );
    return;
  }

  // 3. Navigation and everything else — network-first with cached shell
  //    fallback. HTML is always fetched fresh; the cache is only used when
  //    the device is genuinely offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && req.mode === "navigate") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((c) => c || caches.match("/"))
      )
  );
});